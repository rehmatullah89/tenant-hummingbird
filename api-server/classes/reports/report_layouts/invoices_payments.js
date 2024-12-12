var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Filters = require('../report_filters/index').filters;

module.exports = {
  name: 'InvoicesPayments',
  filename:'invoices_payments',
  column_structure: [
    // Property

    Fields.property.property_name,
    Fields.property.property_num,
    Fields.property.property_address,
    Fields.property.property_country,
    Fields.property.property_state,
    Fields.property.property_city,

    // Unit
    Fields.unit.unit_number,
    Fields.unit.unit_floor,
    Fields.unit.unit_type,
    Fields.unit.unit_description,
    Fields.unit.unit_available_date,
    Fields.unit.unit_status,
    Fields.unit.unit_price,
    Fields.unit.unit_size,
    //Fields.unit.unit_sqft,
    Fields.unit.unit_featured,
    Fields.unit.unit_category,
    Fields.unit.unit_overlocked,

    //Fields.unit_summary.unit_rent_variance,

    //Tenants
    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    //Fields.tenant_address,
    //Fields.tenant_phone,
    Fields.tenant.tenant_email,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,
    Fields.tenant.tenant_last_contacted,

    // Lease
    Fields.lease.lease_start_date,
    Fields.lease.lease_end_date,
    Fields.lease.lease_rent,
    Fields.lease.lease_standing,
    Fields.lease.lease_send_invoice,

    Fields.lease.lease_bill_day,
    Fields.lease.lease_monthly,
    Fields.lease.lease_decline_insurance,
    Fields.lease.lease_rented_days,
    Fields.lease.lease_sign_up_promo,
    Fields.lease.lease_discount,
    //
    // Fields.lease_summary.lease_last_payment,
    // Fields.lease_summary.lease_last_payment_source,
    // Fields.lease_summary.lease_balance,

    Fields.invoice.invoice_number,
    Fields.invoice.invoice_date,
    Fields.invoice.invoice_due,
    Fields.invoice.invoice_type,
    Fields.invoice.invoice_period_start,
    Fields.invoice.invoice_period_end,
    Fields.invoice.invoice_status,
    Fields.invoice.invoice_subtotal,
    Fields.invoice.invoice_sales_tax,
    Fields.invoice.invoice_discounts,
    Fields.invoice.total,
    Fields.invoice.invoice_balance,
    Fields.invoice.invoice_payments,
    Fields.invoice_summary.invoice_days_past_due,
    Fields.invoice_summary.invoice_credits,
    Fields.invoice_summary.invoice_writeoffs,
    Fields.invoice_summary.invoice_total_fees,
    Fields.invoice_summary.invoice_total_merchandise,
    Fields.invoice_summary.invoice_total_rent,
    Fields.invoice_summary.invoice_total_insurance,
    Fields.invoice_summary.invoice_total_utilities,
    Fields.invoice_summary.invoice_total_deposits,
    // Fields.invoice_summary.billing_concessions, this is total discounts

    // Payments
    // Fields.payment.payment_lease_id,
    Fields.payment.payment_date,
    Fields.payment.payment_ref_name,
    Fields.payment.payment_method,
    Fields.payment.payment_trans_id,
    Fields.payment.payment_number,
    Fields.payment.payment_created,
    Fields.payment.payment_status,
    Fields.payment.payment_amount,
    Fields.payment.payment_source,
    Fields.payment.payment_status_desc,
    Fields.payment.payment_notes,
    Fields.payment.payment_accepted_by,

    Fields.payment_summary.payment_amt_applied,
    Fields.payment_summary.payment_remaining,

    Fields.payment_method.method_name,
    Fields.payment_method.method_name_on_card,
    Fields.payment_method.method_address,
    Fields.payment_method.method_type,
    Fields.payment_method.method_exp,
    Fields.payment_method.method_last_4,
    Fields.payment_method.method_card_type,
    Fields.payment_method.method_acct_num,
    Fields.payment_method.method_routing_num,
    Fields.payment_method.method_is_autopay,

  ],
  filter_structure: [


  ],
  filters: {
    search: {},
    columns:[],
    sort: {
      field: 'payment_date',
      dir: 'DESC'
    },
    pivot_mode: {
      type: '',
      column: {},
      row: {},
      pivot_field: {},
      agg_method: '',
    },
    groups:[],
    limit: 0,
    page:1,
    offset:0

  },
  default_columns:[
    'payment_date',
    'payment_ref_name',
    'payment_method',
    'payment_amount',
    'invoice_number'
  ]




}
