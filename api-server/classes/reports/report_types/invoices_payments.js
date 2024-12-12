'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let invoice_id            = " ip.invoice_id ";
let payment_id            = " ip.payment_id ";
let payment_method_id     = " (SELECT payment_methods_id from payments where id = " + payment_id + ") ";
let lease_id              = " (select lease_id from invoices where id = " + invoice_id +  ") ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " (select property_id from invoices where id = " + invoice_id +  ") ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let category_id           = ' (SELECT category_id from units where id = ' + unit_id + ') ';
let contact_id            = " (select contact_id from invoices where id = " + invoice_id +  ") ";

class  InvoicesPaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let contact = new reportQueries.Contact({id: contact_id},this.report_dates.end);
    let payment = new reportQueries.Payment({id: payment_id},this.report_dates.end);
    let paymentMethod = new reportQueries.PaymentMethod({id: payment_method_id},this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let invoice = new reportQueries.Invoice({id: invoice_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      contact.queries,
      unit.queries,
      payment.queries,
      paymentMethod.queries,
      lease.queries,
      invoice.queries,
      property.queries,
      category.queries,
      property_address.queries,
    );



    this.config = {
      name: 'Applied Payments',
      filename: 'applied_payments',
      column_structure: [].concat(
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
        // Object.values(Fields.category),
        //Object.values(Fields.property_address)
      ),
      filter_structure: [
        {
          label: "Report Period",
          key: "report_period",
          input: "timeframe"
        }
      ],
      filters: {
        search: {
          search: '',
          report_period: {
            days: 0,
            end_date: "",
            label: "This Month",
            period: "",
            relation: "",
            start_date: "",
          }
        },
        columns:[],
        sort: {
          field: 'payment_date',
          dir: 'DESC'
        },
        pivot_mode: {
          type: '',
          column: {},
          row: {},
          pivot_field: {},
          agg_method: '',
        },
        groups:[],
        limit: 0,
        page:1,
        offset:0
      },
      default_columns:[
        'property_name',
        'tenant_name',
        'payment_ref_name',
        'unit_number',
        'payment_date',
        'lease_rent',
        'invoice_total_rent',
        'payment_amount',
        'payment_method',
        'method_last_4',
        'method_card_type',
        'invoice_line_product_type',
        'payment_amt_applied',
        'payment_amt_remaining',
        'lease_paid_through_date',
        'lease_lifetime_payments',
        'payment_notes'
      ]
    }

    // this.config =  JSON.parse(JSON.stringify(config));

    this.sql_tables += ' invoices_payments ip ';

    this.sql_conditions = ' WHERE invoice_id in (select id from invoices where status = 1) and payment_id in (select id from payments where status = 1) and (select company_id from properties where id = (select property_id from payments where id = ip.payment_id )) = ' + this.company.id;

    if(properties.length){
      this.sql_conditions += ' and (select property_id from payments where id = ip.payment_id) in (' + properties.join(', ') + ")";
    }

    this.property_id = '(select property_id from payments where id = ip.payment_id)'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " ip.date ");
    }
  }

}


const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;

module.exports = InvoicesPaymentsReport;
