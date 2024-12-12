module.exports = {

    findAccounts: function(connection, template_id, event_id, book_id){
		 
        let sql = `(select ec.id as event_company_id, credit.name as account_name, credit.code as account_code,
            credit.id as account_id,
            credit.is_group as is_group,
            ec.book_id,
            ec.gl_event_id,
            'credit' as type
            from gl_event_company ec 
            left join gl_accounts credit 
            on ec.gl_account_credit_id=credit.id and credit.deleted_at is null 
     where ec.gl_event_id = ${event_id} and ec.accounting_template_id = ${template_id} and ec.active = 1 and ec.gl_account_credit_id is not null and ec.gl_account_debit_id is not null`

     if (book_id !== '2') {
        sql += ` and ec.book_id = '${book_id}'`
     }
     sql += `)
     union
     (select ec.id as event_company_id, debit.name as account_name, debit.code as account_code,
            debit.id as account_id,
            debit.is_group as is_group,
            ec.book_id,
            ec.gl_event_id,
            'debit' as type
            from gl_event_company ec 
            left join gl_accounts debit 
            on ec.gl_account_debit_id=debit.id and debit.deleted_at is null 
     where ec.gl_event_id = ${event_id} and ec.accounting_template_id = ${template_id} and ec.active = 1 and ec.gl_account_debit_id is not null and ec.gl_account_credit_id is not null`
     if (book_id !== '2') {
        sql += ` and ec.book_id = '${book_id}'`
     }
     sql += `);`

        console.log('findAccounts sql', sql);
	    return connection.queryAsync(sql);
    },
    findOverrideAccounts(connection, event_id, type) {
        let sql = `select * from gl_event_override where gl_event_company_id = ${event_id} and 
            credit_debit_type = '${type}' and active = 1`;

        return connection.queryAsync(sql);
    }

}