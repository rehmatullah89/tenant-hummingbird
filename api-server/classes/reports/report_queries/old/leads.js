//import reservations from "../../../../web/src/assets/api/reservations";

const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};




let contact_id = " leads.contact_id ";
let property_id = "leads.property_id";
let category_id = "leads.category_id";
let unit_id = "leads.unit_id";
let lease_id = "leads.lease_id";
let property_address_id =  sb('address_id', 'properties', 'id', '=',  property_id);
let payment_id = sb('id', 'payments',  'id', '=', lease_id);
let tenant_address_id = "(select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";
let reservation_id = "(select MAX(id) from reservations where lease_id in (select lease_id from contact_leases where contact_id = " + contact_id + ")) ";

let reservation_unit_id = sb('unit_id', 'leases', 'id', '=', sb('lease_id', 'reservations', 'id', '=', reservation_id));
let reservation_property_id = sb('property_id', 'units', 'id', '=', reservation_unit_id);
let touchpoints_id = "(select MAX( id ) from lead_touchpoints where contact_id = " + contact_id + ") ";

last_contact_id = " (SELECT MAX(id) from activity where contact_id is not null and object_id = " + contact_id + "  and activity_object_id in (select id from activity_objects where interaction = 1))";

module.exports = {

  property_id:            property_id,
  property_name:          sb('name', 'properties', 'id', '=', property_id),
  property_number:        sb('number', 'properties', 'id', '=', property_id),

  property_address:       sb('address', 'addresses', 'id', '=', property_address_id),
  property_address2:      sb('address2', 'addresses', 'id', '=', property_address_id),
  property_city:          sb('city', 'addresses', 'id', '=', property_address_id),
  property_state:         sb('state', 'addresses', 'id', '=', property_address_id),
  property_country:       sb('country', 'addresses', 'id', '=', property_address_id),
  property_zip:           sb('zip', 'addresses', 'id', '=', property_address_id),

  lead_id:                  contact_id,
  lead_first:              sb('first', 'contacts', 'id', '=', contact_id),
  lead_last:               sb('last', 'contacts', 'id', '=', contact_id),
  lead_phone:              " (SELECT phone FROM contact_phones WHERE contact_id = " + contact_id + " and `primary` = 1) ",
  lead_email:              sb('email', 'contacts', 'id', '=', contact_id),

  lead_category_name:        sb('name', 'unit_categories', 'id', '=', category_id),
  lead_unit_number:          sb('number', 'units', 'id', '=', unit_id),
  lead_source:               ' source ',
  lead_notes:                ' content ',
  lead_created:              ' created ',
  // TODO implement
  lead_opened_by:            '',
  lead_opened:               ' opened ',
  lead_reservation:          '',
  lead_status:              ' status ',
  // lead_status:               ' (IFNULL(' +
  //                                 '(select name from lease_standings where id = (select MAX(id) from lease_standings where id in (select lease_standing_id from leases where id in (select lease_id from contact_leases where contact_id = ' + contact_id + ' )))),' +
  //                                 'status )' +
  //                             ' ) ',


  // TODO fix with activity changes
  lead_last_contacted:          "(SELECT MAX(created) from activity where id = " + last_contact_id + ")",
  lead_last_contacted_days:     "(SELECT  DATEDIFF(CURDATE(), (SELECT MAX(created) from activity where id = " + last_contact_id + ")))",


  // TODO These three are ERRORING
  lead_last_contacted_message:  "(SELECT description from activity where id = " + last_contact_id + ")",
  lead_last_contacted_method:   "(SELECT name from activity_objects where id =  (SELECT activity_object_id from activity where id = " + last_contact_id + "))",
  lead_last_contacted_by:       "(SELECT CONCAT(first, ' ', last) from contacts where id =  (SELECT contact_id from activity where id = " + last_contact_id + "))",



  touchpoints_id:                 "(select MAX( id ) from lead_touchpoints where contact_id = " + contact_id + ") ",
  touchpoints_platform_source:    "(select platform_source from lead_touchpoints where contact_id = " + contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_platform_device:    "(select platform_device from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_platform_dossier:   "(select platform_dossier from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_request_url:        "(select referrer_request_url from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_url:                "(select referrer_url from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_domain:             "(select referrer_domain from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_device:             "(select referrer_device from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_source:             "(select referrer_source from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_medium:             "(select referrer_medium from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_keyword:            "(select referrer_keyword from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_recordtype:         "(select record_type from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_cid:                "(select referrer_cid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_gclid:              "(select referrer_gclid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_fbclid:             "(select referrer_fbclid from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_created:            "(select created from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",
  touchpoints_event_type:         "(select event_type from lead_touchpoints where contact_id = "+ contact_id + " and id = " + touchpoints_id + ") ",

  reservation_id:                 reservation_id,
  reservation_created:            sb('created', 'reservations', 'id', '=', reservation_id),
  reservation_time:               sb('time', 'reservations', 'id', '=', reservation_id),
  reservation_expires:            sb('expires', 'reservations', 'id', '=', reservation_id),
  reservation_unit_number:        sb('number', 'units', 'id', '=', reservation_unit_id),
  reservation_unit_category:      sb('name', 'unit_categories', 'id', '=', sb('category_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_name:      sb('name', 'properties', 'id', '=', reservation_property_id),
  reservation_property_number:    sb('number', 'properties', 'id', '=', reservation_property_id),
  reservation_property_address:   sb('address', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_address2:  sb('address2', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_city:      sb('city', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_state:     sb('state', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_country:   sb('country', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),
  reservation_property_zip:       sb('zip', 'addresses', 'id', '=', sb('address_id', 'units', 'id', '=', reservation_unit_id)),

}
