"use strict";
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');


class Group {

	constructor(group = {}){

		this.id = group.id;
		this.create(group);

		this.Areas = [];
		this.Times = [];

	}

	async find(connection, activeOnly=true){

		if(!this.id) e.th(400, "Missing ID");

		let group =  await models.Group.findById(connection, this.id, activeOnly);

		if(!group) e.th(404);

		this.create(group);

	}

	async findAreas(connection){

		if(!this.id) e.th(400, "Missing ID");
		let areas = await models.Group.findAreasByGroupId(connection, this.id);
		for(let i = 0; i < areas.length; i++){
			let a = new AreaService(areas[i]);
			await a.find(connection);
			this.Areas.push(a);
		}

	}

	async findTimes(connection){

		if(!this.id) e.th(400, "Missing ID");
		this.Times = await models.Group.findTimesByGroupId(connection, this.id);


	}



	create(group){

		this.name = group.name;
		// this.external_id = group.external_id;
		this.facility_id = group.facility_id || this.facility_id;
		this.active = group.active;

	}


	addHours(times){
		this.Times.push(times);
	}

	async addAreas(connection, areas){


		for(let i=0; i < areas.length; i++){
			let area = new AreaService({id: areas[i]});
			await area.find(connection);
			area.verifyAccess(this.facility_id);
			this.Areas.push(areas[i]);
		}


	}


	async save(connection){


		//TODO Validate name is unique, external id is unique if not null
		//TODO maybe have an active flag and a deleted flag..

		const data = {
			name: this.name,
			// external_id: this.external_id,
			facility_id: this.facility_id,
			active: this.active,
		};

		let result = await models.Group.save(connection,data, this.id );

		if(!this.id){
			this.id = result.insertId;
		}
		console.log("this.Times", this.Times)
		if(this.Times.length){
			for(let i=0;i< this.Times.length;i++){
				let result = await this.saveTime(connection, this.Times[i]);
				if(!this.Times[i].id){
					this.Times[i].id = result.insertId;
				}
			}
		}

		if(this.Areas.length){
			for(let i=0;i< this.Times.length;i++){
				let result = await this.saveArea(connection, this.Areas[i]);
				if(!this.Times[i].id){
					this.Times[i].id = result.insertId;
				}
			}
		}

	}

	async getTimes(connection){

	}

	async getAreas(connection){
		let areas = models.Group.findAreasByGroupId(connection, this.id)


		let area = new AreaService({id: areas[i]});
		await area.find(connection);
	}

	async saveTime(connection, time){
		let data = {
			user_group_id: this.id,
			start: time.start,
			end: time.end
		};
		return  await models.Group.saveTime(connection, data, time.id );

	}

	async saveArea(connection, area){
		let data = {
			user_group_id: this.id,
			access_area_id: area
		};
		return  await models.Group.saveArea(connection, data, area.id );

	}

	async delete(connection){
		return await models.Group.delete(connection, this.id )
	}

	verifyAccess(facility_id){

		if(this.facility_id == facility_id) return;
		e.th(403, "Access Denied");
	}

	static  async findAllGroups(connection){
		return await models.Group.findAllGroups(connection);
	}



}

module.exports = Group;


const AreaService = require('./areaService');