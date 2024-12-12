const StoredContents = {

    /* Create a new stored content. */
    create(connection, data) {
        let sql = "INSERT INTO stored_contents set ? ";
        return connection.queryAsync(sql, data);
    },
    /* Delete stored content with the given id. */
    delete(connection, id){
        let sql = "UPDATE stored_contents SET active = 0 WHERE id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },
    /* Returns all the stored contents. */
    findAll(connection, status) {
        let statusItems = {
            all: "",
            active: "1",
            inactive: "0"
        }
        let storedContentStatus = statusItems?.[status] ?? "";
        let sql = `SELECT id, name, note, active FROM stored_contents`;  
        if (storedContentStatus) {
            sql += ` WHERE active = ${connection.escape(storedContentStatus)}`
        }
        return connection.queryAsync(sql);
    },
    /* A function that is used to find a stored content by their id. */
    findById:function(connection, id){
        let sql = "SELECT * FROM stored_contents WHERE id  = " +  connection.escape(id);
        return connection.queryAsync(sql).then(function(res){
            return res[0] || null;
        });
    },
    /* Update stored content with the given id. */
    update(connection, data, id){
        let sql = "UPDATE stored_contents set ? WHERE id = " + connection.escape(id);
        return connection.queryAsync(sql, data);
    }
}
module.exports = StoredContents;