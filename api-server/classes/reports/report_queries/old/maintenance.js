const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};



let unit_id =  sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id');

module.exports = {

  property_id:          sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  property_name:        sb('name', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id'))),
  property_number:         sb('number', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id'))),
  property_address:     sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),
  property_address2:    sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),
  property_city:        sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),
  property_state:       sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),
  property_country:     sb('country', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),
  property_zip:         sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')))),

  unit_id:              sb('id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_number:          sb('number', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_floor:           sb('floor', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_type:            sb('type', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_description:     sb('description', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_available_date:  sb('available_date', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_status:          sb('status', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_price:           sb('price', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_sqft:            '',
  unit_featured:        sb('featured', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_category_id:     sb('category_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id')),
  unit_category:        sb( 'name', 'unit_categories', 'id', '=', sb( 'category_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'maintenance.lease_id'))),
  unit_overlocked:     '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',


  tenant_id:                 " (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1)) ",
  tenant_first:               " (SELECT first FROM contacts WHERE length(first) > 0 and id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_last:                " (SELECT last FROM contacts WHERE length(last) > 0 and id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_email:               " (SELECT email FROM contacts WHERE length(email) > 0 and id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = maintenance.lease_id and `primary` = 1))) ",
  // TODO fix with activity changes
  tenant_last_contacted:      "",

  lease_id:                   'maintenance.lease_id',
  lease_start_date:           sb('start_date', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_end_date:             sb('end_date', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_rent:                 sb('rent', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_notes:                sb('notes', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_standing:             sb( 'name', 'lease_standings', 'id', '=', sb( 'lease_standing_id', 'leases', 'id', '=', 'maintenance.lease_id' )),
  lease_status:               sb('status', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_send_invoice:         sb('send_invoice', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_bill_day:             sb('bill_day', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_monthly:              sb('monthly', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_decline_insurance:    sb('decline_insurance', 'leases', 'id', '=', 'maintenance.lease_id'),
  lease_rented_days:          " (SELECT DATEDIFF(CURDATE(), start_date) from leases where id = maintenance.lease_id) ",
  lease_sign_up_promo:        sb( 'name', 'promotions', 'id', '=', sb('promotion_id', 'leases', 'id', '=', 'maintenance.lease_id')),


  maintenance_id:                 " id ",
  maintenance_date:               " date ",
  maintenance_severity:           " severity",
  maintenance_status:             " status ",
  maintenance_extras:             " extras ",
  maintenance_type:               " (select name from maintenance_types where id = maintenance.request_type_id)",
  maintenance_last_message:       " (select content from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1)  ",
  maintenance_last_message_date:  " (select date from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1)  ",
  maintenance_num_messages:       " (select COUNT(id) from submessages where submessages.maintenance_id = maintenance.id)  ",
  maintenance_last_from:          " (select CONCAT(first, ' ', last) from contacts where id = (select contact_id from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1)) ",
  maintenance_days_open:          " (SELECT DATEDIFF(CURDATE(), date)) ", // Count only the time the ticket was open.


  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  }

}
