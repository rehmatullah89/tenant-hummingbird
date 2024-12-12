'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let refund_id             = " r.id ";
let payment_id            = " r.payment_id ";
let payment_method_id     = ` (select payment_methods_id from payments where id = ${payment_id}) `;
let property_id           = ` (select property_id from payments where id = ${payment_id}) `;
let contact_id            = ` (select contact_id from payments where id = ${payment_id}) `;

class PaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let contact = new reportQueries.Contact({id: contact_id},this.report_dates.end);
    let refund = new reportQueries.Refund({id: refund_id},this.report_dates.end);
    let payment = new reportQueries.Payment({id: payment_id},this.report_dates.end);
    let paymentMethod = new reportQueries.PaymentMethod({id: payment_method_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      contact.queries,
      refund.queries,
      payment.queries,
      paymentMethod.queries,
      property.queries
    );

    this.config.name = 'Refunds';
    this.config.filename = 'refunds';
    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.tenant),
      Object.values(Fields.refund),
      Object.values(Fields.payment),
      Object.values(Fields.payment_summary),
      Object.values(Fields.payment_method)
    )



    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"

    }];


    this.config.filters.sort = {
      field: 'refund_date',
      dir: 'DESC'
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
      'refund_date',
      'payment_unit_numbers',
      'refund_to',
      'refund_type',
      'payment_method',
      'method_card_type',
      'method_acct_num',
      'refund_amount',
      'refund_trans_id'
    ]

    this.sql_tables += ' refunds r ';
    this.sql_conditions = ` WHERE (select company_id from properties where id = (${property_id}) ) = ${this.company.id}`;


    if(properties.length){
      this.sql_conditions += ` and (${property_id}) in (${properties.join(', ')})`;
    }

    this.property_id = property_id;


  }
  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " r.date ");
    }
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = PaymentsReport;
