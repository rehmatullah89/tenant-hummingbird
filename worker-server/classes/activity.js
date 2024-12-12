"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var Notification = require(__dirname + '/../classes/notification.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var fillTemplate = require('es6-dynamic-template');
var ActivityTemplates = require(__dirname + '/../modules/activity_templates.js');

var e  = require(__dirname + '/../modules/error_handler.js');

var tenantActivity = [
	{
		label: 'A new lead is entered',
		activity_action_id: 2,
		activity_object_id: 6
	},
	{
		label: 'A tenant creates a maintenance request',
		activity_action_id: 2,
		activity_object_id: 34
	},
	{
		label: 'A tenant updates a maintenance request',
		activity_action_id: 3,
		activity_object_id: 34
	},

	{
		label: 'A tenant makes a payment',
		activity_action_id: 2,
		activity_object_id: 29
	},
	{
		label: 'A tenant purchases a product',
		activity_action_id: 2,
		activity_object_id: 41
	},

	{
		label: 'Someone applies for a unit',
		activity_action_id: 2,
		activity_object_id: 20
	},

	{
		label: 'Someone rents a unit',
		activity_action_id: 2,
		activity_object_id: 18
	},
	{
		label: 'Someone reserves a unit',
		activity_action_id: 2,
		activity_object_id: 18
	},

	{
		label: 'A tenant is added to a lease',
		activity_action_id: 2,
		activity_object_id: 33
	},


	{
		label: 'Someone electronically signs a document',
		activity_action_id: 20,
		activity_object_id: 38
	},
	{
		label: 'A tenant completes a checklist item',
		activity_action_id: 10,
		activity_object_id: 32
	},
	{
		label: 'A tenant uploads a document to their account',
		activity_action_id: 2,
		activity_object_id: 50
	},

	{
		label: 'A tenant deletes an document from their account',
		activity_action_id: 4,
		activity_object_id: 50
	},
	{
		label: 'A tenant adds a payment method to their account',
		activity_action_id: 2,
		activity_object_id: 30
	},
	{
		label: 'A tenant adjusts the auto-pay configuration on their lease',
		activity_action_id: 3,
		activity_object_id: 45
	},
	{
		label: 'A lead is updated',
		activity_action_id: 3,
		activity_object_id: 6
	},
	{
		label: 'Someone updates their contact information',
		activity_action_id: 3,
		activity_object_id: 36
	},
	{
		label: 'Someone resets their password',
		activity_action_id: 3,
		activity_object_id: 2
	},

	{
		label: 'Someone creates an account',
		activity_action_id: 2,
		activity_object_id: 1
	},

	{
		label: 'A tenant is removed from a lease',
		activity_action_id: 4,
		activity_object_id: 33
	},
	{
		label: 'A tenant is edited',
		activity_action_id: 3,
		activity_object_id: 33
	}
];




class Activity {

	constructor(data){
		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
		this.apikey_id = data.apikey_id;
		this.contact_id = data.contact_id;
		this.activity_action_id = data.activity_action_id;
		this.object_id = data.object_id;
		this.activity_object_id = data.activity_object_id;
		this.created = data.created;
		this.description = data.description;

		this.message = '';
		this.link = '';
		this.can_undo = false;

		this.Contact = {};
		this.Apikey = {};
		this.ActivityObject = {};
		this.ActivityAction = {};
		this.Object = {};
		//
		// this.ActivityTypes = {};
		// this.ActivityType = {};
		// this.Lease = {};
		// this.Invoice = {};
	}

	// loadActivityTypes(connection){
	// 	return models.Activity.loadActivityTypes(connection).map(at => {
	// 		this.ActivityTypes[at.name] = at;
	// 		return;
	// 	});
	// }
	getNotificationTypes(connection){

		return Promise.resolve().then(() => tenantActivity);

		// return Promise.mapSeries(tenantActivity, a => {
		//
		// 	var activity = {
		// 		label: a.label
		// 	};
		//
		// 	return models.Activity.findActivityAction(connection, a.activity_action_id)
		// 		.then(action => {
		// 			activity.action = action;
		// 			return models.Activity.findActivityObject(connection, a.activity_object_id)
		// 		}).then(object => {
		// 			activity.object = object;
		// 			return activity;
		// 		})
		// })
	}

