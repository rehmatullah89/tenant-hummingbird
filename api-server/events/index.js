'use strict';

var Access =  require('./access.js');
var Activity =  require('./activity.js');
var Mail =  require('./mail.js');
var Lead =  require('./leads.js');
var Doc =  require('./document.js');
var Lease =  require('./lease.js');
var Maintenance =  require('./maintenance.js');
var Application =  require('./application.js');
var Promotions =  require('./promotions.js');
var Accounting =  require('./accounting.js');
var Contact =  require('./contact.js');
var Task = require('./tasks');
var Notification = require('./notifications');
var PaymentCycle = require('./payment_cycles');
var Delinquency = require('./delinquency');
let Payment = require('./payment.js');
var Enums = require('./../modules/enums.js');
var GDS = require('./gds.js');
const events = require('events');
var Charm = require('./charm.js');
const { func } = require('joi');

class EE extends events {
	constructor() {
		super(); //must call super for "this" to be defined.
	}
}

const eventEmitter = new EE();

eventEmitter.on('lead_created', GDS.newLead);
eventEmitter.on('lead_created', Notification.newLead);
eventEmitter.on('lead_created', params => {

	var contact_id = params.contact.id;


	// Getting Lead type Enum based on lead_type
	let leadType = Enums.LEAD_TYPE[`${params.lead_type || 'default'}`]
	console.log("Lead Type", leadType);
	if((params.api && params.api.id) || (params.user.role === 'application' || params.user.roles.includes("application"))){
		Task.createTask(params, contact_id, leadType, 'Lead Follow up', null, null, Enums.TASK_TYPE.CONTACT);
	}
});
eventEmitter.on('lead_created', GDS.updateGDSLeadStatus);

eventEmitter.on('new_reservation', params => {
	let event_type = Enums.EVENT_TYPES.LEAD.NEW_WEB_RESERVATION;

	if(!params.api || JSON.stringify(params.api) === JSON.stringify({})){
		event_type = Enums.EVENT_TYPES.LEAD.NEW_RESERVATION;
	}
	
	var lease_id = params.reservation.lease_id;
	Task.createTask(params, lease_id, event_type, null, null, null, Enums.TASK_TYPE.LEASE);
});

eventEmitter.on('lease_status_update', params => {
	Task.createTask(params, lease_id, Enums.EVENT_TYPES.TENANT.CHANGE_OF_STATUS, null, null, null, Enums.TASK_TYPE.LEASE);
});

eventEmitter.on('rate_change_created', params => {
	Task.createTask(params, params.rate_change_id, Enums.EVENT_TYPES.RATE_CHANGE.REVIEW_RATE_CHANGE, null, null, null, Enums.TASK_TYPE.RATE_CHANGE);
});

eventEmitter.on('rate_change_reviewed', params => {
	Task.createTask(params, params.rate_change_id, Enums.EVENT_TYPES.RATE_CHANGE.APPROVE_RATE_CHANGE, null, null, null, Enums.TASK_TYPE.RATE_CHANGE);
});

eventEmitter.on('auction', params => {
	Task.createTask(params, params.lease.id, params.event_type, null, null, null, Enums.TASK_TYPE.LEASE);
});






eventEmitter.on('new_reservation', GDS.newReservation);
eventEmitter.on('new_reservation', GDS.updateGdsUnitStatus);
eventEmitter.on('new_reservation', Notification.newReservation);

eventEmitter.on('new_voicemail', Charm.notifyVoicemail);

eventEmitter.on('lease_finalized', GDS.newLease);
eventEmitter.on('lease_finalized', GDS.updateGdsUnitStatus);
eventEmitter.on('lease_finalized', Lead.setConvertedOnLease);
eventEmitter.on('lease_finalized', Notification.newLease);
eventEmitter.on('lease_finalized', GDS.newRental);



eventEmitter.on('lease_status_update', Contact.leaseStatusUpdate);

eventEmitter.on('unit_created',  Access.createUnit);
eventEmitter.on('update_user_space', Access.updateUserSpace);
eventEmitter.on('set_access_on_lease', Access.setContactAccessOnLease);

