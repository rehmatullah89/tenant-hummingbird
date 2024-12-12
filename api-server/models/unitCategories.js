var Sql = require(__dirname + '/../modules/sql_snippets.js');



module.exports = {

    findCategoryList:function(connection, company_id, properties = [], params){


        if(properties && properties.length){
            var sql = "Select * from unit_categories where status = 1 and company_id = " + connection.escape(company_id) + " and id in (select category_id from units where property_id in ( " +   properties.map(p => connection.escape(p)).join(', ') + " ))";
        } else {
            var sql = "Select * from unit_categories where status = 1 and company_id = " + connection.escape(company_id);
        }

        if(params){
            if(params.type){
                sql += " and unit_type = " + connection.escape(params.type);
            }
        }

        sql += " ORDER BY sort asc, id DESC"

        console.log(sql);

        return connection.queryAsync( sql );
    },


  findCategoriesAtProperties:function(connection, company_id, properties = []){
      var sql = "Select * from unit_categories where status = 1 and company_id = " + connection.escape(company_id) + " and id in (select category_id from units where property_id in ( " +   properties.map(p => connection.escape(p)).join(', ') + " )) ORDER BY sort asc, id DESC";
      return connection.queryAsync( sql );
  },

    findById:function(connection, id){

        var sql = "Select * from unit_categories where id = " + connection.escape(id);
        return connection.queryAsync( sql )
            .then(function(catRes){
                return catRes[0] || null
            });

    },

    getAttributes:function(connection, id){

        var sql = "Select *, (select name from amenities where id = unit_category_attributes.amenity_id ) as name from unit_category_attributes where category_id = " + connection.escape(id);

        console.log("SQL", sql);
        return connection.queryAsync( sql )
    },

    removeAttributes(connection, to_keep, category_id){

        var sql = "DELETE FROM unit_category_attributes where category_id = " + connection.escape(category_id);

        console.log(to_keep)
        if(to_keep.length ) {
            sql += ' and id not in (' + to_keep.join(', ') + ')';
        }
        return connection.queryAsync( sql )
    },

    async findByName(connection, name, company_id, all){
      var sql = "Select * from unit_categories where company_id = " + connection.escape(company_id) + ' and name = ' + connection.escape(name);
      let results =  await connection.queryAsync( sql );
      if(!results) return null;
      if(all) return results;
      return results[0];

    },



    save: function(connection, data, id){

        var sql;
        if(id){
            sql = "UPDATE unit_categories set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into unit_categories set ? ";
        }
        return connection.queryAsync(sql, data);

    },

    saveAttributes:function(connection, data, id){

        var sql;

        if(id){
            sql = "UPDATE unit_category_attributes set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into unit_category_attributes set ? ";
        }


        return connection.queryAsync(sql, data);

    },

    delete: function(connection, id){
        var sql = "update unit_categories set status = 0 where  id = " + connection.escape(id);

        return connection.queryAsync(sql);
    },

    unsetUnits(connection, id){

        var sql = "update units set category_id = null where category_id = " + connection.escape(id);
        return connection.queryAsync(sql);

    },

    getBreakdown(connection, category_id, company_id, property_id){

        if(!company_id && !property_id) return false;

        var sql = `Select count(id) as count, min((SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)) as min,
                    max((SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)) as max from units u where 1 = 1`;

        if(property_id){
            sql +=   ' and property_id =  ' + connection.escape(property_id) ;
        }

        sql += ' and property_id in (select id from properties where company_id =  ' + connection.escape(company_id) + ') ';

        sql += ' and category_id = ' + connection.escape(category_id);
        return connection.queryAsync(sql).then(function(result){
            if(!result.length) return { min: null, max: null, count: null };
            return result[0];
        });

    },

    getAvailableBreakdown(connection, category_id, company_id, property_id){

        // check Lease
        // check Available Date
        // check Reservation
        // check Hold

        if(!company_id && !property_id) return false;

        var sql = ` SELECT COUNT(id) as count,
                    MIN(IFNULL((SELECT price FROM unit_price_changes WHERE unit_id = u.id ORDER BY id DESC LIMIT 1),(SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1))) AS min,
                    MAX(IFNULL((SELECT price FROM unit_price_changes WHERE unit_id = u.id ORDER BY id DESC LIMIT 1),(SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1))) AS max
                    FROM units u WHERE `
        sql += Sql.unit_status('u.id')  + " in ('Available') ";

        if(property_id){
            sql +=   ' and property_id =  ' + connection.escape(property_id) ;
        }

        if(company_id)  {
            sql +=   ' and property_id in (select id from properties where company_id =  ' + connection.escape(company_id) + ') ';
        }

        sql += ' and category_id = ' + connection.escape(category_id);
        console.log("sql", sql);

        return connection.queryAsync(sql).then(function(result){
            if(!result.length) return { min: null, max: null, count: null };
            return result[0];
        });
    },

    getCategoryDetails(connection, company_id, params = {}){
        let { type, properties = [] } = params;

        let sql = `
            with cte_units as (
                select u.*, 
                    ${Sql.unit_status('u.id')} as unit_status,
                    upc_price.set_rate as unit_set_rate,
                    upc_price.price as unit_price
                from units u
                    join properties p on p.id = u.property_id
                    left join (
                        select upc.unit_id, upc.price, upc.set_rate
                        from unit_price_changes upc
                            join (
                                select upc.unit_id, MAX(upc.id) AS max_id
                                from unit_price_changes upc
                                group by upc.unit_id
                            ) max_ids on upc.unit_id = max_ids.unit_id and upc.id = max_ids.max_id
                    ) upc_price on upc_price.unit_id = u.id
                where p.company_id = ${connection.escape(company_id)}
                    ${properties && properties.length ? `and u.property_id in (${properties.map(p => connection.escape(p)).join(', ')})`: ''}
                    ${type ? `and u.type = ${connection.escape(type)}` : ''}
                group by u.id
            ),
            cte_categories_units as (
                select uc.id, uc.company_id, uc.name, uc.description, uc.price, uc.unit_type,
                    JSON_OBJECT(
                        'min_price', MIN(u.unit_set_rate),
                        'max_price', MAX(u.unit_set_rate),
                        'unit_count', COUNT(u.id)
                    ) as Units,
                    JSON_OBJECT(
                        'min_price', MIN(CASE WHEN u.unit_status = 'Available' then (IFNULL(u.unit_price, u.unit_set_rate)) END),
                        'max_price', MAX(CASE WHEN u.unit_status = 'Available' then (IFNULL(u.unit_price, u.unit_set_rate)) END),
                        'unit_count', COUNT(CASE WHEN u.unit_status = 'Available' THEN u.id END)
                    ) as Vacant		
                from unit_categories uc
                    left join cte_units u on u.category_id = uc.id
                where uc.status = 1
                    and uc.company_id = ${connection.escape(company_id)}
                    ${properties && properties.length ? `and u.id is not null`: ''}
                    ${type ? `and uc.unit_type = ${connection.escape(type)}` : ''}
                group by uc.id
            )
            
            select uc.*,
            CASE
                WHEN COUNT(uca.id) = 0 THEN JSON_ARRAY()
                ELSE JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', uca.id,
                        'category_id', uca.category_id,
                        'amenity_id', uca.amenity_id,
                        'value', uca.value,
                        'name', am.name
                    )
                )
            END AS Attributes
            from cte_categories_units uc
                left join unit_category_attributes uca on uca.category_id = uc.id
                left join amenities am on am.id = uca.amenity_id
            group by uc.id
            order by uc.id desc
        `;

        console.log("getCategoryDetails Query:", sql);

        return connection.queryAsync(sql);

    }


};

