"use strict";

var models = require(__dirname + '/../models');
var settings = require(__dirname + '/../config/settings.js');


var Promise = require('bluebird');
var validator = require('validator');

var validation    = require(__dirname + '/../modules/validation.js');
var Utils = require(__dirname + '/../modules/utils.js');
var moment = require('moment');
var e = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();


class Property {

	constructor(data) {

		data = data || {};
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
		this.localCurrentDate = null,

		this.gds_id = data.gds_id || '';
		this.unit_count = '';
		this.lease_count = '';
		this.unitCount = '';

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
		this.Products = [];
		this.PropertyAccountingTemplate = {};
		this.LeaseTemplates = {
			"storage": {},
			"residential": {},
			"commercial": {}
		};
		this.landing_page = data.landing_page;
	}

	async getUtcOffset(connection) {

		let property = await models.Property.findById(connection, this.id);
		return property.utc_offset ? property.utc_offset : "+00:00";
	}

	async getLocalCurrentDate(connection,format = 'YYYY-MM-DD'){
		let off_set = this.utc_offset || await this.getUtcOffset(connection);
		this.localCurrentDate = moment().utcOffset(parseInt(off_set)).format(format)
		return this.localCurrentDate;
	}

	async find(connection, params = {}){
		const { should_find_accounting_template = false } = params;

		let property = {}
		if(!this.id && !this.name) {
			e.th(500, 'Property id not set');
		}
    
		if(this.id){
			property = await models.Property.findById(connection, this.id);
		} else {
			property = await models.Property.findByName(connection, this.name);
		}
		
		if (!property) e.th(404,"Property not found." );

		if (this.company_id && property.company_id !== this.company_id) {
			e.th(401,"You are not authorized to view this resource");
		}

		this.assemble(property)
		await this.getAddress(connection)
		if(should_find_accounting_template) {
			this.findAccountingTemplate(connection);
		}

	}

	//MVP TI - 12317 POC START

	async findTenantPaymentProperties(connection) {

		let property = {}
		if (!this.id && !this.name) {
			e.th(500, 'Property id not set');
		}

		if (this.id) {
			property = await models.Property.checkIfPropertyUsesTenantPayment(connection, this.id);
		} 

		if (!property) e.th(404, "Property Dosen't use Tenant Payments'.");

		if (this.company_id && property.company_id !== this.company_id) {
			e.th(401, "You are not authorized to view this resource");
		}

	}

	//MVP TI - 12317 POC END

	assemble(property){
		this.id = property.id;
		this.gds_id = property.gds_id;
		this.utc_offset = this.cleanUtcOffset(property.utc_offset);
		this.company_id = property.company_id;
		this.address_id = property.address_id;
		this.number = property.number;
		this.description = property.description;
		this.status = property.status;
		this.name = property.name;
		this.legal_name = property.legal_name;
		this.landing_page = property.landing_page;
		this.access_id = property.access_id || 0;
		this.on_boarding_date =  property.on_boarding_date;
	}

	async findAutoPaymentMethods(connection, date){
		return await models.Property.findAutoPaymentMethods(connection, this.id, date)
	}

	async findAutoPaymentMethodsWithInvoices(connection, date){
		return await models.Property.findAutoPaymentMethodsWithInvoices(connection, this.id, date)
	}

	async getPhones(connection){
		let phones = await models.Property.findPhones(connection, this.id);
		Utils = require(__dirname + '/../modules/utils.js');
		
		this.Phones = phones.map(phone => {
			phone.phone = phone.phone?.toString();
			phone.type = Utils.capitalizeAll(phone.type);
			return phone;
		})
	}

	async getEmails(connection){
		let emails = await models.Property.findEmails(connection, this.id);
		this.Emails = emails.map(email => {
			email.type = Utils.capitalizeAll(email.type);
			return email;
		});
	}

	async getAddress(connection){
		let address = await models.Address.findById(connection, this.address_id);
		this.Address = address;
	}

	// async getPhones(connection) {
	// 	let phones = await models.Property.findPhones(connection, this.id);

	// 	this.Phones = phones.map(phone => {
	// 		phone.phone = phone.phone.toString();
	// 		phone.type = Utils.captializeAll(phone.type);
	// 		return phone;
	// 	})
	// }

