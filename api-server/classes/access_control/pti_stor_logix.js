"use strict";
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');
var Promise = require('bluebird');
var request = require('request-promise');
var fillTemplate = require('es6-dynamic-template');
var moment      = require('moment');
var AccessControl = require(__dirname + '/../access_control.js');

var e  = require(__dirname + '/../../modules/error_handler.js');


class PtiStorLogix extends AccessControl {

	constructor(data) {
		super(data);

		this.access_id = 2;
		this.name = 'pti_stor_logix';

		data.Credentials = data.Credentials || {};
		this.property_id = data.property_id;


		this.Credentials = {
			site_key: data.Credentials.site_key,
			username: data.Credentials.username,
			password: data.Credentials.password,
			site_code: data.Credentials.site_code
		}


		this.tokenEnpoint = 'authtoken';
		this.syncEnpoint = 'sync'; // Implement


		this.baseUrl = 'https://api.ptisecurity.com/v2/';
		this.api_version = '2';
		this.api_key = 'CJZ3tAfwEY3OKFXNyWkGGF3L1mzqSE8xHUpdSdhg';
		this.client_id = '64937418';


		this.Contacts = [];
		this.Token = {}
	}

	find(connection){
		return models.Access.findCredentials(connection, 'brivo')
			.then(data => this.setCredentials(data))
	}

	findPropertyCredentials(connection){
		if(!this.property_id) e.th(500, "Missing parameters");
		return models.Access.findPropertyAccess(connection, this.access_id,  this.property_id)
			.map(d => {
				this.Credentials[d.key] = d.value;
				return true;
			})
	}

	async update(connection, contact, creds){

		var user = {};


		let dates = await this.getDateRange(connection, contact, creds);
		user = {
			firstName       : contact.first,
			middleName      : contact.middle,
			lastName        : contact.last,
			pin             : creds.pin,
			effectiveFrom   : dates.access_start,
			effectiveTo     : dates.access_end
		}

		creds.access_start = dates.access_start;
		creds.access_end = dates.access_end;


		if(contact.email){
			user.email  = [{type: 'primary', email: contact.email}];
		}

		if(contact.Phones && contact.Phones.length){
			user.phones  = contact.Phones.map(p => {
				return {
					type: p.type,
					phone: p.phone
				}
			});
		}

		await this.renewCredentials(connection)
		await this.updateUser(user, creds);
		await models.Contact.saveAccessCredentials(connection, creds, creds.id );
		await this.addUserToGroup(creds.external_id );



	}

	deleteCreds(connection,  creds){
		return this.renewCredentials(connection).then(() => {
			var url = 'https://api.brivo.com/v1/api/users/' + creds.external_id;
			return request({
				headers: this.getApiHeaders(),
				uri: url,
				method: 'DELETE',
				body: {},
				json: true
			})
		}).then(() =>  models.Contact.deleteAccessCredentials(connection, creds.id ))
	}

	async create(connection, contact, creds){


		let dates =  this.getDateRange(connection, contact, creds)
		let user = {
			firstName       : contact.first,
			middleName      : contact.middle,
			lastName        : contact.last,
			pin             : creds.pin,
			externalId      : contact.id,
			effectiveFrom   : dates.start_date,
			effectiveTo     : dates.end_date
		}

		creds.access_start = dates.start_date;
		creds.access_end = dates.end_date;


		if(contact.email){
			user.email  = [{type: 'primary', email: contact.email}];
		}

		if(contact.Phones.length){
			user.phones  = contact.Phones.map(p => {
				return {
					type: p.type,
					phone: p.phone
				}
			});
		}
		await this.renewCredentials(connection);

		await this.testCall();




		let response = await this.createUser(user);

		if(response && response.id){
			creds.external_id = response.id;
			await models.Contact.saveAccessCredentials(connection, creds )
		}

	}

	async testCall(){

		let headers = {
			Authorization: this.getBearerValue()
		};
		console.log(headers);
		let data = {};

		try {

			data = await request({
				headers: headers,
				uri: this.baseUrl + 'users/2/cards',
				method: 'GET'
			});

		} catch(err){
			e.th(400, err);
		}

		console.log("DAWA", data);
		e.th("test");


	}

	suspendUser(connection, creds){

		creds.status = 0;
		return this.renewCredentials(connection).then(() => {
			var url = 'https://api.brivo.com/v1/api/users/' + creds.external_id + '/suspended';
			return request({
				headers: this.getApiHeaders(),
				uri: url,
				method: 'PUT',
				body: {
					suspended: 1
				},
				json: true
			})

		}).then(() => models.Contact.saveAccessCredentials(connection, creds, creds.id))



	}

	restoreUser(connection, creds){

		creds.status = 1;
		return this.renewCredentials(connection).then(() => {
			var url = 'https://api.brivo.com/v1/api/users/' + creds.external_id + '/suspended';
			return request({
				headers: this.getApiHeaders(),
				uri: url,
				method: 'PUT',
				body: {
					suspended: 0
				},
				json: true
			})

		}).then(() => models.Contact.saveAccessCredentials(connection, creds, creds.id))


	}

