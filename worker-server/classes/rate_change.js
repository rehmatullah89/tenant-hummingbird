"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');

class RateChange {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.rate_change_configuration_id = data.rate_change_configuration_id || null;
    this.property_id = data.property_id || null;
    this.name = data.name || null;
    this.type = data.type || null;
    this.change_amt = data.change_amt || null;
    this.notification_period = data.notification_period || null;
    this.change_direction = data.change_direction || null;
    this.change_type = data.change_type || null;
    this.document_id = data.document_id || null;
    this.email_text = data.email_text || null;
    this.email_subject = data.email_subject || null;
    this.deleted_at = data.deleted_at || null;
    this.reviewed = data.reviewed || null;
    this.completed = data.completed || null;
    this.target_date = data.target_date || null;
    this.skipped = data.skipped || null;
    this.upload_id = data.upload_id || null;
    this.rounding = data.rounding || null;
    this.delivery_methods_id = data.delivery_methods_id || null;

    this.RentChangeLeases = [];
  }

  async save(connection) {

    var save = {
      id : this.id,
      rate_change_configuration_id : this.rate_change_configuration_id,
      property_id : this.property_id,
      name : this.name,
      type : this.type,
      change_amt : this.change_amt,
      notification_period : this.notification_period,
      change_direction : this.change_direction,
      change_type : this.change_type,
      document_id : this.document_id,
      email_text : this.email_text,
      email_subject : this.email_subject,
      deleted_at : this.deleted_at,
      reviewed : this.reviewed,
      completed : this.completed,
      target_date : this.target_date,
      skipped : this.skipped,
      upload_id : this.upload_id,
      delivery_methods_id : this.delivery_methods_id,
    }

    let result = await  models.RateChanges.save(connection, save, this.id);
    if (result.insertId) this.id = result.insertId;
    await this.saveRounding(connection);
  }

  async saveRounding(connection) {
    let data = {
      object_id : this.id,
      object_type: 'rate_change',
      rounding_type: this.rounding,
      status: 1
    }
    let rounding = new Rounding(data);
    await rounding.update(connection);
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change id required");
    let rate_change = await  models.RateChanges.findById(connection, this.id);
    this.assembleRateChange(rate_change);
  }

  static async findAll(connection, company_id, params, properties){
	  let rate_changes = await models.RateChanges.findRateChanges(connection, company_id, params, properties);
	  return rate_changes;
  }

  assembleRateChange(rate_change){
    console.log("rate_change", rate_change)
    if(!rate_change) e.th(404,"Invalid rate_change.");
    if(typeof rate_change.id !== 'undefined' && !this.id) this.id = rate_change.id;
    if(typeof rate_change.rate_change_configuration_id !== 'undefined') this.rate_change_configuration_id = rate_change.rate_change_configuration_id;
    if(typeof rate_change.property_id !== 'undefined') this.property_id = rate_change.property_id;
    if(typeof rate_change.name !== 'undefined') this.name = rate_change.name;
    if(typeof rate_change.type !== 'undefined') this.type = rate_change.type;
    if(typeof rate_change.change_amt !== 'undefined') this.change_amt = rate_change.change_amt;
    if(typeof rate_change.notification_period !== 'undefined') this.notification_period = rate_change.notification_period;
    if(typeof rate_change.change_direction !== 'undefined') this.change_direction = rate_change.change_direction;
    if(typeof rate_change.change_type !== 'undefined') this.change_type = rate_change.change_type;
    if(typeof rate_change.document_id !== 'undefined') this.document_id = rate_change.document_id;
    if(typeof rate_change.email_text !== 'undefined') this.email_text = rate_change.email_text;
    if(typeof rate_change.email_subject !== 'undefined') this.email_subject = rate_change.email_subject;
    if(typeof rate_change.deleted_at !== 'undefined') this.deleted_at = rate_change.deleted_at;
    if(typeof rate_change.reviewed !== 'undefined') this.reviewed = rate_change.reviewed;
    if(typeof rate_change.completed !== 'undefined') this.completed = rate_change.completed;
    if(typeof rate_change.target_date !== 'undefined') this.target_date = rate_change.target_date;
    if(typeof rate_change.skipped !== 'undefined') this.skipped = rate_change.skipped;
    if(typeof rate_change.upload_id !== 'undefined') this.upload_id = rate_change.upload_id || null;
    if(typeof rate_change.rounding !== 'undefined') this.rounding = rate_change.rounding;
    if(typeof rate_change.delivery_methods_id !== 'undefined') this.delivery_methods_id = rate_change.delivery_methods_id;

  }

  async update(connection, data){
    if (!this.id) e.th(400, "Rate Change id not set");
    this.assembleRateChange(data);
    await this.save(connection);
  }

  async saveDuplicate(connection){

    if(this.id) this.id  = null;
    await this.save(connection);
  }

  async findRentChangeLeases(connection){
    if (!this.id) e.th(400, "Rate Change id not set");
    let rate_change_leases = await models.RateChanges.findRateChangeLeases(connection, this.id);
	  this.RentChangeLeases = rate_change_leases;
  }
  
  async getStats(connection){
    let property = new Property({id: this.property_id});
    await property.getUnitCount(connection);
    await property.getLeaseCount(connection);
    let categories = await property.getUnitCategories(connection, 1, this.property_id);

    let sum_occupancy = 0;
    for(let j = 0; j < categories.length; j++){
        sum_occupancy += ((categories[j].Units.unit_count - categories[j].Vacant.unit_count) / categories[j].Units.unit_count) * 1e2;
    }

    let target_date = moment(new Date(this.target_date), 'YYYY-MM-DD') ;
    this.target_group_occupancy =  Math.round((sum_occupancy/categories.length) * 1e2) / 1e2;
    this.scheduled_date = target_date.clone().endOf('day').subtract(this.notification_period , 'days').format('YYYY-MM-DD');
    
    let store_occupancy = (property.lease_count / property.unit_count) * 1e2
    this.store_occupancy =  Math.round(store_occupancy * 1e2) / 1e2;
    this.move_out_after_raise = 0;

    let revenue = 0;
    let total_tenants = 0;

    let is_uploaded = true;
    let is_emailed = true;
    
    for(let k = 0; k < this.RentChangeLeases.length; k++){
        if(this.RentChangeLeases[k].deleted_at){
            continue;
        }

        let lease = new Lease({id: this.RentChangeLeases[k].lease_id});
        await lease.find(connection);
        let hasMoveOut = lease.end_date && moment(lease.end_date, 'YYYY-MM-DD') < moment().endOf('day');

        this.move_out_after_raise += +hasMoveOut;
        total_tenants += +(!hasMoveOut);

        if(is_uploaded && !(this.RentChangeLeases[k].status == 'done' || this.RentChangeLeases[k].status == 'error')){
          is_uploaded = false;
          is_emailed = false;
        }
        
        let activeRentService = await Service.getActiveRentService(connection, lease.id, moment(this.target_date));

        let direction = this.change_direction === 'Increase' ? 1 : -1;
        switch (this.change_type) {
            case 'fixed':
                revenue += (this.change_amt - activeRentService.price);
                break;
            case 'percent':
                revenue += (direction * ((this.change_amt/1e2) * activeRentService.price));
                break;
            case 'dollar':
                revenue += (direction * this.change_amt);
                break;
        }
    }

    this.is_uploaded = is_uploaded;
    this.is_emailed = is_emailed;
    this.monthly_revenue = Math.round(revenue * 1e2) / 1e2;
    this.Total = total_tenants;
  }

}


module.exports = RateChange;
var Property      = require('../classes/property.js');
var Lease         = require('../classes/lease.js');
var Service       = require('../classes/service.js');
var Rounding      = require(__dirname + '/../classes/rounding.js');