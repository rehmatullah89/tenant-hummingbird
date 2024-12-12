var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');

class ApplePay extends PaymentMethod {

	constructor(data, connection_info){
		super(data, connection_info);

		this.payment_token = '';
		
	}

	validate(){

		return Promise.resolve().then(() => {
			return true;
		})

	}

	setData(connection, data, rent){

		// var address = {};
		// return Promise.resolve().then(() => {
		// 	if(!data.address) return true;
		// 	address = new Address({
		// 		address: data.address,
		// 		city: data.city,
		// 		state: data.state,
		// 		zip: data.zip
		// 	});
		// 	return address.findOrSave(connection).then(addressRes => {
		// 		if(!addressRes) e.th(400,"Invalid Address");
		// 		return this.setAddress(addressRes);
		// 	})
		// }).then(() => {
		//
		// 	this.type = 'ach';
		// 	this.active = 1;
		// 	this.company= data.company;
		// 	this.first = data.first.trim();
		// 	this.last = data.last.trim();
		// 	this.unit_number = data.address_cont;
		// 	this.auto_charge = data.auto_charge? 1 : 0;
		//
		// 	this.account_holder = data.first + ' ' + data.last;
		// 	this.routing_number = data.routing_number;
		// 	this.account_number = data.account_number;
		// 	this.account_type = data.account_type;
		//
		// 	this.address_id = address.id;
		// 	this.address = address.address;
		// 	this.address_cont = data.unit_number;
		// 	this.city = address.city;
		// 	this.state = address.state;
		// 	this.zip = address.zip;
		//
		// 	this.rent = data.auto_charge ? rent : null;
		// 	this.utilities =  data.auto_charge ? 100: null;
		//
		// 	this.card_end = data.account_number.substr(data.account_number.length - 4)
		// 	this.card_type     = data.account_type;
		//
		// })

	}

	save(connection, company_id){

	}

	charge(connection, amount, payment_id, company_id, dryrun){
		if(!this.lease_id) e.th(500, "Lease Id not set");
		return this.setCustomerProfileToken(connection,company_id)
			.then(() => {
				if(dryrun) return true;
				return this.executePayment(connection, amount, payment_id, company_id, dryrun);
			})
	}

	remove(connection, company_id){
		// return this.setCustomerProfileToken(connection,company_id)
		// 	.then(() =>  forteACHFuncs.deleteCustomerPaymentProfile(this.connection_info, this.ach_token, this.token, company_id))
		// 	.catch(err => {
		// 		e.th(400, err.error.response.response_desc);
		// 	})
		// 	.then(() => models.Payment.deletePaymentMethod(connection, this.id))
	}

	refund(connection, payment, company_id, amount, refund){
		// return this.setCustomerProfileToken(connection, company_id)
		// 	.then(()  => forteACHFuncs.refundCustomerPaymentProfile(this.connection_info, payment, this.cc_token, this.token, amount, company_id))
		// 	.catch(err => {
		// 		e.th(400, err.error.response.response_desc);
		// 	})
		// 	.then(body => {
		// 		return {
		// 			transaction_id: body.transaction_id,
		// 			auth_code: body.authorization_code
		// 		}
		// 	})
	}

	void_payment(){

	}

	getPaymentStatus(connection, payment, company_id){


	}

	setCustomerProfileToken(connection, company_id){

		return Promise.resolve();

	}

	executePayment(connection, amount, payment_id, company_id, dryrun){
		return Promise.resolve();
	}



}


module.exports = ApplePay;