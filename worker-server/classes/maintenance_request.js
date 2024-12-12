"use strict";

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');


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
		this.extras= data.extras;
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

		}).then(function(data){


			if(!data) throw "Maintenance request not found.";


			_this.contact_id = data.contact_id;
			_this.lease_id = data.lease_id;
			_this.request_type_id =  data.request_type_id;
			_this.date = data.date;
			_this.type = data.type;
			_this.status = data.status;
			_this.severity = data.severity;
			_this.extras = data.extras ? JSON.parse(data.extras): '';

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
		var _this = this;
		var lease = new Lease({id: this.lease_id});
		
		return lease.find(connection)
			.then(() => lease.findUnit(connection))
			.then(() => lease.getTenants(connection))
			.then(() => {
				_this.Lease = lease;
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
					console.log(file);
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

	validate(){

		var _this = this;

		try {

			if (!_this.city) {
				throw 'City is missing';
			}

			if (!_this.state ) {
				throw 'State is missing';
			}

			if (!_this.zip) {
				throw 'Zip is missing';
			}

			if (!_this.address) {
				throw 'Street number is missing';
			}

			if (!_this.lat || !_this.lng) {
				// Currently optional
				//          throw 'Latitude/longitude is missing';
			}

		} catch(err){
			_this.msg = err.toString();
			return false;
		}
		return true;


	}

	save(connection){
		var _this = this;

		return Promise.resolve().then(function() {

			if (!_this.validate()) {
				return false;
			}

			var save = {
				address: _this.address,
				neighborhood: _this.neighborhood,
				city: _this.city,
				state: _this.state,
				zip: _this.zip,
				country: _this.country,
				lat: _this.lat,
				lng: _this.lng,
				formatted_address: _this.formatted_address
			};

			return models.Address.save(connection, save).then(function (result) {
				if (result.insertId) _this.id = result.insertId;
				return true;
			});

		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})
	}

	verifyAccess(connection, company, contact){
		var _this = this;

		return Promise.resolve().then(() => {
			return models.Maintenance.findCompanyId(connection, _this.id)
		}).then(company_id => {

			if(company_id == company.id) return true;
			var error = new Error('Unauthorized');
			error.code = '403';
			throw error;

		}).then(() => {

			if(contact.role == 'admin'){
				var inCompany = contact.Companies.filter(c => c.id == company.id);
				if(inCompany.length) return true;
				var error = new Error('Unauthorized');
				error.code = '403';
				throw error;
			} else {
				var onLease = contact.Leases.filter(l => {
					return l.id == this.Lease.id
				});
				if(onLease.length) return true;
				var error = new Error('Unauthorized');
				error.code = '403';
				throw error;
			}

		})

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
		this.msg = '';

	}

	find(connection){
		var _this = this;
		if(!this.id) throw "Request Type id not set";
		return models.Maintenance.findRequestTypeById(connection, this.id).then((data)=> {
			_this.property_id = data.property_id;
			_this.vendor_id = data.vendor_id;
			_this.name =  data.name;
			_this.email = data.email? JSON.parse(data.email): [];
			_this.text = data.text? JSON.parse(data.text): [];
			return true;
		})
	}

}

module.exports = MaintenanceRequest;

var User  = require(__dirname + '/user.js');
var Upload      = require('../classes/upload.js');
var Lease  = require(__dirname + '/lease.js');
var Contact  = require(__dirname + '/contact.js');