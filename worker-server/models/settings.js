var moment      = require('moment');
var Promise      = require('bluebird');
const ENUMS = require('../modules/enums');



var settingCategories = {
    billing: [
        'invoiceSendDay',
        'invoiceLateDay',
        'lateChargeAmt',
        'lateChargeType',
        'taxRate',
        'invoiceChargeOffset',
        'lockoutDays',
        'defaultDays',
        'auctionDays'
    ],
    connections: [
        'authnetLogin',
        'authnetKey',
        'forteOrganizationId',
        'forteLocationId',
        'forteLogin',
        'forteKey'
    ],
    quickbooks: [
        'oauthTokenSecret',
        'oauthToken',
        'realmId',
        'quickbooksTokenRenewal',
        'qbIncomeAccount',
        'qbDepositLiability',
        'qbPrepaymentLiability',
        'qbTaxCode',
        'taxRate'
    ],
    notifications: [
        'notificationEmails'
    ],
    accounting: Object.keys(ENUMS.SETTINGS.ACCOUNTING)
};


module.exports = {

    findSettings: function(connection, settingsCategory, company_id ){

        var settingsSql = "Select * from settings where name in ('"+  settingCategories[settingsCategory].join("', '") + "') and company_id = " + connection.escape(company_id);

        return connection.queryAsync( settingsSql );
    },


    findAllSettings: function(connection, company_id ){

        var settingsSql = "Select * from settings where company_id = " + connection.escape(company_id);

        return connection.queryAsync( settingsSql );
    },

    findCompanySettings: function(connection, settingsCategory, company_id ){

        var settingsSql = "Select * from settings where name in ('"+  settingCategories[settingsCategory].join("', '") + "') and company_id = " + connection.escape(company_id);

        return connection.queryAsync( settingsSql );
    },
    
    findCompanySetting: function(connection, settingName, company_id ){

        var settingsSql = "Select * from settings where name = "+  connection.escape(settingName) + " and company_id = " + connection.escape(company_id);

        return connection.queryAsync( settingsSql ).then(function(settingsRes){
            return settingsRes.length ? settingsRes[0] : null;
        })
    },


    findByCompanySetting: function(connection, settingName, settingValue ){

        var settingsSql = "Select * from settings where name = " +  connection.escape(settingName) + " and value = " + connection.escape(settingValue);

        return connection.queryAsync( settingsSql ).then(function(settingsRes){
            return settingsRes[0] || null;
        })
    },

    saveSettings: function(connection, data, category, company_id){
        var promises = [];
        var sql;
            
        for(var key in data){
            if(settingCategories[category].indexOf(key) >= 0){
                sql = "Update settings set value = " + connection.escape(data[key]) + " where company_id = " + connection.escape(company_id) + " and name = " + connection.escape(key);
                promises.push(connection.queryAsync( sql));
            }
        }
        return Promise.all(promises);

    },

    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE settings set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into settings set ?";
        }
        return connection.queryAsync(sql, data);
    },

    saveSMSNumber: function(connection, data, id){

        var sql;
        
        if(id){
            sql = "UPDATE sms_numbers set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into sms_numbers set ?";
        }

        return connection.queryAsync(sql, data);

    },

    findInsurance: function(connection, company_id ){

        var settingsSql = "Select * from insurance where company_id = " + connection.escape(company_id);
        return connection.queryAsync( settingsSql );
    },


    findNotificationTypes(connection){
        var sql = "select *, " +
            "(select name from activity_type_categories where activity_type_categories.id = activity_types.activity_type_category_id) as category_name, " +
            "(select sort from activity_type_categories where activity_type_categories.id = activity_types.activity_type_category_id) as category_sort, " +
            "(select field_key from activity_type_categories where activity_type_categories.id = activity_types.activity_type_category_id) as category_key " +
            " from activity_types where notify = 1 order by category_sort asc";
        return connection.queryAsync(sql);
    },

    deleteNotificationSettings(connection, contact_id, company_id){
        if(!contact_id || !company_id) return;
        var sql = "Delete from admin_notifications where company_id = " + connection.escape(company_id) + ' and contact_id = ' +  connection.escape(contact_id);
        return connection.queryAsync( sql );

    },

    saveNotificationSettings(connection, data){
        var sql = "insert into admin_notifications set ?";
        return connection.queryAsync( sql,data );

    },

    findNotificationSettings(connection, contact_id, company_id){
        if(!contact_id || !company_id) return;
        var sql = "SELECT * from admin_notifications where company_id = " + connection.escape(company_id) + ' and contact_id = ' +  connection.escape(contact_id);
        return connection.queryAsync( sql );

    },

    findContactsToNotify(connection, activity_object_id, activity_action_id, company_id){
        if(!activity_action_id || !activity_object_id || !company_id) return [];

        var sql = "select *, " +
            "(select text from admin_notifications where activity_object_id = " + connection.escape(activity_object_id) + " and activity_action_id = " + connection.escape(activity_action_id) + " and contact_id = contacts.id and company_id = " + connection.escape(company_id) + ") as should_text, (select email from admin_notifications where activity_object_id = " + connection.escape(activity_object_id) + " and activity_action_id = " + connection.escape(activity_action_id) + " and contact_id = contacts.id and company_id = " + connection.escape(company_id) + ") as should_email FROM contacts where id in (select contact_id from companies_contact_roles where company_id = " + connection.escape(company_id) + ");"

        console.log(sql);
        return connection.queryAsync( sql );

    },

    getLeaseStandings(connection){
        let sql = "SELECT * from lease_standings order by id asc ";
        return connection.queryAsync( sql );
    },

    getLeaseStandingByName(connection, name){
        let sql = "SELECT * from lease_standings where name = " + connection.escape(name) + " order by sort asc, id asc ";
        return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    },

    getLeaseStandingById(connection, id){
        let sql = "SELECT * from lease_standings where id = " + connection.escape(id) + ' order by sort asc, id asc ';
        return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    },

    saveLeaseStanding(connection, data, lease_standing_id){
        var sql;
        if(lease_standing_id){
            sql = "UPDATE lease_standings set ? where id = " + connection.escape(lease_standing_id);
        } else {
            sql = "insert into lease_standings set ?";
        }
        return connection.queryAsync(sql, data).then(r => lease_standing_id ? lease_standing_id : r.insertId);
    },
    

}