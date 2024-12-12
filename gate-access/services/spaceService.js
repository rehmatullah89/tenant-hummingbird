"use strict"
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');
const accepted_statuses = ['OVERLOCK', 'AUCTION'];

class Space {

	constructor(space = {}){
		this.id = space.id;
		this.create(space);
		this.Users = [];
	}

	async find(connection){
		if(!this.id && !this.space_id) e.th(400, "Missing ID");
		let space = {};
		if(this.id){
		  space = await models.Space.findById(connection, this.id);
		} else if (this.space_id && this.facility_id) {
		  space = await models.Space.findBySpaceId(connection, this.space_id, this.facility_id);
		}
		if(!space) e.th(404);

		this.id = space.id;
		this.create(space);


		if(!this.status) await this.getStatus(connection);


	}

	create(space){

		this.name = space.name;
		this.space_id = space.space_id;
		this.facility_id = space.facility_id || this.facility_id;
		this.status = space.status;
		this.active = space.active;
		this.access_area_id = space.access_area_id;
		this.modified = space.modified;
		if(space.created){
			this.created = space.created;
		}
		this.external_id = space.external_id;
		this.pin = space.pin;
		this.soft_catch = space.soft_catch;
		this.late_catch = space.late_catch;
		this.hard_catch = space.hard_catch;
	}

	async save(connection){

		await this.validateSpace(connection);

		const data = {
			name: this.name,
			space_id: this.space_id,
			status: this.status,
			active: this.active,
			access_area_id: this.access_area_id,
			facility_id: this.facility_id,
			external_id: this.external_id,
			pin: this.pin,
			soft_catch : this.soft_catch,
			late_catch : this.late_catch,
			hard_catch : this.hard_catch,
		};
		console.log("save data:", data);
		let result = await models.Space.save(connection,data, this.id )

		if(!this.id){
			this.id = result.insertId;
		}

	}

	async delete(connection){
		return await models.Space.delete(connection, this.id )
	}

	async validateSpace(connection){

		if(!this.name) e.th(400, "Please enter a space name");
		if(!this.facility_id) e.th(400, "Please include a facility id");
		if(!this.space_id) e.th(400, "Please include a space id");

		let space = await models.Space.findByName(connection, this.name, this.facility_id);

		if(space && space.id != this.id) {
			e.th(409, "A space with this name already exists at this facility");
		}

		space = await models.Space.findBySpaceId(connection, this.space_id, this.facility_id);

		if(space && space.id !== this.id) {
			e.th(409, "A space with this id already exists at this facility");
		}


	}

	verifyAccess(facility_id){
		if(this.facility_id == facility_id) return;
		e.th(403, "Access Denied");
	}

	async moveUserIn(connection, user, body, gate_vendor_id) {

		if(!this.id) e.th(500);
		if(!user.id) e.th(400, "The user.id does not exist");

		// is this user already in this space?
		let found = await models.Space.getUser(connection, this.id, user.id);

		let data = {
			user_id: user.id,
			space_id: this.id,
			start_date: body.start_date,
			end_date: body.end_date,
			external_id: body.external_id,
			status: 'ACTIVE'
		}

		await models.Space.moveIn(connection, data, found && found.id);
		await models.Space.save(connection, { status: 'OCCUPIED' }, this.id);
		if (gate_vendor_id == 12) {
			await models.Space.resetCatches(connection, this.id);
		}

	}

	async updateSpaceCode(connection, pin){
		if(typeof pin === 'undefined') e.th(400, "You must provide a valid pin");

		await models.Space.save(connection, {pin: pin}, this.id);
	}

	async setStatus(connection, status){

		if(!status) e.th(400, "You must provide a valid status");
		if(accepted_statuses.indexOf(status) < 0) e.th(400, "Invalid status");

		await models.Space.save(connection, {status: status}, this.id);


	}

	async getStatus(connection){
		if(!this.active){
			this.status = 'OFFLINE';
			return;
		}

		let existing_users = await models.Space.getUsersWithAccess(connection, this.id);
		this.status = existing_users.length ? 'OCCUPIED' : 'VACANT';
	}

	async removeStatus(connection){
		await models.Space.save(connection, {status: null}, this.id);
	}

	async updateCatches(connection, body) {

		if (typeof body.soft_catch !== 'undefined') this.soft_catch = body.soft_catch;
		if (typeof body.late_catch !== 'undefined') this.late_catch = body.late_catch;
		if (typeof body.hard_catch !== 'undefined') {
			this.hard_catch = body.hard_catch;
			if (this.hard_catch == 1) this.soft_catch = 0;
		}

		await this.save(connection);


	}

	async updateUser(connection, user, body){

		let data = {};

		if(typeof body.start_date !== 'undefined') data.start_date = body.start_date;
		if(typeof body.end_date !== 'undefined') data.end_date = body.end_date;
		if(typeof body.status !== 'undefined') data.status = body.status;
		if(typeof body.external_id !== 'undefined') data.external_id = body.external_id;

		let found = await models.Space.getUser(connection, this.id, user.id);
		if(!found) e.th(404, "This user is not in this space");

		console.log('found', found);
		await models.Space.moveIn(connection, data, found.id);

		await this.getStatus(connection);
		let catch_data = {
			status: this.status
		}
		if (this.status == 'VACANT') {
			catch_data.soft_catch = 0;
			catch_data.hard_catch = 0;
			catch_data.late_catch = 0;
			catch_data.pin = null;
		}
		await models.Space.save(connection, catch_data, this.id);
	}
// TODO calculate space status
	async calculateSpaceStatus(){

		// no users with dates = Vacant
		// Users with date, Occupied
		// Status = Overlocked = Overlocked
		// Status Auction = Auction

		return Promise.resolve();
	}

	async getUsers(connection){

		let space_users = await models.Space.getUsersWithAccess(connection, this.id);

		for(let i = 0; i < space_users.length; i++){
			console.log(" space_users[i]", space_users[i]); 
			let user = new UserService({id: space_users[i].user_id});
		
			await user.find(connection);
			await user.getGates(connection);
			await user.getTimes(connection);
			user.start_date = space_users[i].start_date;
			user.end_date = space_users[i].end_date;
			this.Users.push(user);
		}
	}

	async vacateSpace(connection){
		await models.Space.removeAllUsers(connection, this.id);
		this.status = 'VACANT';
		await this.save(connection)
	}

	async removeUserFromSpace(connection, user_id, gate_vendor_id) {
		await models.Space.removeUser(connection, user_id, this.id);

		let space_users = await models.Space.getUsersWithAccess(connection, this.id);
		if(!space_users){
			this.status = 'VACANT';
			await this.save(connection);
		}
	}

	async getArea(connection){

		if(!this.access_area_id) return;
		this.Area = new AreaService({id: this.access_area_id});

		await this.Area.find(connection); 
	}



	static  async findAllSpaces(connection){
		return await models.Space.findAllSpaces(connection);
	}



}

module.exports = Space;

const AreaService = require('./areaService');
const UserService = require('./userService');