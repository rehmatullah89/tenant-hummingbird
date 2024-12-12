var settings    = require(__dirname + '/../config/settings.js');

module.exports = {
    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE product_rules set ? where id = " + connection.escape(id);
        } else {
            sql = "INSERT into product_rules set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findRulesByProduct(connection, product_id, filters = {}){
        var sql = "Select * from product_rules where product_id = " + connection.escape(product_id);

        if(filters.property_id){
            sql += " and property_id = " + connection.escape(filters.property_id);
        } else {
            sql += " and property_id is null";
        }

        return connection.queryAsync(sql);
    },

    deleteProductRules(connection, id, product_id, property_id){
        var sql;

        if(id){
            sql = `DELETE FROM product_rules where id = ${connection.escape(id)}`;
        } else {
            sql = `DELETE FROM product_rules where product_id = ${connection.escape(product_id)}`;

            if(property_id){
                sql += " and property_id = " + connection.escape(property_id);
            } else {
                sql += " and property_id is null";
            }
        }

        return connection.queryAsync(productSql);
    },

    removeRules: function(connection, product_id, schedule_string, filters = {}){
        var sql = "DELETE FROM product_rules where product_id = " + connection.escape(product_id);

        if(filters.property_id){
            sql += " and property_id = " + connection.escape(filters.property_id);
        } else {
            sql += " and property_id is null";
        }

        if(schedule_string && schedule_string.length){

            sql += " and id not in (" + schedule_string + ") ";
        }

        return connection.queryAsync(sql);
    },

    getRuleRange(connection, property_id, product_id, rent){
        let sql = `SELECT * FROM (
                    SELECT * FROM product_rules WHERE product_id = ${connection.escape(product_id)} AND property_id is null 
                    and (rent_threshold >= ${connection.escape(rent)}) HAVING min(rent_threshold)
                    UNION
                    SELECT * FROM product_rules WHERE product_id = ${connection.escape(product_id)} AND property_id is null
                    and rent_threshold is NULL
                    UNION
                    SELECT * FROM product_rules WHERE product_id = ${connection.escape(product_id)} AND property_id = ${connection.escape(property_id)} 
                    and (rent_threshold >= ${connection.escape(rent)}) HAVING min(rent_threshold)
                    UNION
                    SELECT * FROM product_rules WHERE product_id = ${connection.escape(product_id)} AND property_id = ${connection.escape(property_id)} 
                    and rent_threshold is NULL) pr
                   ORDER BY pr.property_id is null, pr.rent_threshold is null, pr.rent_threshold LIMIT 1;`;

        console.log("getRuleRange sql", sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0]: null);
    },

};
