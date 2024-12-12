module.exports = {
    addAmenityToProperty: function(connection, property_amenities) {
        const columns = "( amenity_id, property_id, amenity_name, amenity_category_id, amenity_options, default_value, sort_order, property_type, field_type )";
        const sql = `INSERT INTO amenity_property ${columns} VALUES ?`;
        return connection.queryAsync(sql, [property_amenities]).then(result => {
            return result;
        }); 
    },
    getPropertyUnits: function(connection, property_id, type) {
        const sql = `SELECT id FROM units WHERE property_id = ${property_id} AND type = '${type}' AND deleted is null`;
        return connection.queryAsync(sql).then(result => {
            return result;
        }); 
    },
    addAmenityToUnits: function(connection, amenity_units) {
        const columns = "( amenity_property_id, unit_id, value, amenity_id )"
        const sql = `INSERT INTO amenity_units ${columns} VALUES ?`;
        return connection.queryAsync(sql, [amenity_units]).then(result => {
            return result;
        });
    },
    updatePropertyAmenities: function(connection, property_amenities) {   
        let queries = "";
        property_amenities.forEach(function (amenity) {
            const str = `UPDATE amenity_property SET ? WHERE id = ${connection.escape(amenity.id)};`
            queries += connection.format(str, amenity);
        });
        return connection.queryAsync(queries).then(result => {
            return result;
        });
    },
    deletePropertyAmenities: function(connection, user, property_amenities) {  
        const sql = `UPDATE amenity_property SET sort_order = null, deleted_by = ${connection.escape(user)}, deleted_at = now() WHERE id IN (?)`;
        return connection.queryAsync(sql, [property_amenities]).then(result => {
            return result;
        });
    },
    deleteAmenityFromUnits: function(connection, amenity_property_id, unit_ids) {
        const sql = `DELETE FROM amenity_units WHERE amenity_property_id = ${connection.escape(amenity_property_id)} AND unit_id IN (?)`;
        return connection.queryAsync(sql, [unit_ids]).then(result => {
            return result;
        });
    },
    createPropertyAmenities: function(connection, amenity){
        const sql = "Insert into amenities set ?";
        return connection.queryAsync(sql, amenity).then(result => {
            return result;
        });
    },
    getPropertyAmenities: function(connection, property_amenities) {   
        const sql = `SELECT id, amenity_name as name, amenity_id, property_id, property_type FROM amenity_property WHERE id in (${connection.escape(property_amenities.map(x => connection.escape(x.id)).join(','))} )`;
        return connection.queryAsync(sql).then(result => {
            return result;
        }); 
    },
    findAmenityPropertyIds: function(connection, amenityIds, propertyIds) {
        const sql = `SELECT id FROM amenity_property WHERE property_id IN (${connection.escape(propertyIds)}) AND amenity_id IN (${connection.escape(amenityIds)})`;
        return connection.queryAsync(sql).then(results => results.length ? results.map(r => r.id): [] );
    },
    deleteUnitGroupProfileAmenities: function(connection, amenityPropertyIds) {
        const sql = `DELETE FROM unit_group_profile_settings_amenities WHERE amenity_property_id IN (${connection.escape(amenityPropertyIds)})`;
        return connection.queryAsync(sql).then(result => {
            return result;
        });
    },
}
