var moment = require('moment');
const ENUMS = require('../modules/enums')

module.exports = {
    findById: function (connection, account_id) {
        var sql = "SELECT * FROM accounting_accounts where id =  " + connection.escape(account_id);
        return connection.queryAsync(sql).then(a => a.length ? a[0] : null);
    },

    findByName: function (connection, name) {
        var sql = "SELECT * FROM accounting_accounts where name =  " + connection.escape(name);
        return connection.queryAsync(sql).then(a => a.length ? a[0] : null);
    },

    findByCompanyId(connection, company_id) {
        var sql = "SELECT * from accounting_accounts where company_id = " + connection.escape(company_id) + " and status = 1 ";
        return connection.queryAsync(sql);
    },

    findAccountByProductId(connection, product_id) {
        var sql = "SELECT * from accounting_products where product_id = " + connection.escape(product_id);
        return connection.queryAsync(sql).then(a => a.length ? a[0] : null);
    },

    findProductGlAccount(connection, level = 'corporate', product_id, property_id) {
        let corporateSql = ` SELECT income_account_id FROM products WHERE id = ${product_id} `;
        let propertySql = ` SELECT income_account_id FROM property_products WHERE property_id = ${property_id} AND product_id = ${product_id} `;
        let sql = `SELECT * FROM gl_accounts WHERE id in ( ${level === 'corporate' ? corporateSql : propertySql} );`;

        return connection.queryAsync(sql).then(a => a.length ? a[0] : null);
    },

    saveProductAccount(connection, data, product_account_id) {
        var sql;
        if (product_account_id) {
            sql = "update accounting_products set ?  where id = " + connection.escape(product_account_id);
        } else {
            sql = "insert into accounting_products set ?";
        }
        return connection.queryAsync(sql, data);
    },

    save(connection, data, accounting_id) {

        var sql;
        if (accounting_id) {
            sql = "update accounting_accounts set ?  where id = " + connection.escape(accounting_id);
        } else {
            sql = "insert into accounting_accounts set ?";
        }
        return connection.queryAsync(sql, data);

    },

    async findAccountingSetup(connection, payload = {}) {
        const {filters, is_active = true} = payload;

        const data = await GenericModel.find(connection, {
            table_name: 'accounting_setup',
            conditions: {
                ...filters,
                ...(is_active && {deleted_at: null})
            }
        });

        return data;
    },

    async findAccountingEvents(connection, payload = {}) {
        const {filters, is_active = true} = payload;

        const data = await GenericModel.find(connection, {
            table_name: 'gl_event_company',
            conditions: {
                ...filters,
                ...(is_active && {deleted_at: null})
            }
        });

        return data;
    },

    async findAccountingEventOverrides(connection, payload = {}) {
        const {filters, is_active = true} = payload;

        const data = await GenericModel.find(connection, {
            table_name: 'gl_event_override',
            conditions: {
                ...filters,
                ...(is_active && {deleted_at: null})
            }
        });

        return data;
    },

    deleteAccountingSetupById(connection, id, user_id) {
        var sql = `UPDATE accounting_setup 
                SET active = 0, deleted_by = ${connection.escape(user_id)}, deleted_at = now()
                where id = ${connection.escape(id)}`;

        return connection.queryAsync(sql);
    },

    prePopulateAccounts(connection, params) {
        const {company_id, created_by} = params;

        let sql = `INSERT INTO gl_accounts (company_id,code,name,category_id,account_type_id,account_subtype_id,active,isDefault,created_by) 
                SELECT ${company_id},code,name,category_id,account_type_id,account_subtype_id,1,1,${created_by}
                FROM gl_default_accounts
                WHERE type='2';`;

        console.log('Default accounts ', sql);

        return connection.queryAsync(sql);
    },

    addDefaultGroupAccounts(connection, company_id, contact_id) {
        let sql = ` INSERT INTO gl_accounts (company_id,code,name,active,created_by,is_group) 
                VALUES (${company_id},'invoice','Invoice Lines',1,${contact_id},1),(${company_id},'payment','Payment Methods',1,${contact_id},1);`;
        console.log('addDefaultGroupAccounts', sql);
        return connection.queryAsync(sql);
    },

    addDefaultAccounts(connection, company_id, contact_id) {
        let sql = `INSERT INTO gl_accounts (company_id, code, name, active, isDefault, created_by) 
                VALUES 
                (${company_id},'999-C', '999 Credit', 2, 1, ${contact_id}),
                (${company_id},'999-D', '999 Debit', 2, 1, ${contact_id})`;
        console.log('addDefaultAccounts', sql);
        return connection.queryAsync(sql);
    },

    getLeasesByContact(connection, params) {
        let {contact_id, lease_id} = params;
        var sql = `select cl.contact_id
                        , ifnull(l.end_date, '') as end_date
                        , l.id                   as lease_id
                        , u.property_id
                        , l.start_date
                        , u.number               as unit_nbr
                   from contact_leases cl
                            join leases l on l.id = cl.lease_id
                            join units u on u.id = l.unit_id`;

        if (contact_id) {
            sql += ` where cl.contact_id = ${connection.escape(contact_id)}`;
        } else if (lease_id) {
            sql += ` where cl.lease_id = ${connection.escape(lease_id)}`;
        }

        return connection.queryAsync(sql);

    },

    getLedgerByContact(connection, contact_id, property_id, date_ranges) {

        let {start_dt, end_dt} = date_ranges;
        if (!start_dt) start_dt = '1900-01-01';
        if (!end_dt) end_dt = '2525-01-01';

        let sql = `select 
                UUID() as row_guid, 
                transaction_amt as amount, 
                transaction_date as date, 
                transaction_type as type, 
                id, 
                nbr as number, 
                ifnull(lease_id, '') as lease_id, 
                ifnull(unit_nbr, '') as unit_nbr, 
                ifnull(unit_type, '') as unit_type, 
                ifnull(description, '') as description, 
                ifnull(description_text, '') as description_text, 
                ifnull(status, '') as status, 
                sum(
                  case when status = 'void' then 0 else transaction_amt end
                ) over (
                  order by 
                    transaction_date, 
                    id,
                    transaction_amt,
                    transaction_type
                ) as running_balance, 
                ifnull(note, '') as note, 
                invoice_id, 
                payment_id 
              from 
                (
                  with cta_x as (
                    select 
                      created_at, 
                      transaction_date, 
                      transaction_type, 
                      case when transaction_type in ('invoice', 'refund', 'void') then invoice_id when transaction_type in ('write-off') then concat(payment_id, invoice_id) when transaction_type in (
                        'payment', 'credit', 'reversal', 'payment-void', 
                        'auto-payment-failed', 'auction-payment'
                      ) then payment_id end as id, 
                      case when transaction_type in ('invoice', 'refund', 'void') then ifnull(invoice_nbr, '') when transaction_type in (
                        'payment', 'credit', 'reversal', 'payment-void', 
                        'auto-payment-failed', 'auction-payment', 
                        'write-off'
                      ) then ifnull(payment_nbr, '') end as nbr, 
                      ifnull(lease_id, '') as lease_id, 
                      ifnull(unit_nbr, '') as unit_nbr, 
                      ifnull(unit_type, '') as unit_type, 
                      ifnull(description_prefix, '') as description, 
                      ifnull(description_text, '') as description_text, 
                      ifnull(status, '') as status, 
                      invoice_amount as transaction_amt, 
                      sum(
                        case when status = 'void' then 0 else invoice_amount end
                      ) over (
                        order by 
                          transaction_date, 
                          transaction_type, 
                          invoice_id, 
                          payment_id desc
                      ) as running_balance, 
                      ifnull(note, '') as note, 
                      case when transaction_type in ('write-off') then invoice_id else '' end as invoice_id, 
                      case when transaction_type in ('refund') then payment_id else '' end as payment_id 
                    from 
                      (
                        select 
                          case when i.status = 1 then 'invoice' else 'void' end as transaction_type, 
                          i.id as invoice_id, 
                          i.number as invoice_nbr, 
                          '' as payment_id, 
                          null as payment_nbr, 
                          ifnull(i.contact_id, cl.contact_id) as contact_id, 
                          i.lease_id, 
                          ifnull(u.number, '') as unit_nbr, 
                          ifnull(u.type, '') as unit_type, 
                          case when ! isnull(wo.invoice_id) then 'Write-Off' when (
                            i.void_date is not null 
                            and i.void_date <= ${connection.escape(end_dt)}
                          ) then 'Void' when i.paid = 1 then 'Paid' when ip.applied_payment >= (
                            i.subtotal + i.total_tax - i.total_discounts
                          ) || (
                            i.subtotal + i.total_tax - i.total_discounts
                          ) = 0 then 'Paid' when date(
                            CONVERT_TZ(
                              now(), 
                              'UTC', 
                              ifnull(pr.utc_offset, '-8:00')
                            )
                          ) > i.due then 'Past Due' else 'Open' end as status, 
                          i.created_at, 
                          i.status as hb_inv_status, 
                          ifnull(i.period_start, '') as period_start, 
                          ifnull(i.period_end, '') as period_end, 
                          i.subtotal + i.total_tax - i.total_discounts as 'invoice_amount', 
                          ifnull(i.due, '') as due_date, 
                          ifnull(i.period_start, '') as transaction_date, 
                          'Invoice # ' as description_prefix, 
                          i.number as description_text, 
                          case when ! isnull(i.void_date) then concat(
                            'This invoice was voided on ', i.void_date
                          ) else null end as note 
                        from 
                          invoices i 
                          join leases l on l.id = i.lease_id 
                          join units u on u.id = l.unit_id 
                          and u.property_id = ${connection.escape(property_id)}
                          join properties pr on pr.id = u.property_id 
                          left join (
                            select 
                              contact_id, 
                              lease_id 
                            from 
                              contact_leases cl 
                            where 
                              cl.type = 'tenant'
                          ) as cl on cl.lease_id = l.id 
                          left join (
                            select 
                              invoice_id, 
                              round(
                                sum(amount), 
                                2
                              ) applied_payment 
                            from 
                              invoices_payments 
                            group by 
                              invoice_id
                          ) ip on ip.invoice_id = i.id 
                          left join (
                            select 
                              distinct ip.invoice_id 
                            from 
                              invoices_payments ip 
                              join payments p on p.id = ip.payment_id 
                            where 
                              p.status = 1 
                              and p.credit_type = 'loss' 
                              and p.property_id = ${connection.escape(property_id)} 
                              and p.contact_id = ${connection.escape(contact_id)} 
                              and ip.amount > 0
                          ) wo on wo.invoice_id = i.id 
                        where 
                          cl.contact_id = ${connection.escape(contact_id)} 
                        union 
                        select 
                          distinct p.credit_type as transaction_type, 
                          '' as invoice_id, 
                          null as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(-1 * p.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          'Payment : ' as description_prefix, 
                          case when p.method = 'check' then concat('Check ', p.number) 
                          when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                          when p.method = 'ach' then concat(
                            'ACH **** ', 
                            ifnull(pm.card_end, '')
                          ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                            concat(
                              upper(
                                substring(pm.card_type, 1, 1)
                              ), 
                              lower(
                                substring(
                                  pm.card_type, 
                                  2, 
                                  length(pm.card_type)-1
                                )
                              ), 
                              ' **** ', 
                              ifnull(pm.card_end, '')
                            ), 
                            'unknown card'
                          ) else p.method end as description_text, 
                          '' as note 
                        from 
                          payments p 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          left join properties f on f.id = p.property_id 
                        where 
                          p.property_id = ${connection.escape(property_id)} 
                          and p.contact_id = ${connection.escape(contact_id)} 
                          and p.method not in ('credit', 'loss', 'adjustment') 
                        union 
                        select 
                          distinct 'payment' as transaction_type, 
                          '' as invoice_id, 
                          null as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(-1 * p.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          'Payment : ' as description_prefix, 
                          case when p.method = 'check' then concat('Check ', p.number) 
                          when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                          when p.method = 'ach' then concat(
                            'ACH **** ', 
                            ifnull(pm.card_end, '')
                          ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                            concat(
                              upper(
                                substring(pm.card_type, 1, 1)
                              ), 
                              lower(
                                substring(
                                  pm.card_type, 
                                  2, 
                                  length(pm.card_type)-1
                                )
                              ), 
                              ' **** ', 
                              ifnull(pm.card_end, '')
                            ), 
                            'unknown card'
                          ) else p.method end as description_text, 
                          '' as note 
                        from 
                          payments p 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          left join properties f on f.id = p.property_id 
                        where 
                          p.property_id = ${connection.escape(property_id)}
                          and p.contact_id = ${connection.escape(contact_id)} 
                          and p.method = 'credit' 
                        union
                        select 
                          distinct 'payment' as transaction_type, 
                          '' as invoice_id, 
                          null as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(-1 * ip.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          'Payment : ' as description_prefix, 
                          concat(
                            case when p.sub_method = 'auction' then 'Auction'
                               when p.sub_method = 'cleaning_deposit' then 'Cleaning deposit'
                               when p.sub_method = 'security_deposit' then 'Security deposit'
                               when p.sub_method = 'transfer' then 'Transfer'
                               when p.sub_method = 'move_out' then 'Move out'
                               when p.sub_method = 'retained_revenue' then 'Retained Revenue'
                               when p.sub_method = 'inter_property_payment' then 'Inter-Property-Payment'
                            else p.sub_method
                            end
                            , ' adjustment') as description_text, 
                          '' as note 
                        from 
                          payments p 
                          join (
                            select 
                              payment_id, 
                              sum(amount) as amount 
                            from 
                              invoices_payments 
                            group by 
                              payment_id
                          ) ip on ip.payment_id = p.id 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          left join properties f on f.id = p.property_id 
                        where 
                          (
                            (p.property_id = ${connection.escape(property_id)}
                              and p.contact_id = ${connection.escape(contact_id)} )
                            or 
                            (p.id in 
                              (select payment_id from invoices_payments where invoice_id in 
                                (select invoice_id from invoices_payments where payment_id in 
                                  (select payment_id from lease_auctions where lease_id in 
                                    (select cl.lease_id from contact_leases cl
                                        inner join leases l on l.id = cl.lease_id
                                        inner join units u on u.id = l.unit_id
                                      where u.property_id = ${connection.escape(property_id)} and cl.contact_id = ${connection.escape(contact_id)}
                                    )
                                  )
                                )
                              )
                            )
                          )
                          and p.method = 'adjustment' 
                        union 
                        select 
                          distinct case when p.source = 'auto' 
                          and p.status = 0 then 'auto-payment-failed' when p.method = 'card' then 'payment-void' else 'reversal' end as transaction_type, 
                          '' as invoice_id, 
                          null as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(1 * p.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          case when p.source = 'auto' 
                          and p.status = 0 then 'Autopay Failure : ' when p.method = 'card' then 'Payment Void : ' else 'Reversal : ' end as description_prefix, 
                          case when p.method = 'check' then concat('Check ', p.number) 
                          when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                          when p.method = 'ach' then concat(
                            'ACH **** ', 
                            ifnull(pm.card_end, '')
                          ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                            concat(
                              upper(
                                substring(pm.card_type, 1, 1)
                              ), 
                              lower(
                                substring(
                                  pm.card_type, 
                                  2, 
                                  length(pm.card_type)-1
                                )
                              ), 
                              ' **** ', 
                              ifnull(pm.card_end, '')
                            ), 
                            'unknown card'
                          ) else p.method end as description_text, 
                          concat(
                            'For Payment [', 
                            case when p.method = 'check' then concat('Check ', p.number) 
                            when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                            when p.method = 'ach' then concat(
                              'ACH **** ', 
                              ifnull(pm.card_end, '')
                            ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                              concat(
                                upper(
                                  substring(pm.card_type, 1, 1)
                                ), 
                                lower(
                                  substring(
                                    pm.card_type, 
                                    2, 
                                    length(pm.card_type)-1
                                  )
                                ), 
                                ' **** ', 
                                ifnull(pm.card_end, '')
                              ), 
                              'unknown card'
                            ) else p.method end, 
                            '] made on ', 
                            date_format(p.date, '%b %e, %Y')
                          ) as note 
                        from 
                          payments p 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          left join properties f on f.id = p.property_id 
                        where 
                          p.status != 1 
                          and p.property_id = ${connection.escape(property_id)} 
                          and p.contact_id = ${connection.escape(contact_id)} 
                          and p.method not in ('credit', 'loss', 'adjustment') 
                        union 
                        select 
                          distinct 'auction-payment' as transaction_type, 
                          '' as invoice_id, 
                          null as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(-1 * p.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          'Auction Payment : ' as description_prefix, 
                          case when p.method = 'check' then concat('Check ', p.number) 
                          when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                          when p.method = 'ach' then concat(
                            'ACH **** ', 
                            ifnull(pm.card_end, '')
                          ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                            concat(
                              upper(
                                substring(pm.card_type, 1, 1)
                              ), 
                              lower(
                                substring(
                                  pm.card_type, 
                                  2, 
                                  length(pm.card_type)-1
                                )
                              ), 
                              ' **** ', 
                              ifnull(pm.card_end, '')
                            ), 
                            'unknown card'
                          ) else p.method end as description_text, 
                          '' as note 
                        from 
                          payments p 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          join properties f on f.id = p.property_id
                        where 
                          p.id in (select payment_id from lease_auctions where lease_id in 
                            (
                              select cl.lease_id from contact_leases cl
                                inner join leases l on l.id = cl.lease_id
                                inner join units u on u.id = l.unit_id
                              where u.property_id = ${connection.escape(property_id)} and cl.contact_id = ${connection.escape(contact_id)}
                            )
                          )
                          and p.method not in ('credit', 'loss', 'adjustment')
                        union 
                        select 
                          distinct 'refund' as transation_type, 
                          r.id as invoice_id, 
                          null as invoice_nbr, 
                          r.payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          null as lease_id, 
                          null as unit_nbr, 
                          null as unit_type, 
                          null as status, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(r.created_at, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(r.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(r.date, '') as transaction_date, 
                          case 
                            when r.type = "nsf" then "NSF Reversal :" when r.type = "ach" then "ACH Reversal :" when r.type = "offline" then "Offline Reversal :" when r.type = "chargeback" then "C.C. Chargeback :"
                            when r.type = "overage_return" then "Overage Return :"  When r.type = '${ENUMS.REVERSAL_TYPES.VOID}' then 'Void :' When r.type = '${ENUMS.REVERSAL_TYPES.CREDIT}' then 'Reversal :'
                          else "Refund :" end as description_prefix, 
                          case when p.method = 'check' then concat('Check ', p.number) 
                          when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                          when p.method = 'ach' then concat(
                            'ACH **** ', 
                            ifnull(pm.card_end, '')
                          ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                            concat(
                              upper(
                                substring(pm.card_type, 1, 1)
                              ), 
                              lower(
                                substring(
                                  pm.card_type, 
                                  2, 
                                  length(pm.card_type)-1
                                )
                              ), 
                              ' **** ', 
                              ifnull(pm.card_end, '')
                            ), 
                            'unknown card'
                          ) else p.method end as description_text, 
                          concat(
                            'For Payment [', 
                            case when p.method = 'check' then concat('Check ', p.number) 
                            when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                            when p.method = 'ach' then concat(
                              'ACH **** ', 
                              ifnull(pm.card_end, '')
                            ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                              concat(
                                upper(
                                  substring(pm.card_type, 1, 1)
                                ), 
                                lower(
                                  substring(
                                    pm.card_type, 
                                    2, 
                                    length(pm.card_type)-1
                                  )
                                ), 
                                ' **** ', 
                                ifnull(pm.card_end, '')
                              ), 
                              'unknown card'
                            ) else p.method end, 
                            '] made on ', 
                            date_format(p.date, '%b %e, %Y')
                          ) as note 
                        from 
                          refunds r 
                          join payments p on p.id = r.payment_id 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                        where 
                          (
                            (p.property_id = ${connection.escape(property_id)} and p.contact_id = ${connection.escape(contact_id)})
                            or 
                            (
                              r.type = 'overage_return' and r.payment_id in (select payment_id from lease_auctions where lease_id in 
                                (
                                  select cl.lease_id from contact_leases cl
                                    inner join leases l on l.id = cl.lease_id
                                    inner join units u on u.id = l.unit_id
                                  where u.property_id = ${connection.escape(property_id)} and cl.contact_id = ${connection.escape(contact_id)}
                                )
                              )
                            )
                            or
                            (r.id in 
                              (select refund_id from lease_auctions where lease_id in 
                                (select cl.lease_id from contact_leases cl
                                  inner join leases l on l.id = cl.lease_id
                                  inner join units u on u.id = l.unit_id
                                  where u.property_id = ${connection.escape(property_id)} and cl.contact_id = ${connection.escape(contact_id)}
                                )
                              )
                            )
                          )
                        union 
                        select 
                          distinct 'write-off' as transaction_type, 
                          i.id as invoice_id, 
                          i.number as invoice_nbr, 
                          p.id as payment_id, 
                          ifnull(p.number, '') as payment_number, 
                          ifnull(p.contact_id, -1) as contact_id, 
                          i.lease_id as lease_id, 
                          u.number as unit_nbr, 
                          u.type as unit_type, 
                          'Write-Off' as status, 
                          ifnull(p.date, 'unknown') as date, 
                          ifnull(p.method, 'unknown') as method, 
                          ifnull(p.created, '') as created, 
                          ifnull(pm.type, '') as type, 
                          ifnull(-1 * ip.amount, 0) as amount, 
                          ifnull(pm.card_type, '') as card_type, 
                          ifnull(p.date, '') as transaction_date, 
                          'Write Off : ' as description_prefix, 
                          concat('Invoice #', i.number) as description_text, 
                          '' as note 
                        from 
                          payments p 
                          join contacts c on c.id = p.contact_id 
                          left join payment_methods pm on pm.id = p.payment_methods_id 
                          left join invoices_payments ip on ip.payment_id = p.id 
                          left join invoices i on i.id = ip.invoice_id 
                          left join leases l on l.id = i.lease_id 
                          left join units u on u.id = l.unit_id 
                        where 
                          p.status = 1 
                          and p.credit_type = 'loss' 
                          and p.property_id = ${connection.escape(property_id)} 
                          and p.contact_id = ${connection.escape(contact_id)}
                      ) x 
                    order by 
                      transaction_date desc, transaction_type desc, id desc, invoice_id desc, payment_id desc
                  ) 
                  select * from cta_x where transaction_date between ${connection.escape(start_dt)} and ${connection.escape(end_dt)}
                ) xxx 
              order by transaction_date desc, id desc, amount desc, transaction_type desc`

        console.log("----------- transaction history -------------");
        console.log(sql);
        return connection.queryAsync(sql);
    },

    getLedgerByLease(connection, lease_id, date_ranges) {

        console.log("Lease: ", lease_id);

        let {start_dt, end_dt} = date_ranges;
        if (!start_dt) start_dt = '1900-01-01';
        if (!end_dt) end_dt = '2525-01-01';

        var sql = `select 
                UUID() as row_guid, 
                transaction_date as date, 
                transaction_type as type, 
                id, 
                nbr as number, 
                ifnull(lease_id, '') as lease_id, 
                ifnull(unit_nbr, '') as unit_nbr, 
                ifnull(unit_type, '') as unit_type, 
                ifnull(description, '') as description, 
                ifnull(description_text, '') as description_text, 
                ifnull(status, '') as status, 
                transaction_amt as amount, 
                sum(
                  case when status = 'void' then 0 else transaction_amt end
                ) over (
                  order by 
                  transaction_date,
                  created_datetime,
                  id,
                  transaction_amt,
                  transaction_type
                ) as running_balance, 
                ifnull(note, '') as note, 
                invoice_id, 
                payment_id 
                from 
                (
                  with cta_x as (
                  select 
                    transaction_date,
                    created_datetime, 
                    transaction_type, 
                    case when transaction_type in ('invoice', 'refund', 'void') then invoice_id when transaction_type in ('write-off') then concat(payment_id, invoice_id) when transaction_type in (
                    'payment', 'credit', 'reversal', 'void payment', 
                    'payment-void', 'auction-payment'
                    ) then payment_id end as id, 
                    case when transaction_type in ('invoice', 'refund', 'void') then ifnull(invoice_nbr, '') when transaction_type in (
                    'payment', 'credit', 'reversal', 'void payment', 
                    'payment-void', 'auction-payment', 
                    'write-off'
                    ) then ifnull(payment_nbr, '') end as nbr, 
                    ifnull(lease_id, '') as lease_id, 
                    ifnull(unit_nbr, '') as unit_nbr, 
                    ifnull(unit_type, '') as unit_type, 
                    ifnull(description_prefix, '') as description, 
                    ifnull(description_text, '') as description_text, 
                    ifnull(status, '') as status, 
                    invoice_amount as transaction_amt, 
                    ifnull(note, '') as note, 
                    case when transaction_type in (
                    'payment', 'auction-payment', 'write-off'
                    ) then invoice_id else '' end as invoice_id, 
                    case when transaction_type = 'refund' then payment_id else '' end as payment_id, 
                    ifnull(invoice_payment_id, -1) as invoice_payment_id 
                  from 
                    (
                    select 
                      case when i.status = 1 then 'invoice' else 'void' end as transaction_type, 
                      i.id as invoice_id, 
                      i.number as invoice_nbr, 
                      '' as payment_id, 
                      null as payment_nbr, 
                      ifnull(i.contact_id, cl.contact_id) as contact_id, 
                      i.lease_id, 
                      ifnull(u.number, '') as unit_nbr, 
                      ifnull(u.type, '') as unit_type, 
                      case when (
                      i.void_date is not null 
                      and i.void_date <= ${connection.escape(end_dt)}
                      ) then 'Void' when ip.applied_payment >= (
                      i.subtotal + i.total_tax - i.total_discounts
                      ) || (
                      i.subtotal + i.total_tax - i.total_discounts
                      ) = 0 then 'Paid' when date(
                      CONVERT_TZ(
                        now(), 
                        'UTC', 
                        ifnull(pr.utc_offset, '-8:00')
                      )
                      ) > i.due then 'Past Due' else 'Open' end as status, 
                      i.created_at, 
                      i.status as hb_inv_status, 
                      ifnull(i.period_start, '') as period_start, 
                      ifnull(i.period_end, '') as period_end, 
                      i.subtotal + i.total_tax - i.total_discounts as 'invoice_amount', 
                      ifnull(i.due, '') as due_date, 
                      ifnull(i.period_start, '') as transaction_date, 
                      i.created_at as created_datetime,
                      'Invoice # ' as description_prefix, 
                      i.number as description_text, 
                      case when ! isnull(i.void_date) then concat(
                      'This invoice was voided on ', i.void_date
                      ) else null end as note, 
                      -1 as invoice_payment_id 
                    from 
                      invoices i 
                      join leases l on l.id = i.lease_id 
                      join units u on u.id = l.unit_id 
                      join properties pr on pr.id = u.property_id 
                      left join (
                      select 
                        distinct contact_id, 
                        lease_id 
                      from 
                        contact_leases cl
                      ) as cl on cl.lease_id = l.id 
                      left join (
                      select 
                        invoice_id, 
                        round(
                        sum(amount), 
                        2
                        ) applied_payment 
                      from 
                        invoices_payments 
                      group by 
                        invoice_id
                      ) ip on ip.invoice_id = i.id 
                    where 
                      l.id = ${connection.escape(lease_id)}
                    union all 
                    select 
                      p.credit_type as transaction_type, 
                      ifnull(ip.invoice_id, '') as invoice_id, 
                      null as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      i.lease_id as lease_id, 
                      ifnull(u.number, '') as unit_nbr, 
                      ifnull(u.type, '') as unit_type, 
                      ip.id as status, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * sum(ipb.amount), 0) as amount, 
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      'Payment Applied : ' as description_prefix, 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                      'ACH **** ', 
                      ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                      concat(
                        upper(
                        substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                        substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                        )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                      ), 
                      'unknown card'
                      ) else p.method end as description_text, 
                      '' as note, 
                      ip.id as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      join invoices_payments ip on ip.payment_id = p.id
                      join invoices_payments_breakdown ipb on ipb.invoice_payment_id = ip.id and ipb.refund_id is null
                      join invoices i on i.id = ip.invoice_id 
                      join leases l on l.id = i.lease_id 
                      and l.id = ${connection.escape(lease_id)} 
                      join units u on u.id = l.unit_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      left join properties f on f.id = p.property_id 
                    where 
                      ifnull(p.method, '') not in ('credit', 'loss', 'adjustment') 
                      and ! isnull(ip.payment_id)
                    group by ip.id
                    union 
                    select 
                      distinct 'payment' as transaction_type, 
                      '' as invoice_id, 
                      null as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      p.lease_id as lease_id, 
                      ifnull(u.number, '') as unit_nbr, 
                      ifnull(u.type, '') as unit_type, 
                      null as status, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * sum(ipb.amount), 0) as amount,  
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      'Payment Applied : ' as description_prefix, 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                      'ACH **** ', 
                      ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                      concat(
                        upper(
                        substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                        substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                        )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                      ), 
                      'unknown card'
                      ) else p.method end as description_text, 
                      '' as note, 
                      ip.id as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      join invoices_payments ip on ip.payment_id = p.id
                      join invoices i on i.id = ip.invoice_id 
                      join invoices_payments_breakdown ipb on ipb.invoice_payment_id = ip.id and ipb.refund_id is null
                      join leases l on l.id = i.lease_id 
                      and l.id = ${connection.escape(lease_id)}
                      join units u on u.id = l.unit_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      left join properties f on f.id = p.property_id 
                    where 
                      p.status = 1 
                      and p.method = 'credit' 
                      and ! isnull(ip.payment_id) 
                    union all
                    select 
                      distinct 'payment' as transaction_type, 
                      '' as invoice_id, 
                      null as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      p.lease_id as lease_id, 
                      ifnull(u.number, '') as unit_nbr, 
                      ifnull(u.type, '') as unit_type, 
                      null as status, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * ip.amount, 0) as amount, 
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      'Payment Applied : ' as description_prefix, 
                      concat(
                      case when p.sub_method = 'auction' then 'Auction'
                        when p.sub_method = 'cleaning_deposit' then 'Cleaning deposit'
                        when p.sub_method = 'security_deposit' then 'Security deposit'
                        when p.sub_method = 'transfer' then 'Transfer'
                        when p.sub_method = 'move_out' then 'Move out'
                        when p.sub_method = 'retained_revenue' then 'Retained Revenue'
                        when p.sub_method = 'inter_property_payment' then 'Inter-Property-Payment'
                      else p.sub_method
                      end
                      , ' adjustment') as description_text, 
                      '' as note, 
                      ip.id as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      join invoices_payments ip on ip.payment_id = p.id 
                      join invoices i on i.id = ip.invoice_id 
                      join leases l on l.id = i.lease_id 
                      and l.id = ${connection.escape(lease_id)}
                      join units u on u.id = l.unit_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      left join properties f on f.id = p.property_id 
                    where 
                      p.status = 1 
                      and p.method = 'adjustment' 
                      and ! isnull(ip.payment_id) 
                    union all 
                    select 
                      distinct case when p.source = 'auto' 
                      and p.status = 0 then 'auto-payment-failed' when p.method = 'card' then 'payment-void' else 'reversal' end as transaction_type, 
                      '' as invoice_id, 
                      null as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      i.lease_id as lease_id, 
                      ifnull(u.number, '') as unit_nbr, 
                      ifnull(u.type, '') as unit_type, 
                      ip.id as status, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(ip.amount, 0) as amount, 
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      case when p.source = 'auto' 
                      and p.status = 0 then 'Autopay Failure : ' when p.method = 'card' then 'Payment Void : ' else 'Reversal : ' end as description_prefix, 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                      'ACH **** ', 
                      ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                      concat(
                        upper(
                        substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                        substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                        )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                      ), 
                      'unknown card'
                      ) else p.method end as description_text, 
                      concat(
                      'For Payment [', 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                        'ACH **** ', 
                        ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                        concat(
                        upper(
                          substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                          substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                          )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                        ), 
                        'unknown card'
                      ) else p.method end, 
                      '] made on ', 
                      date_format(
                        ifnull(ip.date, p.date), 
                        '%b %e, %Y'
                      )
                      ) as note, 
                      ip.id as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      join invoices_payments ip on ip.payment_id = p.id 
                      join invoices i on i.id = ip.invoice_id 
                      join leases l on l.id = i.lease_id 
                      and l.id = ${connection.escape(lease_id)}
                      join units u on u.id = l.unit_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      left join properties f on f.id = p.property_id 
                    where 
                      p.status != 1 
                      and ifnull(p.method, '') not in ('credit', 'loss', 'adjustment') 
                      and ! isnull(ip.payment_id) 
                    union 
                    select 
                      distinct 'auction-payment' as transaction_type, 
                      '' as invoice_id, 
                      null as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      null as lease_id, 
                      null as lease_id, 
                      null as unit_nbr, 
                      null as unit_type, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * ip.amount, 0) as amount, 
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      'Auction Payment : ' as description_prefix, 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                      'ACH **** ', 
                      ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                      concat(
                        upper(
                        substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                        substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                        )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                      ), 
                      'unknown card'
                      ) else p.method end as description_text, 
                      '' as note, 
                      -1 as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      join (
                      select 
                        payment_id, 
                        sum(ip.amount) as amount 
                      from 
                        invoices_payments ip 
                        join invoices i on i.id = ip.invoice_id 
                        join contact_leases cl on cl.lease_id = i.lease_id 
                        and cl.type = 'tenant' 
                      where 
                        cl.lease_id = ${connection.escape(lease_id)}
                      group by 
                        payment_id
                      ) ip on ip.payment_id = p.id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      left join properties f on f.id = p.property_id 
                    where 
                      p.status = 1 
                      and p.credit_type = 'auction' 
                      and ! isnull(ip.payment_id) 
                    union all 
                    select 
                      distinct 'refund' as transation_type, 
                      r.id as invoice_id, 
                      null as invoice_nbr, 
                      r.payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      i.lease_id as lease_id, 
                      u.number as unit_nbr, 
                      u.type as unit_type, 
                      ip.id as status, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * sum(ipb.amount), 0) as amount,
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(r.date, '') as transaction_date, 
                      r.created_at as created_datetime,
                      case 
                        when r.type = "nsf" then "NSF Reversal :"
                        when r.type = "ach" then "ACH Reversal :" 
                        when r.type = "offline" then "Offline Reversal :" 
                        when r.type = "chargeback" then "C.C. Chargeback :" 
                        when r.type = "overage_return" then "Overage Return :" 
                        when r.type = "${ENUMS.REVERSAL_TYPES.VOID}" then "Void :"
                        when r.type = "${ENUMS.REVERSAL_TYPES.CREDIT}" then "Reversal :"
                        else "Refund :" end as description_prefix, 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                      'ACH **** ', 
                      ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                      concat(
                        upper(
                        substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                        substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                        )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                      ), 
                      'unknown card'
                      ) else p.method end as description_text, 
                      concat(
                      'For Payment [', 
                      case when p.method = 'check' then concat('Check ', p.number) 
                      when p.method = ${connection.escape(ENUMS.PAYMENT_METHODS.GIFTCARD)} then concat('Giftcard ', p.number)
                      when p.method = 'ach' then concat(
                        'ACH **** ', 
                        ifnull(pm.card_end, '')
                      ) when p.method = 'cash' then 'Cash' when p.method = 'credit' then 'Credits' when p.method = 'card' then ifnull(
                        concat(
                        upper(
                          substring(pm.card_type, 1, 1)
                        ), 
                        lower(
                          substring(
                          pm.card_type, 
                          2, 
                          length(pm.card_type)-1
                          )
                        ), 
                        ' **** ', 
                        ifnull(pm.card_end, '')
                        ), 
                        'unknown card'
                      ) else p.method end, 
                      '] made on ', 
                      date_format(p.date, '%b %e, %Y')
                      ) as note, 
                      ip.id as invoice_payment_id 
                    from 
                      refunds r 
                      join payments p on p.id = r.payment_id 
                      join invoices_payments ip on ip.payment_id = r.payment_id
                      join invoices_payments_breakdown ipb on ipb.invoice_payment_id = ip.id and ipb.refund_id = r.id
                      join invoices i on i.id = ip.invoice_id 
                      join leases l on l.id = i.lease_id 
                      join units u on u.id = l.unit_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                    where 
                      p.status = 1 
                      and i.lease_id = ${connection.escape(lease_id)}
                    group by r.id
                    union 
                    select 
                      distinct 'write-off' as transaction_type, 
                      i.id as invoice_id, 
                      i.number as invoice_nbr, 
                      p.id as payment_id, 
                      ifnull(p.number, '') as payment_number, 
                      ifnull(p.contact_id, -1) as contact_id, 
                      i.lease_id as lease_id, 
                      u.number as unit_nbr, 
                      u.type as unit_type, 
                      null as paid, 
                      ifnull(p.date, 'unknown') as date, 
                      ifnull(p.method, 'unknown') as method, 
                      ifnull(p.created, '') as created, 
                      ifnull(pm.type, '') as type, 
                      ifnull(-1 * ip.amount, 0) as amount, 
                      ifnull(pm.card_type, '') as card_type, 
                      ifnull(p.date, '') as transaction_date, 
                      p.created as created_datetime,
                      'Write Off : ' as description_prefix, 
                      concat('Invoice #', i.number) as description_text, 
                      '' as note, 
                      ip.id as invoice_payment_id 
                    from 
                      payments p 
                      join contacts c on c.id = p.contact_id 
                      left join payment_methods pm on pm.id = p.payment_methods_id 
                      join invoices_payments ip on ip.payment_id = p.id 
                      join invoices i on i.id = ip.invoice_id 
                      join leases l on l.id = i.lease_id 
                      join units u on u.id = l.unit_id 
                    where 
                      p.status = 1 
                      and p.credit_type = 'loss' 
                      and i.lease_id = ${connection.escape(lease_id)}
                    ) x
                  ) 
                  select * from cta_x where transaction_date between ${connection.escape(start_dt)} and ${connection.escape(end_dt)}
                ) xxx 
                order by transaction_date desc, created_datetime desc, id desc, amount desc, transaction_type desc, invoice_payment_id desc`;
                console.log("----------- transaction history -------------");
                console.log(sql);
    return connection.queryAsync(sql);
  },

    getInvoiceLines(connection, invoice_id) {
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

    getPaymentInvoices(connection, payment_id, params = {}) {
        let {lease_id, invoice_id} = params
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

        if (lease_id) {
            sql += ` and l.id = ${connection.escape(lease_id)}`;
        }

        if (invoice_id) {
            sql += `and ip.invoice_id = ${connection.escape(invoice_id)}`;
        }

        return connection.queryAsync(sql);
    },

    findGlEventDetailsByTemplateId(connection, accounting_template_id) {
        let sql = `select  
                ec.id,
                ec.gl_event_id,
                ec.book_id,
                e.name as event_name,
                cr_acc.id as credit_account_id,
                cr_acc.code as credit_account_code, 
                cr_acc.name as credit_account_name,
                cr_acc.active as credit_account_active,
                dr_acc.id as debit_account_id,
                dr_acc.code as debit_account_code, 
                dr_acc.name as debit_account_name,
                dr_acc.active as debit_account_active
      
              from gl_event_company ec
              inner join gl_events e on e.id = ec.gl_event_id 
              left join gl_accounts cr_acc on cr_acc.id = ec.gl_account_credit_id
              left join gl_accounts dr_acc on dr_acc.id = ec.gl_account_debit_id
              where ec.accounting_template_id = ${connection.escape(accounting_template_id)}
              and ec.active = 1;`

        return connection.queryAsync(sql);
    },

    findGlAccountsbyCompanyId(connection, company_id) {
        var sql = `select ac.id, ac.company_id, ac.code, ac.name from gl_accounts ac where active = 1 and company_id = ${connection.escape(company_id)}`;
        return connection.queryAsync(sql);
    },

    getPropertiesOfCompany(connection, payload) {
        const {company_id, base_properties, filteredProperties} = payload;
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

    findGlEventsIdbyBookId(connection, book_id) {
        var sql = `select id as gl_event_id, active from gl_events where active = 1 and (${book_id == 0 ? 'cash' : (book_id == 1 ? 'accrual' : 'cash = 1 or accrual')} = 1)`;
        console.log("findGlEventsIdbyBookId =>", sql);
        return connection.queryAsync(sql);
    },

    findGlEventbyId(connection, event_id) {
        var sql = "Select * from gl_event_company where active = 1 and id = " + connection.escape(event_id);
        return connection.queryAsync(sql).then(function (sqlRes) {
            return (sqlRes.length) ? sqlRes[0] : null;
        });
    },

    findOverridesByEventId(connection, event_id) {
        var sql = "Select glo.*, gla.active as override_account_active from gl_event_override glo inner join gl_accounts gla on glo.override_gl_account_id = gla.id where glo.active = 1 and glo.gl_event_company_id = " + connection.escape(event_id);
        return connection.queryAsync(sql).then(function (sqlRes) {
            return (sqlRes.length) ? sqlRes : [];
        });
    },

    removeOverride(connection, contact_id, ids) {
        return Promise.resolve().then(() => {

            var sql = "update gl_event_override set active = 0, deleted_at = now(), deleted_by = " + connection.escape(contact_id) + " where";
            sql += " id in (" + ids + ")";
            return connection.queryAsync(sql);
        })
    },

    saveOverride(connection, data, override_id) {
        var sql;
        if (override_id) {
            sql = "update gl_event_override set ?  where id = " + connection.escape(override_id);
        } else {
            sql = "insert into gl_event_override set ?";
        }
        return connection.queryAsync(sql, data);
    },

    bulkSaveGlEventOverrides(connection, payload) {
        const {data} = payload;
        const sql = `insert into gl_event_override
                     (company_id, gl_event_company_id, product_id, credit_debit_type, actual_gl_account_id,
                      override_gl_account_id, active, created_by, product_type)
                     values ? `;

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

    bulkSaveGlEvents(connection, payload) {
        const {data} = payload;
        const sql = `insert into gl_event_company
                     (gl_event_id, book_id, company_id, gl_account_credit_id, gl_account_debit_id, active,
                      accounting_template_id)
                     values ? `;

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
        const {data} = payload;
        const sql = `insert into gl_template_default_accounts
                     (gl_account_id, accounting_template_id, gl_default_subtype_id, created_by, modified_by)
                     values ? `;

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

    saveJournalEvent(connection, data, event_id) {
        var sql;
        if (event_id) {
            sql = "update gl_event_company set ?  where id = " + connection.escape(event_id);
        } else {
            sql = "insert into gl_event_company set ?";
        }
        return connection.queryAsync(sql, data);
    },

    async clearJournalEvent(connection, company_event_id, user_id) {
        let sql = `Update gl_event_company
               Set gl_account_credit_id = null, gl_account_debit_id = null
               Where id = ${connection.escape(company_event_id)}`;
        await connection.queryAsync(sql);
        sql = `Update gl_event_override
              Set active = 0, deleted_by = ${connection.escape(user_id)}, deleted_at = now()
              Where gl_event_company_id = ${connection.escape(company_event_id)}`;
        console.log('clearJournalEvent => sql', sql);
        return connection.queryAsync(sql);
    },

    async findExportHistory(connection, company_id, properties) {
        let sql = `select 
                aeh.id,
                aeh.type,
                aeh.format,
                aeh.export_range,
                aeh.start_date,
                aeh.end_date,
                CONVERT_TZ(aeh.created_at , "+00:00", p.utc_offset) as date,
                aeh.send_to,
                IF(aeh.generated_by, CONCAT(c.first, ' ', IF(c.middle, CONCAT(c.middle, ' '), ''), c.last), 'Scheduled') as generated_by
              from accounting_export_history aeh
              inner join properties p on aeh.property_id = p.id
              left join contacts c on aeh.generated_by = c.id
              where aeh.company_id = ${company_id}
              and aeh.property_id in (${properties.map(p => connection.escape(p)).join(', ')});`;
        console.log('findAccountingExportsByCompanyId =>', sql);
        return connection.queryAsync(sql);
    },

    async findExportConfigById(connection, configId) {
        let sql = `Select
                id,
                company_id,
                property_ids,
                type,
                format,
                frequency,
                day_of_week,
                day_of_month,
                date,
                scheduled_by,
                send_to,
                created_at, 
                modified_at,
                modified_by,
                active
              From accounting_export_configurations
              Where active = 1
              And id = ${configId};`
        console.log('findExportConfigById =>', sql);
        return connection.queryAsync(sql).then(function (rs) {
            return rs[0] || null
        });
    },

    saveExportConfiguration(connection, data) {

        var sql;
        if (data.id) {
            sql = "update accounting_export_configurations set ?  where id = " + connection.escape(data.id);
        } else {
            sql = "insert into accounting_export_configurations set ?";
        }
        return connection.queryAsync(sql, data);

    },

    findAllExportConfiguration(connection, company_id, all) {
        let sql = `select 
                aec.id,
                aec.frequency,
                day_of_week,
                day_of_month,
                date,
                aec.type,
                aec.format,
                aec.send_to,
                CONCAT(c.first, ' ', IF(c.middle, CONCAT(c.middle, ' '), ''), c.last) as scheduled_by,
                aec.property_ids,
                aec.book_id
              from accounting_export_configurations aec
              left join contacts c on aec.scheduled_by = c.id
              where aec.company_id = ${company_id} ${all ? '' : ' and aec.active = 1'}`
        console.log('findAllExportConfiguration =>', sql);
        return connection.queryAsync(sql);
    },

    async findSettings(connection, payload = {}) {
        const {filters} = payload;

        const data = await GenericModel.find(connection, {
            table_name: 'settings',
            conditions: {
                ...filters
            }
        });

        return data;
    },

    bulkSaveSettings(connection, payload) {
        const {data} = payload;
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
        const {data} = payload;
        const {deleted_at, deleted_by, accounting_setting_ids} = data;
        const sql = `update accounting_settings set deleted_at = ${connection.escape(deleted_at)}, deleted_by = ${connection.escape(deleted_by)} where id in (
      ${accounting_setting_ids.map(s => connection.escape(s)).join(', ')}
    )`;
        return connection.queryAsync(sql, data);
    },

    getSettingsByCompany(connection, payload) {
        const {company_id} = payload;
        const sql = `select * from accounting_settings where company_id = ${company_id}`;
        return connection.queryAsync(sql);
    },

    getSettingsDetails(connection, payload) {
        const {company_id} = payload;
        const sql = `
      select ast.id, ads.id as setting_id, ads.name, ads.description, ads.note, ifnull(ast.value, ads.default_value) as value from accounting_settings ast 
      right join additional_settings ads on ast.setting_id = ads.id and ast.company_id = ${company_id};
    `;
        return connection.queryAsync(sql);
    },

    findGLExports(connection, conditions) {
        const {property_id} = conditions;
        let properties = property_id.map(p => connection.escape(p)).join(', ');

        let sql = `select * from (
                with exports as (
                    select gle.id, gle.export_date, gle.credit_debit_type, gle.amount, gle.company_gl_account_id, gle.gl_event_company_id, gle.book_id,
                        glev.name as gl_event_name, gla.code as gl_account, gla.name as gl_account_name,
                        p.id as property_id,p.name as property_name, p.number as property_number, p.utc_offset as property_utcoffset ,
                        (select name from companies where id = p.company_id) as company_name,
                        ${conditions.isSummarized
            ? `CONCAT( DATE_FORMAT(gle.export_date,'%m%d%Y'), gle.book_id )`
            : 'gle.trannum'
        } as first_trannum,
                        ${(conditions.isSummarized || !conditions.export_ref_transaction) ? '"HB"' :
            `CASE 
                            WHEN glec.gl_event_id in (3,5,9) THEN
                                CASE 
                                    WHEN pmt.identifier = 5 THEN 'Credits'
                                    ELSE pmt.payment_method_type
                                END
                            WHEN glec.gl_event_id = 1 Then 'Invoice Creation'
                            WHEN glec.gl_event_id = 2 Then 'Void Invoice'
                            WHEN glec.gl_event_id = 4 Then 'Revenue Recognition'
                            WHEN glec.gl_event_id = 6 Then 'Bad Debt'
                            WHEN glec.gl_event_id = 7 Then 'Allowance'
                            WHEN glec.gl_event_id = 8 Then 'Credits'
                        END`
        } as ref

                    from gl_exports gle
                    inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                    Inner join properties p on gle.property_id = p.id
                    inner join gl_event_company glec on gle.gl_event_company_id = glec.id
                    inner join gl_events glev on glec.gl_event_id = glev.id
                    left join  invoices_payments_breakdown ipb on ipb.id= gle.object_id
                    left join refunds r on r.id = gle.object_id
                    left join payments pay on pay.id = (
                        CASE
                        WHEN glec.gl_event_id in (3,8,9) THEN ipb.payment_id
                        WHEN glec.gl_event_id = 5 THEN r.payment_id
                        ELSE ''
                        END
                    )
                    left join payment_method_type pmt on pmt.id = pay.payment_method_type_id
                    where gle.company_id = ${conditions.company_id}
                        ${properties ? ` and gle.property_id in (${properties})` : ''} 
                        ${conditions.book_id && conditions.book_id !== '2' ? ` and gle.book_id = '${conditions.book_id}'` : ''}
                        ${conditions.start_date && conditions.end_date
            ? ` and date(gle.export_date) >= ${connection.escape(conditions.start_date)} and date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
            : ` and Date(gle.export_date) = ${connection.escape(conditions.end_date)} `}
                )
                SELECT
                    property_utcoffset,
                    property_name,
                    property_number,
                    company_name,
                    "J" as yardi_type,
                    first_trannum as trannum,
                    DATE_FORMAT(export_date,'%m/%d/%Y') as date,
                    DATE_FORMAT(export_date,'%m/01/%Y') as post_month,
                    ref,
                    ${conditions.isSummarized ? 'group_concat(distinct gl_event_name)' : 'gl_event_name'} as remark,
                    ${conditions.isSummarized ? 'Sum' : ''}(CASE 
                        WHEN credit_debit_type =  'debit' THEN amount
                        WHEN credit_debit_type =  'credit' THEN -1 * amount
                    END) as amount,
                    ${conditions.isSummarized ? 'SUM(' : ''}
                    CASE
                      WHEN credit_debit_type =  'debit' THEN amount
                      ELSE 0
                    END ${conditions.isSummarized ? ')' : ''} as debit_amount,
                    ${conditions.isSummarized ? 'SUM(' : ''}
                    CASE
                      WHEN credit_debit_type =  'credit' THEN amount
                      ELSE 0
                    END ${conditions.isSummarized ? ')' : ''} as credit_amount,
                    gl_account,
                    book_id as book_type,
                    gl_account_name,
                    ${conditions.isSummarized ? 'group_concat(distinct gl_event_name)' : 'gl_event_name'} as journal_event

                from exports
                ${conditions.isSummarized ? `group by export_date, book_id, company_gl_account_id, credit_debit_type, property_id` : ''}
                order by  property_id, trannum
            ) x`
        console.log("YARDI SQL ==> ", sql);
        return connection.queryAsync(sql);
    },

    findDefaultSubTypes(connection) {
        let sql = `SELECT gls.id   as gl_subtype_id,
                          gls.name as gl_subtype_name,
                          glt.id   as gl_type_id,
                          glt.name as gl_type_name,
                          glc.id   as gl_category_id,
                          glc.name as gl_category_name
                   FROM gl_default_subtypes gds
                            INNER JOIN gl_account_subtype gls ON gds.gl_account_subtype_id = gls.id
                            INNER JOIN gl_account_type glt ON gls.gl_account_type_id = glt.id
                            INNER JOIN gl_category glc ON glt.gl_category_id = glc.id;`;
        return connection.queryAsync(sql)
    },

}

const GenericModel = require('./generic');