var moment = require('moment');
var Promise         = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');
var sql_helper  = require(__dirname + '/../modules/sql_helper.js');

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


        var sql = `SELECT rc.*, (select count(upload_id) from rent_change_leases where rent_change_leases.rate_change_id = rc.id) as uploads,
                    (select count(interaction_id) from rent_change_leases where rent_change_leases.rate_change_id = rc.id) as emails,
                    (select rounding_type from rounding r where r.object_id = rc.id and r.object_type = 'rate_change'and r.status = 1) as rounding,
                    u.src,
                     u.name as filename
                    FROM  rate_changes rc
                    INNER JOIN	properties p ON rc.property_id = p.id 
                    LEFT JOIN	uploads u ON rc.upload_id = u.id 
                    WHERE  rc.id = ${connection.escape(rate_change_id)}`;

        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findRateChanges(connection, company_id, params, properties = []) {

        var sql = `SELECT rc.*, 
                    (select count(upload_id) from rent_change_leases where rent_change_leases.rate_change_id = rc.id) as uploads,
                    (select count(interaction_id) from rent_change_leases where rent_change_leases.rate_change_id = rc.id) as emails,
                    u.src,
                    u.name as filename
                    FROM 		rate_changes rc
                    INNER JOIN	properties p ON rc.property_id = p.id
                    LEFT JOIN	uploads u ON rc.upload_id = u.id
                    WHERE 		p.company_id = ${connection.escape(company_id)}`;

        if(params.type){
            if(params.type == 'future'){
                sql += ` AND (rc.completed IS NULL AND rc.skipped IS NULL and rc.deleted_at IS NULL)`;
            } else {
                sql += ` AND (rc.completed Is NOT NULL OR rc.skipped IS NOT NULL OR rc.deleted_at IS NOT NULL)`;
            }
        }
        if(params.from_date) {
            let to_Date = params.to_date || moment.utc().format('YYYY-MM-DD');
            sql += ` AND (rc.target_date BETWEEN ${connection.escape(params.from_date)} and ${connection.escape(to_Date)}) `
        }

        if(properties.length){
            sql += ` AND p.id in ( ${properties.map(p => connection.escape(p)).join(", ")})`;
        }

        sql += ` ORDER BY rc.target_date ${params.type == 'future' ? 'ASC' : 'DESC'}, rc.created_at ASC`;

        if(params){
          params.limit = params.limit || 20;
          params.offset = params.offset || 0;
          sql += ' LIMIT ' + params.offset + ', ' + params.limit;
        }

        console.log("SQLLLLLLLLLL", sql);

        return connection.queryAsync(sql);;

      },

    findRateChangeLeases: function(connection, rate_change_id){

        if (!rate_change_id) e.th(400, "rate_change_id is required");

        var sql = "select " +
          "    rcl.rate_change_id," +
          "    rcl.lease_id," +
          "    rcl.notification_sent," +
          "    rcl.deleted_at," +
          "    rcl.upload_id," +
          "    rcl.interaction_id," +
          "    rcl.status," +
          "    rcl.change_amt," +
          "    l.unit_id,  " +
          "    l.end_date,  " +
          "    u.number,  " +
          "    c.first,  " +
          "    c.last,  " +
          "    c.email,  " +
          "    s.price,  " +
          "    up.name,  " +
          "    up.src,  " +
          "    i.contact_id  " +
        //   "    e.email_address  " +
          " FROM rent_change_leases rcl" +
          " LEFT JOIN uploads up on up.id = rcl.upload_id  " +
          " LEFT JOIN interactions i on i.id = rcl.interaction_id " +
          " LEFT JOIN leases l on l.id = rcl.lease_id  " +
          " LEFT JOIN services s on s.lease_id = l.id and s.status = 1 and s.product_id in( select id from products where default_type = 'rent') and s.start_date <= CURDATE() and (s.end_date is null or s.end_date >= CURDATE())  " +
          " LEFT JOIN units u on u.id = l.unit_id  " +
          " LEFT JOIN contact_leases cl on l.id = cl.lease_id and cl.primary = 1" +
          " LEFT JOIN contacts c on cl.contact_id = c.id  " +
          " where rcl.rate_change_id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL";

       // var sql = "Select * from rent_change_leases where rate_change_id = " + connection.escape(rate_change_id) + " and deleted_at Is NULL";
      console.log("$$$$", sql);
        return connection.queryAsync(sql);
    },
    /**
     * Method for fetching rent changes with a given set of conditons
     * @param {*} connection 
     * @param {Object} params This Will be considered as conditions where key will be the column name and value will be column value
     * @returns Array of rent changes
     */
    findRateChangeByConfig: function (connection, params, rounding) {
        let conditionQuery = sql_helper.convertObjectToSqlCondition(params, '<=>', 'AND', 'rc')
        let roundingCondition = rounding ? ` AND ${sql_helper.convertObjectToSqlCondition(rounding, '<=>', 'AND', 'r')}` : ''
        let sql = 
            `
            SELECT 
                rc.*
            FROM 
                rate_changes rc
            ` +
            ` ${rounding ? 'INNER JOIN rounding r on rc.id = r.object_id' : ''} ` +
            `
            WHERE 
                ${conditionQuery}
                ${roundingCondition}
            ORDER BY rc.id DESC
            `
        return connection.queryAsync(sql).then(rc => rc.length ? rc[0] : null);
    }
};

