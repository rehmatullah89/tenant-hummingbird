'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class ProductsReport extends BaseReport{
  constructor(connection, company, filters, format, name) {
    super(connection, company, filters, format, name);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' products ';
    this.sql_conditions = ' WHERE status = 1 and company_id = ' + this.company.id
  }
}

const sql_fragments = require(__dirname + '/../report_queries/products.js');
const config = require(__dirname + '/../report_layouts/products.js');
module.exports = ProductsReport;
