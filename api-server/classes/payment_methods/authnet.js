var e = require(__dirname + '/../../modules/error_handler.js');
var models = require(__dirname + '/../../models');
var settings = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment = require('moment');
var validator = require('validator');
var paymentTransactionFuncs = require(__dirname + '/../../modules/authorizenet/PaymentTransactions');
var customerProfileFuncs = require(__dirname + '/../../modules/authorizenet/CustomerProfiles');
var transactionReportingFuncs = require(__dirname + '/../../modules/authorizenet/TransactionReporting');
var transactionReportingFuncs = require(__dirname + '/../../modules/authorizenet/TransactionReporting');

var getCustomerProfile = Promise.promisify(customerProfileFuncs.getCustomerProfile);
var createCustomerProfile = Promise.promisify(customerProfileFuncs.createCustomerProfile);
var createCustomerPaymentProfile = Promise.promisify(customerProfileFuncs.createCustomerPaymentProfile);
var deleteCustomerPaymentProfile = Promise.promisify(customerProfileFuncs.deleteCustomerPaymentProfile);
var chargeCustomerProfile = Promise.promisify(paymentTransactionFuncs.chargeCustomerProfile);
var capturePreviouslyAuthorizedAmount = Promise.promisify(paymentTransactionFuncs.capturePreviouslyAuthorizedAmount);
var chargeCreditCard = Promise.promisify(paymentTransactionFuncs.chargeCreditCard);
var authorizeCreditCard = Promise.promisify(paymentTransactionFuncs.authorizeCreditCard);
var refundCardTransaction = Promise.promisify(paymentTransactionFuncs.refundTransaction);
var getTransactionDetails = Promise.promisify(transactionReportingFuncs.getTransactionDetails);
var voidTransaction = Promise.promisify(paymentTransactionFuncs.voidTransaction);
var PaymentMethod = require(__dirname + './../payment_method.js');

class Authnet extends PaymentMethod {

  constructor(data, connection_info, payment_gateway) {
    super(data, connection_info);
    this.payment_gateway = payment_gateway;
	}

