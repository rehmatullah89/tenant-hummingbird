"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '//../../modules/error_handler.js');


class AccessControl {

	constructor(facility_id, gate_vendor_id, name) {
		this.facility_id = facility_id;
		this.gate_vendor_id = gate_vendor_id;

		this.id = '';
		this.name = name;
		this.logo = '';

		this.Credentials = {};
		this.Groups = {};
		this.Users = {};
	}

	initial_load() {
		console.log("Nothing Overridden: Initial Load")
		return false
	}

	move_in() {
		console.log("Nothing Overridden: Move In")
		return false
	}

	move_out() {
		console.log("Nothing Overridden: Move Out")
		return false
	}

	update() {
		console.log("Nothing Overridden: Update")
		return false
	}

	testConnection() {
		console.log("Nothing Overridden: testConnection");
		return true;
	}

	verifyCredentials() {
		console.log("Nothing Overridden: verifyCredentials");
		return false;
	}

	add_user_to_unit() {
		console.log("Nothing Overridden: Add user to unit")
		return false
	}

	update_user_to_unit() {
		console.log("Nothing Overridden: Update user to unit")
		return false
	}

	remove_user_from_unit() {
		console.log("Nothing Overridden: Remove user from unit")
		return false
	}

	suspend() {
		console.log("Nothing Overridden: Suspend")
		return false
	}

	unsuspend() {
		console.log("Nothing Overridden: Unsusupend")
		return false
	}

	overlock() {
		console.log("Nothing Overridden: overlock")
		return false
	}
	removeOverlock() {
		console.log("Nothing Overridden: removeOverlock")
		return false
	}
	// //#region Units

	create_unit() {
		console.log("Nothing Overridden: Creat Unit")
		return false
	}

	get_units() {
		console.log("Nothing Overridden: Get Units")
		return false
	}

	get_unit() {
		console.log("Nothing Overridden: Get Unit")
		return false
	}

	get_unit_overlocks() {
		console.log("Nothing Overridden: Get Unit overlock")
		return false
	}

	get_unit_users() {
		console.log("Nothing Overridden: Get unit users")
		return false
	}

	// //#endregion

	// //#region Users

	add_user() {
		console.log("Nothing Overridden: Add User")
		return false
	}

	update_user() {
		console.log("Nothing Overridden: Update User")
		return false
	}

	add_user_to_group() {
		console.log("Nothing Overridden: Add user to group")
		return false
	}

	remove_user_from_group() {
		console.log("Nothing Overridden: Remove user from group")
		return false
	}
	get_users() {
		console.log("Nothing Overridden: Get users")
		return false
	}

	get_user() {
		console.log("Nothing Overridden: Get user")
		return false
	}

	get_user_group() {
		console.log("Nothing Overridden: Get User group")
		return false
	}

	remove_access() {
		console.log("Nothing Overridden: Remove access from user")
		return false
	}

	// //#endregion

	////#region Facility

	get_facility() {
		console.log("Nothing Overridden: Get Facility")
		return false
	}

	get_facilities() {
		console.log("Nothing Overridden: Get Facilities")
		return false
	}

	////#endregion



	sync() {
		console.log("Nothing Overridden: Sync")
		return false
	}

	////#region Group

	get_group() {
		console.log("Nothing Overridden: Get Group")
		return false
	}

	get_groups() {
		console.log("Nothing Overridden: Get Groups")
		return false
	}

	create_group() {
		console.log("Nothing Overridden: Create Group")
		return false
	}

	add_group() {
		console.log("Nothing Overridden: Add Group")
		return false
	}

	////#endregion

	async generateCode(connection) {
		let validCode = false;
		var count = 0;
		var triesLimit = 10;
		var code = "";

		while (!validCode) {
			if (count > triesLimit) {
				e.th(500, "Cannot generate gate access code")
			}
			count++;

			code = this.makeNewCode();
			try {
				await this.validateCode(connection, code);
				validCode = true;
			} catch (err) {
				console.log("Error: ", err);
			}
		}

		return code;
	}

