"use strict";

var models          = require(__dirname + '/../models');
var settings        = require(__dirname + '/../config/settings.js');
var validator       = require('validator')
var moment          = require('moment');
var Hash            = require(__dirname + '/../modules/hashes.js');
var Hashes          = Hash.init();
var e  = require(__dirname + '/../modules/error_handler.js');

class Application {

	constructor(data) {
		data = data || {};		
	}

}



module.exports = Application;

