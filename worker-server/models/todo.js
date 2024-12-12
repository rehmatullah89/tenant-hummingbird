var moment      = require('moment');

module.exports = {

	findById: function (connection, todo_id) {
		var sql = "SELECT * FROM todos where id =  " + connection.escape(todo_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},

	save(connection, data, todo_id){
		var sql = '';
		if(todo_id){
			sql = "update todos set ?  where id = " + connection.escape(todo_id);
		} else {
			sql = "insert into todos set ?";
		}

		return connection.queryAsync(sql, data).then(r => todo_id ? todo_id : r.insertId);

	},

	findOpen(connection, company_id, contact_id){
		var sql = "Select * from todos where completed = 0 ";


		if(contact_id){
			sql += 'and contact_id = ' + connection.escape(contact_id);
		}

		sql += " and event_id in (select id from events where company_id = " + connection.escape(company_id) + " and start_date <= now())";



		console.log(sql);
		return connection.queryAsync(sql).then(r => {
			console.log(r.length);
			return r;

		});

	},

	findTasksByObjectId(connection, object_id, types, object_type, params={}){
		var sql = `select todo.* from event_objects obj 
					inner join events event on event.id = obj.event_id
					inner join event_types types on event.event_type_id = types.id
					inner join todos todo on event.id = todo.event_id
					where obj.object_type ='${object_type}' and obj.object_id = ${connection.escape(object_id)}  and types.slug in ( "${types.join('", "')}") `;
					
					
		if(params.delinquency_start_date){
			sql += ` and todo.original_date >= ${params.delinquency_start_date} `
		}
	
		if(params.completed_status){
			sql += ` and todo.completed = ${params.completed_status} `
		}else{
			sql += ` and todo.completed = 0 `
		}
	
		if (params.completed_status || params.delinquency_start_date){
			sql += ` order by todo.id desc limit 1 `;
		}
		console.log("findTasksByObjectId: ", sql);
		return connection.queryAsync(sql);
	},

	findOpenDuplicateTasksCount(connection, object_id, event_type_id) {
		let sql = `SELECT Count(*) as count FROM todos t 
					INNER JOIN events e ON t.event_id = e.id AND t.completed = 0
					WHERE t.object_id =  ${connection.escape(object_id)}
					AND e.event_type_id =  ${connection.escape(event_type_id)};`
		console.log('open duplicate task sql=> ', sql);
		
		return connection.queryAsync(sql).then(r=>{
			return r.length > 0 && r[0].count;
		});
	},

	async dismissExpiredReservationsToDos(connection, property_id) {

		let todo_ids_sql = `
		select t.id
		from leases l 
			join units u on u.id = l.unit_id
			join reservations r on r.lease_id = l.id
			join event_objects eo on eo.object_id = l.id
			join events e on e.id = eo.event_id
			join event_types et on et.id = e.event_type_id
			join todos t on t.event_id = eo.event_id
		where 
			r.expires < NOW() and
			eo.object_type = 'lease' and
			et.name = 'New Reservation' and
			u.property_id = ${connection.escape(property_id)} and
			t.completed = 0;`;

		console.log("dismissExpiredReservationsToDos - todo_ids_sql: ", todo_ids_sql);

		let todo_ids_res = await connection.queryAsync(todo_ids_sql);

		if (todo_ids_res?.length === 0)
			return null;

		let todo_ids = todo_ids_res.map(todo_obj => todo_obj.id);

		let update_todo_sql = `update todos set completed = 1 where id in (${todo_ids.map(t_id => connection.escape(t_id)).join(', ')});`;

		console.log("dismissExpiredReservationsToDos - update_todo_sql: ", update_todo_sql);
		return await connection.queryAsync(update_todo_sql);
	}
}