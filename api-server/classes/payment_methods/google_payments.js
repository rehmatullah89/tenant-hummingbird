var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');

// var paypal = require('paypal-rest-sdk');
//var rp  = require('request-promise');

class GooglePayments extends PaymentMethod {

	constructor(data, connection_info){
		super(data, connection_info);

		this.paymentToken = '';
		this.mode = '';
		this.CLIENT = '';
		this.SECRET = '';
		this.PAYPAL_API = '';
		this.PAYPAL_MODE = '';

	}

	validate(){

		return Promise.resolve().then(() => {
			return true;
		})

	}

	setData(connection, data, rent){



	}

	save(connection, company_id){

	}

	charge(connection, amount, payment_id, company_id, dryrun){

	}

	remove(connection, company_id){

	}

	refund(connection, payment, company_id, amount, refund){

	}

	void_payment(){

	}

	getPaymentStatus(connection, payment, company_id){


	}
	
	setCustomerProfileToken(connection, company_id){

		return Promise.resolve();

	}

	createPayment(connection, amount, company_id){





	}

	executePayment(connection, amount, payment_id, company_id, dryrun){


	}


}


module.exports = GooglePayments;