var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {
    findAutoByCompanyId:function(connection, company_id){
        var sql = "Select *, (select name from reports where id = report_id) as report_name from scheduled_reports where company_id  = " +  connection.escape(company_id);

        return connection.queryAsync(sql);
    },
    findById:function(connection, id, company_id){
        var sql = "Select * from scheduled_reports where id  = " +  connection.escape(id) + " and company_id  = " +  connection.escape(company_id);

        return connection.queryAsync(sql).then(function(reportRes){
            return reportRes[0] || null;
        });
    },
    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE scheduled_reports set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into scheduled_reports set ?";
        }
        return connection.queryAsync(sql, data);

    },

    delete: function(connection, id, company_id){
        var sql;
        sql = "delete from scheduled_reports where id  = " +  connection.escape(id) + " and company_id  = " +  connection.escape(company_id);
        return connection.queryAsync(sql);

    },


    findScheduledReports:function(connection){
        var now = moment();
        var day = now.format('D');
        var dayofWeek = now.format('dddd');
        var endOfMonthSql = '';

        if(day == now.clone().endOf('month').format('D')){
            endOfMonthSql = " or (time_period = 'monthly' and send_day > '" +  day + "' )  ";
        }

        var sql = "Select * from scheduled_reports where time_period = 'daily' or " +
            " (time_period = 'weekly' and send_day = '" + dayofWeek + "')  or " +
            " (time_period = 'monthly' and send_day = '" +  day + "' )  " + endOfMonthSql;

        return connection.queryAsync(sql);

    },
    findScheduledReportById:function(connection, id){

        var sql = "Select * from scheduled_reports where  id = " + connection.escape(id);
        return connection.queryAsync(sql).then(function(reportRes){
            return reportRes[0] || null;
        });

    },
    
    findBilledProducts(connection, period, products){

        var product_array = products.map(p => { return p.id });

        var sql = "SELECT *, " +
            "(select address from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as address,  " +
            "(select city from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as city,  " +
            " (select state from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as state,  " +
            " (select zip from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as zip,  " +
            " (select number from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id))) as number, " +
            " (select name from products where id = invoice_lines.product_id) as product_name, " +
            " (select SUM(amount) from invoices_payments where invoice_id = invoice_lines.invoice_id ) as payment_amount " +
            " from invoice_lines where product_id in (" + product_array.join(', ') + ") and date <= " + connection.escape(period.end) + " and date >= " + connection.escape(period.start);

        console.log(sql);

        return connection.queryAsync(sql);
    },

    findGeneralLedgerSummary(connection, params) {
        let { company_id, property_ids = [], start_date, end_date, book_id } = params;
        let sql = `SELECT 
                      gla.name as account_name,
                      gla.code as account_code,
                      glc.name as category,
                      glat.name as account_type,
                      glast.name as sub_account_type,
                      gle.credit_debit_type,
                      gle.property_id as property_id,
                      gle.company_gl_account_id as company_gl_account_id,
                      CASE
                        WHEN gle.credit_debit_type =  'debit' THEN Sum(gle.amount)
                        ELSE 0
                      END as debit,
                      CASE
                        WHEN gle.credit_debit_type =  'credit' THEN (Sum(gle.amount) * 1)
                        ELSE 0
                      END as credit
                    FROM gl_exports gle
                    Inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                    left join gl_category glc on gla.category_id = glc.id
                    left join gl_account_type glat on gla.account_type_id = glat.id
                    left join gl_account_subtype glast on gla.account_subtype_id = glast.id
                    Where gle.property_id in (${property_ids.map(p_id => connection.escape(p_id)).join()})
                    And gle.company_id = ${company_id} ${book_id && book_id !== '2' ? `And gle.book_id = '${book_id}'` :''} `;
        if(start_date && end_date) {
            sql += `And Date(gle.export_date) >= ${connection.escape(start_date)}
                    And Date(gle.export_date) <= ${connection.escape(end_date)} `
        } else {
            sql += `And Date(gle.export_date) = ${connection.escape(end_date)} `
        }

        sql += `group by gle.property_id,gle.company_gl_account_id, gle.credit_debit_type
                order by gle.property_id,gla.code`
        const sql_cte_query = `with gl_entries as (${sql})
                                        SELECT 
                                            account_name, 
                                            account_code, 
                                            category, 
                                            account_type, 
                                            sub_account_type, 
                                            credit_debit_type, 
                                            property_id, 
                                            company_gl_account_id,
                                            Sum(debit) as debit,
                                            Sum(credit) as credit
                                            from gl_entries
                                        group by company_gl_account_id`
        console.log('GL Ledger sql =>',sql_cte_query);
        return connection.queryAsync(sql_cte_query);
    },

    saveAccountingExport(connection, data) {
        let sql = "insert into accounting_export_history set ?";
        return connection.queryAsync(sql, data);
    },

    findQuickBookLedgerSummary(connection,conditions) {
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;

        let sql = `SELECT
                      p.name as facility_name, 
                      gla.code as account_number,
                      gla.name as account_name,
                      glc.name as category,
                      glat.name as account_type,
                      glast.name as sub_account_type,
                      gle.export_date as export_date,
                      ${conditions.isSummarized ? 'SUM(': ''}
                      CASE
                        WHEN gle.credit_debit_type =  'debit' THEN gle.amount
                        ELSE 0
                      END ${conditions.isSummarized ? ')':''} as debit,
                      ${conditions.isSummarized ? 'SUM(': ''}
                      CASE
                        WHEN gle.credit_debit_type =  'credit' THEN gle.amount
                        ELSE 0
                      END ${conditions.isSummarized ? ')':''} as credit
                    FROM gl_exports gle
                    Inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                    left join gl_category glc on gla.category_id = glc.id
                    left join gl_account_type glat on gla.account_type_id = glat.id
                    left join gl_account_subtype glast on gla.account_subtype_id = glast.id
                    Inner join properties as p on gle.property_id = p.id
                    Where gle.company_id = ${conditions.company_id}
                    And gle.property_id in (${properties})
                    ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
                    if(conditions.start_date && conditions.end_date) {
                        sql += ` And Date(gle.export_date) >= ${connection.escape(conditions.start_date)}
                                And Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                    } else {
                        sql += ` And Date(gle.export_date) = ${connection.escape(conditions.end_date)} `
                    }
                    sql += `${conditions.isSummarized ? " group by gle.property_id,gle.export_date, gle.company_gl_account_id":""} 
                    order by gle.property_id,gle.export_date;`
        console.log("QuickBook Sql, ",sql);
        return connection.queryAsync(sql);
    },

    findYardiDetails(connection,conditions){
        const { property_id, property_ids, company_id, format } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        const isYardiFinancialJournal = format === ENUMS.ACCOUNTING.EXPORT_FORMATS.YARDI_FINANCIAL_JOURNAL ? true : false;
        const isYardiFinancialJournalSummarized = isYardiFinancialJournal && conditions.isSummarized;

        const { ACCOUNTING: ACCOUNTING_ENUMS } = ENUMS;
        const { TRANNUM_ORDER, EVENTS: ACCOUNTING_EVENTS } = ACCOUNTING_ENUMS;

        let sql = `select * from (
                    with exports as (
                        select gle.id, gle.export_date, gle.credit_debit_type, gle.amount, gle.company_gl_account_id, gle.gl_event_company_id, gle.book_id,
                            p.number as property_number, glev.name as gl_event_name,
                            gla.code as account, gla.name as description,
                            p.id as property_id,
                            (select value from settings where name = 'yardiFinancialJournalDisplayType' and company_id = ${company_id}) as display_type,
                            ${conditions.isSummarized 
                                ? `CONCAT( DATE_FORMAT(gle.export_date,'%m%d%Y'), gle.book_id, IFNULL(pmt.identifier, 6) ${isYardiFinancialJournalSummarized ? `, if(glec.gl_event_id = ${ACCOUNTING_EVENTS.REFUNDS}, ${TRANNUM_ORDER.REFUNDS}, ${TRANNUM_ORDER.DEFAULT})` : ''})`
                                : 'gle.trannum'
                            } as first_trannum,
                            ${conditions.export_ref_transaction ?
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
                                WHEN glec.gl_event_id = 11 Then 'P2P'
                            END`:"'HB'"} as ref,
                            ${conditions.isSummarized ? 
                            `CASE 
                                WHEN glec.gl_event_id IN (3,9) THEN CONCAT(${isYardiFinancialJournal ? `p.number, ' - ', ` : ''} UCASE(LEFT(pay.method, 1)),LCASE(SUBSTRING(pay.method, 2)))  
                                ${isYardiFinancialJournal ? `WHEN glec.gl_event_id IN (5) THEN CONCAT(p.number, ' - ', UCASE(LEFT(pay.method, 1)), LCASE(SUBSTRING(pay.method, 2)), ' ', glev.name)` : ''}
                                else CONCAT(${isYardiFinancialJournal ? `p.number, ' - ', ` : ''} glev.name) end as remark1`: 
                            `CASE
                                WHEN glec.gl_event_id in (1,2,4)
                                    THEN concat(
                                                    (select concat(first, ' ', last) from contacts where id = inv.contact_id),
                                                        ':Invoice No - ',inv.number,':Space No - ',(select number from units where id  = (select unit_id from leases where id= inv.lease_id))
                                                )
                                WHEN glec.gl_event_id in (5,7)
                                    THEN concat((select concat(first, ' ', last) from contacts where id = pay.contact_id),':',CASE WHEN glec.gl_event_id = 5 THEN ifnull(r.reason,'Unavailable') ELSE ifnull(pay.notes,'Unavailable') END,':Space No - ',        
                                                (CASE
                                                    WHEN glec.gl_event_id in (5,7)
                                                        THEN (select group_concat(number) from units where id  in (select unit_id from leases where id in
                                                                (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = (CASE WHEN glec.gl_event_id = 5 Then r.payment_id ELSE pay.id  END) ))))
                                                END)
                                                )
                                WHEN glec.gl_event_id in (11)
                                    THEN  concat('P2P - ', 
                                    (
                                        select pr.name from
                                            inter_property_payments ipp join payments p on p.id = ipp.source_payment_id
                                            join properties pr on pr.id = p.property_id
                                        where 
                                            ipp.payment_id = pay.id
                                    ), ' - ', 
                                    (select concat(c.first, ' ', c.last))
                                    )            
                                WHEN glec.gl_event_id in (3, 6, 8, 9, 10)
                                    THEN concat((select concat(first, ' ', last) from contacts where id = inv.contact_id),':',
                                        (Case
                                            When pay.method = 'cash' Then concat(${isYardiFinancialJournal ? `p.number, ' - '` : ''} 'Cash - ',ifnull(pay.ref_name,'Unavailable'))
                                            When pay.method = 'check' Then concat(${isYardiFinancialJournal ? `p.number, ' - '` : ''} 'Check No - ',  ifnull(pay.number,'Unavailable'))
                                            When pay.method = 'giftcard' Then concat(${isYardiFinancialJournal ? `p.number, ' - '` : ''} 'Gift Card No - ',  ifnull(pay.number,'Unavailable'))
                                            When pay.method = 'card' Then concat(${isYardiFinancialJournal ? `p.number, ' - '` : ''} 'Card End - ',(select ifnull(card_end,'Unavailable')   from payment_methods where id = pay.payment_methods_id))
                                            When pay.method = 'ach' Then concat(${isYardiFinancialJournal ? `p.number, ' - '` : ''} 'Account Number End - ', (select  ifnull(card_end,'Unavailable') from payment_methods where id = pay.payment_methods_id))
                                            ELSE ifnull(pay.notes,'Unavailable')
                                        END)
                                    ,':Space No - ',ifnull((select number  from units where id  = (select unit_id from leases where id= inv.lease_id)),'Unavailable'))
                                ELSE ''
                            END as remark1`},
                            CASE 
                                WHEN glec.gl_event_id IN (5) THEN 2
                                ELSE 1
                            end as order_no
                        from gl_exports gle
                        inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                        Inner join properties p on gle.property_id = p.id
                        inner join gl_event_company glec on gle.gl_event_company_id = glec.id
                        inner join gl_events glev on glec.gl_event_id = glev.id
                        left join  invoices_payments_breakdown ipb on ipb.id= gle.object_id
                        left join refunds r on r.id = gle.object_id
                        left join payments pay on pay.id = (
                            CASE
                                WHEN glec.gl_event_id in (3, 6, 8, 9, 10) THEN ipb.payment_id
                                WHEN glec.gl_event_id = 5 THEN r.payment_id
                                WHEN glec.gl_event_id in (7, 11) THEN gle.object_id
                                ELSE ''
                            END
                        )
                        left join payment_method_type pmt on pmt.id = pay.payment_method_type_id
                        left join invoices inv on inv.id = (
                            CASE
                                    WHEN glec.gl_event_id in (3, 6, 8, 9, 10) THEN ipb.invoice_id
                                    WHEN glec.gl_event_id in (1, 2, 4) THEN gle.object_id
                                    ELSE ''
                            END
                        )
                        left join contacts c on c.id = (
                                CASE
                                        WHEN glec.gl_event_id in (1, 2, 3, 4, 6, 8, 9, 10) THEN inv.contact_id
                                        WHEN glec.gl_event_id  in (5,7,11)  THEN pay.contact_id
                                        ELSE ''
                                END
                        )
                        where gle.company_id = ${conditions.company_id} 
                            and glev.id not in (${ ACCOUNTING_ENUMS.EVENTS.INTER_PROPERTY_PAYMENT })
                            and (gle.notes is null or gle.notes not in (${connection.escape(ACCOUNTING_ENUMS.NOTES.INVERTED_INTER_PROPERTY_INVOICE)}))
                            ${properties ? ` and gle.property_id in (${properties})` : ''} 
                            ${conditions.book_id && conditions.book_id !== '2' ? ` and gle.book_id = '${conditions.book_id}'` :''}
                            ${conditions.start_date && conditions.end_date 
                                ? ` and date(gle.export_date) >= ${connection.escape(conditions.start_date)} and date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                                : ` and Date(gle.export_date) = ${connection.escape(conditions.end_date)} `}
                    )
                    SELECT
                        "J" as type,
                        ${conditions.isNewSequence ? 'DENSE_RANK() OVER (ORDER BY property_id, first_trannum)' : 'first_trannum'} as trannum,
                        null as person,
                        null as name,
                        DATE_FORMAT(export_date,'%m/%d/%Y') as date,
                        DATE_FORMAT(export_date,'%m/01/%Y') as post_month,
                        ref,
                        display_type,
                        ${conditions.isSummarized ? 'group_concat(distinct(remark1))' : 'remark1'} as remark,
                        ${conditions.isSummarized ? 'group_concat(distinct(remark1))' : 'remark1'} as notes2,
                        ${conditions.isSummarized ? 'group_concat(distinct(remark1))' : 'remark1'} as description2,
                        property_number as prop,
                        ${conditions.isSummarized ? 'Sum' : ''}(CASE 
                            WHEN credit_debit_type =  'debit' THEN amount
                            WHEN credit_debit_type =  'credit' THEN -1 * amount
                        END) as amount,
                        account,
                        null as accrual,
                        null as offset,
                        ${conditions.format_yardi_book_id &&  conditions.book_id && conditions.book_id === '0'?
                            `'1000'`: `book_id`} as book_num,                        
                        credit_debit_type,
                        description,
                        "0" as flag
                    from exports
                    ${conditions.isSummarized ? `group by first_trannum, gl_event_company_id, company_gl_account_id, credit_debit_type, property_id` : ''}
                    order by  property_id, trannum ${isYardiFinancialJournalSummarized ? ', order_no' : ''}
                ) x`
        console.log("YARDI SQL ==> ",sql);
        return connection.queryAsync(sql);
    },

    findYardiIPPDetails(connection,conditions){
        const { property_id, property_ids, company_id, format } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        const { ACCOUNTING: ACCOUNTING_ENUMS } = ENUMS;

        let sql = `select * from (
                with exports as (
                    SELECT
                        pro.number as property_number, gla.code as gl_code, gle.export_date, gle.amount, gle.book_id,
                        CASE 
                            WHEN gle.book_id = '0' THEN 'Cash'
                            WHEN gle.book_id = '1' THEN 'Accrual'
                            ELSE ''
                        END as book_type,
                        glev.id as event_id,
                        CASE
                            WHEN glec.gl_event_id in (3)  THEN (select id from inter_property_payments ipp where ipp.source_payment_id = pay.id)
                            WHEN glec.gl_event_id in (11) THEN (select id from inter_property_payments ipp where ipp.payment_id = pay.id)
                            ELSE ''
                        END as ipp_id,
                        Case
                            When pay.method = 'adjustment' Then (select method from payments where id = (select source_payment_id from inter_property_payments ipp where ipp.payment_id = pay.id))
                            ELSE pay.method
                        END as payment_method,
                        inv.id as invoice_id,
                        pay.id as payment_id,
                        concat(first, ' ', last) as contact_name,
                        gle.credit_debit_type,
                        CASE
							WHEN gle.credit_debit_type = 'credit' then (select if(ga.is_group = 1 and ga.code = 'payment', concat('P2P - ', payment_method), 'P2P') from gl_accounts ga where ga.id = glec.gl_account_credit_id)
                            Else (select if(ga.is_group = 1 and ga.code = 'payment', concat('P2P - ', payment_method), 'P2P') from gl_accounts ga where ga.id = glec.gl_account_debit_id)
						end as ref
                        
                    from gl_exports gle
                    inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                    inner join gl_event_company glec on gle.gl_event_company_id = glec.id
                    inner join gl_events glev on glec.gl_event_id = glev.id
                    inner join gl_category glc on glc.id = gla.category_id
                    inner join gl_account_type glat on glat.id = gla.account_type_id
                    inner join gl_account_subtype glast on glast.id = gla.account_subtype_id
                    inner join properties pro on pro.id = gle.property_id
                    left join invoices_payments_breakdown ipb on ipb.id= gle.invoice_payment_breakdown_id
                    left join payments pay on pay.id = (
                    CASE
                        WHEN glec.gl_event_id in (3) THEN ipb.payment_id
                        WHEN glec.gl_event_id in (11) THEN gle.payment_id
                        ELSE ''
                    END
                    )
                    left join invoices inv on inv.id = (
                    CASE
                        WHEN glec.gl_event_id in (3) THEN ipb.invoice_id
                        ELSE ''
                    END
                    )
                    left join contacts c on c.id = (
                    CASE
                        WHEN glec.gl_event_id in (3) THEN inv.contact_id
                        WHEN glec.gl_event_id in (11)  THEN pay.contact_id
                        ELSE ''
                    END
                    )
                    where   ${conditions.start_date && conditions.end_date 
                                ? ` Date(gle.export_date) >= ${connection.escape(conditions.start_date)} 
                                    and Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                                : ` Date(gle.export_date) = ${connection.escape(conditions.end_date)} `}
                    and gle.company_id = ${conditions.company_id}
                    ${properties ? ` and gle.property_id in (${properties})` : ''}
                    and (
                            (glev.id = 3 and gle.notes in (${connection.escape(ACCOUNTING_ENUMS.NOTES.INVERTED_INTER_PROPERTY_INVOICE)})) 
                            OR glev.id = 11
                        )
                    Order by gle.book_id
                )
                select
                    ${conditions.isNewSequence ? 'DENSE_RANK() OVER (ORDER BY ipp_id)' : 'ipp_id'} as trannum,
                    '1000' as book_num,
                    (select value from settings where name = 'yardiFinancialJournalDisplayType' and company_id = ${company_id}) as display_type,
                    ref,
                    'P2P TRANSFER' as notes2,
                    property_number as prop,
                    gl_code as account,
                    DATE_FORMAT(export_date,'%m/%d/%Y') as date,
                    DATE_FORMAT(export_date,'%m/01/%Y') as post_month,
                    CASE 
                        WHEN credit_debit_type =  'debit' THEN amount
                        WHEN credit_debit_type =  'credit' THEN -1 * amount
                    END as amount,
                    concat(
                            (select group_concat(pr.number SEPARATOR ' P2P ') from inter_property_payments ipp 
                            inner join payments p on p.id in (ipp.payment_id,ipp.source_payment_id)
                            inner join properties pr on pr.id = p.property_id
                            where ipp.id = ipp_id),
                            ' - ',
                            contact_name,
                             ' - Space ',
                             (select  group_concat(distinct u.number SEPARATOR ', ')  from inter_property_payments ipp 
                                inner join invoices_payments ip on ip.payment_id in (ipp.payment_id,ipp.source_payment_id)
                                inner join invoices i on ip.invoice_id = i.id
                                inner join leases l on i.lease_id = l.id
                                inner join units u on l.unit_id = u.id
                                where ipp.id = ipp_id)
                    ) as description,
                    Case
                        When payment_method = 'cash' Then 'Cash'
                        When payment_method = 'check' Then 'Check'
                        When payment_method = 'card' Then 'Card'
                        When payment_method = 'ach' Then 'ACH'
                        ELSE ''
                    END as remark
                from exports
                order by trannum
            ) x;`
        console.log("YARDI FIN IPP SQL ==> ",sql);
        return connection.queryAsync(sql);
    },

    findScheduleExportsByMinPropertyOffset(connection, payload) { 
        const { property_ids } = payload;

        const sql = `
            select aec.*,
            (select id from properties p where JSON_CONTAINS(aec.property_ids, cast(p.id as json), '$') and 
            utc_offset = (select min(cast(utc_offset as signed)) from properties p where JSON_CONTAINS(aec.property_ids, cast(p.id as json), '$')) limit 1) as min_offset_property_id,
            (select min(cast(utc_offset as signed)) from properties p where JSON_CONTAINS(aec.property_ids, cast(p.id as json), '$')) as min_offset
            from accounting_export_configurations aec
            where aec.active = 1 
            having min_offset_property_id in (${ property_ids.map(p => connection.escape(p)).join(',') });                
        `;

        return connection.queryAsync(sql);
    },

    findScheduleExportById(connection, payload = {}) {
        const { accounting_export_configuration_id, date, utc_offset } = payload;
        
        let day_of_week = moment(date).format('dddd');
        let day_of_month = moment(date).date();
        let month = moment(date).format('MMM');
        let days = [];

        if(day_of_month === 30 && month === 'Apr') {
            days = [30,31];
        } else {
            days = [day_of_month];
        }

        let sql = `SELECT
                    aec.property_ids,
                    aec.id as config_id,
                    aec.frequency,
                    aec.type,
                    aec.format,
                    aec.send_to,
                    aec.book_id,
                    CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", ${connection.escape(utc_offset)}) as date
                FROM accounting_export_configurations aec
                WHERE aec.id=${accounting_export_configuration_id}
                AND aec.active = 1
                AND	((frequency = 'daily')
                    OR	(frequency = 'weekly'       and day_of_week = '${day_of_week}')
                    OR	(frequency = 'biweekly'     and day_of_week = '${day_of_week}' and (last_exported is null or DATE_ADD(last_exported,INTERVAL 14 DAY) = '${date}'))
                    OR	(frequency = 'monthly'      and day_of_month = ${day_of_month})
                    OR	(frequency = 'quarterly'    and day_of_month in (${days.map(d => connection.escape(d)).join(', ')}) and (last_exported is null or DATE_ADD(last_exported,INTERVAL 3 Month) = '${date}'
                    OR DATE_ADD(DATE_ADD(last_exported,INTERVAL 3 Month), INTERVAL 1 day) = '${date}')
                ))`;

        console.log('findScheduleExportsById SQL: ', sql);
        return connection.queryAsync(sql).then(ec => ec.length ? ec[0] : null);
    },

    findScheduleExportsByProperty(connection, company_id, property_id, date) {
        let day_of_week = moment(date).format('dddd');
        let day_of_month = moment(date).date();
        let month = moment(date).format('MMM');
        let days = [];

        if(day_of_month === 30 && month === 'Apr') {
            days = [30,31];
        } else {
            days = [day_of_month];
        }

        let sql = `SELECT
                    aec.id as config_id,
                    aec.frequency,
                    aec.type,
                    aec.format,
                    aec.send_to,
                    aec.book_id,
                    p.utc_offset,
                    CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", p.utc_offset) as date
                FROM accounting_export_configurations aec
                INNER JOIN properties p ON aec.property_id = p.id
                WHERE aec.company_id = ${company_id}
                AND aec.property_id = ${property_id}
                AND aec.active = 1
                AND	((frequency = 'daily')
                    OR	(frequency = 'weekly'       and day_of_week = '${day_of_week}')
                    OR	(frequency = 'biweekly'     and day_of_week = '${day_of_week}' and (last_exported is null or DATE_ADD(last_exported,INTERVAL 14 DAY) = '${date}'))
                    OR	(frequency = 'monthly'      and day_of_month = ${day_of_month})
                    OR	(frequency = 'quarterly'    and day_of_month in (${days.map(d => connection.escape(d)).join(', ')}) and (last_exported is null or DATE_ADD(last_exported,INTERVAL 3 Month) = '${date}'
                        OR DATE_ADD(DATE_ADD(last_exported,INTERVAL 3 Month), INTERVAL 1 day) = '${date}')
                    ));`;
        console.log('findScheduleExportsByProperty sql =>',sql)
        return connection.queryAsync(sql);
    },

    updateAccountingExportedDate(connection, data) {
        let sql = ` Update accounting_export_configurations
                    Set last_exported='${data.date || moment().format('YYYY-MM-DD')}'
                    Where id=${data.config_id}`;
        return connection.queryAsync(sql);
    },

    findQuickBookIIFDetails(connection,conditions) {
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        let sql = `with exports as (
                        SELECT
                            gle.transaction_id as trans_id,
                            gle.trannum as first_trannum,
                            'GENERAL JOURNAL' as tran_type,
                            gle.export_date as export_date,
                            p.name as facility_name,
                            p.number as facility_number, 
                            gla.code as account_number,
                            IF(credit_debit_type = "debit", gle.amount, gle.amount * -1) as amount,
                            gla.name as account_name,
                            gle.credit_debit_type,
                            property_id,
                            gle.company_gl_account_id
                        FROM gl_exports gle
                        Inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                        Inner join gl_category glc on gla.category_id = glc.id
                        Inner join gl_account_type glat on gla.account_type_id = glat.id
                        Inner join gl_account_subtype glast on gla.account_subtype_id = glast.id
                        Inner join properties as p on gle.property_id = p.id
                        Where gle.property_id in (${properties})
                        And gle.company_id = ${conditions.company_id} ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
                        if(conditions.start_date && conditions.end_date) {
                            sql += ` And Date(gle.export_date) >= ${connection.escape(conditions.start_date)}
                                    And Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                        } else {
                            sql += ` And Date(gle.export_date) = ${connection.escape(conditions.end_date)} `
                        }
                    
                    sql += `) 
                            select
                                trans_id,
                                ${conditions.isSummarized ? 'DENSE_RANK() OVER (ORDER BY property_id, export_date)': 'first_trannum'} AS trannum,
                                ${conditions.isSummarized ? 'SUM(amount)': 'amount'} AS amount,
                                tran_type,
                                export_date as date,
                                facility_name,
                                facility_number, 
                                account_number,
                                account_name
                            from exports 
                            ${conditions.isSummarized ? 'group by property_id,export_date, company_gl_account_id': ''}
                            order by trannum,company_gl_account_id;`;
        console.log("QuickBooks IIF Sql, ",sql);
        return connection.queryAsync(sql);
    },

    findSavedReportsByCompanyId(connection,company_id){
        let sql = `select * from saved_reports where company_id = ${connection.escape(company_id)}`;
        return connection.queryAsync(sql);
    },

    updateSavedReportsOfCompany(connection,data,id){
        let sql = `update saved_reports set ? where id = ${connection.escape(id)}`;
        return connection.queryAsync(sql, data);
    },

    findSageIntacctDetails(connection,conditions) {
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;

        let sql = `SELECT * from (
                    WITH ctx_exports as (
                    SELECT
                        'SLJ'  as journal,
                        DATE_FORMAT(gle.export_date,'%m/%d/%Y') as export_date_1,
                        Case 
                            When p.number is null Then DATE_FORMAT(gle.export_date,'%m/%d/%Y')
                            When p.number is not null Then  CONCAT(p.number,'_',DATE_FORMAT(gle.export_date,'%m/%d/%Y'))
                        End as description_1,
                        ROW_NUMBER() OVER (PARTITION BY gle.property_id,gle.export_date,gle.trannum order by export_date) AS line_no,
                        gla.code as account_number,
                        ${conditions.isSummarized ? 'SUM(': ''}
                        CASE
                            WHEN gle.credit_debit_type =  'debit' THEN gle.amount
                            ELSE 0
                        END ${conditions.isSummarized ? ')':''} as debit,
                        ${conditions.isSummarized ? 'SUM(': ''}
                        CASE
                            WHEN gle.credit_debit_type = 'credit' THEN gle.amount
                            ELSE 0
                        END ${conditions.isSummarized ? ')':''} as credit,
                        null as source_entity
                        
                    FROM gl_exports gle
                    Inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                    Inner join properties as p on gle.property_id = p.id
                    Where gle.company_id = ${conditions.company_id}
                    And gle.property_id in (${properties})
                    ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
                    if(conditions.start_date && conditions.end_date) {
                        sql += ` And Date(gle.export_date) >= ${connection.escape(conditions.start_date)}
                                And Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                    } else {
                        sql += ` And Date(gle.export_date) = ${connection.escape(conditions.end_date)} `
                    }
                    sql += `${conditions.isSummarized ? " group by gle.property_id,gle.export_date,gle.credit_debit_type":""} 
                )
                    
                    Select
                        journal,
                        CASE
                            WHEN line_no <> 1 Then ''
                            ELSE export_date_1
                        END AS export_date,
                        CASE
                            WHEN line_no <> 1 Then ''
                            ELSE description_1
                        END AS description,
                        account_number,
                        line_no,
                        debit,
                        credit,
                        source_entity
                    From ctx_exports
            ) x;`
        console.log("SageIntacct Sql, ",sql);
        return connection.queryAsync(sql);
    },

    findChargesDetails(connection,conditions) {
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        let sql = `
            SELECT 
                pro.number as property_number,
                pro.name as property_name,
                gle.trannum as transaction_number,
                glev.name as event_name,
                concat(c.first, ' ', c.last) as tenant_name,
                CASE 
                    WHEN glec.gl_event_id in (5,7,11)
                    THEN (select group_concat(number) from units where id  in (select unit_id from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = (CASE WHEN glec.gl_event_id = 5 Then ref.payment_id ELSE pay.id  END) ))))
                    ELSE (select number from units where id  = (select unit_id from leases where id= inv.lease_id))
                END as space_number,
                gle.export_date,
                gle.credit_debit_type,
                gla.code as gl_code,
                gla.name as gl_name,
                gle.amount,
                glc.name as category,
                glat.name as account_type,
                glast.name as account_subtype,
                CASE 
                    WHEN gle.book_id = '0' THEN 'Cash'
                    WHEN gle.book_id = '1' THEN 'Accrual'
                    ELSE ''
                END as book_type,
                inv.number as invoice_number,
                inv.due as invoice_due_date,
                CASE
		            WHEN glec.gl_event_id in (2) THEN concat('Voided By:',(select case when id is null then 'Unavailable' else concat(first, ' ', last) end from contacts where id = inv.voided_by_contact_id))
                    WHEN glec.gl_event_id in (5) THEN ref.reason
                    WHEN glec.gl_event_id in (7) THEN pay.notes
                    WHEN glec.gl_event_id in (11)
                        THEN  concat('P2P - ', 
                        (
                            select pr.name from
                                inter_property_payments ipp join payments p on p.id = ipp.source_payment_id
                                join properties pr on pr.id = p.property_id
                            where 
                                ipp.payment_id = pay.id
                        ), ' - ', 
                        (select concat(c.first, ' ', c.last)))
                    WHEN glec.gl_event_id in (3, 6, 8, 9, 10) THEN
                        Case
                            When pay.method = 'cash' Then concat('Cash:',pay.ref_name)
                            When pay.method = 'check' Then concat('Check No:',pay.number)
                            When pay.method = 'giftcard' Then concat('Gift Card No:',pay.number)
                            When pay.method = 'card' Then concat('Card End:',(select card_end from payment_methods where id = pay.payment_methods_id))
                            When pay.method = 'ach' Then concat('Account Number End:', (select card_end from payment_methods where id = pay.payment_methods_id))
                            ELSE pay.notes
                        END
                    ELSE ''
                END as comments
            
            from gl_exports gle
            inner join gl_accounts gla on gle.company_gl_account_id = gla.id
            inner join gl_event_company glec on gle.gl_event_company_id = glec.id
            inner join gl_events glev on glec.gl_event_id = glev.id
            left join gl_category glc on glc.id = gla.category_id
            left join gl_account_type glat on glat.id = gla.account_type_id
            left join gl_account_subtype glast on glast.id = gla.account_subtype_id
            inner join properties pro on pro.id = gle.property_id
            left join invoices_payments_breakdown ipb on ipb.id= gle.object_id
            left join refunds ref on ref.id = gle.object_id
            left join payments pay on pay.id = (
                CASE
                    WHEN glec.gl_event_id in (5) THEN ref.payment_id
                    WHEN glec.gl_event_id in (7,11) THEN gle.object_id
                    ELSE ipb.payment_id
                END
            )
            left join invoices inv on inv.id = (
                CASE
                    WHEN glec.gl_event_id in (3, 6, 8, 9, 10, 11) THEN ipb.invoice_id
                    WHEN glec.gl_event_id in (1, 2, 4) THEN gle.object_id
                    ELSE ''
                END
            )
            left join contacts c on c.id = (
                CASE
                    WHEN glec.gl_event_id in (1, 2, 3, 4, 6, 8, 9, 10) THEN inv.contact_id
                    WHEN glec.gl_event_id  in (5,7,11)  THEN pay.contact_id
                    ELSE ''
                END
            )
            Where gle.property_id in (${properties})
            And gle.company_id = ${conditions.company_id} ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
            if(conditions.start_date && conditions.end_date) {
                sql += ` And Date(gle.export_date) >= ${connection.escape(conditions.start_date)}
                        And Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
            } else {
                sql += ` And Date(gle.export_date) = ${connection.escape(conditions.end_date)} `
            }

            sql += `Order by gle.property_id,transaction_number;`

        console.log("findChargesDetails Sql, ",sql);
        return connection.queryAsync(sql);
    },

    AccountantSummary(connection,conditions) {
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        let sql = `
                select * from (
                    with exports as (
                        select
                            concat(ifnull(p.number,'unavailable'),' - ',ifnull(p.name,'unavailable')) as property_name,
                            CASE 
                                WHEN gle.book_id = '0' THEN 'Cash'
                                WHEN gle.book_id = '1' THEN 'Accrual'
                                ELSE ''
                            END as book_type,
                            gle.book_id,
                            concat(ifnull(gla.code,'unavailable'),' - ',ifnull(gla.name,'unavailable')) as gl_account,
                            CASE
                                WHEN glec.gl_event_id in (1,2) THEN 'Charges'
                                WHEN glec.gl_event_id in (3,8) THEN 'Payments'
                                WHEN glec.gl_event_id in (9,10) THEN 'Prepaid Liability'
                                WHEN glec.gl_event_id in (4) THEN 'Liability Recognition'
                                WHEN glec.gl_event_id in (5) THEN 'Refunds'
                                WHEN glec.gl_event_id in (6) THEN 'Bad Debt'
                                WHEN glec.gl_event_id in (7) THEN 'Allowances'
                            END AS event_category,
                            SUM(CASE WHEN gle.credit_debit_type =  'debit' THEN gle.amount ELSE 0 END) as debit1,
                            SUM(CASE WHEN gle.credit_debit_type =  'credit' THEN gle.amount ELSE 0 END) as credit1,
                            p.id as property_id

                        from gl_exports gle
                        inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                        Inner join properties p on gle.property_id = p.id
                        inner join gl_event_company glec on gle.gl_event_company_id = glec.id
                        inner join gl_events glev on glec.gl_event_id = glev.id
                        Where gle.property_id in (${properties})
                        And gle.company_id = ${conditions.company_id} ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
                        if(conditions.start_date && conditions.end_date) {
                            sql += ` And Date(gle.export_date) >= ${connection.escape(conditions.start_date)}
                                    And Date(gle.export_date) <= ${connection.escape(conditions.end_date)} `
                        } else {
                            sql += ` And Date(gle.export_date) = ${connection.escape(conditions.end_date)} `
                        }
            sql += `GROUP BY  gle.property_id, gle.book_id, gle.company_gl_account_id, 
                    (CASE
                        WHEN glec.gl_event_id in (1,2) THEN 'Charges'
                        WHEN glec.gl_event_id in (3,8) THEN 'Payments'
                        WHEN glec.gl_event_id in (9,10) THEN 'Prepaid Liability'
                        WHEN glec.gl_event_id in (4) THEN 'Liability Recognition'
                        WHEN glec.gl_event_id in (5) THEN 'Refunds'
                        WHEN glec.gl_event_id in (6) THEN 'Bad Debt'
                        WHEN glec.gl_event_id in (7) THEN 'Allowances'
                    END )
                        
                    )
                    SELECT
                        property_id,
                        property_name, 
                        event_category,
                        book_type,
                        book_id,
                        gl_account,
                        case
                            when debit1 <= credit1 THEN credit1 - debit1
                            else 0
                        end as credit,
                        case
                            when debit1 >= credit1 THEN debit1 - credit1
                            else 0
                        end as debit
                    from exports
                    order by property_name, event_category, book_type
                ) x;`
        console.log("AccountantSummary Sql, ",sql);
        return connection.queryAsync(sql);
    },

    balanceSummary(connection, conditions){
        const { property_id, property_ids } = conditions;
        let properties = property_ids?.length ? property_ids.map(p => connection.escape(p)).join(', ') : property_id;
        let sql = `select * from (
                    with exports as (
                        select
                            concat(ifnull(p.number,'unavailable'),' - ',ifnull(p.name,'unavailable')) as property_name,
                            CASE
                                WHEN gle.book_id = '0' THEN 'Cash'
                                WHEN gle.book_id = '1' THEN 'Accrual'
                                ELSE ''
                            END as book_type,
                            gle.book_id,
                            concat(ifnull(gla.code,'unavailable'),' - ',ifnull(gla.name,'unavailable')) as gl_account,
                            CASE
                                WHEN glec.gl_event_id in (1,2) THEN 'Charges'
                                WHEN glec.gl_event_id in (3,8) THEN 'Payments'
                                WHEN glec.gl_event_id in (9,10) THEN 'Prepaid Liability'
                                WHEN glec.gl_event_id in (4) THEN 'Liability Recognition'
                                WHEN glec.gl_event_id in (5) THEN 'Refunds'
                                WHEN glec.gl_event_id in (6) THEN 'Bad Debt'
                                WHEN glec.gl_event_id in (7) THEN 'Allowances'
                            END AS event_category,
                            SUM(CASE WHEN gle.credit_debit_type =  'debit' THEN gle.amount ELSE 0 END) as debit1,
                            SUM(CASE WHEN gle.credit_debit_type =  'credit' THEN gle.amount ELSE 0 END) as credit1,
                            p.id as property_id
                        from gl_exports gle
                        inner join gl_accounts gla on gle.company_gl_account_id = gla.id
                        Inner join properties p on gle.property_id = p.id
                        inner join gl_event_company glec on gle.gl_event_company_id = glec.id
                        inner join gl_events glev on glec.gl_event_id = glev.id
                        Where gle.property_id in (${properties})
                        And gle.company_id = ${conditions.company_id} ${conditions.book_id && conditions.book_id !== '2' ? `And gle.book_id = '${conditions.book_id}'` :''} `;
                        if(conditions.end_date) {
                            sql += `And Date(gle.export_date) <= ${connection.escape(conditions.end_date)}`
                        }
                        sql += `GROUP BY  gle.property_id, gle.book_id, gle.company_gl_account_id
                    )
                    SELECT
                        property_id,
                        book_id,
                        gl_account,
                        case
                            when debit1 <= credit1 THEN credit1 - debit1
                            else 0
                        end as credit,
                        case
                            when debit1 >= credit1 THEN debit1 - credit1
                            else 0
                        end as debit
                    from exports
                    order by property_name, book_type
                ) x`;
        
        console.log('balance summary sql', sql);
        return connection.queryAsync(sql); 
    }

};

const ENUMS = require('../modules/enums');