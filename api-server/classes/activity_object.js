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
var AccessControl = require(__dirname + '/../classes/access_control.js');

var e  = require(__dirname + '/../modules/error_handler.js');


class ActivityObject {

	constructor(data){
		data = data || {};
		this.id = data.id;
		this.name = data.name;
		this.Object = {};

	}

	find(connection){
		this.verifyId();
		return models.Activity.findActivityObject(connection, this.id )
			.then(data => {
				this.name = data.name;
				return true;
			})
	}

	findObject(connection, object_id, description){

		if(!object_id) return true;
		return Promise.resolve().then(() => {

			switch(this.name.toLowerCase()){
				case 'account':
					break;
				case 'password':
					break;
				case 'category':
					return models.UnitCategory.findById(connection, object_id);
					break;
				case 'lead':
					return models.Contact.findById(connection, object_id);
					break;
				case 'promotion':
					return models.Promotion.findById(connection, object_id);
					break;
				case 'lead_status':
					return models.Contact.findById(connection, object_id);
					break;
				case 'apikey':
					return models.Api.findKeyById(connection, object_id);
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
					return models.Property.findById(connection, object_id).then(p => {
						return AccessControl.getGateVendors(connection).then(a => {
							let gv = a.find(({id}) => id === description)
							return {
								property: p,
								access: gv
							}
						})
					})
					break;
				case 'email':

					return models.Contact.findById(connection, object_id).then(c => {

            if(description){

            }
						return models.Email.findById(connection, description).then(e => {
							return {
								contact: c,
								email: e
							}
						})
					})
					break;
				case 'phone_call_received':
				case 'contact_form':
				case 'customer_walked_in':
					return models.Contact.findById(connection, object_id);
					break;
				case 'property_utility_bill':
				case 'utility_bill':
					return {};
					break;
				case 'payment_application':
					return models.Payment.findPaymentById(connection, object_id)
					// return models.Invoice.findById(connection, description);
					break;
				case 'payment':
					return models.Payment.findPaymentById(connection, object_id);
				case 'payment_method':

				case 'checklist_item':
				case 'tenant':
				case 'maintenance_request':
					return models.Maintenance.findSubmessageById(connection, null,  object_id).then(sm => {
						return models.Maintenance.findAddressByMaintenanceId(connection, sm.maintenance_id).then(address =>{
							sm.Address = address;
							return sm;
						})
					})
					break;
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
				case 'todo':
				case 'interaction':
					// this is an interaction, so get the contacts detail..
					return models.Activity.findById(connection, object_id).then(activity => {
						return models.Contact.findById(connection, activity.object_id).then(c =>{
							activity.Object = c;
							return activity;
						})

					})

			}
		}).then(object => {
			this.Object = object;
		})


	}

	verifyId(){
		if (!this.id) e.th(500, 'No activity object id is set');
		return true;
	}

}

module.exports = ActivityObject;
