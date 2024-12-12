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
        'auctionDays',
        'reservationExpiration',
        'allowInterPropertyPayments'
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
        'qbOauthTokenSecret',
        'qbOauthToken',
        'qbRealmId',
        'qbTokenRenewal',
        'qbIncomeAccount',
        'qbDepositLiability',
        'qbPrepaymentLiability',
        'qbTaxCode',
        'taxRate'
    ],
    notifications: [
        'notificationEmails'
    ],
    transactional: [
        'defaultCloseOfDay',
        'paymentOrder',
        'productLevelTax',
        'invoiceAdjustmentDays',
        'reversalThreshold',
        'enableGiftCard'
    ],
    accounting: Object.keys(ENUMS.SETTINGS.ACCOUNTING),
    reservation: [
        'maxAdvanceReservation'
    ]
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

    findPropertyOrDefaultSettings(connection, payload) {
        const { category, company_id, property_id } = payload;
        const settingNames = settingCategories[category].map(s => connection.escape(s)).join(', ');

        let sql = `
            ${
                property_id ? 
                `with cte_property_settings as ( 
                    Select s.* from settings s where name in (${settingNames}) and company_id = ${company_id}
                    and property_id = ${property_id}
                )` : ''
            }
            
            Select s.* from settings s where s.name in (${settingNames}) and s.company_id = ${company_id}
            and s.property_id is null 
            ${ property_id ? `and s.name not in (select name from cte_property_settings)
                union
                select * from cte_property_settings` : ''           
            }
        `;

        console.log('findPropertyOrDefaultSettings sql ', sql);

        return connection.queryAsync(sql);
    },

    findCompanySettings: function(connection, settingsCategory, company_id ){
        var settingsSql = "Select * from settings where name in ('"+  settingCategories[settingsCategory].join("', '") + "') and company_id = " + connection.escape(company_id) + " and property_id is NULL";
        console.log("settingsSql:",settingsSql);
        return connection.queryAsync(settingsSql);
    },

    findPropertySettings: function(connection, settingsCategory, company_id , property_id){
        var settingsSql = "Select * from settings where name in ('"+  settingCategories[settingsCategory].join("', '") + "') and company_id = " + connection.escape(company_id) + " and property_id = " + connection.escape(property_id);
        console.log("settingsSql:",settingsSql);
        return connection.queryAsync( settingsSql );
    },

    findCompanySetting: function(connection, settingName, company_id ){

        var settingsSql = "Select * from settings where name = "+  connection.escape(settingName) + " and company_id = " + connection.escape(company_id);
        return connection.queryAsync( settingsSql ).then(function(settingsRes){
            return settingsRes.length ? settingsRes[0] : null;
        })
    },

    findPropertySetting: function(connection, settingName, property_id ){

        var settingsSql = "Select * from settings where name = "+  connection.escape(settingName) + " and property_id = " + connection.escape(property_id);
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

    findSpaceTypeParameters(connection, company_id, unit_type){

        var settingsSql = "Select *, (select LOWER(name) from amenities where id = space_types.amenity_id) as name from space_types where company_id = " + connection.escape(company_id) + " and unit_type = " + connection.escape(unit_type);

        return connection.queryAsync( settingsSql );
    },

    findSpaceTypes(connection, company_id, unit_type, space_type_parameters){

         var sql = "select price, ";

         for(let i = 0; i< space_type_parameters.length; i++){
             sql += " (select CAST(value as signed) from amenity_units where amenity_id = " + space_type_parameters[i].amenity_id + "   and unit_id = units.id) as " + space_type_parameters[i].name.toLowerCase() + ','
         }

         sql += " COUNT(*) as count from units where property_id in (select id from properties where company_id = 1) " +
             " group by price, ";

        for(let i = 0; i< space_type_parameters.length; i++){
            sql += space_type_parameters[i].name.toLowerCase() + ', ';
        }

        sql = sql.substring(0, sql.trim().length - 1);

        sql += ' order by '
        for(let i = 0; i< space_type_parameters.length; i++){
            sql += space_type_parameters[i].name.toLowerCase() + ' ASC, ';
        }
        sql += ' price ASC ';

        console.log(sql)

        return connection.queryAsync( sql );

    },

    saveSettings: function(connection, data, category, company_id, propertyIds){
        var promises = [];
        var sql;

        for(var key in data){
            if(settingCategories[category].indexOf(key) >= 0){
                if (propertyIds && propertyIds.length) {
                    sql = "Select * from settings where name = " + connection.escape(key) + " and property_id in (" + propertyIds.map(pid => connection.escape(pid)).join(", ") + ")";
                    let name = key;
                    let value = data[key];
                    promises.push(
                        connection.queryAsync(sql)
                            .then( property_settings => {
                                propertyIds.forEach((property_id) => {
                                    let property_setting = property_settings.find(ps => ps.property_id === property_id)
                                    this.save(connection, {company_id, property_id, name, value}, property_setting && property_setting.id)
                                });
                            })
                    );
                } else if (company_id) {
                    sql = "Update settings set value = " + connection.escape(data[key]) + " where company_id = " + connection.escape(company_id) + " and name = " + connection.escape(key);
                    promises.push(connection.queryAsync( sql));
                }
            }
        }
        return Promise.all(promises);
    },

    findById(connection, payload) {
        const { id } = payload;
        const sql = `select * from settings where id = ${connection.escape(id)}`;
        return connection.queryAsync(sql);
    },

    saveSettingHistory(connection , data) {
        const sql = 'insert into settings_history set ?';
        return connection.queryAsync(sql, data);
    },

    saveSetting(connection, data) { 
        let sql = 'insert into settings set ?';

        if(data.id) {
            sql = `update settings set ? where id = ${connection.escape(data.id)}`;
        }

        return connection.queryAsync(sql, data);
    },

    save: async(connection, data, id, admin_id) => {

        let pre_setting;
        if(id){
            let pre_sql = `select * from settings where id = ${connection.escape(this.id)}`;
            pre_setting = await connection.queryAsync(pre_sql);
        }

        var sql;
        if(id){
            sql = "UPDATE settings set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into settings set ?";
        }
        let result = await connection.queryAsync(sql, data);

        if(!pre_setting || (data.value != pre_setting.value)){
            let setting_hist = {
                settings_id: id || result.insertId,
                name: data.name,
                old_value: pre_setting ? pre_setting.value : null,
                new_value: data.value,
                modified_by: admin_id
            }
            let sql_hist = "insert into settings_history set ?";
            await connection.queryAsync(sql_hist, setting_hist);
        }
        
        return result;
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
    deleteAdminNotification(connection, contact_id, notification_id){
        var sql = "Delete from admin_notifications where id = " + connection.escape(notification_id) + ' and contact_id = ' + connection.escape(contact_id) ;
        return connection.queryAsync( sql );

    },

    saveNotificationSettings(connection, data, notification_id){
        var sql = "";

      if(notification_id){
        sql = "UPDATE admin_notifications set ? where id = " + connection.escape(notification_id);
      } else {
        sql = "insert into admin_notifications set ?";
      }

      return connection.queryAsync( sql,data );

    },

    findNotificationSettings(connection, contact_id, company_id){
        if(!contact_id || !company_id) return;
        var sql = "SELECT * from admin_notifications where company_id = " + connection.escape(company_id) + ' and contact_id = ' +  connection.escape(contact_id);

        return connection.queryAsync( sql );

    },

    getLeaseStandings(connection){
      let sql = "SELECT * from lease_standings where order by sort asc, id asc ";
      return connection.queryAsync( sql );
    },

    getLeaseStandingByName(connection, name){
      let sql = "SELECT * from lease_standings where name = " + connection.escape(name) + " order by sort asc, id asc ";
      return connection.queryAsync( sql ).then(r => r.length? r[0]: null);
    },

    getLeaseStandingById(connection, id){
      let sql = "SELECT * from lease_standings where id = " + connection.escape(id) + ' order by sort asc, id asc ';
      console.log("Lease Standing:", sql);
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


    findContactsToNotify(connection, activity_object_id, activity_action_id, company_id){
        if(!activity_action_id || !activity_object_id || !company_id) return [];

        var sql = "select *, " +
            "(select text from admin_notifications where activity_object_id = " + connection.escape(activity_object_id) + " and activity_action_id = " + connection.escape(activity_action_id) + " and contact_id = contacts.id and company_id = " + connection.escape(company_id) + ") as should_text, (select email from admin_notifications where activity_object_id = " + connection.escape(activity_object_id) + " and activity_action_id = " + connection.escape(activity_action_id) + " and contact_id = contacts.id and company_id = " + connection.escape(company_id) + ") as should_email FROM contacts where id in (select contact_id from companies_contact_roles where company_id = " + connection.escape(company_id) + ");"

        console.log(sql);
        return connection.queryAsync( sql );

    },

    savePromoType(connection, data, id){

        var sql;

        if(id){
            sql = "UPDATE promotion_types set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into promotion_types set ?";
        }
        return connection.queryAsync(sql, data);

    },

    getGlobalSettings(connection){
        let sql = "SELECT * from global_settings order by id";
        return connection.queryAsync( sql );
    }
}
