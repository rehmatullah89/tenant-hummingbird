module.exports = {
    findById(connection, id) {
        let sql = `SELECT * from delivery_methods where id = ${connection.escape(id)}`;
        
        return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
    },

    findByGdsKey(connection, gds_key) {
        let sql = `SELECT * from delivery_methods where gds_key = ${connection.escape(gds_key)}`;
        
        return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
    }
}