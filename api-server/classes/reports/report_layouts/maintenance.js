var Fields = require('../report_fields/index').fields;
var Filters = require('../report_filters/index').filters;


module.exports = {
	name: 'Maintenance',
	filename:'maintenance',
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
    Fields.unit.unit_status,
    Fields.unit.unit_price,
    Fields.unit.unit_overlocked,

    Fields.unit.unit_featured,
    Fields.unit.unit_category,

    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    // Fields.tenant.tenant_address,
    // Fields.tenant.tenant_phone,
    Fields.tenant.tenant_email,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    // Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,

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

    Fields.maintenance.maintenance_date,
    Fields.maintenance.maintenance_severity,
    Fields.maintenance.maintenance_status,
    Fields.maintenance.maintenance_extras,
    Fields.maintenance.maintenance_type,
    Fields.maintenance_summary.maintenance_last_message,
    Fields.maintenance_summary.maintenance_last_message_date,
    Fields.maintenance_summary.maintenance_last_from,
    Fields.maintenance_summary.maintenance_num_messages,
    Fields.maintenance_summary.maintenance_days_open,

	],
	filter_structure: [
    Fields.property.property_id,
    // Fields.property.property_name,
    // Fields.property.property_num,
    // Fields.property.property_address,

    Fields.unit.unit_number,
    Fields.unit.unit_category_id,
    Fields.unit.unit_floor,
    Fields.unit.unit_type,
    Fields.unit.unit_description,
    Fields.unit.unit_available_date,
    Fields.unit.unit_status,
    Fields.unit.unit_price,

    Fields.unit.unit_featured,
    Fields.unit.unit_category,

    Fields.tenant.tenant_first,
    Fields.tenant.tenant_last,
    Fields.tenant.tenant_address,
    Fields.tenant.tenant_phone,
    Fields.tenant.tenant_email,
    Fields.tenant.tenant_gender,
    Fields.tenant.tenant_ssn,
    // Fields.tenant.tenant_dob,
    Fields.tenant.tenant_driver_license,
    Fields.tenant.tenant_active_military,
    Fields.tenant.tenant_military_branch,

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

    Fields.maintenance.maintenance_date,
    Fields.maintenance.maintenance_severity,
    Fields.maintenance.maintenance_status,
    Fields.maintenance.maintenance_extras,
    Fields.maintenance.maintenance_type,
    Fields.maintenance_summary.maintenance_last_message,
    Fields.maintenance_summary.maintenance_last_message_date,
    Fields.maintenance_summary.maintenance_last_from,
    Fields.maintenance_summary.maintenance_num_messages,
    Fields.maintenance_summary.maintenance_days_open,


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
    'unit_number',
    'maintenance_date',
    'maintenance_severity',
    'maintenance_type',
    'maintenance_last_message_date',
    'maintenance_last_message',
    'maintenance_last_from',
    'maintenance_num_messages',
    'maintenance_days_open'
  ]
}
