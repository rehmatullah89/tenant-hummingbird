const { Unit } = require(".");

var settings    = require(__dirname + '/../config/settings.js');
var refreshUnitGroup = require(__dirname + '/../modules/refresh_unit_group.js');

let Amenity = {


    findAmenityByName: function(connection, field, type ){
        var amenitySql = "Select * from amenities where name = " + connection.escape(field) + " and property_type = " + connection.escape(type);
        return connection.queryAsync(amenitySql)
    },

    findAmenityPropertyIdx: function(connection, amenity_id, property_id) {
        var sql = `SELECT id, amenity_id FROM amenity_property where amenity_id = ${amenity_id} AND property_id = ${property_id}`;
        return connection.queryAsync(sql).then(result => {
            return result;
        });
    },

    async findAmenityById(connection, id ){
        var amenitySql = "Select * from amenities where id = " + connection.escape(id);
        let r = await connection.queryAsync(amenitySql);
        return r.length ? r[0] : null ;
    },
    async findPropertyAmenityById(connection, id ){
        var amenitySql = "Select * from amenity_property where id = " + connection.escape(id);
        console.log("amenitySql", amenitySql)
        let r = await connection.queryAsync(amenitySql);
        return r.length ? r[0] : null ;
    },

    findAllAmenities:function(connection, type, company_id){
        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = amenities.category_id) as category_name," +
            "(select type from amenity_categories where id = amenities.category_id) as category_type " +
            " from amenities where ( company_id is null or company_id = " + connection.escape(company_id) + ") and status = 1 and category_id != 11 and property_type = " + connection.escape(type);
        return connection.queryAsync(amenitySql).then(function(amenityRes){
            var amenityList = {};

            amenityRes.forEach(function(am, i){

                amenityList[am.category_type] = amenityList[am.category_type] || {};
                amenityList[am.category_type][am.category_name] =  amenityList[am.category_type][am.category_name] || [];
                am.options = JSON.parse(am.options);
                amenityList[am.category_type][am.category_name].push(am);
            });
            return amenityList;
        });
    },

    findCategoryByNameOrSave: function(connection, name, company_id){
        var sql =  "Select id from amenity_categories where name = " + connection.escape(name) + " and company_id = " + company_id;
        var id;

        return connection.queryAsync(sql).then(function(res) {
            if(res.length){
                id = res[0].id;
                return false;
            } else {
                var data = {
                    name: name,
                    company_id: company_id
                };
                var insertSql = "Insert into amenity_categories set ?";


                return connection.queryAsync(insertSql, data);
            }
        }).then(function(insertRes){

            if(insertRes){
                id = insertRes.insertId;
            }
            return id;
        })
    },


    findByNameOrSave: function(connection, name, category_id, property_id){
        var _this = this;
        var id;

        var sql =  "Select id from property_amenities where " +
            " name = " + connection.escape(name) + " " +
            " and category_id = " + connection.escape(category_id) + " " +
            " and property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql)

        .then(function(res) {
            if(res.length) {
                id = res[0].id;
                return false;
            } else {
                var data = {
                    name: name,
                    property_id: property_id,
                    category_id: category_id
                };
                return _this.savePropertyAmenity(connection, data );
            }
        }).then(function(insertRes){
            if(insertRes){
                id = insertRes.insertId;
            }

            return id;
        })

    },


    findByPropertyId: function(connection, id){

        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = amenity.category_id) as category_name " +
            "(select type from amenity_categories where id = amenity.category_id) as category_type " +
            " from amenity_properties where `default` = 1 and deleted = 0 and property_id = " + connection.escape(id);
        return connection.queryAsync(amenitySql).then(function(amenityRes){

            var amenityList = {};
            amenityRes.forEach(function(am, i){
                amenityList[am.category_type] = amenityList[am.category_type] || {};
                amenityList[am.category_type][am.category_name] =  amenityList[am.category_type][am.category_name] || [];
                amenityList[am.category_type][am.category_name].push(am);
            });
            return amenityRes;

        });

    },

    findFeatures(connection, type){
        var amenitySql = "Select * from amenities where property_type = " + connection.escape(type) + " and category_id = 11";
        return connection.queryAsync(amenitySql);
    },

    findUnitFeatures: function(connection, unit_id, type){

        var amenitySql = "Select *, " +
            " (Select amenity_name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = '" + type + "' and amenity_category_id = 11)";

        var features = {};
        return connection.queryAsync(amenitySql).then(function(feats){
            feats.forEach(function(feature){
                features[feature.amenity_id] = feature.value;
            });

            return features;
        });
    },

    findUnitFeatureNames: function(connection, unit_id, type){

        var amenitySql = "Select *, " +
            " (Select amenity_name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = '" + type + "' and amenity_category_id = 11)";

        var features = {};
        return connection.queryAsync(amenitySql).then(function(feats){
            feats.forEach(function(feature){

                features[feature.name] = feature.value;
            });

            return features;
        });
    },

    findUnitAmenityNames: function(connection, unit_id, type){

        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = " +
            "(select amenity_category_id as category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_name, " +
            "(select type from amenity_categories where id = " +
            "(select amenity_category_id as category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_type, " +
            " (Select amenity_name as name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = " + connection.escape(type) + " and amenity_category_id != 11)";

        var features = {};
        return connection.queryAsync(amenitySql).then(function(feats){

            feats.forEach(function(am){
                features[am.category_name] =  features[am.category_name] || [];
                features[am.category_name].push(am);

            });

            return features;
        });
    },

    findUnitAmenities: function(connection, unit_id, type){

        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = " +
            "(select category_id from amenities where id = amenity_units.amenity_id )) as category_name, " +
            " (Select name from amenities where id = amenity_units.amenity_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_id in " +
            " (select id from amenities where property_type = " + connection.escape(type) + " and category_id != 11)";

        var features = {};
        return connection.queryAsync(amenitySql).then(function(feats){

            feats.forEach(function(feature){
                features[feature.amenity_id] = feature.value;
            });
            return features;
        });
    },

    findIdsByUnit: function(connection, unit_id, type){
        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = " +
            "(select amenity_category_id as category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_name, " +
            " (Select amenity_name as name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = " + connection.escape(type) + " and amenity_category_id != 11)";

        return connection.queryAsync(amenitySql).then(function(result){

            var amenities = [];
            result.forEach(function(am){
                amenities.push(am.id);
            });


            return amenities;
        });
    },

    savePropertyAmenity: function(connection, form, id){

        var sql = "";
        if(id){
            sql = "Update property_amenities set ? where id = " + id;
        } else {
            sql = "insert into property_amenities set ?";
        }
        return connection.queryAsync(sql, form);

    },

    deletePropertyAmenity: function(connection, id){
        var sql = "update property_amenities set deleted = 1 where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },

    deleteAllPropertyAmenitiesByPropertyId: function(connection, property_id){
        var sql = "delete from property_amenities where property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql);
    },

    deleteAllUnitAmenitiesByUnitId: function(connection){
        var sql = "delete from unit_amenities where unit_id = " + connection.escape(unit_id);
        return connection.queryAsync(sql);
    },


    findUnitAmenityByName: function(connection, name, property_type, unit_id){
        let sql= `
            Select 
                au.*
            From amenity_units au
            INNER join amenity_property ap on au.amenity_property_id = ap.id
            Where ap.property_type = '${property_type}'
            AND au.unit_id = ${unit_id}
            AND ap.amenity_name = '${name}';`

        console.log('Sql findUnitAmenityByName =>',sql);
        return connection.queryAsync(sql);
    },
    
    findAmenityUnits: async function(connection, amenity_property_id, unit_id) {
        let sql = "Select * from amenity_units where amenity_property_id = " + connection.escape(amenity_property_id) + ' and unit_id = ' + connection.escape(unit_id);
        return await connection.queryAsync(sql);
    },

    checkRefreshUnitGroupCondition: async function(connection, amenity_property_id, value, unit_id, dimension= false) {
        let refreshUG = false;
        let dimensionCheck="";
        if(dimension) {
            dimensionCheck = "ap.amenity_name IN ('Length','Width','Height') and";
        }
        let sql = "Select * from amenity_units au join amenity_property ap on au.amenity_id = ap.amenity_id  where " + dimensionCheck +" ap.id = " + connection.escape(amenity_property_id) + ' and au.unit_id = ' + connection.escape(unit_id);
        let existRes = await connection.queryAsync(sql);
        if(existRes.length){
            refreshUG = !(refreshUnitGroup.checkDataChange([existRes[0].value], [value]));
        }
        return refreshUG;
    },

    saveUnitFeatures: async(connection, amenity_id, amenity_property_id, value, unit_id) => {

        // var existSql = "Select * from amenity_units where amenity_property_id = " + connection.escape(amenity_property_id) + ' and unit_id = ' + connection.escape(unit_id);
        // var existRes = await connection.queryAsync(existSql);
        var existRes = await Amenity.findAmenityUnits(connection, amenity_property_id, unit_id);
        var unitAmenity_id;
        if(existRes.length) unitAmenity_id = existRes[0].id;

        var sql = "";
        if(unitAmenity_id){
            sql = "Update amenity_units set ? where id = " + unitAmenity_id;
        } else {
            sql = "insert into amenity_units set ?";
        }

        var result = await connection.queryAsync(sql, {
            amenity_id,
            value: value,
            amenity_property_id: amenity_property_id,
            unit_id: unit_id
        });
        await Amenity.updateUnitLabel(connection, unit_id);
        // await Amenity.checkProcedureCondition(connection, amenity_property_id, unit_id, value);
        return unitAmenity_id ? unitAmenity_id : result.insertId;
    },

    updateUnitLabel: async (connection, unit_id) => {
        let sql = "select * from units where id =" + connection.escape(unit_id);
        let unit = await connection.queryAsync(sql).then( userRes => userRes.length ? userRes[0] : null);

        if(unit){
            sql = "update units set label = ";
            switch(unit.type){
                case 'storage':
                    sql += `CONCAT(
                        (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'width' and property_type = 'storage' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), '\\' x ', 
                        (SELECT value FROM  amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'length' and property_type = 'storage' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), '\\''
                        )`;
                    break;
                case 'residential':
                    sql += `CONCAT(
                        (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'beds' and property_type = 'residential' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), 'bd, ', 
                        (SELECT value FROM  amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'baths' and property_type = 'residential' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), 'bth '
                        )`;
                    break;
                case 'parking':
                    sql += `CONCAT(
                        (SELECT value FROM amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'width' and property_type = 'parking' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), '\\' x ', 
                        (SELECT value FROM  amenity_units WHERE amenity_property_id = (select id from amenity_property where amenity_name = 'length' and property_type = 'parking' and property_id = ${connection.escape(unit.property_id)}) and unit_id = ${connection.escape(unit_id)}), '\\''
                        )`;
                    break;
                default:
                    sql += connection.escape(unit.label);
                    break;
            }
            sql += ` where type = ${connection.escape(unit.type)} and id = ${connection.escape(unit_id)}`;
            return await connection.queryAsync(sql);
        }
        return;
    },

    saveUnitAmenity: function(connection, form, id){

        var sql = "";
        if(id){
            sql = "Update unit_amenities set ? where id = " + id;
        } else {
            sql = "insert into unit_amenities set ?";
        }
        return connection.queryAsync(sql, form);

    },

    deleteUnitAmenities: function(connection, ids){

        if(ids.length){
            var sql = "delete from amenity_units where id in (" + ids.join(', ') + ")";
            return connection.queryAsync(sql);

        }
        return false;

    },

    findUnitAll: function(connection, unit_id, type){
        var amenitySql = "Select *, " +
            "(select name from amenity_categories where id = " +
            "(select amenity_category_id as category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_name, " +
            " (Select amenity_name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = " + connection.escape(type) +")";
        return connection.queryAsync(amenitySql);
    },

    findAmenityUnitById: (connection, amenity_unit_id) =>{
        var amenitySql = `  SELECT * FROM amenity_units 
                            WHERE id = ${amenity_unit_id}`;
        return connection.queryAsync(amenitySql);
    },

    findUnitAmenitiesByProperty(connection, properties) {
        let sql = `SELECT id, name from amenities 
                    WHERE id in (select amenity_id from amenity_units where unit_id in (Select id from units where property_id in ( ${ properties.map(p => connection.escape(p) ).join(',')} )))
                    GROUP BY name
                    ORDER BY name;`
        console.log('findUnitAmenitiesByProperty =>',sql);
        return  connection.queryAsync(sql);
    },

    /*Added by BCT to find amenity by name from amenity_property table*/
    findPropertyAmenityByName: function(connection, field, type , property_id){
        var amenitySql = "Select * from amenity_property where amenity_name = " + connection.escape(field) + " and property_type = " + connection.escape(type) + " and property_id = " + connection.escape(property_id);
        return connection.queryAsync(amenitySql)
    },

    onboardNewAmenityProperties: function(connection, property_id) {
        let sql = `INSERT INTO amenity_property(
            amenity_id, property_id, amenity_name, 
            amenity_category_id, default_value, 
            amenity_options, property_type, 
            field_type
          ) 
          select 
            distinct a.id as amenity_id, 
            u.property_id, 
            a.name, 
            a.category_id as amenity_category_id, 
            a.default_value as default_value, 
            a.options as amenity_options, 
            a.property_type, 
            a.field_type 
          from 
            amenity_units au 
            join units u on u.id = au.unit_id 
            join amenities a on a.id = au.amenity_id 
            join amenity_categories ac on ac.id = a.category_id 
            left JOIN amenity_property ap on ap.property_id = u.property_id 
            and ap.amenity_id = au.amenity_id 
          where 
            u.property_id in ('${property_id}') 
            and ap.amenity_id is null`

        return connection.queryAsync(sql);
    },
    onboardNewAmenityUnits: function(connection, property_id) {
        let sql = `with resultset as (
            select 
              id, 
              amenity_id 
            from 
              amenity_property ap 
            where 
              property_id = '${property_id}'
          ) 
          update 
            amenity_units au 
            join resultset r on au.amenity_id = r.amenity_id 
          set 
            amenity_property_id = r.id 
          where 
            au.unit_id in (
              (
                select 
                  id 
                from 
                  units u 
                where 
                  property_id = '${property_id}'
              )
            )`
        return connection.queryAsync(sql);
    },
    updateAmenityProperties: function(connection, property_id) {
        let sql = `with resultset as (
            select 
              property_id, 
              amenity_id, 
              rank() over (
                partition by property_id 
                order by 
                  amenity_id asc
              ) as sort_order 
            from 
              amenity_property ap 
            where 
              ap.property_id = '${property_id}'
          ) 
          update 
            amenity_property ap 
            join resultset r on ap.property_id = r.property_id 
            and ap.amenity_id = r.amenity_id 
          set 
            ap.sort_order = r.sort_order 
          where 
            ap.property_id = '${property_id}'`
        return connection.queryAsync(sql);
    }


};

module.exports = Amenity;
