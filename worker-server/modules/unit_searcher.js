

var Sql  = require('./sql_snippets');
var moment  = require('moment');

var availableColumns = [
	'Address',
	'Beds',
	'Baths',
	'Sqft',
	'Floor',
	'Width',
	'Length',
	'Height',
	'Rent',
	'Image',
	'Category',
	'Lease',
	'Reservation',
	'Hold',
	'Payment',
	'Past Due'
];


var queryOptions = {
	petOptions:                 ['Allowed', 'Not allowed', 'Allowed with pet deposit'],
	parkingOptions:             ["Included", "Not included", "Extra charge", "Other"],
	classificationOptions:      ['Apartment', 'Single Family Home', 'Condo', 'Townhouse', 'Duplex', 'Other'],
	laundryOptions:             ["In Unit", "On Premises", "None"],
	storageTypeOptions:         ["Self Storage", "Wine Storage", "Locker", "Outdoor Space", "Cold Storage"],
	doorTypeOptions:            ["Roll-up Door", "Swing Door"],
	vehicleStorageOptions:      ["Vehicles Only", "Storage or Vehicles", "No"],
};

class UnitSearcher {

	constructor(company_id, unit_type) {
		this.company_id = company_id;
		this.unit_type = unit_type;

		this.columns = availableColumns;
		this.sql_conditions = '';
		this.sql_base = '';

		this.sql_count_base = "Select count(*) as count from units where 1 = 1 and type = '" + unit_type + "' and  (select company_id from properties where id = units.property_id ) = " + company_id;
		this.sql_order = '';
		this.sql = '';
		this.count_sql = '';
	}

	set_columns(cols){
		this.columns = cols.filter(c =>  availableColumns.indexOf(c) >= 0 );
	}

	set_limit(offset, limit){
		if(limit){
			this.sql_order += ' limit ' + offset + ', ' + limit;
		}
	}

	build_amenity_conditions_from_array(connection, label, optionLabel, chosen){
		this.build_conditions(' and (');


		if(optionLabel) {
			var options = queryOptions[optionLabel];
			var filtered = chosen.filter(c => options.indexOf(c) >= 0);
		} else {
			var filtered = chosen;
		}

		if(!filtered.length) return;

		filtered.forEach( c => {
			this.build_conditions(' (select value from amenity_units where unit_id = units.id and amenity_id = (select id from amenities where lower(name) = ' + connection.escape(label) +' and property_type = ' + connection.escape(this.unit_type) + ')) = ' + connection.escape(c.toLowerCase()) + ' OR');
		});
		this.trim_query(2);
		this.build_conditions(') ');

	}


	build_amenity_conditions_gt(connection, label, min){
		this.build_conditions(' and (');


		this.build_conditions(' (select value from amenity_units where unit_id = units.id and amenity_id = (select id from amenities where lower(name) = ' + connection.escape(label) +' and property_type = ' + connection.escape(this.unit_type) + ')) >= cast(' + connection.escape(min) + " as decimal(5,2))" );

		this.build_conditions(') ');

	}



	trim_query(length = 2){
		this.sql_conditions  = this.sql_conditions.substring( 0, this.sql_conditions.length - length );
	}

	build_conditions(query_part){
		this.sql_conditions += query_part;
	}
	build_query(){
		return this.sql_base + this.sql_conditions + this.sql_order;
	}
	build_count_query(){
		return this.sql_count_base + this.sql_conditions ;
	}

	build_query_fields(){

		this.sql_base = " select * ";

		this.columns.map(c => {
			switch(c){
				case 'Address':
					this.query_address();
					break;
				case 'Category':
					this.query_category();
					break;
				case 'Beds':
				case 'Baths':
				case 'Sqft':
				case 'Width':
				case 'Length':
				case 'Height':
				case 'Floor':
					this.query_amenity(c);
					break;

				case 'Image':
					this.query_image();
					break;

				case 'Lease':
					this.query_lease();
					break;

				// case 'Rent':  // Future - will be dynamica pricing
				// 	this.query_address();
				// 	break;
				case 'Reservation':
					this.query_reservation();
					break;
				case 'Hold':
					this.query_hold();
					break;
				case 'Payment':
					this.query_payment();
					break;

				case 'Past Due':
					// this.query_past_due();
					break;
			}
		});
		this.sql_base += " FROM units WHERE 1 = 1 and type = '" + this.unit_type + "'and (select company_id from properties where id = units.property_id ) = " + this.company_id;
	}


