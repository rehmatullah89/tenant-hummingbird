"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(settings.mandrill_api_key);

class Email {
	constructor(data) {

		this.id = data.id;
		this.interaction_id = data.interaction_id;
		this.subject = data.subject;
		this.message = data.message;
		this.email_address = data.email_address;
		this.from_name = data.from_name;
		this.from_email = data.from_email;
		this.reject_reason = data.reject_reason;
		this.ip = data.ip;
		this.clicked = data.clicked || 0;

		this.email_timer = 1 * 1000 * 60;
	}

	// TODO implement validation if necessary
	validate(){
		return Promise.resolve();
	}

	verifyId(){
		if(!this.id) e.th(400, "Missing ID");
		return true;
	}

	async find(connection){

		let data = await models.Email.findById(connection, this.id)
		
		if(!data) e.th(404);
		this.id = data.id;
		this.interaction_id = data.interaction_id;
		this.subject = data.subject;
		this.message = data.message;
		this.email_address = data.email_address;
		this.reject_reason = data.reject_reason;
		this.from_name = data.from_name;
		this.from_email = data.from_email;
		this.ip = data.ip;
		this.clicked = data.clicked || 0;
	
	}

	async save(connection){
		await this.validate();
		var save = {
			interaction_id: this.interaction_id,
			subject: this.subject,
			message: this.message,
			email_address: this.email_address,
			reject_reason: this.reject_reason,
			from_name: this.from_name,
			from_email: this.from_email,
			ip: this.ip,
			clicked: this.clicked || 0
		};

		this.id = await models.Email.save(connection, save, this.id)
	}
	setEmailContentTimer(){
		setTimeout(this.getEmailTemplate.bind(this), this.email_timer);
		return Promise.resolve();
	}
	getEmailTemplate(){
		if(!this.refid) return;
		return new Promise((resolve, reject) => {
			mandrill_client.messages.content({"id": this.refid}, message => {
				resolve(message)
			}, e => {
				// Mandrill returns the error as an object with name and message keys
				console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
				// A mandrill error occurred: Unknown_Message - No message exists with the id 'McyuzyCS5M3bubeGPP-XVA'
				reject(e);
			})
		}).then((message) => {
			this.html_body = message.html;
			return pool.getConnectionAsync()
		}).then(connection => {
			return models.Email.save(connection, {html_body: this.html_body }, this.id).then(() => {
				connection.release();
				return;
			})
		})
	}

}
module.exports = Email;

