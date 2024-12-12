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

    findAll: function(connection, conditions, company_id, properties = []){

        var sql = `select rcc.* 
                    from        rate_change_configurations rcc
                    INNER JOIN	properties p ON rcc.property_id = p.id 
                    WHERE       p.company_id = ${connection.escape(company_id)} 
                    AND         rcc.deleted_at IS NULL`;
        
        if(conditions){
            if(conditions.type){
                sql += ` AND rcc.type = ${connection.escape(conditions.type)}`;
            }

            if(conditions.property_id){
                sql += ` AND rcc.property_id = ${connection.escape(conditions.property_id)}`;
            }
        }

        if(properties.length){
            sql += ` AND p.id in ( ${properties.map(p => connection.escape(p)).join(", ")})`;
        }
 
        return connection.queryAsync(sql);
    },

    findById: function(connection, rate_change_configuration_id){

        if (!rate_change_configuration_id) e.th(400, "Rate Change Configuration id required");

        var sql = "Select rcc.*, r.rounding_type as rounding from rate_change_configurations rcc left join rounding r on r.object_id = rcc.id and r.status = 1 and r.object_type = 'scheduled_rate_change' where rcc.id = " + connection.escape(rate_change_configuration_id) ;
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    }

};