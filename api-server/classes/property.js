"use strict";

var models = require(__dirname + '/../models');

var Promise = require('bluebird');
var validator = require('validator');

var validation = require(__dirname + '/../modules/validation.js');
var Utils = require(__dirname + '/../modules/utils.js');
var moment = require('moment');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Enums = require(__dirname + '/../modules/enums.js');
var request = require('request-promise');
var e = require(__dirname + '/../modules/error_handler.js');

const GDS_FILE_APP_TOKEN_URI = process.env.GDS_FILE_APP_TOKEN_URI
const GDS_FILE_APP_ID = process.env.GDS_FILE_APP_ID
const GDS_API_KEY = process.env.GDS_API_KEY

class Property {

	constructor(data) {

		data = data || {};
		this.ids = data.ids || [];
		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.address_id = data.address_id || null;
		this.number = data.number || null;
		this.description = data.description || null;
		this.status = data.status || null;
		this.name = data.name || null;
		this.legal_name = data.legal_name || null;
		this.access_id = data.access_id || 0;
		this.msg = '';
		this.map_published_at = data.map_published_at || null;
		this.map_published_by = data.map_published_by || null;

		this.gds_id = data.gds_id || '';
		this.utc_offset = data.utc_offset || null;
		this.unit_count = '';
		this.lease_count = '';
		this.unitCount = '';
		this.occupancy = ''
		this.is_day_closed = data.is_day_closed || false,
			this.localCurrentDate = null,

			this.Assets = [];
		this.Phones = data.Phones || [];
		this.Emails = data.Emails || [];
		this.Units = [];
		this.Hours = [];
		this.Access = null;
		this.Address = {};
		this.Images = [];
		this.Application = [];
		this.ApplicationConfig = {};
		this.Checklist = [];
		this.Connections = [];
		this.Triggers = [];
		this.MaintenanceTypes = [];
		this.MaintenanceExtras = [];
		this.Insurances = [];
		this.Products = [];
		this.TaxRates = [];
		this.Promotions = [];
		this.Mailhouses = [];
		this.PropertyAccountingTemplate = {};

		this.LeaseTemplates = {
			"storage": {},
			"residential": {},
			"commercial": {}
		};
	}

	// this should just be combined with the find call, we dont need a separate function for this.
	async getUtcOffset(connection) {

		let property = await models.Property.findById(connection, this.id);
		return await this.cleanUtcOffset(property.utc_offset);
	}
	// Use this method to clean offset values until getUtcOffset is combined with find call
	async cleanUtcOffset(offsetValue) {
		return offsetValue || "+00:00";
	}

	async getLocalCurrentDate(connection, format = 'YYYY-MM-DD') {
		let off_set = await this.getUtcOffset(connection);
		console.log("Property Offset: ", off_set);
		console.log("Property Moment Current DateTime: ", moment().format('YYYY-MM-DD h:mm:ss'));
		console.log("Property Local Current DateTime: ", moment().utcOffset(parseInt(off_set)).format('YYYY-MM-DD h:mm:ss'));
		this.localCurrentDate = moment().utcOffset(parseInt(off_set)).format(format)
		console.log("Property Local Current Date: ", this.localCurrentDate);
		return this.localCurrentDate;
	}

	async getUTCTime(connection, date, format = 'YYYY-MM-DD hh:mm:ss'){
		let off_set = await this.getUtcOffset(connection);
		return moment(date, 'YYYY-MM-DD').utcOffset(parseInt(off_set) * -1).format(format);
	}


	async find(connection, params = {}) {
		const { should_find_address = true, should_find_accounting_template = false } = params;

		let property = {}
		if (!this.id && !this.name && !this.gds_id) {
			e.th(500, 'Property id not set');
		}

		if (this.id) {
			console.log('PropertyID in property class: ' + this.id);
			property = await models.Property.findById(connection, this.id);
		} else if (this.name) {
			property = await models.Property.findByName(connection, this.name);
		} else if (this.gds_id) {
			property = await models.Property.findByGdsID(connection, this.gds_id);
			if (!property) e.th(404, `Cannot find property with gds_id = ${this.gds_id}`);
			console.log("findByGdsID", property)
		}

		if (!property) e.th(404, "Property not found.");

		if (this.company_id && property.company_id !== this.company_id) {
			e.th(401, "You are not authorized to view this resource");
		}

		this.id = property.id;
		this.gds_id = property.gds_id;
		this.utc_offset = await this.cleanUtcOffset(property.utc_offset);
		this.company_id = property.company_id;
		this.address_id = property.address_id;
		this.number = property.number;
		this.description = property.description;
		this.status = property.status;
		this.name = property.name;
		this.legal_name = property.legal_name;
		this.access_id = property.access_id || 0;
		this.map_published_at = property.map_published_at ? moment(property.map_published_at).utcOffset(this.utc_offset) : null;
		this.map_published_by = property.map_published_by;

		if (should_find_address) {
			await this.getAddress(connection);
		}
		if(should_find_accounting_template){
			this.findAccountingTemplate(connection);
		}
	}

	async updateData(connection, params) {
		if (!this.id) e.th(500, "property id is required to update data");

		let updatedProperty = {};
		for (let p in params) {
			updatedProperty[p] = params[p];
			this[p] = params[p];
		}

		await models.Property.save(connection, updatedProperty, this.id);
	}

	async getGDSId(connection) {
		if (this.gds_id) return gds_id;

		await this.find(connection, {
			should_find_address: false
		});

		if (!this.gds_id) {
			const data = await gdsTranslate.getGDSMappingIds([{
				"facility": Hashes.encode(this.id, connection.cid),
				"pmstype": "leasecaptain"
			}]);

			await this.updateData(connection, { gds_id: data?.facility?.gdsid });
		}

		if (!this.gds_id) {
			e.th(500, `Cannot find property. Make sure property is onboarded`);
		}

		return this.gds_id;
	}

	async findNonHbProperty(connection) {

		let property = {}
		if (!this.id && !this.name && !this.gds_id) {
			e.th(500, 'Property id not set');
		}

		if (this.id) {
			property = await models.Property.findNonHbPropertyById(connection, this.id);
		} else if (this.name) {
			property = await models.Property.findNonHbPropertyByName(connection, this.name);
		} else if (this.gds_id) {
			property = await models.Property.findByNonHbPropertyByGdsID(connection, this.gds_id);
			console.log("findByGdsID", property)
		}

		if (!property) e.th(404, "Property not found.");

		if (this.company_id && property.company_id !== this.company_id) {
			e.th(401, "You are not authorized to view this resource");
		}

		this.id = property.id;
		this.gds_id = property.gds_id;
		this.utc_offset = await this.cleanUtcOffset(property.utc_offset);
		this.company_id = property.company_id;
		this.address_id = property.address_id;
		this.number = property.number;
		this.description = property.description;
		this.status = property.status;
		this.name = property.name;
		this.legal_name = property.legal_name;
		this.access_id = property.access_id || 0;
		await this.getAddress(connection)

	}

	async findAutoPaymentMethods(connection, date) {
		return await models.Property.findAutoPaymentMethods(connection, this.id, date)
	}

	async getPhones(connection) {
		let phones = await models.Property.findPhones(connection, this.id);
		this.Phones = phones.map(phone => {
			phone.phone = phone.phone ? phone.phone.toString() : '';
			phone.type = Utils.capitalizeAll(phone.type);
			return phone;
		})
	}

	async getEmails(connection) {
		let emails = await models.Property.findEmails(connection, this.id);
		this.Emails = emails.map(email => {
			email.type = Utils.capitalizeAll(email.type);
			return email;
		});
	}

	async getAddress(connection) {
		let address = await models.Address.findById(connection, this.address_id);
		this.Address = address;
	}

