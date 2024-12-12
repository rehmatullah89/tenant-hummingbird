module.exports = {

    getAllMenuiItems: async (connection, company_id) => {

        let menuSql = "SELECT * FROM onboarding_menus WHERE company_id = " + connection.escape(company_id);
        let menuList = await connection.queryAsync(menuSql);
        return menuList; 
    },

    saveMenuItems: async (connection, data, menu_id) => {
        let sql;

        if(menu_id){
          sql = "UPDATE onboarding_menus set ? where id = " + connection.escape(menu_id);
        } else {
          sql =  "insert into onboarding_menus set ?";
        }
        let result = await connection.queryAsync(sql, data);
        return result;
    },
    
    findMenuItems: async (connection, data) => {
        let sql = `SELECT * from onboarding_menus where company_id = ${data.company_id} and screen_name = '${data.screen_name}'`;  
        let res = await connection.queryAsync(sql);
        return res[0] ? res[0].id : null;
    },

    saveBulkData: async (connection, tablename, bulkData) => {  
        let columns = bulkData['keys'].toString();
        let sql = 'INSERT INTO '+tablename+' ('+columns+') VALUES ?';    

        let result = await connection.queryAsync(sql, [bulkData.data]);
        return result;
    },

    getAllDocuments: async (connection, company_id, params) => {
        var sql = `SELECT od.*,
               ocd.id as ocd_id, ocd.status, ocd.overrides_doc_id,
               (SELECT name from onboarding_documents a where a.id = ocd.overrides_doc_id) override_document_name
               FROM onboarding_documents od
               LEFT JOIN onboarding_company_documents ocd
               ON od.id=ocd.document_id AND (ocd.company_id=${company_id} OR ocd.company_id IS NULL) 
               WHERE od.overrides = 0`;
        if(params.state) {            
            sql += ` AND od.state='${params.state}'`;
        }if(params.type)  {
            sql += ` AND od.type='${params.type}'`;
        }
        if(params.type == 'other')
             sql += ` AND ocd.company_id=${company_id} `;
        sql += 'ORDER BY od.id ASC'
    
        let result = await connection.queryAsync(sql, []);
        return result;

    },

    findDocumentById: async (connection, company_id, id) => {
        let sql = `SELECT od.*,
                ocd.id as ocd_id, ocd.status, ocd.overrides_doc_id,
               (SELECT name from onboarding_documents a where a.id = ocd.overrides_doc_id) override_document_name
               FROM onboarding_documents od
               LEFT JOIN onboarding_company_documents ocd
               ON od.id=ocd.document_id AND (ocd.company_id=${company_id} OR ocd.company_id IS NULL)
               WHERE od.overrides = 0 AND od.id='${id}'`;  
        let res = await connection.queryAsync(sql);
        return res[0] || null;
    },
    
    saveCompanyDocument(connection, data, id){
        let sql;
        if(id){
            sql = "UPDATE onboarding_company_documents set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_company_documents set ?";
        }
        return connection.queryAsync(sql, data);
    },

    saveDocument(connection, data, id){
        let sql;
        if(id){
            sql = "UPDATE onboarding_documents set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_documents set ?";
        }
        return connection.queryAsync(sql, data);
    },

    deleteDocument: async (connection, type, id, company_document_id) => {
        let result;
        let deleteSql;

        if(type != 'other' && company_document_id){
            deleteSql = "UPDATE onboarding_company_documents SET overrides_doc_id = null where id = " + connection.escape(company_document_id);
        }else if(type == 'other' && company_document_id){
            deleteSql = "DELETE from onboarding_company_documents where id = " + connection.escape(company_document_id);
        }                
        result = await connection.queryAsync(deleteSql);
        if(result){
            let sql = "DELETE from onboarding_documents where id = " + connection.escape(id);
            result = await connection.queryAsync(sql);
        }
        return result;
    },

    findCompanyById: async (connection, id) => {
        var sql = `SELECT c.*,
        ocs.status,ocs.tech_contact_name,ocs.tech_contact_email, ocs.tech_contact_phone
        FROM companies c
        JOIN onboarding_company_status ocs    
        ON c.id =  ocs.company_id    
        WHERE c.id = ${connection.escape(id)}`;    
        
        let res = await connection.queryAsync(sql);
        return res;
    },

    findPropertiesByCompanyId: async (connection, id) => {
        var sql = ` SELECT p.name,
        ops.property_id,ops.golive_date,ops.due_date,ops.property_status,ops.id as property_status_id, ops.property_percentage,ops.merge_status
        FROM properties p
        JOIN onboarding_property_status ops
        ON p.id=ops.property_id
        WHERE p.company_id = ${connection.escape(id)} and ops.property_status <> 'launched'
        ORDER BY p.id ASC 
        LIMIT 0,1`;

        let res = await connection.queryAsync(sql);
        return res;

    },

    savePropertyPercentage: async (connection, data, id) => {        
        let sql;
        if (id) {
            sql = "UPDATE onboarding_property_status set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_property_status set ?";
        }
        let result = await connection.queryAsync(sql, data);
        return id ? id : result.insertId;

    },

    propertyBulkMapping: async (connection, companyId,propertyId) => {

        var sql = `insert into property_products(property_id,product_id,price,prorate,prorate_out,recurring,taxable, inventory,status,amount_type)
        SELECT pr.id as property_id, p.id as product_id,p.price,p.prorate,p.prorate_out,p.recurring,p.taxable,coalesce(p.has_inventory,0) as has_inventory,
        p.status, p.amount_type
        FROM products p
        join properties pr on pr.company_id = p.company_id
        where p.company_id = ${companyId}
        and pr.id =  ${propertyId}
        and not exists (SELECT 1
        FROM property_products
        where property_id = pr.id and
        product_id = p.id
        );`
        return await connection.queryAsync(sql);
    },

    getAllSpacemixData: async (connection,company_name,property_name) => {
        var sql = `SELECT Name,Owner FROM nw_units_all WHERE Owner = ${connection.escape(company_name)} AND Name = ${connection.escape(property_name)}`;
        var res = await connection.queryAsync(sql);
        return res;
    },

    removeExistingRecords: async (connection,payload) => {
        let sql = `delete from nw_units_all where Owner = ${connection.escape(payload.activeCompanyName)} AND Name = ${connection.escape(payload.propertyName)};`;
        // delete from nw_promotions_all where Owner = ${connection.escape(payload.activeCompanyName)} AND Name = ${connection.escape(payload.propertyName)};
        // delete from nw_tenant_discounts_all where Owner = ${connection.escape(payload.activeCompanyName)} AND Name = ${connection.escape(payload.propertyName)};
        await connection.queryAsync(sql);
    },

    saveSpacemixThroughProcedure: async (connection, payload) => {
        let sql = `CALL NW_Tenant_Data_Migration(${connection.escape(payload.propertyName)},'0', ${connection.escape(payload.activeCompany)})`;
        console.log('Procedure Sql' , sql);
        return await connection.queryAsync(sql);
    },

    updatePropertyStatusByPropertyID: async (connection,data, propertyId) => {
        var  sql =`UPDATE onboarding_property_status SET ? WHERE property_id = ${connection.escape(propertyId)}`;
        return await connection.queryAsync(sql,data);
    },

    getAllContacts: async (connection, email) => {
        var sql = `SELECT * FROM onboarding_technical_contacts`
        if(email){
            sql += ` where email = ${connection.escape(email)}`;
        }
        var res = await connection.queryAsync(sql);
        return res;
    },

    deleteSpacemixThroughProcedure: async (connection, payload) => {
        let sql = `CALL Delete_Hummingbird_Data_For_Facility(${connection.escape(payload.activeCompany)},${connection.escape(payload.propertyName)})`;
        return await connection.queryAsync(sql);
    },
};
