var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {
    findByPropertyId:function(connection, property_id) {

        var hoursSql = "Select * from property_hours where status = 1 and property_id = " + connection.escape(property_id);
        var hours = {};
        return connection.queryAsync(hoursSql);
    },
    findById:function(connection, id) {

        var hoursSql = "Select * from property_hours where id = " + connection.escape(id);
        var hours = {};
        return connection.queryAsync(hoursSql).then(hours => {
            return hours ? hours[0]: null;
        })
    },
    save:function(connection, data, hours_id){
        var sql;
        if(hours_id){
            sql = "UPDATE property_hours set ? where id = " + connection.escape(hours_id);
        } else {
            sql = "insert into property_hours set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return hours_id || response.insertId;
        });
    },
    delete:function(connection, hours_id){
        var sql = "update property_hours set status = 0 where id = " + connection.escape(hours_id);
        return connection.queryAsync(sql);
    }
};