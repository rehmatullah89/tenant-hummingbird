"use strict";

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class MaintenanceRequest {

	constructor(data){

		data = data || {};
		this.id = data.id;
		this.contact_id = data.contact_id;
		this.lease_id = data.lease_id;
		this.request_type_id =  data.request_type_id;
		this.date = data.date;
		this.type = data.type;
		this.status = data.status;
		this.severity = data.severity;
		this.extras= data.extras || [];
		this.msg = '';

		this.RequestType = {};
		this.Thread = [];
		this.statusCodes = {

		}
		this.severityCodes = {
			1: 'Standard',
			2: 'Urgent',
			3: 'Emergency'
		}

		this.Lease = {};
		this.Contact = {};
	}

	find(connection, company_id){
		var _this = this;
		return Promise.resolve().then(function(){
			if(!_this.id) throw "Maintenance id not found";
			return models.Maintenance.findById(connection, _this.id);

		}).then(data =>{



			if(!data) throw "Maintenance request not found.";

			_this.contact_id = data.contact_id;
			_this.lease_id = data.lease_id;
			_this.request_type_id =  data.request_type_id;
			_this.date = data.date;
			_this.type = data.type;
			_this.status = data.status;
			_this.severity = data.severity;
			_this.extras = data.extras ? JSON.parse(data.extras): '';
			_this.phone = data.phone;

			if(!_this.request_type_id) return true;

			var requestType = new MaintenanceRequestType({id: _this.request_type_id });

			return requestType.find(connection).then(()=>{
				_this.RequestType = requestType;
				return true;
			})

		}).then(() => {
			var contact = new Contact({id: _this.contact_id});
			return contact.find(connection, company_id)
			.then(() => {
				_this.Contact = contact;

				return true;
			})
		})
	}

	getLease(connection){

		if(!this.lease_id) return true;

		var lease = new Lease({id: this.lease_id});

		return lease.find(connection)
			.then(() => lease.findUnit(connection))
			.then(() => lease.getTenants(connection))
			.then(() => {
				this.Lease = lease;
				return true;
			})
	}

	getThread(connection, company_id){
		var _this = this;
		if(!_this.id) throw "Maintenance id not found";

		return models.Maintenance.findThread(connection, this.id).mapSeries(message => {

			message.SendTo = { email: [], text:[]};
			message.Uploads = [];
			var contact = new Contact({
				id: message.contact_id
			});

			return models.Upload.findByEntity(connection, 'submessage', message.id)
				.map(file => {
					var upload = new Upload({id: file.upload_id});
					return upload.find(connection)
						.then(() => {
							message.Uploads.push(upload);
							return true;
						});
				})
				.then(() => contact.find(connection, company_id))
				.then(() => contact.getLeases(connection, company_id))
				.then(() => contact.setRole(connection, company_id))
				.then(() =>{

					message.Contact = contact;
					return true;
				})
				.then(()=> {
					// find out who to send it to
					try{
						if(!message.send_to) return message;
						var send_to = JSON.parse(message.send_to);

						return Promise.resolve().then(()=>{
							if(!send_to.email.length) return;
							return Promise.mapSeries(send_to.email, (e) => {
								var tenant = new Contact({id: e});

								return tenant.find(connection, company_id).then(() => {
									return tenant;
								});
							}).then(tenants => {
								message.SendTo.email = tenants;
								return true;
							})
						}).then(() => {

							if(!send_to.text.length) return message;
							return Promise.mapSeries(send_to.text, (e) => {
								return models.Contact.findPhoneById(connection, e).then(phone => {
									if(!phone) return;
									var tenant = new Contact({id: phone.contact_id, company_id: company_id });
									return tenant.find(connection, company_id).then(() => {
										tenant.Phones = tenant.Phones.filter( p => p.id == e);
										return tenant;
									});
								});

								var tenant = new Contact({id: e, company_id: company_id });
								return tenant.find(connection, company_id).then(() => {
									return tenant;
								});
							}).then(tenants => {
								message.SendTo.text = tenants;
								return message;
							})
						})

					} catch (err){
						console.log(err);
						console.log(err.stack);
						message.SendTo = { email:[], text:[] };
						return message;
					}

					return message;
				})

		}).then(messages => {

			_this.Thread = messages;
			return true;
		})

	}

	async validate(){

		if(!this.contact_id) e.th(400, "Please include a contact id");
		if(!this.lease_id) e.th(400, "Please include a lease id");
		if(!this.request_type_id) e.th(400, "Please include a request type id");

	}

	async save(connection){

		await this.validate();

		var data = {
			contact_id: this.contact_id,
			lease_id: this.lease_id,
			request_type_id: this.request_type_id,
			date: this.date || moment.utc().format("YYYY-MM-DD HH:mm:ss"),
			type: this.type || 'Maintenance Request',
			status: this.status || 'open',
			severity: this.severity || 'standard',
			extras : this.extras ? JSON.stringify(this.extras): null
		};

		this.id = await models.Maintenance.saveMaintenance(connection, data, this.id);

	}

	async setExtras(property_extras, submitted_extras){

		let extras = submitted_extras || [];
		// try{
		// 	extras = JSON.parse(submitted_extras);
		// } catch(err){
		// 	extras = [];
		// }


		for(let i = 0 ; i < property_extras.length; i++){
			let foundExtra = extras.find(e => e.id == property_extras[i].id);
			if(property_extras[i].required && (!foundExtra || !foundExtra.value || !foundExtra.value.length )){
				e.th(400, property_extras[i].name + " is required");
			}
			if(!foundExtra) continue;
			property_extras[i].value = foundExtra.value;
			this.extras.push(property_extras[i]);
		}

	}

	async create(connection, data, lease, contact, company, files){

		this.contact_id = contact.id;
		this.lease_id = lease.id;
		this.request_type_id = data.request_type_id;
		this.date = moment.utc().format("YYYY-MM-DD HH:mm:ss");
		this.type= 'Maintenance Request';
		this.status= 'open';
		this.severity = data.severity;

		let property = await models.Property.findByLeaseId(connection, lease.id);

		let property_extras = await models.MaintenanceExtra.findByPropertyId(connection, property.id);

		await this.setExtras(property_extras, data.extras);

		let type = new MaintenanceRequestType({id: this.request_type_id});
		await type.find(connection);

		if(type.deleted) e.th(404, "Maintenance request type not found");

		if(!type.id || type.property_id !== property.id){
			e.th(400, "This request type does not belong to this property");
		}

		await this.save(connection);

		var subMessage = {
			maintenance_id: this.id,
			contact_id: contact.id,
			content: data.content,
			date: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
			source: data.source,
			label: "message"
		};

		// TODO Create submessage class
		subMessage.id = await models.Maintenance.saveSubmessage(connection, subMessage);

		this.Thread.unshift(subMessage);

		if (Array.isArray(files.file)) {
			for(let i = 0; i < files.file.length; i ++){
				this.uploadFile(connection, files.file[i], i, subMessage.id, company.id, contact.id);
			}
		} else if(files.file){
			this.uploadFile(connection, files.file, 1, subMessage.id, company.id, contact.id);
		}

		
		let interaction = new Interaction();
		let space = interaction.findSpaceByLeaseID(connection, lease.id);
		//await interaction.create(connection, property.id, space, contact.id, contact.id, moment.utc(subMessage.date),  subMessage.content, 'maintenance request', false, null, null, null, data.context, null, true);
		//Not sure how to show Maintenance requests 
		//await interaction.create(connection, property.id, space, contact.id, contact.id, subMessage.content, 'maintenance request', false, null, null, null, data.context, null, true);

	}

	makeChatMessage(connection, contact_id, content, label, source){

		if(!this.id) e.th(500);

		let subMessage = {
			maintenance_id: this.id,
			contact_id: contact_id,
			content: content,
			send_to: null,
			date: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
			source: source,
			label: label
		};

		return subMessage;
	}


	makeMessage(contact, data ){

		if(!this.id) e.th(500);

		let sendTo = {email:[],text:[]};

		if(data.text) sendTo.text = data.text.split(',').map(t => Hashes.decode(t)[0]);
		if(data.email) sendTo.email = data.email.split(',').map(e => Hashes.decode(e)[0]);

		data.label = 'message';

		//Hack for status being sent as text...
		if(data.status && data.status != 'null'  &&  (data.status.toLowerCase() != this.status.toLowerCase()) ){
			data.label = data.status.toLowerCase();
		}

		if(contact.roles.includes('admin') && !sendTo.text.length && !sendTo.email.length){
			e.th(400, "This message is not being sent to anyone!");
		}

		if(!data.content.length && data.label == 'message'){
			e.th(400, "You have not entered a message to send.");
		}


		let subMessage = {
			maintenance_id: this.id,
			contact_id: contact.id,
			content: data.content,
			send_to: sendTo ? JSON.stringify(sendTo) : null,
			date: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
			source: data.source,
			label: data.label
		};

		return subMessage;

	}

	async saveMessage(connection, message){

		// TODO validate
		console.log("Message", message);
		message.id = await models.Maintenance.saveSubmessage(connection, message, message.id);

		this.Thread.unshift(message);
		return message;

	}

	async markRead(connection){

		if(!this.id) e.th(500);
		await models.Maintenance.markRead(connection, this.id);

	}

	// async uploadFile(connection, file, index, subMessage, company, contact){
	// 	let upload = new Upload();
	// 	await upload.setDocumentType(connection, null, 'file', company.id);
	// 	upload.setFile(file);
	// 	upload.uploaded_by = contact.id;
	// 	await upload.save(connection);
	// 	await upload.saveUploadSubmessage(connection, subMessage.id, index);
	// }


	async updateStatus(connection, message){

		if(!this.id) e.th(500);
		await models.Maintenance.saveMaintenance(connection, {status: message.label}, this.id);
	}

	async uploadFileToMessage(connection, company, contact,message, files){
		console.log(files.file);

		if (Array.isArray(files.file)) {
			for(let i = 0; i < files.file.length; i++ ){
				await this.uploadFile(connection, files.file[i], i, message.id, company.id, contact.id);
			}
		} else if(files.file) {
			await this.uploadFile(connection, files.file, 0, message.id, company.id, contact.id);
		}
	}

	async uploadFile(connection, file, index, message_id, company_id, contact_id){
		let upload = new Upload();
		await upload.setDocumentType(connection, null, 'file', company_id)
		upload.setFile(file);
		upload.uploaded_by = contact_id;
		await upload.save(connection);
		await upload.saveUploadSubmessage(connection, message_id, index);
	}

	async getCompanyId(connection){
		return await models.Maintenance.findCompanyId(connection, this.id);
	}

	async verifyAccess(connection, company, properties){

		if(!this.id) e.th(500);

    let company_id = await models.Maintenance.findCompanyId(connection, this.id);
		if(company_id !== company.id){
			e.th(403, 'Unauthorized');
		}

		if(properties.length){
		  let property_id = await models.Maintenance.findPropertyId(connection, this.id);
      if(properties.indexOf(property_id) < 0) e.th(403, 'Unauthorized');
    }



		// console.log(contact);
		//
		// if(contact && contact.role == 'admin'){
		// 	var inCompany = contact.Companies.filter(c => c.id == company.id);
		//
		// 	if(!inCompany.length){
		// 		e.th(403, 'Unauthorized');
		// 	}
		//
		// } else if(contact) {
		//
		// 	let onLease = contact.Leases.filter(l => {
		// 		return l.id == this.Lease.id
		// 	});
		//
		// 	if(!onLease.length) {
		// 		e.th(403, 'Unauthorized');
		// 	}
		// }

	}

	static async findAll(connection, properties){
    return await models.MaintenanceType.findAll(connection, properties);
  }

	async verifyChatActive(connection, company, contact){

		if(!this.id) e.th(500);

		let company_id = await models.Maintenance.findCompanyId(connection, this.id)

		if(company_id !== company.id){
			e.th(403, 'Unauthorized');
		}

	}
}


class MaintenanceRequestType {

	constructor(data){

		data = data || {};
		this.id = data.id;
		this.property_id = data.property_id;
		this.vendor_id = data.vendor_id;
		this.name =  data.name;
		this.email = data.email;
		this.text = data.text;
		this.sort = data.sort;
		this.deleted = data.deleted;
		this.msg = '';

	}

	find(connection){

		if(!this.id) throw "Request Type id not set";
		return models.Maintenance.findRequestTypeById(connection, this.id).then((data)=> {

			if(!data) e.th(404, "Maintenance request type not found");

			this.property_id = data.property_id;
			this.vendor_id = data.vendor_id;
			this.name =  data.name;
			this.email = data.email? JSON.parse(data.email): [];
			this.text = data.text? JSON.parse(data.text): [];
			this.sort = data.sort;
			this.deleted = data.deleted;
			return true;
		})
	}

}

module.exports = MaintenanceRequest;

var User  = require(__dirname + '/user.js');
var Upload      = require('../classes/upload.js');
var Lease  = require(__dirname + '/lease.js');
var Contact  = require(__dirname + '/contact.js');
var Interaction = require(__dirname + '/interaction.js');
