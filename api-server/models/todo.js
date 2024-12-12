var moment = require('moment');

module.exports = {

	findById: function (connection, todo_id) {
		var sql = "SELECT * FROM todos where id =  " + connection.escape(todo_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null);
	},

	save(connection, data, todo_id) {
		var sql = '';
		if (todo_id) {
			sql = "update todos set ?  where id = " + connection.escape(todo_id);
		} else {
			sql = "insert into todos set ?";
		}

		return connection.queryAsync(sql, data).then(r => todo_id ? todo_id : r.insertId);

	},

	saveAll(connection, data, todo_ids) {
		if(!todo_ids.length) return;
		var sql = "update todos set ?  where id in (" + todo_ids.map(id => connection.escape(id)).join(',') + ") ";
		console.log("sql", connection.format(sql, data));
		return connection.queryAsync(sql, data);
	},

	findUnitsFromTasks(connection, task_ids){

		var sql = `SELECT * from units where id in (select unit_id from leases where id in (select object_id from event_objects where object_type = 'lease' and event_id in (select event_id from todos where id in (${task_ids.map(eid => connection.escape(eid)).join(',')})))) `; 
		console.log("sql", sql)
		return connection.queryAsync(sql);
	}, 
	findOpen(connection, company_id, contact_id, all, params, properties = []) {

		var sql = `SELECT 		t.*, e.created_at, NULL AS count
						FROM 		todos t
						INNER JOIN	events e ON t.event_id = e.id
						LEFT JOIN	event_objects eo ON e.id = eo.event_id
						WHERE 		e.event_type_id IS NOT NULL
						AND			t.completed = 0
						AND			(e.end_date IS NULL OR e.end_date >= now())
						AND			e.company_id = ${connection.escape(company_id)}`;

		if (contact_id) {
			sql += ` AND (t.contact_id IS NULL OR t.contact_id = ${connection.escape(contact_id)})`;
		}

		if(params.event_type_ids){
			sql += ` AND e.event_type_id IN (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})`;
		} else {
			sql += ` AND e.group_id IS NULL`
		}
		
		if(properties.length){
			sql += ` AND         (eo.id is NULL
					OR			 (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
					OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))
					OR			 (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
								)`;
		}
		
		if(!params.event_type_ids){
			sql += " UNION";

			sql += ` SELECT 		t.*, e.created_at, count(*)
							FROM 		todos t
							INNER JOIN	events e ON t.event_id = e.id
							LEFT JOIN	event_objects eo ON e.id = eo.event_id
							WHERE		e.group_id IS NOT NULL
							AND			e.event_type_id IS NOT NULL
							 AND			t.completed = 0
							AND			(e.end_date IS NULL OR e.end_date >= now())
							AND			e.company_id = ${connection.escape(company_id)}`;

			if (contact_id) {
				sql += ` AND (t.contact_id IS NULL OR t.contact_id = ${connection.escape(contact_id)})`;
			}
			
			if(properties.length){
				sql += ` AND         (eo.id is NULL
						OR			 (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
						OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))
						OR			 (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
									)`;
			}

			sql += " GROUP BY e.group_id";
		}

		sql += ' ORDER BY created_at DESC ';
		if(params && params.limit){
		params.limit = params.limit || 20;
		params.offset = params.offset || 0;
		sql += 'LIMIT ' + params.offset + ', ' + params.limit;
		}
		console.log("sql", sql.replace((/  |\r\n|\n|\r/gm),"")); 
		return connection.queryAsync(sql);;

	},


	findForToday(connection, company_id, contact_id, all, params, properties = []) {


		var sql = `SELECT 		
				t.id, 
				t.contact_id, 
				t.created_by, 
				CASE 
					WHEN t.created_by IS NULL THEN 'System Generated'
					ELSE (SELECT CONCAT(first, ' ', last) FROM contacts WHERE id = t.created_by)
				END AS created_by_contact,
				t.details, 
				(SELECT if( 
						eo.object_type = 'lease', 
						eo.object_id, 
						null
					)
				) as lease_id,
				(SELECT 
					IF(eo.object_type = 'contact',
							eo.object_id,
							NULL)
				) AS follow_up_contact,
						(SELECT 
					IF(eo.object_type = 'rate_change',
							eo.object_id,
							NULL)
				) AS rate_change_id,
				e.created_at, 
				e.start_date,
				1 as sort, 
				e.event_type_id as event_type_id,
				'task' as type, 
				t.completed, 
				t.completed_at
			FROM todos t						
				INNER JOIN	events e ON t.event_id = e.id						
				LEFT JOIN	event_objects eo ON e.id = eo.event_id						
					WHERE 
						e.event_type_id IS NOT NULL AND 
						(e.end_date IS NULL OR e.end_date >= now()) AND 
						e.company_id = ${connection.escape(company_id)} AND 
                        (t.contact_id IS NULL OR t.contact_id = ${connection.escape(contact_id)}) `;
		
		if(params && params.id) {
			sql += ' AND t.id = ' + params.id + ' ';
		}
		if(params && params.is_read !== undefined) {
			sql += ' AND `read` = ' + params.is_read + ' ';
		}

		if(properties.length){				
			sql += ` AND ( eo.id is NULL 
					OR (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))					
					OR (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))					
					OR (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
				) `;
		}
		else{
			sql += ` AND ( eo.id is NULL 
				OR (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id IS NULL  ))					
				OR (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id IS NULL )))					
				OR (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id IS NULL ))
			) `;
		}

		sql += `AND ( completed = 0 or DATE(completed_at) >= CURDATE() )` ;
		
		sql += `HAVING 1 = 1 `
		if (contact_id) {
			sql += ` AND (contact_id IS NULL OR contact_id = ${connection.escape(contact_id)})`;
		}

		if(params.event_type_ids){
			sql += `  AND event_type_id IN (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})`;
		} 




		sql += `UNION 
			SELECT 
				l.id, 
				null as contact_id, 
				l.created_by, 
				CASE 
					WHEN l.created_by IS NULL THEN 'System Generated'
					ELSE (SELECT CONCAT(first, ' ', last) FROM contacts WHERE id = l.created_by)
				END AS created_by_contact,
				null, 
				l.id,
				NULL,
				NULL, 
				l.created,
				NULL, 
				0, 
				( SELECT IF(
					((SELECT id from transfers where to_lease_id = l.id) is not null), 
					(select id from event_types where slug = 'pending_transfer'),
					(select id from event_types where slug = 'pending_move_in')
					)
				) as event_type_id,
				'pending', 
				0, 
				null
			FROM 
				leases l where status = 2 `;

		if(properties.length){
			sql += ` and unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(", ")})) ` 
		}
		else{
			sql += ` and unit_id in (select id from units where property_id IS NULL) ` 
		}

		sql +=   ` and unit_id in (select id from units where property_id in ( select id from properties where company_id = ${connection.escape(company_id)} )) `

		sql += `HAVING 1 = 1 `

		if (contact_id) {
			sql += ` AND (contact_id IS NULL OR contact_id = ${connection.escape(contact_id)})`;
		}

		if(params.event_type_ids){
			sql += `  AND event_type_id IN (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})`;
		} 


		sql += ` ORDER BY completed ASC, created_at DESC `;

		if(params && params.limit){
			params.limit = params.limit || 20;
			params.offset = params.offset || 0;
			sql += ' LIMIT ' + params.offset + ', ' + params.limit;
		} 

		console.log("sql", sql.replace((/  |\r\n|\n|\r/gm),"")); 
		return connection.queryAsync(sql);;

	},


  findByGroup(connection, company_id, contact_id, params, properties = []) {

		var sql = `Select 		t.*
					FROM 		todos t
					INNER JOIN 	events e ON t.event_id = e.id
					LEFT JOIN	event_objects eo ON e.id = eo.event_id
					WHERE 		e.event_type_id IS NOT NULL 
					AND 		t.completed = 0
					AND			(e.end_date IS NULL OR e.end_date >= now())
					AND			e.company_id = ${connection.escape(company_id)}`;

		if (contact_id) {
			sql += ` AND (t.contact_id is null OR t.contact_id = ${connection.escape(contact_id)})`;
		}

		if(params.group_id){
			sql += ` AND e.group_id = ${connection.escape(params.group_id)}`;
		}

		if(properties.length){
			sql += ` AND         (eo.id is NULL
				 	 OR			 (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
					 OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))
					 OR			 (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
								 )`;
		}

		sql += ' ORDER BY e.created_at DESC ';
		if(params){
			params.limit = params.limit || 20;
			params.offset = params.offset || 0;
			sql += 'LIMIT ' + params.offset + ', ' + params.limit;
		}

		return connection.queryAsync(sql);;

	},

	findCount(connection, company_id, contact_id, params, properties = []) {

        // for getting the total count of the pending move in and transfers from lease table which will be added below in the total tasks count. 
		var pending_move_in_and_transfer_sql = ` SELECT total_leases FROM (SELECT ( SELECT IF(
			((SELECT id from transfers where to_lease_id = l.id) is not null), 
			(select id from event_types where slug = 'pending_transfer'),
					(select id from event_types where slug = 'pending_move_in')
					)
				) as event_type_id, 
				( SELECT IF(
					((SELECT id from transfers where to_lease_id = l.id) is not null), 
					'pending_transfer',
					'pending_move_in'
					)
				) as name, 
				count(*) as total_leases
		    FROM leases l where status = 2 `

		if(properties.length){
			pending_move_in_and_transfer_sql += ` and unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(", ")})) ` 
		}
		else{
			pending_move_in_and_transfer_sql += ` and unit_id in (select id from units where property_id IS NULL) ` 
		}

		pending_move_in_and_transfer_sql +=   ` and unit_id in (select id from units where property_id in ( select id from properties where company_id = ${connection.escape(company_id)} )) `
		pending_move_in_and_transfer_sql += ` HAVING event_type_id in (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})) as x `;

		var sql = `SELECT 		NULL AS id, 'all' AS name, count(*) + IFNULL((`+pending_move_in_and_transfer_sql+`),0) AS count
					FROM 		todos t
					INNER JOIN 	events e ON t.event_id = e.id
					LEFT JOIN	event_objects eo ON e.id = eo.event_id
					WHERE 		e.event_type_id IS NOT NULL 
					AND 		t.completed = 0
					AND			(e.end_date IS NULL OR e.end_date >= now())
					AND			e.company_id = ${connection.escape(company_id)}`;

		if (contact_id) {
			sql += ` AND (t.contact_id IS NULL OR t.contact_id = ${connection.escape(contact_id)})`;
		}

		if(properties.length){
			sql += ` AND         (eo.id is NULL
				 	 OR			 (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
					 OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))
					 OR			 (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
								 )`;
		}
		else{
			sql += ` AND        (eo.id is NULL
					OR			(eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id is NULL ))
		 		    OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id is NULL )))
			   		OR			(eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id is NULL ))
						   )`;
		}

		if(params.event_type_ids){
			sql += " UNION";
			sql += ` SELECT 	e.event_type_id, (select slug from event_types where id = e.event_type_id), count(*)
					FROM		todos t
					INNER JOIN	events e ON t.event_id = e.id
					LEFT JOIN	event_objects eo ON e.id = eo.event_id
					WHERE		e.event_type_id IS NOT NULL
					AND 		t.completed = 0
					AND			(e.end_date IS NULL OR e.end_date >= now())
					AND			e.company_id = ${connection.escape(company_id)}
					AND			e.event_type_id in (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})`;

			if (contact_id) { 
				sql += ` AND (t.contact_id is null OR t.contact_id = ${connection.escape(contact_id)})`;
			}

			if(properties.length){
				sql += ` AND         (eo.id is NULL
				 		 OR			 (eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
						 OR          (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))))
						 OR			 (eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
									 )`;
			}
			else{
				sql += ` AND        (eo.id is NULL
						 OR			(eo.object_type = 'contact' AND eo.object_id in (select contact_id from leads where property_id is NULL ))
						 OR         (eo.object_type = 'lease' AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id is NULL )))
						 OR			(eo.object_type = 'rate_change' AND eo.object_id in (select id from rate_changes where property_id is NULL ))
							   )`;
			}
	
			// sql += ` HAVING e.event_type_id in (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')})`;
			sql += ` group by event_type_id`;
			
			// pending move ins and transfers
			sql += " UNION";
			sql += ` SELECT 	( SELECT IF(
									((SELECT id from transfers where to_lease_id = l.id) is not null), 
									(select id from event_types where slug = 'pending_transfer'),
									(select id from event_types where slug = 'pending_move_in')
									)
								) as event_type_id, 
								( SELECT IF(
									((SELECT id from transfers where to_lease_id = l.id) is not null), 
									'pending_transfer',
									'pending_move_in'
									)
								) as name, 
								count(*)
					FROM		leases l where status = 2 `

			
			if(properties.length){
				sql += ` and unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(", ")})) ` 
			}
			else{
				sql += ` and unit_id in (select id from units where property_id IS NULL) ` 
			}

		

			sql +=   ` and unit_id in (select id from units where property_id in ( select id from properties where company_id = ${connection.escape(company_id)} )) `

			sql += ` group by event_type_id`
			
			sql += ` HAVING event_type_id in (${params.event_type_ids.map(eid => connection.escape(eid)).join(',')}) `;
			
		}
		console.log("sql", sql.replace((/  |\r\n|\n|\r/gm)," ")); 
		return connection.queryAsync(sql);

	},

	findByContactId(connection, contact_id, company_id, params, properties){

		var sql = `select t.*, e.created_at, e.event_type_id, NULL AS count from todos t
		inner join events e on e.id = t.event_id
		inner join event_objects eo on eo.event_id = e.id
		left join contact_leases cl on cl.lease_id = eo.object_id and eo.object_type = 'lease'`
		
		if(properties.length){
			sql += ` AND eo.object_id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))`
		}

		sql += `where (cl.contact_id = ${connection.escape(params.contact_id)} 
		or (eo.object_id = ${connection.escape(params.contact_id)} and eo.object_type = 'contact')) 
		and t.completed = 0 and	e.company_id = ${connection.escape(company_id)}` 

		if (contact_id) {
			sql += ` AND (t.contact_id IS NULL OR t.contact_id = ${connection.escape(contact_id)})`;
		}

		if(params.limit || params.offset){
			params.limit = params.limit || 20;
			params.offset = params.offset || 0;
			sql += ' LIMIT ' + params.offset + ', ' + params.limit;
		  }

		return connection.queryAsync(sql);
	},

	findTasksByEventType(connection, event_types, contact_id, company_id){
		var sql = 'SELECT * from todos where completed = 0 ';

		if (contact_id) {
			sql += 'and (contact_id is null || contact_id = ' + connection.escape(contact_id) + ')';
		}
    		sql += " and event_id in (select id from events where event_type_id in (select id from event_types where slug in ( " +  event_types.map(e => connection.escape(e)).join(", ") + ")) and company_id = " + connection.escape(company_id);

		sql += ') order by original_date ASC';
		console.log("sql", sql)
		return connection.queryAsync(sql);
	}, 

  findAllOpen(connection, company_id, contact_id, all) {
    var sql = 'SELECT * from todos where completed = 0 ';

    if (contact_id) {
      sql += 'and (contact_id is null || contact_id = ' + connection.escape(contact_id) + ')';
    }
    sql += " and event_id in (select id from events where company_id = " + connection.escape(company_id);

    if(!all) {
      sql += " and start_date <= now() "
    }
    sql += ') order by original_date ASC';
	console.log("sql", sql)
    return connection.queryAsync(sql);

  },

  findTasksByObjectId(connection, object_id, types, object_type, company_id = null, params={}){
	var sql = `select todo.* from event_objects obj 
	inner join events event on event.id = obj.event_id
	inner join event_types types on event.event_type_id = types.id
	inner join todos todo on event.id = todo.event_id
	where obj.object_type ='${object_type}' and obj.object_id = ${connection.escape(object_id)}
	and types.slug in ( "${types.join('", "')}") `

	if(company_id) {
		sql += ` and event.company_id = ${connection.escape(company_id)} `
	}

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

}


/*
let sql = "select" +
      " id, company_id, group_id, created_by, start_date, duration, is_all_day, type, " +
      " (select COUNT(id) from todos where event_id = events.id and (todos.contact_id is null or todos.contact_id = " + connection.escape(contact_id) + " )  ) as count " +
      " FROM events WHERE group_id is null " +
      "AND company_id = " + connection.escape(company_id)  + " " +
      "AND  id in ( select event_id from todos where contact_id is null or contact_id = " + connection.escape(contact_id) + ") " +
      " UNION " +
      " select ANY_VALUE(id) id, company_id, group_id, ANY_VALUE(created_by) created_by, ANY_VALUE(start_date) start_date, ANY_VALUE(duration) duration, ANY_VALUE(is_all_day) is_all_day, ANY_VALUE(type) type, " +
      " (select COUNT(id) from todos where event_id in (select id from events WHERE group_id = group_id) and (todos.contact_id is null or todos.contact_id = " + connection.escape(contact_id) + " )  ) as count " +
      " FROM events where group_id is not null and company_id = " + connection.escape(company_id)  + " group by group_id order by start_date asc;";

 */