	set_status_conditions(status_list){

		this.sql_conditions += ' and (';
		if(status_list.indexOf('leased') >= 0) this.set_condition_leased();
		if(status_list.indexOf('pending') >= 0) this.set_condition_pending();
		if(status_list.indexOf('reserved') >= 0) this.set_condition_reserved();
		if(status_list.indexOf('available') >= 0) this.set_condition_available();
		if(status_list.indexOf('on_hold') >= 0) this.set_condition_on_hold();
		if(status_list.indexOf('offline') >= 0) this.set_condition_offline();
		if(status_list.indexOf('lockout') >= 0) this.set_condition_lockout();
		if(status_list.indexOf('default') >= 0) this.set_condition_default();
		if(status_list.indexOf('auction') >= 0) this.set_condition_auction();


		if(status_list.indexOf('past_due') >= 0) this.set_condition_past_due();
		if(status_list.indexOf('lockout') >= 0) this.set_condition_lockout();
		if(status_list.indexOf('auction') >= 0) this.set_condition_auction();
		this.trim_query(3);

		this.sql_conditions += ' ) ';
	}

	set_condition_leased(){
		this.sql_conditions += " id in (  (select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and " +
			" status = 1 )) or ";
	}

	set_condition_pending(){
		this.sql_conditions += " id in ( (select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and " +
			" status = 2 )) or ";
	}

	set_condition_reserved(){
		this.sql_conditions += " id in ( ( select unit_id from leases where status = 0 and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and id in ( " +
			"  select id from reservations where expires > now() ) ) ) or ";
	}

	set_condition_on_hold(){
		this.sql_conditions += " id in ( ( select unit_id from leases where where status = 0  and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and id in ( " +
			"  select id from unit_holds where expires > now() ) ) ) or ";
	}

	set_condition_available(){
		this.sql_conditions += " ( status = 1 and available_date <= '" + moment().format('YYYY-MM-DD') + "' ) and " +
		" id not in ( ( select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) ) ) and " +
		" id not in (( select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 0  and leases.id in ( select  lease_id from reservations where expires > now()))) and " +
		" id not in ((select unit_id from unit_holds where expires > now())) or ";
	}

	set_condition_offline(){
		this.sql_conditions += " ( status = 0 or available_date > '" + moment().format('YYYY-MM-DD') + "' ) and " +
			" id not in ( ( select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) ) ) and " +
			" id not in (( select unit_id from leases where start_date <= '" + moment().format('YYYY-MM-DD') + "' and ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 0  and leases.id in ( select  lease_id from reservations where expires > now()))) and " +
			" id not in ((select unit_id from unit_holds where expires > now())) or ";
	}

	set_condition_past_due(){


	}

	set_condition_lockout(){


	}

	set_condition_default(){

	}

	set_condition_auction(){

	}

	query_address(){
		this.sql_base += ", (select address from addresses where addresses.id = units.address_id ) as address, " +
			" (select city from addresses where addresses.id = units.address_id ) as city, " +
			" (select state from addresses where addresses.id = units.address_id ) as state, " +
			" (select zip from addresses where addresses.id = units.address_id ) as zip ";
	}

	query_category(){
		this.sql_base += ", (select name from unit_categories where unit_categories.id = units.category_id ) as category_name, " +
			" (select id from unit_categories where unit_categories.id = units.category_id ) as category_id ";
	}

	query_amenity(name){
		this.sql_base += ", (select value from amenity_units where unit_id = units.id and amenity_id = (select id from amenities where lower(name) = '" + name.toLowerCase() + "' and property_type = '" + this.unit_type + "')) as " + name.toLowerCase();
	}

