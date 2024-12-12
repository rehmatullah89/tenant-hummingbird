const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

const TABLE_NAME = "property_rate_management_settings"

module.exports = {
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {String} id paramater to select value
     * @param {String} clause under what clause the values should be fetched
     * @returns resulatant object
     */
    getConfiguration(connection, id, clause = "prs.property_id") {
        let query = `SELECT prs.*, up.name as rate_plan_name FROM ${TABLE_NAME} as prs LEFT JOIN unit_group_profiles as up ON prs.default_unit_group_profile_id=up.id WHERE ${clause} = ?`

        return connection.queryAsync(query, [id]).then((res) => (res.length ? res[0] : null))
    },
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Array} data list of values to be inserted
     * @returns resulatant object
     */
    saveConfiguration(connection, data) {
        let queryEssentials = generateInsertQueryPatch(data, [
            "property_id",
            "active",
            "round_to",
            "default_unit_group_profile_id",
            "value_pricing_active",
            "rate_engine"
        ])
        let query = `INSERT INTO ${TABLE_NAME}(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

        return connection.queryAsync(query, queryEssentials.values)
    },
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {*} clause under which condition record should update
     * @param {*} data key value pairs on basis of { field: value }
     * @returns resulatant object
     */
    updateConfiguration(connection, clause, data) {
        let builder = generateUpdateQueryPatch(data)

        if (!(builder && clause)) return

        let query = `UPDATE ${TABLE_NAME} SET ${builder} WHERE ${clause}`
        return connection.queryAsync(query, Object.values(data))
    },
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {*} data key value pairs on basis of { field: value }
     * @returns {Boolean}
     */
     checkExistance(connection, data) {
        let query = `SELECT EXISTS(SELECT * FROM ${TABLE_NAME} WHERE ?) AS exist`

        return connection.queryAsync(query, data).then((res) => (res?.length ? !!res[0]?.exist : false))
    }
}
