"use strict";

var models  = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');

class Lease_Auction_Fee {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.lease_auction_id = data.lease_auction_id || null;
    this.product_id = data.product_id || null;
    this.type = data.type || null;
    this.value = data.value || null;
    this.amount = data.amount || null;
    this.is_inclusive = data.is_inclusive || null;
    this.Product = data.Product || null;
  }

  async save(connection) {

    var save = {
        id : this.id,
        lease_auction_id : this.lease_auction_id,
        product_id : this.product_id,
        type : this.type,
        value : this.value,
        amount : this.amount,
        is_inclusive : this.is_inclusive || false
    }

    let result = await  models.Lease_Auction_Fee.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
  }

  async findById(connection){

    if (!this.id) e.th(400, "Auction fee id required");
    let auction_fee = await  models.Lease_Auction_Fee.findById(connection, this.id);
    this.assembleLeaseAuction(auction_fee);
  }

  assembleLeaseAuction(data){

    if(!data) e.th(404,"Invalid auction fee.");

    if(typeof data.id !== 'undefined' && !this.id) this.id = data.id;
    if(typeof data.lease_auction_id !== 'undefined') this.lease_auction_id = data.lease_auction_id;
    if(typeof data.product_id !== 'undefined') this.product_id = data.product_id;
    if(typeof data.type !== 'undefined') this.type = data.type;
    if(typeof data.value !== 'undefined') this.value = data.value;
    if(typeof data.amount !== 'undefined') this.amount = data.amount;
    if(typeof data.is_inclusive !== 'undefined') this.is_inclusive = data.is_inclusive;
  }

}

module.exports = Lease_Auction_Fee;
