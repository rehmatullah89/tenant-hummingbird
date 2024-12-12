class InvoiceLinesQueries {
  constructor(data) {
    this.id = data.id;
    this.product_id = '(select product_id from invoice_lines where id = ' + data.id + ' )';
    this.service_id = '(select service_id from invoice_lines where id = ' + data.id + ' )';
    this.invoice_id = `(select invoice_id from invoice_lines where id = ${data.id})`;
    this.total_amount_paid =  ` (select sum(amount) from invoice_lines_allocation where invoice_line_id in (${this.id}) ) `;
    this.tax_amount_applied =  ` (select sum(amount) from invoice_lines_allocation where invoice_line_id in (${this.id}) AND type='tax') `;
    this.due_amount = ` ( SELECT IFNULL((((ildue.qty * ildue.cost) + ildue.total_tax) - ${this.total_amount_paid} ) , ((ildue.qty * ildue.cost) + ildue.total_tax) ) FROM invoice_lines ildue WHERE ildue.id IN (${this.id}) ) `;

    this.queries = {
      invoice_line_description:   ' (select description from invoice_lines where id = ' + this.id + ' )',
      invoice_line_qty:            ' (select qty from invoice_lines where id = ' + this.id + ' )',
      invoice_line_cost:           ' (select cost from invoice_lines where id = ' + this.id + ' )',
      invoice_line_total:          ' (select (qty * cost) from invoice_lines where id = ' + this.id + ' )',
      invoice_line_date:          ' (select date from invoice_lines where id = ' + this.id + ' )',
      invoice_line_start_date:    ' (select start_date from invoice_lines where id = ' + this.id + ' )',
      invoice_line_end_date:      ' (select end_date from invoice_lines where id = ' + this.id + ' )',

      invoice_line_total_sale:    ' (select IFNULL(((qty * cost) + total_tax),0) from invoice_lines where id = ' + this.id + ' )',
      invoice_line_net_product_charge: ' (select IFNULL(((qty * cost)-total_discounts),0) from invoice_lines where id = ' + this.id + ' )',

      invoice_line_discount_amt:      ' (select IFNULL(total_discounts,0) from invoice_lines where id = ' + this.id + ' )',
      invoice_line_sales_tax:         ' (select IFNULL(total_tax,0) from invoice_lines where id = ' + this.id + ' )',
      invoice_line_sales_tax_percent: ' (select IFNULL(SUM(taxrate)/100,0) from tax_line_items where invoice_line_id = ' + this.id + ' )',

      invoice_line_product:               ' (select name from products  where id = ' + this.product_id + ' )',
      invoice_line_product_description:   ' (select description from products  where id = ' + this.product_id + ' )',
      invoice_line_product_type:          ' (select default_type from products  where id = ' + this.product_id + ' )',
      invoice_line_service_period_start:  ' (select start_date from services  where id = ' + this.service_id + ' )',
      invoice_line_service_taxable:       ' (select taxable from services  where id = ' + this.service_id + ' )',
      invoice_line_service_period_end:    ' (select end_date from services  where id = ' + this.service_id + ' )',
      invoice_line_insurance_premium:     ' (select price from services where id = ' + this.service_id + ' )',
      invoice_line_insurance_coverage:    ' (select coverage from insurance where product_id = ' + this.product_id + ' )',
      
      invoice_line_refund_amount: `(
        SELECT IFNULL(ABS(SUM(ila.amount)), 0)
        FROM invoice_lines_allocation ila
        JOIN invoices_payments_breakdown ipb on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id} and ipb.refund_id IS NOT NULL
      )`,
      // invoice_line_refund_effective_date:   `( SELECT effective_date FROM refunds WHERE id IN ( SELECT refund_id FROM invoices_payments_breakdown WHERE refund_id IS NOT NULL AND id IN ( SELECT invoice_payment_breakdown_id FROM invoice_lines_allocation WHERE invoice_line_id = ${this.id} ) ) LIMIT 1)`,
      invoice_line_refund_date: `(
        SELECT DATE(r.DATE)
        FROM refunds r
        JOIN invoices_payments_breakdown ipb on ipb.refund_id = r.id
        JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id}
        LIMIT 1
      )`,
      invoice_line_refund_reason: `(
        SELECT r.reason
        FROM refunds r
        JOIN invoices_payments_breakdown ipb on ipb.refund_id = r.id
        JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id}
        LIMIT 1
      )`,
      
      invoice_line_credit_amount: `( SELECT IFNULL(SUM(ila.amount), 0) FROM invoice_lines_allocation ila JOIN invoices_payments ip ON ila.invoice_payment_id = ip.id JOIN payments p ON ip.payment_id = p.id WHERE p.credit_type = 'credit' AND ila.invoice_line_id = ${this.id})`,
      // invoice_line_credit_effective_date: `( SELECT effective_date FROM payments WHERE credit_type = 'credit' AND id IN ( SELECT payment_id FROM invoices_payments_breakdown WHERE id IN ( SELECT invoice_payment_breakdown_id FROM invoice_lines_allocation WHERE invoice_line_id = ${this.id} ) ) ORDER BY id DESC LIMIT 1)`,
      invoice_line_credit_date: `(
        SELECT DATE(p.date)
        FROM payments p
        JOIN invoices_payments_breakdown ipb on p.id = ipb.payment_id
        JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id} AND p.credit_type = 'credit'
        ORDER BY p.id DESC LIMIT 1
      )`,
      invoice_line_credit_reason: `(
        SELECT p.notes
        FROM payments p
        JOIN invoices_payments_breakdown ipb on p.id = ipb.payment_id
        JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id} AND p.credit_type = 'credit'
        ORDER BY p.id DESC LIMIT 1
      )`,
      
      invoice_line_last_payment_date: `(
        SELECT DATE(p.date)
        FROM payments p
        JOIN invoices_payments_breakdown ipb on p.id = ipb.payment_id
        JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
        WHERE ila.invoice_line_id = ${this.id}
        ORDER BY p.id DESC LIMIT 1
      )`,
      // invoice_line_last_payment_effective_date: `( SELECT effective_date FROM payments WHERE id IN ( SELECT payment_id FROM invoices_payments_breakdown WHERE id IN ( SELECT invoice_payment_breakdown_id FROM invoice_lines_allocation WHERE invoice_line_id = ${this.id} ) ) ORDER BY id DESC LIMIT 1)`,
      invoice_line_due_amount: `( SELECT IFNULL( ( ( (ildue.qty * ildue.cost) + ildue.total_tax ) - ( SELECT SUM(amount) FROM invoice_lines_allocation WHERE invoice_line_id IN ( ${this.id} ) ) ), ( ildue.qty * ildue.cost ) + ildue.total_tax ) AS due_amount FROM invoice_lines ildue WHERE ildue.id IN ( ${this.id} ) )`,
     
      invoice_line_paid_in_full_date: `(
        SELECT IF(
          (
              ${this.due_amount} = 0),
            (
              SELECT DATE(p.date)
              FROM payments p
              JOIN invoices_payments_breakdown ipb on p.id = ipb.payment_id
              JOIN invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
              WHERE ila.invoice_line_id = ${this.id} AND ipb.refund_id IS NULL
              ORDER BY p.id DESC LIMIT 1
            ),
            ""
          )
      )`,
      //coverage_activity flags
      invoice_line_amount_applied: `( SELECT IFNULL(IF( ${this.total_amount_paid} = 0, 0, ${this.total_amount_paid}), 0 ))`,
      invoice_line_tax_amount_applied: `( SELECT IFNULL(${this.tax_amount_applied}, 0))`,
      invoice_line_is_new_coverage: `( SELECT (IF(( SELECT COUNT(*) FROM invoice_lines WHERE service_id = il.service_id AND start_date < il.start_date) > 0 , FALSE, TRUE)))`,
      invoice_line_is_paid: `( SELECT IF( ${this.total_amount_paid} > 0, TRUE, FALSE) )`,
      invoice_line_is_cancelled_coverage: `( SELECT IFNULL(IF( ( l.end_date BETWEEN DATE(i.period_start) AND DATE(i.period_end) ), 1, ( SELECT CASE WHEN ( i2.id IS NOT NULL AND il2.id IS NULL ) THEN 1 WHEN il.service_id <> il2.service_id THEN 1 ELSE 0 END FROM invoices i2 LEFT JOIN invoice_lines il2 ON i2.id = il2.invoice_id AND ( SELECT default_type FROM products WHERE id = il2.product_id ) = 'insurance' AND ( SELECT status FROM services WHERE id = il2.service_id ) = TRUE WHERE i2.lease_id = i.lease_id AND i2.period_start > i.period_end LIMIT 1 ) ), 0) FROM invoice_lines inner_il JOIN invoices i ON inner_il.invoice_id = i.id JOIN leases l ON i.lease_id = l.id WHERE inner_il.id = il.id )`,
    }
  }
}

module.exports = InvoiceLinesQueries;