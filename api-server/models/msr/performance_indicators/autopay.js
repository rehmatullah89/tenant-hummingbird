var moment = require('moment');
var Occupancy  = require('./../occupancy.js')

module.exports = {

  // Summarized
  async summaryAutoPay(connection, date, property_ids) {
    let sql = `
      with cte_auto_pay as (
        ${this.getAutoPays(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', '))}
      ), 
      
      cte_summary_auto_pay as (
        SELECT 
          property_id, 
          date(CONVERT_TZ (lease_pm_created_at, '+00:00',property_utc_offset)) as start_date, 
          date(ifnull(CONVERT_TZ(lease_pm_deleted_at, '+00:00', property_utc_offset),lease_end_date)) as end_date, 
          count(1) as day_autopay
        FROM 
          cte_auto_pay
        GROUP BY 
          property_id, 
          date(CONVERT_TZ (lease_pm_created_at, '+00:00',property_utc_offset)), 
          date(ifnull(CONVERT_TZ(lease_pm_deleted_at,'+00:00',property_utc_offset), lease_end_date))
      )
      
      SELECT 
        a.property_id, 
        sum(a.day_autopay) as autopay_
      FROM 
        cte_summary_auto_pay a 
      GROUP BY 
        a.property_id
    `;

    console.log('Summary Autopay: ', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  async summaryAutopayByMonths(connection, payload) {
    let { dates, property_ids } = payload;
    let sql = `
      with cte_auto_pay as (
        ${this.getAutoPays(dates.map(date => connection.escape(date)), property_ids.map(p => connection.escape(p)).join(', '))}
      ),

      cte_summary_auto_pay as (
        SELECT
          property_id,
          date(CONVERT_TZ (lease_pm_created_at, '+00:00',property_utc_offset)) as start_date,
          date(ifnull(CONVERT_TZ(lease_pm_deleted_at, '+00:00', property_utc_offset),lease_end_date)) as end_date,
          count(1) as day_autopay,
          date
        FROM
          cte_auto_pay
        GROUP BY
          property_id,
          date(CONVERT_TZ (lease_pm_created_at, '+00:00',property_utc_offset)),
          date(ifnull(CONVERT_TZ(lease_pm_deleted_at,'+00:00',property_utc_offset), lease_end_date)),
          date
      )

      SELECT
        property_id,
        DATE_FORMAT(date, '%M-%y') as month,
        sum(day_autopay) as autopay_count
      FROM
        cte_summary_auto_pay
      GROUP BY
        property_id,
        DATE_FORMAT(date, '%M-%y')
    `;

    console.log('summaryAutopayByMonths query: ', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  // Detailed
  detailedFindAutopayEnrolled(connection, company_id, property_ids, date) {
    date = moment(date).format('YYYY-MM-DD');

    let sql = `
      with cte_auto_pay as (
        ${this.getAutoPays(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', '))}
      ) 

      SELECT         
        contact_name as name,
        card_type,         
        card_end,         
        exp_warning,         
        unit_number as space_number       
      FROM
        cte_auto_pay
    `;

    console.log('Detailed Autopay enrolled: ', sql);

    return connection.queryAsync(sql);
  },

  detailedFindAutopayNotEnrolled(connection, company_id, property_ids, date) {
    date = moment(date).format('YYYY-MM-DD');

    let sql = `
      with cte_auto_pay as (
        ${this.getAutoPays(connection.escape(date), property_ids.map(p => connection.escape(p)).join(', '))}
      )

      select
        u.tenant_name as name,
        u.number as space_number
      from ( ${Occupancy.getOccupiedUnits(date, property_ids)} ) u
      where u.unit_id not in ( select cap.unit_id from cte_auto_pay cap )
    `;

    console.log('Detailed Autopay not enrolled: ', sql);

    return connection.queryAsync(sql);
  },

  //Snippet
  getAutoPays(dates, property_ids) {
    dates = Array.isArray(dates)? dates: [dates]
    console.log("Properties IDs: ", property_ids);
    const sql = `  
      SELECT
        l.id as lease_id,
        l.end_date as lease_end_date,
        lpm.id as lease_payment_method_id,
        lpm.created_at as lease_pm_created_at,
        lpm.deleted as lease_pm_deleted_at,
        p.utc_offset as property_utc_offset,
        pm.card_end, 
        pm.card_type, 
        pm.exp_warning,
        u.id as unit_id,
        u.number as unit_number,
        u.property_id as property_id,
        concat(c.first,' ',c.last) as contact_name,
        t.date as date
      FROM units u
        join leases l on l.unit_id = u.id
        join leases_payment_methods lpm on lpm.lease_id = l.id
        join payment_methods pm on pm.id = lpm.payment_method_id
        join contacts c on c.id = pm.contact_id
        join properties p on p.id = u.property_id
        join (${dates.map(date => `SELECT ${date} as date`).join(' UNION ALL ')}) t
          on t.date between DATE(CONVERT_TZ(lpm.created_at , "+00:00", p.utc_offset))
            and ifnull(DATE(CONVERT_TZ(lpm.deleted , "+00:00", p.utc_offset)), ifnull(l.end_date, t.date))
      WHERE 
        l.status = 1
        and u.property_id in (${property_ids})
    `;

    return sql;
  }
}