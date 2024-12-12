class PaymentMethodQueries {
  constructor(data, date) {
    this.id = data.id;
    this.address_id =  " (SELECT address FROM payment_methods WHERE id = " +  this.id + ") ";

    this.queries = {
      method_id:                   this.id,
      method_name:                " (SELECT CONCAT(first, ' ', last) from payment_methods where id = " + this.id +  ") ",
      method_name_on_card:        " (SELECT name_on_card from payment_methods where id = " + this.id +  ") ",
      method_address:             " (SELECT address from addresses where id = " + this.address_id +  ") ",
      method_address2:            " (SELECT address2 from addresses where id = " + this.address_id +  ") ",
      method_city:                " (SELECT city from addresses where id = " + this.address_id +  ") ",
      method_state:               " (SELECT state from addresses where id = " + this.address_id +  ") ",
      method_zip:                 " (SELECT zip from addresses where id = " + this.address_id +  ") ",
      method_type:                " (SELECT type from payment_methods where id = " + this.id +  ") ",
      method_exp:                 " (SELECT exp_warning from payment_methods where id = " + this.id +  ") ",
      method_last_4:              " (SELECT card_end from payment_methods where id = " + this.id +  ") ",
      method_card_type:           " (SELECT card_type from payment_methods where id = " + this.id +  ") ",
      method_acct_num:            " (SELECT card_end from payment_methods where id = " + this.id +  ") ",
      method_routing_num:         " (SELECT routing_number from payment_methods where id = " + this.id +  ") ",
      method:                     " (SELECT method from payment_methods where id = " + this.id +  ") ",
      method_is_autopay:          " (SELECT case when COUNT(*)>0 then 1 else 0 end FROM leases_payment_methods WHERE deleted is null and payment_method_id = " + this.id +  " ) ",

      method_last_declined:        '(SELECT date from payments where payment_methods_id = ' + data.id + ' and payments.status <= 0 and date <= ' + date + ' HAVING MAX(date))',
      method_times_declined:       '(SELECT COUNT(id) from payments where payment_methods_id = ' + data.id + ' and payments.status <= 0 and date <= ' + date + ' )',
      method_last_declined_reason: '(SELECT status_desc from payments where payment_methods_id = ' + data.id + ' and payments.status <= 0 and date <= ' + date + ' HAVING MAX(date))',
      method_total_payments:       '(SELECT IFNULL(SUM(amount), 0) from payments where payment_methods_id = ' + data.id + ' and payments.status = 1 and date <= ' + date + ')',
      method_last_billed:          '(SELECT date from payments where payment_methods_id = ' + data.id + '  and payments.status = 1 and date <= ' + date + ' HAVING MAX(date))',
      method_times_billed:         '(SELECT COUNT(id) from payments where payment_methods_id = ' + data.id + ' and payments.status = 1 and date <= ' + date + ' )',
      method_autopay_count:        '(SELECT COUNT(id) from payments where payment_methods_id = ' + data.id + ' and payments.status = 1 and type = "auto" and date <= ' + date + ' )',
      method_total_auto_pay:       '(SELECT IFNULL(SUM(amount), 0) from payments where payment_methods_id = ' + data.id + ' and payments.status = 1 and type = "auto" and date <= ' + date + ')',
    }
  }
}

module.exports = PaymentMethodQueries;
