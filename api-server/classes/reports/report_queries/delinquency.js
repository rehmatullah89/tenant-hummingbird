
const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
class DelinquencyQueries {
    constructor(data, date) {
      this.id = data.id;
      this.lease_id = data.lease_id;

      this.queries = {
  
        delinquency_id:            this.id,
        delinquency_lease_id:      this.lease_id,
        delinquency_start_date:    " (SELECT start_date FROM delinquencies WHERE id = " + this.id + ") ",
        delinquency_end_date:      " (SELECT end_date FROM delinquencies WHERE id = " + this.id + ") ",
        delinquency_status:        " (SELECT CONCAT(UPPER(SUBSTRING(status,1,1)),LOWER(SUBSTRING(status,2))) FROM delinquencies WHERE id = " + this.id + ") ", 
        delinquency_stage:         " (Select stage from (" + Sql.delinquency_process(this.id, 'name') + ") as delinquency_process where execution_date <= '" + date + "' limit 1) ",
        delinquency_pause_reason:    " (Select reason from (" + Sql.delinquency_process(this.id, 'reason') + ") as delinquency_process where execution_date <= '" + date + "' limit 1) "
      }
    } 
  }  
  
  module.exports = DelinquencyQueries;
  