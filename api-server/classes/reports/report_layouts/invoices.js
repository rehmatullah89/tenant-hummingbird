var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Loader = require('../report_fields/index').load;
var Filters = require('../report_filters/index').filters;


module.exports = {
    name: 'Invoices',
    filename: 'invoices',
    column_structure: [
      Fields.property.property_name,
      Fields.property.property_num,
      Fields.property.property_address,
      Fields.property.property_country,
      Fields.property.property_state,
      Fields.property.property_city,

      Fields.unit.unit_number,
      Fields.unit.unit_floor,
      Fields.unit.unit_type,
      Fields.unit.unit_description,
      Fields.unit.unit_available_date,
      Fields.unit.unit_price,
      Fields.unit.unit_featured,
      Fields.unit.unit_category,
      Fields.unit_summary.unit_rent_variance,
      Fields.unit.unit_overlocked,

      Fields.tenant.tenant_first,
      Fields.tenant.tenant_last,
      Fields.tenant.tenant_address,
      Fields.tenant.tenant_email,
      Fields.tenant.tenant_phone,
      Fields.tenant.tenant_gender,
      Fields.tenant.tenant_ssn,
      Fields.tenant.tenant_dob,
      Fields.tenant.tenant_driver_license,
      Fields.tenant.tenant_active_military,
      Fields.tenant.tenant_military_branch,

      Fields.tenant_summary.tenant_last_contacted,
      Fields.tenant_summary.tenant_last_contacted_days,
      Fields.tenant_summary.tenant_last_contacted_message,
      Fields.tenant_summary.tenant_last_contacted_method,
      Fields.tenant_summary.tenant_last_contacted_by,

      Fields.lease.lease_start_date,
      Fields.lease.lease_end_date,
      Fields.lease.lease_rent,
      Fields.lease.lease_notes,
      Fields.lease.lease_standing,
      Fields.lease.lease_status,
      Fields.lease.lease_send_invoice,
      Fields.lease.lease_bill_day,
      Fields.lease.lease_monthly,
      Fields.lease.lease_decline_insurance,
      Fields.lease.lease_rented_days,
      Fields.lease.lease_sign_up_promo,

      Fields.lease_summary.lease_balance,
      Fields.lease_summary.lease_next_billing_date,
      Fields.lease_summary.lease_paid_through_date,
      Fields.lease_summary.lease_lifetime_billed,
      Fields.lease_summary.lease_lifetime_payments,

      Fields.invoice.invoice_number,
      Fields.invoice.invoice_date,
      Fields.invoice.invoice_due,
      Fields.invoice.invoice_type,

      Fields.invoice.invoice_period_start,
      Fields.invoice.invoice_period_end,
      Fields.invoice.invoice_status,

      Fields.invoice_summary.invoice_days_past_due,
      Fields.invoice_summary.invoice_total,
      Fields.invoice_summary.invoice_payments,
      Fields.invoice_summary.invoice_balance,
      Fields.invoice_summary.invoice_discounts,
      Fields.invoice_summary.invoice_writeoffs,
      Fields.invoice_summary.invoice_credits,
      Fields.invoice_summary.invoice_sales_tax,

      Fields.invoice_summary.invoice_total_fees,
      Fields.invoice_summary.invoice_total_merchandise,
      Fields.invoice_summary.invoice_total_rent,
      Fields.invoice_summary.invoice_total_insurance,
      Fields.invoice_summary.invoice_total_utilities,
      Fields.invoice_summary.invoice_total_deposits,
      //Fields.invoice_summary.invoice_promtions,  // should list promotions

    ],
    filter_structure: [

      Fields.property.property_id,
      // Fields.property.property_name,
      // Fields.property.property_num,
      Fields.unit.unit_number,
      Fields.unit.unit_category_id,
      Fields.lease.lease_id,
      Fields.lease.lease_start_date,
      Fields.invoice.invoice_number,
      Fields.invoice.invoice_date,
      Fields.invoice.invoice_due,
      Fields.invoice.invoice_type,
      Fields.invoice.invoice_status,
      Fields.invoice_summary.invoice_days_past_due,
      Fields.invoice_summary.invoice_balance,

    ],
    filters: {
      search: {},
      columns:[],
      sort: {
        field: 'unit_number',
        dir: 'ASC'
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
      'unit_number',
      'unit_category',
      'tenant_first',
      'tenant_last',
      'lease_rent',
      'lease_balance',
      'invoice_total',
      'invoice_balance',
    ]


  }
