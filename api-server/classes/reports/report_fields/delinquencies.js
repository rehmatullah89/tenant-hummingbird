module.exports = {
    delinquency: {
  
      delinquency_status: {
        label: "Delinquency Status",
        key: "delinquency_status",
        group: "delinquency",
        options: ['Active', 'Paused', 'Completed'],
        input: 'multi-select'
      },
      delinquency_start_date: {
        label: "Delinquency Start Date",
        key: "delinquency_start_date",
        group: "delinquency",
        column_type: "date",
        input: 'timeframe',
        width: 120
      },

      delinquency_end_date: {
        label: "Delinquency End Date",
        key: "delinquency_end_date",
        group: "delinquency",
        column_type: "date",
        input: 'timeframe',
        width: 120
      },
      delinquency_stage: {
        label: "Delinquency Stage",
        key: "delinquency_stage",
        group: "delinquency",
        width: 120
      },
      
      delinquency_pause_reason: {
        label: "Delinquency Pause Reason",
        key: "delinquency_pause_reason",
        group: "delinquency",
        width: 120
      }
    },
    delinquency_summary: {
      
    }
  }
  