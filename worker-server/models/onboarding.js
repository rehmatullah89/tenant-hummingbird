
module.exports = {

    save: async (connection, data, id) => {

        var sql;

        if (id) {
            sql = "UPDATE onboarding_company_status set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_company_status set ?";
        }

        var result = await connection.queryAsync(sql, data);
        return id ? id : result.insertId;
    },

    findAll: async (connection) => {
        var sql = `SELECT ocs.company_id , c.name ,c.subdomain,c.firstname AS owner_firstname,c.lastname AS owner_lastname,c.email AS owner_email,c.phone AS owner_phone,ocs.status,ocs.tech_contact_name,ocs.tech_contact_email,ocs.tech_contact_phone,ocs.created_at , c.gds_owner_id
        from onboarding_company_status ocs 
        LEFT JOIN companies c ON ocs.company_id = c.id`

        var res = await connection.queryAsync(sql);
        return res;
    },

    findCompanyIds: async (connection) => {
        var sql = 'SELECT company_id from onboarding_company_status';
        var res = await connection.queryAsync(sql);
        return res;
    },

    findByCompanyId: async (connection, company_id) => {
        var sql = "SELECT * from onboarding_company_status where company_id = " + connection.escape(company_id);
        var res = await connection.queryAsync(sql);
        return res;
    },

    findContactsByCompanyId: async (connection, company_id) => {
        var sql = "SELECT * from companies_contact_roles where company_id = " + connection.escape(company_id);
        var res = await connection.queryAsync(sql);
        return res;
    },

    searchByCompanyID: async (connection, company_id, params, restricted ) => {
        var propertySql =  "Select * from properties where";
        var {id, name, number, address_id} = params;

        var filterSql = [];
        name && filterSql.push('LOWER(name) = ' + connection.escape(name.toLowerCase()));
        number && filterSql.push('number = ' + connection.escape(number));
        address_id && filterSql.push('address_id = ' + connection.escape(address_id));
        if (filterSql) {
            propertySql += '(' + filterSql.join(' or ') + ')'
        }

        if (id) {
            propertySql += ' and id != ' + connection.escape(id);
        }

        propertySql += ' limit 1';

        var r = await connection.queryAsync( propertySql );
        return (r.length)? r[0] : null;
    },

    savePropertyStatus: async (connection, data, id) => {
        
        var sql;

        if (id) {
            sql = "UPDATE onboarding_property_status set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_property_status set ?";
        }
        var result = await connection.queryAsync(sql, data);
        return id ? id : result.insertId; 
    },
    searchByPropertyID: async (connection,pid) => {
        var sql = "SELECT * from onboarding_property_status where property_id = " + connection.escape(pid);
        var res = await connection.queryAsync(sql);
        return res;
    },
    findOnboardingProperties: async (connection,cid) => {
        var sql = `
        select ops.property_id,ops.golive_date,ops.due_date,ops.property_status,ops.property_percentage,p.address_id,p.number,p.name,p.gds_id as gds_facility_id ,ops.merge_status from  
        onboarding_property_status ops
        INNER JOIN properties p 
        ON ops.property_id = p.id
        where p.company_id = ${connection.escape(cid)}  
        `;
        var res = await connection.queryAsync(sql);
        return res;
    },

    getAllContacts: async (connection, email) => {
        var sql = `SELECT * FROM onboarding_technical_contacts`
        if(email){
            sql += ` where email = ${connection.escape(email)}`;
        }
        var res = await connection.queryAsync(sql);
        return res;
    },
    
    getActivePropertyData: async (connection)=>{
           var sql = `select p.company_id ,c.name as company_name , c.subdomain, c.email,c.firstname,c.lastname , ops.property_percentage , ops.due_date , ops.golive_date , ocs.tech_contact_name ,ocs.tech_contact_email,ocs.tech_contact_phone , p.name ,ops.launch_date ,ops.utc_offset from  
           onboarding_property_status ops
           JOIN properties p 
           ON ops.property_id = p.id
		   JOIN companies c ON p.company_id = c.id
           JOIN onboarding_company_status ocs ON ocs.company_id = c.id
           where ops.property_percentage <> '100' AND  c.active = 1 AND ops.launch_date IS NOT NULL`;

        var res = await connection.queryAsync(sql);
        return res;
    },

    findUserByGdsApplicationId: async (connection , gds_application_id)=>{
        var sql = `SELECT id FROM users where gds_application_id = ${connection.escape(gds_application_id)}`;
        var res = await connection.queryAsync(sql);
        return res;
    },

    saveOnboardingMenus: async (connection ,data ,id)=>{
        var sql;

        if (id) {
            sql = "UPDATE onboarding_menus set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into onboarding_menus set ?";
        }

        var result = await connection.queryAsync(sql, data);
        return id ? id : result.insertId;
    },

    getAllMenuiItems: async (connection, company_id,screen_type) => {

        let menuSql = "SELECT * FROM onboarding_menus WHERE company_id = " + connection.escape(company_id);

        if(screen_type){
            menuSql+=" and screen_type = " + connection.escape(screen_type);
        }
        let menuList = await connection.queryAsync(menuSql);
        return menuList; 
    },

    deleteMenuItems: async (connection ,company_id , screen_types ,screen_name)=>{
        var sql = `DELETE FROM onboarding_menus WHERE screen_type IN (${connection.escape(screen_types)}) and company_id = ${connection.escape(company_id)}`;
        if(screen_name){
            sql +=` and screen_name = ${connection.escape(screen_name)}`
        }
        var res = await connection.queryAsync(sql);
        return res;
    },

    removeTempRecords: async (connection,payload) => {
        let sql = `delete from nw_units_all where Owner = ${connection.escape(payload.company_name)} AND Name = ${connection.escape(payload.property_name)};`;
        await connection.queryAsync(sql);
    }

};
