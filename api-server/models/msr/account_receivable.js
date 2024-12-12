//Account Receivable model, queries used in the following reports
//Summary report:
//MSR Summary - Account Receivable Widget

var moment                = require('moment');
var Enums                 = require(__dirname + '/../../modules/enums.js');
var LiabilityRecognition  = require('./liability_recognition.js');
var ProjectedIncome       = require('./projected_income.js');

module.exports = {

  //Summarized

  summaryAccountReceivable(connection, date, properties, active_leases = false){
    let sql = `
      with cte_open_invoices as ( ${this.getOpenInvoices(properties.map(p => connection.escape(p)), connection.escape(date), active_leases)} )
      
      select coi.property_id, @date as date, sum(coi.inv_total_payable - coi.total_paid) as account_receivable
      from cte_open_invoices coi
      group by coi.property_id
    `;

    console.log('summaryAccountReceivable: ', sql);

    return connection.queryAsync(sql).then(r => r.length ? r[0] : {});
  },

  summaryAccountReceivableBreakdown(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_AR_entries as (
        -- Get Due and Voided Invoices
        ${ProjectedIncome.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))}
      
        UNION ALL
      
        -- Get Payments applied
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${this.getARPayments(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))}
        ) a
          
        UNION ALL
      
        -- Get Liability recognitions
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${LiabilityRecognition.getRecognitionLineAllocations(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))}
        ) a
      )
      
      select cae.property_id, cae.product_type, cae.date as receivable_date, date_format( cae.date,'%m') as receivable_month, date_format( cae.date,'%Y') as receivable_year, sum(cae.amount) as receivable_amount
      from cte_AR_entries cae
      where cae.date = ${connection.escape(date)}
      group by cae.property_id, cae.product_type, receivable_date, receivable_month, receivable_year
      
      union all
      
      select cae.property_id, cae.product_type, null as receivable_date, date_format( cae.date,'%m') as receivable_month, date_format( cae.date,'%Y') as receivable_year, sum(cae.amount) as receivable_amount
      from cte_AR_entries cae
      where cae.date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      group by cae.property_id, cae.product_type, receivable_month, receivable_year
      
      union all
      
      select cae.property_id, cae.product_type, null as receivable_date, null as receivable_month, date_format( cae.date,'%Y') as receivable_year, sum(cae.amount) as receivable_amount
      from cte_AR_entries cae
      where cae.date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      group by cae.property_id, cae.product_type, receivable_year
    `;

    // 219ms
    console.log('summaryAccountReceivable:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  //Store KPI
  getAccountReceivableByProperty(connection, properties, start_date, end_date) {
    let sql = `
      with cte_AR_entries as (
        -- Get Due and Voided Invoices
        ${ProjectedIncome.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      
        UNION ALL
      
        -- Get Payments applied
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${this.getARPayments(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
        ) a
          
        UNION ALL
      
        -- Get Liability recognitions
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${LiabilityRecognition.getRecognitionLineAllocations(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
        ) a
      )

      select cae.property_id, sum(cae.amount) as receivable_amount
      from cte_AR_entries cae
      where cae.date between ${connection.escape(start_date)} and ${connection.escape(end_date)}
      group by cae.property_id
    `;

    // 219ms
    console.log('getAccountReceivableByProperty:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  //Detailed

  // Snippet

  getOpenInvoices(properties, date, active_leases = false){
    let sql = `
      select i.id, i.property_id, i.due, i.status, i.void_date, (i.subtotal + i.total_tax - i.total_discounts) as inv_total_payable, sum(ipb.amount) as total_paid
      from invoices i
        join invoices_payments_breakdown ipb on ipb.invoice_id = i.id
        ${ active_leases ? `join leases l on l.id = i.lease_id` : ''}
      where i.property_id in (${properties.join(',')})
        and i.due <= ${date}
        and (i.void_date is null or i.void_date > ${date})
        and ipb.date <= ${date}
        ${ active_leases ? `and (l.end_date is null or l.end_date > ${date})` : ''}
      group by i.id
      having inv_total_payable > total_paid
    `;
    
    return sql;

  },

  getARPayments(properties, start_date, end_date){
    let {
      PRODUCT_DEFAULT_TYPES: pdt,
      PRODUCT_TYPES: pt
    } = Enums;

    let sql = `
      select ila.invoice_id, ila.amount, ila.type as line_type, ipb.date as date, i.void_date, i.property_id, pr.default_type as product_default_type,
        CASE
          WHEN ila.type = 'tax' THEN 'tax'
          WHEN pr.default_type = '${pdt.RENT}' THEN '${pt.RENT}'
          WHEN pr.default_type = '${pdt.MERCHANDISE}' THEN '${pt.MERCHANDISE}'
          WHEN pr.default_type = '${pdt.FEE}' THEN '${pt.FEE}'
          WHEN pr.default_type = '${pdt.INSURANCE}' THEN '${pt.INSURANCE}'
          WHEN pr.default_type = '${pdt.SECURITY_DEPOSIT}' or pr.default_type = '${pdt.CLEANING_DEPOSIT}' THEN '${pt.DEPOSIT}'
          WHEN pr.default_type = '${pdt.AUCTION}' THEN '${pt.AUCTION}'
          ELSE 'others'
        END as product_type
      from invoice_lines_allocation ila
        inner join invoices i on i.id = ila.invoice_id
        inner join invoice_lines il on il.id = ila.invoice_line_id
        inner join products pr on pr.id = il.product_id
        inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      where ipb.date between ${start_date} and ${end_date}
          and i.property_id in (${properties.join(',')})
          and ipb.date >= i.due
    `;
    return sql;
  },

  //MHR
  summaryAccountReceivableBreakdownByMonths(connection, payload) {
    let {start_date, end_date, properties} = payload;

    let sql = `
      with cte_AR_entries as (
        -- Get Due and Voided Invoices
        ${ProjectedIncome.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))}
      
        UNION ALL
      
        -- Get Payments applied
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${this.getARPayments(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))}
        ) a
          
        UNION ALL
      
        -- Get Liability recognitions
        select invoice_id, (-1 * amount) as amount, line_type, date, void_date, property_id, product_default_type, product_type from (
          ${LiabilityRecognition.getRecognitionLineAllocations(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))}
        ) a
      )
      
      select cae.property_id, DATE_FORMAT(cae.date, '%M-%y') as receivable_month, 
        ABS(sum(case when cae.product_type = 'tax' then cae.amount else 0 end)) as tax,
        ABS(sum(case when cae.product_type = 'rent' then cae.amount else 0 end)) as rent,
        ABS(sum(case when cae.product_type = 'insurance' then cae.amount else 0 end)) as insurance,
        ABS(sum(case when cae.product_type = 'fee' then cae.amount else 0 end)) as fee,
        ABS(sum(case when cae.product_type = 'merchandise' then cae.amount else 0 end)) as merchandise,
        ABS(sum(case when cae.product_type = 'deposit' then cae.amount else 0 end)) as deposits,
        ABS(sum(case when cae.product_type = 'auction' then cae.amount else 0 end)) as auction  
      from cte_AR_entries cae
      group by cae.property_id, receivable_month
      order by cae.date desc;
    `;

    console.log('summaryAccountReceivableBreakdownByMonths:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

}
