var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

const statuses = [
	'Active', 'Accepted', 'Rejected'
]



module.exports = {
	
	search(connection, conditions, searchParams, company_id, count){
		conditions = conditions || {};
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {

			sql = "SELECT *,  " +
				"(select concat(first, ' ' , last) from contacts where id = applications.contact_id) as name, " +
				"(select address from addresses where id = (select address_id from units where units.id = applications.unit_id)) as address, " +
				"(select city from addresses where id = (select address_id from units where units.id = applications.unit_id)) as city, " +
				"(select state from addresses where id = (select address_id from units where units.id = applications.unit_id)) as state, " +
				"(select zip from addresses where id = (select address_id from units where units.id = applications.unit_id)) as zip, " +
				"(select number from units where id = applications.unit_id) as number ";
		}

		sql += " FROM applications where 1 = 1 " ;
		sql += " and (select company_id from contacts where id = applications.contact_id) = " + connection.escape(company_id);


		if(conditions.status && conditions.status.length){
			sql += ' and LOWER(status) in (' + conditions.status.map(s => connection.escape(s)).join(', ') + ')';
		}

		if(conditions.search){
			sql += " and ( " +
				" (select concat(first, ' ' ,last) from contacts where id = applications.contact_id) like " + connection.escape("%" + conditions.name + "%") +
				" OR (select email from contacts where id = applications.contact_id) like " + connection.escape("%" + conditions.search + "%") +
				" OR applications.contact_id in (select contact_id from contact_phones where phone like  " + connection.escape("%" + conditions.search + "%") + ")" +
				") ";
		}
		
		if(conditions.property_id && conditions.property_id.length){
			sql += " and unit_id in (select id from units where property_id in (" + conditions.property_id.map(p => connection.escape(p)).join(', ') + "))";
		}

		if(conditions.unit_id &&  conditions.unit_id){
			sql += " and unit_id in (" + connection.escape(conditions.unit_id) + ")";
		}


		// if(conditions.email){
		// 	sql += " and (select email from contacts where id = leads.contact_id) = " + connection.escape(conditions.email);
		// }

		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					case 'name':
						sql += " (select concat(first, ' ' , last) from contacts where id = applications.contact_id) ";
						break;
					// case 'email':
					// 	sql += " (select email from contacts where id = applications.contact_id) ";
					// 	break;
					default:
						sql += searchParams.sort;

				}
				sql += ' ' + searchParams.sortdir;
			}
			sql += " limit ";
			sql += searchParams.offset;
			sql += ", ";
			sql += searchParams.limit;
		}

		console.log(sql);
		return connection.queryAsync(sql);
	},

	findById:function(connection, id) {

		var sql = "Select * from applications where id = " + connection.escape(id);

		return connection.queryAsync(sql).then(function(data){
			return data[0];
		});
	},

	findByUnitId:function(connection, unit_id) {

		var sql = "Select * from applications where unit_id = " + connection.escape(unit_id);

		return connection.queryAsync(sql);
	},

	findByContactId:function(connection, contact_id) {

		var sql = "Select * from applications where contact_id = " + connection.escape(contact_id);

		return connection.queryAsync(sql);
	},

	findByCompanyId:function(connection, company_id, params) {

		var sql = "Select * from applications where ";

		for (var p in params) sql += p + " = " + connection.escape(params[p]) + " and " ;

		sql += " unit_id in ( select id from units where property_id in ( select id from properties where company_id = "+  + connection.escape(company_id) +" )) ";

		return connection.queryAsync(sql, params);
	},

	saveAddress(connection, data, application_address_id){

		var sql;
		if(application_address_id){
			sql = "UPDATE application_addresses set ? where id = " + connection.escape(application_address_id);
		} else {
			sql = "insert into application_addresses set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){

			return application_address_id || response.insertId;
		});

	},

	findEmploymentByApplicationId(connection, application_id){
		var sql = "Select * from application_employment where application_id = " + connection.escape(application_id) + " order by sort asc";
		return connection.queryAsync(sql);
	},

	findAddressByApplicationId(connection, application_id){
		var sql = "Select * from application_addresses where application_id = " + connection.escape(application_id) + " order by sort asc";
		return connection.queryAsync(sql);
	},

	saveEmployment(connection, data, application_employment_id){

		var sql;
		if(application_employment_id){
			sql = "UPDATE application_employment set ? where id = " + connection.escape(application_employment_id);
		} else {
			sql = "insert into application_employment set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			return application_employment_id || response.insertId;
		});
	},

	save:function(connection, data, application_id){
		var sql;
		if(application_id){
			sql = "UPDATE applications set ? where id = " + connection.escape(application_id);
		} else {
			sql = "insert into applications set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){

			return application_id || response.insertId;
		});
	},

	reject:function(connection, application_id){
		var sql = "update applications set status = 0 where id = " + connection.escape(application_id);
		return connection.queryAsync(sql);
	},


	

};