var settings    = require(__dirname + '/../config/settings.js');
var Promise     = require('bluebird');
var models = {};
var validator = require('validator');
var moment = require('moment');
var Sql = require(__dirname + '/../modules/sql_snippets.js');

module.exports = {


    omniSearch: function(connection, params, company_id ){
        if(!params.search) return [];

        var sql = "Select distinct(id) ";

        sql += " from units where (select company_id from properties where properties.id = units.property_id ) = " + connection.escape(company_id) + " and ( " +
            " concat((select address from addresses where id = units.address_id), units.number, (select city from addresses where id = units.address_id),(select state from addresses where id = units.address_id), (select zip from addresses where id = units.address_id)) like " + connection.escape("%" + params.search + "%");

        sql += " ) limit " + params.offset + ', ' + params.limit;



        return connection.queryAsync(sql);

    },

    findUniqueNumbers: function(connection, company_id){
        var unitSql =  "Select distinct(number) as number from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ') order by CAST(number as unsigned) ASC' ;

        return connection.queryAsync( unitSql );
    },

    findByAddress: function(pool, address, fn){
        var _this = this;
        var unit = {};
        var connection = {};
        pool.getConnectionAsync().then(function(conn){
            connection = conn;
            var unitSql =  "Select * from units where number = " + connection.escape(address.number) + " and " +
                " property_id in (select id from properties where address = " + connection.escape(address.address) + ") and " +
                " property_id in (select id from properties where city = " + connection.escape(address.city) + ") and " +
                " property_id in (select id from properties where state = " + connection.escape(address.state) + ") and " +
                " property_id in (select id from properties where zip = " + connection.escape(address.zip) + ") and " +
                " property_id in (select id from properties where city = " + connection.escape(address.city) + ") " +
                "  order by id asc limit 1 ";
            return connection.queryAsync( unitSql );
        }).then(function(unit_res){
            var unit = unit_res[0];
            if(unit_res.length){
                connection.release();
                _this.findById(pool, unit.id, fn);
            } else {
                fn('Unit not found');
            }
        });
    },
    // TODO API call needs refactoring

    findById: function(connection, id, contain){
        var _this = this;
        var unitSql = `SELECT u.*,
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

    findByLeaseId: async function(connection, lease_id, properties){
        let sql =  `Select * from units where id = (select unit_id from leases where id = ${connection.escape(lease_id)})` ;

        if(properties){
            sql += ' and property_id in (' +  properties.map(p => connection.escape(p) ).join(',') + ")";
        }

        console.log("units: findByLeaseId - ", sql);
        let units = await connection.queryAsync(sql);

        return units && units.length ? units[0] : null;
    },

	findSpaceNumberByLeaseId: async function(connection, lease_id) {
		let sql = `SELECT number from units where id = (SELECT unit_id FROM leases where id = ${connection.escape(lease_id)})`
		console.log("SQL", sql);
		let units = await connection.queryAsync(sql);
		return units && units.length ? units[0].number : 'Tenant';
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

        console.log(sql);
        return connection.queryAsync(sql).then(r => {
            if(!r.length) return null;
            if(unit_id && api_id || api_unit_id ) return r[0];
            return r;
        });
        
    },

    deleteApiUnitPrice(connection, id){
        var sql = "UPDATE api_unit_prices set status = 0 where id = " + connection.escape(id);
        console.log(sql);

        return connection.queryAsync(sql)
    },

    findByPropertyId: function(connection, property_id, contain){ 
        var _this = this;
        var unitSql = "Select * from units where property_id = " + connection.escape(property_id) + " order by CAST(number AS SIGNED) asc";

        return connection.queryAsync( unitSql )

    },

    find: function(connection, params, count  ){

        var unitSql = "";

        if(count){
          unitSql = "SELECT count(*) as count FROM units ";

        } else {
          unitSql = "SELECT * FROM units ";
        }

        var searchParams = [];
        if(params.conditions){

            unitSql += " WHERE ";
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

    getRents: function(connection, company_id){
        var sql = "Select max((select upc.set_rate from unit_price_changes upc where upc.unit_id = units.id)) as  max, min((select upc.set_rate from unit_price_changes upc where upc.unit_id = units.id)) as min from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+")";
        return connection.queryAsync( sql );
    },

    getTypes:function(connection, company_id){
        var sql = "Select distinct(type) from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+")";

        return connection.queryAsync( sql );
    },

    getBeds: function(connection, company_id){

        var sql = "SELECT min(value) as min, max(value) as max FROM storage.amenity_units where amenity_id = (select id from amenities where name = 'beds') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";

        return connection.queryAsync( sql );
    },
 
    getBaths: function(connection, company_id){
        var sql = "SELECT min(value) as min, max(value) as max FROM storage.amenity_units where amenity_id = (select id from amenities where name = 'baths') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";
        return connection.queryAsync( sql );
    },

    getFloors: function(connection, company_id){
        var sql = "Select distinct(floor) as floor from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+") and floor is not null order by floor asc";
        return connection.queryAsync( sql );
    },

    getBuildingTypes: function(connection, company_id){
        var sql = "SELECT DISTINCT(value) as type FROM storage.amenity_units where amenity_id = (select id from amenities where name = 'Unit_Type' and property_type = 'residential') and unit_id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+"))";
        return connection.queryAsync( sql );
    },

    getUnitTypes: function(connection, company_id){
        var sql = "SELECT DISTINCT(type) FROM units where property_id in (select id from properties where company_id = "+connection.escape(company_id)+")";
        return connection.queryAsync( sql );
    },

    getUnitOptions: function(connection, company_id){

        var sql = "select distinct (SELECT DISTINCT value FROM storage.amenity_units WHERE amenity_id = (select id from amenities where name = 'width' and property_type = 'storage') and unit_id = units.id) as width, " +
            " (SELECT DISTINCT value FROM  storage.amenity_units WHERE amenity_id = (select id from amenities where name = 'length' and property_type = 'storage') and unit_id = units.id) as length, "+
            " (SELECT DISTINCT value FROM  storage.amenity_units WHERE amenity_id = (select id from amenities where name = 'height' and property_type = 'storage') and unit_id = units.id) as height " +
        " from units where id in (select id from units where property_id in ( select id from properties where company_id = "+connection.escape(company_id)+")) order by width ASC, length ASC, height ASC";
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
        " (select status from unit_status_changes where unit_id = u.id order by created_at desc limit 1 ) = 'deactivated', " +
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
                            " ((select status from units where id = u.id ) = 0 or (select available_date from units where id = u.id )  > " + date + "), " +
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
            "where status='deactivated' and id in (select max(usc.id) from unit_status_changes as usc group by usc.unit_id)" +
        ");";

        // console.log("SQLL", sql);

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

    saveBulk(connection, data, units){
        var sql = "UPDATE units set ? where id in ( " + units.map(u => connection.escape(u)).join(',') +  " )";
        return connection.queryAsync(sql, data);
    },

    savePriceChangeEvent(connection, data){
        var sql = "insert into unit_price_changes set ? ";
        return connection.queryAsync(sql, data);
    },

    getMultipleById(connection, units, properties = [], company_id){

        var sql = "Select * from units where id in ( " + units.map(u => connection.escape(u)).join(',') +  " ) ";

        sql += "and property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ) ";
        if(properties.length){
            sql += "and property_id in ( " + properties.map(p => connection.escape(p)).join(',') +  " ) ";
        }
        return connection.queryAsync( sql );
    },

    addOverlock(connection, overlock){
        var sql = "insert into overlocks set ?";
        return connection.queryAsync(sql, overlock);
    },

    removeOverlock(connection, overlock){
        var sql = "UPDATE overlocks set ?  where id = " + connection.escape(overlock.id);
        return connection.queryAsync(sql, overlock);
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

    findAll(connection, params = {}){
        var sql = `select u.*,
                    (SELECT IFNULL(DATEDIFF(CURDATE() , (select MAX(end_date) from leases WHERE end_date < CURDATE() and  status = 1 and unit_id = u.id and unit_id not in ( select unit_id from leases where status = 1 and end_date is null or end_date  > CURDATE()))),0) ) as days_vacant,
                    (SELECT IFNULL((SELECT SUM(price) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = (SELECT id from leases where start_date <= CURDATE() and (end_date > CURDATE() or end_date is null ) and status = 1 and unit_id = u.id HAVING MAX(id)) and start_date <= curdate() and (end_date is null or end_date >= curdate())), (SELECT IFNULL( (SELECT price from unit_price_changes where DATE(created) <= CURDATE() and unit_id = u.id order by id desc limit 1),(select upc.set_rate from unit_price_changes upc where upc.unit_id = u.id order by upc.id desc limit 1))))) as rent,
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
 

    async getUnitsWithoutLeaseTemplate(connection,company_id,property_id = null){
        let sql = `SELECT 
                   c.id as company_id,
                   c.name as company_name,
                   u.type as unit_type
                   FROM units u 
                   LEFT JOIN properties p ON u.property_id = p.id
                   LEFT JOIN companies c ON p.company_id = c.id
                   WHERE u.type NOT IN ( 
                    SELECT distinct unit_type 
                    FROM lease_templates 
                    WHERE is_default = 1 and status = 1 
                    ${company_id ? `and company_id = ${connection.escape(company_id)}` : `` } 
                )`;
          
            if (company_id) {
                sql += ` AND c.id = ${connection.escape(company_id)}`;
            }

            if (property_id) {
                sql += ` AND p.id = ${connection.escape(property_id)}`;
            }
            
            sql += ` GROUP BY u.type;`;
            return await connection.queryAsync( sql );
    },

    async getPropertiesUnitTypes(connection,company_id,property_id){
        let sql = `SELECT 
                    p.id as property_id,
                    GROUP_CONCAT(DISTINCT u.type) AS storage_types
                    FROM units u
                    LEFT JOIN properties p ON u.property_id = p.id
                    ${property_id ? `WHERE p.id = ${connection.escape(property_id)}` : ` ` }
                    GROUP BY p.id;`
                    return await connection.queryAsync( sql );
    }
};
/*
function validateResidential(body){
    var errors = [];

    if(validator.isEmpty(body.number)) errors.push("Please enter a unit number");

    if(!validator.isFloat(body.beds)) errors.push("Please enter the number of beds");

    if(!validator.isFloat(body.baths)) errors.push("Please enter the number of baths");

    if(!validator.isFloat(body.price)) errors.push("Please enter price for this unit");

    return errors;


}

function validateStorage(body){
    var errors = [];



    if(body.height && !validator.isFloat(body.height)) errors.push("Height must be a number");


    if(validator.isEmpty(body.number)) errors.push("Please enter a unit number");


    if(!validator.isFloat(body.width)) errors.push("Please enter the width of the unit");

    if(!validator.isFloat(body.length)) errors.push("Please enter the length of the unit");

    if(!validator.isFloat(body.price)) errors.push("Please enter price for this unit");

    return errors;


}
*/


models  = require(__dirname + '/../models');