"use strict";

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');


var e  = require(__dirname + '/../modules/error_handler.js');


var validStatuses = [
	'new',
	'not contacted',
	'active',
	'prospect',
	'archived',
	'converted'
]

class Lead {

	constructor(data){

		data = data || {};
		this.id = data.id;
		this.contact_id = data.contact_id;
		this.lease_id = data.lease_id;
		this.property_id =  data.property_id;
		this.category_id =  data.category_id;
		this.unit_id =  data.unit_id;
		this.note =  data.note;
		this.content =  data.content;
		this.extras =  data.extras;
		this.created =  data.created;
		this.status =  data.status;
		this.source =  data.source;
		this.send_to =  data.send_to;
		this.opened =  data.opened;
		
		this.Contact = {};
		this.Lease = {};
		this.Company = {};
		this.Address = {};
		this.Category = {};
		this.Property = {};
		this.Unit = {};
	}

	find(connection, company_id){
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
			this.note =  data.note;
			this.company =  data.company;
			this.content =  data.content;
			this.created =  data.created;
			this.status =  data.status;
			this.source =  data.source;
			this.send_to =  data.send_to;
			this.opened =  data.opened;
			this.modified_by = data.modified_by;

			try{
				this.extras =  JSON.parse(data.extras);

			}catch(err){
				this.extras = {};
			}

			if(!this.contact_id){
				e.th(404, "Contact not found");
			}

			var contact = new Contact({id: this.contact_id});
			return contact.find(connection, company_id).then(() =>{

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

		var _this = this;
		return Promise.resolve().then(() => {
			if (!_this.contact_id) e.th(400, 'Contact id is required');
			return true;
		})
	}

	save(connection){
		var _this = this;

		return _this.validate().then(function() {

			var save = {
				contact_id: _this.contact_id,
				lease_id: _this.lease_id,
				property_id:  _this.property_id,
				unit_id:  _this.unit_id,
				category_id:  _this.category_id,
				note:  _this.note,
				content:  _this.content,
				extras:  _this.extras,
				status:  _this.status,
				source:  _this.source,
				send_to:  _this.send_to,
				opened:  _this.opened
			};

			return models.Lead.save(connection, save, _this.id).then(function (result) {
				if (result.insertId) _this.id = result.insertId;
				return true;
			});

		})
	}

	convert(connection, lease_id){
		var _this = this;
		this.verifyId();

		return models.Lead.save(connection, {lease_id: lease_id}, this.id).then(function (result) {
			return models.Lease.AddTenantToLease(connection, _this.contact_id, lease_id);
		}).then(() => {
			return this.updateStatus(connection, 'converted');
		})
	}

	updateStatus(connection, status){

		return Promise.resolve().then(() => {

			this.verifyId();

			if(status === this.status) return;

			if(validStatuses.indexOf(status) < 0) {
				e.th(400, 'Invalid Status');
			}

			if(status == 'new' && this.status != 'not contacted'){
				return;
			}

			if(status == 'not contacted' && this.status != 'new'){
				return;
			}

			var data = {
				status: status
			}

			if(status == 'not contacted') data.opened = moment.utc().format('YYYY-MM-DD HH:mm:ss');
			if(status == 'new') data.opened = null;

			return models.Lead.save(connection, data, this.id);
		})

	}

	verifyId(){
		if (!this.id) e.th(500, 'No lead id is set');
		return true;
	}
	
	verifyAccess(company_id){
		if(this.Contact.company_id != company_id) {
			e.th(403, "You are not authorized to view this resource");
		}
	}

	static async retireLeadsOlderThanDays(connection, daysAgo, property_id, company_id){
		return await models.Lead.retireLeadsOlderThanDays(connection, daysAgo,property_id, company_id);
	}

}

module.exports = Lead;

var Contact  = require(__dirname + '/contact.js');
var Lease  = require(__dirname + '/lease.js');
var Property  = require(__dirname + '/property.js');
var Unit  = require(__dirname + '/unit.js');
var Address  = require(__dirname + '/address.js');
var Company  = require(__dirname + '/company.js');