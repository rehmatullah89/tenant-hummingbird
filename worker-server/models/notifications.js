var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

	findByContactId: function(connection, company_id, contact_id, searchParams){
		searchParams = searchParams || {offset:0,limit:25};
		var sql = "Select * from notifications where  company_id = " + connection.escape(company_id)  +
				" and contact_id = " + connection.escape(contact_id)  +
			" and (`status` = 0 or created >= DATE_SUB( UTC_TIMESTAMP(), INTERVAL 7 DAY)) " +
			" order by `status` ASC, `id` DESC ";
		sql += " limit ";
		sql += searchParams.offset;
		sql += ", ";
		sql += searchParams.limit;

		return connection.queryAsync(sql);

	},

	findById: function(connection, notification_id){
		var sql = "Select * from notifications where  id = " + connection.escape(notification_id);
		return connection.queryAsync(sql).then(function(qryRes){
			return qryRes[0] || null;
		});
	},


	findTypeById: function(connection, notification_type_id){
		var sql = "Select * from notification_types where id = " + connection.escape(notification_type_id);
		return connection.queryAsync(sql).then(function(qryRes){
			return qryRes[0] || null;
		});
	},


	markAllRead(connection, contact_id, company_id){
		var sql = "UPDATE notifications set status = 1 where company_id = " + connection.escape(company_id) + ' and contact_id = ' + connection.escape(contact_id);
		return connection.queryAsync(sql);

	},

	save: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE notifications set ? where id = " + connection.escape(id);
		} else {
			sql = "INSERT into notifications set ?";
		}
		return connection.queryAsync(sql, data);
	},


	delete: function(connection, id){

		var sql = "delete from  notifications where id = " + connection.escape(id);

		return connection.queryAsync(sql);

	},
	

};