	validate() {

		return Promise.resolve().then(() => {
			if (!this.name_on_card)
				e.th(400, 'Name on card is missing');

			if (!validator.isCreditCard(this.card_number + ''))
				e.th(400, 'You have entered an invalid card number');

			if (!validator.isIn(this.exp_mo + '', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']))
				e.th(400, "You have entered an invalid expiration month");

			if (!validator.isInt(_this.exp_yr + '', {
				min: moment().format('YY'),
				max: moment().add(10, 'year').format('YY')
			})) e.th(400, "You have entered an invalid expiration year");

			if (!this.cvv2)
				e.th(400, 'CVV2 code is missing');

			if (!this.address || !this.country || !this.zip) {
				e.th(400, 'Address is not complete');
			}

			return true;

		})
	}

	async setData(connection, data, rent) {
		let address = {};
		console.log("this", this);
		if (!data.address_id) {
			//if (!data.address) e.th(400, "Payment Method billing address is required.")
			if (!data.zip) e.th(400, "Payment Method billing address zip code is required.")

			address = new Address({
				address: data.address,
				address2: data.address2,
				city: data.city,
				state: data.state,
				country: data.country,
				zip: data.zip
			});

			await address.findOrSave(connection);

			await this.setAddress(address);
			
		}

		this.type = 'card';
		this.active = data.save_to_account || 0;
		this.company = data.company;
		this.first = data.first.trim();
		this.last = data.last.trim();
		this.auto_charge = !!data.auto_charge;
		this.save_to_account = !!data.save_to_account;

		this.card_number = data.card_number.replace(/\s/g, '');
		this.name_on_card = data.name_on_card;
		this.exp_mo = data.exp_mo;
		data.exp_yr = data.exp_yr.toString();
		this.exp_yr = data.exp_yr.length === 2 ? '20' + data.exp_yr : data.exp_yr;
		this.cvv2 = data.cvv;
		this.address = address.address;
		this.address2 = address.address2;
		this.city = address.city;
		this.state = address.state;
		this.country = address.country;
		this.zip = address.zip;

		this.card_end = data.card_number.substr(data.card_number.length - 4);
		// this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').subtract(6, 'weeks').format('YYYY-MM-DD');
		this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').format('YYYY-MM-DD');
		this.card_type = await this.getCardType();
		this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)

	}
	// TODO is this in use anywhere?
	async authorize(company_id, amount) {
		try {
			let response = await authorizeCreditCard(this.connection_info, amount, this, company_id);
			return response;
		} catch (err) {
			console.log("err", err);
			e.th(400, err.msg)
		}
	}

	async save(connection, company_id, payment_source) {
		if(this.save_to_account){
			try{
				await this.setCustomerProfileToken(connection, company_id);
				try {
					console.log("createCustomerPaymentProfile");	
					this.token = await createCustomerPaymentProfile(this.connection_info, this, company_id, connection.meta);

          if (this.token === null) {
            this.tokenized = false;
            this.active = 0;
          }

				} catch (err) {
					console.log("createCustomerPaymentProfile ERROR", err);
					if(err.code === 409) err.msg = "Customer Profile already exists in the payment processor. Please remove the profile from the payment processor and try again.";
					e.th(err.code, err.msg);
					this.save_to_account = 0;
					this.active = 0;
				}
			} catch(err) {
				console.log("save error", err);
				e.th(err.code, err.msg)
			}
		}
		

		var save = {
			contact_id: this.contact_id,
			property_id: this.property_id,
			address_id: this.address_id,
			company: this.company,
			first: this.first,
			last: this.last,
			token: this.token || null,
			name_on_card: this.name_on_card,
			exp_warning: this.exp_warning,
			auto_charge: this.auto_charge || 0,
			rent: this.rent,
			utilities: this.utilities,
			active: this.save_to_account,
			type: this.type,
			card_end: this.card_end,
      card_type: this.card_type,
			payment_method_type_id: this.payment_method_type_id
		};
		this.id = await models.Payment.savePaymentMethod(connection, save)

	}

	async charge(connection, amount, payment_id, company_id, dryrun, contact, payment_source, authorization,refund_effective_date, ip_override, paymentRef = {}) {


		if (this.type === 'google') {
			return true;
		}
		if (this.type === 'apple') {
			return true;
		}
		
		if (this.id && this.token) {
			await this.setCustomerProfileToken(connection, company_id);
		}
		
		if (dryrun) return true;

		try {

			let response = {};

			if (authorization) {
				response = await capturePreviouslyAuthorizedAmount(this.connection_info, amount, company_id, authorization, connection.meta);
			
			} else if (this.token) {
				
				response = await chargeCustomerProfile(this.connection_info, amount, this.cc_token, this.token, company_id, connection.meta);
			} else {
				response = await chargeCreditCard(this.connection_info, amount, this, company_id, connection.meta);
			}

			utils.sendLogsToGDS(null, response, '', 'info', null,  '');
			console.log("Authnet RES", response);

			await models.Payment.save(connection, {
				transaction_id: response.transaction_id,
        status_desc: response.status_desc,
        payment_gateway: this.payment_gateway
			}, payment_id)

		} catch (err) {
				utils.sendLogsToGDS(null, err, '', 'error', null,  '');
      let error_msg = null;
			if (!err.sqlMessage) {
				error_msg = err.code === "E00003" ? err.code+ ": The card is not tokenized. Please re-enter the card and save it." : err.code + ": " + err.msg;
				await models.Payment.save(connection, {
					auth_code: err.code,
					transaction_id: err.transaction_id,
					status: 0,
					status_desc: error_msg,
					payment_gateway: this.payment_gateway
				}, payment_id)
      }
      paymentRef.PaymentInfo = {
        amount: amount,
        auth_code: err.code,
        transaction_id: err.transaction_id,
        status: 0,
        status_desc: err.code + " - " + error_msg,
        payment_gateway: this.payment_gateway
      }
      let errorMessage = err.code + " - " + err.msg;
      e.th(400, errorMessage || err.sqlMessage);
		}
	}

	async remove(connection, company_id) {
		try {
			await this.setCustomerProfileToken(connection, company_id)
			await  deleteCustomerPaymentProfile(this.connection_info, this.cc_token, this.token, company_id, connection.meta)
		} catch(err) {
			e.th(500, err.msg)
		}
			
		return models.Payment.deletePaymentMethod(connection, this.id)
	}

	async refund(connection, payment, company_id, amount, refund, reason){
		try{
			await this.setCustomerProfileToken(connection, company_id);
			let refId =  await refundCardTransaction(this.connection_info, payment, this.cc_token, this.token, amount, company_id, connection.meta);

			return {
				transaction_id: refId,
				auth_code: null
			}	
		}catch(err) {
			console.log("The ERROR Message!", err);
			e.th(400, err.msg)
		}
		
		
	}

	async void(connection, payment, company_id){
		try{
			await this.setCustomerProfileToken(connection, company_id);
			let refId = await voidTransaction(payment.transaction_id, this.connection_info, payment, company_id, connection.meta);

			return {
				transaction_id: refId,
				auth_code: null
			}	
		}catch(err) {
			console.log("The ERROR Message!", err);
			e.th(400, err.msg)
		}	
	}

	async transactionStatus(connection, payment, company_id){
		try{
			await this.setCustomerProfileToken(connection, company_id);
			return await getTransactionDetails(this.connection_info, payment, this.cc_token, this.token, company_id, connection.meta);
		}catch(err){
			console.log("The ERROR Message!", err);
			e.th(400, err.msg)
		}
	}

	// refund(connection, payment, company_id, amount, refund) {

	// 	return this.setCustomerProfileToken(connection, company_id)
	// 		.then(() => refundCardTransaction(this.connection_info, payment, this.cc_token, this.token, amount, company_id))
	// 		.catch(err => {
	// 			console.log("The ERROR Message!", err);
	// 			e.th(500, err.msg)
	// 		})
	// 		.then(refId => {
	// 			return {
	// 				transaction_id: refId,
	// 				auth_code: null
	// 			}
	// 		})
	// }

	async void_payment(connection, payment, company_id) {
	}

	async getPaymentStatus(connection, payment, company_id) {

		try{
			await this.setCustomerProfileToken(connection, company_id);
			let response =  await getTransactionDetails(this.connection_info, payment, this.cc_token, this.token, company_id, connection.meta);
			return {
				status_desc: response.status_desc,
				status: response.code === 1,
				message: response.message,
				is_settled: response.status_desc === 'settledSuccessfully' ? true : false
			}
		}catch(err){
			console.log("The ERROR Message!", err);
			e.th(400, err.msg)
		}
	}

	async setCustomerProfileToken(connection, company_id) {
		
		let customer_profile_id = '';

		let contact = new Contact({ id: this.contact_id });
		await contact.getToken(connection, this.property_id, 'authnet_card');
		
		
		if (contact.Token && contact.Token.token) {
			this.cc_token = contact.Token.token;
			return true;
		}

		var accountHolder = {
			first: this.first,
			last: this.last,
			contact_id: this.contact_id
		};
		
		try {
			
			customer_profile_id = await getCustomerProfile(this.connection_info, accountHolder, company_id, connection.meta);
			
		} catch (err) {
			console.log("This is the error", err); 
			if (err.code !== 404) {
				e.th(err.code, err.msg)
			}
		}

		if (customer_profile_id) {
			this.cc_token = customer_profile_id;
			return true;
		}

		try {
			try {
				customer_profile_id = await createCustomerProfile(this.connection_info, accountHolder, company_id, connection.meta);	
			} catch (err) {
				console.log(err);
				e.th(err.code, err.msg);
			}

			this.cc_token = customer_profile_id;
			
			await contact.saveToken(connection, {
				property_id: this.property_id,
				token: customer_profile_id,
				type: 'authnet_card'
			});

		} catch (err) {
			e.th(err.code || 400, err.msg)
		}

		return true;

		// return models.Lease.findById(connection, this.lease_id).then(lease => {
		// 	if(lease.token){
		// 		this.cc_token = lease.token;
		// 	}
		//
		// 	var accountHolder = {
		// 		first: this.first,
		// 		last: this.last,
		// 		lease_id: this.lease_id
		// 	};
		//
		// 	// get token, if cant, then create one...
		//
		// 	return getCustomerProfile(this.connection_info, accountHolder, company_id )
		// 		.catch(err => {
		// 			if(err.code == "E00040") return;
		// 			e.th(400, err.msg)
		// 		})
		// 		.then(customer_profile_id => {
		// 			if(customer_profile_id) return customer_profile_id;
		//
		// 			return createCustomerProfile(this.connection_info, accountHolder, company_id )
		//
		// 		}).then(customer_profile_id => {
		// 			this.cc_token = customer_profile_id;
		// 			return models.Lease.save(connection, { token: customer_profile_id }, lease.id)
		// 		}).catch(err => {
		// 			e.th(err.code || 400, err.msg)
		// 		})
		// })

	}



}


module.exports = Authnet;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../modules/utils');
}, 0);
var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');
var Contact = require(__dirname + '/../contact.js');
