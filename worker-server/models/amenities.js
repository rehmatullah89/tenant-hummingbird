var settings    = require(__dirname + '/../config/settings.js');
module.exports = {


    findAmenityByName: function(connection, field, type ){
        var amenitySql = "Select * from amenities where name = " + connection.escape(field) + " and property_type = " + connection.escape(type);
        return connection.queryAsync(amenitySql)
    },

    findAllAmenities:function(connection, type, property_id){
        let amenitySql = `
            select 
                ap.amenity_name as name,
                ap.default_value,
                ap.property_type,
                ap.field_type,
                ap.amenity_options as options,
                ac.name as category_name,
                ac.type as category_type
            from amenity_property ap
                join amenity_categories ac on ac.id = ap.amenity_category_id
            where ap.amenity_category_id != 11
                and ap.property_type = ${connection.escape(type)}
                and ap.property_id = ${connection.escape(property_id)}
            having JSON_VALID(options) = 1
        `;

        return connection.queryAsync(amenitySql).then(function(amenityRes){
            var amenityList = {};
            amenityRes.forEach(function(am, i){
                amenityList[am.category_type] = amenityList[am.category_type] || {};
                amenityList[am.category_type][am.category_name] =  amenityList[am.category_type][am.category_name] || [];
                am.options = am.options ? JSON.parse(am.options): {};
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

    findUnitFeatures: function(connection, unit_id, type){

        var amenitySql = "Select *, " +
            " (Select name from amenities where id = amenity_units.amenity_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_id in " +
            " (select id from amenities where property_type = '" + type + "' and category_id = 11)";

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
            " (Select amenity_name as name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = '" + type + "' and amenity_category_id = 11 and property_id="+
            " (Select property_id from units where id="+ connection.escape(unit_id) + ") "+
            ")";

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
            "(select amenity_category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_name, " +
            "(select type from amenity_categories where id = " +
            "(select amenity_category_id from amenity_property where id = amenity_units.amenity_property_id )) as category_type, " +
            " (Select amenity_name as name from amenity_property where id = amenity_units.amenity_property_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_property_id in " +
            " (select id from amenity_property where property_type = " + connection.escape(type) + " and amenity_category_id != 11 and property_id="+ 
            " (Select property_id from units where id="+ connection.escape(unit_id) +") " +
            ")";

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
            "(select category_id from amenities where id = amenity_units.amenity_id )) as category_name, " +
            " (Select name from amenities where id = amenity_units.amenity_id) as name " +
            "from amenity_units " +
            " where unit_id = " + connection.escape(unit_id) + " and amenity_id in " +
            " (select id from amenities where property_type = " + connection.escape(type) + " and category_id != 11)";

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


    findUnitAmenityByName: function(connection, name, property_type, category_id){

    },

    saveUnitFeatures:function(connection, amenity_id, value, unit_id){

        var existSql = "Select * from amenity_units where amenity_id = " + connection.escape(amenity_id) + ' and unit_id = ' + connection.escape(unit_id);
        return connection.queryAsync(existSql).then(function(existRes){
            var unitAmenity_id;

            if(existRes.length) unitAmenity_id = existRes[0].id;
            var sql = "";
            if(unitAmenity_id){
                sql = "Update amenity_units set ? where id = " + unitAmenity_id;
            } else {
                sql = "insert into amenity_units set ?";
            }

            return connection.queryAsync(sql, {
                value: value,
                amenity_id: amenity_id,
                unit_id: unit_id
            }).then(function(result){
                if(unitAmenity_id) return unitAmenity_id;
                return result.insertId;
            })
        });
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

    }
};