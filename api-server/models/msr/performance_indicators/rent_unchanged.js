var RentChange  = require('./../rent_change.js')

module.exports = {
  async summarizedRentUnchanged(connection, date, properties) {
    let sql = `
      with cte_rent_not_change_leases as (${RentChange.getRentUnChangeLeases(date, properties)})

      select cnl.property_id , date_format('${date}','%Y-%m-%d') as report_date, count(*) as rentunchanged_
      from cte_rent_not_change_leases cnl
      group by cnl.property_id
    `;

    console.log('summarizedRentChange query:', sql);
    // 108ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async summaryRentUnchangedMyMonths(connection, payload) {
    let { dates, property_ids } = payload;
    let sql = `
      with cte_rent_not_change_leases as (${RentChange.getRentUnChangeLeases(dates, property_ids)})

      SELECT
        property_id,
        DATE_FORMAT(date, '%M-%y') as month,
        count(*) as rent_unchanged_count
      FROM
        cte_rent_not_change_leases
      GROUP BY
        property_id,
        DATE_FORMAT(date, '%M-%y')
    `;

    console.log('summaryRentUnchangedMyMonths query:', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  }
}