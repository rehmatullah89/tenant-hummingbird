'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let invoice_line_id       = " ila.invoice_line_id ";
let invoice_id            = " ila.invoice_id ";
let invoice_line_allocation_id            = " ila.id ";
let lease_id              = " (select lease_id from invoices where id = " + invoice_id +  ") ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " (select property_id from invoices where id = " + invoice_id +  ") ";
let tenant_id             = " (select contact_id from invoices where id = " + invoice_id +  ") ";



class  SalesTaxPaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);

    this.sql_fragments = Object.assign({},
      new reportQueries.InvoiceLines({ id: invoice_line_id},this.report_dates.end).queries,
      new reportQueries.InvoiceLinesAllocation({ id: invoice_line_allocation_id},this.report_dates.end).queries,
      new reportQueries.Invoice({ id: invoice_id},this.report_dates.end).queries,
      new reportQueries.Lease({ id: lease_id},this.report_dates.end, this.report_dates.start).queries,
      new reportQueries.Unit({id: unit_id},this.report_dates.end).queries,
      new reportQueries.Property({id: property_id},this.report_dates.end).queries,
      new reportQueries.Tenant({id: tenant_id},this.report_dates.end).queries
    );

    this.config.name = 'Sales Tax Payments';
    this.config.filename =  'sales_tax_payments';

    this.config.column_structure = [].concat(
      Object.values(Fields.invoice_lines),
      Object.values(Fields.invoice_line_summary),
      Object.values(Fields.invoice_lines_allocation),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
    );

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    }

    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_line_allocation_date',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'property_name',
      'tenant_name',
      'unit_number',
      'invoice_line_product',
      'invoice_line_allocation_sales_tax_paid',
      'invoice_line_sales_tax',
      'invoice_line_sales_tax_percent',
      'invoice_line_net_product_charge',
      'invoice_line_allocation_date',
      'invoice_date',
      'invoice_due',
      'invoice_number'
    ];

    this.sql_tables += ' invoice_lines_allocation ila';

    this.sql_conditions = ' WHERE ila.type = "tax" AND (select company_id from properties where id = (select property_id from invoices where id = ila.invoice_id )) = '+this.company.id

    if(properties.length){
      this.sql_conditions += ' and (select property_id From invoices where id = ila.invoice_id ) in (' + properties.join(', ') + ")";
    }

    this.property_id = '(select property_id from invoices where id = ila.invoice_id)'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " ila.date ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = SalesTaxPaymentsReport;
