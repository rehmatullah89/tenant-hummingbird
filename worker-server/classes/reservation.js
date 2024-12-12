"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var Fns = require(__dirname + '/../modules/functions.js');


class Reservation {

	constructor(data) {
		data = data || {};
		this.id = data.id;
		this.lease_id = data.lease_id;
		this.expires = data.expires;
		this.date = data.date;
		this.created = data.created;
		this.time = data.time;

		this.Lease = {};

		return this;
	}

	find(connection){

		if(!this.id) throw new Error("Id Not Set");
		
		return models.Reservation.findById(connection, this.id).then(data => {

			this.id = data.id;
			this.lease_id = data.lease_id;
			this.expires = data.expires;
			this.time = data.time;
			this.created = data.created;
			
			var lease = new Lease({id: data.lease_id});

			return lease.find(connection)
				.then(() => lease.findUnit(connection))
				.then(() => lease.getTenants(connection))
				.then(() => lease.getServices(connection))
				.then(()=> lease.getCurrentBalance(connection)).then(() => {
					this.Lease = lease;
					return;
				})
		})
	}

	calculateLeaseCosts(connection, company_id, billed_months ){
		var _this = this;


		return Fns.generateInvoice(connection, this.Lease, company_id, this.Lease.Services, billed_months, false).then(invoice => {
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
				created: _this.created
			};

			return models.Reservation.save(connection, save, _this.id).then(function(result) {
				if (result.insertId) _this.id = result.insertId;
				return true;
			});
		})

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