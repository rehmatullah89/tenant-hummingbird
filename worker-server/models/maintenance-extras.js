var settings    = require(__dirname + '/../config/settings.js');



module.exports = {
    
    findByPropertyId: function(connection, id){
        var extraSql = "Select * from maintenance_extras where active = 1 and property_id = " + id;

        return connection.queryAsync(extraSql);
    },

    findById: function(connection, id){
        var extraSql = "Select * from maintenance_extras where id = " + id;

        return connection.queryAsync(extraSql).then(function(extraRes){
            return extraRes[0] || null;

        });
    },

    save: function(connection, form, extra_id){
        var addExtraSql = "";
        if(extra_id){
            addExtraSql = "Update maintenance_extras set ? where id = " + extra_id;
        } else {
            addExtraSql = "insert into maintenance_extras set ?";
        }
        return connection.queryAsync(addExtraSql, form).then(r => extra_id ? extra_id: r.insertId);

    },

    delete: function(connection, id){
        var sql = "update maintenance_extras set active = 0 where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    }

};