	save(connection) {
		var _this = this;
		return Promise.resolve().then(function () {
			return _this.validate(connection);
		}).then(function () {
			var save = {
				company_id: _this.company_id,
				address_id: _this.address_id,
				number: _this.number,
				gds_id: _this.gds_id,
				description: _this.description,
				phone: _this.phone,
				email: _this.email,
				status: _this.status,
				name: _this.name,
				legal_name: _this.legal_name || null,
				access_id: _this.access_id || 0,
				map_published_at: _this.map_published_at || null,
				map_published_by: _this.map_published_by || null
			};
			return models.Property.save(connection, save, _this.id).then(function (result) {
				if (result) _this.id = result;
				return true;
			});
		}).then(function () {

			_this.Phones = _this.Phones || [];
			var phone_ids = _this.Phones.filter(p => p.id).map(p => p.id).join(',');


			return models.Property.removePhones(connection, _this.id, phone_ids.replace(/,\s*$/, "")).then(() => {
				return _this.Phones.map(p => {
					if (!p.phone) return;
					var phoneSave = {
						property_id: _this.id,
						type: p.type.toLowerCase() || 'office',
						phone: p.phone.toString().replace(/\D+/g, '')
					}

					return models.Property.savePhone(connection, phoneSave, p.id)
				})
			})

		}).then(function () {

			_this.Emails = _this.Emails || [];
			var email_ids = _this.Emails.filter(e => e.id).map(e => e.id).join(',');

			return models.Property.removeEmails(connection, _this.id, email_ids.replace(/,\s*$/, "")).then(() => {
				return _this.Emails.map(e => {
					if (!e.email) return;
					var emailSave = {
						property_id: _this.id,
						type: e.type.toLowerCase() || 'office',
						email: e.email
					}

					return models.Property.saveEmail(connection, emailSave, e.id)
				})
			})


		}).catch(function (err) {
			console.log(_this.msg);
			throw err;
		})

	}

	saveNonHbProperty(connection, body) {
		let _this = this;
		return Promise.resolve().then(function () {
			return _this.validate(connection);
		}).then(function () {
			let save = {
				company_id: _this.company_id,
				address_id: _this.address_id,
				number: _this.number,
				description: _this.description,
				phone: body.phone,
				email: body.email,
				gds_id: _this.gds_id,
				status: _this.status,
				name: _this.name,
				legal_name: _this.legal_name,
				access_id: _this.access_id || 0
			};

			return models.Property.saveNonHbProperty(connection, save, _this.id).then(function (result) {
				if (result) _this.id = result;
				return true;
			});
			// }).then(function() {

			// 	_this.Phones = _this.Phones || [];
			// 	var phone_ids = _this.Phones.filter(p => p.id).map(p => p.id).join(',');


			// 	return models.Property.removePhones(connection, _this.id, phone_ids.replace(/,\s*$/, "")).then(() => {
			// 		return _this.Phones.map(p => {
			// 			if(!p.phone) return;
			// 			var phoneSave= {
			// 				property_id: _this.id,
			// 				type: p.type.toLowerCase() || 'office',
			// 				phone: p.phone.toString().replace(/\D+/g, '')
			// 			}

			// 			return models.Property.savePhone(connection, phoneSave, p.id)
			// 		})
			// 	})

			// }).then(function() {

			// 	_this.Emails = _this.Emails || [];
			// 	var email_ids = _this.Emails.filter(e => e.id).map(e => e.id).join(',');

			// 	return models.Property.removeEmails(connection, _this.id, email_ids.replace(/,\s*$/, "")).then(() => {
			// 		return _this.Emails.map(e => {
			// 			if(!e.email) return;
			// 			var emailSave= {
			// 				property_id: _this.id,
			// 				type: e.type.toLowerCase() || 'office',
			// 				email: e.email
			// 			}

			// 			return models.Property.saveEmail(connection, emailSave, e.id)
			// 		})
			// 	})


		}).catch(function (err) {
			console.log(_this.msg);
			throw err;
		})

	}



	async saveHours(connection, data) {
		if (!this.id) e.th(500, "Property id not set");
		data.property_id = this.id;
		data.id = await models.Hours.save(connection, data, data.id)

		return data;

	}

	updateHours(existing, data) {

		if (!existing) e.th(404);

		existing.start_hr = data.start_hr;
		existing.start_min = data.start_min;
		existing.start_ap = data.start_ap;

		existing.end_hr = data.end_hr;
		existing.end_min = data.end_min;
		existing.end_ap = data.end_ap;

		existing.first_day = data.first_day;
		existing.last_day = data.last_day;

		return existing;

	}

	async deleteHours(connection, hours_id) {
		return await models.Hours.delete(connection, hours_id)
	}

	async saveEmail(connection, data) {
		if (!validation.validateEmail(data.email)) e.th(400, "Invalid Email");
		var data = {
			property_id: this.id,
			type: data.type,
			email: data.email,
			sort: this.Emails.length,
			status: 1
		}

		data.id = await models.Property.saveEmail(connection, data);
		return data;

	}

	async savePhone(connection, data) {
		if (!validation.validatePhone(data.number)) e.th(400, "Invalid Phone");

		var data = {
			property_id: this.id,
			type: data.type,
			phone: data.number.replace(/\D/g, ''),
			sort: this.Phones.length,
			status: 1
		}

		data.id = await models.Property.savePhone(connection, data);
		return data;

	}

	async deleteEmail(connection, email_id) {


		if (!this.id) e.th(500, "Property id not set");
		let email = this.Emails.find(e => e.id == email_id);

		if (!email) e.th(404);
		await models.Property.deleteEmail(connection, this.id, email_id)
		return email;

	}

	async deletePhone(connection, phone_id) {


		if (!this.id) e.th(500, "Property id not set");
		let phone = this.Phones.find(e => e.id == phone_id);

		if (!phone) e.th(404);
		await models.Property.deletePhone(connection, this.id, phone_id)
		return phone;

	}


	update(data) {

		if(typeof data.address_id != 'undefined') this.address_id = data.address_id;
		if(typeof data.number != 'undefined') this.number = data.number;
		if(typeof data.description != 'undefined') this.description = data.description;
		if(typeof data.name != 'undefined') this.name = data.name;
		if(typeof data.legal_name != 'undefined') this.legal_name = data.legal_name;
		if(typeof data.status != 'undefined') this.status = data.status;
		if(typeof data.Phones != 'undefined') this.Phones = data.Phones;
		if(typeof data.Emails != 'undefined') this.Emails = data.Emails;
		if(typeof data.map_published_at != 'undefined') this.map_published_at = data.map_published_at;
		if(typeof data.map_published_by != 'undefined') this.map_published_by = data.map_published_by;
		if (typeof data.gds_id != 'undefined') this.gds_id = data.gds_id;
	}

	getImages(connection) {

		return models.Document.findDocumentTypeByName(connection, 'image', this.company_id)
			.then(dt => {
				if (!dt) return [];
				return models.Upload.findByEntity(connection, 'property', this.id, dt.id)
			})
			.mapSeries(file => {
				var upload = new Upload({ id: file.upload_id });
				return upload.find(connection).then(() => upload);
			}).then(files => {
				this.Images = files;
				return;
			})
	}

	validate(connection) {
		var errors = [];
		var _this = this;

		return Promise.resolve().then(function () {
			if (!_this.company_id) throw new Error("Company Id Not Set");
			if (!_this.address_id) throw new Error("Address Not Set");
		});
	}

	findApplication(connection) {

		var _this = this;
		if (!this.id) throw new Error("Property Id Not Set");

		return models.Property.findApplicationConfig(connection, this.id).then(fields => {
			_this.Application = fields;



			return true;
		})

	}

