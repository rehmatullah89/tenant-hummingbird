'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Contact  = require('../classes/contact.js');
var Lease  = require('../classes/lease.js');
var Delinquency  = require('../classes/delinquency.js');
var models  = require('../models');
var Trigger  = require('../classes/trigger.js');

const getQueue = require("../modules/queue.js");
const Queue = getQueue('hummingbirdQueue');

var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');

const DelinquencyEvents = {

	/*
	* Sets all leads on a lease to Converted, and sets the lease_id
	* lease
	* Company
	* Contact
	* Api
	 */
    createNewDelinquency: async (lease, contact, company,  cid, invoice = null) => {
        try {

            var connection = await db.getConnectionByType('write', null, cid)
            if(!invoice) {
                await lease.getPastDueInvoices(connection);
                if(!lease.PastDue.length) return;
                let invoice = lease.PastDue.find(i => i.InvoiceLines.find(il => il.Product.default_type === 'rent')); 
                if(!invoice) return;
            }

            const delayTime = 1000 * 60 * 15;
            // write to scheudler to run all for a delinquency
            console.log('Add delinquency - Add run_trigger_routine to queue');
            await Queue.add('run_trigger_routine', {
                cid: cid,
                property: {id: invoice.property_id, company_id: company.id},
                date: null,
                dryrun: false,
                type: "Lease",
                lease_id: lease.id,
                admin: contact,
                priority: 10,
                action_source: ENUMS.DELINQUENCY_SOURCE.MANUAL
            }, {priority: 1, delay: delayTime});

        } catch(err){
            console.log(err); 
        }
        await db.closeConnection(connection);
    }, 

    updateDelinquency: async payload => {
        try {

            if(!payload.adjust_info) return;
            
            var connection = await db.getConnectionByType('write', null, cid)
    
            let old_invoice_id = payload.invoice.id
            let new_invoice_id = payload.adjust_info.id;
            await models.Delinquency.swapInvoiceIds(connection, old_invoice_id, new_invoice_id)
        
        } catch(err){
			console.log(err);
		}
		await db.closeConnection(connection);


    }, 
	addDelinquency: async payload => {

    	var connection = await db.getConnectionByType('write', null, payload.cid)
		try {
            
            // invoice_created      invoice, leases, leases, lease/invoice, lease/invoice
            // payment_unapplied    contact
            // payment_deleted      contact, payment
            // payment_refunded     contact, payment

            console.log('Add delinquency event Started: ', payload);

            let leases = [];

            if(payload.leases){
                leases = payload.leases;
            } else if (payload.lease){
                leases.push(payload.lease)
            } else if (payload.invoice){
                let lease = new Lease({id: payload.invoice.lease_id}); 
                await lease.find(connection); 
                leases.push(lease)
            } else if (payload.payment){
                let contact = new Contact({
                    id: payload.payment.contact_id
                });
                await contact.find(connection);
                await contact.getLeases(connection);
                
                leases = contact.Leases; 
            }
            
            console.log('Add delinquency - found leases: ', leases);
            
            for(let i = 0; i < leases.length; i++ ){
                try {
                    let lease = leases[i];
                    if(lease.end_date && moment(lease.end_date, 'YYYY-MM-DD').format('x') < moment().format('x') ) continue; 
                    await lease.getPastDueInvoices(connection);

                    if(!lease.PastDue.length) continue;
                    // find first invoice with a rent service. 
                    let invoice = lease.PastDue.find(i => i.InvoiceLines.find(il => il.Product.default_type === 'rent'));

                    if(!invoice) continue;

                    console.log(`Add delinquency - found past due rent invoices of lease-${lease.id}: `, invoice);
                    
                    await lease.getDelinquency(connection);

                    if(lease.Delinquency.id) continue;
                    console.log('Add delinquency - no active delinquency, creating new delinquency');
                    DelinquencyEvents.createNewDelinquency(lease, payload.contact, payload.company, payload.cid, invoice);

                } catch(err) {
                    console.log("err", err)
                }
            }
            console.log('Add delinquency event Finished: ');
			if(!payload.lease) return;
			
			
		} catch(err){
			console.log(err);
		}
		await db.closeConnection(connection);
    }, 

    /*
	    * Sets all leads on a lease to Converted, and sets the lease_id
	    * lease
	    * Company
	    * Contact
	    * Api
	*/
	removeDelinquency: async payload => {

    	var connection = await db.getConnectionByType('write', null, payload.cid)
        
        try {
            
            // invoice_voided lease
            // payment_created invoiceLeases
            // payment_applied leases, leases, leases
            

            let leases = payload.invoiceLeases && payload.invoiceLeases.length ? payload.invoiceLeases : payload.leases && payload.leases.length ? payload.leases :  [ payload.lease ]; 
            
            // is lease past due?         
            for(let i = 0; i < leases.length; i++){
                
                let lease = new Lease({id: leases[i].id}); 
                await lease.find(connection); 
                await lease.getCurrentBalance(connection); 
        
                if( (!lease.end_date || moment(lease.end_date, 'YYYY-MM-DD').format('x') > moment().format('x') )  && lease.balance > 0) continue;  
            
                // end delinquency if there is no balance or if lease is closed
                await lease.getDelinquency(connection, null, true); 
            
                if(lease.Delinquency.id){
                    // We have an active delinquency
                    await lease.endDelinquency(connection);
                }
            }
    	
		} catch(err){
			console.log("removeDelinquency", err);
		}
		await db.closeConnection(connection);
	},

    async endDelinquency(payload) {
        try {
            let { res, lease_ids, contact_id, lease_event_type } = payload;
            const { local_company_id, contact: admin_contact } = res.locals;
            console.log('End delinquency event: ', payload);

            const cid = res.locals.company_id;
            var connection = await db.getConnectionByType("write", null, cid);

            const errors = [], updatedLeaseIds = [];
            for (let lease_id of lease_ids) {
                const lease = new Lease({ id: lease_id });
                await lease.find(connection);
                await lease.getCurrentBalance(connection);
                console.log(`lease_id ${lease_id} balance: `, lease.balance);


                // check delinquency first
                let getActiveDelinquecyWithLeaseId = await models.Delinquency.findByLeaseId(connection, lease_id);
                if(getActiveDelinquecyWithLeaseId && lease.balance == 0 && lease_event_type != ENUMS.LEASE_AUCTION_STATUS.MOVE_OUT && lease.auction_status != ENUMS.LEASE_AUCTION_STATUS.AUCTION_PAYMENT && lease.auction_status != ENUMS.LEASE_AUCTION_STATUS.MOVE_OUT){
                    await lease.createLockRemovalTaskOnToOverLockState(connection);
                }    
                
                if(lease.balance == 0 || (typeof lease_event_type !== 'undefined' && lease_event_type == ENUMS.LEASE_AUCTION_STATUS.MOVE_OUT)) {
                    const { are_actions_execueted, errors: actions_errors } = await lease.endDelinquencyProcess(connection, { res, contact_id: contact_id, lease_event_type: lease_event_type }) || {};
                    if (are_actions_execueted) {
                        updatedLeaseIds.push({ id: lease_id });
                        errors.push(...actions_errors);
                    }
                }

                
            }

            if (updatedLeaseIds?.length) {
                const { id: admin_contact_id = null } = admin_contact;
                let socket = new Socket({
                    company_id: local_company_id,
                    contact_id: admin_contact_id,
                });

                let connected = await socket.isConnected(admin_contact_id);
                console.log("Checking socket connection..", connected);
                if (connected) {
                    console.log('Update leases via socket: ', Hash.obscure({
                        leases: updatedLeaseIds
                    }, { company_id: cid }))

                    await socket.createEvent('delinquency_actions_update', Hash.obscure({
                        leases: updatedLeaseIds
                    }, { company_id: cid }));
                }
            }

            if (errors.length) {
                throw errors
            }
        } catch (err) {
            console.log('End delinquency event error: ', err);
            utils.sendEventLogs({
                eventName: ENUMS.LOGGING.RESET_DELINQUENCY_ACTIONS,
                data: payload,
                error: err
            });
        } finally {
            console.log('End delinquency event done!');
            await db.closeConnection(connection);
        }
    }
}

module.exports = DelinquencyEvents

const ENUMS = require(__dirname + '/../modules/enums.js');

const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
const Socket = require('../classes/sockets');