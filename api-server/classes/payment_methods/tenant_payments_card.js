var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment      = require('moment');

const clsContext = require(__dirname + '/../../modules/cls_context');
var Enums = require(__dirname + '/../../modules/enums.js');

var PaymentMethod = require(__dirname + './../payment_method.js');
const { promises: fs } = require("fs");
var request = require('request-promise');
const crypto = require('crypto');
const pem = require("pem");

// const certStr = "aa3e53ce5db4ff78bf330f1ed0f98a";
// const termId = "d0f98a";


const developer_id = process.env.TENANT_PAYMENTS_DEVELOPER_ID; // TODO make env vars
const version_number = process.env.TENANT_PAYMENTS_VERSION_NUMBER;
const cert_str = process.env.TENANT_PAYMENTS_CERT_STR; 
const term_id = process.env.TENANT_PAYMENTS_TERM_ID; 
const service_url = process.env.TENANT_PAYMENTS_SERVICE_URL; 

const tenant_payments_acct_mgmt_endpoint = process.env.TENANT_PAYMENTS_ACCT_MGMT_ENDPOINT;
const x509_location = process.env.X509CERT_LOCATION || '/certs/Tenant.pfx';
const x509_password = process.env.X509CERT_PASSWORD ;

var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
const Portico = require("globalpayments-api");


// let api_key = 'skapi_cert_MUCzBQBo228AnBideWNMvXPEwX1kl0pkSSEJPqBH3g';
// let device_id = '88700000323102';
// let cert_str = 'aa3e53ce5db4ff78bf330f1ed0f98a';
// let term_id = 'd0f98a';
// let developer_id = "000000";
// let version_number = "0000";

// let license_id = '296658'
// let site_id = '308199'
// let username = '12294925P'
// let password = 'aQ#e^S9rYH'

// let api_key = 'skapi_cert_MUCzBQBo228AnBideWNMvXPEwX1kl0pkSSEJPqBH3g';
// let device_id = '88700000323102';
// let cert_str = 'aa3e53ce5db4ff78bf330f1ed0f98a';
// let term_id = 'd0f98a';
// let developer_id = "000000";
// let version_number = "0000";

// Device: 90916081
// Site: 373568
// License: 373397 
// User: 703693370
// Pass: $Test1234

// // DEV
let license_id = process.env.TENANT_PAYMENTS_LICENSE_ID; 
let site_id =  process.env.TENANT_PAYMENTS_SITE_ID;
let username = process.env.TENANT_PAYMENTS_USERNAME;
let password = process.env.TENANT_PAYMENTS_PASSWORD;

console.log(process.env)
console.log(license_id, site_id, username, password)
// PROD
// let license_id = '296658'
// let site_id = '373568'
// let username = '12294925P'
// let password = 'hps4925$'



const calculateLRC = (buffer) => {
  
  if (buffer) {
    let lrc = 0;
    for (let i = 1; i < buffer.length; i ++) {
      lrc = (lrc ^ ord(buffer[i]));
    }
    return chr(lrc);
  } else {
      return '';
  }
}

const ord = (str) => str.charCodeAt(0);
const chr = (ascii) => String.fromCharCode(ascii);




class TenantPaymentsCard extends PaymentMethod {

  constructor(data, connection_info, payment_gateway){
		super(data, connection_info);
    this.transactionKey = '';
    this.payment_gateway = payment_gateway;
	}

  setConnection(device_id){
    let config = new Portico.ServicesConfig();
    console.log(this.connection_info);
    config.siteId = site_id;
    config.licenseId = license_id;
    config.deviceId = device_id || this.connection_info.deviceId;
    config.username = username;
    config.password = password;

    //config.secretApiKey = connection_info.api_key;
    config.developerId = developer_id;
    config.versionNumber = version_number;
    
    config.serviceUrl = service_url;
    console.log("config", config)
    Portico.ServicesContainer.configure(config);
  }

	validate(){

		return Promise.resolve().then(() => {
			if (!this.name_on_card)
				e.th(400,'Name on card is missing');

			if(!this.address || !this.country || !this.zip){
				e.th(400,  'Address is not complete');
			}

			return true;

		})
	}

  async log(string){}

  async setData(connection, data, rent){
      let address = {};
      this.type = 'card';
      this.company= data.company;
      this.lease_id = this.lease_id || data.lease_id;
      this.first = data.first.trim();
      this.last = data.last.trim();
      this.auto_charge = !!data.auto_charge;
      this.device_id = data.device_id;
      this.active = !!data.save_to_account;
    
      if(data.device_id) return;

      if (!data.address_id ) {
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
      
      this.save_to_account = data.save_to_account? 1 : 0;
      
      this.token = data.token;
      
      this.card_number = data.card_number.replace(/\s/g, '');
      this.card_end = data.card_number.substr(data.card_number.length - 4);
      this.name_on_card = data.name_on_card;
      this.exp_mo = data.exp_mo;
      data.exp_yr = data.exp_yr.toString();
      this.exp_yr = data.exp_yr.length === 2 ? '20' + data.exp_yr : data.exp_yr;
    
      this.cvv2 = data.cvv2;
      this.address = address.address;
      this.address2 = address.address2;
      this.city = address.city;
      this.state = address.state;
      this.country = address.country;
      this.zip = address.zip.toString();
      this.active = data.save_to_account || 0;

      // this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').subtract(6, 'weeks').format('YYYY-MM-DD');
      this.exp_warning = moment(data.exp_mo + '/' + data.exp_yr, 'MM/YYYY').format('YYYY-MM-DD');

      this.card_type = await this.getCardType();
      this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)
        
	}

