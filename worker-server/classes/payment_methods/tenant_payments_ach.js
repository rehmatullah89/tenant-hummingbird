var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');
var moment      = require('moment');
var validator = require('validator');
var Enums = require(__dirname + '/../../modules/enums.js');
var PaymentMethod = require(__dirname + './../payment_method.js');

var request = require('request-promise');

const { promises: fs } = require("fs");

const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");

// const affiliate_name = "Tenant";
// const affiliate_id = 977114;


let developer_id = process.env.TENANT_PAYMENTS_DEVELOPER_ID; // TODO make env vars
let version_number = process.env.TENANT_PAYMENTS_VERSION_NUMBER;
// let api_key = 'skapi_cert_MUCzBQBo228AnBideWNMvXPEwX1kl0pkSSEJPqBH3g';
// let device_id = '88700000323102';
let cert_str = process.env.TENANT_PAYMENTS_CERT_STR; 
let term_id = process.env.TENANT_PAYMENTS_TERM_ID; 


class ProPayAch extends PaymentMethod {

    constructor(data, connection_info, payment_gateway){
        super(data, connection_info);
        this.payment_gateway = payment_gateway;

    this.endpoint = process.env.TENANT_PAYMENTS_ENDPOINT; 
		// if(this.connection_info.production){
		// } else {
    //         this.endpoint =  process.env.TENANT_PAYMENTS_ENDPOINT_DEV; 
		// }
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
    
    if (!data.address_id) {
			//if (!data.address) e.th(400, "Payment Method billing address is required.")
			//if (!data.address.zip) e.th(400, "Payment Method billing address zip code is required.")
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
    console.log("data.account_number", data.account_number)
    // Has to be full card number because we dont tokenize this.
    this.card_end = data.account_number;
    this.card_type = data.account_type;
    this.payment_method_type_id = await this.getPaymentMethodTypeId(connection, this.type,this.card_type)

	}

  async generateKey(){

  
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
            active: this.save_to_account,
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
                transaction_id: response.transNum,
                status_desc:    "Success",
                status: 1
            }, payment_id)

		} catch(err){
          err = err.toString().replace(/\bError: \b/g, "");
          console.log("err", err)
            let payment_info = {
                payment_gateway: this.payment_gateway,
                status_desc: err.toString(),
                status: 0
            }
            await models.Payment.save(connection, payment_info, payment_id);
			let errorMessage = Enums.PAYMENT_ERROR.GATEWAY_ERROR + ": " + err.msg;
            e.th(400, errorMessage)
        }
	}

	remove (connection, company_id){
    return models.Payment.deletePaymentMethod(connection, this.id)
  }


  async refund(connection, payment, company_id, amount, refund) {

    console.log("CALLING refund!!", amount, payment.transaction_id);
    try {

      let xml = `<?xml version='1.0'?>
        <!DOCTYPE Request.dtd>
        <XMLRequest>
          <certStr>${cert_str}</certStr>
          <termid>${term_id}</termid>
          <class>partner</class>
          <XMLTrans>
            <transType>07</transType>
            <accountNum>${this.connection_info.account_number}</accountNum>
            <transNum>${payment.transaction_id}</transNum>
            <amount>${Math.round(amount * 1e2)}</amount>
            </XMLTrans>
          </XMLRequest>`;
          console.log("xml", xml);
        let response = await request({
          body: xml,
          uri: this.endpoint,
          method: 'POST'
        });
        
        const parser = new XMLParser();
        let r = parser.parse(response);
        console.log("response", r.XMLResponse);
        
        return {
          type: 'refund',
          ref_num: null,
          auth_code: null,
          transaction_id:  r.XMLResponse.XMLTrans.transNum,
        }

      } catch(err){

        console.log("errors" , err);
        e.th(400, err)
      }


      
  }

  async void(connection, payment, company_id, amount, refund){
    console.log("CALLING VOID!!");


    try {

      let xml = `<?xml version='1.0'?>
        <!DOCTYPE Request.dtd>
        <XMLRequest>
          <certStr>${cert_str}</certStr>
          <termid>${term_id}</termid>
          <class>partner</class>
          <XMLTrans>
            <transType>07</transType>
            <accountNum>${this.connection_info.account_number}</accountNum>
            <transNum>${payment.transaction_id}</transNum>
            <amount>${Math.round(amount * 1e2)}</amount>
            </XMLTrans>
          </XMLRequest>`;
          console.log("xml", xml);
        let response = await request({
          body: xml,
          uri: this.endpoint,
          method: 'POST'
        });
        
        const parser = new XMLParser();
        let r = parser.parse(response);
        console.log("response", r.XMLResponse);

      return {
        type: 'void',
        ref_num: null,
        auth_code: null,
        transaction_id:  r.XMLResponse.XMLTrans.transNum,
      }

    } catch(err){

      console.log("errors" , err);
      e.th(400, err)
    }

  }

	void_payment(){

	}

	async getPaymentStatus(transaction_id){


    let xml = `<?xml version='1.0'?>
    <!DOCTYPE Request.dtd>
    <XMLRequest>
        <certStr>${cert_str}</certStr>
        <termid>${term_id}</termid>
        <class>partner</class>
        <XMLTrans>
            <transType>34</transType>
            <accountNum>${this.connection_info.account_number}</accountNum>
            <transNum>${transaction_id}</transNum>
            
            </XMLTrans>
          </XMLRequest>`;

    try {

      let response = await request({
          body: xml,
          uri: this.endpoint,
          method: 'POST'
      });
      
      const parser = new XMLParser();
      let r = parser.parse(response);
     
      let is_settled = r.XMLResponse.XMLTransactions.XMLTrans.txnStatus !== 'ACHInPending'
      return {
        is_settled: is_settled
      }; 
    } catch(err){

      console.log("errors" , err);
      e.th(400, err)
    }
	}

    async setCustomerProfileToken(connection, company_id){


    }

	async generateToken(accountHolder, company_id){

	}


	async chargeACH(connection_info, amount, company_id, payment_source = 'e-commerce'){
        let card_type = this.card_type.toLowerCase() === 'savings' ? "savings" : this.card_type;
        
        let xml = `<?xml version='1.0'?>
            <!DOCTYPE Request.dtd>
            <XMLRequest>
                <certStr>${cert_str}</certStr>
                <termid>${term_id}</termid>
                <class>partner</class>
                <XMLTrans>
                    <transType>36</transType>
                    <amount>${Math.round(amount * 1e2)}</amount>
                    <accountNum>${this.connection_info.account_number}</accountNum>
                    <RoutingNumber>${this.routing_number}</RoutingNumber>
                    <AccountNumber>${this.account_number}</AccountNumber>
                    <StandardEntryClassCode>WEB</StandardEntryClassCode>
                    <accountType>${card_type.charAt(0).toUpperCase() + card_type.slice(1)}</accountType>
                    <accountName>${this.first} ${this.last} ${card_type} ACH</accountName>
                    </XMLTrans>
                    </XMLRequest>`;

            console.log("xml", xml);
            console.log("this.endpoint", this.endpoint); 
            try {

                let response = await request({
                    // headers: headers,
                    body: xml,
                    // json:true,
                    uri: this.endpoint,
                    method: 'POST'
                });
                
                
                const parser = new XMLParser();
                let r = parser.parse(response);
                
                
                console.log("response", r.XMLResponse);
                
                
                switch(r.XMLResponse.XMLTrans.status){
                    case 0:
                        return r.XMLResponse.XMLTrans;
                      // HANDLE Processor Errors here    
                    default: 
                        e.th(400, Enums.PAYMENT_ERROR.ISSUER_ERROR + Enums.TENANT_PAYMENTS.API_RESPONSE_ERROR_CODES[r.XMLResponse.XMLTrans.status]);
                }
            
            } catch(err){

                console.log("errors" , err);
                e.th(400, err)
            }

    }
}


module.exports = ProPayAch;

var Address = require(__dirname + '/../address.js');
var Lease = require(__dirname + '/../lease.js');




