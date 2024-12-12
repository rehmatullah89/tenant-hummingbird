'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var Enums = require('./../modules/enums.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Todo  = require(__dirname + '/../classes/todo.js');
var _Task = require(__dirname + '/../classes/task');
var models  = require('../models/index.js');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var Lease  = require(__dirname + '/../classes/lease.js');
var Charm = require('./charm.js');

const Task = {

    async createTask(params, object_id, event_type, event_title, event_details, event_duration, task_type, event_end_date){

      var connection = await db.getConnectionByType('write', null, params.cid);

        let contact_id = params.user? params.user.id: params.contact.id;
        try {
            let task = new _Task({
                'company_id': params.company.id,
                'event_type': event_type,
                event_title,
                event_details,
                event_duration,
                task_type,
                'created_by': contact_id,
                'object_id': object_id,
                event_end_date,
            });

            const todo_id = await task.save(connection, params.company.id);

            if (event_type === Enums.EVENT_TYPES.LEAD.NEW_RESERVATION) {
                Charm.notifyReservation(params, todo_id);
            }
        }catch(err){
            console.log(err);
        }

        //Send socket notification
        let admins = [];

        if(contact_id){
            admins.push({contact_id})
        } else { 
            // let property = await models.Property.findByLeaseId(connection, lease_id);
            admins = await Contact.findAdminsByPropertyId(connection, params.company.id, params.property.id);
        }
        console.log("admins", admins);
        for(let i = 0; i < admins.length; i++){
            let socket = new Socket({
                company_id: params.company.id,
                contact_id: admins[i].contact_id
            });
            await socket.createEvent("taskCreated", true);
        }

        await db.closeConnection(connection);
    },

    async createLockRemovalTask(params){
       
        let leases = params.invoiceLeases ? params.invoiceLeases : params.invoice_leases ? params.invoice_leases : params.leases ? params.leases : params.lease ? [params.lease] : [];
        let closeLease =  params.closeLease;
       
        var connection = await db.getConnectionByType('write', null, params.cid);
        let current_lease_id = 0;
        try{
            for(let i = 0 ; i < leases.length; i++ ){
                let lease = new Lease({id: leases[i].id}) ;
                await lease.find(connection);
                await lease.getCurrentBalance(connection);
                
                
                if((closeLease ? closeLease : lease.balance === 0) && current_lease_id !== lease.id){
        
                    current_lease_id = lease.id;
                    console.log("lockRemovalTask Lease ", current_lease_id);
                    
                    if(JSON.stringify(lease.Unit) === JSON.stringify({})){
                        await lease.findUnit(connection);
                    }    
                    let overlock = await lease.Unit.getActiveOverlock(connection);
                
                    if(overlock){

                        console.log("overlock found for lease", current_lease_id);

                        await lease.Unit.getProperty(connection);
                        await lease.Unit.Property.getAccessControl(connection);

                        console.log("Access Control found for lease", current_lease_id);
                        // if is Noke, don't create the task, just unlock, and save lease status
                        if(lease.Unit.Property.Access.access_name.toLowerCase() === 'noke'){
                            await lease.Unit.removeOverlock(connection);
                            console.log("Lock removed  for lease...", current_lease_id);
                        } else {
                            let already_created = await models.Todo.findTasksByObjectId(connection,lease.id,[Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL],Enums.TASK_TYPE.LEASE, params.company.id);
                            if(!already_created.length){
                                Task.createTask(params, lease.id, Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL, null, null, null, Enums.TASK_TYPE.LEASE);
                                console.log("LockRemovalTask Created for lease", current_lease_id)
                            }
                        }
                    }
                    await models.Lease.save(connection, {to_overlock: 0}, lease.id);
                }
            }
        }catch(err){
            console.log(err);
        }

        await db.closeConnection(connection);
    }, 

    async removeDelinquencyTasks(params){
        console.log("remove Delinquency Tasks") 
        let leases = params.invoiceLeases ? params.invoiceLeases : params.invoice_leases ? params.invoice_leases : params.leases ? params.leases : params.lease ? [params.lease] : [];
        console.log("leases", leases) 
        var connection = await db.getConnectionByType('write', null, params.cid);
        let current_lease_id = 0;
        try{
            for(let i = 0 ; i < leases.length; i++ ){
                let lease = new Lease({id: leases[i].id}) ;
                console.log("lease", lease) 
                await lease.find(connection);
                await lease.getCurrentBalance(connection);
                
                console.log("lease.balance", lease.balance) 
                console.log("current_lease_id", current_lease_id, lease.id) 
                if(lease.balance === 0 && current_lease_id !== lease.id){
                    
                    current_lease_id = lease.id;
                    
                    await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.COLLECTION_CALL, Enums.TASK_TYPE.LEASE, params.user.id);
                    await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, Enums.TASK_TYPE.LEASE, params.user.id);
                    
                    
                    console.log("lease.auction_status", lease.auction_status, Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT, Enums.LEASE_AUCTION_STATUS.MOVE_OUT) 
                    if (lease.auction_status && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.MOVE_OUT) {
                        console.log("DISMISS LEASE AUCTION stuff") 
                        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, params.user.id);
                        // THis is incorrectly setting status back to auction. Dont want to break existing implementation, so Im just settings auction status to null
                        // await lease.updateAuctionStatus(connection, null);
                        await  models.Lease.updateAuctionStatus(connection, null, lease.id);
                    }    

                }
            }
        }catch(err){
            console.log(err);
        }

        await db.closeConnection(connection);

    }
}

module.exports = Task;
