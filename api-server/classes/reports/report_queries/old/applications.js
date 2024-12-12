const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};


let unit_id = 'applications.unit_id';
let property_id = sb('property_id', 'units',  'id', '=', unit_id);
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let lease_id = "applications.lease_id";
let contact_id = "applications.contact_id";
let category_id = sb('category_id', 'units',  'id', '=', unit_id);
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
  unit_status:          sb('status', 'units', 'id', '=', lease_id),
  unit_price:           sb('price', 'units', 'id', '=', unit_id),
  unit_featured:        sb('featured', 'units', 'id', '=', unit_id),
  unit_category_id:     sb('id', 'unit_categories', 'id', '=', category_id),
  unit_category:        sb('name', 'unit_categories', 'id', '=', category_id),
  unit_rent_variance: " ( leases.rent - (select price from units u where u.id = leases.unit_id)) ",
  unit_overlocked:     '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',


  tenant_id:                  contact_id,
  tenant_first:               " (SELECT first FROM contacts WHERE id = " + contact_id + ") ",
  tenant_last:                " (SELECT last FROM contacts WHERE id = " + contact_id + ") ",
  tenant_address:             " (SELECT address from addresses where id = " + tenant_address_id+ ")",
  tenant_address2:            " (SELECT address2 from addresses where id = " + tenant_address_id+ ")",
  tenant_city:                " (SELECT city from addresses where id = " + tenant_address_id+ ")",
  tenant_state:               " (SELECT state from addresses where id = " + tenant_address_id+ ")",
  tenant_country:             " (SELECT country from addresses where id = " + tenant_address_id+ ")",
  tenant_zip:                 " (SELECT zip from addresses where id = " + tenant_address_id+ ")",
  tenant_phone:               " (SELECT phone FROM contact_phones WHERE  contact_id = " + contact_id + " and `primary` = 1) ",
  tenant_email:               " (SELECT email FROM contacts WHERE id = " + contact_id + ") ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = " + contact_id + ") ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = " + contact_id + ") ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = " + contact_id + ") ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = " + contact_id + ") ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = " + contact_id + ") ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = " + contact_id + ") ",

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

  application_id:               " id ",
  application_date:               " created ",
  application_status:             " status ",
  application_bankruptcy:         " IFNULL(bankruptcy, 0) ",
  application_evicted:            " IFNULL(evicted, 0) ",
  application_refused_to_pay:     " IFNULL(refused_to_pay, 0) ",
  application_terms:              " IFNULL(terms, 0) ",


  // address_type:  (connection, type ) => {
  //   return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))
  //   //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  // },
  //
  // phone_type:  (connection, type ) => {
  //   return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  // }

}
