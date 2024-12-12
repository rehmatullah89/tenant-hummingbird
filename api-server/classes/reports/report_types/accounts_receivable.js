'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');


let invoice_id            = " inv.id ";
let lease_id              = " inv.lease_id ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " inv.property_id ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let category_id           = ' (SELECT category_id from units where id = ' + unit_id + ') ';
let tenant_id             = " inv.contact_id ";

class  AccountsReceivableReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    filters = filters || {};
    filters.search = filters.search || {};
    let date = filters.search.report_date || moment().format('YYYY-MM-DD');

    let tenant = new reportQueries.Tenant({id: tenant_id}, date);
    // let contact = new reportQueries.Contact({id: contact_id});
    // let payment = new reportQueries.Payment({id: payment_id});
    // let paymentMethod = new reportQueries.PaymentMethod({id: payment_id});
    let lease = new reportQueries.Lease({id: lease_id}, date, date);
    let invoice = new reportQueries.Invoice({id: invoice_id}, date);
    let property = new reportQueries.Property({id: property_id}, date);
    let unit = new reportQueries.Unit({id: unit_id}, date);
    let category = new reportQueries.UnitCategory({id: category_id}, date);
    let property_address = new reportQueries.PropertyAddress({id: address_id}, date);


    this.sql_fragments = Object.assign({},
      tenant.queries,
      // contact.queries,
      unit.queries,
      // payment.queries,
      // paymentMethod.queries,
      lease.queries,
      invoice.queries,
      property.queries,
      category.queries,
      property_address.queries,
    );

    this.config.name = 'Accounts Receivable';
    this.config.filename =  'accounts_receivable';
    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      // Object.values(Fields.property_address),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
    );

    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"

    }];

    this.config.filters.sort = {
      field: 'invoice_number * 1 asc',
      dir: 'ASC'
    };

    this.config.filters.search['report_date'] = moment().format('YYYY-MM-DD');


    this.config.default_columns = [
      'property_name',
      'tenant_name',
      'unit_number',
      'invoice_date',
      'invoice_number',
      'lease_rent',
      'invoice_total_insurance',
      'invoice_total_fees',
      'invoice_sales_tax',
      'invoice_total_merchandise',
      'invoice_total_rent',
      'invoice_total_utilities',
      'invoice_total',
      'prepayment_info',
      'invoice_discounts',
      'invoice_balance',
      'lease_ending_balance'
    ]

    this.sql_tables += ' invoices inv ';
    this.sql_conditions = ' WHERE (inv.status = 1 or inv.voided_at is not null) and (inv.voided_at is null or DATE(inv.voided_at) > ' + connection.escape(this.report_date) + ') and ' +
      ' (select company_id from properties where id = inv.property_id ) = ' + this.company.id;

    this.sql_conditions += ' and ' + invoice.queries.invoice_balance + ' > 0 ';

    if(properties.length){
      this.sql_conditions += ' and inv.property_id in (' + properties.join(', ') + ")";
    }

    this.property_id = 'inv.property_id';
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_date){
      this.sql_conditions +=  " and inv.due < " + connection.escape(conditions.report_date);
    }

  }


}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = AccountsReceivableReport;
