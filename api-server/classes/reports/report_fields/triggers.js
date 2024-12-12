module.exports = {
  trigger: {
    trigger_document: {
      label: "Document",
      key: "trigger_document",
      group: "trigger",
      column_type: 'boolean',
      input: 'boolean'
    },
    trigger_email: {
      label: "Document",
      key: "trigger_email",
      group: "trigger",
      column_type: 'boolean',
      input: 'boolean'
    },
    trigger_sms: {
      label: "SMS Message",
      key: "trigger_sms",
      group: "trigger",
      column_type: 'boolean',
      input: 'boolean'
    },
    trigger_fee: {
      label: "Fee",
      key: "trigger_fee",
      group: "trigger",
      input: 'boolean'
    },
    trigger_fee_product: {
      label: "Fee",
      key: "trigger_fee_product",
      group: "trigger",
      input: 'multi-select',
    },
    trigger_event_type: {
      label: "Event Type",
      key: "trigger_event_type",
      group: "trigger",
      input: 'multi-select',
    },
    trigger_title: {
      label: "Title",
      key: "trigger_title",
      group: "trigger"
    },
    trigger_details: {
      label: "Details",
      key: "trigger_details",
      group: "trigger"
    },
    trigger_created: {
      label: "Created",
      key: "trigger_created",
      group: "trigger",
      column_type: "date",
      input: 'timeframe'
    },

    trigger_fee_amount: {
      label: "Fee Amount",
      key: "trigger_fee_amount",
      group: "trigger",
      column_type: 'money',
      input: "comparison"
    },
    trigger_fee_type: {
      label: "Fee Type",
      key: "trigger_fee_type",
      group: "trigger",
      input: 'multi-select',
    },
    trigger_lease_status_update: {
      label: "Lease Status Update",
      key: "trigger_lease_status_update",
      group: "trigger",
      input: 'multi-select'
    }
  }
}
