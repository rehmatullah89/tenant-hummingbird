var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Promise = require('bluebird');

var validator = require('validator');
var Activity = require(__dirname + '/../classes/activity.js');
var models = require(__dirname + '/../models');



module.exports = function(app) {


	router.get('/',  [control.hasAccess(['admin']) , Hash.unHash],  async(req, res, next) => {

		try{

		  var connection = res.locals.connection;
			let company = res.locals.active;
			let query = req.query;
			let searchParams = {};
			let conditions = {};

			if(query.source) conditions.source = JSON.parse(query.source).map(s => s.toLowerCase());
			if(query.status) conditions.status = JSON.parse(query.status).map(s => s.toLowerCase());
			if(query.name) conditions.name = query.name;
			if(query.email) conditions.email = query.email;

			searchParams.limit = query.limit || 20;
			searchParams.offset = query.offset || 0;
			searchParams.sort =  query.sort || 'occurred';
			searchParams.sortdir =  query.sortdir || 'desc';

			let activity = await Activity.search(connection, conditions, searchParams, company.id, false);
			let count = await Activity.search(connection, conditions, searchParams, company.id, true);

			utils.send_response(res, {
				status: 200,
				data: {
					activity: Hash.obscure(activity, req),
					result_count: count[0].count
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/activity-types/notification', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		try{
  		var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let notification_types = await Activity.getNotificationTypes(connection);

				utils.send_response(res, {
				status: 200,
				data: {
					notification_types: Hash.obscure(notification_types, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/activity-types/category/:type', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		try{

		  var connection = res.locals.connection;
			let params = req.params;
			let activity_types = await Activity.findActivityTypesByCategory(connection, params.type);

			utils.send_response(res, {
				status: 200,
				data: {
					activity_types: Hash.obscure(activity_types, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	/* THIS IS CURRENTLY NOT IN USE */
  /* Todo Refactor this endpoint to use async/await. */

	// router.get('/:activity_id/undo', control.hasAccess(['admin']), function (req, res, next) {
  //
	//   var connection = res.locals.connection;
  //
	// 	var contact = res.locals.contact;
	// 	var company = res.locals.active;
  //
	// 	var params = req.params;
	// 	var activity = {};
  //
  //   activity = new Activity({id: params.activity_id})
  //   activity.find(connection)
  //     .then(function (results) {
  //       if(activity.entered_by != contact.id){
  //         var error = new Error("You are not authorized to perform this action");
  //         error.code = 401;
  //         throw error;
  //       }
  //       return activity.undo(connection);
  //
  //     }).then(function (results) {
  //
  //       utils.send_response(res, {
  //         status: 200,
  //         data: {
  //           c: activity.activity_types_id
  //         }
  //       });
  //     })
  //     .then(() => utils.saveTiming(connection, req, res.locals))
  //     .catch(next)
  //
	// });


	return router;
}
