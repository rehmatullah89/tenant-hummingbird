module.exports = {
  maintenance: {
    maintenance_date: {
      label: "Submitted Date",
      key: "maintenance_date",
      group: "maintenance",
      column_type: "date",
      input: 'timeframe'
    },
    maintenance_severity: {
      label: "Severity",
      key: "maintenance_severity",
      group: "maintenance",
      column_type: "status",
      input: 'multi-select',
      options: ['Standard', 'Urgent', 'Emergency']
    },
    maintenance_status: {
      label: "Status",
      key: "maintenance_status",
      group: "maintenance",
      column_type: "status",
      input: 'multi-select',
      options: ['Open', 'On Hold', 'Closed', 'Resolved']
    },
    maintenance_extras: {
      label: "Extras",
      key: "maintenance_extras",
      group: "maintenance",
      column_type: "JSON"
    },
    maintenance_type: {
      label: "Type",
      key: "maintenance_type",
      group: "maintenance",
      column_type: "string",
      input: 'multi-select'
    }
  },
  maintenance_summary:{
    maintenance_last_message: {
      label: "Last Message",
      key: "maintenance_last_message",
      group: "maintenance",
      column_type: "string"
    },
    maintenance_last_message_date: {
      label: "Last Message Date",
      key: "maintenance_last_message_date",
      group: "maintenance",
      column_type: "date",
      input: 'timeframe'
    },
    maintenance_last_from: {
      label: "Last Message From",
      key: "maintenance_last_from",
      group: "maintenance",
      column_type: "string"
    },
    maintenance_num_messages: {
      label: "Num. Messages",
      key: "maintenance_num_messages",
      group: "maintenance",
      column_type: "number"
    },
    maintenance_days_open: {
      label: "Days Open",
      key: "maintenance_days_open",
      group: "maintenance",
      column_type: "number",
      input: 'comparison'
    }
  }
};
