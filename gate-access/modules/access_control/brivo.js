"use strict";
const models  = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
var request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

var getNamespace = require('cls-hooked').getNamespace;
var session = getNamespace('gatePortals');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class Brivo extends AccessControl {

	constructor(facility_id){
		super(facility_id, 1, 'brivo');

		this.tokenUrl = 'https://auth.brivo.com/oauth/token';
		this.accountUrl = 'https://api.brivo.com/v1/api/accounts';
		this.credentialFormatsUrl = 'https://api.brivo.com/v1/api/credentials/formats';
		this.createUserUrl = 'https://api.brivo.com/v1/api/users/';
		this.retreiveByExternalIdUrl = 'https://api.brivo.com/v1/api/users/${user_id}/external';
		this.listGroupsUrl = 'https://api.brivo.com/v1/api/groups/';
		this.getUsersUrl = 'https://api.brivo.com/v1/api/users';
		this.addUserToGroupUrl = 'https://api.brivo.com/v1/api/groups/${groupId}/users/${userId}';
		this.suspendedUrl = 'https://api.brivo.com/v1/api/users/${userId}/suspended';
		this.deleteUserUrl = 'https://api.brivo.com/v1/api/users/{userId}';
	}

	async initial_load(){

	}

	async testConnection(){
		if(this.Credentials.token){
			return true;
		}
		await this.renewCredentials()
		return !!this.Credentials.token;
	}

	getDateRange(spaces){
		let dates = {};
		for(let i = 0; i < spaces.length; i++){
			let s = spaces[i];
			if (s.status != 'ACTIVE') continue;
			dates.access_start = !dates.access_start || (new Date(s.start_date) < new Date(dates.access_start)) ? s.start_date : dates.access_start;
			dates.access_end = s.end_date != null && (!dates.access_end || new Date(s.end_date) > new Date(dates.access_end))? s.end_date: dates.access_end;
		}

		console.log("GET DATE RANGE DATES", dates)
		return dates;
	}

	async move_in(unit, user){
		console.log('Move_in user in Brivo and attached to space starts.');
		console.log('Unit =>',unit);
		console.log('User =>',user);
		
		await this.update_user_to_unit(unit, user);
		console.log('Move_in user in Brivo and attached to space finished');

		if(user.external_id) {
			console.log('Adding user to group =>',user.external_id);
			await this.addUserToGroup(user.external_id)
		}  
	}

	async add_user_to_unit(unit, user){
	}

	async update_user_to_unit(unit, user){
		await this.renewCredentials();
		var body = {};

		let dates = this.getDateRange(user.Spaces);
		body = {
			firstName: user.first,
			//middleName: user.middle,
			lastName: user.last,
			pin: user.pin,
			externalId: user.id,
			effectiveFrom: dates.access_start,
			effectiveTo: dates.access_end
		}

		if(user.email){
			body.emails  = [{type: 'primary', address: user.email}];
		}

		if(user.phone){
			body.phoneNumbers  = [{type: 'phone', number: user.phone}];
		}

		await this.updateUser(body, user.external_id);
	}


	async remove_user_from_unit(unit, user){
	}

	async move_out(unit, creds){
        if(creds && creds.external_id){
			let external_id = creds.external_id
			let credentials = await this.getUserCredentials(external_id);

			for (let credential of credentials) {
				await this.deleteUserCredentials(external_id, credential.id);
			}
			
			console.log('Removing user from group =>', creds.external_id);
			await this.removeUserFromGroup(creds.external_id)
		}
	}

	async getUserCredentials(external_id) {
		let credentials = [];
		await this.renewCredentials();

		try {
			let reqObj = {
				headers: this.getApiHeaders(),
				method: 'GET',
				uri: `https://api.brivo.com/v1/api/users/${external_id}/credentials`,
				method: 'GET',
				JSON: true
			}

			let response = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'Brivo getUserCredentials'));
			if(response){
            let responseObj = JSON.parse(response).data;
                for (var i = 0; i < responseObj.length; i++) {
                    credentials.push(responseObj[i]);
                }
            }
            logger.info("getUserCard card id's => " + credentials);

			return credentials;
		} catch (err) {
			logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo getUserCards error'));
            e.th(err.statusCode, err.toString());
		}
	}

	async deleteUserCredentials(external_id, credentialId){
		try {
			await this.renewCredentials();
			
			let url = `https://api.brivo.com/v1/api/users/${external_id}/credentials/${credentialId}`
			let reqObj = {
				headers: this.getApiHeaders(),
				uri: url,
				method: 'DELETE',
				body: {},
				json: true
			};

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo deleteUserCredentials'));
		} catch (err) {
			logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo getUserCards error'));
            e.th(err.statusCode, err.toString());
		}
		
	}

	async suspend(user){
		await this.renewCredentials();
		var url = 'https://api.brivo.com/v1/api/users/' + user.external_id + '/suspended';

		let reqObj = {
			headers: this.getApiHeaders(),
			uri: url,
			method: 'PUT',
			body: {
				suspended: 1
			},
			json: true
		}

		let result = await requestWithAutoRetry(reqObj);
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo suspend'));
		return result;
	}

	async unsuspend(user){
		try{
			await this.renewCredentials();
			var url = 'https://api.brivo.com/v1/api/users/' + user.external_id + '/suspended';

			let reqObj = {
				headers: this.getApiHeaders(),
				uri: url,
				method: 'PUT',
				body: {
					suspended: 0
				},
				json: true
			}

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo unsuspend'));

			return result;
		} catch (err) {
			logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo unsuspend error'));
            e.th(err.statusCode, err.toString());
		}

		
	}

	async add_user(user){

		let result = {};
		await this.renewCredentials();

		// If the user was already created in Brivo's system, do not add a new user
		if (user.external_id) return;
		var body = {};

		body = {
			firstName: user.first,
			//middleName: user.middle,
			lastName: user.last,
			pin: user.pin,
			externalId: user.id,
			//effectiveFrom: dates.start_date,
			//effectiveTo: dates.end_date
		}
		
		if(user.email){
			body.emails  = [{type: 'primary', address: user.email}];
		}

		if(user.phone){
			body.phoneNumbers  = [{type: 'phone', number: user.phone}];
		}
		
		result = await this.createUser(body);
		return result && result.id;
	}

	async createUser(user){
		try {
			let reqObj = {
				headers: this.getApiHeaders(),
				uri: this.createUserUrl,
				method: 'POST',
				body: user,
				json: true
			}	
				

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo createUser'));
			return result
		} catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo createUser error'));
            e.th(err.statusCode, err.toString());
		}
		

		
  
	}

	async addUserToGroup(user_id){
		try {
			var url = 'https://api.brivo.com/v1/api/groups/' + this.Credentials.brivo_group + '/users/' + user_id;
			console.log('Url for group assigning =>', url);
			let reqObj = {
				headers: this.getApiHeaders(),
				uri: url,
				method: 'PUT',
				json: true
			}
			console.log('Request for group assigning =>', reqObj);

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo addUserToGroup'));
		} catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo addUserToGroup error'));
            e.th(err.statusCode, err.toString());
		}
		
	}

	async removeUserFromGroup(user_id) {
		try {
			var url = 'https://api.brivo.com/v1/api/groups/' + this.Credentials.brivo_group + '/users/' + user_id;
			console.log('Url for group assigning =>', url);
			let reqObj = {
				headers: this.getApiHeaders(),
				uri: url,
				method: 'DELETE',
				json: true
			}
			console.log('Request for group unassigning =>', reqObj);

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo addUserToGroup'));
		} catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo addUserToGroup error'));
            e.th(err.statusCode, err.toString());
		}
	}

	async update_user(user){
		try{
			await this.renewCredentials();
			var body = {};

			body = {
				firstName: user.first,
				lastName: user.last,
				pin: user.pin,
				externalId: user.id
			}

			if(user.email){
				body.emails  = [{type: 'primary', address: user.email}];
			}

			if(user.phone){
				body.phoneNumbers  = [{type: 'phone', number: user.phone}];
			}
			await this.updateUser(body, user.external_id);
		} catch (err) {
			logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo update_user error'));
            e.th(err.statusCode, err.toString());
		}

		
	}

	async updateUser(user, external_id){
		let result = {};
		try {
			let reqObj = {
				headers: this.getApiHeaders(),
				uri: this.createUserUrl + external_id,
				method: 'PUT',
				body: user,
				json: true
			}

			let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo updateUser'));
		} catch (err) {
			logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'Brivo updateUser error'));
            e.th(err.statusCode, err.toString());
		}

	}

	async remove_access(user) {

		console.log('Removing user from group =>', user.external_id);
		await this.renewCredentials();
		await this.removeUserFromGroup(user.external_id);
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
			"api-key": this.Credentials.api_key,
			Authorization: this.getBearerValue()
		}
	}

	getBearerValue(){
		return "bearer " + this.Credentials.token;
	}

	getAuthHeader(){
		var authHeader =  btoa(this.Credentials.client_id+":"+this.Credentials.client_secret);
		return "Basic " + authHeader;
	}

	parseTokenData(data){
		try{
			var d = JSON.parse(data)
		} catch(err){
			throw new Error('Unable to parse token data');
		}

		return {
			token: d.access_token,
			token_type: d.token_type,
			refresh_token: d.refresh_token,
			expires: moment.utc().add(d.expires_in, 'seconds'),
		};

	}

	async getTokenFromBrivo(){
		var headers = {
			"api-key": this.Credentials.api_key,
			Authorization: this.getAuthHeader(),
			"Content-type": "application/x-www-form-urlencoded"
		};
		let body = {
			grant_type: 'authorization_code',
			code: this.Credentials.auth_code
		}
		return request({
			headers: headers,
			uri: this.tokenUrl,
			method: 'POST',
			form: body
		})
		.then(data => this.setCredentials(this.parseTokenData(data)))
	}

	async renewCredentials(){
		if (this.Credentials.refresh_token){
			let data = {};
			var headers = {
				"api-key": this.Credentials.api_key,
				Authorization: this.getAuthHeader(),
				"Content-Type": 'application/x-www-form-urlencoded'
			};
			let body = {
				refresh_token: this.Credentials.refresh_token,
				grant_type: 'refresh_token',
			}
			try {
				data = await request({
					headers: headers,
					uri: this.tokenUrl,
					method: 'POST',
					form: body
				});
				
			} catch(err){
				let error = JSON.parse(err.error);
				console.log(error.error_description);
				e.th(err.statusCode, error.error_description);

			}
			this.setCredentials(this.parseTokenData(data));
		} else if(this.Credentials.auth_code){
			await this.getTokenFromBrivo();
		}
	}

	async listAccounts(){
		let reqObj = {
			headers: this.getApiHeaders(),
			uri: this.accountUrl,
			method: 'GET'
		}

		let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo listAccounts'));

		return result
	}

	async getCredentialFormats(){
		let reqObj = {
			headers: this.getApiHeaders(),
			uri: this.credentialFormatsUrl,
			method: 'GET'
		}

		let result = await requestWithAutoRetry(reqObj);
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Brivo getCredentialsFormat'));
	}

	get_user(user){
		return request({
			headers: this.getApiHeaders(),
			uri: 'https://api.brivo.com/v1/api/users/' + user.external_id,
			method: 'GET',
			json: true
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.message)
		})
	}

	get_groups(){
		return this.renewCredentials().then(() => {
			return request({
				headers: this.getApiHeaders(),
				uri: this.listGroupsUrl,
				method: 'GET',
				json: true
			})
		}).then(result => {
			this.Groups = result.data;

			return;
		}).catch( err => {
			console.log(err)
			e.th(err.statusCode, "Brivo responded with: " + err.message)
		})
	}

	get_users(){
		return this.renewCredentials().then(() => {
			return this.callBrivoUsersApi(100, 0, this.Credentials.brivo_group)
		})
	}

	callBrivoUsersApi(pageSize,offset, group){
		return request({
			headers: this.getApiHeaders(),
			uri: this.listGroupsUrl + group + '/users?pageSize='+ pageSize + '&offset=' + offset,
			method: 'GET',
			json: true
		}).then(users => {
			console.log("Offset", offset);
			this.Users  = this.Users.concat(contacts.data);
			if (users.data.length == pageSize){
				return this.callBrivoUsersApi(pageSize, pageSize + offset, group)
			}
			return true;
		})

	}
}

module.exports = Brivo;
