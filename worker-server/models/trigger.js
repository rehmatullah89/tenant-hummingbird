var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

	findByCompanyId: function(connection, company_id, type){

		var sql = "Select * from triggers where active = 1 and company_id = " + connection.escape(company_id);
		return connection.queryAsync(sql);

	},

	findById: function(connection, trigger_id, company_id){

		var sql = "Select * from triggers where active = 1 and id = " + connection.escape(trigger_id);

		if(company_id) {
			sql +=  " and company_id = " + connection.escape(company_id);
		}

		return connection.queryAsync(sql).then(function(qryRes){
			return qryRes[0] || null;
		});

	},

	save: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE triggers set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into triggers set ?";
		}
		return connection.queryAsync(sql, data);
	},

	saveFee: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE trigger_fee set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into trigger_fee set ?";
		}

		return connection.queryAsync(sql, data);

	},

	saveEmail: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE trigger_email set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into trigger_email set ?";
		}

		return connection.queryAsync(sql, data);

	},

	saveSMS: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE trigger_sms set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into trigger_sms set ?";
		}

		return connection.queryAsync(sql, data);

	},

	saveAttachment: function(connection, data, id){
		var sql;
		if(id){
		  sql = "UPDATE trigger_attachment set ? where id = " + connection.escape(id);
		} else {
		  sql = "insert into trigger_attachment set ?";
		}
	
		return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);
	
	  },
	
	  // Convenience method, save as saveAttachment, as both are stored in the same table. Messages dont have a document_id
	  saveMessage: function(connection, data, id){
		var sql;
		if(id){
		  sql = "UPDATE trigger_attachment set ? where id = " + connection.escape(id);
		} else {
		  sql = "insert into trigger_attachment set ?";
		}
	
		return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);
	
	  },

	saveDeliveryMethod: function(connection, data, id){
		var sql;
		if(id){
		  sql = "UPDATE trigger_delivery_methods set ? where id = " + connection.escape(id);
		} else {
		  sql = "insert into trigger_delivery_methods set ?";
		}
	
		return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);
	
	  },

	saveEvent: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE trigger_events set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into trigger_events set ?";
		}

		return connection.queryAsync(sql, data);

	},

	delete: function(connection, id){
		var sql = "UPDATE triggers set active = 0 where id = " + connection.escape(id);
		return connection.queryAsync(sql);

	},

	deleteFee: function(connection, trigger_id){
		var sql = "Update trigger_fee set active = 0 where trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	},

	deleteEmail: function(connection, trigger_id){
		var sql = "Update trigger_email set active = 0 where trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	},

	deleteSMS: function(connection, trigger_id){
		var sql = "Update trigger_sms set active = 0 where trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	},

	deleteAttachement: function(connection, id){
		var sql = "Update trigger_attachment set active = 0 where document_id is not null and id = " + connection.escape(id);
		return connection.queryAsync(sql);
	  },
	  // convencience function, similar to deleteAttachment
	  deleteMessage: function(connection, id){
		var sql = "Update trigger_attachment set active = 0 where document_id is null and id = " + connection.escape(id);
		return connection.queryAsync(sql);
	  },

	deleteEvent: function(connection, trigger_id){
		var sql = "Update trigger_events set active = 0 where trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	},

	findFeeByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_fee where trigger_id = " + connection.escape(trigger_id) + " and active = 1";
		return connection.queryAsync(sql);
	},
	findEmailByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_email where trigger_id = " + connection.escape(trigger_id) + " and active = 1";
		return connection.queryAsync(sql);
	},
	findSMSByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_sms where trigger_id = " + connection.escape(trigger_id) + " and active = 1";
		return connection.queryAsync(sql);
	},

	findEventByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_events where trigger_id = " + connection.escape(trigger_id) + " and active = 1";
		return connection.queryAsync(sql);
	},
	
	findAttachmentByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_attachment where document_id is not null and active = 1 and trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	  },
	
	  findMessageByTriggerId: function(connection, trigger_id){
		var sql = "SELECT * from trigger_attachment where document_id is null and active = 1 and trigger_id = " + connection.escape(trigger_id);
		return connection.queryAsync(sql);
	  },

	findDeliveryMethodsByAttachmentId: function(connection, ta_id){
		var sql = "SELECT *, (select delivery_type from delivery_methods where id = trigger_delivery_methods.delivery_methods_id) as delivery_type from trigger_delivery_methods where active = 1 and trigger_attachment_id = " + connection.escape(ta_id);
		return connection.queryAsync(sql);
	  },

	findOverdue(connection, date, repeat, max_repeat, start, apply_to_all, company_id, property_id){

		var sql = `SELECT *, 
			(IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - IFNULL(total_payments, 0)) as total_owed, 
			(select min(due) from invoices i where status > 0 and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent'))  AND  i.lease_id = invoices.lease_id and ( (IFNULL(i.subtotal, 0) + IFNULL(i.total_tax, 0) - IFNULL(i.total_discounts, 0)) > IFNULL(i.total_payments, 0))) as first_due
			FROM invoices WHERE status > 0 and due < ${connection.escape(date)} `;
		
		if(repeat && repeat > 1){
			sql += " and MOD(DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(start) + " DAY)), " + connection.escape(repeat) + ") = 0 ";
			if(max_repeat){
				var max_days = start + (repeat * (max_repeat-1));
				sql += " and DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(max_days) + " DAY)) <= 0 ";
			}
		} else {
			sql += " and DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(start) + " DAY)) = 0 ";
		}

		sql += " AND id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent')) ";

		sql += " AND invoices.lease_id IN (SELECT id FROM leases WHERE status = 1 and (end_date > " + connection.escape(date) + " || end_date is null) and start_date < " + connection.escape(date) + " and unit_id IN (SELECT id FROM units WHERE property_id =  "+ connection.escape(property_id)+")) "; 
		
		sql += " HAVING total_owed > 0 ";
		
		if(!apply_to_all){
			sql += " and due = first_due ";	
		}
		sql += " ORDER BY invoices.id DESC";

		console.log("findOverdue sql", sql.replace(/\n/g, " "));

		return connection.queryAsync(sql);

	},
	findFromStart(connection, date, repeat, max_repeat, start, company_id, property_id){

		// ToDo limit to leases that have this trigger on them
		// ToDo Account for repeat

		var sql = "SELECT * FROM leases WHERE " + connection.escape(date) + " = DATE_ADD(leases.start_date, INTERVAL " + connection.escape(start) + " DAY) AND (leases.start_date <= "+ connection.escape(date) + " and (end_date >= "+ connection.escape(date) + " || leases.end_date is null)) AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id =  "+ connection.escape(property_id)+")) ORDER BY leases.id DESC;";
		console.log("findFromStart", sql);
		return connection.queryAsync(sql);
	},

	findFromEnd(connection, date, repeat, max_repeat, start, company_id, property_id){

		// ToDo limit to leases that have this trigger on them

		var sql = "SELECT * FROM leases WHERE DATE_ADD("+ connection.escape(date) + ", INTERVAL " + connection.escape(start) + " DAY) = leases.end_date AND (leases.start_date <= "+ connection.escape(date) + " and (end_date >= "+ connection.escape(date) + " || leases.end_date is null)) AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id  = "+ connection.escape(property_id)+")) ORDER BY id DESC;";
		console.log("findFromEnd", sql);
		return connection.queryAsync(sql);
	},

	findBeforeStart(connection, date, repeat, max_repeat, start, company_id, property_id){

		// ToDo limit to leases that have this trigger on them11

		var sql = "SELECT * FROM leases WHERE DATE_ADD("+ connection.escape(date) + ", INTERVAL " + connection.escape(start) + " DAY) = leases.start_date AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id  = "+ connection.escape(property_id)+")) ORDER BY id DESC;";
		console.log("findBeforeStart", sql);
		return connection.queryAsync(sql);
	},
	findByGroupIds(connection, group_ids) {

		var sql = `select * from triggers where active = 1 and trigger_group_id in (${connection.escape(group_ids.toString(','))})`;
		return connection.queryAsync(sql);
	},

	findLeaseStandings(connection, company_id){
		var sql = "SELECT * FROM lease_standings ORDER BY sort ASC";
		return connection.queryAsync(sql);
	},

	findTriggersByPropertyId(connection, property_id){
		var sql = "SELECT *, (select name from trigger_groups where trigger_groups.id = triggers.trigger_group_id) as group_name FROM triggers where trigger_group_id in (select trigger_group_id from property_trigger_groups where property_id = " + connection.escape(property_id) + " and deleted_at is null)";
		console.log(sql)
		return connection.queryAsync(sql);
	}, 

	findByPropertyId(connection, property_id){

		let sql = ` select * from triggers where 
			active = 1 
			and trigger_group_id in (select id from trigger_groups where active = 1)
			and trigger_group_id in (select trigger_group_id from property_trigger_groups where property_id = ${connection.escape(property_id)} and deleted_at is null)`;
		console.log("sql", sql)
		  return connection.queryAsync(sql); 
	  }

	


};