var moment      = require('moment');

module.exports = {

	findById: function (connection, mail_id) {
		var sql = "SELECT * FROM mail where id =  " + connection.escape(mail_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},
	findByTrackingNumber: function (connection, tracking_number) {
		var sql = "SELECT * FROM mail where tracking_number =  " + connection.escape(tracking_number);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},
	save(connection, data, mail_id){
		var sql = '';
		if(mail_id){
			sql = "update mail set ?  where id = " + connection.escape(mail_id);
		} else {
			sql = "insert into mail set ?"; 
		}
		return connection.queryAsync(sql, data).then(r => mail_id ? mail_id : r.insertId);

	}

} 