"use strict";

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var Enums = require(__dirname + '/../modules/enums.js');
var context    = require(__dirname + '/../modules/request_context.js');

var utils    = require(__dirname + '/../modules/utils.js');

var e  = require(__dirname + '/../modules/error_handler.js');


const validStatuses = [
	'active',
	'retired',
	'converted'
];

class Lead {

	constructor(data){

		data = data || {};
		this.id = data.id;
		this.contact_id = data.contact_id;
		this.lease_id = data.lease_id;
		this.property_id =  data.property_id;
		this.category_id =  data.category_id;
		this.unit_id =  data.unit_id;
		this.touchpoint_id =  data.touchpoint_id;
		this.note =  data.note;
		this.length_of_stay =  data.length_of_stay;
		this.move_in_date =  data.move_in_date;
		this.content =  data.content;
		this.extras =  data.extras;
		this.created =  data.created;
		this.status =  data.status;
		this.source =  data.source;
		this.retire_reason =  data.retire_reason;
		this.send_to =  data.send_to;
		this.opened =  data.opened;
		this.modified_by = data.modified_by;
		this.created_by = data.created_by;
		this.spaceMixId = data.spaceMixId
		// There should only be one new lead for a property at any given time. 
		this.is_new = !!data.is_new;
		this.lead_type = Enums.WEB_LEAD_TYPES[`${data.lead_type || null}`];
		this.Contact = {};
		this.Lease = {};
		this.Company = {};
		this.Address = {};
		this.Category = {};
		this.Property = {};
		this.Touchpoint = {};
		this.Unit = {};
	}

	find(connection, api){
		return Promise.resolve().then(() => {
			if(!this.id && !this.contact_id)
				e.th(500, "Lead Id missing");
			if(this.id) return models.Lead.getLeadById(connection, this.id);
			if(this.contact_id) return models.Lead.getLeadByContactId(connection, this.contact_id);

		}).then(data => {

			if(!data)
				e.th(404, "Lead not found")


			this.id = data.id;
			this.contact_id = data.contact_id;
			this.lease_id = data.lease_id;
			this.company_id = data.company_id;
			this.property_id =  data.property_id;
			this.category_id =  data.category_id;
			this.unit_id =  data.unit_id;
			this.touchpoint_id =  data.touchpoint_id;
			this.note =  data.note;
			this.length_of_stay =  data.length_of_stay;
			this.move_in_date =  data.move_in_date;
			this.company =  data.company;
			this.content =  data.content;
			this.created =  data.created;
			this.status =  data.status;
			this.source =  data.source;
			this.send_to =  data.send_to;
			this.opened =  data.opened;
			this.retire_reason =  data.retire_reason;
			this.modified_by = data.modified_by;
			this.created_by = data.created_by;
			this.is_new = data.is_new;
			this.lead_type = Enums.WEB_LEAD_TYPES[`${data.lead_type || null}`];
			this.spaceMixId = data.spaceMixId

			try{
				this.extras =  JSON.parse(data.extras);

			}catch(err){
				this.extras = {};
			}

			if(!this.contact_id){
				e.th(404, "Contact not found");
			}

			var contact = new Contact({id: this.contact_id});
			return contact.find(connection)
        .then(() => contact.getPhones(connection, api))
        .then(() =>{
				this.Contact = contact;
				return true;
			});

		}).then(() => {
			if(! this.property_id) return true;
			var property = new Property({id: this.property_id});
			return property.find(connection)
        .then(() => property.getAddress(connection))
        .then(() => property.getImages(connection))
        .then(() =>{
				this.Property = property;
				return true;
			})
		}).then(() => {

			if(!this.unit_id) return true;
			var unit = new Unit({id: this.unit_id});
			return unit.find(connection).then(() => {
				this.Unit = unit;
				return true;
			})
		}).then(() => {
			if(!this.category_id) return true;
			return models.UnitCategory.findById(connection, this.category_id).then(categoryRes => {
				this.Category = categoryRes;
				return true;
			})
		})

	}

	validate(){
		return Promise.resolve().then(() => {
			if (!this.contact_id) e.th(400, 'Contact id is required');
			return true;
		})
	}

	async save(connection, user){

		await this.validate();
		let contact = user || {};

		var save = {
			contact_id: this.contact_id,
			lease_id: this.lease_id,
			property_id:  this.property_id,
			unit_id:  this.unit_id,
			category_id:  this.category_id,
      		touchpoint_id:  this.touchpoint_id,
			note:  this.note,
      		length_of_stay:  this.length_of_stay,
      		move_in_date:  this.move_in_date || null,
			content:  this.content,
			extras:  this.extras,
			status:  this.status || 'active',
			source:  this.source,
			opened:  this.opened || null,
      		retire_reason:  this.retire_reason || null,
			modified_by: this.modified_by || (contact && contact.id),
			created_by: this.created_by || (contact && contact.id),
			lead_type: this.lead_type,
			spaceMixId: this.spaceMixId || null
		};
		// Check if space mix id is valid or not
		// TODO update if required in accordance with SM
		if (save.spaceMixId) {
			let spaceMixID = utils.base64Decode(save.spaceMixId).split(',')
			if (spaceMixID.length != 5 || !Array.isArray(spaceMixID)) return e.th(400, "Space Mix Id is invalid");
		}
		
		if(!this.id){
			save.created = moment.utc().format('YYYY-MM-DD HH:mm:ss');
			// If there is not currently an open lead on this contact at this property, save this as a new lead. 
			let c = new Contact({id: this.contact_id});
			await c.getActiveLead(connection, this.property_id);
			
			save.is_new = !c.ActiveLead.id; 
		}
		console.log("Save", save)

		let result = await models.Lead.save(connection, save, this.id);
		this.id = this.id || result.insertId;

	}

