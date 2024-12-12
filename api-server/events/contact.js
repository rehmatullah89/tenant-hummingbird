'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');

var utils    = require(__dirname + '/../modules/utils.js');
var models       = require(__dirname + '/../models');
var _Contact = require(__dirname + '/../classes/contact');

const status_priority = {
  "Lease Closed": 0,
  "Retired Lead": 1,
  "Current": 2,
  "Pending": 3,
  "Suspended": 4,
  "Active Lead": 5
}

const Contact = {

  async updateContactStatus(payload) {

    // var connection = await db.getConnectionByType('write', null, payload.cid)

    // try {

    //   let contact = payload.contact;
    //   await contact.getStatus(connection);

    // } catch(err) {
    //   //TODO Log error -
    // }

    // await db.closeConnection(connection);

  },

  async leaseStatusUpdate(payload){

    // var connection = await db.getConnectionByType('write', null, payload.cid)

    // try{

    //   await payload.lease.getTenants(connection);
      
    //   for(let i =0; i < payload.lease.Tenants.length; i++){
    //     let contact = new _Contact({id: payload.lease.Tenants.contact_id});
    //     await contact.find(connection);
    //   //  await contact.getStatus(connection);
    //   }

    // } catch(err) {
    //   //TODO Log error -
    // }
    // await db.closeConnection(connection);
  },

  async updateContactInfoInGateAccess(payload){

    var connection = await db.getConnectionByType('write', null, payload.cid)

    try{

      let contact = new _Contact({ id: payload.contact.id });
      await contact.find(connection);
      await contact.verifyAccess(payload.company.id);
      await contact.getPhones(connection);
      let params = {
        active_date: moment.utc()
      }
      await contact.getLeases(connection, payload.company.id, undefined, params);

      for(let i = 0; i < contact.Leases.length; i++){
        await contact.Leases[i].getProperty(connection);
        await contact.saveAccess(connection,contact.Leases[i].Property,{});
      }

    }catch(err) {
      console.log('Error in contact_updated event =>',err)
    }

    await db.closeConnection(connection);
  }
}


module.exports = Contact;
