'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let lease_id            = " l.id ";
let unit_id             =  " l.unit_id ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' (SELECT category_id from units where id = ' + unit_id + ') ';
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';
let lead_id             = ' (SELECT id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ') ';  
let touchpoints_id      = "(select MAX( id ) from lead_touchpoints where contact_id = " + contact_id + ") ";
let last_payment_id     = "(select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = " + lease_id + ") HAVING(MAX(created))) )";


class RentRollReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);




    let lease = new reportQueries.Lease({id: lease_id}, this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id}, this.report_dates.end);

    // let lead = new reportQueries.Lead({id: tenant_id});
    let property = new reportQueries.Property({id: property_id}, this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id}, this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id}, this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id}, this.report_dates.end);

    this.sql_fragments = Object.assign({},
      new reportQueries.Tenant({id: tenant_id}).queries,
      // new reportQueries.Lead({id: tenant_id}).queries,
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
      category.queries,
      // property_address.queries,
    );

    this.config.name = 'Rentals';
    this.config.filename =  'rentals';
    this.config.key =  'rentals';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
    );


    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"
    }];

    this.config.filters.sort = {
      field: 'start_date',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'property_name',
      'unit_number',
      'unit_size',
      'unit_category',
      'unit_status',
      'tenant_name',
      'lease_start_date',
      'lease_end_date',
      'lease_rent',
      'lease_next_billing_date',
      'lease_paid_through_date',
      'lease_balance',
      'lease_prepay_balance', 
      'lease_created_by_name'
    ];


    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.status = 1  and (select company_id from properties where id = (select property_id from units where id = l.unit_id )) = ' + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id ) in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id )';
  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " start_date ");
    }
  }

  setAdditionalConditions(connection, conditions, structure, columns, sql_fragments){
    for(let c in conditions){
      if(c === 'name' && conditions[c].trim().length){
        this.sql_conditions += ' and ( ' + sql_fragments['tenant_first'] + ' = ' + connection.escape(conditions[c]) +  ' or ' +
          sql_fragments['tenant_last'] + ' = ' + connection.escape(conditions[c]) + ') ';
      }
    }
  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = RentRollReport;

