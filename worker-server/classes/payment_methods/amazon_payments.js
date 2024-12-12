
var e  = require(__dirname + '/../../modules/error_handler.js');
var moment  = require('moment');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');
var amazon = require('@madisonreed/amazon-payments');

var crypto      = require('crypto');
var rp  = require('request-promise');


/**********
 *
 * Requires white listing of production front end and backend URLs
 *  TODO find out difference between merchant ID and seller ID
 **********/

 

class AmazonPayments extends PaymentMethod {

	constructor(data, connection_info, payment_gateway){
		super(data, connection_info);
		this.type = 'amazon';
		this.order_reference_id = '';
		this.access_token = '';
		this.token_type = '';
		this.expires_in = '';
		this.payment = {};
		this.payment_gateway = payment_gateway;

	}

	validate(){
		return Promise.resolve().then(() => {

			// if(!this.account_number || !validator.isNumeric(this.account_number + ''))
			// 	e.th(400, 'The account number is required and can only contain numbers');
			//
			// if(!this.routing_number || !validator.isLength(this.routing_number + '', {min:1, max:9}) ) e.th(400,  "You have entered an invalid routing number");
			//
			// if(!this.account_holder || !validator.isLength(this.account_holder + '', {min:2}))
			// 	e.th(400,  "Please enter the name of the account holder");
			return true;
		})
	}

	setData(connection, data, rent){
		return Promise.resolve();
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
		// 	this.type = 'amazon';
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
		// return this.setCustomerProfileToken(connection, company_id)
		// 	.then(() => forteACHFuncs.createCustomerPaymentProfile(this.connection_info, this, company_id))
		// 	.catch(err => {
		// 		console.log("err",err);
		// 		e.th(400, err.error.response.response_desc);
		// 	})
		// 	.then(responseToken => {
		// 		this.token = responseToken;
		// 		var save = {
		// 			lease_id: this.lease_id,
		// 			address_id: this.address_id,
		// 			unit_number: this.unit_number,
		// 			company: this.company,
		// 			first: this.first,
		// 			last: this.last,
		// 			token: this.token,
		// 			name_on_card: this.name_on_card,
		// 			exp_warning: null,
		// 			auto_charge: this.auto_charge || 0,
		// 			rent: this.rent,
		// 			utilities: this.utilities,
		// 			active: this.active,
		// 			type: this.type,
		// 			card_end: this.card_end,
		// 			card_type: this.card_type
		// 		};
		// 		return models.Payment.savePaymentMethod(connection, save)
		// 	})
		// 	.then(payment_method_id => {
		// 		this.id = payment_method_id;
		// 		return true;
		// 	})
	}

	charge(connection, amount, payment_id, company_id, dryrun){
		if(!this.lease_id) e.th(500, "Lease Id not set");
		return this.setCustomerProfileToken(connection, company_id)
			.then(() => this.getProfileInfo(connection, company_id))
			.then(() => this.getOrderReference())
			.then(() => {
				if(dryrun) return true;
				return this.setOrderReferenceDetails(connection, amount, payment_id, company_id, dryrun);
			})
			.then(() => this.confirmOrderReference(connection, amount, payment_id, company_id, dryrun))
			.then(() => this.executePayment(connection, amount, payment_id, company_id, dryrun))
			.then(details => {
				var paymentUpdate = {
					ref_name: this.profile.name,
					payment_gateway: this.payment_gateway,
					status_desc: details.AuthorizationDetails.AuthorizationStatus.State,
					auth_code: details.AuthorizationDetails.AmazonAuthorizationId,
					transaction_id: details.AuthorizationDetails.AuthorizationReferenceId
				}

				return models.Payment.save(connection, paymentUpdate, payment_id);

			})



	}

	remove(connection, company_id){
		//return  models.Payment.deletePaymentMethod(connection, this.id))
	}

	refund(connection, payment, company_id, amount, refund){
		return this.setCustomerProfileToken(connection, company_id)
			.then(() => {
				return new Promise((res, rej) => {
					this.payment.offAmazonPayments.refund({
						AmazonCaptureId: payment.auth_code,
						RefundReferenceId: refund.id,
						RefundAmount:{
							Amount: Math.round(amount * 1e2) / 1e2,
							CurrencyCode: 'USD'
						},
						// SellerRefundNote: refund.note,
						// SoftDescriptor: "TEST REFUND"
					}, (err, details) => {
						if(err) return rej(err);
						return res(details);
					});
				})
			}).then(details => {

				console.log(details);

				return  {
					ref_num: refund.ref_num,
					auth_code: refund.auth_code,
					transaction_id: details.RefundDetails.AmazonRefundId
				}

			})
	}

	void_payment(){

	}

	getPaymentStatus(connection, payment, company_id){}

