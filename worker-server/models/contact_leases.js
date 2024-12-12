var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');
var Promise         = require('bluebird');


module.exports = {

	findTenantsByLeaseId(connection, lease_id){

		var sql = "select * from contact_leases where type = 'tenant' and lease_id = " + connection.escape(lease_id) + ' order by sort asc';

		return connection.queryAsync(sql);
	},
	findById(connection, id){

		var sql = "select * from contact_leases where id = " + connection.escape(id);

		return connection.queryAsync(sql).then(r =>  r.length? r[0]: null);

	},
	save(connection, data){

		var sql = "INSERT INTO contact_leases set ? ";
		return connection.queryAsync(sql, data).then(response => response.insertId);

	},
	remove(connection, id, lease_id){

		var sql = "DELETE FROM contact_leases where id = " + connection.escape(id) + ' and lease_id = ' + connection.escape(lease_id);
		return connection.queryAsync(sql);

	},
	search(connection, conditions = {}, searchParams, company_id, count){
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {
			
			/*
			 name: null,
			 address: null,
			 unit: null,
			 status: null,
			 past_due: 0,

			 */
			sql = "SELECT *,  " +
				"(select concat(first, ' ' , last) from contacts where id = contact_leases.contact_id) as name, " +
				"(select email from contacts where id = contact_leases.contact_id) as email, " +
				"(select number from units where id = (select unit_id from leases where id = contact_leases.lease_id)) as number, " +
				"(select address from addresses where id = ( select address_id from units where id = (select unit_id from leases where id = contact_leases.lease_id))) as address, " +
				"(select city from addresses where id = ( select address_id from units where id = (select unit_id from leases where id = contact_leases.lease_id))) as city, " +
				"(select state from addresses where id = ( select address_id from units where id = (select unit_id from leases where id = contact_leases.lease_id))) as state, " +
				"(select zip from addresses where id = ( select address_id from units where id = (select unit_id from leases where id = contact_leases.lease_id))) as zip, " +
				"(select status from leases where id = contact_leases.lease_id) as status, " +

				'(SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id = contact_leases.lease_id)) - (SELECT IFNULL(SUM(amount),0)  FROM invoices_payments WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id = contact_leases.lease_id)) AS balance ';

		}

		sql += " FROM contact_leases where 1 = 1  " ;
		sql += " and (select company_id from contacts where id = contact_leases.contact_id) = " + connection.escape(company_id);


		if(conditions.name){
			sql += " and (select concat(first, ' ' , last) from contacts where id = contact_leases.contact_id) like " + connection.escape("%" + conditions.name + "%");
		}

		if(conditions.email){
			sql += " and (select email from contacts where id = contact_leases.contact_id) = " + connection.escape(conditions.email);
		}

		if(conditions.property_id){
			sql += " and (select property_id from units where id = (select unit_id from leases where id = contact_leases.lease_id) = " + connection.escape(conditions.property_id);
		}


		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					case 'name':
						sql += " (select concat(first, ' ' , last) from contacts where id = contact_leases.contact_id) ";
						break;
					case 'email':
						sql += " (select email from contacts where id = contact_leases.contact_id) ";
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
		console.log(searchParams);
		console.log(sql);
		return connection.queryAsync(sql);
	}
}