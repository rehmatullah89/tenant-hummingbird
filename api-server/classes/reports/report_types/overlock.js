'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Sql = require(__dirname + '/../../../modules/sql_snippets.js');


let unit_id             = " u.id ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' (SELECT category_id from units where id = ' + unit_id + ') ';
let lease_id            =  "(select MAX(id) from leases where status = 1 and (end_date is null or end_date > CURDATE()) and unit_id = " + unit_id + ") ";
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';
// let lead_id             = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) '; 

class OverlockedUnitsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    // let lead = new reportQueries.Lead({id: tenant_id});
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      // new reportQueries.Lead({id: tenant_id}).queries,
      unit.queries,
      lease.queries,
      property.queries,
      category.queries,
      // property_address.queries,
    );

    this.config.name = 'Spaces Overlock or Unlock';
    this.config.filename =  'overlocked_spaces';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary)
    );


    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'property_name',
      'unit_number',
      'tenant_name',
      //'unit_status',
      'unit_size',
      'unit_overlocked',
      //'lease_standing',
      'lease_start_date',
      'lease_paid_through_date',
      'lease_balance',
      'lease_days_late',
      'lease_rent_past_due',
      'lease_fees_past_due',
      'lease_other_past_due',
      'lease_tax_past_due',
      // 'lease_past_due_paid',
      'tenant_last_contacted_days',
      'tenant_last_contacted_message',
      'tenant_last_contacted_method',
      'tenant_last_contacted_by',
    ];


    this.sql_tables += ' units u ';
    this.sql_conditions = ' WHERE (select company_id from properties where id = u.property_id) = ' + this.company.id;
    this.sql_conditions += ` and ${Sql.unit_overlocked_status(unit_id, this.report_dates.end)} in ('Overlocked', 'Remove Overlock', 'To Overlock')`
    if(properties.length){
      this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'u.property_id';
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = OverlockedUnitsReport;
