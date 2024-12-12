'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var moment  = require('moment');
var Lead  = require('../classes/lead.js');
var Lease  = require('../classes/lease.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var settings    = require(__dirname + '/../config/settings.js');
var models  = require('../models/index.js');
var { sendSMS } = require('./../modules/sms');

module.exports = {

	/*
	 * Sends Notifies people on a maintenance request based on the most recent message
	 * Expects: maintenance, company
	 *
	 */

	// notify: payload => {
  //
	// 	var test = process.env.NODE_ENV == 'test';
	// 	if(test) return;
  //
	// 	Scheduler.addJobs([{
	//         category: 'maintenance',
	//         data: {
	//             id: payload.maintenance.Thread[0].id,
	//             action: 'email',
	//             label: 'notify',
	//             domain: payload.company.subdomain
	//         }
	//     }], function(err){
	// 		if(err) console.log(err);
	// 	});
  //
	// },

	/*
	 * Sends Notification when an admin interacts with a chat
	 * Expects: subMessage, company
	 *
	 */
	// chatNotify: async payload => {
  //
	// 	let connection  = await pool.getConnectionAsync();
  //
	// 	try{
  //
	// 		let twilioPhone = await models.Setting.findCompanySetting(connection, 'twilioPhone', payload.company.id )
  //
	// 		var test = process.env.NODE_ENV == 'test';
	// 		if(test) return;
	// 		var message = payload.subMessage.label == 'closed' ? "-- Thank you for chatting with us, this chat has been closed --" : payload.subMessage.content;
	// 		await sendSMS(payload.maintenance.phone, payload.company, message, twilioPhone.value);
	// 	} catch(err) {
	// 		console.log(err);
	// 	}
  //
	// 	await utils.closeConnection(pool, connection)
  //
	// }



}
