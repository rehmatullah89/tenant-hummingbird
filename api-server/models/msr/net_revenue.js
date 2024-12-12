var DepositsRefunds  = require('./deposits_refunds.js');
var ProjectedIncome  = require('./projected_income.js');

module.exports = {

    //Summarized
    async summaryNetRevenue(connection, start_date, end_date, properties) {
        let sql = `
            with cte_invoice_lines as ( ${DepositsRefunds.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
            select cil.property_id, sum(cil.ila_amount) as net_revenue
            from cte_invoice_lines cil
            group by cil.property_id
        `;
        // 107ms
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    },

    async summaryNetRevenueByMethod(connection, start_date, end_date, properties) {
        let sql = `
            with cte_payments as ( ${DepositsRefunds.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
            select cp.property_id, cp.date,
                sum(case when type = 'payment' and method = 'card' then ila_amount else 0 end) as pay_card,
                sum(case when type = 'payment' and method = 'ach' then ila_amount else 0 end) as pay_ach,
                sum(case when type = 'payment' and method = 'cash' then ila_amount else 0 end) as pay_cash,
                sum(case when type = 'payment' and method = 'check' then ila_amount else 0 end) as pay_check,
                sum(case when type = 'payment' and method = 'giftcard' then ila_amount else 0 end) as pay_giftcard,
                sum(case when type = 'refund' then ila_amount else 0 end) as refund
            from cte_payments cp
            group by cp.property_id
        `;
        console.log('SQL summaryNetRevenueByMethod: ', sql);
        // 107ms
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    },

    async summaryIncomeByProduct(connection, start_date, end_date, properties, products = []) {
        let sql = `
            with cte_invoice_lines as ( ${ProjectedIncome.getAccrualInvoiceLines(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
            select cil.property_id, cil.product_type, sum(cil.amount) as net_income
            from cte_invoice_lines cil
            ${products && products.length ? `where cil.product_type in (${products.map(p => connection.escape(p)).join(',')})` : ''}
            group by cil.property_id, cil.product_type
        `;

        console.log('SQL summaryIncomeByProduct: ', sql);
        // 107ms
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    },

    //Dashboard
    async monthlyRevenue(connection, properties, start_date, end_date) {
        let sql = `
            with cte_invoice_lines as ( ${DepositsRefunds.deposits_refunds(properties.map(p => connection.escape(p)), connection.escape(start_date), connection.escape(end_date))} )
            select sum(cil.ila_amount) as total, MONTH(cil.date) as month 
            from cte_invoice_lines cil
            group by month
        `;
        
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    }
}