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


class ProductCategory {

  constructor(data){

    data = data || {};
    this.id = data.id;
    this.company_id = data.company_id;
    this.name = data.name;
  }

  async find(connection){
    let cat = {};
    if(!this.id && !this.name) {
      e.th(500, 'Product category id not set');
    }

    if(this.id){
      cat = await models.ProductCategory.findById(connection, this.id);
    } else {
      cat = await models.ProductCategory.findByName(connection, this.name);
    }

    if (!cat) e.th(404,"Product Category not found." );

    this.id = cat.id;
    this.company_id = cat.company_id;
    this.name = cat.name;
    this.created = cat.created;

  }

  async save(connection){

    await this.validate(connection);

    let save = {
      company_id: this.company_id,
      name: this.name,
    };
    let result = await models.ProductCategory.save(connection, save, this.id);
    if(!this.id){
      this.id = result.insertId;
    }

  }

  update(data){

    if(typeof data.id !== 'undefined') this.id = data.id;
    if(typeof data.name !== 'undefined') this.name = data.name;
    if(typeof data.company_id !== 'undefined') this.company_id = data.company_id;

  }

  async validate (connection){

    if(!this.company_id) e.th(500, "Company Id Not Set");
    if(!this.name) e.th(400, "Please enter a name for this category");

    let existing = await models.ProductCategory.findByName(connection, this.name, this.company_id);
    if(existing && existing.find(e => e.id !== this.id)){
      e.th(409, "A category with this name already exists");
    }

  }
  verifyAccess(company_id){

    if (company_id !== this.company_id) {
      e.th(401,"You are not authorized to view this resource");
    }
  }


  async delete(connection){
    if(!this.id) e.th(500, "Id missing");
    await models.ProductCategory.deleteProductCategory(connection, this.id);
  }


  static async findByCompanyId(connection, company_id, params){
    if(!company_id) e.th(500, "Company id missing");
    params.company_id = company_id;
    return await models.ProductCategory.find(connection, params);
  }

}

module.exports = ProductCategory;
var Product      = require('../classes/product.js');

