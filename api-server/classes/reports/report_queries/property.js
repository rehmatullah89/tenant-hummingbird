class PropertyQueries {
  constructor(data) {
    this.id = data.id;
    this.queries = {
      contact_id : this.id,
      property_id:       this.id,
      property_name:     "(select name from properties where id = " + this.id +  ")",
      property_legal_name:     "(select legal_name from properties where id = " + this.id +  ")",
      property_number:   "(select number from properties where id = " + this.id +  ")",
      property_address: "(select address from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_address2: "(select address2 from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_city: "(select city from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_state: "(select state from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_country: "(select country from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_zip: "(select zip from addresses where id = (select address_id from properties where id = " + this.id +  "))",
      property_landing_page: "(select landing_page from properties where id = " + this.id +  ")",

    }
  }
}
module.exports = PropertyQueries;


