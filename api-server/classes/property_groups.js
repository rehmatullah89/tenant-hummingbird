"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');

var validation    = require(__dirname + '/../modules/validation.js');
var Utils = require(__dirname + '/../modules/utils.js');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();


class PropertyGroup {

  constructor(data){

    data = data || {};
    this.id = data.id;
    this.company_id = data.company_id;
    this.name = data.name;
    this.global = data.global || 0;
    this.property_ids = [];
    this.Properties = [];
  }

  async find(connection){
    let group = {};
    if(!this.id && !this.name) {
      e.th(500, 'Property id not set');
    }

    if(this.id){
      group = await models.PropertyGroup.findById(connection, this.id);
    } else {
      group = await models.PropertyGroup.findByName(connection, this.name);
    }

    if (!group) e.th(404,"Property Group not found." );

    this.id = group.id;
    this.company_id = group.company_id;
    this.name = group.name;
    this.global = group.global;
    this.created = group.created;
  }

  async save(connection){

    await this.validate(connection);

    let save = {
      company_id: this.company_id,
      name: this.name,
      global: this.global
    };
    let result = await models.PropertyGroup.save(connection, save, this.id)
    if(!this.id){
      this.id = result.insertId;
    }

    await models.PropertyGroup.deleteProperties(connection, this.property_ids, this.id );
    for(let i = 0; i < this.property_ids.length; i++){
      await models.PropertyGroup.saveProperty(connection, this.property_ids[i], this.id );
    }

  }

  update(data){

    if(typeof data.id != 'undefined') this.id = data.id;
    if(typeof data.name != 'undefined') this.name = data.name;
    if(typeof data.global != 'undefined') this.global = data.global;
    if(typeof data.company_id != 'undefined') this.company_id = data.company_id;


  }


  async addProperties(connection, property_ids, properties){
    if(typeof property_ids != 'undefined') this.property_ids = property_ids;

    for(let i = 0; i < this.property_ids.length; i++){
      let property = new Property({id: this.property_ids[i]});
      await property.find(connection);
      await property.verifyAccess({company_id: this.company_id, properties});
    }

  }

  async validate (connection){

    if(!this.company_id) e.th(500, "Company Id Not Set");
    if(!this.name) e.th(400, "Please enter a name for this group");

    let existing = await models.PropertyGroup.findByName(connection, this.name, this.company_id);
    if(existing && existing.find(e => e.id !== this.id)){
      e.th(409, "A group with this name already exists");
    }

  }
  verifyAccess(company_id){

    if (company_id !== this.company_id) {
      e.th(401,"You are not authorized to view this resource");
    }
  }
  async getProperties(connection){
    if(!this.id) e.th(500, "Id missing");
    let properties = await models.PropertyGroup.findProperties(connection, this.id);
    for(let i = 0; i < properties.length; i++){
      let property = new Property({id: properties[i].property_id});
      await property.find(connection);
      this.Properties.push(property);
    }
  }

  async delete(connection){
    if(!this.id) e.th(500, "Id missing");
    await models.PropertyGroup.deletePropertiesFromGroup(connection, this.id)
    await models.PropertyGroup.deletePropertyGroup(connection, this.id);
  }


  static async findByCompanyId(connection, company_id, params){
    if(!company_id) e.th(500, "Company id missing");
    params.company_id = company_id;
    return await models.PropertyGroup.find(connection, params);
  }

}

module.exports = PropertyGroup;
var Property      = require('../classes/property.js');

