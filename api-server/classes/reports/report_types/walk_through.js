'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Sql = require(__dirname + '/../../../modules/sql_snippets.js');

let unit_id             = " u.id ";
let property_id         = " u.property_id ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = " u.category_id ";
let lease_id            = " (select MAX(id) from leases where status = 1 and (end_date is null or end_date > CURDATE()) and unit_id = " + unit_id + ") ";
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) '; 
// let lead_id          = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';

class  InvoicesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    // let lead = new reportQueries.Lead({id: tenant_id});
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end,this.report_dates.start);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);
    let common = new reportQueries.Common();

    this.sql_fragments = Object.assign({},
      new reportQueries.Tenant({id: tenant_id}).queries,
      // new reportQueries.Lead({id: tenant_id}).queries,
      property.queries,
      unit.queries,
      lease.queries,
      category.queries,
      common.queries,
    );

    this.config.name = 'Walk Through Audit';
    this.config.filename =  'walk_through_audit';
    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      // Object.values(Fields.property_address),
      Object.values(Fields.unit),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.common),
    );

    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"
    }];

    this.config.filters.sort = {
      field: 'unit_walk_through_sort',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'unit_walk_through_sort',
      'unit_number',
      'unit_size',
      'unit_category',
      'tenant_name',
      'lease_standing',
      'lease_balance',
      'lease_paid_through_date',
      'lease_days_late',
      'unit_status',
      'lease_sched_move_out',
      'common_manager_notes',
    ]

    this.sql_tables += ' units u ';
    this.sql_conditions = ` WHERE u.deleted is null AND (select company_id from properties where id = u.property_id) = ` + this.company.id;
    this.sql_conditions += ` and u.id not in (${Sql.get_deactivated_spaces()})`;
    if(properties.length){
      this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'u.property_id';
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = InvoicesReport;