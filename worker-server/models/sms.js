
module.exports = {
    findById(connection, id) {
        let sql = `SELECT * FROM sms where id = ${connection.escape(id)}`
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    findByInteraction(connection, interaction_id) {
        let sql = `SELECT * FROM sms where interaction_id = ${connection.escape(interaction_id)}`
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    save(connection, data, sms_id) {
        let sql = ``;
        if (sms_id) {
            sql = `UPDATE sms set ? where id = ${connection.escape(sms_id)}`;
        } else {
            sql = `insert into sms set ? `;
        }

        return connection.queryAsync(sql, data).catch(err => {
			console.log(err);
			throw err;
		}).then(r => sms_id ? sms_id : r.insertId)
    },

    findByInteractionId: async function (connection, interaction_id) {
		var sql = "SELECT * FROM sms where interaction_id =  " + connection.escape(interaction_id);
		return await connection.queryAsync(sql).then(r => r.length ? r[0] : null);
	},


}