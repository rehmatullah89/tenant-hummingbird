'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');


let pause_id            = " dp.id ";
let delinquency_id      = " dp.delinquencies_id ";
let lease_id            = " (select lease_id from delinquencies where id  = " + delinquency_id +  ") ";
let unit_id             = " (select unit_id from leases where id  = " + lease_id +  ") ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";

// tenant phone
// active military





class DelinquncyPausesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let date =  filters && filters.search && filters.search.report_date || moment().format('YYYY-MM-DD');

    let lease = new reportQueries.Lease({id: lease_id}, date, date);
    let tenant = new reportQueries.Tenant({id: contact_id}, date);

    // let lead = new reportQueries.Lead({id: tenant_id});
    let property = new reportQueries.Property({id: property_id}, date);
    let unit = new reportQueries.Unit({id: unit_id}, date);
    let delinquency = new reportQueries.Delinquency({id: delinquency_id}, date);
    let delinquency_pauses = new reportQueries.DelinquencyPause({id: pause_id}, date);
    
    
    this.sql_fragments = Object.assign({}, 
        delinquency.queries,
        delinquency_pauses.queries,
        tenant.queries,
        unit.queries,
        lease.queries,
        property.queries
    );

    this.config.name = 'Paused Delinquencies';
    this.config.filename =  'paused_delinquencies';
    this.config.key =  'paused_delinquencies';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.delinquency),
      Object.values(Fields.delinquency_pause),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
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
      'tenant_email',
      'tenant_phone',
      'tenant_active_military',
      'lease_total_past_due',
      'lease_paid_through_date', 
      'lease_days_late', 
      'delinquency_pause_date', 
      'delinquency_pause_paused_by_name', 
      'delinquency_paused_days', 
      'delinquency_pause_pause_reason',
    ];


    this.sql_tables += ' delinquencies_pauses dp ';
    this.sql_conditions = ` WHERE dp.end is null and start <= ${connection.escape(date)} and delinquencies_id in (select id from delinquencies where lease_id in (select id from leases where status = 1 and end_date <= ${ connection.escape(date) } or end_date is null  ))
        and (select company_id from properties where id = (select property_id from units where id = (SELECT unit_id from leases where id = (select lease_id from delinquencies where id = dp.delinquencies_id )))) = ${this.company.id }`;
    
        if(properties.length){
            this.sql_conditions += ` and (select property_id from units where id = (select unit_id from leases where id = (select lease_id from delinquencies where id = dp.delinquencies_id ))) in ( ${properties.join(', ')})`;
        }

        this.property_id = '(select property_id from units where id = (select unit_id from leases where id = (select lease_id from delinquencies where id = dp.delinquencies_id )))'

        
        console.log('queryy', this.sql_tables + this.sql_conditions )

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " dp.start ");
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
module.exports = DelinquncyPausesReport;

