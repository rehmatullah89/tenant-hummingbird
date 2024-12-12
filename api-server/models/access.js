var moment      = require('moment');

module.exports = {
	findById: function (connection, access_id) {
		var sql = "SELECT * FROM access where id =  " + connection.escape(access_id);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},

	findByName: function (connection, name) {
		var sql = "SELECT * FROM access where name =  " + connection.escape(name);
		return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
	},

	findPropertyAccess(connection, access_id, property_id){
		var sql = "SELECT * from properties_access where property_id = " + connection.escape(property_id) + ' and access_id = ' + connection.escape(access_id);
		return connection.queryAsync(sql);
	},




	savePropertyAccess(connection, access_id, property_id, key, value, id){

		var data = {
			access_id: access_id,
			property_id: property_id,
			key: key,
			value: value
		}
		
		var sql;
		if(id){
			sql = "update properties_access set ?  where id = " + connection.escape(id);
		} else {
			sql = "insert into properties_access set ?";
		}
		return connection.queryAsync(sql, data);

	},



	// findBrivoCredsById(connection, id){
	// 	var sql = "SELECT * from credentials_brivo where id = " + connection.escape(id);
	// 	return connection.queryAsync(sql).then(r => r.length ? r[0]: {});
	// }



}