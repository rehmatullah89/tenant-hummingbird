   //Depoists and Refunds model, queries used in the following reports
    //Summary report:
    //Deposits & Refunds Widget
    //Detail report:
    //

var Enums   = require(__dirname + '/../../modules/enums.js');

module.exports = {

    /*<--- MSR --->*/

    async summaryDeposits(connection, date, properties, first_day_of_month, first_day_of_year){
        let sql = `

            WITH cte_payments as(${this.deposits(properties, connection.escape(first_day_of_year), connection.escape(date))}),

            cte_summary_payments as (
                SELECT p.property_id, p.contact_id, p.date as payment_date , 
                    sum(case when p.method = 'cash' then p.ila_amount else 0 end) as day_cash, 
                    sum(case when p.method = 'check' then p.ila_amount else 0 end) as day_check,
                    sum(case when p.method = 'ach' then p.ila_amount else 0 end) as day_ach,
                    sum(case when p.method = 'card' then p.ila_amount else 0 end) as day_card,
                    sum(case when p.method = '${Enums.PAYMENT_METHODS.GIFTCARD}' then p.ila_amount else 0 end) as day_giftcard,
                    sum(case when p.method not in ( 'cash', 'check', 'ach', 'card', '${Enums.PAYMENT_METHODS.GIFTCARD}' ) then p.ila_amount else 0 end) as day_others
                FROM cte_payments p
                GROUP BY p.property_id, p.contact_id, p.date 
            )
            
            SELECT p.property_id, p.payment_date , date_format(p.payment_date,'%m') as payment_month, date_format( p.payment_date,'%Y') as payment_year, 
                sum(p.day_cash) as cash_, 
                sum(p.day_check) as check_,
                sum(day_ach) as ach_,
                sum(day_card) as card_,
                sum(day_giftcard) as giftcard_,
                sum(day_others) as others_
            FROM cte_summary_payments p
            WHERE p.property_id in (${properties.join(', ')}) and p.payment_date = ${connection.escape(date)}
            GROUP BY p.property_id, p.payment_date, payment_month, payment_year
            
            UNION ALL 
            
            SELECT p.property_id, null as payment_date , date_format( p.payment_date,'%m') as payment_month, date_format(p.payment_date,'%Y') as payment_year, 
                sum(p.day_cash) as cash_, 
                sum(p.day_check) as check_,
                sum(day_ach) as ach_,
                sum(day_card) as card_,
                sum(day_giftcard) as giftcard_,
                sum(day_others) as others_
            FROM cte_summary_payments p
            WHERE p.property_id in (${properties.join(', ')}) and p.payment_date BETWEEN ${connection.escape(first_day_of_month)} and ${connection.escape(date)} 
            GROUP BY p.property_id, payment_month, payment_year
            
            UNION ALL 
            
            SELECT p.property_id, null as payment_date ,null as payment_month, date_format( p.payment_date,'%Y') as payment_year, 
                sum(p.day_cash) as cash_, 
                sum(p.day_check) as check_,
                sum(day_ach) as ach_,
                sum(day_card) as card_,
                sum(day_giftcard) as giftcard_,
                sum(day_others) as others_
            FROM cte_summary_payments p
            WHERE p.property_id in (${properties.join(', ')}) and p.payment_date BETWEEN ${connection.escape(first_day_of_year)} and ${connection.escape(date)} 
            GROUP BY p.property_id, payment_year
        `;

        // 211ms
        console.log('Summary deposit query: ', sql)
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
      },

      
    async summaryRefunds(connection, date, properties, first_day_of_month, first_day_of_year){
        let sql = `
            WITH cte_payments as (${this.refunds(properties, connection.escape(first_day_of_year), connection.escape(date))}),

            cte_refunds as (
                SELECT p.property_id , p.contact_id, ila_date as refund_date, 
                    (-1 * sum(ila_amount)) as day_refund
                FROM cte_payments p      
                GROUP BY p.property_id, p.contact_id, refund_date
            )
            
            SELECT r.property_id ,r.refund_date, date_format( r.refund_date,'%m') as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
            FROM cte_refunds r
            WHERE r.property_id in (${properties.join(', ')}) and r.refund_date = ${connection.escape(date)}
            GROUP BY r.property_id, r.refund_date, refund_month, refund_year
            
            UNION ALL 
            
            SELECT r.property_id ,null as refund_date, date_format( r.refund_date,'%m') as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
            FROM cte_refunds r
            WHERE r.property_id in (${properties.join(', ')}) and r.refund_date BETWEEN ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
            GROUP BY r.property_id, refund_month, refund_year
            
            UNION ALL 
            
            SELECT r.property_id ,null as refund_date, null as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
            FROM cte_refunds r
            WHERE r.property_id in (${properties.join(', ')}) and r.refund_date BETWEEN ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
            GROUP BY r.property_id, refund_year
        `;

        // 175ms
        console.log('Summary refunds query: ', sql);
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    },
    

    async summaryRevenueByProductType(connection, date, properties, first_day_of_month, first_day_of_year){

        date = connection.escape(date);
        first_day_of_month = connection.escape(first_day_of_month);
        first_day_of_year = connection.escape(first_day_of_year);

        let sql = `select * from ( 
            with payment_details as (

              WITH cte_payments as (${this.deposits(properties.map(p => connection.escape(p)), first_day_of_year, date)}),
              cte_payment_refund as (${this.refunds(properties.map(p => connection.escape(p)), first_day_of_year, date)})

              SELECT p.id, p.property_id, p.ila_amount as amount, p.date, p.ila_type as line_type, p.product_type,
				'deposit' as deposit_type 
			  FROM cte_payments p

              UNION ALL

              SELECT pr.id, pr.property_id, pr.ila_amount as amount, pr.ila_date as date, pr.ila_type as line_type, pr.product_type,
				pr.refund_type as deposit_type
			  FROM cte_payment_refund pr
            )

            select pd.property_id, 
                case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.SECURITY_DEPOSIT}' or pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.CLEANING_DEPOSIT}' then '${Enums.PRODUCT_TYPES.DEPOSIT}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.FEE}' then '${Enums.PRODUCT_TYPES.FEE}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE}' then '${Enums.PRODUCT_TYPES.MERCHANDISE}' else pd.product_type
                end as product_types, 
                pd.date as date, date_format( pd.date,'%m') as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type != 'tax' and
                pd.date = ${date}
            group by pd.property_id, product_types, date, month, year
        
            union
            select pd.property_id, pd.line_type as product_types, pd.date as date, date_format( pd.date,'%m') as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type = 'tax' and
                pd.date = ${date}
            group by pd.property_id, product_types, date, month, year
            
            UNION
            select pd.property_id, 
                case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.SECURITY_DEPOSIT}' or pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.CLEANING_DEPOSIT}' then '${Enums.PRODUCT_TYPES.DEPOSIT}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.FEE}' then '${Enums.PRODUCT_TYPES.FEE}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE}' then '${Enums.PRODUCT_TYPES.MERCHANDISE}' else pd.product_type
                end as product_types, 
                null as date, date_format( pd.date,'%m') as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type != 'tax' and
                pd.date between ${first_day_of_month} and ${date}
            group by pd.property_id, product_types, month, year
            
            union
            select pd.property_id, pd.line_type as product_types, null as date, date_format( pd.date,'%m') as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type = 'tax' and
                pd.date between ${first_day_of_month} and ${date}
            group by pd.property_id, product_types, month, year
            
            UNION
            select pd.property_id, 
                case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.SECURITY_DEPOSIT}' or pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.CLEANING_DEPOSIT}' then '${Enums.PRODUCT_TYPES.DEPOSIT}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.FEE}' then '${Enums.PRODUCT_TYPES.FEE}'
                    when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE}' then '${Enums.PRODUCT_TYPES.MERCHANDISE}' else pd.product_type
                end as product_types, 
                null as date, null as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type != 'tax' and
                pd.date between ${first_day_of_year} and ${date}
            group by pd.property_id, product_types, year
            
            union
            select pd.property_id, pd.line_type as product_types, null as date, null as month, date_format( pd.date,'%Y') as year, sum(pd.amount) as amount
            from payment_details pd
            where pd.line_type = 'tax' and
                pd.date between ${first_day_of_year} and ${date}
            group by pd.property_id, product_types, year    

          ) x`;

        console.log('Revenue by product type: ', sql)
        return connection.queryAsync(sql);
    },

    /*<--- Detail reports --->*/

    // Close of the day report 
    async detailDeposits (connection, params, properties, cardOnly) {

        let { date } = params;
        if(!date) date = moment().format('YYYY-MM-DD');
    
        let sql = `select * from ( 
                          with payment_details as (
    
                              WITH cte_payments as (${this.deposits([connection.escape(properties)], connection.escape(date), connection.escape(date))}),
                              cte_refunds as (${this.refunds([connection.escape(properties)], connection.escape(date), connection.escape(date))})
    
                              SELECT p.id, p.ila_amount as amount, p.date, p.ila_type as line_type, p.card_type, p.product_type as default_type, if(p.product_type = 'late', p.product_name, NULL) as fee_name,
                                ${cardOnly ? "IF(p.method = 'card', p.card_type, p.method)" : 'p.method' } as method, 'deposit' as deposit_type
                              FROM cte_payments p
             
                              UNION ALL
                              SELECT r.id, r.ila_amount as amount, r.ila_date as date, r.ila_type as line_type, r.card_type, r.product_type as default_type, if(r.product_type = 'late', r.product_name, NULL) as fee_name,
                                ${cardOnly ? "IF(r.method = 'card', r.card_type, r.method)" : 'r.method' } as method, r.refund_type as deposit_type
                              FROM cte_refunds r
    
                          )
                          select pd.date, pd.method, pd.fee_name,
                              (sum(Case When default_type = 'rent' and line_type = 'line' Then amount Else 0 End)) as rent,
                              (sum(Case When default_type = 'insurance' and line_type = 'line' Then amount Else 0 End)) as insurance,
                              (sum(Case When default_type = 'product' and line_type = 'line' Then amount Else 0 End)) as merchandise,
                              (sum(Case When default_type = 'auction' and line_type = 'line' Then amount Else 0 End)) as auction,
                              (sum(Case When (default_type = 'security' or default_type = 'cleaning') and line_type = 'line' Then amount Else 0 End)) as deposits,
                              (sum(Case When default_type = 'late' and line_type = 'line' Then amount Else 0 End)) as fees,
                              (sum(Case When default_type = 'inter_property_adjustment' and line_type = 'line' Then amount Else 0 End)) as inter_property_payments,
                              (sum(Case When line_type = 'tax' Then amount Else 0 End)) as tax,
                              (sum(Case When default_type not in ('rent', 'insurance', 'product', 'auction', 'security', 'late', 'cleaning', 'inter_property_adjustment') 
								and line_type not in ('tax') Then amount Else 0 End)) as others,
                              (sum(Case When deposit_type != 'deposit' Then 0 Else amount End)) as sub_total,
                              (sum(Case When deposit_type != 'deposit' Then amount Else 0 End)) as refund,
                              (sum(amount)) as totals
                            from payment_details pd
                            group by pd.date, pd.method, pd.fee_name
                              
                        ) x
                order by x.date`
    
        console.log("Deposit Details: ", sql);
    
        return connection.queryAsync(sql);
    },

    async detailRevenueReceipts(connection, date, properties) {
        let sql = `
            WITH cte_payment_deposits as (${this.deposits([connection.escape(properties)], connection.escape(date), connection.escape(date))})

            SELECT concat(if(c.last is null,'',concat(c.last,',')),c.first) as tenant,
                (select GROUP_CONCAT(number SEPARATOR ', ') from units where id in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = p.id)))) as space_nos,
                sum(p.ila_amount) as amount, CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))) as payment_method,
                (SELECT (SELECT IF((select id from payments where id = p.id and method = 'check'), CONCAT(CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))), ' #', p.number), (SELECT IF((select id from payments where id = p.id and (method = 'card' or method = 'ach')), CONCAT(CONCAT(UCASE(SUBSTRING(p.card_type, 1, 1)), LOWER(SUBSTRING(p.card_type, 2))), ' ', p.card_end), ''))))) as payment_details,
                p.card_type, p.card_end, p.date as payment_date
            FROM cte_payment_deposits as p
                inner join contacts c on p.contact_id = c.id
            WHERE p.product_type != 'inter_property_adjustment'
            GROUP BY p.id
        `;

        console.log('detailRevenueReceipts: ', sql);
        return connection.queryAsync(sql);
    },

    async detailReversalsReceipt(connection, date, properties) {
        let sql = `
            WITH cte_refunds as (${this.refunds([connection.escape(properties)], connection.escape(date), connection.escape(date))})

            SELECT concat(if(c.last is null,'',concat(c.last,',')),c.first) as tenant,
                (select GROUP_CONCAT(number SEPARATOR ', ') from units where id in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = r.id)))) as space_no,
                sum(r.ila_amount) as amount, CONCAT(UCASE(SUBSTRING(r.method, 1, 1)), LOWER(SUBSTRING(r.method, 2))) as payment_method, r.ila_date as refund_date, r.payment_date,
                (SELECT (SELECT IF((select id from payments where id = r.id and method = 'check'), CONCAT(CONCAT(UCASE(SUBSTRING(r.method, 1, 1)), LOWER(SUBSTRING(r.method, 2))), ' #', r.number), (SELECT IF((select id from payments where id = r.id and (method = 'card' or method = 'ach')), CONCAT(CONCAT(UCASE(SUBSTRING(r.card_type, 1, 1)), LOWER(SUBSTRING(r.card_type, 2))), ' ', r.card_end), ''))))) as payment_details,
                r.card_type, r.card_end
            FROM cte_refunds r
                inner join contacts c on r.contact_id = c.id
            GROUP BY r.refund_id
        `;
        
        console.log('ReversalsReceipt: ', sql);
        
        return connection.queryAsync(sql);
    },

    // Cash Audit report
    detailCashAudit (connection, property_id, start_date, end_date){
        let sql = `select * from ( 
                    WITH payment_details as (
  
                      WITH cte_payments as (${this.deposits([property_id], connection.escape(start_date), connection.escape(end_date))}),
                      cte_payment_refund as (${this.refunds([property_id], connection.escape(start_date), connection.escape(end_date))})
  
                      SELECT p.id, p.ila_amount as amount, p.date, p.ila_type as line_type, p.method, 
                        if(p.product_type = 'rent', if(p.ila_date < p.invoice_due, 'prepaid', if(p.ila_date > p.invoice_due, 'pastdue', 'current')), 
                          if(p.product_type = 'late', if(p.product_name like '%admin%', 'admin_fee', if(p.product_name like '%late%', 'late_fee', 'other_fee')), 
                          p.product_type)) as default_type, 'deposit' as deposit_type
                      FROM cte_payments p
  
                      UNION ALL
  
  
                      SELECT p.id, p.ila_amount as amount, p.ila_date as date, p.ila_type as line_type, p.method, 
                        if(p.product_type = 'rent', if(p.ila_date < p.invoice_due, 'prepaid', if(p.ila_date > p.invoice_due, 'pastdue', 'current')), 
                          if(p.product_type = 'late', if(p.product_name like '%admin%', 'admin_fee', if(p.product_name like '%late%', 'late_fee', 'other_fee')),  
                          p.product_type)) as default_type, p.refund_type as deposit_type
                      FROM cte_payment_refund p
                    )
  
                    select pd.date,
                        (sum(Case When method = 'cash' Then amount Else 0 End)) as cash_payment,
                          (sum(Case When method = 'check' Then amount Else 0 End)) as check_payment,
                          (sum(Case When method = 'ach' Then amount Else 0 End)) as ach_payment,
                          (sum(Case When method = 'card' Then amount Else 0 End)) as card_payment,
                          (sum(Case When method = '${Enums.PAYMENT_METHODS.GIFTCARD}' Then amount Else 0 End)) as giftcard_payment,
                          (sum(amount)) as payment,
                          (sum(Case When default_type = 'prepaid' and line_type = 'line' Then amount Else 0 End)) as prepaid_rent,
                          (sum(Case When default_type = 'current' and line_type = 'line' Then amount Else 0 End)) as current_rent,
                          (sum(Case When default_type = 'pastdue' and line_type = 'line' Then amount Else 0 End)) as pastdue_rent,
                          (sum(Case When default_type = 'admin_fee' and line_type = 'line' Then amount Else 0 End)) as admin_fee,
                          (sum(Case When default_type = 'late_fee' and line_type = 'line' Then amount Else 0 End)) as late_fee,
                          (sum(Case When default_type = 'other_fee' and line_type = 'line' Then amount Else 0 End)) as other_fee,
                          (sum(Case When default_type NOT IN ('prepaid', 'other_fee', 'current', 'pastdue', 'admin_fee', 'late_fee', 'insurance', 'product', 'auction', 'security', 'cleaning') and line_type = 'line' Then amount Else 0 End)) as others,
                        (sum(Case When default_type = 'insurance' and line_type = 'line' Then amount Else 0 End)) as insurance,
                        (sum(Case When default_type = 'product' and line_type = 'line' Then amount Else 0 End)) as merchandise,
                        (sum(Case When default_type = 'auction' and line_type = 'line' Then amount Else 0 End)) as auction,
                        (sum(Case When (default_type = 'security' or default_type = 'cleaning') and line_type = 'line' Then amount Else 0 End)) as deposits,
                        (sum(Case When line_type = 'tax' Then amount Else 0 End)) as tax,
                        (sum(Case When deposit_type not in ('deposit', 'nsf') Then amount Else 0 End)) as refund,
                          (sum(Case When deposit_type = 'nsf' Then amount Else 0 End)) as nsf_refund,
                        (sum( amount)) as totals
                        from payment_details pd
                        group by pd.date
                  ) x
                  order by x.date`;
        
        console.log('Cash Audit: ', sql)
        return connection.queryAsync(sql);
    },

    //StoreKPI
    summaryProductTypeByProperty(connection, properties, start_date, end_date){
        let sql = `
            select * from ( 
                with payment_details as ( ${this.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )

                select pd.date, pd.property_id,
                    (sum(ila_amount)) as payment,
                    (sum(Case When product_type = 'rent' and ila_type = 'line' Then ila_amount Else 0 End)) as rent,
                    (sum(Case When product_type = 'late' and ila_type = 'line' Then ila_amount Else 0 End)) as fees,
                    (sum(Case When product_type = 'insurance' and ila_type = 'line' Then ila_amount Else 0 End)) as insurance,
                    (sum(Case When product_type = 'product' and ila_type = 'line' Then ila_amount Else 0 End)) as merchandise,
                    (sum(Case When product_type = 'auction' and ila_type = 'line' Then ila_amount Else 0 End)) as auction,
                    (sum(Case When (product_type = 'security' or product_type = 'cleaning') and ila_type = 'line' Then ila_amount Else 0 End)) as deposits,
                    (sum(Case When ila_type = 'tax' Then ila_amount Else 0 End)) as tax,
                    (sum(Case When type = 'refund' Then ila_amount Else 0 End)) as refund,
                    (sum(ila_amount)) as totals
                from payment_details pd
                group by pd.property_id
            ) x
            order by x.date
        `;
        
        console.log('Payments by product type: ', sql)
        return connection.queryAsync(sql);
    },

    // Payments By Product type report
    detailPaymentByProductType(connection, properties, start_date, end_date){
        let sql = `
            select * from ( 
                with payment_details as ( ${this.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )

                select pd.date, pd.property_id,
                    (sum(ila_amount)) as payment,
                    (sum(Case When product_type = 'rent' and ila_type = 'line' Then ila_amount Else 0 End)) as rent,
                    (sum(Case When product_type = 'late' and ila_type = 'line' Then ila_amount Else 0 End)) as fees,
                    (sum(Case When product_type = 'insurance' and ila_type = 'line' Then ila_amount Else 0 End)) as insurance,
                    (sum(Case When product_type = 'product' and ila_type = 'line' Then ila_amount Else 0 End)) as merchandise,
                    (sum(Case When product_type = 'auction' and ila_type = 'line' Then ila_amount Else 0 End)) as auction,
                    (sum(Case When (product_type = 'security' or product_type = 'cleaning') and ila_type = 'line' Then ila_amount Else 0 End)) as deposits,
                    (sum(Case When product_type not in ('rent', 'insurance', 'product', 'auction', 'security', 'late', 'cleaning') and type != 'refund' and ila_type not in ('tax') Then ila_amount Else 0 End)) as others,
                    (sum(Case When ila_type = 'tax' Then ila_amount Else 0 End)) as tax,
                    (sum(Case When type = 'refund' Then ila_amount Else 0 End)) as refund,
                    (sum(ila_amount)) as totals
                from payment_details pd
                group by pd.date, pd.property_id
            ) x
            order by x.date
        `;
        
        console.log('Payments by product type: ', sql)
        return connection.queryAsync(sql);
    },

    /*<--- Detail reports --->*/

     /*<--- FSR report --->*/
    getPayments(connection, properties, start_date, end_date){

      let sql = `
     
      
        with payment_details as ( ${this.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )        
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
           as product_type , 
           income_account_id, 
           case product_slug
			        when "rent" then concat(unit_type,'_',product_slug)
              else product_slug
		        end
           as product_slug,
              sum(case when ila_type = 'line'  then ila_amount else 0 end) as payment,
              sum(case when ila_type = 'tax' then ila_amount else 0 end) as payment_tax,
              sum(ila_amount) as total_payment
          from payment_details
          group by product_id
           
        
    `;
      console.log('getPaymentsQuery : ', sql);
      return sql;

    },
     
    /*<--- FSR report --->*/
    
    // Snippet
    deposits(properties, start_date, end_date) {
        let sql = `
            SELECT p.id, concat(c.first, ' ', c.last) as contact_name, u.number as unit_number, ila.amount as ila_amount, date(p.date) as date, ila.date as ila_date, ila.type as ila_type, p.method, p.property_id, p.contact_id, 
                ila.invoice_line_id, i.due as invoice_due, pr.default_type as product_type, pr.name as product_name,
                pm.card_type, pm.card_end, p.number,u.type as unit_type,pr.id as product_id,
                ifnull(ppr.income_account_id,pr.income_account_id) as income_account_id,
				        ifnull(pr.slug,pr.default_type) as product_slug
            FROM invoice_lines_allocation ila
                inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
                    and ipb.refund_id is null
                inner join payments p on p.id = ipb.payment_id
                inner join invoices i on i.id = ila.invoice_id
                inner join contacts c on c.id = p.contact_id
                left join invoice_lines il on il.id = ila.invoice_line_id
                left join products pr on pr.id = il.product_id
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join leases l on l.id = i.lease_id
                left join units u on u.id = l.unit_id
                left join property_products ppr on ppr.product_id = pr.id and ppr.property_id = i.property_id 
            WHERE  p.credit_type = 'payment'
                and p.method not in ('credit', 'loss')
                and p.status = 1
                and date(p.date) between ${start_date} and ${end_date}
                and ila.date = p.date
                and p.property_id in (${properties.join(', ')})`;

        return sql;
    },

    refunds(properties, start_date, end_date) {
        let sql = `
            SELECT p.id, r.id as refund_id, ila.amount as ila_amount, ila.type as ila_type, p.method, ila.date as ila_date, p.property_id, r.refund_to as contact_id, 
                ila.invoice_line_id, i.due as invoice_due, pr.default_type as product_type, pr.name as product_name, r.type as refund_type,
                pm.card_type, pm.card_end, p.number, p.date as payment_date,u.type as unit_type,pr.id as product_id,
                ifnull(ppr.income_account_id,pr.income_account_id) as income_account_id,
				        ifnull(pr.slug,pr.default_type) as product_slug
            FROM invoice_lines_allocation ila
                inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
                inner join payments p on p.id = ipb.payment_id
                inner join invoices i on i.id = ila.invoice_id
                inner join refunds r on r.id = ipb.refund_id
                left join invoice_lines il on il.id = ila.invoice_line_id
                left join products pr on pr.id = il.product_id
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join leases l on l.id = i.lease_id
                left join units u on u.id = l.unit_id
                left join property_products ppr on ppr.product_id = pr.id and ppr.property_id = i.property_id 
            WHERE  p.credit_type = 'payment'
                and p.method not in ('credit', 'loss')
                and p.status = 1
                and ila.date between ${start_date} and ${end_date}
                and p.property_id in (${properties.join(', ')})`;

        return sql;
    },

    deposits_refunds(properties, start_date, end_date) {
        let sql = `
            with cte_payments as(${this.deposits(properties, start_date, end_date)}),
            cte_refunds as (${this.refunds(properties, start_date, end_date)})

            select id, ila_amount, date, ila_date, ila_type, method, property_id, contact_id, invoice_line_id, invoice_due, product_type, product_name, 'payment' as type,unit_type,product_id,income_account_id,product_slug from cte_payments
            union all
            select id, ila_amount, ila_date as date, ila_date, ila_type, method, property_id, contact_id, invoice_line_id, invoice_due, product_type, product_name, 'refund' as type,unit_type,product_id,income_account_id,product_slug from cte_refunds
        `;

        return sql;
    },

    /* MHR */

    summaryDepositsByMonths(connection, payload){
        let {start_date, end_date, properties} = payload;

        let sql = `

            WITH cte_payments as(${this.deposits(properties, connection.escape(end_date), connection.escape(start_date))})
            SELECT p.property_id, DATE_FORMAT(p.date, '%M-%y') as payment_month, 
                sum(case when p.method = 'cash' then p.ila_amount else 0 end) as month_cash, 
                sum(case when p.method = 'check' then p.ila_amount else 0 end) as month_check,
                sum(case when p.method = 'ach' then p.ila_amount else 0 end) as month_ach,
                sum(case when p.method = 'card' then p.ila_amount else 0 end) as month_card,
                sum(case when p.method = '${Enums.PAYMENT_METHODS.GIFTCARD}' then p.ila_amount else 0 end) as month_gift_card
            FROM cte_payments p
            GROUP BY p.property_id, DATE_FORMAT(p.date, '%M-%y')
            ORDER BY p.date desc
        `

        console.log('summaryDepositsByMonths: ', sql);
        return connection.queryAsync(sql);
    },

    summaryRefundsByMonths(connection, payload){
        let {start_date, end_date, properties} = payload;

        let sql = `
            WITH cte_payments as (${this.refunds(properties, connection.escape(end_date), connection.escape(start_date))})

            SELECT p.property_id , p.contact_id, DATE_FORMAT(ila_date, '%M-%y') as refund_month, 
                case when p.refund_type = 'nsf' then (-1 * sum(ila_amount)) else 0 end as nsf,
                case when p.refund_type = 'chargeback' then (-1 * sum(ila_amount)) else 0 end as chargebacks,
                case when p.refund_type = 'ach' then (-1 * sum(ila_amount)) else 0 end as ach,
                case when p.refund_type not in ('nsf', 'chargeback', 'ach') then (-1 * sum(ila_amount)) else 0 end as reversals
            FROM cte_payments p      
            GROUP BY p.property_id, DATE_FORMAT(ila_date, '%M-%y')
            ORDER BY ila_date desc;`
        
        console.log('summaryRefundsByMonths: ', sql);
        return connection.queryAsync(sql);
    },

    summaryRevenueByProductTypeByMonths(connection, payload){
        let {start_date, end_date, properties} = payload;

        let sql = `select * from ( 
            with payment_details as (

              WITH cte_payments as (${this.deposits(properties, connection.escape(end_date), connection.escape(start_date))}),
              cte_payment_refund as (${this.refunds(properties, connection.escape(end_date), connection.escape(start_date))})

              SELECT p.id, p.property_id, p.ila_amount as amount, p.date, p.ila_type as line_type, p.product_type,
				'deposit' as deposit_type 
			  FROM cte_payments p

              UNION ALL

              SELECT pr.id, pr.property_id, pr.ila_amount as amount, pr.ila_date as date, pr.ila_type as line_type, pr.product_type,
				pr.refund_type as deposit_type
			  FROM cte_payment_refund pr
            )
            
            SELECT pd.property_id, DATE_FORMAT(pd.date, '%M-%y') as payment_month,
                sum(case when (pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.SECURITY_DEPOSIT}' or pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.CLEANING_DEPOSIT}') and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.DEPOSIT}',
                sum(case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.FEE}' and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.FEE}',
                sum(case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE}' and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.MERCHANDISE}',
                sum(case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.RENT}' and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.RENT}',
				sum(case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.INSURANCE}' and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.INSURANCE}',
                sum(case when pd.product_type = '${Enums.PRODUCT_DEFAULT_TYPES.AUCTION}' and pd.line_type != 'tax' then pd.amount else 0 end) as '${Enums.PRODUCT_TYPES.AUCTION}',
                sum(case when pd.line_type = 'tax' then pd.amount else 0 end) as tax
            FROM payment_details pd
            GROUP BY pd.property_id, DATE_FORMAT(pd.date, '%M-%y')
            ORDER BY pd.date desc
        
        ) x;`;

            console.log('summaryRevenueByProductTypeByMonths: ', sql);
            return connection.queryAsync(sql);
    },
    async paymentCollectedReceipt(connection, date, properties) {
        let sql = `
            WITH cte_payment_deposits as (${this.deposits([connection.escape(properties)], connection.escape(date), connection.escape(date))})

            SELECT concat(if(c.last is null,'',concat(c.last,',')),c.first) as tenant,
                (select GROUP_CONCAT(number SEPARATOR ', ') from units where id in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id in (select payment_id from inter_property_payments where source_payment_id = p.id))))) as space_nos,
                sum(p.ila_amount) as amount, CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))) as payment_method,
                (SELECT (SELECT IF((select id from payments where id = p.id and method = 'check'), CONCAT(CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))), ' #', p.number), (SELECT IF((select id from payments where id = p.id and (method = 'card' or method = 'ach')), CONCAT(CONCAT(UCASE(SUBSTRING(p.card_type, 1, 1)), LOWER(SUBSTRING(p.card_type, 2))), ' ', p.card_end), ''))))) as payment_details,
				(SELECT name from properties where id in (select property_id from payments where id in (select payment_id from inter_property_payments where source_payment_id = p.id))) as property_applied
            FROM cte_payment_deposits as p
                inner join contacts c on p.contact_id = c.id
			WHERE p.product_type = 'inter_property_adjustment'
            GROUP BY p.id;
        `;

        console.log('paymentCollectedReceipt: ', sql);
        return connection.queryAsync(sql);
    },

    async paymentReceivedReceipt(connection, date, properties) {
        
        let sql = `with cte_received_payments_props as (
                    select ipp.source_payment_id as payment_id
                    from payments p
                    inner join inter_property_payments ipp on ipp.payment_id = p.id
                    where  p.property_id in (${properties.map(p => connection.escape(p))})
                    and p.sub_method = 'inter_property_payment'		
                    and p.date = ${connection.escape(date)}
            )
            select (select property_id from payments where id in (rp.payment_id)) as property_id,
				rp.payment_id
			    from cte_received_payments_props rp;`
        
        console.log('cte_received_payments_props: ', sql);
        let pay_rcv_props = await connection.queryAsync(sql);

        if(!pay_rcv_props.length) return [];

        let props = pay_rcv_props?.map(p => p.property_id);
        props = new Set(props);
        props = Array.from(props);
        let payments = pay_rcv_props?.map(p => p.payment_id);

        sql = `
            WITH cte_payment_deposits as (${this.deposits([connection.escape(props)], connection.escape(date), connection.escape(date))})
        
            SELECT p.id, concat(if(c.last is null,'',concat(c.last,',')),c.first) as tenant,
                (select GROUP_CONCAT(number SEPARATOR ', ') from units where id in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id in (select payment_id from inter_property_payments where source_payment_id = p.id))))) as space_nos,
                sum(p.ila_amount) as amount, CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))) as payment_method,
                (SELECT (SELECT IF((select id from payments where id = p.id and method = 'check'), CONCAT(CONCAT(UCASE(SUBSTRING(p.method, 1, 1)), LOWER(SUBSTRING(p.method, 2))), ' #', p.number), (SELECT IF((select id from payments where id = p.id and (method = 'card' or method = 'ach')), CONCAT(CONCAT(UCASE(SUBSTRING(p.card_type, 1, 1)), LOWER(SUBSTRING(p.card_type, 2))), ' ', p.card_end), ''))))) as payment_details,
				(SELECT name from properties where id = p.property_id) as property_collected
            FROM cte_payment_deposits as p
                inner join contacts c on p.contact_id = c.id
			WHERE p.product_type = 'inter_property_adjustment'
                and p.id in (${payments.join(',')})
            GROUP BY p.id;`

        console.log('paymentReceivedReceipt: ', sql);
        return connection.queryAsync(sql);
    }
}