	makeNewCode() {
		var pinLength = 6;
		var text = "";
		var possible0 = "123456789";
		var possible = "0123456789";

		switch (this.gate_vendor_id) {
			//Default && RCS
			case 0:
				pinLength = 6;
				break;

			//PTI
			case 6:
				pinLength = 4;
				break;
			
			//PTI Cloud
			case 2:
				pinLength = 4;
				break;
			
			//PDK
			case 10:
				pinLength = 4;
				break;

			default:
				pinLength = 6
				break;
			
			
		}

		if (typeof this.Credentials !== 'undefined' && this.Credentials.pin_format) {
			pinLength = this.Credentials.pin_format;
		}
		// limit code to not start with 0
		for (var i = 0; i < pinLength; i++) {
			if (i === 0) {
				text += possible0.charAt(Math.floor(Math.random() * possible0.length));
			} else {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
		}
		return text;
	}

	async validateCode(connection, code, user_id) {
		if (!code) e.th(400, "No code to be validated.");

		let existing = await models.User.findUserByCode(connection, this.facility_id, code);
		if (existing) {
			if(user_id && parseInt(existing.user_id) === user_id){
				return;
			}
			e.th(409, "This code is already in use by another user");
		}
	}

	async validateSpaceCode(connection, code, space_number, space_id) {
		if (!code) e.th(400, "No code to be validated.");
		if (!space_number) e.th(400, "No space number to be validated.");

		//check if the code is 4 digits
		if (!/^\d{4}$/.test(code)) {
			e.th(409, "Code must be 4 digits length exactly");
		}
		if(space_number.length > 4 ) e.th(409, "Space number can not be more than 4 digits");
		//if (!/^\d+$/.test(space_number)) e.th(409, "Space number sould be digits only");
		//check if the code is not consecutive or repeating
		else if (/^(\d)\1{3}|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321$/.test(code)) {
			e.th(409, "Code cannot be consecutive or repeating digits");
		}


		const numString = space_number.toString();
		const leadingZeros = "0000";
		space_number = leadingZeros.substring(0, leadingZeros.length - numString.length) + numString;
		
		return space_number + code;
	}

	//Generate Random Code for Derrel non consecutive & non repeating
	async generateSpaceCode(connection, unit_id, unit_number) {
		let validCode = false;
		let count = 0;
		let triesLimit = 10;
		let nonConsecutiveNonRepeatingNumber;

		if(unit_number.length > 4 ) e.th(409, "Unit number can not be more than 4 digits");
		
		while(!validCode){
			if (count > triesLimit) {
				e.th(500, "Cannot generate gate access code")
			}
			count++;

			//generate code
			const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			for (let i = digits.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[digits[i], digits[j]] = [digits[j], digits[i]];
			}
			nonConsecutiveNonRepeatingNumber = digits.slice(0, 4).join("");
		
			for (let i = 0; i < nonConsecutiveNonRepeatingNumber.length - 1; i++) {
			const currentDigit = nonConsecutiveNonRepeatingNumber[i];
			const nextDigit = nonConsecutiveNonRepeatingNumber[i + 1];
		
			if (currentDigit === nextDigit || currentDigit + 1 === nextDigit || currentDigit - 1 === nextDigit) {
				return generateSpecialCode();
			}
			}

			//validate the generated code
			try {
				await this.validateSpaceCode(connection, nonConsecutiveNonRepeatingNumber, unit_number, unit_id);
				validCode = true;
			} catch (err) {
				console.log("Error: ", err);
			}
		}
		
		//represent unit number in 4 digits
		let unitNumber;
		if(unit_number){
			const numString = unit_number.toString();
			const leadingZeros = "0000";
			unitNumber = leadingZeros.substring(0, leadingZeros.length - numString.length) + numString;
		}
		
		return unitNumber? unitNumber + nonConsecutiveNonRepeatingNumber : nonConsecutiveNonRepeatingNumber;
	}

	async getCredentials(connection) {
		let creds = await models.Credentials.findFacilityCreds(connection, this.facility_id, this.gate_vendor_id);
		for (let i = 0; i < creds.length; i++) {
			this.Credentials[creds[i].name] = creds[i].value;
		}
	}

	setCredentials(creds) {
		console.log('Creds', creds);
		if (creds) {
			for (const [key, value] of Object.entries(creds)) {
				this.Credentials[key] = value;
			}
		}
	}

	async saveCredentials(connection) {

		let data = await models.Credentials.findFacilityCreds(connection, this.facility_id, this.gate_vendor_id);

		for (let cred in this.Credentials) {
			let param = data.find(d => d.name === cred);

			let save = {
				facility_id: this.facility_id,
				gate_vendor_id: this.gate_vendor_id,
				name: cred,
				value: this.Credentials[cred]
			}
			await models.Credentials.saveCredentials(connection, save, param ? param.id : null);
		}
	}

	static async getGateService(connection, gate_vendor_id, facility_id) {

		let gate = await models.GateVendor.findById(connection, gate_vendor_id);
		if (!gate) e.th(500, "Gate Not Found");

		let accessControl = {};
		switch (gate.id) {
			case 1:
				accessControl = new Brivo(facility_id);
				break;
			case 2:
				accessControl = new PtiCloud(facility_id);
				break;
			case 3:
				accessControl = new FlatFile(facility_id);
				break;
			case 4:
				accessControl = new OpenTech(facility_id);
				break;
			case 5:
				accessControl = new Noke(facility_id);
				break;
			case 6:
				accessControl = new PTI(facility_id);
				break;
			case 9:
				accessControl = new DoorKing(facility_id);
				break;
			case 10:
				accessControl = new PDK(facility_id);
				break;
			case 11:
				accessControl = new SpiderDoor(facility_id);
				break;
			case 12:
				accessControl = new Derrels(facility_id);
				break;
			default:
				accessControl = new AccessControl(facility_id, 0)

		}
		return accessControl;

	}

}

module.exports = AccessControl;

const PTICore = require(__dirname + '/pti_core');
const FlatFile = require(__dirname + '/flat_file');
const PtiCloud = require(__dirname + '/pti_cloud');
const Brivo = require(__dirname + '/brivo');
const Noke = require(__dirname + '/noke');
const OpenTech = require(__dirname + '/open_tech_cia');
const PTI = require(__dirname + '/pti');
const DoorKing = require(__dirname + '/doorking');
const PDK = require(__dirname + '/pdk');
const SpiderDoor = require(__dirname + '/spiderdoor');
const Derrels = require(__dirname + '/derrels');