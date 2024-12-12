"use strict"

module.exports = {

	findAllGroups(connection){
		const userSql = "SELECT * FROM user_groups WHERE active = 1";
		return connection.queryAsync(userSql);
	},

	findById: function(connection, group_id, activeOnly=true){
		let sql = `SELECT * FROM user_groups WHERE ${activeOnly? 'active = 1 and ':''} id = ${connection.escape(group_id)}`;
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},

	save: function(connection, data, group_id){
		let sql = '';
		if(group_id){
			sql = "UPDATE user_groups set ? where id = " + connection.escape(group_id);
		} else {
			sql = "insert into user_groups set ?";
		}
		return connection.queryAsync(sql, data);
	},

	saveTime: function(connection, data, group_times_id){
		let sql = '';
		if(group_times_id){
			sql = "UPDATE groups_access_times set ? where id = " + connection.escape(group_times_id);
		} else {
			sql = "insert into groups_access_times set ?";
		}
		return connection.queryAsync(sql, data);
	},

	saveArea: function(connection, data, group_areas_id){
		let sql = '';
		if(group_areas_id){
			sql = "UPDATE groups_access_areas set ? where id = " + connection.escape(group_areas_id);
		} else {
			sql = "insert into groups_access_areas set ? ";
		}
		return connection.queryAsync(sql, data);
	},


	delete: function(connection, group_id){
		let sql = "Update user_groups set active = 0 where id = " + connection.escape(group_id);
		return connection.queryAsync(sql);
	},


	findAreasByGroupId: function(connection, group_id){
		let sql = "SELECT * FROM access_areas WHERE active = 1 and id in (SELECT access_area_id from groups_access_areas where user_group_id = " + connection.escape(group_id) + ")";
		return connection.queryAsync(sql);
	},

	findTimesByGroupId: function(connection, group_id){
		let sql = "SELECT * FROM groups_access_times WHERE user_group_id = " + connection.escape(group_id);
		return connection.queryAsync(sql);
	},


}