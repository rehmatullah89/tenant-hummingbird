'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');



let delinquency_id      = " d.id ";
let lease_id            = " (select lease_id from delinquencies where id  = " + delinquency_id +  ") ";
let unit_id             = " (select unit_id from leases where id  = " + lease_id +  ") ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";

// tenant phone
// active military





class DelinquncyReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let date =  filters && filters.search && filters.search.report_date || moment().format('YYYY-MM-DD');

    let lease = new reportQueries.Lease({id: lease_id}, date, date);
    let tenant = new reportQueries.Tenant({id: contact_id}, date);

    // let lead = new reportQueries.Lead({id: tenant_id});
    let property = new reportQueries.Property({id: property_id}, date);
    let unit = new reportQueries.Unit({id: unit_id}, date);
    let delinquency = new reportQueries.Delinquency({id: delinquency_id}, date);
    
    
    
    this.sql_fragments = Object.assign({}, 
        delinquency.queries,
        tenant.queries,
        unit.queries,
        lease.queries,
        property.queries
    );

    this.config.name = 'Delinquencies';
    this.config.filename =  'delinquencies';
    this.config.key =  'delinquencies';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.delinquency),
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
      field: 'lease_days_late',
      dir: 'DESC'
    };

    this.config.default_columns = [
      'property_name',
      'tenant_name',
      'tenant_email',
      'tenant_phone',
      'tenant_active_military', // TODO change!
      'lease_paid_through_date', 
      'unit_number',
      'unit_type',
      'lease_total_past_due',
      'lease_standing', 
      'unit_overlocked', 
      'delinquency_stage', 
      'lease_days_late',
      "delinquency_status",
    ];

    this.config.filters.search['delinquency_status'] = ["Active", "Paused"];


    this.sql_tables += ' delinquencies d ';
    this.sql_conditions = ` WHERE start_date <= ${connection.escape(date)} 
        and (select company_id from properties where id = (select property_id from units where id = (SELECT unit_id from leases where id = d.lease_id ))) = ${this.company.id }`;
    
        if(properties.length){
            this.sql_conditions += ` and (select property_id from units where id = (select unit_id from leases where id = d.lease_id)) in ( ${properties.join(', ')})`;
        }

        this.property_id = '(select property_id from units where id = (select unit_id from leases where id = d.lease_id))'

        console.log(this.sql_tables + this.sql_conditions);

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " d.start_date ");
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
module.exports = DelinquncyReport;

