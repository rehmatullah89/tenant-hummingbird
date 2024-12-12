'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let invoice_line_id       = " il.id ";
let invoice_id            = " il.invoice_id ";
let date                  = " (select date from invoices where id = "+ invoice_id +") ";
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
      new reportQueries.InvoiceLines({ id: invoice_line_id}, this.report_dates.end).queries,
      new reportQueries.Invoice({ id: invoice_id}, this.report_dates.end).queries,
      new reportQueries.Lease({ id: lease_id}, this.report_dates.end, this.report_dates.start).queries,
      new reportQueries.Unit({id: unit_id}, this.report_dates.end).queries,
      new reportQueries.Property({id: property_id},this.report_dates.end).queries,
      new reportQueries.Tenant({id: tenant_id},this.report_dates.end).queries
    );


    this.config.name = 'Insurance';
    this.config.filename =  'insurance';

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

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    }

    this.config.filters.sort = {
      field: 'invoice_date',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'invoice_line_product',
      'property_name',
      'unit_number',
      'tenant_name',
      'lease_paid_through_date',
      'invoice_line_service_period_start',
      'invoice_line_insurance_premium',
      'invoice_line_insurance_coverage',
      'invoice_line_total',
      'lease_balance',
      'lease_lifetime_payments'
    ];

    //let inv_line_queries = new reportQueries.InvoiceLines({ id: invoice_line_id}, this.report_dates.end).queries;
    //let inv_queries = new reportQueries.Invoice({ id: invoice_id},this.report_dates.end).queries;

    this.sql_tables += ' invoice_lines il';
    this.sql_conditions += ` WHERE ifnull((SELECT status 
                                      FROM invoices 
                                      WHERE id = il.invoice_id
                                        and property_id in (${properties.join(', ')})
                                        and (subtotal + total_tax) - (total_discounts + total_payments) >= 0
                                    ), 0) = 1 `;
    this.sql_conditions += ` and (select default_type from products  where id = il.product_id) = 'insurance' `;
    // this.sql_conditions += ` and (select company_id from properties where id = ( select property_id from invoices where id = il.invoice_id )) = ${this.company.id}`;
    // this.sql_conditions += ` and ( 	
    //                           (SELECT IFNULL(subtotal, 0) as subtotal FROM invoices WHERE id = il.invoice_id ) 
    //                               + (SELECT IFNULL(total_tax, 0) as invoice_sales_tax FROM invoices WHERE id = il.invoice_id ) 
    //                           - (SELECT IFNULL(SUM(amount),0) FROM invoice_lines_allocation WHERE invoice_id = il.invoice_id and invoice_line_id = il.id and date <= ${date}) 
    //                         ) >= 0`;

    // if(properties.length){
    //   this.sql_conditions += ' and ( select property_id from invoices where id = il.invoice_id ) in (' + properties.join(', ') + ")";
    // }
    this.property_id = '( select property_id from invoices where id = il.invoice_id )'

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " (select due from invoices where id = il.invoice_id) ");
    }
  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = InvoiceLinesReport;
