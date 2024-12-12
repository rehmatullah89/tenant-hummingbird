var moment = require('moment');

module.exports = {
  // NOTE: Adjustment types are not credits now.
  getCreditsAndWriteOffs(property_ids, start_date, end_date, payment_method_types = ['loss', 'credit']) {
    const paymentMethodTypes = payment_method_types.map(pm => `'${pm}'`).join(', ');

    const sql = `
      SELECT 
        concat(c.first,' ',c.last) as contact_name, 
        c.id contact_id,
        i.number as invoice_number, 
        i.date as invoice_date,
        i.due as invoice_due,
        (i.subtotal + i.total_tax - i.total_discounts) as invoice_total,
        ila.amount as payment_amount,
        ipb.date as payment_date, 
        py.method as payment_method,
        py.sub_method as payment_sub_method,
        u.number as unit_number,
        py.property_id as payment_property_id,
        py.notes,
        ipb.id as ipb_id,
        ila.type as "ila_type",
        pr.name as "product_name",
        pr.id as "product_id",
        pr.default_type as "product_type",
        u.type as "unit_type",
        ifnull(ppr.income_account_id,pr.income_account_id) as income_account_id,
		    ifnull(pr.slug,pr.default_type) as product_slug
        FROM invoice_lines_allocation ila
        inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
        join payments py on py.id = ipb.payment_id
        join invoices i on i.id = ipb.invoice_id
        join contacts c on c.id = i.contact_id
        join leases l on l.id = i.lease_id
        join units u on u.id = l.unit_id
        left join invoice_lines il on il.id = ila.invoice_line_id
		    left join products pr on pr.id = il.product_id
        left join property_products ppr on ppr.product_id = pr.id and ppr.property_id = i.property_id 
      WHERE 
        py.status = 1
        and ipb.date BETWEEN ${start_date} and ${end_date}
        and py.method in (${ paymentMethodTypes })  
        and py.property_id in (${property_ids.join(', ')})
      ORDER BY 
        ipb.date    
    `;

    return sql;
  },

  async summarizedAllowanceByProperty(connection, properties, start_date, end_date) {
    let sql = `
      with cte_credits_and_write_offs as (
        ${this.getCreditsAndWriteOffs(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))}
      )

      SELECT 
          cw.payment_property_id as property_id, 
          cw.payment_date as credit_date, 
          sum(case when cw.payment_method = 'credit' then cw.payment_amount else 0 end) as credits, 
          sum(case when cw.payment_method = 'loss' then cw.payment_amount else 0 end) as writeoffs
      FROM 
        cte_credits_and_write_offs cw
      GROUP BY 
        cw.payment_property_id
    `;

    console.log('summarizedAllowanceByProperty: ', sql);    

    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // Summarized
  async summarizedCreditsWithWriteOffs(connection, date, property_ids, first_day_of_month, first_day_of_year) {
    let sql = `
      with cte_credits_and_write_offs as (
        ${this.getCreditsAndWriteOffs(property_ids.map(p => connection.escape(p)), 
          connection.escape(first_day_of_year), 
          connection.escape(date))
        }
      ),

      credits_write_offs_summary as (
        SELECT 
            cw.payment_property_id as property_id, 
            cw.contact_id, 
            cw.payment_date as credit_date, 
            sum(case when cw.payment_method = 'credit' then cw.payment_amount else 0 end) as day_credit, 
            sum(case when cw.payment_method = 'loss' then cw.payment_amount else 0 end) as day_writeoffs
        FROM 
          cte_credits_and_write_offs cw
        GROUP BY 
          cw.payment_property_id, cw.contact_id, cw.payment_date
      )

      SELECT 
        c.property_id, c.credit_date, 
        date_format( c.credit_date,'%m') as credit_month, date_format( c.credit_date,'%Y') as credit_year,
        sum(c.day_credit) as credit_, 
        sum(c.day_writeoffs) as writeoffs_
      FROM 
        credits_write_offs_summary c
      WHERE 
        c.credit_date = '${date}'
      GROUP BY 
        c.property_id, c.credit_date, date_format( c.credit_date,'%m'), credit_year

      union all
      
      SELECT 
        c.property_id, 
        null as credit_date, 
        date_format( c.credit_date,'%m') as credit_month, 
        date_format( c.credit_date,'%Y') as credit_year,
        sum(c.day_credit) as credit_, 
        sum(c.day_writeoffs) as writeoffs_
      FROM 
        credits_write_offs_summary c
      WHERE 
        c.credit_date BETWEEN '${first_day_of_month}' and' ${date}'
      GROUP BY 
        c.property_id, date_format( c.credit_date,'%m'), credit_year
        
      union all
      
      SELECT 
        c.property_id, 
        null as credit_date, 
        null as credit_month, 
        date_format( c.credit_date,'%Y') as credit_year,
        sum(c.day_credit) as credit_, 
        sum(c.day_writeoffs) as writeoffs_
      FROM 
        credits_write_offs_summary c
      WHERE
        c.credit_date BETWEEN '${first_day_of_year}' and '${date}'
      GROUP BY 
        c.property_id, credit_year;
    `;

    console.log('Summary credits and writeoffs ', sql);    

    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  // Detailed
  detailedFindAppliedCredits(connection, company_id, property_ids, date, end_date) {
    
    date =  moment(date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');

    let sql = `
      with cte_credits_and_write_offs as (
        ${
          this.getCreditsAndWriteOffs(
            property_ids.map(p => connection.escape(p)), 
            connection.escape(date), 
            connection.escape(end_date),
            ['credit']
          )
        }
      )

      SELECT 
        cw.contact_name as name, 
        cw.payment_date, 
        cw.unit_number as space_number, 
        cw.invoice_number, 
        sum(cw.payment_amount) as amount,
        cw.notes
      FROM 
        cte_credits_and_write_offs cw  
      GROUP BY
        cw.ipb_id  
      ORDER BY
        cw.payment_date`;
    
    console.log('Detailed applied credits ', sql);

    return connection.queryAsync(sql);
  },

  // Detailed
  detailedFindWriteOffs(connection, company_id, property_ids, date, end_date) {
    date =  moment(date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');

    let sql = `
      with cte_credits_and_write_offs as (
        ${this.getCreditsAndWriteOffs(property_ids.map(p => connection.escape(p)), 
          connection.escape(date), 
          connection.escape(end_date),
          ['loss'])
        }
      )

      SELECT 
        cw.contact_name as name, 
        cw.unit_number as space_number, 
        cw.invoice_number,
        cw.invoice_date,
        cw.invoice_due,
        cw.invoice_total,
        sum(cw.payment_amount) as amount,
        cw.payment_date
      FROM 
        cte_credits_and_write_offs cw   
      GROUP BY
        cw.ipb_id  
      ORDER BY 
        cw.payment_date`;
    
    console.log('Detailed write-offs ', sql);

    return connection.queryAsync(sql);
  },

  // MHR
  summarizedWriteOffsByMonths(connection, payload) {
    let {start_date, end_date, properties} = payload;

    let sql = ` with cte_credits_and_write_offs as (
                  ${this.getCreditsAndWriteOffs(properties.map(p => connection.escape(p)), 
                    connection.escape(end_date), 
                    connection.escape(start_date))
                  }
                ),
                write_offs_summary as (
                  SELECT 
                      wo.payment_property_id as property_id, 
                      wo.contact_id, 
                      wo.payment_date as write_off_date, 
                      sum(case when wo.payment_method = 'loss' then wo.payment_amount else 0 end) as day_writeoffs
                  FROM 
                    cte_credits_and_write_offs wo
                  GROUP BY 
                    wo.payment_property_id, wo.contact_id, wo.payment_date
                )
                
                SELECT 
                  w.property_id, 
                  DATE_FORMAT(w.write_off_date, '%M-%y') as month,
                  sum(w.day_writeoffs) as writeoffs
                FROM 
                  write_offs_summary w
                GROUP BY 
                  w.property_id, month
              ORDER BY
                w.write_off_date desc;`

    console.log('summarizedWriteOffsByMonths: ', sql);
    return connection.queryAsync(sql);
  },
  
  // FSR
  getProductCredits(connection, property_ids, start_date, end_date){

    let sql = `
          
        
          with cte_credits_and_write_offs as (
            ${
              this.getCreditsAndWriteOffs(
                property_ids.map(p => connection.escape(p)), 
                connection.escape(start_date), 
                connection.escape(end_date),
                ['credit']
              )
            }
          )
          select product_id,
          case  product_type
            when "rent" then concat(upper(substring(unit_type, 1, 1)), lower(substring(unit_type, 2)), ' ',product_name)
              else product_name
            end
          as product_name,
          case product_type
            when "rent" then concat(upper(substring(unit_type, 1, 1)), lower(substring(unit_type, 2)), ' Rent')
            when "insurance" then "Coverage"
            when "late" then "Fees"
            when "product" then "Merchandise"
            else "Other"
           end
           as product_type,
           income_account_id,
           case product_slug
            when "rent" then concat(unit_type,'_',product_slug)
                  else product_slug
            end
            as product_slug,
          sum(case when ila_type = 'line' then payment_amount else 0 end) as credit,
          sum(case when ila_type = 'tax'  then payment_amount else 0 end) as credit_tax,
          sum(payment_amount) as total_credit
          from cte_credits_and_write_offs
          group by product_id
           
        
      
        `;
    
    console.log('getProductcredits Query', sql);
    return sql;
  }

}