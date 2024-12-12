var Fields = require('../report_fields/index').fields;
var Filters = require('../report_filters/index').filters;

module.exports = {
  name: 'PaymentMethods',
  filename:'payment_methods',
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
    Fields.unit.unit_price,
    Fields.unit.unit_featured,
    Fields.unit.unit_category,
    Fields.unit.unit_overlocked,

    //Tenants
    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    Fields.tenant.tenant_address,
    Fields.tenant.tenant_email,
    // Fields.tenant.tenant_phone,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,

    // Lease
    // Fields.lease.lease_start_date,
    // Fields.lease.lease_end_date,
    // Fields.lease.lease_rent,
    // Fields.lease.lease_notes,
    // Fields.lease.lease_standing,
    // Fields.lease.lease_status,
    // Fields.lease.lease_send_invoice,
    // Fields.lease.lease_bill_day,
    // Fields.lease.lease_monthly,
    // Fields.lease.lease_decline_insurance,
    // Fields.lease.lease_rented_days,
    // Fields.lease.lease_sign_up_promo,
    //
    // Fields.lease_summary.lease_balance,
    // Fields.lease_summary.lease_next_billing_date,
    // Fields.lease_summary.lease_paid_through_date,

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
    //Fields.payment_method.method_autopay_rent,
    //Fields.payment_method.method_autopay_other

    // Payments
    Fields.payment_method_summary.method_last_declined,
    Fields.payment_method_summary.method_last_declined_reason,
    Fields.payment_method_summary.method_times_declined,
    Fields.payment_method_summary.method_total_payments,
    Fields.payment_method_summary.method_last_billed,
    Fields.payment_method_summary.method_times_billed,
    Fields.payment_method_summary.method_autopay_count,
    Fields.payment_method_summary.method_total_auto_pay,
  ],
  filter_structure: [
    Fields.property.property_id,
    // Fields.property.property_name,
    // Fields.property.property_num,
    // Fields.property.property_address,

    // // Unit
    // Fields.unit.unit_number,
    // Fields.unit.unit_floor,
    // Fields.unit.unit_type,
    // Fields.unit.unit_description,
    // Fields.unit.unit_available_date,
    // Fields.unit.unit_price,
    // Fields.unit.unit_featured,
    // Fields.unit.unit_category,
    // Fields.unit.unit_overlocked,

    //Tenants
    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    Fields.tenant.tenant_address,
    Fields.tenant.tenant_email,
    // Fields.tenant.tenant_phone,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,

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

    Fields.payment_method_summary.method_last_declined,
    Fields.payment_method_summary.method_last_declined_reason,
    Fields.payment_method_summary.method_times_declined,
    Fields.payment_method_summary.method_total_payments,
    Fields.payment_method_summary.method_last_billed,
    Fields.payment_method_summary.method_times_billed,
    Fields.payment_method_summary.method_autopay_count,
    Fields.payment_method_summary.method_total_auto_pay,

  ],
  filters: {
    search: {},
    columns:[],
    sort: {
      field: 'method_type',
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
    'method_name',
    'method_name_on_card',
    'method_type',
    'method_exp',
    'method_card_type',
    'method_last_4',
    'method_is_autopay'
  ]
};
