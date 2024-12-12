var moment      = require('moment');
var Promise      = require('bluebird');



module.exports = {
	save: function (connection, name, data, id) {

		var sql;
		if (id) {
			sql = "UPDATE credentials_" + name + " set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into credentials_" + name + " set ?";
		}



		return connection.queryAsync(sql, data);
	},

}
