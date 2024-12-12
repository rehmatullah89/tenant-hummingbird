var Fields = require('../report_fields/index').fields;
var Filters = require('../report_filters/index').filters;

module.exports = {
  name: 'PaymentMethods',
  filename:'payment_methods',
  column_structure: [
    // Property
    // Fields.property.property_name,
    // Fields.property.property_num,
    //Fields.property.property_address,

    // Payments
    Fields.product.product_name,
    Fields.product.product_description,
    Fields.product.product_price,
    Fields.product.product_type,
    Fields.product.product_taxable,
    Fields.product_summary.product_last_billed,
    Fields.product_summary.product_total_billed,

  ],
  filter_structure: [],
  filters: {
    search: {},
    columns:[],
    sort: {
      field: 'product_name',
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
    'product_name',
    'product_description',
    'product_type',
    'product_price',
    'pmt_mth_card_type',
    'product_last_billed',
    'product_total_billed'
  ]
};
