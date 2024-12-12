module.exports = {
  tenant: {

    tenant_first: {
      label: "First Name",
      key: "tenant_first",
      group: "tenant",
      width: 139
    },
    tenant_last: {
      label: "Last Name",
      key: "tenant_last",
      group: "tenant",
      width: 113
    },
    tenant_name: {
      label: "Name",
      key: "tenant_name",
      group: "tenant",
      width: 200

    },
    tenant_address: {
      label: "Address",
      key: "tenant_address",
      group: "tenant",
      column_type: 'address',
      width: 200
    },
    tenant_address1: {
      label: "Address Street 1",
      key: "tenant_address1",
      group: "tenant",
      width: 200
    },
    tenant_address2: {
      label: "Address Street 2",
      key: "tenant_address2",
      group: "tenant",
      width: 200
    },
    tenant_city: {
      label: "City",
      key: "tenant_city",
      group: "tenant",
      width: 200
    },
    tenant_country: {
      label: "Country",
      key: "tenant_country",
      group: "tenant",
      width: 200
    },
    tenant_state: {
      label: "State",
      key: "tenant_state",
      group: "tenant",
      width: 200
    },
    tenant_zip: {
      label: "Zip Code",
      key: "tenant_zip",
      group: "tenant",
      width: 200
    },
    tenant_email: {
      label: "Email",
      key: "tenant_email",
      group: "tenant",
      width: 175
    },
    tenant_phone: {
      label: "Phone",
      key: "tenant_phone",
      group: "tenant",
      column_type: "phone",
      width: 170
    },
    tenant_gender: {
      label: "Gender",
      key: "tenant_gender",
      group: "tenant",
      options: ['Male', 'Female', ' - '],
      width: 122
    },
    tenant_ssn: {
      label: "SSN",
      key: "tenant_ssn",
      group: "tenant",
      width: 117
    },
    tenant_dob: {
      label: "DOB",
      key: "tenant_dob",
      group: "tenant",
      column_type: 'date',
      input: 'date',
      width: 120
    },
    tenant_driver_license: {
      label: "Driver License",
      key: "tenant_driver_license",
      group: "tenant",
      width: 133
    },
    tenant_active_military: {
      label: "Active Military",
      key: "tenant_active_military",
      group: "tenant",
      column_type: "boolean",
      input: 'boolean',
      width: 134
    },
    tenant_military_branch: {
      label: "Military Branch",
      key: "tenant_military_branch",
      group: "tenant",
      width: 138
    },
    tenant_military_commanding_officer_first: {
      label: "Commanding Officer First Name",
      key: "tenant_military_commanding_officer_first",
      group: "tenant",
      width: 240
    },
    tenant_military_commanding_officer_last: {
      label: "Commanding Officer Last Name",
      key: "tenant_military_commanding_officer_last",
      group: "tenant",
      width: 240
    },
    tenant_military_commanding_officer_phone: {
      label: "Commanding Officer Phone",
      key: "tenant_military_commanding_officer_phone",
      group: "tenant",
      width: 220
    },
    tenant_military_commanding_officer_email: {
      label: "Commanding Officer Email",
      key: "tenant_military_commanding_officer_email",
      group: "tenant",
      width: 220
    },
    tenant_military_rank: {
      label: "Rank",
      key: "tenant_military_rank",
      group: "tenant",
      width: 120
    },
    tenant_military_serial: {
      label: "Military Serial Number",
      key: "tenant_military_serial",
      group: "tenant",
      width: 220
    },
    tenant_military_email: {
      label: "Military Email",
      key: "tenant_military_email",
      group: "tenant",
      width: 220
    },
    tenant_military_dob: {
      label: "Service Member DOB",
      key: "tenant_military_dob",
      group: "tenant",
      width: 220
    },
    tenant_military_service_expiration: {
      label: "Expiration Term of Service",
      key: "tenant_military_service_expiration",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_name: {
      label: "Military Unit Name",
      key: "tenant_military_unit_name",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_phone: {
      label: "Military Unit Phone",
      key: "tenant_military_unit_phone",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_address1: {
      label: "Military Unit Address 1",
      key: "tenant_military_unit_address1",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_address2: {
      label: "Military Unit Address 2",
      key: "tenant_military_unit_address2",
      group: "tenant",
      width: 220
    },
    tenant_military_city: {
      label: "Military City",
      key: "tenant_military_city",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_state: {
      label: "Military Unit State",
      key: "tenant_military_unit_state",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_country: {
      label: "Military Unit Country",
      key: "tenant_military_unit_country",
      group: "tenant",
      width: 220
    },
    tenant_military_unit_zip: {
      label: "Military Unit Zipcode",
      key: "tenant_military_unit_zip",
      group: "tenant",
      width: 220
    },


  },
  tenant_summary:{

    tenant_last_contacted: {
      label: "Last Contacted",
      key: "tenant_last_contacted",
      group: "tenant",
      column_type: 'date',
      input: 'timeframe',
      width: 138
    },
    tenant_last_contacted_days: {
      label: "Days Since Last Contact",
      key: "tenant_last_contacted_days",
      group: "tenant",
      input: "comparison",
      width: 188
    },
    tenant_last_contacted_message: {
      label: "Last Contact Details",
      key: "tenant_last_contacted_message",
      group: "tenant",
      column_type: "html_content",
      width: 200
    },
    tenant_last_contacted_method: {
      label: "Last Contact Method",
      key: "tenant_last_contacted_method",
      group: "tenant",
      input: 'multi-select',
      options: ['phone', 'email', 'sms', 'contact form'],
      width: 170
    },
    tenant_last_contacted_by: {
      label: "Last Contacted By",
      key: "tenant_last_contacted_by",
      group: "tenant",
      input: 'multi-select',
      width: 155
    },
    tenant_prepay_balance: {
      label: "Tenant Prepay Balance",
      key: "tenant_prepay_balance",
      group: "tenant",
      input: 'comparison',
      column_type: "money",
      width: 152
    },
    tenant_space_count: {
      label: "No. of Spaces",
      key: "tenant_space_count",
      group: "tenant",
      input: "comparison",
    }
    // tenant_days_past_due: {
    //   label: "Tenant Days Past Due",
    //   key: "tenant_days_past_due",
    //   group: "billing",
    //   column_type: "number",
    //   input: "comparison"
    // },
  }

}
