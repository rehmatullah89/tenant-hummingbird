class InvoicesPaymentsQueries {
  constructor(data, date) {
    this.id = data.id;

    this.queries = {
      invoices_id:                   this.id,
      invoices_payments_id:           this.id,
      invoices_payments_date:         " (SELECT date FROM invoices_payments WHERE id = " + this.id + ") ",
      invoices_payments_amount:       " (SELECT amount FROM invoices_payments WHERE id = " + this.id + ") "
    }
  }
}

module.exports = InvoicesPaymentsQueries;
