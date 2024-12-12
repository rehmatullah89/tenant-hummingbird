var moment  = require('moment');
var Sql = require(__dirname + '/../../modules/sql_snippets.js');
var TotalUnits  = require('./activity/total_units.js');

module.exports = {

  //Summarized

  async summaryOccupiedUnits(connection, date, properties) { //summaryOccupiedUnits
    let sql = `
      with mvw_occupied_ms as ( ${this.getOccupiedUnits(date, properties)} )
              
      select ou.property_id, count(ou.unit_id) as occupied_, sum(cast(ou.occupied_sqft as decimal(10,2))) as occupied_sqft_, sum(ou.occupied_rent) as occupied_rent_, sum(ou.occupied_base_rent) as occupied_base_rent_
      from mvw_occupied_ms ou
      group by ou.property_id
    `;
    // 214ms
    console.log('summaryOccupiedUnits query:', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },
    
  async summaryComplimentaryUnits(connection, date, properties) { //summaryComplimentaryUnits

    let sql = `
      with mvw_occupied_ms as ( ${this.getOccupiedUnits(date, properties)} )
                
      select cu.property_id, count(cu.unit_id) as complimentary_, sum(cast(cu.occupied_sqft as decimal(10,2))) as complimentary_sqft_, sum(cu.occupied_base_rent) as complimentary_base_rent_
      from mvw_occupied_ms cu
      where cu.occupied_rent = 0
      group by cu.property_id
    `;
    // 192ms
    console.log('summaryComplimentaryUnits query:', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async summaryReservedUnits(connection, date, properties) {
    let sql = `
      with mvw_reservation_ms as (
        SELECT 
          u.property_id, u.id as unit_id,
          l.id as lease_id, l.status as status,
          DATE(CONVERT_TZ ( r.created, '+00:00', p.utc_offset))  as reservation_date, 
          DATE(CONVERT_TZ ( r.expires, '+00:00', p.utc_offset)) as expiration_date,  
          l.start_date as lease_start_date, 
          1 as day_reservations, 
          ${Sql.get_unit_area('u.id')} as day_sqft,
          l.rent as reservation_rent
        from reservations r
          join leases l on l.id = r.lease_id 
          join units u on u.id = l.unit_id 
          join properties p on p.id = u.property_id 
        where u.property_id in (${properties.join(', ')})
      )
        
      select tu.property_id, sum(tu.day_reservations) as total_, sum(tu.day_sqft) as total_reserved_sqft_, sum(tu.reservation_rent) as reservation_rent_
      from mvw_reservation_ms tu
      where tu.property_id in (${properties.join(', ')})
        and tu.reservation_date <= '${date}'
        and ifnull(case when tu.status <> 1 then tu.expiration_date else tu.lease_start_date end, '${date}' )> '${date}'
        and (tu.status <> 1 or (tu.lease_start_date <= '${date}' and tu.status = 1))
      group by tu.property_id 
    `;

    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  //Detailed

  detailOccupiedList(connection, company_id, property_id, date) {
    date =  moment(date).format('YYYY-MM-DD');

    let sql = `
      with mvw_occupied_ms as ( ${this.getOccupiedUnits(date, [property_id])} )
      SELECT 
        oc.tenant_name as name, 
        ${Sql.unit_status('oc.unit_id')} as space_status,
        oc.number as space_number, 
        oc.label as space_size, 
        oc.description as unit_category,
        oc.unit_type as unit_type,
        oc.occupied_sqft as area,
        oc.occupied_base_rent,
        oc.occupied_rent

      from mvw_occupied_ms oc
    
    `;
    console.log('detailOccupiedList query:', sql);

    return connection.queryAsync(sql);
  },

  detailVacantList(connection, company_id, property_id, date) {
    date =  moment(date).format('YYYY-MM-DD');

    let sql = `
      with mvw_occupied_ms as ( ${this.getOccupiedUnits(date, [property_id])} ),
      mvw_total_ms as ( ${TotalUnits.totalUnits(date, [property_id].join(', '))} ),
      mvw_vacant_ms as (
        select mtm.* from mvw_total_ms mtm
          where mtm.unit_id not in (select unit_id from mvw_occupied_ms)
      )      
      select
        ${Sql.unit_status('u.id')} as space_status,
        u.number as space_number, 
        u.label as space_size, 
        uc.description as unit_category,
        u.type as unit_type,
        ${Sql.get_unit_area('u.id')} as area,
        ifnull(upc.price, 0) as occupied_base_rent
      from units u
        left join unit_categories uc on uc.id = u.category_id
        left join unit_price_changes upc on upc.unit_id = u.id
      where u.property_id in (${property_id}) 
        and u.id in (select mvm.unit_id from mvw_vacant_ms mvm)
      group by u.id
    `;
    console.log('detailVacantList query:', sql);

    return connection.queryAsync(sql);
  },

  //Snippet

  getOccupiedUnits(date, properties){
    let sql = `
      select u.property_id,
        u.status,
        u.id as unit_id,
        l.id as lease_id,
        u.category_id as unit_category_id,
        u.type as unit_type,
        upc.id as unit_price_id,
        ${Sql.get_unit_area('u.id')} as occupied_sqft, 
        ifnull(upc.price, 0) as occupied_base_rent,
        ifnull(s.price, 0) as occupied_rent,
        concat(c.first, " ", c.last) as tenant_name,
        u.number, 
        u.label, 
        uc.description,
        '${date}' as date
      from units u
        join properties p on p.id = u.property_id
        join leases l on l.unit_id = u.id 
        left join services s on s.lease_id = l.id and s.product_id = u.product_id and s.status = 1 and ('${date}' >= s.start_date and (s.end_date is null or s.end_date >= '${date}'))
        left join (
          select upc.*
          from unit_price_changes upc
            join units u on u.id = upc.unit_id
            join properties p on p.id = u.property_id
          where DATE(CONVERT_TZ(upc.start, '+00:00', p.utc_offset )) <= '${date}' and (upc.end is null or DATE(CONVERT_TZ(upc.end, '+00:00', p.utc_offset )) > '${date}')
            and u.property_id in (${properties.join(', ')})
        ) upc on upc.unit_id = u.id
        left join contact_leases cl on cl.lease_id = l.id and \`primary\` = 1
        left join contacts c on c.id = cl.contact_id
        left join unit_categories uc on uc.id = u.category_id
      where u.property_id in (${properties.join(', ')})
        and l.status = 1
        and ('${date}' >= l.start_date and (l.end_date is null or l.end_date > '${date}'))
      group by u.id
    `;

    return sql;
  },

  // MHR 
  occupiedAndComplimentaryUnitsByMonths(connection, payload) {
    let {date_range, properties} = payload;
    date_range = date_range || [];
    let property_ids = properties.map(p => connection.escape(p));

    let sql = `
    WITH occupied_units as (${date_range.map(d => this.getOccupiedUnits(d, property_ids)).join(`\nUNION ALL\n`)})
    SELECT
      DATE_FORMAT(ou.date, '%M-%y') as month,
      count(ou.unit_id) as occupied_count,
      sum(cast(ou.occupied_sqft as decimal(10,2))) as occupied_sqft,
      (select count(ouu.unit_id) as complimentary_count from occupied_units ouu where ouu.occupied_rent = 0 and ouu.date = ou.date GROUP BY ou.property_id, month) as complimentary_count,
      (Select sum(cast(ouu.occupied_sqft as decimal(10,2))) as complimentary_sqft from occupied_units ouu where ouu.occupied_rent = 0 and ouu.date = ou.date GROUP BY ou.property_id, month) as complimentary_sqft
    FROM occupied_units ou
    GROUP BY ou.property_id, month
    ORDER BY ou.date desc;`

    console.log('summaryOccupiedUnitsByMonths', sql);
    return connection.queryAsync(sql);
  },

  summaryReservedUnitsByMonths(connection, payload) {
    let {date_range, properties} = payload;
    date_range = date_range || [];
    let property_ids = properties.map(p => connection.escape(p));

    let sql = `
      WITH reserved_units as (${date_range.map(d => this.getReservations(d, property_ids)).join(`\nUNION ALL\n`)})
      SELECT
        DATE_FORMAT(ru.date, '%M-%y') as month,
        sum(ru.day_reservations) as reserved_count,
        sum(ru.day_sqft) as reserved_sqft
      FROM reserved_units ru
      GROUP BY ru.property_id, month
      ORDER BY ru.date desc;`

      console.log('summaryReservedUnitsByMonths', sql);
      return connection.queryAsync(sql);
  },

  //Snippet
  getReservations(date, properties) {
    let sql = `
     SELECT 
        u.property_id, u.id as unit_id,
        l.id as lease_id, l.status as status,
        DATE(CONVERT_TZ ( r.created, '+00:00', p.utc_offset))  as reservation_date, 
        DATE(CONVERT_TZ ( r.expires, '+00:00', p.utc_offset)) as expiration_date,  
        l.start_date as lease_start_date, 
        1 as day_reservations, 
        ${Sql.get_unit_area('u.id')} as day_sqft,
        l.rent as reservation_rent,
        ${date ? `'${date}'` : null} as date
    from reservations r
      join leases l on l.id = r.lease_id 
      join units u on u.id = l.unit_id 
      join properties p on p.id = u.property_id 
    where u.property_id in (${properties.join(', ')}) `
    
    if(date) sql += `\n 
        and (l.status <> 1 or (l.start_date <= '${date}' and l.status = 1))
      HAVING reservation_date <= '${date}'
        and ifnull(case when l.status <> 1 then expiration_date else l.start_date end, '${date}' )> '${date}'`

    return sql;
  }

}