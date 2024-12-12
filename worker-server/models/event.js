var moment      = require('moment');

module.exports = {

	findById: function (connection, event_id) {
		var sql = "SELECT * FROM events where id =  " + connection.escape(event_id);
		// console.log(sql);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},


	findLeaseEvent: function (connection, event_id) {
		var sql = "SELECT * FROM event_leases where event_id =  " + connection.escape(event_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},

	save(connection, data, event_id){
		var sql = '';
		if(event_id){
			sql = "update events set ?  where id = " + connection.escape(event_id);
		} else {
			sql = "insert into events set ?";
		}
		return connection.queryAsync(sql, data).then(r => event_id ? event_id : r.insertId);
	},

	saveEventObject(connection, data, object_event_id){
		var sql = '';
		if(object_event_id){
		  sql = "update event_objects set ?  where id = " + connection.escape(object_event_id);
		} else {
		  sql = "insert into event_objects set ?";
		}
		return connection.queryAsync(sql, data).then(r => object_event_id ? object_event_id : r.insertId);
	},

	saveLeaseEvent(connection, data, lease_event_id){
		var sql = '';
		if(lease_event_id){
			sql = "update event_leases set ?  where id = " + connection.escape(lease_event_id);
		} else {
			sql = "insert into event_leases set ?";
		}
		return connection.queryAsync(sql, data).then(r => lease_event_id ? lease_event_id : r.insertId);
	},

	saveContactEvent(connection, data, contact_event_id){
		var sql = '';
		if(contact_event_id){
			sql = "update event_contacts set ?  where id = " + connection.escape(contact_event_id);
		} else {
			sql = "insert into event_contacts set ?";
		}
		return connection.queryAsync(sql, data).then(r => contact_event_id ? contact_event_id : r.insertId);
	},


	findOpenTodos(connection){
		var sql = "Select * from events where id in (select event_id from todos where completed = 0)";
		return connection.queryAsync(sql);

	},

	findEventsByCompanyId(connection, conditions, searchParams){
		var sql = "Select type, start_date, count(id) as count from events where company_id =  " + connection.escape(conditions.company_id) + " and type != 'todo' group by type, start_date order by start_date desc";

		return connection.queryAsync(sql);
	},

	findEventsByType(connection, company_id, type, date){
		var sql = "Select * from events where company_id =  " + connection.escape(company_id) + " and type = "  + connection.escape(type) +  " and DATE(start_date) = "  + connection.escape(date);

		return connection.queryAsync(sql);
	},

	findEventsByGroupId(connection, company_id, group_id){
		var sql = "Select * from events where company_id =  " + connection.escape(company_id) + " and group_id = "  + connection.escape(group_id);
		return connection.queryAsync(sql);
	},


	// findEventsByGroupId(connection, company_id, event_ids){
	// 	var sql = "Select * from events where company_id =  " + connection.escape(company_id) + " and id in = "  + connection.escape(event_ids.join(','));
	// 	console.log(sql);
	// 	return connection.queryAsync(sql);
	// },

	findGroupTodoCount(connection, group_id){
		var sql = "Select count(id) as count from todos where event_id in (select id from events where group_id =  " + connection.escape(group_id) + ")";
		return connection.queryAsync(sql);
	},

	findEventUploadCount(connection, group_id){
		var sql = "Select count(upload_id) as count from events where group_id =  " + connection.escape(group_id);
		console.log("ddddd", sql);

		return connection.queryAsync(sql);
	},

	findEventTypesByCompanyId(connection,company_id){
		var sql = "Select * from event_types where company_id =  " + connection.escape(company_id);
		return connection.queryAsync(sql);
	},

	findEventTypes(connection){
		var sql = "Select * from event_types";
		return connection.queryAsync(sql);
	},

	findEventTypeById(connection, event_type_id){
		var sql = "Select * from event_types where id =  " + connection.escape(event_type_id);
		console.log("sql", sql);
		return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
	},

	async findEventType(connection, event_id, event_type_name){

		var sql = `SELECT * from event_types`;
		sql += event_id? ` where id = ${connection.escape(event_id)}`: ` where LOWER(slug) = ${connection.escape(event_type_name.toLowerCase())}`;
		var event_types = await connection.queryAsync(sql);
		return event_types.length > 0? event_types[0]: null;
	}


}