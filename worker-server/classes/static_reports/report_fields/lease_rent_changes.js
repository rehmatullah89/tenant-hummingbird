module.exports = {
    lease_rent_changes: {
      lease_id: {
        label: "Lease Id",
        key: "lease_id",
        super_header: "Lease Id*",
        dataType: "string"
      },
      rentchange_property_id: {
        label: "Property Id",
        key: "rentchange_property_id",
        super_header: "Property Id*",
        dataType: "string",
      },
      property_name: {
        label: "Property Name",
        key: "property_name",
        super_header: "Property Name",
        dataType: "string",
        width: 18
      },
      tenant_name: {
        label: "Tenant Name",
        key: "tenant_name",
        super_header: "Tenant Name",
        dataType: "string",
        width: 16
      },
      unit_number: {
        label: "Space Number",
        key: "unit_number",
        super_header: "Space Number",
        dataType: "string"
      },
      rentchange_tagged: {
        label: "Tagged",
        key: "rentchange_tagged",
        super_header: "Tagged",
        dataType: "boolean"
      },
      current_rent: {
        label: "Current Rent",
        key: "current_rent",
        super_header: "Current Rent",
        dataType: "money"
      },
      rentchange_effective_date: {
        label: "Effective Date",
        key: "rentchange_effective_date",
        super_header: "Effective Date (MM/DD/YYYY)*",
        dataType: "date"
      },
      tenant_new_rent: {
        label: "New Rent",
        key: "tenant_new_rent",
        super_header: "New Rent*",
        dataType: "money"
      },
      rentchange_status: {
        label: "Rent Change Status",
        key: "rentchange_status",
        super_header: "Rent Change Status",
        dataType: "string"
      },
      rentchange_recent_note: {
        label: "Notes",
        key: "rentchange_recent_note",
        super_header: "Notes",
        dataType: "string",
        width: 20
      }
    },
  
  }
  