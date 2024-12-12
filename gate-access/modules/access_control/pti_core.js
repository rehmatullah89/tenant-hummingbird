"use strict"
const models  = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

class PTICore extends AccessControl {

	constructor(facility_id){
		super(facility_id, 2, 'pti_core');

		this.api_url = 'https://api.ptisecurity.com/v2/';
		this.api_version = '2';
		this.api_key = 'CJZ3tAfwEY3OKFXNyWkGGF3L1mzqSE8xHUpdSdhg';
		this.client_id = '64937418';

		// Endpoint DEFINITION
		this.token_enpoint = 'authtoken';
		this.groups_endpoint = 'accesslevels/';
		this.users_endpoint = 'users/';
		this.sync_enpoint = 'sync/'; // Implement
		this.facilities_enpoint = 'sites/';
		this.units_enpoint = 'units/';
	}


	async initial_load(connection, company_id, facility){
		await this.renewCredentials();
		let unitList = [];
		let groupList = [];
		let userList = [];
		// get_facility_details
		// Doesnt work.
		// let facility_details = await this.get_facility_details(facility);

		//console.log(facility_details);

		// load groups
		// let groups = await this.get_groups();
		// for(let i = 0; i < groups.length; i++){
		//
		// 	let group = new GroupService({
		// 		name:           groups[i].AccessLevelDescription,
		// 		external_id:    groups[i].ObjectId,
		// 		facility_id:    facility.id,
		// 		active:         !groups[i].WasDeleted,
		// 	});
		// 	await group.save(connection);
		// 	groupList.push(group);
		// }
		// // return groupList;
		//
		//
		//
		//
		// // load users
		// let users = await this.get_users();
		// for(let i = 0; i < users.length; i++){
		//
		// 	let user = new UserService({
		// 		company_id:     company_id,
		// 		external_id:    users[i].ObjectId,
		// 		first:          users[i].FirstName,
		// 		last:           users[i].LastName,
		// 		email:          users[i].EmailAddress,
		// 		home_phone:     users[i].HomePhone,
		// 		work_phone:     users[i].WorkPhone,
		// 		cell_phone:     users[i].MobilePhone,
		// 		facility_id:    facility.id,
		// 		active:         !users[i].WasDeleted,
		// 	});
		//
		//
		// 	try{
		// 		let u = await this.get_user_group(user);
		// 		console.log(u);
		// 		user.group_id = u[0].ObjectId;
		// 	} catch(err){
		// 		console.log(err);
		// 	}
		//
		// 	await user.save(connection);
		// 	userList.push(user);
		//
		// }
		// // return users;





		 // get_units
		let units = await this.get_units(facility);

		for(let i = 0; i < units.length; i++){

			let unit = new SpaceService();
			unit.external_id = units[i].ObjectId;
			let u = await this.get_unit(unit);
			console.log("U", u);

			try{

				let unit_users = await this.get_unit_users(unit);
				console.log("unit_users", unit_users);
			} catch(err){

			}
			try {
				let get_unit_overlocks = await this.get_unit_overlocks(unit);
				console.log("get_unit_overlocks", get_unit_overlocks);

			} catch(err){

			}

			unitList.push(u);

		}
		return unitList;

		// load units users

		// get_unit_overlocks

	}

