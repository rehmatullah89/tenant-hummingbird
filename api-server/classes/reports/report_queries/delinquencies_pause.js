class DelinquencyPauseQueries {
    constructor(data, date) {
      this.id = data.id;
      this.delinquency_id = data.delinquency_id;
  
      this.queries = {
        delinquency_pause_id:               this.id,
        delinquency_delinquency_id:         this.delinquency_id,
        delinquency_pause_start:            " (SELECT start FROM delinquencies_pauses WHERE id = " + this.id + ") ",
        delinquency_pause_end:              " (SELECT end FROM delinquencies_pauses WHERE id = " + this.id + ") ",
        delinquency_pause_total_days:       " (SELECT total_days FROM delinquencies_pauses WHERE id = " + this.id + ") ",
        delinquency_paused_days:             " (SELECT  DATEDIFF('" + date + "', start) FROM delinquencies_pauses WHERE id = " + this.id + ") ",
        delinquency_pause_paused_by_name:   " (select CONCAT(first, ' ' , last) from contacts where id = (SELECT paused_contact_id from delinquencies_pauses where id = " + this.id +  ")) ",
        delinquency_pause_resumed_by_name:  " (select CONCAT(first, ' ' , last) from contacts where id = (SELECT resumed_contact_id from delinquencies_pauses where id = " + this.id +  ")) ",
        delinquency_pause_pause_reason:           " (SELECT reason FROM delinquencies_pauses WHERE id = " + this.id + ") ", 
        delinquency_pause_date:              " (SELECT start FROM delinquencies_pauses WHERE id = " + this.id + ") "
      }
    }
  }
  
  module.exports = DelinquencyPauseQueries;
  