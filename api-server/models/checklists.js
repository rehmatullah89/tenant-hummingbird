var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {
	findByTemplateId: function(connection, template_id) {
		var sql = "Select * from checklist_items where status = 1 and template_id = " + connection.escape(template_id) + " order by sort ASC";
		return connection.queryAsync(sql);
	},

	findByPropertyId:function(connection, property_id) {
		var sql = "Select * from checklist_items where status = 1 and property_id = " + connection.escape(property_id) + " order by sort ASC";
		return connection.queryAsync(sql);

	},
	findById:function(connection, id, template_id) {

		var sql = "Select * from checklist_items where template_id = " +  connection.escape(template_id) + " and id = " + connection.escape(id);

		return connection.queryAsync(sql).then(function(data){
			return data.length? data[0]: null;
		});
	},

	findItemById(connection, checklist_id){

		var sql = "Select * from checklist_items where id = " + connection.escape(checklist_id);

		return connection.queryAsync(sql).then(item => {
			if(!item.length) return null;
			return item[0];
		});
	},

	findLeaseItemById(connection, item_id){

		var sql = "Select * from checklist_leases where id = " + connection.escape(item_id);

		return connection.queryAsync(sql).then(item => {
			if(!item.length) return null;
			return item[0];
		});
	},

	findChecklistItems:function(connection, lease_id){
		var leaseSql = "Select * from checklist_leases where lease_id = " + connection.escape(lease_id) + " order by sort asc";
		return connection.queryAsync(leaseSql);
	},

	deleteLeaseUpload(connection, upload_id){
		var sql = "UPDATE checklist_leases set upload_id = null where upload_id = " + connection.escape(upload_id);

		return connection.queryAsync(sql)
	},
	saveItem(connection, data, checklist_leases_id){

		var sql;

		if(checklist_leases_id){
			sql = "UPDATE checklist_leases set ? where id = " + connection.escape(checklist_leases_id);
		} else {
			sql = "insert into checklist_leases set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){

			return checklist_leases_id || response.insertId;
		});

	},

	deleteLeaseItem(connection, item_id){
		var sql = "DELETE from checklist_leases where id  = " + connection.escape(item_id);

		return connection.queryAsync(sql)
	},


	deleteItem(connection, item_id){

		var sql = "UPDATE checklist_items set status = 0 where id = " + connection.escape(item_id);

		return connection.queryAsync(sql);
	},
	save:function(connection, data, checklist_id){
		var sql;
		if(checklist_id){
			sql = "UPDATE checklists set ? where id = " + connection.escape(checklist_id);
		} else {
			sql = "insert into checklists set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){

			return checklist_id || response.insertId;
		});
	},

	saveChecklistItem(connection, data, item_id){
		var sql;
		if(item_id){
			sql = "UPDATE checklist_items set ? where id = " + connection.escape(item_id);
		} else {
			sql = "insert into checklist_items set ?";
		}
		return connection.queryAsync(sql, data).then(r => item_id ? item_id : r.insertId );
	},

	deleteChecklistItem:function(connection, checklist_ids, deleted_by = null){
		if (deleted_by) {
			var sql = "update checklist_items set status = 0, deleted_by = "+ connection.escape(deleted_by) +" where id in (" + checklist_ids.join() + ")";
		} else {
			var sql = "update checklist_items set status = 0 where id in (" + checklist_ids.join() + ")";
		}


		return connection.queryAsync(sql);
	}
};
