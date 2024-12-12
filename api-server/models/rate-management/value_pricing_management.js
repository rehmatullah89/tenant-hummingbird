const TABLE_NAME = "property_value_price_tier_configurations"
const PROPERTY_RATE_MANAGEMENT_TABLE_NAME = "property_rate_management_settings"

module.exports = {
    get(connection, property_id) {
        let query = `
        SELECT COALESCE(
          (
            SELECT
              json_object(
                'active',
                prms.value_pricing_active,
                'settings',
                (
                  SELECT
                    json_arrayagg(
                      json_object(
                        'type', pvptc.tier_type, 'label',
                        pvptc.label, 'min_price_difference',
                        pvptc.min_difference_in_price
                      )
                    )
                  FROM
                    ${TABLE_NAME} pvptc
                  WHERE
                    pvptc.property_id = prms.property_id
                )
              )
            FROM
              ${PROPERTY_RATE_MANAGEMENT_TABLE_NAME} prms
            WHERE
              prms.property_id = ?
          ),
          json_object('active', 0, 'settings', null)
        ) as configuration;`

        return connection.queryAsync(query, [property_id]).then((response) => (response?.[0]?.configuration))
    },

    saveSettings(connection, data) {
        let fields = ["property_id", "tier_type", "min_difference_in_price", "label"]
        let query = `INSERT INTO ${TABLE_NAME} (${fields.join(",")}) VALUES ?`

        return connection.queryAsync(query, [data])
    },

    deleteSettings(connection, data) {
        let query = `DELETE FROM ${TABLE_NAME} WHERE ?`

        return connection.queryAsync(query, data)
    },

    updateSettings(connection, data, clause) {
        let query = `UPDATE ${TABLE_NAME} SET ? WHERE ${clause}`

        return connection.queryAsync(query, data)
    },

    checkExistance(connection, data) {
        let query = `SELECT EXISTS(SELECT * FROM ${TABLE_NAME} WHERE ?) AS exist`

        return connection.queryAsync(query, data).then((res) => (res?.length ? !!res[0]?.exist : false))
    }
}
