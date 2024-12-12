'use strict';

var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Lead  = require('../classes/lead.js');
var Lease  = require('../classes/lease.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var settings    = require(__dirname + '/../config/settings.js');
var models  = require('../models/index.js');

module.exports = {

	/*
	 * Sends Notifications to people when an application is submitted
	 * Expects: application, company
	 *
	 */

	newApplication: payload => {
        
	},



}
