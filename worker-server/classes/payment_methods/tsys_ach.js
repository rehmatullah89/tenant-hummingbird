var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment      = require('moment');
var validator = require('validator');

var PaymentMethod = require(__dirname + './../payment_method.js');

var request = require('request-promise');

const { promises: fs } = require("fs");

class TsysAch extends PaymentMethod {

    constructor(data, connection_info, payment_gateway){
        super(data, connection_info);
        this.payment_gateway = payment_gateway;

    this.endpoint = process.env.TSYS_PAYMENTS_ENDPOINT;
		this.transactionKey = '';
	}

	validate(){

		return Promise.resolve().then(() => {
			if (!this.name_on_card)
				e.th(400,'Name on card is missing');

			if (!validator.isCreditCard(this.card_number + ''))
				e.th(400, 'You have entered an invalid card number');

			if(!validator.isIn(this.exp_mo + '', ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']))
				e.th(400,  "You have entered an invalid expiration month");

			if(!validator.isInt(_this.exp_yr + '', {
				min: moment().format('YY'),
				max:  moment().add(10, 'year').format('YY')
			})) e.th(400, "You have entered an invalid expiration year");

			if(!this.cvv2)
				e.th(400, 'CVV2 code is missing');

			if(!this.address || !this.city || !this.state || !this.zip){
				e.th(400,  'Address is not complete');
			}

			return true;

		})
	}

  async log(string){
    return await fs.appendFile('/home/app/hummingbird/tsys_runs/tsys_runs.txt', string + '\r\n');
  }

	async setData(connection, data){

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
      await this.setAddress(address)
    }

    this.type = 'ach';
    this.active = 1;
    this.company= data.company;
    this.first = data.first.trim();
    this.last = data.last.trim();
    this.auto_charge = data.auto_charge? 1 : 0;
    this.save_to_account = data.save_to_account? 1 : 0;


    this.account_holder = data.first + ' ' + data.last;
    this.routing_number = data.routing_number;
    this.account_number = data.account_number;
    this.account_type = data.account_type;
    this.name_on_card =  data.first + ' ' + data.last;

    this.address_id = address.id;
    this.address = address.address;
    this.address2 = address.address2;
    this.city = address.city;
    this.state = address.state;
    this.zip = address.zip;

    this.active = data.save_to_account;

    // Has to be full card number because we dont tokenize this.
    this.card_end = data.account_number;
    this.card_type = data.account_type;
    this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)
	}

  async generateKey(){

    let headers = {
      "user-agent": 'infonox'
    };

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

    if(!response.GenerateKeyResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.GenerateKeyResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.GenerateKeyResponse.responseMessage);
    }

