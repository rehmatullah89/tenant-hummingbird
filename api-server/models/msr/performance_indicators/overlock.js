var moment = require('moment');

module.exports = {
  getOverlockUnits(dates, property_ids, all_units = false) {
    dates = Array.isArray(dates)? dates: [dates]
    const sql = `
        select
          p.id as property_id,
          u.id as unit_id, u.number, u.label, uc.description,
          o.status as overlock_status,
          t.date as date
        from units u
          join properties p on u.property_id = p.id
          join overlocks o on o.unit_id = u.id
          join (${dates.map(date => `SELECT ${date} as date`).join(' UNION ALL ')}) t
            on date(convert_tz(o.created , "+00:00", p.utc_offset)) <= t.date
              and if(o.status = 1, date('2099-12-31'), date(convert_tz(o.modified , "+00:00", p.utc_offset))) > t.date
          join unit_categories uc on uc.id = u.category_id
        where p.id in (${property_ids})
        group by u.id, t.date
      `;

    return sql;
  },

  // Summarized
  async summaryOverlock(connection, date, property_ids) {
    let sql = `
      with cte_overlock as (
        ${this.getOverlockUnits(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', '))}
      ),

      cte_summary_overlock as (
        SELECT 
          o.property_id,
          count(1) as unit_day_overlocks
        FROM
          cte_overlock o
        WHERE
          o.overlock_status = 1
        GROUP BY
          o.unit_id
      )

      SELECT 
        o.property_id, 
        count(1) as day_overlocks
      FROM 
        cte_summary_overlock o
      GROUP BY 
        o.property_id
    `;

    console.log(`Summarized overlock: ${sql}`);

    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async summaryOverlockByMonths(connection, payload) {
    let { dates, property_ids } = payload;
    let sql = `
      with cte_overlock as (
        ${this.getOverlockUnits(dates.map(date => connection.escape(date)), property_ids.map(p => connection.escape(p)).join(', '))}
      ),

      cte_summary_overlock as (
        SELECT
          property_id,
          count(1) as unit_day_overlocks,
          date
        FROM
          cte_overlock
        WHERE
          overlock_status = 1
        GROUP BY
          unit_id, date
      )

      SELECT
        property_id,
        DATE_FORMAT(date, '%M-%y') as month,
        sum(unit_day_overlocks) as overlock_count
      FROM
        cte_summary_overlock
      GROUP BY
        property_id,
        DATE_FORMAT(date, '%M-%y')
    `;

    console.log('summaryOverlockByMonths query: ', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // Detailed
  detailedFindOvelockedSpaces(connection, company_id, property_ids, date) {
    date =  moment(date).format('YYYY-MM-DD');
    let far_out_date = '2099-12-31';

    let sql = `

      with cte_overlock_units as (
        ${this.getOverlockUnits(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', '))}
      ),

      cte_overlock_invoices as (
        select
          concat(c.first,' ',c.last) as contact_name,
          ou.unit_id, ou.number, ou.label, ou.description,
          datediff(${connection.escape(date)},i.due) as days_late,
          ifnull(i.subtotal,0) + ifnull(i.total_tax,0) - ifnull(i.total_discounts,0) as total_amount,
          ifnull(sum(ipb.amount),0) as paid_amount
        from cte_overlock_units ou
          join leases l on l.unit_id = ou.unit_id and l.status = 1 and l.start_date <= ${connection.escape(date)}
            and ifnull(l.end_date, ${connection.escape(far_out_date)}) > ${connection.escape(date)}
          join contact_leases cl on cl.lease_id = l.id and cl.primary= 1
          join contacts c on c.id = cl.contact_id
          join invoices i on i.lease_id = l.id and i.contact_id = c.id and i.status = 1 and date(i.due) <= ${connection.escape(date)}
            and ifnull(i.void_date, ${connection.escape(far_out_date)}) > ${connection.escape(date)}
          left join invoices_payments_breakdown ipb on ipb.invoice_id = i.id and date(ipb.date) <= ${connection.escape(date)}
        where ou.property_id in (${property_ids.map(p => connection.escape(p)).join(', ')})
        group by ou.unit_id, l.id, i.id
      )

      select
        oi.contact_name as name,
        oi.number as space_number, oi.label as size, oi.description as category,
        max(if(oi.total_amount - oi.paid_amount > 0, oi.days_late, 0)) as days_late,
        sum(oi.total_amount - oi.paid_amount) as balance
      from cte_overlock_invoices oi
      group by oi.unit_id
    `
    console.log('Detailed overlock: ', sql);

    return connection.queryAsync(sql);
  },

  // Detailed (Need to update based on latest getOverlockUnits query)
  detailedFindNotOverlockedSpaces(connection, company_id, property_ids, date) {
    date =  moment(date).format('YYYY-MM-DD');
    const properties = property_ids.map(p => connection.escape(p)).join(', ');

    let sql = `
      with cte_overlock as (
        ${this.getOverlockUnits(connection.escape(date), properties, true)}
      )

      select tp.name as "name", tp.space_number as "space_number", tp.space_size as "size", tp.unit_category as "category", tp.days_late as "days_late",
        CASE WHEN tp.total_amount - ap.allocated_amount > 0 THEN tp.total_amount - ap.allocated_amount 
                ELSE 0 
        END as "balance"
      from (
        SELECT 
          count(ov.property_id) as day_overlock, 
          ov.contact_name as 'name', 
          ov.days_late as "days_late",
          ov.unit_category as 'unit_category',
          ov.unit_id as unit_id, 
          ov.unit_label as "space_size", 
          ov.unit_number as 'space_number', 
          sum(ov.invoice_sub_total + ov.invoice_total_tax - ov.invoice_total_discount) as 'total_amount'
        FROM
          cte_overlock ov
          join unit_price_changes upc on upc.unit_id = ov.unit_id
        	join services s on s.lease_id = ov.lease_id and s.product_id = ov.unit_product_id
    			join amenity_units au on au.unit_id = ov.unit_id
          join amenity_property a on a.id = au.amenity_property_id and a.property_type = ov.unit_type and a.amenity_name = 'Sqft'
        WHERE
          ov.lease_status = 1
          and s.price >= 0
          and ${connection.escape(date)} between s.start_date and ifnull(s.end_date, ${connection.escape(date)})
          and (ov.lease_end_date is null or ov.lease_end_date >= ${connection.escape(date)})
          and ${connection.escape(date)} between date(upc.start) and ifnull(date(upc.end), ${connection.escape(date)})
          and not exists (
            select 1
            from unit_price_changes upc2
            where upc2.unit_id = upc.unit_id
              and upc2.start = upc.end
              and date(upc2.start ) <= ${connection.escape(date)}
          )
          and ov.unit_id not in (
            select id from units
            where property_id in (${properties})
              and id in (select unit_id from overlocks where created <= ${connection.escape(date)} and status = 1 group by unit_id)
          )
        GROUP BY 
          ov.unit_id
      ) as tp
        left outer join (
          SELECT 
            ov.unit_id as unit_id, 
            sum(ifnull(ipb.amount, 0)) as allocated_amount
          FROM 
            cte_overlock ov
            join overlocks o on o.unit_id = ov.unit_id
            join payments p on p.contact_id = ov.contact_id 
            join invoices_payments ip on ip.invoice_id = ov.invoice_id and ip.payment_id = p.id
            join invoices_payments_breakdown ipb on ipb.payment_id = p.id and 
            ipb.invoice_id = ov.invoice_id and ipb.invoice_payment_id = ip.id
          WHERE
            Date(ipb.created) <= ${connection.escape(date)} and p.status = 1
          GROUP BY 
            ov.unit_id, 
            ov.lease_id
        ) as ap on ap.unit_id = tp.unit_id
    `;

    console.log('Detailed not overlock units: ', sql);

    return connection.queryAsync(sql);
  }
}