	async getConcisePropertyUnits(connection, params) {
		if (!this.id) throw "Property id not set.";

		let unitsMap = {};
		let unitIds = [];
		let result = []

		params = params || {};
		params.order = "u.number ASC";

		let units = await models.Unit.getConciseUnitsData(connection, {
			...params,
			property_id: this.id
		});
		units.forEach((unit) => {
			unitsMap[unit.id] = { ...unit, 'Amenities': [] }
			unitIds.push(unit.id)
		})

		let unitAmenities = await models.Unit.getConciseUnitAmenities(connection, unitIds)
		for (let unitAmenity of unitAmenities) {
			unitsMap[unitAmenity.unit_id]['Amenities'].push(unitAmenity)
		}
		
		for (let unit of units) {
			result.push(unitsMap[unit.id])
		}
		return result
	}
	
	getUnits(connection, api, params){

		var unit = {};
		if (!this.id) throw "Property id not set.";
		params = params || {};
		params.conditions = params.conditions || {};
		params.conditions.property_id = this.id;

		params.order = "number ASC";
		return models.Unit.find(connection, params).mapSeries(unitRes => {
			unit = new Unit({ id: unitRes.id, unit_group_id: unitRes.unit_group_hashed_id });
			return unit.find(connection, api)
				.then(() => unit.getAddress(connection))
				.then(() => unit.getCategory(connection))
				.then(() => unit.getFeatures(connection))
				.then(() => unit.getCurrentLease(connection))
				.then(() => unit.getNextLeaseStart(connection))
				.then(() => unit.getHold(connection))
				.then(() => unit.setState(connection))
				.then(() => {if (!params.skipAmenities) unit.getAmenities(connection)})
				.then(() => unit)
		}).then(units => {
			this.Units = units;
			return models.Unit.find(connection, { conditions: { property_id: this.id } }, true);
		}).then(count => {
			this.unitCount = count;
			return true;
		})
	}

	getAllUnits(connection, api, params) {
		var unit = {};
		if (!this.id) throw "Property id not set.";
		params = params || {};
		params.conditions = params.conditions || {};
		params.conditions.property_id = this.id;

		// return models.Unit.getAllUnits(connection, this.id)
		// .then( units => {
		// 	this.Units = units;
		// })

		return models.Unit.getAllUnits(connection, this.id)
			.mapSeries(unitRes => {
				unit = new Unit({ id: unitRes.id });
				return unit.find(connection)
					.then(() => {
						unit.hold_expires = unitRes.unitRes;
						unit.category = unitRes.category;
						unit.state = unitRes.state;
						unit.width = unitRes.width;
						unit.height = unitRes.height;
						unit.length = unitRes.length;
					}).then(() => unit)
			}).then(units => {
				this.Units = units;
				return models.Unit.find(connection, { conditions: { property_id: this.id } }, true);
			})
			.then(count => {
				this.unitCount = count;
				return true;
			})

	}

	async getAllUsers(connection){
		if(!this.id) throw "Property in not set";
		return await models.Contact.getAllContacts(connection, this.id);
	}

	async getAllLeases(connection){
		if(!this.id) throw "Property in not set";
		return await models.Leases.getAllLeases(connection, this.id);
	}

	async getFacilityMapAssets(connection) {
		if (!this.id) e.th(500, "Property id not set");

		console.log("REACHED")
		let assets = await models.Assets.findPropertyMapAssets(connection, this.id);

		this.Assets = assets;
	}

	async getUnitCategories(connection, company_id, property_id) {
		let category_list = await models.UnitCategory.findCategoryList(connection, company_id, [property_id]);

		let categories = [];
		for (let i = 0; i < category_list.length; i++) {
			var category = new Category({ id: category_list[i].id });
			await category.find(connection);
			await category.getAttributes(connection);
			await category.getPropertyBreakdown(connection, this.id);
			await category.getPropertyAvailableBreakdown(connection, this.id);
			categories.push(category);
		}

		return categories;
	}

	async setProductOverride(connection, product_id, data) {
		if (!this.id) e.th(500, "Property id not set");
		let override = await models.Property.findProductOverride(connection, this.id, product_id);

		if (!override) {
			e.th(400, "Product is not enabled for this property");
		}

		if (override.id) {
			data = {
				product_id: product_id,
				property_id: this.id,
				price: data.price || null,
				prorate: data.prorate ? 1 : 0,
				prorate_out: data.prorate_out ? 1 : 0,
				recurring: data.recurring ? 1 : 0,
				taxable: data.taxable ? 1 : 0,
				inventory: data.inventory,
				amount_type: data.amount_type,
				income_account_id: data.income_account_id || null
			}

			await models.Property.saveProductOverride(connection, data, override.id)
		}


	}

	async getProductDetails(connection, product_id, rent) {

		return await models.Property.getProductDetails(connection, this.id, product_id, rent);

	}

	getAvailableUnits(connection, api, conditions, params) {

		var unit = {};
		if (!this.id) throw "Property id not set.";
		params = params || {};
		params.order = "number ASC";
		return models.Unit.findByPropertyId(connection, this.id, true, conditions, params).mapSeries(unitRes => {
			unit = new Unit({ id: unitRes.id });
			return unit.find(connection, api)
				.then(() => unit.getAddress(connection))
				.then(() => unit.getCategory(connection))
				.then(() => unit.getFeatures(connection))
				.then(() => unit.setState(connection))
				.then(() => unit.setSpaceMixId(connection))
				.then(() => unit)
		}).then(units => {
			this.Units = units;
			return models.Unit.findByPropertyId(connection, this.id, true, conditions, null, true);
		}).then(count => {
			this.unitCount = count[0].count;
			return true;
		})
	}

