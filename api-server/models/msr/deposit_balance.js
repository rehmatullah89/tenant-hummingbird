//Liability Recognition model, queries used in the following reports
//Summary report:
//MSR Summary - Liability Recognition Widget

var moment  = require('moment');
var Enums   = require(__dirname + '/../../modules/enums.js');

module.exports = {

  //Summarized
  summaryDepositBalance(connection, date, properties) {
    let sql = `
      with cte_deposits_alloc as ( ${this.getDepositAllocations(properties.map(p => connection.escape(p)), connection.escape(date))} )
      
      select cda.property_id, @date as date, cda.product_type, sum(cda.amount) as amount, count(cda.invoice_id) as count
      from cte_deposits_alloc cda
      group by cda.property_id, cda.product_type
    `;

    // 219ms
    console.log('summaryDepositBalance:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  //Detailed

  // Snippet
  getDepositAllocations(properties, date){
    let {
      PRODUCT_DEFAULT_TYPES: pdt,
      PAYMENT_CREDIT_TYPE: pct
    } = Enums;

    let sql = `
      select i.id as invoice_id, i.property_id, pr.default_type as product_type, sum(ila.amount) as amount, i.due, i.void_date
      from invoice_lines_allocation ila
        inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
        inner join invoices i on i.id = ila.invoice_id
        inner join leases l on l.id = i.lease_id
        inner join invoice_lines il on il.id = ila.invoice_line_id
        inner join products pr on pr.id = il.product_id
        inner join payments pay on pay.id = ipb.payment_id
      where ila.date <= ${date}
        and i.property_id in (${properties.join(',')})
        and pr.default_type in ('${pdt.SECURITY_DEPOSIT}', '${pdt.CLEANING_DEPOSIT}')
        and pay.credit_type in ('${pct.PAYMENT}')
        and (l.end_date is null or l.end_date > @date)
      group by i.id
      having amount > 0
    `;

    return sql;
  },

}
