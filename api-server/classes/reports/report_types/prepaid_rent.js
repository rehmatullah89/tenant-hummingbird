'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let invoices_payments_id  = " inv_pay.id ";
let invoice_id            = " inv_pay.invoice_id ";
let payment_id            = " inv_pay.payment_id ";
let lease_id              = " (select lease_id from invoices where id = " + invoice_id +  ") ";
let tenant_id             = ' (SELECT contact_id from payments where id = ' + payment_id + ') ';
let contact_id             = ' (SELECT contact_id from payments where id = ' + payment_id + ') ';
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " (select property_id from payments where id = " + payment_id +  ") ";



class  PrepaidRentReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    filters = filters || {};


    filters.search = filters.search || {};
    let date = filters.search.report_date || moment().format('YYYY-MM-DD');

    this.sql_fragments = Object.assign({},
      new reportQueries.InvoicesPayments({ id: invoices_payments_id},date).queries,
      new reportQueries.Tenant({ id: contact_id},date).queries,
      // new reportQueries.InvoiceLines({ id: invoice_line_id}).queries,
      new reportQueries.Invoice({ id: invoice_id},date).queries,
      new reportQueries.Lease({ id: lease_id},date, date).queries,
      new reportQueries.Unit({id: unit_id},date).queries,
      new reportQueries.Property({id: property_id},date).queries,
      new reportQueries.Payment({id: payment_id},date).queries,
      new reportQueries.Tenant({id: tenant_id},date).queries
    );


    this.config.name = 'Prepaid Rent';
    this.config.filename =  'prepaid_rent';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.payment),
      Object.values(Fields.payment_summary),
      Object.values(Fields.payment_method),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
      Object.values(Fields.invoices_payments)
    );

    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"
    }];

    this.config.filters.sort = {
      field: 'unit_number * 1',
      dir: 'ASC'
    };

    this.config.filters.search['report_date'] = moment().format('YYYY-MM-DD');

    this.config.default_columns = [
      'property_name',
      'tenant_name',
      'payment_ref_name',
      'unit_number',
      'payment_date',
      'invoices_payments_date',
      'invoices_payments_amount',
      'invoice_date',
      'lease_beginning_balance',
      'invoice_total_rent',
      'payment_amt_remaining',
      'lease_ending_balance',
      'lease_start_date',
      'lease_end_date',
      'lease_paid_through_date'
    ];
    // payments that go to

    // this.config =  JSON.parse(JSON.stringify(config));

    this.sql_tables += ' invoices_payments inv_pay';

    let payment_conditions =  new reportQueries.Payment({id: payment_id}, date);
    let invoices_conditions =  new reportQueries.Invoice({id: invoice_id}, date);
    let invoices_payment_conditions =  new reportQueries.InvoicesPayments({ id: invoices_payments_id},date)
    this.sql_conditions = ' WHERE ' +
      payment_conditions.queries.payment_status + ' = 1 and ' +
      invoices_conditions.queries.invoice_status + ' = 1 and ' +
      invoices_conditions.queries.invoice_date + ' > "' + date + '" and ' +
      '(select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = inv_pay.invoice_id)))) = ' + this.company.id
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = inv_pay.invoice_id))) in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = inv_pay.invoice_id)))'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_date){
      this.sql_conditions +=  " and inv_pay.date < " + connection.escape(conditions.report_date);
    }
  }

}


const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;

module.exports = PrepaidRentReport;
