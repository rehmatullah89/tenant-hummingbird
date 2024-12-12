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

			sql = "SELECT *, " +
				" (select first from contacts where contacts.id = (select contact_id from contact_leases where lease_id = reservations.lease_id order by id asc limit 1 )) as first, " +
				" (select last from contacts where contacts.id = (select contact_id from contact_leases where lease_id = reservations.lease_id order by id asc limit 1 )) as last, " +
				" (select email from contacts where contacts.id = (select contact_id from contact_leases where lease_id = reservations.lease_id order by id asc limit 1 )) as email, " +
				" (select address from addresses where addresses.id = (select address_id from units where units.id = (select unit_id from leases where id = reservations.lease_id))) as address, " +
				" (select city from addresses where addresses.id = (select address_id from units where units.id = (select unit_id from leases where id = reservations.lease_id))) as city, " +
				" (select state from addresses where addresses.id = (select address_id from units where units.id = (select unit_id from leases where id = reservations.lease_id))) as state, " +
				" (select zip from addresses where addresses.id = (select address_id from units where units.id = (select unit_id from leases where id = reservations.lease_id))) as zip, " +
				" (select number from units where units.id = (select unit_id from leases where id = reservations.lease_id)) as unit_number, " +
				" (select id from units where units.id = (select unit_id from leases where id = reservations.lease_id)) as unit_id ";

		}

		sql += " FROM reservations where 1 = 1 and expires >= now() and lease_id in (select id from leases where status = 0 and unit_id in (select id from units where property_id in (select id from properties where company_id = " +  connection.escape(company_id) + " ))) " ;


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

		console.log(sql);

		return connection.queryAsync(sql);
	},

	findByCompanyId: function(connection, company_id , searchParams){

		let sql = "SELECT * FROM reservations WHERE expires >= now() AND lease_id IN (SELECT id FROM leases WHERE status = 0 AND unit_id IN (SELECT id FROM units WHERE property_id IN "
		if (searchParams.property_id) {
			sql += `( ${connection.escape(searchParams.property_id)} )`
		} else {
			sql += `( SELECT id FROM properties WHERE company_id = ${connection.escape(company_id)} )`
		}
		sql += ")) ORDER BY time ASC;"

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

	findByLeaseId: function(connection, lease_id){
		var sql = "SELECT * FROM reservations WHERE lease_id = " +  connection.escape(lease_id);
		return connection.queryAsync(sql).then(r => {
			return r.length? r[0]: null;
		});
	},

	findByContactId: function(connection, contact_id, reference_company_id, properties = []){

		var sql = "SELECT * FROM reservations WHERE expires >= now() and lease_id in (select lease_id from contact_leases where contact_id =  " +  connection.escape(contact_id) + ") and lease_id in (select id from leases where status = 0) ";

    if(properties.length){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(", ") + ")))";
    } else if(reference_company_id){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( select id from properties where company_id  = " +  connection.escape(reference_company_id) + ")))";
    }

		return connection.queryAsync(sql);
	},
	findOldByContactId: function(connection, contact_id, reference_company_id, properties = []){

		var sql = "SELECT * FROM reservations WHERE expires < now() and lease_id in (select lease_id from contact_leases where contact_id =  " +  connection.escape(contact_id) + ")";

    if(properties.length){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(", ") + ")))";
    } else if(reference_company_id){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( select id from properties where company_id  = " +  connection.escape(reference_company_id) + ")))";
    }	
	
		return connection.queryAsync(sql);
	},

	findById: function(connection, id){

		var sql = "SELECT * FROM reservations WHERE id = " + connection.escape(id) ;
		return connection.queryAsync(sql).then(r => {
			return r.length? r[0]: null;
		});
	},

	deleteReservation: async function(connection, id,lease_id){
		let facility_time_sql = `select CONVERT_TZ(now(),"+00:00",utc_offset) as facility_time from properties where id =(select property_id from units where id = (select unit_id from leases where id = ${connection.escape(lease_id)}));`;
		console.log("deleteReservation - facility_time_sql: ", facility_time_sql);
		let facility_time_res = await connection.queryAsync(facility_time_sql);

		let facility_time = facility_time_res.length > 0 && facility_time_res[0].facility_time;
		let sql = `Update reservations set expires = ${connection.escape(facility_time)} where id = ${connection.escape(id)};`;
		console.log("deleteReservation - delete_reservation_sql: ", sql);
		
		return await connection.queryAsync(sql);
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


