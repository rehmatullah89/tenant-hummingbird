const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

const TABLE_NAME = "property_amenity_score_configuration"
var ENUMS = require(__dirname + '/../../modules/enums.js');

module.exports = {

    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Number} property_id Id of the property
     * @returns {Array} List of the space score data
     */
    getSpaceScoreDataByType(connection, property_id, space_type) {
        let query = `SELECT ams.id as space_score_id, ams.amenity_property_id, ams.value, ams.property_id, ams.sort_order, ams.show_in_website, ap.amenity_name, ap.property_type, ap.deleted_at, ap.deleted_by 
        FROM ${TABLE_NAME} AS ams JOIN amenity_property AS ap ON ams.amenity_property_id = ap.id WHERE ap.property_id = ${property_id} AND ap.property_type = '${space_type}' ORDER BY ams.sort_order`
        return connection.queryAsync(query).then((res) => res.length ? res : [])
    },

    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Number} property_id Id of the property
     * @returns {Boolean}
     */
    checkExistance(connection, property_id, type ) {
        let clause = `ams.property_id = ${property_id} AND ams.amenity_property_id = ap.id AND ap.property_type = '${type}'`
        let query = `SELECT EXISTS(SELECT * FROM ${TABLE_NAME} AS ams JOIN amenity_property AS ap WHERE ${clause}) AS exist`

        return connection.queryAsync(query).then((res) => (res?.length ? !!res[0]?.exist : false))
    },
    
    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {String} clause SQL WHERE condition clause
     */
    updateSpaceScore(connection, clause, data) {
        let builder = generateUpdateQueryPatch(data)
        
        if (!(builder && clause)) return
        
        let query = `UPDATE ${TABLE_NAME} SET ${builder} WHERE ${clause}`
        return connection.queryAsync(query, Object.values(data))
    },

    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Object} data new space score data to be inserted
    */
    saveSpaceScoreBulk(connection, data) {
        let query = `INSERT INTO ${TABLE_NAME} (id, property_id, amenity_property_id, value, sort_order, show_in_website) VALUES ? ON DUPLICATE KEY UPDATE 
        property_id=VALUES(property_id), amenity_property_id=VALUES(amenity_property_id), value= VALUES(value), sort_order = VALUES(sort_order), 
        show_in_website = VALUES(show_in_website);`
        return connection.queryAsync(query, [data])
    },

    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Number} property_id Id of the property
     * @param {Number} space_type Type of the property
     * @returns {Array} List of the space score data
     */
    getAllSpaceScoreDataByType(connection, property_id, space_type) {
        let query = `
        SELECT ams.id as space_score_id, ams.amenity_property_id, ams.value, ams.property_id, ams.sort_order, ams.show_in_website, ap.id, ap.amenity_name, ap.field_type, 
        ap.amenity_category_id, ap.property_type, ap.amenity_options  
        FROM amenity_property AS ap 
        JOIN amenities AS am ON ap.amenity_id = am.id
        LEFT JOIN property_amenity_score_configuration AS ams ON ams.amenity_property_id = ap.id
        WHERE ap.property_id = ${property_id}
        AND ap.property_type = '${space_type}'
        AND ap.deleted_by IS NULL AND ap.deleted_at IS NULL
        AND ap.amenity_category_id <> ${ENUMS.AMENITY_CATEGORY.SPACE_INFORMATION}
        AND am.status = 1
        ORDER BY 
        ISNULL(ams.sort_order),
        ams.sort_order,
        ap.amenity_name
        `
        return connection.queryAsync(query)
    },

    /**
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Array} space_score_ids List of Space Score Ids
     */
    deleteSpaceScoreDataByIds(connection, space_score_ids) {
        const sql = `DELETE from ${TABLE_NAME} where id in (${space_score_ids})`;
        return connection.queryAsync(sql);
    },



}