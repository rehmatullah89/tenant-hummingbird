
class ContactQueries {
  constructor(data, date) {
    this.id = data.id;

    this.queries = {
      contact_id : this.id,
      contact_first :             " (SELECT first FROM contacts WHERE id = " + this.id + ") ",
      contact_last :              " (SELECT last FROM contacts WHERE id = " + this.id + ") ",
      contact_email :             " (SELECT email FROM contacts WHERE id = " + this.id + ") ",
      contact_gender :            " (SELECT gender FROM contacts WHERE id = " + this.id + ") ",
      contact_ssn :               " (SELECT ssn FROM contacts WHERE id = " + this.id + ") ",
      contact_dob :               " (SELECT dob FROM contacts WHERE id = " + this.id + ") ",
      contact_driver_license :    " (SELECT driver_license FROM contacts WHERE id = " + this.id + ") ",
      contact_active_military :   ` (SELECT active from contact_military where active = 1 and contact_id = ${this.id} order by id desc limit 1)`,
      contact_military_branch :   ` (SELECT branch FROM contact_military where active = 1 and contact_id = ${this.id} order by id desc limit 1)`,
      contact_last_contacted :    " (SELECT MAX(created) FROM interactions WHERE DATE(created) <= " + date + " and contact_id = " + this.id + ") "
    }
  }

}

module.exports = ContactQueries;

