//Credits and adjustments model, queries used in the following reports
//Summary report:
//MSR Summary - credits and adjustments Widget

var Enums   = require(__dirname + '/../../modules/enums.js');

module.exports = {

//** Base Query **/

  fetchAdjustmentsAndCredits(properties, start_date, end_date){
    let sql = ` select 
                  p.property_id,
                  p.sub_method as adjustment_credit,
                  sum(ipb.amount) as amount,
                  date(p.date) as date
                from payments p
                  inner join invoices_payments_breakdown ipb on ipb.payment_id = p.id and date(ipb.date) between ${start_date} and ${end_date}
                where p.credit_type = '${Enums.PAYMENT_CREDIT_TYPE.ADJUSTMENT}' and
                  p.property_id in (${properties.join(',')}) and
                  p.date between ${start_date} and ${end_date}
                group by p.id

                UNION ALL
                select
                  p.property_id,
                  p.credit_type as adjustment_credit,
                  sum(ipb.amount) as amount,
                  date(p.date)
                from payments p 
                  inner join invoices_payments_breakdown ipb on ipb.payment_id = p.id and date(ipb.date) between ${start_date} and ${end_date}
                where p.credit_type = '${Enums.PAYMENT_CREDIT_TYPE.CREDIT}' and
                  p.property_id in (${properties.join(',')}) and
                  date(p.date) between ${start_date} and ${end_date}
                group by p.id`
    return sql;
  },

  /** Summary Report **/
  summaryAdjustmentsAndCredits(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `with cte_credits_and_adjustments as(${this.fetchAdjustmentsAndCredits(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))})
                
                select cca.property_id, cca.adjustment_credit, cca.date as adjustment_date, date_format( cca.date,'%m') as adjustment_month, date_format( cca.date,'%Y') as adjustment_year, sum(cca.amount) as amount
                from cte_credits_and_adjustments cca
                where cca.date = ${connection.escape(date)}
                group by adjustment_credit, cca.property_id, adjustment_date, adjustment_month, adjustment_year
                
                union all
                select cca.property_id, cca.adjustment_credit, null as adjustment_date, date_format( cca.date,'%m') as adjustment_month, date_format( cca.date,'%Y') as adjustment_year, sum(cca.amount) as amount
                from cte_credits_and_adjustments cca
                where cca.date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
                group by adjustment_credit, cca.property_id, adjustment_month, adjustment_year
                
                union all
                select cca.property_id, cca.adjustment_credit, null as adjustment_date, null as adjustment_month, date_format( cca.date,'%Y') as adjustment_year, sum(cca.amount) as amount
                from cte_credits_and_adjustments cca
                where cca.date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
                group by adjustment_credit, cca.property_id, adjustment_year`;

    console.log('summaryAdjustmentsAndCredits:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);

  },

  /** MHR Report **/
  summaryAdjustmentsAndCreditsByMonths(connection, payload){
    let {start_date, end_date, properties} = payload;

    let sql = `with cte_credits_and_adjustments as(${this.fetchAdjustmentsAndCredits(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))})
                
                select cca.property_id,
                DATE_FORMAT(cca.date, '%M-%y') as adjustment_credit_month,
                sum(case when cca.adjustment_credit = 'move_out' then cca.amount else 0 end) as move_out,
                sum(case when cca.adjustment_credit = 'auction' then cca.amount else 0 end) as auction,
                sum(case when cca.adjustment_credit = 'transfer' then cca.amount else 0 end) as transfer,
                sum(case when cca.adjustment_credit = 'cleaning_deposit' then cca.amount else 0 end) as cleaning_deposit,
                sum(case when cca.adjustment_credit = 'credit' then cca.amount else 0 end) as credits,
                sum(case when cca.adjustment_credit = 'security_deposit' then cca.amount else 0 end) as security_deposit
                from cte_credits_and_adjustments cca
                group by cca.property_id, adjustment_credit_month
                order by cca.date desc;`

    console.log('summaryAdjustmentsAndCreditsByMonths:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);

  }

}