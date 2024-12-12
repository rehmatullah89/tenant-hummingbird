var settings    = require(__dirname + '/../config/settings.js');
var Promise      = require('bluebird');
var moment = require('moment');



module.exports = {
	findById: function(connection, company_id){
		var userSql = "SELECT * FROM lease_cosigners WHERE id = " + connection.escape(company_id);
		return connection.queryAsync(userSql).then(function(cosignerRes){
			return cosignerRes[0] || null;
		});

	},
	findByTenantId: function(connection, tenant_id, lease_id){
		var userSql = "SELECT * FROM contact_relationships WHERE is_cosigner = 1 and contact_id = " + connection.escape(tenant_id) + " and lease_id = " + connection.escape(lease_id);

		return connection.queryAsync(userSql).then(function(cosignerRes){
			return cosignerRes[0] || null;
		});

	},
	save(connection, data, cosigner_id){

		var sql;
		if(cosigner_id){
			sql = "Update lease_cosigners set ? where id = " + connection.escape(cosigner_id);
		} else {
			sql = "insert into lease_cosigners set ?";
		}
		return connection.queryAsync(sql, data).then(result => {
			return (cosigner_id)? cosigner_id: result.insertId;
		})

	}

};