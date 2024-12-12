var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Loader = require('../report_fields/index').load;
var Filters = require('../report_filters/index').filters;

module.exports = {
  name: 'Units',
  filename: 'unit',
  column_structure: [

    // Fields.property.property_id,
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
    Fields.unit.unit_status,
    Fields.unit.unit_price,
    Fields.unit.unit_featured,
    Fields.unit.unit_category,
    Fields.unit.unit_overlocked,
    Fields.unit.unit_promotions,
    Fields.unit.unit_size,
    Fields.unit.unit_days_vacant,
    //Fields.unit_summary.unit_rent_variance,

    // Load these conditionally - only if they have units with storage
    // Fields.unit.unit_width,
    // Fields.unit.unit_length,
    // Fields.unit.unit_height,
    // Fields.unit.unit_storage_type,
    // Fields.unit.unit_door_type,
    // Fields.unit.unit_vehicle_storage,
    //
    // // Load these conditionally - only if they have units with storage
    // Fields.unit.unit_beds,
    // Fields.unit.unit_baths,
    // Fields.unit.unit_class,
    // Fields.unit.unit_pets,
    // Fields.unit.unit_parking,
    // Fields.unit.unit_laundry,

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

    Fields.lead.lead_source,
    // Fields.lead.lead_notes,
    Fields.lead.lead_created,

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
    Fields.lease.lease_days_late,
    Fields.lease_summary.lease_last_payment,
    Fields.lease_summary.lease_last_payment_source,
    Fields.lease_summary.lease_balance,
    Fields.lease_summary.lease_last_rent_change_date,
    Fields.lease_summary.lease_lifetime_billed,
    Fields.lease_summary.lease_lifetime_payments,
    // Fields.lease_summary.lease_next_billing_date,
    Fields.lease_summary.lease_paid_through_date,


    // TODO
    //Fields.customer.last_contacted, // necessity
  ],
  filter_structure: [
    Fields.property.property_id,
    // Fields.property.property_name,
    // Fields.property.property_num,
    // Fields.property.property_address,

    Fields.unit.unit_category_id,
    Fields.unit.unit_status,
    Fields.unit.unit_floor,
    Fields.unit.unit_number,
    Fields.unit.unit_type,
    Fields.unit.unit_description,
    Fields.unit.unit_available_date,
    Fields.unit.unit_price,
    Fields.unit.unit_featured,
    Fields.unit.unit_overlocked,
    Fields.unit.unit_promotions,
    Fields.unit.unit_size,
    Fields.unit.unit_amenities,

    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    //Fields.tenant_address,
    //Fields.tenant_phone,
    Fields.tenant.tenant_email,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    // Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,
    //Fields.tenant.tenant_last_contacted,

    Fields.lead.lead_source,
    // Fields.lead.lead_notes,
    Fields.lead.lead_created,

    Fields.lease.lease_start_date,
    Fields.lease.lease_end_date,
    Fields.lease.lease_rent,
    Fields.lease.lease_notes,
    Fields.lease.lease_standing_id,
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
    Fields.lease_summary.lease_last_rent_change_date,
    Fields.lease_summary.lease_lifetime_billed,
    Fields.lease_summary.lease_lifetime_payments,
  ],
  filters: {
    search: {},
    columns:[],
    sort: { 
      field: 'unit_number * 1 asc',
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
    'unit_size',
    'unit_category',
    'unit_floor',
    'unit_price',
    'unit_status',
    'unit_type'
  ]
}


