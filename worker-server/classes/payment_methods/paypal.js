var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');

// const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');


var rp  = require('request-promise');
const util = require('util')




class Paypal extends PaymentMethod {

	constructor(data, connection_info, payment_gateway){
		super(data, connection_info);
		this.paypal_payer_id = '';
		this.paypal_payment_id = '';
		this.mode = '';
		this.CLIENT = '';
		this.SECRET = '';
		this.PAYPAL_API = '';
		this.PAYPAL_MODE = '';
		this.parter_id = '';
		this.payment_gateway = payment_gateway;
	}

	client() {
		// return new checkoutNodeJssdk.core.PayPalHttpClient(this.environment());
	}

	environment() {

		let clientId = this.CLIENT;
		let clientSecret = this.SECRET;
		// return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
	}

	validate(){
		return Promise.resolve().then(() => {
			return true;
		})
	}

	setData(connection, data, rent){}

	save(connection, company_id){}

	charge(connection, amount, payment_id, company_id, dryrun){
		if(!this.lease_id) e.th(500, "Lease Id not set");
		return this.setCustomerProfileToken(connection,company_id)
			.then(() => {
				if(dryrun) return true;
				return this.executePayment(connection, amount, payment_id, company_id, dryrun);
			})
	}

	remove(connection, company_id){}

	refund(connection, payment, company_id, amount, refund){
		// TODO finish refund!
	}

	void_payment(){ }


	getPaymentStatus(connection, payment, company_id){


	}

	setCustomerProfileToken(connection, company_id){

		// if(this.connection_info.production){
			this.PAYPAL_MODE = 'production';
			this.PAYPAL_API = 'https://api.paypal.com';
		// } else {
		// 	this.PAYPAL_MODE = 'sandbox';
		// 	this.PAYPAL_API = 'https://api.sandbox.paypal.com';
		// }

		this.CLIENT = this.connection_info.paypalClientId;
		this.SECRET = this.connection_info.paypalSecret;

		return Promise.resolve();

	}

	// async createPayment(connection, amount, company_id){
	//
	//
	// 	await this.setCustomerProfileToken(connection, company_id);
	//
	//
	//
	//
	//
	// 	paypal.configure({
	// 		'mode': this.PAYPAL_MODE, //sandbox or live
	// 		'client_id': this.CLIENT,
	// 		'client_secret': this.SECRET
	// 	});
	//
	// 	let create_payment_json = {
	// 		"intent": "sale",
	// 		"payer": {
	// 			"payment_method": "paypal"
	// 		},
	// 		"redirect_urls": {
	// 			"return_url": "http://return.url", // TODO where does this come from!
	// 			"cancel_url": "http://cancel.url" // TODO where does this come from!
	// 		},
	// 		"transactions": [{
	// 			"amount": {
	// 				"currency": "USD",
	// 				"total": Math.round(amount * 1e2) / 1e2
	// 			},
	// 			"description": ""  // TODO Change this! Payment for unit #203
	// 		}]
	// 	};
	//
	// 	return await new Promise((resolve,reject) => {
	// 		paypal.payment.create(create_payment_json, (error, payment) => {
	// 			if (error) {
	// 				console.log("Create Payment Error", error);
	// 				return reject(error);
	// 			} else {
	// 				console.log("Create Payment Response");
	// 				console.log(util.inspect(payment, {showHidden: false, depth: null}))
	// 				return resolve(payment)
	// 			}
	// 		})
	// 	})
	//
	// }


	async executePayment(connection, amount, payment_id, company_id, dryrun) {


		console.log("paypal_order_id", this.paypal_order_id);

		const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(this.paypal_order_id);


		request.requestBody({});


		try {
			const capture = await this.client().execute(request);

			console.log(capture);

			return await models.Payment.save(connection, {
				payment_gateway: this.payment_gateway,
				transaction_id: capture.result.purchase_units[0].payments.captures[0].id,
				status_desc: capture.result.purchase_units[0].payments.captures[0].status,
				ref_name: capture.result.payer.name.given_name + ' ' + capture.result.payer.name.surname,
				method: 'paypal'
			}, payment_id);


		} catch (err) {

			// 5. Handle any errors from the call
			e.th(400, err);

		}



		// try {
		// 	let result = await rp.post(this.PAYPAL_API + '/v1/payments/payment/' + this.paypal_payment_id + '/execute', {
		// 		auth: {
		// 			user: this.CLIENT,
		// 			pass: this.SECRET
		// 		},
		// 		body: {
		// 			payer_id: this.paypal_payer_id,
		// 			transactions: [{
		// 				amount: {
		// 					total: Math.round(amount * 1e2) / 1e2,
		// 					currency: 'USD'
		// 				}
		// 			}]
		// 		},
		// 		json: true
		// 	});
		//
		// 	return await models.Payment.save(connection, {
		//		payment_gateway: this.payment_gateway,
		// 		transaction_id: result.id,
		// 		status_desc: result.state,
		// 		ref_name: result.payer.payer_info.first_name + ' ' + result.payer.payer_info.last_name,
		// 		method: result.payer.payment_method
		// 	}, payment_id);
		//
		// } catch(err){
		// 	e.th(500, err);
		// }




	}


}


module.exports = Paypal;
