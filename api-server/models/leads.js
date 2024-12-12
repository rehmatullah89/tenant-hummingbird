var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');
var Promise = require('bluebird');
var moment = require('moment');

var models  = {};


module.exports = {

    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "update leads set ?  where id = " + connection.escape(id);
        } else {
            sql = "insert into leads set ?";
        }
        console.log("hrrrrmph data", data)
        return connection.queryAsync(sql, data);
    },

    delete: function(connection, id){
        var sql;
        sql = "update leads set status = 'deleted'  where id = " + connection.escape(id);

        return connection.queryAsync(sql);
    },

    search(connection, conditions = {}, searchParams, company_id, count, getAdditionalLeadInfo = false) {
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  " +
                 "(select concat(first, ' ' , last) from contacts where id = leads.contact_id) as name, " +
                 "(select address from addresses where id = (select address_id from properties where id = leads.property_id)) as address, " +
                 "(select city from addresses where id = leads.property_id) as city, " +
                 "(select state from addresses where id = leads.property_id) as state, " +
                 "(select country from addresses where id = leads.property_id) as country, " +
                 "(select zip from addresses where id = leads.property_id) as zip, " +
                 "(select number from units where id = leads.unit_id) as number, " +
                 "(select name from unit_categories where id = leads.category_id) as category_name, " +
                "(select email from contacts where id = leads.contact_id) as email, " +
                "(select phone from contact_phones where contact_id = leads.contact_id and `primary` = 1) as phone ";
            
            if (getAdditionalLeadInfo) sql = "SELECT * " 
        }


        sql += " FROM leads where 1 = 1 " ;
        sql += " and (select company_id from contacts where id = leads.contact_id) = " + connection.escape(company_id);



        if(conditions.source && conditions.source.length){
            sql += ' and LOWER(source) in (' + conditions.source.map(s => connection.escape(s)).join(', ') + ')';
        }

        if(conditions.status && conditions.status.length){
            sql += ' and LOWER(status) in (' + conditions.status.map(s => connection.escape(s)).join(', ') + ')';
        } else {
            sql += ' and LOWER(status) not in ("retired")';
        }
        if (conditions.fromDate) {
            let toDate = conditions.toDate || moment.utc().format('YYYY-MM-DD');
            sql += ` and leads.created BETWEEN ${connection.escape(conditions.fromDate)} and ${connection.escape(toDate)} `
        }

        if(conditions.search){
            sql += " and (" +
                "(select concat(first, ' ' , last) from contacts where id = leads.contact_id) like " + connection.escape("%" + conditions.search + "%") +
                " OR (select email from contacts where id = leads.contact_id) like " + connection.escape("%" + conditions.search + "%") +
                " OR leads.contact_id in (select contact_id from contact_phones where phone like  " + connection.escape("%" + conditions.search + "%") + ")" +
                ") ";
        }

        if(conditions.property_id){
            sql += " and property_id in (" + connection.escape(conditions.property_id) + ")";
        }

        if(conditions.category_id && conditions.category_id.length){
            sql += " and category_id in (" + connection.escape(conditions.category_id) + ")";
        }

        if(searchParams){
            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){
                    case 'name':
                        sql += " (select concat(first, ' ' , last) from contacts where id = leads.contact_id) ";
                        break;
                    case 'email':
                        sql += " (select email from contacts where id = leads.contact_id) ";
                        break;

                    case 'address':
                        sql += " (select address from addresses where id = (select address_id from properties where id = leads.property_id)) ";

                        break;
                    case 'category_name':

                        sql += " (select name from unit_categories where id = leads.category_id) ";
                        break;

                    default:
                        sql += searchParams.sort;

                }

                sql += ' ' + searchParams.sortdir;
            }
            sql += " limit ";
            if (!count) {
                sql += searchParams.offset;
            }
            
            sql += ", ";
            sql += searchParams.limit;
        }
        

        return connection.queryAsync(sql);
    },

    findLeads: function(connection, company_id, unread, property_id){

        var sql = "select * from leads where status != 'deleted' and (select company_id from contacts where contacts.id = leads.contact_id)  = " + connection.escape(company_id);

        if(property_id) {
            sql += " and ( leads.property_id = "  + connection.escape(property_id) + " or leads.unit_id in (select id from units where property_id = " + connection.escape(company_id) + ")) ";
        }

        if(unread) sql += ' and status = "active" ';
        sql += ' order by created desc';


        return connection.queryAsync(sql);
    },

    getLeadById: function(connection, id){

        var sql = "select * from leads where id = " + connection.escape(id);

        return connection.queryAsync(sql).then(function(msgRes){
            if(!msgRes.length) return false;
            return msgRes[0];
        });
    },

    getLeadByContactId: function(connection, contact_id){

        var sql = "select * from leads where contact_id = " + connection.escape(contact_id);

        return connection.queryAsync(sql).then(function(msgRes){
            if(!msgRes.length) return false;
            return msgRes[0];
        });
    },

    convertActiveLeads: async (connection, contact_id, lease_id, property_id, unit_id) => {
        var sql = ` UPDATE leads set status = 'converted', unit_id = ${connection.escape(unit_id)}
                    where status = 'active' and property_id = ${connection.escape(property_id)}
                    and contact_id = ${connection.escape(contact_id)}
                    and lease_id = ${connection.escape(lease_id)}`;

        console.log("convertActiveLeads sql", sql)
        return await connection.queryAsync(sql);
    },

    findActiveByContactId: function(connection, contact_id, property_id){

        var sql = "select * from leads where status = 'active' and property_id = " + connection.escape(property_id) + " and contact_id = " + connection.escape(contact_id);
        return connection.queryAsync(sql).then(res => res.length? res[0] : null);
    },

    findLeadByContactIdAndLeaseId: function(connection, contact_id, property_id, lease_id){

        var sql = "select * from leads where property_id = " + connection.escape(property_id) + " and contact_id = " + connection.escape(contact_id) + " and lease_id = " + connection.escape(lease_id) + " ORDER BY id DESC LIMIT 1";

        console.log("findLeadByContactIdAndLeaseId :", sql);
        return connection.queryAsync(sql).then(res => res.length? res[0] : null);
    },

    findActiveByContactIdAndLeaseId: function(connection, contact_id, property_id, lease_id){

        var sql = "select * from leads where status = 'active' and property_id = " + connection.escape(property_id) + " and contact_id = " + connection.escape(contact_id) + " and lease_id = " + connection.escape(lease_id);
        console.log('findActiveByContactIdAndLeaseId: ', sql);
        return connection.queryAsync(sql).then(res => res.length? res[0] : null);
    },

    findAllByContactId: function(connection, contact_id, property_ids){
     
        var sql = `select *,
            (select first from contacts where id = leads.contact_id) as first,
            (select last from contacts where id = leads.contact_id) as last,
            (select email from contacts where id = leads.contact_id) as email,
            (select id from reservations where lease_id = leads.lease_id) as reservation_id,
            (select expires from reservations where lease_id = leads.lease_id) as reservation_expires,
            (select time from reservations where lease_id = leads.lease_id) as reservation_time,
            (select status from leases where id = leads.lease_id) as lease_status,
            (select name from properties where id = leads.property_id) as property_name,
            (select number from units where id = leads.unit_id) as lead_unit_number,
            (select unit_id from leases where id = leads.lease_id ) as lease_unit_id,
            (select number from units where id = (select unit_id from leases where id = leads.lease_id )) as lease_unit_number,
            (select property_id from units where id = (select unit_id from leases where id = leads.lease_id )) as lease_property_id,
            (select label from units where id = leads.unit_id) as unit_label,
            (select name from unit_categories where id = leads.category_id) as unit_category_name,
            (select rent from leases where id = leads.lease_id) as quoted_price,
            (SELECT upc.set_rate from unit_price_changes upc where DATE(upc.created) <= CURRENT_DATE() and upc.unit_id = leads.unit_id order by upc.id DESC limit 1) as unit_price,
            (select concat(first, ' ', last) from contacts where id = leads.created_by) as lead_created_by
            FROM leads WHERE contact_id = ${connection.escape(contact_id)}`;

        if(property_ids.length){
            sql += ` and property_id in ( ${property_ids.map(p => connection.escape(p)).join(", ")} ) `;
        }
        console.log("sql", sql); 
        
        return connection.queryAsync(sql);
    },

    findLeadSources:function(connection, company_id){
        var sql = "select DISTINCT(source) as source FROM leads WHERE source is not null and contact_id IN (select id FROM contacts WHERE company_id = " + connection.escape(company_id) + ") ";
        return connection.queryAsync(sql)
    },

    findByContactId: function(connection, contact_id){
      var sql = "SELECT * FROM leads WHERE  contact_id =  " +  connection.escape(contact_id);
      return connection.queryAsync(sql);
    },

    findByLeaseId: function(connection, lease_id){
		var sql = "SELECT * FROM leads WHERE lease_id = " +  connection.escape(lease_id);
		return connection.queryAsync(sql).then(r => r.length? r[0]: null);
	},

    saveBulk(connection, data, leads){
      var sql = "UPDATE leads set ? where contact_id in ( " + leads.map(u => connection.escape(u)).join(',') +  " )";
      return connection.queryAsync(sql, data);
    },

    findReservations(connection, company_id, properties = []) {
        var sql = `SELECT        c.first as lead_first, c.last as lead_last, r.created as reservation_time,
                                 r.id as reservation_id, r.lease_id, l.contact_id, r.expires, l.created as lead_time, ls.unit_id
                    FROM         leads l
                    INNER JOIN   contacts c on c.id = l.contact_id
                    LEFT JOIN    contact_leases cl on cl.contact_id = c.id
                    LEFT JOIN    reservations r on r.lease_id = cl.lease_id
                    LEFT JOIN    leases ls on ls.id = cl.lease_id
                    WHERE        c.company_id = ${connection.escape(company_id)}
                    AND			 l.status = 'active'
                    AND			 (r.expires >= now() OR r.created is NULL) `


        if(properties.length){
            sql += `AND         ((ls.id is NULL AND l.property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))
                    OR          ls.id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
                                )`;
        }

        sql += " ORDER BY r.id DESC";

        return connection.queryAsync(sql);
    },

    getTouchpoint(connection, touchpoint_id) {
      let sql = "Select * from lead_touchpoints where id = " + connection.escape(touchpoint_id);
      return connection.queryAsync(sql ).then(r => r.length? r[0] : []);
    },

    findContactsByLead(connection, company_id, params, properties = []) {
        params.offset =  params.offset || 0;
        params.limit =  params.limit || 50;
  
        let sql = ` SELECT 
                                c.id,
                                c.company_id,
                                c.user_id,
                                c.salutation,
                                c.status,
                                c.first,
                                c.middle,
                                c.last,
                                c.suffix,
                                c.email,
                                c.notes,
                                c.gender,
                                c.company,
                                c.ssn,
                                c.dob,
                                c.driver_license,
                                c.driver_license_city,
                                c.driver_license_state,
                                c.driver_license_country,
                                c.driver_license_exp,
                                c.active_military,
                                c.have_secondary_contact,
                                c.military_branch

                    FROM        leads l
                    INNER JOIN  contacts c ON l.contact_id = c.id
                    WHERE       c.company_id =  ${connection.escape(company_id)} `;
        sql += ` AND LOWER(l.status) ${params.status ? 'IN ('+ connection.escape(params.status) + ') ' : "NOT IN ('retired')" }`
        if(properties.length){
            sql += ` AND (l.property_id IN (${properties.map(p => connection.escape(p)).join(", ")}) OR l.unit_id IN (SELECT id FROM units WHERE property_id IN (${properties.map(p => connection.escape(p)).join(", ")})))`
        }
        sql +=  ` LIMIT ${params.offset} , ${params.limit}`;
        console.log('Contacts SQL=>',sql);
        return connection.queryAsync(sql);
    },

    async findContactsCountByLead(connection, company_id,params, properties = []) {

        let sql = ` SELECT 
                                COUNT(*) as result_count
                    FROM        leads l
                    INNER JOIN  contacts c ON l.contact_id = c.id
                    WHERE       c.company_id =  ${connection.escape(company_id)} `;
        sql += ` AND LOWER(l.status) ${params.status ? 'IN ('+ connection.escape(params.status) + ') ' : "NOT IN ('retired')" }`
        
        if(properties.length){
            sql += ` AND (l.property_id IN (${properties.map(p => connection.escape(p)).join(", ")}) OR l.unit_id IN (SELECT id FROM units WHERE property_id IN (${properties.map(p => connection.escape(p)).join(", ")})))`
        }

        console.log('Contacts count SQL=>',sql);

        r = await connection.queryAsync(sql);
        return r[0].result_count || r.result_count
    },

    async updateLeadContactId(connection, payload) {

        let sql = `
            UPDATE leads 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log('updateLeadContactId SQL:',sql);
        return await connection.queryAsync(sql);
    },

    async getConvertedLeads(connection, payload) {

        let { company_id, property_id, start_date, end_date } = payload;
        start_date = start_date || moment().format("YYYY-MM-DD");
        end_date = end_date || moment().format("YYYY-MM-DD");

        let sql = `
        select 
            p.name as facility_name, 
            cn.first as customer_first_Name, 
            cn.last as customer_last_name, 
            cn.email as customer_email, 
            cp.phone as customer_phone, 
            r.time as reservation_date, 
            l.move_in_date as expected_move_in,
            ls.start_date as actual_move_in
        from companies c
            join contacts cn on cn.company_id = c.id 
            join contact_phones cp on cp.contact_id = cn.id and ` + "cp.`primary`" +`= '1'
            join contact_leases cl on cl.contact_id = cn.id and ` + "cl.`primary`" +`= '1'
            join leads l on l.lease_id = cl.lease_id 
            join reservations r on r.lease_id = l.lease_id 
            join properties p on p.id = l.property_id 
            left outer join units u on u.id = l.unit_id 
            left outer join leases ls on ls.id = l.lease_id and ls.status = '1'
        where
            l.source = 'sparefoot'
            and c.id = ${company_id}
            and p.id  = ${property_id}
            and r.time between ${ connection.escape(start_date)} and ${ connection.escape(end_date)};`;

        console.log('getConvertedLeads for sparefoot  SQL:',sql);
        return connection.queryAsync(sql);
    }
};


models = require(__dirname + '/../models');
