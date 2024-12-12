"use strict";

var models  = require(__dirname + '/../models');
var moment      = require('moment');
var Company  = require(__dirname + '/../classes/company.js');
var request = require('request-promise');
var Settings = require(__dirname + '/../classes/settings.js');
const utils = require('../modules/utils');
var e  = require(__dirname + '/../modules/error_handler.js');
const ENUMS = require(__dirname + '/../modules/enums');

class AccessControl { 
 
	constructor(data) {

		if(data){
			this.access_id = data.access_id;
			this.name = data.name || "";
			this.property_id = data.property_id;
			this.Credentials = data.Credentials || {};
		}

		this.endpoint = process.env.GATE_ACCESS_APP_ENDPOINT;
		this.Facilities = {};
		this.Spaces = {};
		this.Groups = [];
		this.Contacts = [];
		this.Token = {};
	}

	getHeaders(token){
		let headers = {
			"X-storageapi-request-id": this.request_id, 
			"X-storageapi-trace-id": this.trace_id
		}
		if(token){
			headers["x-api-key"] = token
		}
		return headers;
	}

	async makeRequest(request_params){
		let logs = {
			request_params,
			env: process.env.NODE_ENV
		};
		try {
			let timing_start = Date.now();
			var result = await request(request_params);
			logs.timing = Date.now() - timing_start;
			logs.result = result;
		} catch(err) {
			logs.error = err;
			if(err.statusCode !== 404){
				logs.notify = true;
			}
			throw err;
		} finally {
			if (logs.env !== 'test' && logs.env !== 'local'){ 
				utils.sendLogsToGDS(this.component_name, logs, '', logs.error ? 'error': 'info', this.request_id,  this.trace_id, {event_name: ENUMS.LOGGING.GATE_ACCESS });
			}
		}
		return result; 
	}

	async getGateVendors(){
		try{
			var result = await request({
				uri: this.endpoint + 'gate-vendors',
				method: 'GET',
				json: true
			});
		} catch(err) {
			throw err;
		}

		return result.data.gateVendors
	}

	async facilitiesSync(){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/sync',
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}

