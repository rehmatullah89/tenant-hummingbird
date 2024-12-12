const Asset = {
    
    findById (connection, id, property_id) {
        var sql = `SELECT * from facility_map_assets where id = ${connection.escape(id)} and property_id = ${connection.escape(property_id)}`
        return connection.queryAsync( sql ).then(r => r.length ? r[0]: null );
    },

    save (connection, data, asset_id) {
        if(asset_id){
            sql = "UPDATE facility_map_assets set ? where id = " + connection.escape(asset_id);
        } else {
            sql = "insert into facility_map_assets set ?";
        }
        console.log("SQL", sql)
        console.log("SQL data", data)

        return connection.queryAsync(sql, data);
    },

    bulkUpdateSave(connection, payload) {
        const { data } = payload;	 
        const sql = `INSERT INTO facility_map_assets (id, property_id, floor, asset, x, y, rotate, width, height, length) VALUES ? ON DUPLICATE KEY UPDATE property_id=VALUES(property_id), floor=VALUES(floor), asset=VALUES(asset), x=VALUES(x), y=VALUES(y), rotate=VALUES(rotate), width=VALUES(width), height=VALUES(height), length=VALUES(length)`;
        return connection.queryAsync(sql, [data]);
    },

    bulkRemove(connection, payload) {
        const { data } = payload;
        const sql = `delete from facility_map_assets where id in (${data.map(item => connection.escape(item.id))})`;
        return connection.queryAsync(sql, data);
    },
}

module.exports = Asset;