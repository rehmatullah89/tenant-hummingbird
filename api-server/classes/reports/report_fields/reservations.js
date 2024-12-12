module.exports = {
  reservation: {
    reservation_created: {
      label: "Reservation Created",
      key: "reservation_created",
      group: "reservation",
      column_type: 'datetime',
      input: 'timeframe',
      width: 167
    },
    reservation_time: {
      label: "Reservation Date",
      key: "reservation_time",
      group: "reservation",
      column_type: 'date2',
      input: 'timeframe',
      width: 148
    },
    reservation_expires: {
      label: "Reservation Expires",
      key: "reservation_expires",
      group: "reservation",
      column_type: 'date2',
      input: 'timeframe',
      width: 163
    },
    reservation_unit_number: {
      label: "Reserved Space Number",
      key: "reservation_unit_number",
      group: "reservation",
      width: 192
    },
    reservation_category_name: {
      label: "Reserved Space Category",
      key: "reservation_unit_category",
      group: "reservation",
      width: 199
    },

    reservation_property_name: {
      label: "Reserved Property Name",
      key: "reservation_property_name",
      group: "reservation",
      width: 188
    },

    reservation_unit_id: {
      label: "Reserved Space",
      key: "reservation_unit_id",
      group: "reservation",
      width: 143
    },

    // reservation_property_id: {
    //   label: "Reserved Property",
    //   key: "reservation_property_id",
    //   group: "reservation"
    // },

    reservation_property_number: {
      label: "Reserved Property Number",
      key: "reservation_property_number",
      group: "reservation",
      width: 206
    },
    reservation_property_address: {
      label: "Reserved Property Address",
      key: "reservation_property_address",
      group: "reservation",
      width: 206
    },
    reservation_property_country: {
      label: "Reserved Property Country",
      key: "reservation_property_country",
      group: "reservation",
      width: 206
    },
    reservation_property_city: {
      label: "Reserved Property City",
      key: "reservation_property_city",
      group: "reservation",
      width: 206
    },
    reservation_property_state: {
      label: "Reserved Property State",
      key: "reservation_property_state",
      group: "reservation",
      width: 206
    }
  }
}
