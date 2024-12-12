var moment      = require('moment');

module.exports = {

	save: function(connection, data, activity_id){

		var sql;

		if(activity_id){
			sql = "UPDATE activity set ? where id = " + connection.escape(activity_id);
		} else {
			sql = "insert into activity set ?";
		}

		return connection.queryAsync(sql, data).then(result => activity_id ? activity_id: result.insertId)

	},

	findAdminActivity(connection, conditions, searchParams, count){

		var sql;

		if(count){
			sql = "SELECT count(*) as count ";
		} else {
			sql = "SELECT * , UTC_TIMESTAMP ";
		}


		sql += " From activity where 1 = 1 and company_id = " + connection.escape(conditions.company_id) + " and contact_id  = " + connection.escape(conditions.contact_id)+ " order by created desc ";

		if(searchParams){
			sql += " limit ";
			sql += searchParams.offset;
			sql += ", ";
			sql += searchParams.limit;
		}
		console.log(sql);

		return connection.queryAsync(sql);

	},

	findActivityObject(connection, activity_object_id){

		var sql = "SELECT * from activity_objects where id = " + connection.escape(activity_object_id);
		return connection.queryAsync(sql).then(r => r.length ? r[0] : null);

	},

	findActivityAction(connection, activity_action_id){

		var sql = "SELECT * from activity_actions where id = " + connection.escape(activity_action_id);
		return connection.queryAsync(sql).then(r => r.length ? r[0] : null);

	},


	findAll: function(connection, company_id, date){

		var sql = "Select * from activity where company_id =  " + connection.escape(company_id) + "  and DATE(created) = " +  connection.escape(date);

		return connection.queryAsync(sql);
	},

	findActivityTypeById: function(connection, activity_type_id){

		var sql = "Select * from activity_types where id =  " + connection.escape(activity_type_id);

		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
	},

	findActivityTypesByCategory: function(connection, name){

		var sql = "Select * from activity_types where activity_type_category_id = (select id from activity_type_categories where lower(name) =  " + connection.escape(name.toLowerCase()) + ")";

		return connection.queryAsync(sql);
	},

	findByLeaseId:function(connection, lease_id){

		var sql = "SELECT *, " +
			"(select label from activity_types where id = activity.activity_types_id ) as label, " +
			"(select description from activity_types where id = activity.activity_types_id ) as description, " +
			"(select admin from activity_types where id = activity.activity_types_id ) as admin, " +
			"(select color from activity_types where id = activity.activity_types_id ) as color, " +
			"(select name from activity_types where id = activity.activity_types_id ) as name " +
			" from activity where lease_id = " + connection.escape(lease_id) + ' order by created desc';

		return connection.queryAsync(sql);
	},

	findById:function(connection, activity_id){

		var sql = "Select * from activity where id =  " + connection.escape(activity_id);

		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
	},

	loadActivityTypes: function(connection, activity_type_id) {
		var sql = "Select * from activity_types";
		if(activity_type_id){
			sql += " where activity_types_id = " + connection.escape(activity_type_id);
		}
		return connection.queryAsync(sql);
	},

	saveContactActivity(connection, data){
		var sql = "insert into activity_contacts set ? ";
		return connection.queryAsync(sql, data);
	},

	findContactActivity(connection, params){

		var sql = "SELECT * from activity where 1 = 1 and contact_id  = " + connection.escape(params.contact_id) + " or (object_id in (36) and activity_object_id = " + connection.escape(params.contact_id) + "  ) order by created desc ";

		if(params){
			sql += " limit ";
			sql += params.offset;
			sql += ", ";
			sql += params.limit;
		}

		return connection.queryAsync(sql);

	},

	findContactInteractions(connection, contact_id, conditions = {}, searchParams, count){
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {
			sql = "SELECT * , UTC_TIMESTAMP ";
		}

		sql += " from activity where 1 = 1 and created < UTC_TIMESTAMP() and activity_object_id in (select id from activity_objects where interaction = 1) and object_id = " + connection.escape(contact_id);

		if(conditions.description){
			sql += " and description like "  + connection.escape("%" + conditions.description + "%");

		}
		sql += " order by created DESC";

		if(searchParams){
			sql += " limit ";
			sql += searchParams.offset;
			sql += ", ";
			sql += searchParams.limit;
		}

		console.log(sql);

		return connection.queryAsync(sql);
	},

	saveLeaseActivity(connection, data){
		var sql = "insert into activity_leases set ? ";
		return connection.queryAsync(sql, data);
	},

	saveInvoiceActivity(connection, data){
		var sql = "insert into activity_invoices set ? ";
		return connection.queryAsync(sql, data);
	},

	findActivityContact(connection, activity_id){
		var sql = "Select * from activity_contacts where activity_id =  " + connection.escape(activity_id);
		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
	},

	findActivityLease(connection, activity_id){
		var sql = "Select * from activity_leases where activity_id =  " + connection.escape(activity_id);
		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
	},

	findActivityInvoice(connection, activity_id){
		var sql = "Select * from activity_invoices where activity_id =  " + connection.escape(activity_id);
		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
	},

	search(connection, conditions, searchParams, company_id, count){
		var conditions = conditions || {};
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {

			sql = "SELECT *,  " +
				"(select label from activity_types where  activity.activity_types_id = activity_types.id) as label, " +
				"(select concat(first, ' ' , last) from contacts where id = activity.entered_by) as admin, " +
				"(select can_undo from activity_types where  activity.activity_types_id = activity_types.id) as can_undo ";
		}

		sql += " FROM activity where 1 = 1 and status = 1 " ;
		sql += " and company_id = " + connection.escape(company_id);

		if(conditions.label && conditions.label.length){
			sql += ' and label in (' + conditions.label.map(l => connection.escape(l)).join(', ') + ')';
		}

		if(conditions.name){
			sql += " and (select concat(first, ' ' , last) from contacts where id = activity.entered_by) = " + connection.escape(conditions.name);
		}

		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					default:
						sql += searchParams.sort;

				}
				sql += ' ' + searchParams.sortdir;
			}
			sql += " limit ";
			sql += searchParams.offset;
			sql += ", ";
			sql += searchParams.limit;
		}
		return connection.queryAsync(sql);
	},

	undo(connection, details, table){
		var sql = "Update " + table + " set ? where id = " + details.undo.id;

		return connection.queryAsync(sql, details.undo.data);

	}
};