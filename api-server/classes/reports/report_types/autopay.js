'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let lease_id              = " lpm.lease_id ";
let payment_method_id     = " lpm.payment_method_id "
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let property_id           = " (select property_id from units where id = " + unit_id +  ") ";
let tenant_id             = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';



class  AutopayReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let date = this.filters && this.filters.search?.report_date || moment().format('YYYY-MM-DD');

    let tenant = new reportQueries.Tenant({id: tenant_id}, date);
    let paymentMethod = new reportQueries.PaymentMethod({id: payment_method_id});
    let lease = new reportQueries.Lease({id: lease_id}, date, date);
    let property = new reportQueries.Property({id: property_id}, date);
    let unit = new reportQueries.Unit({id: unit_id}, date);




    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      paymentMethod.queries,
      lease.queries,
      property.queries,
    );

      this.config.name = 'Autopay';
      this.config.filename =  'autopay';
      this.config.column_structure = [].concat(
        Object.values(Fields.property),
        Object.values(Fields.unit),
        Object.values(Fields.tenant),
        Object.values(Fields.tenant_summary),
        Object.values(Fields.lease),
        Object.values(Fields.lease_summary),
        Object.values(Fields.payment_method),
      );

      this.config.filter_structure = [{
        label: "Report Date",
        key: "report_date",
        input: "date"
      }];

      this.config.filters.sort = {
        field: 'invoice_number',
        dir: 'ASC'
      };

      this.config.filters.search['report_date'] = moment().format('YYYY-MM-DD');


      this.config.default_columns = [
        'tenant_name',
        'unit_number',
        'method_name_on_card',
        'lease_next_billing_date',
        'method_type',
        'method_card_type',
        'method_last_4',
        'method_exp',
      ]


    this.sql_tables += ' leases_payment_methods lpm ';
    this.sql_conditions = ` WHERE (select company_id from contacts where id = (select contact_id from payment_methods where id = lpm.payment_method_id )) = ` + this.company.id;
    this.sql_conditions += ` and (select status from leases where id = lpm.lease_id) = 1 and (select start_date from leases where id = lpm.lease_id) <= '` + date + `' and ( (select end_date from leases where id = lpm.lease_id) > '` + date + `' or (select end_date from leases where id = lpm.lease_id) is null )`;
    // deleted should be after the end date of the report.  If you want to see payment methods that were deleted during this time, set DATE(lpm.deleted) > this.report_dates.start
    this.sql_conditions += ` and DATE(lpm.created_at) <= '` + date + `' and (lpm.deleted is null or DATE(lpm.deleted) > '` + date + `' ) `;

    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = (select unit_id from leases where id = lpm.lease_id)) in (' + properties.join(', ') + ")";
    }

    this.property_id = '(select property_id from units where id = (select unit_id from leases where id = lpm.lease_id))'

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    // if(conditions.report_period){
    //   this.sql_conditions += this.setTimeframes(conditions.report_period, " DATE(lpm.created_at) ");
    // }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = AutopayReport;