if(process.env.NODE_ENV !== 'test' ) {
  eventEmitter.on('payment_deleted', Accounting.voidPayment);
  eventEmitter.on('payment_refunded', Accounting.refundPayment);
  eventEmitter.on('invoice_created', Accounting.postInvoice);

  eventEmitter.on('product_created', Accounting.createInventory);
  
  // Doing this in route so they are available to query right away
  // eventEmitter.on('tax_profile_saved', Accounting.saveTaxProfile);
  eventEmitter.on('payment_unapplied', Accounting.unapplyPayment);
  eventEmitter.on('payment_applied_to_invoices', Accounting.applyPayment);
  eventEmitter.on('property_created', Accounting.createProperty);
}

// Need to be discussed ...
eventEmitter.on('payment_created', GDS.newPayment);

// done
eventEmitter.on('overpayment_processed', Task.createLockRemovalTask);

// Done
eventEmitter.on('invoice_adjusted', Delinquency.updateDelinquency); 	


eventEmitter.on('payment_deleted', PaymentCycle.checkPaymentCycle); 		
eventEmitter.on('payment_refunded', PaymentCycle.checkPaymentCycle); 		
eventEmitter.on('payment_voided', PaymentCycle.checkPaymentCycle); 			
eventEmitter.on('invoice_created', PaymentCycle.checkPaymentCycle); 		
eventEmitter.on('payment_unapplied', PaymentCycle.checkPaymentCycle);


eventEmitter.on('payment_deleted', Delinquency.addDelinquency); 		// add delinquency
eventEmitter.on('payment_refunded', Delinquency.addDelinquency); 		// add delinquency
eventEmitter.on('payment_voided', Delinquency.addDelinquency); 			// add delinquency
eventEmitter.on('invoice_created', Delinquency.addDelinquency); 		// add delinquency
eventEmitter.on('payment_unapplied', Delinquency.addDelinquency); 		// add delinquency
eventEmitter.on('unit_application_created', Application.newApplication);
eventEmitter.on('document_signed', Doc.notifyDocumentSigned);
eventEmitter.on('document_signed', GDS.documentSigned);

// Activity Recording
eventEmitter.on('gate_access_configured', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 21, params.property.id, params.access.id));


eventEmitter.on('gate_access_deleted', params => Activity.record_activity(params.cid,params.company.id, params.contact.id, null, 4, 21, params.property.id, params.access.id));


// Account
eventEmitter.on('user_logged_in', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 1,1, null,null ));
eventEmitter.on('user_authenticated', params => Activity.record_activity(params.cid, params.company.id,null, params.api.id, 1,1, params.contact.id, null ));
eventEmitter.on('user_setup_password', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 2,1, null,null ));
eventEmitter.on('user_reset_password', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,1, null,null ));
eventEmitter.on('user_find_usernames', params => Activity.record_activity(params.cid, params.company.id, null, null, 27,66, null, params.email ));

// Settings
eventEmitter.on('settings_updated', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,8, null, params.settings.category ));
eventEmitter.on('api_key_created', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 2,7, params.apiKey.id, null ));
eventEmitter.on('api_key_updated', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,7, params.apiKey.id, null ));
eventEmitter.on('api_key_deleted', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 4,7, params.apiKey.id, null ));


// Leases
eventEmitter.on('lease_service_created', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 2,48, params.lease.id, params.service.id ));
eventEmitter.on('lease_service_updated', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,48, params.lease.id, params.service.id ));

eventEmitter.on('lease_standing_updated', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,71, params.lease.id, params.lease.lease_standing_id ));

eventEmitter.on('lease_checklist_item_updated', params => {
	if(params.checklist_item.complete && params.contact.role == 'admin'){
		return Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 10, 32, params.checklist_item.id, 'complete' )
	} else if(!params.checklist_item.complete){
		return Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 32, params.checklist_item.id,  'incomplete' )
	}
});

eventEmitter.on('lease_checklist_item_deleted', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 4,32, params.checklist_item_id ));

eventEmitter.on('lease_checklist_item_created', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 2,32, params.checklist_item.id ));

