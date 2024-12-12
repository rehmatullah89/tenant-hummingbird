"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');


var validator = require('validator')
var moment      = require('moment');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var request = require('request');
var rp = require('request-promise');
var fillTemplate = require('es6-dynamic-template');
var e  = require(__dirname + '/../modules/error_handler.js');
var { sendSMS } = require('./../modules/sms');
class Notification {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
		this.contact_id = data.contact_id;
		this.activity_id = data.activity_id;
		this.text = data.text || 0;
		this.email = data.email || 0;
		this.created = data.created;
		this.status = data.status || 0;

		this.Activity = {};
		this.Contact = {};
		// this.Lease = {};
		// this.Invoice = {};

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
  // TODO Refactor if this goes back in use
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

	ping(){

		if(settings.is_prod){
	//		return rp("https://api.leasecaptain.com/v1/notifications/ping/" + this.company_id);
		} else {
	//		return rp("http://10.0.46.14/v1/notifications/ping/" + this.company_id);
		}

	}

	async sendMessage(connection, company){

		var shipment = {
			contact_id: this.Contact.id,
			fn: 'notification',
			notification_id: this.id,
			requested: moment.utc(),
			domain: company.domain
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

    if (this.email){
      await this.sendEmail(company, encrypted)
    }

    if (this.text){
      var phones = this.Contact.Phones.filter(p => p.sms);
      if(phones.length){
        await sendSMS(phones[0], encrypted)
      }
    }

	}

	sendEmail(company, encrypted){

		var values = {
			email: this.Contact.email,
			to: this.Contact.first + ' ' + this.Contact.last,
			from:    company.name + " Online Management",
			owner_id: company.gds_owner_id,
			subject: this.Activity.ActivityType.label,
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
						content: "<p>" + this.message + "<br /><br />For more information visit: " + settings.config.protocol + "://" + company.subdomain + "." + settings.config.domain + "/notifications/r/" + encrypted + "</p>"
					}]
			}
		};
		return Mail.sendBasicEmail(values);
	}

	async verifyAccess(company_id){

		if(this.company_id !== company_id) e.th(403, "Not authorized");;
		return Promise.resolve();

	}

	static async search(connection, company_id, contact_id, searchParams){
		return await models.Notification.findByContactId(connection, company_id, contact_id, searchParams);

	}

}

module.exports = Notification;

var Lease  = require(__dirname + '/../classes/lease.js');
var Mail = require(__dirname + '/../modules/mail.js');
