"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Enums = require(__dirname + '/../modules/enums.js');
var utils    = require(__dirname + '/../modules/utils.js');
var { updateGdsUnitPrice } = require('../modules/messagebus_subscriptions');
var Hashes = Hash.init();
var { isEqual } = require("lodash")
var refreshUnitGroup = require(__dirname + '/../modules/refresh_unit_group.js');

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
    this.modified_by = data.modified_by || null;
    this.created_by = data.created_by || null;

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
      this.modified_by = unit.modified_by;
      this.created_by = unit.created_by;

			return this.setPrice(connection,api);
		});

	}

	static async findAll(connection, params){
		let units = models.Unit.findAll(connection, params);
		return units;
	}

	// async getSpaceLevel(connection){
	// 	if(!this.id) throw "Unit id not set";
  
	// 	await this.find(connection);
  
	// 	let accessControl = new AccessControl(connection.meta);
	// 	let spaceLevel = await accessControl.getSpace(this.property_id, this.id);
  
	// 	if(spaceLevel){
	// 	  this.soft_catch = spaceLevel.soft_catch;
	// 	  this.late_catch = spaceLevel.late_catch;
	// 	  this.hard_catch = spaceLevel.hard_catch;
	// 	  this.pin = spaceLevel.pin;
	// 	}
	//   }

	build(connection, company_id){

		return Promise.resolve().then(() => {
			return this.getFloorplan(connection, company_id);
		})
		.then(() => this.getImages(connection, company_id))
		.then(() => this.getCurrentLease(connection))
		.then(() => this.getNextLeaseStart(connection))
		.then(() => this.getAddress(connection))
		.then(() => this.getHold(connection))
		.then(() => this.getFeatures(connection))
		.then(() => this.getAmenities(connection))
		.then(() => {
			this.setState(connection);
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

	async getImages(connection, company_id){

		let document_type =  await models.Document.findDocumentTypeByName(connection,  'image', company_id);
		if(!document_type) return false;

		let files = await models.Upload.findByEntity(connection, 'unit', this.id, document_type.id);
		let uploads = [];
		for(let i = 0; i < files.length; i++ ){
			let upload = new Upload({id: files[i].upload_id});
			await  upload.find(connection);
			uploads.push(upload);

		}

		this.Images = uploads;

	}

	async getProduct(connection){

	  if(!this.product_id) e.th(500, "Product id not set");
	  this.Product = new Product({id: this.product_id});
	  await this.Product.find(connection);


  }

	getHold(connection){
		return models.Unit.getHold(connection, this.id).then(hold => {
			this.hold_token =  hold ? hold.id: null;
		})
	}

	async setHold(connection){
		if(!this.id) e.th(500);
		return await models.Unit.setHold(connection, this.id)
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

	async getCategory(connection){
		if (!this.id) throw new Error('Unit id not set');
		if (!this.category_id) return;

		this.Category = new Category({id: this.category_id});
		await this.Category.find(connection);
		await this.Category.getAmenities(connection);
	}

	getAmenities(connection, all=false){
		if(all){
			return models.Amenity.findUnitAll(connection, this.id, this.type).then(amenities => {
				this.Amenities = amenities;
			});
		}
		return models.Amenity.findUnitAmenityNames(connection,  this.id, this.type).then( amenities =>{
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

		if(!this.id) e.th(500, "Unit id not set.");

		return models.Unit.getUtilities(connection, this.id)
			.then( utilities => {
				this.Utilities = utilities;
				return true;
		});

	}

	saveUtility(connection, utility){

		if(!this.id) throw "Unit id not set.";

		utility.unit_id = this.id;
		return models.Unit.saveUtility(connection, utility);
	}

	async deleteUtility(connection, utility_id){
		return await models.Unit.deleteUtility(connection, utility_id);
	}

	async save(connection, modified_by){

		await this.validate(connection);
    
    if(this.id)
    {
      modified_by = connection?.meta?.contact_id ;
    }
		
    var save = {
			property_id: this.property_id,
			category_id: this.category_id,
			product_id: this.product_id,
			address_id: this.address_id,
			number: this.number,
			floor: this.floor,
			type: this.type,
			description: this.description,
			//price: this.price,
			featured: this.featured || 0,
			lease_duration: this.lease_duration,
			lease_duration_type: this.lease_duration_type,
			available_date: this.available_date,
			terms: this.terms,
			active: this.active,
			status: this.status,
			template_id: this.template_id,
			security_deposit: this.security_deposit,
			x: this.x,
			y: this.y,
			rotate: this.rotate,
			invert: this.invert || 0,
			left: this.left,
			top: this.top,
      modified_by:modified_by,
		};

		let result = await models.Unit.save(connection, save, this.id);
		if (result.insertId) this.id = result.insertId;

		await this.updatePriceChange(connection, modified_by);
	}

	update(data){
		if(typeof data.number !== 'undefined') this.number = data.number || '';
		if(typeof data.floor !== 'undefined') this.floor = data.floor || '';
		if(typeof data.type !== 'undefined') this.type = data.type || '';
		if(typeof data.description !== 'undefined') this.description = data.description || '';
		if(typeof data.price !== 'undefined') this.price = data.price;
		if(typeof data.featured !== 'undefined') this.featured = data.featured || 0;
		if(typeof data.lease_duration !== 'undefined') this.lease_duration = data.lease_duration || '';
		if(typeof data.lease_duration_type !== 'undefined') this.lease_duration_type = data.lease_duration_type || '';
		if(typeof data.available_date !== 'undefined') this.available_date = data.available_date;
		if(typeof data.terms !== 'undefined') this.terms = data.terms;
		if(typeof data.active !== 'undefined') this.active = data.active || 0;
		if(typeof data.status !== 'undefined') this.status = data.status;
		if(typeof data.security_deposit !== 'undefined') this.security_deposit = data.security_deposit || '';
		if(typeof data.x !== 'undefined') this.x = data.x === null ? null : data.x;
		if(typeof data.y !== 'undefined') this.y = data.y === null ? null : data.y;
		if(typeof data.rotate !== 'undefined') this.rotate = data.rotate || null;
		if(typeof data.invert !== 'undefined') this.invert = data.invert || '';
		if(typeof data.left !== 'undefined') this.left = data.left || '';
		if(typeof data.top !== 'undefined') this.top = data.top || '';
	}

	async validate (connection){

		  let existing = await models.Unit.findDuplicate(connection, this.number, this.property_id);

		  if (existing.length && existing[0].id != this.id){
        e.th(409, "A unit with this number already exists")
      };

		  if(!this.type) throw "Please select a unit type";

      switch(this.type){
        case 'residential':
          return this.validateResidential();
          break;
        case 'storage':
          return this.validateStorage();
          break;
        case 'commercial':
          return this.validateCommercial();
		  break;
		case 'parking':
          return this.validateParking();
          break;
        default:
          throw 'No unit type specified';
          return
      }
	}

	async updatePriceChange(connection, modified_by) {
		let latestPriceChange = await models.Unit.getLatestUnitPrice(connection, this.id);
		/**
		 * insert in case of a new entry, or if the existing prices (both set rate and sell rate) differ from the request body
		 */

		let updatedPrices = utils.pick(this, ['set_rate', 'price'])
		let existingPrices = utils.pick(latestPriceChange, ['set_rate', 'price'])
		let needsUpdate = !(isEqual(existingPrices, updatedPrices))

		if(!latestPriceChange || needsUpdate) {
			// set previous price change's end datetime
			if(latestPriceChange){
				await models.Unit.savePriceChangeEvent(connection,{
					end: moment().format('YYYY-MM-DD HH:mm:ss')
				}, latestPriceChange.id);
			}

			// set the new price change
			await models.Unit.savePriceChangeEvent(connection,{
				price: this.price,
				unit_id:  this.id,
				set_rate: this.set_rate,
				start: moment().format('YYYY-MM-DD HH:mm:ss'),
				modified_by
			});

			await updateGdsUnitPrice(connection, this.property_id,this.id, this.price);
		}
	}

	validateResidential(body){
		var errors = [];

		// if(!this.beds || !validator.isFloat(this.beds)) throw "Please enter the number of beds";
		// if(!this.baths || !validator.isFloat(this.baths)) throw "Please enter the number of baths";
		if(!this.number || validator.isEmpty(this.number.toString())) e.th(400, "Please enter a unit number");
		if(this.price == undefined || !validator.isFloat(this.price.toString())) e.th(400, "Please enter rent for this unit");

		return true
	}

	validateStorage(body){
		var errors = [];
		//if(typeof this.height != 'undefined' && !validator.isFloat(this.height)) errors.push("Height must be a number");
		if(!this.number || validator.isEmpty(this.number))  e.th(400, "Please enter a unit number");
		// if(!this.width || !validator.isFloat(this.width)) throw "Please enter the width of the unit";
		// if(!this.length || !validator.isFloat(this.length)) throw "Please enter the length of the unit";
		if(this.price == undefined || !validator.isFloat(this.price.toString())) e.th(400, "Please enter rent for this unit");

		return true
	}

	validateCommercial(){

		throw "this unit type is not yet supported";
	}


	validateParking(){

		var errors = [];

		// if(!this.beds || !validator.isFloat(this.beds)) throw "Please enter the number of beds";
		// if(!this.baths || !validator.isFloat(this.baths)) throw "Please enter the number of baths";
		if(!this.number || validator.isEmpty(this.number.toString())) e.th(400, "Please enter a unit number");
		if(this.price == undefined || !validator.isFloat(this.price.toString())) e.th(400, "Please enter rent for this unit");

		return true
	}

	async getCurrentLease(connection, date){

		if(!this.id) throw "Unit id not set";
		let lease = await models.Lease.findCurrentByUnitId(connection, this.id, date);
		if(!lease) return false;
		this.Lease = new Lease(lease);
		await this.Lease.find(connection);
		await this.Lease.getReservation(connection);
		await this.Lease.getTenants(connection);
		await this.Lease.getPaidThroughDate(connection)

		return this.Lease;
	}


	async getLeaseHistory(connection, date){

		if(!this.id) throw "Unit id not set";
		let lease_list = await models.Unit.getLeaseHistory(connection, this.id);
		let leases = [];

		for(let i = 0; i < lease_list.length; i++ ){
			let lease = new Lease(lease_list[i])
			await lease.find(connection);
			await lease.getTenants(connection);
			await lease.getActiveRent(connection); // This is to get latest rent of lease
			leases.push(lease);
		}
		this.Leases = leases;
		return leases;

	}

	async getPendingLease(connection, date){

		if(!this.id) throw "Unit id not set";
		let lease = await models.Lease.findPendingByUnitId(connection, this.id);
		if(!lease) return false;
		this.Pending = new Lease(lease);
		await this.Pending.find(connection);
		await this.Pending.getDiscounts(connection);
		await this.Pending.getPaymentCycleOptions(connection);
		await this.Pending.getActivePaymentCycle(connection);


		return this.Pending;
	}

	async getNextLeaseStart(connection) {
    if (!this.id) throw "Unit id not set";
    let lease = await models.Lease.findNextLease(connection, this.id);
    this.next_lease_start = lease ?  lease.start_date : null;

  	}

	async getProperty(connection){
		this.Property = new Property({id: this.property_id})
		await this.Property.find(connection);
	}

	async getGateStatus(connection){
		let gateStatus = await models.Unit.getGateStatus(connection, this.id);
		this.gate_status = gateStatus;
	}

	async setState(connection){
		// lease.status 1 = leased
		// lease.status 2 = pending
		
		// lease.status 0 = reserved - with active reservation

		// unit.status = 0 - offline;
		// unit.status = 1 - available_date > today "not available" ;
		// unit.status = 1 - available_date <= today && this.hold_token "hold" ;

		// else available
	let state = await  models.Unit.getState(connection, this.id);
	console.log("setState state", state)
	  this.state = state;
		switch(this.state.toLowerCase()){
      case "on hold":
        await this.getHold(connection);
        break;
      case "pending":
      case "reserved":
      case "leased":
      case "overlocked":
      case "remove overlock":
        await this.getCurrentLease(connection);
        break;
    }






    return;
		// this.state = 'available';
    //
		// if(this.Lease){
		// 	if(this.Lease.status == 1) this.state = 'leased';
		// 	if(this.Lease.status == 2) this.state = 'pending';
    //
		// 	if(this.Lease.status == 0 && this.Lease.Reservation && moment(this.Lease.Reservation.expires).format('x') >= moment().format('x')){
		// 		this.state = 'reserved';
		// 	}
		// } else {
		// 	if(this.next_lease_start) {
		// 		this.state = 'future leased';
		// 	} else if(this.status === 0) {
		// 		this.state = 'offline';
		// 	} else if(this.status === 1 && this.available_date && moment(this.available_date, 'YYYY-MM-DD').startOf('day').format('x') >= moment().startOf('day').format('x')){
		// 		this.state = 'not available';
		// 	} else if(this.available_date && moment(this.available_date, 'YYYY-MM-DD').startOf('day').format('x') <= moment().startOf('day').format('x') && this.hold_token) {
		// 		this.state = 'on hold';
		// 	} else {
		// 		this.state = 'available';
		// 	}
		// }

		return Promise.resolve();

	}

	// Be sure to call unit.setState first;
	async canRent(connection, start_date, hold_token, reservation_id, edit_lease){
		start_date = start_date || moment();
		if(!this.state){
        await this.setState(connection);
	  };

		let unit_state = this.state.toLowerCase();
		//console.log(unit_state);
		console.log("canRent sunit_state", unit_state)
		switch(unit_state){
      case "leased":
        e.th(409, "This unit is currently leased");
        break;
      case "reserved":
        // get reservation and validate
        console.log("reservation_id", reservation_id)

				if(!this.Lease) {
					e.th(409, "This reservation has been expired");
				}				
        console.log("this.Lease.Reservation", this.Lease.Reservation)
        if(!reservation_id || !this.Lease.Reservation || this.Lease.Reservation.id !== reservation_id){
          e.th(409, "This unit has been reserved");
        }
        break;
      case "on hold":
        if(hold_token !== this.hold_token){
          e.th(409, "This unit is currently being held by another customer");
        }
        break;
      case "offline":
        e.th(409, "This unit is currently offline");
        break;
      case "pending":
		if(!edit_lease)
        	e.th(409, "The current lease of this unit is pending");
        break;
      default:
        if(this.available_date){
          var availableMoment = moment(this.available_date, 'YYYY-MM-DD');
          if(availableMoment.format('x') > start_date.format('x') ){
            e.th(409, "This unit is not available to rent until: " + moment(this.available_date, 'YYYY-MM-DD').format('MM/DD/YYYY'));
          }
        }

        if(unit_state === 'future leased' && this.next_lease_start){
          e.th(409, `This unit is leased starting from: ${moment(this.next_lease_start, 'YYYY-MM-DD').format('MM/DD/YYYY')}`);
        }
    }

		return true;

	}

  async buildLease(connection, api, params, company_id, reservation, save, category_type) {

    if(!this.id) throw "Unit id not set";

    var rentPrice = '';
    var discount = {};

	const { auto_pay_after_billing_date: autoPayAfterBillingDate } = params;
	var start_date = params.start_date ?  moment(params.start_date).startOf('day') : moment().startOf('day');
	var end_date = params.end_date ? moment(params.end_date).startOf('day') : null;
    var lease = new Lease();
    var invoice = {};
    var applicationInvoice = {};
    var reservationInvoice = {};

    // Get Template
    await this.getProperty(connection);
    await this.Property.getTemplates(connection, this.type, category_type);
	let template = this.Property.LeaseTemplates[this.type].Template || {};
	template.is_transfer = params.is_transfer;

    // See if we can rent this unit at this time
    await this.canRent(connection, start_date, params.hold_token, params.reservation_id,params.edit_lease);

    var non_prorate_services_start = moment(Math.min(...[start_date.format('x'), moment().format('x')]), 'x');

	if(save && params.edit_lease && params.id) {
		let lease = new Lease({id: params.id});
		await lease.killServicesDiscountsAndCheckList(connection);
	}

    // If we have a lease, load it, otherwise build a default lease
    if(this.Lease){
		lease = this.Lease;
	} else {
		//*********************************//
		//**** Build Default Lease  ****   //
		//*********************************//

		lease = this.buildLeaseFromTemplateDefaults(start_date, template, params);
	}

	if(params?.id){
		lease.modified_by = params.user_id;
	}
	else {
		lease.created_by = params.user_id;
	}

	if(params.rent){
		lease.rent = params.rent;
	}

	if(params.security_deposit){
		lease.security_deposit = params.security_deposit;
	} else {
		lease.security_deposit = 0;
	}

	if(params.bill_day){
		lease.bill_day = params.bill_day;
	}
	if(end_date){
		lease.end_date = end_date.format('YYYY-MM-DD');
	}
	
	if(params.payment_cycle){
		lease.payment_cycle = params.payment_cycle;
	}
	

	lease.auto_pay_after_billing_date = autoPayAfterBillingDate ? autoPayAfterBillingDate : lease.auto_pay_after_billing_date;
    //*********************************//
    //**** Build Default Services  ****//
    //*********************************//
    var { leaseServices,
      // billableServices,
      reservationServices,
      applicationServices } = await this.buildLeaseServices(connection, template, lease, non_prorate_services_start, company_id, save);



    //*********************************//
    //**** Add Additional Products ****//
    //*********************************//

    for(let i = 0; i < params.products.length; i++){

		let existing_service = leaseServices.find(s=> s.product_id === params.products[i].product_id);
		if(existing_service)	continue;

		// if product already exists, overwrite if permissions allow,
		// otherwise add it
		let service = await this.addService(connection, params.products[i], lease, non_prorate_services_start, company_id, save)
		leaseServices.push(service);
		// if(save === 'lease'){
		//   billableServices.push(service);
		// }
    }

    //*********************************//
    //**** Add Insurance Products  ****//
    //*********************************//

    if(params.insurance_id){
      let service = await this.buildInsuranceProduct(connection, params.insurance_id, lease, company_id, save);
      leaseServices.push(service);
      // if(save === 'lease'){
      //   billableServices.push(s);
      // }
    }

    //*********************************//
    //******  Add Promotions  *********//
    //*********************************//

    lease.Discounts = await this.buildPromotions(connection, params.promotions, params.coupons, params.discount_id, lease, company_id );

    lease.Checklist = await this.buildLeaseChecklist(template.Checklist);

    return {
      leaseServices,
      applicationServices,
      reservationServices,
      // billableServices,
      lease,
      // invoice,
      // applicationInvoice,
      // reservationInvoice
    };
  }


  buildLeaseChecklist(checklist){
    if(!checklist) return [];
    let items = [];
    for(let i = 0; i <  checklist.length; i++){
      let t = checklist[i];
      let save = {
        checklist_item_id: t.id,
        name: t.name,
        document_type_id: t.document_type_id,
        document_id: t.document_id,
        description: t.description,
        completed: 0,
        sort: t.sort
      };
      items.push(save)
    }

    return items;
  }



//   async saveLease(connection, lease, hold_token, reservation_id, billed_months, leaseServices, reservationServices, applicationServices, invoices, company_id, save){
//
//     await lease.save(connection, hold_token, reservation_id);
//
// // TODO Save Discounts
//     for(let i = 0; i < lease.Discounts.length; i++){
//       await lease.Discounts[i].save(connection);
//     }
//
//     // let billableServices = [];
//     // switch(save){
//     //   case 'lease':
//     //     for(let i = 0; i < leaseServices.length; i++){
//     //       leaseServices[i].lease_id = lease.id;
//     //       await leaseServices[i].save(connection)
//     //       billableServices.push(leaseServices[i]);
//     //     }
//     //     break;
//     //   case 'reservation':
//     //     for(let i = 0; i < reservationServices.length; i++){
//     //       reservationServices[i].lease_id = lease.id;
//     //       await  reservationServices[i].save(connection)
//     //     }
//     //     break;
//     //   case 'application':
//     //     for(let i = 0; i < applicationServices.length; i++){
//     //       applicationServices[i].lease_id = lease.id;
//     //       await applicationServices[i].save(connection)
//     //     }
//     //     break;
//     // }
//     //
//     // let invoice = await this.generateInvoice(connection,lease, company_id, billableServices, billed_months, false);
//     // await invoice.save(connection);
//     // await invoice.total();
//
//
//     //*********************************//
//     //*****  Set Unit available Date  ********//
//     //*********************************//
//     if(save && lease.end_date){
//       if (moment(this.available_date) < lease.end_date) {
//         return this.save(connection, { available_date: lease.end_date});
//       }
//     }
//
//   }




  async buildPromotions(connection, promos, coupons, dscnt,  lease, company_id, save) {

	  let discounts = [];
    if(promos.length){
      lease.Discounts = [];
      for(let i = 0; i < promos.length; i++){
        let discount = await this.buildPromotion(connection, promos[i], null, lease, company_id);
        discounts.push(discount);
        if(save){
          return discount.save(connection);
        }
      }
    }

    if(coupons.length) {
      for(let i = 0; i < coupons.length; i++){
        let coupon = await Promotion.findCouponByCode(connection, coupons[i], company_id);
        if(!coupon) e.th(400, "Coupon not found");
        let discount = await this.buildPromotion(connection, null, coupon, lease, company_id, 'coupon');
        discounts.push(discount);
        if(save){
          return discount.save(connection);
        }
        discounts.push(discount);
      }
    }

    if(dscnt){
      let discount = await this.buildPromotion(connection,{promotion_id: dscnt}, null, lease, company_id);
      discounts.push(discount);

      if(save){
        return discount.save(connection);
      }
    }
	
    return discounts;

  }

  async buildPromotion(connection, promo, coupon, lease, company_id, type) {


    let  promotion = new Promotion({
      id: promo ? promo.promotion_id : coupon.promotion_id
    });
    await promotion.find(connection);
    await promotion.verifyAccess(company_id);
    let valid_promo = await promotion.validatePromotionOnUnit(connection, this.id);

    if(!valid_promo){
      e.th(400, "This promotion is not available for this unit");
    }

    if(coupon){
      await promotion.validateCoupon(connection, coupon);
    }
    let discount = new Discount({
      promotion_id: promotion.id,
      lease_id: lease.id,
      company_id: company_id
    });

    if(coupon){
      discount.coupon_id = coupon.id;
    }

    await discount.makeFromPromotion(connection, lease);
    return discount;
  }

  async addService(connection, p, lease, start, company_id, save){
	  // Get product price...
    let product = await models.Product.findById(connection, p.product_id, company_id)
    return await this.buildService(connection, lease, product, start.format('YYYY-MM-DD'), product.recurring ? null : start.format('YYYY-MM-DD'),  product.price, p.qty, product.prorate, product.prorate_out, product.recurring, 'lease', save);
  }

  async buildLeaseServices(connection, template, lease, non_prorate_services_start, company_id, save, ){

    let leaseServices = [], billableServices= [], reservationServices= [], applicationServices = [];

    // Build Rent
    // get Rent Product
    let rent_service = await this.buildRentProduct(connection, template, lease, save);
    leaseServices.push(rent_service);

    // if(save === 'lease'){
    //   billableServices.push(rent_service);
    // }

    // Build Security Deposit
    if(lease.security_deposit){
      let security_service = await this.buildSecurityProduct(connection, template, lease, non_prorate_services_start, company_id, save)
      leaseServices.push(security_service);
      // if(save === 'lease'){
      //   billableServices.push(security_service);
      // }
    }
    // Build Merchandise/Fees/Insurance
    if(!template.is_transfer && template.Services){
      for(let i = 0; i < template.Services.length; i++){
		if (template.Services[i].Product && template.Services[i].Product.category_type === 'transfer') {
			continue;
		}
        let service = await this.buildServiceProduct(connection, template.Services[i], template, lease, non_prorate_services_start, company_id, save);
        if(template.Services[i].service_type === 'lease'){
          leaseServices.push(service);
        } else if(template.Services[i].service_type === 'application'){
          applicationServices.push(service);
        } else if(template.Services[i].service_type === 'reservation'){
          reservationServices.push(service);
        }
        // if(save){
        //   service.lease_id = lease.id;
        //   if(save === service.service_type){
        //     return service.save(connection).then(() => {
        //       billableServices.push(service);
        //       return true;
        //     });
        //   }
        // }
      }
    }


    // Build Insurance
    return {
      leaseServices,
      billableServices,
      reservationServices,
      applicationServices
    }
  }

  async buildInsuranceProduct(connection, insurance_id, lease, company_id, save){
    var insurance = new Insurance({
      id: insurance_id,
      company_id: company_id
    });

    await insurance.find(connection);
    insurance.setPremium(lease.rent);
    let product = await models.Product.findById(connection, insurance.product_id, company_id)

    return await this.buildService(connection, lease, product, lease.start_date, null,  insurance.premium, 1, insurance.prorate, insurance.prorate_out, 1, 'insurance', save);
  }

  async buildRentProduct(connection, template, lease, save){
    await this.getProduct(connection);
    // this.Product.taxable = template.tax_rent;
    this.Product.prorate = template.prorate_rent;
    this.Product.prorate_out = template.prorate_rent_out;
    let s = await this.buildService(connection, lease, this.Product, lease.start_date, lease.end_date, lease.rent, 1, this.Product.prorate, this.Product.prorate_out, 1, 'lease', save);
    return s;
  }

  async buildSecurityProduct(connection, template, lease, non_prorate_services_start, company_id, save ){
	  let product =  await models.Product.findSecurityDepositProduct(connection, company_id);
    let s = await this.buildService(connection, lease, product, non_prorate_services_start.format('YYYY-MM-DD'), non_prorate_services_start.format('YYYY-MM-DD'), lease.security_deposit, 1, 0, 0, 0, 'lease', save);
    return s;
  }

  async buildServiceProduct(connection, service, template, lease, non_prorate_services_start, company_id, save ){

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
      prorate_out: service.prorate_out,
      service_type: service.service_type,
    });
    console.log("non_prorate_services_start", non_prorate_services_start);
    if(service.recurring){
      s.start_date = lease.start_date;
      s.end_date = null;
    } else {
      s.start_date = non_prorate_services_start.format('YYYY-MM-DD');
      s.end_date =  non_prorate_services_start.format('YYYY-MM-DD');
    }

    if(service.service_type === 'insurance'){
      s.name = service.Insurance.name;
      s.Product = service.Insurance;
      s.taxable = service.Insurance.taxable;
    } else {
      s.name = service.Product.name;
      s.Product = service.Product;
      s.taxable = service.Product.taxable;
    }

    return s;

  }

  buildLeaseFromTemplateDefaults(start_date, template, params){

	  let lease =  new Lease();
    start_date  = start_date || moment();

    if(template){
      if(!template.lease_type || template.lease_type.toLowerCase() === 'month to month') {
        lease.end_date = null;
      } else if(template.lease_type.toLowerCase() === 'fixed length' ){
        if(template.lease_duration && template.lease_duration_type){
          lease.end_date = start_date.clone().add(template.lease_duration, template.lease_duration_type).format('YYYY-MM-DD');
          // TODO test this.
        } else if(template.lease_duration && template.lease_duration_type)  {
          lease.end_date = start_date.clone().add(template.lease_duration, template.lease_duration_type).format('YYYY-MM-DD');
        }
      } else {
        lease.end_date = null;
      }
    }



    // Bill Day
	lease.rent = this.price;
    lease.unit_id = this.id;
	lease.start_date =  start_date.format('YYYY-MM-DD');
    lease.bill_day = (template.bill_day?.toLowerCase() === 'anniversary') ? start_date.clone().format('D') : 1;
    lease.send_invoice = params.send_invoice || template.email_statement || 0;
	lease.auto_pay_after_billing_date = template.auto_pay_after_billing_date || 0;

	// if(!params.is_transfer && template.security_deposit_type){

	// 	switch(template.security_deposit_type){
	// 		case 'fixed':
	// 			lease.security_deposit = template.deposit_amount;
	// 			 break;
	// 		case 'percent':
	// 			lease.security_deposit = this.price / template.deposit_amount * 100 
	// 			break;
	// 		case 'number':
	// 			lease.security_deposit = this.price * template.deposit_amount;
	// 			break;
	// 		default:
	// 			lease.security_deposit = this.security_deposit ? this.security_deposit : null
	// 	}
	// 	// lease.security_deposit = template.security_deposit_months ? (this.price * template.security_deposit_months) :
	// 	// 	(this.security_deposit) ? this.security_deposit: null;
	// }

    lease.monthly = lease.end_date == null ? 1 : 0;

    lease.promotions = params.promotions || [];
    lease.discount_id = params.discount_id;
    lease.notes = params.comments;
    lease.status = (params.type === 'lease') ? 2 : 0;

    return lease;
  }

	rentUnit(connection, { api, params, template, company_id, reservation, save, contact, override_prorate, token, unit, StepTimer = function(){} } = {}){

		if(!this.id) throw "Unit id not set";
		var _this = this;
		var rentPrice = '';
		var billableServices = [];
		var leaseServices = [];
		var reservationServices = [];
		var applicationServices = [];
		var discount = {};
		var seperateInvoices = false;
		var start_date = params.start_date ?  moment(params.start_date).startOf('day') : moment().startOf('day');

		var lease = new Lease();
		var invoice = [];
		var reservationInvoice = [];
		var applicationInvoice = [];
		const fetch_discounts = params?.fetch_discounts ?? true;

		var non_prorate_services_start = moment(Math.min(...[start_date.format('x'), moment().format('x')]), 'x');
		let leaseAutoPayAfterBillingDate = params.auto_pay_after_billing_date;

		// get Rent Info
		// get Security Deposit Info
		// get Tax Info
		// get Product Info for each product in template

		return Promise.resolve()
			.then(() => {
				if (token) {
					if (!reservation || !reservation.Lease) {
						rentPrice = token.price
						leaseAutoPayAfterBillingDate =
						leaseAutoPayAfterBillingDate == null ? template.auto_pay_after_billing_date : leaseAutoPayAfterBillingDate
						return true
					}
					lease = reservation.Lease
					rentPrice = token.price
					leaseAutoPayAfterBillingDate =
						leaseAutoPayAfterBillingDate == null
						? reservation.Lease?.auto_pay_after_billing_date
						: leaseAutoPayAfterBillingDate
					return true
				} else {
					if(!reservation || !reservation.Lease){
						rentPrice = params.rent || this.price;
						leaseAutoPayAfterBillingDate = leaseAutoPayAfterBillingDate == null ? template.auto_pay_after_billing_date : leaseAutoPayAfterBillingDate;
						return true;
					}
					lease = reservation.Lease;
					rentPrice =  params.rent || reservation.Lease.rent;
					leaseAutoPayAfterBillingDate = leaseAutoPayAfterBillingDate == null ? reservation.Lease?.auto_pay_after_billing_date : leaseAutoPayAfterBillingDate; 

					return true;
				}
			})
			.then(() => this.canRent(connection, start_date, params.hold_token, reservation.id))
			
			.then(() => {
				// Set Lease Params
				// Start & End

				lease.start_date =  start_date.clone().format('YYYY-MM-DD');
				if(template){
					if(!template.lease_type || template.lease_type.toLowerCase() === 'month to month') {
						lease.end_date = null;
					} else if(template.lease_type.toLowerCase() === 'fixed length' ){
						if(template.lease_duration && template.lease_duration_type){
							lease.end_date = start_date.clone().add(template.lease_duration, template.lease_duration_type).format('YYYY-MM-DD');
						} else if(_this.lease_duration && _this.lease_duration_type)  {
							lease.end_date = start_date.clone().add(_this.lease_duration, _this.lease_duration_type).format('YYYY-MM-DD');
						}
					} else {
						lease.end_date = null;
					}
				}

			// Bill Day
			lease.unit_id = _this.id;
			lease.bill_day = (template.bill_day.toLowerCase() === 'anniversary') ? parseInt(moment(lease.start_date).clone().format('D')) : 1;
			lease.send_invoice = template.email_statement || 1;
			lease.terms = template.terms || 1;
			lease.rent = rentPrice;
			 /* template.security_deposit_months ? (rentPrice * template.security_deposit_months) :
				(_this.security_deposit) ? _this.security_deposit: null; */

			if(reservation && reservation.id){
				lease.security_deposit = reservation.Lease && reservation.Lease.security_deposit;
			} else if (params.security_deposit || params.security_deposit === 0) {
				lease.security_deposit = params.security_deposit;
			} else {
				switch(template.security_deposit_type){
					case 'fixed':
						lease.security_deposit = template.deposit_amount;
							break;
					case 'percent':
						lease.security_deposit = (this.price * template.deposit_amount) / 100 
						break;
					case 'number':
						lease.security_deposit = this.price * template.deposit_amount;
						break;
					default:
						lease.security_deposit = this.security_deposit ? this.security_deposit : null
				}
			}

			// lease.payment_cycle = params.payment_cycle ? params.payment_cycle.label : null;
			lease.monthly = lease.end_date == null ? 1 : 0;
			lease.promotion_id = params.promotions.length ? params.promotions[0].promotion_id: null;
			lease.notes = params.comments;
			//lease.code = params.gate_code;
			lease.discount_id = params.discount_id;
			lease.created_by = contact.id;
			lease.status = (params.type === 'lease') ? 2 : 0;
			lease.auto_pay_after_billing_date = leaseAutoPayAfterBillingDate;
			lease.sensitive_info_stored =  params.sensitive_info_stored;
			lease.idv_id =  params?.idv_id ?? null;

			if(!save) return true;
			return lease.save(connection, params.hold_token, params.reservation_id);

		})		
		.then(async () => {
				
			// These are additional months. We need to add in the default month to bill for
			params.billed_months = params.billed_months || 1;

			if(params.payment_cycle){
	
				await template.findPaymentCycles(connection);
				let payment_cycle = template.payment_cycle_options.find(o => o.label.toLowerCase() === params.payment_cycle.toLowerCase())
				
				if(!payment_cycle) {
					e.th(400, "Invalid Payment Cycle");
				}
				// params.payment_cycle = payment_cycle.label;
				if(params.promotions.filter(p => p.promotion_id !== payment_cycle.promotion_id ).length){
					try {
						await utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['payment_cycle_promotions']});
					} catch(err){
						e.th(403, "Payment cycle promotions cannot be combined with other promotions");
					}
				}

				if(params.discount_id){
					try {
						await utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['payment_cycle_discounts']});
					} catch(err){
						e.th(403, "Payment cycle promotions cannot be combined with other discounts");
					}
				}
	

				if(params.promotions.filter(p => p.id !== payment_cycle.promotion_id ).length){
				//	e.th(409, 'Payment cycle promotions cannot be combined with other offers')
				}
				
				params.promotions.push({promotion_id: payment_cycle.promotion_id });

				// Calculating billed months according to Multi Month Payment Cycle.
			    params.billed_months = Math.ceil(params.billed_months / payment_cycle.period) * payment_cycle.period;
				
				if(params.billed_months > 0 && (params.billed_months % payment_cycle.period ) !== 0){
					e.th(409, `Payment Cycles must be billed in groups of ${payment_cycle.period}`);
				}

				await lease.getPaymentCycleOptions(connection); 
				lease.payment_cycle = params.payment_cycle ;
				
			}
			return true;

		})
		.then(async () => {

				  //*********************************//
				 //******* Revenue Management ******//
				//*********************************//

			if (token && lease.id) {
				let data = {
					tier_type: token.value_tier.type,
					lease_id: lease.id,
					offer_token: JSON.stringify(token),
					sell_rate: unit.price,
					set_rate: unit.set_rate
				}
				await lease.saveValuePrices(connection, data)
			}

			if (this.defaultRentPlanId && lease.id && params?.type === `lease`) {
				let assignRentPlanData = {
					rent_plan_id: this.defaultRentPlanId,
					property_id: unit?.property_id,
					created_contact_id: params?.user_id || null,
					status: `active`,
					start_date: new Date()
				}
				await lease.assignRentPlan(connection, assignRentPlanData);
			}

		}).then(async () => {
			let s = await this.buildRentProduct(connection, template, lease, save);

			// await this.getProduct(connection);
			// this.Product.taxable = template.tax_rent;
			// this.Product.prorate = template.prorate_rent;
			// this.Product.prorate_out = template.prorate_rent_out;
			// let s = await this.buildService(connection, lease, this.Product, lease.start_date, lease.end_date, lease.rent, 1, this.Product.prorate, this.Product.prorate_out, 1, 'lease', save)

			leaseServices.push(s);
			
			if(save === 'lease'){
				billableServices.push(s);
			}
			return true;

		}).then(() => {

			// TODO should security deposit be due before lease starts?  maybe bill date should be today.
			if(!lease.security_deposit) return true;
			return models.Product.findSecurityDepositProduct(connection, company_id)
				.then(product => _this.buildService(connection, lease, product, non_prorate_services_start.format('YYYY-MM-DD'), non_prorate_services_start.format('YYYY-MM-DD'), lease.security_deposit, 1, 0, 0, 0, 'lease', save))
				.then(s => {
					leaseServices.push(s);
					if(save === 'lease'){
						billableServices.push(s);
					}
					return true;
				});
		}).then(() => {

			if(!template.Services) return true;
			return Promise.mapSeries(template.Services, function(service){

				if(service.optional) return;
				
				if (service.Product.category_type === 'transfer') return;
		
				var s = new Service({
					lease_id: lease.id,
					product_id: service.product_id,
					price: service.price,
					qty: service.qty,
					start_date: lease.start_date,
					end_date: (service.recurring)? null: lease.start_date,
					recurring: service.recurring,
					prorate: service.prorate,
					prorate_out: service.prorate_out,
					service_type: service.service_type,
				});



				if(service.recurring){
					s.start_date = lease.start_date;
					s.end_date = null;
				} else {
					s.start_date = non_prorate_services_start.format('YYYY-MM-DD');
					s.end_date =  non_prorate_services_start.format('YYYY-MM-DD');
				}

				if(service.service_type === 'insurance'){
					s.name = service.Insurance.name;
					s.Product = service.Insurance;
					s.taxable = service.Insurance.taxable;
				} else {
					s.name = service.Product.name;
					s.Product = service.Product;
					s.taxable = service.Product.taxable;
				}

				if(service.service_type === 'lease'){
					leaseServices.push(s);
				} else if(service.service_type === 'application'){
					applicationServices.push(s);
				} else if(service.service_type === 'reservation'){
					reservationServices.push(s);
				}
				
				if(!save) return true;
				s.lease_id = lease.id;
				if(save === s.service_type){
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
					.then(product => _this.buildService(connection, lease, product, non_prorate_services_start.format('YYYY-MM-DD'), non_prorate_services_start.format('YYYY-MM-DD'),  product.price, p.qty, product.prorate, product.prorate_out, 0, 'lease', save))
					.then(s => {
						leaseServices.push(s);
						if(save === 'lease'){
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
					.then(product => _this.buildService(connection, lease, product, lease.start_date, null,  insurance.premium, 1, insurance.prorate, insurance.prorate_out, 1, 'insurance', save === 'lease' ? 'insurance':save))
					.then(s => {
						leaseServices.push(s);
						if(save === 'lease'){
							billableServices.push(s);
						}
						return true;
					});
			})

		}).then(async () => {
			lease.Discounts = [];
			if(reservation.id){
				var promotionIds = await models.Promotion.findAllDiscounts(connection, lease.id);
				for (const dbp of promotionIds) {
					if(params.promotions.filter(f => f.promotion_id === dbp.promotion_id).length > 0){
						var index = params.promotions.findIndex(p => p.promotion_id == dbp.promotion_id);
						params.promotions[index] = dbp;
					}else{
						params.promotions.push({...dbp});
					}
				}
			}

			if (params.promotions.length) {
				await lease.addPromotions(connection, params.promotions, company_id, !save);
			}

			if (params.discount_id) {
				await lease.addPromotions(connection, [{promotion_id: params.discount_id}], company_id, !save);
			}

			if(save && lease.Discounts.length){
				await lease.saveDiscounts(connection,lease.start_date)
			}

			return true
		}).then(() => {

			if (!params.coupons.length ) return true;

			return Promise.mapSeries(params.coupons, c => {

				return Promotion.findCouponByCode(connection, c, company_id).then(coupon => {

					if(!coupon) e.th(400, "Coupon not found");
					var promotion = new Promotion({
						id: coupon.promotion_id
					});

					return promotion.find(connection)
						.then(() => promotion.verifyAccess(company_id))
						.then(() => promotion.getPromotionUnits(connection, this.id))
						.catch(err => {
							e.th(400, "This coupon cannot be used.")
							return;
						})
						.then(() => {
							if(!promotion.Units.length || promotion.Units[0].unit_id != this.id){
								e.th(400, "This coupon is not available for this unit");
							}

							return promotion.validateCoupon(connection, coupon);
						})
						.then(() => {
							discount = new Discount({
								promotion_id: coupon.promotion_id,
								coupon_id: coupon.id,
								lease_id: lease.id,
								company_id: company_id
							});

							return discount.makeFromPromotion(connection, lease)
						})
						.then(()=> {
							lease.Discounts.push(discount);
							if(!save) return true;
							return discount.save(connection);
						});
				});
			})

		}).then(() => {

			// If we are saving, generate the invoice based on billable services,
			// If not, calculate lease charges, application charges, and reservation charges.
	
		
			if(save){

				if(!billableServices.length) return true; // throw "This lease has no billable services";
				return _this.generateInvoice(connection,lease, company_id, billableServices, params.billed_months, true, true, contact.id, api.id, null, override_prorate).then(i => {
					invoice = i;
					return true;
				})

			} else {

				if(!leaseServices.length) throw new Error(lease.msg);
				return _this.generateInvoice(connection,lease, company_id, leaseServices, params.billed_months, false, true, contact.id, api.id, null, override_prorate, fetch_discounts)
					.then(i =>{
						invoice = i;


						if(!applicationServices.length) return true;
						return _this.generateInvoice(connection,lease, company_id, applicationServices, params.billed_months, false, true, contact.id, api.id, null, override_prorate).then(i => {
							applicationInvoice = i;
							return true;
						});
					}).then(() => {

						if(!reservationServices.length) return true;
						return _this.generateInvoice(connection,lease, company_id, reservationServices, params.billed_months, false, true, contact.id, api.id, null, override_prorate).then(i => {
							reservationInvoice = i;
							return true;
						});
					});
			}

		}).then(async () => {

			if(save && lease.payment_cycle){
				console.log("invoice", invoice.length); 
				await lease.saveMoveInPaymentCycle(connection, moment(invoice[0].period_start, 'YYYY-MM-DD'), moment(invoice[invoice.length - 1].period_end, 'YYYY-MM-DD'), company_id); 
			}


			if(!save || !lease.end_date) return true;
			


			if (moment(_this.available_date) < moment()) {
				return _this.save(connection, { available_date: lease.end_date});
			}
		}).then(() => {
			return {
				lease: lease,
				invoices: invoice,
				applicationInvoices: applicationInvoice,
				reservationInvoices: reservationInvoice
			};
		})

	}

	//  non recurring starts and end on today or lease start, whichever is eariler
	// recurring starts on lease start
	buildService(connection, lease, product, start, end, price, qty, prorate, prorate_out,  recurring, type, save){

		return Promise.resolve().then(() => {
			var service = {
				start_date : start,
				end_date : end,
				price : price,
				qty : qty,
				prorate : prorate,
				prorate_out : prorate_out,
				recurring : recurring,
				name: product.name,
				product_id : product.id,
				Product : product,
				service_type: type,
				taxable: product.taxable
			};

			if(!save) return new Service(service);
			service.lease_id = lease.id;
			var s = new Service(service);
			if(!save || save !== s.service_type) return s;
			return s.save(connection).then(() => {
				return s;
			});
		})
	}

	async generateInvoice(connection, lease, company_id, services = [], billed_months, save, seperateInvoices, created_by, apikey_id, lastBilledDate, override_prorate, fetch_discounts = true) {

		let invoices = [];

		let lastBillingDate = lastBilledDate ? lastBilledDate : await lease.getLastBillingDate(connection);
		
		let lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day'): null;
		
		// let totalInvoices = billed_months && seperateInvoices ? billed_months + 1 : 1;
		let totalInvoices = billed_months && seperateInvoices ? billed_months : 1;
		
		let leaseGenerated = false;
		 
		for(let i = 0; i < totalInvoices; i++ ) {

			let initialInvoice = (i == 0 && !lastBilledDate);
			
			let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled && lastBilled.clone(), seperateInvoices ? (initialInvoice ? 0 : 1) : billed_months, leaseGenerated);
			
			lastBilled = invoicePeriod && invoicePeriod.end && invoicePeriod.end.clone();
			//TODO fix discounts Remove searching in makeFromServices, pass discounts here.
			
			let discountsToPass = save ? [] : JSON.parse(JSON.stringify(lease.Discounts));
			let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
			let invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: !initialInvoice ? invoicePeriod.start.clone().date(lease.bill_day).format('YYYY-MM-DD') : invoicePeriod.start.format('YYYY-MM-DD'),
				company_id,
				type: "manual",
				status: 1,
				created_by,
				apikey_id
			});
			invoice.Lease = lease;
			invoice.company_id = company_id;

			
			let appliedServices = seperateInvoices ? services.filter(s => (initialInvoice || s.recurring === 1) &&
									s.service_type === 'lease' || s.service_type === 'insurance') : services;

			await invoice.makeFromServices(
				connection,
				appliedServices,
				lease,
				invoicePeriod.start,
				invoicePeriod.end,
				discountsToPass, // if not saving, include the discounts, otherwise we will search.
				company_id,
				fetch_discounts,
				{override_prorate}
			);

			console.log("invoice *****", invoice);
			
			invoices.push(invoice)

			if(invoice.InvoiceLines.length && save){
				await invoice.save(connection);
			}

		}


		for(const invoice of invoices){
			await invoice.total();
			await invoice.calculatePayments();
			await invoice.getOpenPayments(connection);
		}

		return seperateInvoices ? invoices : invoices[0];
	}

	async setPrice(connection, api){

		this.price = await models.Unit.findUpdatedUnitPrice(connection,this.id, moment().format('YYYY-MM-DD'));
		// removing API dependencies, no one is using this anyway. If needed we can build it back into Applications
		// if(!api) return true;
		// //  calculate price here based on overrides/adjustments, etc
		// if(!api.id) return;
		// return models.Unit.findApiUnitPrices(connection, this.id, api.id).then(rule => {
		// 	if(!rule) return true;
		// 	this.price = this.calculatePriceAdjustment(rule);
		// 	return true;
		// })

	}

	async getApiPrices(connection){
		if(!this.id) e.th(500);
		let prices = await models.Unit.findApiUnitPrices(connection, this.id)

		for(let i = 0; i < prices.length; i++ ){
			prices[i].ApiKey = await models.Api.findKeyById(connection, prices[i].api_id)
		}

		return prices;

	}

	async saveApiPrice(connection, data) {

		if(!this.id) e.th(500);
		let existing = await models.Unit.findApiUnitPrices(connection, this.id, data.api_id);
		if(existing) e.th(400, "A price for this api already exists");
		data.id = await this.saveApiUnitPrice(connection, data);
		return data;
	}

	async deleteApiPrice(connection, api_unit_price_id) {


		if(!this.id) e.th(500);
		await models.Unit.deleteApiUnitPrice(connection, api_unit_price_id)

	}

	calculatePriceAdjustment(rule){

		if(rule.change_type == "$"){
			return +this.price + +rule.change;
		} else if (rule.change_type == "%"){
			return +this.price + +(this.price * rule.change / 100);
		}

	}

	saveApiUnitPrice(connection, rule, rule_id){
		rule.unit_id = this.id;
		return models.Unit.saveApiUnitPrice(connection, rule, rule_id);

	}

	async getPromotions(connection, promotionLabel){
		let promos = await models.Promotion.getPromotionUnits(connection, null, this.id, promotionLabel);

		for(let i = 0; i < promos.length; i++){
			let promotion = new Promotion({id: promos[i].promotion_id});
			await promotion.find(connection);
			promotion.discount = promos[i].discount;
			this.Promotions.push(promotion);
		}
	}

	async verifyAccess(connection, company_id, properties = []){

		if(!this.id) e.th(500, "Unit id not set");

		let cid = await models.Unit.findCompany(connection, this.id);
    if(cid !== company_id) {
      e.th(403, "Not authorized");
    }

		if(properties.length){
        if(properties.indexOf(this.property_id) < 0) e.th(403, "Not authorized");
    }

    return true;

	}

	static async findAmenities(connection, type, company_id){
		return await  models.Amenity.findAllAmenities(connection, type, company_id);
	}

	static async findFeatures(connection, type){
		return await  models.Amenity.findFeatures(connection, type);
	}

	async saveAmenities(connection, data, type){
		if(!this.id) e.th(500);
		let amenity_list =  await  models.Amenity.findIdsByUnit(connection, this.id, type);
		let results = [];
		let unitGroupRefresh = false;
		var keys = Object.keys(data.amenities);
		if(!data?.property_id) {
			data.property_id = await models.Unit.findPropertyById(connection,this.id);
		}
		for(let i = 0; i < keys.length; i++ ){
			let amenity_property_id =  keys[i];
			if (await models.Amenity.checkRefreshUnitGroupCondition(connection, Hashes.decode(amenity_property_id)[0], data.amenities[amenity_property_id].value, this.id, false)) { 
				unitGroupRefresh = true;
			}
			if(data.amenities[amenity_property_id].value && data.amenities[amenity_property_id].value.toLowerCase() !== "no"){

				let exist_amenity= await models.Amenity.findAmenityUnits(connection, Hashes.decode(amenity_property_id)[0], this.id);
				if(!exist_amenity?.length) {
					unitGroupRefresh = true;
				}
				let result = await models.Amenity.saveUnitFeatures(connection, data.amenities[amenity_property_id].amenity_id, Hashes.decode(amenity_property_id)[0], data.amenities[amenity_property_id].value, this.id);
				results.push(result);
			}
		}

		var toRemove = amenity_list.filter( el => {
			return results.indexOf( el ) < 0;
		} );

		if(toRemove.length){
			unitGroupRefresh = true;
		}
		await models.Amenity.deleteUnitAmenities(connection, toRemove);
		if(unitGroupRefresh) {
			await refreshUnitGroup.callRefreshUnitGroupProcedure(data.cid, { property_id: data.property_id });
		}

	}

	static async findUniqueNumbers(connection, company_id){
		return await models.Unit.findUniqueNumbers(connection, company_id)
	}

	static async omniSearch(connection, data, company_id, properties, type, resp){

		let result_list = await models.Unit.omniSearch(connection, data, company_id, properties, type, resp)
		// let unitsCount = await models.Unit.omniSearchCount(connection, data, company_id, properties)
		let list = result_list.results;
		let results = [];

		try{
			if(list?.length){
				let contact_ids = list.filter(item => item.type === 'contact' || item.type === 'auxilary' || item.type === 'vehicles').map(item => item.id)
				if(data.contact_id){
					contact_ids = contact_ids.filter( i => i !== data.contact_id);
				}
				let unit_ids = list.filter(item => item.type === 'units').map(item => item.id)
				let res = await Promise.all([Contact.getContactLeasesOmniSearch(connection, {contact_ids, property_ids: properties, company_id, source: data.source}), Unit.getUnitsOmniSearch(connection, {unit_ids, property_ids: properties, company_id})])
				
				resp.fns.addStep('AfterFetchingDetails');
				
				res = res.flat()
				list.forEach(function(item){
					if(item.type === 'contact' || item.type === 'auxilary' || item.type === 'vehicles'){
						results.push(res.find(r => r.id == item.id && r.search_type === 'contact'))
					}else{
						results.push(res.find(r => r.id == item.id && r.search_type === 'unit'))
					}
				})
				results = results.filter(r => r !== undefined)
			}
		} catch(err) {
			console.log(err)
		}



		return {
			results
		}
	}

	static async getContact(id, connection, company_id, properties){
		let contact = new Contact({ id });
		await contact.find(connection);
		await contact.verifyAccess(company_id);
		await contact.getPhones(connection);
		// await contact.getLocations(connection);
		await contact.getLeases(connection, company_id, properties);
		return contact;
	}

	static async bulkEdit(connection, data, company_id,user_id){

	  // unit_id here is an array of units.  We use uit_id to trigger the automatic unhashing of IDs coming to the API.

//		let verified = await models.Unit.verifyBulk(connection, data.unit_id, company_id);
	  let verified = await models.Unit.verifyBulk(connection, data.unit_ids, company_id);

		if(!verified) e.th(403, "You do not have permission to edit this resource");

    
    data.form.modified_by = user_id;
		await models.Unit.saveBulk(connection, data.form, data.unit_ids);

	}

  static async bulkEditPrices(connection, data, company_id, modified_by, integrationConfig){

	let dryrun = data && data.length && data[0].dryrun ? true : false;
	let unit_price = [];
	let unit_ids = data.map(d => d.id);
	let verified;

	if (integrationConfig.appId && integrationConfig.isNectarRequest) {
		verified = await models.Unit.verifyBulkAndRateEngine(connection, unit_ids, company_id, integrationConfig.appId);
	} else verified = await models.Unit.verifyBulk(connection, unit_ids, company_id);
    if(!verified) e.th(403, "You do not have permission to edit this resource");

    for(let i = 0; i < data.length; i++ ){
        //await models.Unit.save(connection, {price: data[i].adjusted}, data[i].id);
        // TODO move to trigger
		let round_off = data[i].rounding
		let unit = new Unit({id: data[i].id});
		await unit.find(connection);
		let rounding_data = {round_off, value: data[i].adjusted}
		unit.price = round_off ? unit.roundOffPrice(rounding_data) : data[i].adjusted;
		unit.set_rate = data[i].set_rate ? data[i].set_rate : unit.set_rate;

		unit_price.push({
			unit_id: unit.id,
			price: unit.price,
			set_rate: unit.set_rate
		});
		if(!dryrun) await unit.updatePriceChange(connection, modified_by);
	}
	
    return unit_price;
  }

	roundOffPrice({round_off : {round_type, dollar_type}, value} = {}){
		if(!round_type || !dollar_type || !value) return 

		let rounding_type = round_type + '_' + dollar_type;
		return RoundOff.convert({value, type: rounding_type});
	}

  static async getMultipleById(connection, data, properties = [], company_id){

	let result=[];

	for (let i=0; i<data.length; i++){
		result.push((await models.Unit.getMultipleById(connection, data[i], properties, company_id))[0]);
	}

	return result;

  }

	static async getRents(connection, company_id){
		return await models.Unit.getRents(connection, company_id);
	}

	static async getFloors(connection, company_id, properties){
		return await models.Unit.getFloors(connection, company_id, properties);
	}

	static async getSizes(connection, company_id, properties){
		return await models.Unit.getSizes(connection, company_id, properties);
	}

	static async getBeds(connection, company_id){
		let bed_list = await models.Unit.getBeds(connection, company_id);
		let beds = [];
		for (let i = Math.floor(bed_list[0].min); i <= Math.floor(bed_list[0].max); i++) {
			beds.push(i);
		}
		return beds;

	}

	static async getBaths(connection, company_id){
		let bath_list = await models.Unit.getBaths(connection, company_id);
		let baths = [];
		for (let i = Math.floor(bath_list[0].min); i <= Math.floor(bath_list[0].max); i++) {
			baths.push(i);
		}
		return baths;

	}

	static async getUnitTypes(connection, company_id){
		return await models.Unit.getUnitTypes(connection, company_id);
	}

	static async getUnitOptions(connection, company_id, properties){
		return await models.Unit.getUnitOptions(connection, company_id, properties);
	}

	static formatLeaseSetup(data, unit){
		let results = {
			promotion_id: data.lease.promotion_id,
			security_deposit: data.lease.security_deposit,
			monthly:        data.lease.monthly,
			start_date: data.lease.start_date,
			end_date:   data.lease.end_date,
			bill_day:   data.lease.bill_day,
			terms:      data.lease.terms,
			rent:       data.lease.rent,
			auto_pay_after_billing_date: data.lease.auto_pay_after_billing_date,
			Discounts:  data.lease.Discounts,
			Promotions: unit.Promotions,
			Charges: {
				date: null,
				discounts: 0,
				total_due: 0,
				total_tax: 0,
				sub_total: 0,
				balance: 0,
				Detail: []
			},
			// ReservationCharges: {},
			// ApplicationCharges: {},
			Invoices:[],
			ReservationInvoices:[],
			Unit: unit
		}


		if(data.invoices.length){
			results.Charges.date = data.invoices[0].date;
			// results.Charges.discounts = data.invoices.reduce((a,b) => a + b.discounts, 0);
			// results.Charges.total_due = data.invoices.reduce((a,b) => a + b.total_due, 0);
			// results.Charges.total_tax = data.invoices.reduce((a,b) => a + b.total_tax, 0);
			// results.Charges.sub_total = data.invoices.reduce((a,b) => a + b.sub_total, 0);
			// results.Charges.balance = data.invoices.reduce((a,b) => a + b.balance, 0);

			for(let i = 0; i < data.invoices.length; i++){

				results.Invoices[i] = {
					date: data.invoices[i].date,
					due: data.invoices[i].due,
					discounts: data.invoices[i].discounts,
					total_due: data.invoices[i].total_due,
					total_tax: data.invoices[i].total_tax,
					sub_total: data.invoices[i].sub_total,
					balance: data.invoices[i].balance
				}
				results.Invoices[i].Detail = data.invoices[i].InvoiceLines.map(inline => {
					return {
						start_date: inline.start_date,
						end_date: inline.end_date,
						product_id: inline.product_id,
						name: inline.Product.name,
						qty: inline.qty,
						cost: inline.cost,
						total_cost: inline.total,
						Tax: inline.TaxLines,
						Discount: inline.DiscountLines
					}
				});

				results.Charges.discounts = Math.round( (results.Charges.discounts + data.invoices[i].discounts) * 1e2) / 1e2
				results.Charges.total_due = Math.round( (results.Charges.total_due + data.invoices[i].total_due) * 1e2) / 1e2
				results.Charges.total_tax = Math.round( (results.Charges.total_tax + data.invoices[i].total_tax) * 1e2) / 1e2
				results.Charges.sub_total = Math.round( (results.Charges.sub_total + data.invoices[i].sub_total) * 1e2) / 1e2
				results.Charges.balance = Math.round( (results.Charges.balance + data.invoices[i].balance) * 1e2) / 1e2


				for(let j = 0; j < data.invoices[i].InvoiceLines.length; j++){
					let inline = data.invoices[i].InvoiceLines[j];
					let product = inline.Product;

					let index = results.Charges.Detail.findIndex(d => d.product_id === product.id);

					if(index < 0){
						index = results.Charges.Detail.length;

						results.Charges.Detail.push({
							start_date: inline.start_date,
							end_date: inline.end_date,
							product_id: product.id,
							name: product.name,
							qty: 1,
							cost: 0,
							total_cost: 0,
							tax: 0,
							discounts: 0
						});
						
					} 
					results.Charges.Detail[index].cost =  Math.round( (results.Charges.Detail[index].cost + inline.cost) * 1e2) / 1e2;
					results.Charges.Detail[index].end_date = inline.end_date;
					results.Charges.Detail[index].total_cost =  Math.round( (results.Charges.Detail[index].total_cost + inline.total) * 1e2) / 1e2;
					results.Charges.Detail[index].tax = Math.round( (results.Charges.Detail[index].tax + inline.TaxLines.reduce((a,b) => a + b.amount, 0)) * 1e2) / 1e2;
					results.Charges.Detail[index].discounts = Math.round( (results.Charges.Detail[index].discounts + inline.DiscountLines.reduce((a,b) => a + b.amount, 0) ) * 1e2) / 1e2;
				}
			}

		}


		// for(let i = 0; i < data.reservationInvoices.length; i++){
		// 	results.ReservationInvoices[i] = {
		// 		date: data.reservationInvoice[i].date,
		// 		due: data.reservationInvoice[i].due,
		// 		discounts: data.reservationInvoice[i].discounts,
		// 		total_due: data.reservationInvoice[i].total_due,
		// 		total_tax: data.reservationInvoice[i].total_tax,
		// 		sub_total: data.reservationInvoice[i].sub_total,
		// 		balance: data.reservationInvoice[i].balance
		// 	}
		// 	results.ReservationInvoices[i].Detail = data.reservationInvoice[i].InvoiceLines.map(inline => {
		// 		return {
		// 			start_date: inline.start_date,
		// 			end_date: inline.end_date,
		// 			product_id: inline.product_id,
		// 			name: inline.Product.name,
		// 			qty: inline.qty,
		// 			cost: inline.cost,
		// 			total_cost: inline.total,
		// 			Tax: inline.TaxLines,
		// 			Discount: inline.DiscountLines
		// 		}
		// 	});
		// }
		
		

		// results.Charges.Detail = data.invoice.InvoiceLines.map(inline => {
		// 	return {
		// 		start_date: inline.start_date,
		// 		end_date: inline.end_date,
		// 		product_id: inline.product_id,
		// 		name: inline.Product.name,
		// 		qty: inline.qty,
		// 		cost: inline.cost,
		// 		total_cost: inline.total,
		// 		Tax: inline.TaxLines,
		// 		Discount: inline.DiscountLines
		// 	}
		// });

		// if(data.reservationInvoice.InvoiceLines){
		// 	results.ReservationCharges = {
		// 		date: data.reservationInvoice.date,
		// 		discounts: data.reservationInvoice.discounts,
		// 		total_due: data.reservationInvoice.total_due,
		// 		total_tax: data.reservationInvoice.total_tax,
		// 		sub_total: data.reservationInvoice.sub_total,
		// 		balance: data.reservationInvoice.balance
		// 	}
		// 	results.ReservationCharges.Detail = data.reservationInvoice.InvoiceLines.map(inline => {
		// 		return {
		// 			start_date: inline.start_date,
		// 			end_date: inline.end_date,
		// 			product_id: inline.product_id,
		// 			name: inline.Product.name,
		// 			qty: inline.qty,
		// 			cost: inline.cost,
		// 			Tax: inline.TaxLines,
		// 			Discount: inline.DiscountLines
		// 		}
		// 	});
		// }


		// if(data.applicationInvoice.InvoiceLines){
		// 	results.ApplicationCharges = {
		// 		date: data.applicationInvoice.date,
		// 		discounts: data.applicationInvoice.discounts,
		// 		total_due: data.applicationInvoice.total_due,
		// 		total_tax: data.applicationInvoice.total_tax,
		// 		sub_total: data.applicationInvoice.sub_total,
		// 		balance: data.applicationInvoice.balance
		// 	};

		// 	results.ApplicationCharges.Detail = data.applicationInvoice.InvoiceLines.map(inline => {
		// 		return {
		// 			start_date: inline.start_date,
		// 			end_date: inline.end_date,
		// 			product_id: inline.product_id,
		// 			name: inline.Product.name,
		// 			qty: inline.qty,
		// 			cost: inline.cost,
		// 			Tax: inline.TaxLines,
		// 			Discount: inline.DiscountLines
		// 		}
		// 	});
		// }

		return results;
	}

	async setOverlock(connection){
		if(!this.id) return e.th(500, "Unit id not set");

		let overlock = await models.Unit.getActiveOverlock(connection, this.id);
		if(overlock) return e.th(409, "Unit is already locked");

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
		
		if(!this.Property.Access || !this.Property.Access.access_id){
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

	static async removeAllOverlocks(connection, properties){

		if(!properties) e.th(400, "Properties are missing"); 
		for(let i = 0; i < properties.length; i++){
			console.log(`properties[${i}]`, properties[i])
			await models.Unit.removeAllOverlocks(connection, properties[i]);
		}
	
	}
	static async setAllOverlocks(connection, unit_ids){
		await models.Unit.addAllOverlocks(connection, unit_ids);
	}

	async getActiveOverlock(connection){
		return  await models.Unit.getActiveOverlock(connection, this.id);
	}

	async updatePromotions(connection, params, company_id){
		if(this.Lease) {
			this.Lease.start_date = params.start_date;
			if(params.promotions && params.promotions.length) await this.Lease.addPromotions(connection, params.promotions, company_id);
			if(params.discount_id) await this.Lease.addPromotions(connection, [{promotion_id: params.discount_id}], company_id);
		}
	}

	async setSpaceMixId(connection, hasUnitGroupDetails = true){
		if (hasUnitGroupDetails) {
			await this.findWebsiteCategoryUnitGroupId(connection)
		}
		if (!this.space_mix_id) {
			await this.getAmenities(connection, true);
			let length = this.Amenities && this.Amenities.length && this.Amenities.find(f => f.name.toLowerCase() == 'length');
			let width = this.Amenities && this.Amenities.length && this.Amenities.find(f => f.name.toLowerCase() == 'width');
			let height = this.Amenities && this.Amenities.length && this.Amenities.find(f => f.name.toLowerCase() == 'height');
			let unitTypeId = Enums.SPACETYPE[this.type.toUpperCase()];
			// this.space_mix_id = utils.base64Encode(`${unitTypeId},${this.category_id},${this.width},${this.length},${this.height}`);
			this.space_mix_id = utils.base64Encode(`${unitTypeId},${this.category_id},${this.width || (width && width.value)},${this.length || (length && length.value)},${this.height || (height && height.value)}`);
		}

	}

	async getFutureLease(connection, futureDate){

		if(!this.id) throw "Unit id not set";
    	let lease = await models.Lease.findNextLease(connection, this.id,futureDate);
		if(!lease) return false;
		this.Lease = new Lease(lease);
		await this.Lease.find(connection);
		await this.Lease.getReservation(connection);
		await this.Lease.getTenants(connection);

		return this.Lease;
	}

	static async createLease(connection, params) {
		const { leaseData, company, api, user_id } = params;
		let reservation = {};
		const { auto_pay_after_billing_date: autoPayAfterBillingDate } = leaseData;
		let leaseParams = {
			id: leaseData.id,
			start_date: leaseData.start_date || moment().format('YYYY-MM-DD'),
			end_date: leaseData.end_date || null,
			rent: leaseData.rent,
			security_deposit: leaseData.security_deposit,
			bill_day: leaseData.bill_day,
			coupons: leaseData.coupons || [],
			insurance_id: leaseData.insurance_id,
			promotions: leaseData.promotions ? leaseData.promotions.filter(p => p.promotion_id) : [],
			discount_id: leaseData.discount_id || null,
			billed_months: leaseData.billed_months || 0,
			hold_token: leaseData.hold_token,
			products: leaseData.products || [],
			type: leaseData.type,
			save: leaseData.save,
			reservation_id: leaseData.reservation_id || null,
			is_transfer: leaseData.is_transfer,
			edit_lease: leaseData.edit_lease,
			auto_pay_after_billing_date: autoPayAfterBillingDate,
			user_id
		};

		let unit = new Unit({ id: leaseData.unit_id });
		await unit.find(connection, api);
		await unit.setState(connection);
		await unit.updatePromotions(connection, leaseParams, company.id);
		await unit.canRent(connection, moment(leaseParams.start_date, 'YYYY-MM-DD'), leaseData.hold_token, leaseData.reservation_id, leaseData.edit_lease);

		let { lease, leaseServices } = await unit.buildLease(connection, api, leaseParams, company.id, reservation, leaseData.save, Enums.CATEGORY_TYPE.MOVEIN);

		lease.id = leaseData.id;
		lease.status = 2;

		lease.billed_months = leaseData.billed_months;
		let lastBilled = leaseData.last_billed;

		if (lease.billed_months == null || lastBilled == null) {
			let invoices = await unit.generateInvoice(connection, lease, company.id, leaseServices, leaseParams.billed_months, false, true, null, null);
			lease.billed_months = invoices.length;
			lastBilled = invoices[invoices.length - 1].period_end;
		}

		lease.Services = leaseServices;
		return lease;
	}
	/**
		Finds the unit group for the current unit or the unit with the given ID
		in the specified grouping profile ID.
		@param {Object} connection - Database connection
		@param {number} grouping_profile_id - Grouping Profile ID
		@param {number} [unit_id] - Unit ID
		@returns {Promise<String>} - A promise that resolves the Unit group ID
		@throws {Error} - If invalid parameters are provided.
		*/
	async findUnitGroup(connection, grouping_profile_id, unit_id) {
		let unitId = this.id || this.unit_id
		if (!grouping_profile_id || !unitId) e.th(400, 'Invalid parameters')
		this.unit_group_id = await models.Unit.findUnitGroup(connection, grouping_profile_id, unitId)
		return this.unit_group_id
	}

	/**
	 * The function finds the default rent plan ID using the value tier type and
	 * Rate Management default Space Group Profile and assign to this.defaultRentPlanId
	 * @param { SqlConnectionObject } connection
	 * @param { Enum('good', 'better', 'best') } valueTierType Value pricing tier type
	 * @returns Default Rent Plan ID
	 */
	async getDefaultRentPlan(connection, valueTierType) {
		if (!this.id || !this.property_id || !valueTierType) return;
		const data = [ this.property_id, this.id, valueTierType ]
		this.defaultRentPlanId = await models.Unit.fetchDefaultRentPlan(connection, data);
		return this.defaultRentPlanId
	}

	async findWebsiteCategoryUnitGroupId(connection) {
		this.space_mix_id = await models.SpaceGroup.getWebsiteCategoryUnitGroupId(connection, this.property_id, this.id)
	}

	static async getUnitsOmniSearch(connection, payload){
		let results = []
		if(payload.unit_ids?.length){
			let records = await models.Unit.unitsOmniSearch(connection, payload)
			records.forEach(function(record){
				let data = {}
				data.search_type = record.search_type;
				data.id = record.id;
				data.property_id = record.property_id;
				data.label = record.label;
				data.category_id = record.category_id;
				data.number = record.number;
				data.unit_id = record.unit_id;
				data.Address = JSON.parse(record.Address);
				data.Category = JSON.parse(record.Category);
				data.state = record.state;
				data.Lease = (record.Reservation || record.Lead || record.Tenant)? {
					startDate: record.start_date,
					Reservation: JSON.parse(record.Reservation),
					Lead: JSON.parse(record.Lead),
					Tenants: [JSON.parse(record.Tenant)]
				} : null;
				results.push(data)
			});
		}
		return results
	}
}

module.exports = Unit;
var Upload      = require('../classes/upload.js');
var AccessControl = require(__dirname + '/../classes/access_control.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Insurance = require(__dirname + '/../classes/insurance.js');
var Promotion = require(__dirname + '/../classes/promotion.js');
var Service = require(__dirname + '/../classes/service.js');
var Product = require(__dirname + '/../classes/product.js');
var Property = require(__dirname + '/../classes/property.js');
var Reservation = require(__dirname + '/../classes/reservation.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Category = require(__dirname + '/../classes/category.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');