var settings    = require(__dirname + '/../config/settings.js');
var Promise     = require('bluebird');
var models = {};
var validator = require('validator');
var moment = require('moment');
const { map } = require('bluebird');
const { max } = require('moment');
var Sql = require(__dirname + '/../modules/sql_snippets.js');

const Unit = {

    omniSearch: async function(connection, params, company_id, properties = [], type, res){
      params.offset =  params.offset || 0;
      params.limit =  params.limit || 20;
      if(!params.search) return [];

      let sql = Unit.globalSearchQuery(connection, params, company_id, properties, type);
      console.log("qryqryqryqryqryqry", sql.replace(/\n/gm,""))
      sql += " limit " + params.offset + ', ' + params.limit;
      
      let results = await connection.queryAsync(sql);
      res.fns.addStep('AfterFetchingChunkResults');
      return { results };
    },

    

    omniSearchCount: async function(connection, params, company_id, properties = [] ){
        if(!params.search) return [];

        var sql = "SELECT COUNT(*) AS result_count FROM ( " +
            "Select distinct(id) ";

        sql += " from units where ";

        if(properties.length){
          sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
        } else {
          sql += " (select company_id from properties where properties.id = units.property_id ) = " + connection.escape(company_id);
        }

          sql += " and ( units.number like " + connection.escape("%" + params.search.replace('#', "") + "%");

        sql += " )) result_table  "

        r = await connection.queryAsync(sql)
        return r[0].result_count || r.result_count
    },

    findVacanciesWithCategory(connection, company_id, properties = []){

      var sql = "select id,  number, category_id, (select name from unit_categories where id = units.category_id) as category_name from units where status = 1 and (available_date is null or  available_date <= CURDATE() ) and id not in " +
        "(select id from leases where ( end_date is null or end_date > CURDATE() ) and ( status > 0 or (status = 0 and id in (select lease_id from reservations where expires > now())))) " +
        "and property_id in (select id from properties where company_id =  " + connection.escape(company_id);

      if(properties.length){
        sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ')  + ")";
      }
      sql += ")";
      console.log(sql);
      return connection.queryAsync(sql);

    },

    findUnitGroupProfileId: async function(connection, id) {
        var sql =  "Select ug.unit_group_profile_id from unit_groups ug join unit_group_units ugu on ugu.unit_groups_id = ug.id where ugu.unit_id= " + connection.escape(id);
        return connection.queryAsync( sql );
    },

	findSpaceNumberByLeaseId: async function(connection, lease_id) {
		let sql = `SELECT number from units where id = (SELECT unit_id FROM leases where id = ${connection.escape(lease_id)})`
		console.log("SQL", sql);
		return connection.queryAsync(sql);
	},
  
    findUniqueNumbers: function(connection, company_id){
        var unitSql =  "Select distinct(number) as number from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ') order by CAST(number as unsigned) ASC' ;
        return connection.queryAsync( unitSql );
    },

    findByNumber(connection, number, property_id){

        var sql = "select * from units where property_id = " + connection.escape(property_id) + " and number = " + connection.escape(number);
        return connection.queryAsync( sql ).then(r => r.length ? r[0]: null );



    },

    // findByAddress: function(pool, address, fn){
    //     var _this = this;
    //     var unit = {};
    //     var connection = {};
    //     pool.getConnectionAsync().then(function(conn){
    //         connection = conn;
    //         var unitSql =  "Select * from units where number = " + connection.escape(address.number) + " and " +
    //             " property_id in (select id from properties where address = " + connection.escape(address.address) + ") and " +
    //             " property_id in (select id from properties where city = " + connection.escape(address.city) + ") and " +
    //             " property_id in (select id from properties where state = " + connection.escape(address.state) + ") and " +
    //             " property_id in (select id from properties where zip = " + connection.escape(address.zip) + ") and " +
    //             " property_id in (select id from properties where city = " + connection.escape(address.city) + ") " +
    //             "  order by id asc limit 1 ";
    //         return connection.queryAsync( unitSql );
    //     }).then(function(unit_res){
    //         var unit = unit_res[0];
    //         if(unit_res.length){
    //             connection.release();
    //             _this.findById(pool, unit.id, fn);
    //         } else {
    //             fn('Unit not found');
    //         }
    //     }).finally(() => utils.closeConnection(pool, connection));
    // },
    // TODO API call needs refactoring

    findById: function(connection, id, contain){
        var _this = this;
        var unitSql =  `SELECT u.*,
                        (SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() ORDER BY upc.id DESC LIMIT 1) AS price,
                        (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() ORDER BY upc.id DESC LIMIT 1) AS set_rate
                        FROM units u
                        WHERE u.id = ` + connection.escape(id)  ;
        return connection.queryAsync( unitSql )
            .then(function(unit){
                return (unit.length)?  unit[0]: null;

            //    return _this.getContainFields(connection, unit, contain);
        });
    },

    findPropertyById: function(connection, id){
        var unitSql =  "Select property_id from units where id = " + connection.escape(id)  ;
        return connection.queryAsync( unitSql )
            .then(function(unit){
                return (unit.length)?  unit[0]?.property_id: null;
        });
    },

    findByLeaseId: async function(connection, lease_id, properties){
        let sql =  `Select * from units where id = (select unit_id from leases where id = ${connection.escape(lease_id)})` ;

        if(properties){
            sql += ' and property_id in (' +  properties.map(p => connection.escape(p) ).join(',') + ")";
        }

        console.log("units: findByLeaseId - ", sql);
        let units = await connection.queryAsync(sql);

        return units && units.length ? units[0] : null;
    },

    save: function(connection, data, unit_id){
        var sql;
        if(unit_id){
            sql = "UPDATE units set ? where id = " + connection.escape(unit_id);
        } else {
            sql = "insert into units set ?";
        }

        return connection.queryAsync(sql, data);
    },

    saveApiUnitPrice(connection, data, rule_id){

        var sql;

        if(rule_id){
            sql = "UPDATE api_unit_prices set ? where id = " + connection.escape(rule_id);
        } else {
            sql = "INSERT INTO api_unit_prices set ? ";
        }

        return connection.queryAsync(sql, data)
            .then(r => rule_id ? rule_id: r.insertId);

    },
    findUpdatedUnitPrice(connection,unit_id,date){
        let sql = `(
            SELECT IFNULL( 
                (SELECT upc.price from unit_price_changes upc where upc.unit_id = ${connection.escape(unit_id)} and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1),
                    IFNULL(
                        (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = ${connection.escape(unit_id)} and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1),
                        (select price from units where id = ${connection.escape(unit_id)})
                    )
            ) as price 
        )`;

        console.log("findUpdatedUnitPrice sql:", sql);
        return connection.queryAsync(sql).then(unit => unit.length ? unit[0].price : null);
    },
    findApiUnitPrices(connection, unit_id, api_id, api_unit_id){

        if(!unit_id && !api_id) throw "invalid parameters";

        var sql = "SELECT * from api_unit_prices where status = 1 and 1 = 1 ";

        if(unit_id){
            sql += "and unit_id = " + connection.escape(unit_id);
        }

        if(api_id){
            sql += " and api_id = " + connection.escape(api_id);
        }

        if(api_unit_id){
            sql += " and id = " + connection.escape(api_unit_id);
        }

        return connection.queryAsync(sql).then(r => {
            if(unit_id && api_id || api_unit_id ) {
                return r.length? r[0]: null
            }
            return r.length? r: [];
        });

    },

    deleteApiUnitPrice(connection, id){
        var sql = "UPDATE api_unit_prices set status = 0 where id = " + connection.escape(id);


        return connection.queryAsync(sql)
    },

    findByPropertyId: function(connection, property_id, available, conditions = {}, params, count){

        conditions.start_date = conditions.start_date || moment().format('YYYY-MM-DD');

        var unitSql = '';
        if(count){
            unitSql = "SELECT count(*) as count FROM units ";
        } else {
            unitSql = "SELECT * FROM units ";
        }
       unitSql += " where property_id = " + connection.escape(property_id) + " and deleted is null";
       unitSql += ` and id not in (${Sql.get_deactivated_spaces()}) `;

        if(available){

          unitSql += " and status = 1 and ( available_date is null or available_date <= '" + conditions.start_date + "' )  and ";

          unitSql +=  " id not in ( ( select unit_id from leases where ";
          if(conditions.end_date){
            unitSql +=   " start_date <= '" +  conditions.start_date + "' and "
          }
          unitSql += " ( end_date > '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) ) ) and ";

          // reservations
          unitSql +=  " id not in (( select unit_id from leases where ";
          if(conditions.end_date){
            unitSql +=   " start_date <= '" +  conditions.start_date + "' and "
          }
          unitSql += " ( end_date > '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 0  and leases.id in ( select  lease_id from reservations where expires > now()))) and " +
            " id not in (select unit_id from unit_holds where expires > now()) "

        }

        unitSql += " order by CAST(number AS SIGNED) asc ";


        if(params && params.limit){
            unitSql += " LIMIT ";
            if(params.offset) {
                unitSql += params.offset + " ,";
            }
            unitSql += params.limit;
        }
        console.log(unitSql);

        return connection.queryAsync( unitSql )

    },

    find: function(connection, params, count  ){

        var unitSql = "";

        if(count){
          unitSql = "SELECT count(*) as count FROM units u ";

        } else {
          unitSql = `SELECT u.*${ params.grouping_profile_id ? ' , ug.unit_group_hashed_id ' : '' } FROM units u `;
        }
        if (params?.grouping_profile_id) {
            unitSql += `
                LEFT OUTER JOIN unit_group_units ugu on ugu.unit_id = u.id
                LEFT OUTER JOIN unit_groups ug on ugu.unit_groups_id = ug.id and ug.unit_group_profile_id = ${connection.escape(params?.grouping_profile_id)}
            `
        }
        unitSql += 'where u.deleted is null';
        unitSql += ` and u.id not in (${Sql.get_deactivated_spaces()}) `;
        
        var searchParams = [];

        if(params.conditions){

            unitSql += " and ";
            unitSql += Object.keys(params.conditions).map(k =>  k + " = " + params.conditions[k]).join(' and ');
        }
        if(params.having){
            unitSql += " HAVING ? ";
            searchParams.push(params.having)
        }
        if(params.group){
            unitSql += " GROUP BY ? ";
            searchParams.push(params.group)
        }
        if(params.order){
            unitSql += " ORDER BY ? ";
            searchParams.push(params.order); // TODO fix direction
        }

        if(params.limit){
            unitSql += " LIMIT ";
            if(params.offset) {
                unitSql += " ? ,";
                searchParams.push(params.offset)
            }
            unitSql += " ? ";
            searchParams.push(params.limit)
        }
        return connection.queryAsync(unitSql,searchParams).then((results) => (count)? results[0].count : results );
    },

    findAll(connection, params = {}){
        var sql = `select u.*,
                    ${Sql.unit_status('u.id')} as status,
                    (SELECT IFNULL(DATEDIFF(CURDATE() , (select MAX(end_date) from leases WHERE end_date < CURDATE() and  status = 1 and unit_id = u.id and unit_id not in ( select unit_id from leases where status = 1 and end_date is null or end_date  > CURDATE()))),0) ) as days_vacant,
                    (SELECT IFNULL((SELECT SUM(price) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = (SELECT id from leases where start_date <= CURDATE() and (end_date > CURDATE() or end_date is null ) and status = 1 and unit_id = u.id HAVING MAX(id)) and start_date <= curdate() and (end_date is null or end_date >= curdate())), (SELECT IFNULL( (SELECT price from unit_price_changes where DATE(created) <= CURDATE() and unit_id = u.id order by id desc limit 1),(SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1))))) as rent,
                    (TO_BASE64(CONCAT_WS(',', IF(u.type = 'storage', 1, IF(u.type = 'residential', 2, IF(u.type = 'parking', 3, null))), u.category_id, (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where name = 'width' and property_type = u.type and property_id=u.property_id) and unit_id = u.id ), (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where name = 'length' and property_type = u.type and property_id=u.property_id) and unit_id = u.id ), (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where name = 'height' and property_type = u.type and property_id=u.property_id) and unit_id = u.id )))) as space_mix_id
                    from units u
                    inner join properties p on p.id = u.property_id
                    where 1 = 1 and u.deleted is null`;

        if(params.company_id){
            sql += ` and p.company_id = ${connection.escape(params.company_id)}`;
        }

        if(params.property_id){
            sql += ` and u.property_id = ${connection.escape(params.property_id)}`;
        }

        if(params.unit_ids && params.unit_ids.length){
            sql += ` and u.id in (${params.unit_ids.map(uid => connection.escape(uid)).join(', ')})`;
        }

        if(params.limit && params.offset){
            sql += ` limit ${params.offset}, ${params.limit}`;
        }

        console.log("SQL Query: ", sql);

        return connection.queryAsync( sql );
    },

    getRents: function(connection, company_id){
        var sql = `SELECT MAX(upc.set_rate) AS max, MIN(upc.set_rate) AS min
                    FROM unit_price_changes upc 
                    JOIN units u ON upc.unit_id = u.id 
                    JOIN properties p ON p.id  = u.property_id 
                    WHERE p.company_id = ${connection.escape(company_id)}
                `;
        return connection.queryAsync( sql );
    },

    getTypes:function(connection, company_id){
        var sql = "Select distinct(type) from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+")";

        return connection.queryAsync( sql );
    },

    getBeds: function(connection, company_id){

        var sql = "SELECT min(value) as min, max(value) as max FROM amenity_units where amenity_id = (select id from amenities where name = 'beds') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";

        return connection.queryAsync( sql );
    },

    getBaths: function(connection, company_id){
        var sql = "SELECT min(value) as min, max(value) as max FROM amenity_units where amenity_id = (select id from amenities where name = 'baths') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";
        return connection.queryAsync( sql );
    },

    getFloors: function(connection, company_id, properties){
      let property_sql = '';
      if(properties.length){
        property_sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
      }

        var sql = "Select distinct(floor) as name from units where property_id in (select id from properties where " +
          " company_id = "+connection.escape(company_id)+") ";

        sql += property_sql;

        sql += " and floor is not null  order by floor asc";
        return connection.queryAsync( sql );
    },

    getSizes: function(connection, company_id, properties){
        let property_sql = '';
        if(properties.length){
          property_sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
        }

          var sql = "Select distinct(label) as name from units where property_id in (select id from properties where " +
            " company_id = "+connection.escape(company_id)+") ";

          sql += property_sql;

          sql += " and label is not null and deleted is null order by label asc";
          return connection.queryAsync( sql );
      },

    // getBuildingTypes: function(connection, company_id){
    //     var sql = "SELECT DISTINCT(value) as type FROM amenity_units where amenity_id = (select id from amenities where name = 'Unit_Type' and property_type = 'residential') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";
    //     return connection.queryAsync( sql );
    // },

    getUnitTypes: function(connection, company_id){
        var sql = "SELECT DISTINCT(type) FROM units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+")";
        return connection.queryAsync( sql );
    },

    getUnitOptions: function(connection, company_id, properties = []){

        let property_sql = '';
        if(properties.length){
          property_sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
        }

        var sql = "select distinct (SELECT DISTINCT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'width' and property_type = 'storage' and property_id=units.property_id) and unit_id = units.id ) as width, " +
            " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'length' and property_type = 'storage' and property_id=units.property_id) and unit_id = units.id) as length "+
            // " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_id = (select id from amenities where name = 'height' and property_type = 'storage') and unit_id = units.id) as height " +
        " from units where property_id in ( select id from properties where company_id = "+connection.escape(company_id)+") ";

        sql += property_sql;
        sql += " order by (width * length) ASC";
        console.log("sql", sql);
        return connection.queryAsync( sql );
    },

    getUnitOptionsByCategory: async(connection, company_id, properties = [], type) => {
        let property_sql = '';
        if(properties.length){
            property_sql += " and u.property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
        }

        var sql = `
            with cte_units as (
                select u.*
                from units u
                    JOIN properties p on p.id = u.property_id
                where p.company_id = ${connection.escape(company_id)}
                    and u.deleted is null
                    and (u.available_date is null or u.available_date <= CURDATE())
                    ${property_sql}
            )
            
            select
                auw.value as width,
                auw.amenity_id as width_id,
                aul.value as length,
                aul.amenity_id as length_id,
                auh.value as height,
                auh.amenity_id as height_id,
                uc.name as category,
                uc.description as description,
                uc.id as spacemix_category_id,
                u.type as unit_type,
                JSON_OBJECT(
                    'count', COUNT(u.id),
                    'min_price', MIN(IFNULL(upc_price.price, upc_price.set_rate)),
                    'max_price', MAX(IFNULL(upc_price.price, upc_price.set_rate))
                ) as Units,
                JSON_OBJECT(
                    'count', COUNT(CASE WHEN l.id is null then u.id END),
                    'available', COUNT(
                            CASE 
                                WHEN l.id is null and u.status = 1
                                    and u.id not in (
                                        SELECT DISTINCT id
                                        FROM (
                                            SELECT u.id
                                            FROM cte_units u
                                                join leases l on l.unit_id = u.id
                                                join reservations r on r.lease_id = l.id
                                            WHERE r.expires >= CURRENT_TIMESTAMP
                                                and l.status = 0
                                                
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join leases l on l.unit_id = u.id
                                            WHERE l.status = 2
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join overlocks ol on ol.unit_id = u.id
                                            WHERE ol.status = 1
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join unit_holds uh on uh.unit_id = u.id
                                            WHERE uh.expires > CURRENT_TIMESTAMP
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                JOIN unit_status_changes usc on usc.unit_id = u.id
                                                JOIN (
                                                    SELECT unit_id, MAX(id) AS max_id
                                                    FROM unit_status_changes
                                                    where status in ('deactivated', 'activated')
                                                    GROUP BY unit_id
                                                ) max_ids ON usc.unit_id = max_ids.unit_id AND usc.id = max_ids.max_id
                                            WHERE usc.status = 'deactivated'
                                            
                                        ) combined_conditions
                                    )
                                THEN u.id
                            END
                        ),
                    'min_price', MIN(CASE WHEN l.id is null and u.status <> 0 then (IFNULL(upc_price.price, upc_price.set_rate)) END),
                    'max_price', MAX(CASE WHEN l.id is null and u.status <> 0 then (IFNULL(upc_price.price, upc_price.set_rate)) END)
                ) as Vacant
            FROM cte_units u
                INNER JOIN unit_categories uc on uc.id = u.category_id
                INNER JOIN properties p on p.id = u.property_id
                LEFT JOIN amenity_property aw on aw.amenity_name = 'width' and aw.property_type = u.type and aw.property_id = u.property_id
                LEFT JOIN amenity_property al on al.amenity_name = 'length' and al.property_type = u.type and al.property_id = u.property_id
                LEFT JOIN amenity_property ah on ah.amenity_name = 'height' and ah.property_type = u.type and ah.property_id = u.property_id
                LEFT JOIN amenity_units auw on auw.amenity_property_id = aw.id and auw.unit_id = u.id
                LEFT JOIN amenity_units aul on aul.amenity_property_id = al.id and aul.unit_id = u.id
                LEFT JOIN amenity_units auh on auh.amenity_property_id = ah.id and auh.unit_id = u.id
                LEFT JOIN (
                    SELECT upc.unit_id, upc.price, upc.set_rate
                    FROM unit_price_changes upc
                        JOIN (
                            SELECT upc.unit_id, MAX(upc.id) AS max_id
                            FROM unit_price_changes upc
                                JOIN cte_units u on u.id = upc.unit_id
                            GROUP BY upc.unit_id
                        ) max_ids ON upc.unit_id = max_ids.unit_id AND upc.id = max_ids.max_id
                        
                ) upc_price ON upc_price.unit_id = u.id
                LEFT JOIN leases l on l.unit_id = u.id and l.status = 1 and ( l.end_date is null or l.end_date > CURDATE())
            GROUP BY width, length, height, category_id, type
            HAVING width >= 0 and length >= 0 and height >= 0 and category_id >= 0
            ORDER by type, category ASC, (width * length * height) ASC
        `;

        return await connection.queryAsync( sql );
    },

    getUnitsOptionsByGroupingProfile: async(connection, profileId) => {

        let sql = `
            with cte_units as (
                select u.*, ug.unit_group_hashed_id
                from units u
                    JOIN unit_group_units ugu on ugu.unit_id = u.id
                    JOIN unit_groups ug on ug.id = ugu.unit_groups_id
                where u.deleted is null
                    and (u.available_date is null or u.available_date <= CURDATE())
                    and ug.unit_group_profile_id = ${profileId}
            )
            
            select
                auw.amenity_id as width_id,
                aul.amenity_id as length_id,
                auh.amenity_id as height_id,
                auw.value as width,
                aul.value as length,
                auh.value as height,
                uc.name as category,
                uc.description as description,
                uc.id as spacemix_category_id,
                u.type as unit_type,
                u.unit_group_hashed_id as space_group,
                JSON_OBJECT(
                    'count', COUNT(u.id),
                    'min_price', MIN(IFNULL(upc_price.price, upc_price.set_rate)),
                    'max_price', MAX(IFNULL(upc_price.price, upc_price.set_rate))
                ) as Units,
                JSON_OBJECT(
                    'count', COUNT(CASE WHEN l.id is null then u.id END),
                    'available', COUNT(
                            CASE
                                WHEN l.id is null and u.status = 1
                                    and u.id not in (
                                        SELECT DISTINCT id
                                        FROM (
                                            SELECT u.id
                                            FROM cte_units u
                                                join leases l on l.unit_id = u.id
                                                join reservations r on r.lease_id = l.id
                                            WHERE r.expires >= CURRENT_TIMESTAMP
                                                and l.status = 0
                                                
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join leases l on l.unit_id = u.id
                                            WHERE l.status = 2
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join overlocks ol on ol.unit_id = u.id
                                            WHERE ol.status = 1
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                join unit_holds uh on uh.unit_id = u.id
                                            WHERE uh.expires > CURRENT_TIMESTAMP
            
                                            UNION ALL
                                            SELECT u.id
                                            FROM cte_units u
                                                JOIN unit_status_changes usc on usc.unit_id = u.id
                                                JOIN (
                                                    SELECT unit_id, MAX(id) AS max_id
                                                    FROM unit_status_changes
                                                    where status in ('deactivated', 'activated')
                                                    GROUP BY unit_id
                                                ) max_ids ON usc.unit_id = max_ids.unit_id AND usc.id = max_ids.max_id
                                            WHERE usc.status = 'deactivated'
                                            
                                        ) combined_conditions
                                    )
                                THEN u.id
                            END
                        ),
                    'min_price', MIN(CASE WHEN l.id is null and u.status <> 0 then (IFNULL(upc_price.price, upc_price.set_rate)) END),
                    'max_price', MAX(CASE WHEN l.id is null and u.status <> 0 then (IFNULL(upc_price.price, upc_price.set_rate)) END)
                ) as Vacant
            FROM cte_units u
                LEFT JOIN unit_categories uc on uc.id = u.category_id
                LEFT JOIN amenity_property aw on aw.amenity_name = 'width' and aw.property_type = u.type and aw.property_id = u.property_id
                LEFT JOIN amenity_property al on al.amenity_name = 'length' and al.property_type = u.type and al.property_id = u.property_id
                LEFT JOIN amenity_property ah on ah.amenity_name = 'height' and ah.property_type = u.type and ah.property_id = u.property_id
                LEFT JOIN amenity_units auw on auw.amenity_property_id = aw.id and auw.unit_id = u.id
                LEFT JOIN amenity_units aul on aul.amenity_property_id = al.id and aul.unit_id = u.id
                LEFT JOIN amenity_units auh on auh.amenity_property_id = ah.id and auh.unit_id = u.id
                LEFT JOIN (
                    SELECT upc.unit_id, upc.price, upc.set_rate
                    FROM unit_price_changes upc
                        JOIN (
                            SELECT upc.unit_id, MAX(upc.id) AS max_id
                            FROM unit_price_changes upc
                                JOIN cte_units u on u.id = upc.unit_id
                            GROUP BY upc.unit_id
                        ) max_ids ON upc.unit_id = max_ids.unit_id AND upc.id = max_ids.max_id
                ) upc_price ON upc_price.unit_id = u.id
                LEFT JOIN leases l on l.unit_id = u.id and l.status = 1 and ( l.end_date is null or l.end_date > CURDATE())
            GROUP BY unit_group_hashed_id
        `;

        return await connection.queryAsync( sql );
      },


    async getPromotionsInSpaceMix(connection, property_id, spaceMixValue) {

        let sql = `SELECT p.id from promotions p
            INNER JOIN promotion_rules pr on p.id = pr.promotion_id
            INNER JOIN promotion_properties pp on p.id = pp.promotion_id
            WHERE pr.object = 'unit' 
            AND pr.attribute = 'category' 
            AND pr.value = ${connection.escape(spaceMixValue)} 
            AND p.active = 1
            AND pp.property_id = ${property_id}`
        
        return await connection.queryAsync( sql );
    },
    
    async getUnitsInSpaceMix(connection, company_id, properties, type, category_id, width, length, height, available=false, params){

      let property_sql = '';
      if(properties.length){
        property_sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
      }

	 
      var sql = "select * from units where " +
        " category_id = " + connection.escape(category_id) +
        " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'width' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(width) +
        " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'length' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(length) +
        " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'height' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(height) +
        " and (available_date is null or available_date <= CURDATE()) " +
        " and deleted is null " +
        ` and id not in (${Sql.get_deactivated_spaces()}) ` +
        " and type = '"  + type + "'";
        if(available){
            sql += " and status = 1 ";
            sql += " and id not in (SELECT unit_id from leases where status = 1 and  (end_date is null or end_date > CURDATE())) ";
            sql += " and id not in (SELECT unit_id from leases where status = 0 and id in (select lease_id from reservations where expires >= CURRENT_TIMESTAMP )) ";
            sql += " and id not in (SELECT unit_id from leases where status = 2) ";
            sql += " and id not in (SELECT unit_id from overlocks where status = 1) ";
            sql += " and id not in (SELECT unit_id from unit_holds where expires > CURRENT_TIMESTAMP) ";
        }

        sql+= property_sql + " ORDER by number ASC";

        if(params && params.limit){
            sql += " LIMIT ";
            if(params.offset) {
                sql += params.offset + " ,";
            }
            sql += params.limit;
        }

        console.log('getUnitsInSpaceMix sql =>',sql);
        return await connection.queryAsync( sql );

    },

    async verifyUnitGroupAccess(connection, propertyId, unitGroupHashedId) {
        let sql = `
            SELECT
                *
            FROM
                unit_group_profiles
            WHERE
                id IN (
                    SELECT
                        unit_group_profile_id
                    FROM
                        unit_groups
                    WHERE
                        unit_group_hashed_id = ${connection.escape(unitGroupHashedId)}
                )
                AND property_id = ${connection.escape(propertyId)};`
        return await connection.queryAsync( sql );
    },

    async getUnitGroupUnits(connection, groupId, available = false, params, count = false){
        let sql;
        if (count) {
            sql = `SELECT count(*) as count `;
        } else {
            sql = `SELECT *, ${connection.escape(groupId)} as space_mix_id `;
        }

        sql += `
            FROM
                units
            WHERE
                id IN (
                    SELECT
                        unit_id
                    FROM
                        unit_group_units
                    WHERE
                        unit_groups_id IN (
                            SELECT
                                id
                            FROM
                                unit_groups ug
                            WHERE
                                ug.unit_group_hashed_id = ${connection.escape(groupId)}
                        )
                )
                AND (
                    available_date IS NULL
                    OR available_date <= CURDATE()
                )
                AND deleted IS NULL
                AND id NOT IN (${Sql.get_deactivated_spaces()})`;

          if(available){
              sql += " AND status = 1 ";
              sql += " AND id NOT IN (SELECT unit_id FROM leases WHERE status = 1 AND  (end_date IS NULL OR end_date > CURDATE())) ";
              sql += " AND id NOT IN (SELECT unit_id FROM leases WHERE status = 0 AND id IN (SELECT lease_id FROM reservations WHERE expires >= CURRENT_TIMESTAMP )) ";
              sql += " AND id NOT IN (SELECT unit_id FROM leases WHERE status = 2) ";
              sql += " AND id NOT IN (SELECT unit_id FROM overlocks WHERE status = 1) ";
              sql += " AND id NOT IN (SELECT unit_id FROM unit_holds WHERE expires > CURRENT_TIMESTAMP) ";

          }
  
          sql+= " ORDER by number ASC";
  
          if(params && params.limit && !count){
              sql += " LIMIT ";
              if(params.offset) {
                  sql += params.offset + " ,";
              }
              sql += params.limit;
          }
  
          console.log('getUnitsInSpaceGroup sql =>',sql);
          return connection.queryAsync(sql).then(res=> {
            if(count) return res?.[0].count;
            return res;
            });
      },

    async getUnitsInSpaceMixCount(connection, company_id, properties, type, category_id, width, length, height, available=false){

        let property_sql = '';
        if(properties.length){
          property_sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
        }
  
        var sql = "select Count(*) as count from units where " +
          " category_id = " + connection.escape(category_id) +
          " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'width' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(width) +
          " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'length' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(length) +
          " and (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'height' and property_type = '" + type + "' and property_id=units.property_id) and unit_id = units.id ) = " + connection.escape(height) +
          " and (available_date is null or available_date <= CURDATE()) " +
          " and deleted is null " +
          ` and id not in (${Sql.get_deactivated_spaces()}) ` +
          " and type = '"  + type + "'";
          if(available){
            sql += " and status = 1 ";
            sql += " and id not in (SELECT unit_id from leases where status = 1 and  (end_date is null or end_date > CURDATE())) ";
            sql += "and id not in (SELECT unit_id from leases where status = 0 and id in (select lease_id from reservations where expires >= CURRENT_TIMESTAMP ))";
            sql += "and id not in (SELECT unit_id from leases where status = 2)";
            sql += "and id not in (SELECT unit_id from overlocks where status = 1)";
            sql += "and id not in (SELECT unit_id from unit_holds where expires > CURRENT_TIMESTAMP)";
          }
          sql+= property_sql + " ORDER by number ASC";

          console.log('getUnitsInSpaceMixCount sql =>',sql);
          return connection.queryAsync( sql ).then(u => u[0].count);
  
    },

    getDistinctUnitLabels: function(connection, company_id, properties = []){

      let property_sql = '';



      var sql = "select distinct label from units where type =  'storage' and property_id in ( select id from properties where company_id = "+connection.escape(company_id)+") ";


      // var sql = "select distinct (SELECT DISTINCT value FROM amenity_units WHERE amenity_id = (select id from amenities where name = 'width' and property_type = 'storage') and unit_id = units.id ) as width, " +
      //       " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_id = (select id from amenities where name = 'length' and property_type = 'storage') and unit_id = units.id) as length "+
      //       // " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_id = (select id from amenities where name = 'height' and property_type = 'storage') and unit_id = units.id) as height " +
      //   " from units where property_id in ( select id from properties where company_id = "+connection.escape(company_id)+") ";

      if(properties.length){
        sql += " and property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") "
      }


      sql += " order by label ASC";

      return connection.queryAsync( sql );
    },

    getLeaseHistory: function(connection, unit_id){
        var sql = "Select * from leases where status = 1 and unit_id  = " + connection.escape(unit_id) + " and  ( status > 0 ||  ( select id from reservations where reservations.lease_id = leases.id and expires > now() is not null ) )   order by start_date DESC";

        return connection.queryAsync( sql );

    },

    getUtilities: function(connection, unit_id){
        var sql = "Select * from units_utilities where unit_id  = " + connection.escape(unit_id);
        return connection.queryAsync( sql );
    },

    saveUtility: function(connection, utility, utility_id){
        var sql;
        if(utility_id){
            sql = "UPDATE units_utilities set ? where id = " + connection.escape(utility_id);
        } else {
            sql = "insert into units_utilities set ?";
        }

        return connection.queryAsync(sql, utility);
    },

    findUtilityById: function(connection, utility_id){
        var sql = "SELECT * from units_utilities where id = " + connection.escape(utility_id);
        return connection.queryAsync(sql).then(utility=> {
            if(!utility.length) return null;
            return utility[0];

        });
    },

    deleteUtility: function(connection, utility_id){
        var sql = "DELETE from units_utilities where id = " + connection.escape(utility_id);
        return connection.queryAsync(sql);
    },

    findDuplicate(connection, number, property_id){
        var sql = "Select * from units where number  = " + connection.escape(number) + " and property_id =  " + connection.escape(property_id);
        return connection.queryAsync( sql );
    },

    getAllUnits(connection, property_id){
        let date = 'CURDATE()';
        let time = 'now()';

        var sql = "SELECT u.id, u.property_id, u.address_id, u.category_id, u.product_id, u.number, u.label, u.floor, u.type, (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id order by upc.id desc limit 1) as price, u.x, u.y, u.rotate, unit_hold.expires as hold_expires, uc.name as category, " +
        "(SELECT IF( " +
        " (select status from unit_status_changes where unit_id = u.id and status in ('activated','deactivated') order by id desc limit 1 ) = 'deactivated', " +
        " 'Deactivated', " +
          "IF( " +
          " (SELECT id from units where id = u.id and id not in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <= " + date + " and (end_date is null or end_date > " + date + ") and to_overlock = 1)), " +
          " 'To Overlock'," +
            "IF( " +
            " (SELECT id from units where id = u.id and id in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <= " + date + " and (end_date is null or end_date >= CURDATE()) and to_overlock = 0)), " +
            " 'Remove Overlock'," +
              "IF( " +
                " (SELECT id from units where id = u.id and id in (select unit_id from overlocks where status = 1) ), " +
                " 'Overlocked'," +
                "IF( " +
                  " (SELECT id from leases where start_date <= " + date + " and (end_date > " + date + " or end_date is null ) and status = 1 and unit_id = u.id HAVING MAX(id) ) IS NOT NULL, " +
                  " 'Leased', " +
                  " IF( " +
                    " (SELECT id from leases where status = 2 and unit_id = u.id HAVING MAX(id) ) IS NOT NULL, " +
                    " 'Pending', " +
                    " IF( " +
                      " (SELECT id from leases where (end_date > " + date + " or end_date is null ) and status = 0 and unit_id = u.id and id in ( SELECT lease_id from reservations where expires >= " + time + " ) HAVING MAX(id) ) IS NOT NULL, " +
                      " 'Reserved', " +
                      " IF( " +
                      " (SELECT id from leases where start_date > " + date + " and unit_id = u.id and (end_date > " + date + " or end_date is null ) and status = 1 HAVING MAX(id) ) IS NOT NULL, " +
                        " 'Future Leased', " +
                        " IF( " +
                          " ( select unit_id from unit_holds where expires > " + time + " and unit_id = u.id) IS NOT NULL, " +
                          " 'On Hold', " +
                          " IF( " +
                            " ((select status from  unit_status_changes usc where usc.unit_id = u.id  and status in ('online','offline') and usc.date <="+ date +" order by id desc limit 1) = 'offline' or (select available_date from units where id = u.id )  > " + date + "), " +
                            " 'Offline', " +
                              " 'Available' " +
                            " ) " +
                          " ) " +
                        " ) " +
                      " ) " +
                    " ) " +
                  " ) " +
                " ) " +
              " ) " +
             " ) " +
          " ) " +
        " )" + " as state, " +
        Sql.unit_amenity('Height', 11) + " as height, " +
        Sql.unit_amenity('Width', 11) + " as width, " +
        Sql.unit_amenity('Length', 11) + " as length " +
        "from units u " + 
        "left join (SELECT * FROM unit_holds WHERE expires > " + connection.escape(moment().utc().format('YYYY-MM-DD HH:mm:ss')) + " GROUP BY unit_id) as unit_hold on unit_hold.unit_id =  u.id " +
        "left join unit_categories uc on uc.id = u.category_id " +
        "where u.property_id in (" + connection.escape(property_id) + ") and u.deleted is null and u.id not in( " +
            "select unit_id from unit_status_changes " +
            "where status='deactivated' and id in (select max(usc.id) from unit_status_changes as usc where usc.status in ('activated','deactivated') group by usc.unit_id)" +
        ");";

        console.log("SQLL", sql);

        return connection.queryAsync( sql );

    },

    getHold(connection, unit_id){

        var sql = "Select * from unit_holds where expires > " + connection.escape(moment().utc().format('YYYY-MM-DD HH:mm:ss')) + " and unit_id =  " + connection.escape(unit_id);
        return connection.queryAsync( sql ).then(hold=> {
            if(!hold.length) return null;
            return hold[0];
        });
    },

    setHold(connection, unit_id){

        var save = {
            unit_id:    unit_id,
            expires:    moment().utc().add(15,'minutes').format('YYYY-MM-DD HH:mm:ss'),
            created:    moment().utc().format('YYYY-MM-DD HH:mm:ss')
        }

        var sql = "insert into unit_holds set ?";

        return connection.queryAsync( sql, save ).then(hold => {
            return hold.insertId;
        });

    },

    removeHold(connection, hold_token){
        var sql = "DELETE FROM unit_holds where id = " + connection.escape(hold_token);

        return connection.queryAsync( sql);

    },

    findCompany(connection, unit_id){

        var sql = "Select company_id from properties where id = (select property_id from units where id = " +  connection.escape(unit_id)+" )";
        return connection.queryAsync( sql ).then(company => {
            if(!company) return null;
            return company[0].company_id;
        });
    },

    verifyBulk(connection, units, company_id){
        var sql = "Select count(*) as count from units where id in ( " + units.map(u => connection.escape(u)).join(',') +  " ) and property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ) ";

        return connection.queryAsync( sql ).then(u => units.length === u[0].count);
    },
    
    verifyBulkAndRateEngine(connection, units, company_id, appId, property_id = null) {
        let propertyCondition = property_id ? `AND u.property_id = ${property_id}` : 
            `AND u.property_id IN (
                SELECT 
                    id
                FROM
                    properties
                WHERE
                    company_id = ${company_id}
            )`;
    
        let sql = `
            SELECT count(*) AS count
            FROM units u
            JOIN property_rate_management_settings prms ON prms.property_id = u.property_id
            WHERE 
                u.id IN (${units.map(u => connection.escape(u)).join(', ')})
                ${propertyCondition}    
                AND prms.active = 1
                AND CAST(prms.rate_engine AS CHAR(50)) = (
                    SELECT REPLACE(LOWER(c.first), ' ', '_')
                    FROM users us
                    JOIN contacts c ON c.user_id = us.id
                    WHERE us.gds_application_id = '${appId}'
                );`
    
        return connection.queryAsync(sql).then(u => units.length === u[0].count);
    },


    saveBulk(connection, data, units){
        var sql = "UPDATE units set ? where id in ( " + units.map(u => connection.escape(u)).join(',') +  " )";
        return connection.queryAsync(sql, data);
    },

    addOverlock(connection, overlock){
        var sql = "insert into overlocks set ?";
        return connection.queryAsync(sql, overlock);
    },

    removeOverlock(connection, overlock){
        var sql = "UPDATE overlocks set ?  where id = " + connection.escape(overlock.id);
        return connection.queryAsync(sql, overlock);
    },


    removeAllOverlocks: async (connection, property_id) => {
        let overlock = {
			status: 0,
			modified:  moment.utc().toDate()
		}

        let removeOverlockUnitIdsSql = `SELECT u.id FROM units u inner join overlocks ol on u.id = ol.unit_id 
            WHERE u.property_id = ${property_id} AND ol.status=1 AND u.id not in ( 
            SELECT l.unit_id FROM leases l 
            INNER JOIN units u on l.unit_id=u.id 
            INNER JOIN delinquencies d on d.lease_id = l.id 
            WHERE u.property_id = ${property_id} 
                AND l.to_overlock=1 AND (l.end_date IS NULL OR l.end_date > CURDATE())
                AND d.status IN ('active', 'paused')
                );`;

        console.log("removeOverlockUnitIdsSql: ", removeOverlockUnitIdsSql);

        let removeOverlockUnitIdsRes = await connection.queryAsync(removeOverlockUnitIdsSql);
        let removeOverlockUnitIds = removeOverlockUnitIdsRes.map(v => v.id).join(',');

        if(removeOverlockUnitIds.length) {
            var sql = `UPDATE overlocks set ?  where status = 1 and unit_id in ( ${removeOverlockUnitIds});`;
            console.log("removeAllOverlocks:", connection.format(sql, overlock))
            return connection.queryAsync(sql, overlock);
        }
    }, 


    addAllOverlocks(connection, unit_ids){

        let unit_arr = unit_ids.map(u => [u, 1, null])

        var sql = "insert into overlocks (unit_id, status,modified ) VALUES ? ";


        console.log("addAllOverlocks sql", connection.format(sql, [unit_arr]))
        return connection.queryAsync(sql, [unit_arr]);
    }, 


    async getActiveOverlock(connection, unit_id) {
        var overlockSql =  `Select * from overlocks where unit_id = ${connection.escape(unit_id)} and status = 1` ;
        var overlock = await connection.queryAsync(overlockSql);
        return (overlock.length)?  overlock[0]: null;
    },

    findOverlockedByPropertyId: (connection, property_id) => {
        var unitSql = `select * from overlocks where unit_id in (select id from units where property_id = ${connection.escape(property_id)}) and status = 1;`
        console.log(unitSql);
        return connection.queryAsync( unitSql );
    },

    findUnitsToOverlockByPropertyId: (connection, property_id, company_id) => {
    var unitSql = "select * from leases " +
      " where status = 1 and start_date < CURDATE() and (end_date is null or end_date > CURDATE()) and unit_id not in (select unit_id from overlocks where status = 1) and lease_standing_id in (select id from lease_standings where overlock = 1 and company_id = (select company_id from properties where id = " + connection.escape(property_id)+ "))";

    return connection.queryAsync( unitSql );
    },

    findUnitsToUnlockByPropertyId: (connection, property_id) => {
        var unitSql = "select * from leases " +
            "where status = 1 and start_date < CURDATE() and (end_date is null or end_date > CURDATE()) and unit_id in (select unit_id from overlocks where status = 1) and lease_standing_id = (select id from lease_standings where type = 'default' and company_id = (select company_id from properties where id = " + connection.escape(property_id)+ "))";
        return connection.queryAsync( unitSql );
    },

    getState: (connection, unit_id) => {
        let sql = "Select id, " + Sql.unit_status(unit_id) + " as state from units where id = " + connection.escape(unit_id);
        console.log("getState sql", sql);
        return connection.queryAsync(sql).then(r => r.length? r[0].state: null);
    },

    getGateStatus: (connection, unit_id) => {
        let sql = "Select id, " + Sql.unit_overlocked_status(unit_id) + " as gate_status from units where id = " + connection.escape(unit_id);
        console.log("getState sql", sql);
        return connection.queryAsync(sql).then(r => r.length? r[0].gate_status: null);
    },

    getMultipleById(connection, id, properties = [], company_id){
        let sql = `select units.id,
                   units.property_id,
                   units.address_id,
                   units.category_id,
                   units.product_id,
                   units.created,
                   units.modified,
                   units.deleted,
                   units.template_id,
                   units.number,
                   units.label,
                   units.floor,
                   units.type,
                   units.description,
                   units.web_price,
                   units.featured,
                   units.lease_duration,
                   units.lease_duration_type,
                   units.available_date,
                   units.terms,
                   units.active,
                   units.status,
                   units.security_deposit,
                   units.x,
                   units.y,
                   units.rotate,
                   units.invert,
                   units.left,
                   units.top,
                   IFNULL((select ucp.price from unit_price_changes ucp where ucp.unit_id = units.id order by ucp.id desc limit 1), (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = units.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)) as price,
                   (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = units.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1) as set_rate
                   from units  where units.id = ${connection.escape(id)} `;

        sql += "and units.property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ) ";
        if(properties.length){
            sql += "and units.property_id in ( " + properties.map(p => connection.escape(p)).join(',') +  " ) ";
        }

        return connection.queryAsync( sql );
    },
    getLatestUnitPrice(connection, unit_id){
        var sql = `select * from unit_price_changes where unit_id = ${connection.escape(unit_id)} and end is null order by created desc limit 1`;
        return connection.queryAsync( sql ).then(r => r.length ? r[0]: null ); 
    },
    savePriceChangeEvent(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE unit_price_changes set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into unit_price_changes set ?";
        }

        return connection.queryAsync(sql, data);
    },
    getUnitsByAmenityIds(connection, company_id, properties = [], category_id, amenity_ids){
        var sql = "select u.* from units u ";
        sql += " inner join unit_category_attributes uca on uca.category_id = u.category_id ";
        sql += " inner join amenities a on a.id = uca.amenity_id ";
        sql += " where uca.category_id = " + connection.escape(category_id) + " and a.id in (" + connection.escape(amenity_ids)+")";
        sql += "and property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ) ";
        if(properties.length){
            sql += "and property_id in ( " + properties.map(p => connection.escape(p)).join(',') +  " ) ";
        }
        sql += "group by u.id";
        return connection.queryAsync( sql );
    },

    globalSearchQuery(connection, params = {}, company_id, properties = [], type) {
      
    let sql = '';

    if(!type || type === 'contact'){

        if(params.search.includes('@')){
            sql += `SELECT id, 'auxilary' as type, (${ContactModel.statusQry('cp.id', properties, connection)}) as priority from contacts cp where email like ${connection.escape(params.search + "%")}`
            if(properties.length){
                sql += ` and (id in (select contact_id from leads where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) )  or 
                        id in (select contact_id from contact_leases where lease_id in ( select id from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) ))))`;
            }
            sql += " AND company_id = " +  + connection.escape(company_id);
            sql += ` order by priority, CONCAT(first, ' ', last)`
            return sql;
        }
        console.log(properties)
        sql += `SELECT c.id, 'contact' as type FROM 
                ( SELECT *, (${ContactModel.statusQry('cp.id', properties, connection)}) as priority FROM contacts cp WHERE
                    (TRIM(first) LIKE ${connection.escape(params.search + "%")} or TRIM(last) like ${connection.escape(params.search + "%")} or 
                    ( CONCAT(TRIM(first), ' ', IF(LENGTH(middle), CONCAT(TRIM(middle), ' '), ''), TRIM(last)) LIKE ${connection.escape(params.search + "%")})  
                    or ( CONCAT(TRIM(first), ' ', TRIM(last)) LIKE ${connection.escape(params.search + "%")})
                    )`;

        if(params.source === 'linking' && properties.length){
            sql += ` AND id in (select contact_id from contact_leases where \`primary\` = 1 and lease_id in ( select id from leases where status = 1 and unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) )))`;
        } else if(properties.length){
            sql += ` and (id in (select contact_id from leads where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) )  or 
                    id in (select contact_id from contact_leases where lease_id in ( select id from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) ))))`;
        }
        sql += ` AND company_id = ${connection.escape(company_id)}`;
        sql += ` order by 
            CASE priority
                WHEN 'Pending' THEN 1
                WHEN 'Active Lead' THEN 2
                WHEN 'Delinquent' THEN 3
                WHEN 'Current' THEN 4
                WHEN 'Suspended' THEN 5
                WHEN 'Gate Lockout' THEN 6
                WHEN 'Active Lien' THEN 7
                WHEN 'Auction' THEN 8
                WHEN 'Balance Due' THEN 9
                WHEN 'Bankruptcy' THEN 10
                WHEN 'Retired Lead' THEN 11
                WHEN 'Lease Closed' THEN 12
                ELSE  13
                END,
        CONCAT(first, ' ', last)) c`
        sql += " UNION";
    }

    if(!type || type === 'vehicles'){
      sql += ` select contact_id as id, 'vehicles' as type from vehicles`;
      sql += ` where TRIM(license_plate_number) like ${connection.escape(params.search + "%")}`;
      sql += ` and contact_id in (select id from contacts where company_id =  ${connection.escape(company_id)})`;
      sql += !type ? " UNION": "";
      }

    if(!type || type === 'space'){
        sql += ` select id, 'units' as type from units where`;

        if(properties.length){
            sql += ` property_id in ( ${properties.map(p => connection.escape(p)).join(', ')} ) `;
        } else {
            sql += ` (select company_id from properties where properties.id = units.property_id ) = ${connection.escape(company_id)}`;
        }

        sql += ` and units.deleted is null and (TRIM(LEADING '0' from units.number) like ${connection.escape(params.search + "%")} or units.number like ${connection.escape("%" + params.search + "%")})`;
        sql += !type ? " UNION": "";
    }

    if(!type || type === 'contact'){
        sql += ` select c.contact_id as id, 'auxilary' as type FROM
                ( SELECT *, (${ContactModel.statusQry('cp.contact_id', properties, connection)}) as priority from contact_phones cp where 
                phone like ${connection.escape('_' + params.search + "%")} or phone like ${connection.escape('____' + params.search + "%")}`;

        if(params.source === 'linking' && properties.length){
            sql += ` AND id in (select contact_id from contact_leases where \`primary\` = 1 and lease_id in ( select id from leases where status = 1 and unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) )))`;
        } else if(properties.length){
            sql += " and (contact_id in (select contact_id from leads where property_id in (" + properties.map(p => connection.escape(p)).join(', ')  + ") )  or ";
            sql += " contact_id in (select contact_id from contact_leases where lease_id in ( select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") ))))"
        }
        sql += ` AND contact_id in (select id from contacts where company_id =  ${connection.escape(company_id)})`;
        sql += ` order by 
            CASE priority
            WHEN 'Pending' THEN 1
            WHEN 'Active Lead' THEN 2
            WHEN 'Delinquent' THEN 3
            WHEN 'Current' THEN 4
            WHEN 'Suspended' THEN 5
            WHEN 'Gate Lockout' THEN 6
            WHEN 'Active Lien' THEN 7
            WHEN 'Auction' THEN 8
            WHEN 'Balance Due' THEN 9
            WHEN 'Bankruptcy' THEN 10
            WHEN 'Retired Lead' THEN 11
            WHEN 'Lease Closed' THEN 12
            ELSE  13
            END) c`
    }
    
    
        return sql; 
    },

    getConciseUnitsData(connection, params) {  
        let selectQuery = (params?.grouping_profile_id ? `, ug.unit_group_hashed_id as unit_group_id` : `,'' AS unit_group_id` ) + ` FROM units u`;
        let joinTablesQuery = ( params?.grouping_profile_id ? `
            JOIN unit_group_units ugu on ugu.unit_id = u.id
            JOIN unit_groups ug on ugu.unit_groups_id = ug.id and ug.unit_group_profile_id = ${params?.grouping_profile_id}` : '' ) 
        let sql = `
            SELECT 
                u.id,
                u.number,
                DATE_FORMAT(u.created, "%Y-%m-%d") AS created,
                u.property_id,
                u.status,
                (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1) AS set_rate,
                (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1) AS default_price,
                u.floor,
                (
                    SELECT 
                        au.value 
                    FROM 
                        amenity_units au 
                    WHERE au.unit_id = u.id 
                        AND au.amenity_property_id IN 
                            (
                                SELECT id FROM amenity_property WHERE property_id = u.property_id AND amenity_category_id = 11 AND property_type = u.type AND amenity_name = 'Length'
                            )
                ) AS length,
                (
                    SELECT 
                        au.value 
                    FROM 
                        amenity_units au 
                    WHERE au.unit_id = u.id 
                        AND au.amenity_property_id IN 
                            (
                                SELECT id FROM amenity_property WHERE property_id = u.property_id AND amenity_category_id = 11 AND property_type = u.type AND amenity_name = 'Width'
                            )
                ) AS width,
                (
                    SELECT IF(  
                        (select status from unit_status_changes where unit_id = u.id and status in ('activated','deactivated') order by id desc limit 1 ) = 'deactivated',  
                        'Deactivated',  
                        IF(  
                        (SELECT id from units where id = u.id and id not in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <=   CURDATE()   and (end_date is null or end_date >   CURDATE()  ) and to_overlock = 1)),  
                        'To Overlock', 
                        IF(  
                        (SELECT id from units where id = u.id   and id in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <=   CURDATE()   and (end_date is null or end_date >= CURDATE()) and to_overlock = 0)),  
                        'Remove Overlock', 
                            IF(  
                                (SELECT id from units where id = u.id   and id in (select unit_id from overlocks where status = 1) ),  
                                'Overlocked', 
                            IF(  
                                (SELECT id from leases where start_date <=   CURDATE()   and (end_date > CURDATE() or end_date is null ) and status = 1 and unit_id = u.id   HAVING MAX(id) ) IS NOT NULL,  
                                'Leased',  
                                IF(  
                                    (SELECT id from leases where status = 2 and unit_id = u.id   HAVING MAX(id) ) IS NOT NULL,  
                                    'Pending',  
                                    IF(  
                                    (SELECT id from leases where (end_date >   CURDATE()   or end_date is null ) and status = 0 and unit_id = u.id   and id in ( SELECT lease_id from reservations where expires >=   (select CONVERT_TZ(now(),"+00:00",utc_offset) from properties where id = (select property_id from units where id = u.id))   ) HAVING MAX(id) ) IS NOT NULL,  
                                    'Reserved',  
                                    IF(  
                                    (SELECT id from leases where start_date >   CURDATE()   and unit_id = u.id   and (end_date >  CURDATE()  or end_date is null ) and status = 1 HAVING MAX(id) ) IS NOT NULL,  
                                    'Future Leased',  
                                    IF(  
                                        ( select unit_id from unit_holds where expires >   now()   and unit_id = u.id  ) IS NOT NULL,  
                                        'On Hold',  
                                        IF(  
                                            ((select status from units where id = u.id   ) = 0 or (select available_date from units where id = u.id   )  >   CURDATE()  ),  
                                            'Offline',  
                                            'Available'  
                                            )  
                                        )  
                                    )  
                                    )  
                                    )  
                                )  
                                )  
                            )  
                        )  
                    )  
                ) as state,
                (
                    SELECT IFNULL
                        ( 
                            (
                                SELECT upc.price FROM unit_price_changes upc WHERE DATE(upc.created) <= CURRENT_DATE() AND upc.unit_id = u.id ORDER BY id DESC LIMIT 1
                            ),
                            (SELECT upc.set_rate from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)
                        )
                ) as price
                `;
        sql += selectQuery
        sql += joinTablesQuery
        sql += `                                   
            WHERE
                u.deleted IS NULL
                AND u.id NOT IN (
                    SELECT 
                        usc.unit_id 
                    FROM 
                        unit_status_changes usc
                    WHERE 
                        usc.status = "deactivated" 
                            AND usc.id IN 
                                (
                                    SELECT 
                                        max(usc1.id) 
                                    FROM 
                                        unit_status_changes AS usc1 
                                    where usc1.status in ("deactivated", "activated")
                                    GROUP BY usc1.unit_id
                                )
                            )
                AND u.property_id IN (${params.property_id})
            GROUP BY u.id
            ORDER BY ${params.order ?? 'u.created'}
            LIMIT ${connection.escape(parseInt(params.offset))}, ${connection.escape(parseInt(params.limit))}
        `;
        return connection.queryAsync(sql).then(result => { 
            return result.length ? result : [] });
    },
        
    getConciseUnitAmenities(connection, unitIds) {
        if (!unitIds?.length) return []
        let sql = `
            SELECT 
                au.id,
                ap.amenity_name AS name,
                au.value,
                ac.name AS category_name,
                ac.type AS category_type,
                u.id as unit_id 
            FROM 
                amenity_units au 
                INNER JOIN units u ON u.id = au.unit_id 
                INNER JOIN amenity_property ap ON ap.id = au.amenity_property_id 
                JOIN amenity_categories ac ON ac.id = ap.amenity_category_id 
            WHERE 
                au.unit_id in ( ${unitIds} )
                AND ap.property_type = u.\`type\` 
                AND ap.amenity_category_id != 11
            ;
        `
        return connection.queryAsync(sql).then(result => {
            return result.length ? result : []
        });
    },

    getAvailableUnitsByFilteredAmenities(connection, property_id, amenity_ids) {
        var sql = `SELECT 
                u.id AS unit_id, au.amenity_id, au.value AS value
            FROM units u
            LEFT OUTER JOIN amenity_units au ON au.unit_id = u.id
            LEFT OUTER JOIN amenity_property ap ON ap.property_id = u.property_id AND au.amenity_property_id = ap.id
            JOIN amenities a ON a.id = ap.amenity_id
            WHERE 
            u.property_id = ${connection.escape(property_id)} AND a.status = 1 AND au.amenity_id IN ( ${connection.escape(amenity_ids)} )`
        return connection.queryAsync( sql );
    },
    findUnitGroup(connection, grouping_profile_id, unit_id) {
        if (!grouping_profile_id || !unit_id) e.th(400, "Invalid parameters")
        let sql = `
            SELECT 
                ug.unit_group_hashed_id AS unit_group_id
            FROM 
                unit_groups ug
            INNER JOIN
                unit_group_units ugu ON ugu.unit_groups_id = ug.id
            WHERE
                ugu.unit_id = ${connection.escape(unit_id)}
                AND ug.unit_group_profile_id = ${connection.escape(grouping_profile_id)};
        `
        return connection.queryAsync(sql).then(result => {
            return result?.[0]?.unit_group_id ?? ''
        })
    },

    unitsOmniSearch(connection, payload) {
        let {unit_ids, company_id, property_ids} = payload
        let date = moment().format('YYYY-MM-DD')

        let query = `
            with cte_unit_leases as
            (
                select
                    u.id as unit_id, l.id as lease_id, l.start_date as start_date, r.id as reservation_id, r.expires as reservation_expires, r.created as reservation_created
                from units u
                    inner join leases l on u.id = l.unit_id
                    left join reservations r on l.id = r.lease_id
                    left join properties p on p.id = u.property_id
                where ((l.status = 1 and l.start_date <= '${date}' and (l.end_date > '${date}' or l.end_date is NULL))
                    or (l.status = 0 and  r.expires > (select CONVERT_TZ(NOW(),'+00:00', p.utc_offset))))
                    and u.id in (${unit_ids.map(id => connection.escape(id)).join(', ')})
                    and p.id in (${property_ids.map(id => connection.escape(id)).join(', ')})
                    and p.company_id = ${company_id}
                group by u.id
            )
            select
                'unit' as search_type, u.id, u.property_id, u.label, u.category_id, u.number, cul.start_date,
                CONCAT(
                        '{ "address":"', COALESCE(a.address,''), '","city": "', COALESCE(a.city,''), '", "state": "', COALESCE(a.state,''), '", "country": "', COALESCE(a.country,''), '"    ,"zip": "', COALESCE(a.zip,''), '"}'
                    ) as Address,
                CONCAT('{ "name": "', if(u.category_id, COALESCE(uc.name,''), NULL), '"}') as Category,
                CONCAT('{ "id": ', lds.id, '}') as 'Lead',
                CONCAT(
                        '{ "id": ', cul.reservation_id, ', "lease_id": ', cul.lease_id, ', "expires": ', if(ISNULL(cul.reservation_expires), 'null', CONCAT('"',cul.reservation_expires,'"')), ', "created": ', if(ISNULL(cul.reservation_created), 'null', CONCAT('"',cul.reservation_created,'"')), '}'
                    ) as Reservation,
                CONCAT(
                    '{ "contact_id": ', c.id, ', "primary": ', cl.primary, ',
                            "Contact": { "id": ', c.id, ', "first": "', COALESCE(c.first, ''), '", "last": "', COALESCE(c.last, ''),
                                '", "email": ', if(ISNULL(c.email), 'null', CONCAT('"', c.email, '"')), ', "Phones":[{"phone": "', COALESCE(cp.phone, ''), '"}]
                            }
                        }'
                    ) as Tenant,
                ${Sql.unit_status('u.id')} as state
            from units u
                left join unit_categories uc on u.category_id = uc.id
                left join addresses a on a.id = u.address_id
                left join cte_unit_leases cul on cul.unit_id = u.id
                left join contact_leases cl on cul.lease_id = cl.lease_id and cl.primary = 1
                left join contacts c on cl.contact_id = c.id
                left join contact_phones cp on c.id = cp.contact_id and cp.primary = 1
                left join leads lds on cul.lease_id = lds.lease_id and lds.contact_id = c.id
            where u.id in (${unit_ids.map(id => connection.escape(id)).join(', ')})
            and u.property_id in (${property_ids.map(id => connection.escape(id)).join(', ')})
            group by u.id
        `

        console.log('unitsOmniSearch query: ', query);

        return connection.queryAsync(query)
    },
    async fetchDefaultRentPlan(connection, data) {
        const sql = `
            SELECT sgrpd.rent_management_plan_id
            FROM units u
            JOIN unit_group_units ugu ON ugu.unit_id = u.id
            JOIN unit_groups ug ON ug.id = ugu.unit_groups_id
            JOIN space_group_rent_plan_defaults sgrpd ON sgrpd.tier_id = ug.unit_group_hashed_id
            WHERE ug.unit_group_profile_id = (
                SELECT prms.default_unit_group_profile_id
                FROM property_rate_management_settings prms
                WHERE prms.property_id = ?
            ) AND
            u.id = ? AND
            value_tier_type = ?
        `
        let result = await connection.queryAsync(sql, data);

        return result[0]?.rent_management_plan_id
    }
};

module.exports = Unit;

models  = require(__dirname + '/../models');
var ContactModel  = require(__dirname + '/../models/contact');
Sql  = require(__dirname + '/../modules/sql_snippets.js');



