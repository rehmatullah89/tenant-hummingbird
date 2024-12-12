"use strict";

var models = require(__dirname + '/../models');
var settings = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')

var Hash = require(__dirname + '/../modules/hashes.js');
var Enums = require(__dirname + '/../modules/enums.js');

var Hashes = Hash.init();
var Company = require(__dirname + '/../classes/company.js');
var Document = require(__dirname + '/../classes/document.js');
var Upload = require(__dirname + '/../classes/upload.js');

var moment = require('moment');
var validation = require('../modules/validation.js');
var e = require(__dirname + '/../modules/error_handler.js');
var request = require('request');
var rp = require('request-promise');

var Mail = require(__dirname + '/../modules/mail.js');
var utils    = require(__dirname + '/../modules/utils.js');
var twilioClient = require('twilio')(settings.twilio.accountSid, settings.twilio.authToken);

var utils = require(__dirname + '/../modules/utils.js');


class Trigger {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.name = data.name || null;
		this.description = data.description || null;
		this.start = data.start || 0;
		this.trigger_reference = data.trigger_reference || null;
		this.repeat = data.repeat || 0;
		this.active = data.active || null;
		this.overlock = data.overlock || null;
		this.silence = data.silence || null;
		this.max_repeat = data.max_repeat || null;
		this.deny_access = data.deny_access || null;
		this.deny_payments = data.deny_payments || null;
		this.cancel_insurance = data.cancel_insurance || null;
		this.schedule_auction = data.schedule_auction || null;
		this.lease_standing_id = data.lease_standing_id || null;
		this.trigger_group_id = data.trigger_group_id || null;
		this.apply_to_all = !!data.apply_to_all;

		this.Fee = {
			id: '',
			amount: '',
			reference: '',
			active: '',
			product_id: '',
			Product: {
				id: '',
				name: ''
			}
		};
		this.Email = {
			id: '',
			message: '',
			subject: '',
			active: ''
		};
		this.SMS = {
			id: '',
			message: '',
			media_url: '',
			active: ''
		};

		this.Attachment = {
			id: '',
			active: '',
			to_print: '',
			to_email: '',
			document_id: ''
		};
		
		this.Event = {
			id: '',
			contact_id: '',
			event_type_id: '',
			todo: '',
			details: '',
			active: '',
			EventType: {}

		}

		this.Signers = [];
		this.Event = [];

		this.Upload = {}


		this.Events = [];
		this.Fees = [];
		this.Attachments = [];
		this.Emails = [];
		this.SMSs = [];
		this.Messages = [];


