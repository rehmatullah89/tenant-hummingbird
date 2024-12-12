var Fields = require('../report_fields/index').fields;
var Filters = require('../report_filters/index').filters;



module.exports = {
  name: 'Triggers',
  filename: 'triggers',
  column_structure: [
    // Property
    // Fields.property.property_name,
    // Fields.property.property_num,
    // Fields.property.property_address,

    // Unit
    Fields.unit.unit_number,
    Fields.unit.unit_floor,
    Fields.unit.unit_type,
    Fields.unit.unit_description,
    Fields.unit.unit_available_date,
    Fields.unit.unit_status,
    Fields.unit.unit_price,
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
    //Fields.tenant.tenant_last_contacted,

    // Lease
    Fields.lease.lease_start_date,
    Fields.lease.lease_end_date,
    Fields.lease.lease_rent,
    Fields.lease.lease_notes,
    Fields.lease.lease_standing,
    Fields.lease.lease_status,
    Fields.lease.lease_send_invoice,
    //Fields.lease.lease_security_deposit,
    Fields.lease.lease_bill_day,
    Fields.lease.lease_monthly,
    Fields.lease.lease_decline_insurance,
    Fields.lease.lease_rented_days,
    Fields.lease.lease_sign_up_promo,

    Fields.lease_summary.lease_last_payment,
    Fields.lease_summary.lease_last_payment_source,
    Fields.lease_summary.lease_balance,
    // Fields.lease_summary.lease_next_billing_date,
    // Fields.lease_summary.lease_paid_through_date,


    Fields.task.task_details,
    Fields.task.task_completed,
    Fields.task.task_created_by,
    Fields.task.task_assigned_to,
    Fields.task.task_snoozed_count,
    Fields.task.task_notes,
    Fields.task.task_completed_at,
    Fields.task_summary.task_time_to_complete

  ],
  filter_structure: [
  ],
  filters:{
    search: {},
    columns:[],
    sort: {
      field: 'date',
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
    'task_assigned_to',
    'task_details',
    'task_completed',
    'task_created_by',
    'task_snoozed_count',
    'task_notes',
    'task_completed_at',
    'task_time_to_complete'
  ]





}
