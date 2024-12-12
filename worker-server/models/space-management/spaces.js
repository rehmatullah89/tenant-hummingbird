module.exports = {
    isSpacesExist: function(connection, params, property_id) {
        const sql = `SELECT id FROM units WHERE number IN (?) AND property_id = ${property_id}`;
        return connection.queryAsync(sql, params).then(result => {
            return result.length > 0;
        });
    },
    findAddressIdx: function(connection, params) {
        const sql = `SELECT address_id FROM properties WHERE id = ?`;
        return connection.queryAsync(sql, params).then(result => {
            return result;
        });
    },
    findProductIdx: function(connection, params) {
        const sql = `SELECT id FROM products WHERE company_id = ? AND default_type = 'rent' AND name = 'Rent'`;
        return connection.queryAsync(sql, params).then(result => {
            return result;
        });
    },
    createSpaces: function(connection, params) {
        const columns = "( number, type, property_id, category_id, address_id, product_id, label, status,created_by )";
        const sql = `INSERT INTO units ${columns} VALUES ?`;
        return connection.queryAsync(sql, [params]).then(result => {
            return result;
        });
    },
    createAmenityUnits: function(connection, params) {
        const columns = "( unit_id, amenity_id, amenity_property_id, value )";
        const sql = `INSERT INTO amenity_units ${columns} VALUES ?`;
        return connection.queryAsync(sql, [params]).then(result => {
            return result;
        });
    },
    findAmenitiesIdx: function(connection, names, type, property_id) {
        const sql = `SELECT id, amenity_id, amenity_name as name FROM amenity_property WHERE amenity_name IN (?) AND property_type = "${type}" AND property_id = ${property_id}`;
        return connection.queryAsync(sql, [names]).then(result => {
            return result;
        });
    },
    findAmenityPropertyIdx: function(connection, amenity_id, property_id) {
        const sql = `SELECT id, amenity_name as name FROM amenity_property where amenity_id = ${amenity_id} AND property_id = ${property_id}`;
        return connection.queryAsync(sql).then(result => {
            return result;
        });
    },
    updateUnitPrices: function(connection, params) {
        const columns = "( unit_id, price, set_rate )";
        const sql = `INSERT INTO unit_price_changes ${columns} VALUES ?`;
        return connection.queryAsync(sql, [params]).then(result => {
            return result;
        });
    }
}