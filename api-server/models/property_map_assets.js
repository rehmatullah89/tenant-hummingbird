const Assets = {
    findPropertyMapAssets(connection, property_id) {
        var sql = `select * from facility_map_assets where property_id = ${connection.escape(property_id)};`
        console.log("QUERY HERE", sql)
        return connection.queryAsync( sql );
    }
}

module.exports = Assets;