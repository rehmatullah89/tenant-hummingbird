var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

var models = {};
module.exports = {

    getRoleProperties(connection, company_contact_role_id){
        var sql = "SELECT * from contact_roles_properties where company_contact_role_id = " + connection.escape(company_contact_role_id);
        console.log(sql);
        return connection.queryAsync(sql);
    },

    findAllByCompany(connection, company_id) {
        var sql = `SELECT * from contacts where company_id = ${connection.escape(company_id)}`;
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

    findPhoneTypes: function(connection, company_id){
      var sql =  "Select DISTINCT(type) as type from contact_phones where contact_id in (select id from contacts where company_id = "  + connection.escape(company_id) + ')';
      return connection.queryAsync( sql );
    },

    findTenantsByName(connection, first, last, company_id){
        var sql = "SELECT * from contacts where first = " +  connection.escape(first) + " and last = " + connection.escape(last) + " and company_id = " + connection.escape(company_id) + " and id in (select contact_id from contact_leases where lease_id in (select id from leases where status > 0))";
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

    getBalance(connection, contact_id){
      let id = "(select lease_id from contact_leases where contact_id = contacts.id )";
       let sql =  "Select SUM(" + Sql.lease_lifetime_billed(id, 'in') + " - " + Sql.lease_lifetime_payments(id, 'in') + " - " + Sql.lease_total_writeoffs(id, 'in') + " - " + Sql.lease_total_credits(id, 'in') + ") as balance from contacts where id = " + connection.escape(contact_id);
      return connection.queryAsync(sql).then(r => r.length ? r[0].balance : null);

    },


    search(connection, conditions = {}, searchParams, company_id, count){


        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  " +
                "(select phone from contact_phones where contact_id = contacts.id order by id asc limit 1) as phone ";
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

	saveVerificationStatus: function(connection, data, contact_phones_id){
		var sql;

		if(contact_phones_id){
			sql = "UPDATE contact_phones set ? where contact_id = " + connection.escape(contact_phones_id);
		} else {
			sql = "INSERT into contact_phones set ?";
		}
		return connection.queryAsync(sql, data);
	},

    // Getting duplicate token only for authNet PaymentMethod
    getDuplicateContactTokens: function(connection, company_id){
        var sql = `SELECT * FROM contact_tokens
                    WHERE contact_id IN (SELECT DISTINCT contact_id FROM contact_leases WHERE lease_id IN (SELECT id FROM leases
                    WHERE id IN (SELECT lease_id FROM contact_leases WHERE contact_id IN (SELECT id FROM contacts 
                    WHERE id IN (SELECT contact_id FROM contact_tokens
                    where property_id in (select id from properties where company_id = ${connection.escape(company_id)})
                    GROUP BY contact_id , property_id , type
                    HAVING COUNT(*) > 1)
                    ORDER BY created DESC))
                    AND (end_date IS NULL
                    OR end_date >= CURDATE())))
                    and type = 'authnet_card'
                    GROUP BY contact_id , property_id , type, token;`
        return connection.queryAsync(sql).then(r => r ? r: null);

    },

    // Getting Single token only for authNet PaymentMethod
    getSingleContactTokens: function(connection, company_id){
        var sql = `SELECT * FROM contact_tokens
                    WHERE contact_id IN (SELECT DISTINCT contact_id FROM contact_leases WHERE lease_id IN (SELECT id FROM leases
                    WHERE id IN (SELECT lease_id FROM contact_leases WHERE contact_id IN (SELECT id FROM contacts 
                    WHERE id IN (SELECT contact_id FROM contact_tokens
                    where property_id in (select id from properties where company_id = ${connection.escape(company_id)})
                    GROUP BY contact_id , property_id , type
                    HAVING COUNT(*) = 1)
                    ORDER BY created DESC))
                    AND (end_date IS NULL
                    OR end_date >= CURDATE())))
                    and type = 'authnet_card'
                    GROUP BY contact_id , property_id , type, token;`
        return connection.queryAsync(sql).then(r => r ? r: null);

    },

    findPaymentMethods:function(connection, contact_id, property_id, all = false){

        var sql = "Select * from payment_methods where  contact_id = " +  connection.escape(contact_id) + ' and property_id = ' +  connection.escape(property_id);

        if(!all) {
          sql += " and active = 1 ";
        }

        return connection.queryAsync(sql);

    },

    saveVehicles(connection, data, contact_vehicles_id){

        var sql;
        if(contact_vehicles_id){
            sql = "UPDATE contact_vehicles set ? where id = " + connection.escape(contact_vehicles_id);
        } else {
            sql = "insert into contact_vehicles set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return contact_vehicles_id || response.insertId;
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

    findAdminByEmail(connection, email, company_id){
        var sql = "Select * from contacts where company_id is null and email = " +  connection.escape(email);

        if(company_id){
            sql += ' and id in (select contact_id from companies_contact_roles where company_id = ' + connection.escape(company_id) + ' )'
        }
        console.log("sqlsqlsql", sql);
        return connection.queryAsync(sql).then(c => (c.length) ? c[0]: null );
    },

    findContactByAppId(connection, appID) {
        let sql = `
            SELECT
                c.id, c.user_id, c.first, c.last
            FROM users u
            JOIN contacts c ON c.user_id = u.id
            WHERE
                u.gds_application_id = '${appID}';`
        return connection.queryAsync(sql).then(res => res.length ? res[0] : {})
    },

    omniSearch: function(connection, params = {}, company_id, properties = []){
      params.offset =  params.offset || 0;
      params.limit =  params.limit || 20;
      if(!params.search) return [];
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
          " or contact_leases.contact_id IN (SELECT id FROM contacts WHERE email LIKE " +  connection.escape("%" + params.search + "%") + ')';
          if(digits){
            sql += " or contact_id in (select contact_phones.contact_id from contact_phones where phone like " + connection.escape("%" + digits + "%") + ")";
          }
          sql +=   " ) ";
          if(properties.length){
            sql += " and contact_id in (select contact_id from contact_leases where lease_id in ( select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") )))  ";
          }
          sql += " and contact_id in (select id from contacts where company_id = " + connection.escape(company_id) + ")";
          sql +=  " UNION " +
          " SELECT " +
            " id, " +
            " NULL, " +
            " NULL, " +
            " (SELECT property_id FROM leads WHERE contact_id = contacts.id) AS property_id, " +
            " CONCAT(first, ' ', IF(middle, CONCAT(' ',middle), ''), last) " +
          "FROM contacts " +
          "WHERE " +
            " ( CONCAT(first, ' ',IF(middle, CONCAT(middle, ' '), ''), last) LIKE " +  connection.escape("%" + params.search + "%") +
            " or email LIKE " +  connection.escape("%" + params.search + "%") + ' ' ;
          if(digits){
            sql += " or id in (select contact_id from contact_phones where phone like " + connection.escape("%" + digits + "%") + ")";
          }
          sql +=   " ) ";
          if(properties.length){
            sql += " and id in (select contact_id from leads where property_id in (" + properties.map(p => connection.escape(p)).join(', ')  + ") ) ";
          }
          sql += " AND id NOT IN (SELECT contact_id FROM contact_leases WHERE contact_leases.contact_id = contacts.id) ";
        sql += " AND company_id = " +  + connection.escape(company_id);

        sql += " limit " + params.offset + ', ' + params.limit;
        return connection.queryAsync(sql);

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
      }

      if(params.offset && params.limit){
        sql += " limit " + params.offset + ', ' + params.limit;
      }

      return connection.queryAsync(sql);

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

    findByPhone: function(connection, phone, company_id){
        var phonesSql = "Select * from contacts " +
            " where id in (select contact_id from contact_phones where phone = " +  connection.escape(phone) + ') and company_id = ' + connection.escape( company_id ) ;
        return connection.queryAsync(phonesSql);
    },


    getMultipleById(connection, contacts, properties = [], company_id){

      var sql = "Select * from contacts where id in ( " + contacts.map(c => connection.escape(c)).join(',') +  " ) ";

      sql += "and  company_id = " + connection.escape(company_id);

      return connection.queryAsync( sql );
    },

    verifyBulk(connection, contacts, company_id){
      console.log("contacts", contacts)

      var sql = "Select count(*) as count from contacts where id in ( " + contacts.map(c => connection.escape(c)).join(',') +  " ) and company_id = " + connection.escape(company_id);

      console.log("sql", sql)

      return connection.queryAsync( sql ).then(c => contacts.length == c[0].count);
    },

    findPhoneById:function(connection, phone_id ){

        var phonesSql = "Select * from contact_phones where id = " +  connection.escape(phone_id);
        return connection.queryAsync(phonesSql).then(phone => phone.length?phone[0]:null )

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
    
    findLocations: function(connection, contact_id){

        // var addressSql =  "Select address, city,state,zip,neighborhood,country,lat,lng, (select type from contact_locations where contact_locations.address_id = addresses.id) as type, (select id from contact_locations where contact_locations.address_id = addresses.id) as id  from addresses where id in (select address_id from contact_locations where contact_id = " + connection.escape(contact_id) + " )";


        var addressSql =  "Select * from contact_locations where contact_id = " + connection.escape(contact_id);

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

            var sql = "DELETE from contact_vehicles where ";

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

    findAlternate: function(connection, contact_id,lease_id ){

        let sql = "select * from contact_relationships where contact_id = " + connection.escape(contact_id);

        if(lease_id){
            sql += " and lease_id is null or lease_id = " + connection.escape(lease_id);
        }

        return connection.queryAsync(sql);

    },

    findCompanyList: function(connection, contact_id, subdomain){
        var companiesSql = "Select * from companies where id in (select distinct(company_id) from companies_contact_roles where contact_id = " + connection.escape(contact_id) + ")";
        return connection.queryAsync(companiesSql)
    },

    getUserRoles(connection, contact_id, company_id){

        var rolesSql = "Select *, (select name from roles where id = companies_contact_roles.role_id) as name from companies_contact_roles where contact_id = " + connection.escape(contact_id) + " and company_id  = " + connection.escape(company_id);

        console.log("rolesSql", company_id,  rolesSql);

        return connection.queryAsync(rolesSql);
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


        var companyUserSql = "Select distinct(contact_id) as contact_id, " +
            "(select email from contacts where id = companies_contact_roles.contact_id limit 1) as email, " +
            "(select first from contacts where id = companies_contact_roles.contact_id limit 1) as first, " +
            "(select last from contacts where id = companies_contact_roles.contact_id limit 1) as last " +
            " from companies_contact_roles where company_id = " +  connection.escape(company_id);

        return connection.queryAsync(companyUserSql);

    },

    findHBAdminContact(connection){
        let sql = `SELECT c.id, c.first, c.last, c.email, c.status 
                    FROM users u
                    INNER JOIN contacts c on c.user_id = u.id 
                    WHERE u.email like 'hummingbird%' and u.active = 1;`;

        return connection.queryAsync(sql);
    },

    findAdminsByPropertyId(connection, company_id, property_id){


        var companyUserSql = "Select distinct(contact_id) as contact_id, " +
            "(select email from contacts where id = companies_contact_roles.contact_id limit 1) as email, " +
            "(select first from contacts where id = companies_contact_roles.contact_id limit 1) as first, " +
            "(select last from contacts where id = companies_contact_roles.contact_id limit 1) as last " +
            " from companies_contact_roles where company_id = " +  connection.escape(company_id) +
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
      var sql = "update interactions set pinned = 1 where contact_id = " +  connection.escape(contact_id) + " and id = " + connection.escape(interaction_id);
      console.log(sql);
      return connection.queryAsync(sql);
    },

    unpinInteraction(connection, contact_id, interaction_id){
      var sql = "update interactions set pinned = 0 where contact_id = " + connection.escape(contact_id) + " and id = " + connection.escape(interaction_id);
      return connection.queryAsync(sql);
    },

    updateContact(connection, contact_id, data){
        var sql = "update contacts set ? where id = " + connection.escape(contact_id);
        return connection.queryAsync(sql,data);
    },
    updateContactStatus(connection, contact_id, status){
        var sql = "update contacts set status = " + connection.escape(status)  + " where id = " + connection.escape(contact_id);
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

    findContactsWithOpenInvoicesAndCredits(connection, property_id, types) {
        let sql = `
            select DISTINCT contact_id from contact_leases where contact_id in
            (
                Select contact_id from payments where status = 1 and property_id = ${connection.escape(property_id)}
                and ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id))
                < payments.amount          
                and credit_type in ('payment', 'credit')
            ) 
            and lease_id in 
            (
                select lease_id from invoices where status > 0
            	and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
	            and (SELECT ROUND(SUM((qty * cost) + total_tax - total_discounts ),2) from invoice_lines where invoice_id = invoices.id
            	) > ( SELECT ROUND(IFNULL(SUM(amount),0), 2) FROM invoices_payments WHERE invoice_id = invoices.id)
	            order by date asc
            );
        `
        console.log('findContactsWithOpenInvoicesAndCredits ', sql);
        return connection.queryAsync(sql);
    },

    findOpenInvoices(connection, contact_id, property_id) {

        var sql = `select * from invoices where status > 0`;

        if(contact_id){
            sql += ` and lease_id in (select lease_id from contact_leases where contact_id = ${connection.escape(contact_id)})`;
        }

        if(property_id){
            sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))`;
        }

        sql += `
            and ( select 
                ROUND(SUM((qty * cost) - 
                IFNULL((select sum(amount) from discount_line_items where invoice_line_id = invoice_lines.id), 0) + 
                (((qty * cost) - IFNULL((SELECT SUM(amount) from discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * 
                    IFNULL((SELECT SUM(taxrate) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) /100, 0))), 2) 
                from invoice_lines where invoice_id = invoices.id
                ) > ( SELECT ROUND(IFNULL(SUM(amount),0), 2) FROM invoices_payments WHERE invoice_id = invoices.id)
            order by date asc`;

        return connection.queryAsync(sql);
    }
};
 
models  = require(__dirname + '/../models');
