const TABLE_NAME = "company_rent_management_settings"
const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")


module.exports = {

    getConfiguration: function (connection, company_id) {
        const sql = `SELECT
            round_to 
            FROM  ${TABLE_NAME} WHERE company_id = ${connection.escape(company_id)};`
        return connection.queryAsync(sql).then(rc => rc.length ? rc[0] : null);
    },

    checkExistance(connection, company_id) {
		let query = `
			SELECT exists(
				select * 
				FROM ${TABLE_NAME} crms 
				WHERE crms.company_id = ${company_id}
			) as exist;`
		return connection.queryAsync(query).then(res=> !!res[0]?.exist)
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
	 * @param {Array} data list of values to be inserted
	 * @returns resulatant object
	 */
	saveConfiguration(connection, data) {
		let queryEssentials = generateInsertQueryPatch(data, Object.keys(data))
		let query = `INSERT INTO ${TABLE_NAME}(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

		return connection.queryAsync(query, queryEssentials.values)
	},


};