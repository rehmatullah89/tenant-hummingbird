var e  = require(__dirname + '/../../modules/error_handler.js');
var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment      = require('moment');
var validator = require('validator');

var PaymentMethod = require(__dirname + './../payment_method.js');
const clsContext = require(__dirname + '/../../modules/cls_context');
var Enums = require(__dirname + '/../../modules/enums.js');
var request = require('request-promise');
var xmljs = require('xml-js');

const { promises: fs } = require("fs");

class TsysSwipe extends PaymentMethod {

  constructor(data, connection_info, payment_gateway){
    super(data, connection_info);
    this.payment_gateway = payment_gateway;

    this.endpoint = process.env.TSYS_SWIPE_API_ENDPOINT + "/pax-integration/api/";
    //process.env.TSYS_SWIPE_API_ENDPOINT;
	}

	validate(){

		return Promise.resolve().then(() => {
			if (!this.device_id)
				e.th(400,'Device id is missing');


			return true;

		})
	}

  async log(string){
    return await fs.appendFile('/home/app/hummingbird/tsys_runs/tsys_swipe_runs.txt', string + '\r\n');
  }

	async setData(connection, data){

    this.device_id = data.device_id;
    this.type = 'card';
    this.company= data.company;
    this.first = data.first.trim();
    this.last = data.last.trim();
    this.auto_charge = data.auto_charge? 1 : 0;
    this.active = data.save_to_account? 1 : 0;
    this.account_holder = data.first + ' ' + data.last;
    this.routing_number = data.routing_number;
    this.account_number = data.account_number;
    this.account_type = data.account_type;
    this.name_on_card =  data.first + ' ' + data.last;

    // this.card_type = await this.getCardType();
    // this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)
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
			card_type: this.card_type
		};

