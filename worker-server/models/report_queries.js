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

		console.log(sql);
		return connection.queryAsync(sql);

	}
};