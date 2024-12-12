var moment = require('moment');
var Promise         = require('bluebird');

var e  = require(__dirname + '/../modules/error_handler.js');


module.exports = {

    save: function(connection, data, rate_change_id){

        var sql;
        if(rate_change_id){
            sql = "UPDATE rate_changes set ? where id = " + connection.escape(rate_change_id);
        } else {
            sql = "INSERT INTO rate_changes set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findById: function(connection, rate_change_id){

        if (!rate_change_id) e.th(400, "Rate Change id required");

        var sql = "Select rc.*, r.rounding_type as rounding from rate_changes rc left join rounding r on r.object_id = rc.id and r.status = 1 and r.object_type = 'rate_change' where rc.id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findByRateChangeConfigurationId: function(connection, rate_change_configuration_id){

        if (!rate_change_configuration_id) e.th(400, "rate_change_configuration_id is required");

        var sql = "Select * from rate_changes where rate_change_configuration_id = " + connection.escape(rate_change_configuration_id) + " and deleted_at Is NULL";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findRateChangeDocument (connection, property_id, rate_change_id) {
        let sql = `
        SELECT 
            rc.id as rate_change_id,
            rc.name as rate_change_name,
            rc.type as rate_change_type,
            rc.reviewed,
            rcl.lease_id,
            up.id as upload_id,
            up.filename,
            up.destination,
            up.destination_file_path
        FROM rate_changes rc
        INNER JOIN rent_change_leases rcl on rc.id = rcl.rate_change_id 
                    and rc.property_id = ${connection.escape(property_id)}
                    and rcl.status <> 'error'
        INNER JOIN leases l on rcl.lease_id = l.id
        INNER JOIN uploads up on rcl.upload_id = up.id
        WHERE l.status = 1
        ${rate_change_id ? `AND rc.id = ${connection.escape(rate_change_id)}`:''}
        AND rc.deleted_at IS NULL
        AND rc.skipped IS NULL
        AND rc.reviewed IS NOT NULL
        AND rc.upload_id IS NULL
        AND rcl.deleted_at IS NULL;`
        console.log('findRateChangeDocument => ',sql);
        return connection.queryAsync(sql);
    },    
    
    
    async findLastRentChangeDate (connection, lease_id) {
        let sql = `            
                SELECT s.start_date as last_rent_change_date
                FROM services s 
                JOIN products p ON 
                    s.product_id = p.id AND
                    p.default_type = 'rent'
                WHERE
                    lease_id = ${lease_id} AND
                    s.status = 1 AND
                    s.start_date < CURDATE() AND (
                        s.end_date IS NULL OR
                        s.end_date >= CURDATE() 	
                    ) AND
                    s.start_date <> (
                        SELECT start_date
                        FROM leases l 
                        WHERE l.id = ${lease_id}
                    )	
                ORDER BY start_date DESC 
                LIMIT 1
        `
        let result = await connection.queryAsync(sql);
        return result[0]?.last_rent_change_date
    },

    async findRentPlanSettingsById(connection, rentPlanId) {
        let sql = `
            SELECT settings as rent_plan_settings
            FROM rent_management_plans rmp 
            WHERE 
                rmp.id = ${rentPlanId} AND
                rmp.deleted_at IS NULL
        `;
        let result = await connection.queryAsync(sql)
        return JSON.parse(result[0]?.rent_plan_settings).sort((a, b)=> a.sort_order - b.sort_order);
    },

};

