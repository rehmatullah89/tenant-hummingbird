module.exports = {
	async find(connection, payload) {
		const { filters, is_active = true } = payload;

		const data = await GenericModel.find(connection, {
			table_name: 'accounting_template',
			conditions: {
				...filters,
				...(is_active && { deleted_at: null })
			}
		});

		return data;
	},

	async findByOR(connection, payload) {
		const { filters } = payload;
		const { company_id, is_default = 1, name } = filters;

		let sql = `select * from accounting_template where company_id = ${connection.escape(company_id)} and deleted_at is null and (
			is_default = ${connection.escape(is_default)} OR name = ${connection.escape(name)}
		)`;

		console.log('Accounting template find: ', sql);

		return connection.queryAsync(sql);
	},

	findDetails(connection, payload = {}) {
		const { is_active = true, filters } = payload;
		const { company_id } = filters;

		let sql = `
			select t.*, s.id as accounting_setup_id, 
				(select group_concat(pa.property_id) from property_accounting_template pa where pa.accounting_template_id = t.id and pa.deleted_at is null) as property_ids 
			from accounting_template t 
			left join accounting_setup s on t.id = s.accounting_template_id and s.deleted_at is null
			where
				t.company_id = ${connection.escape(company_id)} 
				${is_active ? ' and t.deleted_at is null' : ''};
		`;

		console.log('Accounting template details ', sql);

		return connection.queryAsync(sql);
	},

	async findAccountingSetup(connection, payload) {
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

	async findAccountingDefaultSubtypes(connection, payload) {
		const { filters, is_active = true } = payload;

		const data = await GenericModel.find(connection, {
			table_name: 'gl_template_default_accounts',
			conditions: {
				...filters,
				...(is_active && { deleted_at: null })
			}
		});

		return data;
	},

	save(connection, payload) {
		const { data } = payload;
		const { id } = data;

		let sql;
		if (id) {
			sql = `UPDATE accounting_template set ? where id = ${connection.escape(id)}`;
		} else {
			sql = `INSERT into accounting_template set ?`;
		}

		return connection.queryAsync(sql, data);
	},

	async findAccountingEvents(connection, payload) {
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

	saveDefaultAccountingEvents(connection, payload) {
		const { company_id, book_id, accounting_template_id } = payload;
		let bookId = book_id;

		let isDoubleBook = false;
		if(book_id == 2) {
		  isDoubleBook = true;
		  bookId = 0
		}
	
		let sql = `insert into gl_event_company (gl_event_id,active,book_id,company_id,accounting_template_id)
				   select id as gl_event_id, active, '${bookId}', ${company_id}, ${accounting_template_id}
				   from gl_events
				   where active = 1 and (${bookId == 0 ? 'cash' : (bookId == 1 ? 'accrual' : 'accrual')} = 1) `;
	
		if(isDoubleBook) {
		  sql +=` UNION
				  select id as gl_event_id, active, '1', ${company_id}, ${accounting_template_id}
				  from gl_events
				  where active = 1 and accrual = 1`;
		}
	
		console.log('Add Default accounting events ', sql);

		return connection.queryAsync(sql);
	},

	saveAccountingSetup(connection, payload) {
		const { data } = payload;
		let sql = 'INSERT into accounting_setup set ?';
		return connection.queryAsync(sql, data); 
	},

	async deleteAccountingEvents(connection, payload) {
		const { gl_event_company_ids, admin_contact_id } = payload;

		let sql = `Update gl_event_company
			Set active = 0, deleted_by = ${connection.escape(admin_contact_id)}, deleted_at = now()
			where id in (${gl_event_company_ids.map(e => connection.escape(e)).join(', ')})`;

		await connection.queryAsync(sql);

		sql = `Update gl_event_override
			Set active = 0, deleted_by = ${connection.escape(admin_contact_id)}, deleted_at = now()
			Where id > 0 and active = 1 and gl_event_company_id in (${gl_event_company_ids.map(e => connection.escape(e)).join(', ')})`;

		console.log('deleteAccountingEvents: ', sql);

		return connection.queryAsync(sql);
	},
	  
	async getTemplateDefaultSubTypeAccounts(connection,payload){
		const { filters, is_active = true } = payload;
		const data = await GenericModel.find(connection, {
			table_name: 'gl_template_default_accounts',
			conditions: {
				...filters,
				...(is_active && { deleted_at: null })
			}
		});

		return data;
	},

	getTemplateDefaultSubTypeAccountsDetails(connection, payload){
		const { accounting_template_id } = payload;
		let sql = `SELECT gld.id as gl_template_default_account_id, gld.gl_account_id as gl_account_id, gls.id as gl_subtype_id, gls.name as gl_subtype_name, glt.id as gl_type_id, glt.name as gl_type_name, glc.id as gl_category_id, glc.name as gl_category_name, gla.code as gl_account_code, gla.name as gl_account_name, gla.active as gl_account_active, gds.key as gl_subtype_key
				   FROM gl_template_default_accounts gld
				   LEFT JOIN gl_accounts gla ON gld.gl_account_id = gla.id
				   INNER JOIN gl_default_subtypes gds ON gld.gl_default_subtype_id = gds.id
				   INNER JOIN gl_account_subtype gls ON gds.gl_account_subtype_id = gls.id
                   INNER JOIN gl_account_type glt ON gls.gl_account_type_id = glt.id
                   INNER JOIN gl_category glc ON glt.gl_category_id = glc.id
				   WHERE gld.deleted_at IS NULL and gld.accounting_template_id = ${accounting_template_id};`;
		console.log("getTemplateDefaultSubTypeAccountsDetails : ", sql);

		return connection.queryAsync(sql);
	},

	addTemplateDefaultSubTypeAccounts(connection, payload){
		const { accounting_template_id, admin_id } = payload;
		let sql = `INSERT INTO gl_template_default_accounts (accounting_template_id, gl_default_subtype_id, created_by, modified_by)
				   	SELECT ${accounting_template_id} , id , ${admin_id} , ${admin_id}
					FROM gl_default_subtypes;`;
		console.log("addTemplateDefaultAccounts : ", sql);

		return connection.queryAsync(sql);
	},
	updateTemplateDefaultSubTypeAccounts(connection,payload){
		let sql = `INSERT INTO gl_template_default_accounts (id, gl_account_id, accounting_template_id, gl_default_subtype_id, created_by, modified_by) VALUES ?
				   ON DUPLICATE KEY UPDATE gl_account_id = VALUES(gl_account_id), modified_by = VALUES(modified_by);`
		console.log("updateTemplateDefaultAccount data : ", payload);
		
		return connection.queryAsync(sql, [
            payload.map(p => [
				connection.escape(p.id),
                connection.escape(p.gl_account_id), 
                connection.escape(p.accounting_template_id),
				connection.escape(p.gl_default_subtype_id),
                connection.escape(p.created_by),
				connection.escape(p.modified_by)
            ])
        ]);
	},

	async findPropertyTemplate(connection, payload){
		const { filters, is_active = true } = payload;
		const data = await GenericModel.find(connection, {
			table_name: 'property_accounting_template',
			conditions: {
				...filters,
				...(is_active && { deleted_at: null })
			}
		});

		return data;
	},

	async removePropertiesFromOtherTemplates(connection, payload){
		const { propertiesToRemove, admin_id, deleted_at } = payload;
		let sql = `UPDATE property_accounting_template 
				   SET deleted_at = '${deleted_at}', deleted_by = ${admin_id}, modified_by = ${admin_id}
				   WHERE deleted_at IS NULL and property_id in (${propertiesToRemove.map(p => connection.escape(p)).join(', ')}); `
		console.log("removePropertiesFromOtherTemplates : ",sql);

		return connection.queryAsync(sql);
	},

	async addPropertiesForTemplate(connection, payload){
		const { propertiesToUpdate, admin_id, accounting_template_id } = payload;
		let payload_arr = propertiesToUpdate.map(p => [accounting_template_id, p, admin_id, admin_id]);

		let sql = "INSERT INTO property_accounting_template (accounting_template_id, property_id, created_by, modified_by ) VALUES ? ";
		console.log("addPropertiesForTemplate :", connection.format(sql, [payload_arr]));

		return connection.queryAsync(sql, [payload_arr]);

	},

	async movePropertiesToDefaultTemplate(connection, payload){
        const { propertiesToDefault, admin_id, company_id } = payload;

        let templateSql = `SELECT * FROM accounting_template WHERE is_default = 1 AND company_id = ${company_id}`
        let accounting_template_id = await connection.queryAsync(templateSql).then(t => t.length ? t[0].id : null);

        let payload_arr = propertiesToDefault.map(p => [accounting_template_id, p, admin_id, admin_id]);
        let sql = "INSERT INTO property_accounting_template (accounting_template_id, property_id, created_by, modified_by ) VALUES ? ";
        console.log("movePropertiesToDefaultTemplate :", connection.format(sql, [payload_arr]));

        return connection.queryAsync(sql, [payload_arr]);

    },

	async removeDefaultSubtypeAccountsOfTemplate(connection, payload){
		const { accounting_template_id, modified_by, deleted_by, deleted_at } = payload;
		let sql = `UPDATE gl_template_default_accounts
				   SET modified_by = ${modified_by}, deleted_by = ${deleted_by}, deleted_at = '${deleted_at}'
				   WHERE accounting_template_id = ${accounting_template_id};`;
		console.log("removeDefaultSubtypeAccountsOfTemplate : ",sql);

		return connection.queryAsync(sql);
	},

	async findTemplateCopies(connection, payload){
        const { template_name } = payload;
        let sql = `SELECT * FROM accounting_template WHERE deleted_at is null AND name like '%copy% %${template_name}%';`;
        return connection.queryAsync(sql);
    },
	async findDefaultTemplateById(connection, company_id){
	    let sql = `select * 
		from accounting_template 
		  where 
			company_id = ${connection.escape(company_id)} 
			and deleted_at is null 
			and is_default = 1;`

			return connection.queryAsync(sql);
    }
};

const GenericModel = require('./generic')