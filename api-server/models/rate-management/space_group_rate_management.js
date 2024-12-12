const TABLE_NAME = "property_space_group_tier_rate_management_plans"

module.exports = {
    get(connection, data) {
        let query = `SELECT * FROM ${TABLE_NAME} psgtrmp WHERE ?`

        return connection.queryAsync(query, data).then((response) => response?.length ? response[0] : null)
    },

    save(connection, data) {
        let query = `INSERT INTO ${TABLE_NAME} SET ?`

        return connection.queryAsync(query, data)
    },

    update(connection, data, clause) {
        let query = `UPDATE ${TABLE_NAME} SET ? WHERE ${clause}`

        return connection.queryAsync(query, data)
    },

    checkExistance(connection, data) {
        let query = `SELECT EXISTS(SELECT * FROM ${TABLE_NAME} WHERE ?) AS exist`

        return connection.queryAsync(query, data).then((res) => (res?.length ? !!res[0]?.exist : false))
    },
}
