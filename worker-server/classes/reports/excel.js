"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

var BaseReport = require(__dirname + './base_report.js');
class Excel extends BaseReport {
	constructor(data) {
		super(data);
	}
}



module.exports = Excel;
