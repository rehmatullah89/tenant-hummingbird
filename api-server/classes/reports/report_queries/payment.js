const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
class PaymentQueries {
  constructor(data, date) {
    this.id = data.id;
    this.source_payment_id = data.source_payment_id || null;
    this.target_payment_id = data.target_payment_id || null;

    let invoice_payments =  " (SELECT IFNULL(SUM(amount),0) from invoices_payments_breakdown where payment_id = " + this.id + " and date <= '" + date + "') ";
    let payment_amount =   " (SELECT amount from payments where id = " + this.id +  ") ";
    let payment_refunds = " (select IFNULL(SUM(amount),0) from refunds where payment_id = " + this.id +  " and date <= '" + date + "') ";

    this.queries = {

      payment_id:                 this.id,
      payment_date:               " (SELECT date from payments where id = " + this.id +  ") ",
      payment_ref_name:           " (SELECT ref_name from payments where id = " + this.id +  ") ",
      payment_method:             ` (SELECT method from payments where id = ${this.source_payment_id || this.id}) `,
      payment_trans_id:           " (SELECT transaction_id from payments where id = " + this.id +  ") ",
      payment_number:             " (SELECT number from payments where id = " + this.id +  ") ",
      payment_created:            " (SELECT created from payments where id = " + this.id +  ") ",
      payment_credit_type:        " (SELECT credit_type from payments where id = " + this.id +  ") ",
      payment_notes:              ` (SELECT notes from payments where id = ${this.source_payment_id || this.id}) `,
      payment_status:             " (SELECT status from payments where id = " + this.id +  ") ",
      payment_status_desc:        " (SELECT status_desc from payments where id = " + this.id +  ") ",
      payment_auth_code:          " (SELECT auth_code from payments where id = " + this.id +  ") ",
      payment_amount:             payment_amount,
      payment_source:             " (SELECT source from payments where id = " + this.id +  ") ",
      payment_accepted_by:        " (SELECT accepted_by from payments where id = " + this.id +  ") ",
      payment_payment_source:         "(select payment_source from payments where id = " + this.id+ ")",
      payment_accepted_by_name:      " (select CONCAT(first, ' ' , last) from contacts where id = (SELECT accepted_by from payments where id = " + this.id +  ")) ",

      payment_unit_numbers:       " (SELECT GROUP_CONCAT(number) from units where id in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = " + this.id +  ")))) ",
      payment_amt_applied:        invoice_payments,
      payment_amt_remaining:      payment_amount + " -  (select IFNULL(" + invoice_payments + ", 0) from payments where id = " + this.id +  " and date <= '" + date + "') ",
      payment_refunds:            payment_refunds,
      payment_amount_tendered:    ` (select amount_tendered from payments where id = ${this.id})`,
      payment_change_due:         ` (select (amount_tendered - amount) from payments where id = ${this.id})`,

      payment_rent_paid:          Sql.get_payment_allocation(this.id, { date, product_types: ['rent'], line_type: 'line' }),
      payment_deposit_paid:       Sql.get_payment_allocation(this.id, { date, product_types: ['security', 'cleaning'], line_type: 'line' }),
      payment_merchandise_paid:   Sql.get_payment_allocation(this.id, { date, product_types: ['product'], line_type: 'line' }),
      payment_coverage_paid:      Sql.get_payment_allocation(this.id, { date, product_types: ['insurance'], line_type: 'line' }),
      payment_fees_paid:          Sql.get_payment_allocation(this.id, { date, product_types: ['late'], line_type: 'line' }),
      payment_auction_paid:       Sql.get_payment_allocation(this.id, { date, product_types: ['auction'], line_type: 'line' }),
      payment_tax_paid:           Sql.get_payment_allocation(this.id, { date, line_type: 'tax' }),
      payment_net:                ` ( select (${payment_amount}) - (${payment_refunds}))`,
      payment_source_property_name: `(select name from properties where id = (select property_id from payments where id=${this.source_payment_id || this.id }))`,
      payment_target_property_name: `(select name from properties where id = (select property_id from payments where id=${this.target_payment_id || this.id }))`
    }
  }
}

module.exports = PaymentQueries;

