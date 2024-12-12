var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Loader = require('../report_fields/index').load;
var Filters = require('../report_filters/index').filters;

module.exports = {
  name: 'AccountingExports',
  filename: 'accounting_exports',
  column_structure: [

    Fields.accounting_exports.accounting_exports_date,
    Fields.accounting_exports.accounting_exports_range,
    Fields.accounting_exports.accounting_exports_type,
    Fields.accounting_exports.accounting_exports_method,
    Fields.accounting_exports.accounting_exports_generated_by,
    Fields.accounting_exports.accounting_exports_sent_to,

  ],
  filter_structure: [
    Fields.accounting_exports.accounting_exports_date,
  ],
  filters: {
    search: {},
    columns:[],
    sort: { 
      field: 'accounting_exports_date',
      dir: 'DESC'
    },
    pivot_mode: {
      enabled: false,
      column: {},
      metric: {
        field: {},
        method: ''
      },
      row: {}
    },
    groups:[],
    limit: 0,
    page:1,
    offset:0
  },
  default_columns:[
    'accounting_exports_date',
    'accounting_exports_range',
    'accounting_exports_type',
    'accounting_exports_method',
    'accounting_exports_generated_by',
    'accounting_exports_sent_to',
  ]
}


