var settings    = require(__dirname + '/../config/settings.js');
var moment = require('moment');

module.exports = {
    findByUserId:function(connection, user_id){
        var adminSql = "Select *, " +
            "(select id from admins where users.id = admins.user_id  ) as admin_id " +
            " from users where id = " +  connection.escape(user_id);
        return connection.queryAsync(adminSql).then(function(userRes) {
            return userRes[0] || null;
        });
    },

    findByCompanyId:function(connection, company_id){

        var companyUserSql = "Select distinct(contact_id) as contact_id, " +
            "(select email from contacts where id = companies_contact_roles.contact_id limit 1) as email, " +
            "(select first from contacts where id = companies_contact_roles.contact_id limit 1) as first, " +
            "(select last from contacts where id = companies_contact_roles.contact_id limit 1) as last " +
            " from companies_contact_roles where company_id = " +  connection.escape(company_id);

        return connection.queryAsync(companyUserSql);
    },
    save(connection, company_id, user_id, contact_id) {
        var _this = this;
        var data = {
            user_id: user_id
        }
        var roleData = {};
        var sql = "insert into admins set ?";
        var promises = [];
        return connection.queryAsync(sql, data).then(function(){
            for(var i = 1; i <= 7; i++){
                roleData = {
                    role_id: i,
                    company_id: company_id,
                    user_id: user_id,
                    contact_id: contact_id
                };
                promises.push(connection.queryAsync("insert into companies_contact_roles set ?", roleData))
            }

            return Promise.all(promises);
        });

    },
    delete(connection, user_id, company_id){
        var sql = "delete from companies_user_roles where company_id = " + connection.escape(company_id) + " and user_id = " + connection.escape(user_id);

        return connection.queryAsync(sql).then(() => {
            var sql2 = "delete from admins where user_id = " + connection.escape(user_id);
            return connection.queryAsync(sql2)
        })
    }

};