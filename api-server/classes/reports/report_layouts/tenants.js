var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Loader = require('../report_fields/index').load;
var Filters = require('../report_filters/index').filters;

let struct = '';

    //   Leads
    //   Fields.lead_last_contacted,
    //   Fields.lead_last_contacted_days,
    //   Fields.lead_source,

module.exports = {
	name: 'Tenants',
	filename: 'tenants',
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
    Fields.unit_summary.unit_rent_variance,

    // Tenant
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

    // leads
    Fields.lead.lead_source,
    Fields.lead.lead_notes,
    Fields.lead.lead_created,
    Fields.lead.lead_status,

    Fields.lead.lead_property_name,
    Fields.lead.lead_property_num,
    Fields.lead.lead_property_address,
    Fields.lead.lead_category_name,
    Fields.lead.lead_unit_number,

    Fields.lead.touchpoints_platform_source,
    Fields.lead.touchpoints_platform_device,
    Fields.lead.touchpoints_request_url,
    Fields.lead.touchpoints_url,
    Fields.lead.touchpoints_domain,
    Fields.lead.touchpoints_device,
    Fields.lead.touchpoints_source,
    Fields.lead.touchpoints_medium,
    Fields.lead.touchpoints_keyword,
    Fields.lead.touchpoints_cid,
    Fields.lead.touchpoints_gclid,
    Fields.lead.touchpoints_fbclid,
    Fields.lead.touchpoints_created,
    Fields.lead.touchpoints_event_type,
    Fields.lead.touchpoints_recordtype,


    // Lease
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
    Fields.lease.lease_created_by, 
    Fields.lease.lease_payment_cycle,
    Fields.lease.lease_next_payment_cycle,
    Fields.lease.lease_payment_cycle_bill,


    // Lease Summary
    Fields.lease_summary.lease_last_payment,
    Fields.lease_summary.lease_last_payment_date,
    Fields.lease_summary.lease_last_payment_source,
    Fields.lease_summary.lease_balance,
    Fields.lease_summary.lease_next_billing_date,
    Fields.lease_summary.lease_paid_through_date,
    Fields.lease_summary.lease_lifetime_billed,
    Fields.lease_summary.lease_lifetime_payments,

    Fields.lease_summary.lease_last_rent_change_date,
    Fields.lease_summary.lease_last_rent_change_amt,
    Fields.lease_summary.lease_days_since_rent_change,
    Fields.lease_summary.lease_total_rent_change,

    Fields.lease_summary.lease_bad_debt_writeoffs,
    Fields.lease_summary.lease_refunds,
    Fields.lease_summary.lease_active_insurance_name,
    Fields.lease_summary.lease_active_insurance_coverage,
    Fields.lease_summary.lease_rent_past_due,
    Fields.lease_summary.lease_fees_past_due,
    Fields.lease_summary.lease_other_past_due,
    Fields.lease_summary.lease_active_service_fees

  ],

	filter_structure: [

    Fields.property.property_id,
    Fields.unit.unit_number,
    Fields.unit.unit_floor,
    Fields.unit.unit_type,
    Fields.unit.unit_description,
    Fields.unit.unit_available_date,
    Fields.unit.unit_price,
    Fields.unit.unit_featured,
    Fields.unit.unit_category_id,
    Fields.unit.unit_overlocked,
    Fields.unit_summary.unit_rent_variance,

    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    Fields.tenant.tenant_address,
    Fields.tenant.tenant_email,
    Fields.tenant.tenant_phone,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    // Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,

    Fields.lease.lease_start_date,
    Fields.lease.lease_end_date,
    Fields.lease.lease_notes,
    Fields.lease.lease_standing_id,
    Fields.lease.lease_status,
    Fields.lease.lease_decline_insurance,
    Fields.lease.lease_rent,
    Fields.lead.lead_source,

    Fields.lease.lease_rented_days,
    Fields.lease.lease_sign_up_promo_id,

    Fields.tenant_summary.tenant_last_contacted_days,
    Fields.tenant_summary.tenant_last_contacted_message,
    Fields.tenant_summary.tenant_last_contacted_method,


    Fields.lease_summary.lease_rent_past_due,
    Fields.lease_summary.lease_fees_past_due,
    Fields.lease_summary.lease_other_past_due,
    Fields.lease_summary.lease_active_service_fees

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
      row: {},
      metric: {
        field: {},
        method: ''
      },
    },
    groups: [],
		limit: 0,
		page:1,
		offset:0

	},
  default_columns:[
    'tenant_first',
    'tenant_last',
    'tenant_phone',
    'lease_rent',
    'unit_number',
    'unit_category',
    'lease_balance',
    'lease_standing',
  ]


}
