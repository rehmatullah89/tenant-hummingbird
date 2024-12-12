var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {
	
	findByCompanyId: function(connection, company_id){

		var sql = "SELECT * from lease_templates where status = 1 and company_id = " + connection.escape(company_id);
		return connection.queryAsync(sql);
	},

	findDefaultByCompanyId: function(connection, company_id){

		var sql = "SELECT * from lease_templates where status = 1 and is_default = 1 and company_id = " + connection.escape(company_id);
		
		return connection.queryAsync(sql);
	},

	findByPropertyId:function(connection, property_id) {
		var sql = "Select * from lease_templates where property_id = " + connection.escape(property_id);

		return connection.queryAsync(sql).then(t => {
			if(!t.length) return null;
			return t[0];
		});
	},
	findById:function(connection, id) {

		var sql = "Select * from lease_templates where status = 1 and id = " + connection.escape(id);

		return connection.queryAsync(sql).then(function(data){
			return data[0];
		});
	},
	save:function(connection, data, template_id){
		var sql;
		if(template_id){
			sql = "UPDATE lease_templates set ? where id = " + connection.escape(template_id);
		} else {
			sql = "insert into lease_templates set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			return template_id || response.insertId;
			
		});
	},

	delete:function(connection, template_id){
		var sql = "UPDATE lease_templates set status = 0 where id = " + connection.escape(template_id);
		return connection.queryAsync(sql);
	},

	findServices(connection, type, template_id){
		
		var sql = "Select * from lease_template_services where status = 1 and service_type = " + connection.escape(type) + " and template_id = " + connection.escape(template_id);

		return connection.queryAsync(sql);
	},
	
	findServiceById(connection, service_id, template_id){
		var sql = "Select * from lease_template_services where template_id = " + connection.escape(template_id) + ' and id = ' + connection.escape(service_id);

		
		return connection.queryAsync(sql).then(function(response){
			return response.length ? response[0] : null;
		});
	},
	
	saveService:function(connection, data, service_id){
		var sql;
		if(service_id){
			sql = "UPDATE lease_template_services set ? where id = " + connection.escape(service_id);
		} else {
			sql = "insert into lease_template_services set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			return service_id || response.insertId;
		});
	},
	
	deleteAllServices(connection, template_id ){

		var sql = "UPDATE lease_template_services set status = 0 where template_id = " + connection.escape(template_id);

		return connection.queryAsync(sql);
	},

	deleteService(connection, service_ids){
		var sql = "UPDATE lease_template_services set status = 0 where id in (" + service_ids.join() + ")";

		return connection.queryAsync(sql);
	},


	findPaymentCycles(connection, template_id){
		var sql = "SELECT * FROM lease_template_payment_cycles where deleted_at is null and template_id = " + connection.escape(template_id);

		return connection.queryAsync(sql);
	}, 
	async savePaymentCycles(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE lease_template_payment_cycles set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into lease_template_payment_cycles set ?";
		}
		
		let result = await connection.queryAsync(sql, data)
		return id || result.insertId;
	
	},
	async removePaymentCycles(connection, template_id ){
		var sql = `UPDATE lease_template_payment_cycles set deleted_at = NOW() where template_id = ${connection.escape(template_id) }`;
		return  await connection.queryAsync(sql);

	}, 

	unsetDefault(connection, company_id, unit_type){
		var sql = "update lease_templates set is_default = 0 where company_id = " + connection.escape(company_id) + ' and unit_type = ' + connection.escape(unit_type);

		return connection.queryAsync(sql);

	},
	setDefault(connection, id, unit_type){
		var sql = "update lease_templates set is_default = 1 where id = " + connection.escape(id);
		return connection.queryAsync(sql);

	}
};