'use strict';

var pool = require(__dirname + '/../modules/db.js');
var Enums = require('./../modules/enums.js');
var utils    = require(__dirname + '/../modules/utils.js');
var models  = require('../models/index.js');
var Lease  = require(__dirname + '/../classes/lease.js');
var Task = require(__dirname + '/../classes/task');
var Contact = require(__dirname + '/../classes/contact');
var Socket = require(__dirname + '/../modules/sockets');
var db = require(__dirname + '/../modules/db_handler.js');


const TaskEvent = {
    async createTask(params, object_id, event_type, event_title, event_details, event_duration, task_type, event_end_date){

        let connection = params?.connection || await db.getConnectionByType('write', params.cid, null, "createTask");
        console.log('createTask connection ', connection.threadId);
        console.log('createTask params ', params);
        let contact_id = params.user? params.user.id: params.contact? params.contact.id :null;
        try {
            let task = new Task({
                'company_id': params.company_id,
                'event_type': event_type,
                event_title,
                event_details,
                event_duration,
                task_type,
                'created_by': contact_id,
                'object_id': object_id,
                'details': 'This task is created from worker server',
                event_end_date,
            });

            await task.save(connection, params.company_id);
        } catch(err){
            console.log('createTask err ', err);
            console.log(err);
        }

        // NOTE: This code/feature needs to be tested, it is causing some issue so commenting this 
        // Send socket notification
        /* let admins = [];

        if(contact_id){
            admins.push({contact_id})
        } else {
            admins = await Contact.findAdminsByPropertyId(connection, params.company_id, params.property_id);
        }

        for(let i = 0; i < admins.length; i++){
            let socket = new Socket({
                company_id: params.company_id,
                contact_id: admins[i].contact_id
            });
            await socket.createEvent("taskCreated", true);
        }*/

        if(!params?.connection) {
            await db.closeConnection(connection);
        }
    },
    
    async createLockRemovalTask(params){

        let leases = params.invoice_leases ? params.invoice_leases : params.leases ? params.leases : params.lease ? [params.lease] : [];

        console.log('createLockRemovalTask params ', params);
        let connection = await db.getConnectionByType('write', params.cid, null, "createLockRemovalTask");
        let current_lease_id = 0;
        try{
            for(let i = 0 ; i < leases.length; i++ ){
                let lease = new Lease({id: leases[i].id}) ;
                await lease.find(connection);
                await lease.getCurrentBalance(connection);
                
                if(lease.balance === 0 && current_lease_id !== lease.id){
                    current_lease_id = lease.id;
                    
                    if(JSON.stringify(lease.Unit) === JSON.stringify({})){
                        await lease.findUnit(connection);
                    }
                    let overlock = await lease.Unit.getActiveOverlock(connection);
                    
                    if(overlock){
                        TaskEvent.createTask(params, lease.id, Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL, null, null, null, Enums.TASK_TYPE.LEASE);
                        await models.Lease.save(connection, { to_overlock: 0 }, lease.id);
                    }
                }
            }
        } catch(err){
            console.log('createLockRemovalTask error ', err);

        }

        await db.closeConnection(connection);
    }
}

module.exports = TaskEvent;