const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};


let lease_id = ' payment_methods.lease_id ';
let unit_id = sb('unit_id', 'leases', 'id', '=', lease_id);
let property_id = sb('property_id', 'units', 'id', '=', unit_id);
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let category_id = sb('category_id', 'units',  'id', '=', unit_id);
let payment_id = sb('id', 'payments',  'payment_method_id', '=', 'payment_methods.id');
let address_id = "address_id";
let contact_id = "(SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1)";
let tenant_address_id = "(select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";



module.exports = {

  property_id:          property_id,
  property_name:        sb('name', 'properties', 'id', '=', property_id),
  property_number:      sb('number', 'properties', 'id', '=', property_id),
  property_address:     sb('address', 'addresses', 'id', '=', property_id),
  property_address2:    sb('address2', 'addresses', 'id', '=', property_address_id),
  property_city:        sb('city', 'addresses', 'id', '=', property_address_id),
  property_state:       sb('state', 'addresses', 'id', '=', property_address_id),
  property_country:     sb('country', 'addresses', 'id', '=', property_address_id),
  property_zip:         sb('zip', 'addresses', 'id', '=', property_address_id),

  unit_id:              unit_id,
  unit_number:          sb('number', 'units', 'id', '=', unit_id),
  unit_floor:           sb('floor', 'units', 'id', '=', unit_id),
  unit_type:            sb('type', 'units', 'id', '=', unit_id),
  unit_description:     sb('description', 'units', 'id', '=', unit_id),
  unit_available_date:  sb('available_date', 'units', 'id', '=', unit_id),
  unit_price:           sb('price', 'units', 'id', '=', unit_id),
  unit_featured:        sb('featured', 'units', 'id', '=', unit_id),
  unit_category_id:     sb('id', 'unit_categories', 'id', '=', category_id),
  unit_category:        sb('name', 'unit_categories', 'id', '=', category_id),
  unit_overlocked:     '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',


  tenant_id:                  contact_id,
  tenant_first:               " (SELECT first FROM contacts WHERE id = " + contact_id + ") ",
  tenant_last:                " (SELECT last FROM contacts WHERE id = " + contact_id + ") ",
  tenant_address:             "(SELECT address from addresses where id = " + tenant_address_id+ ")",
  tenant_address2:            "(SELECT address2 from addresses where id = " + tenant_address_id+ ")",
  tenant_city:                "(SELECT city from addresses where id = " + tenant_address_id+ ")",
  tenant_state:               "(SELECT state from addresses where id = " + tenant_address_id+ ")",
  tenant_country:             "(SELECT country from addresses where id = " + tenant_address_id+ ")",
  tenant_zip:                 "(SELECT zip from addresses where id = " + tenant_address_id+ ")",
  tenant_email:               " (SELECT email FROM contacts WHERE id = " + contact_id + ") ",
  tenant_phone:               " (SELECT phone FROM contact_phones WHERE contact_id = " + contact_id + " and `primary` = 1) ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = " + contact_id + ") ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = " + contact_id + ") ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = " + contact_id + ") ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = " + contact_id + ") ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = " + contact_id + ") ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = " + contact_id + ") ",

  lease_id:                   lease_id,
  lease_start_date:           sb('start_date', 'leases', 'id', '=', lease_id),
  lease_end_date:             sb('end_date', 'leases', 'id', '=', lease_id),
  lease_rent:                 sb('rent', 'leases', 'id', '=', lease_id),
  lease_notes:                sb('notes', 'leases', 'id', '=', lease_id),
  lease_standing:             sb( 'name', 'lease_standings', 'id', '=', sb( 'lease_standing_id', 'leases', 'id', '=', lease_id )),
  lease_status:               sb('status', 'leases', 'id', '=', lease_id),
  lease_send_invoice:         sb('send_invoice', 'leases', 'id', '=', lease_id),
  lease_bill_day:             sb('bill_day', 'leases', 'id', '=',lease_id),
  lease_monthly:              sb('monthly', 'leases', 'id', '=', lease_id),
  lease_decline_insurance:    sb('decline_insurance', 'leases', 'id', '=', lease_id),
  lease_rented_days:          sb("(SELECT DATEDIFF(CURDATE(), (SELECT start_date from leases where id = " + lease_id + ")))", 'leases', 'id', '=', lease_id),
  lease_sign_up_promo:        sb( 'name', 'promotions', 'id', '=', sb('promotion_id', 'leases', 'id', '=', lease_id)),

  lease_balance:              " (" + Sql.lease_lifetime_billed(lease_id) + " - " + Sql.lease_lifetime_payments(lease_id) + " - " + Sql.lease_total_writeoffs(lease_id) + " - " + Sql.lease_total_credits(lease_id) + ") ",
  lease_next_billing_date:    Sql.lease_next_billing_date(lease_id),
  lease_paid_through_date:    Sql.lease_paid_through_date(lease_id),

  method_id:                  'id',
  method_name:                'CONCAT(first, " ", last)',
  method_card_type:           'card_type',
  method_name_on_card:        'name_on_card',
  method_type:                'type',
  method_address:             sb('address', 'addresses', 'id', '=', 'payment_methods.id'),
  method_address2:            sb('address2', 'addresses', 'id', '=', 'payment_methods.id'),
  method_city:                sb('city', 'addresses', 'id', '=', 'payment_methods.id'),
  method_state:               sb('state', 'addresses', 'id', '=', 'payment_methods.id'),
  method_country:             sb('country', 'addresses', 'id', '=', 'payment_methods.id'),
  method_zip:                 sb('zip', 'addresses', 'id', '=','payment_methods.id'),
  method_exp:                 'DATE_ADD(exp_warning, INTERVAL 6 MONTH)',
  method_last_4:              ' (SELECT card_end from payment_methods pm where pm.id = payment_methods.id and type="card") ',
  method_acct_num:            ' (SELECT card_end from payment_methods pm where pm.id = payment_methods.id and type="ach") ',
  method_routing_num:         'routing_number',
  method_is_autopay:          'auto_charge',

  method_last_declined:        '(SELECT date from payments where payment_methods_id = payment_methods.id and payments.status = -1 HAVING MAX(date))',
  method_times_declined:       '(SELECT COUNT(id) from payments where payment_methods_id = payment_methods.id and payments.status = -1 )',
  method_last_declined_reason: '(SELECT status_desc from payments where payment_methods_id = payment_methods.id and payments.status = -1 HAVING MAX(date))',
  method_total_payments:       '(SELECT SUM(amount) from payments where payment_methods_id = payment_methods.id and payments.status = 1)',
  method_last_billed:          '(SELECT date from payments where payment_methods_id = payment_methods.id and payments.status = 1 HAVING MAX(date))',
  method_times_billed:         '(SELECT COUNT(id) from payments where payment_methods_id = payment_methods.id and payments.status = 1 )',
  method_autopay_count:        '(SELECT COUNT(id) from payments where payment_methods_id = payment_methods.id and payments.status = 1 and type = "auto" )',
  method_total_auto_pay:       '(SELECT SUM(amount) from payments where payment_methods_id = payment_methods.id and payments.status = 1 and type = "auto")',





  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  }

}
