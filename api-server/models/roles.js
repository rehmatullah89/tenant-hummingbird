var moment = require('moment');

module.exports = {

    findByCompany(connection, company_id){
        var sql = `select * from roles where company_id = ${connection.escape(company_id)} and is_active = 1 and type = 'admin'`;
        return connection.queryAsync(sql);
    },

    findPermissions(connection, role_ids){
        var companyUserSql = `Select permission_id as id, 
            (select label from permissions where id = roles_permissions.permission_id limit 1) as label, 
            (select name from permissions where id = roles_permissions.permission_id limit 1) as name,
            (select category from permissions where id = roles_permissions.permission_id limit 1) as category,
            value, value_type from roles_permissions where role_id in ( ${role_ids.map(id => connection.escape(id)).join(',') } );`

        return connection.queryAsync(companyUserSql);
    },

    findAllPermissions(connection, payload = {}) {
      const { should_include_private = false } = payload;
          
      let sql = `select * from permissions p`;
      if(!should_include_private) {
        sql += ` where p.is_private = 0`; 
      }

      console.log('Permissions ', sql);

      return connection.queryAsync(sql);
    },

    resetDefaultRole(connection, company_id){
        let sql = 'update roles set is_default = 0 where company_id = ' + connection.escape(company_id);

         return connection.queryAsync(sql);
    },

    findPropertyPermissions(connection, company_id, contact_id, property_id){
        var sql = "Select permission_id as id, " +
            "(select name from permissions where id = roles_permissions.permission_id limit 1) as name, " +
            "(select category from permissions where id = roles_permissions.permission_id limit 1) as category, " +
            "value, value_type from roles_permissions where role_id in " +
            `(select role_id from companies_contact_roles where company_id = ${connection.escape(company_id)} and contact_id = ${connection.escape(contact_id)} ` +
            `and id in (select company_contact_role_id from contact_roles_properties where property_id = ${connection.escape(property_id)}))`;

        return connection.queryAsync(sql);
    },

    findByContact(connection, company_id, contact_id, role_id){
        var sql = `select * from companies_contact_roles where company_id = ${connection.escape(company_id)} and contact_id = ${connection.escape(contact_id)} and role_id = ${connection.escape(role_id)}`;
        return connection.queryAsync(sql);
    },

    saveProperty(connection, data){

      let sql = "INSERT INTO contact_roles_properties SET ?";

      return connection.queryAsync(sql, data)

        // var existSql = `SELECT * FROM contact_roles_properties where property_id = ${property_id} and company_contact_role_id in (select id from companies_contact_roles where company_id = ${company_id} and contact_id = ${contact_id});`;
        // return connection.queryAsync(existSql).then(function(roleProperty){
        //     var rolePropertyID;
        //
        //     if(roleProperty.length) rolePropertyID = roleProperty[0].id;
        //     var sql = "";
        //     if(rolePropertyID){
        //         sql = "UPDATE contact_roles_properties SET ? WHERE id = " + rolePermID;
        //     } else {
        //         sql = "INSERT INTO contact_roles_properties SET ?";
        //     }
        //
        //     return connection.queryAsync(sql, data)
        // });
    },

    saveNonHBProperty(connection, data){

        let sql = "INSERT INTO contact_roles_non_hummingbird_properties SET ?";
  
        return connection.queryAsync(sql, data)
      },



    deleteProperties(connection, properties, company_contact_role_id){

        let sql = "DELETE FROM contact_roles_properties WHERE company_contact_role_id = " + connection.escape(company_contact_role_id);
         if(properties.length) {
           sql += " and property_id not in (" +  properties.map(d => connection.escape(d.id)).join(',') + ")";
         }
        return connection.queryAsync(sql);
    },

    deletePropertiesBulk(connection, properties, ccr_ids){
        let sql = `DELETE FROM contact_roles_properties WHERE company_contact_role_id in (${ccr_ids.map(d => connection.escape(d)).join(',')}) `;
         if(properties.length) {
           sql += " and property_id not in (" +  properties.map(d => connection.escape(d.id)).join(',') + ")";
         }
        return connection.queryAsync(sql);
    },

    deleteNonHbProperties(connection, properties, company_contact_role_id){

        let sql = "DELETE FROM contact_roles_non_hummingbird_properties WHERE company_contact_role_id = " + connection.escape(company_contact_role_id);
         if(properties?.length) {
           sql += " and property_id not in (" +  properties.map(d => connection.escape(d.id)).join(',') + ")";
         }
        return connection.queryAsync(sql);
    },

    findById: function(connection, id, company_id){
        let sql =  "Select * from roles where id = " + connection.escape(id);
        if(company_id){
          sql +=  ' and company_id = ' + connection.escape(company_id)
        }
        return connection.queryAsync( sql ).then(res => res.length? res[0]: null)
    },

    findByName: function(connection, name, company_id){
        let sql =  "Select * from roles where name = " + connection.escape(name);
        if(company_id){
          sql +=  ' and company_id = ' + connection.escape(company_id)
        }

        return connection.queryAsync( sql );
    },


    save: function(connection, data, id){
        let sql;
        if(id){
          sql = "UPDATE roles set ? where id = " + connection.escape(id);
        } else {
          sql = "INSERT into roles set ?";
        }
        return connection.queryAsync(sql, data);
    },

    savePermission(connection, permission, role_id){
        let data = {
            role_id,
            permission_id: permission.id,
            value: permission.value,
            value_type: permission.value_type
        };

        var existSql = "SELECT * FROM roles_permissions WHERE role_id = " + connection.escape(role_id) + ' and permission_id = ' + connection.escape(permission.id);
        return connection.queryAsync(existSql).then(function(rolePerm){
            var rolePermID;

            if(rolePerm.length) rolePermID = rolePerm[0].id;
            var sql = "";
            if(rolePermID){
                sql = "UPDATE roles_permissions SET ? WHERE id = " + rolePermID;
            } else {
                sql = "INSERT INTO roles_permissions SET ?";
            }

            return connection.queryAsync(sql, data)
        });
    },

    deletePermissions(connection, permissions, role_id){
        let sql = "DELETE FROM roles_permissions WHERE role_id = " + connection.escape(role_id);

        if(permissions && permissions.length > 0) {
            sql += " and permission_id not in (" +  permissions.map(p => connection.escape(p.id)).join(',') + ")"
        }
        return connection.queryAsync(sql);
    },

    deleteCompanyContactRole(connection, id){
        let sql = "DELETE FROM companies_contact_roles WHERE id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },

    deleteCompanyContactRoleBulk(connection, ids){
        let sql = `DELETE FROM companies_contact_roles WHERE id in (${ids.map(d => connection.escape(d)).join(',')})`; 
        return connection.queryAsync(sql);
    },

    findProperties(connection, company_contact_role_id){
        var sql = `select property_id as id from contact_roles_properties where company_contact_role_id = ${connection.escape(company_contact_role_id)}`;
        return connection.queryAsync(sql);
    },
    checkRoleInUse(connection, role_id){
        var sql = `SELECT 
            COUNT(*) > 0 as inUse
        FROM
            companies_contact_roles
        WHERE
            role_id = ${ connection.escape(role_id)};`;
        return connection.queryAsync(sql);
    },
    findRoleInUse(connection, role_id, company_id){
        var sql = `SELECT id, first, last, email  
        FROM contacts 
        WHERE id in 
        (SELECT contact_id 
            FROM companies_contact_roles 
            WHERE role_id =  ${ connection.escape(role_id)} and company_id = ${ connection.escape(company_id)}
        );`
        return connection.queryAsync(sql);
    },

    delete(connection, role_id){
        var sql = `UPDATE roles 
        SET 
            is_active = 0
        WHERE
            id = ${ connection.escape(role_id)}`;
        return connection.queryAsync(sql);
    },
    hardDeleteRole(connection, role_id){
        let sql = "DELETE FROM roles WHERE id = " + connection.escape(role_id);
        console.log("sql", sql)
        return connection.queryAsync(sql);
    },
    getAdminWithPermission(connection, company_id, slug){
        let sql = `SELECT * from contacts where company_id is null and id in (select contact_id from companies_contact_roles where status = 1 and company_id = ${connection.escape(company_id)} and role_id in (select role_id from roles_permissions where permission_id in (select id from permissions where label = ${connection.escape(slug)} )));`;
        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    savePropertiesInBulk(connection, data){
        const columns = Object.keys(data[0]);
        const values = data.map(d => columns.map(column => d[column]));

        let sql = `INSERT INTO contact_roles_properties (${columns.join(',')}) values ?`

        return connection.queryAsync(sql, [values]);
    },

    saveNonHBPropertiesInBulk(connection, data){
        const columns = Object.keys(data[0]);
        const values = data.map(d => columns.map(column => d[column]));

        let sql = `INSERT INTO contact_roles_non_hummingbird_properties (${columns.join(',')}) values ?`

        return connection.queryAsync(sql, [values]);
    },

    findPropertyPermissionsLabel(connection, company_id, contact_id, property_id){
        var sql = "Select permission_id as id, " +
            "(select label from permissions where id = roles_permissions.permission_id limit 1) as label " +
            "from roles_permissions where role_id in " +
            `(select role_id from companies_contact_roles where company_id = ${connection.escape(company_id)} and contact_id = ${connection.escape(contact_id)} ` +
            `and id in (select company_contact_role_id from contact_roles_properties where property_id = ${connection.escape(property_id)}))`;

        return connection.queryAsync(sql);
    },
    
    findPropertyPermissionsByLabel(connection, company_id, contact_id, property_id){
        var sql = "Select permission_id as id, " +
            "(select label from permissions where id = roles_permissions.permission_id and label = 'payout_email' limit 1) as label " +
            "from roles_permissions where role_id in " +
            `(select role_id from companies_contact_roles where company_id = ${connection.escape(company_id)} and contact_id = ${connection.escape(contact_id)} ` +
            `and id in (select company_contact_role_id from contact_roles_properties where property_id = ${connection.escape(property_id)}))`;

        return connection.queryAsync(sql);
    }
};
