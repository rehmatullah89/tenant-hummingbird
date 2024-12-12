'use strict';

var pool = require(__dirname + '/../modules/db.js');

var db = require(__dirname + '/../modules/db_handler.js');

var LeaseService  = require('../classes/lease.js');
var utils    = require(__dirname + '/../modules/utils.js');

const Lease = {
  async updateLeaseStandingByInvoicedLeases(payload){
    console.log('Lease Standing Update payload ', payload);
    let connection = await db.getConnectionByType('write', payload.cid, null, "updateLeaseStandingByInvoicedLeases");
    console.log('Lease Standing Update threadId ', connection.threadId);
    console.log('Lease Standing Update connection ', connection.config);
    try {
      if(payload.invoice_leases && payload.invoice_leases.length > 0) {
        await LeaseService.updateLeaseStandings(connection, payload.invoice_leases.map(m => m.id));
      }
    }
    catch(err) { 
        console.log('Lease Standing Update error ', err);
    }

    await db.closeConnection(connection);
  }
}


module.exports = Lease;
