'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class ApplicationsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' applications ';
    this.sql_conditions = ' WHERE (select company_id from properties where id = (select property_id from units where id = applications.unit_id)) = ' + this.company.id;

    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = applications.unit_id) in (' + properties.join(', ') + ")";
    }

    this.property_id = '(select property_id from units where id = applications.unit_id)';

  }
}

const sql_fragments = require(__dirname + '/../report_queries/applications.js');
const config = require(__dirname + '/../report_layouts/applications.js');
module.exports = ApplicationsReport;
