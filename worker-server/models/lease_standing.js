module.exports = {
    save: async(connection, data, lease_standing_id) => {
        var sql;
        if(lease_standing_id){
            sql = "UPDATE lease_standings set ? where id = " + connection.escape(lease_standing_id);
        } else {
            sql = "insert into lease_standings set ?";
        }
        return connection.queryAsync(sql, data).then(r => lease_standing_id ? lease_standing_id : r.insertId);
    },
    findAll: async(connection) => {
        let sql = "SELECT * from lease_standings order by sort asc, id asc";
        return connection.queryAsync( sql );
    },
    findById: async(connection, id) => {
        let sql = "SELECT * from lease_standings where id = " + connection.escape(id) + ' order by sort asc, id asc ';
        console.log("LEASE STANDING SQL", sql);
        return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    },
    findByName: async(connection, name) => {
        let sql = "SELECT * from lease_standings where  name = " + connection.escape(name) + ' order by sort asc, id asc ';
        return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    }
}