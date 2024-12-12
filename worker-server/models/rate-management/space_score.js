const TABLE_NAME = "property_amenity_score_configuration"


module.exports = {
    fetchNewAmenities(connection, id, property_id) {
        let query = `SELECT * FROM amenity_property WHERE id = ${id} AND property_id = ${property_id}`
        return connection.queryAsync(query).then((res) => res.length ? res : [])
    },

    getSpaceScoreData(connection, property_id) {
        let query = `SELECT ams.*, ap.amenity_name, ap.property_type FROM ${TABLE_NAME} AS ams JOIN amenity_property AS ap ON ams.amenity_property_id = ap.id WHERE ap.property_id = ${property_id} ORDER BY ams.sort_order`
        return connection.queryAsync(query).then((res) => res.length ? res : [])
    },

    insertSpaceScoreData(connection, data) {
        let query = `INSERT INTO ${TABLE_NAME} (amenity_property_id, value, property_id, sort_order, show_in_website) VALUES ?`;
        return connection.queryAsync(query, [data])
    },

    updateSpaceScoreData(connection, data) {
        let queries = "";
        data?.forEach((amenity) => {
            const str = `UPDATE ${TABLE_NAME} SET ? WHERE id = ${connection.escape(amenity.id)};`
            queries += connection.format(str, amenity)
        })
        return connection.queryAsync(queries).then(result => {
            return result;
        });
    },

    deleteSpaceScoreData(connection, property_id, spaceScoreIds) {
        let query = `DELETE FROM ${TABLE_NAME} WHERE property_id = ${property_id} AND id IN (?)`;
        return connection.queryAsync(query, [spaceScoreIds])
    },

    getAmenityPropertyType(connection, id) {
        let query = `SELECT property_type FROM amenity_property WHERE id = ${id}`
        return connection.queryAsync(query).then((res) => res.length ? res[0] : '')
    }
}