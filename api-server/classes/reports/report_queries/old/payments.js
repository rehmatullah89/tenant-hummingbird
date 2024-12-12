const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};

let unit_id = "(select unit_id from leases where id = (select lease_id from invoices where id = (select invoice_id from invoices_payments where payment_id = payments.id HAVING MAX(id))))";

let lease_id = "(select lease_id from invoices where id = (select invoice_id from invoices_payments where payment_id = payments.id HAVING MAX(id)))";


module.exports = {

  property_id:          "property_id",
  property_name:        sb('name', 'properties', 'id', '=', "property_id"),
  property_number:      sb('number', 'properties', 'id', '=', "property_id"),
  property_address:     sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),
  property_address2:    sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),
  property_city:        sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),
  property_state:       sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),
  property_country:       sb('country', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),
  property_zip:         sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'property_id')),

  unit_id:              sb('id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payments.lease_id')),
  unit_number:          '(SELECT number from units where id = ' + unit_id + ')',
  // unit_number:          sb('number', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payments.lease_id')),
  unit_floor:           '(SELECT floor from units where id = ' + unit_id + ')',
  unit_type:            '(SELECT type from units where id = ' + unit_id + ')',
  unit_description:     '(SELECT description from units where id = ' + unit_id + ')',
  unit_available_date:  '(SELECT available_date from units where id = ' + unit_id + ')',
  unit_status:         '(SELECT status from units where id = ' + unit_id + ')',
  unit_price:          '(SELECT upc.set_rate from unit_price_changes upc where DATE(upc.created) <= CURRENT_DATE() and upc.unit_id = ' + unit_id + ' order by upc.id DESC limit 1)',
  unit_sqft:            '',
  unit_featured:        '(SELECT featured from units where id = ' + unit_id + ')',
  unit_category_id:     '(SELECT category_id from units where id = ' + unit_id + ')',
  unit_category:        sb( 'name', 'unit_categories', 'id', '=', sb( 'category_id', 'units', 'id', '=', unit_id)),
  unit_overlocked:      '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',

  tenant_id:                 " contact_id ",
  tenant_first:               " (SELECT first FROM contacts WHERE id = contact_id) ",
  tenant_last:                " (SELECT last FROM contacts WHERE id = contact_id) ",
  tenant_email:               " (SELECT email FROM contacts WHERE id = contact_id) ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = contact_id) ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = contact_id) ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = contact_id) ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = contact_id) ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = contact_id) ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = contact_id) ",
  // TODO fix with activity changes
  tenant_last_contacted:      "",


  lease_start_date:           sb('start_date', 'leases', 'id', '=', lease_id),
  lease_end_date:             sb('end_date', 'leases', 'id', '=', lease_id),
  lease_rent:                 sb('rent', 'leases', 'id', '=', lease_id),
  lease_notes:                sb('notes', 'leases', 'id', '=', lease_id),
  lease_standing:             sb( 'name', 'lease_standings', 'id', '=', sb( 'lease_standing_id', 'leases', 'id', '=', lease_id )),
  lease_status:               sb('status', 'leases', 'id', '=', lease_id),
  lease_send_invoice:         sb('send_invoice', 'leases', 'id', '=', lease_id),
  lease_bill_day:             sb('bill_day', 'leases', 'id', '=', lease_id),
  lease_monthly:              sb('monthly', 'leases', 'id', '=', lease_id),
  lease_decline_insurance:    sb('decline_insurance', 'leases', 'id', '=', lease_id),
  lease_rented_days:          " (SELECT DATEDIFF(CURDATE(), start_date) from leases where id = " + lease_id + ") ",
  lease_sign_up_promo:        sb( 'name', 'promotions', 'id', '=', sb('promotion_id', 'leases', 'id', '=', lease_id )),

  lease_last_payment:         '(SELECT IFNULL(amount,0) from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = ' + lease_id +  '  )) HAVING MAX(created))',
  lease_last_payment_source:  '(SELECT source from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = ' + lease_id +  '  )) HAVING MAX(created))',

  lease_balance:              " (" + Sql.lease_lifetime_billed("payments.lease_id") + " - " + Sql.lease_lifetime_payments("payments.lease_id") + " - " + Sql.lease_total_writeoffs("payments.lease_id") + " - " + Sql.lease_total_credits("payments.lease_id") + ") ",
  lease_next_billing_date:    "",
  lease_paid_through_date:    "",


  // payment_lease_id:          " payments.lease_id ",
  payment_id:                 " id ",
  payment_date:               " date ",
  payment_ref_name:           " ref_name ",
  payment_method:             " method ",
  payment_trans_id:           " transaction_id ",
  payment_number:             " number ",
  payment_created:            " created ",
  payment_notes:              " notes ",
  payment_status:             " status ",
  payment_status_desc:        " status_desc ",
  payment_amount:             " amount ",
  payment_source:             " source ",
  payment_accepted_by:        " (select CONCAT(first, ' ' , last) from contacts where id = accepted_by) ",

  payment_amt_applied:        " IFNULL(( select SUM(amount) from invoices_payments where payment_id = payments.id ), 0) ",
  payment_remaining:        " ROUND(amount -  IFNULL( (select SUM(amount) from invoices_payments where payment_id = payments.id),0), 2) ",

  method_id:                  'payments.payment_methods_id',
  method_name:                sb('CONCAT(first, " ", last)', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_type:                sb('card_type', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_name_on_card:        sb('name_on_card', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method:                     sb('method', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_address:             sb('address', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_address2:            sb('address2', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_city:                sb('city', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_state:               sb('state', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_country:             sb('country', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_zip:                 sb('zip', 'addresses', 'id', '=', sb('address_id', 'payment_methods', 'id', '=', 'payments.payment_methods_id')),
  method_exp:                 sb('DATE_ADD(exp_warning, INTERVAL 6 MONTh)', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_last_4:              sb('card_end', 'payment_methods', 'id', '=', 'payments.payment_methods_id and type = "card"'),
  method_acct_num:            sb('card_end', 'payment_methods', 'id', '=', 'payments.payment_methods_id and type = "ach"'),
  method_card_type:           sb('card_type', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_routing_num:         sb('routing_number', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  method_is_autopay:          sb('auto_charge', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),
  //pmt_mth_autopay_rent:        sb('auto_charge', 'payment_methods', 'id', '=', 'payments.payment_methods_id'),





  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  }

}
