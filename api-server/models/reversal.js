module.exports = {
	saveSettings(connection, data, id) {
		let sql;

		if(id) {
			sql = `update reversals set ? where id = ${connection.escape(id)}`
		} else {
			sql = `insert into reversals set ?`;
		}

		return connection.queryAsync(sql, data);
	},

	getSettings(connection, params) {
		const { id, type, company_id, property_id } = params || {};
		let sql = `select * from reversals where company_id = ${connection.escape(company_id)}`;

		if(property_id) {
			sql += ` and property_id = ${connection.escape(property_id)}`;
		} 
		else {
			sql += ` and property_id is null`;
		}

		if(id) {
			sql += ` and id = ${connection.escape(id)}`;
		} else if(type) {
			sql += ` and type = ${connection.escape(type)}`;
		}

		return connection.queryAsync(sql);
	},

	bulkSaveReversalFeeInvoice(connection, data){
		let sql = `INSERT INTO reversal_fee_invoice (refund_id, fee_invoice_id, created_by) VALUES ?`
		connection.queryAsync(sql, [data])
	},
	
	getCompanySettings(connection, company_id) {
		const sql = `select * from reversals where company_id = ${connection.escape(company_id)} and property_id is null`;
		return connection.queryAsync(sql);
	},

	getPropertySettings(connection, params) {
		const { id, type, company_id, property_id } = params || {};

		var sql = "Select * from reversals where company_id = " + connection.escape(company_id) + " and property_id = " + connection.escape(property_id);

		if(id) {
			sql += ` and id = ${connection.escape(id)}`;
		} 
		
		if(type) {
			sql += ` and type = ${connection.escape(type)}`;
		}

		return connection.queryAsync(sql);
	},

	findPropertyOrDefaultSettings(connection, payload) {
		const { reversal_types, company_id, property_id } = payload;
        const reversalTypes = reversal_types.map(s => connection.escape(s)).join(', ');

        const sql = `
            ${
                property_id ? 
				`with cte_property_reversals as ( 
                    Select r.* from reversals r where r.type in (${reversalTypes}) and company_id = ${company_id}
                    and property_id = ${property_id}
                )`: ''
            }
            
			Select r.* from reversals r where r.type in (${reversalTypes}) and r.company_id = ${company_id}
            and r.property_id is null 
            ${ property_id ? `
				and r.type not in (select type from cte_property_reversals)
				union
				select * from cte_property_reversals` : ''           
            }
        `;

        console.log('findPropertyOrDefaultSettings sql ', sql);

        return connection.queryAsync(sql);
	},

	/*getPropertySettings(connection, params) {
		const { id, type, company_id, property_id } = params || {};

		var sql = "Select * from reversals where company_id = " + connection.escape(company_id) + " and property_id = " + connection.escape(property_id);

		if(id) {
			sql += ` and id = ${connection.escape(id)}`;
		} 
		
		if(type) {
			sql += ` and type = ${connection.escape(type)}`;
		}

		return connection.queryAsync(sql);
	},*/

	saveSettings(connection, data, updateSetting) {
        if(updateSetting){
            sql = `UPDATE reversals set ? where type = ${connection.escape(data.type)} and company_id = ${connection.escape(data.company_id)}`;
            if(data.property_id) {
                sql += ` and property_id= ${connection.escape(data.property_id)}`;
            } else {
                sql += ` and property_id is NULL`;
            }
        } else {
            sql = `INSERT into reversals set ? `;
        }

        return connection.queryAsync(sql, data);
    },

	findBulkReversalDeliveries(connection, payload) {
		const { company_id } = payload;
		let { reversal_ids, reversal_types } = payload;
		let sql;
		if(reversal_ids) {
			reversal_ids = reversal_ids.map(id => connection.escape(id)).join(', ');
			sql = `
				select * from reversal_delivery_methods
				where reversal_id in (${reversal_ids})
			`;
		} else {
			reversal_types = reversal_types.map(type => connection.escape(type)).join(', ');
			sql = `
				select rdm.* from reversal_delivery_methods rdm
				join reversals r on rdm.reversal_id = r.id
				where r.type in (${reversal_types})
				and r.company_id = ${connection.escape(company_id)}
			`;
		}
		console.log('findBulkReversalDeliveries sql ', sql);
		return connection.queryAsync(sql);
	},

	saveReversalDelivery(connection, data) {
		const { reversalDelivery_id, ...rest } = data;
		let sql;
		if(reversalDelivery_id){
            sql = `UPDATE reversal_delivery_methods set ? where id = ${connection.escape(reversalDelivery_id)}`;
        } else {
            sql = `INSERT into reversal_delivery_methods set ? `;
        }
		console.log('saveReversalDelivery sql ', sql);
        return connection.queryAsync(sql, rest);
	}

	
};