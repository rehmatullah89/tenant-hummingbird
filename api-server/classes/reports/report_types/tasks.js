'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class TasksReport extends BaseReport{
  constructor(connection, company, filters, format, name, report_name) {
    super(connection, company, filters, format, name,report_name);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' todos ';
    this.sql_conditions = ' WHERE (select company_id from events where id = todos.event_id) = ' + this.company.id
  }
}

const sql_fragments = require(__dirname + '/../report_queries/tasks.js');
const config = require(__dirname + '/../report_layouts/tasks.js');
module.exports = TasksReport;
