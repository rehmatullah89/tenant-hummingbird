var settings    = require(__dirname + '/../config/settings.js');
var Promise      = require('bluebird');
var moment = require('moment');

var models  = {};

module.exports = {

	search(connection, conditions = {}, searchParams, company_id, count){
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {

			sql = "SELECT *,  " +
				"(select phone from contact_phones where contact_id = contacts.id order by id asc limit 1) as phone ";
		}

		sql += " FROM contacts where 1 = 1 " ;
		sql += " and company_id = " + connection.escape(company_id);

		if(conditions.source && conditions.source.length){
			sql += ' and LOWER(source) in (' + conditions.source.map(s => connection.escape(s)).join(', ') + ')';
		}


		if(conditions.name){
			sql += " and (select concat(first, ' ' , last) like " + connection.escape("%" + conditions.name + "%");
		}

		if(conditions.email){
			sql += " and email like " + connection.escape("%" + conditions.email + "%");
		}

		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					case 'name':
						sql += " last ";
						break;
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

		return connection.queryAsync(sql);
	},

	findByCompanyId: function(connection, company_id){

		var sql = "SELECT * FROM reservations WHERE expires >= now() and lease_id in (select id from leases where status = 0 and unit_id in (select id from units where property_id in (select id from properties where company_id = " +  connection.escape(company_id) + " ))) order by time asc" ;


		console.log(sql);

		return connection.queryAsync(sql);
	},

	findByPropertyId: function(connection, property_id){
		var sql = "SELECT * FROM reservations WHERE lease_id in (select id from leases where unit_id in (select id from units where property_id = " +  connection.escape(property_id) + " )) and expires > now()" ;
		return connection.queryAsync(sql);

	},

	findByUnitId: function(connection, unit_id){
		var sql = "SELECT * FROM reservations WHERE lease_id in (select id from leases where status = 0 and unit_id = " +  connection.escape(unit_id) + " ) and expires > now()" ;


		return connection.queryAsync(sql);

	},

	findByLeaseId: function(connection, property_id){
		var sql = "SELECT * FROM reservations WHERE lease_id = " +  connection.escape(property_id);
		return connection.queryAsync(sql).then(r => {
			return r.length? r[0]: null;
		});
	},

	findByContactId: function(connection, contact_id){ 
		var sql = "SELECT * FROM reservations WHERE lease_id in (select lease_id from contact_leases where contact_id =  " +  connection.escape(contact_id) + " )";
		return connection.queryAsync(sql);
	},

	findById: function(connection, id){

		var sql = "SELECT * FROM reservations WHERE id = " + connection.escape(id) ;
		return connection.queryAsync(sql).then(r => {
			return r.length? r[0]: null;
		});
	},


	save: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE reservations set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into reservations set ?";
		}
		return connection.queryAsync(sql, data);

	},

}


