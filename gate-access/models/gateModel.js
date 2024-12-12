"use strict"

module.exports = {

	findAllGates(connection){
		const userSql = "SELECT * FROM gates WHERE active = 1";
		return connection.queryAsync(userSql);
	},

	findById: function(connection, gate_id, activeOnly=true){
		let sql = `SELECT * FROM gates WHERE ${activeOnly? 'active = 1 and':''} id = ${connection.escape(gate_id)}`;
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},

	findByAreaId: function(connection, area_id){
		let sql = "SELECT * FROM gates WHERE active = 1 and area_id = " + connection.escape(area_id);

		console.log(sql);

		return connection.queryAsync(sql);
	},

	save: function(connection, data, gate_id){
		let sql = '';
		if(gate_id){
			sql = "UPDATE gates set ? where id = " + connection.escape(gate_id);
		} else {
			sql = "insert into gates set ?";
		}
		return connection.queryAsync(sql, data);
	},

	delete: function(connection, gate_id){
		let sql = "Update gates set active = 0 where id = " + connection.escape(gate_id);
		return connection.queryAsync(sql);
	},

}