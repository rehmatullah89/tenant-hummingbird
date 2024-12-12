const mail = require("../modules/mail")

module.exports = {
    findById: function (connection, mail_id) {
        let sql = `SELECT * FROM mail where id = ${connection.escape(mail_id)}`;
        return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
    },

    findByInteractionId: function (connection, interaction_id) {
        let sql = `SELECT * FROM mail where interaction_id = ${connection.escape(interaction_id)}`;
        return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
    },

    save(connection, data, mail_id){
		var sql = '';
		if(mail_id){
			sql = "update mail set ?  where id = " + connection.escape(mail_id);
		} else {
			sql = "insert into mail set ?"; 
		}
		return connection.queryAsync(sql, data).then(r => mail_id ? mail_id : r.insertId);

	},

    findbyTrackingNumber: function (connection, tracking_number) {
		var sql = "SELECT * FROM mail where tracking_number =  " + connection.escape(tracking_number);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	}

}