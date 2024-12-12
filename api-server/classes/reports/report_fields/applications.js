module.exports = {
  application: {
    application_date: {
      label: "Application Date",
      key: "application_date",
      group: "application",
      column_type: 'date',
      input: 'comparison'

    },
    application_status: {
      label: "Status",
      key: "application_status",
      group: "application",
      column_type: 'status',
      input: 'multi-select'

    },
    application_bankruptcy: {
      label: "Bankruptcy",
      key: "application_bankruptcy",
      group: "application",
      column_type: 'boolean',
      input: 'boolean'
    },
    application_evicted: {
      label: "Evicted",
      key: "application_evicted",
      group: "application",
      column_type: 'boolean',
      input: 'boolean'
    },
    application_refused_to_pay: {
      label: "Refused to pay",
      key: "application_refused_to_pay",
      group: "application",
      column_type: 'boolean',
      input: 'boolean'
    },
    application_terms: {
      label: "Agreed To Terms",
      key: "application_terms",
      group: "application",
      column_type: 'boolean',
      input: 'boolean'
    },
  }
}
