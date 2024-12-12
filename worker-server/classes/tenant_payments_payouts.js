var e  = require(__dirname + '/../modules/error_handler.js');
var Enums = require(__dirname + '/../modules/enums.js');
var Promise = require('bluebird');
var request = require('request-promise');
var moment = require('moment');
const { promises: fs } = require("fs");

const { XMLParser} = require("fast-xml-parser");
const pem = require("pem");

const tenant_payments_acct_mgmt_endpoint =  process.env.TENANT_PAYMENTS_ACCT_MGMT_ENDPOINT;
const x509_location = process.env.X509CERT_LOCATION;
const x509_password = process.env.X509CERT_PASSWORD ;
let cert_str = process.env.TENANT_PAYMENTS_CERT_STR; 
let term_id = process.env.TENANT_PAYMENTS_TERM_ID; 
let endpoint = process.env.TENANT_PAYMENTS_ENDPOINT;

class TenantPaymentsPayouts {

  constructor(property_id, account_number) {
    this.property_id = property_id;
    this.account_number = account_number;
	}

  async getAccountBalanceDetails(){
    
    let x509 = null;

    try {
      const X509Certificate_buff = await fs.readFile(x509_location);

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
      uri: tenant_payments_acct_mgmt_endpoint + 'MerchantBalanceDetails/' + this.account_number,
      headers: {
        'Authorization': `Basic ${new Buffer.from(cert_str +':' + term_id).toString('base64')}`,
        'X509Certificate': Buffer.from(x509.cert).toString('base64')
      },
      method: 'GET',
      json: true
    } 
    
    var result = await request(request_params);
    
    console.log(this.property_id, "getAccountBalanceDetails", result);
    if(result.Status === "00"){
      return {
        availableBalance: result.AvailableBalance
      }
    }

    console.log(this.property_id, "Throwing error for getAccountBalanceDetails");
    e.th(400, Enums.TENANT_PAYMENTS.API_RESPONSE_ERROR_CODES[result.Status]); 

  }

	async payout(amount) {
    let transactionID = null;
    let status = '-1';
    let dateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");
    try {
      let response = await this.sweepFund(amount);
      status = response.status;
      transactionID = response.transNum;
    }
    catch(err) {
        console.log(this.property_id, "Error while sweepFund : ", err);
        e.th(400, err);
    }
    return {transactionID, dateTime, status, propertyID : this.property_id};
	}

  async sweepFund(amount) {
    console.log(this.property_id, "Payout sweepFund!!");
    let xml = 
      `<?xml version='1.0'?>
      <!DOCTYPE Request.dtd>
      <XMLRequest>
        <certStr>${cert_str}</certStr>
        <termid>${term_id}</termid>
        <class>partner</class>
        <XMLTrans>
            <transType>38</transType>
            <amount>${amount}</amount>
            <accountNum>${this.account_number}</accountNum>
        </XMLTrans>
      </XMLRequest>`;

    try {
        let response = await request({
            body: xml,
            uri: endpoint,
            method: 'POST'
        });
        const parser = new XMLParser();
        let r = parser.parse(response);
        console.log(this.property_id, r.XMLResponse);
        return r.XMLResponse.XMLTrans;
    } catch(err){
        console.log(this.property_id, "Error during sweepFund " , err);
        e.th(400, err);
    }
  }
}

module.exports = TenantPaymentsPayouts;





