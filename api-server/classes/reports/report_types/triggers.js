'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class TriggersReport extends BaseReport{
  constructor(connection, company, filters, format, name) {
    super(connection, company, filters, format, name);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' events ';
    this.sql_conditions = ' WHERE type = "trigger" and company_id = ' + this.company.id
  }
}

const sql_fragments = require(__dirname + '/../report_queries/triggers.js');
const config = require(__dirname + '/../report_layouts/triggers.js');
module.exports = TriggersReport;
