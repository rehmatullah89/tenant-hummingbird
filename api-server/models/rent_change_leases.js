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
    
    bulkUpdate: function(connection, data){
        let sql = `INSERT INTO rent_change_leases (id,deleted_at) VALUES ?
            ON DUPLICATE KEY UPDATE deleted_at=VALUES(deleted_at);`
		return connection.queryAsync(sql, [data]);
    },

    bulkUpdateRent: function(connection, data) {
        let sql = `INSERT INTO rent_change_leases (id, change_amt, rent_change_amt, new_rent_amt) VALUES ? 
                    ON DUPLICATE KEY UPDATE change_amt = VALUES(change_amt), rent_change_amt = VALUES(rent_change_amt), new_rent_amt = VALUES(new_rent_amt)`; 
        return connection.queryAsync(sql, [data]);
    },

    getRentChangeLease: function(connection, rent_change_lease_id, property_id){

        if (!rent_change_lease_id) e.th(400, "Rate Change Lease id required");

        // var sql = "Select rcl.rent_change_status as status, rc.target_date as date, rcl.new_rent_amount as amount, rc.change_type as rent_change_type, rcl.rent_change_amt as rent_change_amount," + 
        // "date_format(rc.target_date, '%M'), rc.type as type , u.number as unit_number, l.start_date, l.end_date, l.moved_out from rent_change_leases rcl join leases l on rcl.lease_id = l.id join rate_changes rc rc.id = rcl.rate_change_id join contact_leases cl on cl.lease_id = l.id join units u on u.id = l.unit_id where rcl.id = " + connection.escape(rent_change_lease_id) + " and rcl.deleted_at Is NULL";

        var sql = "Select rcl.rent_change_status as status, rc.target_date as date, rcl.new_rent_amt as amount, rc.change_type as rent_change_type, rcl.rent_change_amt as rent_change_amount," + 
        "TIMESTAMPDIFF(MONTH ,rc.target_date, CURDATE()) as rent_change_month, rc.type as type, null as note, null as notification_id from rent_change_leases rcl join leases l on rcl.lease_id = l.id " +
        "join rate_changes rc on rc.id = rcl.rate_change_id where rcl.lease_id = " + connection.escape(rent_change_lease_id) + " and rcl.deleted_at Is NULL and rc.property_id = "+ connection.escape(property_id);
        return connection.queryAsync(sql).then(rc => rc.length? rc: null);
    },


    async getTotalRentRaisesCount(connection,lease_id){

        if (!lease_id) e.th(400, "lease_id is required");
        
        let sql = `SELECT COUNT(id) as count FROM rent_change_leases WHERE lease_id =  ${connection.escape(lease_id)} and change_applied <= CURRENT_TIMESTAMP();`
        return connection.queryAsync(sql);
  },

    async getRentManagementSettings(connection, property_id) {
        var sql = "SELECT * FROM property_rent_management_settings prms WHERE property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql).then(l => l.length ? l[0] : null);
    },

    async getDeliveryDetails(connection, property_id) {
        let sql = "SELECT * FROM property_rent_management_delivery_methods prmdm WHERE prmdm.active = 1 AND prmdm.property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    /**
     * This method will return rent changes for given lease IDs. 
     * Passing rate_change_id as parameter will return rent changes leases affected by that rate change
     * @param {*} connection 
     * @param {Array} lease_ids Lease IDs
     * @param {String} rate_change_id Rate Change ID (optional)
     * @returns Array of Leases
     */
    async findByLeaseIds(connection, lease_ids, rate_change_id) {
        if (!lease_ids?.length) e.th(400, "lease_ids are required");

        let conditions = rate_change_id ? ` AND rcl.rate_change_id = ${rate_change_id} ` : ''
        let sql = `
            SELECT 
                *  
            FROM 
                rent_change_leases rcl
            WHERE 
                rcl.lease_id IN (${lease_ids})
                AND rcl.deleted_at IS NULL
                ${conditions}
            ORDER BY
                rcl.lease_id
            DESC
        `
        return connection.queryAsync(sql).then(result => result.length ? result : []);
    },

    async findLatestRentChanges(connection, lease_ids, rate_change_id) {
        if (!lease_ids?.length) e.th(400, "lease_ids are required");

        let conditions = rate_change_id ? ` AND rcl.rate_change_id = ${rate_change_id} ` : ''
        let sql = `
            SELECT
                rcl.*
            FROM 
                rent_change_leases rcl
                JOIN (
                    SELECT 
                        lease_id, MAX(id) AS latest_rcl_id
                    FROM 
                        rent_change_leases
                    WHERE 
                        deleted_at IS NULL
                    GROUP BY 
                        lease_id
                ) latest ON rcl.lease_id = latest.lease_id AND rcl.id = latest.latest_rcl_id
            WHERE 
                rcl.deleted_at IS NULL
                AND rcl.lease_id IN (${lease_ids})
                ${conditions}
            ORDER BY
                rcl.lease_id DESC;
        `
        return connection.queryAsync(sql).then(result => result.length ? result : []);
    }

    

};

