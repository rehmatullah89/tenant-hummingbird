var settings    = require(__dirname + '/../config/settings.js');
var Promise      = require('bluebird');
var moment = require('moment');
var STAGING_DB = 'hummingbird_staging';


module.exports = {

    findById: function(connection, company_id){
        var userSql = "SELECT * FROM companies WHERE active = 1 and id = " + connection.escape(company_id);
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },

    findByPropertyId: function(connection, property_id){
        var userSql = "SELECT * FROM companies WHERE active = 1 and id = (select company_id from properties where id = " + connection.escape(property_id) + ")";
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },

    async findBySubdomain (connection, subdomain){
        var sql = "SELECT * FROM companies WHERE active = 1 and subdomain = " + connection.escape(subdomain);

        let companyRes =  await connection.queryAsync(sql);
        return companyRes[0] || null;
    },

    findRolesAtProperty(connection, roles, property_id, company_id){
      var sql = "select * from companies_contact_roles where role_id in (" + roles.map(r => connection.escape(r)).join(',') + ") and company_id = " + connection.escape(company_id) + " and id in (select company_contact_role_id from contact_roles_properties where property_id = " + connection.escape(property_id) + ")";

      console.log("sql", sql);

      return connection.queryAsync(sql);


    },

    findDistinctRoles(){
        var userSql = "SELECT * FROM user_roles";
        return connection.queryAsync(userSql);
    },

    findCompaniesToInvoice: function(connection, queue){

        var today = moment();
        var thisDay = today.format('D');
        var thisMonth = today.format('MM');
        var thisYear = today.format('YYYY');
        var daysInThisMonth = moment(thisYear + "-" + thisMonth, "YYYY-MM").daysInMonth();
        var daysArray = [];
        var job;

        if(thisDay >= daysInThisMonth){
            while (daysInThisMonth <= 31){
                daysArray.push(connection.escape(daysInThisMonth));
                daysInThisMonth++;
            }
        } else {
            daysArray.push(thisDay);
        }

        var settingsQuery = "Select distinct(company_id) from settings where name = 'invoiceSendDay' and value in ( " + daysArray.join(',') + " )";


        return connection.queryAsync(settingsQuery).then(function(settingsRes){

            if(settingsRes.length){
                settingsRes.forEach(function(company){
                    job = queue.create('processInvoices', {
                        id: company.company_id,
                        action: 'invoices',
                        label: 'process'
                    }).save(function(err){
                        if( err ) console.error( err );
                    })
                });
            }
            return true;
        })
    },


    findAll: function(connection, subdomain){
        var userSql = "SELECT * FROM companies WHERE active = 1";
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes;
        });
    },

    findByGdsID: function(connection, gds_id){
      var sql = "SELECT * FROM companies where active = 1 and gds_owner_id =" + connection.escape(gds_id);
      return connection.queryAsync(sql).then(function(companyRes){
        return companyRes;
      });
    },

    save: function(connection, data){
        let sql = "INSERT INTO companies SET ?";
        return connection.queryAsync(sql, data).then(result => {
            return result.insertId;
        });
    },
    findLatestCompanyId: function(connection){
        let sql = "SELECT id FROM companies ORDER BY id DESC LIMIT 1";
        return connection.queryAsync(sql).then(function(companyRes) {
            return companyRes?.[0]?.id ?? 0;
        });
    },
    async findCharmRolesAtCompany(connection, property_id){
        var charmSql = `SELECT ccr.contact_id FROM hummingbird.companies_contact_roles as ccr 
        join contact_roles_properties crp on crp.company_contact_role_id = ccr.id 
        where ccr.role_id in
        (select r.id from roles as r
        join roles_permissions  rp on rp.role_id = r.id and rp.permission_id = (select id from permissions where label='mini_charm'))
        and crp.property_id=${property_id}
        `
        let charmContacts =  await connection.queryAsync(charmSql);
        return charmContacts || null;
        
    },
    
    findPreviousOwner: function(connection){
        let userSql = "SELECT DISTINCT owner from hummingbird_staging.nw_Units_All";
        return connection.queryAsync(userSql).then(function(companyRes) {
            return companyRes?.[0]?.owner ?? null;
        });
    },

    updateMigrationData: function(connection, body){
        let queries = [
            `UPDATE hummingbird_staging.nw_Units_All SET OWNER = '${body.new_owner}' WHERE OWNER = '${body.old_owner}' LIMIT 1000`,
            `UPDATE hummingbird_staging.nw_Units_All SET name = '${body.facility1}' WHERE name = '${body.old_facility1}' LIMIT 1000`,
            `UPDATE hummingbird_staging.nw_Units_All SET name = '${body.facility2}' WHERE name = '${body.old_facility2}'`,
            `UPDATE hummingbird_staging.nw_OwnerProperty_All SET Owner = '${body.new_owner}' LIMIT 1000`,
            `UPDATE hummingbird_staging.nw_OwnerProperty_All SET name = '${body.facility1}' WHERE name = '${body.old_facility1}' LIMIT 1000`,
            `UPDATE hummingbird_staging.nw_OwnerProperty_All SET name = '${body.facility2}' WHERE name = '${body.old_facility2}' LIMIT 1000`,
        ]
        for (let query of queries) { 
            connection.queryAsync(query);
        } return
    },

    callMigrationProcedure: function(connection, facility, subdomain) {
        let userSql = `CALL hummingbird_staging.sp_DevportalCreateCompany ('${facility}','0','${subdomain}', 0)`
        connection.queryAsync(userSql).then(function(companyRes) {
            return companyRes;
        });

    },
    updateCompanyDetails: function(connection, data, subdomain){
        let sql = "UPDATE companies set ? where subdomain = " + connection.escape(subdomain);
        return connection.queryAsync(sql, data);
    },

    findLatestCompanyId: function(connection){
        let sql = "SELECT id FROM companies ORDER BY id DESC LIMIT 1";
        return connection.queryAsync(sql).then(function(companyRes) {
            return companyRes?.[0]?.id ?? 0;
        });
    },

    getApplications: function(connection, companyId){

        let query = `SELECT
                        u.gds_application_id as "app_urn", c.first as "name",
                        CASE
                            WHEN COUNT(p.id) > 0
                                THEN JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'name', p.name, 'gds_id', p.gds_id))
                            ELSE NULL
                        END
                        AS properties
                    FROM
                        companies_contact_roles ccr
                        JOIN contacts c ON c.id = ccr.contact_id
                        JOIN roles r ON r.id = ccr.role_id
                        JOIN users u on u.id=c.user_id
                        LEFT JOIN contact_roles_properties crp ON crp.company_contact_role_id = ccr.id
                        LEFT JOIN properties p on p.id=crp.property_id
                    WHERE
                        r.type = 'application'
                        AND ccr.company_id = ${connection.escape(companyId)}
                        GROUP BY u.gds_application_id, c.first`;

        return connection.queryAsync(query).then(function(appsRes) {
            return appsRes;
        });
    },
};
