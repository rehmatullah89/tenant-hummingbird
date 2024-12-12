var Sql = require(__dirname + '/../../../modules/sql_snippets.js');

module.exports = {

  /*<--- MSR --->*/
  
  //Summarized
  async summaryReservedUnits(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
        with mvw_reservation_ms as ( ${this.getReservations(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))} )
        
        SELECT ru.property_id, ru.reservation_date, date_format( ru.reservation_date,'%m') as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
            SUM(day_reservations) as reservations_
        from mvw_reservation_ms ru
        where ru.property_id in (${properties.join(', ')})
            and ru.reservation_date = '${date}'
        group by ru.property_id, ru.reservation_date, date_format( ru.reservation_date,'%m'), date_format( ru.reservation_date,'%Y')
            
        union all
        SELECT ru.property_id, null as reservation_date, date_format( ru.reservation_date,'%m') as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
            SUM(day_reservations) as reservations_
        from mvw_reservation_ms ru
        where ru.property_id in (${properties.join(', ')})
            and ru.reservation_date BETWEEN '${first_day_of_month}' and '${date}'
        group by ru.property_id, date_format( ru.reservation_date,'%m'), date_format( ru.reservation_date,'%Y')
            
        union all
        SELECT ru.property_id, null as reservation_date, null as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
            SUM(day_reservations) as reservations_
        from mvw_reservation_ms ru
        where ru.property_id in (${properties.join(', ')})
            and ru.reservation_date BETWEEN '${first_day_of_year}' and '${date}'
        group by ru.property_id, date_format( ru.reservation_date,'%Y');

    `;
    // 243ms
    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  //Detailed

  detailedReservations(connection, property_ids, start_date, end_date){
    let sql = `
      select * from (
        ${this.getReservations(property_ids.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      ) res
    `;

    console.log("detailedReservations SQL", sql);

    return connection.queryAsync(sql);
  },

  //Snippet
  getReservations(properties, start_date, end_date){
    let sql = `
        SELECT u.property_id, concat(c.first,' ',c.last) as tenant_name, u.id as unit_id, u.number as unit_number, l.id as lease_id, l.status as status, l.start_date as lease_start_date, 1 as day_reservations, l.rent as reservation_rent,
            DATE(CONVERT_TZ (r.created, '+00:00', p.utc_offset)) as reservation_date,
            DATE(CONVERT_TZ (r.expires, '+00:00', p.utc_offset)) as expiration_date,
            ${Sql.get_unit_area('u.id')} as day_sqft
        from reservations r
            join leases l on l.id = r.lease_id
            join units u on u.id = l.unit_id
            join properties p on p.id = u.property_id
            join leads ld on ld.lease_id = r.lease_id
            join contacts c on c.id = ld.contact_id
        where u.property_id in (${properties.join(', ')})
        having reservation_date BETWEEN ${start_date} and ${end_date}
    `;

    return sql;
},

    /*<--- MHR --->*/
    summaryReservedUnitsByMonths(connection, payload) {
        let {properties, start_date, end_date} = payload;
        
        let sql = `
            WITH cte_reservation as (${this.getReservations(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))})
            SELECT DATE_FORMAT(cr.reservation_date, '%M-%y') as reservation_month, sum(cr.day_reservations) as reservation_count
            FROM cte_reservation cr
            GROUP BY reservation_month
            ORDER BY cr.reservation_date desc;`
        
        console.log('summaryReservedUnitsByMonths', sql)
        return connection.queryAsync(sql);
    }

}