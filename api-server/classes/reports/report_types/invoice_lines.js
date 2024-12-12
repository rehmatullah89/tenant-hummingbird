'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let invoice_line_id       = " il.id ";
let invoice_id            = " il.invoice_id ";
let lease_id              = " (select lease_id from invoices where id = " + invoice_id +  ") ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " (select property_id from invoices where id = " + invoice_id +  ") ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let category_id           = ' (SELECT category_id from units where id = ' + unit_id + ') ';
let tenant_id             = " (select contact_id from invoices where id = " + invoice_id +  ") ";



class  InvoiceLinesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);




    this.sql_fragments = Object.assign({},
      new reportQueries.InvoiceLines({ id: invoice_line_id},this.report_dates.end).queries,
      new reportQueries.Invoice({ id: invoice_id}, this.report_dates.end).queries,
      new reportQueries.Lease({ id: lease_id}, this.report_dates.end, this.report_dates.start).queries,
      new reportQueries.Unit({id: unit_id}, this.report_dates.end).queries,
      new reportQueries.Property({id: property_id}, this.report_dates.end).queries,
      new reportQueries.Tenant({id: tenant_id}, this.report_dates.end).queries
    );


    this.config.name = 'Charges';
    this.config.filename =  'invoice_lines';

    this.config.column_structure = [].concat(
      Object.values(Fields.invoice_lines),
      Object.values(Fields.invoice_line_summary),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
    );

    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_date',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'unit_number',
      'product_name',
      'invoice_line_qty',
      'invoice_line_cost',
      'invoice_line_date',
    ];


    this.sql_tables += ' invoice_lines il';
    this.sql_conditions = ' WHERE (select status from invoices where id = il.invoice_id) = 1 and (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = ( select lease_id from invoices where id = il.invoice_id )))) = ' + this.company.id

    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = (select unit_id from leases where id = ( select lease_id from invoices where id = il.invoice_id ))) in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = (select unit_id from leases where id = ( select lease_id from invoices where id = il.invoice_id )))'

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = InvoiceLinesReport;
