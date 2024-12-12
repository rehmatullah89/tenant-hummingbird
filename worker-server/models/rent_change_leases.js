var moment = require('moment');
var Promise         = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');


module.exports = {

    save: function(connection, data, rent_change_lease_id){
        var sql;
        if(rent_change_lease_id){
            sql = "UPDATE rent_change_leases set ? where id = " + connection.escape(rent_change_lease_id);
        } else {
            sql = "INSERT INTO rent_change_leases set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findById: function(connection, rent_change_lease_id){

        if (!rent_change_lease_id) e.th(400, "Rate Change Lease id required");

        var sql = "Select * from rent_change_leases where id = " + connection.escape(rent_change_lease_id) + " and deleted_at Is NULL";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findByRateChangeId: function(connection, rate_change_id){

        if (!rate_change_id) e.th(400, "rate_change_id is required");

        var sql = "Select * from rent_change_leases where rate_change_id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL";
        return connection.queryAsync(sql);
    },

    findByLeaseId: function(connection, lease_id, rate_change_id){

        if (!lease_id) e.th(400, "lease_id is required");

        var sql = "Select * from rent_change_leases where lease_id = " + connection.escape(lease_id) + " and  rate_change_id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL";
        return connection.queryAsync(sql).then(l => l.length? l[0]: null);
    },

    bulkSave: function(connection, data){
		 
        let sql = "insert into rent_change_leases (`rate_change_id`,`lease_id`,`notification_sent`,`deleted_at`,`change_amt`,`rent_change_amt`,`new_rent_amt`) VALUES ?";
		return connection.queryAsync(sql, [data]);
    },
    
    findUnnotifiedCount: function(connection, rate_change_id){

        if (!rate_change_id) e.th(400, "rate_change_id is required");

        var sql = "Select count(*) as count from rent_change_leases where rate_change_id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL and (status is null or status not in ('done', 'error'))";
        return connection.queryAsync(sql);
    },

};

