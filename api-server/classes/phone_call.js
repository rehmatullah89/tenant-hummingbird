var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

var validator = require('validator');
var moment      = require('moment');
var Activity  = require(__dirname + '/../classes/activity.js');
var Accounting  = require('../classes/accounting.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Phone_Call{

  constructor(data){

      data = data || {};
      this.id = data.id || null;
      this.direction = data.direction || null;
      this.status = data.status;  // cannot set payment methods ID in the constructor.
      this.conference_name = data.conference_name || null;
      this.source_tag = data.source_tag || null;
      this.call_id = data.call_id;
      this.facility_id = data.facility_id;
      this.owner_id = data.owner_id;
      this.from_phone = data.from_phone || null;
      this.via_phone = data.via_phone || null;
      this.to_phone = data.to_phone || 0;
      this.time_stamp = data.time_stamp || null;
      this.name = data.name || null;
      this.recording_url = data.recording_url || null;
      this.notes = data.notes || null;
      this.zip_code = data.zip_code || null;
      this.duration = data.duration;
      this.start_time = data.start_time || null;
      this.user_contact_id = data.user_contact_id || null;
      this.conference_name = data.conference_name || null;
      this.interaction_id = data.interaction_id
  }

  savePhoneEvent(connection){
    return models.Phone_Call.savePhoneEvent(connection, this);
  }

  async getPhoneEvent(connection, call_id) {
    if(call_id){
      return await models.Phone_Call.findPhoneEventByCallId(connection, call_id);
    }
    return;
  }

  async updatePhoneCallHoldStatus(connection){
    let hold = await models.Phone_Call.findPhoneCallHoldRecord(connection, this);
    let data;
    if(hold.hold_id != null){
      data = {
        end_time : moment().format('YYYY-MM-DD HH:mm:ss')
      }
    }
    else{
      data = {
        phone_call_id : this.id,
        start_time : moment().format('YYYY-MM-DD HH:mm:ss')
      }
    }
    console.log('data',data);
    return models.Phone_Call.updatePhoneCallHoldStatus(connection, hold, data);
  }
  async find(connection) {
    return await models.Phone_Call.findById(connection, this.id);
  }

  async findByInteractionId(connection, interaction_id) {
    return await models.Phone_Call.findByInteractionId(connection, interaction_id);
  }
}

module.exports = Phone_Call;
