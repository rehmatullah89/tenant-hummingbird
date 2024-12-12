"use strict"

module.exports = {

	findFacilityCreds(connection, facility_id, gate_vendor_id){
		const userSql = "SELECT * FROM credentials WHERE facility_id = " + connection.escape(facility_id) + " and gate_vendor_id = " + connection.escape(gate_vendor_id);

		return connection.queryAsync(userSql);
	},

	saveCredentials: function(connection, data, credentials_id){
		let sql = '';
		if(credentials_id){
			sql = "UPDATE credentials set ? where id = " + connection.escape(credentials_id);
		} else {
			sql = "insert into credentials set ?";
		}
		return connection.queryAsync(sql, data);
	},

}