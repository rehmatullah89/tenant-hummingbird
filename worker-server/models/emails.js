var moment      = require('moment');

module.exports = {

	findById: function (connection, event_id) {
		var sql = "SELECT * FROM emails where id =  " + connection.escape(event_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},
	findByContactId: function (connection, contact_id, date) {
		var sql = "SELECT * FROM emails where contact_id =  " + connection.escape(contact_id) +" and DATE(sent) = "  + connection.escape(date);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},
	findByReferenceId: function (connection, refid) {
		var sql = "SELECT * FROM emails where refid =  " + connection.escape(refid);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},

	save(connection, data, email_id){
		var sql = '';
		if(email_id){
			sql = "update emails set ?  where id = " + connection.escape(email_id);
		} else {
			sql = "insert into emails set ?";
		}
		return connection.queryAsync(sql, data).then(r => email_id ? email_id : r.insertId);

	}

}