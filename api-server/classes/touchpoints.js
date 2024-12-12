"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Touchpoint {

  constructor(data) {

    data = data || {};
    this.id = data.id || null;

    this.contact_id = data.contact_id;
    this.activity_id = data.activity_id;
    this.event_type = data.event_type;
    this.record_type = data.record_type;
    this.platform_source = data.platform_source;
    this.platform_device = data.platform_device;
    this.platform_dossier = data.platform_dossier;
    this.platform_tenant = data.platform_tenant;
    this.referrer_request_url = data.referrer_request_url;
    this.referrer_url = data.referrer_url;
    this.referrer_domain = data.referrer_domain;
    this.referrer_device = data.referrer_device;
    this.referrer_source = data.referrer_source;
    this.referrer_medium = data.referrer_medium;
    this.referrer_keyword = data.referrer_keyword;
    this.referrer_cid = data.referrer_cid;
    this.referrer_query = data.referrer_query;
    this.referrer_gclid = data.referrer_gclid;
    this.referrer_fbclid = data.referrer_fbclid;
    this.referrer_timestamp = data.referrer_timestamp;

  }


  async find(connection){
    await models.Touchpoint.save(connection, data, this.id);

  }

  make(data, contact_id){

    this.contact_id = contact_id;
    this.event_type = data.event_type;
    this.record_type = data.record_type;
    this.platform_source = data.platform_source;
    this.platform_device = data.platform_device;
    this.platform_dossier = data.platform_dossier;
    this.platform_tenant = data.platform_tenant;
    this.referrer_request_url = data.referrer_request_url;
    this.referrer_url = data.referrer_url;
    this.referrer_domain = data.referrer_domain;
    this.referrer_device = data.referrer_device;
    this.referrer_source = data.referrer_source;
    this.referrer_medium = data.referrer_medium;
    this.referrer_keyword = data.referrer_keyword;
    this.referrer_cid = data.referrer_cid;
    this.referrer_query = data.referrer_query;
    this.referrer_gclid = data.referrer_gclid;
    this.referrer_fbclid = data.referrer_fbclid;
    this.referrer_timestamp = data.referrer_timestamp;

  }

  async save(connection){

    await this.validate();
    let data = {};
    data.contact_id = this.contact_id;
    data.event_type = this.event_type;
    data.record_type = this.record_type;
    data.platform_source = this.platform_source;
    data.platform_device = this.platform_device;
    data.platform_dossier = this.platform_dossier;
    data.platform_tenant = this.platform_tenant;
    data.referrer_request_url = this.referrer_request_url;
    data.referrer_url = this.referrer_url;
    data.referrer_domain = this.referrer_domain;
    data.referrer_device = this.referrer_device;
    data.referrer_source = this.referrer_source;
    data.referrer_medium = this.referrer_medium;
    data.referrer_keyword = this.referrer_keyword;
    data.referrer_cid = this.referrer_cid;
    data.referrer_query = this.referrer_query;
    data.referrer_gclid = this.referrer_gclid;
    data.referrer_fbclid = this.referrer_fbclid;
    data.referrer_timestamp = this.referrer_timestamp;
    console.log(data);
    this.id = await models.Touchpoint.save(connection, data, this.id);
  }


  async validate(){

    await Promise.resolve();
    if(!this.contact_id) e.th(400, "Contact id missing from attribution");
    if(!this.event_type) e.th(400, "Event type missing from attribution");

  }

}

module.exports = Touchpoint;
