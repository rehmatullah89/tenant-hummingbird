"use strict";
const moment = require('moment');

module.exports = {

	findAllSpaces(connection){
		const userSql = "SELECT * FROM spaces WHERE deleted is not null";
		return connection.queryAsync(userSql);
	},

	findById: function(connection, space_id){
		let sql = "SELECT * FROM spaces WHERE deleted is null and id = " + connection.escape(space_id);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},
	findBySpaceId: function(connection, space_id, facility_id){
		let sql = "SELECT * FROM spaces WHERE deleted is null and space_id = " + connection.escape(space_id) + " and facility_id = " + connection.escape(facility_id);
		console.log('sql', sql)
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},
	findByFacilityId: function(connection, facility_id, modified){
		let sql = "SELECT * FROM spaces WHERE deleted is null and facility_id = " + connection.escape(facility_id);
		if(modified){
			sql += " and ( modified > " + connection.escape(modified);
			sql += " or (select MAX(modified) from spaces_users where space_id = spaces.id) > " + connection.escape(modified);
			sql += " or (select MAX(modified) from users where id in (select user_id from spaces_users where space_id = spaces.id) ) > " + connection.escape(modified);
			sql += ")"
		}

		return connection.queryAsync(sql);
	},
	findByName: function(connection, name, facility_id){
		let sql = "SELECT * FROM spaces WHERE deleted is null and name = " + connection.escape(name) + " and facility_id = " + connection.escape(facility_id);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},

	save: function(connection, data, space_id){
		let sql = '';
		if(space_id){
			sql = "UPDATE spaces set ? where id = " + connection.escape(space_id);
			console.log('sql', sql)
		} else {
			sql = "insert into spaces set ?";
			console.log('sql', sql)
		}
		return connection.queryAsync(sql, data);
	},

	delete: function(connection, space_id){
		let sql = "Update spaces set deleted = " + connection.escape( moment().format('YYYY-MM-DD HH:mm:ss')) + " where id = " + connection.escape(space_id);
		return connection.queryAsync(sql);
	},

	resetCatches: function (connection, space_id) {
		let sql = `Update spaces set soft_catch = IFNULL(soft_catch, 0), hard_catch = IFNULL(hard_catch, 0), late_catch = IFNULL(late_catch, 0) where id = ${connection.escape(space_id)}`;
		console.log('reset Catches sql =>', sql);
		return connection.queryAsync(sql);
	},

	moveIn: function(connection, data, space_user_id){
		let sql = '';
		if(space_user_id){
			sql = "UPDATE spaces_users set ? where id = " + connection.escape(space_user_id);
		} else {
			sql = "insert into spaces_users set ?";
		}
		console.log(connection.format(sql, data));
		return connection.queryAsync(sql, data);
	},

	getUsers(connection, space_id){
		const userSql = "SELECT * FROM spaces_users WHERE space_id = " + connection.escape(space_id);
		return connection.queryAsync(userSql);
	},

	getUsersWithAccess(connection, space_id){
		const userSql = `SELECT * FROM spaces_users WHERE start_date <= CURDATE() and (end_date is null or end_date > CURDATE()) and space_id = ${connection.escape(space_id)}`;
		console.log(userSql);
		return connection.queryAsync(userSql);
	},

	getUser(connection, space_id, user_id){
		const userSql = "SELECT * FROM spaces_users WHERE space_id = " + connection.escape(space_id) + " and user_id = " + connection.escape(user_id);
		return connection.queryAsync(userSql).then(res => res.length? res[0] : null);
	},

	removeAllUsers(connection, space_id){
		const userSql = "DELETE FROM spaces_users WHERE space_id = " + connection.escape(space_id);
		return connection.queryAsync(userSql);
	},

	removeUser(connection, space_id, user_id){
		const userSql = "DELETE FROM spaces_users WHERE space_id = " + connection.escape(space_id) + " and user_id = " + connection.escape(user_id);

		return connection.queryAsync(userSql);
	}
}