	query_image(){
		this.sql_base += ", (select name from uploads where uploads.foreign_id = units.id and model = 'unit' and type = 'image' order by `sort` ASC, `id` ASC limit 1 ) as unit_image_filename, " +
			" (select id from uploads where uploads.foreign_id = units.id and model = 'unit' and type = 'image' order by `sort` ASC, `id` ASC limit 1) as unit_image_id ";
		// TODO can query property images if no unit images
	}

	query_past_due() {
		this.sql_base += ", (SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id in (select id from invoices where invoices.lease_id in ( " +
			// Narrow to our lease
			" select id from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and leases.status in (1,2) " +
			// End Narrow
			" ))) - (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id in (" +

			// Narrow to our lease
			" select id from invoices where due < '" +  moment().format('YYYY-MM-DD') + "' and invoices.lease_id in (select id from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and leases.status in (1,2) " +
			// End Narrow
			"))) AS past_due ";
	}

	query_lease() {
		this.sql_base += ", (select id from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) limit 1) as lease_id, " +

			" (select start_date from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) limit 1) as lease_start_date, " +

			" (select end_date from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) limit 1) as lease_end_date, " +

			" (select status from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) limit 1) as lease_status, " +

			" (select rent from leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status in (1,2) limit 1) as lease_rent,  " +

			// Balance --


			"(" + Sql.invoice_total(Sql.in("select id from invoices where invoices.lease_id in ( " +  Sql.current_lease_sql()   + " )")) + " - " + Sql.invoice_payment_total(Sql.in("select id from invoices where invoices.lease_id in ( " +  Sql.current_lease_sql()   + " )")) + ") AS balance ";


	}

	query_reservation(){
		this.sql_base += ", (select id from reservations where reservations.lease_id in ( select id FROM leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 0) and expires > now() limit 1) as reservation_id, " +

			" (select expires from reservations where reservations.lease_id in ( select id FROM leases where leases.unit_id = units.id and start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
			" ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 0) and expires > now() limit 1) as reservation_expires ";
		
	}

	query_hold(){
		this.sql_base += ", (select id from unit_holds where unit_holds.unit_id = units.id and expires > now() limit 1) as unit_hold_id," +
			" (select id from unit_holds where unit_holds.unit_id = units.id and expires > now() limit 1) as unit_hold_expires ";

	}

	query_payment(){
		this.sql_base += ", (select id from payments where lease_id in ( " + Sql.current_lease_sql() + ") order by date desc limit 1  ) as payment_id,  " +

		" (select date from payments where lease_id in ( " + Sql.current_lease_sql() + "  ) order by date desc limit 1  ) as payment_date, " +

		" (select amount from payments where lease_id in ( " + Sql.current_lease_sql() + "  ) order by date desc limit 1  ) as payment_amount ";

	}

	set_sort(field, dir = 'ASC'){

		this.sql_order = ' order by ';

		switch(field){
			case "price":
				this.sort_price(dir);
				break;
			case "available_date":
				this.sort_available_date(dir);
				break;
			case "address":
				this.sort_unit_number(dir);
				break;
			case "balance":
				this.sort_balance(dir);
				break;
			case "past_due":
				this.sort_past_due(dir);
				break;
			default:
				if(availableColumns.map(c => c.toLowerCase()).indexOf(field) >= 0){
					this.sql_order += field + ' ' + dir;
				} else {
					this.sort_available_date(dir);
				}
		}
	}

	sort_price(dir){
		this.sql_order += ' units.price ' + dir + ',  units.available_date ASC '
	}

	sort_available_date(dir){
		this.sql_order += ' units.available_date ' + dir;
	}

	sort_unit_number(dir){
		this.sql_order += ' address ' + dir + ', number * 1 ' + dir;
	}

	sort_balance(dir){
		this.sql_order += ' balance ' + dir;
	}

	sort_past_due(dir){
		this.sql_order += ' past_due ' + dir;
	}

}



module.exports = UnitSearcher;