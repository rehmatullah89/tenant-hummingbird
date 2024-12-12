var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {

	salesTax(connection, conditions, searchParams, company_id, count){

		var sql = "SELECT *, ";

		// address

		sql += " (select concat(address, ' ', city, ' ', state, ' ', zip) from addresses where id = (select address_id from units where id = (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as address, ";

		// Unit number
		sql += " (select number from units where id = (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id))) as unit_number, ";

		//product_name
		sql += " (select name from products where id = invoice_lines.product_id ) as product_name, ";

		//invoice_number
		sql += " (select number from invoices where id = invoice_lines.invoice_id ) as invoice_number, ";

		//subtotal - amt before discounts price * qty


		//discounts
		sql += " (select IFNULL(SUM(amount),0) from discount_line_items where invoice_line_id = invoice_lines.id and pretax = 1 ) as discount_pre_tax, ";

		sql += " (select IFNULL(SUM(amount),0) from discount_line_items where invoice_line_id = invoice_lines.id and pretax = 1 ) as discount_post_tax, ";


		//taxable_amount


		//tax_rate
		sql += " (select taxrate from tax_line_items where invoice_line_id = invoice_lines.id ) as taxrate ";

		//total_tax
		sql += " from invoice_lines where 1 = 1 ";


		if(conditions.property_id && conditions.property_id.length){

			sql += " and invoice_id in (select id from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + connection.escape(conditions.property_id) + "))))";
		}

		if(conditions.product_id && conditions.product_id.length){
			sql += " and product_id in (" + connection.escape(conditions.product_id) + ")";
		}

		if(conditions.timeframe.start && conditions.timeframe.end){
			sql += " and date BETWEEN " + connection.escape(moment(conditions.timeframe.start).format('YYYY-MM-DD')) + " AND " + connection.escape(moment(conditions.timeframe.end).format('YYYY-MM-DD'));
		}

		// company_id
		sql += " and invoice_id in (select id from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " )))) ";

		 sql += " and (select id from tax_line_items where invoice_line_id = invoice_lines.id ) is not null ";
		 sql += "  ORDER BY date desc ";



		return connection.queryAsync(sql);

	},
	revenueCollected(connection, conditions, searchParams, company_id, count){

		var sql = "Select *, ";
		sql +=" (select concat(address, ' ', city, ' ', state, ' ', zip) from addresses where id in (select address_id from units where id in (select unit_id from leases where id = payments.lease_id))) as address, ";
		sql += ' (select property_id from units where id in (select unit_id from leases where id = payments.lease_id)) as property_id, ';
		sql += ' (select IFNULL(SUM(amount),0) from refunds where refunds.payment_id = payments.id) as refunds ';
		sql += ' FROM payments WHERE 1 = 1  ';

		// limit to company
		sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ))) ";


		if(conditions.property_id && conditions.property_id.length){
			sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + connection.escape(conditions.property_id) + "))) ";
		}

		sql += "  ORDER BY address asc ";
		return connection.queryAsync(sql);

	},

	revenueCollectedByPaymentType(connection, conditions, searchParams, company_id, count){
		var sql = "Select *, ";
		sql += ' (select card_type from payment_methods where id = payments.payment_methods_id) as payment_method, ';
		sql += ' (select IFNULL(SUM(amount),0) from refunds where refunds.payment_id = payments.id) as refunds ';
		sql += ' FROM payments WHERE 1 = 1  ';

		// limit to company
		sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ))) ";


		if(conditions.property_id && conditions.property_id.length){
			sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + connection.escape(conditions.property_id) + "))) ";
		}

		sql += "  ORDER BY payment_method asc ";
		return connection.queryAsync(sql);

	},
	actualRent(connection, conditions, searchParams, company_id, count){
		var sql = '';

		sql = "SELECT *,  " +

		" (select id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as property_id, " +
		" (select number from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) as unit_number, " +

		" (select id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) as unit_id ";
		//TODO discount lines
		sql += " FROM invoice_lines where 1 = 1 " ;


		if(conditions.property_id && conditions.property_id.length){
			sql += " and (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) in (" + connection.escape(conditions.property_id) + ")";
		}

		sql += " and product_id in ( select id from products where LOWER(default_type) = 'rent' )";

		if(conditions.timeframe.start && conditions.timeframe.end){
			sql += " and date BETWEEN " + connection.escape(moment(conditions.timeframe.start).format('YYYY-MM-DD')) + " AND " + connection.escape(moment(conditions.timeframe.end).format('YYYY-MM-DD'));
		}

		sql += " and (select company_id from properties where id = (select property_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) = " + connection.escape(company_id);

		// if(searchParams){
		// 	if(searchParams.sort){
		// 		sql += " order by ";
		// 		switch (searchParams.sort){
		// 			default:
		// 				sql += searchParams.sort;
		//
		// 		}
		// 		sql += ' ' + searchParams.sortdir;
		// 	}
		//
		// 	if(searchParams.limit){
		//
		// 		sql += " limit ";
		// 		sql += searchParams.offset;
		// 		sql += ", ";
		// 		sql += searchParams.limit;
		// 	}
		// }
		console.log(sql);
		return connection.queryAsync(sql);
	},

	vacancyRent(connection, conditions, searchParams, company_id, count){
		var sql = '';

		sql = "SELECT *  ";
		sql += " FROM units where 1 = 1 " ;

		if(conditions.property_id && conditions.property_id.length){
			sql += " and (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) in (" + connection.escape(conditions.property_id) + ")";
		}

		if(conditions.unit_id && conditions.unit_id.length){
			sql += " and id not in (" + connection.escape(conditions.unit_id) + ")";
		}

		sql += " and (select company_id from properties where id = units.property_id ) = " + connection.escape(company_id);

		// if(searchParams){
		// 	if(searchParams.sort){
		// 		sql += " order by ";
		// 		switch (searchParams.sort){
		// 			default:
		// 				sql += searchParams.sort;
		//
		// 		}
		// 		sql += ' ' + searchParams.sortdir;
		// 	}
		//
		// 	if(searchParams.limit){
		//
		// 		sql += " limit ";
		// 		sql += searchParams.offset;
		// 		sql += ", ";
		// 		sql += searchParams.limit;
		// 	}
		// }


		return connection.queryAsync(sql);


	}
};