var moment = require('moment');

var Activity = {

  /*<--- MSR --->*/
  //Summarized
  async summaryMoveIns(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with mvw_rental_moveins_ms as (${this.getMoveIns(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))})

      SELECT mi.property_id, mi.move_in_date as start_date, date_format( mi.move_in_date,'%m') as movein_month, date_format( mi.move_in_date,'%Y') as movein_year,
        count(*) as movins_ 
      from mvw_rental_moveins_ms mi
      where mi.property_id in (${properties.join(', ')})
        and mi.move_in_date = '${date}'
      group by mi.property_id, mi.move_in_date, date_format( mi.move_in_date,'%m'), date_format( mi.move_in_date,'%Y')
      
      union all
      SELECT mi.property_id, null as start_date, date_format( mi.move_in_date,'%m') as movein_month, date_format( mi.move_in_date,'%Y') as movein_year,
        count(*) as movins_ 
      from mvw_rental_moveins_ms mi
      where mi.property_id in (${properties.join(', ')})
        and mi.move_in_date BETWEEN '${first_day_of_month}' and '${date}'
      group by mi.property_id, date_format( mi.move_in_date,'%m'), date_format( mi.move_in_date,'%Y')
      
      union all
      SELECT mi.property_id, null as start_date, null movein_month, date_format( mi.move_in_date,'%Y') as movein_year,
        count(*) as movins_ 
      from mvw_rental_moveins_ms mi
      where mi.property_id in (${properties.join(', ')})
        and mi.move_in_date BETWEEN '${first_day_of_year}' and '${date}'
      group by mi.property_id, date_format( mi.move_in_date,'%Y')
    `;

    // 177ms
    console.log('summaryMoveIns query:', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  summaryMoveInsByProperty(connection, properties, start_date, end_date){
    let sql = `
      with cte_move_ins as ( ${this.getMoveIns(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
      select cmi.property_id, cmi.move_in_date, count(*) as move_in_count
      from cte_move_ins cmi
      group by cmi.property_id
    `;

    console.log('summaryMoveInsByProperty query:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  /*<--- Detailed Rental Activity Move In--->*/
  detailRentalActivityMoveIn(connection, company_id, property_id, date, end_date) {
    //prom value has type which can be percentage
    date =  moment(date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');

    let sql = `
      select * from (
        ${this.getMoveIns([property_id], connection.escape(date), connection.escape(end_date))}
      ) res
    `;

    console.log('detailRentalActivityMoveIn query:', sql);
    return connection.queryAsync(sql);
  },

  // Snippet Move In
  getMoveIns(properties, start_date, end_date){
    let sql = `
      select p.id as property_id, u.number as unit_number, u.type as unit_type, u.id as unit_id, c.id as contact_id, l.id as lease_id, comp.name as company_name, u.label as unit_size, uc.name as category_name, concat(c.first,' ',c.last) as name, l.start_date as move_in_date, 
        (${Activity.lease_service_amount('l.id', 'l.start_date', 'rent')}) as rent,
        (${Activity.lease_service_amount('l.id', 'l.start_date', 'insurance')}) as insurance_premium,
        (SELECT IFNULL(SUM(total_discounts),0) from invoices where lease_id = l.id and status = 1 and DATE(period_start) = l.start_date) as promotion_amount,
        (SELECT GROUP_CONCAT(name SEPARATOR ', ') from promotions where id in (SELECT promotion_id from discounts where lease_id = l.id and start = l.start_date)) as promotion_names,
        (${Activity.unit_price('l.unit_id', 'l.start_date')}) as space_rate,
        ((${Activity.unit_price('l.unit_id', 'l.start_date')}) - (${Activity.lease_service_amount('l.id', 'l.start_date', "rent")})) as variance,
        (SELECT IFNULL(DATEDIFF(l.start_date, (select MAX(end_date) from leases WHERE end_date <= l.start_date and  status = 1 and unit_id = l.unit_id)),0) ) as days_vacant,
        (${Activity.unit_area('l.unit_id')}) as unit_area      
      from  leases as l
        inner join units u on l.unit_id = u.id        
        inner join properties p on u.property_id = p.id
        inner join contact_leases cl on cl.lease_id = l.id
        inner join contacts c on c.id = cl.contact_id
        inner join companies comp on c.company_id = comp.id
        left join unit_categories uc on u.category_id = uc.id
      where l.start_date >= ${start_date}
        and l.start_date <= ${end_date}
        and u.property_id in (${properties.join(', ')})
        and l.id not in (select to_lease_id from transfers where to_lease_id = l.id)
        and l.status = 1
        and cl.primary = 1
    `;

    return sql;
  },

  /*<--- MSR --->*/
  //Summarized
  async summaryMoveOuts(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with mvw_rental_moveouts_ms as (${this.getMoveOuts(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))})
      
      SELECT mo.property_id, mo.move_out_date as end_date, date_format( mo.move_out_date,'%m') as moveout_month, date_format( mo.move_out_date,'%Y') as moveout_year,
                  COUNT(*) as moveouts_ 
      from mvw_rental_moveouts_ms mo
      where mo.property_id in (${properties.join(', ')})
        and mo.move_out_date = '${date}'
      group by mo.property_id, mo.move_out_date, date_format( mo.move_out_date,'%m'), date_format( mo.move_out_date,'%Y')
              
      union all
      SELECT mo.property_id, null as end_date, date_format( mo.move_out_date,'%m') as moveout_month, date_format( mo.move_out_date,'%Y') as moveout_year,
          COUNT(*) as moveouts_ 
      from mvw_rental_moveouts_ms mo
      where mo.property_id in (${properties.join(', ')})
        and mo.move_out_date BETWEEN '${first_day_of_month}' and '${date}'
      group by mo.property_id, date_format( mo.move_out_date,'%m'), date_format( mo.move_out_date,'%Y')
              
      union all
      SELECT mo.property_id, null as end_date, null as moveout_month, date_format( mo.move_out_date,'%Y') as moveout_year,
          COUNT(*) as moveouts_ 
      from mvw_rental_moveouts_ms mo
      where mo.property_id in (${properties.join(', ')})
        and mo.move_out_date BETWEEN '${first_day_of_year}' and '${date}'
      group by mo.property_id, date_format( mo.move_out_date,'%Y');
    `;

    // 188ms
    console.log('findRentalActivityMoveOut query:', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  summaryMoveOutsByProperty(connection, properties, start_date, end_date){
    let sql = `
      with cte_move_outs as ( ${this.getMoveOuts(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
      select cmo.property_id, cmo.move_out_date, count(*) as move_out_count
      from cte_move_outs cmo
      group by cmo.property_id
    `;

    console.log('summaryMoveOutsByProperty query:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  /*<--- Detailed Rental Activity Move Out--->*/
  detailRentalActivityMoveOut(connection, company_id, property_id, date, end_date) {
    date =  moment(date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');

    let sql = `
      select * from (
        ${this.getMoveOuts([property_id], connection.escape(date), connection.escape(end_date))}
      ) res
    `;

    console.log('detailRentalActivityMoveOut query:', sql);
    return connection.queryAsync(sql);
  },

  // Snippet Move Outs
  getMoveOuts(properties, start_date, end_date){
    let sql = `
        select p.id as property_id, u.number as unit_number, u.type as unit_type, u.id as unit_id, c.id as contact_id,l.id as lease_id, comp.name as company_name, u.label as unit_size, uc.name as category_name, concat(c.first,' ',c.last) as name, l.end_date as move_out_date,
        (${Activity.lease_service_amount('l.id', 'l.start_date', 'rent')}) as rent,
        (${Activity.lease_service_amount('l.id', 'l.start_date', 'insurance')}) as insurance_premium,
        (${Activity.unit_price('l.unit_id', 'l.start_date')}) as space_rate,
        ((${Activity.unit_price('l.unit_id', 'l.start_date')}) - (${Activity.lease_service_amount('l.id', 'l.start_date', "rent")})) as variance,
        (SELECT IFNULL(DATEDIFF(l.end_date, l.start_date),0)) as days_in_space,
        (SELECT IF((SELECT id from lease_auctions where lease_id = l.id and deleted_at IS NULL having max(id)) IS NOT NULL, 'Yes', 'No')) as auction,
        (${Activity.unit_area('l.unit_id')}) as unit_area
      from  leases as l
        inner join units u on l.unit_id = u.id
        inner join properties p on u.property_id = p.id
        inner join contact_leases cl on cl.lease_id = l.id
        inner join contacts c on c.id = cl.contact_id
        inner join companies comp on c.company_id = comp.id
        left join unit_categories uc on u.category_id = uc.id
      where l.end_date >= ${start_date}
        and l.end_date <= ${end_date}
        and u.property_id in (${properties.join(', ')})
        and l.id not in (select from_lease_id from transfers where from_lease_id = l.id)
        and l.status = 1
        and cl.primary = 1
    `;

    return sql;
  },

  lease_service_amount(lease_id, date, dataType){
    let lease_rent_and_insurance = `(SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = '${dataType}') and lease_id = ${lease_id}  AND status = 1 and start_date <= ${date} and (end_date is null or end_date > ${date}) )`;
    return lease_rent_and_insurance;
  },

  unit_price(unit_id, date){
    let unit_price = `(SELECT IFNULL( (SELECT price from unit_price_changes where DATE(created) <= ${date} and unit_id = ${unit_id} order by id desc limit 1),(SELECT upc.set_rate from unit_price_changes upc where DATE(upc.created) <= CURRENT_DATE() and upc.unit_id = ${unit_id} order by upc.id DESC limit 1)) as price )`;
    return unit_price;
  },

  unit_area(unit_id){
    let area_sql = " (SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = " + unit_id + ") and unit_id = " + unit_id+ ") * " +
    " (SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = " + unit_id+ ") and unit_id = " + unit_id+ ")";
    console.log("new query is ", area_sql);
    return area_sql;
  },

  /*<--- MHR Move-In--->*/
  summaryMoveInByMonths(connection, payload){
    let {properties, start_date, end_date} = payload;
    
    let sql = `
      WITH cte_move_ins as ( ${this.getMoveIns(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))})
      SELECT DATE_FORMAT(cmi.move_in_date, '%M-%y') as move_in_month, count(*) as move_in_count
      FROM cte_move_ins cmi
      GROUP BY move_in_month
      ORDER BY cmi.move_in_date desc;`

    console.log('summaryMoveInByMonths query:', sql);
    return connection.queryAsync(sql); 
  },

  /*<--- MHR Move-Outs--->*/
  summaryMoveOutByMonths(connection, payload){
    let {properties, start_date, end_date} = payload;

    let sql = `
      WITH cte_move_outs as (${this.getMoveOuts(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))})
      SELECT DATE_FORMAT(cmo.move_out_date, '%M-%y') as move_out_month, count(*) as move_out_count
      FROM cte_move_outs cmo
      GROUP BY move_out_month
      ORDER BY cmo.move_out_date desc`

    console.log('summaryMoveOutByMonths query:', sql);
    return connection.queryAsync(sql); 
  }
}

module.exports = Activity;