var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

var models = {};
Contact = {

    getStatus(connection, contact_id, properties = []){
        let sql = ` SELECT ${Contact.statusQry('contacts.id', properties, connection)} as status from contacts where id = ${connection.escape(contact_id)} `;  
        
        return connection.queryAsync(sql).then(r => r.length ? r[0].status : null);

    }, 
    statusQry(contact_id, properties = [], connection){

        let sql = `(
            if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 2 and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Pending", 
                if( (select count(id) from leads where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) and contact_id = ${contact_id} and status = 'active') > 0, "Active Lead",
                    if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Delinquent") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Delinquent", 
                        if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Current") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Current",
                            if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Suspended") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Suspended",    
                                if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Gate Lockout") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Gate Lockout",  
                                    if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Active Lien") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Active Lien",    
                                        if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and lease_standing_id = (select id from lease_standings where name = "Auction") and (end_date is null or end_date > CURDATE()) and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Auction", 
                                            if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and end_date < CURDATE() and id in (select lease_id from contact_leases where contact_id = ${contact_id}) and id in ( select lease_id from invoices where status = 1 and subtotal + total_tax - total_discounts > total_payments)) > 0, "Balance Due",   
                                                if( (select count(id) from leases where unit_id in (select id from units where property_id in (${properties.map(p => connection.escape(p)).join(', ')})) and status = 1 and end_date < CURDATE() and id in (select lease_id from contact_leases where contact_id = ${contact_id})) > 0, "Lease Closed", 
                                                    if( (select count(id) from leads where property_id in (${properties.map(p => connection.escape(p)).join(', ')}) and contact_id = ${contact_id} and status = 'retired') > 0, "Retired Lead", 
                                                        ""
                                                    )
                                                )  

                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ) 
        )`; 


        return sql;
    }, 

    getAllContacts(connection, property_id){
        var sql = `SELECT c.id, c.first, c.last, c.email, l.id as lease_id, l.start_date, l.lease_standing_id, u.id as unit_id, u.number, cp.phone FROM units u JOIN leases l ON l.unit_id = u.id JOIN contact_leases cl ON cl.lease_id = l.id JOIN contacts c ON c.id = cl.contact_id LEFT JOIN (SELECT cp.phone, cp.contact_id FROM contact_phones cp WHERE cp.primary = 1) as cp ON cp.contact_id = c.id WHERE cl.primary = 1 AND u.property_id = ${connection.escape(property_id)} AND l.status != 0 AND (l.end_date IS null OR l.end_date  > CURDATE());`;
        console.log("SQL{getAllContacts for sync}", sql);

        return connection.queryAsync( sql );
    },
  

    getRoleProperties(connection, company_contact_role_ids){
        var sql = `SELECT * from contact_roles_properties where company_contact_role_id in ( ${ company_contact_role_ids.map(id => connection.escape(id)).join(',')} );`
        console.log(sql);
        return connection.queryAsync(sql);
    },

    getNonHbRoleProperties(connection, company_contact_role_id){
        var sql = "SELECT * from contact_roles_non_hummingbird_properties where company_contact_role_id = " + connection.escape(company_contact_role_id);
        console.log(sql);
        return connection.queryAsync(sql);
    },

    findAllByName(connection, first, last, company_id, contact_id){
        var sql = "SELECT * from contacts where lower(first) = " +  connection.escape(first.toLowerCase()) + " and lower(last) = " + connection.escape(last.toLowerCase()) + " and company_id = " + connection.escape(company_id);

        if(contact_id){
            sql += " and id != " + connection.escape(contact_id)
        }

        return connection.queryAsync(sql);
    },

    findAddressTypes: function(connection, company_id){
      var addressSql =  "Select DISTINCT(type) as type from contact_locations where contact_id in (select id from contacts where company_id = "  + connection.escape(company_id) + ')';
      return connection.queryAsync( addressSql );
    },

     /**
     * Function used to remove user verification status from contacts table
     * @param {Object} connection Connection data
     * @param {String} id contact id
     * @returns {Object} Returns status
     **/
    revokeEmailVerification(connection, id) {
        if(id) {
            let sql = "UPDATE contacts set ? where id = " + connection.escape(id);
            let data = {
                verification_token: null,
                email_verified: null,
            }
            return connection.queryAsync(sql, data);
        }
    },

    findPhoneTypes: function(connection, company_id){
      var sql =  "Select DISTINCT(type) as type from contact_phones where contact_id in (select id from contacts where company_id = "  + connection.escape(company_id) + ')';
      return connection.queryAsync( sql );
    },

     /**
     * Function used to update email verification status in contact table
     * @param {Object} connection Connection data
     * @param {String} id contact id
     * @param {Object} verificationData User verification data
     * @returns {Object} Returns status
     **/
    updateUserVerificationStatus(connection, id, verificationData){
        let sql = "UPDATE contacts set ? where id = " + connection.escape(id);
        let data = {
            verification_token: verificationData?.emailVerificationToken,
            email_verified: verificationData?.emailVerified,
        }
        return connection.queryAsync(sql, data);
    },

     /**
     * Function used to update phone verification status in contact_phones table
     * @param {Object} connection Connection data
     * @param {String} id contact id
     * @param {Object} verificationData User verification data
     * @returns {Object} Returns status
     **/    
    updatePhoneVerificationStatus(connection, id, verificationData){
        let sql = "UPDATE contact_phones set ? where id = " + connection.escape(id);
        let data = {
            verification_token: verificationData?.phoneVerificationToken,
            phone_verified: verificationData?.phoneVerified,
        }
        return connection.queryAsync(sql, data);
    },
    
    findTenantsByName(connection, first, last, company_id){
        var sql = "SELECT * from contacts where first = " +  connection.escape(first) + " and last = " + connection.escape(last) + " and company_id = " + connection.escape(company_id) + " and id in (select contact_id from contact_leases where lease_id in (select id from leases where status > 0))";
        return connection.queryAsync(sql);
    },

    findMatchedContact(connection, company_id, email, phone, first, last){
        let sql = " select  *, c.id as id from contacts c LEFT JOIN contact_phones cp on c.id = cp.contact_id where company_id = " + connection.escape(company_id);

        if(email){
            sql += ` and c.email = ${connection.escape(email)} `; 
        }

        if(phone){
            sql += ` and (cp.phone = ${connection.escape(phone)} or cp.phone = ${connection.escape('1' + phone)})`; 
        }

        if(first){
            sql += ` and c.first = ${connection.escape(first)} `; 
        }
        if(last){
            sql += ` and c.last = ${connection.escape(last)} `; 
        }
        console.log("sql", sql);
        return connection.queryAsync(sql);

    }, 

    checkExistingEmail(connection, first, last, email, company_id, id){
        let sql = "Select * from contacts where company_id = " + connection.escape(company_id) + " and first = " + connection.escape(first) + ' and last = ' + connection.escape(last) + ' and ' +
          ' ( email is null or email =  ' + connection.escape(email)  + ') ';
        if(id) {
          let sql = 'and id not = ' + id;
        }

      return connection.queryAsync(sql);
    },

    checkExistingPhone(connection, first, last, phone, company_id, id){
      let sql = "Select * from contacts where company_id = " + connection.escape(company_id) + " and  first = " + connection.escape(first) + ' and last = ' + connection.escape(last) + ' and id in ( select contact_id from contact_phones where phone = ' + connection.escape(phone)  + ') ';
      if(id) {
        let sql = 'and id not = ' + id;
      }
    },

    getTouchpoints(connection, contact_id) {
      let sql = "Select * from lead_touchpoints where contact_id = " + connection.escape(contact_id) + ' order by created desc';
      return connection.queryAsync(sql);
    },

    search(connection, conditions = {}, searchParams, company_id, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  " +
                "(select phone from contact_phones where contact_id = contacts.id and `primary` = 1) as phone ";
        }

        sql += " FROM contacts where 1 = 1 " ;
        sql += " and company_id = " + connection.escape(company_id);

        if(conditions.source && conditions.source.length){
            sql += ' and LOWER(source) in (' + conditions.source.map(s => connection.escape(s)).join(', ') + ')';
        }


        if(conditions.name){
            sql += " and (select concat(first, ' ' , last) like " + connection.escape("%" + conditions.name + "%");
        }

        if(conditions.email){
            sql += " and email like " + connection.escape("%" + conditions.email + "%");
        }

        if(searchParams){
            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){
                    case 'name':
                        sql += " last ";
                        break;
                    default:
                        sql += searchParams.sort;

                }
                sql += ' ' + searchParams.sortdir;
            }
            sql += " limit ";
            sql += searchParams.offset;
            sql += ", ";
            sql += searchParams.limit;
        }
        return connection.queryAsync(sql);
    },

    findVehicles:function(connection, contact_id){
        var vehicleSql = "Select * from vehicles where contact_id = " +  connection.escape(contact_id);
        return connection.queryAsync(vehicleSql);
    },


    findToken:function(connection, contact_id, property_id, type){
      var sql = "Select * from contact_tokens where contact_id = " +  connection.escape(contact_id) + " and property_id = " +   connection.escape(property_id) + " and type = " + connection.escape(type);
      return connection.queryAsync(sql).then(r => r ? r[0]: null);

    },

    saveToken(connection, data, token_id){

      var sql;
      if(token_id){
        sql = "UPDATE contact_tokens set ? where id = " + connection.escape(token_id);
      } else {
        sql = "insert into contact_tokens set ? ";
      }

      return connection.queryAsync(sql, data).then(r => token_id ? token_id : r.insertId);
    },

    findPaymentMethods:function(connection, contact_id, property_id, all = false, properties){

        var sql = "Select * from payment_methods where  type in ('card', 'ach') and contact_id = " +  connection.escape(contact_id);

        if (property_id) {
          sql += ' and property_id = ' +  connection.escape(property_id);
        }

        if(properties){
          sql += ' and property_id  in (' +  properties.map(p => connection.escape(p) ).join(',') + ")";
        }


        if(!all) {
          sql += " and active = 1 and deleted is null ";
        }


        return connection.queryAsync(sql);

    },

    saveVehicles(connection, data, vehicles_id){

        var sql;
        if(vehicles_id){
            sql = "UPDATE vehicles set ? where id = " + connection.escape(vehicles_id);
        } else {
            sql = "insert into vehicles set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return vehicles_id || response.insertId;
        });
    },

    findEmployment:function(connection, contact_id){
        var sql = "Select * from contact_employment where contact_id = " +  connection.escape(contact_id);
        return connection.queryAsync(sql);
    },

    saveEmployment(connection, data, contact_employment_id){

        var sql;
        if(contact_employment_id){
            sql = "UPDATE contact_employment set ? where id = " + connection.escape(contact_employment_id);
        } else {
            sql = "insert into contact_employment set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return contact_employment_id || response.insertId;
        });
    },
    getContactBusiness(connection,contact_id){
        var sql = "Select * from contact_businesses where contact_id = " +  connection.escape(contact_id);
        var id;
        return connection.queryAsync( sql ).then(function(res){
            res[0] ? id = res[0].id : id = null
            return id
        });
    },
    getAddressId(connection,contact_business_id){
        var sql = "Select * from contact_businesses where id = " +  connection.escape(contact_business_id);
        var id;
        return connection.queryAsync( sql ).then(function(res){
            res[0] ? id = res[0].address_id : id = null
            return id
        });
    },
    addBusinessContact(connection,data,contact_business_id){
        var sql;
        if(contact_business_id){
            sql = "UPDATE contact_businesses set ? where id = " + connection.escape(contact_business_id);
        }
        else{
            sql = "insert into contact_businesses set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return contact_business_id || response.insertId
        });
    },
    addMilitaryContact(connection,data,contact_id){
        var sql;
        if(contact_id){
            sql = "UPDATE contact_military set ? where contact_id = " + connection.escape(contact_id);
        }
        else{
            sql = "insert into contact_military set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return contact_id || response.insertId
        });
    },
    getMilitaryContact(connection,contact_id){
        let sql = "Select * from contact_military where contact_id = " +  connection.escape(contact_id);
        return connection.queryAsync( sql ).then(function(res){
            return res[0] || null
        });
    },
    findAdminByEmail(connection, email, company_id){
        var sql = "Select * from contacts where company_id is null and email = " +  connection.escape(email);

        if(company_id){
            sql += ' and id in (select contact_id from companies_contact_roles where company_id = ' + connection.escape(company_id) + ' )'
        }
        console.log("sqlsqlsql", sql);
        return connection.queryAsync(sql).then(c => (c.length) ? c[0]: null );
    },

    omniSearch: function(connection, params = {}, company_id, properties = []){
      params.offset =  params.offset || 0;
      params.limit =  params.limit || 20;
      if(!params.search) return [];

      let sql = omniSearchQuery(connection, params, company_id, properties);
      sql += " limit " + params.offset + ', ' + params.limit;
      
      return connection.queryAsync(sql);
    },

    omniSearchCount: async function(connection, params = {}, company_id, properties = []){

      if(!params.search) return [];

      let sql = "SELECT COUNT(*) AS result_count FROM ( ";
      sql+= omniSearchQuery(connection, params, company_id, properties);
      sql += " ) result_table";

      r = await connection.queryAsync(sql)
      return r[0].result_count || r.result_count
    },


    getPending(connection, contact_id, company_id, properties = []){


      let sql = "Select * from leases where id in ( select lease_id from contact_leases where contact_id = " + connection.escape( contact_id ) + ")";

      sql += " and id in (select id from leases where status = 2 ) ";
      if(properties.length){
        sql += " and unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ') + " ))  ";
      } else {
        sql += ' and unit_id in (select id from units where property_id in (select id from properties where company_id  = ' + connection.escape( company_id ) + " )) ";
      }

      return connection.queryAsync(sql);

    },

    searchWithActiveLease(connection, params, company_id, properties = []){
      if(!params.search) return [];
      params.offset =  params.offset || 0;
      params.limit =  params.limit || 20;
      
      let sql = activeLeaseSearchQuery(connection, params, company_id, properties);
      sql += " limit " + params.offset + ', ' + params.limit;

      return connection.queryAsync(sql);

    },
    searchWithActiveLeaseCount: async function(connection, params, company_id, properties = []){
      if(!params.search) return [];
        
        let sql = "Select COUNT(*) AS result_count from ( ";
        sql += activeLeaseSearchQuery(connection, params, company_id, properties);
        sql += " ) as result_table"

        let r = await connection.queryAsync(sql);
        return r[0].result_count || r.result_count;
      },
    searchWithAnyLease(connection, params, company_id, properties){

      let sql = "Select * from contact_leases where lease_id in ( select id from leases where status = 1 or ( status = 0 and id in (select lease_id from reservations ))) and contact_id in ( select id from contacts where first like " + connection.escape( '%' + params.search + '%' )+ " or last like " + connection.escape( '%' + params.search + '%' ) + ")  " ;
      sql += ' and  (select company_id from contacts where id = contact_id ) = ' + connection.escape( company_id )

      sql += " limit " + params.offset + ', ' + params.limit;

      return connection.queryAsync(sql);

    },

    // searchWithActiveLease(connection, params, company_id, properties){
    //
    //   let sql = "Select * from contact_leases where lease_id in ( select id from leases where status > 0 or ( status = 0 and id in (select lease_id from reservations where expires > now() ))) and contact_id in ( select id from contacts where first like " + connection.escape( '%' + params.search + '%' )+ " or last like " + connection.escape( '%' + params.search + '%' ) + ")  " ;
    //   sql += ' and  (select company_id from contacts where id = contact_id ) = ' + connection.escape( company_id )
    //
    //   sql += " limit " + params.offset + ', ' + params.limit;
    //
    //   return connection.queryAsync(sql);
    //
    // },

    findByLeaseId:function(connection, lease_id){
        var leaseUserSql = "Select *, " +
	        "(select sort from contact_leases where contact_id = contacts.id and lease_id = " +  connection.escape(lease_id) + ") as sort from contacts where id in (select contact_id from contact_leases where lease_id = " +  connection.escape(lease_id) + ") order by sort ASC, id ASC";
        return connection.queryAsync(leaseUserSql);
    },

    findByUserId:function(connection, user_id){
        var sql = "Select * from contacts where user_id = " +  connection.escape(user_id);

        return connection.queryAsync(sql).then(function(sqlRes) {
            return (sqlRes.length) ? sqlRes[0]:null;
        });
    },

    findById:function(connection, contact_id, company_id){

        var sql = "Select * from contacts where id = " +  connection.escape(contact_id);

        return connection.queryAsync(sql).then(function(sqlRes) {
            return (sqlRes.length) ? sqlRes[0]: null;
        });

    },

    findAllByEmail:function(connection, email, company_id, existing_contact_id){
        var sql = "Select * from contacts where 1 = 1 ";

        // New admins search should have unique address application wide
        if(company_id) {
            sql += "and (company_id is null or company_id = " + connection.escape(company_id) + ") "
        }

        sql += " and lower(email) = " +  connection.escape(email.toLowerCase());

        if(existing_contact_id) {
            sql += " and id != " + connection.escape(existing_contact_id)
        }

        return connection.queryAsync(sql);

    },

    findAllByEmailWithProperty:function(connection, email, company_id, property_id){
        var sql = `
            Select
                distinct c.*
            FROM contacts c
            JOIN contact_leases cl
                ON c.id = cl.contact_id
            JOIN leases l
                ON cl.lease_id = l.id
            JOIN units u
                ON l.unit_id = u.id
            JOIN properties p
                ON u.property_id = p.id
            where 1 = 1
        `;

        if(company_id) {
            sql += " and (c.company_id is null or c.company_id = " + connection.escape(company_id) + ") "
        }

        sql += " and lower(c.email) = " +  connection.escape(email.toLowerCase());

        if(property_id) sql += ' and p.id = ' + connection.escape( property_id )

        console.log("findAllByEmailWithProperty: ", sql);
        return connection.queryAsync(sql);
    },

    findTenantByEmail:function(connection, email, company_id, existing_contact_id){

        var sql = "Select * from contacts where id in (select contact_id from contact_leases) and company_id = " + connection.escape(company_id) + " and email = " +  connection.escape(email);


        if(existing_contact_id) {
            sql += " and id != " + connection.escape(existing_contact_id)
        }

        return connection.queryAsync(sql).then(r => r.length? r[0]:null);

    },

    verifyUniqueTenantOnLease: function(connection, contact_id, lease_id){

        var sql = "Select * from contact_leases where contact_id = " + connection.escape(contact_id) + " and lease_id = " + connection.escape(lease_id);

        return connection.queryAsync(sql);
    },

    findPhones:function(connection, contact_id, contain){
        var phonesSql = "Select * from contact_phones where contact_id = " +  connection.escape(contact_id);
        return connection.queryAsync(phonesSql);
    },


    // todo, we should always have a company_id
    findByPhone: function(connection, phone, company_id){
        var phonesSql = "Select * from contacts " +
            " where id in (select contact_id from contact_phones where phone = " +  connection.escape(phone) + ')';
        if(company_id) phonesSql += 'and company_id = ' + connection.escape( company_id )
        return connection.queryAsync(phonesSql);
    },

    findByPhoneWithPropertyId: function(connection, phone, company_id, property_id){
        var phonesSql = `
            Select
                distinct c.*
            FROM contacts c
            JOIN contact_leases cl
                ON c.id = cl.contact_id
            JOIN leases l
                ON cl.lease_id = l.id
            JOIN units u
                ON l.unit_id = u.id
            JOIN properties p
                ON u.property_id = p.id
            JOIN contact_phones cp
                ON c.id = cp.contact_id
            WHERE 1=1
        `

        phonesSql += ' and cp.phone = ' + connection.escape(phone)
        if(company_id) phonesSql += ' and c.company_id = ' + connection.escape( company_id )
        if(property_id) phonesSql += ' and p.id = ' + connection.escape( property_id )

        console.log('findByPhoneWithPropertyId: ', phonesSql);
        return connection.queryAsync(phonesSql);
    },

    getMultipleById(connection, contacts, properties = [], company_id){

      var sql = "Select * from contacts where id in ( " + contacts.map(c => connection.escape(c)).join(',') +  " ) ";

      sql += "and  company_id = " + connection.escape(company_id);

      return connection.queryAsync( sql );
    },

    verifyBulk(connection, contacts, company_id){

      var sql = "Select count(*) as count from contacts where id in ( " + contacts.map(c => connection.escape(c)).join(',') +  " ) and company_id = " + connection.escape(company_id);
      return connection.queryAsync( sql ).then(c => contacts.length == c[0].count);
    },

    findPhoneById:function(connection, phone_id ){

        var phonesSql = "Select * from contact_phones where id = " +  connection.escape(phone_id);
        return connection.queryAsync(phonesSql).then(phone => phone.length?phone[0]:null )

    },

     /**
     * Function used to find phone details from contact_phones table
     * @param {Object} connection Connection data
     * @param {String} id Phone id 
     * @returns {Object} Returns status
     **/
    findPhone:function(connection, id ){
        if(!id) return;
        
        var phonesSql = "Select * from contact_phones where id = " +  connection.escape(id);
        return connection.queryAsync(phonesSql);
    },


    savePhone: function(connection, data, phone_id){
        var sql;

        if(phone_id){
            sql = "UPDATE contact_phones set ? where id = " + connection.escape(phone_id);
        } else {
            sql = "INSERT into contact_phones set ?";
        }


        return connection.queryAsync(sql, data);
    },

    updatePrimaryContactPhones: async function(connection, contact_phone_id) {
        let sql = `update contact_phones as cp set cp.primary = 1 where cp.id = ${connection.escape(contact_phone_id)}`
        return connection.queryAsync(sql);
    },

    updatePrimaryContactLocations: async function(connection, contact_id) {
        let sql = "select * from contact_locations where contact_id = " + connection.escape(contact_id) + " and `primary` = 1"
        let primaryContactLocationExists = await connection.queryAsync(sql).then(contact_location => contact_location.length > 0 ? true : false);

        if(!primaryContactLocationExists) {
            // default case
            let contact_loc_sql = `SELECT MIN(id) as id FROM contact_locations where contact_id = ${connection.escape(contact_id)};`;

            console.log("updatePrimaryContactLocations - contact_loc_sql:", contact_loc_sql);

            let contact_loc_id = await connection.queryAsync(contact_loc_sql).then(res => res?.length && res[0].id);

            sql = `update contact_locations set \`primary\` = 1 where id in (${connection.escape(contact_loc_id)});`

            console.log("updatePrimaryContactLocations - update_sql:", sql);
            return connection.queryAsync(sql);
        }
    },

    findLocations: function(connection, contact_id){

        // var addressSql =  "Select address, city,state,zip,neighborhood,country,lat,lng, (select type from contact_locations where contact_locations.address_id = addresses.id) as type, (select id from contact_locations where contact_locations.address_id = addresses.id) as id  from addresses where id in (select address_id from contact_locations where contact_id = " + connection.escape(contact_id) + " )";

        var addressSql =  "Select * from contact_locations where contact_id = " + connection.escape(contact_id) + " ORDER BY `primary` DESC";

        return connection.queryAsync( addressSql )
    },

    saveLocation: function(connection, data, location_id){
        var sql;
        if(location_id){
            sql = "UPDATE contact_locations set ? where id = " + connection.escape(location_id);
        } else {
            sql = "INSERT into contact_locations set ?";
        }
        return connection.queryAsync(sql, data);
    },

    removePhones: function(connection, contact_id, phone_string){

        return Promise.resolve().then(() => {

            var sql = "DELETE from contact_phones where ";

            if(phone_string && phone_string.length){

                sql += " id not in (" + phone_string + ") and ";
            }

            sql += " contact_id = " +  connection.escape(contact_id);

            return connection.queryAsync(sql);
        })
    },

    removePhonesByIds: function(connection, ids){
        let sql = ` DELETE from contact_phones where id in (${ids.map(id => connection.escape(id) ).join(',')})`;

        return connection.queryAsync(sql);
    },

    removeLocations: function(connection, contact_id, address_string){
        return Promise.resolve().then(() => {

            var sql = "delete from contact_locations where ";

            if(address_string && address_string.length){

                sql += "id not in (" + address_string + ") and ";
            }

            sql += " contact_id = " +  connection.escape(contact_id);

            return connection.queryAsync(sql);
        });
    },

    removeRelationships: function(connection, contact_id, contact_relationship_string){
        var sql = "DELETE from contact_relationships where ";

        if(contact_relationship_string && contact_relationship_string.length) {
            sql += " id not in (" + contact_relationship_string + ") and ";
        }
        sql += " contact_id = " +  connection.escape(contact_id);
    
        return connection.queryAsync(sql);
    },

    removeEmployment: function(connection, contact_id, employment_string){
        return Promise.resolve().then(() => {

            var sql = "DELETE from contact_employment where ";
            if(employment_string && employment_string.length){
                sql += " id not in (" + employment_string + ") and ";
            }

            sql += " contact_id = " +  connection.escape(contact_id);

            return connection.queryAsync(sql);
        });
    },

    removeVehicles: function(connection, contact_id, vehicle_string){
        return Promise.resolve().then(() => {

            var sql = "DELETE from vehicles where ";

            if(vehicle_string && vehicle_string.length) {
                sql += " id not in (" + vehicle_string + ") and ";
            }
            sql += " contact_id = " +  connection.escape(contact_id);

            return connection.queryAsync(sql);
        });
    },


    saveRelationship: function(connection, data, contact_relationship_id){
        var sql;

        if(contact_relationship_id){
            sql = "UPDATE contact_relationships set ? where id = " + connection.escape(contact_relationship_id);
        } else {
            sql = "INSERT into contact_relationships set ?";
        }

        return connection.queryAsync(sql, data);
    },

    findAlternate: function(connection, contact_id,lease_id, excluded_ids_string){

        let sql = "select * from contact_relationships where contact_id = " + connection.escape(contact_id);

        if(lease_id){
            sql += " and lease_id is null or lease_id = " + connection.escape(lease_id);
        }

        if(excluded_ids_string) {
            sql += " and id not in (" + excluded_ids_string + ")" 
        }

        return connection.queryAsync(sql);

    },

    findCompanyList: function(connection, contact_id, subdomain){
        var companiesSql = "Select * from companies where id in (select distinct(company_id) from companies_contact_roles where contact_id = " + connection.escape(contact_id) + ")";

        return connection.queryAsync(companiesSql)
    },

    getUserRole(connection, contact_id, company_id){

        var rolesSql = ` Select *, 
             (select name from roles where id = companies_contact_roles.role_id) as name, 
             (select type from roles where id = companies_contact_roles.role_id) as type,
             (select is_active from roles where id = companies_contact_roles.role_id) as is_active    
             from 
                companies_contact_roles 
             where  
                contact_id = ${connection.escape(contact_id)} and 
                company_id  = ${connection.escape(company_id)}`;

        console.log("rolesSql", company_id,  rolesSql);

        return connection.queryAsync(rolesSql); //.then(a => a.length ? a[0] : null );
    },

    saveContactRole(connection, data, company_contact_role_id){
        var sql = "";
        if(company_contact_role_id){
          sql = "UPDATE companies_contact_roles set ? where id = " + connection.escape(company_contact_role_id);
        } else {
          sql = "INSERT into companies_contact_roles set ? ";
        }
        console.log("ROLE DATA", connection.format(sql, data));
        return connection.queryAsync(sql, data);


    },

    removeAllRoles(connection, contact_id, company_id){

        var rolesSql = "DELETE from companies_contact_roles where contact_id = " + connection.escape(contact_id) + " and company_id  = " + connection.escape(company_id);
        return connection.queryAsync(rolesSql);
    },

    findAdminsByCompanyId(connection, company_id){
        var sql = `SELECT 
                    DISTINCT(ccr.contact_id) as contact_id,
                    c.email as email,
                    c.first as first,
                    c.last as last,
                    ccr.status as status
                    FROM companies_contact_roles ccr
                    JOIN contacts c on c.id = ccr.contact_id
                    LEFT JOIN users u on u.id = c.user_id
                    WHERE ccr.company_id = ${connection.escape(company_id)} 
                    and (c.user_id is null or u.gds_application_id is null)
                    order by ccr.status desc, concat(c.first, ' ' , c.last)
                `;
        return connection.queryAsync(sql);
    },

    findActiveAdminsByCompanyId(connection, company_id){
        var sql = `
            SELECT
                DISTINCT(ccr.contact_id) AS contact_id,
                c.email AS email,
                c.first AS first,
                c.last AS last,
                ccr.status AS status
            FROM companies_contact_roles ccr
            JOIN contacts c
                ON c.id = ccr.contact_id
            LEFT JOIN users u
                ON u.id = c.user_id
            WHERE ccr.company_id = ${connection.escape(company_id)}
                AND (c.user_id IS NULL OR u.gds_application_id IS NULL)
                AND c.status = 'active' AND ccr.status = 1
            ORDER BY ccr.status DESC, concat(c.first, ' ' , c.last)
        `;

        console.log("findActiveAdminsByCompanyId: ", sql);
        return connection.queryAsync(sql);
    },

    findAdminsByPropertyId(connection, company_id, property_id){


      var companyUserSql = "Select distinct(contact_id) as contact_id, " +
        "(select email from contacts where id = companies_contact_roles.contact_id limit 1) as email, " +
        "(select first from contacts where id = companies_contact_roles.contact_id limit 1) as first, " +
        "(select last from contacts where id = companies_contact_roles.contact_id limit 1) as last " +
        " from companies_contact_roles where status = 1 and company_id = " +  connection.escape(company_id) +
        " and id in (select company_contact_role_id from contact_roles_properties where property_id = " +  connection.escape(property_id) + ")";

      return connection.queryAsync(companyUserSql);

    },

    save: function(connection, data, contact_id){
        var sql;

        if(contact_id){
            sql = "UPDATE contacts set ? where id = " + connection.escape(contact_id);
        } else {
            sql = "INSERT into contacts set ?";
        }

        return connection.queryAsync(sql, data);
    },

	saveOrder(connection, sort, contact_id, lease_id){
		var sql = "UPDATE contact_leases set sort = " + connection.escape(sort) + " where lease_id = " + connection.escape(lease_id) + " and contact_id = " + connection.escape(contact_id);

		return connection.queryAsync(sql);
	},

    delete: function(connection, contact_id){
        var sql = "delete from contacts where id = "+connection.escape(contact_id);
        return connection.queryAsync(sql);
    },

    getAllRoles(connection){
        var sql = "Select * from roles";
        return connection.queryAsync(sql);
    },

    async getHummingbirdDemoContact(connection){
        var sql= '';
        if(settings.is_prod) {
            const hb_demo_contact_id = '7614';
            sql = "select * from contacts where id = " + connection.escape(hb_demo_contact_id);
        } else {
            const first = "Hummingbird";
            const last = "Demo";
            sql = "Select * from contacts where first = "+connection.escape(first)+" and last = "+connection.escape(last);
        }

        return await connection.queryAsync(sql);
    },    

    findAccessCredentials(connection, contact_id, property_id, access_id){

        var sql = "select * from contacts_credentials where contact_id = " + connection.escape(contact_id);
        if(property_id){
            sql += " and property_id = " + connection.escape(property_id);
        }

        if(access_id){
            sql += " and access_id = " + connection.escape(access_id);
        }

        console.log(sql);

        return connection.queryAsync(sql);

    },

    findAccessCredentialsByCode(connection, gate_code, property_id){

        var sql = "select * from contacts_credentials where pin = " + connection.escape(gate_code) + " and property_id = " + connection.escape(property_id);

        return connection.queryAsync(sql).then(r => r.length? r[0]: null)

    },

    findAccessCredentialsById(connection, contacts_credentials_id){

        var sql = "select * from contacts_credentials where id = " + connection.escape(contacts_credentials_id);
        return connection.queryAsync(sql).then(r => r.length? r[0]: null)
    },

    saveAccessCredentials: function(connection, data, credentials_id){
        var sql;
        if(credentials_id){
            sql = "UPDATE contacts_credentials set ? where id = " + connection.escape(credentials_id);
        } else {
            sql = "INSERT into contacts_credentials set ?";
        }
        return connection.queryAsync(sql, data);
    },

    deleteAccessCredentials: function(connection, credentials_id){
        var sql = "DELETE FROM contacts_credentials where id = " + connection.escape(credentials_id);
        return connection.queryAsync(sql);
    },

    isTenant(connection, contact_id, company_id){
        var sql = "Select * from contacts where id = " + connection.escape(contact_id);

        return connection.queryAsync(sql).then(r => {
            if(!r.length) return false;
            var contact = r[0];
            return contact.company_id === company_id;

        });
    },

    isOnLease(connection, lease_id, contact_id){
      var sql = "select * from contact_leases where lease_id =  " + connection.escape(lease_id) + " and contact_id = " + connection.escape(contact_id) + " or contact_id in (select contact_id from contact_relationships where related_contact_id = " + connection.escape(contact_id) + ")";
      return connection.queryAsync(sql);
    },


    findPermissions(connection, contact_id, company_id){
        var sql = `select * from permissions where id in (select permission_id from roles_permissions where role_id in (select role_id from companies_contact_roles where contact_id = ${connection.escape(contact_id)} and company_id = ${connection.escape(company_id)} limit 1))`;
        return connection.queryAsync(sql);
    },

    findActiveLeaseById:function(connection, contact_id){
        var sql = "Select * from leases where id in " +
                " (select lease_id from contact_leases where contact_id = " +  connection.escape(contact_id) + ")" +
                " and ( start_date < now() and (end_date > now() or end_date is null) ) and status = 1 ";
        return connection.queryAsync(sql);
    },

    findVacatedLeaseById:function(connection, contact_id){
        var sql = "Select * from leases where id in " +
                " (select lease_id from contact_leases where contact_id =" +  connection.escape(contact_id) + ") " +
                " and ( end_date < now() or moved_out < now() ) and status = 1 ";
        return connection.queryAsync(sql);
    },

    findRelationshipById:function(connection, contact_id){
        var sql = "Select * from contact_relationships where related_contact_id =" + connection.escape(contact_id);
        return connection.queryAsync(sql);
    },

    pinInteraction(connection, contact_id, interaction_id){
      var sql = "update interactions set pinned = 1, `read` = 1 where contact_id = " +  connection.escape(contact_id) + " and id = " + connection.escape(interaction_id);

      return connection.queryAsync(sql);
    },

    unpinInteraction(connection, contact_id, interaction_id){
      var sql = "update interactions set pinned = 0 where contact_id = " + connection.escape(contact_id) + " and id = " + connection.escape(interaction_id);
      return connection.queryAsync(sql);
    },

    getInteractionIds(connection, contact_id){
        var sql = "select id from interactions where contact_id = " + connection.escape(contact_id);
        return connection.queryAsync(sql);
      },

    updateContact(connection, contact_id, data){
        var sql = "update contacts set ? where id = " + connection.escape(contact_id);
        return connection.queryAsync(sql,data);
    },

    updateContactStatus(connection, contact_id, status){
      var sql = "update contacts set status = " + connection.escape(status)  +" where id = " + connection.escape(contact_id);
      return connection.queryAsync(sql);

    },

    searchWithDelinquentLeases(connection, company_id, properties = []){
        var sql = `SELECT *, (SELECT SUM(subtotal + total_tax - total_discounts - total_payments) from invoices where due < CURDATE() and lease_id = contact_leases.lease_id and status = 1  ) as total_due
                    from contact_leases where 
                    lease_id in (select id from leases where status = 1 and start_date  <= CURDATE() and (end_date is null or end_date > CURDATE())
                    ${properties.length ? `and unit_id in (select id from units where property_id  in (${properties.map(p => connection.escape(p) ).join(',')}))` : ``})
                    and contact_id in (select id from contacts where company_id = ${company_id}) HAVING total_due > 0`
        return connection.queryAsync(sql);
    },

    async findBusinessInfo(connection, contact_id){
        let sql = `SELECT * from contact_businesses where contact_id = ${connection.escape(contact_id)}`;
        console.log(sql);
        var business_info = await connection.queryAsync(sql);
        return business_info && business_info.length > 0? business_info[0]: null;
    },

    async findMilitaryInfo(connection, contact_id){
        let sql = `SELECT * from contact_military where contact_id = ${connection.escape(contact_id)}`;
        console.log(sql);
        var military_info = await connection.queryAsync(sql);
        return military_info && military_info.length > 0? military_info[0]: null;
    },

    async getProperties(connection, contact_id, company_id) {
        let sql = `SELECT gds_id FROM 
            properties WHERE id in 
            (SELECT property_id FROM 
                contact_roles_properties 
                WHERE company_contact_role_id in 
                (SELECT id FROM companies_contact_roles 
                    WHERE contact_id = ${contact_id} 
                    AND company_id = ${company_id}
                )
            );`;
        return connection.queryAsync(sql);
    },

    async getNonHbProperties(connection, contact_id, company_id) {
        let sql = `SELECT gds_id FROM 
            non_hummingbird_properties WHERE id in 
            (SELECT property_id FROM 
                contact_roles_non_hummingbird_properties 
                WHERE company_contact_role_id in 
                (SELECT id FROM companies_contact_roles 
                    WHERE contact_id = ${contact_id} 
                    AND company_id = ${company_id}
                )
            );`;
        return connection.queryAsync(sql);
    },

    async getBalance(connection, payload) {
        const { contact_id, date = null } = payload; 
        const sql =`
            SELECT 
            IFNULL((inv.inv_sum - inv.beakdown_sum),
                    0) AS balance
            FROM (
                SELECT (
                    SELECT SUM(i.subtotal + i.total_tax - i.total_discounts)
                    FROM invoices i
                    JOIN leases l ON l.id = i.lease_id
                    WHERE l.end_date IS NULL
                    AND i.void_date IS NULL
                    AND i.due <= IFNULL(${connection.escape(date)}, CURDATE())
                    AND i.contact_id = ${connection.escape(contact_id)}
                ) as inv_sum,
                (
                    SELECT SUM(ipb.amount)
                    FROM invoices i
                    JOIN leases l ON l.id = i.lease_id
                    JOIN invoices_payments_breakdown ipb ON ipb.invoice_id = i.id
                    WHERE l.end_date IS NULL
                    AND i.void_date IS NULL
                    AND i.due <= IFNULL(${connection.escape(date)}, CURDATE())
                    AND i.contact_id = ${connection.escape(contact_id)}
                ) as beakdown_sum
            ) inv
        `;

        console.log("getBalance :", sql);
        const contactBalance = await connection.queryAsync(sql);
        return contactBalance[0].balance;
    },

    saveMilitaryInfo(connection, military_info, military_info_id){
        let sql = ``;
        if(military_info_id){
            sql = "UPDATE contact_military set ? where id = " + connection.escape(military_info_id);
        } else {
            sql = "INSERT into contact_military set ?";
        }
        console.log("saveMilitaryInfo", connection.format(sql, military_info));
        return connection.queryAsync(sql, military_info).then(r => military_info_id ? military_info_id : r.insertId);
    },

    saveBusinessInfo(connection, business_info, business_info_id){
        let sql = ``;
        if(business_info_id){
            sql = "UPDATE contact_businesses set ? where id = " + connection.escape(business_info_id);
        } else {
            sql = "INSERT into contact_businesses set ?";
        }
        return connection.queryAsync(sql, business_info);
    },

    findOpenInvoices(connection, contact_id, property_id){

        var sql = `select * from invoices where status > 0`;

        if(contact_id){
            sql += ` and lease_id in (select lease_id from contact_leases where contact_id = ${connection.escape(contact_id)})`;
        }

        if(property_id){
            sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))`;
        }

        sql += ` and ( select 
                        ROUND(SUM((qty * cost) - 
                        IFNULL((select sum(amount) from discount_line_items where invoice_line_id = invoice_lines.id), 0) + 
                        (((qty * cost) - IFNULL((SELECT SUM(amount) from discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * 
                            IFNULL((SELECT SUM(taxrate) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) /100, 0))), 2) 
                        from invoice_lines where invoice_id = invoices.id
                    ) > ( SELECT ROUND(IFNULL(SUM(amount),0), 2) FROM invoices_payments WHERE invoice_id = invoices.id)
                order by date asc`

        return connection.queryAsync(sql);
    },

    async findAllRelationship(connection, contact_ids) {

        let sql = 	`SELECT
                        cr.*,
                        (SELECT IFNULL(JSON_OBJECT(
                        'id', c.id,
                        'salutation', c.salutation,
                        'first', c.first,
                        'middle', c.middle,
                        'last', c.last,
                        'suffix', c.suffix,
                        'email', c.email,
                        'company', c.company,
                        'dob', c.dob,
                        'ssn', c.ssn,
                        'gender', c.gender,
                        'driver_license', c.driver_license,
                        'source', c.source,
                        'Phones',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'id', cp.id,
                                            'type', cp.type,
                                            'phone', cp.phone,
                                            'sms', cp.sms
                                        )
                                    )
                                FROM
                                    contact_phones cp
                                WHERE
                                    cp.contact_id = cr.related_contact_id
                                ),
                                JSON_ARRAY()
                            ),
                        'Addresses',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id',cl2.id,
                                        'type', cl2.type,
                                        'Address',
                                        (
                                            SELECT
                                                JSON_OBJECT(
                                                'id', a.id,
                                                'address', a.address,
                                                'address2', a.address2,
                                                'city', a.city, 'state', a.state,
                                                'neighborhood', a.neighborhood,
                                                'zip', a.zip,
                                                'country', a.country,
                                                'lat', a.lat,
                                                'lng', a.lng,
                                                'formatted_address', a.formatted_address,
                                                'region', a.region,
                                                'district', a.district
                                                )
                                            FROM
                                                addresses a
                                            WHERE
                                                cl2.address_id = a.id
                                        )
                                    )
                                )
                                FROM
                                    contact_locations cl2
                                WHERE
                                    cl2.contact_id = cr.related_contact_id
                                ),
                                JSON_ARRAY()
                            )
                        ),JSON_OBJECT()))AS Contact
                    FROM
                        contact_relationships cr
                        JOIN contacts c ON c.id = cr.related_contact_id
                    WHERE
                        cr.contact_id IN ( ${connection.escape(contact_ids)})`

        return connection.queryAsync(sql).then(r =>  r.length? r : []);
    },

    insertInContactHistoryTable: async function(connection, secondary_contact_id) {

        let columns_to_copy_sql = Sql.getColumnNames('contacts');
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("insertInContactHistoryTable columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts_history (${columns_to_copy})
            SELECT ${columns_to_copy}
            FROM contacts
            WHERE id = ${connection.escape(secondary_contact_id)}
        `
        console.log('1 - insertInContactHistoryTable - SQL => ' + sql)
        return connection.queryAsync(sql)       

    },

    linkContactLeases: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('contact_leases', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactLeases columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_leases_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_leases
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('2a - linkContactLeases - SQL => ' + sql)
        await connection.queryAsync(sql)               

        let contact_leases_sql = `WITH contact_leases_records AS(
                                    SELECT cl.id 
                                    FROM contact_leases cl
                                    WHERE cl.contact_id IN (${connection.escape(secondary_contact_id)}))
                                    UPDATE contact_leases SET contact_id = ${primary_contact_id}
                                    WHERE id IN (SELECT id from contact_leases_records)`;					

        console.log('2b - linkContactLeases - SQL => ' + contact_leases_sql)
        return connection.queryAsync(contact_leases_sql);
    },

    linkContactInvoices: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('invoices', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactInvoices columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO invoices_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM invoices
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('3a - linkContactInvoices - SQL => ' + sql)
        await connection.queryAsync(sql)               
    
        let invoices_sql = `WITH contact_invoices AS (
                                SELECT i.id FROM invoices i 
                                WHERE i.contact_id IN (${connection.escape(secondary_contact_id)}))
                            UPDATE invoices SET contact_id = ${primary_contact_id}
                            WHERE id IN (SELECT id from contact_invoices)`;        

        console.log('3b - linkContactInvoices - SQL => ' + invoices_sql)
        return connection.queryAsync(invoices_sql);        
    },

    linkContactLeads: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('leads', ['contact_id', 'created_by', 'modified_by']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactLeads columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO leads_history (${columns_to_copy}, contact_id, created_by, modified_by)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}
            FROM leads
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('4a - linkContactLeads - SQL => ' + sql)
        await connection.queryAsync(sql)               


        let leads_sql = `WITH leads_contact AS (
                            SELECT l.id from leads l
                            WHERE l.contact_id IN (${connection.escape(secondary_contact_id)}))
                         UPDATE leads SET contact_id =  ${primary_contact_id}
                         WHERE id IN (SELECT id FROM leads_contact)`;
        
        console.log('4b - linkContactLeads - SQL => ' + leads_sql)
        return connection.queryAsync(leads_sql);        

    },    

    linkInvoicePayments: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('payments', ['contact_id', 'accepted_by']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkInvoicePayments columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO payments_history (${columns_to_copy}, contact_id, accepted_by)
            WITH invoice_payments_cte AS (
                SELECT p.id from invoices i
                 INNER JOIN invoices_payments ip ON ip.invoice_id = i.id
                 INNER JOIN payments p ON p.id = ip.payment_id
                WHERE i.contact_id IN (${connection.escape(secondary_contact_id)})
            )
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}
            FROM payments
            WHERE id IN (SELECT id from invoice_payments_cte)
        `
        console.log('5a - linkInvoicePayments - SQL => ' + sql)
        await connection.queryAsync(sql)               


        let invoice_sql = `WITH invoice_payments AS (
                             SELECT p.id from invoices i 
							  INNER JOIN invoices_payments ip ON ip.invoice_id = i.id
						      INNER JOIN payments p ON p.id = ip.payment_id
                             WHERE i.contact_id IN (${connection.escape(secondary_contact_id)}))
                            UPDATE payments SET contact_id =  ${primary_contact_id}
                            WHERE id IN (SELECT id FROM invoice_payments)`;

        console.log('5b - linkInvoicePayments - SQL => ' + invoice_sql)                   
        return connection.queryAsync(invoice_sql);        

    },

    linkContactPayments(connection, payload) {

        const { primary_contact_id, secondary_contact_id} = payload;

        let sql = "UPDATE payments SET contact_id = " + connection.escape(primary_contact_id) + " WHERE contact_id = " + connection.escape(secondary_contact_id);
        console.log('6 - linkContactPayments - SQL => ' + sql)
        return connection.queryAsync(sql);        
    
    },    

    linkContactPaymentMethods: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('payment_methods', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactPaymentMethods columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO payment_methods_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM payment_methods
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('7a - linkContactPaymentMethods - SQL => ' + sql)
        await connection.queryAsync(sql)               

        let payment_methods_sql = `WITH payment_method_records AS(
                                        SELECT id FROM payment_methods pm
                                        WHERE pm.contact_id IN (${connection.escape(secondary_contact_id)}))
                                    UPDATE payment_methods SET contact_id =  ${primary_contact_id}
                                    WHERE id IN (SELECT id FROM payment_method_records)`; 

        console.log('7b - linkContactPaymentMethods - SQL => ' + payment_methods_sql)    
        return connection.queryAsync(payment_methods_sql);    

    },

    linkContactInteractions: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('interactions', ['contact_id', 'primary_contact_id', 'entered_by']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactInteractions columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO interactions_history (${columns_to_copy}, contact_id, primary_contact_id, entered_by)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}
            FROM interactions
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
                OR primary_contact_id = ${connection.escape(secondary_contact_id)}
                OR entered_by = ${connection.escape(secondary_contact_id)}
        `
        console.log('7-A - linkContactInteractions - SQL => ' + sql)
        await connection.queryAsync(sql)               


        sql = "UPDATE `interactions` i SET i.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE i.`contact_id` IN(" + connection.escape(secondary_contact_id) + ")";
        console.log('7-B - linkContactInteractions - SQL => ' + sql)
        
        await connection.queryAsync(sql);

        sql = "UPDATE `interactions` i SET i.`primary_contact_id` = " + connection.escape(primary_contact_id) + " WHERE i.`primary_contact_id` IN(" + connection.escape(secondary_contact_id) + ")";
        console.log('7-C - linkContactInteractions - SQL => ' + sql)          
        
        await connection.queryAsync(sql);

        sql = "UPDATE `interactions` i SET i.`entered_by` = " + connection.escape(primary_contact_id) + " WHERE i.`entered_by` IN(" + connection.escape(secondary_contact_id) + ")";
        console.log('7-D - linkContactInteractions - SQL => ' + sql)

        return await connection.queryAsync(sql);
    },

    linkContactActivity: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('activity', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactActivity columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO activity_history (${columns_to_copy}, contact_id )
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)} 
            FROM activity
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('8-A - linkContactActivity - SQL => ' + sql)
        await connection.queryAsync(sql)           

        sql = "UPDATE activity a SET a.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE a.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('8-B - linkContactActivity - SQL => ' + sql)
        return connection.queryAsync(sql);
    },

    linkContactUploadSigners: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;

        let columns_to_copy_sql = Sql.getColumnNames('uploads_signers', ['contact_id', 'upload_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactUploadSigners columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO uploads_signers_history (${columns_to_copy}, contact_id, upload_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)} 
            FROM uploads_signers
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('9-A - linkContactUploadSigners - SQL => ' + sql)
        await connection.queryAsync(sql)           

        sql = "UPDATE uploads_signers us SET us.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE us.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('9-B - linkContactUploadSigners - SQL => ' + sql)
        return connection.queryAsync(sql);
    },

    linkContactPhones: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_phones', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactPhones columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_phones_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_phones
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('10-A - linkContactPhones - SQL => ' + sql)
        await connection.queryAsync(sql)                

        sql = "UPDATE contact_phones cp SET cp.`contact_id` = " + connection.escape(primary_contact_id) + " , cp.primary = 0 WHERE cp.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('10-B - linkContactPhones - SQL => ' + sql);
        return connection.queryAsync(sql);
    },

    linkContactLocations: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_locations', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactLocations columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_locations_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_locations
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('11-A - linkContactLocations - SQL => ' + sql)
        await connection.queryAsync(sql)                

        sql = "UPDATE contact_locations cl SET cl.`contact_id` = " + connection.escape(primary_contact_id) + " , cl.primary = 0 WHERE cl.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('11-B - linkContactLocations - SQL => ' + sql);
        return connection.queryAsync(sql);
    },
    
    linkContactRelationship: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_relationships', ['contact_id', 'related_contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactRelationship columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_relationships_history (${columns_to_copy}, contact_id, related_contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}
            FROM contact_relationships
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('12-A - linkContactRelationship - SQL => ' + sql)
        await connection.queryAsync(sql)               

        sql = "UPDATE contact_relationships cr SET cr.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE cr.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('12-B - linkContactRelationship - SQL => ' + sql);
        return connection.queryAsync(sql);
    },
    
    linkContactNotes: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('notes', ['contact_id', 'last_modified_by']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactNotes columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO notes_history (${columns_to_copy}, contact_id, last_modified_by)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}, ${connection.escape(contact_history_id)}
            FROM notes
            WHERE contact_id = ${connection.escape(secondary_contact_id)} OR last_modified_by = ${connection.escape(secondary_contact_id)}
        `
        console.log('13-A - linkContactNotes - SQL => ' + sql)
        await connection.queryAsync(sql)             

        sql = "UPDATE notes n SET n.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE n.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('13-B - linkContactNotes - SQL => ' + sql);
        
        await connection.queryAsync(sql);

        sql = "UPDATE notes n SET n.`last_modified_by` = " + connection.escape(primary_contact_id) + " WHERE n.`last_modified_by` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('13-C - linkContactNotes - SQL => ' + sql);
        
        return connection.queryAsync(sql);

    }, 
    
    linkContactVehicles: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('vehicles', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactVehicles columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO vehicles_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM vehicles
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('14-A - linkContactVehicles - SQL => ' + sql)
        await connection.queryAsync(sql)                

        sql = "UPDATE vehicles v SET v.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE v.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('14-B - linkContactVehicles - SQL => ' + sql);
        return connection.queryAsync(sql);
    },
    
    linkContactCredentials: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contacts_credentials', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactCredentials columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts_credentials_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contacts_credentials
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('15-A - linkContactCredentials - SQL => ' + sql)
        await connection.queryAsync(sql)            

        sql = "UPDATE contacts_credentials cc SET cc.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE cc.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('15-B - linkContactCredentials - SQL => ' + sql);
        return connection.queryAsync(sql);
    },     

    linkContactBusinesses: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_businesses', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactBusinesses columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_businesses_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_businesses
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('16-A - linkContactBusinesses - SQL => ' + sql)
        await connection.queryAsync(sql)                

        sql = "UPDATE contact_businesses cb SET cb.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE cb.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('16-B - linkContactBusinesses - SQL => ' + sql);
        return connection.queryAsync(sql);
    },     
    
    linkContactEmployment: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_employment', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactEmployment columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_employment_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_employment
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('17-A - linkContactEmployment - SQL => ' + sql)
        await connection.queryAsync(sql)      

        sql = "UPDATE contact_employment ce SET ce.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE ce.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('17-B - linkContactEmployment - SQL => ' + sql);
        return connection.queryAsync(sql);
    },

    linkContactToken: async function(connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('contact_tokens', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactToken columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_tokens_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM contact_tokens
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('18-A - linkContactToken - SQL => ' + sql)
        await connection.queryAsync(sql)             

        sql = "UPDATE contact_tokens ct SET ct.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE ct.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('18-B - linkContactToken - SQL => ' + sql);
        return connection.queryAsync(sql);
    },    

    linkContactUpload: async function (connection, payload) {

        const { primary_contact_id, secondary_contact_id, contact_history_id } = payload;  
        
        let columns_to_copy_sql = Sql.getColumnNames('uploads', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("linkContactUpload columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO uploads_history (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(contact_history_id)}
            FROM uploads
            WHERE contact_id = ${connection.escape(secondary_contact_id)}
        `
        console.log('19-A - linkContactUpload - SQL => ' + sql)
        await connection.queryAsync(sql)             

        sql = "UPDATE uploads u SET u.`contact_id` = " + connection.escape(primary_contact_id) + " WHERE u.`contact_id` IN (" + connection.escape(secondary_contact_id) + ")";
        console.log('19-B - linkContactUpload - SQL => ' + sql);
        return connection.queryAsync(sql);
    },        

    linkContactHistory: async function(connection, primary_contact_id, contact_history_id, current_contact_id) {

        let sql = `INSERT INTO linking_contact_history (created_by, primary_contact_id, secondary_contact_id)
                    VALUES (${current_contact_id}, ${primary_contact_id}, ${contact_history_id})`;
        console.log('20 - linkContactHistory - SQL => ' + sql);
        return connection.queryAsync(sql);

    },        

    getContactLeasesForProperties: async function(connection, contact_ids){
        let sql = `
            SELECT
                c.id as contact_id,
                CONCAT(c.first, ' ', c.last) as tenant_name,
                GROUP_CONCAT(DISTINCT u.property_id SEPARATOR ',' ) as property_ids,
                COUNT(DISTINCT u.property_id) as properties_count
            FROM
                contacts c
            INNER JOIN contact_leases cl
                ON cl.contact_id = c.id
            INNER JOIN leases l
                ON l.id = cl.lease_id
            INNER JOIN units u
                ON l.unit_id = u.id
            WHERE
                c.id IN (${contact_ids.map(c => connection.escape(c)).join(', ')})
            GROUP BY
                c.id
            ORDER BY COUNT(DISTINCT u.property_id) DESC;
        `
        console.log("getContactLeasesForProperties SQL:", sql)
        return connection.queryAsync(sql)
    },

    removeSecondaryContact: async function(connection, secondary_contact_id) {

        let sql = "delete from contacts c where c.id = " + connection.escape(secondary_contact_id);
        console.log('21 - removeSecondaryContact - SQL => ' + sql);
        return connection.queryAsync(sql);

    },    


    findStateContact(connection){
        let sql = `select * from contacts where source='system' and first='State' and company_id is null limit 1;`;
        return connection.queryAsync(sql);
    },

    getContactDetails(connection, contact_ids) {
        if (!contact_ids.length) return [];
        const sql = `SELECT
                        c.id,
                        c.first,
                        c.last,
                        c.middle,
                        c.salutation,
                        c.suffix,
                        c.email,
                        c.dob,
                        c.ssn,
                        c.gender,
                        c.driver_license,
                        c.company,
                        IFNULL(
                            (
                                SELECT
                                    JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'id', cp.id,
                                            'type',cp.type,
                                            'phone',cp.phone,
                                            'sms',if(cp.sms = 1, CAST(TRUE AS JSON), CAST(FALSE AS JSON)),
                                            'primary',cp.primary
                                        )
                                    )
                                FROM
                                    contact_phones cp
                                WHERE
                                    cp.contact_id = c.id
                            ),
                            JSON_ARRAY()
                        ) as 'Phones',
                        IFNULL(
                            (
                                SELECT
                                    JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'id',cl.id,
                                            'primary',cl.primary,
                                            'type',cl.type,
                                            'move_in',cl.move_in,
                                            'move_out',cl.move_out,
                                            'rent',cl.rent,
                                            'landlord',cl.landlord,
                                            'phone',cl.phone,
                                            'Address',
                                            (
                                                SELECT
                                                    JSON_OBJECT(
                                                        'address',a.address,
                                                        'address2',a.address2,
                                                        'city',a.city,
                                                        'state',a.state,
                                                        'neighborhood',a.neighborhood,
                                                        'zip',a.zip,
                                                        'country',a.country,
                                                        'lat',a.lat,
                                                        'lng',a.lng
                                                    )
                                                FROM
                                                    addresses a
                                                WHERE
                                                    cl.address_id = a.id
                                            )
                                        )
                                    )
                                FROM
                                    contact_locations cl
                                WHERE
                                    cl.contact_id = c.id
                            ),
                            JSON_ARRAY()
                        ) as 'Addresses'
                    FROM
                        contacts c
                    WHERE
                        id IN (${connection.escape(contact_ids)});`
        return connection.queryAsync(sql).then(r => r.length ? r : []);
    },

    async findPropertyPermissions(connection, payload){
        let {company_id, id, properties_hash} = payload;

        let sql = `
            WITH property_hash_mapping AS (
                ${properties_hash.map((hash) => `SELECT ${hash.p_id} AS p_id, '${hash.hash_id}' AS hash_id`).join('\n UNION \n')}
            )
            SELECT p.label, JSON_ARRAYAGG(phm.hash_id) as properties 
            FROM companies_contact_roles ccr
                INNER JOIN contact_roles_properties crp on crp.company_contact_role_id = ccr.id
                INNER JOIN property_hash_mapping phm on phm.p_id = crp.property_id
                INNER JOIN roles_permissions rp on rp.role_id = ccr.role_id
                INNER JOIN permissions p on p.id = rp.permission_id
            WHERE ccr.contact_id = ${id} and ccr.company_id = ${company_id}
            GROUP BY p.id
        `;
    
        let result = await connection.queryAsync(sql);

        return result;
    },

    findIpModePropertyPermissions(connection, payload) {
        let {company_id, id, selected_prop_hash, unselected_prop_hash} = payload;

        if(!selected_prop_hash.length && !unselected_prop_hash.length) return [];

        let sql = `
            WITH
                ${selected_prop_hash.length ? `
                    property_hash_mapping AS (
                        ${selected_prop_hash.map(sph =>  `SELECT ${sph.p_id} as p_id, '${sph.hash_id}' as hash_id`).join(`\nUNION\n`)}
                    )
                ` : ``}
            
                ${unselected_prop_hash.length ? `${selected_prop_hash.length ? ',' : ``} 
                    ipp_hash_mapping AS (
                        ${unselected_prop_hash.map(sph =>  `SELECT ${sph.p_id} as p_id, '${sph.hash_id}' as hash_id`).join(`\nUNION\n`)}
                    )
                ` : ``}
            
            Select label, JSON_ARRAYAGG(properties) AS properties 
            FROM
                (
                    ${selected_prop_hash.length ? `
                        SELECT distinct p.label, phm.hash_id as properties 
                        FROM companies_contact_roles ccr
                            INNER JOIN contact_roles_properties crp on crp.company_contact_role_id = ccr.id
                            INNER JOIN property_hash_mapping phm on phm.p_id = crp.property_id
                            INNER JOIN roles_permissions rp on rp.role_id = ccr.role_id
                            INNER JOIN permissions p on p.id = rp.permission_id
                        WHERE ccr.contact_id = ${connection.escape(id)} and ccr.company_id = ${connection.escape(company_id)}` : ``
                    }
                        
                    ${unselected_prop_hash.length ? `
                        ${selected_prop_hash.length ? `\n UNION \n` : ``} 
                        SELECT distinct p.label, phm.hash_id as properties 
                        FROM roles r 
                            INNER join roles_permissions rp on rp.role_id = r.id
                            INNER join permissions p on p.id = rp.permission_id
                            CROSS join ipp_hash_mapping phm
                        WHERE r.name = '${ENUMS.ROLES.INTER_PROPERTY_OPERATIONS}' and r.company_id = ${connection.escape(company_id)}` : ``
                    }
                ) AS comb_perm_prop
            GROUP BY comb_perm_prop.label;`

        console.log('findIpModePropertyPermissions', sql);
        return connection.queryAsync(sql);
    },

    //Checks if a user has all required permissions. Returns those permissions which user does not have
    hasPermissions(connection, payload){
        let {company_id, contact_id, permissions = []} = payload;
        let sql = ` WITH permitted_perms AS (
                        SELECT p.label from companies_contact_roles ccr
                            inner join roles_permissions rp on rp.role_id = ccr.role_id and ccr.contact_id = ${connection.escape(contact_id)} and ccr.company_id = ${connection.escape(company_id)}
                            inner join permissions p on p.id = rp.permission_id
                    ),
                    permissions AS (
                        SELECT ${connection.escape(permissions[0])}  as label`

                        if(permissions.length>1){

                            for(let i=1; i<permissions.length; i++){
                                sql += ` UNION SELECT ${connection.escape(permissions[i])} as label`
                            }
                            
                        }

        sql += `) SELECT * from permissions where label not in (select label from permitted_perms);`
        
        console.log('hasPermissions query: ', sql );
        return connection.queryAsync(sql);
    },

    getPropertiesByRoles(connection, payload){
        let {contact_id, company_id} = payload;

        let sql = `select ccr.id, ccr.role_id, group_concat(DISTINCT crp.property_id SEPARATOR ',') as Properties, group_concat(DISTINCT crnhb.property_id SEPARATOR ',') as NonHbProperties
                    from companies_contact_roles ccr
                        left join contact_roles_properties crp on crp.company_contact_role_id = ccr.id
                        left join contact_roles_non_hummingbird_properties crnhb on crnhb.company_contact_role_id = ccr.id              
                    where ccr.contact_id = ${contact_id} and ccr.company_id = ${company_id}
                    group by ccr.role_id`;
        
        console.log('getPropertiesByRoles query: ', sql);
        return connection.queryAsync(sql); 
    },

    async duplicateContactDetails(connection, contact_id) {

        let columns_to_copy_sql = Sql.getColumnNames('contacts')
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactDetails columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts (${columns_to_copy})
            SELECT ${columns_to_copy}
            FROM contacts
            WHERE id = ${connection.escape(contact_id)}
        `
        console.log("duplicateContactDetails :", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async duplicateContactPhones(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_phones', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactPhones columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_phones (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_phones
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactPhones SQL:", sql);
        return connection.queryAsync(sql)//.then(r => r.insertId);
    },

    async duplicateContactEmployment(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_employment', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactEmployment columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_employment (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_employment
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactEmployment SQL:", sql);
        return connection.queryAsync(sql);
    },

    async duplicateContactCredentials(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contacts_credentials', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactCredentials columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts_credentials (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contacts_credentials
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactCredentials SQL:", sql);
        return connection.queryAsync(sql);
    },

    async duplicateContactRelationship(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_relationships', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactRelationship columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_relationships (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_relationships
            WHERE (contact_id = ${connection.escape(payload.contact_id)} AND lease_id IS NULL)
        `
        console.log("duplicateContactRelationship SQL:", sql);
        return connection.queryAsync(sql);
    },

    async updateContactRelationshipContactId(connection, payload) {
        let sql = `
            UPDATE contact_relationships 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log("updateContactRelationshipContactId SQL:", sql);
        return connection.queryAsync(sql);
    },

    async getAllContactBusiness(connection, contact_id){
        var sql = "Select * from contact_businesses where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactBusiness SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactBusiness(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_businesses', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactBusiness columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_businesses (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_businesses
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND address_id = ${connection.escape(payload.address_id)}
        `
        console.log("duplicateContactBusiness SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async getAllContactMilitary(connection, contact_id){
        var sql = "Select * from contact_military where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactMilitary SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactMilitary(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_military', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactMilitary columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_military (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_military
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        if(payload.address_id){
            sql+= ` AND address_id = ${connection.escape(payload.address_id)}`
        }
        console.log("duplicateContactMilitary SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async getAllContactLocation(connection, contact_id){
        var sql = "Select * from contact_locations where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactLocation SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactLocations(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_locations', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactLocations columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_locations (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_locations
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND address_id = ${connection.escape(payload.address_id)}
        `
        console.log("duplicateContactLocations SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async duplicateContactTokens(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_tokens', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactTokens columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_tokens (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_tokens
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactTokens SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async updateVehiclesContactId(connection, payload) {
        let sql = `
            UPDATE vehicles 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log('updateVehiclesContactId SQL:',sql);
        return await connection.queryAsync(sql);
    },

    findContactRoleByCompany(connection, company_id, role_id){
        var sql = `select * from companies_contact_roles where company_id = ${connection.escape(company_id)} and role_id = ${connection.escape(role_id)}`;
        return connection.queryAsync(sql);
    },

    contactLeasesOmniSearch(connection, payload){

        let {contact_ids, company_id, property_ids, source} = payload;

        let query = `
            with cte_contact_balance as
            (
                select
                    inv.contact_id as contact_id, ROUND(IFNULL(sum(subtotal + total_tax - total_discounts - total_payments), 0), 2) as balance
                from invoices inv
                join properties p on inv.property_id = p.id
                where inv.status > 0
                    and inv.due <= (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00"))))
                    and inv.contact_id in (${contact_ids.map(id => connection.escape(id)).join(', ')})
                    and p.company_id = ${company_id}
                    ${source && source === 'linking' ? ` and p.id IN (${property_ids.map(id => connection.escape(id)).join(', ')})` : ''}
                group by inv.contact_id
            )
            select 'contact' as search_type, c.id, COALESCE(c.first, '') as first, COALESCE(c.last, '') as last, c.email,
                CONCAT('[{ "phone": "', COALESCE(cp.phone, ''),'"}]') as Phones,
	            JSON_ARRAYAGG(
                    CONCAT(
                        '{ "id":', l.id, ',"status":', l.status, ',"unit_id":', l.unit_id, ',"start_date":"', l.start_date, '",
                                "Standing": { "name":"', COALESCE(ls.name, 'Current'),'"},
							    "Unit": { "number":"', COALESCE(u.number, ''), '", "property_id":', u.property_id,',
								    "Address": {"address":"', COALESCE(a.address, ''), '","city":"', COALESCE(a.city, ''), '","state":"', COALESCE(a.state, ''), '",  "country":"', COALESCE(a.country, ''), '","zip":"', COALESCE(a.zip, ''), '"
                                    }
							    }
						}')
                    ) as Leases,
	            ccb.balance as balance,
	            ${Contact.statusQry('c.id', property_ids, connection)} as status
            from contacts c
				left join contact_phones cp on c.id = cp.contact_id and cp.primary = 1
	            left join contact_leases cl on c.id = cl.contact_id and cl.primary = 1
	            left join leases l on l.id = cl.lease_id
	            left join lease_standings ls on l.lease_standing_id = ls.id
	            left join units u on l.unit_id = u.id
	            left join addresses a on u.address_id = a.id
	            left join cte_contact_balance ccb on ccb.contact_id = c.id
            where c.id in (${contact_ids.map(id => connection.escape(id)).join(', ')})
            ${source && source === 'linking' ? ' AND l.status = 1' : ''}
            ${source && source === 'linking' ? ` AND u.property_id IN (${property_ids.map(id => connection.escape(id)).join(', ')})` : ''}
            group by c.id
        `

        console.log('contactLeasesOmniSearch query: ', query);

        return connection.queryAsync(query)
    },

    findContactByAppId(connection, appID) {
        let sql = `
            SELECT c.id, c.user_id, c.first, c.last
            FROM users u
            JOIN contacts c ON c.user_id = u.id
            WHERE u.gds_application_id = '${appID}';
        `
        return connection.queryAsync(sql).then(res => res.length ? res[0] : {})
    },

    async getSMSContactsByContactId(connection,contactId){
        // primary is a keyword in mysql using backtick for selecting the column
        let sql = `select id, phone, \`primary\`, \'type\' from contact_phones where contact_id = ${contactId} and sms = 1;`
    console.log('contacts SMS enabled SQL:',sql);
    return await connection.queryAsync(sql);
    },

    getPrimaryRoleProperties(connection, data) {

        let {company_id, id} = data;

        let sql = `
            select JSON_ARRAYAGG( crp.property_id) as properties
            from companies_contact_roles ccr
                inner join roles r on  r.id = ccr.role_id and r.name != '${ENUMS.ROLES.INTER_PROPERTY_OPERATIONS}'
                left join contact_roles_properties crp on crp.company_contact_role_id = ccr.id
            where ccr.contact_id = ${id} and ccr.company_id = ${company_id}
            group by ccr.role_id 
            `

        return connection.queryAsync(sql).then(res => res.length ? res[0] : {});
    },

    async duplicateContactDetails(connection, contact_id) {

        let columns_to_copy_sql = Sql.getColumnNames('contacts')
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactDetails columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts (${columns_to_copy})
            SELECT ${columns_to_copy}
            FROM contacts
            WHERE id = ${connection.escape(contact_id)}
        `
        console.log("duplicateContactDetails :", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async duplicateContactPhones(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_phones', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactPhones columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_phones (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_phones
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactPhones SQL:", sql);
        return connection.queryAsync(sql)//.then(r => r.insertId);
    },

    async duplicateContactEmployment(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_employment', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactEmployment columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_employment (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_employment
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactEmployment SQL:", sql);
        return connection.queryAsync(sql);
    },

    async duplicateContactCredentials(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contacts_credentials', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactCredentials columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contacts_credentials (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contacts_credentials
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactCredentials SQL:", sql);
        return connection.queryAsync(sql);
    },

    async duplicateContactRelationship(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_relationships', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactRelationship columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_relationships (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_relationships
            WHERE (contact_id = ${connection.escape(payload.contact_id)} AND lease_id IS NULL)
        `
        console.log("duplicateContactRelationship SQL:", sql);
        return connection.queryAsync(sql);
    },

    async updateContactRelationshipContactId(connection, payload) {
        let sql = `
            UPDATE contact_relationships 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log("updateContactRelationshipContactId SQL:", sql);
        return connection.queryAsync(sql);
    },

    async getAllContactBusiness(connection, contact_id){
        var sql = "Select * from contact_businesses where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactBusiness SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactBusiness(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_businesses', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactBusiness columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_businesses (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_businesses
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND address_id = ${connection.escape(payload.address_id)}
        `
        console.log("duplicateContactBusiness SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async getAllContactMilitary(connection, contact_id){
        var sql = "Select * from contact_military where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactMilitary SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactMilitary(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_military', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactMilitary columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_military (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_military
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        if(payload.address_id){
            sql+= ` AND address_id = ${connection.escape(payload.address_id)}`
        }
        console.log("duplicateContactMilitary SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async getAllContactLocation(connection, contact_id){
        var sql = "Select * from contact_locations where contact_id = " +  connection.escape(contact_id);
        console.log("getAllContactLocation SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicateContactLocations(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_locations', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactLocations columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_locations (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM contact_locations
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND address_id = ${connection.escape(payload.address_id)}
        `
        console.log("duplicateContactLocations SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async duplicateContactTokens(connection, payload) {
        let columns_to_copy_sql = Sql.getColumnNames('contact_tokens', ['contact_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateContactTokens columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO contact_tokens (${columns_to_copy}, contact_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}
            FROM contact_tokens
            WHERE contact_id = ${connection.escape(payload.contact_id)}
        `
        console.log("duplicateContactTokens SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },

    async updateVehiclesContactId(connection, payload) {
        let sql = `
            UPDATE vehicles 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log('updateVehiclesContactId SQL:',sql);
        return await connection.queryAsync(sql);
    }


    // getAllProperties(connection, payload) {
    //     let {companyId, contactId} = payload;

    //     let sql =  `SELECT distinct(crp.property_id)
    //                 FROM companies_contact_roles ccr 
    //                     inner join contact_roles_properties crp on crp.company_contact_role_id = ccr.id
    //                 WHERE ccr.contact_id = ${contactId} and ccr.company_id = ${companyId} and ccr.status = 1`;

    //     console.log(`getAllProperties: ${sql}`);
    //     return connection.queryAsync(sql);
    // }
};

var omniSearchQuery = function(connection, params = {}, company_id, properties = []) {
  var digits = params.search.replace(/\D+/g, "");

  let sql = "SELECT " +
    " contact_id, " +
    " lease_id, " +
    "   (SELECT number FROM units WHERE id = (SELECT unit_id FROM leases WHERE id = contact_leases.lease_id)) AS unit, " +
    "   (SELECT property_id FROM units WHERE id = (SELECT unit_id FROM leases WHERE id = contact_leases.lease_id)) AS property_id, " +
    "   (SELECT CONCAT(first, ' ', IF(middle, CONCAT(middle, ' '), ''), last) FROM contacts WHERE id = contact_leases.contact_id) AS name " +
    " FROM contact_leases " +
    " WHERE " +
    " ( contact_leases.contact_id IN (SELECT id FROM contacts WHERE CONCAT(first, ' ',IF(middle, CONCAT(middle, ' '), ''), last) LIKE " +  connection.escape("%" + params.search + "%")  + ')' +
    " or contact_leases.contact_id IN (SELECT id FROM contacts WHERE email LIKE " +  connection.escape("%" + params.search + "%") + ')' + 
    " or contact_leases.lease_id IN (SELECT id FROM leases WHERE unit_id IN (Select id FROM units WHERE number LIKE "  + connection.escape("%" + params.search + "%") + '))';
    if(digits){
      sql += " or contact_id in (select contact_phones.contact_id from contact_phones where phone like " + connection.escape("%" + params.search + "%") + ")";
    }
    sql +=   " ) ";
    if(properties.length){
      sql += " and contact_id in (select contact_id from contact_leases where lease_id in ( select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") )))  ";
    }
    sql += " AND contact_id NOT IN (SELECT contact_id FROM leads WHERE leads.contact_id = contact_leases.contact_id AND leads.status = 'retired')"
    sql += " and contact_id in (select id from contacts where company_id = " + connection.escape(company_id) + ")";
    sql +=  " UNION " +
    " SELECT " +
      " id, " +
      " NULL, " +
      " NULL, " +
      " (SELECT property_id FROM leads WHERE contact_id = contacts.id limit 1) AS property_id, " +
      " CONCAT(first, ' ', IF(middle, CONCAT(' ',middle), ''), last) " +
    "FROM contacts " +
    "WHERE " +
      " opt_out <> 1 " +
      " AND ( CONCAT(first, ' ',IF(middle, CONCAT(middle, ' '), ''), last) LIKE " +  connection.escape("%" + params.search + "%") +
      " or email LIKE " +  connection.escape("%" + params.search + "%") + ' ' ;
    if(digits){
      sql += " or id in (select contact_id from contact_phones where phone like " + connection.escape("%" + params.search + "%") + ")";
    }
    sql +=   " ) ";
    if(properties.length){
      sql += " and id in (select contact_id from leads where property_id in (" + properties.map(p => connection.escape(p)).join(', ')  + ") ) ";
    }
    sql += " AND id NOT IN (SELECT contact_id FROM contact_leases WHERE contact_leases.contact_id = contacts.id) ";
  sql += " AND company_id = " +  + connection.escape(company_id);
  return sql;
}

var activeLeaseSearchQuery = function(connection, params, company_id, properties = []){
  var digits = params.search.replace(/\D+/g, "");
  let types = params.lease_types.filter(t => ['lease', 'reservation', 'pending' ].indexOf(t) >= 0 );
  let date = params.date || moment().format('YYYY-MM-DD');
  let datetime = params.datetime || moment().format('YYYY-MM-DD HH:mm:ss');

  let sql = "Select * from contact_leases where contact_id in ( select id from contacts where first like " + connection.escape( '%' + params.search + '%' )+ " or last like " + connection.escape( '%' + params.search + '%' ) + ")  ";
  sql += ' and  (select company_id from contacts where id = contact_id ) = ' + connection.escape( company_id );

  if(types && types.length){
    sql += ' and ( ';

    for(let i = 0; i < types.length; i++){

      switch(types[i]){
        case 'lease':
          sql += " lease_id in (select id from leases where status = 1 and (end_date is null or end_date  > " + connection.escape(date) + " )) ";
          break;
        case 'reservation':
          sql += " lease_id in (select id from leases where status = 0 and  id in (select lease_id from reservations where expires > " + connection.escape(datetime) + " ))  ";
          break;
        case 'pending':
          sql += " lease_id in (select id from leases where status = 2 and (end_date is null or end_date  > " + connection.escape(date) + " )) ";
          break;
      }
      if(i < types.length - 1){
        sql += ' or ';
      } else {
        sql += ' ) ';
      }

    }

    if(properties.length){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ') + " )))  ";
      
    }

    sql += ` UNION SELECT * FROM contact_leases WHERE   (SELECT company_id FROM contacts WHERE id = contact_id) = ${connection.escape(company_id)}
    AND lease_id IN (SELECT id FROM leases WHERE  status = 1 AND (end_date IS NULL OR end_date > ${connection.escape(date)}))
    AND lease_id IN (SELECT id FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (${properties.map(p => connection.escape(p)).join(', ')}) AND number LIKE ${connection.escape( '%' + params.search + '%')}))`;
  }
  return sql;
}


module.exports = Contact; 

models  = require(__dirname + '/../models');
var settings  = require(__dirname + '/../config/settings.js');
const  ENUMS  = require(__dirname + '/../modules/enums.js');