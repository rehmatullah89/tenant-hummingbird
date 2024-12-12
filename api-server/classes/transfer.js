"use strict";

var moment      = require('moment');

var models = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');

class Transfer {

    constructor(data){
      data = data || {};
      this.id = data.id || null;
      this.from_lease_id = data.from_lease_id || null;
      this.to_lease_id = data.to_lease_id || null;
      this.reason = data.reason || null;
      this.notes = data.notes || null;
      this.contact_id = data.contact_id || null;
      this.date = data.date || null;
      this.transfer_out_balance = data.transfer_out_balance || 0;
      this.transfer_in_balance = data.transfer_in_balance || 0;
      this.payment_id = data.payment_id || null;
      this.created_at = data.created_at || null;
    }

    async assembleTransfer(data) {
      if (!data) e.th(404, "Transfer Data is invalid");

      if(data.id) this.id = data.id; 
      if(data.from_lease_id) this.from_lease_id = data.from_lease_id; 
      if(data.to_lease_id) this.to_lease_id = data.to_lease_id;
      if(data.reason) this.reason = data.reason; 
      if(data.notes) this.notes = data.notes; 
      if(data.contact_id) this.contact_id = data.contact_id;
      if(data.date) this.date = data.date;
      if(data.transfer_out_balance) this.transfer_out_balance = data.transfer_out_balance; 
      if(data.transfer_in_balance) this.transfer_in_balance = data.transfer_in_balance; 
      if(data.payment_id) this.payment_id = data.payment_id;
      if(data.created_at) this.created_at = data.created_at;
    }

    async find(connection) {

      if (!this.id && !this.to_lease_id) e.th(400, "Transfer id or to_lease_id is not provided");
      let transfer = {};

      if(this.id){
        transfer = await models.Transfer.findById(connection, this.id);
      } else {
        transfer = await models.Transfer.findByToLeaseId(connection, this.to_lease_id);
      }

      await this.assembleTransfer(transfer);
    }

    async save(connection) {
      let data = {
        id: this.id || null,
        from_lease_id: this.from_lease_id || null,
        to_lease_id: this.to_lease_id || null,
        reason: this.reason || null,
        notes: this.notes || null,
        contact_id: this.contact_id || null,
        date: this.date || null,
        transfer_out_balance: this.transfer_out_balance || 0,
        transfer_in_balance: this.transfer_in_balance || 0,
        payment_id: this.payment_id || null,
      };

      let result = await models.Transfer.save(connection, data, this.id);
      if (result.insertId) this.id = result.insertId;
    }

    async findFromLease(connection){
      var lease = new Lease({id: this.from_lease_id});
      await lease.find(connection);
      await lease.getTenants(connection);
      await lease.findUnit(connection);
      this.FromLease = lease;
    }

    async findToLease(connection){
      var lease = new Lease({id: this.to_lease_id});
      await lease.find(connection);
      await lease.getTenants(connection);
      await lease.findUnit(connection);
      this.ToLease = lease;
    }

    async findTransferBy(connection){
      var contact = new Contact({id: this.contact_id});
      await contact.find(connection);
      this.TransferBy = contact;
    }
}

module.exports = Transfer;
var Lease      = require('../classes/lease.js');
var Contact    = require('../classes/contact.js');


