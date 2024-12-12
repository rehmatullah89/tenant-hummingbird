"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class ProductRule{
  constructor(data){
    data = data || {};
    this.id = data.id ;
    this.product_id = data.product_id;
    this.property_id = data.property_id;
    this.price = data.price;
    this.type = data.type;
    this.rent_threshold = data.rent_threshold;
  }
  
  async save(connection){
    let save = {
      property_id: this.property_id,
      product_id: this.product_id,
      type: this.type,
      price: this.price,
      rent_threshold: this.rent_threshold
    };

    let result = await models.ProductRule.save(connection, save, this.id)
    this.id = (result.insertId) ? result.insertId: this.id;
  }

  make(data, product_id, property_id){
    this.id = data.id ;
    this.product_id = product_id;
    this.property_id = property_id || null;
    this.price = data.price;
    this.type = data.type;
    this.rent_threshold = data.rent_threshold;   
  }

}

module.exports = ProductRule;