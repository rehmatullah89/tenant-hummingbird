"use strict"

module.exports = {

	findAll: function(connection){
		let sql = "SELECT * FROM gate_vendors order by sort asc";
		return connection.queryAsync(sql);
	},

	findById: function(connection, vendor_id){
		let sql = "SELECT * FROM gate_vendors WHERE id = " + connection.escape(vendor_id);
		return connection.queryAsync(sql).then(res => res.length? res[0] : null);
	},

	save: function(connection, data, area_id){
		let sql = '';
		if(area_id){
			sql = "UPDATE gate_vendors set ? where id = " + connection.escape(area_id);
		} else {
			sql = "insert into gate_vendors set ?";
		}
		return connection.queryAsync(sql, data);
	},

	delete: function(connection, gate_vendor_id){
		let sql = "Update gate_vendors set active = 0 where id = " + connection.escape(gate_vendor_id);
		return connection.queryAsync(sql);
	},

}