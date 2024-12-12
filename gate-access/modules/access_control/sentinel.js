"use strict"
const models  = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');
const requestWithAutoRetry = require('../autoRetry');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class Sentinel extends AccessControl {

	constructor(facility_id){
		super(facility_id, 3, 'sentinel');

		this.endpoint = 'https://tbd';

		this.client_id = 'TenantInc';
		this.client_secret = 'XtuBDw0TkkBU9bgFvaB8qCuJ';

	}

	async initial_load(connection, company_id, facility){



	}

	async sendUpdatedUnits(){
		let data = [{
			op_code: 'A',                   // (optional- is set by app if blank) A (add unit/secondary tenant), D (delete unit/secondary tenant), Q (query)
			unit_number: unit.number,       // unit Number, e.g.: "110"
			unit_status: unit.status,       // R (rented), D (Delinquent), V (Vacant)
			passcode: '',                   // (optional) pin
			cardnumber: '',                 // (optional) for keypad/card reader access
			time_zone: '',                  // (optional) 00-99 code for restricting timezone access
			access_level: '',               // (optional) 00-99 code for restricting gate access
			alert_code: '',                 //(optional) A (alert), N (Not on alert)
			tenant_name: '',
			onsite: '',                     // (optional) Onsite status - O (Onsite) /N (Not onsite)
			alarm_status: '',               // (optional) P (permanently disabled), T (time disabled), B (both disabled), E (Enabled)
			tenant_id: '',                  // (optional) used as link number
			alt_tenant: '',                 // (optional) flag true if this is secondary tenant
			error_code: '',                 // (optional) not used for edits, only used for results
		}]
	}




	async move_in(unit, user){
		let result = {};
		await this.renewCredentials();

		let form = {

			isTenant: true,
			access_code: '2342342'
		};

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/visitors/' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-In : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;
	}

	async add_user_to_unit(unit, user){
		this.move_in(unit, user)
	}

	async remove_user_from_unit(unit, user){
		let result = {};
		await this.renewCredentials();
		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/visitors/' + this.user_id + '/remove'  ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Remove User From Unit : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;
	}

	async move_out(unit){
		let result = {};
		await this.renewCredentials();
		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/units/' + this.space_id + '/vacate' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})
		return result;
	}

	async suspend(){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/units/' + this.space_id + '/disable' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})


		return result;
	}

	async unsuspend(){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/units/' + this.space_id + '/enable' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;
	}

	update(){

	}

	async create_unit(){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + '/units' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;

	}

	async get_units(){
		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + 'unirs' ,
			method: 'GET'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;
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


	async get_facilities(facility){

		let result = {};
		await this.renewCredentials();

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})
		return result
	}

	async get_facility_details(facility){

	}

	async set_suspended(user, suspended){


	}

	async add_user(user){

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

		let reqObj = {
			headers: {
				Authorization: this.getBearerValue(),
				"api-version": '2.0'
			},
			uri: this.access_url + this.facilities_enpoint + this.facility_id + 'accessprofiles' ,
			method: 'POST'
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			e.th(error.statusCode, error.toString());
		})

		return result;
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
		let authHeader =  new Buffer(this.client_id+":"+this.api_key).toString('base64');
		return "Basic " + authHeader;
	}

	async renewCredentials(){
		return true;

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
		this.Credentials.site_id = data.site_id ? data.site_id: this.Credentials.site_id;

	}

}



module.exports = Sentinel;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');