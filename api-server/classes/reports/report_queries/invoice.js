class InvoiceQueries {
  constructor(data, date) {
    this.id = data.id;

    let invoice_due = " (SELECT due FROM invoices WHERE id = " + this.id + ") ";
    let subtotal = " (SELECT IFNULL(subtotal, 0) FROM invoices WHERE id = " + this.id + ") ";
    let invoice_sales_tax =  " (SELECT IFNULL(total_tax, 0) FROM invoices WHERE id = " + this.id + ") ";
    let invoice_discounts =  " (SELECT IFNULL(total_discounts, 0) FROM invoices WHERE id = " + this.id + ") ";

    let invoice_payments =  " (SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = " + this.id + " and date <= '" + date + "') ";
    let payment_id =  "(select id from payments p where p.status = 1 and credit_type = 'payment') and invoice_id = " + this.id;
    let credit_id =  "(select id from payments p where p.status = 1 and credit_type = 'credit') and invoice_id = " + this.id;
    let write_off_id =  "(select id from payments p where p.status = 1 and credit_type = 'loss') and invoice_id = " + this.id;

    this.queries = {
      invoice_id:                       " (SELECT id FROM invoices WHERE id = " + this.id + ") ",
      invoice_number:                   " (SELECT number FROM invoices WHERE id = " + this.id + ") ",
      invoice_date:                     " (SELECT date FROM invoices WHERE id = " + this.id + ") ",
      invoice_due:                      invoice_due,
      invoice_type:                     " (SELECT type FROM invoices WHERE id = " + this.id + ") ",
      invoice_period_start:             " (SELECT period_start FROM invoices WHERE id = " + this.id + ") ",
      invoice_period_end:               " (SELECT period_end FROM invoices WHERE id = " + this.id + ") ",
      invoice_status:                   " (SELECT status FROM invoices WHERE id = " + this.id + ") ",

      invoice_subtotal:                 subtotal,
      invoice_payments:                 " (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in " + payment_id + "  and date <= '" + date + "')",
      invoice_prepayments:              " (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE date <= '" + date + "' and payment_id in " + payment_id + " and date < (SELECT due FROM invoices WHERE id = " + this.id + ") )",
      invoice_sales_tax:                invoice_sales_tax,
      invoice_discounts:                invoice_discounts,
      invoice_discounts_names:          "(SELECT group_concat(p.name) from promotions p where p.id in (select d.promotion_id from discounts d where d.lease_id = (select i.lease_id from invoices i where i.id = " + this.id + " and d.start <= date(i.period_start) and (d.end >= date(i.period_end) or d.end is null) )))",
      invoice_discounts_descriptions:   "(SELECT group_concat(p.description) from promotions p where p.id in (select d.promotion_id from discounts d where d.lease_id = (select i.lease_id from invoices i where i.id = " + this.id + " and d.start <= date(i.period_start) and (d.end >= date(i.period_end) or d.end is null) )) and p.description != '') ",
      invoice_balance:                  " ( " + subtotal + "  + " + invoice_sales_tax + " - " + invoice_discounts +  " - (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id = " +  this.id + "  and date <= '" + date + "') ) ",
      invoice_total:                    " ( " + subtotal + "  + " + invoice_sales_tax + " - " + invoice_discounts  + ") ",
      invoice_credits:                  "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in " + credit_id + " and date <= '" + date + "')",
      invoice_writeoffs:                "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id in " + write_off_id + " and date <= '" + date + "')",
      invoice_payment_status:           `(IF((select id from invoices where id = ${this.id} and ((IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0)) - IFNULL(total_payments, 0)) = 0), 'Yes', 'No'))`,
      invoice_payment_methods:          `(SELECT GROUP_CONCAT(DISTINCT((SELECT IF((select id from payments where id = p.id and method = 'check'), CONCAT(p.method, '#', p.number), (SELECT IF((select id from payments where id = p.id and method = 'card'), CONCAT(p.method, '****', (select card_end from payment_methods where id = p.payment_methods_id)), p.method )))))) from payments p where id in (select payment_id from invoices_payments where invoice_id = ${this.id}))`,

      invoice_days_past_due:            " DATEDIFF('" + date + "', " + invoice_due + ") ",
      invoice_total_fees:               " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'late') and invoice_id = " + this.id +  " ) ",
      invoice_total_merchandise:        " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'product') and invoice_id = " + this.id +  ") ",
      invoice_total_rent:               " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id = " + this.id +  ") ",
      invoice_total_insurance:          " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'insurance') and invoice_id = " + this.id +  ") ",
      invoice_total_utilities:          " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'utility') and invoice_id = " + this.id +  ") ",
      invoice_total_deposits:           " (SELECT IFNULL(ROUND(SUM((qty*cost) - IFNULL(total_discounts,0)), 2), 0) from invoice_lines where product_id in (select id from products where default_type = 'deposit') and invoice_id = " + this.id +  ") ",

      invoice_voided_date:              ` (SELECT void_date FROM invoices WHERE id = ${this.id}) `,
      invoice_voided_by:                ` (SELECT CONCAT(first, ' ', last) FROM contacts WHERE id = (SELECT voided_by_contact_id FROM invoices where id = ${this.id})) `,
      invoice_created_by:               ` (IFNULL((SELECT CONCAT(first, ' ', last) FROM contacts WHERE id = (SELECT created_by FROM invoices where id = ${this.id})), 
                                                  (IFNULL((SELECT name from api_keys where id = (SELECT apikey_id from invoices where id = ${this.id})), 
                                                  (IF((SELECT type from invoices  where id = ${this.id}) = 'auto', 'Hummingbird', null)))))) `,
      invoice_discounts_end_date:        `(select GROUP_CONCAT(DISTINCT(d.end)) from discounts d where d.lease_id = (select i.lease_id from invoices i where i.id = ${this.id} and d.start <= date(i.period_start) and (d.end >= date(i.period_end) or d.end is null) ))`
    }

  }

}

module.exports = InvoiceQueries;
