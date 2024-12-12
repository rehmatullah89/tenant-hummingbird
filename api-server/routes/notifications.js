var express     = require('express');
var router      = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var jwt = require('jsonwebtoken');
var models = require(__dirname + '/../models');

var response = {};
var request = require('request');

var path        = require('path');
var crypto      = require('crypto');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var validator = require('validator');

var control    = require(__dirname + '/../modules/site_control.js');
var Trigger  = require(__dirname + '/../classes/trigger.js');
var Notification  = require(__dirname + '/../classes/notification.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var utils    = require(__dirname + '/../modules/utils.js');

module.exports = function(app, sockets) {

	router.get('/', [control.hasAccess(['admin', 'tenant']), Hash.unHash],  async (req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;
			let query = req.query;
			let params = req.params;

			let searchParams = {
				limit: query.limit || 20,
				offset: query.offset || 0
			};
			let notifications = [];

			let notification_list  = await Notification.search(connection, company.id, contact.id, searchParams);

			for(let i = 0; i < notification_list.length; i++ ){
				let n = notification_list[i];
				n.Activity = new Activity({id: n.activity_id});
				await n.Activity.find(connection)
				await n.Activity.findActor(connection, company.id);
				await n.Activity.findActivityObject(connection);
				await n.Activity.findActivityAction(connection);
				await n.Activity.findObject(connection);
				await n.Activity.buildMessage();
				notifications.push(n);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					notifications: Hash.obscure(notifications, req)
				}
			});


		} catch(err) {
			next(err);
		}




	});

	router.get('/ping/:company_id', [Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;
		try{

			let params = req.params;
			let query = req.query;

			let type = query.type || 'notification';

			let contacts = await models.Admin.findByCompanyId(connection, params.company_id);

			for(let i = 0; i < contacts.length; i++ ){
				sockets.sendAlert(type, contacts[i].contact_id)
			}

			utils.send_response(res, {
				status: 200,
				data: {

				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.put('/read', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try{
			let company = res.locals.active;
			let contact = res.locals.contact;
			await models.Notification.markAllRead(connection, contact.id, company.id);

			utils.send_response(res, {
				status: 200,
				data: {}
			});


		} catch(err) {
			next(err);
		}



		// var company = res.locals.active;
		// var contact = res.locals.contact;
		// var connection = {};
		// pool.getConnectionAsync().then(function(conn) {
		// 	connection = conn;
		// 	return models.Notification.markAllRead(connection, contact.id, company.id);
		// }).then(function() {
		// 	utils.send_response(res, {
		// 		status: 200,
		// 		data: {}
		// 	});
		// })
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// .catch(next)
		// .finally(() => utils.closeConnection(pool, connection))

	});

	router.put('/:notification_id/read', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;
		try{
			let company = res.locals.active;
			let contact = res.locals.contact;
			let params = req.params;
			let notification = new Notification({id: params.notification_id });
			await notification.find(connection);
			await notification.verifyAccess(company.id);
			await notification.markRead(connection);

			utils.send_response(res, {
				status: 200,
				data: {

				}
			});

		} catch(err) {
			next(err);
		}

	});

	return router;

};
