module.exports = {
    delinquency_pause: {
  
        delinquency_pause_start: {
            label: "Pause Start", 
            key: "delinquency_pause_start",
            group: "delinquency", 
            column_type: "date",
            input: 'timeframe', 
            width: 120
        },
        delinquency_pause_end: {
            label: "Pause End",
            key: "delinquency_pause_end",
            group: "delinquency",
            column_type: "date",
            input: 'timeframe',
            width: 120
        },

        delinquency_pause_total_days: {
            label: "Total Days Paused",
            key: "delinquency_pause_total_days",
            group: "delinquency",
            column_type: "number",
            input: "comparison", 
            width: 120
        },
        delinquency_paused_days: {
            label: "Days Paused",
            key: "delinquency_paused_days",
            group: "delinquency",
            column_type: "number",
            input: "comparison", 
            width: 120
        },
       
        delinquency_pause_paused_by_name: {
            label: "Paused By",
            key: "delinquency_pause_paused_by_name",
            group: "delinquency",
            input: 'multi-select',
            width: 176
          },
          delinquency_pause_resumed_by_name: {
            label: "Resumed By",
            key: "delinquency_pause_resumed_by_name",
            group: "delinquency",
            input: 'multi-select',
            width: 176
        },
        delinquency_pause_pause_reason: {
            label: "Reason Paused",
            key: "delinquency_pause_pause_reason",
            group: "delinquency",
            width: 200
        }, 
        delinquency_pause_date: {
            label: "Delinquency Paused Date",
            key: "delinquency_pause_date",
            group: "delinquency",
            column_type: "date",
            width: 200
        }

    }, 
    delinquency_pause_summary: {
    
    }
  }
  