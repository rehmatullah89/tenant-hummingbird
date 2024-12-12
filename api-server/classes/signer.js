"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var crypto      = require('crypto');
var Scheduler = require(__dirname + '/../modules/scheduler.js');

var e  = require(__dirname + '/../modules/error_handler.js');


class Signer {

	constructor(data){
		data = data || {};
		this.id = data.id || null;

		this.contact_id = data.admin_id || null;
		this.upload_id = data.upload_id || null;
		this.status = 0;
		this.fields = [];

		this.name = '';
		this.email = '';

		this.Statuses = [];
		this.Contact = {};
		this.User = {};
		this.Cosigner = {};
		/*
		this.ip_address = data.ip_address || null;
		this.logged_in_user = data.logged_in_user || null;
		this.action = data.action || null;
		this.field_id = data.field_id || null;
		this.created_at = data.created_at || moment().utc().format('YYYY-MM-DD HH:MM:SS');
		this.order = data.order || 1;
		*/
		return this;
	}

	// saveStatus(connection, status, ip_address, logged_in_user){
	// 	var _this = this;
	// 	var sign_status = {
	// 		signer_id: _this.id,
	// 		status: status,
	// 		ip_address: ip_address,
	// 		logged_in_user: logged_in_user,
	// 		created: moment.utc().format('YYYY-MM-DD HH:mm:ss')
	// 	}
  //
	// 	return models.DocumentSign.saveStatus(connection, sign_status).then(function(id){
	// 		sign_status.id = id;
	// 		_this.currentStatus = sign_status;
	// 	})
	// }

	// create(connection, fields, logged_in_user, ip_address){
  //
  //
	// 	return this.save(connection)
	// 		.then(() => this.saveStatus(connection,'REQUEST SIGNING',ip_address, logged_in_user ))
	// 		.then(() => {
	// 			// set up signing fields
	// 			return Promise.mapSeries(fields, f => {
	// 				var fieldData = {
	// 					signer_id: _this.id,
	// 					field_id: f.id,
	// 					action: f.type.toUpperCase(),
	// 					ip_address: ip_address,
	// 					logged_in_user: logged_in_user || null
	// 				}
	// 				return models.DocumentSign.saveAction(connection, fieldData)
	// 					.then(id => {
	// 						fieldData.id = id;
	// 						_this.fields.push(fieldData);
	// 						return true;
	// 					})
	// 				})
	// 		})
	// 		.catch(function(err){
	// 			throw err;
	// 		});
  //
  //
	// }

	save(connection){

		var _this = this;
		if(!connection) throw new Error("Connection not set");
		return this.validate().then(function(){
			var save = {
				tenant_id: _this.tenant_id,
				cosigner_id: _this.cosigner_id,
				contact: _this.admin_id,
				upload_id: _this.upload_id
			};

			return models.DocumentSign.saveSigner(connection, save).then(function(resultId){

				_this.id = resultId;
				return true;
			})

		}).catch(function(err){
			throw err;
		});
	}

	validate(){
		var _this = this;
		return Promise.resolve().then(function(){


			if(!_this.upload_id) {
				throw new Error("Reference document not found");
			}

			if(!_this.tenant_id && !_this.cosigner_id && !_this.admin_id  ) {
				throw new Error("Signer not found");
			}

			return true;
		}).catch(function(err){
			throw err;
		})
	}

	find(connection, company_id){
		var _this = this;

		if(!this.id) e.th(500, "Id not set.");

		return models.DocumentSign.findSignerById(connection, _this.id).then(data => {
			if(!data) e.th(404, "Signer not found");
			_this.tenant_id = data.tenant_id;
			_this.cosigner_id = data.cosigner_id;
			_this.admin_id = data.admin_id;
			_this.upload_id = data.upload_id;
			_this.status = data.status;

			return models.DocumentSign.findStatusBySignerId(connection, _this.id).then(statuses => {

				_this.Statuses = statuses;
				_this.currentStatus = statuses[0];

				return true;
			})

		}).then(() => {

			return models.DocumentSign.findActivityBySignerId(connection, _this.id).then(activity => {
				_this.Fields = activity;
				return;
			})
		}).then(() => {

			if(!_this.tenant_id) return true;

			return models.ContactLeases.findById(connection, _this.tenant_id).then(tenant => {
				var contact  = new Contact({id:  tenant.contact_id});
				return contact.find(connection, company_id).then(() => {
					_this.Contact = contact;
					_this.name = contact.first + ' ' + contact.last;
					_this.email = contact.email;
					return true;
				})
			});

		}).then(function(){

			if(!_this.cosigner_id) return true;

			return models.Contact.findAlternate(connection, _this.Contact.id).then(relationships => {

				var cosigners = relationships.filter(r => r.is_cosigner);
				if(!cosigners.length) return null;

				var cosigner = new Contact({
					id: cosigners[0].contact_id
				})

				return cosigner.find(connection, company_id).then(() => {
					_this.Cosigner = cosigner;

					_this.name = cosigner.first + ' ' + cosigner.last;
					_this.email = cosigner.email;

					return true;
				})
			});

		}).then(function(){

			// if(!_this.admin_id) return true;
			// return models.Admin.findById(connection, _this.admin_id).then(admin => {
			// 	_this.Admin = admin;
			// 	_this.name = admin.User.first + ' ' + admin.User.last;
			// 	_this.email = admin.User.email;
			// 	return true;
			// })
			return true;
		})
	}

	getSignatureFiles(connection, company_id){
		var _this = this;

		var signature =  new Upload({
			foreign_id: this.id,
			model: 'signer',
			type: 'signature_image'
		});

		if(!company_id) e.th(500, 'Company id not set');

		return models.Document.findDocumentTypeByName(connection,  'signature_image', company_id)
			.then(dt =>  {
				console.log(this.Contact);
				console.log('dt');
				if(!dt) return [];
				return models.Upload.findByEntity(connection, 'signer', this.id, dt.id)
			})
			.then(files => {
				console.log("FILES", files);
				if(!files.length) return;
				var upload = new Upload({id: files[0].upload_id});
				return upload.find(connection).then(() => {
					this.signature = upload;
					return
				});
			})
			.then(() => models.Document.findDocumentTypeByName(connection,  'initials_image', company_id))
			.then(dt =>  {
				if(!dt) return [];
				return models.Upload.findByEntity(connection, 'signer', this.id, dt.id)
			})
			.then(files => {

				if(!files.length) return;
				var upload = new Upload({id: files[0].upload_id});
				return upload.find(connection).then(() => {
					this.initials = upload;
					return;
				});
			})


	}

	sendSignEmail(upload, company_id){

		var shipment = {
			lease_doc_id: this.upload_id,
			requested: moment.utc(),
			signer_id: this.id,
			method: 'email',
			date: moment()
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

		var jobParams=[];
		jobParams.push({
			category: 'emailSignature',
			data: {
				signer_id: this.id,
				action: 'sendEmail',
				label: 'sign',
				name: upload.name,
				encrypted: encrypted,
				company_id: company_id
			}
		});
		return new Promise((resolve, reject) => {
			Scheduler.addJobs(jobParams, function(err) {
				if (err) return reject(err);
				return resolve();
			});
		})
	}

}



module.exports = Signer;
var Contact = require(__dirname + '/../classes/contact.js');
var Upload = require(__dirname + '/../classes/upload.js');
