"use strict";
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');


class Area {

	constructor(area = {}){

		this.id = area.id;
		this.create(area);

		this.Gates = [];

	}

	async find(connection, activeOnly=true){

		if(!this.id) e.th(400, "Missing ID");


		let area =  await models.Area.findById(connection, this.id, activeOnly);
		if(!area) e.th(404);

		this.create(area);

	}

	create(area){

		this.name = area.name;
		// this.external_id = area.external_id;
		this.facility_id = area.facility_id || this.facility_id;
		this.active = area.active;

	}


	async save(connection){


		//TODO Validate name is unique, external id is unique if not null
		//TODO maybe have an active flag and a deleted flag..

		const data = {
			name: this.name,
			// external_id: this.external_id,
			facility_id: this.facility_id,
			active: this.active
		};

		let result = await models.Area.save(connection,data, this.id );

		if(!this.id){
			this.id = result.insertId;
		}

	}

	async delete(connection){
		return await models.Area.delete(connection, this.id )
	}

	async getGates(connection){

		this.Gates =  await models.Gate.findByAreaId(connection, this.id )
		console.log(this.Gates);
	}

	verifyAccess(facility_id){

		if(this.facility_id == facility_id) return;
		e.th(403, "Access Denied");
	}

	static  async findAllAreas(connection){
		return await models.Area.findAllAreas(connection);
	}



}

module.exports = Area;