	create(connection, company_id, contact_id, activity_action_id, activity_object_id, object_id, description, created){

		this.contact_id = contact_id;
		this.activity_action_id = activity_action_id;
		this.activity_object_id = activity_object_id;
		this.object_id = object_id;
		this.company_id = company_id;
		this.description = description;
		this.created = created;

		return this.save(connection);
	}

	createApi(connection, company_id, apikey_id, activity_action_id, activity_object_id, object_id, description, created){

		this.apikey_id = apikey_id;
		this.activity_action_id = activity_action_id;
		this.activity_object_id = activity_object_id;
		this.object_id = object_id;
		this.company_id = company_id;
		this.description = description;
		this.created = created;
		return this.save(connection);
	}

	save(connection){

		var data = {
			company_id: this.company_id,
			apikey_id: this.apikey_id,
			contact_id: this.contact_id,
			activity_action_id: this.activity_action_id,
			activity_object_id: this.activity_object_id,
			object_id: this.object_id,
			description: this.description,
			created: this.created || moment.utc().toDate()
		}

		return models.Activity.save(connection, data, this.id)
			// .then(activity_id => {
			// 	if (this.id) return;
			// 	this.id = activity_id;
			// 	return tenantActivity.findIndex(e => e.activity_action_id == this.activity_action_id && e.activity_object_id == this.activity_object_id);
			//
			// }).then(shouldNotify => {
			// 	if(shouldNotify >= 0 && this.contact_id){
			// 		return models.Contact.isTenant(connection, this.contact_id,  this.company_id);
			// 	} else if(shouldNotify >= 0){
			// 		return true;
			// 	}
			//
			// 	if(!this.contact_id && !this.apikey_id){
			// 		return true;
			// 	}
			//
			// 	return false;
			//
			// }).then(shouldNotify => {
			// 	if(!shouldNotify) return;
			//
			// 	return models.Setting.findContactsToNotify(connection, this.activity_object_id, this.activity_action_id, this.company_id)
			// 		.map(contact => {
			// 			var n = {
			// 				company_id: this.company_id,
			// 				contact_id: contact.id,
			// 				activity_id: this.id,
			// 				email: contact.should_email,
			// 				text:  contact.should_text
			// 			}
			// 			var notify = new Notification(n);
			// 			return notify.save(connection, this);
			// 		}).then(() => {
			// 			var n = new Notification({company_id: this.company_id});
			// 			n.ping();
			// 		})
			//
			// })
	}

	find(connection){

		this.verifyId();

		return models.Activity.findById(connection, this.id).then(data =>{

			this.id = data.id;
			this.company_id = data.company_id;
			this.contact_id = data.contact_id;
			this.apikey_id = data.apikey_id;
			this.activity_action_id = data.activity_action_id;
			this.object_id = data.object_id;
			this.activity_object_id= data.activity_object_id;
			this.description = data.description;
			this.created = data.created;

			return true;

		})
	}

	findContact(connection, company_id){
		if(!this.contact_id) return null;
		this.verifyId();
		this.Contact = new Contact({id: this.contact_id});
		return this.Contact.find(connection, company_id);

	}

	findActor(connection, company_id){

		this.verifyId();

		if( this.contact_id){
			this.Contact = new Contact({id: this.contact_id});
			return this.Contact.find(connection, company_id);
		} else if(this.apikey_id){

			return models.Api.findKeyById(connection, this.apikey_id).then(apikey => {
				this.Apikey = apikey;
				return;
			})
		}


	}

	findActivityObject(connection){
		this.verifyId();
		return models.Activity.findActivityObject(connection, this.activity_object_id )
			.then(data => {
				this.ActivityObject = data;
				return true;
			})
	}

