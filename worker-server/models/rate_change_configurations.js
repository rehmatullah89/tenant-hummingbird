var moment = require('moment');
var Promise = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');


module.exports = {

    save: function(connection, data, rate_change_configuration_id){
        
        var sql;
        if(rate_change_configuration_id){
            sql = "UPDATE rate_change_configurations set ? where id = " + connection.escape(rate_change_configuration_id);
        } else {
            sql = "INSERT INTO rate_change_configurations set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findAllByPropertyId: function(connection, property_id){

        if (!property_id) e.th(400, "property_id required");

        var unitSql = "Select * from rate_change_configurations where property_id = " + connection.escape(property_id) + " and deleted_at Is NULL";
        return connection.queryAsync(unitSql);
    },

    findByType: function(connection, type){

        if (!type) e.th(400, "property_id required");

        var unitSql = "Select * from rate_change_configurations where type = " + connection.escape(type) + " and deleted_at Is NULL";
        return connection.queryAsync(unitSql);

        // var unitSql = "Select * from rate_change_configurations " +
        //               "JOIN rate_changes ON ( rate_changes.rate_change_configuration_id = rate_change_configurations.id)" +
        //               "JOIN rent_change_leases ON ( rent_change_leases.rate_change_id = rate_changes.id)";
        // return connection.queryAsync(unitSql);
    },

    findById: function(connection, rate_change_configuration_id){

        if (!rate_change_configuration_id) e.th(400, "Rate Change Configuration id required");

        var sql = "Select rcc.*, r.rounding_type as rounding from rate_change_configurations rcc left join rounding r on r.object_id = rcc.id and r.status = 1 and r.object_type = 'scheduled_rate_change' where rcc.id = " + connection.escape(rate_change_configuration_id);
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findAllByPropertyAndType: function(connection, property_id, type){
        var rate_change_configurations_sql = `Select rcc.*, r.rounding_type as rounding from rate_change_configurations rcc left join rounding r on r.object_id = rcc.id and
                                                r.status = 1 and r.object_type = 'scheduled_rate_change' 
                                                where rcc.property_id = ${connection.escape(property_id)} and rcc.type = ${connection.escape(type)} and rcc.deleted_at Is NULL`;
        console.log("Rate change sql: ", rate_change_configurations_sql)
        return connection.queryAsync(rate_change_configurations_sql);
    },

    findLeasesByConfiguration: function(connection, changeRange, rentChangeLength, trigger, property_id){

        var period = rentChangeLength.period === 'days' ? 'DAY' : 
                     rentChangeLength.period === 'months' ? 'MONTH' :
                     rentChangeLength.period === 'years' ? 'YEAR' : 'DAY';

        var base_on_sql = trigger === 'start_of_lease'? "l.start_date": `(SELECT 
            s.start_date
        FROM
            services s
                INNER JOIN
            products p ON p.id = s.product_id
        WHERE
            p.default_type = 'rent'
                AND s.lease_id = l.id
        ORDER BY s.start_date DESC
        LIMIT 1)`;

        var rate_change_leases_sql = `SELECT l.* 
            FROM leases l
            INNER JOIN contact_leases cl ON cl.lease_id = l.id
            WHERE ${connection.escape(changeRange.from.format('YYYY-MM-DD'))} <= DATE_ADD(${base_on_sql}, INTERVAL ${rentChangeLength.length} ${period})
            AND ${connection.escape(changeRange.to.format('YYYY-MM-DD'))} >= DATE_ADD(${base_on_sql}, INTERVAL ${rentChangeLength.length} ${period})
            AND l.status = 1
            AND (l.end_date IS NULL || l.end_date >= ${connection.escape(changeRange.to.format('YYYY-MM-DD'))})
            AND (select property_id from units where id = (select unit_id from leases where id = l.id) ) = ${connection.escape(property_id)}
            ORDER BY cl.created_at DESC;`;

        console.log("SQL for leases of rate change: " + rate_change_leases_sql);
        return connection.queryAsync(rate_change_leases_sql);
    }
};