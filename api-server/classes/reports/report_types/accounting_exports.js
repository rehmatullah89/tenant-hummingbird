'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let aeh_id             = " aeh.id ";

class  AccountingReportExport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    filters = filters || {};
    filters.search = filters.search || {};
    let date = filters.search.report_date || moment().format('YYYY-MM-DD');

    //Initialize the relevant qeureis here
    let accounting_export = new reportQueries.AccountingExport({id: aeh_id}, this.report_dates.end);

    this.sql_fragments = Object.assign({},
      accounting_export.queries
    );

    this.config.name = 'Accounting Export';
    this.config.filename =  'accounting_exports';
    this.config.column_structure = [].concat(
      Object.values(Fields.accounting_exports),
    );

    this.config.filters.sort = {
      field: 'accounting_exports_date',
      dir: 'DESC'
    };


    this.config.default_columns = [
      'accounting_exports_date',
      'accounting_exports_range',
      'accounting_exports_type',
      'accounting_exports_method',
      'accounting_exports_generated_by',
      'accounting_exports_sent_to',
    ]
    this.sql_tables += ' accounting_export_history aeh ';
    this.sql_conditions = ` WHERE aeh.company_id =  ${this.company.id} `; 

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
  }


}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = AccountingReportExport;
