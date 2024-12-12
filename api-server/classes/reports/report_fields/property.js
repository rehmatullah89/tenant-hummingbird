module.exports = {
  property: {
    property_id: {
      label: "Property",
      key: "property_id",
     // group: "facility",
      input: 'multi-select',
    },
    property_name: {
      label: "Property Name",
      key: "property_name",
      group: "facility",
      width: 225
    },
    property_legal_name: {
      label: "Property Legal Name",
      key: "property_legal_name",
      group: "facility",
      width: 225
    },
    property_num: {
      label: "Property Number",
      key: "property_number",
      group: "facility",
      width: 142
    },
    // property_access: {
    //   label: "Property Access",
    //   key: "property_access",
    //   group: "facility",
    //
    // },
    // property_phone: {
    //   label: "Property Phone",
    //   key: "property_phone",
    //   group: "facility",
    //   column_type: "phone"
    // },
    // property_email: {
    //   label: "Property Email",
    //   key: "property_email",
    //   group: "facility"
    // },
    property_address: {
      label: "Property Address",
      key: "property_address",
      group: "facility",
      column_type: 'address',
      width: 177
    },
    property_state: {
      label: "Property State",
      key: "property_state",
      group: "facility",
      column_type: 'state',
      width: 177
    },
    property_city: {
      label: "Property City",
      key: "property_city",
      group: "facility",
      column_type: 'city',
      width: 177
    },
    property_country: {
      label: "Property Country",
      key: "property_country",
      group: "facility",
      column_type: 'country',
      width: 177
    },

    property_landing_page: {
      label: "Property Website",
      key: "property_landing_page",
      group: "facility",
      width: 177,
      column_type: "string",
    }

  },
}
