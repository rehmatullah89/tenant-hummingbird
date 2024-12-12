"use strict"
const models  = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

var getNamespace = require('cls-hooked').getNamespace;
var session = getNamespace('gatePortals');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class OpenTech extends AccessControl {

	constructor(facility_id){
		super(facility_id, 4, 'open_tech');

		this.auth_url = process.env.OPENTECH_AUTH_URL;
		this.access_url = process.env.OPENTECH_ACCESS_URL;
		
		this.client_id = process.env.OPENTECH_CLIENT_ID;
		this.client_secret = process.env.OPENTECH_CLIENT_SECRET;

		// api_key cw3bpKBK2yjeTuNBEOLcKqYqTtHeocd2
		// api_secret kb7fdG1StoGc3ZiUwzTgNBQLOMz7IqOy

		// Endpoint DEFINITION
		this.token_enpoint ='auth/token';
		this.facilities_enpoint ='facilities/';
		this.ping_enpoint ='pms/ping';

	}

	async initial_load(){

	}


	async testConnection(){
		try{
			await this.renewCredentials();
		} catch(err) {
			console.log("Error: ", err);
			return false;
		}

		return !!this.Credentials.token;
	}

	async move_in(unit, user){
		let result = {};
		await this.renewCredentials();

		
		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/visitors' ,
			body: {
				unitId: unit.external_id,
				accessCode: user.pin,
				firstName: user.first,
				lastName: user.last,
				email: user.email,
				mobilePhoneNumber: user.phone,
				//expirationDate,
				isTenant: true,
			},
			method: 'POST',
			json: true
		}
		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-In : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech move_in error'));
			e.th(error.statusCode, error.toString());
		})
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech move_in'));
		let returnVal = result && result.visitor && result.visitor.id;
		return { external_id: returnVal, space_level: true };
	}

	async add_user_to_unit(unit, user){
		this.move_in(unit, user)
	}

	async update_user_to_unit(unit, user){
		await this.renewCredentials();
		let spaceDetail = user.Spaces.find(u => u.space_id === unit.id);

		if(spaceDetail && spaceDetail.external_id){
			await this.updateVisitor(user, spaceDetail);
		}	
	}

	async remove_user_from_unit(unit, user){
		let result = {};
		await this.renewCredentials();
		let spaceDetail = user.Spaces.find(u => u.space_id === unit.id);

		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/visitors/' + spaceDetail.external_id + '/remove'  ,
			method: 'POST',
			json: true
		}
		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Remove User From Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech remove_user_from_unit error'));
			e.th(error.statusCode, error.toString());
		})
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech remove_user_from_unit'));
		return result;

	}

	async move_out(unit){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/units/' + unit.external_id + '/vacate' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech move_out error'));
			e.th(error.statusCode, error.toString());
		})	

		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech move_out'));
		return result;
	}

	async suspend(user, unit){
		await this.renewCredentials();
		let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;
		console.log("suspend units => ", units)
		for(let i = 0; i < units.length; i++){
			if(units[i].external_id){
				await this.suspendUnits(units[i].external_id);
			}
		}
	}

	async suspendUnits(unit_id){
		let result = {};
		
		
		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/units/' + unit_id + '/disable' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Suspend Units : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech suspend_units error'));
			e.th(error.statusCode, error.toString());
		})	
			
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech suspendUnits'));	
		return result;
	}

	async unsuspend(user, unit){
		await this.renewCredentials();
		let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;
		console.log("unsuspend Units => ", units)
		for(let i = 0; i < units.length; i++){
			if(units[i].external_id){
				await this.unSuspendUnits(units[i].external_id);
			}
		}
	}

	async unSuspendUnits(unit_id){
		let result = {};
		
		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/units/' + unit_id + '/enable' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Unsuspend Units : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech unsuspend error'));
			e.th(error.statusCode, error.toString());
		})	
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech unsuspendUnits'));
		return result;
	}

	update(){

	}

	async create_unit(space){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/units' ,
			body: {
				unitNumber: space.name,
			  },
			method: 'POST',
			json: true
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Create Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech create_unit error'));
			e.th(error.statusCode, error.toString());
		})	
		return result && result.id;
	}

	async get_units(){
		let result = {};
		await this.renewCredentials();


		try {
			result = await request({
				headers: this.setHeader(),
				uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + 'unirs' ,
				method: 'GET'
			});

			return result;

		} catch(err){
			console.log(err);
			e.th(err.statusCode, err.toString());
		}


	}

	async get_unit(unit){

	}

	async get_unit_overlocks(unit){

	}

	async get_unit_users(unit){

	}

	async get_users(){

	}

	async get_user(user){

	}

	async get_user_group(user){

	}

	async get_facility(){
		let result = {};
		await this.renewCredentials();


		try {
			result = await request({
				headers: this.setHeader(),
				uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id,
				method: 'GET'
			});

			return result && JSON.parse(result);

		} catch(err){
			console.log(err);
			e.th(err.statusCode, err.toString());
		}
	}

	async get_facilities(){

		let result = {};
		await this.renewCredentials();


		try {
			result = await request({
				headers: this.setHeader(),
				uri: this.access_url + this.facilities_enpoint,
				method: 'GET'
			});
			return result && JSON.parse(result);

		} catch(err){
			console.log(err);
			e.th(err.statusCode, err.toString());
		}

	}

	async get_facility_details(facility){

	}

	async set_suspended(user, suspended){


	}

	async add_user(user){

	}

	async update_user(user){
		await this.renewCredentials();
		for(let i = 0; i < user.Spaces.length; i++){
			if(user.Spaces[i].external_id){
				await this.updateVisitor(user, user.Spaces[i]);
			}
		}
	}

	async updateVisitor(user, userSpace){
		let result = {};

		let reqObj = {
			headers: this.setHeader(),
			uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + '/visitors/' + userSpace.external_id + '/update' ,
			body: {
				accessCode: user.pin,
				firstName: user.first,
				lastName: user.last,
				email: user.email,
				mobilePhoneNumber: user.phone,
				//expirationDate,
			},
			method: 'POST',
			json: true
		}
		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Create Unit : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech updateVisitr error'));
			e.th(error.statusCode, error.toString());
		})	
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Open_Tech updateVisitor'));

		return result && result.visitor && result.visitor.id;
	}

	async add_user_to_group(user, group){

	}

	async remove_user_from_group(user, group){

	}

	async sync(){

	}

	async get_group(group){

	}

	async get_groups(){
		let result = {};
		await this.renewCredentials();


		try {
			result = await request({
				headers: this.setHeader(),
				uri: this.access_url + this.facilities_enpoint + this.Credentials.facility_id + 'accessprofiles' ,
				method: 'POST'
			});

			return result;

		} catch(err){
			console.log(err);
			e.th(err.statusCode, err.toString());
		}

	}

	async create_group(group){


	}

	/*
	* Returns external_id
	*
	* */
	async add_group(group){

	}

	getBearerValue(){
		return "Bearer " + this.Credentials.token;
	}

	getAuthHeader(){
		let authHeader =  new Buffer(this.client_id + ":" + this.Credentials.api_key).toString('base64');
		return "Basic " + authHeader;
	}

	async renewCredentials(connection){
		let result = {};

		let reqObj = {
			// headers: {
			// 	Authorization: this.getAuthHeader()
			// },
			form: {
				grant_type: 'password',
				username: this.Credentials.api_key,
				password: this.Credentials.api_secret,
				client_id: this.client_id,
				client_secret: this.client_secret,

			},
			uri: this.auth_url + this.token_enpoint,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Renew Credentials: ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Open_tech renewCredentials error'));
			e.th(error.statusCode, error.toString());
		})

		this.updateCredentials(this.parseTokenData(result));
		// await this.saveCredentials(connection)

	}

	setHeader(){
		return {
			Authorization: this.getBearerValue(),
			"api-version": '2.0',
			"Content-Type": 'application/json'
		}
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
		this.Credentials.token = data.Credentials.token ? data.Credentials.token: this.Credentials.token;
		this.Credentials.token_type = data.Credentials.token_type ? data.Credentials.token_type: this.Credentials.token_type;
		this.Credentials.expires = data.Credentials.expires ? data.Credentials.expires: this.Credentials.expires;
	}
}



module.exports = OpenTech;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');