		return result.data.facilities;
	}

	async groupsSync(){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/groups/sync',
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}

		return result.data.groups;
	}

	async usersSync(){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/users/sync',
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}

		return result.data.users;
	}

	async userSync(user_id){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/users/' + user_id + '/sync',
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}

		return result.data.user;
	}

	async unitsSync(units) {
		if (!this.property_id) e.th(500, "Property is missing");
		try {
			let result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: `${this.endpoint}facilities/${this.property_id}/spaces/sync`,
				method: 'POST',
				json: true,
				body: units
			});
			console.log("RESULT, ", result)
			return result.data
		} catch (err) {
			console.log("Property Sync Error: ", err)
			throw err;
		}
 	}


	async findByName(connection, label){
		// get name of vendor
		let vendor = await models.Access.findByName(connection, label);
		this.access_id = vendor.id;
		this.name = vendor.name;
	  }

	async getFacility(){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id,
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}
		this.facility = result.data.facility;
        return this.facility;
	}

	//Access Configuration on company level
    async getAllFacilities(){
        try{
            var result = await request({
                headers: {
                    "x-api-key": this.token
                },
                uri: this.endpoint + 'facilities',
                method: 'GET',
                json: true
            });
        } catch(err) {
            if(err.statusCode === 404){
                console.log(err);
                return
            }
            throw err;
        }
        this.facilities = result.data.facilities;
		return this.facilities;
    }

	//Helper function 
    async getAccessConfiguration(connection, company_id){
		await this.getToken(connection, {id: company_id});
		let facilities = [];
		if(this.property_id){
			let facility = await this.getFacility();
			if(facility) facilities.push(facility);
		} else {
			facilities = await this.getAllFacilities();
		}
		return facilities;
	}
 
	async createFacility(property, creds){

		let body = {
			gate_vendor_id: this.access_id,
			name: property.name,
			facility_id: this.property_id,
			description: property.description,
			Credentials: creds,
		}

		if(property.Address) {
			body = {
				...body,
				address: property.Address.address,
				address2: property.Address.address2,
				city: property.Address.city,
				state: property.Address.state,
				zip: property.Address.zip,
				lat: property.Address.lat,
				lng: property.Address.lng,
			}
		}

		let res = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities',
			method: 'POST',
			body,
			json: true
		});

		this.facility = res.data.facility;
	}

	async updateFacility(property, creds){

		let body = {
			gate_vendor_id: this.access_id,
			name: property.name,
			facility_id: this.property_id,
			description: property.description,
			Credentials: creds,
		}

		if(property.Address) {
			body = {
				...body,
				address: property.Address.address,
				address2: property.Address.address2,
				city: property.Address.city,
				state: property.Address.state,
				zip: property.Address.zip,
				lat: property.Address.lat,
				lng: property.Address.lng,
			}
		}

		let res = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/' + this.property_id,
			method: 'PUT',
			body,
			json: true
		});

		this.facility = res.data.facility;
	}

	async deleteFacility(){
		try{
			var result = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/' + this.property_id,
			body: {},
			method: 'DELETE',
			json: true
		});
		} catch(err) {
			console.log(err);
		}
	}

	async createUser(contact, creds){
		//if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");

		let phone;
		for(let i = 0; i < contact.Phones.length; i++){
			phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
			break;
		}

		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id + '/users',
				body: {
					user_id: contact.id,
					first: contact.first,
					last: contact.last,
					email: contact.email,
					phone,
					pin: creds && creds.pin,
					status: creds && (creds.status === 1 ? 'ACTIVE' : (creds.status === 0 ? 'SUSPENDED' : undefined)),
					active: 1
				},
				method: 'POST',
				json: true
			});
		} catch(err) {
			throw err;
		}

		return result
	}

	async getUser(contact_id){
		if(!this.property_id) e.th(500, "Property id missing");
		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id + '/users/' + contact_id ,
				method: 'GET',
				json: true
			});
		} catch(err) {
			if(err.statusCode === 404){
				console.log(err);
				return;
			}
			throw err;
		}

		return result.data.user;
	}

	async updateUser(contact, updates){
		let phone;
		for(let i = 0; i < contact.Phones.length; i++){
			phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
			break;
		}

		let user = {
			user_id: contact.id,
			first: contact.first,
			last: contact.last,
			email: contact.email,
			phone,
			external_id: updates.external_id,
			pin: updates && updates.pin,
			status: updates && (updates.status === 1 ? 'ACTIVE' : (updates.status === 0 ? 'SUSPENDED' : undefined))
		}

		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + user.user_id,
				body: user,
				method: 'PUT',
				json: true
			});
		} catch(err) {
			throw err;
		}
		return result.data;
	}

	async deleteUser(contact_id){
		try{
			var result = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id,
			body: {},
			method: 'DELETE',
			json: true
		});
		} catch(err) {
			console.log(err);
		}
	}

	async denyAccessToSpace(lease){

		try {
			var result = await request({
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/deny-access',
				body: {},
				method: 'PUT',
				json: true
			});
		} catch(err) {
			throw err;
		}
		console.log("RESULT", result);
	}
	// overlocks noke facilities
	async overlock(property_id, unit_id){

		
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/overlock',
			body: {},
			method: 'PUT',
			json: true
		}
		await this.makeRequest(request_params);

	}

	async allowAccessToSpace(lease){

		try{
		var result = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/enable-access',
			body: {},
			method: 'PUT',
			json: true
		});
		} catch(err) {
			throw err;
		}
		console.log("RESULT", result);

	}

	async addContactToSpace(contact, creds, unit_id, property_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
			body: {
				user_id: contact.id,
				status: creds.status,
				start_date: creds.start_date,
				end_date: creds.end_date
			},
			method: 'POST',
			json: true
		}
		await this.makeRequest(request_params);
	}

	async updateContactToSpace(contact, creds, unit_id, property_id){

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
			body: {
				status: creds.status,
				start_date: creds.start_date,
				end_date: creds.end_date
			},
			method: 'PUT',
			json: true
		}
		await this.makeRequest(request_params);
	}

	async createSpaceIfNotExist(unit){
		try{
		var result = await request({
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces/'  + unit.id,
			method: 'GET',
			json: true
		});
		} catch(err) {
			if(err.error.status === 404) {
				return await this.createSpace(unit);
			}
			throw err;
		}

		return result.data.space

	}

	async createSpace(unit){
		console.log("creating space");
		console.log('------------', this.endpoint + 'facilities/'  + unit.property_id + '/spaces');

		try{
		var result = await request({
			headers: {
			"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces',
			body: {
				space_id: unit.id,
				name: unit.number,
				status: 'VACANT',
				active: 1
			},
			method: 'POST',
			json: true
		});
		} catch(err) {
			throw err;
		}
		return result.data.space;

	}

	async generateCode(){

		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id + '/generate-code',
				method: 'GET',
				json: true
			});
		} catch(err) {
			throw err;
		}

		return result.data.code;
	}

	async validateCode(code,contact_id){

		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/'  + this.property_id + '/validate-code',
				method: 'POST',
				body: {
					code,
					user_id: contact_id ? contact_id : null
				},
				json: true
			});
		} catch(err) {
			throw err;
		}

	}



	async suspendUser(contact_id, unit_id){
		var user = {};
		user = {
			user_id: contact_id,
			space_id: unit_id,
		};

		try{
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id + '/suspend',
				body: user,
				method: 'POST',
				json: true
			});
		} catch(err) {
			throw err;
		}
		return result.data;
	}

	async restoreUser(contact_id, unit_id){
		var user = {};
		user = {
			user_id: contact_id,
			space_id: unit_id,
		};

		try{
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id + '/restore',
				body: user,
				method: 'POST',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data;
		} catch(err) {
			throw err;
		}
	}

	async suspendUnit(unit_id) {

		let catches = {
			late_catch: 1
		}

		try {
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/' + this.property_id + '/spaces/' + unit_id + '/catches',
				body: catches,
				method: 'PUT',
				json: true
			});
		} catch (err) {
			throw err;
		}
	}
	async restoreUnit(unit_id) {

		let catches = {
			late_catch: 0
		}

		try {
			var result = await request({
				headers: {
					"x-api-key": this.token
				},
				uri: this.endpoint + 'facilities/' + this.property_id + '/spaces/' + unit_id + '/catches',
				body: catches,
				method: 'PUT',
				json: true
			});
		} catch (err) {
			throw err;
		}
	}

	async install(connection, company, property, creds){
		await this.getToken(connection, company);

		await this.getFacility();
		if(!this.facility) {
			await this.createFacility(property, creds);
		} else {
			await this.updateFacility(property,creds);
		}
	}

	async fetch(connection, company){
		await this.getToken(connection, company);
		await this.getFacility();

		if(this.facility) {
			this.access_id = this.facility.gate_vendor_id;
			this.access_name = this.facility.gate_vendor_name;
			this.Credentials = this.facility.GateConnection && this.facility.GateConnection.Credentials;
		}
	}

	async getSpace(unit_id){
		let request_params = {
			headers: {
				"x-api-key": this.token
			},
			uri: this.endpoint + 'facilities/'  + this.property_id + '/spaces/' + unit_id,
			method: 'GET',
			json: true
		}
		let result = null
		try{
			result = await this.makeRequest(request_params);
		} catch (err) {
			throw err;
		}
		return result?.data?.space;
	}

	// Gets token from settings, if there is not one, registers a new company, saves and returns the token
	async getToken(connection, company){

		let setting = new Settings({company_id: company.id});
		let token_response = await setting.findSettingByName(connection, 'gateAccessCompanyToken');
		let token = '';

		if(!token_response){
			let result = await this.createCompany(connection, company);

			if(result.data && result.data.company){
				token = result.data.company.token;
				await setting.save(connection, {
					name: 'gateAccessCompanyToken',
					value: token,
					company_id: company.id
				})
			}
		} else {
			token = token_response.value;
		}

		this.token = token;

	}

	sync(){

	}

	display(){
		return {
			access_id: this.access_id,
			property_id: this.property_id,
			Credentials: {
				connected: (this.facility && this.facility.GateConnection && this.facility.GateConnection.connected) || false,
				...this.Credentials
			},
		}
	}

	async createCompany(company){
		if(!company.name && company.id){
			company = models.Company.findById(connection, company.id);
		}

		return await request({
			uri: this.endpoint + 'companies',
			method: 'POST',
			body: {
				name: company.name
			},
			json: true
		})
	}

	async updateUserSpaces(contact){

		//if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");

		for(let i= 0; i < contact.Leases.length; i++){
			let lease = contact.Leases[i];
			this.updateUserSpace(contact, lease)
		}
	}

	async updateUserSpace(contact, lease, updates){
		let today = moment().format('YYYY-MM-DD');
		console.log('Creating space if not exist with Unit => ',JSON.stringify(lease.Unit));
		let space = await this.createSpaceIfNotExist(lease.Unit);
		let user_exists = space.Users.find(u => u.user_id == contact.id);
		console.log('Space with users => ',JSON.stringify(space));
		console.log('is user_exists => ',user_exists);

		let has_access = lease.end_date === null || moment(lease.end_date) > moment(today);
		console.log(`User has_access => ${has_access}`);

		let creds = {};
		creds.start_date = lease.start_date;
		creds.end_date = lease.end_date;
		creds.status = updates && (updates.status === 1 ? 'ACTIVE' : (updates.status === 0 ? 'SUSPENDED' : undefined));
		console.log(`User creds => ${JSON.stringify(creds)}`);

		if(has_access) {
			if(user_exists) {
				// update users
				console.log('Updating user with space =>', JSON.stringify(lease.Unit));
				await this.updateContactToSpace(contact, creds, lease.Unit.id, lease.Unit.property_id)
			} else if (!user_exists){
				// create users
				console.log('Creating user with space =>', JSON.stringify(lease.Unit));
				await this.addContactToSpace(contact, creds, lease.Unit.id, lease.Unit.property_id)
			}
		} else if(!has_access && user_exists) {
			// remove user from space
			console.log('Removing user with space =>', JSON.stringify(lease.Unit));
			await this.removeContactFromSpace(contact, lease.Unit.id, lease.Unit.property_id);
		}
	}

	// remove overlock noke facilities
	async removeOverlock(property_id, unit_id){

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/remove-overlock',
			body: {},
			method: 'PUT',
			json: true
		}
		
		await this.makeRequest(request_params);

	}

	async removeContactFromSpace(contact, unit_id, property_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
			method: 'DELETE',
			json: true
		}
		await this.makeRequest(request_params);

	}

	static async enableContactAccessIfCurrent(connection, payload) {
		const { lease } = payload;
		try {
		  await lease.Property.getAccessControl(connection);
		  if (!lease.Property.Access) return;

		  await lease.Property.Access.allowAccessToSpace(lease);
		} catch(err) {
		  console.log(err);
		}
	}

	
}


module.exports = AccessControl;
