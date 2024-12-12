module.exports = {
  unit: {
    unit_number: {
      label: "Space Number",
      key: "unit_number",
      group: "space",
      table: "units",
      width: 137
    },
    unit_floor: {
      label: "Space Floor",
      key: "unit_floor",
      group: "space",
      input: "multi-select",
      width: 125,
    },
    unit_type: {
      label: "Space Type",
      key: "unit_type",
      group: "space",
      input: "multi-select",
      width: 118
    },
    unit_size: {
      label: "Space Size",
      key: "unit_size",
      group: "space",
      input: 'multi-select',
      width: 113
    },
    unit_description: {
      label: "Space Description",
      key: "unit_description",
      group: "space",
      width: 200
    },
    unit_available_date: {
      label: "Available Date",
      key: "unit_available_date",
      group: "space",
      column_type: "date",
      input: 'timeframe',
      width: 132
    },
    unit_status: {
      label: "Space Status",
      key: "unit_status",
      group: "space",
      column_type: 'status',
      input: "multi-select",
      options: ['Available', 'Leased', 'Pending', 'On Hold', 'Offline', 'Reserved', 'Overlocked', 'Remove Overlock', "To Overlock", "Future Leased", "Deactivated"],
      width: 168
    },
    unit_price: {
      label: "Sell Rate",
      key: "unit_price",
      group: "space",
      column_type: "money",
      input: "comparison",
      width: 118
    },
    unit_walk_through_sort: {
      label: "Walk Through Order",
      key: "unit_walk_through_sort",
      group: "space",
      column_type: "number",
      input: "comparison",
      width: 170
    },
    unit_set_rate: {
      label: "Set Rate",
      key: "unit_set_rate",
      group: "space",
      column_type: "money",
      input: "comparison",
      width: 118
    },
    unit_sqft: {
      label: "Space Area",
      key: "unit_sqft",
      group: "space",
      column_type: "number",
      input: "comparison",
      width: 118
    },

    // updated by BCT
    unit_amenities: {
      label: "Features and Amenities",
      key: "unit_amenities",
      group: "space",
      column_type: "concat",
      input: "multi-select-amenities",
      width: 300
    },
    // unit_featured references featured column in units table Removed by BCT as discussed with Karan
    // updated by BCT
    unit_category: {
      label: "Website Category",
      key: "unit_category",
      group: "space",
      input: 'multi-select',
      width: 144
    },
    // unit_category_id references category_id column in units table Removed by BCT as discussed with Karan
    // updated by BCT
    unit_promotions: {
      label: "Space Promotions",
      key: "unit_promotions",
      column_type: "concat",
      group: "space",
      width: 200
    },

    unit_space_mix: {
      label: "Space Mix",
      key: "unit_space_mix",
      column_type: "string",
      group: "space",
      input: "comparison",
      width: 210
    },

    unit_discounts: {
      label: "Space Discounts",
      key: "unit_discounts",
      column_type: "concat",
      group: "space",
      width: 250
    },

    unit_sell_set_variance:  {
      label: "Variance $ (Sell/Set)",
      key: "unit_sell_set_variance",
      group: "space",
      column_type: "money",
      input: "comparison",
      width: 129
    },

    unit_sell_set_variance_percent:  {
      label: "Variance % (Sell/Set)",
      key: "unit_sell_set_variance_percent",
      group: "space",
      column_type: "percentage",
      input: "comparison",
      width: 129
    },

    unit_sell_rate_per_sqft: {
      label: "Sell Rate per sqft",
      key: "unit_sell_rate_per_sqft",
      group: "space",
      column_type: "money",
      input: 'comparison',
      width: 115
    },

    unit_sell_rate_per_sqft_annualized: {
      label: `Sell Rate per sqft annualized`,
      key: `unit_sell_rate_per_sqft_annualized`,
      header_tool_tip: `Sell Rate per sqft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `space`,
      width: 145
    },

    unit_sell_rate_per_ft: {
      label: "Sell Rate per ft",
      key: "unit_sell_rate_per_ft",
      group: "space",
      column_type: "money",
      input: 'comparison',
      width: 115
    },

    unit_sell_rate_per_ft_annualized: {
      label: `Sell Rate per ft annualized`,
      key: `unit_sell_rate_per_ft_annualized`,
      header_tool_tip: `Sell Rate per ft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `space`,
      width: 135
    },

    unit_set_rate_per_sqft: {
      label: "Set Rate per sqft",
      key: "unit_set_rate_per_sqft",
      group: "space",
      column_type: "money",
      input: 'comparison',
      width: 115
    },

    unit_set_rate_per_sqft_annualized: {
      label: `Set Rate per sqft annualized`,
      key: `unit_set_rate_per_sqft_annualized`,
      header_tool_tip: `Set Rate per sqft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `space`,
      width: 145
    },

    unit_set_rate_per_ft: {
      label: "Set Rate per ft",
      key: "unit_set_rate_per_ft",
      group: "space",
      column_type: "money",
      input: 'comparison',
      width: 115
    },

    unit_set_rate_per_ft_annualized: {
      label: `Set Rate per ft annualized`,
      key: `unit_set_rate_per_ft_annualized`,
      header_tool_tip: `Set Rate per ft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `space`,
      width: 135
    },

    // // Storage Fields
    // unit_width: {
    //   label: "Space Width",
    //   key: "unit_width",
    //   group: "space",
    //   column_type: 'number',
    // },
    // unit_height: {
    //   label: "Space Height",
    //   key: "unit_height",
    //   group: "space",
    //   column_type: 'number',
    // },
    // unit_length: {
    //   label: "Space Length",
    //   key: "unit_length",
    //   group: "space",
    //   column_type: 'number'
    // },
    // unit_storage_type: {
    //   label: "Space Storage Type",
    //   key: "unit_storage_type",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Self Storage', 'Wine Storage', 'Locker', 'Outdoor Space', 'Cold Storage'],
    // },
    // unit_door_type: {
    //   label: "Space Door Type",
    //   key: "unit_door_type",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Roll-up Door', 'Swing Door'],
    // },
    // unit_vehicle_storage: {
    //   label: "Space Vehicle Storage",
    //   key: "unit_vehicle_storage",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Vehicles Only', 'Storage Or Vehicles', 'No'],
    // },
    //
    //
    // // Residential Fields
    // unit_beds: {
    //   label: "Space Beds",
    //   key: "unit_beds",
    //   group: "space",
    //   input: "comparison"
    // },
    // unit_baths: {
    //   label: "Space Beds",
    //   key: "unit_baths",
    //   group: "space",
    //   input: "comparison"
    // },
    // unit_class: {
    //   label: "Space Class",
    //   key: "unit_class",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Apartment', 'Single Family Home', 'Condo', 'Townhouse', 'Duplex', 'Other' ],
    // },
    // unit_pets: {
    //   label: "Space Pets",
    //   key: "unit_pets",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Allowed', 'Not Allowed', 'Allowed With Pet Deposit'],
    // },
    // unit_parking: {
    //   label: "Space Parking",
    //   key: "unit_parking",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['Included', 'Not included', 'Extra Charge'],
    // },
    // unit_laundry: {
    //   label: "Space Laundry",
    //   key: "unit_laundry",
    //   group: "space",
    //   input: "multi-select",
    //   options: ['In Space', 'On Premises', 'None'],
    // },


    unit_overlocked: {
      label: "Door Status",
      key: "unit_overlocked",
      group: "space",
      column_type: "status",
      input: "multi-select",
      options: ['Overlocked', 'Remove Overlock', "To Overlock", 'Unlocked'],
      width: 168
    },
    unit_days_vacant: {
      label: "Days Vacant",
      key: "unit_days_vacant",
      group: "space",
      column_type: "number",
      input: "comparison",
      width: 121
    },
  },

  unit_summary: {
    unit_price_by_sqft: {
      label: "Price/Sqft",
      key: "unit_price_by_sqft",
      group: "space",
      column_type: "money",
      input: "comparison"
    },
    unit_rent_variance:  {
      label: "Rent Variance",
      key: "unit_rent_variance",
      group: "space",
      column_type: "money",
      input: "comparison",
      width: 129
    },
    unit_avg_length_of_stay_current:  {
      label: "Avg Length of Stay (incl. current)",
      key: "unit_avg_length_of_stay_current",
      group: "space",
      column_type: "number",
      input: "comparison"
    },
    unit_avg_length_of_stay_not_current:  {
      label: "Avg Length of Stay (excl. current)",
      key: "unit_avg_length_of_stay_no_current",
      group: "space",
      column_type: "number",
      input: "comparison"
    },
  }
};
