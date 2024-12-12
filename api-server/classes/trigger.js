"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var Hashes = require(__dirname + '/../modules/hashes.js').init();
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Enums  = require(__dirname + '/../modules/enums.js');
var request = require('request');
var rp = require('request-promise');

var Mail = require(__dirname + '/../modules/mail.js');
var { sendSMS: sendSMSMessage } = require('./../modules/sms');

class Trigger {

  constructor(data) {
		data = data || {};
		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.name = data.name || null;
		this.description = data.description || null;
		this.start = data.start || 0;
		this.trigger_reference = data.trigger_reference || null;
		this.repeat = !!data.repeat;
		this.active = !!data.active;
		this.overlock = !!data.overlock;
		this.silence = data.silence || null;
		this.max_repeat = !!data.max_repeat;
		this.deny_access = !!data.deny_access;
		this.deny_payments = !!data.deny_payments;
		this.cancel_insurance = !!data.cancel_insurance;
		this.schedule_auction = !!data.schedule_auction;
		this.lease_standing_id = data.lease_standing_id || null;
		this.trigger_group_id = data.trigger_group_id || null;
		this.apply_to_all = !!data.apply_to_all;

		this.Actions = data.Actions || [];

		this.Events = [];
		this.Fees = [];
		this.Attachments = [];
		this.Messages = [];
		// this.Emails = [];
		// this.SMSs = [];
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

	
	addAttachment(data){

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
		console.log("data", data)
		this.Messages.push(message);

		return true;
	}
	


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
		this.Events.push(event);

		return true;
	}

	async validate(){
		if (!this.company_id) e.th(400, 'Invalid company id');
		if (!this.name) e.th(400, 'Please enter a name for this trigger');
		if (!this.start) e.th(400, 'Please enter a start time');
		if (!this.start) e.th(400, 'PLease enter a trigger reference');
		return Promise.resolve();
	}

