const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};


let unit_id =  sb('unit_id', 'leases', 'id', '=', 'invoices.lease_id');
let property_id = sb('property_id', 'units',  'id', '=', unit_id);
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let lease_id = ' invoices.lease_id ';
let contact_id = "(SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1)";
let category_id = sb('category_id', 'units',  'id', '=', unit_id);
let payment_id = sb('id', 'payments',  'id', '=', lease_id);
let tenant_address_id = "(select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";


module.exports = {

  property_id:          property_id,
  property_name:        sb('name', 'properties', 'id', '=', property_id),
  property_number:      sb('number', 'properties', 'id', '=', property_id),
  property_address:     sb('address', 'addresses', 'id', '=', property_address_id),
  property_address2:    sb('address2', 'addresses', 'id', '=', property_address_id),
  property_city:        sb('city', 'addresses', 'id', '=', property_address_id),
  property_state:       sb('state','addresses', 'id', '=', property_address_id),
  property_country:     sb('country','addresses', 'id', '=', property_address_id),
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
  unit_rent_variance:   " ( (SELECT rent from leases where id = " + lease_id + " ) - (select price from units u where u.id = (select unit_id from leases where id = " + lease_id + "))) ",


  tenant_id:                  contact_id,
  tenant_first:               " (SELECT first FROM contacts WHERE id = " + contact_id + ") ",
  tenant_last:                " (SELECT last FROM contacts WHERE id = " + contact_id + ") ",
  tenant_address:             " (SELECT address from addresses where id = " + tenant_address_id+ ")",
  tenant_address2:            " (SELECT address2 from addresses where id = " + tenant_address_id+ ")",
  tenant_city:                " (SELECT city from addresses where id = " + tenant_address_id+ ")",
  tenant_state:               " (SELECT state from addresses where id = " + tenant_address_id+ ")",
  tenant_country:             " (SELECT country from addresses where id = " + tenant_address_id+ ")",
  tenant_zip:                 " (SELECT zip from addresses where id = " + tenant_address_id+ ")",
  tenant_email:               " (SELECT email FROM contacts WHERE id = " + contact_id + ") ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = " + contact_id + ") ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = " + contact_id + ") ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = " + contact_id + ") ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = " + contact_id + ") ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = " + contact_id + ") ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = " + contact_id + ") ",
  tenant_phone:               " (SELECT phone FROM contact_phones WHERE contact_id = " + contact_id + " and `primary` = 1) ",

  // TODO fix with activity changes
  tenant_last_contacted:          "(SELECT MAX(created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1))",
  tenant_last_contacted_days:     "(SELECT  DATEDIFF(CURDATE(), created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1 )))",
  tenant_last_contacted_message:  "(SELECT description from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1 )))",
  tenant_last_contacted_method:   "(SELECT name from activity_objects where id =  (SELECT activity_object_id from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1 ))))",
  tenant_last_contacted_by:       "(SELECT CONCAT(first, ' ', last) from contacts where id =  (SELECT contact_id from activity where object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1 ))))",

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

  lease_last_payment:         sb( 'SUM(amount)', 'payments', 'lease_id', '=', lease_id + ' and status = 1 and date = (select MAX(date) from payments where  payments.lease_id = ' + lease_id + ' ) '),
  // Todo ERROR
  lease_last_payment_date:    sb( 'date', 'payments', lease_id, '=', 'leases.id HAVING MAX(date) '),
  // Todo ERROR
  lease_last_payment_source:  sb( 'source', 'payments', 'lease_id', '=', lease_id +  ' and date = (select MAX(date) from payments where payments.lease_id =  ' + lease_id + ' )'),
  lease_balance:              " (" + Sql.lease_lifetime_billed(lease_id) + " - " + Sql.lease_lifetime_payments(lease_id) + " - " + Sql.lease_total_writeoffs(lease_id) + " - " + Sql.lease_total_credits(lease_id) + ") ",
  lease_next_billing_date:    Sql.lease_next_billing_date(sb('bill_day', 'leases', 'id', '=', lease_id)),
  lease_paid_through_date:    Sql.lease_paid_through_date(lease_id),

  lease_lifetime_billed:      Sql.lease_lifetime_billed(lease_id),
  lease_lifetime_payments:    Sql.lease_lifetime_payments(lease_id),

  invoice_id:                 " id ",
  invoice_number:             " number ",
  invoice_date:               " date ",
  invoice_due:                " due ",
  invoice_type:               " type ",
  invoice_period_start:       " period_start ",
  invoice_period_end:         " period_end ",
  invoice_status:             " status ",

  //subtotal
  invoice_days_past_due:      "  DATEDIFF(CURDATE(), due) ",
  invoice_total:              "(subtotal + total_tax - total_discounts)",
  invoice_payments:           "total_payments",
  invoice_balance:            "(subtotal + total_tax - total_discounts - total_payments)",
  invoice_discounts:          "total_discounts",
  invoice_credits:            Sql.invoice_credits(),
  invoice_writeoffs:          Sql.invoice_writeoffs(),
  invoice_sales_tax:          "total_tax",


  invoice_total_fees:         "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'fee') and invoice_id = invoices.id) ",
  invoice_total_merchandise:  "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'product') and invoice_id = invoices.id) ",
  invoice_total_rent:         "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id = invoices.id) ",
  invoice_total_insurance:    "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'insurance') and invoice_id = invoices.id) ",
  invoice_total_utilities:    "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'utility') and invoice_id = invoices.id) ",
  invoice_total_deposits:     "  (SELECT IFNULL(ROUND(SUM((qty*cost) - total_discounts), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'deposit') and invoice_id = invoices.id) ",


  payment_id:                 '(SELECT id from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_date:               '(SELECT date from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_ref_name:           '(SELECT ref_name from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_method:             '(SELECT method from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_trans_id:           '(SELECT transaction_id from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_amount:             '(SELECT amount from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created))',
  payment_accepted_by:        '(select CONCAT(first, " " , last) from contacts where id = (SELECT accepted_by from payments where status = 1 and credit_type = "payment" and id in (select payment_id from invoices_payments where invoice_id = invoices.id) HAVING MAX(created)))',




  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = invoices.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'invoices.lease_id'))
  }

}
