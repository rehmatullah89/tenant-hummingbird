var settings    = require(__dirname + '/../config/settings.js');
var Promise      = require('bluebird');
var moment = require('moment');

var models  = {};

module.exports = {

    getTenantDetails: function(connection, user_id, subdomain){

        var tenantSql = "select * from tenants where user_id = " + user_id + ' limit 1';
        var tenant = {};

        return connection.queryAsync(tenantSql)
            .then(function(tenantRes) {
                if(!tenantRes.length) throw "Username or password is incorrect";

                tenant = tenantRes[0];

                var leaseSql = "select * from " +
                    " leases where id in " +
                    " (select lease_id from leases_tenants where tenant_id = " + tenant.id + " ) " +

                    " and leases.unit_id in (select id from units where units.property_id in (select id from properties where company_id in (select id from companies where subdomain = " + connection.escape(subdomain) + ")))";

                return connection.queryAsync(leaseSql);
            }).then(function(leaseRes){

                if(!leaseRes.length) throw "Username or password is incorrect";
                tenant.leases = leaseRes;
                return tenant;
            }).catch(function(err){
                console.error(err);
                throw err;


            });
    },

    findById: function(connection, user_id){
        var user;
        var userSql = "SELECT * FROM users WHERE active = 1 and id = " + connection.escape(user_id);
        return connection.queryAsync(userSql).then(function(userRes){
            return userRes[0] || null;
        });
    },

    findByEmail: function(connection, email, company_id, contact_id) {
        var _this = this;
        var userSql = "SELECT * FROM users where email =  " + connection.escape(email) + " and id in (select user_id from contacts where contacts.company_id =   " + connection.escape(company_id) + " or contacts.company_id is null)  ";

        if(contact_id){
            userSql += " and id != (select user_id from contacts where id = " + + connection.escape(contact_id) + " ) "  ;
        }

        userSql += ' limit 1';

        return connection.queryAsync(userSql).then(users =>  users.length ? users[0] : null );
    },

    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "update users set ?  where id = " + connection.escape(id);
        } else {
            sql = "insert into users set ?";
        }
        

        return connection.queryAsync(sql, data).then((result)=>{
            return id || result.insertId;
        })
    },

    delete: function(connection, user_id){
        var sql = "delete from users where id = " + connection.escape(user_id);
        return connection.queryAsync(sql);
    },

    findUserRolesByCompanyId: function(connection, user_id, company_id){
        var rolesSql = "Select * from companies_user_roles where user_id = " +  connection.escape(user_id) + ' and company_id = ' + connection.escape(company_id);
        return connection.queryAsync(rolesSql);
    },

    findLeasesAtCompany: function(connection, user_id, company_id){
        var tenant;
        var tenantSql = "Select * from tenants where user_id = " +  connection.escape(user_id);
        var user = {};
        return connection.queryAsync(tenantSql).then(function(tenantRes) {
            tenant = tenantRes[0];
            var tenant_id = tenant.id;

            var leasesSql = "Select * from leases_tenants where tenant_id = " +  connection.escape(tenant.id) + ' and lease_id in (select id from leases where unit_id in ' +
                '(select id from units where property_id in ' +
                '(select id from properties where company_id = ' + connection.escape(company_id) + '))) limit 1';

            return connection.queryAsync(leasesSql);
        })
    },

    findByEmailOrSave:function(connection, user){

        var _this = this;
        var userSql = "SELECT * FROM users WHERE email = " + connection.escape(user.email);

        return connection.queryAsync(userSql)
            .then(function(userRes){
                if(userRes.length){
                    return userRes[0].id;
                } else {
                    return _this.save(connection, user).then(function(result){
                        return result.insertId || false;
                    });

                }
            })
    },

    search:function(connection, search, limit, offset){
        var sql;
        sql = "select * " +
            " from users where " +
            " (concat(first, ' ', last) like "  + connection.escape("%" + search + "%") + " or " +
            " phone like "  + connection.escape("%" + search + "%") + " or" +
            " company like "  + connection.escape("%" + search + "%") + " or " +
            " email like "  + connection.escape("%" + search + "%") + ") and " +
            " ( type != 2 || type is null )  " +
            ' limit ' + offset + ", " + limit;



        return connection.queryAsync(sql);

    },

    saveUserRole(connection, data, id){
        var sql;
        if(id){
            sql = "update companies_contact_roles set ?  where id = " + connection.escape(id);
        } else {
            sql = "insert into companies_contact_roles set ?";
        }
        return connection.queryAsync(sql, data).then((result)=>{
            return id || result.insertId;
        })

    },

    async findGdsAppId(connection, leaseId) {
        let sql = `SELECT gds_application_id FROM users WHERE id IN (SELECT user_id FROM contacts WHERE id IN (SELECT created_by FROM leases WHERE id = ${connection.escape(leaseId)}));`
        return connection
          .queryAsync(sql)
          .then((r) => (r.length ? r[0]?.gds_application_id ?? "" : ""));
      },


};

models = require(__dirname + '/../models');