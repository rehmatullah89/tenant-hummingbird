const TABLE_NAME = "company_rent_management_settings"
const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")


module.exports = {

    getConfiguration: function (connection, company_id) {
        const sql = `SELECT
            approval_type,
            advance_rent_change_queue_months, round_to 
            FROM  ${TABLE_NAME} WHERE company_id = ${connection.escape(company_id)};`
        return connection.queryAsync(sql).then(rc => rc.length ? rc[0] : null);
    },


};