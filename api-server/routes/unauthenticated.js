const express = require('express');
const router = express.Router();
const db = require(__dirname + '/../modules/db_handler.js');
const e  = require(__dirname + '/../modules/error_handler.js');

const Payment = require('../classes/payment');
const request = require('request-promise');
const { XMLParser} = require("fast-xml-parser");
const {sendMessageToSlackChannel} = require('../modules/slack.js');
const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
let models = require('../models');
const multer  = require('multer')
const upload = multer()

let cert_str = process.env.TENANT_PAYMENTS_CERT_STR; 
let term_id = process.env.TENANT_PAYMENTS_TERM_ID; 
let type34URI = process.env.TENANT_PAYMENTS_ENDPOINT;

module.exports = function (app) {

    // Disallow everything for now. 
    app.get('/robots.txt', function (req, res) {
        res.type('text/plain');
        res.send("User-agent: *\nDisallow: /");
    });


    app.get('/favicon.ico', async (req, res) => res.json({ status: 200 }));
    app.get('/', async (req, res) => res.json({ status: 200 }));
    app.get('/v1', async (req, res) => res.json({ status: 200 }));

    app.use('/v1/companies/:company_id', async (req, res, next) => {
        let company_id = Hashes.decode(req.params.company_id);
        res.locals.company_id = company_id[0];
        next();
      });


    app.post('/v1/tenant-payments-ach-notification', upload, async (req, res, next) => {
        try {
          let body = req.body;
          let connection = null;
          console.log(req.body);
          if(!body.credentials || !body.credentials.website) e.th(404, "Account number not found")
          let account_number = body.credentials.website;
    
          const connectionIterator = await db.getConnectionIterator('write');
    
          while(connection = await connectionIterator.next()){
            let tp = new TenantPaymentsApplication({account_number: account_number});
            console.log("tp", tp)
            try {
              await tp.find(connection);
              let property = new Property({id: tp.property_id});
              await property.find(connection);
              let company = connectionIterator.current_companies.find(c => c.hb_company_id === property.company_id);
              res.locals.company_id = company.company_id;   
            } catch(err){
              console.log("not found");
              continue; 
            }
          }
          
          await connectionIterator.release();
          
          if(!res.locals.company_id) {
            e.th(404, "Account number not found")
          }
          next();

        } catch(err) {
          console.log("Error", err); 
          next(err);
          // e.th(500, err)
        }
        
    })  

  app.get('/v1/tenant-payments-notification', async (req, res, next) => {
    let connectionIterator = null;
    let property_id = null;
    let currentConnection = null;
    let tpa = null;
    let property = null;
    let connection = null;

    try {
      let data = req.query;
      if (data.NotificationEvent === "UserStatusChange" || data.NotificationEvent === "UserSignup"){
        await new Promise(res => setTimeout(res, 2000));
        // We dont want to rely on ExternalId as we dont get it for all requests
        // data.company_id = Hashes.decode(req.query.ExternalId)[1];
        connectionIterator = await db.getConnectionIterator('read');
        while(currentConnection = await connectionIterator.next()){
          let tp = new TenantPaymentsApplication({account_number: data.AccountNumber});
          try {
            await tp.find(currentConnection);
            property_id = tp.property_id;
            connection = currentConnection;
            tpa = tp;
            break;
          } catch(err){
            console.log("Error: ",err);
            console.log("not found");
          }
        }
        property = new Property({id: property_id});
        await property.find(connection);
        let db_company = connectionIterator.current_companies.find(c => c.hb_company_id === property.company_id);
        res.locals.company_id = db_company.company_id;
      }
    }catch (err){
      console.log("Error: ",err);
    }
    finally{
      if (connectionIterator != null)
        await connectionIterator.release();
      next();
    }
  })

  app.get('/v1/tenant-payments-notification', async (req, res, next) => {
    let connectionIterator = null;
    let propay_db_connection = null;
    let reversal_type = '';
    try {
      let data = req.query;
      console.log("API /v1/tenant-payments-notification triggered with parameters: " + JSON.stringify(data));
      if (data.TransactionNumber === "0") {
        console.log("Transaction Number is 0 Skipping notification ingestion");
        return;
      }
      if (data.NotificationEvent === "Chargeback" || data.NotificationEvent === "ACHReject") {
        let property_id = null;
        let currentConnection = null;
        let tpa = null;
        let local_company_id = null;
        let property = null;
        let connection = null;

        data.NotificationEvent === "Chargeback" ? reversal_type = 'chargeback' : reversal_type = 'ach';

        connectionIterator = await db.getConnectionIterator('write');

        while(currentConnection = await connectionIterator.next()){
          let tp = new TenantPaymentsApplication({account_number: data.AccountNumber});
          try {
            await tp.find(currentConnection);
            property_id = tp.property_id;
            connection = currentConnection;
            tpa = tp;
            break;
          } catch(err){
            console.log("Error: ",err);
            console.log("not found");
          }
        }

        if(property_id != null){
          property = new Property({id: property_id});
          await property.find(connection);
          local_company_id = property.company_id;

          if(local_company_id != null) {
            res.locals.local_company_id = local_company_id;
            let db_company = connectionIterator.current_companies.find(c => c.hb_company_id === property.company_id);
            res.locals.company_id = db_company.company_id;
            let company = new Company({id: local_company_id});
            await company.find(connection);
            res.locals.active = company;
            let property_list = await Property.findByCompanyId(connection, company.id);
            res.locals.properties = property_list.map(p => p.id);
            let contact  = null;
            let createdBy = await models.Contact.getHummingbirdDemoContact(connection);
            console.log("createdBy : ", createdBy);
            res.locals.contact = null;
            if (createdBy && createdBy.length > 0) {
              contact = new Contact({id: createdBy[0].id});
              await contact.find(connection);
              res.locals.contact = contact;
            }
      
            propay_db_connection = await db.get_propay_db_connection();
            let notification_ingestion_flag = await models.Propay.getIngestionFlag(propay_db_connection, res.locals.company_id, property_id, process.env.PROPAY_ACTIVE_ACCOUNT_TABLE);
            console.log(local_company_id, property_id, "notification_ingestion ", notification_ingestion_flag);
            
            if (notification_ingestion_flag && notification_ingestion_flag.notification_ingestion === 1) {

              let xmlData = `<?xml version='1.0'?>
              <!DOCTYPE Request.dtd>
              <XMLRequest>
                <certStr>${cert_str}</certStr>
                <termid>${term_id}</termid>
                <class>partner</class>
                <XMLTrans>
                    <transType>34</transType>
                    <accountNum>${data.AccountNumber}</accountNum>
                    <transNum>${data.TransactionNumber}</transNum>
                </XMLTrans>
              </XMLRequest>`;

              let type34Response = await request({
                body: xmlData,
                uri: type34URI,
                method: 'GET'
              });

              let authCode = null;
              const parser = new XMLParser();
              let result = parser.parse(type34Response);
              //Check if type 34 API Call responded with proper response
              if (reversal_type == 'chargeback') {
                if (Object.keys(result.XMLResponse.XMLTransactions.XMLTrans).length > 1 && Array.isArray(result.XMLResponse.XMLTransactions.XMLTrans)) {
                  result = result.XMLResponse.XMLTransactions.XMLTrans[0];
                } else if (result.XMLResponse.XMLTransactions.XMLTrans.authCode !== undefined) {
                  result = result.XMLResponse.XMLTransactions.XMLTrans;
                } else {
                  throw new Error("Transaction not found in Trans34 call.");
                }
                authCode = result.authCode;
                data.amountDollars = data.TransactionAmount.replace('$', '').replace(',', '');
              } else {
                if (Object.keys(result.XMLResponse.XMLTransactions.XMLTrans).length > 1 && Array.isArray(result.XMLResponse.XMLTransactions.XMLTrans)) {
                  result = result.XMLResponse.XMLTransactions.XMLTrans[0];
                } else if (result.XMLResponse.XMLTransactions.XMLTrans.amount !== undefined){
                  result = result.XMLResponse.XMLTransactions.XMLTrans;
                } else{
                  throw new Error("Transaction not found in Trans34 call.");
                }
                data.amountDollars = result.amount ? (result.amount / 100).toFixed(2) : 0;
              }
              console.log("XMLTrans from type34Response : ", result);

              const payment = new Payment({});
              let notificationDetails = await payment.processChargebackOrReversal(
                                    connection, data, property_id, authCode, reversal_type, res);
              console.log("notificationDetails : ", notificationDetails);
              if (notificationDetails === null) {
                await sendMessageToSlackChannel(reversal_type + " : Failed to update, notificationDetails is null: " + JSON.stringify(req.query));
                return;
              } else if (notificationDetails.isDuplicate) {
                // Dont send slack notification, these are false notifications
                return;
              } else if (notificationDetails.alreadyExists) {
                await sendMessageToSlackChannel(reversal_type + " : REFUND EXISTS - Failed to update " + JSON.stringify(req.query));
                return;
              } else if (notificationDetails.amountMismatch) {
                await sendMessageToSlackChannel(reversal_type + " : AMOUNT MISMATCH - Failed to update " + JSON.stringify(req.query));
                return;
              } else{
                let events = [];
                events.push('payment_refunded');
                events.map(e => {
                  eventEmitter.emit(e, { company, contact: contact, payment:notificationDetails.payment, property_id, cid: res.locals.company_id, locals: res.locals});
                });
              }

              if(process.env.NODE_ENV !== 'local') {
                notificationDetails.account_number = data.AccountNumber;
                if (reversal_type == 'chargeback') {
                  notificationDetails.cclast4 = result.ccNumLastFour;
                  await tpa.sendChargeBackNotificationInfoEmail(connection, notificationDetails, "chargeback", JSON.stringify(req.query));
                } else {
                  await tpa.sendChargeBackNotificationInfoEmail(connection, notificationDetails, "ACHReject", JSON.stringify(req.query));                  
                }
              }

            } else {
              await sendMessageToSlackChannel(reversal_type + " : Notification_Ingestion flag is set to false, skipping ingestion. Please update manually: "+JSON.stringify(req.query));
            }
          } else {
            await sendMessageToSlackChannel(reversal_type + " : Could not find the Company ID. Please update manually: "+JSON.stringify(req.query));
          }
        } else {
          await sendMessageToSlackChannel(reversal_type + " : Could not find the property ID. Please update manually: "+JSON.stringify(req.query));
        }
      } else{
        return;
      }
    } catch(e){
      console.log("Error in tenant-payments-notification. Error: ",e);
      await sendMessageToSlackChannel(reversal_type + " : Failed to update : " +e +JSON.stringify(req.query));
    }
    finally{
      if (propay_db_connection != null && db != null) {
        await db.close_propay_db_connection(propay_db_connection);
      }
      if (connectionIterator != null) {
        await connectionIterator.release();
      }
      next();
    }
  })

    app.get('/v1/translate-id', async (req, res, next) => {

        try {
  
          let company_id = Hashes.decode(req.query.company_id)[0];
          let resource = Hashes.decode(req.query.resource_id);
  
          if(resource.length !== 1){
            e.th(400, "This is not a valid resource_id");
          }
  
          if(!company_id || !resource[0]) {
            e.th(400, "Please include a valid company_id and the resource_id");
          }
          
  
          utils.send_response(res, {
            data: {
              current_id: Hashes.encode(resource[0]),
              new_id: Hashes.encode(resource[0], company_id)
            }
          })
  
        } catch (err) {
          console.log("THERE IS AN ISSUE" , err);
          next(err)
        }
      });

    return router;

};


const TenantPaymentsApplication = require('../classes/tenant_payments_applications');
const Property = require('../classes/property');
const Company = require('../classes/company');
const Contact = require('../classes/contact.js');
const eventEmitter = require('../events/index.js');

