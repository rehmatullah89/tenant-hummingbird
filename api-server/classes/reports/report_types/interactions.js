'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class  InteractionsReport extends BaseReport{
  constructor(connection, company, filters, format, name) {
    super(connection, company, filters, format, name);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' interactions ';
    this.sql_conditions = ' WHERE (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = payment_methods.lease_id ))) = ' + this.company.id
  }
}

const sql_fragments = require(__dirname + '/../report_queries/interactions.js');
const config = require(__dirname + '/../report_layouts/interactions.js');
module.exports = InteractionsReport;
