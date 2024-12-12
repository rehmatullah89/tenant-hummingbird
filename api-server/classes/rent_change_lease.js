"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var utils       = require(__dirname + '/../modules/utils.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');

class Rent_Change_Lease {

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

    let result = await  models.Rent_Change_Lease.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change Lease id required");
    let rent_change_lease = await  models.Rent_Change_Lease.findById(connection, this.id);
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
  }

  async findByRateChangeId(connection){

    if (!this.rate_change_id) e.th(400, "Rate Change id required");
    return await  models.Rent_Change_Lease.findByRateChangeId(connection, this.rate_change_id);
  }

  async findByLeaseId(connection){

    if (!this.lease_id && !this.rate_change_id) e.th(400, "lease id and rate_change_id required");
    let rent_change_lease = await  models.Rent_Change_Lease.findByLeaseId(connection, this.lease_id, this.rate_change_id);
    if(!rent_change_lease) e.th(500, "rent_change_lease record Not found");
    this.assembleRateChangeLease(rent_change_lease);
  }

  async update(connection, data){

    if (!this.id) e.th(400,"Rent Change lease id not set");
    this.assembleRateChangeLease(data);
    await this.save(connection);
  }

  async bulkSave(connection, body, data){

		if(!data || data.length == 0 ) e.th(400, "Data required cannot save empty object");

		let result = {};
		let prepareData = await this.calculateRent(connection, body, data);
		result = await models.Rent_Change_Lease.bulkSave(connection, prepareData);
		if(!result) e.th(500, "Record Not saved");
		return result;
  }

  async calculateRent(connection, body, data){
    let prepareData = [];
    let delta = null;
    let new_rent = null;
    let current_rent = null;
    let lease = null;
    let direction = body.change_direction === 'Increase' ? 1 : -1;
    let rounding = body.rounding && RoundOff.joinData(body.rounding);

		for (var v in data) {
      
      lease = new Lease({id: data[v].lease_id});
      await lease.find(connection);
      let rent_service = await lease.findActiveRentService(connection);
      current_rent = rent_service?.price || lease.rent; 

      switch (body.change_type) {
          case 'fixed':
              new_rent = body.change_amt;
              delta =  body.change_amt - current_rent;
              break;
          case 'percent':
              let change_amt = Math.round(((body.change_amt/100) * current_rent) * 1e2) / 1e2;
              delta = direction * change_amt;
              new_rent = (direction * change_amt) + current_rent;
              break;
          case 'dollar':
              delta = direction * body.change_amt;
              new_rent = (direction * body.change_amt) + current_rent;
              break;
      }

      new_rent = rounding ? RoundOff.convert({ value: new_rent, type: rounding }) : new_rent;
      delta = Math.abs(current_rent - new_rent);
			prepareData.push([data[v].rate_change_id, data[v].lease_id, data[v].notification_sent, data[v].deleted_at, data[v].change_amt, delta, new_rent]);
		}
    return prepareData;
  }

  async bulkUpdateRent(connection, rc_leases, body) {
    let updated_rent_change_leases = await this.calculateRent(connection, body, rc_leases);
    let data =[];
    rc_leases.forEach((rc, i) => {
      let row = [];
      row.push(rc.id);

      for(let j = 4; j < 7; j++) 
        row.push(updated_rent_change_leases[i][j]);

      data.push(row);
    })

    await models.Rent_Change_Lease.bulkUpdateRent(connection, data);
  }

  async bulkUpdate(connection, data){
		if(!data || data.length == 0 ) e.th(400, "Data required cannot save empty object");

		let result = {};

		let prepareData = [];

		for (var v in data) {
			prepareData.push([data[v].id, data[v].deleted_at])
		}

		result = await models.Rent_Change_Lease.bulkUpdate(connection, prepareData);
		if(!result) e.th(500, "Record Not saved");
		return result;
  }

  extractExemptedLeases(leaseIds, leaseDBRecords, selected_leases){

    let exemptedLeases = [];

    if(!leaseIds.length || !leaseDBRecords.length) e.th(500, "leaseId or leaseDBRecords are required.")

    for (var v in leaseDBRecords) {
      let lease = leaseIds.find(element => element.id === leaseDBRecords[v].lease_id);
      console.log("FOUND lease", lease)
      if(selected_leases){
        if(!lease) exemptedLeases.push(leaseDBRecords[v])
      } else{
        if(lease) exemptedLeases.push(leaseDBRecords[v])
      }

    }

    return exemptedLeases;
  }

  /* Todo: This is a duplicate of the function below, but the object structure is different. Should be combined */
  extractFoundLeases(leaseIds, leaseDBRecords){
    let selected_leases = [];

    if(!leaseIds.length || !leaseDBRecords.length) e.th(500, "leaseId or leaseDBRecords are required.")

    for (var v in leaseIds) {
      let lease = leaseDBRecords.find(element => element.id === leaseIds[v].lease_id);
      if(!lease) selected_leases.push(leaseIds[v])
    }

    return selected_leases;
  }

  async getRentChangeLease(connection, propertyId){
    let leaseData = await models.Rent_Change_Lease.getRentChangeLease(connection, this.id, propertyId);
    return leaseData;
  }

  extractSelectedLeases(leaseIds, leaseDBRecords){
    let selected_leases = [];

    if(!leaseIds.length || !leaseDBRecords.length) e.th(500, "leaseId or leaseDBRecords are required.")

    for (var v in leaseIds) {
      let lease = leaseDBRecords.find(element => element.lease_id === leaseIds[v].id);
      if(!lease) selected_leases.push(leaseIds[v])
    }

    return selected_leases;
  }

  async updateExemptedLeaseRecord(connection, leases) {
    for( var v in leases) {

      let lease = new Lease({id : leases[v].lease_id});
      await lease.find(connection);
      lease.rent_change_exempt = 1;
      await lease.save(connection);
    }

  }

  /**
   * This method will return Rent Management Settings
   * @returns Object
   */
  async getRentManagementSettings(connection, property_id){
    let rent_management_settings = await models.Rent_Change_Lease.getRentManagementSettings(connection, property_id)
    return rent_management_settings
  }

  /**
   * This method will return the email subject and message for sending rent change notification to tenants
   * @returns Object
   */
  async getDeliveryDetails(connection, property_id){
    let delivery_details = await models.Rent_Change_Lease.getDeliveryDetails(connection, property_id)
    return delivery_details
  }
  /**
   * This method will return rent changes for given lease IDs. 
   * Passing rate_change_id as parameter will return rent changes leases affected by that rate change
   * @param {*} connection 
   * @param {Array} lease_ids Lease IDs
   * @param {String} rate_change_id Rate Change ID (optional)
   * @returns Array of Leases
   */
   async findRentChangeLeases(connection, lease_ids, rate_change_id) {
    if (!lease_ids?.length) e.th(400, 'lease_ids are required')
    
    return await models.Rent_Change_Lease.findByLeaseIds(connection, lease_ids, rate_change_id)
  }
  /**
  Finds the latest rent changes for a given lease and rate change ID, if specified.
  @param {object} connection - The database connection.
  @param {string} lease_id - lease ID
  @param {string=} rate_change_id - (Optional) The ID of the rate change to search for within the rent change leases.
  @returns {Promise<object[]>} - A promise that resolves to an array of rent change lease objects.
  @throws {Error} - Throws an error with a status code of 400 if lease_id is not provided.
  */
  async findLatestRentChanges(connection, lease_id, rate_change_id) {
    if (!lease_id) e.th(400, 'lease_id is required')
    return await models.Rent_Change_Lease.findLatestRentChanges(connection, lease_id, rate_change_id)
  }
}

module.exports = Rent_Change_Lease;

var Lease = require(__dirname + '/../classes/lease.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');
