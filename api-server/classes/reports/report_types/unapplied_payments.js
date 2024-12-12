'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let payment_id            = " p.id ";
let payment_method_id     = " p.payment_methods_id ";
let property_id           = " p.property_id ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let contact_id            = ' p.contact_id ';

class  UnappliedPaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    filters = filters || {};
    filters.search = filters.search || {};
    let date = filters.search.report_date || moment().format('YYYY-MM-DD');


    let tenant = new reportQueries.Tenant({id: contact_id}, date);
    let contact = new reportQueries.Contact({id: contact_id}, date);
    let payment = new reportQueries.Payment({id: payment_id}, date);
    let paymentMethod = new reportQueries.PaymentMethod({id: payment_method_id}, date);
    let property = new reportQueries.Property({id: property_id}, date);
    let property_address = new reportQueries.PropertyAddress({id: address_id}, date);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      contact.queries,
      payment.queries,
      paymentMethod.queries,
      property.queries,
      property_address.queries,
    );


    this.config.name = 'Unapplied Payments';
    this.config.filename =  'unapplied_payments';
    this.config.column_structure =[].concat(
      Object.values(Fields.property),
      Object.values(Fields.tenant),
      Object.values(Fields.payment),
      Object.values(Fields.payment_summary),
      Object.values(Fields.payment_method),
    )


    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"

    }];
    this.config.filters.sort = {
      field: 'payment_date asc',
      dir: 'ASC'
    };
    this.config.filters.search['report_date'] = moment().format('YYYY-MM-DD');
    this.config.default_columns = [
      'property_name',
      'tenant_name',
      'payment_ref_name',
      'payment_credit_type',
      'payment_date',
      'payment_amount',
      'payment_method',
      'payment_amt_remaining',
      'payment_notes'
    ]

    // this.config =  JSON.parse(JSON.stringify(config));

    this.sql_tables += ' payments p ';

    this.sql_conditions = ' WHERE status = 1 and (select company_id from properties where id = p.property_id ) = ' + this.company.id;
    this.sql_conditions += ' and ' + payment.queries.payment_amt_remaining  + " > 0 ";
    this.sql_conditions += " and amount - (SELECT SUM(IFNULL(amount,0)) from invoices_payments where payment_id = p.id and date <= " + connection.escape(date) + " ) > 0 ";

    if(properties.length){
      this.sql_conditions += ' and p.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'p.property_id'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " p.date ");
    }
  }

}


const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;

module.exports = UnappliedPaymentsReport;
