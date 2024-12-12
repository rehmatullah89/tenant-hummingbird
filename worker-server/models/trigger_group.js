module.exports = {
    getPropertyTriggers: (connection, property_id, company_id) => {
        var sql = `select property_id as propertyId, trigger_group_id as triggerGroupId from property_trigger_groups where 1=1 and deleted_at is null`;

        if(company_id) {
            sql += " and property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")";
        }

        if(property_id) {
            sql += ` and property_id  = ` + connection.escape(property_id);
        }
        console.log("sql", sql);

        return connection.queryAsync(sql);
    },
    findById: function (connection, trigger_group_id) {
        var sql = "Select * from trigger_groups where active = 1 and id = " + connection.escape(trigger_group_id);
        return connection.queryAsync(sql).then(function (qryRes) {
            return qryRes[0] || null;
        });
    },

}