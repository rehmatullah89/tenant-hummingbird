'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let unit_id             = " u.id ";
let property_id         = " u.property_id ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' u.category_id ';
let lease_id            = " (select MAX(id) from leases where status = 1 and (end_date is null or end_date > CURDATE()) and unit_id = " + unit_id + ") ";
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';
// let lead_id          = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';

class UnitsReport extends BaseReport{
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
      new reportQueries.Tenant({id: tenant_id},this.report_dates.end).queries,
      // new reportQueries.Lead({id: tenant_id}).queries,
      unit.queries,
      lease.queries,
      property.queries,
      category.queries,
      // property_address.queries,
    );


    this.config = {
      name: 'Spaces',
      filename: 'spaces',
      total_count: true,
      column_structure: [].concat(
        Object.values(Fields.property),
        // Object.values(Fields.property_address),
        Object.values(Fields.unit),
        Object.values(Fields.tenant),
        Object.values(Fields.tenant_summary)
      ),
      filter_structure: [
        {
          label: "Report Date",
          key: "report_date",
          input: "date"  
        }
      ],
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
      default_columns: [
        'property_number',
        'property_name',
        'unit_number',
        'unit_size',
        'unit_type',
        'unit_set_rate',
        'unit_price',
        'unit_status',
        'unit_category',
        'unit_amenities',
        'unit_floor'
      ]
    }

    this.base_table = 'u';
    this.tables = {
      units: 'u'
    };

    this.sql_tables += ' units u ';
    this.sql_conditions = ' where u.deleted is null';
    if(properties.length){
      this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    } else {
      this.sql_conditions += ' and (select company_id from properties where id = u.property_id) = ' + this.company.id;
    }
    
    this.property_id = 'u.property_id';
  }
  
  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions && conditions.unit_id) {
      this.sql_conditions += ` and ${sql_fragments['unit_id']} = ${conditions.unit_id}`; 
    }
  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = UnitsReport;
