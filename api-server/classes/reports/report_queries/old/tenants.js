const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
const ReportQueries = require('./index.js');

const rq = new ReportQueries();

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};

let unit_id = 'leases.unit_id';
let property_id = sb('property_id', 'units',  'id', '=', unit_id);
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let lease_id = ' leases.id ';
let contact_id = "(SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = " + lease_id + " )";
let category_id = sb('category_id', 'units',  'id', '=', unit_id);
let payment_id = sb('id', 'payments',  'contact_id', '=', contact_id);
let last_payment_id = "(select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = leases.id) HAVING(MAX(created))) )";
let tenant_address_id = "(select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";
let lead_id = sb( 'id', 'leads', 'contact_id', '=', contact_id );
let touchpoints_id = "(select MAX( id ) from lead_touchpoints where contact_id = " + contact_id + ") ";


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
  unit_overlocked:      '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',
  unit_rent_variance:   " ( (select price from units u where u.id = leases.unit_id) - leases.rent ) ",


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
  tenant_phone:               " (SELECT phone FROM contact_phones WHERE contact_id = " + contact_id + " and `primary` = 1) ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = " + contact_id + ") ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = " + contact_id + ") ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = " + contact_id + ") ",

  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = " + contact_id + ") ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = " + contact_id + ") ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = " + contact_id + ") ",

  // TODO fix with activity changes
  tenant_last_contacted:          "(SELECT MAX(created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id)  and activity_object_id in (select id from activity_objects where interaction = 1))",
  tenant_last_contacted_days:     "(SELECT  DATEDIFF(CURDATE(), created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id)  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id) and activity_object_id in (select id from activity_objects where interaction = 1 )))",
  tenant_last_contacted_message:  "(SELECT description from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id)  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id) and activity_object_id in (select id from activity_objects where interaction = 1 )))",
  tenant_last_contacted_method:   "(SELECT name from activity_objects where id =  (SELECT activity_object_id from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id)  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id) and activity_object_id in (select id from activity_objects where interaction = 1 ))))",
  tenant_last_contacted_by:       "(SELECT CONCAT(first, ' ', last) from contacts where id =  (SELECT contact_id from activity where object_id in (SELECT contact_id from contact_leases where lease_id = leases.id)  and activity_object_id in (select id from activity_objects where interaction = 1) and created = (select MAX(created) from activity where contact_id is not null and object_id in (SELECT contact_id from contact_leases where lease_id = leases.id) and activity_object_id in (select id from activity_objects where interaction = 1 ))))",

  touchpoints_id:                 touchpoints_id,
  touchpoints_platform_source:    "(select platform_source from lead_touchpoints where contact_id = " + contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_platform_device:    "(select platform_device from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_platform_dossier:   "(select platform_dossier from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_request_url:        "(select referrer_request_url from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_url:                "(select referrer_url from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_domain:             "(select referrer_domain from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_device:             "(select referrer_device from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_recordtype:         "(select record_type from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_source:             "(select referrer_source from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_medium:             "(select referrer_medium from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_keyword:            "(select referrer_keyword from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_cid:                "(select referrer_cid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_gclid:              "(select referrer_gclid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_fbclid:             "(select referrer_fbclid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_created:            "(select created from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_event_type:         "(select event_type from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",




  lead_id:                    lead_id,
  lead_source:                sb( 'source', 'leads', 'contact_id', '=', contact_id ),
  lead_notes:                 sb( 'notes', 'leads', 'contact_id', '=', contact_id ),
  lead_created:               sb( 'created', 'leads', 'contact_id', '=', contact_id ),
  lead_status:                sb( 'status', 'leads', 'contact_id', '=', contact_id ),

  lead_property_id:           sb( 'property_id', 'leads', 'contact_id', '=', contact_id ),
  lead_property_name:         sb('name', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id)),
  lead_property_num:          sb('number', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id)),
  lead_property_address:      sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_address2:     sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_city:         sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_state:        sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_country:      sb('country', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_zip:          sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_lat:          sb('lat', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_property_lng:          sb('lng', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', contact_id))),
  lead_category_name:         sb('name', 'unit_categories', 'id', '=', sb( 'category_id', 'leads', 'contact_id', '=', contact_id)),
  lead_unit_number:           sb('number', 'units', 'id', '=', sb( 'unit_id', 'leads', 'contact_id', '=', contact_id)),

  //TODO track who opened lead
  lead_opened_by:             '',

  lease_id:                   " id ",
  lease_start_date:           " start_date ",
  lease_end_date:             " end_date ",
  lease_rent:                 " rent ",
  lease_notes:                " notes ",
  lease_standing:             sb( 'name', 'lease_standings', 'id', '=', 'leases.lease_standing_id' ),
  lease_standing_id:          " lease_standing_id ",
  lease_status:               " status ",
  lease_send_invoice:         " send_invoice ",
  lease_bill_day:             " bill_day ",
  lease_monthly:              " monthly ",
  lease_decline_insurance:    " decline_insurance ",
  lease_rented_days:          " (SELECT DATEDIFF(CURDATE(), start_date)) ",
  lease_sign_up_promo:          sb( 'name', 'promotions', 'id', '=', 'leases.promotion_id'),
  lease_sign_up_promo_id:       'leases.promotion_id',


  lease_last_payment:         "(Select IFNULL(amount, 0) from payments where status = 1 and credit_type = 'payment' and id = " + last_payment_id,
  lease_last_payment_date:    "(Select date from payments where status = 1 and credit_type = 'payment' and id = " + last_payment_id,
  lease_last_payment_source:  "(Select source from payments where status = 1 and credit_type = 'payment' and id = " + last_payment_id,

  lease_balance:              Sql.lease_balance(lease_id),

  lease_next_billing_date:    Sql.lease_next_billing_date(lease_id),
  lease_paid_through_date:    Sql.lease_paid_through_date(lease_id),

  lease_lifetime_billed:      Sql.lease_lifetime_billed(lease_id),
  lease_lifetime_payments:    Sql.lease_lifetime_payments(lease_id),

  lease_last_rent_change_date:  " (select MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id and (select count(id) from services where lease_id = leases.id and product_id in (select id from products where default_type = 'rent')) > 1 ) ",
  lease_last_rent_change_amt:   "  (select IFNULL( " +
                                        "(select price from services where service_type = 'lease' and product_id in (select id from products where default_type = 'rent') AND lease_id = leases.id AND start_date = ( SELECT MAX(start_date) from services where service_type = 'lease' AND product_id in (select id from products where default_type = 'rent') and lease_id = leases.id ))  - " +
                                        "(select price from services where service_type = 'lease' AND product_id in (select id from products where default_type = 'rent') AND lease_id = leases.id AND start_date = ( SELECT MAX(start_date) from services where service_type = 'lease' AND product_id in (select id from products where default_type = 'rent') and lease_id = leases.id AND start_date < ( SELECT MAX(start_date) from services where service_type = 'lease' AND product_id in (select id from products where default_type = 'rent') and lease_id = leases.id ) )) " +
                                ", 0)) ",
  lease_days_since_rent_change: " (SELECT DATEDIFF(CURDATE(), (SELECT MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id))) ",

  // TODO change from default_type to type
  lease_total_rent_change: " ( (select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id and start_date = (select MAX(start_date) from services where lease_id = leases.id)) - " +
    " (select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id and start_date = (select MIN(start_date) from services where lease_id = leases.id))) ",

  lease_refunds:  sb( ' IFNULL(SUM(amount), 0)', 'refunds', 'payment_id', 'in', payment_id),
  // TODO - SUM
  concessions: "",
  lease_bad_debt_writeoffs:   sb( 'IFNULL(SUM(amount), 0)', 'payments', 'lease_id', '=', 'leases.id and payments.credit_type = "loss"'),
  lease_active_service_fees: " (select SUM(price) from services where product_id in (select id from products where default_type = 'late') and lease_id = leases.id ) ",
  lease_active_insurance: " (select name from products where default_type = 'insurance' and id in (select product_id from services where status = 1 and start_date <= CURDATE() and (end_date is null || end_date > CURDATE() ) and lease_id = leases.id and id = (select MAX(id) from services where status = 1 and start_date <= CURDATE() and (end_date is null || end_date > CURDATE() ) and lease_id = leases.id ))) ",
  lease_rent_past_due: " (select SUM(qty * cost) from invoice_lines where product_id in (select id from products where default_type = 'rent' ) and invoice_id in (select id from invoices where status = 1 and due <= CURDATE() and lease_id = leases.id and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments, 0)) > 0) ) ",
  lease_fees_past_due: " (select SUM(qty * cost) from invoice_lines where product_id in (select id from products where default_type = 'late' ) and invoice_id in (select id from invoices where status = 1 and due <= CURDATE() and lease_id = leases.id and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0)) > 0) ) ",
  lease_other_past_due: " (select SUM(qty * cost) from invoice_lines where product_id in (select id from products where default_type not in ('rent', 'late') ) and invoice_id in (select id from invoices where status = 1 and due <= CURDATE() and lease_id = leases.id and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0)) > 0) ) ",

  // // TODO change from default_type to type, and 'late' to fee
  // services_total_products: " (select SUM(price) from services where product_id in (select id from products where default_type = 'product') and lease_id = leases.id ) ",
  // services_total_fees: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'late') and lease_id = leases.id and start_date <= CURDATE() and ( end_date >= CURDATE() or end_date is null )) ",
  // services_security_deposit: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'security') and lease_id = leases.id ) ",
  // services_active_insurance_start_date: "  (select MAX(start_date) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",
  // services_active_insurance_created_date: "  (select MAX(created) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",






  product_name:  id => {
    return " (select SUM(price) from services where product_id in (select id from products where id = '" + id + "') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null ))  "
  },
  product_type:  id => {
    return " (select SUM(price) from services where product_id in (select id from products where id = '" + id + "') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null ))  "
  }

}
