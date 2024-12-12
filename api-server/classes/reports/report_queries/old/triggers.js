const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};
let unit_id = sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id'));

module.exports = {

  property_name:            sb('name', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id')),
  property_num:             sb('number', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id')),
  property_address:         sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),
  property_address2:        sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),
  property_city:            sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),
  property_state:           sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),
  property_country:         sb('country', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),
  property_zip:             sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', 'applications.unit_id'))),

  unit_id:                  sb('id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=', 'events.id'))),
  unit_number:              sb('number', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id','=', 'events.id'))),
  unit_floor:               sb('floor', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=', 'events.id'))),
  unit_type:                sb('type', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id'))),
  unit_description:         sb('description', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id','=', 'events.id'))),
  unit_available_date:      sb('unit_available_date', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id'))),
  unit_status:              sb('unit_status', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id'))),
  unit_price:               sb('price', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id','=', 'events.id'))),
  unit_sqft:                '',
  unit_featured:            sb('featured', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id'))),
  unit_category_id:         sb('category_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id','=', 'events.id'))),
  unit_category:            sb( 'name', 'unit_categories', 'id', '=', sb( 'category_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', sb('lease_id',  'event_leases', 'event_id', '=','events.id')))),
  unit_overlocked:       '(select id from overlocks where unit_id = ' + unit_id + ' and status = 1)',

  event_lease_id:             " (select id from event_leases where event_id = events.id ) ",
  event_contact_id:           " (select id from event_contacts where event_id = events.id ) ",

  tenant_first:               " (SELECT first FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_last:                " (SELECT last FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_email:               " (SELECT email FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_ssn:                 " (SELECT ssn FROM FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  tenant_military_branch:     " (SELECT military_branch FROM FROM contacts WHERE contacts.id = (SELECT contact_id from contact_leases where lease_id = (select lease_id from event_leases where event_id = events.id) HAVING MIN(contact_leases.id) )) ",
  // TODO fix with activity changes
  tenant_last_contacted:      "",

  contact_id:                  " (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ",
  contact_first:               " (SELECT first FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_last:                " (SELECT last FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_email:               " (SELECT email FROM contacts WHERE contacts.id =(SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_gender:              " (SELECT gender FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_ssn:                 " (SELECT ssn FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_dob:                 " (SELECT dob FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_driver_license:      " (SELECT driver_license FROM contacts WHERE (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_active_military:     " (SELECT active_military FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  contact_military_branch:     " (SELECT military_branch FROM contacts WHERE contacts.id = (SELECT contact_id from event_contacts where event_id = events.id having MIN(id)) ) ",
  // TODO fix with activity changes
  contact_last_contacted:      "",


  lease_start_date:           sb('start_date', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id' )),
  lease_end_date:             sb('end_date', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id' )),
  lease_rent:                 sb('rent', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id' )),
  lease_notes:                sb('notes', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id' )),
  lease_standing:             sb( 'name', 'lease_standings', 'id', '=', sb( 'lease_standing_id', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=', 'events.id' ))),
  lease_status:               sb('status', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=', 'events.id' )),
  lease_send_invoice:         sb('send_invoice', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id','=', 'events.id' )),
  lease_bill_day:             sb('bill_day', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id','=', 'events.id' )),
  lease_monthly:              sb('monthly', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id ' )),
  lease_decline_insurance:    sb('decline_insurance', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id', '=','events.id' )),
  lease_rented_days:          " (SELECT DATEDIFF(CURDATE(), start_date) from leases where id = (SELECT lease_id from event_leases where event_id = events.id  ) ) ",
  lease_sign_up_promo:        sb( 'name', 'promotions', 'id', '=', sb('promotion_id', 'leases', 'id', '=', sb('lease_id', 'event_leases', 'event_id','=','events.id' ))),

  lease_last_payment:         " (SELECT SUM(amount) from payments where lease_id = (SELECT lease_id from event_leases where event_id = events.id  ) and status = 1 and date = (select MAX(date) from payments where  payments.lease_id = (SELECT lease_id from event_leases where event_id = events.id  )))",
  lease_last_payment_source:  " (SELECT source from payments where lease_id = (SELECT lease_id from event_leases where event_id = events.id  ) and status = 1 and date = (select MAX(date) from payments where  payments.lease_id = (SELECT lease_id from event_leases where event_id = events.id  )))",
  lease_balance:              " (" + Sql.lease_lifetime_billed("(SELECT lease_id from event_leases where event_id = events.id  )") + " - " + Sql.lease_lifetime_payments("(SELECT lease_id from event_leases where event_id = events.id  )") + " - " + Sql.lease_total_writeoffs("(SELECT lease_id from event_leases where event_id = events.id  )") + " - " + Sql.lease_total_credits("(SELECT lease_id from event_leases where event_id = events.id  )") + ") ",
  lease_next_billing_date:    "",
  lease_paid_through_date:    "",

  task_description:           " (SELECT details from todos where todos.event_id = events.id)  ",
  task_completed:             " (SELECT completed from todos where todos.event_id = events.id)  ",
  task_notes:                 " (SELECT notes from todos where todos.event_id = events.id)  ",

  trigger_created:            " created_at ",
  trigger_event_type:         " (SELECT name from event_types where event_types.id = event_type_id) ",
  trigger_title:              " title ",
  trigger_details:            " details ",
  trigger_email_subject:      " (SELECT subject from event_types where event_types.event_id = events.id) ",
  trigger_email_template:     " (SELECT message from event_types where event_types.event_id = events.id) ",
  trigger_email_content:      "",
  trigger_email_opened:       "",
  // trigger_sms:                " (SELECT message from trigger_sms where trigger_sms.trigger_id = REPLACE(group_id, 'TGR_', '')) ",
  trigger_fee_type:              " (SELECT type from trigger_fee where trigger_fee.trigger_id = REPLACE(group_id, 'TGR_', '')) ",
  trigger_fee_amount:            " (SELECT amount from trigger_fee where trigger_fee.trigger_id = REPLACE(group_id, 'TGR_', '')) ",
  trigger_fee_product:           " (SELECT name FROM products where id = (select product_id from trigger_fee where trigger_fee.trigger_id = REPLACE(group_id, 'TGR_', ''))) ",
  trigger_lease_status_update:   " (SELECT name from lease_standings where id = (select lease_standing_id from triggers where id = REPLACE(group_id, 'TGR_', ''))) ",

  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  }

}
