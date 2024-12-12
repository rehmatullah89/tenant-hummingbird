//Projected Income model, queries used in the following reports
//Summary report:
//MSR SUmmary - Projected Income widget
//Detail report:
//MSR Detail - Net Revenue and Projected Income Report

var Enums = require(__dirname + '/../../modules/enums.js');

module.exports = {

  //Summarized
  summaryProductRevenue(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_invoice_lines as ( ${this.getInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))} ),
      mvw_invoices_details_ms as (
        select cil.property_id, cil.invoice_date, cil.product, sum(cil.amount) as revenue_amount, sum(cil.tax_amount) as tax_amount
        from cte_invoice_lines cil
        group by cil.property_id, cil.product, cil.invoice_date
      )
      
      select ih.property_id, ih.product, ih.invoice_date as revenue_date, date_format( ih.invoice_date,'%m') as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.invoice_date = ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_date, revenue_month, revenue_year

      union all
      
      select ih.property_id, ih.product, null as revenue_date, date_format( ih.invoice_date,'%m') as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.invoice_date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_month, revenue_year
      
      union all
            
      select ih.property_id, ih.product, null as revenue_date, null as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.invoice_date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_year
    `;

    console.log('summaryProductRevenue:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  summaryProductRevenueAccrual(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_invoice_lines as ( ${this.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(first_day_of_year), connection.escape(date))} ),
      mvw_invoices_details_ms as (
        select cil.property_id, cil.date, cil.product_type as product, sum(cil.amount) as revenue_amount
        from cte_invoice_lines cil
        group by cil.property_id, cil.product_type, cil.date
      )
      
      select ih.property_id, ih.product, ih.date as revenue_date, date_format( ih.date,'%m') as revenue_month, date_format( ih.date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.date = ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_date, revenue_month, revenue_year

      union all
      
      select ih.property_id, ih.product, null as revenue_date, date_format( ih.date,'%m') as revenue_month, date_format( ih.date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_month, revenue_year
      
      union all
            
      select ih.property_id, ih.product, null as revenue_date, null as revenue_month, date_format( ih.date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
      from mvw_invoices_details_ms ih
      where ih.date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
      group by ih.property_id, ih.product, revenue_year
    `;

    console.log('summaryProductRevenueAccrual:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  //Store KPI
  getProductRevByProperty(connection, properties, start_date, end_date) {
    let sql = `
      with cte_invoice_lines as ( ${this.getInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
      select cil.property_id,
        sum(case when cil.product = 'rent' then cil.amount else 0 end) as rent_amount,
        sum(case when cil.product = 'insurance' then cil.amount else 0 end) as insurance_amount,
        sum(case when cil.product = 'fee' then cil.amount else 0 end) as fee_amount,
        sum(case when cil.product = 'merchandise' then cil.amount else 0 end) as merchandise_amount,
        sum(case when cil.product = 'others' then cil.amount else 0 end) as other_amount
      from cte_invoice_lines cil
      group by cil.property_id
    `;

    console.log('getProductRevByProperty:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r : []);
  },

  //Detailed
  detailProductRevenue(connection, property_id, start_date, end_date, product_type) {
    let sql = this.getInvoiceLines([connection.escape(property_id)], connection.escape(start_date), connection.escape(end_date), connection.escape(product_type));

    console.log('detailProductRevenue:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  detailRevenueByInvoices(connection, property_id, start_date, end_date) {
    let sql = `
      with cte_invoice_lines as ( ${this.getInvoiceLines([connection.escape(property_id)], connection.escape(start_date), connection.escape(end_date))} ),
      mvw_invoices_details_ms as (
        select cil.property_id, cil.date, cil.product_type as product, sum(cil.amount) as revenue_amount
        from cte_invoice_lines cil
        group by cil.property_id, cil.product_type, cil.date
      )
      
      select cil.invoice_id, cil.product, cil.name as tenant_name, cil.unit_number, cil.invoice_number, cil.invoice_created_at as invoice_date, cil.invoice_date as invoice_due,
        sum(cil.subtotal + cil.tax_amount - cil.discount_amount) as invoice_total, sum(cil.tax_amount) as total_tax, sum(cil.discount_amount) as total_discount,
        (sum(Case When cil.product = 'rent' Then cil.subtotal Else 0 End)) as rent,
        (sum(Case When cil.product = 'insurance' Then cil.subtotal Else 0 End)) as insurance,
        (sum(Case When cil.product = 'merchandise' Then cil.subtotal Else 0 End)) as merchandise,
        (sum(Case When cil.product = 'fee' Then cil.subtotal Else 0 End)) as fees
      from cte_invoice_lines cil
      group by cil.invoice_id
    `;

    console.log('detailRevenueByInvoices:', sql);
    return connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // FSR 
  getCharges(connection,properties, start_date, end_date){
    let sql = `
      with cte_invoice_lines as ( ${this.getInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
      
      select product_id,
        case  default_type
          when "rent" then concat(upper(substring(unit_type, 1, 1)), lower(substring(unit_type, 2)), ' ',product_name)
          else product_name
        end
        as "product_name", 
        case default_type
            when "rent" then concat(upper(substring(unit_type, 1, 1)), lower(substring(unit_type, 2)), ' Rent')
			      when "insurance" then "Coverage"
            when "late" then "Fees"
            when "product" then "Merchandise"
          else "Other"
        end  
        as "product_type",
        income_account_id,
        case product_slug
            when "rent" then concat(unit_type,'_',product_slug)
                  else product_slug
		        end
        as "product_slug",
        sum(discount_amount) * -1 as "discount" , sum(subtotal) as "charge" ,
        sum(tax_amount) as "tax_charge",
        (sum(amount)+sum(tax_amount)) as "total_charge"
        from cte_invoice_lines     
        group by product_id
        
      
    `;

    console.log('getChargesQuery:', sql);
    return sql;

  },

  // Snippet
  getInvoiceLines(properties, start_date, end_date, product_type){
    let sql = `
      select i.property_id, concat(c.first,' ',c.last) as name, i.id as invoice_id, i.date as invoice_created_at, i.due as invoice_date, i.number as invoice_number, u.number as unit_number, p.name as product_name,
        (ifnull(il.qty, 0) * ifnull(il.cost, 0)) as subtotal, ifnull(il.total_tax, 0) as tax_amount, ifnull(il.total_discounts, 0) as discount_amount,
        (ifnull(il.qty, 0) * ifnull(il.cost, 0)) - ifnull(il.total_discounts, 0) as amount, p.default_type as default_type,
        case when p.default_type = 'rent' then 'rent'
          when p.default_type = 'insurance' then 'insurance'
          when p.default_type = 'late' then 'fee'
          when p.default_type = 'product' then 'merchandise'
          else 'others'
        end as product
        ,u.type as unit_type,p.id as product_id,
        ifnull(ppr.income_account_id,p.income_account_id) as income_account_id,
        ifnull(p.slug,p.default_type) as product_slug
      from invoices i
        join invoice_lines il on il.invoice_id = i.id
        join products p on p.id = il.product_id
        left join contacts c on c.id = i.contact_id
        left join leases l on l.id = i.lease_id  
        left join units u on u.id = l .unit_id
        left join property_products ppr on ppr.product_id = p.id and ppr.property_id = i.property_id 
      where p.default_type not in ('auction', 'security', 'cleaning')
        and i.property_id in (${properties.join(',')})
        and (i.void_date is null or i.void_date > ${end_date})
        and i.due between ${start_date} and ${end_date}
    `;

    if(product_type){
      sql += ` and p.default_type = ${product_type}`;
    }

    sql += ` order by i.due`;

    return sql;
  },

  getAccrualInvoiceLines(properties, start_date, end_date){
    let {
      PRODUCT_DEFAULT_TYPES: pdt,
      PRODUCT_TYPES: pt
    } = Enums;

    let sql = `
      with cte_AR_invoices as (
        select *, 'invoice' as sign, due as base_date from invoices
        where due between ${start_date} and ${end_date}
          and (void_date is null or void_date >= due)
          and property_id in (${properties.join(',')})
        UNION ALL
        select *, 'void' as sign, void_date as base_date from invoices
        where void_date is not null
          and void_date between ${start_date} and ${end_date}
          and void_date >= due
          and property_id in (${properties.join(',')})
      ),
      cte_invoices_lines as (
        select il.id, i.id as invoice_id, i.sign as sign, (if(i.sign = 'void', -1, 1) * round(((il.qty * il.cost) - il.total_discounts), 2)) as amount, 'line' as line_type, i.base_date as date, i.void_date, i.property_id, pr.default_type as product_default_type,
          CASE
            WHEN pr.default_type = '${pdt.RENT}' THEN '${pt.RENT}'
            WHEN pr.default_type = '${pdt.MERCHANDISE}' THEN '${pt.MERCHANDISE}'
            WHEN pr.default_type = '${pdt.FEE}' THEN '${pt.FEE}'
            WHEN pr.default_type = '${pdt.INSURANCE}' THEN '${pt.INSURANCE}'
            WHEN pr.default_type = '${pdt.SECURITY_DEPOSIT}' or pr.default_type = '${pdt.CLEANING_DEPOSIT}' THEN '${pt.DEPOSIT}'
            WHEN pr.default_type = '${pdt.AUCTION}' THEN '${pt.AUCTION}'
            ELSE 'others'
          END as product_type
        from invoice_lines il
          inner join cte_AR_invoices i on i.id = il.invoice_id
          inner join products pr on pr.id = il.product_id
      ),
      cte_lines_tax as (
        select cil.id, cil.invoice_id, cil.sign, (if(cil.sign = 'void', -1, 1) * round(il.total_tax, 2)) as amount, 'tax' as line_type, cil.date, cil.void_date, cil.property_id, cil.product_default_type,
          'tax' as product_type
        from cte_invoices_lines cil
          inner join invoice_lines il on il.id = cil.id
        where il.total_tax > 0
      )
      
      select cil.invoice_id, cil.amount, cil.line_type, cil.date, cil.void_date, cil.property_id, cil.product_default_type, cil.product_type from cte_invoices_lines cil
      UNION ALL
      select clt.invoice_id, clt.amount, clt.line_type, clt.date, clt.void_date, clt.property_id, clt.product_default_type, clt.product_type from cte_lines_tax clt`;

    return sql;
  },

  /* MHR */
  summaryProductRevenueAccrualByMonths(connection, payload) {
    let {start_date, end_date, properties} = payload;

    let sql = `
      with cte_invoice_lines as ( ${this.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(end_date), connection.escape(start_date))} ),
      mvw_invoices_details_ms as (
        select cil.property_id, cil.date, cil.product_type as product, sum(cil.amount) as revenue_amount
        from cte_invoice_lines cil
        group by cil.property_id, cil.product_type, cil.date
      )
      
      select ih.property_id, DATE_FORMAT(ih.date, '%M-%y') as revenue_date,
      sum(case when ih.product = 'deposit' then ih.revenue_amount else 0 end) as deposit,
                sum(case when ih.product = 'fee'  then ih.revenue_amount else 0 end) as fee,
                sum(case when ih.product = 'merchandise' then ih.revenue_amount else 0 end) as merchandise,
                sum(case when ih.product= 'rent' then ih.revenue_amount else 0 end) as rent,
				sum(case when ih.product = 'insurance' then ih.revenue_amount else 0 end) as insurance,
                sum(case when ih.product = 'auction' then ih.revenue_amount else 0 end) as auction,
                sum(case when ih.product = 'tax' then ih.revenue_amount else 0 end) as tax
      from mvw_invoices_details_ms ih
      GROUP BY ih.property_id, DATE_FORMAT(ih.date, '%M-%y')
	    ORDER BY ih.date desc;`

      console.log('summaryProductRevenueAccrualByMonths: ', sql);
      return connection.queryAsync(sql);
  }

}
