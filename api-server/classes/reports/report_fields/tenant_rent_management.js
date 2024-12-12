module.exports = {
  tenant_rent_management: {
    tenant_selected_rent_plan: {
      label: "Selected Rent Plan",
      key: "tenant_selected_rent_plan",
      header_tool_tip: "Selected Rent Plan",
      input: 'multi-select',
      width: 180
    },
    tenant_rent_plan_id: {
      label: "Rent Plan Id",
      key: "tenant_rent_plan_id",
      hide: true
    },
    tenant_rent_change_id: {
      label: "Rent Change Id",
      key: "tenant_rent_change_id",
      hide: true
    }, 
    tenant_scheduled_rent_change: {
      label: "Scheduled Automated Rent Change",
      key: "tenant_scheduled_rent_change",
      group: "tenant",
      column_type: "date",
      input: "timeframe",
      width: 180
    },
    tenant_last_rent_change_days: {
      label: "Last Rent Change (Days)",
      key: "tenant_last_rent_change_days",
      group: "tenant",
      input: 'comparison',
      column_type: "number",
    },
    tenant_last_rent_change_date: {
      label: "Last Rent Change (Date)",
      key: "tenant_last_rent_change_date",
      group: "tenant",
      width: 140
    },
    tenant_length_of_stay: {
      label: "Length of Stay",
      key: "tenant_length_of_stay",
      group: "tenant",
      input: 'comparison',
      column_type: "number",
      width: 118
    },
    tenant_next_rent_change: {
      label: "Next Rent Change",
      key: "tenant_next_rent_change",
      group: "tenant",
      column_type: "date",
      input: "timeframe"
    },
    tenant_new_rent: {
      label: "New Rent",
      key: "tenant_new_rent",
      input: 'comparison',
      column_type: "money",
      group: "tenant",
      width: 118
    },
    tenant_new_rent_variance: {
      label: "New Variance(New Rent/Current Rent)",
      key: "tenant_new_rent_variance",
      input: 'comparison',
      column_type: "money",
      group: "tenant",
      width: 170
    },
    tenant_rate_plan: {
      label: "Rate plan",
      key: "tenant_rate_plan",
      group: "tenant",
      width: 118
    },
    tenant_active_promotions: {
      label: "Active Promotions",
      key: "tenant_active_promotions",
      group: "tenant"
    },
    tenant_space_group: {
      label: "Space Group",
      key: "tenant_space_group",
      group: "tenant"
    },
    tenant_days_left_to_rent_change: {
      label: `Days Left to Rent Change`,
      key: `tenant_days_left_to_rent_change`,
      group: `tenant`,
      input: 'comparison',
      column_type: "number",
    },
    tenant_affect_timeline: {
      label: `Affect Timeline`,
      key: `tenant_affect_timeline`,
      group: `tenant`,
      hide: true,
    },
    tenant_auction_status: {
      label: `Auction Status`,
      key: `tenant_auction_status`,
      group: `tenant`,
      hide: true,
    }
  },

}
