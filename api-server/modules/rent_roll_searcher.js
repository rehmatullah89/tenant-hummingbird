var Sql = require(__dirname + '/../modules/sql_snippets.js');

// let sql_fragments  = {
//   property_id: " (select id from properties p where p.id = (select property_id from units u where  u.id = l.unit_id)) ",
//   property_name: " (select name from properties p where p.id = (select property_id from units u where  u.id = l.unit_id)) ",
//   property_phone: " (select phone from property_phones pp where pp.property_id = (select property_id from units u where  u.id = l.unit_id) order by id asc limit 1) ",
//   property_phone_type: " (select type from property_phones pp where pp.property_id = (select property_id from units u where  u.id = l.unit_id) order by id asc limit 1) ",
//   property_email: " (select email from property_emails pe where pe.property_id = (select property_id from units u where  u.id = l.unit_id) order by id asc limit 1) ",
//   property_email_type: " (select type from property_emails pe where pe.property_id = (select property_id from units u where  u.id = l.unit_id) order by id asc limit 1) ",
//   unit_id:  "  (select id from units u where u.id = l.unit_id) ",
//   unit_address:  " (select address from addresses where id = (select address_id from units where id = l.unit_id )) ",
//   unit_city: " (select city from addresses where id = (select address_id from units where id = l.unit_id )) ",
//   unit_state: " (select state from addresses where id = (select address_id from units where id = l.unit_id )) ",
//   unit_zip: " (select zip from addresses where id = (select address_id from units where id = l.unit_id )) ",
//   unit_number: " (select number from units u where u.id = l.unit_id) ",
//   unit_floor: " (select floor from units u where u.id = l.unit_id) ",
//   unit_type: " (select type from units u where u.id = l.unit_id) ",
//   unit_description: " (select description from units u where u.id = l.unit_id) ",
//   unit_price: " (select price from units u where u.id = l.unit_id) ",
//   unit_featured: " (select featured from units u where u.id = l.unit_id) ",
//   unit_category_id: " (select id from unit_categories c where c.id = (select category_id from units u where u.id = l.unit_id)) ",
//   unit_category: " (select name from unit_categories c where c.id = (select category_id from units u where u.id = l.unit_id)) ",
//   tenant_first: " (SELECT first FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   contact_id: " (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id)) ",
//   tenant_last: " (SELECT last FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_email: " (SELECT email FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_gender: " (SELECT gender FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_ssn: " (SELECT ssn FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_dob: " (SELECT dob FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_driver_license: " (SELECT driver_license FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_active_military: " (SELECT active_military FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   tenant_military_branch: " (SELECT military_branch FROM contacts WHERE id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   lease_start_date: " start_date ",
//   lease_end_date: " end_date ",
//   lease_rent: " rent ",
//   lease_notes: " notes ",
//   lease_standing: " standing ",
//   lease_status: " status ",
//   lease_send_invoice: " send_invoice ",
//   lease_bill_day: " bill_day ",
//   lease_monthly: " monthly ",
//   lease_decline_insurance: " decline_insurance ",
//   lease_rented_days: " (SELECT DATEDIFF(CURDATE(), start_date)) ",
//   lease_sign_up_promo: " (select name from promotions p where p.id = l.promotion_id) ",
//   lease_last_payment: " (select SUM(amount) from payments p where p.lease_id = l.id and date = (select MAX(date) from payments p2 where  p2.lease_id = l.id )) ",
//   lease_balance: " (" + Sql.lease_lifetime_value("l.id") + " - " + Sql.lease_total_payments("l.id") + ") ",
//   lease_lifetime_value: Sql.lease_lifetime_value("l.id"),
//   lease_total_payments: Sql.lease_total_payments("l.id"),
//   // TODO Fix this
//   lease_next_billing_date: "",
//   lease_paid_through_date: "(select MAX(end_date) from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id in (select id from invoices where lease_id = l.id) ) ",
//   // TODO Fix this
//   tenant_address: "",
//   tenant_address2: "",
//   tenant_city: "",
//   tenant_state: "",
//   tenant_zip: "",
//   tenant_phone: "(SELECT phone FROM contact_phones WHERE " +
//     " id = (select MIN(id) from contact_phones where contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) " +
//     " AND contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) ",
//   // TODO conditionally show interaction type
//   contact_last_interaction: "",
//   // TODO fix with activity changes
//   last_contacted: "",
//   lead_source: " (SELECT source FROM leads WHERE contact_id = (SELECT contact_id FROM contact_leases WHERE lease_id = l.id AND contact_id = (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = l.id))) " ,
//   // TODO Add additional fields from leads
//   rent_variance: " ( rent - (select price from units u where u.id = l.unit_id)) ",
//   total_rent_change: " ((select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id and start_date = (select MAX(start_date) from services where lease_id = l.id)) - " +
//             " (select price from services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id and start_date = (select MIN(start_date) from services where lease_id = l.id))) ",
//     // TODO HOW SHOULD WE CALCULATE THIS?
//   total_products: " (select SUM(price) from services where product_id in (select id from products where default_type = 'product') and lease_id = l.id ) ",
//   total_fees: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'late') and lease_id = l.id and start_date <= CURDATE() and ( end_date >= CURDATE() or end_date is null )) ",
//   security_deposit: "  (select SUM(price) from services where product_id in (select id from products where default_type = 'security') and lease_id = l.id ) ",
//   active_insurance_start_date: "  (select MAX(start_date) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = l.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",
//   active_insurance_created_date: "  (select MAX(created) from services where product_id in (select id from products where default_type = 'insurance') and lease_id = l.id and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null)) ",
//   last_rent_change_date: " (select MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id) ",
//   days_since_rent_change: " (SELECT DATEDIFF(CURDATE(), (SELECT MAX(start_date) from services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id))) ",
//
// }






