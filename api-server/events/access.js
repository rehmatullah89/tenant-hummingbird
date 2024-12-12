'use strict';

var test = false;

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');

var Lease  = require('../classes/lease.js');
var Contact  = require('../classes/contact.js');
var Unit  = require('../classes/unit.js');
var Property  = require('../classes/property.js');
var Company  = require('../classes/company.js');

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var models       = require(__dirname + '/../models');



const Access = {

	/*
	 * Creates a new unit in the gate access sysmtem
	 * Param unit:         Required
	 * Param company:
	 * Param property:
	 */

	async createUnit (payload) {

		let connection = await db.getConnectionByType('write', null, payload.cid)
		try{
      let meta = {
        trace_id: payload.trace_id,
        request_id: payload.request_id,
      }
      await payload.property.getAccessControl(connection);
      await  payload.property.Access.createSpace(payload.unit);
    } catch(err){
		  console.log(err);
    }

		await db.closeConnection(connection);

	},
  async setContactAccessOnLease(payload) {
    let connection = await db.getConnectionByType('write', null, payload.cid);

    try {
      let lease = payload.lease
      console.log("Setting Access to Lease on payload ID: ", lease);
      await Lease.setAccessOnLease(connection, lease.id);
    } catch (err) {
      console.log("ERR with setting Access to Lease:", err);
    }

    await db.closeConnection(connection);
  },

  /*
	 * Sets gate access for a contact at a property. Requires a lease_id to know what property we are controlling
	 *
	 * Find total lease period.
	 * if lease is past due by number of days, status = 0, else 1
	 * if they don't have a current lease, start is null
	 *
	 * Param lease:         Required
	 * Param contact_id:    Required
	 */
  async updateUserSpace(payload) {
    
    let connection = await db.getConnectionByType('write', null, payload.cid)
    try {
      let lease = payload.lease;

      console.log("LEASE", lease)
      let savedAccess = true;
      for (let tenantNumber = 0; tenantNumber < lease.Tenants.length; tenantNumber++) {
        let tenant = lease.Tenants[tenantNumber];
        await tenant.Contact.getPhones(connection);

        let tenant_body = {
          pin: tenant.pin,
          unit_number: lease.Unit.number,
        }

        if (tenant.pin) {
          console.log('Setting the Access to tenant => ', JSON.stringify(tenant));
          savedAccess = true;
          await tenant.Contact.saveAccess(connection, lease.Property, tenant_body, !lease.advance_rental ? lease : null, lease.unit_id);
        }

        if (tenantNumber === lease.Tenants.length - 1 && !savedAccess) {
          console.log('Setting the Access to last tenant on lease => ', JSON.stringify(tenant));
          await tenant.Contact.saveAccess(connection, lease.Property, tenant_body, !lease.advance_rental ? lease : null, lease.unit_id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  },

  // It seems gate-access /restore end point is doing same thing 
	async enableContactAccessIfCurrent(payload) {

    let connection = await db.getConnectionByType('write', null, payload.cid)

    try {

      let meta = {
        trace_id: payload.trace_id,
        request_id: payload.request_id,
      }

      let lease = new Lease({id: payload.lease.id});
      await lease.find(connection);
      await lease.findUnit(connection);
      await lease.getProperty(connection);
      await lease.getCurrentBalance(connection);
      if (lease.balance) return;

      await lease.Property.getAccessControl(connection);
      if (!lease.Property.Access) return;

      await lease.Property.Access.allowAccessToSpace(lease, meta);
    } catch(err){
      console.log(err);
    }
  

    await db.closeConnection(connection);
    return true;
	},


	test: payload => {
		console.log("We got to test!", payload);
	}
}


module.exports = Access;
