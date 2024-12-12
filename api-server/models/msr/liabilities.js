//Liabilities model, queries used in the following reports
//Summary report:
//MSR Summary - Liabilities Widget
//Detail report:
//MSR Detail - Liabilities Summary report


var moment= require('moment');

module.exports = {

  //Summarized
  async summaryLiabilities(connection, date, properties) {
    let sql = `
      with cte_liabilities as ( ${this.getLiableInvoices(connection.escape(date), properties.map(p => connection.escape(p)))} )
      select a.property_id, a.product, a.report_date,
        sum(a.amount) as revenue_amount_,
        sum(a.tax) as revenue_tax_,
        sum(a.total) as revenue_total_,
      count(distinct a.lease_id) as revenue_spaces_
      from cte_liabilities a
      group by a.property_id, a.product, a.report_date
    `;

    console.log('summaryLiabilities:', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async summaryLiableUnits(connection, date, properties) {
    let sql = `
      with cte_liabilities as ( ${this.getLiableInvoices(connection.escape(date), properties.map(p => connection.escape(p)))} ),
      cte_liable_leases as (
        select cl.property_id, cl.report_date, cl.lease_id
        from cte_liabilities cl
        group by cl.property_id, cl.lease_id, cl.report_date
      )
      select cll.property_id, cll.report_date, count(cll.lease_id) as revenue_spaces_
      from cte_liable_leases cll
      group by cll.property_id, cll.report_date
    `;

    console.log('summaryLiableUnits:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0] : {});
  },

  //Detailed
  detailProductLiabilities(connection, property_id, date, product_types = [], inclusive = true) {
    let sql = this.getLiableInvoices(connection.escape(date), [connection.escape(property_id)], product_types.map(p => connection.escape(p)), inclusive);

    console.log('detailProductLiabilities:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // Snippet
  getLiableInvoices(date, properties, product_types = [], inclusive = true){
    let sql = `
      select u.property_id, i.lease_id, ${date} as report_date, concat(c.first,' ',c.last) as name, u.number as unit_number, Date(ipb.date) as payment_date, i.due as invoice_date, i.date as invoice_gen_date,
        ((i.subtotal + i.total_tax) - i.total_discounts) as invoice_total, i.number as invoice_number, Date(i.period_end) as paid_date, p.name as product_name, p.type as product_type, p.default_type as product_default_type,
        case when p.default_type = 'rent' then 'Prepaid Rent'
          when p.default_type = 'insurance' then 'Prepaid Insurance'
          when p.default_type in ('late', 'product') then 'Prepaid Fees'
          else 'Miscellaneous Deposits' 
        end as product,
        sum(case when ila.type = 'line' then ifnull(ila.amount, 0) else 0 end) as amount,
        sum(case when ila.type = 'tax' then ifnull(ila.amount, 0) else 0 end) as tax,
        sum(ifnull(ila.amount, 0)) as total
      from invoices i
        join leases l on l.id = i.lease_id
        join units u on u.id = l.unit_id
        join properties pr on u.property_id = pr.id
        join invoice_lines il on il.invoice_id = i.id
        join invoice_lines_allocation ila on ila.invoice_line_id = il.id
        join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
        join payments pm on pm.id = ipb.payment_id
        join products p on p.id = il.product_id
        join contacts c on c.id = i.contact_id
      where u.property_id in (${properties.join(',')})
        and p.default_type <> 'product'
        and ila.date<= ${date}
        and (l.end_date is null or l.end_date > ${date})
        and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
        and (i.void_date is null or i.void_date > ${date})
        and ((i.due > ${date} and p.default_type in ('rent', 'insurance', 'late', 'product')) or (convert(date_format(i.created_at,'%Y-%m-%d'),DATE) <= ${date} and p.default_type not in ('rent', 'insurance', 'late', 'product')))
        ${product_types && product_types.length ? ` and p.default_type ${inclusive ? '' : 'not'} in (${product_types.join(',')})` : ''}
      group by u.property_id, i.id, p.default_type
      having sum(ifnull(ila.amount, 0)) > 0
      order by i.lease_id, i.due
    `;

    return sql;
  },

}