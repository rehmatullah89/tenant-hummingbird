var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');
var Promise = require('bluebird');

var models  = {};


module.exports = {

    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "update leads set ?  where id = " + connection.escape(id);
        } else {
            sql = "insert into leads set ?";
        }
        
        return connection.queryAsync(sql, data);
    },

    delete: function(connection, id){
        var sql;
        sql = "update leads set status = 'deleted'  where id = " + connection.escape(id);

        return connection.queryAsync(sql);
    },

    search(connection, conditions = {}, searchParams, company_id, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  " +
                 "(select concat(first, ' ' , last) from contacts where id = leads.contact_id) as name, " +
                 "(select address from addresses where id = (select address_id from properties where id = leads.property_id)) as address, " +
                 "(select city from addresses where id = leads.property_id) as city, " +
                 "(select state from addresses where id = leads.property_id) as state, " +
                 "(select zip from addresses where id = leads.property_id) as zip, " +
                 "(select number from units where id = leads.unit_id) as number, " +
                 "(select name from unit_categories where id = leads.category_id) as category_name, " +
                "(select email from contacts where id = leads.contact_id) as email, " +
                "(select phone from contact_phones where contact_id = leads.contact_id order by id asc limit 1) as phone ";
        }

        sql += " FROM leads where 1 = 1 and status != 'deleted' " ;
        sql += " and (select company_id from contacts where id = leads.contact_id) = " + connection.escape(company_id);



        if(conditions.source && conditions.source.length){
            sql += ' and LOWER(source) in (' + conditions.source.map(s => connection.escape(s)).join(', ') + ')';
        }

        if(conditions.status && conditions.status.length){
            sql += ' and LOWER(status) in (' + conditions.status.map(s => connection.escape(s)).join(', ') + ')';
        } else {
            sql += ' and LOWER(status) not in ("archived")';
        }

        if(conditions.name){
            sql += " and (" +
                "(select concat(first, ' ' , last) from contacts where id = leads.contact_id) like " + connection.escape("%" + conditions.name + "%") +
                " OR (select email from contacts where id = leads.contact_id) like " + connection.escape("%" + conditions.name + "%") +
                " OR leads.contact_id in (select contact_id from contact_phones where phone like  " + connection.escape("%" + conditions.name + "%") + ")" +
                ") ";
        }

        // if(conditions.email){
        //     sql += " and (select email from contacts where id = leads.contact_id) = " + connection.escape(conditions.email);
        // }

        if(conditions.property_id && conditions.property_id.length){
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
            sql += searchParams.offset;
            sql += ", ";
            sql += searchParams.limit;
        }

        console.log(sql);

        return connection.queryAsync(sql);
    },

    findLeads: function(connection, company_id, unread, property_id){

        var sql = "select * from leads where status != 'deleted' and (select company_id from contacts where contacts.id = leads.contact_id)  = " + connection.escape(company_id);

        if(property_id) {
            sql += " and ( leads.property_id = "  + connection.escape(property_id) + " or leads.unit_id in (select id from units where property_id = " + connection.escape(company_id) + ")) ";
        }

        if(unread) sql += ' and status = "new" ';
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

    findLeadSources:function(connection, company_id){
        var sql = "select DISTINCT(source) as source FROM leads WHERE source is not null and contact_id IN (select id FROM contacts WHERE company_id = " + connection.escape(company_id) + ") ";
        return connection.queryAsync(sql)
    },

    async retireLeadsOlderThanDays(connection, daysAgo, property_id, company_id) {
        let older_leads_sql = `
        select l.id as lead_id
        from leads l
            inner join contacts c on c.id = l.contact_id
            left join interactions i on i.contact_id = l.contact_id
                and DATE_SUB(CURDATE(), INTERVAL ${connection.escape(daysAgo)} day) < DATE(i.created)
            left join interactions i2 on i2.entered_by = l.contact_id
                and DATE_SUB(CURDATE(), INTERVAL ${connection.escape(daysAgo)} day) < DATE(i2.created)
        where l.status = 'active' 
            and DATE_SUB(CURDATE(), INTERVAL ${connection.escape(daysAgo)} day) > DATE(l.modified)
            and l.property_id = ${connection.escape(property_id)}
            and c.company_id = ${connection.escape(company_id)}
            and i.id is null
            and i2.id is null
        group by l.id;`;

        console.log("retireLeadsOlderThanDays - older_leads_sql: ", older_leads_sql);

        let older_leads_res = await connection.queryAsync(older_leads_sql);
        if (older_leads_res?.length === 0)
            return null;

        let older_lead_ids = older_leads_res.map(ol => ol.lead_id);
        let update_older_leads_sql = `Update leads set status = 'retired', retire_reason = 'Auto retired due to inactivity' where id in (${older_lead_ids.map(ol_id => connection.escape(ol_id)).join(', ')});`;
        console.log("retireLeadsOlderThanDays - update_older_leads_sql: ", update_older_leads_sql);
        return await connection.queryAsync(update_older_leads_sql);
    }
};


models = require(__dirname + '/../models');