'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var Enums = require('./../modules/enums.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var models  = require('../models/index.js');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var Lease  = require(__dirname + '/../classes/lease.js');

const Notification = {

    async newLease(params){
        // only notify on web leases.  
        // Once API Keys are removed, get contact and see if its an application, then send web lead.  
        if(params.user.type !== 'application') return;
        var connection = await db.getConnectionByType('read', null, params.cid);

        //Send socket notification
        let admins = await Contact.findAdminsByPropertyId(connection, params.company.id, params.property.id);
            
        for(let i = 0; i < admins.length; i++){
           
            let socket = new Socket({
                company_id: params.company.id,
                contact_id: admins[i].contact_id
            });
            try{
            
                let payload = Hash.obscure({
                    contact_id: params.lease.Tenants[0].contact_id,
                    first: params.lease.Tenants[0].Contact.first,
                    last: params.lease.Tenants[0].Contact.last,
                    unit_id: params.lease.unit_id,
                    unit_number: params.unit.number,
                    property_id: params.unit.property_id,
                    lease_id: params.lease.id
                }, {company_id: params.cid})
                try{
                    await socket.createEvent("new_lease", payload);
                } catch(err){

                }
                
            } catch(err){
                console.log(err);
            }
            
        }   

        await db.closeConnection(connection);
    },

    async newReservation(params){
        // only notify on web reservations.  
        // Once API Keys are removed, get contact and see if its an application, then send web lead.  
        if(params.user.type !== 'application') return;

        var connection = await db.getConnectionByType('read', null, params.cid);

        //Send socket notification
        let admins = await Contact.findAdminsByPropertyId(connection, params.company.id, params.property.id);
    
        for(let i = 0; i < admins.length; i++){
           
            let socket = new Socket({
                company_id: params.company.id,
                contact_id: admins[i].contact_id
            });

            try {

                let payload = Hash.obscure({
                    contact_id: params.lease.Tenants[0].contact_id,
                    first: params.lease.Tenants[0].Contact.first,
                    last: params.lease.Tenants[0].Contact.last,
                    unit_id: params.lease.unit_id,
                    unit_number: params.unit.number,
                    property_id: params.unit.property_id,
                    lease_id: params.lease.id,
                    expires: params.reservation.expires,
                    reservation_id: params.reservation.id,
                    reservation_time: params.reservation.time
                }, {company_id: params.cid})
                try{
                    await socket.createEvent("new_reservation", payload);
                } catch(err){

                }
            } catch(err){
                console.log(err);
            }
            
        }   

        await db.closeConnection(connection);
    },

    async newLead(params){
        // only notify on web leads.  
        // Once API Keys are removed, get contact and see if its an application, then send web lead.  
        
        if(params.user && params.user.type && params.user.type !== 'application') return;
        

        var connection = await db.getConnectionByType('read', null, params.cid);
    
        //Send socket notification
        let admins = await Contact.findAdminsByPropertyId(connection, params.company.id, params.lead.property_id);
        
        for(let i = 0; i < admins.length; i++){
            let socket = new Socket({
                company_id: params.company.id,
                contact_id: admins[i].contact_id
            });
            
            try {
                let payload = Hash.obscure({
                    lead_id: params.lead.id,
                    contact_id: params.lead.contact_id,
                    first: params.contact.first,
                    last: params.contact.last,
                    property_id: params.lead.property_id
                }, {company_id: params.cid})
                try {
                    await socket.createEvent("new_web_lead", payload);
                } catch(err){

                }
            } catch(err){
                console.log(err);
            }
            
        }   

        await db.closeConnection(connection);
    },
}

module.exports = Notification;
