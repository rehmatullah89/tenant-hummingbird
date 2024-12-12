const { escape, makeWhereFilter } = require("../helpers/sql");


module.exports = {

    async get(connection, filter) {
        escape(connection, filter);
        let {interaction_status_id, interaction_id, status} = filter
        let sql = `SELECT * FROM interaction_status_history WHERE ${makeWhereFilter({
            id: interaction_status_id, interaction_id, status
        })}`;

        sql += `ORDER BY last_modified desc`;

        const result = await connection.queryAsync(sql, data);
        return result;
    },

    async save(connection, data, interaction_status_id) {
        let sql;
        if (interaction_status_id) {
          sql = "UPDATE interaction_status_history set ? where id = " + connection.escape(interaction_id);
        } else {
          sql = "insert into interaction_status_history set ?";
        }
        const result = await connection.queryAsync(sql, data);
    
        return interaction_status_id ? interaction_status_id : result.insertId;
      },
}