	setCustomerProfileToken(connection, company_id){


		this.sellerId = 'A1YFRFGSMJQLAR'; // TODO where does this come from!

		/*
		    Marketplace ID:	A3BXB0YN3XH17H (Amazon Pay Sandbox)
							A6W85IYQ5WB1C (IBA)
		                    AGWSWK15IEJJ7 (Amazon Pay)
		 */

		var environment = '';
		var mwsAuthToken = '';
		//if(this.connection_info.production){
			environment = amazon.Environment.Production;
			mwsAuthToken = settings.amazonMWS.prod.mwsAuthToken;
			this.platformId = settings.amazonMWS.prod.platformId; // TODO where does this come from!
		// } else {
		// 	environment = amazon.Environment.Sandbox;
		// 	mwsAuthToken = settings.amazonMWS.dev.mwsAuthToken;
		// 	this.platformId = settings.amazonMWS.dev.platformId; // TODO where does this come from!
		// }

		this.payment = amazon.connect({
			environment: environment,
			sellerId: this.connection_info.amazonSellerId,
			MWSAuthToken: mwsAuthToken,
			mwsAccessKey: this.connection_info.mwsAccessKeyId,
			mwsSecretKey: this.connection_info.mwsSecretKey,
			clientId: this.connection_info.amazonClientId
		});
		return Promise.resolve();
	}

	getProfileInfo(connection, company_id){

		return new Promise((res,rej) => {
			this.payment.api.getTokenInfo(this.access_token, function(err, tokenInfo) {
				if(err) rej(err);
				return res(tokenInfo)
			});

		}).then(tokenInfo => {
			return new Promise((res,rej) => {
				this.payment.api.getProfile(this.access_token, function(err, profile) {
					if(err) rej(err);
					return res(profile)
				});
			});
		}).then(profile => {
			this.profile = profile;
			return true;
		});
	}

	createPayment(connection, amount, lease_id,contact,api, redirect_url, company){


		// load credentials
		return this.setCustomerProfileToken(connection, company.id).then(() => {
		// generate hashed URL
		// load redirect URL

			var shipment = {
				amount: amount,
				company_id: company.id,
				redirect_url: redirect_url,
				lease_id: lease_id,
				contact_id: contact ? contact.id: null,
				api_id: api ? api.id: null,
				notes: '',
				invoices: []
			}

			var ext;
			if(settings.isProd){
				ext = 'com';
			} else {
				ext = 'xyz';
			}

			var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
			var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');
			var payment_url = "https://" + company.subdomain + ".leasecaptain." + ext + '/payments/amazon/' + encrypted;
			return payment_url;

		});




	}

	setOrderReferenceDetails(connection, amount, payment_id, company_id){
		return new Promise((res, rej) => {
			return this.payment.offAmazonPayments.setOrderReferenceDetails({
				AmazonOrderReferenceId:  this.order_reference_id,
				OrderReferenceAttributes: {
					OrderTotal: {
						Amount: Math.round(amount * 1e2) / 1e2,
						CurrencyCode: "USD"
					}
				},
				platformId: this.platformId
			}, (err, details) => {
				if(err) return rej(err);
				return res(details);
				// details will be the authorization details
			});
		});
	}

	confirmOrderReference(connection, amount, payment_id, company_id){
		return new Promise((res, rej) => {
			return this.payment.offAmazonPayments.confirmOrderReference({
				AmazonOrderReferenceId:  this.order_reference_id
			}, (err, details) => {
				if(err) return rej(err);
				return res(details);
				// details will be the authorization details
			});
		});
	}

	getOrderReference(connection, amount, payment_id, company_id){
		return new Promise((res, rej) => {
			return this.payment.offAmazonPayments.getOrderReferenceDetails({
				AmazonOrderReferenceId: this.order_reference_id
			}, (err, details) => {
				if(err) return rej(err);
				return res(details);
				// details will be the authorization details
			});
		});
	}



	executePayment(connection, amount, payment_id, company_id){

		return new Promise((res, rej) => {
			return this.payment.offAmazonPayments.authorize({
				AmazonOrderReferenceId: this.order_reference_id,
				AuthorizationAmount:{
					Amount: Math.round(amount * 1e2) / 1e2,
					CurrencyCode: 'USD'
				},
				AuthorizationReferenceId: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 30),  //TODO change this
				SellerAuthorizationNote: "test", //TODo change this
				SellerId:  this.sellerId,
				CaptureNow: true,
				SoftDescriptor: "TEST PAYMENT" //TODo change this
			}, (err, details) => {

				console.log("ERROR", err);
				console.log("details", details);
				if(err) return rej(err);
				return res(details);

				// details will be the authorization details
			});
		}).catch(err => {
			console.log('Caught Error');
			e.th(500, err);
		})



	}

}


module.exports = AmazonPayments;