var e  = require(__dirname + '/../modules/error_handler.js');

class RentRollSearcher {

  constructor(company_id) {
    if(!company_id) e.th(500, "Company ID Missing");

    this.company_id = company_id;
    this.columns = '';
    this.sql_conditions = ' WHERE ' + this.company_id  + ' = (select company_id from properties where id = (select property_id from units where id = l.unit_id )) and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null) and l.status = 1 ';
    this.sql_tables = ' FROM leases l ';
    this.sql_columns = 'SELECT ';
    this.sql = '';
    this.sql_params = '';
    this.sql_base = '';
    this.sql_count_base = '';
    this.count_sql = '';
  }
  setCountSearchColumns(){
    this.sql_columns += ' COUNT(*) as count ';
  }

  setSearchColumns(columns, connection){

      this.sql_columns += ' id,  ';
      for(let i=0; i < columns.length; i++){
        if(!sql_fragments[columns[i].key]) e.th(400, "An Error occurred");
        this.sql_columns += sql_fragments[columns[i].key] + 'as ' +  columns[i].key + ', ';
      }

    // set queries for columns that are dependant on other field. i.e.  if we have a tenant name, we need to include the tenant ID, so that we can open up their account.
    if(columns.find(c => c.key === 'tenant_first') || columns.find(c => c.key === 'tenant_last') || columns.find(c => c.key === 'tenant_name')){
      if(!sql_fragments['contact_id']) e.th(400, "An Error occurred");
      this.sql_columns += sql_fragments['contact_id'] + 'as contact_id, ';
    }

    if(columns.find(c => c.key === 'unit_number')){
      if(!sql_fragments['unit_id']) e.th(400, "An Error occurred");
      this.sql_columns += sql_fragments['unit_id'] + 'as unit_id, ';
    }

    this.sql_columns = this.sql_columns.trim().slice(0, -1);
  }


  setConditions(conditions, columns, connection, filter_structure){

    for(let c in conditions){
      let col_name = '';

      let col_definition = filter_structure.find(col => col.key === c);

      if(c && sql_fragments[c] ) {
        if(Array.isArray(conditions[c])){

        if(conditions[c].length && col_definition.type == 'range'){
          if(conditions[c][0] && conditions[c][1]) {
            this.sql_conditions += " and ( " + sql_fragments[c] + " >= " +  connection.escape(conditions[c][0]) + ' and ' +
              sql_fragments[c] + " <= " +  connection.escape(conditions[c][1]) + ") ";
          } else if(conditions[c][0]) {
            this.sql_conditions += " and  " + sql_fragments[c] + " >= " +  connection.escape(conditions[c][0]);
          } else if(conditions[c][1]) {
            this.sql_conditions += " and  " + sql_fragments[c] + " <= " +  connection.escape(conditions[c][1]);
          }
        } else if(conditions[c].length){
          this.sql_conditions += " and " + sql_fragments[c] + " in (" + conditions[c].map(c => connection.escape(c)).join(',') + ") ";
        }

        }
      }
      if(c === 'name' && conditions[c].trim().length){
        this.sql_conditions += ' and ( ' + sql_fragments['tenant_first'] + ' = ' + connection.escape(conditions[c]) +  ' or ' +
          sql_fragments['tenant_last'] + ' = ' + connection.escape(conditions[c]) + ') ';
      }


      // if(c === 'timeframe' && conditions[c].trim().length){
      //   this.sql_conditions +=  ' and lease_start';
      // }



    }

  }

  setParams(params, columns){

    if(params){

      if(params.sort && columns.find(c => c.key === params.sort) ){
        this.sql_params += " order by ";

        switch (params.sort){
          case 'unit_number':
            // TODO Test tihs
            this.sql_params += ' LPAD(LOWER(unit_number), 10,0), unit_number ';
            break;
          default:
            this.sql_params += params.sort;
        }
        this.sql_params += ' ' + params.sortdir;

      }

      if(params.limit){
        this.sql_params += " limit ";
        this.sql_params += params.offset;
        this.sql_params += ", ";
        this.sql_params += params.limit;
      }

    }
  }


  async search(connection, columns, conditions, params, groups, filter_structure){
    this.setSearchColumns(columns, connection);
    this.setConditions(conditions, columns, connection, filter_structure);
    this.setParams(params, columns);
    let query = this.sql_columns + this.sql_tables + this.sql_conditions + this.sql_params;
    console.log("QQQQQ", query)
    return await connection.queryAsync(query);

  }

  async count(connection, columns, conditions, groups, filter_structure){
    this.setCountSearchColumns(conditions, connection);

     this.setConditions(conditions, columns, connection, filter_structure);
    let query = this.sql_columns + this.sql_tables + this.sql_conditions + this.sql_params;
    let count = await connection.queryAsync(query);
    return count[0].count;
  }

}


module.exports = RentRollSearcher;
