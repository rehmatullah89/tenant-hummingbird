'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var moment  = require('moment');
var db = require(__dirname + '/../modules/db_handler.js');

var Lease  = require('../classes/lease.js');
var Contact  = require('../classes/contact.js');
var Company  = require('../classes/company.js');
var Signer  = require('../classes/signer.js');
var Upload  = require('../classes/upload.js');

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var models       = require(__dirname + '/../models');



const Mail = {
	/*
	 * Sends a welcome email to a contact on an active lease
	 * Param lease:          Required
	 * Param contact:         Required
	 * Param company:
	 */
	sendWelcomeEmail: async payload => {

    try{

        var lease = new Lease({id: payload.lease.id});
        var contact = new Contact({id: payload.contact.id});

        var connection = await db.getConnectionByType('write', null, payload.cid)

        await lease.find(connection)
        if(lease.status !== 1) return;
        await contact.find(connection, payload.company.id)
        await contact.sendWelcomeEmail(connection, payload.company.id)
    } catch(err){
				console.log(err);
    }
    await db.closeConnection(connection)

	},


	/*
	 * Sends a welcome email to a ALL contacts on an active lease
	 * Param lease:          Required
	 * Param contact:         Required
	 * Param company:
	 * NOT USED
	 */

	// sendWelcomeEmailToLease: payload => {
	// 	var connection = {};
  //
	// 	var lease = new Lease({id: payload.lease.id});
	// 	return pool.getConnectionAsync().then(conn => {
	// 			connection = conn;
	// 			return lease.find(connection)
	// 		})
	// 		.then(() => lease.getTenants(connection))
	// 		.then(() => {
	// 			var contact = {};
	// 			if(lease.status !== 1) return;
	// 			return Promise.mapSeries(lease.Tenants, t => {
	// 				contact = new Contact({id: t.contact_id});
	// 				return contact.find(connection, payload.company.id)
	// 					.then(() => contact.sendWelcomeEmail(connection, payload.company.id))
	// 			})
	// 		})
	// 		.catch(err => {
	// 			console.log(err);
	// 			return true;
	// 		})
	// 		.finally(() => utils.closeConnection(pool, connection))
  //
	// },


	// async sendSignatureRequestForChecklistItem(payload) {
  //
	// 	let connection = await pool.getConnectionAsync();
	// 	try{
  //
	// 		let upload = new Upload({id: payload.checklist_item.upload_id});
	// 		await upload.find(connection);
  //
	// 		let docSigns = await models.DocumentSign.findByUploadId(connection, upload.id )
  //
  //
	// 		if(!docSigns) return;
  //
	// 		for(let i = 0; i < docSigns.length; i++){
	// 			let signer = new Signer(docSigns[i]);
	// 			await signer.find(connection, payload.company.id);
	// 			await signer.sendSignEmail(upload, payload.company.id)
	// 		}
  //
	// 	} catch(err){
	// 		console.log(err);
	// 	}
  //
	// 	await utils.closeConnection(pool, connection)
  //
	// }



}


module.exports = Mail;
