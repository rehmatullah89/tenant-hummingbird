'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Lead  = require('../classes/lead.js');
var Contact  = require('../classes/contact.js');
var Lease  = require('../classes/lease.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');

module.exports = {

	/*
	* Sets all leads on a lease to Converted, and sets the lease_id
	* lease
	* Company
	* Contact
	* Api
	 */
	setConvertedOnLease: async payload => {
    	var connection = await db.getConnectionByType('write', null, payload.cid)
		let uniqTenants = []
		try{
				
			if(!payload.lease) return;
			
			if(!payload.lease.Tenants.length){
				await payload.lease.getTenants(connection);
			}
			
			console.log("event setConvertedOnLease", payload);

			if (payload.lease.Tenants.length){
				uniqTenants = [...new Map(payload.lease.Tenants.map(item => [item['id'], item])).values()]
			}

			for(let i = 0; i < uniqTenants.length; i++){
				let contact = new Contact({id: uniqTenants[i].contact_id});
				await contact.getActiveLeadByLeaseId(connection, payload.unit.property_id, payload.lease.id);

				if (contact.ActiveLead.id){
					if(!contact.ActiveLead.lease_id) {
						contact.ActiveLead.lease_id = payload.lease.id;
						contact.ActiveLead.category_id = payload.unit.category_id;
						contact.ActiveLead.unit_id = payload.unit.id;
						contact.ActiveLead.status = 'converted';

						await contact.ActiveLead.save(connection)
					} else {
						await contact.convertActiveLeads(connection, payload.lease.id,  payload.unit.property_id, payload.unit.id);
					}
				} else {
					contact.ActiveLead = new Lead({
						contact_id: contact.id,
						property_id: payload.unit.property_id,
						category_id: payload.unit.category_id,
						unit_id: payload.unit.id,
						status: 'converted',
						created_by: payload.contact.id,
						modified_by: payload.contact.id,
						lease_id: payload.lease.id
					});

					await contact.ActiveLead.save(connection)
				}
			}
		} catch(err){
			console.log(err);
		}
		await db.closeConnection(connection);
	}
}