	async getOverlockedUnits(connection, api) {

		if (!this.id) e.th(500, "Property id not set.");

		// var overlockedUnits = models.Unit.findOverlockedByPropertyId(connection, this.id);
		// var units = await overlockedUnits.mapSeries(async (unitRes) => {
		// 	unit = new Unit({id: unitRes.unit_id});
		// 	await unit.find(connection, api);
		// 	await unit.getAddress(connection);
		// 	await unit.getCategory(connection);
		// 	return unit;
		// });
		// this.Units = units;
		// }

		let overlockedUnits = await models.Unit.findOverlockedByPropertyId(connection, this.id);
		for (let i = 0; i < overlockedUnits.length; i++) {
			let unit = new Unit({ id: overlockedUnits[i].unit_id });
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);

			if (unit.Lease)
				await unit.Lease.getStanding(connection);

			this.Units.push(unit);
		};

	}

	async getUnitsToOverlock(connection, api) {

		if (!this.id) e.th(500, "Property id not set.");
		let units = [];

		var unlockedUnits = await models.Unit.findUnitsToOverlockByPropertyId(connection, this.id);


		for (let i = 0; i < unlockedUnits.length; i++) {
			let unit = new Unit({ id: unlockedUnits[i].unit_id });
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);
			await unit.Lease.getStanding(connection);
			units.push(unit);
		}

		this.Units = units;
	}

	async getUnitsToUnlock(connection, api) {
		if (!this.id) e.th(500, "Property id not set.");
		let units = [];
		var lockedUnits = await models.Unit.findUnitsToUnlockByPropertyId(connection, this.id);
		for (let i = 0; i < lockedUnits.length; i++) {
			let unit = new Unit({ id: lockedUnits[i].unit_id });
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);
			await unit.Lease.getStanding(connection);
			units.push(unit);
		}
		this.Units = units;
	}

	getUnitCount(connection) {
		var _this = this;
		if (!this.id) throw "Property id not set.";
		return models.Property.getUnitCount(connection, this.id).then(unitCount => {
			_this.unit_count = unitCount[0].count;
			return true;
		});

	}

	getLeaseCount(connection) {
		var _this = this;
		if (!this.id) throw "Property id not set.";
		return models.Property.getLeaseCount(connection, this.id).then(leaseCount => {
			_this.lease_count = leaseCount[0].count;
			return true;
		});

	}

	async getOccupancy(connection) {
		if (!this.id) throw new Error("Property id is not set.");
		if (this.unit_count === "") {
			await this.getUnitCount(connection)
		}
		if (this.lease_count === "") {
			await this.getLeaseCount(connection)
		}

		this.occupancy = this.lease_count && this.unit_count ? (this.lease_count / this.unit_count) * 100 : 0;
		return true

	}

	async getHours(connection, hours_id) {

		if (!this.id) throw new Error("Property id not set.");

		this.Hours = await models.Hours.findByPropertyId(connection, this.id);

		if (!hours_id) return;

		return this.Hours.find(h => h.id == hours_id);


	}

	async getApplicationConfig(connection) {

		if (!this.id) e.th(500, "Property id not set.");
		this.ApplicationConfig = await models.Property.findApplicationConfig(connection, this.id);
	}

	async saveApplicationConfig(connection, submitted_fields) {

		let fields = {};

		for (let i = 0; i < this.ApplicationConfig.length; i++) {
			fields[this.ApplicationConfig[i].name] = this.ApplicationConfig[i];
		}

		let keys = Object.keys(submitted_fields);
		for (let i = 0; i < keys.length; i++) {
			let field = keys[i];
			fields[field] = fields[field] || {};

			fields[field].include = submitted_fields[field].include ? 1 : 0;
			fields[field].required = submitted_fields[field].required ? 1 : 0;
			fields[field].property_id = this.id;
			fields[field].name = field;
			fields[field].description = submitted_fields[field].description;

			await models.Property.saveApplicationConfig(connection, fields[field], fields[field].id);
		}
	}

	getChecklist(connection) {

		var _this = this;
		if (!this.id) throw "Property id not set.";
		return models.Checklist.findByPropertyId(connection, this.id).then(checklist => {
			_this.Checklist = checklist;
			return true;
		});
	}

	async getTemplates(connection, unit_type, category_type) {
		if (!this.id) {
			var error = new Error("Property id no set");
			error.code = 500;
			throw error;
		}

		if (this.LeaseTemplates[unit_type]?.Template) {
			return this.LeaseTemplates[unit_type];
		}

		try {

			let defaultTemplates = await models.LeaseTemplate.findDefaultByCompanyId(connection, this.company_id);
			for (let i = 0; i < defaultTemplates.length; i++) {
				let template = defaultTemplates[i];
				let t = { Template: new Template({ id: template.id }) };
				await t.Template.find(connection);
				await t.Template.findServices(connection, 'lease');
				await t.Template.findServices(connection, 'reservation');
				await t.Template.findInsuranceServices(connection);
				await t.Template.findChecklist(connection);
				await t.Template.findPaymentCycles(connection);

				for (let j = 0; j < t.Template.Services; j++) {
					let s = t.Template.Services[j];
					let products = await models.Property.findProducts(connection, this.id, this.company_id, s.product_id, category_type);
					if (products && products.length) {
						let p = products[0];
						if (!s.price) {
							t.Template.Services[j].price = p.property_price ? p.property_price : p.price;
						}
						t.Template.Services[j].taxable = p.property_price ? p.property_taxable : p.taxable;
					}
				}

				this.LeaseTemplates[t.Template.unit_type] = t;
			}

			let propertyTemplates = await models.Property.findTemplates(connection, this.id, unit_type);
			for (let i = 0; i < propertyTemplates.length; i++) {
				let t = propertyTemplates[i];
				t.Template = new Template({ id: t.lease_template_id });
				await t.Template.find(connection);
				await t.Template.findServices(connection, 'lease');
				await t.Template.findServices(connection, 'reservation');
				await t.Template.findInsuranceServices(connection);
				await t.Template.findChecklist(connection);
				await t.Template.findPaymentCycles(connection);
				
				for (let j = 0; j < t.Template.Services.length; j++) {
					let s = t.Template.Services[j];
					let products = await models.Property.findProducts(connection, this.id, this.company_id, s.product_id, null, null, category_type);
					
					if (products && products.length) {
						let p = products[0];
	
						s.price 										= p.property_price ? p.property_price : p.price;
						s.taxable 									= p.property_taxable ? p.property_taxable : p.taxable;
						
						s.Product.taxable 					= p.property_taxable ? p.property_taxable : p.taxable;
						s.Product.price 						= p.property_price ? p.property_price : p.price;
						s.Product.income_account_id = p.income_account_id;
					}
				}

				this.LeaseTemplates[t.Template.unit_type] = t;
			}

			return unit_type ? this.LeaseTemplates[unit_type] : this.LeaseTemplates;
		} catch (err) {
			console.log(err)
			if (!this.LeaseTemplates) throw err;
		}
	}

	async getTemplate(connection, template_id) {
		let template = await models.Property.findTemplateById(connection, template_id);
		if (!template) e.th(404, "Template not found");
		if (template.property_id != this.id) e.th(403);
		return template;

	}

	deleteTemplate(connection, template_id) {
		return models.Property.deleteTemplate(connection, template_id)
	}

	async createTemplate(connection, data) {

		let save = {
			id: null,
			property_id: this.id,
			lease_template_id: data.lease_template_id,
			unit_type: data.unit_type
		}

		let propertyTemplates = await models.Property.findTemplates(connection, this.id, data.unit_type);
		if (propertyTemplates && propertyTemplates.length) {
			save.id = propertyTemplates[0].id;
		}

		let result = await models.Property.saveTemplate(connection, save, save.id);
		save.id = save.id || result.insertId;
		return save;
	}

	async getProducts(connection, product_id, search, type, category) {
		if (!this.id) throw new Error("Property id not set.");
		let products = await models.Property.findProducts(connection, this.id, this.company_id, product_id, search, type, category ? Enums.CATEGORY_TYPE[category.toUpperCase()] : null);

		for (let i = 0; i < products.length; i++) {
			let p = products[i];
			let product = new Product({
				id: p.id,
				name: p.name,
				description: p.description,
				price: p.property_price,
				prorate: p.property_prorate,
				prorate_out: p.property_prorate_out,
				recurring: p.property_recurring,
				taxable: p.property_taxable,
				default_type: p.default_type,
				has_inventory: p.has_inventory,
				sku: p.sku,
				type: p.type,
				inventory: p.property_inventory,
				amount_type: p.property_amount_type,
				vendor_id: p.vendor_id,
				category_type: p.category_type,
				income_account_id: p.income_account_id
			});

			await product.getRules(connection, this.id);
			await product.findProductGlAccount(connection, 'property', this.id);
			this.Products.push(product);
		}

		return this.Products;
	}

	async getInsurances(connection, company_id, filters) {
		let insurances = await models.Property.findInsurances(connection, company_id, this.id, filters);

		for (let i = 0; i < insurances.length; i++) {
			let insurance = new Insurance({ id: insurances[i].id });
			await insurance.find(connection);

			let products = await this.getProducts(connection, insurance.product_id, null, 'insurance');
			if (!products || !products.length) e.th(404, "Product not found");

			let product = products[0];
			insurance.prorate = product.prorate;
			insurance.prorate_out = product.prorate_out;
			insurance.recurring = product.recurring;
			insurance.taxable = product.taxable;

			this.Insurances.push(insurance);
		}

		return this.Insurances;
	}

	// This should all be in access control
	async getAccessControl(connection, admin_id) {
		let access = new AccessControl({
			property_id: this.id,
			...connection.meta
		});
		await access.fetch(connection, {id: this.company_id}, admin_id);
		if(access && access.access_id){
			this.Access = access;
		} else {
			e.th(500, "Access control configuration is missing");
		}
	}

	async deleteAccess(connection, admin_id){
		if(!this.id) e.th(500, "Id not set");
		let access = new AccessControl({
			property_id: this.id,
			...connection.meta
		});

		await access.getToken(connection, {id: this.company_id});
		await access.deleteFacility(admin_id);

	}

	async getPaymentMethod(connection, type, payment_method_id, device_id) {
		let paymentMethod = {};

		if (!type && !payment_method_id) e.th(500, "Please Include either the type or a paymentMethod_id");

		if (payment_method_id) {

			paymentMethod = await models.Payment.findPaymentMethodById(connection, payment_method_id);

			await this.getConnections(connection, paymentMethod.type);

			if (!this.Connections.length) e.th(404, "Connection information not found");

			let payment_connection = new Connection(this.Connections[0]);

			let pm = payment_connection.getPaymentMethod(paymentMethod);

			await pm.find(connection);

			return pm

		} else {

			switch (type.toLowerCase()) {
				case Enums.PAYMENT_METHODS.CASH:
					return new Cash({ type: 'Cash' });
				
				case Enums.PAYMENT_METHODS.CHECK:
					return new Check({ type: 'Check' });
					
				case Enums.PAYMENT_METHODS.CREDIT:
					return new Credit({ type: 'Credit' });
						
				case Enums.PAYMENT_METHODS.LOSS:
					return new Loss({ type: 'Loss' });
				
				case Enums.PAYMENT_METHODS.ADJUSTMENT:
					return new Adjustment({ type: 'Adjustment' });
					
				case Enums.PAYMENT_METHODS.GIFTCARD:
					return new GiftCard({ type: 'GiftCard' });
			}

			var parent_type = '';

			if (type.toLowerCase() === 'google' || type.toLowerCase() === 'apple') {
				parent_type = 'card'; // TODO fix this when we support multiple processors
			} else {
				parent_type = type;
			}

			await this.getConnections(connection, parent_type)

			if (!this.Connections.length) e.th(404, "Connection information not found");

			paymentMethod.type = type;

			let payment_connection = new Connection(this.Connections[0]);

			return payment_connection.getPaymentMethod(paymentMethod, device_id);

		}


	}

	static async findAllActive(connection, property_id, company_id) {
		return await models.Property.findAllActive(connection, property_id, company_id)
	}

	async verifyAccess(payload) {
		let {connection, api ,company_id, properties, contact_id, permissions = []} = payload
		properties = properties || []

		if (this.company_id !== company_id) e.th(403, "Not authorized");
		if (properties.length && properties.indexOf(this.id) < 0) e.th(403, "Not authorized");

		if(!permissions?.length || api?.id) return;
		
		if(!contact_id && connection) contact_id = connection.meta?.contact_id

		let ipp_feature = connection.meta?.ipp_feature;
		let is_hb_user = connection.meta?.is_hb_user;

		let gps_selection = connection.meta.gps_selection;
		let is_gps_selected = gps_selection?.includes(this.id)

		if(is_hb_user && ipp_feature && !is_gps_selected) await this.InterPropModeVerification(payload);
		else await this.primaryModeVerification(payload);

		return;
	}
	
	async primaryModeVerification(payload) {
		let {connection, api, properties, contact_id, permissions = []} = payload
		properties = properties || []

		if (properties.length && properties.indexOf(this.id) < 0) e.th(403, "Not authorized");
		
		if(permissions?.length && !api?.id) {
			let data = {contact_id, permissions, id: this.id}
			let unauthorized_permissions = await models.Property.hasPermissions(connection, data)

			if(unauthorized_permissions?.length) e.th(403, `${unauthorized_permissions.map(p => p.label).join(', ')} ${unauthorized_permissions.length > 1 ? `are` : `is`} not authorized for this user`);
		}	
	}

	async InterPropModeVerification(payload) {
		let {connection, api ,company_id, contact_id, permissions = []} = payload

		if(!permissions?.length || api?.id) return;

		let data = {company_id, id: this.id, contact_id, permissions};
		let unauthorized_permissions = await models.Property.interPropModeVerification(connection, data);
		
		if(unauthorized_permissions) 
			e.th(403, `${unauthorized_permissions} not authorized for this user`);
	}

	async verifyUnitGroupAccess(connection, propertyId, unitGroupId) {
		let groups = await models.Unit.verifyUnitGroupAccess(connection, propertyId, unitGroupId)
		if (!groups.length) e.th(403, "Not authorized to access this resource");
	}

	verifyAccessControl(gate) {

		if (this.Access.name !== gate) e.th(400, "This property does not use this access control system")
		return Promise.resolve();

	}

	async verifyUnique(connection) {
		let property = await models.Property.searchByCompanyID(connection, this.company_id, this);
		if (property && property.id !== this.id) {
			e.th(409, "There is already a property with this name, number or address.");
		}

		return true;
	}

	async verifyUniqueNonHbProperty(connection) {
		let property = await models.Property.searchNonHbPropertyByCompanyID(connection, this.company_id, this);
		if (property && property.id !== this.id) {
			e.th(409, "There is already a property with this name, number or address.");
		}

		return true;
	}

	async findMonthlyBills(connection, month) {

		if (!this.id) e.th(500);

		let bills = await models.Billing.findMonthlyPropertyBills(connection, this.id, month);
		this.Bills = bills;
		this.total_bills = bills.length;

		let enteredCount = 0;
		this.Bills.forEach(b => {
			if (b.current_amount) enteredCount++;
		});

		this.total_entered = enteredCount;

	}

	async getConnections(connection, type) {

		if (!this.id) e.th(500, "Property id not set.");

		let connection_list = await models.Property.findConnections(connection, this.id, type);

		for (let i = 0; i < connection_list.length; i++) {
			let c = new Connection(connection_list[i]);
			await c.find(connection);
			// c.config = await c.getCredentials(connection);
			this.Connections.push(c);

		}
	}
	//
	// async getConnections(connection, type){
	//
	// 	console.log("connections", type);
	//
	// 	let connections = await models.Property.findConnections(connection, this.id, type);
	//
	// 	console.log("connections", connections);
	// 	for(let i = 0; i < connections.length; i++){
	// 		let c = new Connection(connection[i]);
	// 		await c.find(connection);
	// 		console.log("C", c);
	// 		await c.getCredentials(connection);
	// 		this.Connections.push(c);
	// 	}
	// }

	async getUtilities(connection) {
		if (!this.id) e.th(500);
		return await models.Billing.findRecurringByPropertyId(connection, this.id)
	}

	async updateUtility(connection, existing, data) {

		// TODo verify Vendor access as well.
		existing.splittype = data.splittype;
		existing.amount = data.amount || null;
		existing.vendor_id = data.vendor_id;
		return existing;
	}

	async saveUtility(connection, data) {
		if (!this.id) e.th(500);

		var form = {
			splittype: data.splittype,
			property_id: this.id,
			amount: data.amount || null,
			product_id: data.product_id,
			vendor_id: data.vendor_id
		};


		let response = await models.Billing.save(connection, form, data.id);
		form.id = response.insertId;
		return form;
	}

	async deleteUtility(connection, utility) {
		if (!this.id) e.th(500);
		return await models.Billing.delete(connection, utility.id);
	}

	async getMaintenanceTypes(connection) {
		if (!this.id) e.th(500, "Property id not set");

		let types = await models.MaintenanceType.findByPropertyId(connection, this.id);
		for (let i = 0; i < types.length; i++) {
			this.MaintenanceTypes.push({
				id: types[i].id,
				property_id: types[i].property_id,
				Vendor: {
					id: types[i].vendor_id,
					name: types[i].vendor_name
				},
				name: types[i].name,
				email: types[i].email,
				text: types[i].text,
				sort: types[i].sort,
				deleted: types[i].deleted
			})
		}

	}

	async getMaintenanceExtras(connection) {
		if (!this.id) e.th(500, "Property id not set");
		this.MaintenanceExtras = await models.MaintenanceExtra.findByPropertyId(connection, this.id);
	}

	async saveMaintenanceType(connection, data) {

		for (let i = 0; i < data.email.length; i++) {
			if (!validator.isEmail(data.email[i].trim())) e.th(400, data.email[i] + " is not a valid email address");
		}

		for (let i = 0; i < data.text.length; i++) {
			let stripped = validator.whitelist(data.text[i], "01233456789+x");
			if (!validator.isLength(stripped, { min: 9, max: 11 })) e.th(400, data.text[i] + " is not a valid phone number");
		}

		var save = {
			name: data.name,
			property_id: this.id,
			vendor_id: data.vendor_id,
			email: JSON.stringify(data.email),
			text: JSON.stringify(data.text)
		};

		save.id = await models.MaintenanceType.save(connection, save, data.id);

		return save;


	}

	async saveMaintenanceExtra(connection, data) {

		if (validator.isEmpty(data.name)) e.th(400, 'Your question cannot be blank');
		var save = {
			property_id: this.id,
			name: data.name,
			required: data.required || 0
		};
		save.id = await models.MaintenanceExtra.save(connection, save, data.id);
		return save;
	}

	updateMaintenanceType(existing, data) {

		existing.name = data.name;
		existing.vendor_id = data.vendor_id;
		existing.email = data.email;
		existing.text = data.text;

		return existing;

	}


	updateMaintenanceExtra(existing, data) {

		existing.name = data.name;
		existing.required = data.required;

		return existing;

	}

	async deleteMaintenanceType(connection, maintenance_type_id) {
		return await models.MaintenanceType.delete(connection, maintenance_type_id)

	}

	async deleteMaintenanceExtra(connection, maintenance_extra_id) {
		return await models.MaintenanceExtra.delete(connection, maintenance_extra_id)

	}

	static async findAggregatedByCompanyId(connection, company_id, searchParams, base_properties, restricted, count) {
		return await models.Property.findAggregatedByCompanyId(connection, company_id, searchParams, base_properties, restricted, count);
	}

	static async findByCompanyId(connection, company_id, searchParams, base_properties, restricted, count) {
        return await models.Property.findByCompanyId(connection, company_id, searchParams, base_properties, restricted, count);
    }


	static async findNonHbPropertyByCompanyId(connection, company_id, searchParams, base_properties, restricted, count) {
		return await models.Property.findNonHbPropertyByCompanyId(connection, company_id, searchParams, base_properties, restricted, count);
	}

	static async findListByCompanyId(connection, company_id, restricted) {
		return await models.Property.listByCompanyId(connection, company_id, restricted);
	}

	static async findByType(connection, company_id, type, restricted) {
		if (!company_id) e.th(500, "Company Id missing");
		return await models.Property.findByType(connection, company_id, type, restricted);
	}

	async findTriggers(connection) {

		if (!this.id) e.th(500, "Id missing");
		this.Triggers = await models.Property.findTriggers(connection, this.id);
		return;
	}

	async getPermissions(connection, company_id, contact_id) {
		if (!this.id) e.th(500, "Property id not set");
		if (!contact_id) e.th(500, "Contact id is not set");

		return await models.Role.findPropertyPermissions(connection, company_id, contact_id, this.id);
	}

	async getUnitTypes(connection) {
		return await models.Property.findUnitTypes(connection, this.id);
	}

	async getTaxRates(connection) {
		let taxRates = await models.Property.findTaxRates(connection, this.id);
		this.TaxRates = taxRates && taxRates.length ? taxRates : [];
	}

	async getTaxRate(connection, tax_rate_id, type) {
		return await models.Property.findTaxRate(connection, tax_rate_id, this.id, type);
	}

	async getTaxProfiles(connection) {

		if (!this.Address || !this.Address.state) e.th(500, "Need Property State info to fetch available Tax Profiles");

		return await models.TaxProfile.findAllByCompany(connection, this.company_id, { state: this.Address.state });
	}

	async saveBulkTaxRate(connection, taxRates) {
		let taxRatesIds = [];

		for (let i = 0; i < taxRates.length; i++) {
			let taxRateId = await this.saveTaxRate(connection, taxRates[i]);
			taxRatesIds.push({ id: taxRateId });
		}

		return taxRatesIds;
	}

	async saveTaxRate(connection, data) {
		if (!data.id && (!this.id || !data.type)) e.th(500, "Tax Rate Id or Property Id and Tax Rate type not set");
		let taxRate = await this.getTaxRate(connection, data.id, data.type);

		if (taxRate) {
			if (taxRate.property_id != this.id) {
				e.th(409, 'Tax Rate not found in this property');
			}
		}

		data = {
			tax_rate: data.tax_rate,
			tax_profile_id: data.tax_profile_id,
			type: data.type,
			property_id: this.id,
		}

		let result = await models.Property.saveTaxRate(connection, data, taxRate && taxRate.id);
		if (result.insertId) data.id = result.insertId;
		return data.id;
	}

	static async deleteTaxRate(connection, tax_profile_id) {
		if (!tax_profile_id) e.th(400, "Tax Profile id not set");

		await models.Property.deleteTaxRateByProfileId(connection, tax_profile_id);
	}

	getUnitsByAmenityIds(connection, api, company_id, properties, space_mix_ids) {

		var unit = {};
		if (!this.id) throw "Property id not set.";
		if (!space_mix_ids) return e.th(500, "space_mix_ids required");
		if (space_mix_ids.length != 4 || !Array.isArray(space_mix_ids)) return e.th(500, "space_mix_ids should be an array with 4 elements");

		let category_id = space_mix_ids.shift();

		return models.Unit.getUnitsByAmenityIds(connection, company_id, properties, category_id, space_mix_ids).mapSeries(unitRes => {
			unit = new Unit({ id: unitRes.id });
			return unit.find(connection, api)
				.then(() => unit.getAddress(connection))
				.then(() => unit.getCategory(connection))
				.then(() => unit.getFeatures(connection))
				.then(() => unit.setState(connection))
				.then(() => unit)
		}).then(units => {
			this.Units = units;
		});
	}

	async getUnitsInSpaceMix(connection, api, company_id, properties, space_mix_ids, available = false, queryParams = {}, timing_fn = null, hasUnitGroupDetails = null) {
		// timing_fn('getLeaseInfo');
		if (!this.id) throw "Property id not set.";
		if (!space_mix_ids || !space_mix_ids.length) return e.th(400, "space_mix_ids required");
		/*
		  0: space type: 1 for storage, 2 for residentail, 3 for parking
		  1: category_id
		  2: width
		  3: length
		  4: height
		 */
		// let spaceTypes = new Map();
		// spaceTypes.set(1, 'storage');
		// spaceTypes.set(2, 'residential');
		// spaceTypes.set(3, 'parking');

		// let spaceType = spaceTypes.get(parseInt(space_mix_ids[0]));
		let unitType = Utils.stringToEnumKey(Enums.SPACETYPE, parseInt(space_mix_ids[0]));

		timing_fn && timing_fn('getUnitsInSpaceMixStart')
		let units = await models.Unit.getUnitsInSpaceMix(connection, company_id, properties, unitType.toLowerCase(), space_mix_ids[1], space_mix_ids[2], space_mix_ids[3], space_mix_ids[4], available, queryParams);
		timing_fn && timing_fn('getUnitsInSpaceMix')
		this.unitCount = await models.Unit.getUnitsInSpaceMixCount(connection, company_id, properties, unitType.toLowerCase(), space_mix_ids[1], space_mix_ids[2], space_mix_ids[3], space_mix_ids[4], available);
		timing_fn && timing_fn('getUnitsInSpaceMixCount')

		for (let i = 0; i < units.length; i++) {
			let unit = new Unit({ id: units[i].id });
			await unit.find(connection, api)
			timing_fn && timing_fn('findUnit')
			await unit.getFeatures(connection)
			timing_fn && timing_fn('getFeatures')
			await unit.setState(connection)
			timing_fn && timing_fn('setState')
			await unit.setSpaceMixId(connection, hasUnitGroupDetails);
			timing_fn && timing_fn('setSpaceMixId')
			this.Units.push(unit);
		}
	}

	async getUnitGroupUnits(connection, api, groupId, available = false, queryParams = {}, timing_fn = null) {

		timing_fn && timing_fn('getUnitsInSpaceMixStart')
		let units = await models.Unit.getUnitGroupUnits(connection, groupId, available, queryParams);
		timing_fn && timing_fn('getUnitsInSpaceMix')
		this.unitCount = await models.Unit.getUnitGroupUnits(connection, groupId, available, queryParams, true);
		timing_fn && timing_fn('getUnitsInSpaceMixCount')

		for (let i = 0; i < units.length; i++) {
			let unit = new Unit({ id: units[i].id });
			await unit.find(connection, api)
			timing_fn && timing_fn('findUnit')
			await unit.getFeatures(connection)
			timing_fn && timing_fn('getFeatures')
			await unit.setState(connection)
			timing_fn && timing_fn('setState')
			unit.space_mix_id = groupId;
			timing_fn && timing_fn('setSpaceMixId')
			await unit.getAmenities(connection, true)
			this.Units.push(unit);
		}
	}

	async getPromotionsInSpaceMix(connection, companyId, spaceMixId) {
		if (!this.id) throw "Property id not set.";
		if (!spaceMixId) return e.th(400, "spaceMixId required");

		let promotions = await models.Unit.getPromotionsInSpaceMix(connection, this.id, spaceMixId);

		for (let i = 0; i < promotions.length; i++) {
			let promo = new Promotion({ id: promotions[i].id });
			await promo.find(connection);
			await promo.verifyAccess(companyId);
			this.Promotions.push(promo);
		}

	}

	formatSpaceMix(spacemix) {
		spacemix.map(s => {
			let attr = [{
				"name": "width",
				"value": s["width"]
			}, {
				"name": "length",
				"value": s["length"]
			}, {
				"name": "height",
				"value": s["height"]
			}, {
				"name": "unit_type",
				"value": s["unit_type"]
			}];
			s.Attributes = attr;
			delete s.unit_type;
			delete s.spacemix_category_id;
			return s;
		});
		return spacemix;
	}

	async getFilefromGDS(company, file_key) {
		let URI = `${GDS_FILE_APP_TOKEN_URI}owners/${company.gds_owner_id}/files/${file_key}/`

		try {
			var response = await request({
				headers: {
					'X-storageapi-key': GDS_API_KEY,
					'X-storageapi-date': moment().unix(),
				},
				json: true,
				uri: URI,
				method: 'GET'
			});

		} catch (err) {
			let error = JSON.parse(err.message.replace(err.statusCode + " - ", ""));
			let m = error.applicationData[GDS_FILE_APP_ID][0];
			e.th(err.statusCode, m.message);
		}

		return response.applicationData[GDS_FILE_APP_ID][0].file
	}

	async updateFileGDS(company, contact, file_key) {
		let URI = `${GDS_FILE_APP_TOKEN_URI}owners/${company.gds_owner_id}/files/${file_key}/`

		try {
			var response = await request({
				headers: {
					'X-storageapi-key': GDS_API_KEY,
					'X-storageapi-date': moment().unix(),
				},
				body: {
					downloaded_by: contact.first + " " + contact.last,
					last_downloaded_on: moment().format(),
				},
				json: true,
				uri: URI,
				method: 'PUT'
			});
			/*
			 * @todo covers 403 error, need to cover other err
			*/
			if (response.applicationData[GDS_FILE_APP_ID][0].status !== "success") throw err;
		} catch (err) {
			console.log(err)
			e.th(403);
			throw err
		}

		return response.applicationData[GDS_FILE_APP_ID][0];

	}

	async getListofFilesinGDS(company, query, limit = 50) {
		let URI = 'start_date' in query && 'end_date' in query
			?
			`${GDS_FILE_APP_TOKEN_URI}owners/${company.gds_owner_id}/files/?facility_id=${this.gds_id}&file_type=other&page_limit=${limit}&start_date=${encodeURIComponent(query.start_date)}&end_date=${encodeURIComponent(query.end_date)}`
			:
			`${GDS_FILE_APP_TOKEN_URI}owners/${company.gds_owner_id}/files/?facility_id=${this.gds_id}&file_type=other&page_limit=${limit}`;
		URI = 'page' in query ? URI + `&page=${query.page}` : URI;

		try {
			var response = await request({
				headers: {
					'X-storageapi-key': process.env.GDS_API_KEY,
					'X-storageapi-date': moment().unix(),
				},
				json: true,
				uri: URI,
				method: 'GET'
			});

			console.log("response.applicationData[GDS_FILE_APP_ID][0].data", response.applicationData[GDS_FILE_APP_ID][0].data);
			return response.applicationData[GDS_FILE_APP_ID][0];


		} catch (err) {
			let error = JSON.parse(err.message.replace(err.statusCode + " - ", ""));
			let m = error.applicationData[GDS_FILE_APP_ID][0];
			e.th(err.statusCode, m.message);
		}
	}

	async isDayClosed(connection, dateToCheck) {

		const date = dateToCheck ? dateToCheck : await this.getLocalCurrentDate(connection);
		this.is_day_closed = await models.Property.findIfDayClosed(connection, this.id, date);
	}

	async getEffectiveDate(connection) {
		if (!this.id) return null;

		let date = await this.getLocalCurrentDate(connection);
		await this.isDayClosed(connection);
		return this.is_day_closed ? moment(date).add(1, 'days').format('YYYY-MM-DD') : date;
	}

	static async filteredPropertiesFromUnits(connection, unitIds) {
		let properties = [];
		let units = await Unit.findAll(connection, { unit_ids: unitIds });

		for (const unit of units) {
			let index = properties.findIndex(obj => obj.property_id === unit.property_id);
			if (index != -1) {
				properties[index].units.push(unit.id);
			} else {
				properties.push({
					property_id: unit.property_id,
					units: [unit.id]
				});
			}
		}
		return properties;
	}

	async findPropertyPromotions(connection) {
		this.Promotions = await models.Promotion.findPromotionPropertiesByProperty(connection, this.id);
	}

	static async findInBulk(connection, property_ids) {
		let properties = await models.Property.findByIds(connection, property_ids);
		return properties;
	}

	static async findGDSIds(connection, properties, payload = {}) {
		const { update_properties_table = true } = payload;

		const pmsType = "leasecaptain";

		const updatedProperties = [...properties];
		let requestPropertyIds = [];
		for (let i = 0; i < updatedProperties.length; i++) {
			if (!updatedProperties[i].gds_id) {
				const propertyDetails = {
					"facility": Hashes.encode(updatedProperties[i].id, connection.cid),
					"pmstype": pmsType
				}

				requestPropertyIds.push(propertyDetails);
			}
		}

		const isPropertyPresentWithNoGdsId = requestPropertyIds.length > 0;
		if (!isPropertyPresentWithNoGdsId) return updatedProperties;

		const gdsIds = await gdsTranslate.getGDSMappingIds(requestPropertyIds, {
			isTranslatingMultipleIds: true
		});

		if (!gdsIds?.length) {
			e.th(500, 'Cannot find property. Make sure property is onboarded');
		}

		for (let i = 0; i < gdsIds.length; i++) {
			const updatedPropertyIndex = updatedProperties.findIndex(p => {
				const hashedPropertyId = Hashes.encode(p.id, connection.cid);
				return hashedPropertyId == gdsIds[i].facility.pmsid
			});

			if (update_properties_table) {
				const property = new Property({ id: updatedProperties[updatedPropertyIndex].id });
				await property.updateData(connection, { gds_id: gdsIds[i].facility.gdsid });
			}
			updatedProperties[updatedPropertyIndex].gds_id = gdsIds[i].facility.gdsid
		}

		return updatedProperties;
	}

	async getPropertyList(connection) {
		if (!(this.ids && this.ids.length)) e.th(500, "Property list is required");

		let properties = this.ids.map((p) => Hashes.decode(p)[0])
		let data = await models.Property.getPropertyList(connection, properties);

		let result = data && data.map((property) => {
			return {
				id: property.id,
				company_id: property.company_id,
				number: property.number,
				Address: {
					id: property.address_id,
					address: property.address,
					city: property.city
				},
				name: property.name
			}
		});
		return result;
	}

	async subscribeCertifiedEvents(connection, company_id, hashed_cid, events_to_subscribe) {


		try {
			let response = await Promise.allSettled(events_to_subscribe);
			console.log("Email event subscription response: ", response)
		} catch (error) {
			console.log("ERROR subscribing to GDS email events: ", error)
			throw error;
		}
	}

	/**
	* This method will returns active promotions for a unit group
	* @returns Array of Objects.
	*/
	static async findUnitGroupPromos(connection, data) {
		try {
			let unit_group_promos = await models.Property.getUnitGroupPromos(connection, data)
			let total_records = await models.Property.getUnitGroupPromos(connection, data, true)
			unit_group_promos.forEach(units => {
				units['period'] = units['active_period']
			})
			return { unit_group_promos, total_records };
		} catch (err) {
			throw err;
		}
	}

	/**
	* This method will returns rate change details of units under a property
	* @returns Array of Objects.
	*/
	static async findUnitsRateChanges(connection, property_id, search_params) {
		try {
			let unitRateChangeData = await models.Property.getUnitsRateChanges(connection, property_id, search_params)
			let total_records = await models.Property.getUnitsRateChangesCount(connection, property_id, search_params)
			let data = []
			for (let urc of unitRateChangeData) {
				data.push({
					unit_id: urc['id'],
					rate_changes: urc['rate_changes']
				})
			}
			return { data, total_records };
		} catch (err) {
			throw err;
		}
	}
	/**
	 * Method to verify whether a lease is under given property
	 * @todo Add support for company_id validation
	 * @param {*} connection 
	 * @param {String} lease_ids Lease Id
	 * @param {String} property_id Property Id. Priority for this parameter or id from constructor will be taken.
	 * @throws {Error} Invalid Lease Id if lease does not exist or lease is not under the given property
	 * @throws {Error} lease_id is required, if lease_id is not passed as argument
	 */
	async validateLeases(connection, lease_ids, property_id) {
		if (!lease_ids?.length) e.th(400, 'lease_ids are required')

		let propertyId = property_id ?? this.id
		let lease_property = await models.Property.findPropertiesByLeaseIds(connection, lease_ids);
		if (lease_property.length === 1 && lease_property[0].id === propertyId) {
			return true
		} else {
			e.th(400, "Invalid Lease Id")
		}
	}

	static async findDelinquencyWorkflows(connection, payload) {
		let {property_ids, trigger_group_id} = payload;

		if(!property_ids?.length) return;

		let data = {
			property_ids,
			...(trigger_group_id && {trigger_group_ids: [trigger_group_id]})
		}
		return await models.TriggerGroup.findGroupsByPropertyIds(connection, data);
	}

	async validateCompanyMapping(connection){
		const property=	await models.Property.findById(connection, this.id, this.company_id);
		if (!Boolean(property)) e.th(400, "Validation Error: invalid entities")
	}
	async getGroupingProfile (connection, profileName) {
		let groupingProfiles = await models.Property.getGroupingProfile(connection, this.id, profileName);
		return groupingProfiles?.[0] ?? null;
	}
	async findAccountingTemplate(connection, payload = {}){
		const { setDefault = true } = payload;
		let accountingTemplate = {};
		let propertyTemplate = await models.AccountingTemplate.findPropertyTemplate(connection, {filters : {property_id: this.id}});

		if(propertyTemplate.length){
			accountingTemplate = new AccountingTemplate({id: propertyTemplate[0].accounting_template_id});
			await accountingTemplate.find(connection, { filters: { id: accountingTemplate.id }});
		}else{
			if(setDefault){
				let defaultCompanyTemplate = await models.AccountingTemplate.findByOR(connection,{filters:{company_id: this.company_id, is_default: 1}});
				accountingTemplate = new AccountingTemplate(defaultCompanyTemplate[0]);
			}
		}
		this.PropertyAccountingTemplate = accountingTemplate;
		return this.PropertyAccountingTemplate;
	}

	async removePropertyAccountingTemplate(connection, payload){
		await models.Property.removePropertyAccountingTemplate(connection, payload);
	}

	async updateAccountingTemplate(connection, payload){
		const { accounting_template_id, admin_id } = payload;

		await this.findAccountingTemplate(connection, { setDefault: false });

		if(this.PropertyAccountingTemplate.id){
			await this.removePropertyAccountingTemplate(connection, {property_id: this.id, admin_id, deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
		}

		let templatePayload = {
			accounting_template_id: accounting_template_id,
			property_id: this.id,
			created_by: admin_id,
			modified_by: admin_id
		}

		await models.Property.savePropertyAccountingTemplate(connection, templatePayload);
	}

	async findAccountingSetup(connection) {
		const accountingTemplate = await this.findAccountingTemplate(connection);
		const accountingSetup = await this.PropertyAccountingTemplate.findAccountingSetup(connection, { filters: {
			accounting_template_id: accountingTemplate.id 
		}});
		return accountingSetup;
	}
	
	async getUnitGroupById (connection, unitGroupId) {
		let unitGroup = await models.Property.getUnitGroupById(connection, unitGroupId);
		return unitGroup?.[0] ?? null;
	}

	static async verifyAccessInBulk(connection, payload) {
		let {contact_id, properties = [], permission, api} = payload;

		if(contact_id && properties.length && permission && !api?.id){
			let unauthorized_props = await models.Property.hasPermissionToAll(connection, payload)

			if(unauthorized_props?.length) 
				e.th(403, `${unauthorized_props.map(p => p.name).join(', ')} ${unauthorized_props.length > 1 ? `are` : `is`} not authorized for this user`);
		}

	}

}

module.exports = Property;

var Unit = require(__dirname + '/../classes/unit.js');
var Template = require('../classes/template.js');
var AccessControl = require(__dirname + '/../classes/access_control.js');
var Upload = require('../classes/upload.js');
var Category = require('../classes/category.js');
var Connection = require('../classes/connection.js');
var Cash = require('../classes/payment_methods/cash.js');
var Check = require('../classes/payment_methods/check.js');
var Product = require('../classes/product.js');
var Insurance = require(__dirname + '/../classes/insurance.js');
var Credit = require('../classes/payment_methods/credit.js');
var Loss = require('../classes/payment_methods/loss.js');
var Adjustment = require('../classes/payment_methods/adjustment.js');
const GiftCard = require('../classes/payment_methods/gift_card.js');
var Promotion = require('./promotion');
var AccountingTemplate = require('../classes/accounting/accounting_template.js');
const gdsTranslate = require('../modules/gds_translate');
var Settings = require('../classes/settings.js');
const ENUMS = require('../modules/enums.js');