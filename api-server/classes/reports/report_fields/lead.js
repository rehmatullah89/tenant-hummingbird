module.exports = {
  lead: {

    lead_move_in_date: {
      label: "Expected Move In",
      key: "lead_move_in_date",
      group: "lead",
      column_type: "datetime",
      input: 'timeframe',
      size: 121
    },

    lead_content: {
      label: "Marketing Notes",
      key: "lead_content",
      group: "lead",
      input: 'multi-select',
      size: 200
    },

    lead_source: {
      label: "Lead Source",
      key: "lead_source",
      group: "lead",
      input: 'multi-select',
      width: 121
    },
    lead_created_by: {
      label: "Lead Created By Id",
      key: "lead_created_by",
      group: "lead",
      input: 'multi-select',
      width: 121
    },
    lead_created_by_name: {
      label: "Lead Created By",
      key: "lead_created_by_name",
      group: "lead",
      width: 176
    },
    lead_property_name: {
      label: "Property Interest Name",
      key: "lead_property_name",
      group: "lead",
      width: 176
    },
    lead_property_id: {
      label: "Property Interest",
      key: "lead_property_id",
      group: "lead",
      input: 'multi-select'
    },
    lead_category: {
      label: "Category Interest",
      key: "lead_category",
      group: "lead",
      input: 'multi-select',
      width: 151
    },
    lead_unit_id: {
      label: "Space Interest",
      key: "lead_unit_id",
      group: "lead",
      input: 'multi-select'
    },
    lead_property_num: {
      label: "Property Interest No.",
      key: "lead_property_num",
      group: "lead",
      width: 161
    },
    // lead_property_address: {
    //   label: "Property Interest Address",
    //   key: "lead_property_address",
    //   group: "lead",
    //   column_type: "address"
    // },
    lead_unit_number: {
      label: "Space Interest Num",
      key: "lead_unit_number",
      group: "lead",
      width: 164
    },
    // lead_notes: {
    //   label: "Lead Notes",
    //   key: "lead_notes",
    //   group: "lead"
    // },
    lead_created: {
      label: "Lead Created",
      key: "lead_created",
      group: "lead",
      column_type: "datetime",
      input: 'timeframe',
      width: 121
    },

    // lead_opened: {
    //   label: "Lead Opened",
    //   key: "lead_opened",
    //   group: "lead",
    //   column_type: "date",
    //   input: 'timeframe'
    // },

    lead_status: {
      label: "Lead Status",
      key: "lead_status",
      group: "lead",
      column_type: 'status',
      options: [ "Active","Retired", "Converted"],
      input: 'multi-select'
    },

    lead_first: {
      label: "First Name",
      key: "lead_first",
      group: "lead",
      width: 139

    },
    lead_last: {
      label: "Last Name",
      key: "lead_last",
      group: "lead",
      width: 113
    },
    lead_name: {
      label: "Name",
      key: "lead_name",
      group: "lead",
      width: 200
    },
    lead_email: {
      label: "Email",
      key: "lead_email",
      group: "lead",
      width: 175
    },
    lead_phone: {
      label: "Phone",
      key: "lead_phone",
      group: "lead",
      column_type: "phone",
      width: 138
    },
    lead_type: {
      label: "Lead Type",
      key: "lead_type",
      group: "lead",
      width: 138
    },


    touchpoints_platform_source: {
      label: "Platform Source",
      key: "touchpoints_platform_source",
      group: "lead",
      width: 175
    },
    touchpoints_platform_device: {
      label: "Platform Device",
      key: "touchpoints_platform_device",
      group: "lead",
      width: 175
    },
    touchpoints_platform_dossier: {
      label: "Platform Dossier",
      key: "touchpoints_platform_dossier",
      group: "lead",
    },
    touchpoints_request_url: {
      label: "Referrer Request Url",
      key: "touchpoints_request_url",
      group: "lead",
      width: 200
    },
    touchpoints_url: {
      label: "Referrer URL",
      key: "touchpoints_url",
      group: "lead",
      width: 200
    },
    touchpoints_domain: {
      label: "Referrer Domain",
      key: "touchpoints_domain",
      group: "lead",
      width: 200
    },
    touchpoints_device: {
      label: "Referrer Device",
      key: "touchpoints_device",
      group: "lead",
      width: 139
    },
    touchpoints_source: {
      label: "Referrer Source",
      key: "touchpoints_source",
      group: "lead",
      width: 141
    },
    touchpoints_medium: {
      label: "Referrer Medium",
      key: "touchpoints_medium",
      group: "lead",
      width: 147
    },
    touchpoints_src_mdm: {
      label: "Web Lead Referral",
      key: "touchpoints_src_mdm",
      group: "lead",
      width: 155
    },
    touchpoints_keyword: {
      label: "Referrer Keyword",
      key: "touchpoints_keyword",
      group: "lead",
      width: 150
    },
    touchpoints_recordtype: {
      label: "Record Type",
      key: "touchpoints_recordtype",
      group: "lead",
      width: 125
    },
    touchpoints_cid: {
      label: "Referer CID",
      key: "touchpoints_cid",
      group: "lead",
      width: 125
    },
    touchpoints_gclid: {
      label: "Referrer gclid",
      key: "touchpoints_gclid",
      group: "lead",
      width: 129
    },
    touchpoints_fbclid: {
      label: "Referrer fbclid",
      key: "touchpoints_fbclid",
      group: "lead",
      width: 133
    },
    touchpoints_created: {
      label: "Touchpoint Created",
      key: "touchpoints_created",
      group: "lead",
      width: 164
    },
    touchpoints_event_type: {
      label: "Event Type",
      key: "touchpoints_event_type",
      group: "lead",
      width: 125
    },
  },
  lead_summary:{

    lead_days_to_followup: {
      label: "Days To Followup",
      key: "lead_days_to_followup",
      group: "lead",
      column_type: "number",
      input: 'comparison',
      width: 149
    },

    lead_first_contacted: {
      label: "First Contacted",
      key: "lead_first_contacted",
      group: "lead",
      column_type: 'date',
      input: 'timeframe',
      width: 139
    },

    lead_last_contacted: {
      label: "Last Contacted",
      key: "lead_last_contacted",
      group: "lead",
      column_type: 'date',
      input: 'timeframe',
      width: 138
    },

    lead_last_contacted_days: {
      label: "Days Since Last Contact",
      key: "lead_last_contacted_days",
      group: "lead",
      input: 'comparison',
      width: 188
    },

    lead_last_contacted_message: {
      label: "Last Contact Details",
      key: "lead_last_contacted_message",
      group: "lead",
      width: 200
    },
    lead_last_contacted_method: {
      label: "Last Contact Method",
      key: "lead_last_contacted_method",
      group: "lead",
      input: 'multi-select',
      options: ['phone', 'email', 'sms', 'contact form'],
      width: 170
    },
    lead_last_contacted_by: {
      label: "Last Contacted By",
      key: "lead_last_contacted_by",
      group: "lead",
      input: 'multi-select',
      width: 155
    },

    /*lead_is_autopay: {
      label: "Autopay Enrollment",
      key: "lead_is_autopay",
      group: "lead",
      column_type: "boolean",
      input: 'boolean'
    },*/
    // lead_reservation_count: {
    //   label: "Reservations",
    //   key: "lead_reservation_count",
    //   group: "lead",
    //   column_type: "number",
    //   input: 'comparison'
    // },
    // lead_count: {
    //   label: "Leads",
    //   key: "lead_count",
    //   group: "lead",
    //   column_type: "number",
    //   input: 'comparison'
    // },
    
  }


}
