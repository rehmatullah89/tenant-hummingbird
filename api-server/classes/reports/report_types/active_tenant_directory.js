'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let lease_id            = " l.id ";
let unit_id             = " l.unit_id ";
// TODO this should be set as "primary tenant"
let contact_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';


class ActiveTenantDirectoryReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      lease.queries
    );



    this.config.name = 'Active Tenant Directory';
    this.config.filename =  'active_tenant_directory';

    console.log(Object.values(Fields.lease));


    this.config.column_structure = [].concat(
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
    );


    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'unit_number',
      'tenant_name',
      'tenant_address1',
      'tenant_address2',
      'tenant_city',
      'tenant_state',
      'tenant_country',
      'tenant_zip',
      'tenant_phone',
      'tenant_email',
      'lease_standing',
      'lease_balance'
    ];

    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.status = 1 and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null) and (select company_id from properties where id = (select property_id from units where id = l.unit_id and number != "POS$")) = ' + this.company.id
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id and number != "POS$") in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id and number != "POS$")'

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " select date from payments where id = ip.payment_id ");
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
module.exports = ActiveTenantDirectoryReport;

