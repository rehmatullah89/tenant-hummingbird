module.exports = {
  review_rent_changes: {
    rentchange_tenant_name:{
      label: `Tenant Name`,
      key: `rentchange_tenant_name`,
      group: `rent_change`,
      width: 150
    },

    rentchange_status: {
      label: `Rent Change Status`,
      key: `rentchange_status`,
      group: `rent_change`,
      input: `multi-select`,
      options: [`Scheduled`, `Approved`, `Skipped`, `Cancelled`, `Deployed`],
      width: 130
    },

    rentchange_notification_status: {
      label: `Notice Status`,
      key: `rentchange_notification_status`,
      group: `rent_change`,
      input: `multi-select`,
      options: [`Pending`, `Sent`, `Error`, `Scheduled`, `Generated`,`Resolved`],
      width: 100
    },

    rentchange_notification_date: {
      label: `Notification Date`,
      key: `rentchange_notification_date`,
      group: `rent_change`,
      input: 'timeframe',
      column_type: "date",
      width: 120,
    },

    rentchange_notification_sent: {
      label: `Notification Sent`,
      key: `rentchange_notification_sent`,
      group: `rent_change`,
      column_type: "date",
      width: 120,
      hide: true
    },

    rentchange_current_rent: {
      label: `Current Rent`,
      key: `rentchange_current_rent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
      width: 110
    },

    rentchange_old_rent: {
      label: `Old Rent`,
      key: `rentchange_old_rent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
      width: 110
    },

    rentchange_tagged: {
      label: 'Tagged',
      key: 'rentchange_tagged',
      column_type: 'boolean',
      hide: true
    },

    rentchange_new_rent: {
      label: `New Rent`,
      key: `rentchange_new_rent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
    },

    rentchange_rent_variance: {
      label: `Variance $ (New Rent/Old Rent)`,
      key: `rentchange_rent_variance`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
      hide: true
    },

    rentchange_rent_variance_percent: {
      label: `Variance % (New Rent/Old Rent)`,
      key: `rentchange_rent_variance_percent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "percentage",
      hide: true
    },

    rentchange_rent_variance_combined: {
      label: `Variance($ and % combined)`,
      key: `rentchange_rent_variance_combined`,
      hide: true
    },

    rentchange_effective_date: {
      label: `Effective Date`,
      key: `rentchange_effective_date`,
      group: `rent_change`,
      column_type: "date",
      input: 'timeframe',
      width: 120
    },

    rentchange_unit_number: {
      label: `Space Number`,
      key: `rentchange_unit_number`,
      group: `rent_change`,
      width: 100
    },

    rentchange_status_modification_date: {
      label: `Status Last Modified Date`,
      key: `rentchange_status_modification_date`,
      group: `rent_change`,
      column_type: "date",
      width: 120,
      hide: true
    },

    rentchange_current_rent_variance: {
      label: `Variance of Current Rent $`,
      key: `rentchange_current_rent_variance`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
    },

    rentchange_current_rent_variance_percent: {
      label: `Variance of Current Rent %`,
      key: `rentchange_current_rent_variance_percent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "percentage",
    },

    rentchange_new_rent_variance: {
      label: `Variance of New Rent $`,
      key: `rentchange_new_rent_variance`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "money",
    },

    rentchange_new_rent_variance_percent: {
      label: `Variance of New Rent %`,
      key: `rentchange_new_rent_variance_percent`,
      group: `rent_change`,
      input: 'comparison',
      column_type: "percentage",
    },

    rentchange_recent_note: {
      label: `Notes`,
      key: `rentchange_recent_note`,
      group: `rent_change`,
      width: 90
    },

    rentchange_property_id: {
      label: `Property Id`,
      key: `rentchange_property_id`,
      group: `rent_change`,
      hide: true,
    },

    rentchange_property_name: {
      label: `Property Name`,
      key: `rentchange_property_name`,
      group: `rent_change`,
      hide: true,
    },

    rentchange_type: {
      label: `Type`,
      key: `rentchange_type`,
      group: `rent_change`,
      input: `multi-select`,
      options: [`Automated`, `Manual`, `Prorize`, `Veritec`, `Price Monster`],
      width: 120
    },

    rentchange_affect_timeline: {
      label: `Affect Timeline`,
      key: `rentchange_affect_timeline`,
      group: `rent_change`,
      hide: true,
    },

    rentchange_last_updated_by: {
      label: `Last Updated By`,
      key: `rentchange_last_updated_by`,
      group: `rent_change`,
      width: 120
    },

    rentchange_created_by: {
      label: `Created By`,
      key: `rentchange_created_by`,
      group: `rent_change`,
      width: 120
    },

    rentchange_auction_status: {
      label: `Auction Status`,
      key: `rentchange_auction_status`,
      group: `rent_change`,
      hide: true,
    },

    rentchange_approved_by: {
      label: `Approved By`,
      key: `rentchange_approved_by`,
      group: `rent_change`,
      width: 120
    },

    rentchange_skipped_or_cancelled_by: {
      label: `Skipped / Cancelled By`,
      key: `rentchange_skipped_or_cancelled_by`,
      group: `rent_change`,
      width: 130
    }

  }
}
