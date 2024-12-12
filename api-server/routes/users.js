var express = require('express');
var router = express.Router();
var moment      = require('moment');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var settings    = require(__dirname + '/../config/settings.js');
var control  = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var models =  require(__dirname + '/../models');
var Tenant = require(__dirname + '/../classes/contact.js');
var User = require(__dirname + '/../classes/user.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var e  = require(__dirname + '/../modules/error_handler.js');

module.exports = function(app) {

  return router;

};
