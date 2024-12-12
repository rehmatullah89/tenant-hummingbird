var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');


var models = {};
module.exports = {

	find(connection, company_id, contact_id){

		var sql = "Select * from dashboards where company_id = " + connection.escape(company_id) + " and contact_id = " + connection.escape(contact_id) + " order by sort asc";
		return connection.queryAsync(sql);


	},

	findById(connection, dashboard_id){

		var sql = "Select * from dashboards where id = " + connection.escape(dashboard_id);
		return connection.queryAsync(sql).then(d => {
			return d.length ? d[0]: {};
		});


	},

	delete(connection, dashboard_id){
		var sql = "DELETE from dashboards where id = " + connection.escape(dashboard_id);
		return connection.queryAsync(sql);
	},
	save: function(connection, data, dashboard_id){
		var sql;
		if(dashboard_id){
			sql = "UPDATE dashboards set ? where id = " + connection.escape(dashboard_id);
		} else {
			sql = "insert into dashboards set ?";
		}
		return connection.queryAsync(sql, data);
	},

}