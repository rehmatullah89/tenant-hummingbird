var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment      = require('moment');
var validator = require('validator');
var paymentTransactionFuncs = require(__dirname + '/../../modules/authorizenet/PaymentTransactions');
var customerProfileFuncs = require(__dirname + '/../../modules/authorizenet/CustomerProfiles');
var transactionReportingFuncs = require(__dirname + '/../../modules/authorizenet/TransactionReporting');

var getCustomerProfile              = Promise.promisify(customerProfileFuncs.getCustomerProfile);
var createCustomerProfile           = Promise.promisify(customerProfileFuncs.createCustomerProfile);
var createCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.createCustomerPaymentProfile);
var deleteCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.deleteCustomerPaymentProfile);
var chargeCustomerProfile           = Promise.promisify(paymentTransactionFuncs.chargeCustomerProfile);
var chargeCreditCard                = Promise.promisify(paymentTransactionFuncs.chargeCreditCard);
var refundCardTransaction           = Promise.promisify(paymentTransactionFuncs.refundTransaction);
var getTransactionDetails           = Promise.promisify(transactionReportingFuncs.getTransactionDetails);
var PaymentMethod = require(__dirname + './../payment_method.js');

const developerID = '003231G004';
const deviceId = "88700000323102";

const { promises: fs } = require("fs");

var request = require('request-promise');


const crypto = require('crypto');

class TsysCard extends PaymentMethod {

    constructor(data, connection_info, payment_gateway){
        super(data, connection_info);
        this.payment_gateway = payment_gateway;

    this.endpoint = process.env.TSYS_PAYMENTS_ENDPOINT;
    
    //if(this.connection_info.production && process.env.NODE_ENV === 'production'){
		// } else {
		// 	this.endpoint = 'https://stagegw.transnox.com/servlets/TransNox_API_Server';
		// }
    // staging https://stagegw.transnox.com/servlets/TransNox_API_Server
    // prod  https://gateway.transit-pass.com/servlets/TransNox_API_Server

		this.transactionKey = '';

	}

	validate(){

		return Promise.resolve().then(() => {
			if (!this.name_on_card)
				e.th(400,'Name on card is missing');

			if(!this.address || !this.city || !this.state || !this.zip){
				e.th(400,  'Address is not complete');
			}

			return true;

		})
	}

	async log(string){
    return await fs.appendFile('/home/app/hummingbird/tsys_runs/tsys_runs.txt', string + '\r\n');
  }