	async move_in(unit, user){
		let result = {};
		await this.renewCredentials();

		let data = {
			AccessCode: user.access_code,
			StartDate: user.start_date,
			ExpirationDate: user.end_date,
		}

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			form: data,
			uri: this.api_url + this.units_enpoint + unit.external_id + '/rent/' + user.external_id,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-In : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core move_in error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async add_user_to_unit(unit, user){
		let result = {};
		await this.renewCredentials();

		let data = {
			AccessCode: user.access_code,
			StartDate: user.start_date,
			ExpirationDate: user.end_date,
		}

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			form: data,
			uri: this.api_url + this.units_enpoint + unit.external_id + '/tousers/' + user.external_id,
			method: 'POST'
		}


		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Adding User to Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core add_user_to_unit error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async remove_user_from_unit(unit, user){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},

			uri: this.api_url + this.units_enpoint + unit.external_id + '/tousers/' + user.external_id,
			method: 'DELETE'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed remove User From Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core remove_user_from_unit error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async move_out(unit){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.units_enpoint + unit.external_id,
			method: 'DELETE'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core move_out error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	suspend(){

	}

	update(){

	}

	async create_unit(){

	}

	async get_units(){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.units_enpoint,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Units : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_units error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_unit(unit){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.units_enpoint + unit.external_id,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_unit error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_unit_overlocks(unit){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.units_enpoint + unit.external_id + '/overlocks',
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Unit Overlocks: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_unit_overlocks error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_unit_users(unit){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.units_enpoint + unit.external_id + '/users',
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Unit Users: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_unit_users error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_users(){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users_endpoint,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Users: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_users error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_user(user){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users_endpoint + user.external_id,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting User: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_user error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_user_group(user){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users_endpoint + user.external_id + '/accesslevels',
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting User Group: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_user error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}


	async get_facilities(facility){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.facilities_enpoint,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting facilities: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_facilities error'));
			e.th(error.statusCode, error.toString());
		})
		return JSON.parse(result);
	}

	async get_facility_details(facility){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.facilities_enpoint + facility.external_id,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting Facility Details: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_facility_details error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async set_suspended(user, suspended){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users + user.external_id + '/suspended/' +suspended ? 'true':'false',
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Setting Suspended: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core set_suspended error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async add_user(user){

		let data = {
			FirstName:  user.first_name,
			LastName:   user.last_name,
			AccessCode: user.code,
			EmailAddress: user.email,
			AccessAlerts: false,
			UnitAlerts: false,
			HomePhone: user.phone,
			MobilePhone : user.cell_phone,
			WorkPhone: user.work_phone,
			StartDate: user.start_date,
			ExpirationDate: user.end_date,
			pin: user.pin,

		};

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			form: data,
			uri: this.api_url + this.users_endpoint,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Adding User: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core add_user error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async add_user_to_group(user, group){

		let data = {
			UserId: user.external_id,
			GroupId: group.external_id
		};

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users_endpoint + user.external_id + '/accesslevels/' + group.external_id,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Adding User To group: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core add_user_to_group error'));
			e.th(error.statusCode, error.toString());
		})
		return JSON.parse(result);
	}

	async remove_user_from_group(user, group){

		let data = {
			UserId: user.external_id,
			GroupId: group.external_id
		};

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.users_endpoint + user.external_id + '/accesslevels/' + group.external_id,
			method: 'DELETE'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Remove User To group: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core remove_user_from_group error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async sync(){
		let data = {};
		await this.renewCredentials();




		try {
			data = await request({
				headers: {
					Authorization: this.getBearerValue()
				},
				uri: this.api_url + this.sync_enpoint,
				method: 'GET'
			});

		} catch(err){
			e.th(err.statusCode, err.toString());

		}
	}

	async get_group(group){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.groups_endpoint + group.external_id,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting group: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_group error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async get_groups(){

		await this.renewCredentials();

		let result = {};
		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			uri: this.api_url + this.groups_endpoint,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Getting groups: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core get_groups error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	async create_group(group){

		let data = {
			AccessLevelDescription: group.name,
			RequiredLevel: 0,
			InterfaceZone: 0,
		};

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue()
			},
			form: data,
			uri: this.api_url + this.groups_endpoint,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Creating group: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core create_group error'));
			e.th(error.statusCode, error.toString());
		})

		return JSON.parse(result);
	}

	/*
	* Returns external_id
	*
	* */
	async add_group(group){
		let result = '';
		if(group.external_id){
			result = await this.get_group(group)
		} else {
			result = await this.create_group(group);
		}

		return result.ObjectId;
	}



	getBearerValue(){
		return "Bearer " + this.Credentials.token;
	}

	getAuthHeader(){
		let authHeader =  new Buffer(this.client_id+":"+this.api_key).toString('base64');
		return "Basic " + authHeader;
	}

	async renewCredentials(connection){
		let data = {};

		let reqObj = {
			headers: {
				Authorization: this.getAuthHeader()
			},
			form: {
				grant_type: 'client_credentials',
				site_key: this.Credentials.site_key
			},
			uri: this.api_url + this.token_enpoint,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { data = response })
		.catch( error => { 
			logger.error(`Failed Renewing Credentials: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Pti_core renewCredentials error'));
			e.th(error.statusCode, error.toString());
		})


		this.updateCredentials(this.parseTokenData(data));
		//await this.saveCredentials(connection)

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
				expires: moment.utc().add(d.expires_in, 'seconds').toDate(),
			}
		};
	}

	updateCredentials(data){
		data.Credentials = data.Credentials || {};
		this.Credentials.site_key = data.Credentials.site_key ? data.Credentials.site_key: this.Credentials.site_key;
		this.Credentials.username = data.Credentials.username ? data.Credentials.username : this.Credentials.username;
		this.Credentials.password = data.Credentials.password ? data.Credentials.password: this.Credentials.password;
		this.Credentials.site_code = data.Credentials.site_code ? data.Credentials.site_code: this.Credentials.site_code;
		this.Credentials.token = data.Credentials.token ? data.Credentials.token: this.Credentials.token;
		this.Credentials.token_type = data.Credentials.token_type ? data.Credentials.token_type: this.Credentials.token_type;
		this.Credentials.expires = data.Credentials.expires ? data.Credentials.expires: this.Credentials.expires;
	}

	async saveCredentials(){}



}



module.exports = PTICore;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');