    //Projected Income model, queries used in the following reports
    //Summary report:
    //MSR SUmmary - Leads widget
    //Detail report:
    //MSR Detail - Lead Activity Report


module.exports = {

  /*<--- MSR --->*/

  async summaryLeads(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      WITH cte_leads as (
        ${this.findLeads(properties, connection.escape(first_day_of_year), connection.escape(date))}
      )

      SELECT l.property_id, l.category_source as lead_source, l.lead_date as lead_date, date_format(l.lead_date,'%m') as lead_month, date_format( l.lead_date,'%Y') as lead_year,
        count(l.contact_id) as day_leads
      FROM cte_leads l
      WHERE l.property_id in (${properties.join(', ')})
        and l.lead_date = '${date}'
      GROUP BY l.property_id, lead_source, lead_date, lead_month, lead_year

      UNION ALL

      SELECT l.property_id, l.category_source as lead_source, null as lead_date, date_format( l.lead_date,'%m') as lead_month, date_format( l.lead_date,'%Y') as lead_year,
        count(l.contact_id) as day_leads
      FROM cte_leads l
      WHERE l.property_id in (${properties.join(', ')})
        and l.lead_date between '${first_day_of_month}' and '${date}'
      GROUP BY l.property_id, lead_source, lead_month, lead_year

      UNION ALL

      SELECT l.property_id, l.category_source as lead_source, null as lead_date, null as lead_month, date_format( l.lead_date,'%Y') as lead_year,
        count(l.contact_id) as day_leads
      FROM cte_leads l
      WHERE l.property_id in (${properties.join(', ')})
        and l.lead_date between '${first_day_of_year}' and '${date}'
      GROUP BY l.property_id, lead_source, lead_year
    `;

    // 182ms
    console.log('Summary Leads Query: ', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async summaryLeadsByMonths(connection, payload) {
    let { start_date, end_date, property_ids } = payload;
    let sql = `
      with cte_leads as (
        ${this.findLeads(property_ids.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      )

      SELECT
        property_id,
        category_source as source,
        DATE_FORMAT(lead_date, '%M-%y') as month,
        count(contact_id) as leads_count
      FROM
        cte_leads
      GROUP BY
        property_id,
        category_source,
        DATE_FORMAT(lead_date, '%M-%y')
    `;
    console.log('summaryLeadsByMonths query: ', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  /*<--- MSR --->*/

  async leadsConverted(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with mvw_converted_leads_ms as (
        ${this.findConvertedLeads(properties, connection.escape(first_day_of_year), connection.escape(date))}
      )

      select cl.property_id, cl.lead_start_date as lead_date, date_format( cl.lead_start_date,'%m') as lead_month, date_format(cl.lead_start_date,'%Y') as lead_year,
        count(cl.contact_id) as day_converted_leads
      from mvw_converted_leads_ms cl
      where cl.property_id in (${properties.join(', ')})
        and cl.lead_start_date = '${date}'
      group by cl.property_id, lead_date, lead_month, lead_year

      union all

      select cl.property_id, null as lead_date, date_format( cl.lead_start_date,'%m') as lead_month, date_format( cl.lead_start_date,'%Y') as lead_year,
        count(cl.contact_id) as day_converted_leads
      from mvw_converted_leads_ms cl
      where cl.property_id in (${properties.join(', ')})
        and cl.lead_start_date between '${first_day_of_month}' and '${date}'
      group by cl.property_id, lead_month, lead_year

      union all

      select cl.property_id, null as lead_date, null as lead_month, date_format(cl.lead_start_date,'%Y') as lead_year,
        count(cl.contact_id) as day_converted_leads
      from mvw_converted_leads_ms cl
      where cl.property_id in (${properties.join(', ')})
        and cl.lead_start_date between '${first_day_of_year}' and '${date}'
      group by cl.property_id, lead_year
    `;
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async leadsConvertedByMonths(connection, payload) {
    let { start_date, end_date, property_ids } = payload;
    let sql = `
      with cte_converted_leads as (
        ${this.findConvertedLeads(property_ids.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      )
      SELECT
        property_id,
        DATE_FORMAT(lead_start_date, '%M-%y') as month,
        count(contact_id) as leads_count
      FROM
        cte_converted_leads
      GROUP BY
        property_id,
        DATE_FORMAT(lead_start_date, '%M-%y')
    `;
    console.log('leadsConvertedByMonths query: ', sql);
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  summaryLeadsByProperty(connection, start_date, end_date, properties){

    let sql = `
      WITH cte_leads as (
        ${this.findLeads(properties, connection.escape(start_date), connection.escape(end_date))}
      )

      select cl.property_id, cl.lead_date, count(*) as lead_count
      from cte_leads cl
      group by cl.property_id
    `;

    console.log("summaryLeadsByProperty SQL", sql);
    return connection.queryAsync(sql);
  },


  /*<--- Detailed Leads--->*/

  detailFindLeads(connection, property_id, start_date, end_date, source){

    let sql = `
      WITH cte_leads as (
        ${this.findLeads([property_id], connection.escape(start_date), connection.escape(end_date),  source ? connection.escape(source) : undefined)}
      )

      SELECT l.name, l.phone, l.email, l.unit_number, l.source, l.category_source, l.lead_date as created, l.move_in_date, l.status
      FROM cte_leads as l `

    console.log("detailFindLeads SQL", sql);
    return connection.queryAsync(sql);
  },

  /*<--- Detailed Converted Leads--->*/

  findTotalConvertedLeads(connection, property_id, start_date, end_date){
    let sql = `
      select * from (
        ${this.findConvertedLeads([property_id], connection.escape(start_date), connection.escape(end_date))}
      ) cl
    `;

    console.log("findConvertedLeads SQL", sql);

    return connection.queryAsync(sql);
  },

  //Snippet
  findLeads(properties, start_date, end_date, source) {

    let sql = `
      SELECT ld.property_id, c.id as contact_id, concat(c.first,' ',c.last) as name, cp.phone, c.email, u.number as unit_number,
        ld.move_in_date, ld.status, ld.source,
        CASE
          when ld.source in ('XPS Solutions','XPS Application','XPS','SMS','Sign call','Phone Call','DR / Phone','DR','CallPotential Application','CallCenter','Call Potenial','Call in','Call', 'Call Center') then 'Phone Leads'
          when ld.source in ('Walk-In - AE','Walk-In','Walk In','store','Referral','In-store','Facility','Drive-by','Drive By') then 'Walk-In Leads'
          when ld.source in ('Website Application', 'Website API Access', 'Website','Tenant Website V2', 'Tenant Website', 'Tenant V2 Website','Tenant V2', 'Storelocal Website Application', 'Storelocal Website','StoreLocal', 'Store Local', 'StoragePug Website Reservation','StoragePug Website Lead','Sparefoot','sparefoot','Social Media','pms lead','Online Search','Nectar','Mariposa Website','JAC Website','Internet','Google Search','Google','Email','Company Website', 'Storagefront', 'Storelocal') then 'Web Leads'
          else 'Others'
        end as category_source,
        date(CONVERT_TZ(ld.created, '+00:00', p.utc_offset)) as lead_date
      FROM leads ld
        join contacts c on ld.contact_id = c.id
        join properties p on p.id = ld.property_id
        left join contact_phones cp on c.id = cp.contact_id and cp.primary = 1
        left join units u on u.id = ld.unit_id
      WHERE  ld.property_id in (${properties.join(', ')})
        and ld.status <> ''
        and date((CONVERT_TZ(ld.created, '+00:00', p.utc_offset))) between ${start_date} and ${end_date}`

    if(source) {
      sql += `having category_source = ${source} `
    }

    return sql;
  },

  findConvertedLeads(properties, start_date, end_date) {

    let sql = `
      select l.id as lease_id, u.property_id, cl.contact_id, l.start_date as lead_start_date
      from contact_leases cl
        join leases l on l.id = cl.lease_id
        join units u on u.id = l.unit_id
      where cl.primary = 1
        and l.status = 1
        and u.property_id in (${properties.join(', ')})
        and l.start_date between ${start_date} and ${end_date}
      group by l.id
    `;

    return sql;
  }
}