  async authorize(){
      let response = await this.authenticateCard();
      return response;
  }


  async save(connection, company_id, payment_source, tokenize){

    // if(!this.id && this.save_to_account){
    //   let response = await this.authenticateCard(payment_source);
    //   this.token = response.token;
    // }
    if(tokenize){
      let response = await this.authenticateCard();
      this.token = response.token;
      if (this.token === null) {
        this.tokenized = false;
        this.active = 0;
      }
    }
    
    let save = {
        contact_id: this.contact_id,
        property_id: this.property_id,
        address_id: this.address_id,
        company: this.company,
        first: this.first,
        last: this.last,
        token: this.token || null,
        // token_alt: this.token_alt,
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
    console.log("save", save)

  this.id  = await models.Payment.savePaymentMethod(connection, save, this.id)

}

	remove (connection, company_id){
	  // TODO remove from Portico? Dont think you can?
        return models.Payment.deletePaymentMethod(connection, this.id)
	}

	void_payment(){
    
        console.log("CALLING VOID PAYMENT!!")
	}

	async getPaymentStatus(connection, payment, company_id){

    try{

      this.setConnection();

      let transaction = await Portico.ReportingService.transactionDetail(payment.transaction_id)
      .execute();
      
      let is_settled = transaction.status === 'C'
      
      return {
          is_settled: is_settled
      }; 

    } catch(err){
      return {
        is_settled: false
      };
    }
    
        // Unsettled transactions are being reports with batchClose date of Invalid Date. Looks like an error with the SDK as it should return NULL or something a little better.  
        // This code tests if the date is a valid date object.
        // taken from https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
  }

  async getTransactions(start, end){

    this.setConnection();

    let transactions = await Portico.ReportingService.activity()
      .withStartDate(start)
      .withEndDate(end)
      .execute();
    
    return transactions; 

    
        // Unsettled transactions are being reports with batchClose date of Invalid Date. Looks like an error with the SDK as it should return NULL or something a little better.  
        // This code tests if the date is a valid date object.
        // taken from https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
  }

    

	async authenticateCard(){

      let error = null;
      let payment_info = {};
      let response = {};
      let response1 = {};

      response.responseCode = '';
      response.avsResponseCode = '';
   
      const address = new Portico.Address();
      
      address.address = this.address;
      // address.city = this.city;
      // address.state = this.state;
      address.postalCode = this.zip;

      this.setConnection();
      let isAmex = null;

      const card = new Portico.CreditCardData();
      card.number = this.card_number;
      card.expMonth = this.exp_mo;
      card.expYear = this.exp_yr;
      card.cvn = this.cvv2;
      
      try {
          console.log("number:", this.card_number);
          //Send Address for verification only if the card is an AMEX card
          if (await this.getCardType() === "AMEX") {
            isAmex = true;
            response = await card.verify()
              .withCurrency("USD")
              .withAddress(address)
              .withRequestMultiUseToken(true)
              .execute();
          } else {
            response = await card.verify()
              .withCurrency("USD")
              .withRequestMultiUseToken(true)
              .execute();
          }

        console.log("authenticateCard response", response);
  
        if (response.responseCode && response.responseCode === '00' && response.token) {
          return {
            token: response.token
          }
        } else if (isAmex && response.avsResponseCode && (response.avsResponseCode) !== '0' && !response.token) {
          error = Enums.PAYMENT_ERROR.ISSUER_ERROR + "AVS Error " + response.avsResponseCode + " - " + response.avsResponseMessage;
          console.log("AVSError: ", error);   
          e.th(400, error);
        } else if (response.responseCode) {
            if(Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode]){
              error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage + " - " + Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode];
            } else {
                error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
            }
          console.log("Error: ", error);   
          e.th(400, error);
        } else {
          error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
          console.log("Error: ", error);   
          e.th(400, error);
        }

      } catch (err) {
          console.log(err);
          err = err.toString();
          err = err.replace("Unexpected Gateway Response: ", "").replace("Error: Issuer Rejection","Issuer Rejection");;
          e.th(400, err);
      }     
  } 

  async refund(connection, payment, company_id, amount, refund, reason, device_identifier) {

    console.log("CALLING refund!!", amount, payment.transaction_id);
    let error = null;
    this.setConnection(device_identifier);
    
    try {

      let response =  await Portico.Transaction.fromId(payment.transaction_id)
        .refund(amount)
        .withCurrency("USD")
        .execute();

      if (response.responseCode && response.responseCode === '00') {
        console.log("refund response", response);
        return {
            type: 'refund',
            ref_num: response.referenceNumber,
            auth_code: null,
            transaction_id: response.transactionReference.transactionId,
        }
      } else if (response.responseCode) {
          if(Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode]){
            error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage + " - " + Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode];
          } else {
            error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
          }
        e.th(400, error, Enums.PAYMENT_ERROR.ISSUER_MESSAGE);
      }
    } catch (err) {
      console.log("Tenant Payments Refund Error : ", err);
      //e.th(400, "Cannot process refund - " + err.toString());
      //e.th(400, err.toString());
      if(err && err.msg)
        err.msg = err.msg.toString().replace("Unexpected Gateway Response: ", "");
      else
        err.msg = err.toString().replace("Unexpected Gateway Response: ", "");
      err.actual_cause = Enums.PAYMENT_ERROR.GATEWAY_MESSAGE;
      e.th(400, err.msg, err.actual_cause);
    }  
  }

  async void(connection, payment, company_id, amount, refund, device_identifier){
    console.log("CALLING VOID!!");
    let error = null;
    this.setConnection(device_identifier);

    console.log("payment", payment);
    try {
      let response =  await Portico.Transaction.fromId(payment.transaction_id)
          .void(amount)
          .execute();
          console.log("response", response);

      if (response.responseCode && response.responseCode === '00') {
        console.log("Void response", response);
        return {
          type: 'void',
          transaction_id: response.transactionReference.transactionId,
          auth_code: null
        }
      } else if (response.responseCode) {
            if(Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode]){
              error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage + " - " + Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode];
            } else {
                error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
            }
        e.th(400, error, Enums.PAYMENT_ERROR.ISSUER_MESSAGE);
      }
    } catch(err) {
      console.log(err);
      err = err.toString();
      err = err.replace("Unexpected Gateway Response: ", "").replace("Error: Issuer Rejection","Issuer Rejection");
      e.th(400, "Cannot process void - " + err);
    }  
  }


  async return(connection, payment, company_id, amount, refund, device_identifier){
    console.log("CALLING return!!");
    
    this.setConnection(device_identifier);
    try {
      await Portico.Transaction.fromId(payment.transaction_id)
          .reverse(amount)
          .execute();

      return {
        type: 'refund',
        transaction_id: response.ReturnResponse.transactionID,
        auth_code: null
      }
    } catch(err){
      console.log(err);
      e.th(400, "Cannot process refund - " + err.toString());
      
    }  
  }

  async charge(connection, amount, payment_id, company_id, dryrun, contact, payment_source, authorization = null, refund_effective_date, ip_override, paymentRef = {}){
    let error = null;

    let account = await models.Payment.findAccountNumber(connection, this.property_id);
    let clientTxnId = account.account_number + Hashes.encode(payment_id, company_id);
    
    if(this.type === 'google'){
      return true;
    }
    if(this.type === 'apple'){
      return true;
    }

    if(dryrun) return true;

    let payment_info = {};
    let response = {};
    let payment_method_type_id;

    response.responseCode = '';
    try { 

      if(this.device_id){

        let device = this.connection_info.Devices.find(d => d.id = this.device_id);
        
        try {
          if (device && device.lan && device.lan == 1) {
            response = await this.lanSwipe(connection, amount, device, payment_id, company_id, contact && contact.roles.includes('admin'), connection.cid, ip_override, clientTxnId);
            console.log("CHARGELANSWIPE ::", response);
            payment_info = {
              payment_gateway: this.payment_gateway,
              amount: amount,
              status_desc: response,
              status: 2,
              device_id: device.id,
              payment_source: 'Payment Terminal'
            }
          } else {
            // attempt to charge card
            response = await this.swipe(connection, amount, device, payment_id, company_id, contact && contact.roles.includes('admin'), connection.cid, ip_override, clientTxnId);
            // entry_method, approval_code, host_aid, host_cvm

            this.name_on_card = response.name_on_card;
            this.card_end = response.card_end;
            this.card_type = response.card_type;
            this.exp_warning = moment(response.exp_mo + '/' + response.exp_yr, 'MM/YYYY').format('YYYY-MM-DD');
            this.token = response.token;

            if (!this.payment_method_type_id) {
              payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type, this.card_type)
              this.payment_method_type_id = payment_method_type_id;
            } else {
              payment_method_type_id = this.payment_method_type_id;
            }

            await this.save(connection)

            payment_info = {
              payment_gateway: this.payment_gateway,
              amount: response.authorized_amount,
              transaction_id: response.transaction_id,
              sub_method: response.entry_method,
              verification_method: response.host_cvm,
              aid: response.host_aid,
              auth_code: response.auth_code, // response.approval_code
              status_desc: response.status_desc,
              status: response.response_code === '000000' ? 1 : 0,
              device_id: device.id
            }

            if (payment_method_type_id) {
              payment_info.payment_method_type_id = payment_method_type_id;
            }

            console.log("Portico Swipe Response ", response);
          }
        } catch (err) {
          payment_info = {
            amount: amount,
            status: 0,
            status_desc: err.toString(),
            transaction_id: response.transactionReference?.transactionId,
            payment_gateway: this.payment_gateway,
            property_id: this.property_id,
            contact_id: this.contact_id,
            payment_methods_id: paymentRef.payment_methods_id
          }
          paymentRef.PaymentInfo = payment_info;
          error = err;
        }

    } else if(this.token){

        // attempt to charge card
      
        const zip_code = await models.Payment.findzipcode(connection, payment_id)
        console.log("zip in DB",zip_code)
        // sending the tenant.inc zip if the zip is null
        if(zip_code && zip_code[0] && zip_code[0].zip){
          var zip=zip_code[0].zip
        }
        else{
          zip="92660"
        }
        response = await this.chargeToken(amount, clientTxnId, zip);
        console.log("chargeToken :: Protico Issuer Response ::", response);
        
        if (response.responseCode && response.responseCode === '00') {

          payment_info = {
            transaction_id: response.transactionReference.transactionId,
            auth_code: response.transactionReference.authCode,
            status_desc: response.responseMessage,
            payment_gateway: this.payment_gateway,
            // amount:  response.processedAmount,
            status: response.responseCode === '00' ? 1 : 0
          }
        } else if (response.responseCode) {
          if(Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode]){
            error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage + " - " + Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode];
          } else {
              error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
          }
          payment_info = {
            amount: amount,
            status: 0,
            status_desc: Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage,
            transaction_id: response.transactionReference?.transactionId,
            payment_gateway: this.payment_gateway,
            property_id: this.property_id,
            contact_id: this.contact_id,
            payment_methods_id: paymentRef.payment_methods_id
          }
          paymentRef.PaymentInfo = payment_info;
        } else {
          error = response.responseMessage;
          payment_info = {
            amount: amount,
            status: 0,
            status_desc: Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage,
            transaction_id: response.transactionReference?.transactionId,
            payment_gateway: this.payment_gateway,
            property_id: this.property_id,
            contact_id: this.contact_id,
            payment_methods_id: paymentRef.payment_methods_id
          }
          paymentRef.PaymentInfo = payment_info;
        }

    } else if(this.card_number){
      
        response = await this.chargeCard(amount, clientTxnId);
        
        console.log("chargeCard :: Protico Issuer response :: ", response);
        
        if (response.responseCode && response.responseCode === '00') {
          // save token here
          this.token = response.token;

          if (!this.payment_method_type_id) {
            payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type, this.card_type)
            this.payment_method_type_id = payment_method_type_id;
          } else {
            payment_method_type_id = this.payment_method_type_id;
          }

          await this.save(connection);

          payment_info = {
            transaction_id: response.transactionReference?.transactionId,
            auth_code: response.transactionReference?.authCode,
            status_desc: response.responseMessage,
            payment_gateway: this.payment_gateway,
            status: response.responseCode === '00' ? 1 : 0
          }

          if (payment_method_type_id) {
            payment_info.payment_method_type_id = payment_method_type_id;
          }

        } else if (response.responseCode) {
          if(Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode]){
            error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage + " - " + Enums.TENANT_PAYMENTS.CREDIT_CARD_REJECTIONS_ISSUER_CODE[response.responseCode];
          } else {
            error = Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage;
          }
          payment_info = {
            amount: amount,
            status: 0,
            status_desc: Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage,
            transaction_id: response.transactionReference?.transactionId,
            payment_gateway: this.payment_gateway,
            property_id: this.property_id,
            contact_id: this.contact_id,
            payment_methods_id: paymentRef.payment_methods_id
          }
          paymentRef.PaymentInfo = payment_info;
        } else {
          error = response.responseMessage;
          payment_info = {
            amount: amount,
            status: 0,
            status_desc: Enums.PAYMENT_ERROR.ISSUER_ERROR + response.responseCode + " - " + response.responseMessage,
            transaction_id: response.transactionReference?.transactionId,
            payment_gateway: this.payment_gateway,
            property_id: this.property_id,
            contact_id: this.contact_id,
            payment_methods_id: paymentRef.payment_methods_id
          }
          paymentRef.PaymentInfo = payment_info;
        }
    } else {
      e.th(400, "Token not found.");
    }
 
     
    
    await models.Payment.save(connection, payment_info, payment_id);
    payment_info.id = payment_id;

      //////////////////////////////
      // if partially approved, void immediately
      //////////////////////////////

      if(response && response.host_response_code === 10 ){
        const property = new Property({ id: this.property_id });
        const propertyDate = await property.getLocalCurrentDate(connection, 'YYYY-MM-DD hh:mm:ss');
        let refund = {
          type: 'void',
          amount: response.authorized_amount,
          payment_id: payment_id,
          ref_num: "",
          reason: response.host_response_message,
          date: propertyDate,
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
        clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, { event_id: Enums.ACCOUNTING.EVENTS.REFUNDS, payment_id: payment_id, property_id: this.property_id });
      }

      if(error) e.th(400, error, Enums.PAYMENT_ERROR.ISSUER_MESSAGE);
    } catch (err) {
      let errorStatusCode = null;
      console.log("Tenant Payments Charge Error :", err);
      const regex = /GatewayError: Unexpected Gateway Response: (.+?) -/;
      const match = err.msg.toString().match(regex);
      err.actual_cause = Enums.PAYMENT_ERROR.GATEWAY_MESSAGE;
      if (match) {
        errorStatusCode = match[1].trim();
      }
      if ((errorStatusCode && Enums.TENANT_PAYMENTS.REVERSE_ON_STATUS_CODE.find(c => c === errorStatusCode)) ||
            err.msg.toString().includes("GatewayError: Unexpected HTTP status code")){
            try {
              let responseArr = await Portico.ReportingService.findTransactions()
                  .where("ClientTxnId", clientTxnId)
                  .execute();
                  console.log("TransactionSummary Response", responseArr);
                  if(responseArr.length>0){
                      let response = await Portico.Transaction.fromId(responseArr[0].transactionId)
                      .reverse(amount)
                      .withCurrency("USD")
                      .execute();
                      console.log("ReverseTransaction Response", response);
                  }
            }
            catch (err) {
              console.log("ReverseTransaction Error", err.toString());
            }
      }
      err.msg = err.msg.toString().replace("Unexpected Gateway Response: ", "");
      e.th(400, err.msg, err.actual_cause);
    }
  }

  async validateConnection(connection_info){
    try {
      let payload = chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.STX) + 'A00' + chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS)  + '1.28' + chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.ETX);
      let lrc = calculateLRC(payload)

      let endpoint = `http://${device.ip}:${device.port}?AkEwMBwxLjI4A0s=`;
      let encoded_payload = new Buffer(payload + lrc).toString('base64')
      let response = await request({
        uri: endpoint + encoded_payload,
        method: 'GET'
      });

      return true;
    
    } catch(err){
      console.log("errors" , err);
      e.th(400, err)
    }
  }

  async validateCredentials(connection_info){

    try {
      // TODO: Stub for validate credentials

      return true;
    
    } catch(err){
      console.log("errors" , err);
      e.th(400, err)
    }
  }


  //TODO need CID here
  async swipe(connection, amount, device, payment_id, company_id, contact, cid, ip_override){
 
    try {
      console.log("device", device);
      let result = await this.checkDeviceHeartBeat(device, ip_override);
      if(result.ip_address !== device.ip){
        
        device.ip = result.ip_address; 
        await models.Property.saveConnectionDevice(connection, device, device.id);
        // await this.saveConnectionDevice(connection, device, device.id)
      }
      
      let endpoint = `http://${device.ip}:${device.port}?`;
      //let endpoint = `http://192.168.1.104:${device.port}?`;



      // start - T00 - sep - ?? - sep - credit card - sep - amount pennies - sep - sep - sep - sep - sep - sep - sep - sep - [end] - C
      // Credit sale 1.00 http://192.168.2.100:10009/?[02]T00[1c]1.28[1c]01[1c]100[1c][1c]1[1c][1c][1c][1c][1c][1c]
      
      const protocol_version = '1.26';
      
      console.log(" (amount * 100).toString() ",  Math.round(amount * 100).toString() )
      
      let payload = chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.STX) +          // Begin
        Enums.TENANT_PAYMENTS.TRANSACTION_COMMANDS.CREDIT +                 // Do Credit Transaction
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        protocol_version +                                                   // Protocol Version
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Enums.TENANT_PAYMENTS.TRANSACTION_TYPES.SALE  +                      // This is a sale transaction
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Math.round(amount * 100).toString() +                                         // Amount in pennies
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // Account information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Hashes.encode(payment_id, cid) +       // Trace Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // AVS Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // Cashier Information 
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // Commercial Infomration
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // Moto/E-commerce 
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        "TOKENREQUEST=1" + chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US) + // Additional Information here we request a token and a transaction id
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // VAS Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
                                                      // TOR Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.ETX)
      ;
    
      
      let lrc = calculateLRC(payload);
      let encoded_payload = new Buffer(payload + lrc).toString('base64')
    
      let response = await request({
        uri: endpoint + encoded_payload,
        method: 'GET'
      });
        
      
      response = response.replace(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.STX), '').replace(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.ETX), '').split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS));
      console.log("response", response);
      switch(response[3]){
        case "000000":
          
          let host_info = response[5].split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US))
          let amt_info = response[7].split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US))
          let acct_info = response[8].split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US))
          let trace_info = response[9].split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US))
          let additional_info = response[13].split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US))

          let transaction_id = '';
          let host_cid = '';
          let token = '';
          
          let host_aid = '';
          let host_cvm = '';
          let application_preferred_name = '';
          let application_label = '';
          let HRef = '';
          
          for (let i = 0; i < additional_info.length; i++){
            let info = additional_info[i].split('=');
            if(info[0] === "HRef"){
              transaction_id = info[1];
            }
            
            if(info[0] === "TOKEN"){
              token = info[1];
            }

            if(info[0] === "HRef"){
              HRef = info[1];
            }
            
            if(info[0] === "CID"){
              host_cid = info[1];
            }
            if(info[0] === "AID"){
              host_aid = info[1];
            }
            if(info[0] === "APPPN"){
              application_preferred_name = info[1];
            }
            if(info[0] === "APPLAB"){
              application_label = info[1];
            }
            if(info[0] === "CVM"){
              host_cvm = Enums.TENANT_PAYMENTS.CVM_CODES[info[1]];
            }
          
          }
          let host_response_code = host_info[0];
          let host_response_message = host_info[1];
          let authorized_amount = amt_info[0] / 100;
          let auth_code = host_info[2];
          let reference_number = host_info[3];
          let card_end = acct_info[0]
          let exp_date = acct_info[2];
          let card_type = Enums.TENANT_PAYMENTS.CARD_TYPES[acct_info[6]];
          
          let entry_method = Enums.TENANT_PAYMENTS.ENTRY_MODES[acct_info[1]];
          let approval_code = acct_info[8];
          let name_on_card = acct_info[7];
          
        
          console.log("HRef", HRef);
          console.log("authorized_amount", authorized_amount);
          console.log("host_response_code", host_response_code);
          console.log("host_response_message", host_response_message);
          console.log("auth_code", auth_code);
          console.log("reference_number", reference_number);
          console.log("exp_date", exp_date);
          console.log("card_type", card_type);
          console.log("name_on_card", name_on_card);
          console.log("transaction_id", transaction_id);
          console.log("token", token);
          console.log("entry_method", entry_method);
          console.log("approval_code", approval_code);
          console.log("host_cid", host_cid);
          console.log("host_aid", host_aid);
          console.log("application_preferred_name", application_preferred_name);
          
          return {
            authorized_amount,
            host_response_code,
            host_response_message,
            response_code: response[3],
            status_desc: host_response_message,
            auth_code,
            reference_number,
            exp_mo: exp_date.slice(0,2),
            exp_yr: '20' + exp_date.slice(-2),
            card_type,
            card_end, 
            transaction_id,
            token,
            application_preferred_name,
            entry_method,
            approval_code,
            name_on_card,
            host_cvm,
            host_aid
          }


          break; 
        case "100023": 
        case "100014": 
        case "100020": 
        case "100003": 
        case "100033": 
        case "101002": 
        case "101000": 
        case "101003": 
        case "103000": 
          e.th(400, response[4]);
        break;
        default:
          e.th(400, Enums.TENANT_PAYMENTS.TERMINAL_RESPONSE_CODES[response[3]] || response[4]);
  
      }


    } catch(err){
      console.log(err);
      console.log("errors" , err);
      e.th(400, err)
    }
  }

  async lanSwipe(connection, amount, device, payment_id, company_id, contact, cid, ip_override) {

    try {

      // start - T00 - sep - ?? - sep - credit card - sep - amount pennies - sep - sep - sep - sep - sep - sep - sep - sep - [end] - C
      // Credit sale 1.00 http://192.168.2.100:10009/?[02]T00[1c]1.28[1c]01[1c]100[1c][1c]1[1c][1c][1c][1c][1c][1c]

      const protocol_version = '1.26';

      console.log(" (amount * 100).toString() lanswpe ", Math.round(amount * 100).toString())

      let payload = chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.STX) +          // Begin
        Enums.TENANT_PAYMENTS.TRANSACTION_COMMANDS.CREDIT +                 // Do Credit Transaction
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        protocol_version +                                                   // Protocol Version
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Enums.TENANT_PAYMENTS.TRANSACTION_TYPES.SALE +                      // This is a sale transaction
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Math.round(amount * 100).toString() +                                         // Amount in pennies
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // Account information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        Hashes.encode(payment_id, cid) +       // Trace Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // AVS Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // Cashier Information 
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // Commercial Infomration
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // Moto/E-commerce 
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        "TOKENREQUEST=1" + chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.US) + // Additional Information here we request a token and a transaction id
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // VAS Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS) +                       // Field Separator
        // TOR Information
        chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.ETX)
        ;

      let lrc = calculateLRC(payload);
      let encoded_payload = new Buffer(payload + lrc).toString('base64');
      console.log("encoded_payload :: ", encoded_payload);
      return encoded_payload;

    } catch (err) {
      console.log(err);
      console.log("errors", err);
      e.th(400, err)
    }
  }
  async lanSwipeResponseCapture(connection, lanSwipeResponse, payment_id) {
    let response = {};
    let payment_info = {};
    let host_response_code = '';
    let host_response_message = '';
    try {
      console.log("RightCode lanSwipeResponse", lanSwipeResponse);
      console.log("RightCode lanSwipeResponse Data", lanSwipeResponse.data);
      response = lanSwipeResponse.data.toString().replace('\x02', '').replace('\x03', '').split('\x1C');
      console.log("Rightcode response", response);
      switch (response[3]) {
        case "000000":

          let host_info = response[5].split('\x1F')
          let amt_info = response[7].split('\x1F')
          let acct_info = response[8].split('\x1F')
          let trace_info = response[9].split('\x1F')
          let additional_info = response[13].split('\x1F')

          let host_cid = '';
          let token = '';
          let transaction_id = '';

          let host_aid = '';
          let host_cvm = '';
          let application_preferred_name = '';
          let application_label = '';
          let HRef = '';

          for (let i = 0; i < additional_info.length; i++) {
            let info = additional_info[i].split('=');
            if (info[0] === "HRef") {
              transaction_id = info[1];
            }

            if (info[0] === "TOKEN") {
              token = info[1];
            }

            if (info[0] === "HRef") {
              HRef = info[1];
            }

            if (info[0] === "CID") {
              host_cid = info[1];
            }
            if (info[0] === "AID") {
              host_aid = info[1];
            }
            if (info[0] === "APPPN") {
              application_preferred_name = info[1];
            }
            if (info[0] === "APPLAB") {
              application_label = info[1];
            }
            if (info[0] === "CVM") {
              host_cvm = Enums.TENANT_PAYMENTS.CVM_CODES[info[1]];
            }

          }
          host_response_code = host_info[0];
          host_response_message = host_info[1];
          let authorized_amount = amt_info[0] / 100;
          let auth_code = host_info[2];
          let reference_number = host_info[3];
          let card_end = acct_info[0]
          let exp_date = acct_info[2];
          let card_type = Enums.TENANT_PAYMENTS.CARD_TYPES[acct_info[6]];

          let entry_method = Enums.TENANT_PAYMENTS.ENTRY_MODES[acct_info[1]];
          let approval_code = acct_info[8];
          let name_on_card = acct_info[7];
          let exp_mo = exp_date.slice(0, 2);
          let exp_yr = '20' + exp_date.slice(-2);


          console.log("HRef", HRef);
          console.log("authorized_amount", authorized_amount);
          console.log("host_response_code", host_response_code);
          console.log("host_response_message", host_response_message);
          console.log("auth_code", auth_code);
          console.log("reference_number", reference_number);
          console.log("exp_date", exp_date);
          console.log("card_type", card_type);
          console.log("name_on_card", name_on_card);
          console.log("transaction_id", transaction_id);
          console.log("token", token);
          console.log("entry_method", entry_method);
          console.log("approval_code", approval_code);
          console.log("host_cid", host_cid);
          console.log("host_aid", host_aid);
          console.log("application_preferred_name", application_preferred_name);

          this.name_on_card = name_on_card;
          this.card_end = card_end;
          this.card_type = card_type;
          this.exp_warning = moment(exp_mo + '/' + exp_yr, 'MM/YYYY').format('YYYY-MM-DD');
          this.token = token;

          await this.save(connection)

          payment_info = {
            payment_gateway: this.payment_gateway,
            amount: authorized_amount,
            transaction_id: transaction_id,
            verification_method: host_cvm,
            aid: host_aid,
            auth_code: auth_code,
            status_desc: host_response_message,
            status: host_response_code === '000000' ? 1 : 0
          }

          console.log("Portico Swipe Response ", response);
          await models.Payment.save(connection, payment_info, payment_id);

          return {
            authorized_amount,
            host_response_code,
            host_response_message,
            response_code: response[3],
            status_desc: host_response_message,
            auth_code,
            reference_number,
            exp_mo: exp_date.slice(0, 2),
            exp_yr: '20' + exp_date.slice(-2),
            card_type,
            card_end,
            transaction_id,
            token,
            application_preferred_name,
            entry_method,
            approval_code,
            name_on_card,
            host_cvm,
            host_aid
          }


          break;
        case "100023":
        case "100014":
        case "100020":
        case "100003":
        case "100033":
        case "101002":
        case "101000":
        case "101003":
        case "103000":
        case "103000":
          await this.save(connection)

          payment_info = {
            payment_gateway: this.payment_gateway,
            status_desc: response[4],
            status: 0
          }

          await models.Payment.save(connection, payment_info, payment_id);
          e.th(400, response[4]);
          break;
        default:
          await this.save(connection)

          payment_info = {
            payment_gateway: this.payment_gateway,
            status_desc: response[4],
            status: 0
          }

          await models.Payment.save(connection, payment_info, payment_id);
          e.th(400, Enums.TENANT_PAYMENTS.TERMINAL_RESPONSE_CODES[response[3]] || response[4]);
      }
    } catch (err) {
      console.log("errors", err);
      e.th(400, err)
    }
  }

  async connectToDevice(ip_address, port){
    let endpoint = `http://${ip_address}:${port}?`;
    let response = await new Promise( async (res, rej) => {
      let timeout_id = setTimeout(() => {
        rej();
      }, 20 * 1000);
      let r = await request({
        uri: endpoint + "AkEwMBwxLjI4A0s=",
        method: 'GET'
      });
      clearTimeout(timeout_id);
      res(r)
    });

    if(!response) e.th(400, "Could not connect to device");
    response = response.replace(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.STX), '').replace(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.ETX), '').split(chr(Enums.TENANT_PAYMENTS.CONTROL_CODES.FS));
    return response;
  }

  async checkDeviceHeartBeat(device, ip_override){
    try {
      let response = await this.connectToDevice(device.ip, device.port); 
      console.log("response", response)   
      if(response[3] === '000000') { 
        console.log("Success");  
        return {
          ip_address: device.ip
        };
      }
    } catch(err){
      console.log("connection error", err); 
    }

    if(ip_override && ip_override != device.ip){
      let response_fallback = this.connectToDevice(ip_override, device.port);
      if(response_fallback[3] === '000000'){
         return {
           ip_address: ip_override
         };
      }
    }

    e.th(400, "Could not connect to credit card reader.");
    
      

  }

  async chargeCard(amount, transaction_id){
    this.setConnection();
    const address = new Portico.Address();
      
    // address.address = this.address;
    address.postalCode = this.zip;
    console.log("address",address)

    const card = new Portico.CreditCardData();
    card.number = this.card_number;
    card.expMonth = this.exp_mo;
    card.expYear = this.exp_yr;
    card.cvn = this.cvv2;
    try {
      
      
      const response = await card
        .charge(amount)
        .withCurrency("USD")
        .withClientTransactionId(transaction_id)
        .withAddress(address)
        .withRequestMultiUseToken(true)
        .execute();

        console.log("response", response);
        return response;
        
    } catch(err){
      console.log(err);
      return {
        status: 0,
        responseMessage: err.toString()
      } 
    }
  }

  async chargeToken(amount, transaction_id, zip){
    const address = new Portico.Address();
    // address.code = "12345";
    address.postalCode = zip
    console.log("address",address)
    
    let errorStatusCode = null;
    this.setConnection();
    const card = new Portico.CreditCardData();
    card.token = this.token;
    // A dirty workaround recommended by Portico to address Expired Card issue
    console.log("Processing Expiry Data:", this.exp_warning);
    const date = new Date(this.exp_warning);
    card.expYear = date.getFullYear().toString();
    card.expMonth = (date.getMonth() + 1).toString().padStart(2, "0");    
    console.log(card.expMonth);
    console.log(card.expYear);
    try {
      const response = await card.charge(amount)
        .withCurrency("USD")
        .withClientTransactionId(transaction_id)
        .withAddress(address)
        .execute();

      return response;

    }
    catch (err) {
      console.log("Protico Charge Token Response Error :: ", err);
      return {
        status: 0,
        responseMessage: err.toString()
      }
    }

  }

  async batchClose(connection_info, amount,token,payment_id,company_id){
    console.log("Calling Batch Close!")
    this.setConnection();
    let response = await protico.BatchService.closeBatch(); 
    return response; 

    // return response.BatchCloseResponse;

  }


  static async submitApplication(payload, account_number){
    
    let request_params = {
      uri: tenant_payments_acct_mgmt_endpoint + 'signup',
      headers: {
        'Authorization': `Basic ${new Buffer(cert_str +':' + term_id).toString('base64')}`
      },
      method: 'PUT',
      body: payload,
      json: true
    } 
    
    console.log("request_params", JSON.stringify(request_params, null, 2));
    var result = await request(request_params);
    
    console.log("result", result);
    if(result.Status === "00"){
      return {
        status: 'approved',
        account_number: result.AccountNumber,
        password: result.Password,
        source_email: result.SourceEmail,
        tier: result.Tier,
      }
    }
    
    if(Enums.TENANT_PAYMENTS.PARTIAL_ACCEPTANCE_CODES.find(c => c === result.Status)){

      return {
        status: 'partial_approval',
        account_number: result.AccountNumber,
        password: result.Password,
        source_email: result.SourceEmail,
        tier: result.Tier,
      }
    }

    e.th(400, Enums.TENANT_PAYMENTS.API_RESPONSE_ERROR_CODES[result.Status]); 

  }


  static async updateBankInfo(payload, account_number){

    let x509 = null;

    try {
      const X509Certificate_buff = await fs.readFile(x509_location);

      // getting object of a PEM encoded X509 Certificate.       
      console.log("X509Certificate", X509Certificate_buff)

      x509 = await new Promise((res, rej) => {
        pem.readPkcs12(X509Certificate_buff, { p12Password: x509_password }, (err, cert) => {
          if(!!err) return rej(err);
          return res(cert)
        });
      })
    } catch(err) {
      e.th(500, "Certificate not found.");
    }
    console.log("cert",  x509); 
    console.log("emcoded",  Buffer.from(x509.cert).toString('base64')); 

    let request_params = {
      uri: tenant_payments_acct_mgmt_endpoint + `MerchantBankAccount/${account_number}`,
      headers: {
        'Authorization': `Basic ${new Buffer(cert_str +':' + term_id).toString('base64')}`,
        'X509Certificate': Buffer.from(x509.cert).toString('base64')
      },
      method: 'PUT',
      body: payload,
      json: true
    }

    console.log("request_params", JSON.stringify(request_params, null, 2));
    var result = await request(request_params);
    
    if(result.Status === "00") return true;

    e.th(400, Enums.TENANT_PAYMENTS.API_RESPONSE_ERROR_CODES[result.Status]); 

  }


  static async updateGrossSettleInfo(payload, account_number){

    let x509 = null;

    try {
      const X509Certificate_buff = await fs.readFile(x509_location);

      // getting object of a PEM encoded X509 Certificate.       
      console.log("X509Certificate", X509Certificate_buff)

      x509 = await new Promise((res, rej) => {
        pem.readPkcs12(X509Certificate_buff, { p12Password: x509_password }, (err, cert) => {
          if(!!err) return rej(err);
          return res(cert)
        });
      })
    } catch(err) {
      e.th(500, "Certificate not found.");
    }
    
    let request_params = {
      uri: tenant_payments_acct_mgmt_endpoint + `MerchantGrossSettleBilling/${account_number}`,
      headers: {
        'Authorization': `Basic ${new Buffer(cert_str +':' + term_id).toString('base64')}`,
        'X509Certificate': Buffer.from(x509.cert).toString('base64')
      },
      method: 'PUT',
      body: payload,
      json: true
    }

    console.log("request_params", JSON.stringify(request_params, null, 2));
    var result = await request(request_params);
    
    if(result.Status === "00") return true;

    e.th(400, Enums.TENANT_PAYMENTS.API_RESPONSE_ERROR_CODES[result.Status]); 

  }

}


module.exports = TenantPaymentsCard;

var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');
const Property = require('../property');

