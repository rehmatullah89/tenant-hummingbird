module.exports = {
    save(connection, data, property_id){

		var sql;

		if(property_id){
			sql = "UPDATE closing_days set ? where property_id = " + connection.escape(property_id);
		} else {
			sql = "insert into closing_days set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){

			return response.insertId;
		});

	},

	findByID: function (connection, id) {
		var sql = `SELECT * FROM closing_days where id = ${connection.escape(id)}`;
		return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
	},

	findByParams: function (connection, params) {
		let { property_id, date, active } = params;

		var sql = "SELECT * FROM closing_days where 1 = 1";
		if(property_id){
			sql += ` and property_id = ${connection.escape(property_id)}`
		}
		if(date){
			sql += ` and date = ${connection.escape(date)}`
		}
		if(active){
			sql += ` and active = ${connection.escape(active)}`
		}

		return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
	},

	getDefaultClosingTime(connection, property_id){
		var sql = `SELECT (IFNULL((select value from settings where property_id = p.id and name = 'defaultCloseOfDay'), (select value from settings where company_id = p.company_id and property_id is null and name = 'defaultCloseOfDay'))) as closing_time
					from properties p where p.id = ${connection.escape(property_id)}`;
		return connection.queryAsync(sql).then(r => r.length ? r[0].closing_time : null);
	},

	async undoEffectiveDates(connection, current_effect_date, effective_date, property_id){

		let sql = `UPDATE invoices i set i.effective_date = '${effective_date}'
					where i.effective_date = '${current_effect_date}' 
					and i.property_id = ${property_id};`
		await connection.queryAsync(sql);

		sql = `UPDATE payments p set p.effective_date = '${effective_date}'
					where p.effective_date = '${current_effect_date}'
					and p.property_id = ${property_id};`;
		await connection.queryAsync(sql);
		
		sql = `UPDATE refunds r inner join payments p on r.payment_id = p.id set r.effective_date = '${effective_date}'
					where r.effective_date = '${current_effect_date}' 
					and p.property_id = ${property_id};`;
		await connection.queryAsync(sql);
		
		sql = `UPDATE invoices_payments_breakdown ipb inner join invoices i on ipb.invoice_id = i.id set ipb.effective_date = '${effective_date}'
					where ipb.effective_date = '${current_effect_date}' 
					and i.property_id = ${property_id};`;
		await connection.queryAsync(sql);
		
		sql = `UPDATE invoice_lines_allocation ila inner join invoices i on ila.invoice_id = i.id set ila.effective_date = '${effective_date}'
					where ila.effective_date = '${current_effect_date}' 
					and i.property_id = ${property_id};`;

		return connection.queryAsync(sql);
	},

	async updateEffectiveDates(connection, prev_date, new_date, closing_time, property_id){

		let sql = `update invoices set effective_date = '${new_date}' where id in 
					(select * from (select i.id
					from invoices i
					inner join properties p on p.id = i.property_id 
					where p.id = ${property_id}
					and DATE(CONVERT_TZ(i.created_at , "+00:00", p.utc_offset)) = '${prev_date}'
					and TIME(CONVERT_TZ(i.created_at , "+00:00", p.utc_offset)) > '${closing_time}') temp);`
		
		await connection.queryAsync(sql);
					
		sql =	`update payments set effective_date = '${new_date}' where id in 
					(select * from (select p.id
					from payments p
					inner join properties pr on pr.id = p.property_id 
					where pr.id = ${property_id} 
					and DATE(CONVERT_TZ(p.created , "+00:00", pr.utc_offset)) = '${prev_date}'
					and TIME(CONVERT_TZ(p.created , "+00:00", pr.utc_offset)) > '${closing_time}') temp);`

		await connection.queryAsync(sql);
					
		sql =  `update refunds set effective_date = '${new_date}' where id in 
					(select * from (select r.id
					from refunds r
					inner join payments p on p.id = r.payment_id
					inner join properties pr on pr.id = p.property_id 
					where pr.id = ${property_id} 
					and DATE(CONVERT_TZ(r.date , "+00:00", pr.utc_offset)) = '${prev_date}'
					and TIME(CONVERT_TZ(r.date , "+00:00", pr.utc_offset)) > '${closing_time}') temp);`

		await connection.queryAsync(sql);
					
		sql =  `update invoices_payments_breakdown set effective_date = '${new_date}' where id in 
					(select * from (select ipb.id
					from invoices_payments_breakdown ipb
					inner join payments p on p.id = ipb.payment_id
					inner join properties pr on pr.id = p.property_id 
					where pr.id = ${property_id} 
					and DATE(CONVERT_TZ(ipb.created , "+00:00", pr.utc_offset)) = '${prev_date}'
					and TIME(CONVERT_TZ(ipb.created , "+00:00", pr.utc_offset)) > '${closing_time}') temp);`

		await connection.queryAsync(sql);
					
		sql =	`update invoice_lines_allocation set effective_date = '${new_date}' where id in 
					(select * from (select ila.id
					from invoice_lines_allocation ila
					inner join invoices i on i.id = ila.invoice_id
					inner join properties pr on pr.id = i.property_id 
					where pr.id = ${property_id} 
					and DATE(CONVERT_TZ(ila.created , "+00:00", pr.utc_offset)) = '${prev_date}'
					and TIME(CONVERT_TZ(ila.created , "+00:00", pr.utc_offset)) > '${closing_time}') temp);`;

		return connection.queryAsync(sql);
	}

}