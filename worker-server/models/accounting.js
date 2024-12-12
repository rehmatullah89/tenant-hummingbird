var moment      = require('moment');

module.exports = {
  findById: function (connection, account_id) {
    var sql = "SELECT * FROM accounting_accounts where id =  " + connection.escape(account_id);
    return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
  },

  findByName: function (connection, name) {
    var sql = "SELECT * FROM accounting_accounts where name =  " + connection.escape(name);
    return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
  },

  findProductGlAccount(connection, product_id, level = 'corporate'){
    let corporateSql = ` SELECT income_account_id from products where id = ${product_id} `;
    let propertySql = ` SELECT income_account_id from property_products where product_id = ${product_id} `;
    let sql = `SELECT * FROM gl_accounts WHERE id IN ( ${level === 'corporate'? corporateSql : propertySql} );`;
    return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
  },

  findByCompanyId(connection, company_id){
    var sql = "SELECT * from accounting_accounts where company_id = " + connection.escape(company_id) + " and status = 1 ";
    return connection.queryAsync(sql);
  },

  findAccountByProductId(connection, product_id){
    var sql = "SELECT * from accounting_products where product_id = " + connection.escape(product_id);
    return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
  },

  saveProductAccount(connection, data, product_account_id){
    var sql;
    if(product_account_id){
      sql = "update accounting_products set ?  where id = " + connection.escape(product_account_id);
    } else {
      sql = "insert into accounting_products set ?";
    }
    return connection.queryAsync(sql, data);
  },

  async findAccountingSetup(connection, payload = {}) {
    const { filters, is_active = true } = payload;

    const data = await GenericModel.find(connection, {
			table_name: 'accounting_setup',
			conditions: {
        ...filters,
        ...(is_active && { deleted_at: null })
      }
		});

		return data;
	},

  async findAccountingEvents(connection, payload = {}) {
    const { filters, is_active = true } = payload;

    const data = await GenericModel.find(connection, {
			table_name: 'gl_event_company',
			conditions: {
        ...filters,
        ...(is_active && { deleted_at: null })
      }
		});

		return data;
	},

  async findAccountingEventOverrides(connection, payload = {}) {
    const { filters, is_active = true } = payload;

    const data = await GenericModel.find(connection, {
			table_name: 'gl_event_override',
			conditions: {
        ...filters,
        ...(is_active && { deleted_at: null })
      }
		});

		return data;
	},

  save(connection, data, accounting_id){

    var sql;
    if(accounting_id){
      sql = "update accounting_accounts set ?  where id = " + connection.escape(accounting_id);
    } else {
      sql = "insert into accounting_accounts set ?";
    }
    return connection.queryAsync(sql, data);

  },

  findAccountingTemplate(connection, company_id) {
    const sql = `select * from accounting_template where company_id = ${company_id}`;
    return connection.queryAsync(sql);
  },

  findAccountingSetupByCompanyId(connection, company_id){
    var sql = "SELECT * from accounting_setup where company_id = " + connection.escape(company_id) + " and active = 1 ";
    return connection.queryAsync(sql);
  },

  updateAccountingSetupById(connection, id,data){
    var sql = "UPDATE accounting_setup SET ?  where id = " + connection.escape(id);
    return connection.queryAsync(sql,data);
  },

  prePopulateAccounts(connection, params) {
    const { company_id, created_by } = params;

    let sql = `INSERT INTO gl_accounts (company_id,code,name,category_id,account_type_id,account_subtype_id,active,isDefault,created_by) 
                SELECT ${company_id},code,name,category_id,account_type_id,account_subtype_id,1,1,${created_by}
                FROM gl_default_accounts
                WHERE type='2';`;

    console.log('Default accounts ', sql);

    return connection.queryAsync(sql);   
  },

  getLeasesByContact(connection, params){
    let { contact_id, lease_id } = params;
    var sql = `select 
                cl.contact_id
                , ifnull( l.end_date, '') as end_date
                , l.id as lease_id 
                , u.property_id
                , l.start_date
                , u.number as unit_nbr
              from contact_leases cl
                join leases l on l.id = cl.lease_id
                join units u on u.id = l.unit_id`;
    
    if(contact_id){
      sql += ` where cl.contact_id = ${connection.escape(contact_id)}`;
    } else if (lease_id){
      sql += ` where cl.lease_id = ${connection.escape(lease_id)}`;
    }

    return connection.queryAsync(sql);

  },

  getLedgerByContact(connection, contact_id, property_id, date_ranges){

    let { start_dt, end_dt } = date_ranges;
    if(!start_dt) start_dt = '1900-01-01';
    if(!end_dt) end_dt = '2525-01-01';

    var sql = `select
                  UUID() as row_guid
                  , transaction_amt as amount
                  , transaction_date as date
                  , transaction_type as type
                  , id
                  , nbr as number
                  , ifnull( lease_id, '') as lease_id
                  , ifnull( unit_nbr, '') as unit_nbr
                  , ifnull( unit_type, '') as unit_type
                  , ifnull( description, '') as description
                  , ifnull( description_text, '') as description_text
                  , ifnull( status, '') as status
                  , sum(case when status = 'void' then 0 else transaction_amt end) over (order by transaction_date, transaction_type, id) as running_balance
                  , ifnull( note, '') as note
                  , invoice_id
                  , payment_id
              from (
              with cta_x as (
              select 
                created_at 
                , transaction_date
                , transaction_type
                , case 
                  when transaction_type in ('invoice', 'refund', 'void') then invoice_id 
                  when transaction_type in ('write-off') then concat(payment_id,invoice_id )
                  when transaction_type in ('payment', 'credit', 'reversal', 'void payment', 'payment void', 'auction payment') then payment_id 
                end as id
                , case 
                  when transaction_type in ('invoice', 'refund', 'void') then  ifnull( invoice_nbr, '')
                  when transaction_type in ('payment', 'credit', 'reversal', 'void payment', 'payment void', 'auction payment', 'write-off') then ifnull( payment_nbr, '')
                end as nbr
                , ifnull( lease_id, '') as lease_id
                , ifnull( unit_nbr, '') as unit_nbr
                , ifnull( unit_type, '') as unit_type
                , ifnull( description_prefix, '') as description
                , ifnull( description_text, '') as description_text
                , ifnull( status, '') as status
                , invoice_amount as transaction_amt
                , sum(case when status = 'void' then 0 else invoice_amount end) over (order by transaction_date, transaction_type, invoice_id, payment_id desc) as running_balance
                , ifnull( note, '') as note
                , case when transaction_type in ('write-off') then invoice_id else '' end as invoice_id
                , case when transaction_type in ('refund') then payment_id else '' end as payment_id
              from (  
              select 
              case when i.status = 1 then 'invoice'
              else 'void'
              end as transaction_type
              , i.id as invoice_id
              , i.number as invoice_nbr
              , '' as payment_id
              , null as payment_nbr
              , ifnull( i.contact_id, cl.contact_id) as contact_id 
              -- , cl.contact_id
              , i.lease_id 
              -- , u.property_id 
              , ifnull( u.number, '' ) as unit_nbr 
                  , ifnull( u.type, '' ) as unit_type 
              , case 
                when !isnull(wo.invoice_id ) then 'Write-Off'
                when (i.void_date is not null and i.void_date <= ${connection.escape(end_dt)}) then 'Void' 
                when i.paid = 1 then 'Paid'
                when ip.applied_payment >= (i.subtotal+i.total_tax - i.total_discounts) then 'Paid'
                when now() > i.due then 'Past Due'
                else 'Open'
              end as status
              , i.created_at 
              , i.status as hb_inv_status
              -- , i.type 
              , ifnull( i.period_start, '' ) as period_start 
              , ifnull( i.period_end, '' ) as period_end
              , i.subtotal + i.total_tax - i.total_discounts as 'invoice_amount'
              -- , i.total_payments 
              , ifnull( i.due, '' ) as due_date
              -- , case when i.status = 1 then i.created_at
              --	else ifnull( i.period_start, '' ) 
                  --   end as transaction_date 
              , ifnull( i.period_start, '' )  as transaction_date
                  , 'Invoice # ' as description_prefix
                  , i.number as description_text
                  , case when !isnull(i.void_date) then concat( 'This invoice was voided on ', i.void_date) else null end as note
                  -- , ifnull( inv.status,        

              from invoices i 
              join leases l on l.id = i.lease_id 
              join units u on u.id = l.unit_id and u.property_id = ${connection.escape(property_id)}
              left join (select contact_id, lease_id from contact_leases cl where cl.type = 'tenant' -- and cl.primary = 1
              ) as cl on cl.lease_id = l.id
              left join (select invoice_id, round(sum(amount),2) applied_payment from invoices_payments group by invoice_id) ip on ip.invoice_id = i.id
              left join (select distinct ip.invoice_id from invoices_payments ip 
                join payments p on p.id = ip.payment_id 
                          where 
                  p.status = 1
                  and p.credit_type = 'loss'	-- ie: write off 
                  and p.property_id = ${connection.escape(property_id)}
                  and p.contact_id = ${connection.escape(contact_id)}
                              and ip.amount > 0
                ) wo on wo.invoice_id = i.id
              where 
              -- i.created_at > crAT 
              -- i.created_at > '2020-01-01'
              -- and u.property_id = ${connection.escape(property_id)} 
              -- f.facility_id = 749
              -- i.status = 1
              cl.contact_id = ${connection.escape(contact_id)}
                  -- cl.lease_id = lid

              union 

              select distinct
              -- 'payment'
              p.credit_type as transaction_type
              , '' as invoice_id
              , null as invoice_nbr
              , p.id as payment_id
              , ifnull( p.number, '' ) as payment_number
              -- , ifnull( p.payment_methods_id, -1 ) as payment_methods_id
              , ifnull( p.contact_id, -1 ) as contact_id
              , null as lease_id
              -- , u.property_id 
              , null as lease_id
              , null as unit_nbr
              , null as unit_type 
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              -- , ifnull( p.credit_type, 'unknown' ) as credit_type
              , ifnull( p.created, '' ) as created
              -- , ifnull( pm.name_on_card, '' ) as name_on_card
              , ifnull( pm.type, '' ) as type
              , ifnull( -1 * p.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( p.date, '' ) as transaction_date 
              , 'Payment : ' as description_prefix
              , case 
              when p.method = 'check' then concat('Check ', p.number )
                      when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
              when p.method = 'cash' then 'Cash'
              when p.method = 'giftcard' then 'GiftCard'
                      when p.method = 'credit' then 'Credits'
              -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              else p.method
              end as description_text 
              , '' as note
              from payments p 
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              left join properties f on f.id = p.property_id
              where 
              -- p.status = 1 and 
                  p.property_id = ${connection.escape(property_id)}
              -- and p.credit_type <> 'loss'	-- = 'payment'  
              and p.contact_id = ${connection.escape(contact_id)}
                  -- and p.lease_id = lid
                  and p.method not in ('credit', 'loss')

              union 

              select distinct
              -- 'Credits'
              -- p.credit_type as transaction_type
                  'payment' as transaction_type
              , '' as invoice_id
              , null as invoice_nbr
              , p.id as payment_id
              , ifnull( p.number, '' ) as payment_number
              -- , ifnull( p.payment_methods_id, -1 ) as payment_methods_id
              , ifnull( p.contact_id, -1 ) as contact_id
              , null as lease_id
              -- , u.property_id 
              , null as lease_id
              , null as unit_nbr
              , null as unit_type 
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              -- , ifnull( p.credit_type, 'unknown' ) as credit_type
              , ifnull( p.created, '' ) as created
              -- , ifnull( pm.name_on_card, '' ) as name_on_card
              , ifnull( pm.type, '' ) as type
              , ifnull( -1 * ip.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( p.date, '' ) as transaction_date 
              , 'Payment : ' as description_prefix
              , case 
              when p.method = 'check' then concat('Check ', p.number )
                      when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
              when p.method = 'cash' then 'Cash'
              when p.method = 'giftcard' then 'GiftCard'
                      when p.method = 'credit' then 'Credits'
              -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              else p.method
              end as description_text 
              , '' as note
              from payments p 
              join (select payment_id, sum(amount) as amount from invoices_payments group by payment_id) ip on ip.payment_id = p.id
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              left join properties f on f.id = p.property_id
              where 
              -- p.status = 1 and 
                  p.property_id = ${connection.escape(property_id)}
              -- and p.credit_type <> 'loss'	-- = 'payment'  
              and p.contact_id = ${connection.escape(contact_id)}
                  -- and p.lease_id = lid
                  and p.method = 'credit'
                  
              union 

              select distinct
              case when p.method = 'card' then 'payment void' else'reversal' end as transaction_type
              , '' as invoice_id
              , null as invoice_nbr
              , p.id as payment_id
              , ifnull( p.number, '' ) as payment_number
              , ifnull( p.contact_id, -1 ) as contact_id
              , null as lease_id
              , null as lease_id
              , null as unit_nbr
              , null as unit_type 
              -- , p.property_id 
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              -- , ifnull( p.credit_type, 'unknown' ) as credit_type
              , ifnull( p.created, '' ) as created
              , ifnull( pm.type, '' ) as type
              , ifnull( -1 * p.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( p.date, '' ) as transaction_date 
              , case when p.method = 'card' then 'Payment Void : ' else 'Reversal : ' end as description_prefix
              , case 
              when p.method = 'check' then concat('Check ', p.number )
                      when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
              when p.method = 'cash' then 'Cash'
              when p.method = 'giftcard' then 'GiftCard'
                      when p.method = 'credit' then 'Credits'
              when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              else p.method
              end as description_text
              , concat('For Payment [', case 
                  when p.method = 'check' then concat('Check ', p.number )
                              when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                  when p.method = 'cash' then 'Cash'
                  when p.method = 'giftcard' then 'GiftCard'
                              when p.method = 'credit' then 'Credits'
                  -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                  when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                  else p.method
                  end,
                  '] made on ', date_format(p.date, '%b %e, %Y'))
                      as note   
              from payments p 
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              left join properties f on f.id = p.property_id
              where 
              p.status != 1
                  and p.property_id = ${connection.escape(property_id)}
              and p.contact_id = ${connection.escape(contact_id)}
              -- and p.lease_id = lid
              -- and p.credit_type <> 'loss'	-- = 'payment'  
                  and p.method not in ('credit', 'loss')
                  
              union 

              select distinct
              'auction payment' as transaction_type
              , '' as invoice_id
              , null as invoice_nbr
              , p.id as payment_id
              , ifnull( p.number, '' ) as payment_number
              -- , ifnull( p.payment_methods_id, -1 ) as payment_methods_id
              , ifnull( p.contact_id, -1 ) as contact_id
              , null as lease_id
              -- , u.property_id 
              , null as lease_id
              , null as unit_nbr
              , null as unit_type 
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              , ifnull( p.created, '' ) as created
              , ifnull( pm.type, '' ) as type
              , ifnull( -1 * p.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( p.date, '' ) as transaction_date 
              , 'Auction Payment : ' as description_prefix
              , case 
              when p.method = 'check' then concat('Check ', p.number )
                      when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
              when p.method = 'cash' then 'Cash'
              when p.method = 'giftcard' then 'GiftCard'
                      when p.method = 'credit' then 'Credits'
              -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              else p.method
              end as description_text 
              , '' as note  
              from payments p 
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              left join properties f on f.id = p.property_id
              where 
              -- p.status = 1 and 
                  p.credit_type = 'auction' 
                  and p.property_id = ${connection.escape(property_id)}
              and p.contact_id = ${connection.escape(contact_id)}
              -- and p.lease_id = lid
                  -- and p.method not in ('credit', 'loss')
                  
              union 

              select distinct
              r.type as transation_type
              , r.id as invoice_id
              , null as invoice_nbr
              , r.payment_id
              , ifnull( p.number, '' ) as payment_number
              , ifnull( p.contact_id, -1 ) as contact_id
              , null as lease_id
              , null as unit_nbr
              , null as unit_type 
                  , null as status
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              -- , ifnull( p.credit_type, 'unknown' ) as credit_type
              , ifnull( r.date, '' ) as created
              , ifnull( pm.type, '' ) as type
              , ifnull( r.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( r.date, '' ) as transaction_date 
              , 'Refund : ' as description_prefix
              , case 
              when p.method = 'check' then concat('Check ', p.number )
                      when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
              when p.method = 'cash' then 'Cash'
              when p.method = 'giftcard' then 'GiftCard'
                      when p.method = 'credit' then 'Credits'
              -- when p.method = 'card' then ifnull(concat( upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
              else p.method
              end as description_text 
              -- For Payment *** 7242 made on Dec 15, 2020		
              , concat('For Payment [', case 
                  when p.method = 'check' then concat('Check ', p.number )
                              when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                  when p.method = 'cash' then 'Cash'
                  when p.method = 'giftcard' then 'GiftCard'
                              when p.method = 'credit' then 'Credits'
                  -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                  when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                  else p.method
                  end,
                  '] made on ', date_format(p.date, '%b %e, %Y'))
                      as note

              from refunds r
              join payments p on p.id = r.payment_id
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              where 
              -- p.status = 1 and 
                  p.property_id = ${connection.escape(property_id)} 
              and p.contact_id = ${connection.escape(contact_id)}
              -- and p.lease_id = lid
                  
              union 

              select distinct
              'write-off' as transaction_type
              , i.id as invoice_id
              , i.number as invoice_nbr
              , p.id as payment_id
              , ifnull( p.number, '' ) as payment_number
              , ifnull( p.contact_id, -1 ) as contact_id
              -- , i.ext_lease_id as lease_id 
              , i.lease_id as lease_id

              , u.number as unit_nbr
              , u.type as unit_type 
                  , 'Write-Off' as status
              -- , p.property_id 
              , ifnull( p.date, 'unknown' ) as date
              , ifnull( p.method, 'unknown' ) as method
              , ifnull( p.created, '' ) as created
              , ifnull( pm.type, '' ) as type
              , ifnull( -1 * ip.amount, 0 ) as amount
              , ifnull( pm.card_type, '' ) as card_type
              , ifnull( p.date, '' ) as transaction_date 
                  , 'Write Off : ' as description_prefix
                  , concat('Invoice #', i.number) as description_text
              , '' as note

              from payments p 
              join contacts c on c.id = p.contact_id
              left join payment_methods pm on pm.id = p.payment_methods_id
              left join invoices_payments ip on ip.payment_id = p.id 
              left join invoices i on i.id = ip.invoice_id
              left join leases l on l.id = i.lease_id
              left join units u on u.id = l.unit_id
              where 
              p.status = 1
              and p.credit_type = 'loss'	-- ie: write off 
                  and p.property_id = ${connection.escape(property_id)}
              and p.contact_id = ${connection.escape(contact_id)}
              -- and p.lease_id = lid

              ) x   
              order by transaction_date desc, transaction_type desc, id desc, invoice_id desc, payment_id desc
              )
              select * from cta_x
              where 
              transaction_date between ${connection.escape(start_dt)} and ${connection.escape(end_dt)}
              ) xxx
              order by transaction_date desc, transaction_type desc, id desc, id desc`;
    return connection.queryAsync(sql);
  },

  getLedgerByLease(connection, lease_id, date_ranges){

    console.log("Lease: ", lease_id);

    let { start_dt, end_dt } = date_ranges;
    if(!start_dt) start_dt = '1900-01-01';
    if(!end_dt) end_dt = '2525-01-01';

    var sql = `select 
                  UUID() as row_guid
                  , transaction_date as date
                  , transaction_type as type
                  , id
                  , nbr as number
                  , ifnull( lease_id, '') as lease_id
                  , ifnull( unit_nbr, '') as unit_nbr
                  , ifnull( unit_type, '') as unit_type
                  , ifnull( description, '') as description
                  , ifnull( description_text, '') as description_text
                  , ifnull( status, '') as status
                  , transaction_amt as amount
                  , sum(case when status = 'void' then 0 else transaction_amt end) over (order by transaction_date, transaction_type, id) as running_balance
                  , ifnull( note, '') as note
                  , invoice_id
                  , payment_id
                        -- , invoice_payment_id
              from (

              with cta_x as (
                select 
                  transaction_date
                  , transaction_type
                  -- , ifnull( invoice_id, '' ) as invoice_id
                  -- , ifnull( invoice_nbr, '' ) as invoice_nbr
                  -- , ifnull( payment_id, '' ) as payment_id
                  -- , ifnull( payment_nbr, '') as payment_nbr
                        , case 
                    when transaction_type in ('invoice', 'refund', 'void') then invoice_id 
                            when transaction_type in ('write-off') then concat(payment_id,invoice_id )
                    when transaction_type in ('payment', 'credit', 'reversal', 'void payment', 'payment void', 'auction payment') then payment_id 
                            end as id
                        , case 
                    when transaction_type in ('invoice', 'refund', 'void') then  ifnull( invoice_nbr, '')
                    when transaction_type in ('payment', 'credit', 'reversal', 'void payment', 'payment void', 'auction payment', 'write-off') then ifnull( payment_nbr, '')
                            end as nbr
                  , ifnull( lease_id, '') as lease_id
                  , ifnull( unit_nbr, '') as unit_nbr
                        , ifnull( unit_type, '') as unit_type
                        , ifnull( description_prefix, '') as description
                        , ifnull( description_text, '') as description_text
                        , ifnull( status, '') as status
                  , invoice_amount as transaction_amt
                  -- , sum(case when status = 'void' then 0 else invoice_amount end) over (order by transaction_date, transaction_type, invoice_id, payment_id) as running_balance
                        -- , sum(invoice_amount) over (order by transaction_date, transaction_type, invoice_id desc, payment_id) as running_balance
                        , ifnull( note, '') as note
                  , case when transaction_type in ( 'payment', 'auction payment',  'write-off') then invoice_id else '' end as invoice_id
                        , case when transaction_type = 'refund' then payment_id else '' end as payment_id
                        , ifnull( invoice_payment_id, -1 ) as invoice_payment_id
                from (  
                  select 
                  case when i.status = 1 then 'invoice'
                    else 'void'
                    end as transaction_type
                  , i.id as invoice_id
                  , i.number as invoice_nbr
                  , '' as payment_id
                  , null as payment_nbr
                  , ifnull( i.contact_id, cl.contact_id) as contact_id 
                  -- , cl.contact_id
                  , i.lease_id 
                  -- , u.property_id 
                  , ifnull( u.number, '' ) as unit_nbr 
                        , ifnull( u.type, '' ) as unit_type 
                  , case 
                    -- when !isnull(wo.invoice_id ) then 'Write-Off'
                    -- when !isnull(x.status_cd ) then x.status_cd
                            -- when !isnull(x.ui_cd ) then x.ui_cd
                    when (i.void_date is not null and i.void_date <= ${connection.escape(end_dt)}) then 'Void'
                    -- when i.paid = 1 then 'Paid'
                            when ip.applied_payment >= (i.subtotal+i.total_tax - i.total_discounts) || (i.subtotal+i.total_tax - i.total_discounts) = 0 then 'Paid'
                            -- when now() > i.due then 'Past Due'
                            when date(CONVERT_TZ( now(), 'UTC', ifnull(pr.utc_offset, '-8:00' ))) > i.due then 'Past Due'
                            else 'Open'
                            end as status
                  , i.created_at 
                  , i.status as hb_inv_status
                  -- , i.type 
                  , ifnull( i.period_start, '' ) as period_start 
                  , ifnull( i.period_end, '' ) as period_end
                  , i.subtotal + i.total_tax - i.total_discounts as 'invoice_amount'
                  -- , i.total_payments 
                  , ifnull( i.due, '' ) as due_date
                  -- , case when i.status = 1 then i.created_at
                  --	else ifnull( i.period_start, '' ) 
                        --   end as transaction_date 
                  , ifnull( i.period_start, '' )  as transaction_date
                        , 'Invoice # ' as description_prefix
                        , i.number as description_text
                        , case when !isnull(i.void_date) then concat( 'This invoice was voided on ', i.void_date) else null end as note
                        , -1 as invoice_payment_id

                from invoices i 
                join leases l on l.id = i.lease_id 
                join units u on u.id = l.unit_id -- and u.property_id = pID
                    join properties pr on pr.id = u.property_id
                -- join ledger.facility f on f.hb_property_id = u.property_id
                left join (select distinct contact_id, lease_id from contact_leases cl -- where cl.type = 'tenant' -- and cl.primary = 1
                    ) as cl on cl.lease_id = l.id
                    -- left join ledger.invoice_status ivs on ivs.invoice_id = inv.invoice_id
                    left join (select invoice_id, round(sum(amount),2) applied_payment from invoices_payments group by invoice_id) ip on ip.invoice_id = i.id
                    /*
                    left join (select distinct ip.invoice_id 
                      from invoices_payments ip 
                      join payments p on p.id = ip.payment_id 
                                join invoices i on i.id = ip.invoice_id and i.lease_id = ${connection.escape(lease_id)}
                                where 
                        p.status = 1
                        and p.credit_type = 'loss'	-- ie: write off 
                        -- and p.property_id = pID
                        -- and p.contact_id = tenant_id
                                    and ip.amount > 0
                      ) wo on wo.invoice_id = i.id  */
                      
                where 
                  -- f.facility_id = 749
                  -- i.status = 1
                  -- cl.contact_id = tenant_id
                  -- and u.property_id = pID 
                        -- cl.lease_id = ${connection.escape(lease_id)}
                        l.id = ${connection.escape(lease_id)}

                union all

                  select
                  -- 'payment'
                  p.credit_type as transaction_type
                  , ifnull( ip.invoice_id, '') as invoice_id
                  , null as invoice_nbr
                  , p.id as payment_id
                  , ifnull( p.number, '' ) as payment_number
                  , ifnull( p.contact_id, -1 ) as contact_id
                  , i.lease_id as lease_id
                  , ifnull( u.number, '' ) as unit_nbr
                        , ifnull( u.type, '') as unit_type
                        , ip.id as status
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  , ifnull( p.created, '' ) as created
                  , ifnull( pm.type, '' ) as type
                  , ifnull( -1 * ip.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( p.date, '' ) as transaction_date 
                  , 'Payment Applied : ' as description_prefix
                  , case 
                    when p.method = 'check' then concat('Check ', p.number )
                            when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                    when p.method = 'cash' then 'Cash'
                    when p.method = 'giftcard' then 'GiftCard'
                            when p.method = 'credit' then 'Credits'
                    -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    else p.method
                    end as description_text 
                  , '' as note
                        , ip.id as invoice_payment_id
                from payments p 
                join contacts c on c.id = p.contact_id
                join invoices_payments ip on ip.payment_id = p.id -- and ip.amount != 0
                join invoices i on i.id = ip.invoice_id 
                join leases l on l.id = i.lease_id and l.id = ${connection.escape(lease_id)}
                join units u on u.id = l.unit_id
                    -- left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                    /*
                join (
                  select ip.payment_id, i.lease_id, count(*) as invoice_cnt, sum(ip.amount) as amount, max( u.number ) as unit_nbr, max( u.type) as unit_type 
                  from invoices_payments ip
                  join invoices i on i.id = ip.invoice_id 
                        join leases l on l.id = i.lease_id
                  join units u on u.id = l.unit_id
                  -- join contact_leases cl on cl.lease_id = i.lease_id and cl.type = 'tenant' -- and cl.primary = 1 
                        left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                  where
                    i.lease_id = ${connection.escape(lease_id)}
                  group by ip.payment_id, i.lease_id
                  ) ip on ip.payment_id = p.id
                        */
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join properties f on f.id = p.property_id
                where 
                  -- p.status = 1 and
                        ifnull(p.method, '') not in ('credit', 'loss')
                  and !isnull( ip.payment_id)
                  -- and p.credit_type <> 'loss'	-- = 'payment'  
                  -- and p.contact_id = tenant_id
                        -- and p.property_id = pID
                        -- and cl.lease_id = ${connection.escape(lease_id)}

                union 

                  select distinct
                  -- 'Credits'
                  -- p.credit_type as transaction_type
                        'payment' as transaction_type
                  , '' as invoice_id
                  , null as invoice_nbr
                  , p.id as payment_id
                  , ifnull( p.number, '' ) as payment_number
                  -- , ifnull( p.payment_methods_id, -1 ) as payment_methods_id
                  , ifnull( p.contact_id, -1 ) as contact_id
                  , p.lease_id as lease_id
                  -- , u.property_id 
                  -- , null as xxxxx
                  -- , ip.unit_nbr
                  -- , ip.unit_type 
                  , ifnull( u.number, '' ) as unit_nbr
                        , ifnull( u.type, '') as unit_type
                        , null as status
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  -- , ifnull( p.credit_type, 'unknown' ) as credit_type
                  , ifnull( p.created, '' ) as created
                  -- , ifnull( pm.name_on_card, '' ) as name_on_card
                  , ifnull( pm.type, '' ) as type
                  , ifnull( -1 * ip.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( p.date, '' ) as transaction_date 
                  , 'Payment Applied : ' as description_prefix
                  , case 
                    when p.method = 'check' then concat('Check ', p.number )
                            when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                    when p.method = 'cash' then 'Cash'
                    when p.method = 'giftcard' then 'GiftCard'
                            when p.method = 'credit' then 'Credits'
                    -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    else p.method
                    end as description_text 
                  , '' as note
                        , ip.id as invoice_payment_id
                from payments p 
                join contacts c on c.id = p.contact_id
                join invoices_payments ip on ip.payment_id = p.id -- and ip.amount = 0
                join invoices i on i.id = ip.invoice_id 
                join leases l on l.id = i.lease_id and l.id = ${connection.escape(lease_id)}
                join units u on u.id = l.unit_id
                    -- left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                /*
                join (
                  select ip.payment_id, i.lease_id, count(*) as invoice_cnt, sum(ip.amount) as amount, max( u.number ) as unit_nbr, max( u.type) as unit_type 
                  from invoices_payments ip
                  join invoices i on i.id = ip.invoice_id 
                        join leases l on l.id = i.lease_id
                  join units u on u.id = l.unit_id
                        left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                  where
                    i.lease_id = ${connection.escape(lease_id)}
                  group by ip.payment_id, i.lease_id
                  ) ip on ip.payment_id = p.id
                        */
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join properties f on f.id = p.property_id
                where 
                  p.status = 1 
                        and p.method = 'credit'
                  and !isnull( ip.payment_id)
                  -- and p.contact_id = tenant_id
                        -- and p.property_id = pID
                        -- and cl.lease_id = ${connection.escape(lease_id)}
                        
                union all

                  select distinct
                  case when p.method = 'card' then 'payment void' else'reversal' end as transaction_type
                  , '' as invoice_id
                  , null as invoice_nbr
                  , p.id as payment_id
                  , ifnull( p.number, '' ) as payment_number
                  , ifnull( p.contact_id, -1 ) as contact_id
                  , i.lease_id as lease_id
                  -- , null as xxxxx
                  -- , ifnull( ip.unit_nbr, '' )  as unit_nbr
                  -- , ifnull( ip.unit_type, '' ) as unit_type 
                        , ifnull( u.number, '' ) as unit_nbr
                        , ifnull( u.type, '') as unit_type
                        , ip.id as status
                  -- , p.property_id 
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  -- , ifnull( p.credit_type, 'unknown' ) as credit_type
                  , ifnull( p.created, '' ) as created
                  , ifnull( pm.type, '' ) as type
                  -- , ifnull( -1 * ip.amount, 0 ) as amount
                        , ifnull( ip.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( p.date, '' ) as transaction_date 
                  , case when p.method = 'card' then 'Payment Void : ' else 'Reversal : ' end as description_prefix
                  , case 
                    when p.method = 'check' then concat('Check ', p.number )
                            when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                    when p.method = 'cash' then 'Cash'
                    when p.method = 'giftcard' then 'GiftCard'
                            when p.method = 'credit' then 'Credits'
                    when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    else p.method
                    end as description_text
                  , concat('For Payment [', case 
                        when p.method = 'check' then concat('Check ', p.number )
                                    when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                        when p.method = 'cash' then 'Cash'
                        when p.method = 'giftcard' then 'GiftCard'
                                    when p.method = 'credit' then 'Credits'
                        -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                        when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                        else p.method
                        end,
                        '] made on ', date_format(ifnull(ip.date, p.date), '%b %e, %Y'))
                            as note    
                  , ip.id as invoice_payment_id
                from payments p 
                join contacts c on c.id = p.contact_id
                    join invoices_payments ip on ip.payment_id = p.id
                  join invoices i on i.id = ip.invoice_id 
                        join leases l on l.id = i.lease_id and l.id = ${connection.escape(lease_id)}
                  join units u on u.id = l.unit_id
                    /*
                join (
                  select ip.payment_id, i.lease_id, sum(ifnull( ipd.amount, ifnull( ip.amount, 0 ))) as amount, -- '' as unit_nbr, '' as unit_type
                    max( u.number ) as unit_nbr, max( u.type) as unit_type
                  from invoices_payments ip
                  join invoices i on i.id = ip.invoice_id 
                        join leases l on l.id = i.lease_id
                  join units u on u.id = l.unit_id
                  -- join contact_leases cl on cl.lease_id = i.lease_id and cl.type = 'tenant' -- and cl.primary = 1 
                        left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                  where
                    -- cl.lease_id = ${connection.escape(lease_id)}
                            i.lease_id = ${connection.escape(lease_id)}
                  group by ip.payment_id, i.lease_id
                  ) ip on ip.payment_id = p.id
                        */
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join properties f on f.id = p.property_id
                    -- left join (select distinct payment_id, date from led__unapplied_payment) as dp on dp.payment_id = p.id
                    -- left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                where 
                  p.status != 1
                  -- and p.credit_type <> 'loss'	-- = 'payment'  
                        and ifnull(p.method, '') not in ('credit', 'loss')
                        and !isnull( ip.payment_id)
                        -- and p.property_id = pID
                  -- and p.contact_id = tenant_id
                  -- and cl.lease_id = ${connection.escape(lease_id)}

                        
                union 

                  select distinct
                  'auction payment' as transaction_type
                  , '' as invoice_id
                  , null as invoice_nbr
                  , p.id as payment_id
                  , ifnull( p.number, '' ) as payment_number
                  -- , ifnull( p.payment_methods_id, -1 ) as payment_methods_id
                  , ifnull( p.contact_id, -1 ) as contact_id
                  , null as lease_id
                  -- , u.property_id 
                  , null as lease_id
                  , null as unit_nbr
                  , null as unit_type 
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  , ifnull( p.created, '' ) as created
                  , ifnull( pm.type, '' ) as type
                  , ifnull( -1 * ip.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( p.date, '' ) as transaction_date 
                  , 'Auction Payment : ' as description_prefix
                  , case 
                    when p.method = 'check' then concat('Check ', p.number )
                            when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                    when p.method = 'cash' then 'Cash'
                    when p.method = 'giftcard' then 'GiftCard'
                            when p.method = 'credit' then 'Credits'
                    -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    else p.method
                    end as description_text 
                  , '' as note     
                        , -1 as invoice_payment_id
                from payments p 
                join contacts c on c.id = p.contact_id
                join (
                  select payment_id, sum(ip.amount) as amount 
                  from invoices_payments ip
                  join invoices i on i.id = ip.invoice_id 
                  join contact_leases cl on cl.lease_id = i.lease_id and cl.type = 'tenant' -- and cl.primary = 1 
                  where
                    cl.lease_id = ${connection.escape(lease_id)}
                  group by payment_id
                  ) ip on ip.payment_id = p.id
                left join payment_methods pm on pm.id = p.payment_methods_id
                left join properties f on f.id = p.property_id
                where 
                  p.status = 1
                  and p.credit_type = 'auction' 
                        and !isnull( ip.payment_id)
                  -- and p.method not in ('credit', 'loss')
                        -- and p.property_id = pID
                  -- and p.contact_id = tenant_id
                  -- and cl.lease_id = ${connection.escape(lease_id)}

                      
                union all

                  select distinct
                  r.type as transation_type
                  , r.id as invoice_id
                  , null as invoice_nbr
                  , r.payment_id
                  , ifnull( p.number, '' ) as payment_number
                  , ifnull( p.contact_id, -1 ) as contact_id
                  , i.lease_id as lease_id
                  , u.number as unit_nbr
                  , u.type as unit_type 
                        , ip.id as status
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  -- , ifnull( p.credit_type, 'unknown' ) as credit_type
                  , ifnull( p.created, '' ) as created
                  , ifnull( pm.type, '' ) as type
                  -- , ifnull( r.amount, 0 ) as amount
                        , ifnull( r.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( r.date, '' ) as transaction_date 
                  , 'Refund : ' as description_prefix
                  , case 
                    when p.method = 'check' then concat('Check ', p.number )
                            when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                    when p.method = 'cash' then 'Cash'
                    when p.method = 'giftcard' then 'GiftCard'
                            when p.method = 'credit' then 'Credits'
                    -- when p.method = 'card' then ifnull(concat( upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                    else p.method
                    end as description_text 
                  -- For Payment *** 7242 made on Dec 15, 2020		
                  , concat('For Payment [', case 
                        when p.method = 'check' then concat('Check ', p.number )
                                    when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end,'') )
                        when p.method = 'cash' then 'Cash'
                        when p.method = 'giftcard' then 'GiftCard'
                                    when p.method = 'credit' then 'Credits'
                        -- when p.method = 'card' then ifnull(concat(upper(pm.card_type), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                        when p.method = 'card' then ifnull(concat(upper(substring(pm.card_type,1,1)), lower(substring(pm.card_type,2,length(pm.card_type)-1)), ' **** ', ifnull(pm.card_end,'')), 'unknown card')
                        else p.method
                        end,
                        '] made on ', date_format(p.date, '%b %e, %Y'))
                            as note
                  , ip.id as invoice_payment_id
                from refunds r
                join payments p on p.id = r.payment_id
                    join invoices_payments ip on ip.payment_id = r.payment_id -- and ip.amount = 0
                join invoices i on i.id = ip.invoice_id 
                    join leases l on l.id = i.lease_id
                    join units u on u.id = l.unit_id
                left join payment_methods pm on pm.id = p.payment_methods_id
                    -- left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                where 
                  p.status = 1
                        -- and p.property_id = pID 
                  -- and p.contact_id = tenant_id
                  -- and cl.lease_id = ${connection.escape(lease_id)}
                        and i.lease_id = ${connection.escape(lease_id)}
                        -- and ifnull(ipd.amount, ip.amount) != ip.amount
                      
                      
                union 
                    
                select distinct
                  'write-off' as transaction_type
                  , i.id as invoice_id
                  , i.number as invoice_nbr
                  , p.id as payment_id
                  , ifnull( p.number, '' ) as payment_number
                  , ifnull( p.contact_id, -1 ) as contact_id
                  -- , i.ext_lease_id as lease_id 
                  , i.lease_id as lease_id
                  
                  , u.number as unit_nbr
                  , u.type as unit_type 
                        , null as paid
                  -- , p.property_id 
                  , ifnull( p.date, 'unknown' ) as date
                  , ifnull( p.method, 'unknown' ) as method
                  , ifnull( p.created, '' ) as created
                  , ifnull( pm.type, '' ) as type
                  , ifnull( -1 * ip.amount, 0 ) as amount
                  , ifnull( pm.card_type, '' ) as card_type
                  , ifnull( p.date, '' ) as transaction_date 
                        , 'Write Off : ' as description_prefix
                        , concat('Invoice #', i.number) as description_text
                  , '' as note
                  , ip.id as invoice_payment_id
                from payments p 
                join contacts c on c.id = p.contact_id
                    -- join (select contact_id, lease_id from contact_leases cl where cl.type = 'tenant' -- and cl.primary = 1
                --		) as cl on cl.contact_id = c.id
                -- left join ledger.invoice i on i.ext_invoice_id = ip.invoice_id
                left join payment_methods pm on pm.id = p.payment_methods_id
                    join invoices_payments ip on ip.payment_id = p.id 
                    join invoices i on i.id = ip.invoice_id
                    join leases l on l.id = i.lease_id
                    join units u on u.id = l.unit_id
                  -- left join led__unapplied_payment ipd on ipd.invoice_payment_id = ip.id and ipd.action = 'updated'
                where 
                  p.status = 1
                  and p.credit_type = 'loss'	-- ie: write off 
                        -- and p.property_id = pID
                  -- and p.contact_id = tenant_id
                  and i.lease_id = ${connection.escape(lease_id)}

                ) x   
                -- order by transaction_date desc, transaction_type desc, invoice_id desc, payment_id desc
              )
              select * from cta_x
              where 
                transaction_date between ${connection.escape(start_dt)} and ${connection.escape(end_dt)}
              ) xxx
              order by transaction_date desc, transaction_type desc, id desc, id desc, invoice_payment_id desc `;
    return connection.queryAsync(sql);
  },

  getInvoiceLines(connection, invoice_id){
    var sql = `select 
                il.id as invoice_line_id
                , il.invoice_id
                , ifnull( il.description, ifnull( p.name, ifnull( p.description, '' ) ) ) as description
                , il.cost as amount
                , il.start_date
                , ifnull( il.end_date, '') as end_date
                , il.qty as quantity
                , ifnull( p.default_type, 'product' ) as product_type
              from invoice_lines il
              left join products p on p.id = il.product_id
              where
                il.invoice_id = ${connection.escape(invoice_id)}
              union
              
              select x.invoice_line_id , x.invoice_id, x.description, x.amount, x.start_date, x.end_date, x.quantity, x.product_type from (
                select 0 as invoice_line_id, il.invoice_id, 'Tax' as description, sum(til.amount) as amount, '' as start_date, '' as end_date, '1' as quantity, 'product' as product_type
                from tax_line_items til
                  join invoice_lines il on il.id = til.invoice_line_id
                join invoices i on i.id = il.invoice_id
                  where i.id = ${connection.escape(invoice_id)}
              ) x
              join invoice_lines il on il.invoice_id = x.invoice_id
			        join tax_line_items til on til.invoice_line_id = il.id`;
    return connection.queryAsync(sql);
  },

  getPaymentInvoices(connection, payment_id, params = {}){
    let { lease_id, invoice_id } = params
    var sql = `select 
                i.id as invoice_id
                , i.number as invoice_nbr
                , i.lease_id
                , u.number as unit_nbr
                , u.type as unit_type
                , i.date as date
                , 'Invoice # ' as description_prefix
                    , i.number as description_text
                    , ip.amount
                , i.period_start as start_date
                , i.period_end as end_date
              from invoices_payments ip
              join invoices i on i.id = ip.invoice_id
              join leases l on l.id = i.lease_id
              join units u on u.id = l.unit_id
              where
                ip.payment_id = ${connection.escape(payment_id)}`;

    if(lease_id){
      sql += ` and l.id = ${connection.escape(lease_id)}`;
    }

    if(invoice_id){
      sql += `and ip.invoice_id = ${connection.escape(invoice_id)}`;
    }
    
    return connection.queryAsync(sql);
  },

  findGlEventDetailsByTemplateId(connection, accounting_template_id) {
    let sql =`select  
                ec.id,
                ec.gl_event_id,
                ec.book_id,
                e.name as event_name,
                cr_acc.id as credit_account_id,
                cr_acc.code as credit_account_code, 
                cr_acc.name as credit_account_name,
                cr_acc.deleted_at as credit_account_deleted_at,
                dr_acc.id as debit_account_id,
                dr_acc.code as debit_account_code, 
                dr_acc.name as debit_account_name,
                dr_acc.deleted_at as debit_account_deleted_at
      
              from gl_event_company ec
              inner join gl_events e on e.id = ec.gl_event_id 
              left join gl_accounts cr_acc on cr_acc.id = ec.gl_account_credit_id
              left join gl_accounts dr_acc on dr_acc.id = ec.gl_account_debit_id
              where ec.accounting_template_id = ${connection.escape(accounting_template_id)}
              and ec.active = 1;`
              
    return connection.queryAsync(sql);
  },

  findGlAccountsbyCompanyId (connection,company_id){
    var sql = `select ac.id, ac.company_id, ac.code, ac.name from gl_accounts ac where active = 1 and company_id = ${connection.escape(company_id)}`;
    return connection.queryAsync(sql);
  },

  getPropertiesOfCompany (connection, payload){
    const { company_id, base_properties, filteredProperties } = payload;
    let sql = `SELECT p.*,pat.accounting_template_id,acs.book_id,acs.description as book_name 
                FROM property_accounting_template pat
                INNER JOIN accounting_setup acs ON pat.accounting_template_id = acs.accounting_template_id
                INNER JOIN accounting_template act ON pat.accounting_template_id = act.id
                INNER JOIN properties p ON pat.property_id = p.id
               WHERE act.company_id = ${company_id} AND act.deleted_at is null AND pat.deleted_at is null AND acs.active = 1 AND acs.deleted_at is null`;
    
    if (filteredProperties.length) {
      sql += ' AND p.id in (' + filteredProperties.map(r => connection.escape(r)).join(',') + ');';
    } else if (base_properties.length) {
      sql += ' AND p.id in (' + base_properties.map(r => connection.escape(r)).join(',') + ');';
    }

    return connection.queryAsync(sql);
  },

  findGlEventsIdbyBookId(connection,book_id){
    var sql = `select id as gl_event_id, active from gl_events where active = 1 and (${book_id == 0? 'cash' : (book_id == 1? 'accrual' : 'cash = 1 or accrual')} = 1)`;
    console.log("findGlEventsIdbyBookId =>",sql);
    return connection.queryAsync(sql);
  },

  findGlEventbyId(connection,event_id){
    var sql = "Select * from gl_event_company where active = 1 and id = " +  connection.escape(event_id);
    return connection.queryAsync(sql).then(function(sqlRes) {
      return (sqlRes.length) ? sqlRes[0]: null;
    });
  },

  findOverridesByEventId(connection,event_id){
    var sql = "Select * from gl_event_override where active = 1 and gl_event_company_id = " +  connection.escape(event_id);
    return connection.queryAsync(sql).then(function(sqlRes) {
      return (sqlRes.length) ? sqlRes: null;
    });
  },

  removeOverride(connection,contact_id,ids){
    return Promise.resolve().then(() => {

      var sql = "update gl_event_override set active = 0, deleted_at = now(), deleted_by = " + connection.escape(contact_id) + " where";
          sql += " id in (" + ids + ")";
      return connection.queryAsync(sql);
    })
  },

  saveOverride(connection,data,override_id){
    var sql;
    if(override_id){
      sql = "update gl_event_override set ?  where id = " + connection.escape(override_id);
    } else {
      sql = "insert into gl_event_override set ?";
    }
    return connection.queryAsync(sql, data);
  },

  bulkSaveGlEventOverrides(connection, payload) {
    const { data } = payload;
    const sql = `insert into gl_event_override 
    (company_id, gl_event_company_id, product_id, credit_debit_type, actual_gl_account_id, override_gl_account_id, active, created_by, product_type) values ? `;

    console.log('bulkSaveGlEvents data: ', data);

    return connection.queryAsync(sql, [
      data.map(d => [
        connection.escape(d.company_id),
        connection.escape(d.gl_event_company_id),
        d.product_id ? connection.escape(d.product_id) : null,
        d.credit_debit_type,
        connection.escape(d.actual_gl_account_id),
        connection.escape(d.override_gl_account_id),
        connection.escape(d.active),
        connection.escape(d.created_by),
        d.product_type ? d.product_type : null
      ])
    ]);
  },

  // Sb: Optimize if possible
  bulkSaveGlEvents(connection, payload) {
    const { data } = payload;
    const sql = `insert into gl_event_company 
    (gl_event_id, book_id, company_id, gl_account_credit_id, gl_account_debit_id, active, accounting_template_id) values ? `;

    console.log('bulkSaveGlEvents data: ', data);

    return connection.queryAsync(sql, [
      data.map(d => [
        connection.escape(d.gl_event_id),
        d.book_id,
        connection.escape(d.company_id),
        d.gl_account_credit_id ? connection.escape(d.gl_account_credit_id) : null,
        d.gl_account_debit_id ? connection.escape(d.gl_account_debit_id) : null,
        connection.escape(d.active),
        connection.escape(d.accounting_template_id),
      ])
    ]);
  },

  bulkSaveGlDefaultAccounts(connection, payload) {
    const { data } = payload;
    const sql = `insert into gl_template_default_accounts 
    (gl_account_id, accounting_template_id, gl_default_subtype_id, created_by, modified_by) values ? `;

    console.log('bulkSaveGlDefaultAccounts data: ', data);

    return connection.queryAsync(sql, [
      data.map(d => [
        d.gl_account_id ? connection.escape(d.gl_account_id) : null,
        connection.escape(d.accounting_template_id),
        connection.escape(d.gl_default_subtype_id),
        d.created_by,
        d.modified_by
      ])
    ]);
  },

  saveJournalEvent(connection,data,event_id){
    var sql;
    if(event_id){
      sql = "update gl_event_company set ?  where id = " + connection.escape(event_id);
    } else {
      sql = "insert into gl_event_company set ?";
    }
    return connection.queryAsync(sql, data);
  },

  async clearJournalEvent(connection, company_event_id) {
    let sql = `Update gl_event_company
               Set gl_account_credit_id = null, gl_account_debit_id = null
               Where id = ${company_event_id}`;
    await connection.queryAsync(sql);
    sql = `Update gl_event_override
              Set active = 0
              Where gl_event_company_id = ${company_event_id}`;
    console.log('clearJournalEvent => sql', sql);
    return connection.queryAsync(sql);          
  },

  async findSettings(connection, payload = {}) {
    const { filters } = payload;

    const data = await GenericModel.find(connection, {
			table_name: 'settings',
			conditions: {
        ...filters
      }
		});

		return data;
	},

  bulkSaveSettings(connection, payload) {
    const { data } = payload;
    const sql = 'insert into settings (company_id, `name`, `value`) values ?';
    
    return connection.queryAsync(sql, [
      data.map(d => [
        connection.escape(d.company_id),
        d.name,
        d.value
      ])
    ]);
  },

  bulkDeleteSettings(connection, payload) {
    const { data } = payload;
    const { deleted_at, deleted_by, accounting_setting_ids } = data;
    const sql = `update accounting_settings set deleted_at = ${connection.escape(deleted_at)}, deleted_by = ${connection.escape(deleted_by)} where id in (
      ${accounting_setting_ids.map(s => connection.escape(s)).join(', ')}
    )`;
    return connection.queryAsync(sql, data);
  },

  getSettingsByCompany(connection, payload) {
    const { company_id } = payload;
    const sql = `select * from accounting_settings where company_id = ${company_id}`;
    return connection.queryAsync(sql);
  },

  getSettingsDetails(connection, payload) {
    const { company_id } = payload;
    const sql = `
      select ast.id, ads.id as setting_id, ads.name, ads.description, ads.note, ifnull(ast.value, ads.default_value) as value from accounting_settings ast 
      right join additional_settings ads on ast.setting_id = ads.id and ast.company_id = ${company_id};
    `;
    return connection.queryAsync(sql);
  },

  findDefaultSubTypes(connection){
    let sql = `SELECT gls.id as gl_subtype_id, gls.name as gl_subtype_name, glt.id as gl_type_id, glt.name as gl_type_name, glc.id as gl_category_id, glc.name as gl_category_name
                FROM gl_default_subtypes gds 
                INNER JOIN gl_account_subtype gls ON gds.gl_account_subtype_id = gls.id
                INNER JOIN gl_account_type glt ON gls.gl_account_type_id = glt.id
                INNER JOIN gl_category glc ON glt.gl_category_id = glc.id;`;
    return connection.queryAsync(sql)
  },

  findMissingJournalEventConfig(connection, payload){
    let { accounting_template_id } = payload;

    let sql = `select gec.book_id, ge.name 
                from gl_event_company gec
                  left join gl_events ge on ge.id = gec.gl_event_id
                where gec.accounting_template_id = ${accounting_template_id} and gec.active = 1 and ((gec.gl_account_credit_id is null) or (gec.gl_account_debit_id is null));`
    
    console.log('Missing Journal Events', sql);
    return connection.queryAsync(sql);
  },

  createDefaultAccountingTemplateForCompany(connection,payload){
    const { company_id, admin_id } = payload;

    let sql = `INSERT INTO accounting_template (name, company_id, created_by, modified_by, is_default) VALUES ('Default Template', ${company_id}, ${admin_id}, ${admin_id}, 1);`;
    return connection.queryAsync(sql).then(function(response){
      return response.insertId;
  });
  },

  assignTemplateToAccountingBook(connection,payload){
    const { company_id, accounting_template_id } = payload;

    let sql = `UPDATE accounting_setup SET accounting_template_id = ${accounting_template_id} WHERE company_id = ${company_id};`;
    return connection.queryAsync(sql);
  },

  assignTemplateToGlEvents(connection,payload){
    const { company_id, accounting_template_id } = payload;

    let sql = `UPDATE gl_event_company SET accounting_template_id = ${accounting_template_id} WHERE company_id = ${company_id};`;
    return connection.queryAsync(sql);
  },

  assignTemplateAndAccountsToDefaultSubTypes(connection,payload){
    const { admin_id, accounting_template_id, company_id } = payload;

    let sql = `INSERT INTO gl_template_default_accounts (accounting_template_id, gl_default_subtype_id, gl_account_id, created_by, modified_by)
                SELECT ${accounting_template_id} as accounting_template_id,
                  glds.id as gl_default_subtype_id, 
                  (select gla.id FROM gl_accounts gla WHERE gla.company_id = ${company_id} AND gla.account_subtype_id = glds.gl_account_subtype_id AND gla.active = 1 AND gla.deleted_at is null ORDER BY gla.id ASC LIMIT 1) as gl_account_id,
                  ${admin_id} as created_by,
                  ${admin_id} as modified_by
                FROM gl_default_subtypes glds;`;
    return connection.queryAsync(sql);
  },

  assignCorporateAccountToPropertyProducts(connection,payload){
    const { company_id } = payload;

    let sql = `UPDATE property_products pp
                INNER JOIN products p ON pp.product_id = p.id
               SET pp.income_account_id = p.income_account_id
               WHERE p.company_id = ${company_id} and pp.income_account_id is null and p.income_account_id is not null;`;

    return connection.queryAsync(sql);
  },

  assignDefaultTemplateToAllPropertiesOfCompany(connection,payload){
    const { admin_id, accounting_template_id, company_id } = payload;

    let sql = `INSERT INTO property_accounting_template (accounting_template_id, property_id, created_by, modified_by)
                SELECT ${accounting_template_id} as accounting_template_id,
                  p.id as property_id,
                  ${admin_id} as created_by,
                  ${admin_id} as modified_by
                FROM properties p
                WHERE p.company_id = ${company_id};`;

    return connection.queryAsync(sql);
  },

  assignAccountingToggleSettingsToCompany(connection,payload){
    let sql = `INSERT INTO settings SET ?`;

    return connection.queryAsync(sql, payload);
  }

}

const GenericModel = require('./generic');