	async save(connection){

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

		let result =  await models.Trigger.save(connection, save, this.id);
		if(result.insertId) this.id = result.insertId;

		await this.saveFee(connection);
	//	await this.saveEmail(connection);
		// await this.saveSMS(connection);
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
					subject: dm.subject, 
					active: dm.active, 
					message: dm.message,
					delivery_methods_id: dm.delivery_methods_id
				}
				await models.Trigger.saveDeliveryMethod(connection, saveMethod, dm.id);

			}

		}

		for (var i = 0; i < savedAttachments.length; i++) {
			let result = this.Attachments.find(a => a.id && a.id === savedAttachments[i].id);

			if(!result){
				await models.Trigger.deleteAttachement(connection, savedAttachments[i].id);
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
					subject: dm.subject, 
					active: dm.active, 
					message: dm.message,
					delivery_methods_id: dm.delivery_methods_id
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

	delete(connection){
		var _this = this;
		return models.Trigger.delete(connection, _this.id);
	}

	async find(connection){

		if (!this.id) e.th(500, 'No Id is set');
		let data = await  models.Trigger.findById(connection, this.id);

		if(!data){
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
			console.log("message.DeliveryMethods ", message.DeliveryMethods )
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

	static async getActionTypes(connection){
		return await models.Trigger.getActionTypes(connection);
	}

	async decomposeActions(connection, actions = []){
		if(!actions.length) return;
		let action_types = await models.Trigger.getActionTypes(connection);
		for(let i = 0; i < action_types.length; i++){
			let action_type = action_types[i];
			let data = actions.filter(a => a.action_id === action_type.id);
			let addFunc;
			console.log("data", data);
			switch(action_type.label){
				case 'deny_access':
					this.deny_access = (data && data.length > 0) | 0;
					continue;
				case 'overlock':
					this.overlock = (data && data.length > 0) | 0;
					continue;
				case 'add_fee':
					addFunc = x => this.addFee(x);
					break;
				case 'change_status':
					this.lease_standing_id = data && data.length > 0 && data[0].lease_standing_id;
					continue;
				case 'generate_document':
					addFunc = x => this.addAttachment(x);
					break;
				case 'create_task':
					addFunc = x => this.addEvent(x);
					break;
				case 'send_message': 
					addFunc = x => this.addMessage(x);
					break;
				case 'deny_online_payments':
					this.deny_payments = (data && data.length > 0) | 0;
					continue;
				case 'cancel_insurance':
					this.cancel_insurance = (data && data.length > 0) | 0;
					continue;
				case 'schedule_auction':
					this.schedule_auction = (data && data.length > 0) | 0;
					continue;
			}

			if(data){
				for(let j = 0; j < data.length; j++){
					
					addFunc(data[j]);
				}
			}

		}
	}

	async composeActions(connection){
		let action_types = await models.Trigger.getActionTypes(connection);
		for(let i = 0; i < action_types.length; i++){
			let action_type = action_types[i];
			let data;
			switch(action_type.label){
				case 'deny_access':
					if(!this.deny_access) continue;
					break;
				case 'overlock':
					if(!this.overlock) continue;
					break;
				case 'add_fee':
					data = this.Fees;
					break;
				case 'change_status':
					if(!this.lease_standing_id) continue;
					data = {lease_standing_id: this.lease_standing_id};
					break;
				case 'generate_document':
					data = this.Attachments;
					break;
				case 'create_task':
					data = this.Events;
					break;
				case 'send_message':
					data = this.Messages;
					break;
				case 'deny_online_payments':
					if(!this.deny_payments) continue;
					break;
				case 'cancel_insurance':
					if(!this.cancel_insurance) continue;
					break;
				case 'schedule_auction':
					if(!this.schedule_auction) continue;
					break;
			}
			console.log("action_type, data", action_type, data)
			this.addActions(action_type, data);
		}
	}

	addActions({id, name, label}, data){
		let action = {action_id: id, name, label};
		if(data){
			if (Array.isArray(data)) {
				for(let i = 0; i < data.length; i++) {
					this.Actions.push({...action, ...data[i]});
				}
			} else {
				this.Actions.push({...action, ...data});
			}
		} else {
			this.Actions.push({...action});
		}
	}

	async update(connection, data){

		this.name = data.name;
		this.description = data.description;
		this.repeat = data.repeat;
		this.max_repeat = data.max_repeat;
		this.start = data.start;
		this.trigger_reference = data.trigger_reference;
		this.trigger_group_id = data.trigger_group_id || this.trigger_group_id;
		this.apply_to_all = !!data.apply_to_all;

		await this.decomposeActions(connection, data.Actions);
	}

	static mergeFields(message, tenant, lease){

		if(tenant){
			message = replaceAll(message, "[FIRSTNAME]", validation.capitalizeFirst(tenant.Contact.first))
			message = replaceAll(message, "[LASTNAME]", validation.capitalizeFirst(tenant.Contact.last))
			message = replaceAll(message, "[EMAIL]", tenant.Contact.email);
			if(tenant.Contact.Phones.length){
				message = replaceAll(message, "[PHONE]", tenant.Contact.Phones[0].phone);
			}
		}

		if(lease){
			message = replaceAll(message, "[RENT]",  "$" + lease.rent.toFixed(2));
			message = replaceAll(message, "[ADDRESS]", lease.Unit.Address.address);
			message = replaceAll(message, "[NUMBER]", "#" + lease.Unit.number);
			message = replaceAll(message, "[CITY]", lease.Unit.Address.city);
			message = replaceAll(message, "[STATE]", lease.Unit.Address.state);
			message = replaceAll(message, "[ZIP]", lease.Unit.Address.zip);
		}


		lease.balance = lease.balance || 0;
		message = replaceAll(message, "[BALANCE]", "$" + lease.balance.toFixed(2));

		if(lease.bill_day){
			message = replaceAll(message, "[BILLDAY]", lease.bill_day);
		}

		


		return message;
	}

	static replaceNewLineEmail(message) {
		return message.replace(/\n/g,'<br />');
	}

	static async findByCompanyId(connection, company_id, filter){
		return await models.Trigger.findByCompanyId(connection, company_id, filter);
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
		for(let i = 0; i < past_due_invoices.length; i++){
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
		let past_due_invoices = await models.Trigger.findOverdue(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);

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
			leases.push(lease);
		}
		// TODO Will this return multiple invoices for the same lease?
		return leases;
	}

	async findFromStart(connection, date, property_id){
		let leases_list = await models.Trigger.findFromStart(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);
		let leases = [];
		for(let i = 0; i < leases_list.length; i++){
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
		for(let i = 0; i < leases_list.length; i++){
			let lease = new Lease(leases_list[i]);
			await lease.find(connection);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			lease.push(lease);
		}
		return leases;
	}

	async findFromEnd(connection, date, property_id){
		let leases_list = await models.Trigger.findFromEnd(connection, date, this.repeat, this.max_repeat, this.start, this.company_id, property_id);
		let leases = [];
		for(let i = 0; i < leases_list.length; i++){
			let lease = new Lease(leases_list[i]);
			await lease.find(connection);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			lease.push(lease);
		}
		return leases;
	}

	async applyLateFees(connection, lease, company, property){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Fees.length) return;

		for(let i = 0; i < this.Fees.length; i++ ){
			let fee = this.Fees[i];

			let late_fee_amount = 0;
			let product = new Product(fee.Product);

			let productDetails =  await lease.getProductDetails(connection, product, property);

			console.log(productDetails);

			if(!productDetails) e.th(400, "No details found");


			let service = new Service({
				lease_id: lease.id,
				product_id: fee.product_id,
				price: productDetails.override_price || productDetails.price,
				start_date: moment().format('YYYY-MM-DD'),
				end_date: moment().format('YYYY-MM-DD'),
				name: fee.Product.name,
				qty: 1,
				recurring: 0,
				prorate: 0
			});

			service.Product = product;
			await service.Product.find(connection);
			service.Product.price = productDetails.override_price || productDetails.price;
			service.Product.taxable = productDetails.taxable;


			//await service.save(connection);
			//await service.find(connection);

			let today = moment().startOf('day');
			let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
			let invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: moment(datetime).format('YYYY-MM-DD'),
				company_id: company.id,
				type: "auto",
				status: 1
			});
			invoice.Lease = lease;
			invoice.Company = company;

			await invoice.makeFromServices(connection, [service], lease, today, today, [], company.id);
			await invoice.save(connection);

		}

	}

	async generateDocuments(connection, lease, api_uri, company, property){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Attachments.length) return;

		await lease.findFull(connection, company.id);

		for(let i = 0; i < this.Attachments.length; i++){

			let attachment = this.Attachments[i];
			if (!attachment.id) return;

			let document = new Document({id: attachment.document_id});
			await document.getTemplateDetails(company);
			await document.mergeTokens(lease);

			if(document.requiresSign){
				await document.setSigners(lease);
			}
			let response = await document.createPandaDoc(lease, company);

			let upload = new Upload({
				foreign_id: response.id,
				name: response.name,
				mimetype: 'application/pdf'
			});

			await upload.setDocumentType(connection, null, 'file', company.id);
			await upload.save(connection);
			await upload.saveUploadLease(connection, lease.id);

			if(document.requiresSign){
				for(let i = 0; i < document.Signers.length; i++){
					await upload.saveUploadSigner(connection, document.Signers[i]);
				}
				await upload.findSigners(connection, company.id);
				await upload.waitForDraftBeforeSend(company);
			}

			upload.fileloc = process.env.BASE_PATH + utils.slugify(upload.name) + '.pdf';
			upload.filename = utils.slugify(upload.name) + '_'+ moment().format('x') + '.pdf';
			await upload.downloadPandaDoc(company);
			await upload.save(connection);
		}

	}

	async sendEmails(connection, lease, api_uri, company, property){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Emails.length || !company.gds_owner_id || property.gds_id) return;

		for(let i = 0; i < this.Emails.length; i++){

			let email = this.Emails[i];

			if(!email.id) return Promise.resolve();
			// Loop through tenants and send email.

			for(let i = 0; i < lease.Tenants.length; i++) {

				if (!lease.Tenants[i].Contact.email) {
					// todo record that email couldn't be send without a valid email
					continue;
				}

				let message = Trigger.mergeFields(email.message, lease.Tenants[i], lease);
				message = Trigger.replaceNewLineEmail(message);

				// GET Attachment
				let attachments = [];

				if(this.Attachments.length && lease.Attachments){
					for(let j = 0; j < lease.Attachments.length; j++) {
						if (this.Attachments[i].id && this.Attachments[i].to_email) {
							if (!this.Attachments[i].Upload.id) e.th(500, "Could not email attachment");
							let attachment = this.getAttachment(connection, api_uri);
							attachments.push(attachment);
						}
					}
					// GET DOCUMENT SIGN LINK
					let signer = this.Attachments[i].Signers.find(s => s.tenant_id === lease.Tenants[i].id);
					if (signer && this.Attachments[i].Upload.id) {
						let sign_link = this.getSignLink(signer, this.Attachments[i].Upload.id, this.company_id, api_uri, connection);
						message += '<br /><br /><a href="' + sign_link + '">Click here to sign this document</a>';
					}
				}
                let space = 'Tenant';
				if (lease.id) {
					let lease = new Lease({id: lease.id});
						await lease.find(connection);
						if (lease && lease.Unit) {
							space = lease.Unit.number;
						}
				}
				let response = await lease.Tenants[i].Contact.sendEmail(connection, property.id, space, email.subject, message, attachments, company, company.name, 'automation', company.gds_owner_id, property.gds_id,null,lease.Tenants[i].Contact.id, lease.id);

			}
		}
	}

	async sendSMSs(connection, lease, company, property){

		let response = {};
		if(!this.id) e.th(500, "Trigger ID missing");


		if(!this.SMSs.length || !company.gds_owner_id || property.gds_id) return;

		for(let i = 0; i < this.SMSs.length; i++) {
			let sms = this.SMSs[i];

			if (!sms.id || !sms.active) return;

			for (let j = 0; j < lease.Tenants.length; j++) {

				let message = Trigger.mergeFields(sms.message, lease.Tenants[i], lease);
				let phones = lease.Tenants[i].Contact.Phones.filter(p => p.sms);
				if(!phones.length) continue;
				let space = 'Tenant';
				if (lease.id) {
					let lease = new Lease({id: lease.id});
						await lease.find(connection);
						if (lease && lease.Unit) {
							space = lease.Unit.number;
						}
				}
				let sendSMSPayload = {
					property_id: property.id, 
					space, 
					phones,
					message,
					logged_in_user: company.name,
					context: 'automation',
					owner_id: company.gds_owner_id,
					property_id: property.gds_id
				};
				response = await lease.Tenants[i].Contact.sendSMS(connection, sendSMSPayload);
			}
		}
	}

	async createEvents(connection, lease, company, date){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.Events.length) return;
		for(let i = 0; i < this.Events.length; i++) {
			let e = this.Events[i];


			let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

			let event = new Event({
				company_id: this.company_id,
				created_by: null,
				start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
				title: e.EventType.name,
				details: "This event was autogenerated from a trigger.",
				duration: 0,
				is_all_day: 0,
				upload_id: this.Upload.id,
				event_type_id: e.event_type_id,
				type: e.EventType.name,
				group_id: 'TGR_' + this.id
			});

			if(e.EventType.expires_days){
				event.end_date = datetime.clone().endOf('day').utc().add(e.EventType.expires_days - 1, 'days').format('YYYY-MM-DD HH:mm:ss')
			}

			await event.save(connection);

			// TODO wait until it saves..
			//await event.setTrigger(company);

			// Save lease event or contact event depending on what the trigger is
			// past due, lease start, lease end trigger - should be a lease event.
			if(['past_due', 'start_of_lease', 'end_of_lease'].indexOf(this.trigger_reference) >= 0){
				await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
			} else if(['lead', 'reservation'].indexOf(this.trigger_reference)){
				// await event.saveContactEvent(connection, lease.id);
			}

			if(e.todo) {
				let todo = new Todo({
					original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
					created_by: null,
					object_id: lease.id,
					event_id: event.id,
					details: e.details,
					snoozed_count: 0,
					completed: 0
				});
				// If this is assigned to someone
				if (e.contact_id && e.contact_id > 0) {
					let contact = new Contact({id: e.contact_id});
					await contact.find(connection);
					await contact.verifyAccess(company.id);
					todo.contact_id = contact.id;
				} else {
					todo.contact_id = null
				}
				await todo.save(connection);
			}
		}
	}

	async updateLeaseStanding(connection, lease, company, date, property){
		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.lease_standing_id) return;

		await lease.saveStanding(connection, this.lease_standing_id, date);
		// How do we know an account has become current ???
		// TODO Record Activity so we know

	}

	async updateGateAccess(connection, lease, company, date, property){
		if(!this.id) e.th(500, "Trigger ID missing");
		if(!this.deny_access) return;

		await lease.suspendTenants(connection, company, property);


	}

	async getAttachment(connection, api_uri, attachment){

		// TODO Verify this is correct URL
    // TODO - Verify this is used in API SERVER.. I dont think it is - its missing cid in encode call below
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

	async getSignLink(signer, upload_id, company_id, api_uri, connection){

		let options = {
			method: 'POST',
			uri: api_uri + 'v1/documents/get-sign-link/',
			body: {
				company_id:  Hashes.encode(company_id, connection.cid),
				signs: signer.map(s => {
					return Hashes.encode(s.id, connection.cid)
				}),
				upload_id: Hashes.encode(upload_id, connection.cid)
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

	async sendSMSMessage(phone, twilioPhone, message, media_url, company){

		return await new Promise( (resolve, reject) => {
			if(!twilioPhone) return reject();

			if(typeof phone == 'undefined') return reject();

			twilioClient.sendMessage({
				to: settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
				from: twilioPhone, // A number you bought from Twilio and can use for outbound communication
				body: message,
				mediaUrl: media_url
			}, function(err, responseData) { //this function is executed when a response is received from Twilio
				console.log(err);
				if(err) return reject();
				return resolve();
			});
		});
	}

	async overlockUnit(connection, lease, company, date, property){

		if(!this.overlock) return;
		let unit = new Unit({id: lease.unit_id});
		try {
			return await unit.setOverlock(connection);
		} catch(err) {
			console.log(err);
		}
		return;
	}

	async denyPayments(connection, lease, company, date, property){

		if(!this.id) e.th(500, "Trigger ID missing");

		if(!this.lease_standing_id) return;

		await lease.denyPayments(connection);
	}

	async cancelInsurance(connection, lease, company, date, property){
		if(!this.id) e.th(500, "Trigger ID missing");

		let activeInsuranceService = await Service.getActiveInsuranceService(connection, lease.id);
		if(!activeInsuranceService) return;
		await activeInsuranceService.endCurrentService(connection, date);
	}


	resetTriggerIds(){
		this.id = null;
		this.trigger_group_id = null;
		let resetIds = (data) => {
			console.log("data", data)
			for(let i = 0; i< data.length; i++){
				data[i].id = null;
				data[i].trigger_id = null;
			}
		}

		resetIds(this.Fees);
		// resetIds(this.Emails);
		resetIds(this.Messages);
		resetIds(this.Events);
		// resetIds(this.SMSs);
		resetIds(this.Attachments);
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

var Document      = require('../classes/document.js');
var Unit      = require('../classes/unit.js');
var Lease      = require('../classes/lease.js');
var Service      = require('../classes/service.js');
var Product      = require('../classes/product.js');
var Event      = require('../classes/event.js');
var Todo      = require('../classes/todo.js');
var Invoice      = require('../classes/invoice.js');
var Upload      = require('../classes/upload.js');
var Company      = require('../classes/company.js');
var Pandadocs      = require('../modules/pandadocs.js');