var moment= require('moment');
var Occupancy  = require('./../occupancy.js')

module.exports = {

  // Summarized
  async summaryInsurance(connection, date, property_ids) {
    let sql = `
      with cte_insurance as (
        ${this.getInsurances(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', ') )}
      ),
      
      cte_summary_insurance as (
        SELECT 
          count(1) as day_insurance, 
          property_id, 
          service_start_date, 
          ifnull(service_end_date, lease_end_date) as end_date
        FROM 
          cte_insurance 
        GROUP BY 
          property_id, service_start_date, end_date
      )

      SELECT 
        i.property_id, 
        sum(i.day_insurance) as insurance_ 
      FROM 
        cte_summary_insurance i
      GROUP BY 
        i.property_id
    `;

    console.log('Insurance summary ', sql);    

    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  async summaryInsuranceByMonths(connection, payload) {
    let { dates, property_ids } = payload;
    let sql = `
      with cte_insurance as (
        ${this.getInsurances(dates.map(date => connection.escape(date)), property_ids.map(p => connection.escape(p)).join(', '))}
      ),

      cte_summary_insurance as (
        SELECT
          count(1) as day_insurance,
          property_id,
          service_start_date,
          ifnull(service_end_date, lease_end_date) as end_date,
          date
        FROM
          cte_insurance
        GROUP BY
          property_id, service_start_date, end_date, date
      )

      SELECT
        property_id,
        DATE_FORMAT(date, '%M-%y') as month,
        sum(day_insurance) as insurance_count
      FROM
        cte_summary_insurance
      GROUP BY
        property_id,
        DATE_FORMAT(date, '%M-%y')
    `;

    console.log('summaryInsuranceByMonths query: ', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  // Detailed
  detailFindInsuranceEnrolled(connection, company_id, property_ids, date) {
    date =  moment(date).format('YYYY-MM-DD');

    let sql = `
      with cte_insurance as (
        ${this.getInsurances(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', ') )}
      )

      SELECT 
        contact_name as name,
        coverage_amount,
        paid_through_date,
        premium,
        service_start_date as start_date,
        unit_number
      FROM
        cte_insurance
    `;

    console.log("Detail find insurance ", sql);

    return connection.queryAsync(sql);
  },

  detailFindInsuranceNotEnrolled(connection, company_id, property_ids, date) {
    date =  moment(date).format('YYYY-MM-DD');

    let sql = `
      with cte_insurance as (
        ${this.getInsurances(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', ') )}
      )

      select
        l.tenant_name as name,
        l.number as unit_number
      from ( ${Occupancy.getOccupiedUnits(date, property_ids)} ) l
      where l.lease_id not in ( select ci.lease_id from cte_insurance ci )
    `;

    console.log("Detail find insurance not enrolled ", sql);

    return connection.queryAsync(sql);
  },

  //Snippet
  getInsurances(dates, property_ids) {
    dates = Array.isArray(dates)? dates: [dates]
    const sql = `
      SELECT 
        CAST(i.coverage AS DECIMAL(10, 2)) as coverage_amount, 
        i.premium_value as premium, 
        l.id as lease_id,
        l.end_date as lease_end_date, 
        s.end_date as service_end_date,
        s.start_date as service_start_date,
        u.property_id as property_id, 
        u.number as unit_number, 
        concat(c.first,' ',c.last) as contact_name, 
        max(il.end_date) as paid_through_date,
        t.date as date
      FROM units u 
        join leases l on l.unit_id = u.id 
        join services s on s.lease_id = l.id 
        join contact_leases cl on l.id = cl.lease_id 
        join contacts c on cl.contact_id = c.id
        join products p on p.id = s.product_id and p.default_type = 'insurance' and s.status = 1
        join insurance i on p.id = i.product_id join invoices iv on l.id = iv.lease_id
        join invoice_lines il on iv.id = il.invoice_id
        join (${dates.map(date => `SELECT ${date} as date`).join(' UNION ALL ')}) t
          on t.date between s.start_date and ifnull(s.end_date,ifnull(l.end_date , t.date))
      WHERE l.status = 1 and u.property_id in (${property_ids}) 
      GROUP BY 
        l.id, p.id, t.date`;

    return sql;
  },

}