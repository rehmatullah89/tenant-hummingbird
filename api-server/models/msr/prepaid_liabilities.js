module.exports = {
	// Snippet
	getInvoiceLinesAllocation(payload) {
		const { start_date, end_date, property_ids } = payload;

		const sql = `
			SELECT
				case
					when ila.type = 'tax' then 'tax'
					when p.default_type = 'rent' then 'rent'
					when p.default_type = 'insurance' then 'insurance'
					when p.default_type = 'late' then 'fee'
					when p.default_type = 'product' then 'merchandise'
					when p.default_type = 'auction' then 'auction'
					when p.default_type in ('cleaning', 'security') then 'deposit'
					else 'others'
				end as product_type, ila.amount, ila.date
			FROM invoice_lines_allocation ila
				join invoice_lines il on ila.invoice_line_id = il.id
				join products p on il.product_id = p.id
				join invoices i on i.id = il.invoice_id
			WHERE
				i.property_id in (${property_ids})
				and ila.date ${start_date ? `between ${start_date} and ${end_date}` : ` <= ${end_date}`}
				and i.due > ila.date
				and i.due > ${end_date}
		`;

		return sql;
	},

	// Summarized
	async summaryPrepaidLiabilities(connection, payload) {
		const { date, property_ids, first_day_of_month, first_day_of_year } = payload;

		let sql = `
      with cte_prepaid_liability as (
				${this.getInvoiceLinesAllocation({ 
					end_date: connection.escape(date),					
					property_ids: property_ids.map(p => connection.escape(p)).join(', ') 
				})}
      )
      
			select null as product_type, sum(amount) as amount, 'rt' as period
			from cte_prepaid_liability pl
			where pl.date <= ${connection.escape(date)}
			
			union all

      select pl.product_type, sum(amount) as amount, 'daily' as period
			from cte_prepaid_liability pl
			where pl.date = ${connection.escape(date)}
			group by pl.product_type

			union all

			select pl.product_type, sum(amount) as amount, 'mtd' as period
			from cte_prepaid_liability pl
			where pl.date between ${connection.escape(first_day_of_month)} and ${connection.escape(date)}
			group by pl.product_type
					
			union all

			select pl.product_type, sum(amount) as amount, 'ytd' as period
			from cte_prepaid_liability pl
			where pl.date between ${connection.escape(first_day_of_year)} and ${connection.escape(date)}
			group by pl.product_type;
    `;

		console.log('Prepaid Liabilities Summary: ', sql);

		return await connection.queryAsync(sql);
	},

	//MHR 
	async summaryPrepaidLiabilitiesByMonths(connection, payload) {
		let {start_date, properties, date_range} = payload;
		date_range = date_range || []
		let end_date = date_range.pop();
		date_range.reverse();
		let property_ids = properties.map(p => connection.escape(p)).join(', ');

		let sql = `
      with cte_prepaid_liability as (
				${this.getInvoiceLinesAllocation({ end_date: connection.escape(moment(end_date).startOf('month').format('YYYY-MM-DD')),	property_ids})}
				
				${date_range.length ? `\nUNION ALL\n` : ``}
				
				${date_range.map(d => `${this.getInvoiceLinesAllocation({ start_date: connection.escape(moment(d).startOf('month').format('YYYY-MM-DD')), end_date: connection.escape(d),	property_ids})}`).join(`\nUNION ALL\n`)}
      )
      
			select
				DATE_FORMAT(pl.date, '%M-%y') as liability_month,
				sum(case when pl.product_type = 'tax' then pl.amount else 0 end) as tax,
				sum(case when pl.product_type = 'rent' then pl.amount else 0 end) as rent,
				sum(case when pl.product_type = 'insurance' then pl.amount else 0 end) as insurance,
				sum(case when pl.product_type = 'fee' then pl.amount else 0 end) as fee,
				sum(case when pl.product_type = 'merchandise' then pl.amount else 0 end) as merchandise,
				sum(case when pl.product_type = 'deposit' then pl.amount else 0 end) as deposit
				from cte_prepaid_liability pl
				where pl.date between ${connection.escape(end_date)} and ${connection.escape(start_date)}
				group by liability_month
				order by pl.date desc;
    	`;

		console.log('summaryPrepaidLiabilitiesByMonths: ', sql);
		return connection.queryAsync(sql);
	}

}

var moment = require('moment');