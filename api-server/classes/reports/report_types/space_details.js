'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let unit_id             = " u.id ";
let category_id         = ' u.category_id ';
let lease_id            =  "(select MAX(id) from leases where status = 1 and (end_date is null or end_date > CURDATE()) and unit_id = " + unit_id + ") ";
// TODO this should be set as "primary tenant" 
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';

class SpaceDetailsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      lease.queries,
      category.queries,
    );


    this.config = {
      name: 'Spaces Details',
      filename: 'spaces_details',
      column_structure: [].concat(
        Object.values(Fields.unit),
        Object.values(Fields.tenant),
        Object.values(Fields.lease),
        Object.values(Fields.lease_summary),
        Object.values(Fields.tenant_summary)
      ),
      filter_structure: [],
      filters: {
        search: {
          search: ''
        },
        columns:[],
        sort: {
          field: 'unit_number',
          dir: 'ASC'
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
        'unit_number',
        'unit_status',
        'unit_type',
        'unit_space_mix',
        'unit_price',
        'unit_promotions',
        'unit_discounts',
        'unit_days_vacant',
        'tenant_name',
        'lease_standing',
        'lease_rent',
        'lease_balance',
        'lease_paid_through_date',
        'lease_days_late'
      ]
    }


    this.sql_tables += ' units u ';
    this.sql_conditions = ` WHERE u.deleted is null AND (select company_id from properties where id = u.property_id) = ` + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'u.property_id'

  }
  
  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions && conditions.unit_id) {
      this.sql_conditions += ` and ${sql_fragments['unit_id']} = ${conditions.unit_id}`; 
    }
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = SpaceDetailsReport;
