"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');



class Auctions {

  constructor(data){
    data = data || {};
    this.id = data.id || null;
    this.company_id = data.company_id || null;
    this.cleaning_deposit = data.cleaning_deposit || null;
    this.cleaning_period = data.cleaning_period || null;
  }

  async save(connection) {
    var save = {
        id : this.id,
        company_id : this.company_id,
        cleaning_deposit : this.cleaning_deposit,
        cleaning_period : this.cleaning_period,
    }

    let result = await  models.Auctions.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
  }

  static async findAll(connection, company_id) {

    if (!company_id) e.th(400, "company_id is not specified");
    return await models.Auctions.findAll(connection, company_id);
  }

  async findById(connection){
    if (!this.id) e.th(400, "auction id required");
    
    let result = await  models.Auctions.findById(connection, this.id);
    this.assembleAuctionConfiguration(result);
    return result;
  }

  async update(connection){
    if (!this.id) e.th(400, "auction id not set");
    await this.save(connection);
  }

  assembleAuctionConfiguration(data){
    if(!data) e.th(404,"Invalid auction_configuration.");

    if(typeof data.id !== 'undefined' && !this.id) this.id = data.id;
    if(typeof data.company_id !== 'undefined') this.company_id = data.company_id;
    if(typeof data.cleaning_deposit !== 'undefined') this.cleaning_deposit = data.cleaning_deposit;
    if(typeof data.cleaning_period !== 'undefined') this.cleaning_period = data.cleaning_period;
  }
}



module.exports = Auctions;