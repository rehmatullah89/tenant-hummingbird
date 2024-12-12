"use strict"
const models = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');
const request = require('request-promise');

class Facility {

	constructor(facility = {}) {

		// this.id = facility.id;
		// this.name = facility.name;
		// this.company_id = facility.company_id;
		// this.facility_id = facility.facility_id;
		// this.description = facility.description;
		// this.address = facility.address;
		// this.address2 = facility.address2;
		// this.city = facility.city;
		// this.state = facility.state;
		// this.zip = facility.zip;
		// this.lat = facility.lat;
		// this.lng = facility.lng;

		this.create(facility);

		this.Users = [];
		this.GateVendor = [];
		this.GateConnection = {};
		this.Credentials = {};
		this.Spaces = [];


	}

	async find(connection) {

		if (!this.id && !this.facility_id) e.th(500, "Missing ID");

		let facility = {};

		if (this.id) {
			facility = await models.Facility.findById(connection, this.id);
		} else if (this.facility_id) {
			facility = await models.Facility.findByFacilityId(connection, this.facility_id, this.company_id, true);
		}

		if (!facility) e.th(404, "The property doesn’t have access control configure");

		this.create(facility);

	}

	create(facility) {

		this.id = facility.id || this.id;
		this.name = facility.name;
		this.company_id = facility.company_id || this.company_id;
		this.facility_id = facility.facility_id;
		this.external_id = facility.external_id;
		this.gate_vendor_id = facility.gate_vendor_id;
		this.gate_vendor_name = facility.gate_vendor_name;
		this.description = facility.description;
		this.address = facility.address;
		this.address2 = facility.address2;
		this.city = facility.city;
		this.state = facility.state;
		this.zip = facility.zip;
		this.lat = facility.lat;
		this.lng = facility.lng;
		this.active = 1;
		this.created_by = facility.created_by || null;
		this.created_at = facility.created_at || null;
		this.modified_by = facility.modified_by || null;
		this.modified_at = facility.modified_at || null;
	}

	update(data) {
		if (typeof data.name !== 'undefined') this.name = data.name || '';
		if (typeof data.gate_vendor_id !== 'undefined') this.gate_vendor_id = data.gate_vendor_id;
		if (typeof data.gate_vendor_name !== 'undefined') this.gate_vendor_name = data.gate_vendor_name || '';
		if (typeof data.description !== 'undefined') this.description = data.description || '';
		if (typeof data.address !== 'undefined') this.address = data.address || '';
		if (typeof data.address2 !== 'undefined') this.address2 = data.address2 || '';
		if (typeof data.city !== 'undefined') this.city = data.city || '';
		if (typeof data.state !== 'undefined') this.state = data.state || '';
		if (typeof data.zip !== 'undefined') this.zip = data.zip || '';
		if (typeof data.lat !== 'undefined') this.lat = data.lat || '';
		if (typeof data.lng !== 'undefined') this.lng = data.lng || '';
		if (typeof data.active !== 'undefined') this.active = data.active || 1;
	}

	async save(connection) {
		const data = {
			name: this.name,
			facility_id: this.facility_id,
			external_id: this.external_id,
			company_id: this.company_id,
			gate_vendor_id: this.gate_vendor_id,
			description: this.description,
			address: this.address,
			address2: this.address2,
			city: this.city,
			state: this.state,
			zip: this.zip,
			lat: this.lat,
			lng: this.lng,
			active: this.active,
			created_by: this.created_by,
			created_at: this.created_at,
			modified_by: this.modified_by,
			modified_at: this.modified_at
		}

		if (!this.id) {
			let facility = await models.Facility.findByFacilityId(connection, this.facility_id, this.company_id);
			this.id = facility && facility.id;
		}

		let result = await models.Facility.save(connection, data, this.id)

		if (!this.id) {
			this.id = result.insertId;
		}

	}

	async delete(connection) {
		await models.Facility.delete(connection, this.id, this.modified_by, this.modified_at);
		await models.Facility.deleteCredentialsFacility(connection, this.id);
	}

	async getCredentials(connection) {
		if (!this.id || !this.gate_vendor_id) throw new Error("Missing parameters");

		let creds = await models.Facility.getCredentials(connection, this.id, this.gate_vendor_id);
		for (let i = 0; i < creds.length; i++) {
			this.Credentials[creds[i].name] = creds[i].value;
		}
	}

	verifyAccess(company_id) {
		if (this.company_id === company_id) return;
		e.th(403, "Access Denied");
	}

	async getGateVendor(connection) {
		this.GateConnection = await AccessControl.getGateService(connection, this.gate_vendor_id, this.id);
		await this.GateConnection.getCredentials(connection);
		this.GateConnection.connected = true;
	}

	async testGateConnection() {
		if (!this.GateConnection) return;
		this.GateConnection.connected = await this.GateConnection.testConnection();
	}


	async getSpaces(connection, modified) {

		if (!this.facility_id) e.th(500, "Facility id not set");

		let spaces = await models.Space.findByFacilityId(connection, this.id, modified);
		console.log(spaces);

		for (let i = 0; i < spaces.length; i++) {
			let space = new SpaceService(spaces[i]);
			await space.find(connection);
			this.Spaces.push(space);
		}

		console.log(this.Spaces);

	}

	static async findAllFacilities(connection, comapny_id) {
		let facility_res = await models.Facility.findAllFacilities(connection, comapny_id);

		let facilities = [];

		for (let i = 0; i < facility_res.length; i++) {
			let facility = new Facility(facility_res[i]);
			await facility.getGateVendor(connection);
			facilities.push(facility)
		}

		return facilities;

	}

	async findUsers(connection) {

		let user_res = await models.User.findUsersAtFacility(connection, this.id);

		for (let i = 0; i < user_res.length; user_res++) {
			let user = new UserService(user_res[i]);
			await user.find(connection);
			await user.getGates(connection, this.id);
			await user.getTimes(connection, this.id);
			await user.getSpaces(connection, this.id);
			await user.getGroup(connection);
			this.Users.push(user)
		}
	}

	async sendResults(body) {

		body = body || { text: "hello world" }
		console.log(body);
		let result = await request({
			headers: {
				'Content-type': 'application/json',
			},
			json: {
				text: JSON.stringify(body)
			},
			uri: 'https://hooks.slack.com/services/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',
			method: 'POST'
		});

		console.log(result);
		return;

	}

	async getGateConnection(connection) {


	}

}

module.exports = Facility;

const UserService = require('./userService');
const SpaceService = require('./spaceService');
const PTICore = require('../modules/access_control/pti_core');
const OpenTech = require('../modules/access_control/open_tech_cia');
const Noke = require('../modules/access_control/noke');
const FlatFile = require('../modules/access_control/flat_file');
const PTI = require('../modules/access_control/pti');
const DoorKing = require('../modules/access_control/doorking');
const PDK = require('../modules/access_control/pdk');
const SpiderDoor = require('../modules/access_control/spiderdoor');

const AccessControl = require(__dirname + '/../modules/access_control/access_control.js');