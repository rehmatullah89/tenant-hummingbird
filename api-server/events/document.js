'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');

var Lease  = require('../classes/lease.js');
var Property  = require('../classes/property.js');
var Company  = require('../classes/company.js');
var Contact  = require('../classes/contact.js');

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');
var models       = require(__dirname + '/../models');

var Socket  = require('../classes/sockets.js');

const Doc = {


  notifyDocumentSigned: async (payload)  => {

    // Get Admins by company id,
    // send alert to logged in users at that company
    var connection = await db.getConnectionByType('write', null, payload.cid);
    try{
      let admins = await Contact.findAdminsByPropertyId(connection, payload.company.id, payload.property.id);
      for(let i = 0; i < admins.length; i++){
        let socket = new Socket({
          company_id: payload.company.id,
          contact_id: admins[i].contact_id
        });
        await socket.createEvent("document_signed", {
            upload_id: Hashes.encode(payload.upload.id, connection.cid)
        });
      }
    } catch(err){
      console.log(err);
    }

    await db.closeConnection(connection);

  },

  downloadDocument: async (payload)  => {

    // Get Admins by company id,
    // send alert to logged in users at that company
    var connection = await db.getConnectionByType('write', null, payload.cid);
    try{
      payload.upload.fileloc = process.env.BASE_PATH + utils.slugify(payload.upload.name) + '.pdf';
      payload.upload.filename = utils.slugify(payload.upload.name) + '.pdf';
      await payload.upload.downloadPandaDoc(payload.company);
      payload.upload.save(connection);
      let admins = await Contact.findAdminsByPropertyId(connection, payload.company.id,   payload.property.id);

      for(let i = 0; i < admins.length; i++){
        let socket = new Socket({
          company_id: payload.company.id,
          contact_id: admins[i].contact_id
        });
        await socket.createEvent("document_downloaded", {
          upload_id: Hashes.encode(payload.upload.id, connection.cid)
        });
      }
    } catch(err){
      console.log(err);
    }

    await db.closeConnection(connection);

  },

	/*
	 * Creates documents on a lease
	 * Param lease
	 * Param company
	 */
	createDocumentsOnLease: async payload => {
	  try {


      var connection = await db.getConnectionByType('read', null, payload.cid);
      var jobs = [];
      var lease = new Lease({id: payload.lease.id});

      await lease.find(connection)
      await lease.getChecklist(connection, payload.company.id)

      for (let i = 0; i < lease.Checklist.length; i++) {
        let item = lease.Checklist[i];
        if (!item.document_id || item.upload_id) continue;
        jobs.push({
          category: 'document',
          data: {
            id: item.id,
            action: 'create',
            label: 'fromChecklist',
            lease_id: lease.id
          }
        })
      }

      if (!jobs.length) throw "No jobs";

      await new Promise((resolve, reject) => {
        Scheduler.addJobs(jobs, function (err) {
          if (err) reject(err);
          resolve();
        });
      })

    } catch(err) {
				console.log(err);
      // return true;
    }
    await db.closeConnection(connection);

	},
}


module.exports = Doc;
