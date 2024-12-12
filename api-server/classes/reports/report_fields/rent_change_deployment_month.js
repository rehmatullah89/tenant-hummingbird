module.exports = {
  rent_change_deployment_month: {

    rent_change_deployment_month: {
      label: "Deployment Month",
      key: "rent_change_deployment_month",
      input: 'multi-select',
      width: 139
    },
    rent_change_total_rent_changes: {
      label: "Total Rent Changes",
      key: "rent_change_total_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 113
    },
    rent_change_store_occupancy: {
      label: "Store Occupancy",
      key: "rent_change_store_occupancy",
      column_type: "percentage",
      input: "comparison",
      width: 120
    },
    rent_change_system_rent_changes: {
      label: "Automated Rent Changes",
      key: "rent_change_system_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 160
    },
    rent_change_manual_rent_changes: {
      label: "Manual Rent Changes",
      key: "rent_change_manual_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 125
    },
    rent_change_approved_rent_changes: {
      label: "Approved Rent Changes",
      key: "rent_change_approved_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 135
    },
    rent_change_scheduled_rent_changes: {
      label: "Scheduled Rent Changes",
      key: "rent_change_scheduled_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 135
    },
    rent_change_deployed_rent_changes: {
      label: "Deployed Rent Changes",
      key: "rent_change_deployed_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 135
    },
    rent_change_cancelled_rent_changes: {
      label: "Cancelled Rent Changes",
      key: "rent_change_cancelled_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 135
    },
    rent_change_skipped_rent_changes: {
      label: "Skipped Rent Changes",
      key: "rent_change_skipped_rent_changes",
      column_type: "number",
      input: 'comparison',
      width: 135
    },
    rent_change_over_under_sell_rate: {
      label: "Over/Under Sell Rate",
      key: "rent_change_over_under_sell_rate",
      width: 125
    },
    rent_change_variance_rent_sell: {
      label: "Variance (Rent/Sell)",
      key: "rent_change_variance_rent_sell",
      column_type: "percentage",
      input: "comparison",
      width: 130
    },
    rent_change_total_rent_increase: {
      label: "Total Rent Increase",
      key: "rent_change_total_rent_increase",
      column_type: "money",
      input: 'comparison',
    },
    rent_change_approval_deadline_date: {
      label: "Approval Deadline",
      key: "rent_change_approval_deadline_date",
      column_type: "date",
      input: 'timeframe',
      width: 200
    },
    rent_change_approval_deadline_left: {
      label: "Approval DeadLine Left",
      key: "rent_change_approval_deadline_left",
      hide: true
    },
    rent_change_approval_status: {
      label: "Approval Status",
      key: "rent_change_approval_status",
      column_type: "status",
      input: 'multi-select',
      options: ['To Approve', 'Approved','Auto Approved','Deployed','Cancelled','Skipped'],
      width: 200
    },
    rent_change_move_out_in_90_days: {
      label: "Move-out in 90 Days",
      key: "rent_change_move_out_in_90_days",
      column_type: "number",
      input: 'comparison',
      width: 125
    }
  },

}
