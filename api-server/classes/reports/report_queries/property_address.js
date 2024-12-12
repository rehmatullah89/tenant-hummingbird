class PropertyAddressQueries {
  constructor(data) {
    this.id = data.id;
    this.queries = {
      property_address_id:  this.id,
      property_address:     "(select address from addresses where id = " + this.id +  ")",
      property_address2:    "(select address from addresses where id = " + this.id +  ")",
      property_city:        "(select city from addresses where id = " + this.id +  ")",
      property_state:       "(select state from addresses where id = " + this.id +  ")",
      property_country:     "(select country from addresses where id = " + this.id +  ")",
      property_zip:         "(select zip from addresses where id = " + this.id +  ")",
    }
  }
}
module.exports = PropertyAddressQueries;

