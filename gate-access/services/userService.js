"use strict";
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');
const moment = require('moment');

class User {

	constructor(user = {}){

		this.id = user.id;
		this.user_id = user.user_id;
		this.create(user);

		//this.Gates = [];
		//this.Times = [];
		//this.Spaces = [];


	}

	async find(connection){

		if(!this.id && (!this.user_id || !this.facility_id)) e.th(400, "Missing Unit info");
		let user = {};

		if(this.id){
			user = await models.User.findById(connection, this.id);
		} else {
			user = await models.User.findByUserId(connection, this.user_id, this.facility_id);
		}

		if(!user) e.th(404, "The user doesn’t have access control configure");

		this.id = user.id;
		this.create(user);

	}

	async userExists(connection){

		if(!this.id && (!this.user_id || !this.company_id || !this.facility_id)) e.th(400, "Missing User info");
		let user = await models.User.findUserExist(connection, this.user_id, this.company_id, this.facility_id);
		if (user) {
			this.id = user.id;
			this.create(user);
		}
	}

	create(user){

		this.user_id = user.user_id;
		this.company_id = user.company_id || this.company_id;
		this.facility_id = user.facility_id || this.facility_id;
		this.group_id = user.group_id || this.group_id;
		this.first = user.first || this.first;
		this.last = user.last || this.last;
		this.email = user.email || this.email;
		this.phone = user.phone || this.phone;
		this.pin = user.pin || this.pin;
		this.status = user.status || 'ACTIVE';
		this.active = typeof user.active === 'undefined' || user.active ? 1 : 0;
		this.external_id = user.external_id || this.external_id;
		this.modified = user.modified || this.modified;
	}

	async save(connection){

		//TODO Validate name is unique, external id is unique if not null
		//TODO maybe have an active flag and a deleted flag..

		const data = {
			user_id: this.user_id,
			company_id: this.company_id,
			facility_id: this.facility_id,
			group_id: this.group_id,
			first: this.first,
			last: this.last,
			email: this.email,
			phone: this.phone || '',
			pin: this.pin,
			status: this.status,
			active: this.active,
			external_id: this.external_id,
		};

		let result = await models.User.save(connection,data, this.id );

		if(!this.id){
			this.id = result.insertId;
		}

	}

	async delete(connection, remove_external_id) {
		console.log( "Deleting", JSON.stringify(this))
		return await models.User.delete(connection, this.id, remove_external_id)
	}

	async addToGroup(connection, group_id, facility_id){

		if(!this.id) e.th(500);

		if(this.group_id) return;

		const group = new GroupService({id: group_id});
		await group.find( connection );
		group.verifyAccess(facility_id);

		await models.User.save(connection,{group_id: group_id }, this.id );

		// get times and add to user times
		await group.findTimes(connection);

		// get areas and add to user areas
		await group.findAreas(connection);

		for(let i=0;i< group.Areas.length; i++){
			await group.Areas[i].getGates(connection);
			await this.saveAccess(connection, group.Areas[i].Gates);
		}
	}

	async saveAccess(connection, gates){

		// remove gates


		for(let i = 0; i < gates.length; gates++){
			let data = {
				gate_id: gates[i].id,
				user_id: this.id
			}

			await models.User.saveAccess(connection, data);

		}
	}

	async getGroup(connection){

		this.Group = new GroupService({id: this.group_id});
		await this.Group.find(connection);

	}

	async getGates(connection, facility_id){
		let gates = await models.User.getGates(connection, this.id, facility_id);

		for(let i = 0; i < gates.length; gates++){
			let gate = new GateService({id: gates[i].gate_id});
			await gate.find(connection);
			this.Gates.push(gate);

		}

	}
	async getTimes(connection, facility_id){

	}

	async getSpaces(connection, facility_id){
		let spaces = await models.User.getSpaces(connection, this.id, facility_id);
		this.Spaces = spaces;
	}

	async getActiveSpaces(connection, facility_id){
		let spaces = await models.User.getActiveSpaces(connection, this.id, facility_id);
		this.Spaces = spaces;
	}

	async getActiveAndSuspendedSpaces(connection, facility_id) {
		let spaces = await models.User.getActiveAndSuspendedSpaces(connection, this.id, facility_id);
		this.Spaces = spaces;
	}

	async linkSpace(connection, primary_contact_id) {
		return await models.User.linkSpace(connection, primary_contact_id, this.id);
	}

	verifyAccess(company_id){

		if(this.company_id == company_id) return;
		e.th(403, "Access Denied");
	}

	static async findAllUsers(connection, conditions){
		return await models.User.findAllUsers(connection, conditions);
	}

	static async findUserById(connection, user_id, facility_id){
		return await models.User.findByUserId(connection, user_id, facility_id);
	}

    currentLeases(){
        if(this.Spaces && this.Spaces.length) {
			return this.Spaces.filter(space => space.end_date === null || moment(space.end_date).isAfter(moment().format('YYYY-MM-DD')))
		} else {
			return [];
		}
    }



}

module.exports = User;

const GroupService = require('./groupService');
const GateService = require('./gateService');
const SpaceService = require('./spaceService')