
var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');


module.exports = {

	save: function(connection, data, contact_relationship_id){
		var sql;

		if(contact_relationship_id){
			sql = "UPDATE contact_relationships set ? where id = " + connection.escape(contact_relationship_id);
		} else {
			sql = "INSERT into contact_relationships set ?";
		}
		return connection.queryAsync(sql, data);
	}

}
