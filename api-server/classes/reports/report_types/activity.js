'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class ActivityReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' activity ';
    this.sql_conditions = ' WHERE (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = payment_methods.lease_id ))) = ' + this.company.id;
    if(properties.length){
      //this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    }

  }
}

const sql_fragments = require(__dirname + '/../report_queries/activity.js');
const config = require(__dirname + '/../report_layouts/activity.js');
module.exports = ActivityReport;
