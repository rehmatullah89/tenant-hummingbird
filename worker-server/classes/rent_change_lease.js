"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');

class RentChangeLease {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.rate_change_id = data.rate_change_id || null;
    this.lease_id = data.lease_id || null;
    this.upload_id = data.upload_id || null;
    this.interaction_id = data.interaction_id || null;
    this.notification_sent = data.notification_sent || null;
    this.change_amt = data.change_amt || null;
    this.deleted_at = data.deleted_at || null;
    this.status = data.status || null;
    this.message = data.message || null;
    this.change_applied = data.change_applied || null;
    this.service_id = data.service_id || null;
    this.new_rent_amt = data.new_rent_amt || null;
  }

  async save(connection) {

    var save = {
      id : this.id,
      rate_change_id : this.rate_change_id,
      lease_id : this.lease_id,
      upload_id : this.upload_id,
      interaction_id : this.interaction_id,
      notification_sent : this.notification_sent,
      change_amt : this.change_amt,
      deleted_at : this.deleted_at,
      status : this.status,
      message : this.message,
      change_applied : this.change_applied,
      service_id : this.service_id
    }

    let result = await  models.RentChangeLease.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
    return true;
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change Lease id required");
    let rent_change_lease = await  models.RentChangeLease.findById(connection, this.id);
    this.assembleRateChangeLease(rent_change_lease);
  }

  assembleRateChangeLease(rent_change_lease){

    if(!rent_change_lease) e.th(404,"Invalid rent_change_lease.");
    if(typeof rent_change_lease.id !== 'undefined' && !this.id) this.id = rent_change_lease.id;
    if(typeof rent_change_lease.rate_change_id !== 'undefined') this.rate_change_id = rent_change_lease.rate_change_id;
    if(typeof rent_change_lease.lease_id !== 'undefined') this.lease_id = rent_change_lease.lease_id;
    if(typeof rent_change_lease.upload_id !== 'undefined') this.upload_id = rent_change_lease.upload_id;
    if(typeof rent_change_lease.interaction_id !== 'undefined') this.interaction_id = rent_change_lease.interaction_id;
    if(typeof rent_change_lease.notification_sent !== 'undefined') this.notification_sent = rent_change_lease.notification_sent;
    if(typeof rent_change_lease.change_amt !== 'undefined') this.change_amt = rent_change_lease.change_amt;
    if(typeof rent_change_lease.deleted_at !== 'undefined') this.deleted_at = rent_change_lease.deleted_at;
    if(typeof rent_change_lease.status !== 'undefined') this.status = rent_change_lease.status;
    if(typeof rent_change_lease.message !== 'undefined') this.message = rent_change_lease.message;
    if(typeof rent_change_lease.change_applied !== 'undefined') this.change_applied = rent_change_lease.change_applied;
    if(typeof rent_change_lease.service_id !== 'undefined') this.service_id = rent_change_lease.service_id;
    if(typeof rent_change_lease.new_rent_amt !== 'undefined') this.new_rent_amt = rent_change_lease.new_rent_amt;
  }

  async findByRateChangeId(connection){

    if (!this.rate_change_id) e.th(400, "Rate Change id required");
    return await models.RentChangeLease.findByRateChangeId(connection, this.rate_change_id);
  }

  async findByLeaseId(connection){

    if (!this.lease_id && !this.rate_change_id) e.th(400, "lease id and rate_change_id required");
    let rent_change_lease = await  models.RentChangeLease.findByLeaseId(connection, this.lease_id, this.rate_change_id);
    if(!rent_change_lease) e.th(500, "rent_change_lease record Not found");
    this.assembleRateChangeLease(rent_change_lease);
  }

  async update(connection, data){

    if (!this.id) e.th(400,"Rent Change lease id not set");
    this.assembleRateChangeLease(data);
    await this.save(connection);
  }

  async bulkSave(connection, rate_change, data){

		if(!data || data.length == 0 ) e.th(400, "Data required cannot save empty object");

		let result = {};

		let prepareData = [];

    let delta = null;
    let new_rent = null;
    let current_rent = null;
    let direction = rate_change.change_direction === 'Increase' ? 1 : -1;
    let rounding = rate_change?.rounding;

		for (var v in data) {

      current_rent = data[v].current_rent;
      switch (rate_change.change_type) {
          case 'fixed':
              new_rent = rate_change.change_amt;
              delta =  rate_change.change_amt - current_rent;
              break;
          case 'percent':
              let change_amt = Math.round(((rate_change.change_amt/100) * current_rent) * 1e2) / 1e2;
              delta = direction * change_amt;
              new_rent = (direction * change_amt) + current_rent;
              break;
          case 'dollar':
              delta = direction * rate_change.change_amt;
              new_rent = (direction * rate_change.change_amt) + current_rent;
              break;
      }

      new_rent = rounding ? RoundOff.convert({ value: new_rent, type: rounding }) : new_rent;
      delta = Math.abs(current_rent - new_rent);
			prepareData.push([data[v].rate_change_id, data[v].lease_id, data[v].notification_sent, data[v].deleted_at, data[v].change_amt, delta, new_rent]);
		}

		result = await models.RentChangeLease.bulkSave(connection, prepareData);
		if(!result) e.th(500, "Record Not saved");
		return result;
  }

  async bulkUpdate(connection, data){
		if(!data || data.length == 0 ) e.th(400, "Data required cannot save empty object");

		let result = {};

		let prepareData = [];

		for (var v in data) {
			prepareData.push([data[v].id, data[v].deleted_at])
		}

		result = await models.RentChangeLease.bulkUpdate(connection, prepareData);
		if(!result) e.th(500, "Record Not saved");
		return result;
  }

  extractExemptedLeases(leaseIds, leaseDBRecords){
    
    let exemptedLeases = [];

    if(leaseIds.length == 0 || leaseDBRecords.length == 0) e.th(500, "leaseId or leaseDBRecords are required.")
    for (var v in leaseDBRecords) {
      let lease = leaseIds.find(element => element.id == leaseDBRecords[v].lease_id);
      if(!lease) exemptedLeases.push(leaseDBRecords[v])
    }
    return exemptedLeases;
  }

  async updateExemptedLeaseRecord(connection, leases) {
    for( var v in leases) {

      let lease = new Lease({id : leases[v].lease_id});
      await lease.find(connection);
      lease.rent_change_exempt = 1;
      await lease.save(connection);
    }

  }
}

module.exports = RentChangeLease;

var Lease = require(__dirname + '/../classes/lease.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');
// var Document = require(__dirname + '/../classes/document.js');
// var Upload = require(__dirname + '/../classes/upload.js');

