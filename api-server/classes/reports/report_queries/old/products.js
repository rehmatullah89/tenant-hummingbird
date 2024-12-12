const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let sb = (field, table, fkey = 'id', comp = '=', val ) => {
  return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
};


module.exports = {

  // property_name:        sb('name', 'properties', 'id', '=', sb('property_id', 'property_products', 'product_id', '=', 'products.id')),
  // property_num:         sb('number', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id'))),
  // property_address:     sb('address', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id')))),
  // property_address2:    sb('address2', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id')))),
  // property_city:        sb('city', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id')))),
  // property_state:       sb('state', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id')))),
  // property_zip:         sb('zip', 'addresses', 'id', '=', sb('address_id', 'properties', 'id', '=', sb('property_id', 'units', 'id', '=', sb('unit_id', 'leases', 'id', '=', 'payment_methods.lease_id')))),



  product_id:           'id',
  product_name:         'name',
  product_description:  'description',
  product_price:        'price', 
  product_type:         'type',
  product_taxable:      'taxable',
  product_last_billed:  '(select date from invoice_lines where product_id = products.id HAVING MAX(date) and MAX(id))',
  product_total_billed: ' (SELECT ROUND(SUM((qty*cost) - total_discounts), 2) from invoice_lines where product_id = products.id) ',


  address_type:  (connection, type ) => {
    return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', 'in',  '(select contact_id from contact_locations where lease_id = payments.lease_id) and contact_locations.type = ' + connection.escape(type) ))


    //return sb('address', 'addresses', 'id', '=', sb('address_id', 'contact_locations', 'contact_id', '=',  'leads.contact_id and contact_locations.type = ' + connection.escape(type) ))
  },

  phone_type:  (connection, type ) => {
    return sb('phone', 'contact_phones', 'type = ' + connection.escape(type) +  ' and contact_id', 'in', sb('contact_id', 'contact_leases', 'lease_id', '=', 'payments.lease_id'))
  }

}
