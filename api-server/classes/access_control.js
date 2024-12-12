"use strict";

var models  = require(__dirname + '/../models');
var moment      = require('moment');
var Company  = require(__dirname + '/../classes/company.js');
var Utils  = require(__dirname + '/../modules/utils');
var request = require('request-promise');
const { sendInterationLogsToGDS } = require('../modules/utils');
const utils = require('../modules/utils');
var Settings = require(__dirname + '/../classes/settings.js');

var e  = require(__dirname + '/../modules/error_handler.js');
const axios = require('axios').default

class AccessControl {

	constructor(data) {
		if(data){
			this.access_id = data.access_id;
			this.name = data.name || "";
			this.property_id = data.property_id;
			this.Credentials = data.Credentials || {};
			this.request_id = data.request_id;
			this.trace_id = data.trace_id;
		}
		
		this.endpoint = process.env.GATE_ACCESS_APP_ENDPOINT;
		this.Facilities = {};
		this.Spaces = {};
		this.Groups = [];
		this.Contacts = [];
		this.Token = {};
		this.component_name = "HB_GATE_ACCESS_INTEGRATION"
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

	async makeRequest(request_params, requester){
		let logs = {
			request_params,
			env: process.env.NODE_ENV
		};
		try {
			let timing_start = Date.now();
			console.log('Access request start, requested params:', request_params);
			var result = {}
			
			if ( requester && requester === 'axios'){
				let {data} = await axios(request_params);
				result = data;
			}
			else{
				result = await request(request_params);
			}
			
			console.log('Access request done', result);
			logs.timing = Date.now() - timing_start;
			logs.result = result;
		} catch(err) {
			logs.error = err;
			if(err.statusCode !== 404){
				logs.notify = true;
			}
			throw err;
		} finally {
			try {
				if (logs.env !== 'test' && logs.env !== 'local' && logs.env !== 'data-validation') {
					utils.sendLogsToGDS(this.component_name, logs, '', logs.error ? 'error' : 'info', this.request_id, this.trace_id);
				}
			} catch (err) {
				console.log("Error in sending logs to GDS: ", logs, "trace_id:", this.trace_id, err);
			}
		}

		return result; 
	}

	async getGateVendors(){
		
		
		let request_params = {
			headers: this.getHeaders(),
			uri: this.endpoint + 'gate-vendors',
			method: 'GET',
			json: true
		}	
		let result = await this.makeRequest(request_params)
		return result?.data?.gateVendors

	}

	async facilitiesSync(){
	
		if(!this.property_id) e.th(500, "Property id missing");
		
		try{
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/sync',
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.facilities;
		} catch(err){
			if(err.statusCode !== 404 && err.statusCode !== 308){
				throw err;
			}
		}
	}

	//NOTE: req params are different - using axios api instead of deprecated request npm module
	async getAgentInfo(gate_vendor_id){

		if(!this.property_id) e.th(500, "Property id missing");
		
		try{
			let request_params = {
				headers: this.getHeaders(this.token),
				url: this.endpoint + 'facilities/'  + this.property_id +  '/agent/info',
				method: 'get',
				params:{
					gate_vendor_id
				},
			}
			let result = await this.makeRequest(request_params, 'axios');
			return result?.data;
		} catch(err){
			throw err;
		}
	}

	//NOTE: req params are different - using axios api instead of deprecated request npm module
	async getDownloadURI(gate_vendor_id){

		if(!this.property_id) e.th(500, "Property id missing");
		
		try{
			let request_params = {
				headers: this.getHeaders(this.token),
				url: this.endpoint + 'facilities/'  + this.property_id +  '/agent/install',
				method: 'get',
				params:{
					gate_vendor_id
				},
			}
			let result = await this.makeRequest(request_params, 'axios');
			return result?.data;
		} catch(err){
			throw err;
		}
	}

	//NOTE: req params are different - using axios api instead of deprecated request npm module
	async getInstallToken(gate_vendor_id){

		if(!this.property_id) e.th(500, "Property id missing");
		
		try{
			let request_params = {
				headers: this.getHeaders(this.token),
				url: this.endpoint + 'facilities/'  + this.property_id +  '/agent/token',
				method: 'get',
				params:{
					gate_vendor_id
				},
			}
			let result = await this.makeRequest(request_params, 'axios');
			return result?.data;
		} catch(err){
			throw err;
		}
	}

	async groupsSync(){

		if(!this.property_id) e.th(500, "Property id missing");

		var request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id +  '/groups/sync',
			method: 'GET',
			json: true
		} 
		try{
			let result = await this.makeRequest(request_params);
			return result?.data?.groups;
		} catch(err){
			if(err.statusCode !== 404 && err.statusCode !== 308){
				throw err;
			}
		}
	}

