"use strict"

module.exports = {

	findAllAreas(connection){
		const userSql = "SELECT * FROM access_areas WHERE active = 1";
		return connection.queryAsync(userSql);
	},

	findById: function(connection, area_id, active_only=true){
		let sql = `SELECT * FROM access_areas WHERE ${active_only? 'active = 1 and':''}  id = ${connection.escape(area_id)}`;
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},

	save: function(connection, data, area_id){
		let sql = '';
		if(area_id){
			sql = "UPDATE access_areas set ? where id = " + connection.escape(area_id);
		} else {
			sql = "insert into access_areas set ?";
		}
		return connection.queryAsync(sql, data);
	},

	delete: function(connection, area_id){
		let sql = "Update access_areas set active = 0 where id = " + connection.escape(area_id);
		return connection.queryAsync(sql);
	},

}