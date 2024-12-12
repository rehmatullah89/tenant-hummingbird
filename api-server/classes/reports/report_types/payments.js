'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let payment_id            = " p.id ";
let payment_method_id     = " p.payment_methods_id ";
let property_id           = " p.property_id";
let contact_id            = " p.contact_id ";



class PaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let contact = new reportQueries.Contact({id: contact_id},this.report_dates.end);
    let payment = new reportQueries.Payment({id: payment_id},this.report_dates.end);
    let paymentMethod = new reportQueries.PaymentMethod({id: payment_method_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);



    this.sql_fragments = Object.assign({},
      tenant.queries,
      contact.queries,
      payment.queries,
      paymentMethod.queries,
      property.queries
    );

    this.config.name = 'Payments';
    this.config.filename = 'payments';
    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.tenant),
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
      field: 'payment_date asc',
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
      'property_name',
      'tenant_name',
      'payment_ref_name',
      'payment_date',
      'payment_unit_numbers',
      'payment_amount',
      'payment_refunds',
      'payment_net',
      'payment_method',
      'method_last_4',
      'method_card_type',
      'payment_rent_paid',
      'payment_fees_paid',
      'payment_coverage_paid',
      'payment_merchandise_paid',
      'payment_tax_paid',
      'payment_deposit_paid', 
      'payment_auction_paid',
      'payment_notes',
      'payment_accepted_by_name'
    ]

    this.sql_tables += ' payments p ';
    this.sql_conditions = ' WHERE p.status = 1 and p.credit_type = "payment" and (select company_id from properties where id = p.property_id ) = ' + this.company.id


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
module.exports = PaymentsReport;