	async usersSync(){
		if(!this.property_id) e.th(500, "Property id missing");
		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/users/sync',
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.users;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
			throw err;
		}

		
	}

	async userSync(user_id){
		if(!this.property_id) e.th(500, "Property id missing");

		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + this.property_id +  '/users/' + user_id + '/sync',
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.user;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
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

		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + this.property_id,
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			this.facility = result?.data?.facility;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
			throw err;
		}

	}

	async createFacility(property, creds, admin_id){

		let body = {
			admin_id,
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

		
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities',
			method: 'POST',
			body,
			json: true
		}
		let result = await this.makeRequest(request_params);
		this.facility = result?.data?.facility;
	
	}

	async updateFacility(property, creds, admin_id){

		let body = {
			admin_id,
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
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id,
			method: 'PUT',
			body,
			json: true
		}
		let result = await this.makeRequest(request_params);
		this.facility = result?.data?.facility;
		

	}

	async deleteFacility(admin_id) {
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id,
			body: { admin_id },
			method: 'DELETE',
			json: true
		}
		await this.makeRequest(request_params);
	}

	async createUser(contact, creds){
		//if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");

		let phone;
		for(let i = 0; i < contact.Phones.length; i++){
			if (contact.Phones[i].primary) {
				phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
				break;
			}
			
		}

		let request_params = {
			headers: this.getHeaders(this.token),
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
		}
		let result = await this.makeRequest(request_params);
		return result;

	}

	async getUsers(conditions){	

		let url = new URL(this.endpoint + 'facilities/'  + this.property_id + '/users');

		if(conditions){
			conditions.pin && url.searchParams.append('pin', conditions.pin);
		}

		if(!this.property_id) e.th(500, "Property id missing");

		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: url.href,
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.users;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
			throw err;
		}
	}

	async getAllMoveins(conditions){	

		let url = new URL(this.endpoint + 'facilities/'  + this.property_id + '/spacesUsers');

		if(!this.property_id) e.th(500, "Property id missing");

		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: url.href,
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.moveins;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
			throw err;
		}
	}

	async getUser(contact_id){
		if(!this.property_id) e.th(500, "Property id missing");

		try {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + this.property_id + '/users/' + contact_id ,
				method: 'GET',
				json: true
			}
			let result = await this.makeRequest(request_params);
			return result?.data?.user;
		} catch(err) {
			if(err.statusCode === 404){
				return;
			}
			throw err;
		}
		
	}

	async updateSpaceCode(property_id, unit_id, pin){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/code',
			body: {
				pin: pin,
			},
			method: 'PUT',
			json: true
		}
		await this.makeRequest(request_params);
	}

	async updateUser(contact, updates){
		let phone;

		for(let i = 0; i < contact.Phones.length; i++){
			if (contact.Phones[i].primary) {
				phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
				break;
			}
			
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


		console.log("UPDATEUSER", user)


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + user.user_id,
			body: user,
			method: 'PUT',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data;

	}

	async updateGAUser(contact, updates){

		let user = {
			user_id: contact.id,
			first: contact.first,
			last: contact.last,
			email: contact.email,
			phone: contact.phone,
			external_id: updates.external_id,
			pin: updates && updates.pin,
			status: updates && (updates.status === 1 ? 'ACTIVE' : (updates.status === 0 ? 'SUSPENDED' : undefined))
		}


		console.log("UPDATEUSER", user)


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/' + user.user_id + '/sync',
			body: user,
			method: 'PUT',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data;

	}

	async createGAUser(contact, creds){
		//if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id + '/users',
			body: {
				user_id: contact.id,
				first: contact.first,
				last: contact.last,
				email: contact.email,
				phone: contact.phone,
				pin: creds && creds.pin,
				status: creds && (creds.status === 1 ? 'ACTIVE' : (creds.status === 0 ? 'SUSPENDED' : undefined)),
				active: 1
			},
			method: 'POST',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result;

	}

	async deleteUser(contact_id){


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id,
			body: {},
			method: 'DELETE',
			json: true
		}
		await this.makeRequest(request_params);

	}

	// this is not in use
	async denyAccessToSpace(lease){

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/deny-access',
			body: {},
			method: 'PUT',
			json: true
		}
		await this.makeRequest(request_params);

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
	// overlocks noke facilities
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

	async allowAccessToSpace(lease, meta){

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/enable-access',
			body: {},
			method: 'PUT',
			json: true
		}
		await this.makeRequest(request_params);

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

	async removeContactFromSpace(contact, unit_id, property_id, transfer){
		
		if (!transfer) {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
				method: 'DELETE',
				json: true
			}
			await this.makeRequest(request_params);
		}
		else {
			let request_params = {
				headers: this.getHeaders(this.token),
				uri: this.endpoint + 'facilities/'  + property_id + '/transfer/spaces/'  + unit_id + '/users/' + contact.id,
				method: 'DELETE',
				json: true
				
			}	
			await this.makeRequest(request_params);
		}	
	}



	async createSpaceIfNotExist(unit){

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces/'  + unit.id,
			method: 'GET',
			json: true
		}
	
		try {
			let result = await this.makeRequest(request_params);
			return result?.data?.space
		} catch(err){
			if(err.statusCode === 404){
				return await this.createSpace(unit, true);	
			}
			throw err;
		}
	}

	async getSpace(property_id, unit_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces/' + unit_id,
			method: 'GET',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.space;
	}

	async getSpaces(property_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + property_id + '/spaces',
			method: 'GET',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.spaces;
	}
	
	async createSpace(unit){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces',
			body: {
				space_id: unit.id,
				name: unit.number,
				status: 'VACANT',
				active: 1
			},
			method: 'POST',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.space;
	}

	async generateCode(){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id + '/generate-code',
			method: 'GET',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.code;

	}

	async validateCode(code, contact_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id + '/validate-code',
			method: 'POST',
			body: {
				code,
				user_id: contact_id ? contact_id : null
			},
			json: true
		}
		await this.makeRequest(request_params);
	}

	async generateSpaceCode(unit_number, unit_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id + '/generate-space-code',
			method: 'GET',
			body: {
				space_number: unit_number ? unit_number : null,
				space_id: unit_id ? unit_id : null
			},
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.code;

	}

	async validateSpaceCode(code, unit_number, unit_id){
		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/'  + this.property_id + '/validate-space-code',
			method: 'POST',
			body: {
				code,
				space_id: unit_id ? unit_id : null,
				space_number: unit_number ? unit_number : null
			},
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.code;
	}

	async getSpaceCode(unit_id) {

		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/spaces/' + unit_id,
			method: 'GET',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data?.space?.pin;

	}

	async updateCatches(unit_id, req_body) {


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/spaces/' + unit_id + '/catches',
			method: 'PUT',
			body: req_body,
			json: true
		}
		await this.makeRequest(request_params);
	}

	async suspendUser(contact_id, unit_id){
		var user = {};
		user = {
			user_id: contact_id,
			space_id: unit_id,
		};


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id + '/suspend',
			body: user,
			method: 'POST',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data;
		
	}

	async restoreUser(contact_id, unit_id){
		var user = {};
		user = {
			user_id: contact_id,
			space_id: unit_id,
		};


		let request_params = {
			headers: this.getHeaders(this.token),
			uri: this.endpoint + 'facilities/' + this.property_id + '/users/'  + contact_id + '/restore',
			body: user,
			method: 'POST',
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result?.data;

	}

	async install(connection, company, property, creds, admin_id){
		await this.getToken(connection, company, admin_id);

		await this.getFacility();
		if(!this.facility) {
			await this.createFacility(property, creds, admin_id);
		} else {
			await this.updateFacility(property,creds, admin_id);
		}
	}

	async fetch(connection, company, admin_id){

		await this.getToken(connection, company, admin_id);
		await this.getFacility();

		console.log("THIS_FACILITY:", this.facility);

		if(this.facility) {
			this.access_id = this.facility.gate_vendor_id;
			this.access_name = this.facility.gate_vendor_name;
			this.Credentials = this.facility.GateConnection && this.facility.GateConnection.Credentials;
		}
	}

	//TODO review  This is wrong get function call should not have side effects
	// Gets token from settings, if there is not one, registers a new company, saves and returns the token
	async getToken(connection, company, admin_id){
		
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
				}, admin_id);
			}
		} else {
			token = token_response.value;
		}

		this.token = token;

	}

	// alias for getToken with out side effects
	async setAPIToken(connection, company_id){
		
		let setting = new Settings({company_id});
		let token_response = await setting.findSettingByName(connection, 'gateAccessCompanyToken');

		if(token_response){
			this.token = token_response.value;
		}
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

	async createCompany(connection, company){

		if(!company.id) e.th(404, "Company id is not specified.");
		company = await models.Company.findById(connection, company.id);

		let request_params = {
			uri: this.endpoint + 'companies',
			headers: this.getHeaders(),
			method: 'POST',
			body: {
				name: company.name
			},
			json: true
		}
		let result = await this.makeRequest(request_params);
		return result;

	}

	async linkContact(connection, primary_contact_id, secondary_contact_id,property_id) {
		console.log('Linking Contact function in access control class');

		try {
			
			let request_params = {
				uri: this.endpoint + 'facilities/' + property_id + '/users/' + secondary_contact_id + '/link-contact',
				headers: this.getHeaders(this.token),
				method: 'POST',
				body: {
					primary_contact_id
				},
				json: true
			}
			let result = await this.makeRequest(request_params);
			console.log('Link contact updated')
			console.log(result)
			return result;

		} catch (error) {
			console.log('Error - link-contact records are not updated')
			console.log(error)
			throw error;
		}


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
			await this.removeContactFromSpace(contact, lease.Unit.id, lease.Unit.property_id, updates.is_transfer);
		}
	}

	async updateSpaceGateAccess(payload) {
    console.log('Update Spaces Users Table During Un Linking Space function')
    try {
      let request_params = {
        uri: this.endpoint + 'facilities/' + payload.property_id + '/users/' + payload.contact_id + '/unlink',
        headers: this.getHeaders(this.token),
        method: 'POST',
        body: {
          ...payload
        },
        json: true
      }
      let result = await this.makeRequest(request_params);
      console.log('Gate access updated')
      console.log(result)
      return result;
    } catch (error) {
      console.log('Error - gate-access records are not updated')
      console.log(error)
      throw error.message;
    }
  }
}


module.exports = AccessControl;
