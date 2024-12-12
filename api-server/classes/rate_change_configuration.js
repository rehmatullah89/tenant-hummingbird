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

  async save(connection, user) {

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

    let result = await  models.Rate_Change_Configuration.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
    await this.saveRounding(connection, user);
  }

  async saveRounding(connection, user) {
    let data = {
      object_id : this.id,
      object_type: 'scheduled_rate_change',
      rounding_type: this.rounding,
      status: 1,
      created_by: user?.id
    }
    let rounding = new Rounding(data);
    await rounding.update(connection);
  }

  static async findAll(connection, conditions, company_id, properties) {

    if (!company_id) e.th(400, "company_id is not specified");
    return await models.Rate_Change_Configuration.findAll(connection, conditions, company_id, properties);
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change Configuration id id required");
    let rate_change_configuration = await  models.Rate_Change_Configuration.findById(connection, this.id);
    await this.assembleRateChangeConfiguration(rate_change_configuration);
  }

  transformRounding(split = false){
    if(split) this.rounding = RoundOff.splitData(this.rounding);
    else this.rounding = RoundOff.joinData(this.rounding);
  }

  async update(connection, data, user){

    if (!this.id) e.th(400, "Rate Change Configuration id not set");
    this.assembleRateChangeConfiguration(data);
    if(typeof this.rounding !== 'string') this.transformRounding();
    await this.save(connection, user);
  }

  async deleteRounding(connection){
    let rounding = new Rounding({object_id: this.id});
    await rounding.deleteByObjectId(connection);
  }

  async saveDuplicate(connection){
    if(this.id) this.id  = null;
    await this.save(connection);
  }

  assembleRateChangeConfiguration(data){

    if(!data) e.th(404,"Invalid rate_change_configuration.");

    if(typeof data.id !== 'undefined' && !this.id) this.id = data.id;
    if(typeof data.property_id !== 'undefined') this.property_id = data.property_id;
    if(typeof data.name !== 'undefined') this.name = data.name;
    if(typeof data.type !== 'undefined') this.type = data.type;
    if(typeof data.change_length !== 'undefined') this.change_length = data.change_length;
    if(typeof data.change_period !== 'undefined') this.change_period = data.change_period;
    if(typeof data.frequency !== 'undefined') this.frequency = data.frequency;
    if(typeof data.change_amt !== 'undefined') this.change_amt = data.change_amt;
    if(typeof data.trigger !== 'undefined') this.trigger = data.trigger;
    if(typeof data.notification_period !== 'undefined') this.notification_period = data.notification_period;
    if(typeof data.change_direction !== 'undefined') this.change_direction = data.change_direction;
    if(typeof data.change_type !== 'undefined') this.change_type = data.change_type;
    if(typeof data.document_id !== 'undefined') this.document_id = data.document_id;
    if(typeof data.email_text !== 'undefined') this.email_text = data.email_text;
    if(typeof data.email_subject !== 'undefined') this.email_subject = data.email_subject;
    if(typeof data.deleted_at !== 'undefined') this.deleted_at = data.deleted_at;
    if(typeof data.rounding !== 'undefined') this.rounding = data.rounding;
  }
}



module.exports = Rate_Change_Configuration;

var Rounding      = require(__dirname + '/../classes/rounding.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');