	// async getEmails(connection) {
	// 	let emails = await models.Property.findEmails(connection, this.id);
	// 	this.Emails = emails.map(email => {
	// 		email.type = Utils.captializeAll(email.type);
	// 		return email;
	// 	});
	// }

	// async getAddress(connection) {
	// 	let address = await models.Address.findById(connection, this.address_id);
	// 	this.Address = address;
	// }

	save(connection) {
		var _this = this;
		return Promise.resolve().then(function () {
			return _this.validate(connection);
		}).then(function () {
			var save = {
				company_id: _this.company_id,
				address_id: _this.address_id,
				number: _this.number,
				description: _this.description,
				phone: _this.phone,
				email: _this.email,
				status: _this.status,
				name: _this.name,
				legal_name: _this.legal_name,
				access_id: _this.access_id || 0
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

	async saveHours(connection, data){
		if(!this.id) e.th(500, "Property id not set");
		data.property_id = this.id;
		data.id = await models.Hours.save(connection, data, data.id)

		return data;

	}

	updateHours(existing, data){

		if(!existing) e.th(404);

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

	async deleteHours(connection, hours_id){
		return await models.Hours.delete(connection, hours_id)
	}

	async saveEmail(connection, data){
		if(!validation.validateEmail(data.email)) e.th(400, "Invalid Email");
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

	async savePhone(connection, data){
		if(!validation.validatePhone(data.number)) e.th(400, "Invalid Phone");

		var data = {
			property_id: this.id,
			type: data.type,
			phone: data.number.replace(/\D/g,''),
			sort: this.Phones.length,
			status: 1
		}

		data.id = await models.Property.savePhone(connection, data);
		return data;

	}

	async deleteEmail(connection, email_id){


		if(!this.id) e.th(500, "Property id not set");
		let email = this.Emails.find(e => e.id == email_id);

		if(!email) e.th(404);
		await models.Property.deleteEmail(connection, this.id, email_id)
		return email;

	}

	async deletePhone(connection, phone_id){


		if(!this.id) e.th(500, "Property id not set");
		let phone = this.Phones.find(e => e.id == phone_id);

		if(!phone) e.th(404);
		await models.Property.deletePhone(connection, this.id, phone_id)
		return phone;

	}


	update(data){

		if(typeof data.address_id != 'undefined') this.address_id = data.address_id;
		if(typeof data.number != 'undefined') this.number = data.number;
		if(typeof data.description != 'undefined') this.description = data.description;
		if(typeof data.name != 'undefined') this.name = data.name;
		if(typeof data.name != 'undefined') this.legal_name = data.legal_name;
		if(typeof data.status != 'undefined') this.status = data.status;
		if(typeof data.Phones != 'undefined') this.Phones = data.Phones;
		if(typeof data.Emails != 'undefined') this.Emails = data.Emails;

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

	validate (connection){
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

	getUnits(connection, api, params){

		var unit ={};
		if(!this.id) throw "Property id not set.";
		params = params || {};
		params.conditions = params.conditions || {};
		params.conditions.property_id =  this.id;

		params.order  =  "number ASC";
		return models.Unit.find(connection, params).mapSeries( unitRes => {
			unit = new Unit({id: unitRes.id});
			return unit.find(connection, api)
				.then(() => unit.getAddress(connection))
				.then(() => unit.getCategory(connection))
				.then(() => unit.getFeatures(connection))
				.then(() => unit.getCurrentLease(connection))
				.then(() => unit.getNextLeaseStart(connection))
				.then(()=> unit.getHold(connection))
				.then(()=> unit.setState(connection))
				.then(() => unit)
		}).then(units => {
			this.Units = units;
			return models.Unit.find(connection, {conditions: {property_id: this.id}}, true);
		}).then(count => {
			this.unitCount = count;
			return true;
		})
	}

	async getUnitCategories(connection, company_id, property_id ){
		let category_list = await models.UnitCategory.findCategoryList(connection, company_id, property_id);

		let categories = [];
		for(let i = 0; i < category_list.length; i++ ){
			var category = new Category({id: category_list[i].id});
			await category.find(connection);
			await category.getAttributes(connection);
			await category.getPropertyBreakdown(connection, this.id);
			await category.getPropertyAvailableBreakdown(connection, this.id);
			categories.push(category);
		}

		return categories;
	}

	async setProductOverride(connection, product_id, data){
		if(!this.id) e.th(500, "Property id not set");
		let override = await models.Property.findProductOverride(connection, this.id, product_id);

		if(!override){
			e.th(400, "Product is not enabled for this property");
		}

		if(override.id){
			data = {
				product_id: product_id,
				property_id: this.id,
				price: data.price,
				taxable: data.taxable? 1:0,
				inventory: data.inventory,
				income_account_id: data.income_account_id || null
			}

			await models.Property.saveProductOverride(connection, data, override.id)
		}


	}

	async getProductDetails(connection, product_id, rent){

		console.log("C:property.js/getProductDetails: Product id => ", product_id);
		let products = await this.getProducts(connection, product_id);
		
		if(products && products.length){
			let product = products[0];
			if(product.amount_type === 'scheduled'){
				let range =  await models.ProductRule.getRuleRange(connection, this.id, product_id, rent);
				if(range){
					switch (range.type) {
						case 'percent':
							product.price = Math.round(((range.price/100) * rent) * 1e2) / 1e2;
							break;
						case 'dollar':
							product.price = range.price;
							break;
					}
				}
			} else if (product.amount_type === 'percentage') {
				product.price = Math.round(((product.price/100) * rent) * 1e2) / 1e2;
			}

			console.log("C:property.js/getProductDetails: Product after price calculation (if any) => ", JSON.stringify(product));
			return product;
		}
	}

	getAvailableUnits(connection, api, conditions, params){

		var unit ={};
		if(!this.id) throw "Property id not set.";
		params = params || {};
		params.order  =  "number ASC";
		return models.Unit.findByPropertyId(connection, this.id, true, conditions, params).mapSeries( unitRes => {
			unit = new Unit({id: unitRes.id});
			return unit.find(connection, api)
				.then(() => unit.getAddress(connection))
				.then(() =>	unit.getCategory(connection))
				.then(() => unit.getFeatures(connection))
				.then(()=> unit.setState(connection))
				.then(() => unit)
		}).then(units => {
			this.Units = units;
			return models.Unit.findByPropertyId(connection, this.id, true, conditions, null, true);
		}).then(count => {
			this.unitCount = count[0].count;
			return true;
		})
	}

	async getOverlockedUnits(connection, api){

		if(!this.id) e.th(500, "Property id not set.");

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
		for(let i = 0; i < overlockedUnits.length; i++) {
			let unit = new Unit({id: overlockedUnits[i].unit_id});
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);
			await unit.Lease.getStanding(connection);
			this.Units.push(unit);
		};

	}

	async getUnitsToOverlock(connection, api){

		if(!this.id) e.th(500, "Property id not set.");
		let units = [];

		var unlockedUnits = await models.Unit.findUnitsToOverlockByPropertyId(connection, this.id);


		for(let i = 0; i < unlockedUnits.length; i++){
			let unit = new Unit({id: unlockedUnits[i].unit_id});
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);
			await unit.Lease.getStanding(connection);
			units.push(unit);
		}

		this.Units = units;
	}

	async getUnitsToUnlock(connection, api){
		if(!this.id) e.th(500, "Property id not set.");
		let units = [];
		var lockedUnits = await models.Unit.findUnitsToUnlockByPropertyId(connection, this.id);
		for(let i = 0; i < lockedUnits.length; i++){
			let unit = new Unit({id: lockedUnits[i].unit_id});
			await unit.find(connection, api);
			await unit.getCurrentLease(connection);
			await unit.Lease.getStanding(connection);
			units.push(unit);
		}
		this.Units = units;
	}

	getUnitCount(connection){
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

	async getHours(connection, hours_id){

		if(!this.id) throw new Error("Property id not set.");

		this.Hours = await models.Hours.findByPropertyId(connection, this.id);

		if(!hours_id) return;

		return this.Hours.find(h => h.id == hours_id);


	}

	async getApplicationConfig(connection){

		if(!this.id) e.th(500, "Property id not set.");
		this.ApplicationConfig = await models.Property.findApplicationConfig(connection, this.id);
	}

	async saveApplicationConfig(connection, submitted_fields){

		let fields = {};

		for(let i = 0; i < this.ApplicationConfig.length; i++ ){
			fields[this.ApplicationConfig[i].name] = this.ApplicationConfig[i];
		}

		let keys = Object.keys(submitted_fields);
		for (let i = 0; i < keys.length; i++ ){
			let field = keys[i];
			fields[field] = fields[field] || {};

			fields[field].include = submitted_fields[field].include ? 1:0;
			fields[field].required = submitted_fields[field].required ? 1:0;
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
		if(!this.id){
			var error = new Error("Property id no set");
			error.code = 500;
			throw error;
		}

		try {

			let defaultTemplates = await models.LeaseTemplate.findDefaultByCompanyId(connection, this.company_id);
			for(let i = 0; i < defaultTemplates.length; i++) {
				let template = defaultTemplates[i];
				let t = { Template: new Template({id: template.id}) };
				await t.Template.find(connection);
				await t.Template.findServices(connection, 'lease');
				await t.Template.findServices(connection, 'reservation');
				await t.Template.findInsuranceServices(connection);
				await t.Template.findChecklist(connection);
				await t.Template.findPaymentCycles(connection);

				for(let j = 0; j < t.Template.Services; j++) {
					let s = t.Template.Services[j];
					let products = await models.Property.findProducts(connection, this.id, this.company_id, s.product_id, category_type);
					if(products && products.length){
						let p = products[0];
						if(!s.price){
							t.Template.Services[j].price = p.property_price ? p.property_price : p.price;
						}
						t.Template.Services[j].taxable = p.property_price ?  p.property_taxable : p.taxable;
					}
				}

				this.LeaseTemplates[t.Template.unit_type] = t;
			}

			let propertyTemplates = await models.Property.findTemplates(connection, this.id, unit_type);
			
			for(let i = 0; i < propertyTemplates.length; i++) {
				let t = propertyTemplates[i];
				t.Template = new Template({id: t.lease_template_id});
				await t.Template.find(connection);
				await t.Template.findServices(connection, 'lease');
				await t.Template.findServices(connection, 'reservation');
				await t.Template.findInsuranceServices(connection);
				await t.Template.findChecklist(connection);
				await t.Template.findPaymentCycles(connection);

				for(let j = 0; j < t.Template.Services; j++) {
					let s = t.Template.Services[j];
					let products = await models.Property.findProducts(connection, this.id, this.company_id, s.product_id, category_type);
					if(products && products.length){
						let p = products[0];
						if(!s.price){
							t.Template.Services[j].price = p.property_price ? p.property_price : p.price;
						}
						t.Template.Services[j].taxable = p.property_price ?  p.property_taxable : p.taxable;
					}
				}

				this.LeaseTemplates[t.Template.unit_type] = t;
			}
			
			return unit_type ? this.LeaseTemplates[unit_type] : this.LeaseTemplates;
		} catch(err) {
			console.log(err)
			if(!this.LeaseTemplates) throw err;
		}
	}

	async getTemplate(connection, template_id){
		let template = await models.Property.findTemplateById(connection,template_id);
		if(!template) e.th(404, "Template not found");
		if(template.property_id != this.id) e.th(403);
		return template;

	}

	deleteTemplate(connection, template_id) {
		return models.Property.deleteTemplate(connection, template_id)
	}

	async createTemplate(connection, data){

		let save = {
			id: null,
			property_id: this.id,
			lease_template_id: data.lease_template_id,
			unit_type: data.unit_type
		}

		save.id = this.LeaseTemplates[data.unit_type].id;

		let result =  await models.Property.saveTemplate(connection, save, save.id);
		save.id = save.id || result.insertId;
		return save;
	}

	async getProducts(connection, product_id, search, type){
		if(!this.id) throw new Error("Property id not set.");
		console.log("C:property.js/getProducts: funaction params => ",`product_id = ${product_id} , search = ${search} , type = ${type}`);
		let products = await models.Property.findProducts(connection, this.id, this.company_id, product_id, search, type);
		console.log("C:property.js/getProducts: Product from DB => ", JSON.stringify(products));

		let mapped_products = [];
		for(let i = 0; i < products.length; i++) {
			let p = products[i];
			let product = new Product({
				id: p.id,
				name: p.name,
				description: p.description,
				price: p.property_price || p.price,
				prorate: p.property_prorate || p.prorate,
				prorate_out: p.property_prorate_out || p.prorate_out,
				recurring: p.property_recurring || p.recurring,
				taxable: p.property_taxable || p.taxable,
				default_type: p.default_type,
				has_inventory: p.has_inventory,
				sku: p.sku,
				type: p.type,
				inventory: p.property_inventory,
				amount_type: p.property_amount_type || p.amount_type,
				vendor_id: p.vendor_id,
				category_type: p.category_type,
				income_account_id: p.income_account_id
			});

			await product.findProductGlAccount(connection,'property');

			mapped_products.push(product);
		}

		console.log("C:property.js/getProducts: Product after db mapping values  => ", JSON.stringify(mapped_products));

		return mapped_products;
	}

	// This should all be in access control
	async getAccessControl(connection){
		let access = new AccessControl({
			property_id: this.id
		});

		await access.fetch(connection, {id: this.company_id});
		this.Access = access;
	}

	async deleteAccess(connection){
		if(!this.id) e.th(500, "Id not set");
		let access = new AccessControl({
			property_id: this.id
		});

		await access.getToken(connection, {id: this.company_id});
		await access.deleteFacility();

	}

	async getPaymentMethod(connection, type, payment_method_id) {
		let  paymentMethod = {};

		if(!type && !payment_method_id) e.th(500, "Please Include either the type or a paymentMethod_id");

		if(payment_method_id){

			paymentMethod = await models.Payment.findPaymentMethodById(connection, payment_method_id);
			console.log("paymentMethod",paymentMethod);
			await this.getConnections(connection, paymentMethod.type);

			if (!this.Connections.length) e.th(404, "Connection information not found");

			let  payment_connection = new Connection(this.Connections[0]);

			let pm =  payment_connection.getPaymentMethod(paymentMethod);

			await pm.find(connection);

			return pm

		} else {

			if(type.toLowerCase() === 'cash'){
				return new Cash({type: 'Cash'});
			}

			if(type.toLowerCase() === 'check'){
				return new Check({type: 'Check'});
			}

			if(type.toLowerCase() === Enums.PAYMENT_METHODS.GIFTCARD){
				return new GiftCard({type: 'GiftCard'});
			}

			var parent_type = '';

			if(type.toLowerCase() === 'google' || type.toLowerCase() === 'apple'){
				parent_type = 'card'; // TODO fix this when we support multiple processors
			} else {
				parent_type = type;
			}

			console.log(type);

			await this.getConnections(connection, parent_type)

			if (!this.Connections.length) e.th(404, "Connection information not found");

			paymentMethod.type = type;

			let payment_connection = new Connection(this.Connections[0]);

			return payment_connection.getPaymentMethod(paymentMethod, type);

		}


	}

	static async findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at){
		return await models.Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at)
	}

	verifyAccess(company_id, properties = []){
		if(this.company_id !== company_id) e.th(403, "Not authorized");
		if(properties.length && properties.indexOf(this.id) < 0) e.th(403, "Not authorized");

		return Promise.resolve();

	}

	verifyAccessControl(gate){

		if(this.Access.name !== gate) e.th(400, "This property does not use this access control system")
		return Promise.resolve();

	}

	async verifyUnique(connection){
		let property = await models.Property.searchByCompanyID(connection, this.company_id, this);
		if(property && property.id !== this.id) {
			e.th(409, "There is already a property with this property ID, name or address.");
		}

		return true;
	}

	async findMonthlyBills(connection, month){

		if(!this.id) e.th(500);

		let bills = await models.Billing.findMonthlyPropertyBills(connection, this.id, month);
		this.Bills = bills;
		this.total_bills = bills.length;

		let enteredCount = 0;
		this.Bills.forEach(b => {
			if(b.current_amount) enteredCount++;
		});

		this.total_entered = enteredCount;

	}

	async getConnections(connection, type){

		if(!this.id) e.th(500, "Property id not set.");
		console.log("type", type);
		let connection_list = await models.Property.findConnections(connection, this.id, type);
		for(let i = 0; i < connection_list.length; i++ ){
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

	async getUtilities(connection){
		if(!this.id) e.th(500);
		return await models.Billing.findRecurringByPropertyId( connection,  this.id)
	}

	async updateUtility(connection, existing, data){

		// TODo verify Vendor access as well.
		existing.splittype = data.splittype;
		existing.amount = data.amount || null;
		existing.vendor_id = data.vendor_id;
		return existing;
	}

	async saveUtility(connection, data){
		if(!this.id) e.th(500);

		var form = {
			splittype:      data.splittype,
			property_id:    this.id,
			amount:         data.amount || null,
			product_id:     data.product_id,
			vendor_id:      data.vendor_id
		};


		let response = await models.Billing.save(connection, form, data.id);
		form.id = response.insertId;
		return form;
	}

	async deleteUtility(connection, utility){
		if(!this.id) e.th(500);
		return await models.Billing.delete(connection, utility.id);
	}

	async getMaintenanceTypes(connection){
		if(!this.id) e.th(500, "Property id not set");

		let types = await models.MaintenanceType.findByPropertyId(connection, this.id);
		for(let i = 0; i < types.length; i++ ){
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

	async getMaintenanceExtras(connection){
		if(!this.id) e.th(500, "Property id not set");
		this.MaintenanceExtras = await models.MaintenanceExtra.findByPropertyId(connection, this.id);
	}

	async saveMaintenanceType(connection, data){

		for(let i=0; i < data.email.length; i++) {
			if (!validator.isEmail(data.email[i].trim())) e.th(400, data.email[i] + " is not a valid email address");
		}

		for(let i=0; i < data.text.length; i++) {
			let stripped = validator.whitelist(data.text[i], "01233456789+x");
			if(!validator.isLength(stripped, {min: 9, max: 11})) e.th(400, data.text[i] + " is not a valid phone number");
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

	async saveMaintenanceExtra(connection, data){

		if(validator.isEmpty(data.name)) e.th(400, 'Your question cannot be blank');
		var save = {
			property_id:    this.id,
			name:           data.name,
			required:       data.required || 0
		};
		save.id = await models.MaintenanceExtra.save(connection, save, data.id);
		return save;
	}

	updateMaintenanceType(existing, data){

		existing.name = data.name;
		existing.vendor_id = data.vendor_id;
		existing.email = data.email;
		existing.text = data.text;

		return existing;

	}


	updateMaintenanceExtra(existing, data){

		existing.name = data.name;
		existing.required = data.required;

		return existing;

	}

	async deleteMaintenanceType(connection, maintenance_type_id){
		return await models.MaintenanceType.delete(connection, maintenance_type_id)

	}

	async deleteMaintenanceExtra(connection, maintenance_extra_id){
		return await models.MaintenanceExtra.delete(connection, maintenance_extra_id)

	}

	static async findByCompanyId(connection, company_id, searchParams, base_properties, restricted ){
		return await models.Property.findByCompanyId(connection, company_id, searchParams, base_properties, restricted);
	}

	//MVP TI - 12317 POC START

	static async findByCompanyIdtp(connection, company_id, searchParams, base_properties, restricted) {
		return await models.Property.findByCompanyIdTP(connection, company_id, searchParams, base_properties, restricted);
	}

	//MVP TI - 12317 POC END

	static async findListByCompanyId(connection, company_id, restricted ){
		return await models.Property.listByCompanyId(connection, company_id, restricted);
	}

	static async findByType(connection, company_id, type, restricted){
		if(!company_id) e.th(500, "Company Id missing");
		return await models.Property.findByType(connection, company_id, type, restricted);
	}

	async resetLeaseStatuses (connection){
		return await models.Property.resetOpenLeaseStatuses(connection, this.id);
		return await models.Property.resetPendingLeaseStatuses(connection, this.id);
		return await models.Property.resetClosedLeaseStatuses(connection, this.id);
	}

	async findTriggers(connection){

		if(!this.id) e.th(500, "Id missing");
		this.Triggers = await models.Property.findTriggers(connection, this.id);
		return;
	}

	async getPermissions(connection, company_id, contact_id){
		if(!this.id) e.th(500, "Property id not set");
		if(!contact_id) e.th(500, "Contact id is not set");

		return await models.Role.findPropertyPermissions(connection, company_id, contact_id, this.id);
	}

	async isDayClosed(connection, dateToCheck) {

		const date = dateToCheck ? dateToCheck : await this.getLocalCurrentDate(connection);  
		this.is_day_closed = await models.Property.findIfDayClosed(connection, this.id, date);
		return this.is_day_closed
		}
	
	async getEffectiveDate(connection) {
		if(!this.id) return null;

		let date = await this.getLocalCurrentDate(connection);
		await this.isDayClosed(connection);

		this.effective_date = this.is_day_closed ? moment(date).add(1, 'days').format('YYYY-MM-DD') : date;
		return this.effective_date;
	}

	async  getFacilityDateTime(connection, dateTime){
		let off_set = await this.getUtcOffset(connection);
		return dateTime? moment(dateTime).utcOffset(parseInt(off_set)).format('YYYY-MM-DD HH:mm:ss'): moment().utcOffset(parseInt(off_set)).format('YYYY-MM-DD HH:mm:ss');
	}

	getAllUnits(connection, api, params) {
		var unit = {};
		if (!this.id) throw "Property id not set.";
		params = params || {};
		params.conditions = params.conditions || {};
		params.conditions.property_id = this.id;
		
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

	formatUnitsById() {
		let units = this.Units;

		let formattedUnits = {}
		for (let unitNumber = 0; unitNumber < units.length; unitNumber++) {
			let unit = units[unitNumber];
			formattedUnits[unit.id] = {...unit}
		}

		return formattedUnits;
	}

	findAdvancePaidInvoices(connection, date) {
		if(!this.id) e.th(500, "Property id not set");
		return models.Invoice.findAdvancePaidInvoices(connection, date, this.id);
	}

	findAdvanceInvoicesWithoutExports(connection, payload) {
		const { date } = payload;

		if(!this.id) e.th(500, 'property_id is required to find advance invoices');
		
		return models.Invoice.getAllInvoices(connection, {
			property_id: this.id,
			from_date: date,
			to_date: date
		});
	}

	cleanUtcOffset(offsetValue) {
		return offsetValue || "+00:00";
	}

	static async findInBulk(connection, property_ids) {
		let properties = await models.Property.findByIdsInBulk(connection, property_ids);
		return properties;
	}

	static async filteredPropertiesFromUnits(connection, unitIds, p_id = '') {
		let properties = [];
		let units = await Unit.findAll(connection, {unit_ids: unitIds, property_id: p_id});

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

	async findPropertyPromotions(connection, promo_id = ''){
		this.Promotions = await models.Promotion.findPromotionPropertiesByProperty(connection, this.id, promo_id);
	}

	static async fetchProperties(connection, payload){		
		return await models.Property.fetchProperties(connection, payload);
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

}

module.exports = Property;
var Unit    = require(__dirname + '/../classes/unit.js');
var Template      = require('../classes/template.js');
var AccessControl  = require(__dirname + '/../classes/access_control.js');
var Brivo      = require('../classes/access_control/brivo.js');
var PtiStorLogix      = require('./access_control/pti_stor_logix.js');
var External      = require('./access_control/external.js');
var Upload      = require('../classes/upload.js');
var Category      = require('../classes/category.js');
var Connection      = require('../classes/connection.js');
var Cash      = require('../classes/payment_methods/cash.js');
var Check      = require('../classes/payment_methods/check.js');
var GiftCard = require(__dirname +'/../classes/payment_methods/gift_card.js');
var Product      = require('../classes/product.js');
var Accounting      = require('../classes/accounting.js');
var AccountingTemplate = require('../classes/accounting/accounting_template.js');
const Enums = require(__dirname + '/../modules/enums');
