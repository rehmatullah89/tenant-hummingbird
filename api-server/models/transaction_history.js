const ENUMS = require('../modules/enums')

module.exports = {

    getTransInvoices(contact_id, property_id){
        let sql = `
            select i.*,
                1 as sign,
                case when i.status = 1 then 'invoice' else 'void' end as transaction_type,
                'Invoice # ' as description_prefix
            from invoices i 
                LEFT JOIN contact_leases cl ON i.lease_id = cl.lease_id and cl.primary = 1 
            where IFNULL(cl.contact_id, i.contact_id) = ${contact_id} 
                and i.property_id = ${property_id}
        `;

        return sql;
    },

    getTransPayments(contact_id, property_id){
        let sql = `
            select p.*,
                -1 as sign,
                'payment' transaction_type,
                'Payment : ' as description_prefix
            from payments p
            where p.property_id = ${property_id}
                and p.contact_id = ${contact_id}
                and p.credit_type in ('adjustment', 'payment', 'credit')
                and not (p.credit_type = 'payment' and p.status = 0 and p.source != 'auto')
                
            union
            
            select p.*,
                -1 as sign,
                'payment' transaction_type,
                'Payment : ' as description_prefix
            from payments p
                JOIN contact_leases cl ON p.lease_id = cl.lease_id AND cl.primary = 1 
            WHERE cl.contact_id = ${contact_id} 
                and p.property_id = ${property_id}
                and p.method = 'adjustment'
                and p.sub_method = 'auction'
            
            union
                
            select p.*,
                1 as sign,
                case 
                    when p.source = 'auto' and p.status = 0 then 'auto-payment-failed'
                    when p.method = 'card' then 'payment-void'
                    else 'reversal'
                end as transaction_type,
                case
                    when p.source = 'auto' and p.status = 0 then 'Autopay Failure : '
                    when p.method = 'card' then 'Payment Void : '
                    else 'Reversal : '
                end as description_prefix
            from payments p
            where p.status != 1
                and p.property_id = ${property_id}
                and p.contact_id = ${contact_id}
                and p.credit_type in ('payment')
                and not (p.status = 0 and p.source != 'auto')

            union

            select p.*,
                -1 as sign,
                'auction-payment' as transaction_type, 
                'Auction Payment : ' as description_prefix
            from payments p 
            where p.id in (
                    select payment_id from lease_auctions where lease_id in (
                        select cl.lease_id
                        from contact_leases cl
                            inner join leases l on l.id = cl.lease_id
                            inner join units u on u.id = l.unit_id
                        where u.property_id = ${property_id} and cl.contact_id = ${contact_id}
                    )
                )
                and p.credit_type in ('payment')
        `;

        return sql;
    },

    getTransRefunds(contact_id, property_id){
        let sql = `
            select r.*, p.payment_methods_id, p.number, p.contact_id, p.property_id, p.date as payment_date, p.method
            from refunds r
                join payments p on p.id = r.payment_id
            where p.property_id = ${property_id}
                and p.contact_id = ${contact_id}
            
            union
            
            select r.*, p.payment_methods_id, p.number, p.contact_id, p.property_id, p.date as payment_date, p.method
            from refunds r
                join payments p on p.id = r.payment_id
            where r.type = 'overage_return'
                and r.payment_id in (
                        select payment_id from lease_auctions
                        where lease_id in (
                            select cl.lease_id
                            from contact_leases cl
                                inner join leases l on l.id = cl.lease_id
                                inner join units u on u.id = l.unit_id
                            where u.property_id = ${property_id} and cl.contact_id = ${contact_id}
                        )
                    )
                    
            union
            
            select r.*, p.payment_methods_id, p.number, p.contact_id, p.property_id, p.date as payment_date, p.method
            from refunds r
                join payments p on p.id = r.payment_id 
            where r.id in (
                    select refund_id from lease_auctions
                    where lease_id in (
                        select cl.lease_id
                        from contact_leases cl
                            inner join leases l on l.id = cl.lease_id
                            inner join units u on u.id = l.unit_id
                        where u.property_id = ${property_id} and cl.contact_id = ${contact_id}
                    )
                )
        `;

        return sql;
    },

    getLedgerByContact(connection, contact_id, property_id, date_ranges){
        let { start_dt, end_dt } = date_ranges;
        if(!start_dt) start_dt = '1900-01-01';
        if(!end_dt) end_dt = '2525-01-01';

        let sql = `
            with trans_invoices as (${this.getTransInvoices(connection.escape(contact_id), connection.escape(property_id))}),
            trans_payments as (${this.getTransPayments(connection.escape(contact_id), connection.escape(property_id))}),
            trans_refunds as (${this.getTransRefunds(connection.escape(contact_id), connection.escape(property_id))}),
            trans_data as (
                select
                    i.transaction_type as transaction_type,
                    i.id as invoice_id,
                    i.number as invoice_nbr,
                    '' as payment_id,
                    null as payment_nbr,
                    '' as refund_id,
                    i.contact_id as contact_id,
                    i.lease_id,
                    ifnull(u.number, '') as unit_nbr,
                    ifnull(u.type, '') as unit_type,
                    case
                        when wo.invoice_id IS NOT NULL then 'Write-Off'
                        when (i.void_date is not null and i.void_date <= ${connection.escape(end_dt)}) then 'Void'
                        when i.paid = 1  OR (i.subtotal + i.total_tax - i.total_discounts - i.total_payments) <= 0 then 'Paid'
                        when date(CONVERT_TZ(now(), 'UTC', ifnull(pr.utc_offset, '-8:00'))) > i.due then 'Past Due'
                        else 'Open'
                    end as status,
                    i.created_at,
                    i.status as hb_inv_status,
                    ifnull(i.period_start, '') as period_start,
                    ifnull(i.period_end, '') as period_end,
                    i.subtotal + i.total_tax - i.total_discounts as 'invoice_amount',
                    ifnull(i.due, '') as due_date,
                    ifnull(i.period_start, '') as transaction_date,
                    i.created_at as created_datetime,
                    i.description_prefix as description_prefix,
                    i.number as description_text,
                    case
                        when ! isnull(i.void_date) then concat('This invoice was voided on ', i.void_date)
                        else null
                    end as note
                from trans_invoices i
                    left join leases l on l.id = i.lease_id
                    left join units u on u.id = l.unit_id
                    join properties pr on pr.id = i.property_id
                    left join (
                        select distinct ip.invoice_id 
                        from invoices_payments ip 
                        join payments p on p.id = ip.payment_id 
                        where p.status = 1 
                        and p.credit_type = 'loss'
                        and p.contact_id = ${connection.escape(contact_id)}
                        and p.property_id = ${connection.escape(property_id)}
                        and ip.amount > 0
                    ) wo on wo.invoice_id = i.id
                    
                union
            
                select 
                    ifnull(p.transaction_type, 'payment') as transaction_type,
                    '' as invoice_id,
                    null as invoice_nbr,
                    p.id as payment_id,
                    ifnull(p.number, '') as payment_number,
                    '' as refund_id,
                    ifnull(p.contact_id, -1) as contact_id,
                    null as lease_id,
                    null as lease_id,
                    null as unit_nbr,
                    null as unit_type,
                    ifnull(p.date, 'unknown') as date,
                    ifnull(p.method, 'unknown') as method,
                    ifnull(p.created, '') as created,
                    ifnull(pm.type, '') as type,
                    ifnull(ifnull(p.sign, 1) * p.amount, 0) as amount,
                    ifnull(pm.card_type, '') as card_type,
                    ifnull(p.date, '') as transaction_date,
                    p.created as created_datetime,
                    ifnull(p.description_prefix, 'Payment : ') as description_prefix,
                    case
                        when p.method = 'check' then concat('Check ', p.number)
                        when p.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end, ''))
                        when p.method = 'cash' then 'Cash'
                        when p.method = 'credit' then 'Credits'
                        when p.method = 'card' then
                            IFNULL(
                                CONCAT(
                                    UPPER(SUBSTRING(pm.card_type, 1, 1)),
                                    LOWER(SUBSTRING(pm.card_type, 2, LENGTH(pm.card_type) - 1)),
                                    ' **** ',
                                    IFNULL(pm.card_end, '')
                                ),
                                'unknown card'
                            )
                        when p.method = 'adjustment' then
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
                                , ' adjustment'
                            )
                        else p.method
                    end as description_text, 
                    '' as note
                from trans_payments p 
                    left join payment_methods pm on pm.id = p.payment_methods_id 
                    
                union
            
                select 
                    'refund' as transaction_type, 
                    '' as invoice_id, 
                    null as invoice_nbr, 
                    r.payment_id, 
                    ifnull(r.number, '') as payment_number,
                    r.id as refund_id,
                    ifnull(r.contact_id, -1) as contact_id, 
                    null as lease_id, 
                    null as unit_nbr, 
                    null as unit_type, 
                    null as status, 
                    ifnull(r.payment_date, 'unknown') as date, 
                    ifnull(r.method, 'unknown') as method, 
                    ifnull(r.created_at, '') as created, 
                    ifnull(pm.type, '') as type, 
                    ifnull(r.amount, 0) as amount, 
                    ifnull(pm.card_type, '') as card_type, 
                    ifnull(r.date, '') as transaction_date, 
                    r.created_at as created_datetime,
                    case 
                        when r.type = "nsf" then "NSF Reversal :"
                        when r.type = "ach" then "ACH Reversal :"
                        when r.type = "offline" then "Offline Reversal :"
                        when r.type = "chargeback" then "C.C. Chargeback :"
                        when r.type = "overage_return" then "Overage Return :"
                        When r.type = "${ENUMS.REVERSAL_TYPES.VOID}" then "Void :"
                        When r.type = "${ENUMS.REVERSAL_TYPES.CREDIT}" then "Reversal :"
                        else "Refund :"
                    end as description_prefix, 
                    case
                        when r.method = 'check' then concat('Check ', r.number)
                        when r.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end, ''))
                        when r.method = 'cash' then 'Cash'
                        when r.method = 'credit' then 'Credits'
                        when r.method = 'card' then
                            IFNULL(
                                CONCAT(
                                    UPPER(SUBSTRING(pm.card_type, 1, 1)),
                                    LOWER(SUBSTRING(pm.card_type, 2, LENGTH(pm.card_type) - 1)),
                                    ' **** ',
                                    IFNULL(pm.card_end, '')
                                ),
                                'unknown card'
                            )
                        else r.method
                    end as description_text, 
                    concat(
                        'For Payment [', 
                        case
                            when r.method = 'check' then concat('Check ', r.number)
                            when r.method = 'ach' then concat('ACH **** ', ifnull(pm.card_end, ''))
                            when r.method = 'cash' then 'Cash'
                            when r.method = 'credit' then 'Credits'
                            when r.method = 'card' then
                                IFNULL(
                                    CONCAT(
                                        UPPER(SUBSTRING(pm.card_type, 1, 1)),
                                        LOWER(SUBSTRING(pm.card_type, 2, LENGTH(pm.card_type) - 1)),
                                        ' **** ',
                                        IFNULL(pm.card_end, '')
                                    ),
                                    'unknown card'
                                )
                            else r.method
                        end, 
                        '] made on ', 
                        date_format(r.payment_date, '%b %e, %Y')
                    ) as note
                from trans_refunds r 
                    left join payment_methods pm on pm.id = r.payment_methods_id
            
                union 
            
                select 
                    'write-off' as transaction_type, 
                    i.id as invoice_id, 
                    i.number as invoice_nbr, 
                    p.id as payment_id, 
                    ifnull(p.number, '') as payment_number,
                    '' as refund_id,
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
                    p.created as created_datetime,
                    'Write Off : ' as description_prefix, 
                    concat('Invoice #', i.number) as description_text, 
                    '' as note
                from payments p 
                    left join payment_methods pm on pm.id = p.payment_methods_id 
                    join invoices_payments ip on ip.payment_id = p.id 
                    join invoices i on i.id = ip.invoice_id 
                    join leases l on l.id = i.lease_id
                    join units u on u.id = l.unit_id
                where p.status = 1 
                    and p.credit_type = 'loss'
                    and p.property_id = ${connection.escape(property_id)}
                    and p.contact_id = ${connection.escape(contact_id)}
            ),
            
            trans_final as (
                select
                    created_at,
                    transaction_date,
                    created_datetime,
                    transaction_type,
                    case
                        when transaction_type in ('invoice', 'refund', 'void') then invoice_id
                        when transaction_type in ('write-off') then concat(payment_id, invoice_id)
                        when transaction_type in ('payment', 'credit', 'reversal', 'payment-void', 'auto-payment-failed', 'auction-payment') then payment_id
                    end as id,
                    case
                        when transaction_type in ('invoice', 'refund', 'void') then ifnull(invoice_nbr, '')
                        when transaction_type in ('payment', 'credit', 'reversal', 'payment-void', 'auto-payment-failed', 'auction-payment', 'write-off') then ifnull(payment_nbr, '')
                    end as nbr,
                    ifnull(lease_id, '') as lease_id,
                    ifnull(unit_nbr, '') as unit_nbr,
                    ifnull(unit_type, '') as unit_type,
                    ifnull(description_prefix, '') as description,
                    ifnull(description_text, '') as description_text,
                    ifnull(status, '') as status,
                    invoice_amount as transaction_amt,
                    sum(case when status = 'void' then 0 else invoice_amount end)
                        over (order by transaction_date, transaction_type, invoice_id, payment_id desc) as running_balance, 
                    ifnull(note, '') as note, 
                    invoice_id, 
                    payment_id,
                    refund_id
                from trans_data
                order by transaction_date desc, created_datetime desc, transaction_type desc, id desc, invoice_id desc, payment_id desc
            )
            
            select
                UUID() as row_guid,
                tr.transaction_amt as amount,
                tr.transaction_date as date,
                tr.transaction_type as type,
                tr.id,
                tr.nbr as number,
                ifnull(tr.lease_id, '') as lease_id,
                ifnull(tr.unit_nbr, '') as unit_nbr,
                ifnull(tr.unit_type, '') as unit_type,
                JSON_OBJECT(
                    'prefix', ifnull(tr.description, ''),
                    'text', ifnull(tr.description_text, '')
                ) as description,
                ifnull(tr.status, '') as status,
                sum(
                    case
                        when tr.status = 'void' then 0
                        else tr.transaction_amt
                    end
                ) over (
                    order by tr.transaction_date, tr.created_datetime, tr.id, tr.transaction_amt, tr.transaction_type
                ) as running_balance,
                ifnull(tr.note, '') as note,
                tr.invoice_id,
                tr.payment_id,
                tr.refund_id,
                if(DATE(CONVERT_TZ(NOW(), '+00:00', (select utc_offset from properties where id = ${connection.escape(property_id)}))) < DATE(tr.transaction_date),
                    'future',
                    'past'
                ) as category,
                CASE
                    when (tr.transaction_type = 'invoice' or tr.transaction_type = 'void' or tr.transaction_type = 'write-off')
                    then (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'invoice_id', cil.invoice_id,
                                'description', cil.description,
                                'quantity', cil.quantity,
                                'amount', cil.amount,
                                'start_date', cil.start_date,
                                'end_date', cil.end_date,
                                'product_type', cil.product_type
                            )
                        ) 
                        FROM (
                            select
                                il.invoice_id,
                                ifnull(il.description, ifnull( p.name, ifnull(p.description, ''))) as description,
                                il.qty as quantity,
                                il.cost as amount,
                                il.start_date,
                                ifnull(il.end_date, '') as end_date,
                                ifnull( p.default_type, 'product' ) as product_type
                            from invoice_lines il
                                left join products p on p.id = il.product_id
                            where il.invoice_id = tr.invoice_id
                            
                            union
                            
                            select
                                i.id as invoice_id,
                                'Discount' as description,
                                '1' as quantity,
                                ifnull((-1 * i.total_discounts), 0) as amount,
                                '' as start_date,
                                '' as end_date,
                                'product' as product_type
                            from invoices i
                            where i.id = tr.invoice_id
                            
                            union
                            
                            select
                                i.id as invoice_id,
                                'Tax' as description,
                                '1' as quantity,
                                ifnull(i.total_tax, 0) as amount,
                                '' as start_date,
                                '' as end_date,
                                'product' as product_type
                            from invoices i
                            where i.id = tr.invoice_id
                        ) cil
                        WHERE cil.amount != 0
                        group by cil.invoice_id
                    )
                END as 'lines',
                CASE
                    when (tr.transaction_type = 'payment' or tr.transaction_type = 'auction-payment')
                    then (
                        select
                            JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'invoice_id', i.id,
                                    'invoice_nbr', i.number,
                                    'lease_id', i.lease_id,
                                    'unit_nbr', u.number,
                                    'unit_type', u.type,
                                    'description', JSON_OBJECT(
                                        'prefix', 'Invoice # ',
                                        'text', i.number
                                    ),
                                    'amount', ip.amount,
                                    'start_date', i.period_start,
                                    'end_date', i.period_end
                                )
                            ) AS invoice_json
                        from invoices_payments ip
                            join invoices i on i.id = ip.invoice_id
                            join leases l on l.id = i.lease_id
                            join units u on u.id = l.unit_id
                        where
                            ip.payment_id = tr.payment_id
                    )
                END as invoices
            from trans_final tr
            where tr.transaction_date between ${connection.escape(start_dt)} and ${connection.escape(end_dt)}
            order by tr.transaction_date desc, tr.created_datetime desc, tr.id desc, tr.transaction_amt desc, tr.transaction_type desc
        `;

        console.log("Transaction History SQL: ", sql);
        return connection.queryAsync(sql);
    }

}