//Liability Recognition model, queries used in the following reports
//Summary report:
//MSR Summary - Liability Recognition Widget

var moment  = require('moment');
var Enums   = require(__dirname + '/../../modules/enums.js');

module.exports = {

  //Summarized
  summaryLiabilityRecognition(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_recognize_lines_alloc as ( ${this.getRecognitionLineAllocations(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))} )
      
      select crla.property_id, crla.product_type, crla.date as recognition_date, date_format( crla.date,'%m') as recognition_month, date_format( crla.date,'%Y') as recognition_year, sum(crla.amount) as recognition_amount
      from cte_recognize_lines_alloc crla
      where crla.date = ${connection.escape(date)}
      group by crla.property_id, crla.product_type, recognition_date, recognition_month, recognition_year
        
      union all
      
      select crla.property_id, crla.product_type, null as recognition_date, date_format( crla.date,'%m') as recognition_month, date_format( crla.date,'%Y') as recognition_year, sum(crla.amount) as recognition_amount
      from cte_recognize_lines_alloc crla
      where crla.date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      group by crla.property_id, crla.product_type, recognition_month, recognition_year
      
      union all
      
      select crla.property_id, crla.product_type, null as recognition_date, null as recognition_month, date_format( crla.date,'%Y') as recognition_year, sum(crla.amount) as recognition_amount
      from cte_recognize_lines_alloc crla
      where crla.date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      group by crla.property_id, crla.product_type, recognition_year
    `;

    // 219ms
    console.log('summaryProductRevenueRecognition:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  //Detailed

  // Snippet
  getRecognitionLineAllocations(properties, start_date, end_date){
    let {
      PRODUCT_DEFAULT_TYPES: pdt,
      PRODUCT_TYPES: pt
    } = Enums;

    let sql = `
      select ila.invoice_id, ila.amount, ila.type as line_type, i.due as date, i.void_date, i.property_id, pr.default_type as product_default_type,
        CASE
          WHEN ila.type = 'tax' THEN 'tax'
          WHEN pr.default_type = '${pdt.RENT}' THEN '${pt.RENT}'
          WHEN pr.default_type = '${pdt.MERCHANDISE}' THEN '${pt.MERCHANDISE}'
          WHEN pr.default_type = '${pdt.FEE}' THEN '${pt.FEE}'
          WHEN pr.default_type = '${pdt.INSURANCE}' THEN '${pt.INSURANCE}'
          WHEN pr.default_type = '${pdt.SECURITY_DEPOSIT}' or pr.default_type = '${pdt.CLEANING_DEPOSIT}' THEN '${pt.DEPOSIT}'
          ELSE 'others'
        END as product_type
      from invoice_lines_allocation ila
        inner join invoices i on i.id = ila.invoice_id
        inner join invoice_lines il on il.id = ila.invoice_line_id
        inner join products pr on pr.id = il.product_id
        inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
        join payments p on p.id = ipb.payment_id
      where i.due between ${start_date} and ${end_date}
        and i.property_id in (${properties.join(',')})
        and ipb.date < i.due
        and (i.void_date is null or i.void_date >= i.due)
        and p.method not in ('loss')
    `;

    return sql;
  },

  // MHR
  summaryLiabilityRecognitionByMonths(connection, payload) {
    let {start_date, end_date, properties} = payload;

    let sql = `
      with cte_recognize_lines_alloc as ( ${this.getRecognitionLineAllocations(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))} )
      
      select crla.property_id, DATE_FORMAT(crla.date, '%M-%y') as recognition_month,
        sum(case when crla.product_type = 'tax' then crla.amount else 0 end) as tax,
        sum(case when crla.product_type = 'rent' then crla.amount else 0 end) as rent,
        sum(case when crla.product_type = 'insurance' then crla.amount else 0 end) as insurance,
        sum(case when crla.product_type = 'fee' then crla.amount else 0 end) as fee,
        sum(case when crla.product_type = 'merchandise' then crla.amount else 0 end) as merchandise,
        sum(case when crla.product_type = 'deposit' then crla.amount else 0 end) as deposits
      
      from cte_recognize_lines_alloc crla
      group by crla.property_id, recognition_month
      order by crla.date desc;
    `;

    console.log('summaryLiabilityRecognitionByMonths:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  }
}
