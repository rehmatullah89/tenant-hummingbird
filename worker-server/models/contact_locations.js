
var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');


module.exports = {

	save: function(connection, data, contact_location_id){
		var sql;

		if(contact_location_id){
			sql = "UPDATE contact_locations set ? where id = " + connection.escape(contact_locations_id);
		} else {
			sql = "INSERT into contact_locations set ?";
		}
		return connection.queryAsync(sql, data);
	}

}
