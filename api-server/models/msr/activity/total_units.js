var Sql = require(__dirname + '/../../../modules/sql_snippets.js');

module.exports = {

  /*<--- MSR --->*/

  async totalUnitsByProperty(connection, date, properties) {
    let sql = `
        with mvw_total_ms as ( ${this.totalUnits(date, properties.join(', '))} )
        
        select tu.property_id, count(tu.unit_id) as total_, sum(cast(tu.units_sqft as decimal(10,2))) as total_sqft_, sum(tu.units_base_rent) as total_baserent_
        from mvw_total_ms tu
        group by tu.property_id
    `;

   return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  //Snippet

  totalUnits(date, properties){
    let sql = `
        select u.property_id, 
            u.id as unit_id,
            upc.id as unit_price_id,
            usc.id as unit_status_change_id,
            DATE(CONVERT_TZ(u.created, '+00:00', p.utc_offset)) as created_date,
            DATE(CONVERT_TZ(u.deleted, '+00:00', p.utc_offset)) as removed_date,
            u.status,
            IFNULL(au_width.value, 0) as unit_width,
            IFNULL(au_length.value, 0) as unit_length,
            CAST((ifnull(au_width.value,0) * ifnull(au_length.value,0)) as decimal(10,2)) as units_sqft,
            ifnull(upc.price, 0) as units_base_rent,
            ifnull(upc.set_rate, 0) as unit_set_rate,
            u.type as type,
            '${date}' as date
        from units u
            join properties p on p.id = u.property_id
            LEFT JOIN amenity_units as au_width on u.id = au_width.unit_id and au_width.amenity_property_id = (select distinct ap.id from amenity_property ap where ap.property_id = u.property_id and ap.amenity_name = 'width' and ap.property_type = u.type)
            LEFT JOIN amenity_units as au_length on u.id = au_length.unit_id and au_length.amenity_property_id = (select distinct ap.id from amenity_property ap where ap.property_id = u.property_id and ap.amenity_name = 'length' and ap.property_type = u.type)
            left join (
                select upc.*
                from unit_price_changes upc
                join (
                    select MAX(upc.id) as max_id
                    from unit_price_changes upc
                        join units u on u.id = upc.unit_id
                        join properties p on p.id = u.property_id
                    where DATE(CONVERT_TZ(upc.start, '+00:00', p.utc_offset )) <= '${date}' and (upc.end is null or DATE(CONVERT_TZ(upc.end, '+00:00', p.utc_offset )) > '${date}')
                        and u.property_id in (${properties})
                    group by upc.unit_id
                ) tupc on tupc.max_id = upc.id
            ) upc on upc.unit_id = u.id
            left join (
                select usc.*
                from unit_status_changes usc
                join (
                    select MAX(usc.id) as max_id
                    from unit_status_changes usc
                        join units u on u.id = usc.unit_id
                        join properties p on p.id = u.property_id
                    where u.property_id in (${properties}) and usc.status in ('activated','deactivated') and usc.date <= '${date}'
                    group by usc.unit_id
                ) lusc on lusc.max_id = usc.id  
            ) usc on usc.unit_id = u.id
        where u.property_id in (${properties})
            and (usc.id is null or usc.status != 'deactivated')
        group by u.id
        having '${date}' between created_date and ifnull(removed_date, '${date}')
    `;

    return sql;
  },

  /*<--- MHR --->*/
  totalUnitsDataByMonths(connection, payload){
    let {date_range, properties} = payload;
    date_range = date_range || [];
    let property_ids = properties.map(p => connection.escape(p));

    let sql = `
        WITH total_units as (${date_range.map(d => this.totalUnits(d, property_ids.join(', '))).join(`\nUNION ALL\n`)})
        SELECT 
            DATE_FORMAT(tu.date, '%M-%y') as month,
            count(tu.unit_id) as total_count,
            sum(cast(tu.units_sqft as decimal(10,2))) as total_sqft
        FROM total_units tu
        GROUP BY tu.property_id, month
        ORDER BY tu.date desc;`
    
    console.log('totalUnitsDataByMonths ', sql);
    return connection.queryAsync(sql);
  }

}