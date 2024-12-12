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
class Noke extends AccessControl {

	constructor(facility_id){
		super(facility_id, 5, 'noke');

		this.endpoint = 'https://webhooks.smartentry.noke.com/webhooks';
		this.user_agent = process.env.NOKE_USER_AGENT || 'HummingbirdSandbox/1.0';
		//this.api_key = '50b44fe0-ccec-4776-a2cf-71092d6b08d1';

		// Endpoint DEFINITION
		this.rental_endpoint ='/v1/pms/changes';
		this.numberOfRetries = 5

	}

	async initial_load(){
	}

	async testConnection(){
		let result = {};

		let reqObj = {
			headers: this.setHeader(),
			body: {
				siteId: this.Credentials.site_id
			},
			uri: this.endpoint + '/v1/pms/changes',
			method: 'POST',
			json: true,
		}

		await requestWithAutoRetry(reqObj)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Connection Failed : ${error}`);
		})
			
			logger.http(logging.setLogs(result, null, session.get('transaction'), 'Noke Test_connection'));
		return true;
	}

	async move_in(unit, user){
		let result = {};

		if(unit.end_date && moment(moment().format('YYYY-MM-DD')).diff(moment(unit.end_date),'days') >= 0) {
			return;
		}
		
		let userStatus = 'inuse'

		if (user.status === 'SUSPENDED') {
			userStatus = unit.space_status.toLowerCase() === 'overlock' ? 'overlock' : 'gatelock';
		}

		let changes = [{  
			unitName: unit.name,
			firstName: user.first,
			lastName: user.last,
			phone: user.phone && user.phone.length === 10? `+1${user.phone}`: `+${user.phone}`,
			email: user.email,
			unitId: unit.name,
			tenantId: user.id.toString(),
			rentalStatus: userStatus,
			gateAccessCode: user.pin,
		}]

		
		let reqObj = {
			headers: this.setHeader(),
			body: {
				siteId: this.Credentials.site_id,
				changes
			},
			uri: this.endpoint + '/v1/pms/changes',
			method: 'POST',
			json: true,
		}
		await requestWithAutoRetry(reqObj, this.numberOfRetries)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-In : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Noke move_in error'));
			throw error;
		})

		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Noke move_in'));

	}

	async add_user_to_unit(unit, user){
		await this.move_in(unit, user);
	}

	async move_out(unit){
		let result = {};
		let changes = [{  
			unitId: unit.name,
			rentalStatus:'available',
		}]

		
		let reqObj = {
			headers: this.setHeader(),
			body: {
				siteId: this.Credentials.site_id,
				changes
			},
			uri: this.endpoint + '/v1/pms/changes',
			method: 'POST',
			json: true,
		}
		await requestWithAutoRetry(reqObj, this.numberOfRetries)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Move-Out : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Noke move_out error'));
			throw error;
		})
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Noke move_out'));
	}

	async overlock(user, unit){

		let result = {};
		let changes = [{  
			phone: user.phone && user.phone.length === 10? `+1${user.phone}`: `+${user.phone}`,
			unitId: unit.name,
			tenantId: user && user.id && user.id.toString(),
			rentalStatus:'overlock',
		}]

		let reqObj = {
			headers: this.setHeader(),
			body: {
				siteId: this.Credentials.site_id,
				changes
			},
			uri: this.endpoint + '/v1/pms/changes',
			method: 'POST',
			json: true,
		}

		await requestWithAutoRetry(reqObj, this.numberOfRetries)
		.then( response => { result = response })
		.catch( error => { 
			logger.error(`Failed Overlock : ${error}`);
			logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Noke overlock error'));
			throw error;
		})
		logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Noke overlock'));
	}

	async suspend(user, unit){
		let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;
		for(let i = 0; i < units.length; i++){
			let result = {};
			let status = units[i].space_status || units[i].status; 
			let changes = [{  
				phone: user.phone && user.phone.length === 10? `+1${user.phone}`: `+${user.phone}`,
				unitId: units[i].name,
				tenantId: user && user.id && user.id.toString(),
				rentalStatus:  status.toLowerCase() === 'overlock' ? 'overlock' : 'gatelock'
			}]
		
			let reqObj = {
				headers: this.setHeader(),
				body: {
					siteId: this.Credentials.site_id,
					changes
				},
				uri: this.endpoint + '/v1/pms/changes',
				method: 'POST',
				json: true,
			}

			await requestWithAutoRetry(reqObj, this.numberOfRetries)
			.then( response => { result = response })
			.catch( error => { 
				logger.error(`Failed Suspend : ${error}`);
				logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Noke suspend_user error'));
				throw error;
			})
			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'suspend user'));
		}
	}

	async unsuspend(user, unit){

		let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;

		for(let i = 0; i < units.length; i++){

			let result = {}; 
			let status = units[i].space_status || units[i].status; 
			
			let changes = [{  
				phone: user.phone && user.phone.length === 10? `+1${user.phone}`: `+${user.phone}`,
				email: user.email,
				unitId: units[i].name,
				unitName: units[i].name,
				tenantId: user && user.id && user.id.toString(),
				firstName: user.first,
				lastName: user.last,
				gateAccessCode: user.pin,
				rentalStatus: 'inuse'
			}]

			
			let reqObj = {
				headers: this.setHeader(),
				body: {
					siteId: this.Credentials.site_id,
					changes
				},
				uri: this.endpoint + '/v1/pms/changes',
				method: 'POST',
				json: true,
			}

			await requestWithAutoRetry(reqObj, this.numberOfRetries)
			.then( response => { result = response })
			.catch( error => { 
				logger.error(`Failed Unsuspend : ${error}`);
				logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'Noke unsuspend_user error'));
				e.th(error.statusCode, error.toString());
			})

			logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'Noke unsuspend_user '));
		}
	}

	async update_user(user){
		for(let i = 0; i < user.Spaces.length; i++){
			await this.move_in(user.Spaces[i], user);
		}
	}

	setHeader(){
		return {
			"Content-Type" : "application/json",
			"X-SecurGuard-API-Key-V1": this.Credentials.api_key,
			"User-Agent": this.user_agent
		};
	}

}

module.exports = Noke;