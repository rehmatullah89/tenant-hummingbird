var moment = require('moment');

module.exports = {

  getDiscounts(property_ids, start_date, end_date, types = []) {
    const sql = `
      SELECT
        concat(c.first,' ',c.last) as contact_name, 
        p2.name as promotion_name, 
        i.date as invoice_date,
        i.due as invoice_due_date,
        i.number as invoice_number, 
        i.property_id as invoice_property_id,
        i.void_date as invoice_void_date,
        (i.subtotal + i.total_tax - i.total_discounts) as invoice_total,
        IFNULL(SUM(dli.amount), 0) as total_discount_amount,
        u.number as unit_number,
        p2.label as promotion_type
      FROM units u 
        join leases l on u.id = l.unit_id
        join invoices i on l.id = i.lease_id
        join invoice_lines il on i.id = il.invoice_id
        join discount_line_items dli on il.id = dli.invoice_line_id
        join discounts d2 on dli.discount_id = d2.id
        join promotions p2 on d2.promotion_id = p2.id
        join properties pr on pr.id = i.property_id
        join contacts c on c.id = i.contact_id
      WHERE
        i.property_id in (${property_ids.join(', ')})
        and i.due between ${start_date} and ${end_date}
        and (i.void_date is null or i.void_date > ${end_date})
        ${types.length ? `and p2.label in (${types.join(', ')})` : ''}
      GROUP BY 
        i.id, p2.id
    `;
    
    return sql;
  },

  //Store KPI

  getDiscountByProperty(connection, properties, start_date, end_date, types = []) {
    let sql = `
      with cte_discounts as (
        ${this.getDiscounts(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date), types.map(t => connection.escape(t)))}
      )
      select cd.invoice_property_id as property_id, count(*) as invoices_count, sum(cd.total_discount_amount) as disc_amount
      from cte_discounts cd
      group by cd.invoice_property_id
    `;

    console.log("getDiscountByProperty", sql);
    
    return connection.queryAsync(sql);
  },

  // Summary
  async summarizedDiscounts(connection, date, property_ids, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_discounts as (
        ${this.getDiscounts(property_ids.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))}
      ),

      cte_summarized_discounts as (
        SELECT 
          d.invoice_property_id as property_id, 
          d.invoice_date, 
          d.invoice_due_date, 
          d.invoice_void_date, 
          SUM(IFNULL(total_discount_amount, 0)) as day_discounts 
        FROM 
          cte_discounts d
        GROUP BY 
          property_id, 
          invoice_date,
          invoice_due_date,
          invoice_void_date
      )
        
      SELECT 
        d.property_id, 
        d.invoice_due_date, 
        date_format( d.invoice_due_date,'%m') as invoice_month, 
        date_format( d.invoice_due_date,'%Y') as invoice_year,
        SUM(d.day_discounts) as discounts_ 
      FROM 
        cte_summarized_discounts d 
      WHERE
        d.invoice_due_date = ${connection.escape(date)}
      GROUP BY 
        d.property_id, 
        d.invoice_due_date, 
        date_format( d.invoice_due_date,'%m'), 
        invoice_year
        
      union all

      SELECT
        d.property_id, 
        null invoice_due_date, 
        date_format( d.invoice_due_date,'%m') as invoice_month, 
        date_format( d.invoice_due_date,'%Y') as invoice_year,
        SUM(d.day_discounts) as discounts_ 
      FROM
        cte_summarized_discounts d 
      WHERE 
        d.invoice_due_date BETWEEN ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      GROUP BY 
        d.property_id, 
        date_format( d.invoice_due_date,'%m'), 
        invoice_year
        
      union all

      SELECT 
        d.property_id, 
        null invoice_due_date, 
        null as invoice_month, 
        date_format( d.invoice_due_date,'%Y') as invoice_year,
        SUM(d.day_discounts) as discounts_ 
      FROM
        cte_summarized_discounts d 
      WHERE 
        d.invoice_due_date BETWEEN ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      GROUP BY 
        d.property_id, 
        invoice_year
    `;

    console.log('summarizedDiscounts', sql);

    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // Detailed
  detailedFindPromotionsApplied(connection, property_ids, start_date, end_date, findTotal) {
    start_date =  moment(start_date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');

    let sql = `
      with cte_discounts as (
        ${this.getDiscounts(property_ids.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      )        
      
      SELECT
        d.contact_name as name,
        d.unit_number as unit_number,
        d.invoice_number,
        d.invoice_date as date,
        d.invoice_due_date,
        d.invoice_total,
        d.total_discount_amount as amount,
        d.promotion_type,
        d.promotion_name
      FROM
        cte_discounts d
    `;

    console.log("detailedFindPromotionsApplied", sql);
    
    return connection.queryAsync(sql);
  },

  summarizedDiscountsByMonths(connection, payload) {
    let {date_range, properties} = payload;
    date_range = date_range || [];
    let property_ids = properties.map(p => connection.escape(p));

    let sql = `
      with cte_discounts as (
          ${date_range.map(d => this.getDiscounts(property_ids, connection.escape(moment(d).startOf('month').format('YYYY-MM-DD')), connection.escape(moment(d).endOf('month').format('YYYY-MM-DD')))).join(`\nUNION ALL\n`)}
      ),

      cte_summarized_discounts as (
        SELECT 
          d.invoice_property_id as property_id, 
          d.invoice_date, 
          d.invoice_due_date, 
          d.invoice_void_date, 
          SUM(IFNULL(total_discount_amount, 0)) as day_discounts 
        FROM 
          cte_discounts d
        GROUP BY 
          property_id, 
          invoice_date,
          invoice_due_date,
          invoice_void_date
      )
      SELECT 
        d.property_id, 
        DATE_FORMAT(d.invoice_due_date, '%M-%y') as discount_month,
        SUM(d.day_discounts) as discount_amount 
      FROM
        cte_summarized_discounts d 
      GROUP BY 
        d.property_id, 
        discount_month
	    ORDER BY
		  d.invoice_due_date desc;`

      console.log('summarizedDiscountsByMonths: ', sql);
      return connection.queryAsync(sql);
  }
}