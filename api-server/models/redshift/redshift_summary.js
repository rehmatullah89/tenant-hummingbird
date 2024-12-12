module.exports = {
    deposits(connection, date, properties, first_day_of_month, first_day_of_year){
      let sql = `
          SELECT p.property_id, p.payment_date , date_part(month, p.payment_date) as payment_month, date_part(year, p.payment_date) as payment_year, 
              sum(p.day_cash) as cash_, 
              sum(p.day_check) as check_,
              sum(day_ach) as ach_,
              sum(day_card) as card_,
              sum(day_others) as others_
          from hummingbird.mvw_payments_MS p
          where p.property_id in (${properties.join(', ')})
          and p.payment_date = '${date}'
          group by p.property_id, p.payment_date, date_part(month, p.payment_date), date_part(year, p.payment_date)
          union all 
          SELECT p.property_id, null as payment_date , date_part(month, p.payment_date) as payment_month, date_part(year, p.payment_date) as payment_year, 
              sum(p.day_cash) as cash_, 
              sum(p.day_check) as check_,
              sum(day_ach) as ach_,
              sum(day_card) as card_,
              sum(day_others) as others_
          from hummingbird.mvw_payments_MS p
          where p.property_id in (${properties.join(', ')})
          and p.payment_date BETWEEN '${first_day_of_month}' and '${date}' 
          group by p.property_id, date_part(month, p.payment_date), date_part(year, p.payment_date)
          union all 
          SELECT p.property_id, null as payment_date ,null as payment_month, date_part(year, p.payment_date) as payment_year, 
              sum(p.day_cash) as cash_, 
              sum(p.day_check) as check_,
              sum(day_ach) as ach_,
              sum(day_card) as card_,
              sum(day_others) as others_
          from hummingbird.mvw_payments_MS p
          where p.property_id in (${properties.join(', ')})
          and p.payment_date BETWEEN '${first_day_of_year}' and '${date}' 
          group by p.property_id, date_part(year, p.payment_date);`;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    refunds(connection, date, properties, first_day_of_month, first_day_of_year){
      let sql = `
          select r.property_id ,r.refund_date, date_part(month, r.refund_date) as refund_month, date_part(year, r.refund_date) as refund_year, 
              sum(r.day_refund) as refund_
          from hummingbird.mvw_refunds_MS r
          where r.property_id in (${properties.join(', ')})
          and r.refund_date = '${date}'
          group by r.property_id, r.refund_date, date_part(month, r.refund_date), date_part(year, r.refund_date)
          union all
          select r.property_id ,null as refund_date, date_part(month, r.refund_date) as refund_month, date_part(year, r.refund_date) as refund_year, 
              sum(r.day_refund) as refund_
          from hummingbird.mvw_refunds_MS r
          where r.property_id in (${properties.join(', ')})
          and r.refund_date BETWEEN '${first_day_of_month}' and '${date}'
          group by r.property_id, date_part(month, r.refund_date), date_part(year, r.refund_date)
          union all
          select r.property_id ,null as refund_date, null as refund_month, date_part(year, r.refund_date) as refund_year, 
              sum(r.day_refund) as refund_
          from hummingbird.mvw_refunds_MS r
          where r.property_id in (${properties.join(', ')})
          and r.refund_date BETWEEN '${first_day_of_year}' and '${date}'
          group by r.property_id, date_part(year, r.refund_date);`;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    discounts(connection, date, properties, first_day_of_month, first_day_of_year){
      let sql = `
          select d.property_id, d.invoice_date, date_part(month, d.invoice_date) as invoice_month, date_part(year, d.invoice_date) as invoice_year,
              SUM(d.day_discounts) as discounts_ 
          from hummingbird.mvw_discounts_MS d 
          where d.property_id in (${properties.join(', ')})
          and d.invoice_date = '${date}'
          and (d.invoice_void_date is null or trunc(d.invoice_void_date) > '${date}')
          group by d.property_id, d.invoice_date, date_part(month, d.invoice_date), date_part(year, d.invoice_date)
          union all
          select d.property_id, null invoice_date, date_part(month, d.invoice_date) as invoice_month, date_part(year, d.invoice_date) as invoice_year,
              SUM(d.day_discounts) as discounts_ 
          from hummingbird.mvw_discounts_MS d 
          where d.property_id in (${properties.join(', ')})
          and d.invoice_date BETWEEN '${first_day_of_month}' and '${date}'
          and (d.invoice_void_date is null or trunc(d.invoice_void_date) > '${date}')
          group by d.property_id, date_part(month, d.invoice_date), date_part(year, d.invoice_date)
          union all
          select d.property_id, null invoice_date, null as invoice_month, date_part(year, d.invoice_date) as invoice_year,
              SUM(d.day_discounts) as discounts_ 
          from hummingbird.mvw_discounts_MS d 
          where d.property_id in (${properties.join(', ')})
          and d.invoice_date BETWEEN '${first_day_of_year}' and '${date}'
          and (d.invoice_void_date is null or trunc(d.invoice_void_date) > '${date}')
          group by d.property_id, date_part(year, d.invoice_date); 
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    creditsWithWriteOffs(connection, date, properties, first_day_of_month, first_day_of_year){
      let sql = `
          SELECT c.property_id, c.credit_date, date_part(month, c.credit_date) as credit_month, date_part(year, c.credit_date) as credit_year,
              sum(c.day_credit) as credit_, 
              sum(c.day_writeoffs) as writeoffs_
          from hummingbird.mvw_credits_MS c
          where c.property_id in (${properties.join(', ')})
          and c.credit_date = '${date}'
          group by c.property_id, c.credit_date, date_part(month, c.credit_date), date_part(year, c.credit_date)
          union all
          SELECT c.property_id, null as credit_date, date_part(month, c.credit_date) as credit_month, date_part(year, c.credit_date) as credit_year,
              sum(c.day_credit) as credit_, 
              sum(c.day_writeoffs) as writeoffs_
          from hummingbird.mvw_credits_MS c
          where c.property_id in (${properties.join(', ')})
          and c.credit_date BETWEEN '${first_day_of_month}' and' ${date}'
          group by c.property_id, date_part(month, c.credit_date), date_part(year, c.credit_date)
          union all
          SELECT c.property_id, null as credit_date, null as credit_month, date_part(year, c.credit_date) as credit_year,
              sum(c.day_credit) as credit_, 
              sum(c.day_writeoffs) as writeoffs_
          from hummingbird.mvw_credits_MS c
          where c.property_id in (${properties.join(', ')})
          and c.credit_date BETWEEN '${first_day_of_year}' and '${date}'
          group by c.property_id, date_part(year, c.credit_date);`;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    transfers(connection, date, properties, first_day_of_month, first_day_of_year){
      let sql = `
          select rt.property_id , date(rt.transfer_date) as transfer_date, date_part(month, rt.transfer_date) as transfer_month, date_part(year, rt.transfer_date) as transfer_year,
              sum(rt.day_transfers) as day_transfers
          from hummingbird.mvw_rental_transfers_MS rt
          where rt.property_id in ((${properties.join(', ')}))
          and rt.transfer_date = '${date}'
          group by rt.property_id , date(rt.transfer_date), date_part(month, rt.transfer_date), date_part(year, rt.transfer_date)
          union all
          select rt.property_id , null as transfer_date, date_part(month, rt.transfer_date) as transfer_month, date_part(year, rt.transfer_date) as transfer_year,
              sum(rt.day_transfers) as day_transfers
          from hummingbird.mvw_rental_transfers_MS rt
          where rt.property_id in ((${properties.join(', ')}))
          and rt.transfer_date between '${first_day_of_month}' and '${date}'
          group by rt.property_id, date_part(month, rt.transfer_date), date_part(year, rt.transfer_date)
          union all
          select rt.property_id , null as transfer_date, null as transfer_month, date_part(year, rt.transfer_date) as transfer_year,
              sum(rt.day_transfers) as day_transfers
          from hummingbird.mvw_rental_transfers_MS rt
          where rt.property_id in ((${properties.join(', ')}))
          and rt.transfer_date between '${first_day_of_year}' and '${date}'
          group by rt.property_id, date_part(year, rt.transfer_date)
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    moveIns(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
          SELECT mi.property_id, mi.start_date as start_date, date_part(month, mi.start_date) as movein_month, date_part(year, mi.start_date) as movein_year,
              SUM(mi.day_movins) as movins_ 
          from hummingbird.mvw_rental_moveins_MS mi
          where mi.property_id in (${properties.join(', ')})
          and mi.start_date = '${date}'
          group by mi.property_id, mi.start_date, date_part(month, mi.start_date), date_part(year, mi.start_date)
          union all
          SELECT mi.property_id, null as start_date, date_part(month, mi.start_date) as movein_month, date_part(year, mi.start_date) as movein_year,
              SUM(mi.day_movins) as movins_ 
          from hummingbird.mvw_rental_moveins_MS mi
          where mi.property_id in (${properties.join(', ')})
          and mi.start_date BETWEEN '${first_day_of_month}' and '${date}'
          group by mi.property_id, date_part(month, mi.start_date), date_part(year, mi.start_date)
          union all
          SELECT mi.property_id, null as start_date, null movein_month, date_part(year, mi.start_date) as movein_year,
              SUM(mi.day_movins) as movins_ 
          from hummingbird.mvw_rental_moveins_MS mi
          where mi.property_id in (${properties.join(', ')})
          and mi.start_date BETWEEN '${first_day_of_year}' and '${date}'
          group by mi.property_id, date_part(year, mi.start_date);
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);

    },

    moveOuts(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
          SELECT mo.property_id, mo.end_date as end_date, date_part(month, mo.end_date) as moveout_month, date_part(year, mo.end_date) as moveout_year,
              SUM(mo.day_moveouts ) as moveouts_ 
          from hummingbird.mvw_rental_moveouts_MS mo
          where mo.property_id in (${properties.join(', ')})
          and mo.end_date = '${date}'
          group by mo.property_id, mo.end_date, date_part(month, mo.end_date), date_part(year, mo.end_date)
          union all
          SELECT mo.property_id, null as end_date, date_part(month, mo.end_date) as moveout_month, date_part(year, mo.end_date) as moveout_year,
              SUM(mo.day_moveouts) as moveouts_ 
          from hummingbird.mvw_rental_moveouts_MS mo
          where mo.property_id in (${properties.join(', ')})
          and mo.end_date BETWEEN '${first_day_of_month}' and '${date}'
          group by mo.property_id, date_part(month, mo.end_date), date_part(year, mo.end_date)
          union all
          SELECT mo.property_id, null as end_date, null as moveout_month, date_part(year, mo.end_date) as moveout_year,
              SUM(mo.day_moveouts) as moveouts_ 
          from hummingbird.mvw_rental_moveouts_MS mo
          where mo.property_id in (${properties.join(', ')})
          and mo.end_date BETWEEN '${first_day_of_year}' and '${date}'
          group by mo.property_id, date_part(year, mo.end_date);
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);

    },

    reservedUnits(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
          SELECT ru.property_id, ru.reservation_date, date_part(month, ru.reservation_date) as reservation_month, date_part(year, ru.reservation_date) as reservation_year,
              SUM(day_reservations) as reservations_
          from hummingbird.mvw_reservation_MS ru
          where ru.property_id in (${properties.join(', ')})
          and ru.reservation_date = '${date}'
          group by ru.property_id, ru.reservation_date, date_part(month, ru.reservation_date), date_part(year, ru.reservation_date)
          union all
          SELECT ru.property_id, null as reservation_date, date_part(month, ru.reservation_date) as reservation_month, date_part(year, ru.reservation_date) as reservation_year,
              SUM(day_reservations) as reservations_
          from hummingbird.mvw_reservation_MS ru
          where ru.property_id in (${properties.join(', ')})
          and ru.reservation_date BETWEEN '${first_day_of_month}' and '${date}'
          group by ru.property_id, date_part(month, ru.reservation_date), date_part(year, ru.reservation_date)
          union all
          SELECT ru.property_id, null as reservation_date, null as reservation_month, date_part(year, ru.reservation_date) as reservation_year,
              SUM(day_reservations) as reservations_
          from hummingbird.mvw_reservation_MS ru
          where ru.property_id in (${properties.join(', ')})
          and ru.reservation_date BETWEEN '${first_day_of_year}' and '${date}'
          group by ru.property_id, date_part(year, ru.reservation_date);
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    occupiedUnitsExcludingComplimentary(connection, date, properties) {
      let sql = `
       select ou.property_id, count(ou.occupied_units) as occupied_, sum(cast(ou.occupied_sqft as decimal(10,2))) as occupied_sqft_, sum(ou.occupied_rent) as occupied_rent_, sum(upc.price) as occupied_base_rent_
        from hummingbird.mvw_occupied_MS ou
        join hummingbird.unit_price_changes upc on upc.unit_id = ou.occupied_units
        where ou.property_id in (${properties.join(', ')})
            and '${date}' between ou.start_date and isnull(ou.end_date, '${date}' )
            and (ou.lease_end_date is null or ou.lease_end_date > '${date}')
            and '${date}' between trunc(upc."start") and isnull(trunc(upc."end"), '${date}')
            and not exists (select 1
            from hummingbird.unit_price_changes upc2
            where upc2.unit_id = upc.unit_id
            and upc2."start" = upc."end"
            and trunc(upc2."start" ) <= '${date}')
        group by ou.property_id;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    complimentaryUnits(connection, date, properties) {
      let sql = `
        select cu.property_id, count(cu.complimentary_units) as complimentary_, sum(cast(cu.complimentary_sqft as decimal(10,2))) as complimentary_sqft_, sum(upc.price) as complimentary_base_rent_
        from hummingbird.mvw_complimentary_MS cu
        join hummingbird.unit_price_changes upc on upc.unit_id = cu.complimentary_units
        where cu.property_id in (${properties.join(', ')})
            and '${date}' between cu.start_date and isnull(cu.end_date, '${date}' )
            and (cu.lease_end_date is null or cu.lease_end_date > '${date}')
            and '${date}' between trunc(upc."start") and isnull(trunc(upc."end"), '${date}')
            and not exists (select 1
                from hummingbird.unit_price_changes upc2
                where upc2.unit_id = upc.unit_id
                and upc2."start" = upc."end"
                and trunc(upc2."start" ) <= '${date}')
        group by cu.property_id;
      `;


      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    totalUnits(connection, date, properties) {
      let sql = `
          select tu.property_id, count(tu.units_count) as total_, sum(cast(tu.units_sqft as decimal(10,2))) as total_sqft_, sum(tu.units_base_rent) as total_baserent_
          from hummingbird.mvw_total_MS tu
          where tu.property_id in (${properties.join(', ')})
          and '${date}' between tu.created_date and isnull(tu.removed_date, '${date}')
          and '${date}' between trunc(tu.price_start_date) and isnull(trunc(tu.price_end_date), '${date}')
          and not exists (select 1
                          from hummingbird.mvw_total_MS tu2
                          where tu2.units_count = tu.units_count
                          and tu2.price_start_date = tu.price_end_date
                          and trunc(tu2.price_start_date ) <= '${date}')
          group by tu.property_id;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    unRentableUnits(connection, date, properties) {
      let sql = `
          select tu.property_id, count(tu.units_count) as total_unrentable_, sum(tu.units_sqft) as total_unrentable_sqft_, sum(tu.units_base_rent) as total_unrentable_baserent_
          from hummingbird.mvw_total_MS tu
          where tu.property_id in (${properties.join(', ')})
          and '${date}' between tu.created_date and isnull(tu.removed_date, '${date}')
          and '${date}' between trunc(tu.price_start_date) and isnull(trunc(tu.price_end_date), '${date}')
          and not exists (select 1
                          from hummingbird.mvw_total_MS tu2
                          where tu2.units_count = tu.units_count
                          and tu2.price_start_date = tu.price_end_date
                          and trunc(tu2.price_start_date ) <= '${date}')
          and tu.status = '0'
          group by tu.property_id;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    reservedUnitsInfo(connection, date, properties) {
      let sql = `
          select tu.property_id, sum(tu.day_reservations) as total_, sum(tu.day_sqft) as total_reserved_sqft_, sum(tu.reservation_rent) as reservation_rent_
          from hummingbird.mvw_reservation_MS tu
          where tu.property_id in (${properties.join(', ')})
          and tu.reservation_date <= '${date}'
          and isnull(case when tu.status <> 1 then tu.expiration_date else tu.lease_start_date end, '${date}' )> '${date}'
          and (tu.status <> 1 or (tu.lease_start_date <= '${date}' and tu.status = 1))
          group by tu.property_id; 
      `;


      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    autoPay(connection, date, properties) {
      let sql = `
          select a.property_id, sum(a.day_autopay) as autopay_
          from hummingbird.mvw_autopay_MS a 
          where a.property_id in (${properties.join(', ')})
          and '${date}' between a.start_date and isnull(a.end_date, '${date}')
          group by a.property_id; 
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    insurance(connection, date, properties) {
      let sql = `
          select i.property_id, sum(i.day_insurance) as insurance_ 
          from hummingbird.mvw_insurance_MS i
          where i.property_id in (${properties.join(', ')})
          and '${date}' between i.start_date and isnull(i.end_date, '${date}')
          group by i.property_id;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    overlock(connection, date, properties) {
      let sql = `
          select u.property_id , count(1) as day_overlocks
          from hummingbird.units u
          join hummingbird.overlocks o on o.unit_id = u.id
          where u.property_id in (${properties.join(', ')})
          and trunc(o.created) <= '${date}'
          and o.status = 1
          group by u.property_id
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    rentUnchanged(connection, date, properties) {
      let sql = `
          select u.property_id , date('${date}')::text as report_date, count(s.lease_id ) as rentunchanged_
          from hummingbird.units u
          join hummingbird.leases l on l.unit_id = u.id
          join hummingbird.services s on s.lease_id = l.id
                                  and s.product_id = u.product_id
                                  and date('${date}') between s.start_date and isnull(s.end_date, '${date}')
                                  and DATEDIFF(day, s.start_date, '${date}' ) >= 365
          where u.property_id in (${properties.join(', ')})
              and l.status = 1
              and l.start_date < '${date}'
          and (l.end_date is null or l.end_date > '${date}')
          group by u.property_id;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    rentChange(connection, date, properties) {
      let sql = `
          select rc.property_id,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) <6 then 1 else 0 end) as less_than_six,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 6 and 11 then 1 else 0 end) as six_eleven,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 12 and 17 then 1 else 0 end) as twelve_seventeen,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 18 and 24 then 1 else 0 end) as eighteen_twentyfour,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) >24 then 1 else 0 end) as above_twentyfour,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) <6 then rc.new_rent_amount else 0 end) as less_than_six_new_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 6 and 11 then rc.new_rent_amount else 0 end) as six_eleven_new_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 12 and 17 then rc.new_rent_amount else 0 end) as twelve_seventeen_new_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 18 and 24 then rc.new_rent_amount else 0 end) as eighteen_twentyfour_new_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) >24 then rc.new_rent_amount else 0 end) as above_twentyfour_new_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) <6 then rc.old_rent_amount else 0 end) as less_than_six_old_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 6 and 11 then rc.old_rent_amount else 0 end) as six_eleven_old_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 12 and 17 then rc.old_rent_amount else 0 end) as twelve_seventeen_old_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) between 18 and 24 then rc.old_rent_amount else 0 end) as eighteen_twentyfour_old_rent_amount,
              sum(case when DATEDIFF(month, rc.last_rent_change, report_date ) >24 then rc.old_rent_amount else 0 end) as above_twentyfour_old_rent_amount
          from (select u.property_id , date('${date}') as report_date , l.id as lease_id, max(s.start_date) as last_rent_change, sum(s.price) as new_rent_amount, sum(so.price) as old_rent_amount
          from hummingbird.units u 
          join hummingbird.leases l on l.unit_id = u.id 
          join hummingbird.services s on s.lease_id = l.id 
              and s.product_id = u.product_id 
              and s.start_date <= '${date}'
              and s.start_date <> l.start_date
          join hummingbird.services so on so.lease_id = s.lease_id 
              and datediff(day, date(so.end_date), date(s.start_date)) = 1
          where u.property_id in (${properties.join(', ')})
              and l.status = 1
              and l.start_date < '${date}'
              and (l.end_date is null or l.end_date > '${date}')
          group by u.property_id , l.id) as rc
          group by rc.property_id	 ;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    delinquentTenantsLedgerAmounts(connection, date, properties) {
      let sql = `
          SELECT o.property_id, o.report_date, 
              sum(case when days_unpaid between 0 and 10 then o.total_amount - o.total_paid else 0 end) as owed_0_10,
              sum(case when days_unpaid between 11 and 30 then o.total_amount - o.total_paid else 0 end) as owed_11_30,
              sum(case when days_unpaid between 31 and 60 then o.total_amount - o.total_paid else 0 end) as owed_31_60,
              sum(case when days_unpaid between 61 and 90 then o.total_amount - o.total_paid else 0 end) as owed_61_90,
              sum(case when days_unpaid between 91 and 120 then o.total_amount - o.total_paid else 0 end) as owed_91_120,
              sum(case when days_unpaid between 121 and 180 then o.total_amount - o.total_paid else 0 end) as owed_121_180,
              sum(case when days_unpaid between 181 and 360 then o.total_amount - o.total_paid else 0 end) as owed_181_360,
              sum(case when days_unpaid > 360 then o.total_amount - o.total_paid else 0 end) as owed_361
          from (select u.property_id , '${date}'::text report_date, i.lease_id , i.id as invoice_id, DATEDIFF(day, i.due,'${date}' ) as days_unpaid, (nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts )) as total_amount, sum(nvl(ipb.amount,0)) as total_paid
              from hummingbird.invoices i
              join hummingbird.leases l on l.id = i.lease_id
              join hummingbird.units u on u.id = l.unit_id
              left outer join hummingbird.invoices_payments_breakdown ipb on ipb.invoice_id = i.id
                                                                        and ipb."date" <='${date}'
              where i.due <= '${date}'
                  and (i.void_date is null or trunc(i.void_date ) > '${date}')
                  and l.status = 1
                  and (l.end_date is null or l.end_date > '${date}')
                  and u.property_id in (${properties.join(', ')})
              group by u.property_id , i.lease_id , i.id, DATEDIFF(day, i.due,'${date}' ), nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts)
              having (nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts )) > sum(nvl(ipb.amount, 0))
              ) o
          group by o.property_id, o.report_date;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    delinquentTenantsLedgerUnits(connection, date, properties) {
      let sql = `
          SELECT property_id, report_date, 
              sum(case when days_unpaid between 0 and 10 then 1 else 0 end) as units_0_10, 
              sum(case when days_unpaid between 11 and 30 then 1 else 0 end) as units_11_30,
              sum(case when days_unpaid between 31 and 60 then 1 else 0 end) as units_31_60,
              sum(case when days_unpaid between 61 and 90 then 1 else 0 end) as units_61_90,
              sum(case when days_unpaid between 91 and 120 then 1 else 0 end) as units_91_120,
              sum(case when days_unpaid between 121 and 180 then 1 else 0 end) as units_121_180,
              sum(case when days_unpaid between 181 and 360 then 1 else 0 end) as units_181_360,
              sum(case when days_unpaid > 360 then 1 else 0 end) as units_361
          from (   
          select up.property_id, up.report_date, up.lease_id, max(up.days_unpaid) as days_unpaid
          from (select u.property_id , '${date}'::text report_date, i.lease_id , i.id as invoice_id, DATEDIFF(day, i.due,'${date}' ) as days_unpaid, (nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts )) as total_amount, sum(nvl(ipb.amount,0)) as total_paid
              from hummingbird.invoices i
              join hummingbird.leases l on l.id = i.lease_id
              join hummingbird.units u on u.id = l.unit_id
              left outer join hummingbird.invoices_payments_breakdown ipb on ipb.invoice_id = i.id
                                                                        and ipb."date" <='${date}' 
              where i.due <= '${date}'
              and (i.void_date is null or trunc(i.void_date ) > '${date}')
              and l.status = 1
              and (l.end_date is null or l.end_date > '${date}')
              and u.property_id in (${properties.join(', ')})
              group by u.property_id , i.lease_id , i.id, DATEDIFF(day, i.due,'${date}' ), nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts)
              having (nvl(i.subtotal, 0) + nvl(i.total_tax , 0) - nvl(i.total_discounts )) > sum(nvl(ipb.amount, 0))
              ) up
          group by up.property_id, up.report_date, up.lease_id) o
          group by o.property_id, o.report_date;
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows[0]: {});
    },

    calculateRevenue(connection, start_date, end_date, properties) {
        let sql = `
            select i.property_id , sum((il.qty * il.cost) - il.total_discounts) as net_revenue
            from hummingbird.invoices i
            join hummingbird.invoice_lines il on il.invoice_id = i.id
            join hummingbird.products p on p.id = il.product_id
                and p."type" not in ('deposit')
                and p.default_type not in ('auction')
            where i.property_id in (${properties.join(', ')})
            and i.due between '${start_date}' and '${end_date}'
            and (i.void_date is null or trunc(i.void_date ) > '${end_date}')
            group by i.property_id;
            `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    leads(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
          select l.property_id, l.lead_date as lead_date, l.source as lead_source, date_part(month, l.lead_date) as lead_month, date_part(year, l.lead_date) as lead_year,
              count(l.contact_id) as day_leads
          from hummingbird.mvw_leads_MS l
          where l.property_id in (${properties.join(', ')})
          and l.lead_date = '${date}'
          group by l.property_id, l.lead_date, l.source, date_part(month, l.lead_date), date_part(year, l.lead_date)
          union all
          select l.property_id, null as lead_date, l.source as lead_source, date_part(month, l.lead_date) as lead_month, date_part(year, l.lead_date) as lead_year,
              count(l.contact_id) as day_leads
          from hummingbird.mvw_leads_MS l
          where l.property_id in (${properties.join(', ')})
          and l.lead_date between '${first_day_of_month}' and '${date}'
          group by l.property_id, l.source, date_part(month, l.lead_date), date_part(year, l.lead_date)
          union all
          select l.property_id, null as lead_date, l.source as lead_source, null as lead_month, date_part(year, l.lead_date) as lead_year,
              count(l.contact_id) as day_leads
          from hummingbird.mvw_leads_MS l
          where l.property_id in (${properties.join(', ')})
          and l.lead_date between '${first_day_of_year}' and '${date}'
          group by l.property_id, l.source, date_part(year, l.lead_date);
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    leadsConverted(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
          select cl.property_id, cl.lead_start_date as lead_date, date_part(month, cl.lead_start_date) as lead_month, date_part(year, cl.lead_start_date) as lead_year,
              count(cl.contact_id) as day_converted_leads
          from hummingbird.mvw_converted_leads_MS cl
          where cl.property_id in (${properties.join(', ')})
          and cl.lead_start_date = '${date}'
          group by cl.property_id, cl.lead_start_date, date_part(month, cl.lead_start_date), date_part(year, cl.lead_start_date)
          union all
          select cl.property_id, null as lead_date, date_part(month, cl.lead_start_date) as lead_month, date_part(year, cl.lead_start_date) as lead_year,
              count(cl.contact_id) as day_converted_leads
          from hummingbird.mvw_converted_leads_MS cl
          where cl.property_id in (${properties.join(', ')})
          and cl.lead_start_date between '${first_day_of_month}' and '${date}'
          group by cl.property_id, date_part(month, cl.lead_start_date), date_part(year, cl.lead_start_date)
          union all
          select cl.property_id, null as lead_date, null as lead_month, date_part(year, cl.lead_start_date) as lead_year,
              count(cl.contact_id) as day_converted_leads
          from hummingbird.mvw_converted_leads_MS cl
          where cl.property_id in (${properties.join(', ')})
          and cl.lead_start_date between '${first_day_of_year}' and '${date}'
          group by cl.property_id, date_part(year, cl.lead_start_date)
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    productRevenue(connection, date, properties, first_day_of_month, first_day_of_year) {
        let sql = `
            select ih.property_id, ih.product, ih.invoice_date as revenue_date, date_part(month, ih.invoice_date) as revenue_month, date_part(year, ih.invoice_date) as revenue_year, sum(ih.revenue_amount) as revenue_amount_
            from hummingbird.mvw_invoices_details_MS ih
            where ih.property_id in (${properties.join(', ')})
            and ih.invoice_date = '${date}'
            and (ih.invoice_void_date is null or trunc(ih.invoice_void_date) > '${date}')
            group by ih.property_id, ih.product, ih.invoice_date, date_part(month, ih.invoice_date), date_part(year, ih.invoice_date)
            union all
            select ih.property_id, ih.product, null as revenue_date, date_part(month, ih.invoice_date) as revenue_month, date_part(year, ih.invoice_date) as revenue_year, sum(ih.revenue_amount) as revenue_amount_
            from hummingbird.mvw_invoices_details_MS ih
            where ih.property_id in (${properties.join(', ')})
            and ih.invoice_date between '${first_day_of_month}' and '${date}'
            and (ih.invoice_void_date is null or trunc(ih.invoice_void_date) > '${date}')
            group by ih.property_id, ih.product, date_part(month, ih.invoice_date), date_part(year, ih.invoice_date)
            union all
            select ih.property_id, ih.product, null as revenue_date, null as revenue_month, date_part(year, ih.invoice_date) as revenue_year, sum(ih.revenue_amount) as revenue_amount_
            from hummingbird.mvw_invoices_details_MS ih
            where ih.property_id in (${properties.join(', ')})
            and ih.invoice_date between '${first_day_of_year}' and '${date}'
            and (ih.invoice_void_date is null or trunc(ih.invoice_void_date) > '${date}')
            group by ih.property_id, ih.product, date_part(year, ih.invoice_date);
        `;

        return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    liabilities(connection, date, properties) {
        let sql = `
        select a.property_id, a.product, a.report_date, sum(a.revenue_amount_) as revenue_amount_, count(distinct a.lease_id) as revenue_spaces_
        from (
            select u.property_id, i.lease_id, case when p.default_type = 'rent' then 'Prepaid Rent'
                    when p.default_type = 'insurance' then 'Prepaid Insurance'
                    when p.default_type in ('late', 'product') then 'Prepaid Fees'
                    else 'Miscellaneous Deposits' end as product, '${date}'::text as report_date,
                    sum(nvl(ila.amount, 0)) as revenue_amount_
            from hummingbird.invoices i
            join hummingbird.leases l on l.id = i.lease_id
            join hummingbird.units u on u.id = l.unit_id
            join hummingbird.invoice_lines il on il.invoice_id = i.id
            join hummingbird.invoice_lines_allocation ila on ila.invoice_line_id = il.id
            join hummingbird.invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
            join hummingbird.payments pm on pm.id = ipb.payment_id
            join hummingbird.products p on p.id = il.product_id
            where u.property_id in (${properties.join(', ')})
            and p.default_type <> 'product'
            and ila."date"<= '${date}'
            and (l.end_date is null or l.end_date > '${date}')
            and ila."type" <> 'tax'
            and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
            and (i.void_date is null or i.void_date > '${date}')
            and ((i.due > '${date}' and p.default_type in ('rent', 'insurance', 'late', 'product')) or (trunc(i.created_at) <= '${date}' and p.default_type not in ('rent', 'insurance', 'late', 'product')))
            group by u.property_id, i.lease_id, case when p.default_type = 'rent' then 'Prepaid Rent'
                    when p.default_type = 'insurance' then 'Prepaid Insurance'
                    when p.default_type in ('late', 'product') then 'Prepaid Fees'
                    else 'Miscellaneous Deposits' end
            having sum(nvl(ila.amount, 0)) > 0 ) a
            group by a.property_id, a.product, a.report_date;
        `;

        return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },

    unAllocatedPayments(connection, date, properties) {
        let sql = `
            select fr.property_id, sum(fr.unallocated_amount) as unallocated_amount_, sum(fr.unallocated_spaces) as unallocated_spaces_
            from (
            select up.property_id, up.contact_id, up.unallocated_amount, count(l.id) as unallocated_spaces
            from (
            select tp.property_id, tp.contact_id, nvl(nvl(tp.total_amount,0) - nvl(rp.refund_amount, 0) - nvl(ap.allocated_amount, 0),0) as unallocated_amount
            from
            (select p.property_id , p.contact_id , sum(nvl(p.amount, 0)) as total_amount
            from hummingbird.payments p
            where p.property_id in (${properties.join(', ')})
            and p.status = 1
            and p.credit_type = 'payment'
            and p.method not in ('credit', 'loss')
            and p."date" <= '${date}'
            group by p.property_id , p.contact_id) tp
            left outer join (SELECT p.property_id, p.contact_id, sum(nvl(ip.amount,0)) as allocated_amount
                            from hummingbird.payments p
                            join hummingbird.invoices_payments_breakdown ip on ip.payment_id = p.id
                            where p.property_id in (${properties.join(', ')})
                            and trunc(ip.created) <= '${date}'
                            and p.credit_type = 'payment'
                            and p.method not in ('credit', 'loss')
                            group by p.property_id, p.contact_id) as ap on ap.property_id = tp.property_id
                                                                        and ap.contact_id = tp.contact_id
            left outer join (SELECT p.property_id, p.contact_id, sum(nvl(r.amount, 0)) as refund_amount
                            from hummingbird.payments p
                            join hummingbird.refunds r on r.payment_id = p.id
                            where p.property_id in (${properties.join(', ')})
                            and trunc(r."date") <= '${date}'
                            and p.status = 1
                            and p.credit_type = 'payment'
                            and p.method not in ('credit', 'loss')
                            group by p.property_id, p.contact_id) as rp on rp.property_id = tp.property_id
                                                                        and rp.contact_id = tp.contact_id
            where nvl(nvl(tp.total_amount,0) - nvl(rp.refund_amount, 0) - nvl(ap.allocated_amount, 0),0) > 0) as up
            join hummingbird.contact_leases cl on cl.contact_id = up.contact_id
            join hummingbird.leases l on l.id = cl.lease_id
            where l.end_date is null
            group by up.property_id, up.contact_id, up.unallocated_amount) fr
            group by fr.property_id;
        `;

        return connection.query(sql).then(r => r.rows.length ? r.rows[0] : {});
    },

    totalLiableUnits(connection, date, properties) {
        let sql = `
            select tf.property_id, tf.report_date, count(tf.lease_id) as revenue_spaces_
            from (
            select u.property_id, '${date}'::text as report_date, i.lease_id as lease_id, sum(nvl(ila.amount, 0)) as liability_amount
            from hummingbird.invoices i
            join hummingbird.leases l on l.id = i.lease_id
            join hummingbird.units u on u.id = l.unit_id
            join hummingbird.invoice_lines il on il.invoice_id = i.id
            join hummingbird.invoice_lines_allocation ila on ila.invoice_line_id = il.id
            join hummingbird.invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
            join hummingbird.payments pm on pm.id = ipb.payment_id
            join hummingbird.products p on p.id = il.product_id
            where u.property_id in (${properties.join(', ')})
            and p.default_type <> 'product'
            and ila."date"<= '${date}'
            and (l.end_date is null or l.end_date > '${date}')
            and ila."type" <> 'tax'
            and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
            and (i.void_date is null or i.void_date > '${date}')
            and ((i.due > '${date}' and p.default_type in ('rent', 'insurance', 'late', 'product')) or (trunc(i.created_at) <= '${date}' and p.default_type not in ('rent', 'insurance', 'late', 'product')))
            group by u.property_id, i.lease_id
            having sum(nvl(ila.amount, 0))>0
            union
            select up.property_id, '${date}'::text as report_date, l.id as lease_id, unallocated_amount
            from (
            select tp.property_id, tp.contact_id, nvl(nvl(tp.total_amount,0) - nvl(rp.refund_amount, 0) - nvl(ap.allocated_amount, 0),0) as unallocated_amount
            from
            (select p.property_id , p.contact_id , sum(nvl(p.amount, 0)) as total_amount
            from hummingbird.payments p
            where p.property_id in (${properties.join(', ')})
            and p.status = 1
            and p.credit_type = 'payment'
            and p.method not in ('credit', 'loss')
            and p."date" <= '${date}'
            group by p.property_id , p.contact_id) tp
            left outer join (SELECT p.property_id, p.contact_id, sum(nvl(ip.amount, 0)) as allocated_amount
                            from hummingbird.payments p
                            join hummingbird.invoices_payments_breakdown ip on ip.payment_id = p.id
                            where p.property_id in (${properties.join(', ')})
                            and trunc(ip.created) <= '${date}'
                            and p.status = 1
                            and p.credit_type = 'payment'
                            and p.method not in ('credit', 'loss')
                            group by p.property_id, p.contact_id) as ap on ap.property_id = tp.property_id
                                                                        and ap.contact_id = tp.contact_id
            left outer join (SELECT p.property_id, p.contact_id, sum(nvl(r.amount, 0)) as refund_amount
                            from hummingbird.payments p
                            join hummingbird.refunds r on r.payment_id = p.id
                            where p.property_id in (${properties.join(', ')})
                            and trunc(r."date") <= '${date}'
                            and p.status = 1
                            and p.credit_type = 'payment'
                            and p.method not in ('credit', 'loss')
                            group by p.property_id, p.contact_id) as rp on rp.property_id = tp.property_id
                                                                        and rp.contact_id = tp.contact_id
            where nvl(nvl(tp.total_amount,0) - nvl(rp.refund_amount, 0) - nvl(ap.allocated_amount, 0),0) >0) as up
            join hummingbird.contact_leases cl on cl.contact_id = up.contact_id
            join hummingbird.leases l on l.id = cl.lease_id
            where l.end_date is null) tf
            group by tf.property_id, tf.report_date;
        `;

        return connection.query(sql).then(r => r.rows.length ? r.rows[0] : {});
    },

    baseRates(connection, date, properties) {
      let sql = `
          select upc.* , max(created) over (partition by unit_id order by created desc rows between 1 PRECEDING and 1 FOLLOWING) as end_date
          from unit_price_changes upc  
          where upc.unit_id = 12144
          order by created asc;    
      `;

      return connection.query(sql).then(r => r.rows.length ? r.rows: []);
    },
  };
