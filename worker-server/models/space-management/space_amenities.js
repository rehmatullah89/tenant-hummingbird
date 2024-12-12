module.exports = {
    deleteSpaceAmenities: function(connection, unitList, unit_amenities) {
        const sql = `DELETE FROM amenity_units WHERE unit_id IN (${connection.escape(unitList)}) AND amenity_property_id IN (${connection.escape(unit_amenities)})`;
        return connection.queryAsync(sql).then(result => {
            return result;
        });
    },
    updateSpaceAmenities: function(connection, unit_amenities){
        const columns = "( amenity_id, amenity_property_id, value, unit_id )"
        const sql = `INSERT INTO amenity_units ${columns} VALUES ?`;    
        return connection.queryAsync(sql, [unit_amenities]).then(result => {
            return result;
        }); 
    },
    findSpaceAmenities: function(connection, unitList, unit_amenities) {
        const sql = `SELECT amenity_id, amenity_property_id, value, unit_id FROM amenity_units WHERE unit_id IN (${connection.escape(unitList)}) AND amenity_property_id IN (${connection.escape(unit_amenities)})`;
        return connection.queryAsync(sql).then(result => {
            return result;
        });
    }
}
