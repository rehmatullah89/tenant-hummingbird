var moment = require('moment');

module.exports = {

	in(snippet){
		return " in (" + snippet + ")";
	},

	equals(snippet){
		return " = " + snippet;
	},


	lease_balance(lease_id, comparison){
		comparison = comparison || ' = ';
		lease_id = lease_id || 'leases.id ';
		return  "IFNULL((SELECT SUM(IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0)) FROM invoices WHERE status = 1 and lease_id " + comparison + " " + lease_id + " ),0)";
	},


	invoice_total(invoice_id){
		/* Gets a total for an invoice.  Leave invoice_id null to use as a subselect */
		invoice_id = invoice_id || ' = invoices.id ';

		return "(SELECT SUM(IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)) FROM invoices WHERE status = 1 and id " + invoice_id + ")";
		// return "(SELECT ROUND(SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + (((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL((SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0))), 2) FROM invoice_lines WHERE invoice_id " + invoice_id + ")";
	},

	invoice_payment_total(invoice_id){
		/* Gets a total payments on an invoice for an invoice.  Leave invoice_id null to use as a subselect */
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(total_payments),0) FROM invoices WHERE status = 1 and id " + invoice_id + " )";
	},

	invoice_balance(invoice_id){
		invoice_id = invoice_id || ' = invoices.id ';
		return this.invoice_total(invoice_id) + " - " +  this.invoice_payment_total(invoice_id);
	},

	invoice_discounts_total(invoice_id){
		/* Gets a total for an invoice.  Leave invoice_id null to use as a subselect */
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(total_discounts,0) FROM invoices WHERE status = 1 and id " + invoice_id + ")"
	},

	invoice_sales_tax(invoice_id){
		/* Gets a total for an invoice.  Leave invoice_id null to use as a subselect */
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(total_tax,0) FROM invoices WHERE status = 1 and id " + invoice_id + ")"
	},



	current_lease_sql(){
		return "select id from leases where leases.unit_id = units.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null ) and leases.status = 1";
	},

	current_lease_invoice_total(){
		return this.invoice_total(this.in("select id from invoices where status = 1 and invoices.lease_id in ( " +  this.current_lease_sql()   + " ))"));
		// from leases where leases.unit_id = units.id and start_date <= CURDATE() and ( end_date >= CURDATE() or end_date is null ) and leases.status = 1";
	},


	lease_lifetime_billed(identifier, operator = '='){
		return "(SELECT SUM(IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)) from invoices i where i.status = 1 and i.lease_id " + operator + " " + identifier + "  )";
		//return "(SELECT ROUND(SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + (((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL((SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0))), 2) FROM invoice_lines WHERE invoice_id in (select id from invoices i where  i.status = 1 and i.lease_id " + operator + " " + identifier + "  ))";
	},

	lease_lifetime_payments(identifier, operator = '='){
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id in (select id from invoices where lease_id " + operator + " " + identifier + ") and payment_id in (select id from payments p where p.status = 1 and p.credit_type = 'payment') )";
	},

	lease_total_writeoffs(identifier, operator = '='){
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id in (select id from invoices where lease_id " + operator + " " + identifier + ") and payment_id in (select id from payments p where p.status = 1 and p.credit_type = 'loss') )";
		//return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in (select id from payments p where p.status = 1 and p.credit_type = 'loss') and invoice_id  in (select id from invoices where lease_id " + operator + " " + identifier + "))";
	},

	lease_total_credits(identifier, operator = '='){
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id in (select id from invoices where lease_id " + operator + " " + identifier + ") and payment_id in (select id from payments p where p.status = 1 and p.credit_type = 'credit') )";
		//return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in (select id from payments p where p.status = 1 and p.credit_type = 'credit') and invoice_id  in (select id from invoices where lease_id " + operator + " " + identifier + "))";
	},

	invoice_payments(invoice_id){
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in (select id from payments p where p.status = 1 and credit_type = 'payment') and invoice_id " + invoice_id + ")";
	},
	invoice_credits(invoice_id){
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in (select id from payments p where p.status = 1 and credit_type = 'credit') and invoice_id " + invoice_id + ")";
	},
	invoice_writeoffs(invoice_id){
		invoice_id = invoice_id || ' = invoices.id ';
		return "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in (select id from payments p where p.status = 1 and credit_type = 'loss') and invoice_id " + invoice_id + ")";
	},
    lease_next_billing_date(lease_bill_day, date, lease_id){
		lease_id = lease_id || 'l.id';
		return "(SELECT IF(DAY('"+date+"') < " + lease_bill_day + ", " + 
		"STR_TO_DATE(CONCAT(YEAR('"+date+"'),'-',LPAD(MONTH('"+date+"'),2,'00'),'-',LPAD((SELECT if(bill_day = 31, if(MONTH('"+date+"') not in (1,3,5,7,8,10,12), '30','31'),if(bill_day=29 and MONTH('"+date+"') = 2, if(last_day('"+date+"')=bill_day,bill_day,'28'),bill_day)) FROM leases WHERE id =  "+lease_id+"),2,'00')), '%Y-%m-%d')," + 
		"STR_TO_DATE(CONCAT(YEAR(DATE_ADD('"+date+"', INTERVAL 1 MONTH)),'-',LPAD(MONTH(DATE_ADD('"+date+"', INTERVAL 1 MONTH)),2,'00'),'-',LPAD((SELECT if(bill_day = 31, if(MONTH((DATE_ADD('"+date+"', INTERVAL 1 MONTH))) not in (1,3,5,7,8,10,12), '30','31'),if(bill_day=29 and MONTH((DATE_ADD('"+date+"', INTERVAL 1 MONTH))) = 2, if(last_day(DATE_ADD('"+date+"', INTERVAL 1 MONTH))=bill_day,bill_day,'28'),bill_day)) FROM leases WHERE id =  "+lease_id+"),2,'00')), '%Y-%m-%d') ))";
	},
	lease_paid_through_date(lease_id, date){
		date = date || moment().format('YYYY-MM-DD');
		// TODO add balance column to invoices...
		return "(SELECT MAX(end_date) from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id in (select id from invoices i  where i.status = 1 and lease_id = " + lease_id  + " and ( IFNULL(subtotal,0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) -  ( SELECT IFNULL(SUM(amount),0) from invoices_payments_breakdown where invoice_id = i.id and date <= '" + date + "')) = 0 ))"

	},

	unit_overlocked_status(unit_id, date){
		date = date ? `" ${date} "` : 'CURDATE()';

		return " (SELECT IF( " +
				" (SELECT id from units where id = " + unit_id + " and id not in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <= " + date + " and (end_date is null or end_date > " + date + ") and to_overlock = 1)), " +
				" 'To Overlock'," +
					"IF( " +
					" (SELECT id from units where id = " + unit_id + " and id in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where (status = 1 and start_date <= " + date + " and (end_date is null or end_date >= CURDATE()) and to_overlock = 0))), " +
					" 'Remove Overlock'," +
					"IF( " +
						" (SELECT id from units where id = " + unit_id + " and id in (select unit_id from overlocks where status = 1) ), " +
						" 'Overlocked'," +
						" 'Unlocked' " +
					" ) " +
					" ) " +
				" ) " +
				" ) "
	},

	lease_auction_status(lease_id){
		return " (SELECT IF( " +
				" ((SELECT auction_status from leases where id = " + lease_id + ") = 'schedule' ), " +
				" 'To Schedule'," +
				"IF( " +
				" ((SELECT auction_status from leases where id = " + lease_id + ") = 'scheduled' ), " +
				" 'Scheduled'," +
					"IF( " +
					" ((SELECT auction_status from leases where id = " + lease_id + ") = 'auction_day' ), " +
					" 'Auction Day'," +
					"IF( " +
						" ((SELECT auction_status from leases where id = " + lease_id + ") = 'auction_payment' ), " +
						" 'Auction Payment'," +
						"IF( " +
						" ((SELECT auction_status from leases where id = " + lease_id + ") = 'move_out' ), " +
						" 'To Move Out'," +
						" 'Complete' " +
						" ) " +
					" ) " +
					" ) " +
				" ) " +
				" ) " +
			" ) "
	},

	// TODO add Overlocked
	unit_status(unit_id, date, time){
		date = date ? `" ${date} "` : 'CURDATE()';
		facility_time = time ? `" ${time} "` : `(select CONVERT_TZ(now(),"+00:00",utc_offset) from properties where id = (select property_id from units where id = ${unit_id}))`;
		time = time ? `" ${time} "` : 'now()';

		return " (SELECT IF( " +
			" (select status from unit_status_changes where unit_id = " + unit_id + " and status in ('activated','deactivated') order by created_at desc limit 1 ) = 'deactivated', " +
			" 'Deactivated', " +
				"IF( " +
				" (SELECT id from units where id = " + unit_id + " and id not in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <= " + date + " and (end_date is null or end_date > " + date + ") and to_overlock = 1)), " +
				" 'To Overlock'," +
				"IF( " +
				" (SELECT id from units where id = " + unit_id + " and id in (select unit_id from overlocks where status = 1) and id in (select unit_id from leases where status = 1 and start_date <= " + date + " and (end_date is null or end_date >= CURDATE()) and to_overlock = 0)), " +
				" 'Remove Overlock'," +
					"IF( " +
					" (SELECT id from units where id = " + unit_id + " and id in (select unit_id from overlocks where status = 1) ), " +
					" 'Overlocked'," +
					"IF( " +
						" (SELECT id from leases where start_date <= " + date + " and (end_date > " + date + " or end_date is null ) and status = 1 and unit_id = " + unit_id + " HAVING MAX(id) ) IS NOT NULL, " +
						" 'Leased', " +
						" IF( " +
						" (SELECT id from leases where status = 2 and unit_id = " + unit_id + " HAVING MAX(id) ) IS NOT NULL, " +
						" 'Pending', " +
						" IF( " +
							" (SELECT id from leases where (end_date > " + date + " or end_date is null ) and status = 0 and unit_id = " + unit_id + " and id in ( SELECT lease_id from reservations where expires >= " + facility_time + " ) HAVING MAX(id) ) IS NOT NULL, " +
							" 'Reserved', " +
							" IF( " +
							" (SELECT id from leases where start_date > " + date + " and unit_id = " + unit_id + " and (end_date > " + date + " or end_date is null ) and status = 1 HAVING MAX(id) ) IS NOT NULL, " +
							" 'Future Leased', " +
							" IF( " +
								" ( select unit_id from unit_holds where expires > " + time + " and unit_id = " + unit_id + ") IS NOT NULL, " +
								" 'On Hold', " +
								" IF( " +
								" ((select status from unit_status_changes usc where unit_id = " + unit_id + "and usc.date <="+ date +" and status in ('online','offline') order by created_at desc limit 1) = 'offline' or (select available_date from units where id = " + unit_id + " )  > " + date + "), " +
								" 'Offline', " +
									" 'Available' " +
								" ) " +
								" ) " +
							" ) " +
							" ) " +
						" ) " +
						" ) " +
					" ) " +
					" ) " +
				" ) " +
				" ) " +
			" ) "
	},
	unit_amenity(amenity_name, amenity_category_id){
		return `(select au.value from amenity_units au where unit_id = u.id and amenity_property_id in (select id from amenity_property  where property_id = u.property_id and amenity_category_id = ${amenity_category_id} and property_type = u.type and amenity_name = '${amenity_name}') )`
	},

	lease_next_invoice_total(lease_id, billing_date){

		billing_date = billing_date || 'CURDATE()';

		return `( select
				(
					-- Sum of Services other then Rent
					select IFNULL( sum(services.price * services.qty), 0) from products join services on services.product_id = products.id where 
					(services.end_date <= ${billing_date} or services.end_date is null) and services.lease_id = ${lease_id} and products.default_type != 'rent' and services.recurring = 1
				) +	
				(
					-- Rent after applying discount
					select IFNULL(((Max(pr.discount_rent) * 2) - Sum(pr.discount_rent)), 0) + IFNULL((pr.taxr / 100), 0) *  IFNULL(((Max(pr.discount_rent) * 2) - Sum(pr.discount_rent)), 0) from (
					select
						discounts.id,
						property_tax_profile.tax_rate as taxr,
						services.lease_id as s_lease_id,
					case
						WHEN discounts.type = 'percent' then services.price - ((services.price) * (discounts.value / 100))
						WHEN discounts.type = 'dollar' then services.price - discounts.value
						WHEN discounts.type = 'fixed' then discounts.value
						ELSE services.price
					end as discount_rent
					from products
						join 
						services on services.product_id = products.id and 
						(services.end_date <= ${billing_date} or services.end_date is null)  and products.default_type = 'rent'
						LEFT join 
						property_tax_profile on property_tax_profile.property_id = (
							select units.property_id from leases join units on leases.unit_id = units.id where leases.id = services.lease_id
									) and services.taxable = 1 and property_tax_profile.type = 
						(select type from units join leases on leases.unit_id = units.id where leases.id = services.lease_id )
						LEFT join
						discounts on discounts.lease_id = services.lease_id and (end is null or end >= ${billing_date})
					) pr
					where pr.s_lease_id = ${lease_id}
				) +
				(
					select IFNULL((sum((property_tax_profile.tax_rate / 100) * services.price)), 0) from property_tax_profile join services join products
					on services.product_id = products.id and (services.end_date <= ${billing_date} or services.end_date is null) 
					and services.recurring = 1 and services.taxable = 1 and property_id = (
						select units.property_id from leases join units on leases.unit_id = units.id where leases.id = services.lease_id
					) 
					and products.default_type != 'rent'
					and property_tax_profile.type = 
					case 
						WHEN products.default_type = 'rent' then (select type from units join leases on leases.unit_id = units.id where leases.id = services.lease_id )
						WHEN products.default_type = 'product' then 'merchandise'
						WHEN products.default_type = 'late' then 'fee'
						else products.default_type
					end
					where services.lease_id = ${lease_id}
				)
		)`;
	},
	delinquency_process(delinquencies_id){
		return `SELECT id, (select name from triggers WHERE id = trigger_id)  as stage, execution_date, completed, deleted, delinquencies_id, null as reason from delinquencies_actions where deleted is null and delinquencies_id = ${delinquencies_id}
				UNION
		SELECT id, "Paused", start, ended_at, null,  delinquencies_id, reason FROM delinquencies_pauses where delinquencies_id = ${delinquencies_id} order by execution_date DESC `;
		
	},

	get_deactivated_spaces() {
		return 'select unit_id from unit_status_changes where status="deactivated" and id in (select max(usc.id) from unit_status_changes as usc where usc.status in ("activated","deactivated") group by usc.unit_id)';
	},

	get_payment_allocation(payment_id, params){

		let { date, product_types = [], line_type = '' } = params;
		let query = `(SELECT IFNULL(SUM(amount),0) FROM invoice_lines_allocation ila 
					WHERE ila.invoice_payment_breakdown_id IN (SELECT id FROM invoices_payments_breakdown WHERE payment_id = ${payment_id})
					AND ila.date <= '${date}'`;
		
		if(product_types.length){
		query += ` AND (SELECT default_type FROM products WHERE id IN (SELECT product_id FROM invoice_lines WHERE id = ila.invoice_line_id)) IN (${product_types.map(pt => `'${pt}'`).join(',')})`;
		}

		if(line_type){
		query += ` AND ila.type = '${line_type}'`;
		}

		query += ')';

		return query;

	}

}
