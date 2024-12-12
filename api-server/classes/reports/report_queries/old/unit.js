const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};

let unit_id = 'u.id';
let property_id = sb('property_id', 'units',  'id', '=', unit_id);
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let lease_id = "(select MAX(id) from leases where status = 1 and (end_date is null or end_date > CURDATE()) and unit_id = " + unit_id + ") ";
let contact_id = "(SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = " + lease_id + " )";
let category_id = sb('category_id', 'units',  'id', '=', unit_id);
let payment_id = sb('id', 'payments',  'lease_id', '=', lease_id);
let tenant_address_id = "(select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";


module.exports = {

  property_id:          sb('id', 'properties', 'id', '=', 'u.property_id'),
  property_name:        sb('name', 'properties', 'id', '=', 'u.property_id'),
  property_number:      sb('number', 'properties', 'id', '=',  'u.property_id'),
  property_address:     sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=',  'u.property_id')),
  property_address2:    sb('address2', 'addresses', 'id', '=',  sb('address_id', 'properties', 'id', '=', 'u.property_id')),
  property_city:        sb('city', 'addresses', 'id', '=', sb('address_id', 'properties',  'id', '=',  'u.property_id')),
  property_state:       sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=',  'u.property_id')),
  property_country:     sb('country', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=',  'u.property_id')),
  property_zip:         sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', 'u.property_id')),

  unit_id:              'id',
  unit_number:          'number',
  unit_floor:           'floor',
  unit_type:            'type',
  unit_description:     'description',
  unit_available_date:  'available_date',
  unit_status:          Sql.unit_status('u.id'),
  unit_price:           'price',
  unit_sqft:            '',
  unit_featured:        'featured',
  unit_category_id:     'category_id',
  unit_category:        sb('name', 'unit_categories', 'id', '=', 'u.category_id'),
  unit_overlocked:      '(select id from overlocks where unit_id = u.id and status = 1)',
  // TOD0 make it moved out
  unit_days_vacant:    " (SELECT  (DATEDIFF(CURDATE(), (select MAX(end_date) from leases WHERE end_date < CURDATE() and  status = 1 and unit_id = " + unit_id + " and unit_id not in ( select unit_id from leases where status = 1 and end_date is null or end_date  > CURDATE()) )))) ",
  unit_promotions:         "(select GROUP_CONCAT(name) from promotions where active = 1 and id in ( select promotion_id from  promotion_units where unit_id = " + unit_id + "))",
  unit_size:               "(select CONCAT( " +
                              " (SELECT value from amenity_units where amenity_id = (select id from amenities where name = 'width' and property_type = 'storage') and unit_id = u.id), " +
                              "' x '," +
                              "(SELECT value from amenity_units where amenity_id = (select id from amenities where name = 'length' and property_type = 'storage') and unit_id = u.id) " +
                            "))",


  unit_amenities:          "(SELECT GROUP_CONCAT(name) from amenities where id in (select amenity_id from amenity_units where unit_id = " + unit_id + ")) ",
  unit_length:            '',
  unit_height:            '',
  unit_storage_type:      '',
  unit_door_type:         '',
  unit_vehicle_storage:   '',
  unit_beds:              '',
  unit_baths:             '',
  unit_class:             '',
  unit_pets:              '',
  unit_parking:           '',
  unit_laundry:           '',


  // Select the first tenant

  tenant_id:                  contact_id,
  tenant_first:               " (SELECT first FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_last:                 " (SELECT last FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_email:               " (SELECT email FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_gender:              " (SELECT gender FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_ssn:                 " (SELECT ssn FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_dob:                 " (SELECT dob FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_driver_license:      " (SELECT driver_license FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_active_military:     " (SELECT active_military FROM contacts WHERE  id =  " + contact_id + ") ",
  tenant_military_branch:     " (SELECT military_branch FROM contacts WHERE  id = " + contact_id + ") ",
  // TODO fix with activity changes
  tenant_last_contacted:      "",

  lead_id:                    "(SELECT id from leads where contact_id = " + contact_id + ") ",
  lead_source:                "(SELECT source from leads where contact_id = " + contact_id + ") ",
  //lead_notes:                 "(SELECT notes from leads where contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = (select id from leases where status = 1 and start_date <= CURDATE() and (end_date is null or end_date > CURDATE()) and unit_id = u.id ) HAVING MIN(contact_id)))",
  lead_created:               "(SELECT created from leads where contact_id = " + contact_id + ") ",
  // " (SELECT source FROM leads WHERE contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id))) " ,

  // lead_property_id:           "(SELECT property_id from leads where contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = (select id from leases where status = 1 and start_date <= CURDATE() and (end_date is null or end_date >= CURDATE()) and unit_id = u.id ) HAVING MIN(contact_id)))",
  // lead_property_name:         sb('name', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' ))),
  // lead_property_num:          sb('number', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' ))),
  // lead_property_address:      sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_address2:     sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_city:         sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_state:        sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_zip:          sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_lat:          sb('lat', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_property_lng:          sb('lng', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb( 'property_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' )))),
  // lead_category_name:         sb('name', 'categories', 'id', '=', sb( 'category_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' ))),
  // lead_unit_number:           sb('number', 'units', 'id', '=', sb( 'unit_id', 'leads', 'contact_id', '=', sb( 'contact_id', 'contact_leases', 'lease_id', '=', 'leases.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = leases.id)' ))),


  lease_id:                   lease_id,
  lease_start_date:           sb('start_date', 'leases', 'id', '=', lease_id),
  lease_end_date:             sb('end_date', 'leases', 'id', '=', lease_id),
  lease_rent:                 sb('rent', 'leases', 'id', '=', lease_id),
  lease_notes:                sb('notes', 'leases', 'id', '=', lease_id),
  lease_standing:             sb('name', 'lease_standings', 'id', '=', sb( 'lease_standing_id', 'leases', 'id', '=',lease_id )),
  lease_status:               sb('status', 'leases', 'id', '=', lease_id),
  lease_send_invoice:         sb('send_invoice', 'leases', 'id', '=', lease_id),
  lease_bill_day:             sb('bill_day', 'leases', 'id', '=', lease_id),
  lease_monthly:              sb('monthly', 'leases', 'id', '=', lease_id),
  lease_decline_insurance:    sb('decline_insurance', 'leases', 'id', '=', lease_id),
  lease_rented_days:          " (SELECT DATEDIFF(CURDATE(), (select start_date from leases where id = " + lease_id + " ))) ",
  lease_days_late:            " (SELECT DATEDIFF(CURDATE(), (select MIN(due) from invoices where lease_id = " + lease_id + " ))) ",
  lease_sign_up_promo:        sb('name', 'promotions', 'id', '=', sb( 'promotion_id', 'leases', 'id', '=',lease_id )),
  lease_last_payment:         " (SELECT SUM(amount) from payments where lease_id =  " + lease_id + " and date = (select MAX(date) from payments where payments.lease_id =  " + lease_id + ")) ",
  lease_last_payment_source:  " (SELECT source from payments where lease_id =  " + lease_id + " and date = (select MAX(date) from payments where payments.lease_id =  " + lease_id + ") and id = (select MAX(id) from payments where lease_id =  " + lease_id + " and date = (select MAX(date) from payments where payments.lease_id =  " + lease_id + " ))) ",
  lease_balance:              " (" + Sql.lease_lifetime_billed(lease_id) + " - " + Sql.lease_lifetime_payments(lease_id) + " - " + Sql.lease_total_writeoffs(lease_id) + " - " + Sql.lease_total_credits(lease_id) + ") ",
  lease_last_rent_change_date: " (select MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = " + lease_id + ") ",
  lease_lifetime_billed:       Sql.lease_lifetime_billed(lease_id),
  lease_lifetime_payments:     Sql.lease_lifetime_payments(lease_id),
  lease_total_writeoffs:       Sql.lease_total_writeoffs(lease_id),
  lease_total_credits:         Sql.lease_total_credits(lease_id),
  lease_paid_through_date:      Sql.lease_paid_through_date(lease_id),

   // TODO Fix this - Maybe find 1 month after the last invoice_start date?  might be wrong for custom invoices
  // lease_next_billing_date:    "",



  // // TODO
  // last_rent_change_amt: "  ",
  // // TODO - SUM
  // concessions: "",
  // // TODO - SUM
  // refunds:  "  ",
  // // TODO - SUM
  // uncollected_rent: "  ",
  //
  // days_since_rent_change: " (SELECT DATEDIFF(CURDATE(), (SELECT MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id))) ",
  // total_rent_change: " ((select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id and start_date = (select MAX(start_date) from services where lease_id = leases.id)) - " +
  //   " (select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = leases.id and start_date = (select MIN(start_date) from services where lease_id = leases.id))) ",
  // rent_variance: " ( rent - (select price from units u where u.id = l.unit_id)) ",

  // lease_paid_through_date: "(select MAX(end_date) from invoice_lines where product_id in (select id from products where type = 'rent') and invoice_id in (select id from invoices where lease_id = (select id from leases where status = 1 and start_date <= CURDATE() and (end_date is null or end_date >= CURDATE()) and unit_id = u.id )))",

  // // TODO HOW SHOULD WE CALCULATE THIS?
  // total_products: " (select SUM(price) from services where product_id in (select id from products where default_type = 'product') and lease_id = leases.id ) ",
  // total_fees: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'late') and lease_id = leases.id and start_date <= CURDATE() and ( end_date >= CURDATE() or end_date is null )) ",
  // security_deposit: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'security') and lease_id = leases.id ) ",
  // active_insurance_start_date: "  (select MAX(start_date) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",
  // active_insurance_created_date: "  (select MAX(created) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",

  // TODO Fix this

  tenant_address: "",
  tenant_address2: "",
  tenant_city: "",
  tenant_state: "",
  tenant_country: "",
  tenant_zip: "",
  tenant_phone: " (SELECT phone FROM contact_phones WHERE contact_id = " + contact_id + " and `primary` = 1) ",

  // // TODO conditionally show interaction type
  // contact_last_interaction_date: "",
  // contact_last_interaction: "",


  product_name:  id => {
    return " (select SUM(price) from services where product_id in (select id from products where id = '" + id + "') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null ))  "
  },
  product_type:  id => {
    return " (select SUM(price) from services where product_id in (select id from products where id = '" + id + "') and lease_id = leases.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null ))  "
  }

}
