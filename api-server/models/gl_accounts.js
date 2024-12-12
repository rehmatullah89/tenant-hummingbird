module.exports = {

    findAll: function(connection, company_id, all) {
        var sql =  `select 
                    acc.*,
                    cat.name as category,
                    acc_type.name as account_type,
                    acc_subtype.name as account_subtype,
                    CASE WHEN evnt.id or override.id or p.id or tax.id
                        THEN true
                        else false
                    END AS reference_exist
                    from gl_accounts acc
                    left join gl_category cat on acc.category_id = cat.id
                    left join gl_account_type acc_type on acc.account_type_id = acc_type.id
                    left join gl_account_subtype acc_subtype on acc.account_subtype_id = acc_subtype.id
                    left join products p on p.income_account_id = acc.id and p.status = 1
                    left join gl_event_company evnt on (acc.id = evnt.gl_account_credit_id or acc.id = evnt.gl_account_debit_id) and evnt.active = 1
                    left join gl_event_override override on acc.id = override.override_gl_account_id and override.active = 1
                    left join tax_profile tax on tax.account_id = acc.id
                    Where   acc.active = 1 
                    And     acc.company_id = ${company_id} ${all ? '' :' and is_group = 0'}
                    group by acc.id
                    order by acc.id`;
        console.log('Gl account sql',sql);
        return connection.queryAsync(sql);
    },

    findById: function(connection, id){
        var sql =  "Select * from gl_accounts where active = 1 and id = "  + connection.escape(id);
        return connection.queryAsync( sql ).then(function(addressRes){
            return addressRes[0] || null
        });
    },

    save: function(connection, data){
        var sql;

        if(data.id){
            sql = "update gl_accounts set ? where id = " + connection.escape(data.id);
        } else {
            sql = "insert into gl_accounts set ?";
        }

        return connection.queryAsync(sql, data);
    },

    findAllCategories: function(connection) {
        var sql =  `Select * from gl_category;`;
        return connection.queryAsync(sql);
    },

    findTypesByCategoryId: function(connection, category_id) {
        var sql =  `Select * from gl_account_type`;
        if(category_id) {
            sql+= ` where gl_category_id = ${category_id}`;
        }
        return connection.queryAsync(sql);
    },

    findSubTypesByAccountTypeId: function(connection, account_type_id) {
        var sql =  `Select * from gl_account_subtype`;
        if(account_type_id) {
            sql+= ` where gl_account_type_id = ${account_type_id}`;
        }
        return connection.queryAsync(sql);
    },

    bulkDelete(connection,account_ids, data) {
        let sql = "UPDATE gl_accounts set ? where id in ( " + account_ids.map(x => connection.escape(x)).join(',') +  " )";
        console.log('bulkDelete sql =>',sql);
        return connection.queryAsync(sql,data);
    },
    findAccountBySubType(connection, company_id, subtype_id){
        let sql = `select * from gl_accounts 
        where company_id = ${company_id} and active = 1 and account_subtype_id = ${connection.escape(subtype_id)};`
        return connection.queryAsync(sql);
    },
    findTaxAccount(connection, property_id, type){
        let sql = `select * from property_tax_profile p
        inner join tax_profile t on t.id = p.tax_profile_id
        where property_id = ${property_id} and type = '${type}';`
        return connection.queryAsync(sql);
    },
    findDefaultAccounts(connection, company_id){
        let sql = `select id, code, name, 'credit' as type
        from gl_accounts
        where code = '999-C' and company_id = ${company_id}
        union 
        select id, code, name, 'debit' as type
        from gl_accounts
        where code = '999-D' and company_id = ${company_id}`;
        return connection.queryAsync(sql);
    },
    getActiveProcessesDetailsofGlAccounts(connection, gl_accounts){
        let sql = ` select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,p.name as process_name, 'corporate' as level, default_type as process_type, null as template_name from products p inner join gl_accounts gla on p.income_account_id = gla.id  where p.income_account_id in (${gl_accounts.join(', ')}) and p.status = 1
                        union
                    select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,p.name, 'property', p.default_type,null from property_products pp inner join products p on pp.product_id = p.id inner join gl_accounts gla on pp.income_account_id = gla.id where pp.income_account_id in (${gl_accounts.join(', ')}) and p.status = 1
                        union 
                    select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,tp.name, null, 'tax',null from tax_profile tp inner join gl_accounts gla on tp.account_id = gla.id where tp.account_id in (${gl_accounts.join(', ')}) and tp.deleted_at is null
                        union
                    select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,gle.name, null,'event',acct.name from gl_event_company glec inner join gl_accounts gla on (gla.id in (${gl_accounts.join(', ')}) and (glec.gl_account_credit_id = gla.id or glec.gl_account_debit_id = gla.id))  inner join gl_events gle on glec.gl_event_id = gle.id inner join accounting_template acct on glec.accounting_template_id = acct.id where glec.active = 1 and (glec.gl_account_credit_id in (${gl_accounts.join(', ')}) or glec.gl_account_debit_id in (${gl_accounts.join(', ')}))
                        union
                    select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,gle.name, null,'override',acct.name from gl_event_override glo inner join gl_accounts gla on glo.override_gl_account_id = gla.id inner join gl_event_company glec on glec.id = glo.gl_event_company_id inner join accounting_template acct on glec.accounting_template_id = acct.id  inner join gl_events gle on glec.gl_event_id = gle.id where glo.active = 1 and glo.override_gl_account_id in (${gl_accounts.join(', ')})
                        union
                    select gla.id as gl_account_id,gla.name as gl_account_name, gla.code as gl_account_code,gls.name, null,'default_subtype',acct.name from gl_template_default_accounts glda inner join gl_accounts gla on glda.gl_account_id = gla.id inner join accounting_template acct on glda.accounting_template_id = acct.id inner join gl_default_subtypes glds on glda.gl_default_subtype_id = glds.id inner join gl_account_subtype gls on glds.gl_account_subtype_id = gls.id where glda.gl_account_id in (${gl_accounts.join(', ')}) and glda.deleted_at is null;`

        console.log("getActiveProcessesDetailsofGlAccounts =>", sql);
        return connection.queryAsync(sql);
    }

};