	generateCode(){

		return Promise.resolve().then(() => {
			if(!this.Credentials.pin_format){
				throw new Error('Invalid Pin Format');
			}
			var text = "";
			var possible = "0123456789";
			for (var i = 0; i < +this.Credentials.pin_format; i++){
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		})


	}

	getBearerValue(){
		return "Bearer " + this.Credentials.token;
	}

	getAuthHeader(){
		var authHeader =  new Buffer(this.client_id+":"+this.api_key).toString('base64');
		return "Basic " + authHeader;
	}

	parseTokenData(data){
		try{
			var d = JSON.parse(data)
		} catch(err){
			throw new Error('Unable to parse token data');
		}

		return {
			Credentials: {
				token: d.access_token,
				token_type: d.token_type,
				expires: moment.utc().add(d.expires_in, 'seconds'),
			}
		};

	}

	async saveCredentials(connection){


		let data = await models.Access.findPropertyAccess(connection, this.access_id, this.property_id);

		var site_key = data.find(d => d.key == 'site_key') || {};
		var username = data.find(d => d.key == 'username') || {};
		var password = data.find(d => d.key == 'password') || {};
		var site_code = data.find(d => d.key == 'site_code') || {};
		var token = data.find(d => d.key == 'token') || {};
		var token_type = data.find(d => d.key == 'token_type') || {};
		var expires = data.find(d => d.key == 'expires') || {};


		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'site_key',  this.Credentials.site_key, site_key.id )
		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'username',  this.Credentials.username, username.id )
		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'password',  this.Credentials.password, password.id )
		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'site_code',  this.Credentials.site_code, site_code.id )


		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'token',  this.Credentials.token, token.id )
		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'token_type',  this.Credentials.token_type, token_type.id )
		await models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'expires',  this.Credentials.expires, expires.id )

		await models.Property.save(connection, {access_id: this.access_id}, this.property_id);

	}

	setCredentials(data, property_id){
		return Promise.resolve().then(() => {

			data.Credentials = data.Credentials || {};
			this.property_id = property_id ? property_id: this.property_id;
			this.Credentials.site_key = data.Credentials.site_key ? data.Credentials.site_key: this.Credentials.site_key;
			this.Credentials.username = data.Credentials.username ? data.Credentials.username : this.Credentials.username;
			this.Credentials.password = data.Credentials.password ? data.Credentials.password: this.Credentials.password;
			this.Credentials.site_code = data.Credentials.site_code ? data.Credentials.site_code: this.Credentials.site_code;
			this.Credentials.token = data.Credentials.token ? data.Credentials.token: this.Credentials.token;
			this.Credentials.token_type = data.Credentials.token_type ? data.Credentials.token_type: this.Credentials.token_type;
			this.Credentials.expires = data.Credentials.expires ? data.Credentials.expires: this.Credentials.expires;

			return true;
		});
	}



	async renewCredentials(connection){
		let headers = {
			Authorization: this.getAuthHeader()
		};

		let data = {};

		try {

			data = await request({
				headers: headers,
				form: {
					grant_type: 'client_credentials',
					site_key: this.Credentials.site_key
				},
				uri: this.baseUrl + this.tokenEnpoint,
				method: 'POST'
			});

		} catch(err){
			e.th(err.statusCode, err.toString());

		}

		console.log("data", data);

		await this.setCredentials(this.parseTokenData(data));

		await this.saveCredentials(connection)

	}

	listAccounts(){
		return request({
			headers: this.getApiHeaders(),
			uri: this.accountUrl,
			method: 'GET'
		})
	}

	getCredentialFormats(){
		return request({
			headers: this.getApiHeaders(),
			uri: this.credentialFormatsUrl,
			method: 'GET'
		})
	}

	createUser(user){

		return request({
			headers: this.getApiHeaders(),
			uri: this.createUserUrl,
			method: 'POST',
			body: user,
			json: true
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.error.message)
		})
	}

	updateUser(user, creds){

		return request({
			headers: this.getApiHeaders(),
			uri: this.createUserUrl + creds.external_id,
			method: 'PUT',
			body: user,
			json: true
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.error.message)
		})
	}

	getUser(user_id){
		return request({
			headers: this.getApiHeaders(),
			uri: 'https://api.brivo.com/v1/api/users/' + user_id,
			method: 'GET',
			json: true
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.error.message)
		})
	}

	getGroups(connection){
		return this.renewCredentials(connection).then(() => {
			return request({
				headers: this.getApiHeaders(),
				uri: this.listGroupsUrl,
				method: 'GET',
				json: true
			})
		}).then(groups => {
			this.Groups = groups;
			console.log("GROUPS", groups);
			return;
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.error.message)
		})
	}

	importContacts(connection){
		return this.renewCredentials(connection).then(() => {
			return this.callBrivoContactsApi(100, 0, this.Credentials.brivo_group)
		})
	}

	callBrivoContactsApi(pageSize,offset, group){
		return request({
			headers: this.getApiHeaders(),
			uri: this.listGroupsUrl + group + '/users?pageSize='+ pageSize + '&offset=' + offset,
			method: 'GET',
			json: true
		}).then(contacts => {
			console.log("Offset", offset);
			this.Contacts  = this.Contacts.concat(contacts.data);
			if (contacts.data.length == pageSize){
				return this.callBrivoContactsApi(pageSize, pageSize + offset, group)
			}
			return true;
		})

	}

	addUserToGroup(user_id){

		var url = 'https://api.brivo.com/v1/api/groups/' + this.Credentials.brivo_group + '/users/' + user_id;

		return request({
			headers: this.getApiHeaders(),
			uri: url,
			method: 'PUT',
			json: true
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.error.message)
		})
	}

	display(){
		return {
			access_id: this.access_id,
			property_id: this.property_id,
			name: this.name,
			Credentials: {
				connected: this.Credentials.site_key? true : false,
				site_key: this.Credentials.site_key,
				username: this.Credentials.username,
				password: this.Credentials.password,
				site_code: this.Credentials.site_code
			},
		}
	}
}


module.exports = PtiStorLogix;