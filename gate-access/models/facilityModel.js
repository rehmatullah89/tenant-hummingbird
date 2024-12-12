"use strict"

module.exports = {

	findAllFacilities(connection, company_id){
		const userSql = "SELECT * FROM facilities WHERE active = 1 and company_id = " + connection.escape(company_id);
		return connection.queryAsync(userSql);
	},

	findById: function(connection, facility_id){
		let sql = "SELECT * FROM facilities WHERE active = 1 and id = " + connection.escape(facility_id);

		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},
	findByFacilityId: function(connection, facility_id, company_id, isActive){
		let sql = "SELECT *" + 
				", (select name from gate_vendors where id = facilities.gate_vendor_id) as gate_vendor_name" +
				" FROM facilities WHERE company_id = "  + connection.escape(company_id) + " and facility_id = " + connection.escape(facility_id);
		
		if(isActive){
			sql += "and active = 1"
		}

		console.log(sql);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},


	getGateVendorById(connection, gate_id){
		let sql = "SELECT * FROM gate_vendors WHERE id = " + connection.escape(gate_id);
		return connection.queryAsync(sql).then(res => res.length? res[0] : null);
	},

	save: function(connection, data, facility_id){
		let sql = '';

		if(facility_id){
			sql = "UPDATE facilities set ? where id = " + connection.escape(facility_id);
		} else {
			sql = "insert into facilities set ?";
		}

		return connection.queryAsync(sql, data);
	},

	delete: function(connection, facility_id, modified_by, modified_at){
		let sql = `Update facilities set active = 0, modified_by = ${connection.escape(modified_by)}, modified_at = ${connection.escape(modified_at)} where id = ${connection.escape(facility_id)}`;
		return connection.queryAsync(sql);
	},

	getCredentials(connection, facility_id, gate_vendor_id){
		let sql = "SELECT * FROM credentials where facility_id = " + connection.escape(facility_id) + " and gate_vendor_id = " +  connection.escape(gate_vendor_id);
		return connection.queryAsync(sql);
	},

	deleteCredentialsFacility(connection, facility_id){
		const userSql = "DELETE FROM credentials WHERE facility_id = " + connection.escape(facility_id);
		return connection.queryAsync(userSql);
	}

}