		this.id  = await models.Payment.savePaymentMethod(connection, save, this.id)

	}

  async charge(connection, amount, payment_id, company_id, dryrun, contact, source, authorization = null, refund_effective_date, ip_override, paymentRef = {}){

		if(dryrun) return true;

		try {

      let device = this.connection_info.Devices.find(d => d.id = this.device_id);

      let body = {
        "settings": {
          "destIP": device.ip,
          "destPort": device.port,
          "timeOut": "120000",
          "username": this.connection_info.userID,
          "password": this.connection_info.password,
          "merchantID": this.connection_info.mid,
          "deviceID": this.connection_info.deviceId,
          "companyID": Hashes.encode(company_id, connection.cid),
        },
        "payment": {
            "tenderType": "CREDIT",
            "transType": "SALE",
            "amount": (amount * 1e2).toFixed(0),
            "ecrRefNum": Hashes.encode(payment_id, connection.cid),
            "paymentId": Hashes.encode(payment_id, connection.cid),
        }

      }

      let payment_info = {
        payment_gateway: this.payment_gateway,
        status: 0,
        status_desc: 'Waiting for response from card reader'
      };
      await models.Payment.save(connection, payment_info, payment_id);

      console.log("REQ: " +  JSON.stringify(body));
      this.log("REQ: " +  JSON.stringify(body));

      let response = await request({
        body: body,
        json: true,
        timeout: 35000,
        uri: this.endpoint + 'payment',
        method: 'POST'
      });

      console.log("RES stringify: " +  JSON.stringify(response));
      console.log("RES: " + response);
      this.log("RES: " +  JSON.stringify(response));

      if (response.integrationError) { 
        let integrationResponse = response.integrationError
        e.th(500, `Integration Error: ${integrationResponse.message}`);
      }
      response = JSON.parse(response.responseJSON);

      if (response.ResultTxt !== 'OK') {
        e.th(500, `${response.ResultTxt}`);
      }

      if (response.ExtData) {
        var options = { compact: true, ignoreComment: true, spaces: 4 };
        var json = xmljs.xml2js("<data>" + response.ExtData + "</data>", options);
        response.ExtData = json.data;
      }
      console.log("***********PAX Response*************", response);
      
      payment_info = {
        payment_gateway: this.payment_gateway,
        auth_code: response.AuthCode,
        transaction_id: response.ExtData && response.ExtData.HRef._text,
        status_desc: response.Message,
        amount: response.ApprovedAmount / 100,
        status: response.ResultTxt === 'OK' ? 1 : 0
      }

      var expdate = response.ExtData && response.ExtData.ExpDate._text;
      let token = response.ExtData && response.ExtData.Token._text;

      let payment_method_info = {
        card_end: response.BogusAccountNum,
        card_type: response.CardType.toLowerCase(),
        active: (this.active && response.ResultTxt === 'OK') ? 1 : 0,
        exp_warning: expdate && moment(`${expdate.substring(0, 2)}/${expdate.substring(2)}`, 'MM/YY').format('YYYY-MM-DD'),
        token: token
      }

      // if(!this.payment_method_type_id){
      //   let payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type, response.CardType.toLowerCase())
      //   payment_method_info.payment_method_type_id = payment_method_type_id;
      //   payment_info.payment_method_type_id = payment_method_type_id;
      // } else {
      //   payment_info.payment_method_type_id = this.payment_method_type_id;
      // }

      await models.Payment.save(connection, payment_info, payment_id);

      console.log("Payment method id", this.id)
      if (this.id) {
        await models.Payment.savePaymentMethod(connection, payment_method_info, this.id);
      }
      



		} catch(err){
      this.log("ERR: " +  JSON.stringify(err));
      console.log("TSYS Swipe ERR: " +  JSON.stringify(err), null, 2);
      e.th(err.code, "Error with Card Reader Transaction. " + err);
      let payment_info = {
        payment_gateway: this.payment_gateway,
        status_desc: err.toString(),
        status: 0
      }
      paymentRef.PaymentInfo = payment_info;
      // if(err.error.code !== "ESOCKETTIMEDOUT"){
        //e.th(400, err.message);
      // }
		}
	}

	// remove (connection, company_id){
  //   // TODO remove from Tsys?
  //   return models.Payment.deletePaymentMethod(connection, this.id)
	// }

  // async refund(connection, payment, company_id, amount, refund, reason){

  //   let headers = {
  //     "user-agent": 'infonox'
  //   };

  //   console.log("this.card_type", this.card_type);

  //   let body = {
  //     "AchReturn": {
  //       "deviceID": this.connection_info.deviceId,
  //       "transactionKey": this.connection_info.transactionKey,
  //       "transactionAmount": amount,
  //       "accountDetails": {
  //         "routingNumber": this.routing_number,
  //         "accountNumber": this.account_number,
  //         "accountType": this.card_type.toUpperCase(),
  //         "addressLine1": this.Address.address,
  //         "addressLine2": this.Address.address2,
  //         "zip": this.Address.zip,
  //         "city": this.Address.city,
  //         "state": this.Address.state,
  //       },
  //     }
  //   };


  //   body.AchReturn.achSecCode = "PPD";
  //   body.AchReturn.originateDate = moment(payment.date, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
  //   // body.AchReturn.returnTransactionData = {
  //   //   transactionID: payment.transaction_id
  //   // }
  //   //body.AchReturn.transactionID = ;
  //   body.AchReturn.firstName = this.first;
  //   body.AchReturn.lastName = this.last;
  //   body.AchReturn.addressLine1 = this.Address.address;
  //   body.AchReturn.addressLine2 = this.Address.address2;
  //   body.AchReturn.zip = this.Address.zip;
  //   body.AchReturn.city = this.Address.city;
  //   body.AchReturn.state = this.Address.state;
  //   // body.AchReturn.returnNote = reason;
  //   body.AchReturn.developerID = "003231G003";

  //   console.log(body);
  //   //e.th(400, 'test');
  //   this.log("REQ: " +  JSON.stringify(body));

  //   let response = await request({
  //     headers: headers,
  //     body:body,
  //     json:true,
  //     uri: this.endpoint,
  //     method: 'POST'
  //   });

  //   this.log("RES: " +  JSON.stringify(response));

  //   if(!response.AchReturnResponse) {
  //     e.th(500, "Could not get a response from the Tsys Gateway")
  //   }

  //   if(response.AchReturnResponse.status === 'FAIL'){
  //     e.th(400, "Processor Error: " + response.AchReturnResponse.responseMessage);
  //   }


  //   return {
  //     transaction_id: response.AchReturnResponse.transactionID,
  //     auth_code: null
  //   }



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

  // }

	// void_payment(){

	// }

	// getPaymentStatus(connection, payment, company_id){

	// }

  // async setCustomerProfileToken(connection, company_id){


  //   let contact = new Contact({id: this.contact_id});
  //   await contact.getToken(connection, this.property_id, 'tsys');

  //   if(contact.Token && contact.Token.token) {
  //     this.cc_token = contact.Token.token;
  //     return true;
  //   }

  //   const accountHolder = {
  //     first: this.first,
  //     last: this.last,
  //     contact_id: this.contact_id
  //   };

  //   await this.generateToken(accountHolder, company_id);

  // }

	// async generateToken(accountHolder, company_id){


	// 	var headers = {
	// 		"user-agent": 'infonox'
	// 	};

	// 	let response = await request({
	// 		headers: headers,
	// 		body:{
	// 			GetOnusToken: {
	// 				deviceID: "test_deviceID",
	// 				transactionKey: this.transactionKey,
	// 				cardDataSource: "MANUAL",
	// 				cardNumber: '',
	// 				expirationDate: '',
	// 				cardVerification: '',
	// 				developerID: '',
	// 			}
	// 		},
	// 		json:true,
	// 		uri: this.endpoint,
	// 		method: 'POST'
	// 	});

	// 	if(!response.GetOnusToken) {
	// 		e.th(500, "Could not get a response from the Tsys Gateway")
	// 	}

	// 	if(response.GetOnusToken.status === 'FAIL'){
	// 		e.th(400, "Processor Error: " + response.GetOnusToken.responseMessage);
	// 	}

	// 	this.transactionKey = response.GetOnusToken.token;

	// 	this.token = '';

	// }


	// async chargeACH(connection_info, amount, company_id, payment_source = 'e-commerce'){

  //   let headers = {
  //     "user-agent": 'infonox'
  //   };

  //   let card_type = this.card_type.toLowerCase() === 'savings' ? "saving" : this.card_type;

  //   let body = {
  //     "Ach": {
  //       "deviceID": this.connection_info.deviceId,
  //       "transactionKey": this.connection_info.transactionKey,
  //       "transactionAmount": amount.toFixed(2),
  //       "accountDetails": {
  //         "routingNumber": this.routing_number,
  //         "accountNumber": this.card_end,
  //         "accountType": card_type.toUpperCase(),
  //         "addressLine1": this.Address.address,
  //         "addressLine2": this.Address.address2,
  //         "zip": this.Address.zip,
  //         "city": this.Address.city,
  //         "state": this.Address.state,
  //       },
  //     }
  //   }

  //   if(payment_source === 'e-commerce'){
  //     body.Ach.achSecCode = "WEB";
  //   } else {
  //     body.Ach.achSecCode = "TEL";
  //   }
  //   body.Ach.originateDate = moment().format('YYYY-MM-DD');
  //   body.Ach.firstName = this.first;
  //   body.Ach.lastName = this.last;
  //   body.Ach.addressLine1 = this.Address.address;
  //   body.Ach.addressLine2 = this.Address.address2;
  //   body.Ach.zip = this.Address.zip;
  //   body.Ach.city = this.Address.city;
  //   body.Ach.state = this.Address.state;
  //   body.Ach.developerID = "003231G003";

  //   console.log(body);
  //   this.log("REQ: " +  JSON.stringify(body));

  //   let response = await request({
  //     headers: headers,
  //     body:body,
  //     json:true,
  //     uri: this.endpoint,
  //     method: 'POST'
  //   });

  //   this.log("RES: " +  JSON.stringify(response));

  //   if(!response.AchResponse) {
  //     e.th(500, "Could not get a response from the Tsys Gateway")
  //   }

  //   if(response.AchResponse.status === 'FAIL'){
  //     e.th(400, "Processor Error: " + response.AchResponse.responseMessage);
  //   }

  //   return response.AchResponse;

  // }
}


module.exports = TsysSwipe;

var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');
