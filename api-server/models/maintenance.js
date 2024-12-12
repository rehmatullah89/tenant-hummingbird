var settings    = require(__dirname + '/../config/settings.js');
var models  = {};
var moment      = require('moment');


module.exports = {

    severity: {
        1: 'Standard',
        2: 'Urgent',
        3: 'Emergency'
    },

    findCompanyId(connection, maintenance_id){
        var sql = "SELECT id, (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id))) as company_id from maintenance where id = " + connection.escape(maintenance_id);

        return connection.queryAsync(sql).then(results => {
            return results.length ? results[0].company_id : null;
        });
    },

    findPropertyId(connection, maintenance_id){
    var sql = "SELECT id, (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id)) as property_id from maintenance where id = " + connection.escape(maintenance_id);

    return connection.queryAsync(sql).then(results => results.length ? results[0].property_id : null );
  },

    findSummaryActive:function(connection, company_id, properties){
        var currentMaintenanceSql = "Select count(*) as count, severity" +
            " from maintenance where status = 'open' ";

            if(properties.length){
                currentMaintenanceSql += " and lease_id in ( select id from leases where unit_id in ( select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(',') + "))) ";
            }
            currentMaintenanceSql += " and lease_id in ( select id from leases where unit_id in ( select id from units where property_id in ( select id from properties where company_id = '" + connection.escape(company_id) + "'))) group by severity ";
        return connection.queryAsync( currentMaintenanceSql );

    },

    findById(connection, maintenance_id){
        var sql = "Select * from maintenance where id = '" + connection.escape(maintenance_id) + "' order by date desc ";

        return connection.queryAsync(sql).then(function (maintenanceRes) {
            return maintenanceRes.length ? maintenanceRes[0] : [];
        })
    },

    search(connection, conditions = {}, searchParams, company_id, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT id, severity, status, date, lease_id, " +
                " (select address from addresses where id = (select address_id from units where id = (select unit_id from leases where id = maintenance.lease_id))) as address, " +
                " (select number from units where id = (select unit_id from leases where id = maintenance.lease_id)) as unit_number, " +
                " (select city from addresses where id = (select address_id from units where id = (select unit_id from leases where id = maintenance.lease_id))) as city, " +
                " (select state from addresses where id = (select address_id from units where id = (select unit_id from leases where id = maintenance.lease_id))) as state, " +
                " (select content from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1) as last_message, " +
                " (select CONCAT(first, ' ', last) from contacts where id = (select contact_id from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1)) as last_sender, " +
                " (select date from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1) as last_message_date ";
        }

        sql += " FROM maintenance where 1 = 1 " ;

        if(conditions.severity && conditions.severity.length){
            sql += ' and LOWER(severity) in (' + conditions.severity.map(s => connection.escape(s)).join(', ') + ')';
        }

        if(conditions.status && conditions.status.length){
            sql += ' and LOWER(status) in (' + conditions.status.map(s => connection.escape(s)).join(', ') + ')';
        }

        if(conditions.lease_id){
            sql += ' and lease_id = ' + connection.escape(conditions.lease_id);
        }

        if(conditions.property_id && conditions.property_id.length){
            sql += ' and (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id))  in (' + connection.escape(conditions.property_id) + ")";
        }


        if(conditions.unit_id){
            sql += ' and (select unit_id from leases where id = maintenance.lease_id)  = ' + connection.escape(conditions.unit_id);
        }


        if(conditions.search){
            sql += ' and maintenance.id in (select maintenance_id from submessages where LOWER(content) like ' + connection.escape("%" + conditions.search.toLowerCase() + "%") + ') ';
        }


        sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id)+ "))) ";


        if(searchParams){

            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){
                    case 'last_response':
                        sql += " (select date from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1) ";
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

    findByLeaseId(connection, lease_id, status){
        var sql = "Select * from maintenance where lease_id = " + connection.escape(lease_id);

        if(status) sql += " and status = " + connection.escape(status.toLowerCase());

        sql += " order by date desc ";

        return connection.queryAsync(sql);
    },

    findRequestTypeById: function(connection, requestTypeId){

        var sql = "Select * from maintenance_types where id = " + connection.escape(requestTypeId);
        return connection.queryAsync(sql).then(function (requestTypeRes) {
            return requestTypeRes.length ? requestTypeRes[0] : [];
        })
    },

    markRead(connection, maintenance_id){
        var sql = "UPDATE submessages set `read` = 1 where maintenance_id = " + connection.escape(maintenance_id);
        return connection.queryAsync(sql);
    },

    getActiveChats(connection, company_id){
        var chat_sql = "Select *, " +
            "(select first from contacts where maintenance.contact_id = contacts.id) as first, " +
            "(select last from contacts where maintenance.contact_id = contacts.id) as last, " +
            "(select contact_id from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1 ) as last_contact_id, " +
            "(select content from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1 ) as last_message, " +
            "(select date from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1 ) as last_message_date, " +
            "(select `read` from submessages where submessages.maintenance_id = maintenance.id order by date desc limit 1 ) as last_message_read " +
            " from maintenance where lower(type) = 'sms' and contact_id in (select id from contacts where company_id = " + connection.escape(company_id) + ") order by date desc";
        console.log(chat_sql);
        return connection.queryAsync(chat_sql);

    },

    findMaintenanceById: function(connection, maintenance_id){
        var maintenance;
        var currentMaintenanceSql = "Select *, " +
            " (select email from users where maintenance.user_id = users.id ) as email, " +
            " (select type from users where maintenance.user_id = users.id ) as user_type " +
            " from maintenance where id = '" + connection.escape(maintenance_id) + "' order by date desc ";

        return connection.queryAsync( currentMaintenanceSql ).then(function(maintenanceRes){
            maintenance = maintenanceRes[0];

            return Lease.findById(connection, maintenance.lease_id, {'Tenants':{ }}).then(function(lease){

                maintenance.Lease = lease || {};
                return models.Unit.findById(connection, maintenance.Lease.unit_id, {'Address': {} } );
            }).then(function(unit){
                maintenance.Lease.Unit = unit || {};
                return this.getUserDetails(connection, maintenance.user_type, maintenance.user_id).then(user => {
                    maintenance.User = user;
                    return maintenance;
                });
            });
        });
    },

    findOpenTickets: function(connection, searchParams, company_id){
        var openTicketSql = "Select *, " +
            " (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = maintenance.lease_id))) as company_id, " +
            " (select address from addresses where id  = (select address_id from properties where id = (select property_id from units where id = ( select unit_id from leases where id = maintenance.lease_id  )))) as address, " +

            " (select city from addresses where id  = (select address_id from properties where id = (select property_id from units where id = ( select unit_id from leases where id = maintenance.lease_id  )))) as city, " +

            " (select state from addresses where id  = (select address_id from properties where id = (select property_id from units where id = ( select unit_id from leases where id = maintenance.lease_id  )))) as state, " +

            " (select zip from addresses where id  = (select address_id from properties where id = (select property_id from units where id = ( select unit_id from leases where id = maintenance.lease_id  )))) as zip, " +


            " (select number from  units where id = ( select unit_id from leases where id = maintenance.lease_id  )) as number, " +
            " (select email from users where maintenance.user_id = users.id ) as email, " +
            " (select type from users where maintenance.user_id = users.id ) as user_type " +
            " from maintenance where status = 'open'" +
            " having company_id = " + connection.escape(company_id) +
            " order by date DESC limit " + connection.escape(parseInt(searchParams.offset)) + ", " + connection.escape(parseInt(searchParams.limit));


        return connection.queryAsync( openTicketSql );
        /*


        return connection.queryAsync( openTicketSql ).map(function(maintenance){

            return this.getUserDetails(connection, maintenance.user_type, maintenance.user_id).then(user => {
                maintenance.User = user;
                return maintenance;
            });
        });
        */
    },

    findOpenThread(connection, type, contact_id){
        var sMsgSql = "Select * from maintenance where status = 'open' and type = " + connection.escape(type) + " and contact_id = " + connection.escape(contact_id) + ' limit 1';

        return connection.queryAsync(sMsgSql).then((sm)=>{
            return sm.length ? sm[0] : null;
        });


    },


    findOpenTicketCount:function(connection, company_id){

        var currentCountSql = "Select count(*) as count from maintenance where status = 'open' " +
            " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( select id from properties where company_id =  " + connection.escape(company_id) + ")))";
        return connection.queryAsync( currentCountSql ).then(function(currentCountRes){
            return currentCountRes[0].count;
        })
    },

    findSubmessageById: function(connection, maintenance_id, submessage_id){
        var _this = this;
        var sMsgSql = "Select * from submessages where ";

        if(submessage_id){
            sMsgSql += "id = " + connection.escape(submessage_id);
        } else {
            sMsgSql += " maintenance_id = " + connection.escape(maintenance_id) + " order by date asc";
        }

        return connection.queryAsync(sMsgSql).then((sm)=>{
            return sm.length ? sm[0] : null;
        });
    },

    saveMaintenance: function(connection, maintenance, id){

        var maintenanceSql;

        if(typeof id != 'undefined' && id){
            maintenanceSql = "update maintenance set ? where id = " + connection.escape(id);
        } else {
            maintenanceSql = "Insert into maintenance set ?";
        }

        return connection.queryAsync(maintenanceSql, maintenance)
            .then(result =>  id || result.insertId)

    },

    saveSubmessage: function(connection, subMessage, id){
        var subMessageSql = "";
        if(typeof id != 'undefined' && id){
            subMessageSql = "update submessages set ?";
        } else {
            subMessageSql = "Insert into submessages set ?";
        }




        return connection.queryAsync(subMessageSql, subMessage).then(function(result){
            return id || result.insertId;
        })
    },

    findThread:function(connection, maintenance_id){
        var sMsgSql = "Select * from submessages where maintenance_id = " + connection.escape(maintenance_id) + " order by date DESC, id DESC";

        return connection.queryAsync(sMsgSql);

    },

    findBreadcrumb:function(connection, maintenance, company_id){

        var unit, property;
        var breadcrumbs = [];

        return Unit.findByLeaseId(connection, maintenance.lease_id,  {'Address': {}}  ).then(function(unitRes){
            if(!unitRes) throw "Unit not found";
            unit = unitRes;

            return Property.findById(connection, unit.property_id, company_id, {});
        }).then(function(propertyRes){
            if(!propertyRes) throw "Property not found";
            property = propertyRes;

            breadcrumbs.push({
                name: unit.Address.address + ' ' + unit.Address.city + ' ' + unit.Address.state + ' ' + unit.Address.zip,
                href: '/properties/view/'+ property.id +'/units'
            });
            breadcrumbs.push({
                name: "Unit #" + unit.number,
                href: '/units/view/'+ unit.id
            });
            breadcrumbs.push({
                name: "Lease",
                href: '/leases/'+ maintenance.lease_id
            });
            breadcrumbs.push({
                name: "Maintenace Request #"+maintenance.id,
                href: ""
            });

            return breadcrumbs;
        });
    },

    findMaintenanceOpenedByPeriod:function(connection, company_id,  start, end){

        var _this = this;
        var periodEnd = moment(end, "MM/DD/YYYY");
        var periodStart = moment(start, "MM/DD/YYYY");
        var sql  = "Select * from maintenance where " +
            " ( select company_id from properties where id = " +
            "   ( select property_id from units where id = " +
            "       ( select unit_id from leases where id = maintenance.lease_id ))) = " + connection.escape(company_id)  +
            " and date <= " + connection.escape(periodEnd.format('YYYY-MM-DD HH:mm:ss')) + " and date > " + connection.escape(periodStart.format('YYYY-MM-DD 00:00:00')) + " order by date asc";



        return connection.queryAsync(sql);
    },

    findMaintenanceResolvedByPeriod:function(connection, company_id, start, end){

        var _this = this;
        var periodEnd = moment(end, "MM/DD/YYYY");
        var periodStart = moment(start, "MM/DD/YYYY");

        var sql  = "Select * from maintenance where status = 'resolved' and " +
            " (select company_id from properties where id = " +
            " ( select property_id from units where id = " +
            " ( select unit_id from leases where id = " +
            " maintenance.lease_id ))) = " + connection.escape(company_id)  +
            " and id in (select maintenance_id from submessages where label = 'resolved' and " +
            " submessages.date <= " + connection.escape(periodEnd.format('YYYY-MM-DD HH:mm:ss')) + " and submessages.date > " + connection.escape(periodStart.format('YYYY-MM-DD 00:00:00')) + ")";

        return connection.queryAsync(sql);
    },

    findAddressByMaintenanceId(connection, maintenance_id){


        var sql = "select number, " +
            " (select address from addresses where addresses.id = units.address_id) as address, " +
            " (select city from addresses where addresses.id = units.address_id) as city, " +
            " (select state from addresses where addresses.id = units.address_id) as state, " +
            " (select zip from addresses where addresses.id = units.address_id) as zip " +
            " from units where id = (select unit_id from leases where id = (select lease_id from maintenance where id = " + connection.escape(maintenance_id) + "))";

        return connection.queryAsync(sql).then(r => r.length? r[0] : null);

    }

};

models = require(__dirname + '/../models');
