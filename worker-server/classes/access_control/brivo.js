"use strict";
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');
var Promise = require('bluebird');
var request = require('request-promise');
var fillTemplate = require('es6-dynamic-template');
var moment      = require('moment');
var AccessControl = require(__dirname + '/../access_control.js');

var e  = require(__dirname + '/../../modules/error_handler.js');


class Brivo extends AccessControl {

	constructor(data) {
		super(data);

		this.access_id = 1;
		this.name = 'brivo';

		data.Credentials = data.Credentials || {};
		this.property_id = data.property_id;


		this.Credentials = {
			client_id: data.Credentials.client_id,
			client_secret: data.Credentials.client_secret,
			token: data.Credentials.token,
			refresh_token: data.Credentials.refresh_token,
			expires: data.Credentials.expires,
			active: data.Credentials.active,
			pin_format: data.Credentials.pin_format,
			brivo_group: data.Credentials.brivo_group
		}

		this.refreshUrl = 'https://auth.brivo.com/oauth/token?grant_type=refresh_token&refresh_token=';
		this.tokenUrl = 'https://auth.brivo.com/oauth/token?grant_type=authorization_code&code=';
		this.accountUrl = 'https://api.brivo.com/v1/api/accounts';
		this.credentialFormatsUrl = 'https://api.brivo.com/v1/api/credentials/formats';
		this.createUserUrl = 'https://api.brivo.com/v1/api/users/';
		this.retreiveByExternalIdUrl = 'https://api.brivo.com/v1/api/users/${user_id}/external';
		this.listGroupsUrl = 'https://api.brivo.com/v1/api/groups/';
		this.getUsersUrl = 'https://api.brivo.com/v1/api/users';
		this.addUserToGroupUrl = 'https://api.brivo.com/v1/api/groups/${groupId}/users/${userId}';
		this.suspendedUrl = 'https://api.brivo.com/v1/api/users/${userId}/suspended';
		this.deleteUserUrl = 'https://api.brivo.com/v1/api/users/{userId}';
		this.apikey = 'r74snddmmgww6reja95h2ku9';
		this.Groups = [];

		this.Contacts = [];
		this.Token = {}
	}

	find(connection){
		return models.Access.findCredentials(connection, 'brivo')
			.then(data => this.setCredentials(data))
	}

	findPropertyCredentials(connection){

		if(!this.property_id) throw new Error("Missing parameters");
		return models.Access.findPropertyAccess(connection, this.access_id,  this.property_id)
			.map(d => {
				this.Credentials[d.key] = d.value;
				return true;
			})
	}

	create(connection, contact, creds){
		var user = {};
		return this.getDateRange(connection, contact, creds).then(dates => {
			user = {
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
			return this.renewCredentials(connection)
		}).then(() => this.createUser(user))
			.then((response) => {
				if(response && response.id){
					creds.external_id = response.id;
					return models.Contact.saveAccessCredentials(connection, creds )
				}
			})
			.then(() => {
				if(!creds.status) return;
				return this.addUserToGroup(creds.external_id)
			})
			.then(response => {

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

	deleteCreds(connection,  contact_id, creds){
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

	suspendUser(connection, contact, creds){

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

	restoreUser(connection, contact, creds){

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

	getApiHeaders(){
		return {
			"api-key": this.apikey,
			"Authorization": this.getBearerValue()
		}
	}

	getBearerValue(){
		return "Bearer " + this.Credentials.token;
	}

	getAuthHeader(){
		var authHeader =  new Buffer(this.Credentials.client_id+":"+this.Credentials.client_secret).toString('base64');
		return "Basic " + authHeader;
	}

	getTokenFromBrivo(connection, code){
		var headers = {
			api_key: this.apikey,
			Authorization: this.getAuthHeader()
		};

		return request({
			headers: headers,
			uri: this.tokenUrl + code,
			method: 'POST'
		})
			.then(data => this.setCredentials(this.parseTokenData(data)))
			.then(() => this.saveCredentials(connection))
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
				refresh_token: d.refresh_token,
				expires: moment.utc().add(d.expires_in, 'seconds'),
			}
		};

	}

	saveCredentials(connection){

		var promises = [];

		return models.Access.findPropertyAccess(connection, this.access_id, this.property_id)
			.then(data => {

				var client_secret = data.filter(d => d.key == 'client_secret');

				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'client_secret', this.Credentials.client_secret, client_secret.length? client_secret[0].id : null  ))

				var client_id = data.filter(d => d.key == 'client_id');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'client_id', this.Credentials.client_id, client_id.length? client_id[0].id : null  ))

				var token = data.filter(d => d.key == 'token');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'token', this.Credentials.token, token.length? token[0].id : null  ))

				var refresh_token = data.filter(d => d.key == 'refresh_token');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'refresh_token', this.Credentials.refresh_token, refresh_token.length? refresh_token[0].id : null  ))

				var pin_format = data.filter(d => d.key == 'pin_format');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'pin_format', this.Credentials.pin_format, pin_format.length? pin_format[0].id : null  ))

				var brivo_group = data.filter(d => d.key == 'brivo_group');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'brivo_group', this.Credentials.brivo_group, brivo_group.length? brivo_group[0].id : null  ))

				var expires = data.filter(d => d.key == 'expires');
				promises.push(models.Access.savePropertyAccess(connection, this.access_id, this.property_id, 'expires', this.Credentials.expires, expires.length? expires[0].id : null  ))
				return Promise.all(promises);

			}).then(() => models.Property.save(connection, {access_id: this.access_id}, this.property_id))

	}

	setCredentials(data){
		return Promise.resolve().then(() => {
			data.Credentials = data.Credentials || {};

			this.property_id = data.property_id ? data.property_id: this.property_id;
			this.Credentials.client_id = data.Credentials.client_id ? data.Credentials.client_id: this.Credentials.client_id;
			this.Credentials.client_secret = data.Credentials.client_secret ? data.Credentials.client_secret : this.Credentials.client_secret;
			this.Credentials.token = data.Credentials.token ? data.Credentials.token: this.Credentials.token;
			this.Credentials.refresh_token = data.Credentials.refresh_token ? data.Credentials.refresh_token: this.Credentials.refresh_token;
			this.Credentials.expires = data.Credentials.expires? data.Credentials.expires: this.Credentials.expires;
			this.Credentials.pin_format = data.Credentials.pin_format ? data.Credentials.pin_format: this.Credentials.pin_format;
			this.Credentials.brivo_group = data.Credentials.brivo_group? data.Credentials.brivo_group: this.Credentials.brivo_group;

			return true;
		});
	}

	renewCredentials(connection){
		var headers = {
			api_key: this.apikey,
			Authorization: this.getAuthHeader()
		};
		return request({
			headers: headers,
			uri: this.refreshUrl + this.Credentials.refresh_token,
			method: 'POST'
		})
			.then(data => this.setCredentials(this.parseTokenData(data)))
			.then(() => this.saveCredentials(connection))
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

		console.log({
			headers: this.getApiHeaders(),
			uri: this.createUserUrl,
			method: 'POST',
			body: user,
			json: true
		});


		return request({
			headers: this.getApiHeaders(),
			uri: this.createUserUrl,
			method: 'POST',
			body: user,
			json: true
		}).catch( err => {
			console.log(err);
			e.th(err.statusCode, "Brivo responded with: " + err.message)
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
				connected: !!this.Credentials.token,
				client_id: this.Credentials.client_id,
				pin_format: this.Credentials.pin_format,
				brivo_group: this.Credentials.brivo_group
			},
		}
	}
}


module.exports = Brivo;
