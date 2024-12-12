module.exports = {
  task: {
    task_details: {
      label: "Task Details",
        key: "task_details",
        group: "tasks"
    },
    task_completed: {
      label: "Task Completed",
        key: "task_completed",
        group: "tasks",
        column_type: 'boolean',
        input: 'boolean'
    },
    task_notes: {
      label: "Task Notes",
        key: "task_notes",
        group: "tasks"
    },
    task_created_by: {
      label: "Task Created By",
      key: "task_created_by",
      group: "tasks",
      input: 'multi-select'
    },
    task_assigned_to: {
      label: "Task Assigned To",
      key: "task_assigned_to",
      group: "tasks",
      input: 'multi-select'
    },
    task_snoozed_count: {
      label: "Task Snoozed Count",
      key: "task_snoozed_count",
      group: "tasks",
      column_type: 'number',
      input: "comparison"
    },
    task_completed_at: {
      label: "Completed At",
      key: "task_completed_at",
      group: "tasks",
      column_type: 'date',
      input: 'timeframe'
    }
  },
  task_summary: {
    task_time_to_complete: {
      label: "Time To Complete",
      key: "task_time_to_complete",
      group: "tasks",
      column_type: 'number',
      input: "comparison"
    }

    // days column_type

    // task type



  }
}