	convert(connection, lease_id, user){

		this.verifyId();
		let contact = user;
		
		let data = {
			contact_id: this.contact_id,
			lease_id: lease_id,
			primary: body.primary || 0
		};

		return models.Lead.save(connection, {lease_id: lease_id, modified_by: contact && contact.id }, this.id).then(() => {
			return models.ContactLeases.save(connection, data);
		}).then(() => {
			return this.updateStatus(connection, 'converted', contact);
		})
	}

	async updateStatus(connection, status, user){

		this.verifyId();

		if(status !== 'converted') return false;

		var data = {
			status: status
		};

		let contact = user;
		data.modified_by = contact && contact.id;

		await models.Lead.save(connection, data, this.id);

	}
 
  async getTouchpoint(connection){
    this.Touchpoint = await models.Lead.getTouchpoint(connection, this.touchpoint_id);
  }

  async retire(connection, reason, admin_id, company_id){

    this.verifyId();

    var data = {
      status: 'retired',
      retire_reason: reason
	}

    data.modified_by = admin_id;

	
	// lets handle the reservation and pending leases here too. 
	if(this.lease_id){
		let resevation_result = await models.Reservation.findByLeaseId(connection, this.lease_id);

		if(resevation_result && resevation_result.id){
			let reservation = new Reservation(resevation_result);
			await reservation.deleteReservation(connection); 
		}

		let lease_result = await models.Lease.findById(connection, this.lease_id);
		if(lease_result && lease_result.status == 2){
			let lease = new Lease(lease_result);
			await lease.deleteLease(connection, company_id, admin_id);
		}
	}

	await models.Lead.save(connection, data, this.id);

  }

  async update(connection, data, modified_by){
	  console.log("data", data)
	  if(typeof data.property_id !== 'undefined') this.property_id = data.property_id;
	  if(typeof data.unit_id !== 'undefined') this.unit_id = data.unit_id;
	  if(typeof data.category_id !== 'undefined') this.category_id = data.category_id ;
	  if(typeof data.note !== 'undefined') this.note = data.note;
	  if(typeof data.length_of_stay !== 'undefined') this.length_of_stay = data.length_of_stay;
	  if(typeof data.move_in_date !== 'undefined') this.move_in_date = data.move_in_date;
	  if(typeof data.content !== 'undefined') this.content = data.content;
	  if(typeof data.extras !== 'undefined') this.extras = data.extras;
	  if(typeof data.source !== 'undefined') this.source = data.source;
	  if(typeof data.subject !== 'undefined') this.subject = data.subject;
	  if(typeof data.touchpoint_id !== 'undefined') this.touchpoint_id = data.touchpoint_id;
	  if(typeof data.retire_reason !== 'undefined') this.retire_reason = data.retire_reason;
	  this.modified_by = modified_by;
	  this.created_by = this.created_by || modified_by;
	  if(typeof data.spaceMixId !== 'undefined') this.spaceMixId = data.spaceMixId
	  this.lead_type = Enums.WEB_LEAD_TYPES[`${data.lead_type || null}`];
	
	  await this.save(connection);

	}


	static async getSources(connection, company_id){
		return await models.Lead.findLeadSources(connection, company_id)
	}

	static async search(connection, conditions, searchParams, company_id, count){
		return await models.Lead.search(connection, conditions, searchParams, company_id, count)
  }

  static async bulkEdit(connection, data){
		await models.Lead.saveBulk(connection, data.form, data.lead_ids);

	}

	verifyId(){
		if (!this.id) e.th(500, 'No lead id is set');
		return true;
	}

	verifyAccess(company_id){
		if(this.Contact.company_id !== company_id) {
			e.th(403, "You are not authorized to view this resource");
		}
	}

	static async getLeadsDetails(connection, leads) {
		
		if (!leads.length) return [];
		
		let contact_ids = [];
		let lease_ids = [];
		for (let lead of leads) {
			if (lead.contact_id) contact_ids.push(lead.contact_id);
			if (lead.lease_id) lease_ids.push(lead.lease_id);
		};

		let contactDetails = [];
		let unSignedDocuments = [];
		if (contact_ids.length) contactDetails = await models.Contact.getContactDetails(connection, contact_ids);
		if (lease_ids.length) unSignedDocuments = await models.Upload.getDocuments(connection, lease_ids, true);

		for (let lead of leads) {
			lead['Contact'] = contactDetails.filter(obj => obj.id === lead.contact_id)[0] ?? {};
			lead['documents_pending'] = unSignedDocuments.some(obj => obj.lease_id === lead.lease_id);
		};
		return leads;
	}
}

module.exports = Lead;

var Contact  = require(__dirname + '/contact.js');
var Lease  = require(__dirname + '/lease.js');
var Property  = require(__dirname + '/property.js');
var Unit  = require(__dirname + '/unit.js');
var Address  = require(__dirname + '/address.js');
var Company  = require(__dirname + '/company.js');
var Reservation  = require(__dirname + '/reservation.js');
