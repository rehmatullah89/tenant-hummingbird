'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let invoice_id            = " inv.id ";
let lease_id              = " inv.lease_id ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " inv.property_id ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let category_id           = ' (SELECT category_id from units where id = ' + unit_id + ') ';
// let tenant_id             = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';
let tenant_id             = ' inv.contact_id ';




class  InvoicesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    // let contact = new reportQueries.Contact({id: contact_id});
    // let payment = new reportQueries.Payment({id: payment_id});
    // let paymentMethod = new reportQueries.PaymentMethod({id: payment_id});
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let invoice = new reportQueries.Invoice({id: invoice_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);

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

    this.config.name = 'Voided Invoices';
    this.config.filename =  'voided_invoices';
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
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_voided_date',
      dir: 'DESC'
    };

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    };


    this.config.default_columns = [
      'property_name',
      'invoice_voided_date',
      'unit_number',
      'tenant_name',
      'invoice_number',
      'invoice_total',
      'invoice_voided_by'
    ];


    this.sql_tables += ' invoices inv ';
    this.sql_conditions = ` WHERE inv.status = -1 and (select company_id from properties where id = inv.property_id ) = ${this.company.id}`;
    if(properties.length){
      this.sql_conditions += ' and inv.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'inv.property_id';

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " inv.voided_at ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = InvoicesReport;