    this.transactionKey = response.GenerateKeyResponse.transactionKey;

  }


	async save(connection, company_id, payment_source){

		var save = {
      contact_id: this.contact_id,
      property_id: this.property_id,
			address_id: this.address_id,
			company: this.company,
			first: this.first,
			last: this.last,
			token: null,
			name_on_card: this.name_on_card,
			exp_warning: this.exp_warning,
			auto_charge: this.auto_charge || 0,
			rent: this.rent,
			utilities: this.utilities,
			active: this.active,
			type: this.type,
			card_end: this.card_end,
			routing_number: this.routing_number,
			card_type: this.card_type,
      payment_method_type_id: this.payment_method_type_id
		};

		this.id  = await models.Payment.savePaymentMethod(connection, save)

	}

	async charge(connection, amount, payment_id, company_id, dryrun, contact, source){


		if(dryrun) return true;

		try {

		  let response = await this.chargeACH(this.connection_info, amount, company_id, source);

            await models.Payment.save(connection, {
                payment_gateway: this.payment_gateway,
				transaction_id: response.transactionID,
				status_desc:    response.responseMessage,
        status: response.status === 'PASS' ? 1 : 0
			}, payment_id)

		} catch(err){
      let payment_info = {
        payment_gateway: this.payment_gateway,
        status_desc:    err.toString(),
        status: 0
      }
      await models.Payment.save(connection, payment_info, payment_id);
			e.th(400, err.msg)
		}
	}

	remove (connection, company_id){
    // TODO remove from Tsys?
    return models.Payment.deletePaymentMethod(connection, this.id)
	}

  async refund(connection, payment, company_id, amount, refund, reason){

    let headers = {
      "user-agent": 'infonox'
    };

    console.log("this.card_type", this.card_type);

    let body = {
      "AchReturn": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey,
        "transactionAmount": amount,
        "accountDetails": {
          "routingNumber": this.routing_number,
          "accountNumber": this.account_number,
          "accountType": this.card_type.toUpperCase(),
          "addressLine1": this.Address.address,
          "addressLine2": this.Address.address2,
          "zip": this.Address.zip,
          "city": this.Address.city,
          "state": this.Address.state,
        },
      }
    };


    body.AchReturn.achSecCode = "PPD";
    body.AchReturn.originateDate = moment(payment.date, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
    // body.AchReturn.returnTransactionData = {
    //   transactionID: payment.transaction_id
    // }
    //body.AchReturn.transactionID = ;
    body.AchReturn.firstName = this.first;
    body.AchReturn.lastName = this.last;
    body.AchReturn.addressLine1 = this.Address.address;
    body.AchReturn.addressLine2 = this.Address.address2;
    body.AchReturn.zip = this.Address.zip;
    body.AchReturn.city = this.Address.city;
    body.AchReturn.state = this.Address.state;
    // body.AchReturn.returnNote = reason;
    body.AchReturn.developerID = "003231G003";

    console.log(body);
    //e.th(400, 'test');
    this.log("REQ: " +  JSON.stringify(body));

    let response = await request({
      headers: headers,
      body:body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });

    this.log("RES: " +  JSON.stringify(response));

    if(!response.AchReturnResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.AchReturnResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.AchReturnResponse.responseMessage);
    }


    return {
      transaction_id: response.AchReturnResponse.transactionID,
      auth_code: null
    }



	  //
	  //
    // var headers = {
    //   "user-agent": 'infonox'
    // };
    //
    // let body =  {
    //   // "developerID": "003231G003",
    //   "deviceID": this.connection_info.deviceId,
    //   "transactionKey": this.connection_info.transactionKey,
    //   "transactionAmount": amount,
    //   "transactionID": payment.transaction_id,
    //   // "accountDetails":{
    //   //   "routingNumber":  this.routing_number,
    //   //   "accountNumber":  this.card_end,
    //   //   "accountType":    this.account_type,
    //   //   "addressLine1":   this.Address.address,
    //   //   "addressLine2":   this.Address.address2,
    //   //   "zip":            this.Address.zip,
    //   //   "city":           this.Address.city,
    //   //   "state":          this.Address.state,
    //   // },
    //   // "achSecCode":"WEB",
    //   "firstName":    this.first,
    //   "lastName":     this.last,
    //   // "addressLine1": this.Address.address,
    //   // "addressLine2": this.Address.address2,
    //   // "zip":          this.Address.zip,
    //   // "city":         this.Address.city,
    //   // "state":        this.Address.state,
    //   "developerID": "003231G003",
    // }
    //
    // let response = await request({
    //   headers: headers,
    //   body:{
    //     "AchReturn": body
    //   },
    //   json:true,
    //   uri: this.endpoint,
    //   method: 'POST'
    // });
    //
    // console.log("response", response);
    //
    // if(!response.AchReturnResponse) {
    //   e.th(500, "Could not get a response from the Tsys Gateway")
    // }
    //
    // if(response.AchReturnResponse.status === 'FAIL'){
    //   e.th(400, "Processor Error: " + response.AchReturnResponse.responseMessage);
    // }
    //
    // return {
    //   transaction_id: response.AchReturnResponse.transactionID,
    //   auth_code: null
    // }

  }

	void_payment(){

	}

	getPaymentStatus(connection, payment, company_id){

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

  }

	async generateToken(accountHolder, company_id){


		var headers = {
			"user-agent": 'infonox'
		};

		let response = await request({
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
		});

		if(!response.GetOnusToken) {
			e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
		}

		if(response.GetOnusToken.status === 'FAIL'){
			e.th(400, "Issuer Rejection: " + response.GetOnusToken.responseMessage);
		}

		this.transactionKey = response.GetOnusToken.token;

		this.token = '';

	}


	async chargeACH(connection_info, amount, company_id, payment_source = 'e-commerce'){

    let headers = {
      "user-agent": 'infonox'
    };

    let card_type = this.card_type.toLowerCase() === 'savings' ? "saving" : this.card_type;

    let body = {
      "Ach": {
        "deviceID": this.connection_info.deviceId,
        "transactionKey": this.connection_info.transactionKey,
        "transactionAmount": amount.toFixed(2),
        "accountDetails": {
          "routingNumber": this.routing_number,
          "accountNumber": this.card_end,
          "accountType": card_type.toUpperCase(),
          "addressLine1": this.Address.address,
          "addressLine2": this.Address.address2,
          "zip": this.Address.zip,
          "city": this.Address.city,
          "state": this.Address.state,
        },
      }
    }

    if(payment_source === 'e-commerce'){
      body.Ach.achSecCode = "WEB";
    } else {
      body.Ach.achSecCode = "TEL";
    }
    body.Ach.originateDate = moment().format('YYYY-MM-DD');
    body.Ach.firstName = this.first;
    body.Ach.lastName = this.last;
    body.Ach.addressLine1 = this.Address.address;
    body.Ach.addressLine2 = this.Address.address2;
    body.Ach.zip = this.Address.zip;
    body.Ach.city = this.Address.city;
    body.Ach.state = this.Address.state;
    body.Ach.developerID = "003231G003";

    console.log(body);
    this.log("REQ: " +  JSON.stringify(body));

    let response = await request({
      headers: headers,
      body:body,
      json:true,
      uri: this.endpoint,
      method: 'POST'
    });

    this.log("RES: " +  JSON.stringify(response));

    if(!response.AchResponse) {
      e.th(500, "GatewayError: Could not get a response from the Tsys Gateway")
    }

    if(response.AchResponse.status === 'FAIL'){
      e.th(400, "Issuer Rejection: " + response.AchResponse.responseMessage);
    }

    return response.AchResponse;

  }
}


module.exports = TsysAch;

var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');
