"use strict";

var models          = require(__dirname + '/../models');
var settings        = require(__dirname + '/../config/settings.js');
var Promise         = require('bluebird');
var validator       = require('validator')
var moment          = require('moment');
var validation      = require('../modules/validation.js');


class Application {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.contact_id = data.contact_id || null;
		this.unit_id = data.unit_id || null;
		this.bankruptcy = data.bankruptcy;
		this.evicted = data.evicted;
		this.refused_to_pay = data.refused_to_pay;
		this.terms = data.terms;
		this.Unit = {};
		this.Contact = {};
	}

	addAddress(a){
		if(!a) return;
		this.Addresses.push({
			Address: {
				address: a.Address.address,
				city: a.Address.city,
				state: a.Address.state,
				zip: a.Address.zip
			},
			unit: a.unit,
			move_in: a.move_in,
			move_out: a.move_out,
			rent: a.rent,
			reason: a.reason,
			landlord: a.landlord,
			phone: a.phone
		});


		return true;
	}

	addEmployment(e){
		if(!e) return;
		this.Employment.push({
			status: e.status.join(','),
			position: e.position,
			employer: e.employer,
			supervisor: e.supervisor,
			phone: e.phone ? e.phone.replace(/[^0-9]/g, ''): null,
			start_date: e.start_date || null,
			end_date: e.end_date || null,
			salary: e.salary,
			salary_timeframe: e.salary_timeframe || null,
		});

		return true;
	}


	validate(){
		var _this = this;
		try {

			if (!_this.unit_id) throw 'Invalid unit id';
			return true;


		} catch(err){
			_this.msg = err.toString();
			return false;
		}

		return true;
	}

	save(connection){
		var _this = this;

		return Promise.resolve().then(function() {

			if (!_this.validate()) {
				throw _this.msg;
			}

			var save = {
				lease_id: _this.lease_id,
				contact_id: _this.contact_id,
				status: _this.status || 1,
				unit_id: _this.unit_id,
				bankruptcy : _this.bankruptcy,
				evicted : _this.evicted,
				refused_to_pay : _this.refused_to_pay,
				terms : _this.terms
			};

			return models.Application.save(connection, save, _this.id);


		}).then(function(result){

			_this.id = result;
			return;
			
		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})
	}

	findUnit(connection){
		var _this = this;


		//
		// if(!this.unit_id) {
		// 	var error = new Error("Unit Id Not set");
		// 	error.code = 500;
		// 	throw error;
		// };
		// var unit = new Unit({
		// 	id: this.unit_id
		// });
		// return unit.find(connection).then(() => {
		// 	return unit.getAddress(connection);
		// }).then(()=> {
		// 	_this.Unit = unit;
		// });

	}

	find(connection, company_id){

		var _this = this;
		return Promise.resolve().then(function() {
			if (!_this.id) {
				var error = new Error("No application id set");
				error.code = 500;
				throw error;
			}

			return models.Application.findById(connection, _this.id)

		}).then(function(data){
			
			if(!data){
				var error = new Error("Application not found");
				error.code = 404;
				throw error;
			}
			
			_this.id = data.id ;
			_this.lease_id = data.lease_id ;
			_this.unit_id = data.unit_id ;
			_this.contact_id = data.contact_id ;
			_this.status = data.status ;
			_this.bankruptcy = data.bankruptcy;
			_this.evicted = data.evicted;
			_this.refused_to_pay = data.refused_to_pay;
			_this.terms = data.terms;
			_this.created = data.created;
			_this.Unit = [];
			return models.Contact.findById(connection, _this.contact_id);

		}).then(function(contact){
			_this.Contact = new Contact(contact);

			return _this.Contact.find(connection, company_id)
				.then(() => _this.Contact.getContactRelationships(connection)).map(alternate => {

					alternate.Contact = new Contact({id: alternate.related_contact_id});
					return alternate.Contact.find(connection, company_id).then(() => {
						_this.Contact.Relationships.push(alternate);
						return true;
					});
				});

		})
		.then(() => this.Contact.getVehicles(connection))
		.then(() => this.Contact.getEmployment(connection))
			.then(() => {

			var unit = new Unit({id: _this.unit_id});
			return unit.find(connection)
				.then(() => unit.getAddress(connection))
				.then(() => {
				_this.Unit = unit;
				return true;
			});
		})

	}

	reject(connection){
		if (!this.id) throw 'No id is set';
		this.status = 2; // Rejected
		return models.Application.save(connection, {status: this.status}, this.id);
	}

	accept(connection, lease_id){
		var _this = this;

		if (!this.id) throw 'No id is set';
		var contact_id;

		return models.Application.save(connection, {lease_id: lease_id}, this.id).then(function (result) {
			return models.Lease.AddTenantToLease(connection, _this.contact_id, lease_id);
		});

	}

	configureTenant(){
		
		var _this = this;
		var t = {
			first:                      _this.first,
			middle:                     _this.middle,
			last:                       _this.last,
			email:                      _this.email,
			dob:                        _this.dob,
			ssn:                        _this.ssn,
			gender:                     _this.gender,
			phone:                      _this.phone,
			phone_home:                 _this.phone_home,
			phone_cell:                 _this.phone_cell,
			phone_business:             _this.phone_business,
			driver_license:             _this.driver_license,
			active_military:            _this.active_military,
			military_branch:            _this.military_branch,
			emergency_contact:          _this.emergency_contact,
			emergency_relationship:     _this.emergency_relationship,
			emergency_phone:            _this.emergency_phone,
			emergency_email:            _this.emergency_email,
			User: {
				first:                      _this.first,
				last:                       _this.last,
				email:                      _this.email,
				phone:                      _this.phone
			}
		};
		if(_this.Addresses.length >= 1 ){
			t.address_id = _this.Addresses[0].address_id;
			t.User.address_id = _this.Addresses[0].address_id;
			t.User.unit_number = _this.Addresses[0].unit;
		}

		return t;
	}
}



module.exports = Application;

var Address         = require('../classes/address.js');
var Contact = require(__dirname + '/../classes/contact.js');
var User = require(__dirname + '/../classes/user.js');
var Unit = require(__dirname + '/../classes/unit.js');