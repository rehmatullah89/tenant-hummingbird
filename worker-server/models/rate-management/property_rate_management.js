const TABLE_NAME = "property_rate_management_settings"
const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

module.exports = {
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {String} id paramater to select value
     * @param {String} clause under what clause the values should be fetched
     * @returns resulatant object
     */
    getConfiguration(connection, id, clause = "property_id") {
        let query = `SELECT * FROM ${TABLE_NAME} WHERE ${clause} = ?`

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
}