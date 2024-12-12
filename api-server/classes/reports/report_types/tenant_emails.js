'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let lease_id            = " l.id ";
let unit_id             = " l.unit_id ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';


class TenantEmailsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);

    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
    );



    this.config.name = 'Tenant Emails';
    this.config.filename =  'tenant_emails';

    console.log(Object.values(Fields.lease));

    this.config.filter_structure = [];
    this.config.filters = {
        search: {
          search: ''
        },
        columns:[],
        sort: {
            field: 'tenant_name',
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
      }


    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
    );



    this.config.default_columns = [
      'property_number',
      'property_name',
      'unit_number',
      'tenant_name',
      'tenant_email',
      'lease_start_date',
      'lease_end_date',
      'lease_standing'
    ];

    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.status = 1 and (select company_id from properties where id = (select property_id from units where id = l.unit_id and number != "POS$")) = ' + this.company.id
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id and number != "POS$") in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id and number != "POS$")'

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
module.exports = TenantEmailsReport;

