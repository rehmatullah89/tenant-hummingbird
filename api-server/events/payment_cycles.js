'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Contact  = require('../classes/contact.js');
var Lease  = require('../classes/lease.js');
var Delinquency  = require('../classes/delinquency.js');
var Trigger  = require('../classes/trigger.js');

const getQueue = require("../modules/queue.js");
const Queue = getQueue('hummingbirdQueue');

var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');

const PaymentCycleEvents = {

	/*
	* Sets all leads on a lease to Converted, and sets the lease_id
	* lease
	* Company
	* Contact
	* Api
	 */
    revertPaymentCycle: async (lease, contact, company,  cid) => {
        try {
            
            var connection = await db.getConnectionByType('write', null, cid)
            await lease.getPastDueInvoices(connection);
            if(!lease.PastDue.length) return;
            let invoice = lease.PastDue.find(i => i.InvoiceLines.find(il => il.Product.default_type === 'rent')); 
            if(!invoice) return;
 
            
            await Queue.add('revert_payment_cycle', {
                cid: cid,
                property: {id: invoice.property_id, company_id: company.id},
                date: invoice.date,
                dryrun: false,
                
                lease_id: lease.id,
                admin: contact,
                priority: 10,
            }, {priority: 10});


        } catch(err){
            console.log(err); 
        }
            await db.closeConnection(connection);
    }, 

	checkPaymentCycle: async payload => {
        
    	var connection = await db.getConnectionByType('write', null, payload.cid)
		try {
            
            // invoice_created      invoice, leases, leases, lease/invoice, lease/invoice
            // payment_unapplied    contact
            // payment_deleted      contact, payment
            // payment_refunded     contact, payment

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
            
            for(let i = 0; i < leases.length; i++ ){
                try {
                    let lease = leases[i];
                    if(lease.end_date && moment(lease.end_date, 'YYYY-MM-DD').format('x') < moment().format('x') ) continue; 
                    await lease.getPastDueInvoices(connection);
                    
                    if(!lease.PastDue.length) continue;
                    // find first invoice with a rent service. 
                    let invoice = lease.PastDue.find(i => i.InvoiceLines.find(il => il.Product.default_type === 'rent')); 
                    
                    if(!invoice) continue;
                    console.log("We have a payment Cycle, lets check back in 15 miintues")
                    setTimeout( () => PaymentCycleEvents.revertPaymentCycle(lease, payload.contact, payload.company, payload.cid), 1000 * 60 * 15) ;

                } catch(err) {
                    console.log("err", err)
                }
            }
			if(!payload.lease) return;
			
			
		} catch(err){
			console.log(err);
		}
		await db.closeConnection(connection);
    } 
}

module.exports = PaymentCycleEvents;