		this.message = '';
	}

	addFee(data){
		if(!data) return;
		let fee = {};
		fee.id = data.id || null;
		fee.amount = data.amount;
		fee.reference = data.reference;
		fee.type = data.type;
		fee.active = data.active;
		fee.product_id = data.product_id;
		fee.recurring = data.recurring;
		this.Fees.push(fee)
		return true;

	}

	// addEmail(data){
	// 	if(!data) return;
	// 	let email = {};
	// 	email.id = data.id || null;
	// 	email.message = data.message;
	// 	email.subject = data.subject;
	// 	email.active = data.active;
	// 	email.recurring = data.recurring;
	// 	email.include_alternate = data.include_alternate;
	// 	email.include_lien = data.include_lien;
	// 	this.Emails.push(email);
	// 	return true;
	// }

	addAttachment(data) {

		if(!data) return;
		let attachment = {};
		attachment.id = data.id || null;
		attachment.document_id = data.document_id || null;
		attachment.document_name = data.document_name || null;
		attachment.to_email = data.to_email || 0;
		attachment.to_print = data.to_print || 0;
		attachment.recurring = data.recurring;
		attachment.include_alternate = data.include_alternate;
		attachment.include_lien = data.include_lien;
		attachment.DeliveryMethods = data.DeliveryMethods;

		this.Attachments.push(attachment);

		return true;
	}

	addMessage(data){

		if(!data) return;
		let message = {};
		message.id = data.id || null;
		message.to_email = data.to_email || 0;
		message.to_print = data.to_print || 0;
		message.recurring = data.recurring;
		message.include_alternate = data.include_alternate;
		message.include_lien = data.include_lien;
		message.DeliveryMethods = data.DeliveryMethods;
		
		this.Messages.push(message);

		return true;
	}

	// addSMS(data){
	// 	if(!data) return;
	// 	let sms = {}
	// 	sms.id = data.id || null;
	// 	sms.message = data.message;
	// 	sms.media_url = data.media_url;
	// 	sms.active = data.active;
	// 	sms.recurring = data.recurring;
	// 	sms.include_alternate = data.include_alternate;
	// 	sms.include_lien = data.include_lien;
	// 	this.SMSs.push(sms);
	// 	return true;
	// }

	addEvent(data){
		if(!data) return;
		let event = {};
		event.id = data.id || null;
		event.contact_id = data.contact_id;
		event.event_type_id = data.event_type_id;
		event.todo = data.todo;
		event.details = data.details;
		event.active = data.active;
		event.recurring = data.recurring;
		this.Event.push(event);

		return true;
	}

	async validate(){
		if (!this.company_id) e.th(400, 'Invalid company id');
		if (!this.name) e.th(400, 'Invalid Please enter a name for this trigger');
		if (!this.start) e.th(400, 'PLease enter a start time');
		if (!this.start) e.th(400, 'PLease enter a trigger reference');
		return Promise.resolve();
	}

	async save(connection) {

		await this.validate();

		let save = {
			company_id: this.company_id,
			name: this.name,
			description: this.description,
			start: this.start,
			trigger_reference: this.trigger_reference,
			repeat: !!this.repeat,
			deny_payments: this.deny_payments,
			cancel_insurance: this.cancel_insurance,
			schedule_auction: this.schedule_auction,
			deny_access: this.deny_access,
			overlock: this.overlock,
			lease_standing_id: this.lease_standing_id,
			max_repeat: !!this.max_repeat,
			trigger_group_id: this.trigger_group_id,
			apply_to_all: this.apply_to_all
		};

		let result = models.Trigger.save(connection, save, this.id);

		if (result.insertId) this.id = result.insertId;

		await this.saveFee(connection);
		await this.saveEmail(connection);
		await this.saveSMS(connection);
		await this.saveAttachment(connection);
		await this.saveMessage(connection);
		await this.saveEvent(connection);

	}

	async saveFee(connection){

		let savedFees = await models.Trigger.findFeeByTriggerId(connection, this.id);

		for(let i = 0; i< this.Fees.length; i++){
			let fee = this.Fees[i];
			let saveFee = {
				trigger_id: this.id,
				amount: fee.amount,
				type: fee.type,
				reference: fee.reference,
				active: fee.active,
				product_id: fee.product_id,
				recurring: fee.recurring
			};
			await models.Trigger.saveFee(connection, saveFee, fee.id);
		}

		for (var j = 0; j < savedFees.length; j++) {
			let result = this.Fees.find(f => f.id && f.id === savedFees[j].id);

			if(!result){
				await models.Trigger.deleteFee(connection, savedFees[j].id);
			}
		}
	}

	// async saveEmail(connection){

	// 	let savedEmails = await models.Trigger.findEmailByTriggerId(connection, this.id);


	// 	for(let i = 0; i< this.Emails.length; i++) {
	// 		let email = this.Emails[i];

	// 		let saveEmail = {
	// 			trigger_id: this.id,
	// 			subject: email.subject,
	// 			message: email.message,
	// 			active: email.active,
	// 			recurring: email.recurring,
	// 			include_lien: email.include_lien, 
	// 			include_alternate: email.include_alternate
	// 		};
	// 		await models.Trigger.saveEmail(connection, saveEmail, email.id);
	// 	}

	// 	for (var j = 0; j < savedEmails.length; j++) {
	// 		let result = this.Emails.find(e => e.id && e.id === savedEmails[j].id);

	// 		if(!result){
	// 			await models.Trigger.deleteEmail(connection, savedEmails[j].id);
	// 		}
	// 	}
	// }

	// async saveSMS(connection){

	// 	let savedSMSs = await models.Trigger.findSMSByTriggerId(connection, this.id);

	// 	for(let i = 0; i< this.SMSs.length; i++) {
	// 		let sms = this.SMSs[i];
	// 		let saveSMS = {
	// 			trigger_id: this.id,
	// 			media_url: sms.media_url,
	// 			message: sms.message,
	// 			active: sms.active,
	// 			recurring: sms.recurring,
	// 			include_alternate: sms.include_alternate, 
	// 			include_lien: sms.include_lien
	// 		};

	// 		await models.Trigger.saveSMS(connection, saveSMS, sms.id);
	// 	}

	// 	for (var j = 0; j < savedSMSs.length; j++) {
	// 		let result = this.SMSs.find(s => s.id && s.id === savedSMSs[j].id);

	// 		if(!result){
	// 			await models.Trigger.deleteSMS(connection, savedSMSs[j].id);
	// 		}
	// 	}

	// }

	async saveAttachment(connection){

		let savedAttachments = await models.Trigger.findAttachmentByTriggerId(connection, this.id);


		for(let i = 0; i< this.Attachments.length; i++) {
			let attachment = this.Attachments[i];
			let saveAttachment = {
				document_id: attachment.document_id,
				document_name: attachment.document_name,
				trigger_id: this.id,
				to_print: attachment.to_print,
				to_email: attachment.to_email,
				recurring: attachment.recurring,
				include_alternate: attachment.include_alternate, 
				include_lien: attachment.include_lien
			};

			let attachment_id = await models.Trigger.saveAttachment(connection, saveAttachment, attachment.id);
			
			for(let j = 0; j< this.Attachments[i].DeliveryMethods.length; j++) {
				let dm = this.Attachments[i].DeliveryMethods[j]; 
				if(!dm.id && !dm.active) continue;
				let saveMethod = {
					trigger_attachment_id: attachment_id,
					method: dm.method, 
					subject: dm.subject, 
					active: dm.active, 
					message: dm.message
				}
				await models.Trigger.saveDeliveryMethod(connection, saveMethod, dm.id);

			}

		}
	}

	async saveMessage(connection){

		let savedMessages = await models.Trigger.findMessageByTriggerId(connection, this.id);

		for(let i = 0; i < this.Messages.length; i++) {
			let message = this.Messages[i];
			let saveMessage = {
				document_id: message.document_id,
				document_name: message.document_name,
				trigger_id: this.id,
				to_print: message.to_print,
				to_email: message.to_email,
				recurring: message.recurring,
				include_alternate: message.include_alternate,
				include_lien: message.include_lien
			};

			let message_id = await models.Trigger.saveMessage(connection, saveMessage, message.id);
			console.log("this.Messages[i].DeliveryMethods", this.Messages[i].DeliveryMethods); 

			for(let j = 0; j< this.Messages[i].DeliveryMethods.length; j++) {
				let dm = this.Messages[i].DeliveryMethods[j]; 
				if(!dm.id && !dm.active) continue;
				let saveMethod = {
					trigger_attachment_id: message_id,
					method: dm.method, 
					subject: dm.subject, 
					active: dm.active, 
					message: dm.message
				}
				await models.Trigger.saveDeliveryMethod(connection, saveMethod, dm.id);

			}

		}

		for (var i = 0; i < savedMessages.length; i++) {
			let result = this.Messages.find(a => a.id && a.id === savedMessages[i].id);

			if(!result){
				await models.Trigger.deleteMessage(connection, savedMessages[i].id);
			}
		}
	}

	async saveEvent(connection){

		let savedEvents = await models.Trigger.findEventByTriggerId(connection, this.id);

		for(let i = 0; i< this.Events.length; i++) {
			let event = this.Events[i];
			let saveEvent = {
				trigger_id: this.id,
				contact_id: event.contact_id || null,
				event_type_id: event.event_type_id,
				todo: event.todo,
				details: event.details,
				recurring: event.recurring,
				active: event.active
			};
			await models.Trigger.saveEvent(connection, saveEvent, event.id);
		}

		for (var j = 0; j < savedEvents.length; j++) {
			let result = this.Events.find(f => f.id && f.id === savedEvents[j].id);

			if(!result){
				await models.Trigger.deleteEvent(connection, savedEvents[j].id);
			}
		}

	}


	delete(connection) {
		var _this = this;

		return models.Trigger.delete(connection, _this.id);

	}

	async find(connection) {

		if (!this.id) e.th(500, 'No Id is set');
		let data = await models.Trigger.findById(connection, this.id);

		if (!data) {
			e.th(404, "Trigger not found");
		}

		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.name = data.name || null;
		this.description = data.description || null;
		this.start = data.start;
		this.trigger_reference = data.trigger_reference || null;
		this.repeat = data.repeat;
		this.overlock = data.overlock;
		this.deny_access = data.deny_access;
		this.deny_payments = data.deny_payments;
		this.cancel_insurance = data.cancel_insurance;
		this.schedule_auction = data.schedule_auction;
		this.max_repeat = data.max_repeat;
		this.lease_standing_id = data.lease_standing_id;
		this.trigger_group_id = data.trigger_group_id;
		this.apply_to_all = data.apply_to_all;

	}

	async findFees(connection){

		this.Fees = [];
		let data = await models.Trigger.findFeeByTriggerId(connection, this.id);
		if(!data){
			return true;
		}

		for(let i = 0; i < data.length; i ++){
			let fee = {};
			fee.id = data[i].id;
			fee.trigger_id = data[i].trigger_id;
			fee.amount = data[i].amount;
			fee.type = data[i].type;
			fee.reference = data[i].reference;
			fee.active = data[i].active;
			fee.product_id = data[i].product_id;
			fee.recurring = data[i].recurring;

			let product = await models.Product.findById(connection, data[i].product_id);
			fee.Product = product;
			this.Fees.push(fee)
		}
	}

	// async findEmails(connection){

	// 	this.Emails = [];
	// 	let data = await models.Trigger.findEmailByTriggerId(connection, this.id);

	// 	if(!data){
	// 		return true;
	// 	}

	// 	for(let i = 0; i < data.length; i ++) {
	// 		let email = {};
	// 		email.id = data[i].id;
	// 		email.trigger_id = data[i].trigger_id;
	// 		email.subject = data[i].subject;
	// 		email.message = data[i].message;
	// 		email.active = data[i].active;
	// 		email.recurring = data[i].recurring;
	// 		email.include_alternate = data[i].include_alternate;
	// 		email.include_lien = data[i].include_lien;
	// 		this.Emails.push(email)
	// 	}
	// }

	// async findSMSs(connection){

	// 	this.SMSs = [];
	// 	let data = await  models.Trigger.findSMSByTriggerId(connection, this.id)

	// 	if(!data){
	// 		return true;
	// 	}

	// 	for(let i = 0; i < data.length; i ++) {
	// 		let sms = {};
	// 		sms.id = data[i].id;
	// 		sms.trigger_id = data[i].trigger_id;
	// 		sms.media_url = data[i].media_url;
	// 		sms.message = data[i].message;
	// 		sms.active = data[i].active;
	// 		sms.recurring = data[i].recurring;
	// 		sms.include_alternate = data[i].include_alternate;
	// 		sms.include_lien = data[i].include_lien;
	// 		this.SMSs.push(sms)
	// 	}

	// }

	async findAttachments(connection){

		this.Attachments = [];
		let data = await models.Trigger.findAttachmentByTriggerId(connection, this.id)
		
		if(!data){
			return true;
		}

		for(let i = 0; i < data.length; i ++) {
			let attachment = {};

			attachment.id = data[i].id;
			attachment.document_id = data[i].document_id;
			attachment.document_name = data[i].document_name;
			attachment.trigger_id = data[i].trigger_id;
			attachment.to_email = data[i].to_email;
			attachment.to_print = data[i].to_print;
			attachment.recurring = data[i].recurring;
			attachment.include_alternate = data[i].include_alternate;
			attachment.include_lien = data[i].include_lien;
			
			attachment.DeliveryMethods = await models.Trigger.findDeliveryMethodsByAttachmentId(connection, data[i].id)

			this.Attachments.push(attachment)
		}
	}

	async findMessages(connection){

		this.Messages = [];
		let data = await models.Trigger.findMessageByTriggerId(connection, this.id)

		if(!data){
			return true;
		}

		for(let i = 0; i < data.length; i ++) {
			let message = {};

			message.id = data[i].id;
			
			message.trigger_id = data[i].trigger_id;
			message.to_email = data[i].to_email;
			message.to_print = data[i].to_print;
			message.recurring = data[i].recurring;
			message.include_alternate = data[i].include_alternate;
			message.include_lien = data[i].include_lien;
			
			message.DeliveryMethods = await models.Trigger.findDeliveryMethodsByAttachmentId(connection, data[i].id)

			this.Messages.push(message)
		}
	}

	async findEvents(connection){

		this.Events = [];
		let data = await models.Trigger.findEventByTriggerId(connection, this.id);


		if(!data){
			return true;
		}

		for(let i = 0; i < data.length; i ++) {
			let event = {};
			event.id = data[i].id;
			event.contact_id = data[i].contact_id;
			event.trigger_id = data[i].trigger_id;
			event.todo = data[i].todo;
			event.event_type_id = data[i].event_type_id;
			event.details = data[i].details;
			event.active = data[i].active;
			event.recurring = data[i].recurring;

			let event_type = await models.Event.findEventTypeById(connection, event.event_type_id);

			if (!event_type) e.th(404, "Event type not found");

			event.EventType = event_type;
			this.Events.push(event);
		}
		console.log("this.Events data", this.Events);
	}

	update(data) {

		this.name = data.name;
		this.description = data.description;
		this.repeat = data.repeat;
		this.max_repeat = data.max_repeat;
		this.start = data.start;
		this.trigger_reference = data.trigger_reference;
		this.deny_access = data.deny_access || 0;
		this.lease_standing_id = data.lease_standing_id;
		this.apply_to_all = !!data.apply_to_all;

		let fee = data.Fee;
		let email = data.Email;
		let sms = data.SMS;
		let attachment = data.Attachment;
		let message = data.Message;
		let event = data.Event;

		this.addFee(fee);
		// this.addEmail(email);
		this.addAttachment(attachment);
		this.addMessage(message);
		// this.addSMS(sms);
		this.addEvent(event);

	}

	static mergeFields(message, tenant, lease) {

		if (tenant) {
			message = replaceAll(message, "[FIRSTNAME]", validation.capitalizeFirst(tenant.Contact.first))
			message = replaceAll(message, "[LASTNAME]", validation.capitalizeFirst(tenant.Contact.last))
			message = replaceAll(message, "[EMAIL]", tenant.Contact.email);
			if (tenant.Contact.Phones.length) {
				message = replaceAll(message, "[PHONE]", tenant.Contact.Phones[0].phone);
			}
		}

		if (lease) {
			message = replaceAll(message, "[RENT]", "$" + lease.rent.toFixed(2));
			message = replaceAll(message, "[ADDRESS]", lease.Unit.Address.address);
			message = replaceAll(message, "[NUMBER]", "#" + lease.Unit.number);
			message = replaceAll(message, "[CITY]", lease.Unit.Address.city);
			message = replaceAll(message, "[STATE]", lease.Unit.Address.state);
			message = replaceAll(message, "[ZIP]", lease.Unit.Address.zip);

			message = replaceAll(message, "[Facility.Website]", lease.Property.landing_page);
			message = replaceAll(message, "[Facility.Name]", lease.Property.name);
			message = replaceAll(message, "[Facility.LegalName]", lease.Property.legal_name || '');

		}


		lease.balance = lease.balance || 0;
		message = replaceAll(message, "[BALANCE]", "$" + lease.balance.toFixed(2));

		if (lease.bill_day) {
			message = replaceAll(message, "[BILLDAY]", lease.bill_day);
		}


		return message;
	}

	static replaceNewLineEmail(message) {
		return message.replace(/\n/g,'<br />');
	}

	static async findByCompanyId(connection, company_id) {
		return await models.Trigger.findByCompanyId(connection, company_id);
	}

	static async findByGroupIds(connection, group_id){
		return await models.Trigger.findByGroupIds(connection, group_id);
	}

	async getLeases(connection, date, property_id){

		if(!this.id) e.th(500, "Trigger ID missing");
		switch(this.trigger_reference){
			case 'past_due':
				return await this.findPastDue(connection, date, property_id);
			case 'start_of_lease':
				return await this.findFromStart(connection, date, property_id);
			case 'before_lease':
				return await this.findBeforeStart(connection, date, property_id);
			case 'end_of_lease':
				return await this.findFromEnd(connection, date, property_id);
			case 'new_lead':
				return await this.findFromNewLead(connection, date, property_id);
			// case 'first_of_month':
			// case 'end_of_month':
			// case 'from_last_contact':

		}

		e.th(500, "invalid Trigger reference");

	}

	async findFromNewLead(connection, date){
		let new_leads = await models.Trigger.findNewLeads(connection, date, this.repeat, this.max_repeat, this.start, this.company_id);

		let leases = [];
		for (let i = 0; i < past_due_invoices.length; i++) {
			let invoice = new Invoice(past_due_invoices[i]);
			await invoice.find(connection);
			await invoice.findLease(connection);
			invoice.total();

			let lease = invoice.Lease;
			lease.balance = invoice.balance;
			lease.duedate = invoice.due;
			leases.push(lease);
		}

		return leases;
	}

	async findPastDue(connection, date, property_id){
		let past_due_invoices = await models.Trigger.findOverdue(connection, date, this.repeat, this.max_repeat, this.start, this.apply_to_all, this.company_id, property_id);

		let leases = [];
		for(let i = 0; i < past_due_invoices.length; i++){
			let invoice = new Invoice(past_due_invoices[i]);
			await invoice.find(connection);
			await invoice.findLease(connection);
			invoice.total();

			let lease = invoice.Lease;
			for(let i = 0; i < lease.Tenants.length; i++){
				await lease.Tenants[i].Contact.getPhones(connection)
			}
			lease.balance = invoice.balance;
			lease.duedate = invoice.due;
			lease.invoice_id = invoice.id;
			lease.invoice_number = invoice.number;

			leases.push(lease);
		}
		// TODO Will this return multiple invoices for the same lease?
		return leases;
	}

	async findFromStart(connection, date, property_id){
		let leases_list = await models.Trigger.findFromStart(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);
		console.log("start_of_lease: ", leases_list);
		let leases = [];
		for (let i = 0; i < leases_list.length; i++) {
			let lease = new Lease(leases_list[i]);
			await lease.find(connection);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			leases.push(lease);
		}
		return leases;
	}

	async findBeforeStart(connection, date, property_id){
		let leases_list = await models.Trigger.findBeforeStart(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);
		let leases = [];
		for (let i = 0; i < leases_list.length; i++) {
			let lease = new Lease(leases_list[i]);
			await lease.find(connection);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			leases.push(lease);
		}
		return leases;
	}

	async findFromEnd(connection, date, property_id){
		let leases_list = await models.Trigger.findFromEnd(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);
		let leases = [];
		for (let i = 0; i < leases_list.length; i++) {
			let lease = new Lease(leases_list[i]);
			await lease.find(connection);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			leases.push(lease);
		}
		return leases;
	}



	// async generateDocuments(lease, company, dryrun, cid){

	// 	if (!this.id) e.th(500, "Trigger ID missing");

	// 	if(!this.Attachments.length){
	// 		e.th(400, "No documents found", 'info')
	// 	}
	// 	if(dryrun) return;

	// 	try {
	// 		for (var v in this.Attachments){

	// 			console.log("Creating Panda Doc");
	// 			let response = await PandaDocRoutines.create_panda_doc({
	// 				lease_id: lease.id,
	// 				document_id: this.Attachments[v].document_id,
	// 				company_id: company.id,
	// 				cid: cid
	// 			});

	// 			console.log("Sending Panda Doc");
	// 			// need progressive rollback

	// 			await PandaDocRoutines.send_pandadoc({
	// 				lease_id: lease.id,
	// 				upload_id: response.upload_id,
	// 				document_id: this.Attachments[v].document_id,
	// 				company_id: company.id,
	// 				cid: cid
	// 			});

	// 			// need progressive rollback

	// 			this.Attachments[v].Upload = await PandaDocRoutines.download_pandadoc({
	// 				upload_id: response.upload_id,
	// 				company: company,
	// 				cid: cid
	// 			});


	// 			this.Attachments[v].file = new Buffer(this.Attachments[v].Upload.document.Body).toString('base64');

	// 			this.Attachments[v] = Object.assign({}, this.Attachments[v], response);
	// 		}
	// 	} catch(err) {
	// 		e.th(500, err)
	// 	}



	// }

	// async sendEmails(connection, lease, api_uri, company, property, dryrun){


	// 	if(!company.gds_owner_id || !property.gds_id) {
	// 		e.th(500, "GDS Configuration not found for company or property")
	// 	};
	// 	let responses = []

	// 		try {


	// 			for (let index = 0; index < this.Emails.length; index++) {
	// 				let email_status = {
	// 					errors: []
	// 				}
	// 				let email = this.Emails[index];
	// 				if (!email.id) {
	// 					email_status.errors.push({
	// 						msg: "Email with subject: " + email.subject + " doesnt have a valid ID"
	// 					});
	// 					responses.push(email_status);
	// 					continue;
	// 				}
	// 				// Loop through tenants and send email.

	// 				for (let i = 0; i < lease.Tenants.length; i++) {

	// 					if (!lease.Tenants[i].Contact.email) {
	// 						email_status.errors.push({
	// 							msg: lease.Tenants[i].Contact.first + " " + lease.Tenants[i].Contact.last + " widh ID: " + lease.Tenants[i].Contact.id + " doesn't have a valid email on file"
	// 						});
	// 						continue;
	// 					}

	// 					let message = Trigger.mergeFields(email.message, lease.Tenants[i], lease);
	// 					message = Trigger.replaceNewLineEmail(message);
	// 					// GET Attachment
	// 					let attachments = [];

	// 					if (this.Attachments.length && !dryrun) {
	// 						for (let j = 0; j < this.Attachments.length; j++) {
	// 							if (this.Attachments[j].id) {
	// 								//&& this.Attachments[i].to_email) {
	// 								if (!this.Attachments[j].Upload.id) e.th(500, "Could not email attachment");
	// 								//let attachment = this.getAttachment(api_uri);
	// 								attachments.push({
	// 									content_type: "application/pdf",//this.Attachments[j].Upload.document.ContentType,//response.headers['content-type'],
	// 									name: this.Attachments[j].Upload.name,
	// 									content: this.Attachments[j].file
	// 								});
	// 							}
	// 						}

	// 						// GET DOCUMENT SIGN LINK
	// 						let signer = this.Attachments[i].Upload.signers.find(s => s.tenant_id === lease.Tenants[i].id);
	// 						if (signer && this.Attachments[i].Upload.id) {
	// 							let sign_link = this.getSignLink(signer, this.Attachments[i].Upload.id, this.company_id, api_uri);
	// 							message += '<br /><br /><a href="' + sign_link + '">Click here to sign this document</a>';
	// 						}
	// 					}

	// 					email_status.attachements = attachments;
	// 					email_status.subject = email.subject;
	// 					email_status.to = lease.Tenants[i].Contact.email;
	// 					email_status.message = message;
	// 					email_status.context = 'automation';

	// 					if (!dryrun) {
	// 						let response = await lease.Tenants[i].Contact.sendEmail(connection, email.subject, message, attachments, company, null, 'automation', company.gds_owner_id, property.gds_id);
	// 						email_status.response = response;
	// 					}
	// 					responses.push(email_status);
	// 				}
	// 			}
	// 		} catch(err) {
	// 			e.th(500, err);
	// 		}
	// 	console.log("EMAIL RESPONSES", responses);
	// 	return responses;
	// }

	// async sendSMSs(connection, lease, company, property, dryrun){


	// 	if(!this.id) e.th(500, "Trigger ID missing");

	// 	if(!this.SMSs.length){
	// 		e.th(404, "No SMSs found", 'info')
	// 	}
	// 	if(!company.gds_owner_id || !property.gds_id) {
	// 		e.th(500, "GDS Configuration not found for company or property")
	// 	};
	// 	let responses = [];
	// 	try {
	// 		for(let i = 0; i < this.SMSs.length; i++) {

	// 			let sms_status = {
	// 				errors: []
	// 			}
	// 			let sms = this.SMSs[i];

	// 			if (!sms.id)  sms_status.errors.push({ msg: `SMS with message: ${sms.message} does not have a valid ID.`  });
	// 			if(!sms.active)  sms_status.errors.push({ msg: `SMS with ID: ${sms.id} is not active.`  });

	// 			for (let j = 0; j < lease.Tenants.length; j++) {
	// 				let response = {};
	// 				let message = Trigger.mergeFields(sms.message, lease.Tenants[i], lease);
	// 				let phones = lease.Tenants[i].Contact.Phones.filter(p => p.sms);
	// 				if(!phones.length) continue;
	// 				let phone_ids = phones.map(p => p.id);

	// 				sms_status.message = message;
	// 				sms_status.context = 'automation';
	// 				sms_status.numbers = phones.map(p => p.phone);
	// 				if(!dryrun){
	// 					response = await lease.Tenants[i].Contact.sendSMS(connection, phone_ids, message, company, null, 'automation', company.gds_owner_id, property.gds_id);
	// 				}
	// 				sms_status.response = response;
	// 				responses.push(sms_status);
	// 			}
	// 		}
	// 	} catch(err) {
	// 		e.th(500, err);
	// 	}

	// 	return responses
	// }

	// async createEvents(connection, lease, company, date, dryrun){

	// 	if(!this.id) e.th(500, "Trigger ID missing");

	// 	if(!this.Events.length) {
	// 		e.th(404, "No Events found", 'info')
	// 	};
	// 	let responses = []
	// 	try {
	// 		for(let i = 0; i < this.Events.length; i++) {
	// 			let evt = this.Events[i];
	// 			let event_status = {
	// 				errors: []
	// 			}
	// 			let taskCount = await models.Todo.findOpenDuplicateTasksCount(connection,lease.id,evt.event_type_id);

	// 			if(taskCount) {
	// 				event_status.errors.push({
	// 					msg: evt.EventType.name + " is already present on this lease"
	// 				})
	// 				responses.push(event_status);
	// 				continue;
	// 			}

	// 			let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

	// 			let event = new Event({
	// 				company_id: this.company_id,
	// 				created_by: null,
	// 				start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 				title: evt.EventType.name,
	// 				details: "This event was autogenerated from a trigger.",
	// 				duration: 0,
	// 				is_all_day: 0,
	// 				upload_id: (this.Attachments && this.Attachments.length && this.Attachments[0].Upload && this.Attachments[0].Upload.id) || '',
	// 				event_type_id: evt.event_type_id,
	// 				type: evt.EventType.name,
	// 				group_id: 'TGR_' + this.id
	// 			});

	// 			if(evt.EventType.expires_days){
	// 				event.end_date = datetime.clone().endOf('day').utc().add(evt.EventType.expires_days - 1, 'days').format('YYYY-MM-DD HH:mm:ss')
	// 			}

	// 			if(!dryrun){
	// 				await event.save(connection);
	// 				// Save lease event or contact event depending on what the trigger is
	// 				// past due, lease start, lease end trigger - should be a lease event.
	// 				if(['past_due', 'start_of_lease', 'end_of_lease'].indexOf(this.trigger_reference) >= 0){
	// 					await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
	// 				} else if(['lead', 'reservation'].indexOf(this.trigger_reference)){
	// 					// await event.saveContactEvent(connection, lease.id);
	// 				}
	// 			}

	// 			if(evt.todo) {
	// 				let todo = new Todo({
	// 					original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 					created_by: null,
	// 					object_id: lease.id,
	// 					event_id: event.id,
	// 					details: evt.details,
	// 					snoozed_count: 0,
	// 					completed: 0
	// 				});
	// 				// If this is assigned to someone
	// 				if (evt.contact_id && evt.contact_id > 0) {
	// 					let contact = new Contact({id: evt.contact_id});
	// 					await contact.find(connection);
	// 					await contact.getRole(connection);
	// 					// THIS is only for tenants...
	// 					// await contact.verifyAccess(company.id);
	// 					todo.contact_id = contact.id;
	// 					event_status.contact = contact.first + " " + contact.last;
	// 				} else {
	// 					todo.contact_id = null
	// 				}
	// 				if(!dryrun){
	// 					await todo.save(connection);
	// 				}
	// 				event_status.event = event;
	// 				event_status.todo = todo;
	// 				responses.push(event_status);
	// 			}
	// 		}
	// 	} catch(err){
	// 		e.th(500, err)
	// 	}
	// 	return responses
	// }

	// async updateLeaseStanding(connection, lease, company, date, property,lease_standings, dryrun){
	// 	if(!this.id) e.th(500, "Trigger ID missing");
	// 	if (!this.lease_standing_id) {
	// 		e.th(404, "No status change found", 'info')
	// 	};
	// 	try {
	// 		var statuses = this.canUpdateLeaseStatus(lease_standings,lease);
	// 		if(!dryrun){
	// 			await lease.saveStanding(connection, this.lease_standing_id, date);
	// 		}
	// 	} catch(err){
	// 		console.log("Err",err);
	// 		if(err.code) throw err;
	// 		e.th(500, err)
	// 	}
	// 	return statuses;

	// }

	// canUpdateLeaseStatus(lease_standings,lease){

	// 	let prev_lease_standing = lease_standings.find(lease_standing=>lease_standing.id == lease.lease_standing_id);
	// 	let new_lease_standing = lease_standings.find(lease_standing=>lease_standing.id == this.lease_standing_id);

	// 	if(!Enums.LEASE_STATUS[new_lease_standing.name.replace(' ','').toUpperCase()]){
	// 		e.th(409, `Failed to move ${prev_lease_standing.name} to ${new_lease_standing.name}.  This is not a valid status to move to.`)
	// 	}

	// 	if(Enums.LEASE_STATUS[prev_lease_standing.name.replace(' ','').toUpperCase()] < Enums.LEASE_STATUS[new_lease_standing.name.replace(' ','').toUpperCase()])
	// 		return {
	// 			current_status: prev_lease_standing.name,
	// 			new_status: new_lease_standing.name
	// 		};
	// 	else
	// 		e.th(409, `Failed to move ${prev_lease_standing.name} to ${new_lease_standing.name}.  Current status is equal or more severe.`)
	// }

	// async updateGateAccess(connection, lease, company, date, property, dryrun){


	// 	if(!this.id) e.th(500, "Trigger ID missing");
	// 	if(!this.deny_access) {
	// 		e.th(404, "No no gate access change found", 'info')
	// 	};

	// 	try {
	// 		if(!dryrun){
	// 			console.log("Suspending tenants");
	// 			await lease.suspendTenants(connection, company, property);
	// 		}
	// 	} catch(err){
	// 		e.th(500, err.message)
	// 	}

	// 	let response = {
	// 		tenants: lease.Tenants.map(t => {
	// 			return {
	// 				name: t.Contact.first + " " + t.Contact.last,
	// 			}
	// 		}),
	// 		unit: lease.Unit.number
	// 	}

	// 	return response;


	// }

	async getAttachment(connection, api_uri, attachment){

		// TODO Verify this is correct URL
		let options = {
			method: 'GET',
			uri: api_uri + 'v1/companies/'+ Hashes.encode(connection.cid) +'/uploads/files/' + Hashes.encode(attachment.Upload.id) + '/' + attachment.Upload.name,
			resolveWithFullResponse: true,
			encoding: null
		};

		let response = await rp(options);
		return  {
			type: response.headers['content-type'],
			name: attachment.Upload.name,
			content: response.body.toString('base64')
		};

	}

	async getSignLink(signer, upload_id, company_id, api_uri) {

		let options = {
			method: 'POST',
			uri: api_uri + 'v1/documents/get-sign-link/',
			body: {
				company_id: Hashes.encode(company_id),
				signs: signer.map(s => {
					return Hashes.encode(s.id)
				}),
				upload_id: Hashes.encode(upload_id)
			},
			headers: {
				connection: 'keep-alive'
				/* 'content-type': 'application/x-www-form-urlencoded' */ // Is set automatically
			},
			json: true
		};

		let response = rp(options);
		return settings.config.protocol + '://' + company.subdomain + '.' + settings.config.domain + '/sign-documents/' + response.data.hash;

	}

	// async sendSMSMessage(phone, twilioPhone, message, media_url, company) {

	// 	return await new Promise((resolve, reject) => {
	// 		if (!twilioPhone) return reject();

	// 		if (typeof phone == 'undefined') return reject();

	// 		twilioClient.sendMessage({
	// 			to: settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
	// 			from: twilioPhone, // A number you bought from Twilio and can use for outbound communication
	// 			body: message,
	// 			mediaUrl: media_url
	// 		}, function (err, responseData) { //this function is executed when a response is received from Twilio
	// 			console.log(err);
	// 			if (err) return reject();
	// 			return resolve();
	// 		});
	// 	});
	// }

	// async overlockUnit(connection, lease, company, date, property, dryrun){

	// 	if(!this.overlock){
	// 		e.th(404, "No overlock found", 'info')
	// 	}

	// 	if(lease.to_overlock){
	// 		e.th(409, "Lease is already set to overlock", 'info')
	// 	}
		
	// 	let alr_ov = await lease.Unit.getActiveOverlock(connection);
	// 	if(alr_ov && alr_ov.status == 1) e.th(409, "Unit is already set to overlock", 'info');

	// 	try {


	// 		// if(!this.overlock || lease.to_overlock) return;
	// 		if (!dryrun) {
	// 			await models.Lease.save(connection, {to_overlock: 1}, lease.id)
	// 		}

	// 		let event_types = await models.Event.findEventTypes(connection);

	// 		let type = event_types.find(e => e.slug === 'overlock_space');

	// 		let datetime = date ? moment(date, 'YYYY-MM-DD') : moment();

	// 		let event = new Event({
	// 			company_id: company.id,
	// 			created_by: null,
	// 			start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 			title: type.name,
	// 			details: "This event was autogenerated from a trigger.",
	// 			duration: 0,
	// 			is_all_day: 0,
	// 			upload_id: null,
	// 			event_type_id: type.id,
	// 			type: type.name,
	// 			group_id: 'TGR_' + this.id,
	// 			end_date: null
	// 		});
	// 		if (!dryrun) {
	// 			await event.save(connection);
	// 			await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
	// 		}
	// 		let todo = new Todo({
	// 			original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 			created_by: null,
	// 			object_id: lease.id,
	// 			event_id: event.id,
	// 			details: e.details,
	// 			snoozed_count: 0,
	// 			completed: 0,
	// 			contact_id: null
	// 		});
	// 		if (!dryrun) {
	// 			await todo.save(connection);
	// 		}
	// 		return {
	// 			event: event,
	// 			todo: todo
	// 		}
	// 	} catch(err) {
	// 		e.th(500, err);
	// 	}


	// 	return;
	// }

	// async denyPayments(connection, lease, company, date, property, dryrun){

	// 	if(!this.id) e.th(500, "Trigger ID missing");

	// 	if(!this.deny_payments) {
	// 		e.th(404, "No deny payments flag found", 'info')
	// 	};

	// 	if(lease.deny_payments){
	// 		e.th(409, "Lease is already set to deny payments", 'info')
	// 	}
	// 	try {
	// 		if(!dryrun){
	// 			await lease.denyPayments(connection);
	// 		}
	// 	} catch(err) {
	// 		e.th(500, err);
	// 	}
	// 	return true;

	// }

	// async cancelInsurance(connection, lease, company, date, property, dryrun){
	// 	if(!this.id) e.th(500, "Trigger ID missing");

	// 	if(!this.cancel_insurance) {
	// 		e.th(404, "No cancel insurance flag found", 'info')
	// 	};
	// 	try {
	// 		var activeInsuranceService = await Service.getActiveInsuranceService(connection, lease.id);

	// 		if(!activeInsuranceService) {
	// 			e.th(404, "No active insurance found", 'info')
	// 		};

	// 		if(activeInsuranceService.last_billed && activeInsuranceService.last_billed > date){
	// 			date = activeInsuranceService.last_billed;
	// 		}

	// 		if(!dryrun){
	// 			await activeInsuranceService.endCurrentService(connection, date);
	// 		}
	// 	} catch(err) {
	// 		if(err.code) throw err;
	// 		e.th(500, err);
	// 	}
	// 	return activeInsuranceService;
	// }

	async isLateFeesApplied(connection, lease, company, date){

		if(!this.Fees.length) return;

		let invoice = new Invoice({
			lease_id: lease.id,
			date: date,
			type: "auto"
		});

		return await invoice.findInvoicesByLeaseId(connection);
	}

	async isDocumentGenerated(connection, lease, date){
		if (!this.id) e.th(500, "Trigger ID missing");
		return await lease.findUploads(connection, date);
	}

	async isEmailSent(connection, lease, date){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Emails.length) return;

		let emails_not_sent_list = [];
		let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

		for(let i = 0; i < lease.Tenants.length; i++) {

			let result  = await models.Email.findByContactId(connection, lease.Tenants[i].Contact.id, datetime.format('YYYY-MM-DD'));
			if (!result) {
				emails_not_sent_list.push({contact_id : lease.Tenants[i].Contact.id});
			}
		}
		

		return emails_not_sent_list;
	}

	async isEventCreated(connection, company, date){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Events.length) return;

		let events_not_found = [];

		for(let i = 0; i < this.Events.length; i++) {
			let e = this.Events[i];
			let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

			let event = new Event({
				event_type_id: e.event_type_id,
				type: e.EventType.name,
			});

			let events = await event.findEventsByType(connection, company.id, e.EventType.name, datetime);
			if (!events) events_not_found.push(e);
		}

		return events_not_found;
	}
	
	// async scheduleAuction(connection, lease, company, date, property, dryrun){
	// 	if(!this.schedule_auction) e.th(404, "No auction schedule flag found", 'info')
	// 	if(lease.auction_status != null) e.th(404, "Auction is already scheduled for this lease", 'info')

	// 	if(!dryrun){
	// 		await models.Lease.save(connection, {auction_status: Enums.LEASE_AUCTION_STATUS.SCHEDULE}, lease.id)
	// 	}
	// 	try {
	// 		let event_types = await models.Event.findEventTypes(connection);
	// 		let type = event_types.find(e => e.slug === Enums.EVENT_TYPES.DELINQUECY.CUT_LOCK_SCHEDULE_AUCTION);

	// 		let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

	// 		let event = new Event({
	// 			company_id: company.id,
	// 			created_by: null,
	// 			start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 			title: type.name,
	// 			details: "This event was autogenerated from a trigger.",
	// 			duration: 0,
	// 			is_all_day: 0,
	// 			upload_id: null,
	// 			event_type_id: type.id,
	// 			type: type.name,
	// 			group_id: 'TGR_' + this.id,
	// 			end_date: null
	// 		});

	// 		if(!dryrun){
	// 			await event.save(connection);
	// 			await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
	// 		}

	// 		let todo = new Todo({
	// 			original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
	// 			created_by: null,
	// 			object_id: lease.id,
	// 			event_id: event.id,
	// 			details: e.details,
	// 			snoozed_count: 0,
	// 			completed: 0,
	// 			contact_id: null
	// 		});
	// 		if(!dryrun) {
	// 			await todo.save(connection);
	// 		}

	// 		return{
	// 			event: event,
	// 			todo: todo
	// 		}

	// 	} catch(err) {
	// 		if(err.code) throw err;
	// 		e.th(500, err);
	// 	}



	// }

	static async getTriggerGroupsByPropertyId(connection, property_id){

	}
	static async getTriggersByPropertyId(connection, property_id){
		return await models.Trigger.findTriggersByPropertyId(connection, property_id);
	}

	

	static async findByPropertyId(connection, property_id, date){
		let triggers = await models.Trigger.findByPropertyId(connection, property_id); 
		return triggers; 
	}
}

function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}


module.exports = Trigger;


var Unit      = require('../classes/unit.js');
var Lease      = require('../classes/lease.js');
var Service      = require('../classes/service.js');
var Product      = require('../classes/product.js');
var Event      = require('../classes/event.js');
var Todo      = require('../classes/todo.js');
var Invoice      = require('../classes/invoice.js');
var Contact     =require('../classes/contact.js');
const { resetClosedLeaseStatuses } = require('../models/property.js');
const enums = require('../modules/enums.js');
var PandaDocRoutines = require(__dirname + '/../routines/panda_doc_routines.js');
//var Uploads      = require('./upload.js');
var Uploading     = require(__dirname + '/../classes/upload.js');
