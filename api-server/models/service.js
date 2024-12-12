var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');



module.exports = {

	findById: function (connection, service_id) {
		var sql = "Select * from services where id = " + connection.escape(service_id);
		return connection.queryAsync(sql).then(function (servicesRes) {
			if(!servicesRes) return null;
			return servicesRes[0];
		});
	},

	findRentService:function(connection, lease_id, period_start, period_end, company_id){

		var sql = "SELECT * FROM services " +
		" where status = 1 and lease_id = " + connection.escape(lease_id) +
		" and product_id in (select id from products where company_id = " + connection.escape(company_id) + " and default_type = 'rent') ";
		if(period_start && period_end){
			sql += " and start_date <= " + connection.escape(period_end.format('YYYY-MM-DD')) + " and (end_date is null or end_date >= " + connection.escape(period_start.format('YYYY-MM-DD')) + ") ";
		}

		return connection.queryAsync(sql).then(function(response){
			if(response.length) return response[0];
			return null;
		});
	},


	findAllByType(connection, lease_id, service_type = 'lease') {
		const sql = `select * from services where lease_id = ${ lease_id } and status = 1 and service_type = ${connection.escape(service_type)}`;
		return connection.queryAsync(sql);
	},

	findActiveInsuranceService(connection, lease_id, date){
		var sql = `SELECT * FROM services
					where status = 1 and lease_id = ${connection.escape(lease_id)}
					and product_id in (select id from products where default_type = 'insurance')
					and start_date <= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'}
					and ( end_date is null or end_date >= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'} )`;
		console.log("sql", sql);
		return connection.queryAsync(sql).then(response => response.length ?  response[0] : null );
	},

	findActiveRecurringInsuranceService(connection, lease_id, date){
		var sql = `SELECT * FROM services
					where status = 1 and recurring = 1 and lease_id = ${connection.escape(lease_id)}
					and product_id in (select id from products where default_type = 'insurance')
					and start_date <= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'}
					and ( end_date is null or end_date >= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'} )`;
		console.log("sqlRecurring ", sql);
		return connection.queryAsync(sql).then(response => response.length ?  response[0] : null );
	},
	
	findFutureInsuranceServices(connection, lease_id, date, params = {}) {
		let sql = `SELECT * FROM services
					WHERE status = 1 AND lease_id = ${connection.escape(lease_id)}
						AND product_id in (select id from products where default_type = 'insurance')
						AND start_date > ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'}
						AND ( end_date is null or end_date > ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'} )
					ORDER BY date(start_date) ASC`;

		console.log("sql : findFutureInsuranceServices", sql);

		return connection.queryAsync(sql).then(response => response.length ? response : null);

	},

	findActiveRentService(connection, lease_id, date){
		var sql = `SELECT * FROM services
					where status = 1 and lease_id = ${connection.escape(lease_id)}
					and product_id in (select id from products where default_type = 'rent')
					and start_date <= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'}
					and ( end_date is null or end_date >= ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'} )`;
		console.log("sql : findActiveRentService", sql);
		return connection.queryAsync(sql).then(response => response.length ?  response[0] : null );
	},

	findFutureRentServices(connection, lease_id, date, params = {}) {
		let sql = `SELECT * FROM services
					WHERE status = 1 AND lease_id = ${connection.escape(lease_id)}
						AND product_id in (select id from products where default_type = 'rent')
						AND start_date > ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'}
						AND ( end_date is null or end_date > ${date ? connection.escape(date.format('YYYY-MM-DD')) : 'CURDATE()'} )
					ORDER BY date(start_date) ASC`;

		console.log("sql : findFutureRentServices", sql);

		return connection.queryAsync(sql).then(response => response.length ? response : null);

	},

	findBillableServices(connection, lease_id, period_start, period_end, company_id, start_limit){
		// Should we change last period_end to period_start since period_start is today, and period end is generally in 1 month.

		var sql = 'SELECT *, (select end_date from invoice_lines where invoice_lines.service_id = services.id order by end_date desc limit 1 ) as last_billed  FROM services where status = 1 and lease_id = ' + connection.escape(lease_id) + ' and (( recurring = 1 and start_date <= ' + connection.escape(period_end.format('YYYY-MM-DD')) + ' and ( end_date is null or end_date >= ' + connection.escape(period_start.format('YYYY-MM-DD')) + ') ) OR ( recurring = 0 and start_date <= ' + connection.escape(period_end.format('YYYY-MM-DD'));

		if(start_limit){
			sql += " and start_date >= " + connection.escape(start_limit.format('YYYY-MM-DD'))
		}
		sql += ' and id not in (select service_id from invoice_lines where service_id is not null )))';

    console.log("findBillableServices api", sql)

		return connection.queryAsync(sql);

	},

	findSecurityService: function(connection, lease_id, company_id){
		var sql = "SELECT * FROM services " +
			" where status = 1 and lease_id = " + connection.escape(lease_id) +
			" and product_id in (select id from products where company_id = " + connection.escape(company_id) + " and default_type = 'security') ";


		return connection.queryAsync(sql).then(function(response){
			if(response.length) return response[0];
			return null;
		});
	},
	findRentchange: function(connection, lease_id, current_date){
		var sql = "(SELECT IFNULL(SUM(price),0) as rent FROM services "+
		 		"where product_id in (select id from products where default_type = 'rent') "+
				"and lease_id = "+ connection.escape(lease_id) + " and start_date <= "+ connection.escape(current_date) +" and (end_date is null or end_date >= "+ connection.escape(current_date) + ") and status = 1 ) "

		console.log("sql: ",sql);

		return connection.queryAsync(sql).then(function(response){
			if(response.length) return response[0].rent;
			return null;
		});;
	},

	findBilledServices:async function(connection, service_id, period_start, period_end, recurring){
		let sql = `
			Select * 
			from invoice_lines 
			where 
				invoice_id not in (select id from invoices where status = -1) 
				and service_id = ${connection.escape(service_id)} 
				and start_date <= ${connection.escape(period_end.format('YYYY-MM-DD'))}`;
		if (recurring) {
			sql += ` and end_date >= ${connection.escape(period_start.format('YYYY-MM-DD'))}`;
		}
		sql += " order by start_date ASC ";


		console.log("findBilledServices - sql", sql);
		return connection.queryAsync(sql);
	},

	findOtherByLeaseId: function (connection, lease_id, period_start, period_end, company_id, recurring, service_type) {
		var sql;
		if(!recurring){
			sql = "SELECT * FROM services " +
				" where status = 1 and lease_id = " + connection.escape(lease_id) +
				" and product_id not in (select id from products where company_id = " + connection.escape(company_id) + " and default_type = 'rent') " +
				" and recurring = " + connection.escape(recurring) +
				" and start_date <= " + connection.escape(period_end.format('YYYY-MM-DD')) +
				" and start_date >= " + connection.escape(period_start.format('YYYY-MM-DD'));
		} else {
			sql = "SELECT * FROM services" +
				" where status = 1 and lease_id = " + connection.escape(lease_id) +
				" and product_id not in (select id from products where company_id = " + connection.escape(company_id) + " and default_type = 'rent') " +
				" and recurring = " + connection.escape(recurring) +
				" and start_date <= " + connection.escape(period_end.format('YYYY-MM-DD')) +
				" and (end_date is null or end_date >= " + connection.escape(period_start.format('YYYY-MM-DD')) + ")";
		}

		if(service_type){
			sql += " and service_type = " + connection.escape(recurring);
		}


		return connection.queryAsync(sql)
	},

	findAllByLeaseId: function (connection, lease_id) {
		var sql = "Select * from services where status = 1 and lease_id = " + connection.escape(lease_id) + " order by id asc ";

		return connection.queryAsync(sql);
	},

	findLeaseService(connection, lease_id){
		var sql = "Select * from services where status = 1 and lease_id = " + connection.escape(lease_id) + " and services_type = 'lease' order by id asc ";
		return connection.queryAsync(sql);
	},

	save: function(connection, data, id){
		var sql;
        if(typeof id != 'undefined' && id){
            if (connection?.meta?.contact_id) {
                data.modified_by = connection.meta.contact_id;
            }
            sql = "Update services set ? where id = " + connection.escape(id);
        } else {
            if (connection?.meta?.contact_id) {
                data.created_by = connection.meta.contact_id;
            }
            sql = "Insert into services set ? ";
        }
		return connection.queryAsync(sql, data);

	},

	delete: function(connection, id){
		var sql = "UPDATE services set status = 0";
		if (connection?.meta?.contact_id) {
			sql += ",modified_by = " + connection.escape(connection.meta.contact_id);
		}
		sql += " where id = " + connection.escape(id);
		console.log('sql : service->delete ', connection.format(sql));
		return connection.queryAsync(sql);

	},

	hasBeenBilled: function(connection, id){
		var sql = "select * from invoice_lines where service_id = " + connection.escape(id) + ' order by end_date DESC';
		return connection.queryAsync(sql).then(function(result){
			return result.length? result[0]: null;
		});
	},

	findlastbilledInvoice:function(connection, id, date){
		var sql = `SELECT  il.* FROM invoice_lines il INNER JOIN invoices i ON il.invoice_id = i.id
		WHERE (service_id = ${connection.escape(id)} and status <> - 1) or (period_start <= ${connection.escape(date)} and period_end >= ${connection.escape(date)} and service_id = ${connection.escape(id)})
		ORDER BY end_date DESC;`
		console.log("SQLLLLLLLLL: ",sql);
		return connection.queryAsync(sql).then(function(result){
			return result.length? result[0]: null;
		});
	},
	
	deletePropertyBill(connection, id){
		var sql = "UPDATE services set status = 0";
		if (connection?.meta?.contact_id) {
			sql += ",modified_by = " + connection.escape(connection.meta.contact_id);
		}
		sql += " where property_bill_id = " + connection.escape(id);
		console.log('sql : deletePropertyBill ', connection.format(sql));
		return connection.queryAsync(sql);
	},

	deleteInsuranceServices(connection, lease_id){
		var sql = "UPDATE services set status = 0";
		if (connection?.meta?.contact_id) {
			sql += ",modified_by = " + connection.escape(connection.meta.contact_id);
		}
		sql += " where service_type = 'insurance' and lease_id = " + connection.escape(lease_id);
		console.log('sql : deleteInsuranceServices ', connection.format(sql));
		return connection.queryAsync(sql);
	},

	updateServicesInBulk(connection, data, service_ids) {
        let sql = `UPDATE services SET ?`;
		if (connection?.meta?.contact_id) {
			data.modified_by = connection.escape(connection.meta.contact_id);
		}
        sql += ` WHERE id IN (${service_ids.map(s_id => connection.escape(s_id)).join(',')})`;
        console.log('sql : updateServicesInBulk ', connection.format(sql, data));
        return connection.queryAsync(sql, data);
    }

}
