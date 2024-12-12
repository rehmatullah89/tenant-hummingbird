const ENUMS = require('../../../modules/enums');

class RefundQueries {
  constructor(data, date) {
    this.id = data.id;
    let refund_amount =   " (SELECT amount from refunds where id = " + this.id +  ") ";

    this.queries = {

      refund_id:                  this.id,
      refund_amount:              refund_amount,
      refund_date:                " (SELECT date from refunds where id = " + this.id +  ") ",
      refund_reason:              " (SELECT reason from refunds where id = " + this.id +  ") ",
      refund_ref_num:             " (SELECT ref_num from refunds where id = " + this.id +  ") ",
      refund_trans_id:            " (SELECT transaction_id from refunds where id = " + this.id +  ") ",
      refund_auth_code:           " (SELECT auth_code from refunds where id = " + this.id +  ") ",
      refund_to:                  " (SELECT TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') )) FROM contacts WHERE id = (SELECT refund_to from refunds where id = " + this.id +  ")) ",
      refund_type:                ` (SELECT Case 
                                              When type = 'refund' THEN 'Refund'
                                              When type = 'nsf' THEN 'NSF'
                                              When type = 'ach' THEN 'Reversal'
                                              When type = 'offline' THEN 'Offline'
                                              When type = 'chargeback' THEN 'Chargeback'
                                              When type = 'overage_return' THEN 'Overage Return' 
                                              When type = '${ENUMS.REVERSAL_TYPES.VOID}' THEN 'Void'
                                              When type = '${ENUMS.REVERSAL_TYPES.CREDIT}' THEN 'Reversal'
                                              ELSE UCASE(type) 
                                            end 
                                      FROM refunds 
                                      WHERE id = ${this.id}) `
    }
  }
}

module.exports = RefundQueries;

