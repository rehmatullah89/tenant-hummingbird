var settings    = require(__dirname + '/../config/settings.js');



module.exports = {

    findByLeaseId: function(connection, lease_id){
        var typeSql = "Select * from maintenance_types where deleted = 0 and property_id = (select property_id from units where id = (select unit_id from leases where id = " + lease_id + " ))";

        return connection.queryAsync(typeSql);
    },

    findByPropertyId: function(connection, id){
        var typeSql = "Select *, (select name from vendors where id = maintenance_types.vendor_id) as vendor_name from maintenance_types where property_id = '" + id + "' and deleted = 0";

        return connection.queryAsync(typeSql)

    },


    findAll: function(connection, properties){
        var typeSql = "Select * from maintenance_types where property_id in (" + properties.map(p => connection.escape(p)).join(',') + ") and deleted = 0 GROUP By name";

        return connection.queryAsync(typeSql)

    },

    findById: function(connection, id){
        //Todo get Supplimental Info

        var typeSql = "Select *, " +
            "(select name from vendors where id = maintenance_types.vendor_id) as vendor_name " +
            "from maintenance_types where deleted = 0 and id = " + id;

        return connection.queryAsync(typeSql).then(function(typeRes){
            return typeRes[0] || null
        })

    },

    findTypeById: function(connection, id){
        var typeSql = "Select *, " +
            "(select name from vendors where id = maintenance_types.vendor_id) as vendor_name " +
            "from maintenance_types where deleted = 0 and id = " + id;

        return connection.queryAsync(typeSql).then(function(typeRes){
            return typeRes.length? typeRes[0]: null;
        })

    },

    save: function(connection, form, maintenance_id){
        var addMTSql = "";
        if(maintenance_id){
            addMTSql = "Update maintenance_types set ? where id = " + maintenance_id;
        } else {
            addMTSql = "insert into maintenance_types set ?";
        }
        return connection.queryAsync(addMTSql, form).then(r => maintenance_id ? maintenance_id: r.insertId);
    },

    delete: function(connection, id){
        var maintenanceSql = "update maintenance_types set deleted = 1 where id = " + connection.escape(id);
        return connection.queryAsync(maintenanceSql);
    }
};
