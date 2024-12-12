var express = require('express');
var router = express.Router();
var moment      = require('moment');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var control    = require(__dirname + '/../modules/site_control.js');
var models = require(__dirname + '/../models');
var Property  = require(__dirname + '/../classes/property.js');
const TenantPaymentsApplication = require('../classes/tenant_payments_applications'); 
var Joi      = require('joi');
const Company = require('../classes/company');
var utils = require(__dirname + '/../modules/utils.js');

const joiValidator = require('express-joi-validation')({
    passError: true
});

var e  = require(__dirname + '/../modules/error_handler.js');

module.exports = function(app) {

    router.post('/', [control.hasAccess(['admin','api']), control.hasPermission('manage_payment_gateways'),  Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;
        
        try {
          let api =  res.locals.api;
          let contact =  res.locals.contact;
          let company = res.locals.active;
  
          let params = req.params;
          let body = req.body;
          
  
          let property = new Property({id: body.property_id});
          await property.find(connection);
          await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact? contact.id : null, permissions: ['manage_payment_gateways'], api});
  
          let applicationData = await models.TenantPaymentsApplication.findByPropertyId(connection, body.property_id);
          let application = {};
          if(applicationData && applicationData.id) {
            application = new TenantPaymentsApplication({
              id: applicationData.id
            });
            await application.find(connection);
          }
          else {
            // set as new application
            application = new TenantPaymentsApplication({
              contact_id: contact && contact.id,
              property_id: property.id
            });
          }

          body.contact_id = contact && contact.id;
          await application.saveAndClose(connection, body);

          let response = {};
          if(body.is_submit) {
            // submits application and saves in DB
            let hashed_property_id = Hashes.encode(property.id, res.locals.company_id);
            
            let result = await application.submit(connection, body, hashed_property_id);  
            response = {
              status: result.status,
              account_number: result.account_number,
              application_id: Hashes.encode(application.id, res.locals.company_id)
            }
          } else {
            response = {
              application_id: Hashes.encode(application.id, res.locals.company_id)
            }
          }
          utils.send_response(res, {
              status: 200,
              data: response
          });
  
        } catch(err) {
            next(err);
        }
    });

    //is configuration code exist
    router.get('/tier', [ control.hasAccess(['admin','api'] ), control.hasPermission('manage_payment_gateways'),  Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try {
        let company = res.locals.active;
        let contact = res.locals.contact;
        let api = res.locals.api;
        let query = req.query;
        const { property_id, registration_code } = query;
        //is property found
        let property = new Property({ id: property_id });
        
        await property.find(connection);
        await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact? contact.id : null, permissions: ['manage_payment_gateways'], api});
        console.log("Application Property : ", property);
        let tier = await models.TenantPaymentsApplication.findTierInfo(connection, property_id);
        console.log("Tire :", tire);
        if (!tier) e.th(404, "Tier not found");
        utils.send_response(res, {
            status: 200,
            data: {
              tier:  Hash.obscure(tier, req)
            }
        });
      } catch(err) {
          next(err);
      }
    });

    router.get('/', [ control.hasAccess(['admin','api'] ), control.hasPermission('manage_payment_gateways'),  Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;
        
        try {
          let api =  res.locals.api;
          let contact =  res.locals.contact;
          let company = res.locals.active;
  
          let params = req.params;
          let query = req.query;
          
  
          let property = new Property({id: query.property_id});
          await property.find(connection);
          await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact? contact.id : null, permissions: ['manage_payment_gateways'], api});
  
          // set as new application
          let application = new TenantPaymentsApplication({
            property_id: property.id
          });
          await application.find(connection);
          
          let beneficiaries = await models.TenantPaymentsApplication.findBeneficiariesByApplicationId(connection, application.id);

          if(beneficiaries.length) {
            application.beneficiaries = beneficiaries;
          }

          utils.send_response(res, {
              status: 200,
              data: {
                application:  Hash.obscure(application, req)
                  
              }
          });
  
        } catch(err) {
            next(err);
        }
    });
    
    router.put('/:application_id', [ control.hasAccess(['admin','api'] ), control.hasPermission('manage_payment_gateways'),  Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      
      try {
        let api =  res.locals.api;
        let contact =  res.locals.contact;
        let body =  req.body;
        let company = res.locals.active;

        let params = req.params;
        
        
        let application = new TenantPaymentsApplication({
          id: params.application_id
        });
        await application.find(connection);

        let property = new Property({id: application.property_id});
        await property.find(connection);
        await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact? contact.id : null, permissions: ['manage_payment_gateways'], api});

        body.contact_id = contact && contact.id;
        const {is_submit} = body;
        if(application.account_number == null) {
          await application.updateSaveAndClose(connection, body);
        }

        if(is_submit) {
          if(application.account_number) {
            await application.updateBankInfo(connection, body);
            //Send Email when the Bank information is updated.
            await application.sendUpdateBankInfoEmail(connection, company, property);
            // await application.updateGrossSettleInfo(connection, body);
          } else {
            let hashed_property_id = Hashes.encode(property.id, res.locals.company_id);
            await application.submit(connection, body, hashed_property_id); 
          }
        }
        
        // get users with permission
        let c = new Company(company);
        await c.find(connection);
        let admins = await c.getAdminWithPermission(connection, 'manage_payment_gateways');

        for(let i = 0; i < admins.length; i++){

          console.log("admins", admins[i].email);
          // // send mail
          // let email = {
          //   subject: 'Forgot Username Notification',
          //   body: `<p>Here is a list of user names we have associated with this email address.<br />` + user_name
          // }
          // await contact.sendEmail(connection, values.subject, values.body, null, company, null, null, company.gds_owner_id, null)
        }

      
        utils.send_response(res, {
            status: 200,
            data: {
              application:  Hash.obscure(application, req)
                
            }
        });

      } catch(err) {
          next(err);
      }
  });

    router.get('/reporting/:property_id/transactions/:payment_type', [control.hasAccess(['admin','api']), Hash.unHash], async(req, res, next) => {

      try {
        var connection = res.locals.connection;
        
        let params = req.params;
        let company = res.locals.active;
        let query = req.query;
        let start, end;
        if(['ach', 'card'].indexOf(params.payment_type) < 0){
          e.th(400, "Payment type not supported for reporting.")
        }

        let property = new Property({id: params.property_id});
        await property.find(connection);
        let paymentMethod = await property.getPaymentMethod(connection, params.payment_type);
        
        console.log("paymentMethod", paymentMethod)
         
        
        
        if(query.start){
          start = await property.getUTCTime(connection, query.start);
          start = new Date(start);
        } else {
          start = new Date(Date.now());
          start.setDate(start.getDate() - 1);
        }

        if(query.end){
          end = await property.getUTCTime(connection, query.end);
          end = new Date(end);
        } else {
          end = new Date(Date.now());
        }
        

        console.log("start", start)
        console.log("ebnd", end)

        let transactions = await  paymentMethod.getTransactions(start, end);
        console.log("transactions", transactions)
        

        utils.send_response(res, {
          status: 200,
          data: {
            transactions: Hash.obscure(transactions, req)
          }
        });
      } catch(err) {
        next(err);
      }
      
    });



  return router;
}



var { sendEmail } = require(__dirname + '/../modules/mail');
var Contact = require(__dirname + '/../classes/contact.js');
var Property = require(__dirname + '/../classes/property.js');
