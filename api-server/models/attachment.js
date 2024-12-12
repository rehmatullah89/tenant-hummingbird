

module.exports =  {
    save: async (connection, data) => {
        let sql = `INSERT INTO attachments set ? `;
        let response = await connection.queryAsync(sql, data).then(response => response.insertId);
        return response;
    },

    findById(connection, id) {
        let sql =  `SELECT * from attachments where id = ${connection.escape(id)}`;
        return connection.queryAsync(sql).then(r =>  r.length? r: null);
    }
}
