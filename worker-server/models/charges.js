var settings    = require(__dirname + '/../config/settings.js');
var moment = require('moment');

module.exports = {
    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE charges set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into charges set ?";
        }
        return connection.queryAsync(sql, data);

    },
    findByLeaseId: function(connection, lease_id){
        var sql = "Select  *, (select name from products where id = charges.product_id ) as product_name from charges where lease_id = " + connection.escape(lease_id) + " and billed_for is null ";

        return connection.queryAsync(sql);
    },
    deleteCustomCharge: function(connection, id){
        var sql = "DELETE from charges where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },
    markAsBilled: function(connection, ids){
        var sql = "update charges set billed_for = '" + moment().format('YYYY-MM-DD') + "' where id in (" + ids.join(', ') + ')';
        return connection.queryAsync(sql);
    }
};