'use strict';

var Accounting =  require('./accounting.js');
var Task = require('./tasks.js');
var Contact = require('./contact.js');
var Lease = require('./lease.js');
let Payment = require('./payment.js');

const events = require('events');
var Enums = require('./../modules/enums.js');

class EE extends events {
	constructor() {
	    super(); 
	}
}

const eventEmitter = new EE();

eventEmitter.on('payment_applied', Task.createLockRemovalTask);
// eventEmitter.on('payment_applied', Contact.updateContactStatus);
eventEmitter.on('payment_applied', Lease.updateLeaseStandingByInvoicedLeases);
eventEmitter.on('payment_created', Task.createLockRemovalTask);
eventEmitter.on('payment_applied', Task.createLockRemovalTask);


/* eventEmitter.on(Enums.EVENTS.PAYMENT_PROCESSED, (payload) => {
	Payment.paymentProcessed(payload);
});

eventEmitter.on(Enums.EVENTS.GENERATE_EVENT_EXPORT, (payload) => {
	Accounting.generateExports(payload);
}); */

/* Any Transaction related update */
eventEmitter.on('transaction_done', params => Accounting.publishTransactionUpdated({ property_id: params.property_id }));

module.exports = eventEmitter;