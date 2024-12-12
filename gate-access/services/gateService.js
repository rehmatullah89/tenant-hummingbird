"use strict";
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');


class Gate {

	constructor(gate = {}){

		this.id = gate.id;
		this.create(gate);

	}

	async find(connection, activeOnly=true){

		if(!this.id) e.th(400, "Missing ID");

		let gate =  await models.Gate.findById(connection, this.id, activeOnly);

		if(!gate) e.th(404);

		this.create(gate);

	}

	create(gate){

		this.name = gate.name;
		// this.external_id = gate.external_id;
		this.area_id = gate.area_id;
		this.facility_id = gate.facility_id || this.facility_id;
		this.active = gate.active;

	}


	async save(connection){


		//TODO Validate name is unique, external id is unique if not null
		//TODO maybe have an active flag and a deleted flag..

		const data = {
			name: this.name,
			// external_id: this.external_id,
			facility_id: this.facility_id,
			area_id: this.area_id,
			active: this.active,
		};

		let result = await models.Gate.save(connection,data, this.id );

		if(!this.id){
			this.id = result.insertId;
		}

	}

	async delete(connection){
		return await models.Gate.delete(connection, this.id )
	}

	verifyAccess(facility_id){

		if(this.facility_id == facility_id) return;
		e.th(403, "Access Denied");
	}

	static  async findAllGates(connection){
		return await models.Gate.findAllGates(connection);
	}

	static  async findAllGateVendors(connection){
		return await models.GateVendor.findAll(connection);
	}

}

module.exports = Gate;