eventEmitter.on('payment_method_autopay', params => Activity.record_activity(params.cid, params.company.id, params.contact && params.contact.id, params.api && params.api.id, 3,45, params.lease.id ));

eventEmitter.on('payment_method_created', params => {
	if(params.api.id){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 2,30, params.paymentMethod.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 2,30, params.paymentMethod.id )
	}
});

eventEmitter.on('payment_method_deleted', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null,4,30, params.paymentMethod.id ));

eventEmitter.on('payment_created', params => {
	if(params.api && params.api.id){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 2,29, params.payment.id )
	} else {
	  let contact = params.contact && params.contact.id ? params.contact : params.user;
		Activity.record_activity(params.cid, params.company.id, contact.id, null, 2,29, params.payment.id )
	}
});

eventEmitter.on('lease_deleted', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 4,18, params.lease.id ));



//Reservations
eventEmitter.on('reservation_updated', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 3,19, params.reservation.id ));
eventEmitter.on('reservation_deleted', params => Activity.record_activity(params.cid, params.company.id,params.contact.id, null, 4,19, params.reservation.id ));



//return activity.create(connection,company.id, user.id , 3, 6, contact.id);
// Contact
eventEmitter.on('admin_created', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 2,61, params.contact.id ));
eventEmitter.on('admin_edited', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 3,61, params.contact.id ));
eventEmitter.on('admin_deleted', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 4,61, params.contact.id ));
eventEmitter.on('admin_notifications_updated', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 3,62, params.contact.id ));

eventEmitter.on('lead_created', params => {

	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 2, 6, params.contact.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.user.id, null, 2,6, params.contact.id)
	}
});

eventEmitter.on('lead_updated', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 3,6, params.contact.id ));
eventEmitter.on('lead_updated', GDS.updateGDSLeadStatus);
eventEmitter.on('lead_status_updated', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 3,4, params.contact.id ));
eventEmitter.on('lead_retired', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 4,4, params.contact.id ));
eventEmitter.on('contact_activity_entered', params => {
	if(!params.todo || !params.todo.id) return;
	Activity.record_activity(params.cid, params.company.id, params.user.id, null, 2,51, params.todo.id );
});

// contacts
eventEmitter.on('contact_updated', params => {
    if (params.api) {
        Activity.record_activity(params.cid, params.company.id, null, params.api.id, 3, 36, params.contact.id)
    } else {
        Activity.record_activity(params.cid, params.company.id, params.user.id, null, 3, 36, params.contact.id)
    }
});
eventEmitter.on('contact_updated', Contact.updateContactInfoInGateAccess);
eventEmitter.on('contact_updated', GDS.updateGDSContactStatus);
eventEmitter.on('contact_access_deleted', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 4,35, params.contact.id, params.property.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.user.id, null, 4,35, params.contact.id, params.property.id )
	}
});

eventEmitter.on('contact_access_created', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 2,35, params.contact.id, params.property.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.user.id, null, 2,35, params.contact.id, params.property.id )
	}
});

eventEmitter.on('contact_access_updated', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 3,35, params.contact.id, params.property.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.user.id, null, 3,35, params.contact.id, params.property.id )
	}
});

eventEmitter.on('contact_access_suspended', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 15,35, params.contact.id, params.property.id )
	} else {
		Activity.record_activity(params.cid, params.company.id,params.user.id, null, 15,35, params.contact.id, params.property.id )
	}
});
eventEmitter.on('contact_access_granted', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 14,35, params.contact.id, params.property.id )
	} else {
		Activity.record_activity(params.cid, params.company.id, params.user.id, null, 14,35, params.contact.id, params.property.id )
	}
});

// Should record email when sent by worker server.
//eventEmitter.on('contact_sent_message', params => Activity.record_activity(params.cid, params.company.id, params.user.id, null, 16, 23, params.contact.id, params.body.message ));




// Maintenance
eventEmitter.on('maintenance_request_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,34, params.maintenance.id ));
eventEmitter.on('maintenance_request_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,34, params.maintenance.id ));


// Chats
eventEmitter.on('new_chat_message', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,56, params.maintenance.id ));
eventEmitter.on('chat_read', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,56, params.maintenance.id ));



