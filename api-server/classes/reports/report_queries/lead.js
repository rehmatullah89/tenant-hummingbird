class LeadQueries {
  constructor(data, date) {
    this.id = data.id;
    this.category_id = data.category_id;
    this.unit_id = data.unit_id;
    this.property_id = data.property_id;
    this.contact_id = data.contact_id;
    this.lease_id = data.lease_id;

    this.touchpoints_id =  data.touchpoints_id;

    this.reservation_id = data.reservation_id;
    this.reservation_lease_id = "(select lease_id from reservations where id = " + this.reservation_id + " )";
    this.reservation_unit_id = "(SELECT unit_id from leases where id = " + this.reservation_lease_id + " )";
    this.reservation_property_id = "(SELECT property_id from units where id = " + this.reservation_unit_id + " )";



    this.queries = {

      lead_id:                   this.contact_id,
      lead_first :               " (SELECT first FROM contacts WHERE id = " + this.contact_id + ") ",
      lead_last :                " (SELECT last FROM contacts WHERE id = " + this.contact_id + ") ",
      lead_name :                " (SELECT CONCAT(first, ' ' , last) FROM contacts WHERE id = " + this.contact_id + ") ",
      lead_email :               " (SELECT email FROM contacts WHERE id = " + this.contact_id + ") ",
      lead_phone :               " (SELECT phone FROM contact_phones WHERE contact_id = " + this.contact_id + " and `primary` = 1) ",
      
      lead_category:              " (SELECT name FROM unit_categories WHERE id = " + this.category_id + ") ",
      lead_unit_number:           " (SELECT number FROM units WHERE id = " + this.unit_id + ") ",
      lead_property_number:       " (SELECT number FROM properties WHERE id = " + this.property_id + ") ",
      // lead_property_address:      " (SELECT number FROM properties WHERE id = " + this.property_id + ") ",
      lead_property_name:         " (SELECT name FROM properties WHERE id = " + this.property_id + ") ",
      lead_property_num:          " (SELECT number FROM properties WHERE id = " + this.property_id + ") ",
      lead_property_id:           this.property_id,
      lead_category_id:           this.category_id,
      lead_unit_id:               this.unit_id,

      lead_source:                    " (SELECT source FROM leads WHERE id = " + this.id + ") ",

      lead_created:                   " (SELECT created FROM leads WHERE id = " + this.id + " ) ",
      lead_created_by:                " (SELECT created_by FROM leads WHERE id = " + this.id + " ) ",
      lead_created_by_name:           " (SELECT CONCAT(first, ' ' , last) FROM contacts WHERE id = (select created_by from leads where id = " + this.id + ")) ",
      lead_opened:                    " (SELECT opened FROM leads WHERE id = " + this.id + ") ",
      lead_status:                    " (SELECT status FROM leads WHERE id = " + this.id + ") ",

      lead_move_in_date:              " (SELECT move_in_date FROM leads WHERE id = " + this.id + ") ",

      lead_content:                   " (SELECT content FROM leads WHERE id = " + this.id + ") ",
      lead_type:                      " (SELECT lead_type FROM leads WHERE id = " + this.id + ") ",

      lead_last_contacted :           " (SELECT MAX(created) FROM interactions WHERE contact_id = " + this.contact_id + " and DATE(created) <= '" + date + "')",
      lead_last_contacted_days :      " (SELECT  DATEDIFF(CURDATE(), MAX(created)) FROM interactions WHERE contact_id = " + this.contact_id + " and DATE(created) <= '" + date + "') ",
      lead_last_contacted_message :   " (SELECT content FROM interactions WHERE contact_id = " + this.id + "  and DATE(created) <= '" + date + "' HAVING (MAX(created))) ",
      lead_last_contacted_method :    "(SELECT method FROM interactions WHERE contact_id = " + this.id + "  and DATE(created) <= '" + date + "' HAVING (MAX(created))) ",
      lead_last_contacted_by :        "(SELECT CONCAT(first, ' ', last) from contacts where id = (SELECT entered_by FROM interactions WHERE contact_id = " + this.contact_id  + "  and DATE(created) <= '" + date + "' HAVING (MAX(created)))) ",

      lead_first_contacted :           " (SELECT MIN(created) FROM interactions WHERE contact_id = " + this.contact_id + " and DATE(created) <= '" + date + "')",
      lead_days_to_followup:          " (SELECT  DATEDIFF((SELECT MIN(created) FROM interactions WHERE contact_id =  " + this.contact_id + "  and DATE(created) <= '" + date + "'), (SELECT created FROM leads WHERE id = " + this.id + ")) ) ",

      
      //lead_is_autopay:                " (SELECT auto_charge FROM payment_methods WHERE lease_id = " + this.lease_id + " and contact_id = " + this.contact_id + ") ",


      touchpoints_id:                 this.touchpoints_id,
      touchpoints_platform_source:    "(select platform_source from lead_touchpoints where id = " + this.touchpoints_id + ") ",
      touchpoints_platform_device:    "(select platform_device from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_platform_dossier:   "(select platform_dossier from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_request_url:        "(select referrer_request_url from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_url:                "(select referrer_url from lead_touchpoints where  id = " +  this.touchpoints_id + ") ",
      touchpoints_domain:             "(select referrer_domain from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_device:             "(select referrer_device from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_source:             "(select referrer_source from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_medium:             "(select referrer_medium from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_src_mdm:             "(select CONCAT(referrer_source, '/', referrer_medium) from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_keyword:            "(select referrer_keyword from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_recordtype:         "(select record_type from lead_touchpoints where  id = " +  this.touchpoints_id + ") ",
      touchpoints_cid:                "(select referrer_cid from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_gclid:              "(select referrer_gclid from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_fbclid:             "(select referrer_fbclid from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_created:            "(select created from lead_touchpoints where id = " +  this.touchpoints_id + ") ",
      touchpoints_event_type:         "(select event_type from lead_touchpoints where id = " +  this.touchpoints_id + ") ",


      reservation_id:                 this.reservation_id,
      reservation_unit_id:            this.reservation_unit_id,
      reservation_created:            " (SELECT created FROM reservations WHERE id = " + this.reservation_id + ") ",
      reservation_time:               " (SELECT time FROM reservations WHERE id = " + this.reservation_id + ") ",
      reservation_expires:            " (SELECT expires FROM reservations WHERE id = " + this.reservation_id + ") ",
      reservation_unit_number:        " (SELECT number FROM units WHERE id = " + this.reservation_unit_id + ") ",
      reservation_unit_category:      " ( SELECT description from unit_categories where id = ( SELECT category_id from units where id = " + this.reservation_unit_id + " )) ",
      reservation_property_name:      " (SELECT name FROM properties WHERE id = " + this.reservation_property_id + ") ",
      reservation_property_number:    " (SELECT number FROM properties WHERE id = " + this.reservation_property_id + ") ",
      reservation_property_address:   " (SELECT address FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ")) ",
      reservation_property_address2:  " (SELECT address2 FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ") ",
      reservation_property_city:      " (SELECT city FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ")) ",
      reservation_property_state:     " (SELECT state FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ")) ",
      reservation_property_country:   " (SELECT country FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ")) ",
      reservation_property_zip:       " (SELECT zip FROM addresses WHERE id = (Select address_id from units where id = " + this.reservation_unit_id  + ") ",

    }
  }
}

module.exports = LeadQueries;
