var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');

class Check extends PaymentMethod {
	constructor(data, connection_info){
		super(data, connection_info);

	}
}


module.exports = Check;