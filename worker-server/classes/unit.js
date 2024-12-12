"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Unit {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.property_id = data.property_id || null;
		this.category_id = data.category_id || null;
		this.product_id = data.product_id || null;
		this.address_id = data.address_id || null;
		this.number = data.number || null;
		this.floor = data.floor || null;
		this.type = data.type || null;
		this.description = data.description || null;
		this.price = data.price || null;
        this.set_rate = data.set_rate || null
		this.featured = data.featured || 0;
		this.available_date = data.available_date || null;
		this.active = data.active || 0;
		this.status = data.status || 1;
		this.template_id = data.template_id || null;
		this.x = data.x || null;
		this.y = data.y || null;
		this.rotate = data.rotate || null;
		this.invert = data.invert || null;
		this.left = data.left || null;
		this.top = data.top || null;
		this.hold_token = data.hold_token || null;
		this.msg = '';
		this.state = '';
		this.Address = {};
		this.Utilities = [];
		this.Amenities = {};
		this.Category = {};
		this.Product = {};
		this.Images = [];
		this.Lease =  null;
		this.Leases = [];
		this.Pending =  null;
		this.Leases =  [];
		this.Property =  [];
		this.Floorplan = [];
		this.Promotions = [];
		this.label = '';
		this.space_mix_id = null;
		this.unit_group_id = data.unit_group_id || '';

	}

	find(connection, api){

		return Promise.resolve().then(() =>  {
			if (!this.id && (!this.number || !this.property_id)) e.th(500 , 'Unit id not set');

			if(this.id) return models.Unit.findById(connection, this.id);
			if(this.number && this.property_id) return models.Unit.findByNumber(connection, this.number, this.property_id);

		}).then( unit => {

			if (!unit) e.th(404 , 'Unit not found');
			this.id = unit.id;
			this.property_id = unit.property_id;
			this.category_id = unit.category_id;
			this.product_id = unit.product_id;
			this.address_id = unit.address_id;
			this.number = unit.number;
			this.floor = unit.floor;
			this.type = unit.type;
			this.description = unit.description;
            this.retail_price = unit.set_rate
            this.set_rate = unit.set_rate
            this.default_price = unit.set_rate
			this.featured = unit.featured;
			this.available_date = unit.available_date;
			this.active = unit.active;
			this.status = unit.status;
			this.template_id = unit.template_id;
			this.hold_token = unit.hold_token;
			this.x = unit.x;
			this.y = unit.y;
			this.modified = unit.modified;
			this.rotate = unit.rotate;
			this.invert = unit.invert || null;
			this.left = unit.left || null;
			this.top = unit.top || null;
			this.next_lease_start = null;
			this.label = unit.label;
			this.created = unit.created;
			this.deleted = unit.deleted;

			return this.setPrice(connection,api);
		});

	}

	build(){
		var _this = this;
		return Promise.resolve().then(function() {
			return this.getFloorplan(connection);
		}).then(() => {
			return this.getImages(connection);
		}).then(() => {
			return this.getCurrentLease(connection);
		}).then(() => {
			return this.getAddress(connection);
		}).then(() => {
			return this.getHold(connection);
		}).then(() => {
			return this.getFeatures(connection);
		}).then(() => {
			return this.getAmenities(connection);
		}).then(() => {
			this.setState();
			return true;
		})
	}

	getFloorplan(connection, company_id){
		return models.Document.findDocumentTypeByName(connection,  'floorplan', company_id)
			.then(dt =>  {
				console.log(dt);
				if(!dt) return [];
				return models.Upload.findByEntity(connection, 'unit', this.id, dt.id)
			})
			.mapSeries(file => {
				var upload = new Upload({id: file.upload_id});
				return upload.find(connection).then(() => upload);
			}).then(files => {
				this.Floorplan = files;
				return;
			})
	}

	getImages(connection, company_id){

		return models.Document.findDocumentTypeByName(connection,  'image', company_id)
			.then(dt =>  {
				if(!dt) return [];
				return models.Upload.findByEntity(connection, 'unit', this.id, dt.id)
			})
			.mapSeries(file => {
				var upload = new Upload({id: file.upload_id});
				return upload.find(connection).then(() => upload);
			}).then(files => {
				this.Images = files;
				return;
			})
	}

	getHold(connection){
		return models.Unit.getHold(connection, this.id).then(hold => {
			this.hold_token =  hold ? hold.id: null;
		})
	}

	async getActiveOverlock(connection){
		return  await models.Unit.getActiveOverlock(connection, this.id);
	}
	
	removeHold(connection){
		if(!this.hold_token){
			throw "Hold token not set";
		}
		return models.Unit.removeHold(connection, this.hold_token);
	}

	getAddress(connection){
		return models.Address.findById(connection, this.address_id).then(address => {
			this.Address = address || null;
		});
	}

	getCategory(connection){
		if (!this.id) throw new Error('Unit id not set');
		if (!this.category_id) return;

		return models.UnitCategory.findById(connection, this.category_id).then(category => {

			this.Category = category || {};
			return true;
		})

	}

	getAmenities(connection){
		return models.Amenity.findUnitAmenityNames(connection, this.id, this.type).then( amenities => {
			this.Amenities = amenities
		})
	}

	getFeatures(connection){
		return models.Amenity.findUnitFeatureNames(connection,  this.id, this.type).then(features => {
			for (var feature in features) {
				if (features.hasOwnProperty(feature)) {
					this[feature.toLowerCase()] = features[feature];
				}
			}
		})
	}

	getUtilities(connection) {
		var _this = this;

		return Promise.resolve().then(function() {
			if(!_this.id) throw "Unit id not set.";
			return models.Unit.getUtilities(connection, _this.id);
		}).then( utilities => {
			_this.Utilities = utilities;
			return true;
		});

	}

	saveUtility(connection, utility){

		if(!this.id) throw "Unit id not set.";

		utility.unit_id = this.id;
		return models.Unit.saveUtility(connection, utility);
	}

	save(connection){
		var _this = this;
		return Promise.resolve().then(function() {
			return _this.validate(connection);
		}).then(function() {
			var save = {
				property_id: _this.property_id,
				category_id: _this.category_id,
				address_id: _this.address_id,
				number: _this.number,
				floor: _this.floor,
				type: _this.type,
				description: _this.description,
				price: _this.price,
				featured: _this.featured,
				lease_duration: _this.lease_duration,
				lease_duration_type: _this.lease_duration_type,
				available_date: _this.available_date,
				terms: _this.terms,
				active: _this.active,
				status: _this.status,
				template_id: _this.template_id,
				security_deposit: _this.security_deposit
			};

			return models.Unit.save(connection, save, _this.id).then(function (result) {
				console.log(result);

				if (result.insertId) _this.id = result.insertId;
				return true;
			});

		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})

	}

	validate (connection){
		var errors = [];
		var _this = this;

		return Promise.resolve().then(function(){
			return models.Unit.findDuplicate(connection, _this.number, _this.property_id).then(function(existing){
				console.log(existing);
				if(existing.length) return existing[0];
				return false;
			});
		}).then(function(existing){
			if(existing && existing.id != _this.id){
				throw "This unit number has already been entered.";
			}

			if(!_this.type) throw "Please select a unit type";

			switch(_this.type){
				case 'residential':
					return _this.validateResidential();
					break;
				case 'storage':
					return _this.validateStorage();
					break;
				case 'commercial':
					return _this.validateCommercial();
					break;
				default:
					throw 'No unit type specified';
					return
			}
		});
	}

	validateResidential(body){
		var errors = [];

		// if(!this.beds || !validator.isFloat(this.beds)) throw "Please enter the number of beds";
		// if(!this.baths || !validator.isFloat(this.baths)) throw "Please enter the number of baths";
		if(!this.number || validator.isEmpty(this.number.toString())) throw "Please enter a unit number";
		if(!this.price || !validator.isFloat(this.price.toString())) throw "Please enter rent for this unit";

		return true
	}

	validateStorage(body){
		var errors = [];
		//if(typeof this.height != 'undefined' && !validator.isFloat(this.height)) errors.push("Height must be a number");
		if(!this.number || validator.isEmpty(this.number)) throw "Please enter a unit number";
		// if(!this.width || !validator.isFloat(this.width)) throw "Please enter the width of the unit";
		// if(!this.length || !validator.isFloat(this.length)) throw "Please enter the length of the unit";
		if(!this.price || !validator.isFloat(this.price.toString())) throw "Please enter rent for this unit";

		return true
	}

	validateCommercial(){

		throw "this unit type is not yet supported";
	}

	getCurrentLease(connection, date){

		if(!this.id) throw "Unit id not set";
		return models.Lease.findCurrentByUnitId(connection, this.id, date).then(l => {
			if(!l) return false;
			var l = new Lease(l);
			return l.find(connection).then(() => {
				return l.getReservation(connection);
			}).then(() => {

				this.Lease = l;

				return this.Lease;
			});
		})

	}

	getPendingLease(connection, date){

		if(!this.id) throw "Unit id not set";
		return models.Lease.findPendingByUnitId(connection, this.id).then(l => {
			if(!l) return false;
			var l = new Lease(l);
			return l.find(connection).then(() => {
				this.Pending = l;
				return true;
			});
		})

	}

	setState(){

		// lease.status 1 = leased
		// lease.status 2 = pending
		// lease.status 0 = reserved - with active reservation

		// unit.status = 0 - offline;
		// unit.status = 1 - available_date > today "not available" ;
		// unit.status = 1 - available_date <= today && this.hold_token "hold" ;

		// else available

		this.state = 'available';

		if(this.Lease){
			if(this.Lease.status == 1) this.state = 'leased';
			if(this.Lease.status == 2) this.state = 'pending';
			if(this.Lease.status == 0 && this.Lease.Reservation && moment(this.Lease.Reservation.expires).format('x') >= moment().format('x')){
				this.state = 'reserved';
			}
		} else {
			if(this.status == 0) {
				this.state = 'offline';
			} else if(this.status == 1 && moment(this.available_date, 'YYYY-MM-DD').startOf('day').format('x') > moment().startOf('day').format('x')){
				this.state = 'not available';
			} else if(moment(this.available_date, 'YYYY-MM-DD').startOf('day').format('x') <= moment().startOf('day').format('x') && this.hold_token) {
				this.state = 'on hold';
			} else {
				this.state = 'available';
			}
		}

		return Promise.resolve();

	}

	canRent(start_date, hold_token, reservation){

		start_date = start_date || moment();

		if(
			this.Lease &&
			(
				this.Lease.end_date == null ||
				moment(this.Lease.end_date).startOf('day').format('x') > start_date.format('x')
			) &&
				moment(this.Lease.start_date).startOf('day').format('x') <= start_date.format('x') &&
			this.Lease.status > 0
		){
			var error = new Error("This unit is currently leased");
			error.code = 409;
			throw error;
		}

		var availableMoment = moment(this.available_date, 'YYYY-MM-DD');
		if(availableMoment.format('x') > start_date.format('x') ){

			var error = new Error("This unit is not available to rent until: " + moment(this.available_date, 'YYYY-MM-DD').format('MM/DD/YYYY'));
			error.code = 409;
			throw error;

		}

		if(this.state == 'offline'){
			var error = new Error("This unit is currently offline");
			error.code = 409;
			throw error;

		}

		if(this.state == 'on hold' && hold_token != this.hold_token){

			var error = new Error("This unit is currently being held by another customer");
			error.code = 409;
			throw error;
		}


		if(this.state == 'reserved' && (!reservation || reservation.Lease.unit_id != this.id)){
			var error = new Error("This unit has been reserved");
			error.code = 409;
			throw error;
		}

		return true;

	}

	rentUnit(connection, api, params, template, company_id, reservation, save){

		if(!this.id) throw "Unit id not set";
		var _this = this;
		var rentPrice = '';
		var billableServices = [];
		var leaseServices = [];
		var reservationServices = [];
		var applicationServices = [];
		var discount = {};
		var start_date = params.start_date ?  moment(params.start_date).startOf('day') : moment().startOf('day');

		var lease = new Lease();
		var invoice = {};
		var reservationInvoice = {};
		var applicationInvoice = {};

		var non_prorate_services_start = moment(Math.min(...[start_date.format('x'), moment().format('x')]), 'x');

		// get Rent Info
		// get Security Deposit Info
		// get Tax Info
		// get Product Info for each product in template


		return Promise.resolve()
			.then(() => {
				if(!reservation){
					rentPrice = this.price;
					return true;
				}
				lease = reservation.Lease;
				rentPrice = reservation.Lease.rent;
				return true;
			})
			.then(() => this.canRent(start_date, params.hold_token, reservation))
			.then(() => {
				// Set Lease Params
				// Start & End
				lease.start_date =  start_date.clone().format('YYYY-MM-DD');

				if(template){
					if(!template.lease_type || template.lease_type.toLowerCase() == 'month to month') {
						lease.end_date = null;
					} else if(template.lease_type.toLowerCase() == 'fixed length' ){
						if(template.lease_duration && template.lease_duration_type){
							lease.end_date = start_date.clone().add(template.lease_duration, template.lease_duration_type);
						} else if(_this.lease_duration && _this.lease_duration_type)  {
							lease.end_date = start_date.clone().add(_this.lease_duration, _this.lease_duration_type);
						}
					} else {
						lease.end_date = null;
					}
				}

			// Bill Day
			lease.unit_id = _this.id;
			lease.bill_day = (template.bill_day == 'anniversary') ? lease.start_date.clone().format('D') : 1;
			lease.send_invoice = template.email_statement || 1;
			lease.terms = template.terms || 1;
			lease.rent = rentPrice;
			lease.security_deposit = template.security_deposit_months ? (rentPrice * template.security_deposit_months) :
				(_this.security_deposit) ? _this.security_deposit: null;

			lease.monthly = lease.end_date == null ? 1 : 0;
			//lease.promotion_id = params.promotion_id;
			lease.notes = params.comments;
			lease.code = params.gate_code;
			lease.status = (params.type == 'lease') ? 2 : 0;


			if(!save) return true;
			return lease.save(connection, params.hold_token, params.reservation_id);

		}).then(() => {

			return models.Product.findRentProduct(connection, company_id)
				.then(product => {
					product.taxable = template.tax_rent;
					product.prorate = template.prorate_rent;
					return product;
				})
				.then(product => _this.buildService(connection, lease, product, lease.start_date, lease.end_date, lease.rent, 1, product.prorate, 1, 'lease', save))
				.then(s => {
					leaseServices.push(s);

					if(save == 'lease'){
						billableServices.push(s);
					}
					return true;
				})
		}).then(() => {
			// TODO should security deposit be due before lease starts?  maybe bill date should be today.
			if(!lease.security_deposit) return true;
			return models.Product.findSecurityDepositProduct(connection, company_id)
				.then(product => _this.buildService(connection, lease, product, non_prorate_services_start.format('YYYY-MM-DD'), non_prorate_services_start.format('YYYY-MM-DD'), lease.security_deposit, 1, 0, 0, 'lease', save))
				.then(s => {
					leaseServices.push(s);
					if(save == 'lease'){
						billableServices.push(s);
					}
					return true;
				});
		}).then(() => {

			if(!template.Services) return true;
			return Promise.mapSeries(template.Services, function(service){

				if(service.optional) return;
				var s = new Service({
					lease_id: lease.id,
					product_id: service.product_id,
					price: service.price,
					qty: service.qty,
					start_date: lease.start_date,
					end_date: (service.recurring)? null: lease.start_date,
					recurring: service.recurring,
					prorate: service.prorate,
					service_type: service.service_type,
				});

				if(service.recurring){
					s.start_date = lease.start_date;
					s.end_date = null;
				} else {
					s.start_date = non_prorate_services_start.format('YYYY-MM-DD');
					s.end_date =  non_prorate_services_start.format('YYYY-MM-DD');
				}

				if(service.service_type == 'insurance'){
					s.name = service.Insurance.name;
					s.Product = service.Insurance;
					s.taxable = service.Insurance.taxable;
				} else {
					s.name = service.Product.name;
					s.Product = service.Product;
					s.taxable = service.Product.taxable;
				}

				if(service.service_type == 'lease'){
					leaseServices.push(s);
				} else if(service.service_type == 'application'){
					applicationServices.push(s);
				} else if(service.service_type == 'reservation'){
					reservationServices.push(s);
				}

				if(!save) return true;
				s.lease_id = lease.id;
				if(save == s.service_type){
					return s.save(connection).then(() => {
						billableServices.push(s);
						return true;
					});
				}
			});

		}).then(() => {

			//*********************************//
			//**** Add Additional Products ****//
			//*********************************//

			// TODO Should additional products be billed today or when lease starts?
			// TODO Additional reservation costs, or costs due before, like application fee, should be due today

			if(!params.products.length) return true;

			return Promise.mapSeries(params.products,  p => {

				return models.Product.findById(connection, p.product_id, company_id)
					.then(product => _this.buildService(connection, lease, product, non_prorate_services_start.format('YYYY-MM-DD'), non_prorate_services_start.format('YYYY-MM-DD'),  product.price, p.qty, product.prorate, 0, 'lease', save))
					.then(s => {
						leaseServices.push(s);
						if(save == 'lease'){
							billableServices.push(s);
						}
						return true;
					})
			});

		}).then(() => {

			//*********************************//
			//**** Add Insurance Products  ****//
			//*********************************//

			if(!params.insurance_id) return true;

			var insurance = new Insurance({id: params.insurance_id, company_id: company_id});

			return insurance.find(connection).then(() => {

				insurance.setPremium(lease.rent);

				return models.Product.findById(connection, insurance.product_id, company_id)
					.then(product => _this.buildService(connection, lease, product, lease.start_date, null,  insurance.premium, 1, insurance.prorate, 1, 'lease', save))
					.then(s => {
						leaseServices.push(s);
						if(save == 'lease'){
							billableServices.push(s);
						}
						return true;
					});
			})

		}).then(() => {

			if (!params.promotions.length ) return true;

			return Promise.mapSeries(params.promotions, p => {

				var promotion = new Promotion({
					id: p.promotion_id
				});
				return promotion.find(connection)
					.then(() => promotion.verifyAccess(company_id))
					.then(() => {
						discount = new Discount({
							promotion_id: p.promotion_id,
							lease_id: lease.id,
							company_id: company_id
						});
						lease.Discounts = [];
						return discount.makeFromPromotion(connection, lease)
					})
					.then(()=>{

						lease.Discounts.push(discount);

						console.log('XXXXX', lease.Discounts)
						console.log('XXXXX', discount)
						console.log('XXXXX', save);
						if(!save) return true;

						console.log('XXHEREXXX');

						return discount.save(connection);
					});
			})

		}).then(() => {

			// If we are saving, generate the invoice based on billable services,
			// If not, calculate lease charges, application charges, and reservation charges.

			if(save){
				if(!billableServices.length) return true; // throw "This lease has no billable services";
				return _this.generateInvoice(connection,lease, company_id, billableServices, params.billed_months, true).then(i =>{
					invoice = i;
					return true;
				})
			} else {

				if(!leaseServices.length) throw new Error(lease.msg);
				return _this.generateInvoice(connection,lease, company_id, leaseServices, params.billed_months, false)
					.then(i =>{
						invoice = i;


						if(!applicationServices.length) return true;
						return _this.generateInvoice(connection,lease, company_id, applicationServices, params.billed_months, false).then(i => {
							applicationInvoice = i;
							return true;
						});
					}).then(() => {

						if(!reservationServices.length) return true;
						return _this.generateInvoice(connection,lease, company_id, reservationServices, params.billed_months, false).then(i => {
							reservationInvoice = i;
							return true;
						});
					});
			}

		}).then(() => {


			if(!save || !lease.end_date) return true;
			if (moment(_this.available_date) < moment()) {
				return _this.save(connection, { available_date: end_date});
			}
		}).then(() => {
			return {
				lease: lease,
				invoice: invoice,
				applicationInvoice: applicationInvoice,
				reservationInvoice: reservationInvoice
			};
		})

	}

	//  non recurring starts and end on today or lease start, whichever is eariler
	// recurring starts on lease start


	buildService(connection, lease, product, start, end, price, qty, prorate, recurring, type, save){

		return Promise.resolve().then(() => {
			var service = {
				start_date : start,
				end_date : end,
				price : price,
				qty : qty,
				prorate : prorate,
				recurring : recurring,
				name: product.name,
				product_id : product.id,
				Product : product,
				service_type: type,
				taxable: product.taxable
			};

			if(!save) return new Service(service);
			service.lease_id = lease.id;
			console.log("service", service);
			var s = new Service(service);
			if(!save || save != s.service_type) return s;
			return s.save(connection).then(() => {
				return s;
			});
		})
	}

	async generateInvoice(connection, lease, company_id, services, billed_months, save) {
		let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
		var invoice = new Invoice({
			lease_id: lease.id,
			user_id: null,
			date: moment(datetime).format('YYYY-MM-DD'),
			due: moment(datetime).format('YYYY-MM-DD'),
			company_id: company_id
		});

		invoice.Lease = lease;
		invoice.company_id = company_id;
		var invoicePeriod = {}
		let leaseGenerated = false;
		return lease.getLastBillingDate(connection)
			.then(lastBillingDate => {
				var lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : null;

				// Find Invoice start and end dates.
				invoicePeriod = lease.getCurrentInvoicePeriod(connection,lastBilled, billed_months,leaseGenerated);
				// For a given invoice period, find:
				// invoice.period_start = billing_period_start.format('YYYY-MM-DD');
				// invoice.period_end = billing_period_end.format('YYYY-MM-DD');

				return invoice.makeFromServices(
					connection,         // connection
					services,   // services
					lease,              // services
					invoicePeriod.start,
					invoicePeriod.end,
					lease.Discounts // discounts
				)
			}).then(() => {
				if(!invoice.InvoiceLines.length || !save) return true;
				return invoice.save(connection);
			})
			.then(() => invoice.total())
			.then(() => invoice );
	}

	setPrice(connection, api_id){
		//  calculate price here based on overrides/adjustments, etc
		return models.Unit.findApiUnitPrices(connection, this.id, api_id).then(rule => {
			if(!rule) return true;
			this.price = this.calculatePriceAdjustment(rule);
			return true;
		})

	}

	calculatePriceAdjustment(rule){

		if(rule.change_type == "$"){
			return +this.price + +this.rule.change;
		} else if (rule.change_type == "%"){
			return +this.price + +(this.price * rule.change / 100);
		}

	}

	saveApiUnitPrice(connection, rule, rule_id){
		rule.unit_id = this.id;
		return models.Unit.saveApiUnitPrice(connection, rule, rule_id);

	}



	verifyAccess(connection, company_id){

		if(!this.id) throw "Unit id not set";
		return models.Unit.findCompany(connection, this.id).then(cid => {
			console.log("CID", cid)
			console.log("company_id", company_id);

			if(cid !== company_id) {
				var error = new Error("Not authorized");
				error.code = 403;
				throw error;
			}
			return true;
		})
	}


	async setOverlock(connection){
		
		if(!this.id) e.th(500, "Unit id not set");
		if(!this.property_id) e.th(500, "property id not set");
		
		let overlock = await models.Unit.getActiveOverlock(connection, this.id);
		if(overlock) e.th(409, "Unit is already locked");

		// most times this will be already generated and set, but if its not we need to build the property access object. 
		if(!this.Property.id){
			this.Property = new Property({ id: this.property_id });
			await this.Property.find(connection);
		}
		
		if(!this.Property.Access.access_id){
			await this.Property.getAccessControl(connection);
		}
	
		if(this.Property.Access.access_name.toLowerCase() === 'noke'){
		
			await this.Property.Access.overlock(this.Property.id, this.id);			
		}

		let newOverlock = {
			unit_id: this.id,
			status: 1,
			created: moment.utc().toDate(),
			modified: null
		};

		// add new overlock
		await models.Unit.addOverlock(connection, newOverlock);
	}

	async removeOverlock(connection){
		if(!this.id) return e.th(500, "Unit id not set");
		var overlock = await models.Unit.getActiveOverlock(connection, this.id);
		if(!overlock){
			e.th(404, 'Overlock not found');
		}

		overlock.status = 0;
		overlock.modified = moment.utc().toDate();
		await models.Unit.removeOverlock(connection, overlock);

		if(!this.Property.id){
			this.Property = new Property({ id: this.property_id });
			await this.Property.find(connection);
		}
		
		if(!this.Property.Access.access_id){
			await this.Property.getAccessControl(connection);
		}
	
		if(this.Property.Access.access_name.toLowerCase() === 'noke'){
			try {
				await this.Property.Access.removeOverlock(this.Property.id, this.id);
			} catch (error) {
				console.error("An error occurred:", error);
			}
		}
	}

	async setSpaceMixId(connection, get_amenities = true){
		if(get_amenities) await this.getAmenities(connection, true);
		let unitTypeId = Enums.SPACETYPE[this.type.toUpperCase()];
		this.space_mix_id = utils.base64Encode(`${unitTypeId},${this.category_id},${this.width},${this.length},${this.height}`);
	}

	async getProperty(connection){
		this.Property = new Property({id: this.property_id})
		await this.Property.find(connection);
	}

	static async findAll(connection, params){
		let units = models.Unit.findAll(connection, params);
		return units;
	}

}

module.exports = Unit;
var Upload      = require('../classes/upload.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Insurance = require(__dirname + '/../classes/insurance.js');
var Promotion = require(__dirname + '/../classes/promotion.js');
var Service = require(__dirname + '/../classes/service.js');
var Reservation = require(__dirname + '/../classes/reservation.js');
var Enums = require(__dirname + '/../modules/enums.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Property = require(__dirname + '/../classes/property.js');