  async setData(connection, data, rent){
		let address = {};

    if(data.address){
      address = new Address({
        address: data.address,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip
      });
      await address.findOrSave(connection);
      await this.setAddress(address);
    }


    this.type = 'card';
    this.active = 1;
    this.company= data.company;
    this.lease_id = this.lease_id || data.lease_id;
    this.first = data.first.trim();
    this.last = data.last.trim();
    this.auto_charge = data.auto_charge ? 1 : 0;
    this.save_to_account = data.save_to_account? 1 : 0;

    // This is the TSEP token for the tokenized card details

    this.token = data.token;
    this.token_alt = data.token_alt;

    this.card_number = data.card_number;
    this.card_end = data.card_number.substr(data.card_number.length - 4);
    this.name_on_card = data.name_on_card;
    this.exp_mo = data.exp_mo;
    this.exp_yr = data.exp_yr;
    this.cvv2 = data.cvv;
    this.address = address.address;
    this.address2 = address.address2;
    this.city = address.city;
    this.state = address.state;
    this.zip = address.zip;

    this.active = data.save_to_account;

    //this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').subtract(6, 'weeks').format('YYYY-MM-DD');
    this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').format('YYYY-MM-DD');

    this.card_type = await this.getCardType();
    this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)

	}

	async getCreds(amount = 0){

		let manifestString = this.connection_info.mid.padEnd(20,' ') + this.connection_info.deviceId.padEnd(24,' ') + amount.toString().padEnd(12,'0') + moment().format('MMDDYYYY');
		const algorithm = 'aes-128-cbc';

		const iv = this.connection_info.transactionKey.substring(0,16);
		const key = this.connection_info.transactionKey.substring(0,16);
		let cipher = crypto.createCipheriv(algorithm, key, iv);
		let hexManifestString = cipher.update(manifestString, 'utf8', 'hex');
		let hashTxnKeyObject = crypto.createHmac('md5', this.connection_info.transactionKey);
		let hashTxnKeyData = hashTxnKeyObject.update(this.connection_info.transactionKey);
		let hashTxnKey = hashTxnKeyData.digest('hex');

		let manifest = hashTxnKey.substr(0,4) + hexManifestString + hashTxnKey.substr(-4,4)
		return {
		  manifest: manifest,
      deviceId: this.connection_info.deviceId
    }


	}

	async generateKey(){

		let headers = {
			"user-agent": 'infonox'
		};

		let body = {
        GenerateKey: {
          mid: this.connection_info.mid,
          userID: this.connection_info.userID,
          password: this.connection_info.password
        }
    };

		this.log("REQ: " + JSON.stringify(body));

		let response = await request({
			headers: headers,
			body:{
				GenerateKey: {
					mid: this.connection_info.mid,
					userID: this.connection_info.userID,
					password: this.connection_info.password
				}
			},
			json:true,
			uri: this.endpoint,
			method: 'POST'
		});


    this.log("RES: " + JSON.stringify(response));



    if(!response.GenerateKeyResponse) {
			e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
		}

		if(response.GenerateKeyResponse.status === 'FAIL'){
			e.th(400, "Issuer Rejection: Error connecting to Tsys: " + response.GenerateKeyResponse.responseMessage);
		}

		this.transactionKey = response.GenerateKeyResponse.transactionKey;

	}

  async authorize(company_id, amount){
    let response = await this.authenticateCard("telephone/moto");
    return response;
  }


	async save(connection, company_id, payment_source){

	    let response = await this.authenticateCard(payment_source);

        this.token = response.token;
        this.token_alt = response.cardTransactionIdentifier;

        let save = {
            contact_id: this.contact_id,
            property_id: this.property_id,
            address_id: this.address_id,
            company: this.company,
            first: this.first,
            last: this.last,
            token: this.token || null,
            token_alt: this.token_alt,
            name_on_card: this.name_on_card,
            exp_warning: this.exp_warning,
            auto_charge: this.auto_charge || 0,
            rent: this.rent,
            utilities: this.utilities,
            active: this.active,
            type: this.type,
            card_end: this.card_end,
            card_type: this.card_type,
            payment_method_type_id: this.payment_method_type_id
        };

		this.id  = await models.Payment.savePaymentMethod(connection, save)

	}

	remove (connection, company_id){
	  // TODO remove from Tsys?
    return models.Payment.deletePaymentMethod(connection, this.id)
	}

	void_payment(){

	}

	getPaymentStatus(connection, payment, company_id){

		return this.setCustomerProfileToken(connection, company_id)
			.then(() => {
				return getTransactionDetails(this.connection_info, payment, this.cc_token, this.token, company_id)
					.catch(err => {
						console.log("The ERROR Message!", err);
						e.th(400, err.msg)
					})
					.then(response => {
						if(!response) return;
						return models.Payment.save(connection, {
							status_desc: response.status_desc,
							status: 1
						}, payment.id)

					})
			})

	}

	async setCustomerProfileToken(connection, company_id){


    let contact = new Contact({id: this.contact_id});
    await contact.getToken(connection, this.property_id, 'tsys');

    if(contact.Token && contact.Token.token) {
      this.cc_token = contact.Token.token;
      return true;
    }

		const accountHolder = {
			first: this.first,
			last: this.last,
      contact_id: this.contact_id
		};

		await this.generateToken(accountHolder, company_id);
		//await models.Lease.save(connection, { token: this.token }, lease.id);

	}


	async authenticateCard(payment_source = "e-commerce"){

    var headers = {
      "user-agent": 'infonox'
    };

    let body =  {
      "CardAuthentication": {
      }
    };
    body.CardAuthentication.deviceID = this.connection_info.deviceId;
    body.CardAuthentication.transactionKey =  this.connection_info.transactionKey;

    let mit = false;
    let is_auto = false;
    switch(payment_source.toLowerCase()) {
      case "telephone/moto":
      case "in-store":
        mit = true;
        body.CardAuthentication.cardDataSource = 'PHONE';
        break;

      case "auto":
        mit = true;
        is_auto = true;
        body.CardAuthentication.cardDataSource = 'PHONE';
        break;
      case "e-commerce":
        body.CardAuthentication.cardDataSource = 'INTERNET';
        break;
      default:
        body.CardAuthentication.cardDataSource = 'INTERNET';
    }


    body.CardAuthentication.cardNumber = this.card_number;
    body.CardAuthentication.expirationDate = this.exp_mo + "/" + this.exp_yr;
    body.CardAuthentication.cvv2 = this.cvv2;
    body.CardAuthentication.addressLine1 = this.Address.address.trim();
    body.CardAuthentication.zip = this.Address.zip;

    //if (this.card_type.toLowerCase() === "visa" && (this.save_to_account || !mit) ){
    if (this.card_type.toLowerCase() === "visa" && (this.save_to_account || !is_auto) ){
      body.CardAuthentication.cardOnFile = 'Y';
    }

    //if(body.CardAuthentication.cardDataSource.toLowerCase() === 'internet'){
    body.CardAuthentication.tokenRequired = 'Y';
    //}


    body.CardAuthentication.developerID = developerID;
    body.CardAuthentication.terminalCapability = "KEYED_ENTRY_ONLY";
    if(mit){
      body.CardAuthentication.terminalOperatingEnvironment = "ON_MERCHANT_PREMISES_ATTENDED";
    }  else {
      body.CardAuthentication.terminalOperatingEnvironment = "OFF_MERCHANT_PREMISES_UNATTENDED";
    }

    //body.CardAuthentication.terminalOperatingEnvironment = "ON_MERCHANT_PREMISES_ATTENDED";
    body.CardAuthentication.cardholderAuthenticationMethod = "NOT_AUTHENTICATED";
    body.CardAuthentication.terminalAuthenticationCapability = "NO_CAPABILITY";
    body.CardAuthentication.terminalOutputCapability = "NONE";
    body.CardAuthentication.maxPinLength = "NOT_SUPPORTED";
    body.CardAuthentication.terminalCardCaptureCapability = "NO_CAPABILITY";

    switch(payment_source.toLowerCase()) {
      case "e-commerce":
        body.CardAuthentication.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_ELECTRONIC_COMMERCE";
        body.CardAuthentication.cardPresentDetail =  "CARD_NOT_PRESENT";

        if(this.cvv2 && this.card_type.toLowerCase() === "amex" ){
          body.CardAuthentication.cardDataInputMode = "MANUALLY_ENTERED_WITH_KEYED_CID_AMEX_JCB";
        } else {
          body.CardAuthentication.cardDataInputMode = "ELECTRONIC_COMMERCE_NO_SECURITY_CHANNEL_ENCRYPTED_SET_WITHOUT_CARDHOLDER_CERTIFICATE";
        }
        break;

      case "telephone/moto":
      case "auto":
        body.CardAuthentication.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_PHONE_TRANSACTION";
        body.CardAuthentication.cardPresentDetail =  "CARD_NOT_PRESENT";

        if(this.cvv2 && this.card_type.toLowerCase() === "amex" ){
          body.CardAuthentication.cardDataInputMode = "MANUALLY_ENTERED_WITH_KEYED_CID_AMEX_JCB";
        } else {
          body.CardAuthentication.cardDataInputMode = "KEY_ENTERED_INPUT";
        }
        break;
      default:
        body.CardAuthentication.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_ELECTRONIC_COMMERCE";
        body.CardAuthentication.cardPresentDetail =  "CARD_NOT_PRESENT";

        if(this.cvv2 && this.card_type.toLowerCase() === "amex" ){
          body.CardAuthentication.cardDataInputMode = "MANUALLY_ENTERED_WITH_KEYED_CID_AMEX_JCB";
        } else {
          body.CardAuthentication.cardDataInputMode = "ELECTRONIC_COMMERCE_NO_SECURITY_CHANNEL_ENCRYPTED_SET_WITHOUT_CARDHOLDER_CERTIFICATE";
        }
    }

    body.CardAuthentication.cardholderAuthenticationEntity = "NOT_AUTHENTICATED";
    body.CardAuthentication.cardDataOutputCapability = "NONE";


    this.log("REQ: " +  JSON.stringify(body));

    console.log("REQ: " +  JSON.stringify(body, null, 2));


    let response = await request({
      headers: headers,
      body:body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });


    this.log("RES: " +  JSON.stringify(response));
    console.log("RES: " +  JSON.stringify(response, null, 2));

    if(!response.CardAuthenticationResponse) {
      e.th(500, "GatewayError: Could not get a response from the TSYS Gateway")
    }

    if(response.CardAuthenticationResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.CardAuthenticationResponse.responseMessage);
    }

    return response.CardAuthenticationResponse;



  }

  async refund(connection, payment, company_id, amount, refund) {
    return await this.return(connection, payment, company_id, amount, refund);
    // if(moment(payment.created).format('x') <= moment().startOf('day').format('x') ){
    // } else {
    //   return await this.void(connection, payment, company_id, amount, refund);
    // }
  }

  async void(connection, payment, company_id, amount, refund){

    var headers = {
      "user-agent": 'infonox'
    };

    let body =  {
      "Void": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey,
        "transactionAmount": amount,
        "transactionID": payment.transaction_id,
        //"externalReferenceID": payment.id,
        "developerID": developerID,
        "voidReason": 'POST_AUTH_USER_DECLINE',
      }
    };

    this.log("REQ: " +  JSON.stringify(body));
    let response = await request({
      headers: headers,
      body: body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });
    this.log("RES: " +  JSON.stringify(response));
    if(!response.VoidResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.VoidResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.VoidResponse.responseMessage);
    }

    return {
      type: 'void',
      transaction_id: response.VoidResponse.transactionID,
      auth_code: response.VoidResponse.authCode
    }

  }

  async returnReversal(connection, payment, refund, company_id, amount){

    var headers = {
      "user-agent": 'infonox'
    };

    let body =  {
      "Void": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey,
        "transactionAmount": amount,
        "transactionID": refund.transaction_id,
        //"externalReferenceID": payment.id,
        "developerID": developerID,
        "voidReason": refund.amount === Number(amount) ? 'POST_AUTH_USER_DECLINE' : 'PARTIAL_REVERSAL'
      }
    };


    this.log("REQ: " +  JSON.stringify(body));

    let response = await request({
      headers: headers,
      body: body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });
    this.log("RES: " +  JSON.stringify(response));
    if(!response.VoidResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.VoidResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.VoidResponse.responseMessage);
    }

    return {
      type: 'void',
      transaction_id: response.VoidResponse.transactionID,
      auth_code: response.VoidResponse.authCode
    }

  }

  async return(connection, payment, company_id, amount, refund){

    var headers = {
      "user-agent": 'infonox'
    };

    let body =  {
      "Return": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey,
        "cardDataSource": "PHONE",
        "transactionAmount": amount,
        "transactionID": payment.transaction_id,
        "developerID": developerID,
      }
    }


    this.log("REQ: " +  JSON.stringify(body));
    console.log("TSYS Return REQ: " +  JSON.stringify(body));



    let response = await request({
      headers: headers,
      body: body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });

    this.log("RES: " +  JSON.stringify(response));
    console.log("TSYS Return RES: " +  JSON.stringify(response));


    if(!response.ReturnResponse) {
      e.th(500, "Could not get a response from the Tsys Gateway")
    }

    if(response.ReturnResponse.status === 'FAIL'){
      e.th(400, "Processor Error: " + response.ReturnResponse.responseMessage);
    }

    return {
      type: 'refund',
      transaction_id: response.ReturnResponse.transactionID,
      auth_code: null
    }

  }

  async charge(connection, amount, payment_id, company_id, dryrun, contact, payment_source, authorization = null, refund_effective_date){
    let error = null;
    // Get token from lease
    // let r = await this.getCreds(amount);

    if(this.type === 'google'){
      return true;
    }
    if(this.type === 'apple'){
      return true;
    }

    if(dryrun) return true;
    let payment_info = {};
    let response = {};
    try {


      if(this.token){
        try{
          // attempt to charge card
          response = await this.chargeToken(this.connection_info, amount, this.token, payment_id, company_id, contact && contact.role === 'admin', payment_source);
        } catch(err){
          console.log("Error while charging: ", err);
          error = err;
        }
      } else {
        error = {
          msg: "Token not found"
        }
      }
      if(!error){
          payment_info = {
          payment_gateway: this.payment_gateway,
          transaction_id: response.transactionID,
          status_desc:    response.responseMessage,
          amount:  response.processedAmount,
          status: response.status === 'PASS' ? 1 : 0

        }

        if(!this.payment_method_type_id){
          let payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type, this.card_type)
          payment_info.payment_method_type_id = payment_method_type_id;
          let payment_method_info = {
            payment_method_type_id: payment_method_type_id
          }

          if (this.id) {
            await models.Payment.savePaymentMethod(connection, payment_method_info, this.id);
          }
        } else {
          payment_info.payment_method_type_id = this.payment_method_type_id;
        }

      } else {
        payment_info.status = 0;
        payment_info.status_desc = error.msg || error;
        payment_info.payment_gateway = this.payment_gateway;
      }

      await models.Payment.save(connection, payment_info, payment_id);
      payment_info.id = payment_id;

      //////////////////////////////
      // if partially approved, void immediately
      //////////////////////////////
      if(response && response.responseMessage === 'Partially Approved' ){
        let refund = {
          type: 'void',
          amount: response.processedAmount,
          payment_id: payment_id,
          ref_num: "",
          reason: "Partial Auth",
          date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
          effective_date: refund_effective_date
        };

        let save_refund = await models.Payment.saveRefund(connection, refund);
        let refund_id = save_refund.insertId;

        let refund_response = await this.void(connection, payment_info, company_id, payment_info.amount);

        let data = {
          auth_code: refund_response.auth_code,
          transaction_id: refund_response.transaction_id
        };
        await models.Payment.saveRefund(connection, data, refund_id);
      }

      if(error) e.th(400, error.msg);
      
    } catch(err){
      console.log(err.stack);
      e.th(400, err.msg)
    }
  }

	async generateToken(accountHolder, company_id){

		var headers = {
			"user-agent": 'infonox'
		};

    let body = {
      headers: headers,
      body:{
        GetOnusToken: {
          deviceID: "test_deviceID",
          transactionKey: this.transactionKey,
          cardDataSource: "MANUAL",
          cardNumber: '',
          expirationDate: '',
          cardVerification: '',
          developerID: '',
        }
      },
      json:true,
      uri: this.endpoint,
      method: 'POST'
    };



    this.log("REQ: " +  JSON.stringify(body.body));


		let response = await request(body);


    this.log("RES: " +  JSON.stringify(response));

		if(!response.GetOnusToken) {
			e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
		}

		if(response.GetOnusToken.status === 'FAIL'){
			e.th(400, "Issuer Rejection: " + response.GetOnusToken.responseMessage);
		}

		this.transactionKey = response.GetOnusToken.token;

		this.token = '';

	}

  async chargeToken(connection_info, amount, token, payment_id, company_id, is_admin, payment_source =  'e-commerce'){

    var headers = {
      "user-agent": 'infonox'
    };

    // Field Order Matters!  Do not rearrange
    let body = {
      "Sale": {}
    }

    body.Sale.deviceID = this.connection_info.deviceId;
    body.Sale.transactionKey =  this.connection_info.transactionKey;

    let is_mit = false;
    switch(payment_source.toLowerCase()) {
      case "telephone/moto":
        body.Sale.cardDataSource = 'PHONE';
        is_mit = true;
        break;
      case "in-store":
        body.Sale.cardDataSource = 'PHONE';
        is_mit = true;
        break;
      case "auto":
        body.Sale.cardDataSource = 'PHONE';
        is_mit = true;
        break;
      case "e-commerce":
        body.Sale.cardDataSource = 'INTERNET';
        break;
      default:
        body.Sale.cardDataSource = 'INTERNET';
    }
    body.Sale.transactionAmount =  amount.toFixed(2);
    body.Sale.cardNumber =  this.token;
    //body.Sale.expirationDate = moment(this.exp_warning, 'YYYY-MM-DD').add(6, 'weeks').format('MM/YYYY');
    body.Sale.expirationDate = moment(this.exp_warning, 'YYYY-MM-DD').format('MM/YYYY');
    if(this.cvv2){
      body.Sale.cvv2 = this.cvv2;
    }

    if(this.cvv2){
      body.Sale.cvv2 =  this.cvv2;
    }


    if((this.card_type.toLowerCase() === "visa" || this.card_type.toLowerCase() === "mastercard") && this.token_alt &&  is_mit){
      body.Sale.cardOnFileTransactionIdentifier = this.token_alt;  // TransactionID from auth call
    }

    if(this.card_type.toLowerCase() === "mastercard") {
      body.Sale.mitStatusIndicator = "M102";
    }

    body.Sale.addressLine1 =  this.Address.address;
    body.Sale.zip =  this.Address.zip;


    body.Sale.externalReferenceID =  payment_id; // paymentID,

    if (this.card_type.toLowerCase() === "visa" && !this.is_new && is_mit){
      body.Sale.cardOnFile = 'Y';
    }

    body.Sale.terminalCapability= "KEYED_ENTRY_ONLY";

    if(payment_source.toLowerCase() === 'auto'){
      if(this.card_type.toLowerCase() === "mastercard"){
        body.Sale.terminalOperatingEnvironment = "NO_TERMINAL";
      } else {
        body.Sale.terminalOperatingEnvironment = "OFF_MERCHANT_PREMISES_UNATTENDED";
      }
    } else if(payment_source.toLowerCase() === "telephone/moto" || payment_source.toLowerCase() === "in-store") {
      body.Sale.terminalOperatingEnvironment = "ON_MERCHANT_PREMISES_ATTENDED";
    } else {
      body.Sale.terminalOperatingEnvironment = "OFF_MERCHANT_PREMISES_UNATTENDED";
    }


    body.Sale.cardholderAuthenticationMethod= "NOT_AUTHENTICATED";
    body.Sale.terminalAuthenticationCapability= "NO_CAPABILITY";

    if(payment_source.toLowerCase() === 'auto'){
      body.Sale.terminalOutputCapability = "DISPLAY_ONLY";
    } else {
      body.Sale.terminalOutputCapability = "NONE";
    }

    body.Sale.maxPinLength = "NOT_SUPPORTED";
    body.Sale.terminalCardCaptureCapability = "NO_CAPABILITY";


    switch(payment_source.toLowerCase()) {
      case "telephone/moto":
        body.Sale.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_PHONE_TRANSACTION";
        body.Sale.cardPresentDetail =  "CARD_NOT_PRESENT";
        break;
      case "in-store":
        body.Sale.cardholderPresentDetail = "CARDHOLDER_PRESENT";
        body.Sale.cardPresentDetail =  "CARD_PRESENT";
        break;
      case "auto":
        body.Sale.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_RECURRING_TRANSACTION";
        body.Sale.cardPresentDetail =  "CARD_NOT_PRESENT";

        break;
      default:
        body.Sale.cardholderPresentDetail = "CARDHOLDER_NOT_PRESENT_ELECTRONIC_COMMERCE";
        body.Sale.cardPresentDetail =  "CARD_NOT_PRESENT";
    }

    if(this.is_new && is_mit){
      if(this.card_type.toLowerCase() === "amex" ){
        body.Sale.cardDataInputMode = "MANUALLY_ENTERED_WITH_KEYED_CID_AMEX_JCB";
      } else {
        // body.Sale.cardDataInputMode = "KEY_ENTERED_INPUT";
        body.Sale.cardDataInputMode = "MERCHANT_INITIATED_TRANSACTION_CARD_CREDENTIAL_STORED_ON_FILE";
      }
    } else {
      body.Sale.cardDataInputMode = "MERCHANT_INITIATED_TRANSACTION_CARD_CREDENTIAL_STORED_ON_FILE";
    }


    body.Sale.cardholderAuthenticationEntity = "NOT_AUTHENTICATED";
    body.Sale.cardDataOutputCapability = "NONE";
    body.Sale.developerID = developerID;

    if(payment_source.toLowerCase() === "auto") {
      body.Sale.isRecurring = 'Y';
    }

    if (this.card_type.toLowerCase() === "mastercard"){
      body.Sale.authorizationIndicator = 'FINAL';
    }

    this.log("REQ: " +  JSON.stringify(body));
    console.log("REQ: " +  JSON.stringify(body, null, 2));

    let response = await request({
      headers: headers,
      body: body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });

    this.log("RES: " +  JSON.stringify(response));

    if(!response.SaleResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway");
    }

    if(response.SaleResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.SaleResponse.responseMessage);
    }

    return response.SaleResponse;
  }

  async batchClose(connection_info, amount,token,payment_id,company_id){

    var headers = {
      "user-agent": 'infonox'
    };

    let body =  {
      "BatchClose": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey
      }
    };
    this.log("REQ: " +  JSON.stringify(body));

    let response = await request({
      headers: headers,
      body: body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });

    this.log("RES: " +  JSON.stringify(response));

    if(!response.BatchCloseResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.BatchCloseResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.BatchCloseResponse.responseMessage);
    }

    return response.BatchCloseResponse;

  }


}


module.exports = TsysCard;

var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');
