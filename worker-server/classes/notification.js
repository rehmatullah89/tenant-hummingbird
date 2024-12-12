"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var request = require('request');
var rp = require('request-promise');
var fillTemplate = require('es6-dynamic-template');

var crypto      = require('crypto');
var twilioClient = require('twilio')(settings.twilio.accountSid, settings.twilio.authToken);

class Notification {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.company_id = data.company_id;
		this.contact_id = data.contact_id || null;
		this.activity_id = data.activity_id || null;
		this.text = data.text || 0;
		this.email = data.email || 0;
		this.created = data.created || null;
		this.status = data.status || 0;

		this.Activity = {};
		this.Contact = {};
		this.Lease = {};
		this.Invoice = {};

		return this;
	}

	validate(){
		var _this = this;
		var error = false;
		return Promise.resolve().then(() => {

			if (!_this.activity_id) {
				error = new Error("Missing Activity Id");
				throw error;
			}

			if (!_this.contact_id) {
				error = new Error("Missing Contact Id");
				throw error;
			}

			return true;
		})
	}

	save(connection, activity){

		var company = {};
		return this.validate().then(() => {
			var save = {
				company_id: this.company_id,
				contact_id: this.contact_id,
				activity_id: this.activity_id,
				text: this.text,
				email: this.email,
				status: this.status
			};

			

			return models.Notification.save(connection, save, this.id).then(result =>{

				this.id = result.insertId;
				if(settings.environment_name == 'app'){
					var jobParams = [];
					jobParams.push({
						category: 'notification',
						data: {
							id: this.id,
							action: 'notify',
							label: 'send'
						}
					});
					return Scheduler.addJobsAsync(jobParams);
				} else if(settings.environment_name == 'worker'){

					return this.find(connection)
						.then(() => {
							if(!this.contact_id) return true;
							this.Contact = new Contact({id: this.contact_id});
							return this.Contact.find(connection, this.company_id)
						})
						.then(() => {
							this.Activity = activity;
							return this.Activity.find(connection)
						})
						.then(() => this.Activity.findContact(connection, this.company_id))
						.then(() => this.Activity.findActivityObject(connection))
						.then(() => this.Activity.findActivityAction(connection))
						.then(() => this.Activity.findObject(connection))
						.then(() => this.Activity.buildMessage())
						.then(() => {
							company = new Company({id: this.company_id});
							return company.find(connection)
						})
						.then(() => this.sendMessage(connection, company))

				}
			})
		})
	}

	delete(connection){
		var _this = this;
		return models.Notification.delete(connection, _this.id);
	}

	markRead(connection){
		var _this = this;
		return models.Notification.save(connection, {status:1},  _this.id);
	}

	markUnread(connection){
		var _this = this;
		return models.Notification.save(connection, {read:0},  _this.id);
	}

	find(connection){

		var _this = this;
		return Promise.resolve().then(function() {

			if (!_this.id) {
				var error = new Error("No id set");
				error.code = 500;
				throw error
			}

			console.log(_this.id);

			return models.Notification.findById(connection, _this.id);

		}).then(function(data) {
			if (!data) {
				var error = new Error("Notification not found");
				error.code = 404;
				throw error
			}

			_this.id = data.id;
			_this.company_id = data.company_id;
			_this.contact_id = data.contact_id;
			_this.text = data.text;
			_this.email = data.email;
			_this.activity_id = data.activity_id;
			_this.created = data.created;
			_this.status = data.status;

			return true;

		});

	}

	ping(type = null){
		// TODO resolve this issue..
		if(settings.is_prod){
			return rp("https://api:" + process.env.API_PORT + "/v1/notifications/ping/" + this.company_id + '?type=' + type);
		} else {
			// return rp("http://10.0.46.14/v1/notifications/ping/" + this.company_id + '?type=' + type);
		}
	}




	sendMessage(connection, company){
		var _this = this;

		var shipment = {
			contact_id: this.Contact.id,
			fn: 'notification',
			notification_id: this.id,
			requested: moment.utc(),
			domain: company.domain
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

		return Promise.resolve()
			.then(() => {
				if (!this.email) return;
				return _this.sendEmail(connection, company, encrypted)
			}).then(() => {
				if (!this.text) return;

				var phones = this.Contact.Phones.filter(p => p.sms);
				if(!phones.length) return;
				return _this.sendSms(phones[0], company, encrypted ).catch(err => {
					return
				})

			})
	}

	sendEmail(connection, company, encrypted){

		var values = {
			email: this.Contact.email,
			owner_id: company.gds_owner_id,
			to: this.Contact.first + ' ' + this.Contact.last,
			from:    company.name + " Online Management",
			subject: "New Notification",
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'logo',
						content: company.getLogoPath()
					},
					{
						name: 'headline',
						content: 'Notification'
					},
					{
						name: 'content',
						content: "<p>" + this.Activity.message + "<br /><br />For more information visit: " + settings.config.protocol + "://" + company.subdomain + "." + settings.config.domain + "/notifications/r/" + encrypted + "</p>"
					}]
			},
			company_id: company.id,
			contact_id: this.Contact.id
		};
		
		if(typeof Mail.sendBasicEmail == 'function'){
			return Mail.sendBasicEmail(connection,values);
		}
	}

	sendSms(phone, company, encrypted){
		var msg = this.Activity.message;

		msg += "\n\nFor more information visit: " + settings.config.protocol + "://" + company.subdomain + "." + settings.config.domain + '/notifications/r/' + encrypted;

		return new Promise(function (resolve, reject) {
			if(!company.Settings.twilioPhone) return reject();

			if(typeof phone == 'undefined') return reject();

			twilioClient.sendMessage({
				to:  settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
				from: '+1' + company.Settings.twilioPhone, // A number you bought from Twilio and can use for outbound communication
				body: msg
			}, function(err, responseData) { //this function is executed when a response is received from Twilio
				console.log(err);
				if(err) return reject();

				if (!err) {
					// http://www.twilio.com/docs/api/rest/sending-sms#example-1
					console.log(responseData.from); // outputs "+14506667788"
					console.log(responseData.body); // outputs "word to your mother."
					return resolve();
				}
			});
		});
	}


}

module.exports = Notification;

var Lease  = require(__dirname + '/../classes/lease.js');
var Contact   = require(__dirname + '/../classes/contact.js');
var Company   = require(__dirname + '/../classes/company.js');
var Mail = require(__dirname + '/../modules/mail.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');