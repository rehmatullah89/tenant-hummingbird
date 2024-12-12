const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

class RentChangeQueries {
  constructor(data, date, start_date) {

    this.id = data.id;
    // this.lease_rent = " (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = rent_change_leases.lease_id and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') ) ";
    this.lease_rent =  " (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = rcl.lease_id and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "')) ";
    this.rent_change_type = "(Select change_type from rate_changes where id in (select rate_change_id from rent_change_leases WHERE id = " + this.id + ") )"

    this.queries = {
      change_id :                  this.id,
      change_amt:                 " rent_change_amt ",
      change_new_rent:            " new_rent_amt ",
      // change_change_prct:          " (SELECT change_amt + " + this.lease_rent  + " FROM rent_change_leases WHERE id = " + this.id + ") "
    }

    this.calculate_change =  "( ( ( (" + this.queries.change_new_rent + ') / (' + this.lease_rent + ")) - 1 ) )";

    this.queries.change_change_prct = "CASE WHEN " + this.rent_change_type + " = 'percent' THEN (SELECT ((change_amt)/100) as change_amt FROM rent_change_leases WHERE id = " + this.id + " ) ELSE " + this.calculate_change + " END "

  }
}

module.exports = RentChangeQueries;

