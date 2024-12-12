
class AdditionalContactsQueries {
  constructor(data, date) {
    this.id = data.id;

    this.queries = {
      additional_id:          this.id,
      additional_first:       " (SELECT first FROM contacts WHERE id = " + this.id + ") ",
      additional_last:        " (SELECT last FROM contacts WHERE id = " + this.id + ") ",
      additional_name:        " (SELECT CONCAT(first, ' ', last ) FROM contacts WHERE id = " + this.id + ") ",
      additional_address:     " (SELECT address FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_address1:    " (SELECT address FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_address2:    " (SELECT address2 FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_city:        " (SELECT city FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_state:       " (SELECT state FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_country:     " (SELECT country FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_zip:         " (SELECT zip FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      additional_email:       " (SELECT email FROM contacts WHERE id = " + this.id + ") ",
      additional_home_phone:  " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and LOWER(type) = 'home' and `primary` = 1 order by id desc limit 1)",
      additional_work_phone:  " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and LOWER(type) = 'work' and `primary` = 1 order by id desc limit 1)",
      additional_cell:        " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and LOWER(type) = 'cell' and `primary` = 1 order by id desc limit 1)",
      additional_fax:         " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and LOWER(type) = 'fax' and `primary` = 1 order by id desc limit 1)",
      additional_other_phone: " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and LOWER(type) not in ('home', 'work', 'cell', 'fax') and `primary` = 1 order by id desc limit 1)",
      additional_phone_type:  " (SELECT type FROM contact_phones WHERE contact_id = " + this.id  + " and `primary` = 1 order by id desc limit 1)",
    }
  }
}

module.exports = AdditionalContactsQueries;


