'use strict';

var BaseReport = require(__dirname + '/base_report.js'); 

// Declare SQL fragment identifiers
let invoice_id = " il.invoice_id";
let invoice_lines_id = " il.id";
let lease_id = " (select lease_id from invoices where id = " + invoice_id +  ") ";
let unit_id = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id = " (select property_id from invoices where id = " + invoice_id +  ") ";
let address_id = " (select address_id from properties where id = " + property_id + ") ";
let category_id = ' (select category_id from units where id = ' + unit_id + ') ';
let tenant_id = " (select contact_id from invoices where id = " + invoice_id +  ") ";

class  MerchandiseSalesReport extends BaseReport { 
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name); 

    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let invoice = new reportQueries.Invoice({id: invoice_id},this.report_dates.end);
    let invoice_lines = new reportQueries.InvoiceLines({id: invoice_lines_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      invoice_lines.queries,
      lease.queries,
      invoice.queries,
      property.queries,
      category.queries,
      property_address.queries,
    );

    this.config.name = 'Merchandise Sales';
    this.config.filename =  'merchandise_sales';
    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
      Object.values(Fields.invoice_lines),
      Object.values(Fields.invoice_line_summary),
    );

    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_number',
      dir: 'ASC'
    };

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    }

    this.config.default_columns = [
      'invoice_date',
      'invoice_line_product',
      'invoice_line_product_description',
      'invoice_number',
      'tenant_name',
      'unit_number',
      'invoice_line_qty',
      'invoice_line_cost',
      'invoice_line_discount_amt',
      'invoice_line_total',
      'invoice_line_sales_tax',
      'invoice_line_total_sale',
      'invoice_payment_status',
      'invoice_payment_methods',
      'invoice_total',
      'invoice_created_by'
    ]

    this.sql_tables += ' invoice_lines il ';
    this.sql_conditions = ' WHERE il.invoice_id in (  select id from invoices inv where  (inv.status = 1 or inv.voided_at is not null) and (inv.voided_at is null or DATE(inv.voided_at) > ' + connection.escape(this.report_date) + ') and ' +
      ' (select company_id from properties where id = inv.property_id ) = ' + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and inv.property_id in (' + properties.join(', ') + ")";
    }

    // Define property_id to be used in SQL query
    this.property_id = property_id; 

    this.sql_conditions += `) and (select default_type from products where id = il.product_id) = 'product'`
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " select due from invoices where id = il.invoice_id ", false);
    }
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;

module.exports = MerchandiseSalesReport;
