'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let payment_method_id     = ' pm.id ';
let property_id           = ' pm.property_id ';
let contact_id            = ' pm.contact_id ';
let last_payment_id       = " (select MAX(id) from payments where payment_method_id = " + payment_method_id + " )";
let tenant_address_id     = " (select address_id from contact_locations where contact_id = " + contact_id + " and `primary` = 1)";



class PaymentMethodsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);


    this.sql_fragments = Object.assign({},
      new reportQueries.PaymentMethod({ id: payment_method_id},this.report_dates.end).queries,
      new reportQueries.Property({id: property_id},this.report_dates.end).queries,
      new reportQueries.Tenant({id: contact_id},this.report_dates.end).queries,
      // new reportQueries.Payment({last_payment_id: last_payment_id}).queries,
    );


    this.config.name = 'Payment Methods';
    this.config.filename =  'payment_methods';
    console.log("Fields.payment_summary", Fields.payment_summary);
    console.log("Fields.payment_methods", Fields.payment_method);
    this.config.column_structure = [].concat(
      Object.values(Fields.payment_method),
      Object.values(Fields.payment_method_summary),
      Object.values(Fields.property),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      // Object.values(Fields.payment),
      // Object.values(Fields.payment_summary),
    );


    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'method_exp',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'method_name',
      'method_name_on_card',
      'method_type',
      'method_exp',
      'method_card_type',
      'method_last_4',
      'method_is_autopay'
    ]

    this.sql_tables += ' payment_methods pm ';

    this.sql_conditions = ' WHERE pm.active = 1 and ( select company_id from properties where id = pm.property_id ) = ' + this.company.id;

    if(properties.length){
      this.sql_conditions += ' and pm.property_id in  (' + properties.join(', ') + ")";
    }

    this.property_id = 'pm.property_id';

  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = PaymentMethodsReport;
