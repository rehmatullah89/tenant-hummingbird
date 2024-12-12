module.exports = {
  filters: {
    property_name: {
      label: "Search By Name",
      key: 'property_name',
      type: "input",
      group: 'Property'
    },
    property_id: {
      label: "Properties",
      key: 'property_id',
      type: "multi-select",
      group: 'Property'
    },
    unit_category_id: {
      label: "Category",
      key: 'unit_category_id',
      type: "multi-select",
      group: 'unit'
    },
    unit_floor: {
      label: "Floor",
      key: 'unit_floor',
      type: "multi-select",
      group: 'unit'
    },
    unit_type: {
      label: "Unit Type",
      key: 'unit_type',
      type: "dropdown",
      group: 'unit'
    },
    unit_price: {
      label: "Unit Price",
      key: 'unit_price',
      type: "comparison",
      group: 'unit'
    },
    unit_featured: {
      label: "Unit Featured",
      key: 'unit_featured',
      type: "list",
      options: ['Yes', 'No'],
      group: 'unit'
    },
    last_contacted: {
      label: "Last Contacted",
      key: 'last_contacted',
      type: "timeframe",
      group: 'tenant'
    },
    lease_start: {
      label: "Lease Start",
      key: 'lease_start',
      type: "timeframe",
      group: 'lease'
    },
    property_neighborhoods: {
      label: "Neighborhood",
      key: 'property_neighborhoods',
      type: "multi-select",
      group: 'lease'
    },

    lease_rent: {
      label: "Rent",
      key: 'lease_rent',
      type: "comparison",
      group: 'lease'
    },
  }
}
