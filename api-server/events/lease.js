'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var moment  = require('moment');
var db = require(__dirname + '/../modules/db_handler.js');

var LeaseService  = require('../classes/lease.js');
var utils    = require(__dirname + '/../modules/utils.js');
var models       = require(__dirname + '/../models');


const Lease = {
  /*
   * Creates documents on a lease
   * Param lease
   * Param company
   */
  async updateLeaseStanding(payload) {

    var connection = await db.getConnectionByType('write', null, payload.cid);

    try {

      if (payload.lease && payload.lease.id) {
        await this.applyUpdates(connection, payload.lease);
      } else if (payload.leases && payload.leases.length > 0 ){
        for (let v in payload.leases) {
          await this.applyUpdates(connection, payload.lease[v]);
        }
      }

    } catch(err) {
      //TODO Log error -
    }

    await db.closeConnection(connection);

  },

  async updateLeaseStandingByInvoicedLeases(payload){
    var connection = await db.getConnectionByType('write', null, payload.cid);
    try {
      if(payload.invoice_leases && payload.invoice_leases.length > 0) {

        
        await LeaseService.updateLeaseStandings(connection, payload.invoice_leases.map(m => m.id));
      }
    }
    catch(err) { }
    await db.closeConnection(connection);

  },

  async applyUpdates(connection, lease) {

    try {

      if (lease && lease.id) {
        let lease = new LeaseService({id: lease.id});
        await lease.find(connection)

        await lease.getCurrentBalance(connection);
        if(lease.balance > 0) return;

        await lease.updateStanding(connection, 'Current');
        await lease.acceptPayments(connection);
      }

    } catch(err) {
      //TODO Log error -
    }

  }
}


module.exports = Lease;
