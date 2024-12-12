"use strict"

module.exports = {

	findAllUsers(connection, conditions){
		let userSql = "SELECT * FROM users WHERE active = 1 ";

		for (let condition in conditions) {
			if (conditions.hasOwnProperty(condition) && conditions[condition]) {
				userSql += ' and ' + condition + ' = ' + connection.escape(conditions[condition]);
			}
		}
		return connection.queryAsync(userSql);
	},

	findById: function(connection, user_id){
		let sql = "SELECT * FROM users WHERE active = 1 and id = " + connection.escape(user_id);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},
	findByUserId: function(connection, user_id,facility_id){
		let sql = "SELECT * FROM users WHERE active = 1 and user_id = " + connection.escape(user_id) + " and  facility_id = " + connection.escape(facility_id);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},
	findUserExist: function(connection, user_id, company_id, facility_id){
		let sql = "SELECT * FROM users WHERE company_id = " + connection.escape(company_id) + " and  user_id = " + connection.escape(user_id) + " and  facility_id = " + connection.escape(facility_id);
		return connection.queryAsync(sql).then(facRes => facRes.length? facRes[0] : null);
	},

	getGates: function(connection, user_id, facility_id){
		let sql = "SELECT * FROM user_gates where user_id = " + connection.escape(user_id)  + " and  gate_id in (select id from gates where facility_id = " + connection.escape(facility_id) + " )";

		return connection.queryAsync(sql);
	},


	getSpaces: function(connection, user_id, facility_id){
		let sql = "SELECT *" +
				", (select space_id from spaces where id = spaces_users.space_id) as unit_id" +
				", (select name from spaces where id = spaces_users.space_id) as name" +
				", (select status from spaces where id = spaces_users.space_id) as space_status" +
				" FROM spaces_users where user_id = " + connection.escape(user_id)  + " and  space_id in (select id from spaces where facility_id = " + connection.escape(facility_id) + " )";

				console.log("getSpaces", sql)
		return connection.queryAsync(sql);
	},
	getActiveSpaces: function(connection, user_id, facility_id){
		let sql = "SELECT *" +
			", (select space_id from spaces where id = spaces_users.space_id) as unit_id" +
			", (select name from spaces where id = spaces_users.space_id) as name" +
			", (select status from spaces where id = spaces_users.space_id) as space_status" +
			" FROM spaces_users where user_id = " + connection.escape(user_id) + " and  space_id in (select id from spaces where facility_id = " + connection.escape(facility_id) + " )" +
			" and (status != 'INACTIVE') and (end_date is null or end_date  > CURDATE())";

		console.log("getActiveSpaces", sql)
		return connection.queryAsync(sql);
	},
	getActiveAndSuspendedSpaces: function (connection, user_id, facility_id) {
		let sql = `select su.id, su.space_id, s.access_area_id, su.status, s.facility_id, s.name, s.active, su.created, su.modified, s.deleted , s.external_id , su.user_id,su.start_date ,su.end_date  
		from spaces s 
		join spaces_users su on s.id = su.space_id 
		where su.user_id = ${connection.escape(user_id)}
		and s.facility_id = ${connection.escape(facility_id)}
		and (su.status != 'INACTIVE')
		and (su.end_date is null or su.end_date  > CURDATE())`;

		console.log("getActiveAndSuspendedSpaces SQL", sql)

		return connection.queryAsync(sql);

	},

	save: function(connection, data, user_id){
		let sql = '';
		if(user_id){
			sql = "UPDATE users set ? where id = " + connection.escape(user_id);
		} else {
			sql = "insert into users set ?";
		}
		return connection.queryAsync(sql, data);
	},


	saveAccess: function(connection, data, user_gate_id){
		let sql = '';
		if(user_gate_id){
			sql = "UPDATE user_gates set ? where id = " + connection.escape(user_gate_id);
		} else {
			sql = "insert into user_gates set ?";
		}
		return connection.queryAsync(sql, data);
	},

	delete: function (connection, user_id, remove_external_id) {
		let sql = '';
		if (remove_external_id) {
			sql = "Update users set active = 0, status = 'INACTIVE',  pin = NULL, external_id = NULL where id = " + connection.escape(user_id);
		} else {
			sql = "Update users set active = 0, status = 'INACTIVE',  pin = NULL where id = " + connection.escape(user_id);
		}
		console.log('delete user sql =>',sql);
		return connection.queryAsync(sql);
	},


	findUsersAtFacility: function(connection, facility_id){
		let sql = "SELECT * FROM users WHERE active = 1 and id in (select user_id from spaces_users where space_id in (select id from spaces where facility_id = " + connection.escape(facility_id) + "  )) ";

		return connection.queryAsync(sql);
	},

	findUserByCode(connection, facility_id, code){
        let sql = 'SELECT * from users where id in (SELECT  su.user_id from spaces_users su where DATE(su.end_date) > CURDATE() or su.end_date is null ) and active = 1 and facility_id =' + connection.escape(facility_id) + ' and pin = ' + connection.escape(code) + ' order by id asc';
        return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    },

	linkSpace(connection, primary_user_id, secondary_user_id) {
		console.log('User Models - linkSpace function called');
		
		let sql =
			'Update spaces_users su set su.user_id = ' + connection.escape(primary_user_id) + ' where su.user_id = ' +
			connection.escape(secondary_user_id);

		console.log('SQL => ' + sql);
		return connection.queryAsync(sql);
	},
};
