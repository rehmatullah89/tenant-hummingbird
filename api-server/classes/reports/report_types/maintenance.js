'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class  MaintenanceReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' maintenance ';
    this.sql_conditions = ' WHERE (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id ))) =' + this.company.id;


    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id )) in (' + properties.join(', ') + ")";
    }

    this.property_id = '(select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id ))'


  }
}

const sql_fragments = require(__dirname + '/../report_queries/maintenance.js');
const config = require(__dirname + '/../report_layouts/maintenance.js');
module.exports = MaintenanceReport;
