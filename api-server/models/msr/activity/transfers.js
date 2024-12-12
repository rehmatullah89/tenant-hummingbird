var moment = require('moment');

module.exports = {

  /*<--- MSR --->*/

  async summaryTransfers(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `
      WITH cte_transfers as (${this.findTransfers(properties, connection.escape(first_day_of_year), connection.escape(date))}),

      cte_transfer_summary as (
        SELECT t.property_id, t.transfer_date, count(t.out_lease_id) as day_transfers
        FROM cte_transfers t
        GROUP BY t.property_id, t.transfer_date
      ) 

      SELECT rt.property_id , date(rt.transfer_date) as transfer_date, date_format( rt.transfer_date,'%m') as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
                  sum(rt.day_transfers) as day_transfers
      FROM cte_transfer_summary rt
      WHERE rt.property_id in ((${properties.join(', ')}))
        and rt.transfer_date = ${connection.escape(date)}
      GROUP BY rt.property_id , date(rt.transfer_date), date_format( rt.transfer_date,'%m'), date_format( rt.transfer_date,'%Y')
              
      union all
      SELECT rt.property_id , null as transfer_date, date_format( rt.transfer_date,'%m') as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
          sum(rt.day_transfers) as day_transfers
      FROM cte_transfer_summary rt
      WHERE rt.property_id in ((${properties.join(', ')}))
        and rt.transfer_date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      GROUP BY rt.property_id, date_format( rt.transfer_date,'%m'), date_format( rt.transfer_date,'%Y')
              
      union all
      SELECT rt.property_id , null as transfer_date, null as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
          sum(rt.day_transfers) as day_transfers
      FROM cte_transfer_summary rt
      WHERE rt.property_id in ((${properties.join(', ')}))
        and rt.transfer_date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      GROUP BY rt.property_id, date_format( rt.transfer_date,'%Y');
    `;

    // 178ms
    console.log('Summary Transfers:' ,sql)
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  /*<--- Detailed Transfer Report --->*/
  
  detailFindTransfers(connection, company_id, property_id, date, end_date) {
    date =  connection.escape(moment(date).format('YYYY-MM-DD'));
    end_date =  connection.escape(moment(end_date).format('YYYY-MM-DD'));

    sql = `
      WITH cte_transfers as (${this.findTransfers([property_id], date, end_date, company_id)})
      
      SELECT t.property_id, t.tenant_name, t.transfer_date,
        t.contact_id, t.out_unit_number, t.out_unit_size, t.out_unit_category, t.out_balance,
        t.out_lease_id, t.out_unit_id, t.out_rent,
        t.in_unit_number, t.in_unit_size, t.in_unit_category, t.in_balance,
        t.transfer_balance, t.in_lease_id, t.in_unit_id,
        t.in_rent, t.out_total_days,
        t.user_name, t.notes, t.reason
      FROM cte_transfers t
    `;

    console.log('Detail Transfers Report query:', sql);
    return connection.queryAsync(sql);

  },


  //Snippet

  findTransfers(properties, start_date, end_date, company_id) {
    let sql = `
      SELECT u_out.property_id, concat(c.first,' ',c.last) as tenant_name, t.date as transfer_date,
        c.id as contact_id,u_out.number as out_unit_number, u_out.label as out_unit_size, cat_out.name as out_unit_category, t.transfer_out_balance as out_balance,
        l_out.id as out_lease_id,
        l_out.unit_id as out_unit_id,
        (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = t.from_lease_id and start_date <= t.date and (end_date is null or end_date > t.date) ) as out_rent,
        u_in.number as in_unit_number, u_in.label as in_unit_size, cat_in.name as in_unit_category, t.transfer_in_balance as in_balance,
        t.transfer_in_balance-t.transfer_out_balance as transfer_balance,
        l_in.id as in_lease_id,
        l_in.unit_id as in_unit_id,
        (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = t.to_lease_id and start_date <= t.date and (end_date is null or end_date > t.date) ) as in_rent,
        (SELECT DATEDIFF(t.date, l_out.start_date)) as out_total_days,
        concat(u.first,' ',u.last) as user_name, t.notes, t.reason
      FROM transfers as t
        inner join leases l_out on l_out.id = t.from_lease_id
        inner join units u_out on u_out.id = l_out.unit_id
        inner join properties p on p.id = u_out.property_id
        left join unit_categories cat_out on cat_out.id = u_out.category_id
        inner join leases l_in on l_in.id = t.to_lease_id
        inner join units u_in on u_in.id = l_in.unit_id
        left join unit_categories cat_in on cat_in.id = u_in.category_id
        inner join contact_leases cl on cl.lease_id = t.to_lease_id
        inner join contacts c on c.id = cl.contact_id
        inner join contacts u on u.id = t.contact_id
      WHERE cl.primary  = 1
          and l_out.status = 1
          and l_in.status = 1
          and   p.id in (${properties.join(', ')})
          and   t.date >= ${start_date}
          and   t.date <= ${end_date}
    `;

    if(company_id)
      sql += `and p.company_id = ${company_id}`

    return sql;
  },

  /*<--- MHR --->*/

  summaryTransfersByMonths(connection, payload){
    let {properties, start_date, end_date} = payload;
    
    let sql = `
      WITH cte_transfers as (${this.findTransfers(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))})
      SELECT DATE_FORMAT(ct.transfer_date, '%M-%y') as transfer_month, count(ct.out_lease_id) as transfer_count
      FROM cte_transfers ct
      GROUP BY transfer_month
      ORDER BY ct.transfer_date desc;`

    console.log('summaryTransfersByMonths', sql)
    return connection.queryAsync(sql);
  }


}