	findActivityAction(connection){
		this.verifyId();
		return models.Activity.findActivityAction(connection, this.activity_action_id )
			.then(data => {
				this.ActivityAction = data;
				return true;
			})
	}

	findObject(connection){



		if(!this.object_id) return true;

		return Promise.resolve().then(() => {

			switch(this.ActivityObject.name.toLowerCase()){
				case 'account':
					break;
				case 'password':
					break;
				case 'category':
					return models.UnitCategory.findById(connection, this.object_id);
					break;
				case 'lead':
					return models.Contact.findById(connection, this.object_id);
					break;
				case 'promotion':
					return models.Promotion.findById(connection, this.object_id);
					break;
				case 'lead_status':
					return models.Contact.findById(connection, this.object_id);
					break;
				case 'apikey':
					return models.Api.findKeyById(connection, this.object_id);
					break;
				case 'settings':
				case 'products':
				case 'insurance':
				case 'property_template':
				case 'property':
				case 'property_price':
				case 'property_connection':
				case 'property_hours':
				case 'units':
				case 'unit_amenities':
				case 'lease':
				case 'reservation':
				case 'application':
				case 'access_control':
					return models.Property.findById(connection, this.object_id).then(p => {
						return models.Access.findById(connection,this.description).then(a => {
							return {
								property: p,
								access: a
							}
						})
					})
					break;
				case 'phone_call_received':
				case 'email_received':
				case 'contact_form':
				case 'customer_walked_in':
					return models.Contact.findById(connection, this.object_id);
					break;
				case 'property_utility_bill':
				case 'utility_bill':
					return {};
					break;
				case 'payment_application':
					return models.Payment.findPaymentById(connection, this.object_id);
					return models.Invoice.findById(connection, this.description);
					break;
				case 'payment':
					return models.Payment.findPaymentById(connection, this.object_id);
				case 'payment_method':

				case 'checklist_item':
				case 'tenant':
				case 'maintenance_request':
				case 'access':
				case 'contact':
				case 'document_type':
				case 'document':
				case 'page_field':
				case 'link_to_sign':
				case 'invoice':
				case 'statement_of_charges':
				case 'maintenance_extras':
				case 'maintenance_type':
				case 'autopay_config':
				case 'property_email':
				case 'property_phone':
				case 'service':
				case 'welcome_email':
				case 'upload':

			}
		}).then(object => {
			this.Object = object;
		})


	}

	buildMessage(){
		return ActivityTemplates.generate(this).then(output => {

			this.message = output.text;
			this.link = output.link;
			this.can_undo = output.can_undo;
			return true;

		})

	}

	verifyId(){
		if (!this.id) e.th(500, 'No activity id is set');
		return true;
	}

	findInvoice(connection){
		return models.Activity.findActivityInvoice(connection, this.id)
			.then(i => {
				if(!i) return false;
				return models.Invoice.findById(connection, i.invoice_id).then(i => {
					this.Invoice = i;
					return true;
				})
			});
	}

	findLease(connection){
		return models.Activity.findActivityLease(connection, this.id)
			.then(l => {
				if(!l) return false;
				return models.Lease.findById(connection, l.lease_id)
					.then(l => {
						this.Lease = l;
						return models.Address.findById(connection, l.id)
					}).then(a => {
						this.Lease.Address = a;
						return true;
					});
			});
	}

	confirm(sockets){
		return Promise.resolve().then(() => {
			sockets.sendAlert("confirmation", this.entered_by, {
				message: this.ActivityType.label,
				can_undo: this.ActivityType.can_undo,
				activity_id: Hashes.encode(this.id)
			});
			return true;
		})
	}

	undo(connection){
		return Promise.resolve().then(() => {
			if (!this.ActivityType.can_undo) return;
			return models.Activity.undo(connection, JSON.parse(this.details), this.ActivityType.table)

		});

	}



}

module.exports = Activity;