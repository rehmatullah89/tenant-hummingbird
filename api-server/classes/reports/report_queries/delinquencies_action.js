class DelinquencyActionQueries {
    constructor(data, date) {
      this.id = data.id;
      this.delinquency_id = data.delinquency_id;
  
      this.queries = {
        delinquency_action_id:                this.id,
        delinquency_delinquency_id:           this.delinquency_id,
        delinquency_action_type_id:           " (SELECT name from triggers where id = " + this.id + ") ",
        delinquency_action_stage:             " (SELECT delinquency_action_type_id from delinquencies_actions where id = " + this.id + ") ",
        delinquency_action_start:             " (SELECT start from triggers where id = " + this.id + ") ",
        delinquency_action_action:            " (SELECT name FROM delinquency_action_types WHERE id = (SELECT delinquency_action_type_id from delinquencies_actions where id = " + this.id + ") ) ",
        delinquency_action_schedule_name:     " (SELECT name from trigger_groups where id = (select trigger_group_id from triggers where id = (select trigger_id from delinquencies_actions  where id = " + this.id + "))) ",
        delinquency_action_execution_date:    " (SELECT execution_date FROM delinquencies_actions WHERE id = " + this.id + ") ",
        delinquency_action_error:             " (SELECT error FROM delinquencies_actions WHERE id = " + this.id + ") ",
        delinquency_action_deleted:           " (SELECT deleted FROM delinquencies_actions WHERE id = " + this.id + ") ",
        delinquency_action_completed:         " (SELECT completed FROM delinquencies_actions WHERE id = " + this.id + ") ",
        
      }
    }
  }
  
  module.exports = DelinquencyActionQueries;
  'overlock', 'deny_access', 'deny_payments', 'cancel_insurance', 'schedule_auction', 'lease_standing', 'task', 'fee', 'document', 'message'