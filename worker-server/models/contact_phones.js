
var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');


module.exports = {

	save: function(connection, data, contact_phones_id){
		var sql;

		if(contact_phones_id){
			sql = "UPDATE contact_phones set ? where id = " + connection.escape(contact_phones_id);
		} else {
			sql = "INSERT into contact_phones set ?";
		}
		return connection.queryAsync(sql, data);
	}

}
