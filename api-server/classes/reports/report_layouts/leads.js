var moment = require('moment');
var XLSX = require('xlsx');
var Fields = require('../report_fields/index').fields;
var Loader = require('../report_fields/index').load;
var Filters = require('../report_filters/index').filters;


module.exports = {
	name: 'Leads',
	filename:'leads',
  column_structure: [
    Fields.property.property_name,
    Fields.property.property_num,
    Fields.property.property_address,
    Fields.property.property_country,
    Fields.property.property_state,
    Fields.property.property_city,

    Fields.lead.lead_first,
    Fields.lead.lead_last,
    Fields.lead.lead_phone,
    Fields.lead.lead_email,

    // Fields.lead.lead_property_id,
    // Fields.lead.lead_property_name,
    // Fields.lead.lead_property_num,
    // Fields.lead.lead_property_address,
    Fields.lead.lead_category_name,
    Fields.lead.lead_unit_number,
    Fields.lead.lead_source,
    Fields.lead.lead_notes,
    Fields.lead.lead_created,
    Fields.lead.lead_opened,
    Fields.lead.lead_status,
    Fields.lead.lead_created_by_name,
    Fields.lead.lead_created_by,
    Fields.lead.lead_type,

  // TODO fix with activity changes
    Fields.lead_summary.lead_last_contacted,
    Fields.lead_summary.lead_last_contacted_days,
    Fields.lead_summary.lead_last_contacted_message,
    Fields.lead_summary.lead_last_contacted_method,
    Fields.lead_summary.lead_last_contacted_by,

    Fields.reservation.reservation_created,
    Fields.reservation.reservation_time,
    Fields.reservation.reservation_expires,
    Fields.reservation.reservation_unit_number,
    Fields.reservation.reservation_category_name,
    Fields.reservation.reservation_property_name,
    Fields.reservation.reservation_property_number,
    Fields.reservation.reservation_property_address,
    Fields.reservation.reservation_property_country,
    Fields.reservation.reservation_property_city,
    Fields.reservation.reservation_property_state,

    Fields.lead.touchpoints_platform_source,
    Fields.lead.touchpoints_platform_device,
    Fields.lead.touchpoints_request_url,
    Fields.lead.touchpoints_url,
    Fields.lead.touchpoints_domain,
    Fields.lead.touchpoints_device,
    Fields.lead.touchpoints_source,
    Fields.lead.touchpoints_medium,
    Fields.lead.touchpoints_keyword,
    Fields.lead.touchpoints_recordtype,
    Fields.lead.touchpoints_cid,
    Fields.lead.touchpoints_gclid,
    Fields.lead.touchpoints_fbclid,
    Fields.lead.touchpoints_created,
    Fields.lead.touchpoints_event_type,

  ],
	filter_structure: [


	  Fields.property.property_id,
    // Fields.property.property_name,
    // Fields.property.property_num,
    // Fields.property.property_address,

    Fields.lead.lead_first,
    Fields.lead.lead_last,
    Fields.lead.lead_phone,
    Fields.lead.lead_email,
    Fields.lead.lead_status,

    Fields.lead.touchpoints_platform_source,
    Fields.lead.touchpoints_platform_device,
    Fields.lead.touchpoints_request_url,
    Fields.lead.touchpoints_url,
    Fields.lead.touchpoints_domain,
    Fields.lead.touchpoints_device,
    Fields.lead.touchpoints_source,
    Fields.lead.touchpoints_recordtype,
    Fields.lead.touchpoints_medium,
    Fields.lead.touchpoints_keyword,
    Fields.lead.touchpoints_cid,
    Fields.lead.touchpoints_gclid,
    Fields.lead.touchpoints_fbclid,
    Fields.lead.touchpoints_created,
    Fields.lead.touchpoints_event_type,



    // TODO fix with activity changes
    Fields.lead_summary.lead_last_contacted,
    Fields.lead_summary.lead_last_contacted_days,
    Fields.lead_summary.lead_last_contacted_message,
    Fields.lead_summary.lead_last_contacted_method,
    Fields.lead_summary.lead_last_contacted_by,

    Fields.reservation.reservation_created,
    Fields.reservation.reservation_time,
    Fields.reservation.reservation_expires,
    Fields.reservation.reservation_unit_number,

    Fields.reservation.reservation_category_name,
    // Fields.reservation.reservation_property_name,
    // Fields.reservation.reservation_property_number,
    // Fields.reservation.reservation_property_address,
	],
	filters: {
		search: {
      lead_status: ["Active"]
    },
		columns:[],
		sort: {
			field: 'lead_created',
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
    'lead_created',
    'lead_first',
    'lead_last',
    'reservation_time',
    'lead_email',
    'lead_phone',
    'lead_status',
    'lead_source',
    'lead_category_name'
  ]




}
