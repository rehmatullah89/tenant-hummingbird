const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

const TABLE_NAME = "rate_management_plans"

module.exports = {
    /**
     *
     * @param {SQLConnectionObject} connection
     * @param {String} id
     * @param {String} clause
     * @returns either single or multiple set of rate plans
     */
    getRatePlans(connection, id, clause = "id") {
        let query = `
        SELECT
            json_arrayagg(
                json_object(
                    'id',
                    rmp.id,
                    'name',
                    rmp.name,
                    'description',
                    rmp.description,
                    'price_delta_type',
                    rmp.price_delta_type,
                    'round_to',
                    rmp.round_to,
                    'created_by',
                    rmp.contact_id,
                    'settings',
                    rmp.settings,
                    'tags',
                    rmp.tags
                )
            ) as rate_plans
        FROM
            ${TABLE_NAME} rmp
        WHERE
            rmp.${clause} = ?;
        `

        return connection.queryAsync(query, [id]).then((resp) => {
            return resp?.length ? (resp[0]?.rate_plans ?? null) : null
        })
    },

    saveRatePlan(connection, data) {
        let queryEssentials = generateInsertQueryPatch(data, [
            "company_id",
            "contact_id",
            "name",
            "description",
            "price_delta_type",
            "round_to",
            "settings",
            "tags"
        ])
        let query = `INSERT INTO ${TABLE_NAME}(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

        return connection.queryAsync(query, queryEssentials.values)
    },

    updateRatePlan(connection, data, clause) {
        let builder = generateUpdateQueryPatch(data)

        if (!(builder && clause)) return

        let query = `UPDATE ${TABLE_NAME} SET ${builder} WHERE ${clause}`

        return connection.queryAsync(query, Object.values(data))
    },

    deleteRatePlan(connection, id) {
        let query = `DELETE FROM ${TABLE_NAME} WHERE id = ?`

        return connection.queryAsync(query, [id])
    },

    checkExistance(connection, data) {
        let query = `SELECT EXISTS(SELECT * FROM ${TABLE_NAME} WHERE ?) AS exist`

        return connection.queryAsync(query, data).then(res => res?.length ?  !!res[0]?.exist : false)
    }
}
