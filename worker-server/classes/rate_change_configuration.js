"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');



class Rate_Change_Configuration {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.property_id = data.property_id || null;
    this.name = data.name || null;
    this.type = data.type || null;
    this.change_length = data.change_length || null;
    this.change_period = data.change_period || null;
    this.frequency = data.frequency || null;
    this.change_amt = data.change_amt || null;
    this.trigger = data.trigger || null;
    this.notification_period = data.notification_period || null;
    this.change_direction = data.change_direction || null;
    this.change_type = data.change_type || null;
    this.document_id = data.document_id || null;
    this.email_text = data.email_text || null;
    this.email_subject = data.email_subject || null;
    this.deleted_at = data.deleted_at|| null;
    this.rounding = (data.rounding && RoundOff.joinData(data.rounding)) || null;
  }

  async save(connection) {

    var save = {
        id : this.id,
        property_id : this.property_id,
        name : this.name,
        type : this.type,
        change_length : this.change_length,
        change_period : this.change_period,
        frequency : this.frequency,
        change_amt : this.change_amt,
        trigger : this.trigger,
        notification_period : this.notification_period,
        change_direction : this.change_direction,
        change_type : this.change_type,
        document_id : this.document_id,
        email_text : this.email_text,
        email_subject : this.email_subject,
        deleted_at : this.deleted_at,
    }

    let result = await  models.RateChangeConfiguration.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
    return;
  }


  async findAllByPropertyId(connection) {

    if (!this.property_id) e.th(400, "property_id not set");
    return await models.RateChangeConfiguration.findAllByPropertyId(connection, this.property_id);
  }

  async findAllByType(connection) {

    if (!this.type) e.th(400, "type not set");
    return await models.RateChangeConfiguration.findByType(connection, this.type);
  }

  async findAllByPropertyAndType(connection){
    if(!this.property_id || !this.type) e.th(400, "Property id and type is required");
    return await models.RateChangeConfiguration.findAllByPropertyAndType(connection, this.property_id, this.type);
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change Configuration id id required");
    let rate_change_configuration = await  models.RateChangeConfiguration.findById(connection, this.id);
    await this.assembleRateChangeConfiguration(rate_change_configuration);
  }

  async update(connection, data){

    if (!this.id) e.th(400,"Rate Change Configuration id not set");
    this.assembleRateChangeConfiguration(data);
    return this.save(connection);
  }

  async saveDuplicate(connection){

    if(this.id) this.id  = null;
    return await this.save(connection);
  }

  assembleRateChangeConfiguration(rate_change_configuration){

    if(!rate_change_configuration) e.th(404,"Invalid rate_change_configuration.");
    if(typeof rate_change_configuration.id !== 'undefined' && !this.id) this.id = rate_change_configuration.id;
    if(typeof rate_change_configuration.property_id !== 'undefined') this.property_id = rate_change_configuration.property_id;
    if(typeof rate_change_configuration.name !== 'undefined') this.name = rate_change_configuration.name;
    if(typeof rate_change_configuration.type !== 'undefined') this.type = rate_change_configuration.type;
    if(typeof rate_change_configuration.change_length !== 'undefined') this.change_length = rate_change_configuration.change_length;
    if(typeof rate_change_configuration.change_period !== 'undefined') this.change_period = rate_change_configuration.change_period;
    if(typeof rate_change_configuration.frequency !== 'undefined') this.frequency = rate_change_configuration.frequency;
    if(typeof rate_change_configuration.change_amt !== 'undefined') this.change_amt = rate_change_configuration.change_amt;
    if(typeof rate_change_configuration.trigger !== 'undefined') this.trigger = rate_change_configuration.trigger;
    if(typeof rate_change_configuration.notification_period !== 'undefined') this.notification_period = rate_change_configuration.notification_period;
    if(typeof rate_change_configuration.change_direction !== 'undefined') this.change_direction = rate_change_configuration.change_direction;
    if(typeof rate_change_configuration.change_type !== 'undefined') this.change_type = rate_change_configuration.change_type;
    if(typeof rate_change_configuration.document_id !== 'undefined') this.document_id = rate_change_configuration.document_id;
    if(typeof rate_change_configuration.email_text !== 'undefined') this.email_text = rate_change_configuration.email_text;
    if(typeof rate_change_configuration.email_subject !== 'undefined') this.email_subject = rate_change_configuration.email_subject;
    if(typeof rate_change_configuration.deleted_at !== 'undefined') this.deleted_at = rate_change_configuration.deleted_at;
    if(typeof data.rounding !== 'undefined') this.rounding = data.rounding;
    return;
  }

}



module.exports = Rate_Change_Configuration;