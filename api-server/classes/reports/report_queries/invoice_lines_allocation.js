class InvoiceLinesAllocationQueries {
  constructor(data) {
    this.id = data.id;
    this.product_id = `(select product_id from invoice_lines where id = (select invoice_line_id from invoice_lines_allocation where id = ${this.id}))`;
    this.service_id = '(select service_id from invoice_lines where id = ' + data.id + ' )';

    this.queries = {

      invoice_line_allocation_amount:                 ` (select amount from invoice_lines_allocation where id = ${this.id}) `,
      invoice_line_allocation_date:                   ` (select date from invoice_lines_allocation where id = ${this.id}) `,
      invoice_line_allocation_type:                   ` (select CASE WHEN type = 'line' THEN (SELECT CASE WHEN default_type = 'late' THEN 'fee' WHEN default_type = 'product' THEN 'merchandise' ELSE default_type END from products where id = (select product_id from invoice_lines where id = invoice_line_id)) ELSE type END from invoice_lines_allocation where id = ${this.id}) `,
      invoice_line_allocation_product:                ` (select name from products  where id = ${this.product_id} )`,
      invoice_line_allocation_product_description:    ` (select description from products  where id = ${this.product_id} )`,
      invoice_line_allocation_sales_tax_paid:    ` (select IFNULL(amount,0) from invoice_lines_allocation  where id = ${this.id} and type = 'tax')`,

    }
  }
}

module.exports = InvoiceLinesAllocationQueries;

