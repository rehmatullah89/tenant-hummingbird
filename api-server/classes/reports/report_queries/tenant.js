
class TenantQueries {
  constructor(data, date) {
    this.id = data.id;

    this.queries = {
      tenant_id :                               this.id,
      tenant_first :                            " (SELECT first FROM contacts WHERE id = " + this.id + ") ",
      tenant_last :                             " (SELECT last FROM contacts WHERE id = " + this.id + ") ",
      tenant_name :                             " (SELECT TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') )) FROM contacts WHERE id = " + this.id + ") ",
      tenant_address:                           " (SELECT address FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_address1:                          " (SELECT address FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_address2:                          " (SELECT address2 FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_city:                              " (SELECT city FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_country:                           " (SELECT country FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_state:                             " (SELECT state FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_zip:                               " (SELECT zip FROM addresses where id in (select address_id from contact_locations WHERE contact_id = " + this.id  + " and `primary` = 1))",
      tenant_email :                            " (SELECT email FROM contacts WHERE id = " + this.id + ") ",
      tenant_phone:                             " (SELECT phone FROM contact_phones WHERE contact_id = " + this.id  + " and `primary` = 1 order by id desc limit 1)",
      tenant_gender :                           " (SELECT gender FROM contacts WHERE id = " + this.id + ") ",
      tenant_ssn :                              " (SELECT ssn FROM contacts WHERE id = " + this.id + ") ",
      tenant_dob :                              " (SELECT dob FROM contacts WHERE id = " + this.id + ") ",
      tenant_driver_license :                   " (SELECT driver_license FROM contacts WHERE id = " + this.id + ") ",
      tenant_active_military :                  " (SELECT active from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1)  ",
      tenant_military_branch :                  " (SELECT branch FROM contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1)  ",
      tenant_military_commanding_officer_first: " (SELECT first FROM contacts WHERE id = (SELECT commanding_officer_contact_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1)) ",
      tenant_military_commanding_officer_last:  " (SELECT last FROM contacts WHERE id = (SELECT commanding_officer_contact_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))  ", 
      tenant_military_commanding_officer_phone: " (SELECT phone FROM contact_phones WHERE contact_id = (SELECT commanding_officer_contact_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1) and `primary` = 1 order by id desc limit 1)  ",
      tenant_military_commanding_officer_email: " (SELECT email FROM contacts WHERE id = (SELECT commanding_officer_contact_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1)) ",
      tenant_military_rank:                     " (SELECT `rank` FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1) ",
      tenant_military_serial:                   " (SELECT identification_number FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1) ",
      tenant_military_email:                    " (SELECT service_member_email FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1)  ",
      tenant_military_dob:                      " (SELECT date_of_birth FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1) ",
      tenant_military_service_expiration:       " (SELECT service_expiration FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1)  ",
      tenant_military_unit_name:                " (SELECT unit_name FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1) ",
      tenant_military_unit_phone:               " (SELECT phone FROM contact_military WHERE contact_id = " + this.id + " and active = 1 order by id desc limit 1) ",
      tenant_military_unit_address1:            " (SELECT address FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",
      tenant_military_unit_address2:            " (SELECT address2 FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",
      tenant_military_city:                     " (SELECT city FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",  
      tenant_military_unit_state:               " (SELECT state FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",
      tenant_military_unit_country:             " (SELECT country FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",
      tenant_military_unit_zip:                 " (SELECT zip FROM addresses where id = (SELECT address_id from contact_military where contact_id = " + this.id + " and active = 1 order by id desc limit 1))",

      tenant_prepay_balance :         ` (SELECT IFNULL( SUM(amount) , 0) FROM invoices_payments where date <= '${date}' and invoice_id in ( select id from invoices where lease_id in (select id from leases where id in (select lease_id from contact_leases where contact_id = ${this.id}) and status = 1 and start_date <= '${date}' and (end_date IS NULL OR end_date > '${date}')) and status = 1 and due > '${date}')) `,
      tenant_last_contacted :         " (SELECT MAX(created) FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id = " + this.id + ") ",
      tenant_last_contacted_days:     " (SELECT  DATEDIFF('" + date + "', MAX(created)) FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id = " + this.id + ") ",
      tenant_last_contacted_message:  " (SELECT content FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id = " + this.id + " order by id desc limit 1 ) ",
      tenant_last_contacted_method:   " (SELECT method FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id = " + this.id + " order by id desc limit 1 ) ",
      tenant_last_contacted_by:       " (SELECT CONCAT(first, ' ', last) from contacts where id = (SELECT entered_by FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id = " + this.id + " order by id desc limit 1 )) ",
      tenant_space_count: `(
        SELECT CAST(COUNT(*) AS CHAR)
        FROM contact_leases cl
        JOIN leases l ON
          cl.lease_id = l.id AND
          (
            l.end_date > CURDATE() OR
            l.end_date IS NULL
          )
        WHERE cl.contact_id = ${this.id}
      )`
    }
  }
}

module.exports = TenantQueries;


