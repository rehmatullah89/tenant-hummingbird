'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let payment_id            = " p.id ";
let payment_method_id     = " p.payment_methods_id ";
let property_id           = " (select property_id from payments where id = " + payment_id +  ") ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";
let contact_id            = ' (SELECT contact_id from payments where id = ' + payment_id + ') ';


class FailedPaymentsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);



    this.sql_fragments = Object.assign({},
      new reportQueries.Payment({id: payment_id}, this.report_dates.end).queries,
      new reportQueries.Property({id: property_id}, this.report_dates.end).queries,
      new reportQueries.Tenant({id: contact_id}, this.report_dates.end).queries,
      new reportQueries.PaymentMethod({id: payment_method_id},this.report_dates.end).queries,
    );

    this.config.name = 'Failed Payments';
    this.config.filename =  'failed_payments';

    this.config.column_structure = [].concat(
      Object.values(Fields.payment),
      Object.values(Fields.property),
      Object.values(Fields.tenant),
      // Object.values(Fields.property_address),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.payment_method),
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
      field: 'payment_date',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'tenant_name',
      'payment_unit_numbers',
      'payment_amount',
      'payment_method',
      'payment_date',
      'payment_ref_name',
      'method_last_4',
      'payment_status_desc',
      'payment_trans_id',
      'payment_auth_code',
    ]


    this.sql_tables += ' payments p ';
    this.sql_conditions = ' WHERE p.status = 0 and (select company_id from properties where id = p.property_id ) = ' + this.company.id

    if(properties.length){
      this.sql_conditions += ' and property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = "property_id";
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " p.date ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = FailedPaymentsReport;
