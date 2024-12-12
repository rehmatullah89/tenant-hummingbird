const e = require(__dirname + '/../modules/error_handler.js');


module.exports = {

    save: function (connection, data) {
        let sql = `INSERT INTO space_type_rent_plan_defaults (space_type, value_tier_type, rent_management_plan_id, property_id) VALUES ? 
        ON DUPLICATE KEY UPDATE rent_management_plan_id = VALUES(rent_management_plan_id)`; 
        return connection.queryAsync(sql, [data]);
    },

    delete: function (connection, condition) {
        if (!condition['space_type']) e.th(400, "space type required");
        if (!condition['property_id']) e.th(400, "property id required");
        const sql = `DELETE FROM  space_type_rent_plan_defaults WHERE tier_id = ${connection.escape(condition['space_type'])} AND property_id = ${connection.escape(condition['property_id'])}`;
        return connection.queryAsync(sql);
    },

    findValueTierLabel: function (connection, property_id) {
        const sql = `SELECT json_objectagg(tier_type, label) as labels FROM  property_value_price_tier_configurations WHERE property_id =   ${connection.escape(property_id)}`;
        return connection.queryAsync(sql).then((resp) => {
            // resp?.map(settings => {settings.labels = JSON.parse(settings.labels)})
            return resp?.length ? resp[0].labels: null
        })
    },

    checkValuePricingEnabled: function (connection, property_id) {
        const sql = `SELECT value_pricing_active FROM property_rate_management_settings WHERE property_id =  ${connection.escape(property_id)}`;
        return connection.queryAsync(sql).then((resp) => {
            return resp?.length ? Boolean(resp[0].value_pricing_active): false
        })
    },

    find: function (connection, condition, value_pricing_active = false) {
        let value_pricing_active_condition = '';
        if (!condition['space_type']) e.th(400, "space type required");
        if (!condition['property_id']) e.th(400, "property id required");
        if(!value_pricing_active) value_pricing_active_condition = ` and value_tier_type = 'good' `;
        let sql = `SELECT space_type, json_arrayagg(json_object('value_tier_type', value_tier_type,'rent_plan_id',rent_management_plan_id)) AS plans
        FROM space_type_rent_plan_defaults WHERE property_id =  ${connection.escape(condition['property_id'])} ${value_pricing_active_condition} AND space_type = ${connection.escape(condition['space_type'])}`;
        return connection.queryAsync(sql).then((resp) => {
            // resp?.map(settings => {settings.plans = JSON.parse(settings.plans)})
            return resp?.length ? resp[0]: null
        })
    },

    findAll: function (connection, property_id, value_pricing_active = false) {
        let value_pricing_active_condition = '';
        if(!value_pricing_active) value_pricing_active_condition = ` and value_tier_type = 'good' `;
        let sql = `SELECT space_type, json_arrayagg(json_object('value_tier_type', value_tier_type,'rent_plan_id',rent_management_plan_id)) AS plans
        FROM space_type_rent_plan_defaults WHERE property_id =  ${connection.escape(property_id)} ${value_pricing_active_condition} GROUP BY space_type ORDER BY space_type`;
        return connection.queryAsync(sql).then((resp) => {
            // resp?.map(settings => {settings.plans = JSON.parse(settings.plans)})
            return resp?.length ? resp: null
        })
    },

};