module.exports = {
    delinquency_actions: {
  
      delinquency_action_action: {
        label: "Delinquency Action",
        key: "delinquency_action_action",
        group: "delinquency_actions",
        width: 200
      },

      delinquency_action_stage: {
        label: "Delinquency Stage Name",
        key: "delinquency_action_stage",
        group: "delinquency_actions",
        width: 250
      },

      delinquency_action_start: {
        label: "Days After Invoice",
        key: "delinquency_action_start",
        group: "delinquency_actions",
        width: 200
      },
      delinquency_action_execution_date: {
        label: "Delinquency Execution Date",
        key: "delinquency_action_execution_date",
        group: "delinquency_actions",
        column_type: "date",
        input: 'timeframe',
        width: 120
      },


      delinquency_action_schedule_name: {
        label: "Delinquency Schedule Name",
        key: "delinquency_action_schedule_name",
        group: "delinquency_actions",
        width: 250
      },

      delinquency_action_completed: {
        label: "Delinquency Action Date",
        key: "delinquency_action_completed",
        group: "delinquency_actions",
        column_type: "date",
        input: 'timeframe',
        width: 120
      },
      
      delinquency_action_error: {
        label: "Delinquency Action Error Messages",
        key: "delinquency_action_error",
        group: "delinquency_actions",
        width: 200
      }
    },
    
    delinquency_actions_summary: {
      
    }
  }
  