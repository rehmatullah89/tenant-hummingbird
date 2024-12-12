const e = require(__dirname + '/../../modules/error_handler.js');
const TABLE_NAME = "property_rent_management_delivery_methods"
const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

module.exports = {
    /**
    * Checks if the delivery method exists for the given property.
    * @param {SQLConnectionObject} connection - The SQL connection instance.
    * @param {number} property_id - The ID of the property.
    * @param {number} method_id - The ID of the delivery method.
    * @returns {boolean} - Returns a boolean that indicating if the delivery method exists for the given property.
    */
    async checkExistance(connection, property_id, method_id) {
        let query = `
            SELECT exists(
                select * 
                FROM ${TABLE_NAME} prmd 
                WHERE prmd.property_id = ${connection.escape(property_id)}
                AND prmd.delivery_method_id = ${method_id}
            ) as exist;`
        return connection.queryAsync(query).then(res => !!res[0]?.exist);
    },

    /**
    * Finds delivery methods for the given property.
    * @param {SQLConnectionObject} connection - The SQL connection instance.
    * @param {number} property_id - The ID of the property.
    * @returns {Array} -Returns the delivery methods which are activated for the given property, or null if no delivery methods are found.
    */
    async findByProperty(connection, property_id) {
        let sql = `
            SELECT 
                prmdm.delivery_method_id, prmdm.subject, 
                prmdm.message, prmdm.active,
                dm.gds_key
            FROM ${TABLE_NAME} AS prmdm
            JOIN
                delivery_methods dm
            ON
                dm.id = prmdm.delivery_method_id
            WHERE 
                active = 1 AND property_id = ${connection.escape(property_id)}`;
        return connection.queryAsync(sql).then(r => r.length ? r : null);
    },

    /**
    * Deactivating the status of delivery methods that meet the given clause.
    * @param {SQLConnectionObject} connection - The SQL connection instance.
    * @param {string} clause - The SQL where clause to be met for disabling delivery methods.
    */
    async disableDeliveryMethodsStatus(connection, clause) {
        let sql = `UPDATE ${TABLE_NAME} SET active = false WHERE ${clause}`;
        return connection.queryAsync(sql);
    },

    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {*} clause under which condition record should update
     * @param {*} data key value pairs on basis of { field: value }
     * @returns resulatant object
     */
    updateDeliveryMethod(connection, clause, data) {
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
    insertDeliveryMethod(connection, data) {
        let queryEssentials = generateInsertQueryPatch(data, Object.keys(data))
        let query = `INSERT INTO ${TABLE_NAME}(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

        return connection.queryAsync(query, queryEssentials.values)
    },
};