// Categories
eventEmitter.on('category_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,3, params.category.id ));
eventEmitter.on('category_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,3, params.category.id ));
eventEmitter.on('category_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,3, params.category.id ));


// Billing
eventEmitter.on('property_bill_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,26, params.propertyBill.id ));


// Application
eventEmitter.on('application_rejected', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 5,20, params.application.id ));

// Triggers
eventEmitter.on('trigger_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,53, params.trigger.id ));
eventEmitter.on('trigger_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,53, params.trigger.id ));
eventEmitter.on('trigger_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,53, params.trigger.id ));



// Insurance
eventEmitter.on('insurance_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,10, params.insurance.id ));
eventEmitter.on('insurance_edited', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,10, params.insurance.id ));
eventEmitter.on('insurance_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,10, params.insurance.id ));


// Templates

eventEmitter.on('template_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,58, params.template.id ));
eventEmitter.on('template_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,58, params.template.id ));
eventEmitter.on('template_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,58, params.template.id ));

eventEmitter.on('template_checklist_item_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,54, params.template.id ));
eventEmitter.on('template_checklist_item_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,54, params.template.id ));
eventEmitter.on('template_checklist_item_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,54, params.template.id ));


eventEmitter.on('template_checklist_service_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,55, params.template.id ));
eventEmitter.on('template_checklist_service_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,55, params.template.id ));
eventEmitter.on('template_checklist_service_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,55, params.template.id ));



/* Invoices */
eventEmitter.on('invoice_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,41, params.invoice.id ));
eventEmitter.on('send_charges_to_tenants', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 19,42));
eventEmitter.on('invoice_voided_activity', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,41, params.invoice.id));


/* Products */
eventEmitter.on('product_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,9, params.product.id));
eventEmitter.on('product_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,9, params.product.id));
eventEmitter.on('product_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,9, params.product.id));

/* Products */
eventEmitter.on('promotion_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2,5, params.promotion.id));
eventEmitter.on('promotion_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3,5, params.promotion.id));
eventEmitter.on('promotion_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4,5, params.promotion.id));
eventEmitter.on('promotions_sorted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 21, 5));


eventEmitter.on('promotion_created', params => Promotions.updateUnits(params.promotion.id, params.cid));
eventEmitter.on('promotion_updated', params => Promotions.updateUnits(params.promotion.id, params.cid));
eventEmitter.on('promotion_deleted', params => Promotions.updateUnits(params.promotion.id, params.cid));




/*properties */
eventEmitter.on('application_configuration_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 63, params.property.id));
eventEmitter.on('template_added_to_property', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 11, params.property.id, params.template.id));
eventEmitter.on('template_removed_from_property', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 11, params.property.id, params.template.id));
eventEmitter.on('property_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 12, params.property.id));
eventEmitter.on('property_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 12, params.property.id));
eventEmitter.on('property_product_price_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 13, params.property.id, params.product.id));
eventEmitter.on('property_connection_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 14, params.payment_connection.id));
eventEmitter.on('property_connection_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 14, params.payment_connection.id));
eventEmitter.on('property_connection_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 14, params.property.id, params.payment_connection.name));


eventEmitter.on('property_hours_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 15, params.hours.id));
eventEmitter.on('property_hours_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 15, params.hours.id));
eventEmitter.on('property_hours_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 15, params.property.id));

eventEmitter.on('property_group_created', params => Activity.record(params.company.id, params.contact, params.api, 2, 70, params.group.id));
eventEmitter.on('property_group_updated', params => Activity.record(params.company.id, params.contact, params.api, 3, 70, params.group.id));
eventEmitter.on('property_group_deleted', params => Activity.record(params.company.id, params.contact, params.api, 4, 70, params.group.id));

eventEmitter.on('property_email_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 46, params.email.id));
eventEmitter.on('property_email_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 46, params.email.id));
eventEmitter.on('property_email_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 46, params.email.id));

eventEmitter.on('property_phone_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 47, params.phone.id));
eventEmitter.on('property_phone_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 47, params.phone.id));
eventEmitter.on('property_phone_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 47, params.phone.id));

eventEmitter.on('property_utility_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 27, params.utility.id));
eventEmitter.on('property_utility_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 27, params.utility.id));
eventEmitter.on('property_utility_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 27, params.utility.id));



eventEmitter.on('maintenance_type_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 44, params.maintenance_type.id));
eventEmitter.on('maintenance_type_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 44, params.maintenance_type.id));
eventEmitter.on('maintenance_type_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 44, params.maintenance_type.id));

eventEmitter.on('maintenance_extra_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 43, params.maintenance_extra.id));
eventEmitter.on('maintenance_extra_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 43, params.maintenance_extra.id));
eventEmitter.on('maintenance_extra_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 43, params.maintenance_extra.id));

/* Payments */
eventEmitter.on('payment_unapplied', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 28, params.payment_application.payment_id, params.payment_application.invoice_id ));

eventEmitter.on('payment_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 29, params.payment.id ));
eventEmitter.on('payment_refunded', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 8, 29, params.payment.id ));



/* units */


eventEmitter.on('unit_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 16, params.unit.id ));
eventEmitter.on('units_bulk_edited', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id, null, params.api.id, 3, 16, null, params.units );
	} else {
		Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 16, null, params.units );
	}
});
eventEmitter.on('unit_application_created', params => Activity.record_activity(params.cid, params.company.id, params.application.Contact.id, null, 2, 20, null, params.application.id ));
eventEmitter.on('unit_file_uploaded', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 64, params.unit_upload.id ));
eventEmitter.on('unit_amenities_updated', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 17, params.unit.id ));

eventEmitter.on('unit_hold_created', params => Activity.record_activity(params.cid,
	params.company.id,
	null,
	params.api.id,
	null,
	2,
	57,
	params.unit.id
));

eventEmitter.on('unit_hold_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact && params.contact.id, null, 4, 57, params.unit.id ));

// eventEmitter.on('unit_utilities_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 17, params.unit.id ));
// eventEmitter.on('unit_utilities_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 3, 17, params.unit.id ));
// eventEmitter.on('unit_files_sorted', params => Activity.record_activity(params.cid, params.company.id, params.application.Contact.id, null, 2, 64, params.unit_upload.id ));


eventEmitter.on('unit_rent_rule_created', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 2, 65, params.unit.id ));
eventEmitter.on('unit_rent_rule_deleted', params => Activity.record_activity(params.cid, params.company.id, params.contact.id, null, 4, 65, params.unit.id ));



/* Leases */
eventEmitter.on('tenant_created', params => {
	if(params.api){
		Activity.record_activity(params.cid, params.company.id,null, params.api.id, 2,33, params.tenant.id)
	} else {
		Activity.record_activity(params.cid, params.company.id, params.user.id, null, 2,33, params.tenant.id )
	}
});


/* TODOS */
eventEmitter.on('todo_created', params => Activity.record_activity(params.cid, params.company.id, params.loggedInUser.id, null, 2, 51, params.todo.id ));
eventEmitter.on('todo_completed', params => Activity.record_activity(params.cid, params.company.id, params.loggedInUser.id, null, 10, 51, params.todo.id ));
eventEmitter.on('todo_snoozed', params => Activity.record_activity(params.cid, params.company.id, params.loggedInUser.id, null, 28, 51, params.todo.id ));

eventEmitter.on(Enums.EVENTS.END_DELINQUENCY, (payload) => {
	Delinquency.endDelinquency(payload);
});

eventEmitter.on(Enums.EVENTS.PAYMENT_PROCESSED, (payload) => {
	Payment.paymentProcessed(payload);
});

eventEmitter.on(Enums.EVENTS.REFUND_PROCESSED, (payload) => {
	Refund.refundProcessed(payload);
});

eventEmitter.on(Enums.EVENTS.GENERATE_EVENT_EXPORT, (payload) => {
	Accounting.generateExports(payload);
});

eventEmitter.on('promotion_unit_update', (payload) => {
	Promotions.updateUnitsAssociatedPromotions(payload.cid, payload.units, payload.company.id);
});

module.exports = eventEmitter;

const Refund = require('./refund.js');