var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var flash    = require(__dirname + '/../modules/flash.js');
var response = {};

var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');

var models = require(__dirname + '/../models');

var validator = require('validator');


module.exports = function(app) {
    return router;
};
