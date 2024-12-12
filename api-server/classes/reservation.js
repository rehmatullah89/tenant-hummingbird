"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var Fns = require(__dirname + '/../modules/functions.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Reservation {

	constructor(data) {
		data = data || {};
		this.id = data.id;
		this.lease_id = data.lease_id;
		this.expires = data.expires;
		this.date = data.date;
		this.created = data.created;
		this.time = data.time;
		this.created_by = data.created_by;
		this.Lease = {};

		
		return this;
	}

	find(connection, api){

		if(!this.id) throw new Error("Id Not Set");

		return models.Reservation.findById(connection, this.id).then(data => {

			if(!data) return e.th(400, "Reservation not found.");
			this.id = data.id;
			this.lease_id = data.lease_id;
			this.expires = data.expires;
			this.time = data.time;
			this.created = data.created;
			this.created_by = data.created_by;
			var lease = new Lease({id: data.lease_id});

			return lease.find(connection)
				.then(() => lease.findUnit(connection))
				.then(() => lease.getTenants(connection, api))
				.then(() => lease.getServices(connection))
				.then(()=> lease.getCurrentBalance(connection))
				.then(() => {
					this.Lease = lease;
					return;
				})
		})
	}

	async findByLeaseId(connection){
		if(!this.lease_id) throw new Error("Id Not Set");

		let data = await models.Reservation.findByLeaseId(connection, this.lease_id)

		if(!data) e.th(404, "Reservation not found.");

		this.id = data.id;
		this.lease_id = data.lease_id;
		this.expires = data.expires;
		this.time = data.time;
		this.created = data.created;
		this.created_by = data.created_by;

	}

	calculateLeaseCosts(connection, company_id, billed_months, created_by, apikey_id ){
		var _this = this;


		return Fns.generateInvoice(connection, this.Lease, company_id, this.Lease.Services, billed_months, false, created_by, apikey_id).then(invoice => {
			_this.Invoice = invoice;
			return true;

		})

	}

	save(connection){

		var _this = this;
		return Promise.resolve().then(function(){
			return _this.validate(connection);
		}).then(function(validationRes){
			var save = {
				lease_id: _this.lease_id,
				expires: _this.expires,
				time: _this.time,
				created: _this.created || moment.utc().format('YYYY-MM-DD HH:mm:ss'),
				created_by: _this.created_by
			};
			console.log("datato save", save)
			return models.Reservation.save(connection, save, _this.id).then(function(result) {
				if (result.insertId) _this.id = result.insertId;
				return true;
			});
		})

	}

	async update(connection, data, company_id, properties, user_id) {

		if (!this.id) e.th(500, "Id not set")

		// save the Lease reference
		let leaseUpdateObj = {};
		if (data.unit_id !== this.Lease.unit_id) {
		// Save Unit Reference
		let unit = new Unit({id: data.unit_id});
		await unit.find(connection);
		await unit.verifyAccess(connection, company_id, properties);
		leaseUpdateObj.unit_id = data.unit_id;
		}

		leaseUpdateObj.rent = data.rent;
		leaseUpdateObj.notes = data.comments;
		leaseUpdateObj.discount_id = data.discount_id;
		leaseUpdateObj.modified_by = user_id;

		try {


		await connection.beginTransactionAsync();

		await models.Lease.save(connection, leaseUpdateObj, this.Lease.id);


		// save the Contact Reference
		// Currently can only have one person on a reservation
		if (!data.contacts.length) e.th(400, "Please include contact information");
		let contact_data = data.contacts[0];
		if (!contact_data.id) e.th(400, "Please include the contact_id from the reservation");

		let contact = new Contact({id: data.contacts[0].id});
		await contact.find(connection, company_id);
		contact.first = contact_data.first;
		contact.middle = contact_data.middle;
		contact.last = contact_data.last;
		contact.email = contact_data.email;
		contact.Phones = contact_data.Phones;


		// TODO refactor save in ContactService
		await contact.save(connection);

		// Save the reservation reference (time)
		const reservation_data = {
			time: data.time,
			expires: data.expires,
		}

		await models.Reservation.save(connection, reservation_data, this.id);

		await connection.commitAsync();
		} catch(err) {
		await connection.rollbackAsync();
		}

	}

	deleteReservation(connection){
		if(!this.id) e.th(500, "Id not set");
		return models.Reservation.deleteReservation(connection, this.id, this.lease_id);
	}
	validate(){

		if(!this.lease_id) throw "Reservation details not set";
		if(!this.expires) throw "Reservation expiration not set";
		if(!this.time) throw "Reservation time not set";
		return true;
	}
}



module.exports = Reservation;

var Lease      = require('../classes/lease.js');
var Unit      = require('../classes/unit.js');
var Contact      = require('../classes/contact.js');
