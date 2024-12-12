  //Deposits and Refunds model, queries used in the following reports
    //Summary report:
    //Delinquency by Days Widget
    //Detail report:
    //Delinquency report

var moment  = require('moment');
var Sql     = require(__dirname + '/../../modules/sql_snippets.js');

module.exports = {

    //Summarized
    summaryDelinquentAmount(connection, date, properties) {
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(connection.escape(date), properties.map(p => connection.escape(p)))} )
            SELECT inv.property_id, inv.report_date,
                sum(case when days_unpaid between 0 and 10 then inv.total_amount - inv.total_paid else 0 end) as owed_0_10,
                sum(case when days_unpaid between 11 and 30 then inv.total_amount - inv.total_paid else 0 end) as owed_11_30,
                sum(case when days_unpaid between 31 and 60 then inv.total_amount - inv.total_paid else 0 end) as owed_31_60,
                sum(case when days_unpaid between 61 and 90 then inv.total_amount - inv.total_paid else 0 end) as owed_61_90,
                sum(case when days_unpaid between 91 and 120 then inv.total_amount - inv.total_paid else 0 end) as owed_91_120,
                sum(case when days_unpaid between 121 and 180 then inv.total_amount - inv.total_paid else 0 end) as owed_121_180,
                sum(case when days_unpaid between 181 and 360 then inv.total_amount - inv.total_paid else 0 end) as owed_181_360,
                sum(case when days_unpaid > 360 then inv.total_amount - inv.total_paid else 0 end) as owed_361
            from cte_invoices inv
            group by inv.property_id, inv.report_date
        `;
        // 201 ms
        console.log('summaryDelinquentAmount:', sql);
        return connection.queryAsync(sql).then(r => r.length ? r: []);
    },
    summaryDelinquentAmountByMonths(connection, payload) {
        let { dates, property_ids } = payload;
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(dates.map(date => connection.escape(date)), property_ids.map(p => connection.escape(p)))})
            SELECT property_id, DATE_FORMAT(report_date, '%M-%y') as month,
                sum(case when days_unpaid between 0 and 10 then total_amount - total_paid else 0 end) as delinquent_amount_10,
                sum(case when days_unpaid between 11 and 30 then total_amount - total_paid else 0 end) as delinquent_amount_30,
                sum(case when days_unpaid between 31 and 60 then total_amount - total_paid else 0 end) as delinquent_amount_60,
                sum(case when days_unpaid between 61 and 90 then total_amount - total_paid else 0 end) as delinquent_amount_90,
                sum(case when days_unpaid between 91 and 120 then total_amount - total_paid else 0 end) as delinquent_amount_120,
                sum(case when days_unpaid between 121 and 180 then total_amount - total_paid else 0 end) as delinquent_amount_180,
                sum(case when days_unpaid between 181 and 360 then total_amount - total_paid else 0 end) as delinquent_amount_360,
                sum(case when days_unpaid > 360 then total_amount - total_paid else 0 end) as delinquent_amount_gtr_360
            from cte_invoices
            group by property_id, DATE_FORMAT(report_date, '%M-%y')
        `;
        console.log('summaryDelinquentAmountByMonths:', sql);
        return connection.queryAsync(sql).then(r => r.length ? r: []);
    },
    summaryDelinquentCount(connection, date, properties) {
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(connection.escape(date), properties.map(p => connection.escape(p)))} )
            SELECT property_id, report_date,
                sum(case when days_unpaid between 0 and 10 then 1 else 0 end) as units_0_10,
                sum(case when days_unpaid between 11 and 30 then 1 else 0 end) as units_11_30,
                sum(case when days_unpaid between 31 and 60 then 1 else 0 end) as units_31_60,
                sum(case when days_unpaid between 61 and 90 then 1 else 0 end) as units_61_90,
                sum(case when days_unpaid between 91 and 120 then 1 else 0 end) as units_91_120,
                sum(case when days_unpaid between 121 and 180 then 1 else 0 end) as units_121_180,
                sum(case when days_unpaid between 181 and 360 then 1 else 0 end) as units_181_360,
                sum(case when days_unpaid > 360 then 1 else 0 end) as units_361
            from (
                select inv.property_id, inv.report_date, inv.lease_id, max(inv.days_unpaid) as days_unpaid
                from cte_invoices inv
                group by inv.property_id, inv.report_date, inv.lease_id
            ) o
            group by o.property_id, o.report_date
        `;
        // 166ms
        console.log('summaryDelinquentCount:', sql);
        return connection.queryAsync(sql).then(r => r.length ? r: []);
    },
    summaryDelinquentCountByMonths(connection, payload) {
        let { dates, property_ids } = payload;
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(dates.map(date => connection.escape(date)), property_ids.map(p => connection.escape(p)))})
            SELECT property_id, DATE_FORMAT(report_date, '%M-%y') as month,
                sum(case when days_unpaid between 0 and 10 then 1 else 0 end) as delinquent_count_10,
                sum(case when days_unpaid between 11 and 30 then 1 else 0 end) as delinquent_count_30,
                sum(case when days_unpaid between 31 and 60 then 1 else 0 end) as delinquent_count_60,
                sum(case when days_unpaid between 61 and 90 then 1 else 0 end) as delinquent_count_90,
                sum(case when days_unpaid between 91 and 120 then 1 else 0 end) as delinquent_count_120,
                sum(case when days_unpaid between 121 and 180 then 1 else 0 end) as delinquent_count_180,
                sum(case when days_unpaid between 181 and 360 then 1 else 0 end) as delinquent_count_360,
                sum(case when days_unpaid > 360 then 1 else 0 end) as delinquent_count_gtr_360
            from (
                select inv.property_id, inv.report_date, inv.lease_id, max(inv.days_unpaid) as days_unpaid
                from cte_invoices inv
                group by inv.property_id, inv.report_date, inv.lease_id
            ) o
            group by property_id, DATE_FORMAT(report_date, '%M-%y')
        `;
        console.log('summaryDelinquentCountByMonths:', sql);
        return connection.queryAsync(sql).then(r => r.length ? r: []);
    },

    //Detailed
    detailDelinquentTenants(connection, company_id, property_id, date) {
        date =  moment(date).format('YYYY-MM-DD')
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(connection.escape(date), [connection.escape(property_id)])} )
            select inv.unit_number, inv.name, inv.move_out_date, ${Sql.lease_paid_through_date('inv.lease_id', date)} as paid_through_date,
                ( ${Sql.lease_rent('inv.lease_id', connection.escape(date))} ) as rent,
                sum(case when inv.days_unpaid between 0 and 10 then inv.total_amount - inv.total_paid else 0 end) as balance_10,
                sum(case when inv.days_unpaid between 11 and 30 then inv.total_amount - inv.total_paid else 0 end) as balance_30,
                sum(case when inv.days_unpaid between 31 and 60 then inv.total_amount - inv.total_paid else 0 end) as balance_60,
                sum(case when inv.days_unpaid between 61 and 90 then inv.total_amount - inv.total_paid else 0 end) as balance_90,
                sum(case when inv.days_unpaid between 91 and 120 then inv.total_amount - inv.total_paid else 0 end) as balance_120,
                sum(case when inv.days_unpaid between 121 and 180 then inv.total_amount - inv.total_paid else 0 end) as balance_180,
                sum(case when inv.days_unpaid between 181 and 360 then inv.total_amount - inv.total_paid else 0 end) as balance_360,
                sum(case when inv.days_unpaid > 360 then inv.total_amount - inv.total_paid else 0 end) as balance_360plus,
                sum(inv.total_amount - inv.total_paid) as balance_total
            from cte_invoices inv
            group by inv.lease_id
        `;

        console.log("detailDelinquentTenants: ", sql)
        return connection.queryAsync(sql);
    },

    detailDelinquentInvoices(connection, company_id, property_id, date) {
        date =  moment(date).format('YYYY-MM-DD')
        let sql = `
            with cte_invoices as ( ${this.getDelinquentInvoices(connection.escape(date), [connection.escape(property_id)])} )
            select inv.*, (inv.total_amount - inv.total_paid) as total_balance
            from cte_invoices inv
        `;

        console.log("detailDelinquentInvoices: ", sql)
        return connection.queryAsync(sql);
    },

    detailDelinquentLeases(connection, property_id, date){
        date =  moment(date).format('YYYY-MM-DD');
        let sql = `
        WITH cte_invoices as ( ${this.getDelinquentInvoices(connection.escape(date), [connection.escape(property_id)])} )
        SELECT inv.name, inv.unit_number, max(inv.days_unpaid) as days_late,
            (sum(inv.total_amount - inv.total_paid)) as past_due_amount,
            ( ${Sql.lease_rent('inv.lease_id', connection.escape(date))} ) as rent,
            inv.move_in_date 
        from cte_invoices inv
        group by inv.lease_id `

        console.log("detailDelinquentLeases: ", sql)
        return connection.queryAsync(sql);
    },

    // Snippet
    getDelinquentInvoices(dates, properties){
        dates = Array.isArray(dates)? dates : [dates];
        let sql = `
            select u.property_id, t.date as report_date, i.lease_id, i.id as invoice_id, i.number as invoice_number,
                concat(c.first,' ',c.last) as name, u.number as unit_number, l.end_date as move_out_date,
                i.date as invoice_date, i.due as invoice_due, timestampdiff(day, i.due, t.date) as days_unpaid,
                (ifnull(i.subtotal, 0) + ifnull(i.total_tax , 0) - ifnull(i.total_discounts ,0)) as total_amount,
                sum(ifnull(ipb.amount,0)) as total_paid,
                l.start_date as move_in_date
            from invoices i
                join leases l on l.id = i.lease_id and l.status = 1
                join (${dates.map(date => `SELECT ${date} as date`).join(' UNION ALL ')}) t
                    on i.due <= t.date and (i.void_date is null or convert(date_format(i.void_date ,'%Y-%m-%d'),DATE) > t.date)
                        and (l.end_date is null or l.end_date > t.date)
                join units u on u.id = l.unit_id
                left outer join invoices_payments_breakdown ipb on ipb.invoice_id = i.id and ipb.date <= t.date
                join contact_leases cl on cl.lease_id = i.lease_id and cl.primary = 1
                join contacts c on c.id = cl.contact_id
            where u.property_id in (${properties.join(', ')})
            group by u.property_id, i.lease_id, i.id, days_unpaid, total_amount, t.date
            having ifnull(total_amount, 0) - ifnull(total_paid, 0) > 0
        `;

        return sql;
    },
}