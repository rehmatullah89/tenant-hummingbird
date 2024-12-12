var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var { getGDSMappingIds, payBill, getWebsiteInfo } = require('../modules/gds_translate');
var Todo = require(__dirname + '/../classes/todo.js');
var response = {};
var xmljs = require('xml-js');

var validator = require('validator');


var Promise = require('bluebird');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var crypto      = require('crypto');

var models  = require(__dirname + '/../models');

var Payment = require(__dirname + '/../classes/payment.js');
var PaymentMethod = require(__dirname + '/../classes/payment_method.js');
var Property = require(__dirname + '/../classes/property.js');
var Address = require(__dirname + '/../classes/address.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Company = require(__dirname + '/../classes/company.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Connection = require(__dirname + '/../classes/connection.js');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Accounting  = require(__dirname + '/../classes/accounting.js');

var Cash      = require(__dirname +'/../classes/payment_methods/cash.js');
var Check      = require(__dirname +'/../classes/payment_methods/check.js');
var Ach      = require(__dirname +'/../classes/payment_methods/ach.js');
var Card      = require(__dirname +'/../classes/payment_methods/card.js');

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var amazon = require('@madisonreed/amazon-payments');
var request = require('request');
var fs = require('fs');
var rp = require('request-promise');

// var Joi      = require('joi');
// var expressJoi      = require('express-joi-validator');
var Schema = require(__dirname + '/../validation/payments.js');

var utils    = require(__dirname + '/../modules/utils.js');
var Joi      = require('joi');
const joiValidator = require('express-joi-validation')({
	passError: true
});
var Report = require(__dirname + '/../classes/report.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Task = require(__dirname + '/../events/tasks.js');
var Enums = require(__dirname + '/../modules/enums.js');

const formatPhoneNumber = (phoneNumberString) => {
	const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
	const match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
	if (match) {
		const intlCode = match[1] ? '+1 ' : '';
		return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
	}
	return null;
}

const REMOVE_VOIDED_INVOICES = true;

module.exports = function(app) {

	router.post('/search',  [control.hasAccess(['admin', 'tenant']), Hash.unHash], async(req, res, next) => {
		try{

		  var connection = res.locals.connection;
			let company = res.locals.active;
			let body = req.body;

			let report = new Report({
				name: body.type + '_' + moment().format('x'),
				type: 'payments',
				format: 'web',
				filters: body,
				connection: connection,
				company: company
			});

			await report.generate();

			utils.send_response(res, {
				status: 200,
				data: {
					payments: Hash.obscure(report.reportClass.data, req),
					result_count: report.reportClass.result_count
				}
			});

		} catch(err){
			next(err)
		}
	});

	router.post('/apply/:invoices_payment_id', [control.hasAccess(['admin']), control.hasPermission('unapply_payment'), Hash.unHash], async(req,res,next) => {


		try{
		  var connection = res.locals.connection;
			let params = req.params;
			let body = req.body;
			let company = res.locals.active;
			let contact = res.locals.contact;

			let payment_application = await Payment.getPaymentApplicationById(connection, params.invoices_payment_id);
			if(!payment_application) e.th(404);

			let payment = new Payment({id: payment_application.payment_id});
			await payment.find(connection);
			await payment.verifyAccess(connection, company.id, res.locals.properties);

			let amount_to_unapply = body.amount || null
			let new_amount = 0
			if(amount_to_unapply && amount_to_unapply > 0) {
				new_amount = payment_application.amount - amount_to_unapply
			}
			await payment.unapply(connection, payment_application.id, new_amount);

			// let invoice = new Invoice({id: payment_application.invoice_id});
			// await invoice.find(connection);
			// await invoice.total();
			// await invoice.updateBalance(connection);


			utils.send_response(res, {
				status: 200,
				data: {}
			});

			let events = [];
			events.push('payment_unapplied')
			events.map(e => {
        eventEmitter.emit(e, { company, contact, payment, payment_application, property_id: payment.property_id, cid: res.locals.company_id, locals: res.locals});
			});

		} catch(err) {
			next(err);
		}



    });

    // TODO is this in use? lets remove if not. 
	router.post('/:payment_id/apply', [control.hasAccess(['admin']), joiValidator.body(Schema.applyPayment),  Hash.unHash], async (req, res, next) => {


		try{

		  var connection = res.locals.connection;
			let body = req.body;
			let params = req.params;
			let company = res.locals.active;
			var contact = res.locals.contact;

			let payment =  new Payment({
				id: params.payment_id
			});
			await payment.find(connection);
			await payment.getPaymentApplications(connection);
			await payment.verifyAccess(connection, company.id, res.locals.properties);

			await connection.beginTransactionAsync();
			await payment.applyToInvoices(connection, body.invoices);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data:{
					payment_id: Hashes.encode(payment.id, res.locals.company_id)
				}
			});
			for(let i = 0; i <  body.invoices.length; i ++){
			  let invoice = body.invoices[i];
			  invoice.date = moment();
				eventEmitter.emit('payment_applied_to_invoices', { contact, company, payment, invoice, cid: res.locals.company_id, locals: res.locals});

			}

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}

	});

  router.post('/bulk',  [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
    var connection = res.locals.connection;
    const payment = new Payment();
    try {
      if(req.body.paymentSource && req.body.paymentSource !== 'MOVE_IN') {
        let permissions = res.locals.permissions;
        utils.hasPermission(['accept_payments'], permissions);
      }

      res.fns.addStep('start');
      let body = req.body;
      let user = res.locals.contact;
      let api = res.locals.api;
      let company = res.locals.active;
      // get IP address
      // get IP address in case the IP address has changed. 
      let ip_override = req.query.fallback_ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      ip_override = ip_override.replace("::ffff:", "");

      let lease_ids = new Set();
      body.Invoices?.forEach(invoice => lease_ids.add(invoice.lease_id));
      body.leases?.forEach(lease => typeof lease === 'object' ? lease_ids.add(lease.id) : lease_ids.add(lease));
      lease_ids = Array.from(lease_ids); 

      await connection.beginTransactionAsync(Generic.lockTableRows, { table_name: 'leases', ids: lease_ids });

      let accept_late_payments = false;

      try {
        utils.hasPermission({connection, company_id: company.id, contact_id: user? user.id : null, api, permissions: ['accept_late_payments']});
        accept_late_payments = true;
      } catch (err) {
        // cant accept late paymetns
      }

      const response = await payment.processInBulk(connection, body, res, accept_late_payments, ip_override, payment, ['accept_payments', 'accept_late_payments']);
      const { paymentData, events, eventsData } = response;
      
      await connection.commitAsync();

      if (paymentData.PaymentMethod.token === null && eventsData.paymentMethod.save_to_account == 1 &&(paymentData.PaymentMethod.payment_gateway == "forte" || paymentData.PaymentMethod.type != "ach"))
        message = 'Your Payments have been processed successfully! Card cannot be saved, Tokenization is not enabled';
      else
        message = 'Your Payments have been processed successfully';
      utils.send_response(res, {
        status: 200,
        data: {
          payment: {
            id: Hashes.encode(paymentData.id, res.locals.company_id),
            amount: paymentData.amount,
            status_desc: paymentData.status_desc
          },
          msg: message
        }
      });

      events && eventsData && events.map(e => {
        eventEmitter.emit(e, eventsData);
      });

    } catch (err) {
      //<TO-DO> Add Failed/Error Payment make an entry to Payments Table
      console.log("DATASCRAPPER_FAILED_PAYMENT_INFORMATION :::: ", payment);
      let failed_payment_available = true;
      try {
        await payment.find(connection);
      } catch(err){
        failed_payment_available = false;
      }
      await connection.rollbackAsync();
      if (failed_payment_available) {
        let body = req.body;
        let payment_details = {
          property_id : body.property_id,
          contact_id : body.contact_id,
          payment_method_id : body.payment.payment_method_id, 
          type : body.payment.type, 
          source : body.payment.source, 
          paymentMethod : body.paymentMethod
        };
        await new Payment().captureFailedPayments(connection, payment, payment_details);
      }
      next(err);
    }
  });
  router.post('/:payment_id/lanSwipeResponse', async (req, res, next) => {
    try {
      console.log("Inside lanSwipeResponse");
      let params = req.params;
      let payment_id = Hashes.decode(params.payment_id)[0];
      var connection = res.locals.connection;
      let body = req.body;
      let company = res.locals.active;
      let company_id = Hashes.decode(req.query.company_id)[0];

      console.log("params.payment_id", payment_id);

      await connection.beginTransactionAsync();
      let payment = new Payment({ id: payment_id });
      console.log("Payment Object ::: ", payment);
      await payment.find(connection);


      const response = await payment.lanSwipeResponseCapture(connection, body, res, payment);
      const { paymentData } = response;
      console.log("Respose paymentData ::: ", response);
      await connection.commitAsync();

      if (response.token === null)
        message = 'Your Payments have been processed successfully! Card cannot be saved, Tokenization is not enabled';
      else
        message = 'Your Payments have been processed successfully';
      utils.send_response(res, {
        status: 200,
        data: {
          payment: {
            id: Hashes.encode(payment.id, res.locals.company_id),
            amount: response.amount,
            status_desc: response.status_desc
          },
          msg: message
        }
      });

    } catch (err) {
      //<TO-DO> Add Failed/Error Payment make an entry to Payments Table
      console.log("DATASCRAPPER_FAILED_PAYMENT_INFORMATION :::: ", err);
      await connection.commitAsync();
      next(err);
    }
  });

  router.post('/',  [control.hasAccess(['admin', 'tenant']), joiValidator.body(Schema.createPayment), Hash.unHash],  async(req, res, next) => {

    try{

      var connection = res.locals.connection;
      let body = req.body;

      let company = res.locals.active;
      var contact = res.locals.contact;

      let lease = new Lease({id: body.payment.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      await lease.getProperty(connection, company.id, res.locals.properties);

      let paymentMethod = {};
      try{
        paymentMethod = await lease.Property.getPaymentMethod(connection, body.payment.type, body.payment.payment_method_id);
        paymentMethod.is_new = false;
        paymentMethod.save_to_account = false;
      } catch(err){
        console.log(err);
        e.th(400, "Invalid payment method");
      }

      // await paymentMethod.find(connection);

      let payment = new Payment();

      await connection.beginTransactionAsync();
      body.payment.property_id = lease.Property.id;
      await payment.create(connection, body.payment, paymentMethod, body.payment.source, contact.id);

      payment.payment_remaining = payment.amount;

      if(body.invoices && body.invoices.length){
        await payment.applyToInvoices(connection, body.invoices);
      }

      await payment.charge(connection, company.id, false, contact );
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data:{
          payment_id: Hashes.encode(payment.id, res.locals.company_id)
        }
      });

			let events = [];
			events.push('payment_created');
			events.map(e => {
				eventEmitter.emit(e, { lease, contact, company, payment, paymentMethod , 'user': contact, property_id: lease.Property.id, cid: res.locals.company_id, locals: res.locals});
			});
    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  // Are we using this ?
  router.post('/record',  [control.hasAccess(['admin']), joiValidator.body(Schema.createPayment), Hash.unHash],  async(req, res, next) => {

    try{

      let body = req.body;

      var connection = res.locals.connection;
      let company = res.locals.active;
      var contact = res.locals.contact;

      let lease = new Lease({id: body.payment.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getProperty(connection);

      body.payment.property_id = lease.Property.id;
      let paymentMethod = {};

      // this is inefficient. Abstract all simple payment methods to one class.
      switch(body.payment.type){
        case 'cash':
          paymentMethod = new Cash({type: 'Cash'});
          break;
        case 'check':
          paymentMethod = new Check({type: 'Check'});
          break;
        case 'card':
          paymentMethod = new Card({type: 'Card'});
          break;
        case 'ach':
          paymentMethod = new Ach({type: 'ACH'});
          break;
        // need to add gift card if needed 
      }


      let payment = new Payment();

      await connection.beginTransactionAsync();
      body.payment.property_id = lease.Property.id;
      await payment.create(connection, body.payment, paymentMethod, body.payment.source, contact.id);

      payment.payment_remaining = payment.amount;

      if(body.invoices && body.invoices.length){
        await payment.applyToInvoices(connection, body.invoices);
      }

      await payment.charge(connection, company.id, false, contact );
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data:{
          payment_id: Hashes.encode(payment.id, res.locals.company_id)
        }
	  });

			let events = [];
			events.push('payment_created')

			events.map(e => {
        eventEmitter.emit(e, { lease, contact, company, payment, paymentMethod, property_id: lease.Property.id, cid: res.locals.company_id, locals: res.locals});
			});

    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

	router.get('/:payment_id', [control.hasAccess(['admin','api']), Hash.unHash], async(req, res, next) => {

		try{
		  var connection = res.locals.connection;
			let params = req.params;
			let company = res.locals.active;
      let api = res.locals.api || {};

			let payment = new Payment({id: params.payment_id});
			await payment.find(connection);

			await payment.verifyAccess(connection, company.id, res.locals.properties);
			await payment.getRefunds(connection);
			await payment.getPaymentApplications(connection, { unit_info:req.query?.unit_info || false });
			await payment.getContact(connection);
      await payment.getAcceptedByForPayment(connection, company.id);
      await payment.getStatus(connection, company.id);
      await payment.getInterPropertyPayment(connection);
      
      await payment.canReverse(connection,{by_pass:false, api: api});

			// //For authnet if it has been less than 24hrs check if the payment is settled
			// if(payment.Property && payment.Property.Connections && payment.Property.Connections.length && payment.Property.Connections[0].name == 'authorizenet'){
			// 	if(moment().diff(payment.created, 'hours') <= 24){
			// 		let transaction_status = await payment.PaymentMethod.transactionStatus(connection, payment, company.id);
			// 		console.log(transaction_status);
			// 		is_settled = transaction_status.status_desc === 'settledSuccessfully' ? true : false;
			// 	}
			// }

      // payment.is_settled = is_settled;
      
      console.log("Payment Object");
			console.dir( payment, { depth: null, colors: true });

			utils.send_response(res, {
				status: 200,
				data: {
					payment: Hash.obscure(payment, req)
				}
			});
		} catch(err) {
			next(err);
    }
    
  });

  router.get('/:payment_id/receipt', [control.hasAccess(['admin','tenant','apo']), Hash.unHash], async(req, res, next) => {

    try{
      var connection = res.locals.connection;
      let params = req.params;
      let company = res.locals.active;
      let c = new Company(company);
      await c.find(connection);


      let payment = new Payment({id: params.payment_id});
	  await payment.find(connection);
	  await payment.findAuction(connection);
      await payment.verifyAccess(connection, company.id);
      if(payment.lease_id){
        await payment.getLease(connection);
      }

      await payment.getProperty(connection);
      // TODO remove if web accessible
      await payment.Property.verifyAccess({company_id: company.id, properties: res.locals.properties});
	  await payment.Property.getPhones(connection);
	  await payment.Property.getEmails(connection);
      await payment.Property.getAddress(connection);
      await payment.getPaymentMethod(connection);

      if(payment.contact_id){
        await payment.getContact(connection, company.id);
      } else if (payment.PaymentMethod && payment.PaymentMethod.Contact && payment.PaymentMethod.Contact.id){
        payment.Contact = payment.PaymentMethod.Contact;
      } else if (payment.lease_id){
        await payment.getLease(connection);
        await payment.Lease.getTenants(connection, company.id);
        payment.Contact = payment.Lease.Tenants[0].Contact;
      }


      await payment.getAcceptedBy(connection, company.id);
      await payment.getPaymentApplications(connection);
      await payment.getInterPropertyPayment(connection);
      await payment.getAccountBalanceAfterPayment(connection);
      const { invoices, interPropertyInvoices } = await payment.getReceiptInvoices(connection, REMOVE_VOIDED_INVOICES);

	  let company_data = {
		  name: company.name
	  };

	  if(company && company.gds_owner_id){
		try{
      let webInfo = await getWebsiteInfo(company.gds_owner_id, Hashes.encode(payment.Property.id, res.locals.company_id));

			if(webInfo.status == 'success'){
				company_data.logo = (webInfo?.data?.logo?.desktop?.url || webInfo?.data?.logo?.mobile?.url) || '';
			} else if (webInfo.status == 'error') {
				let err = {
					message: webInfo.message,
					data: webInfo.data
				}
				console.log("Company Logo fetching error: ", err);
			}
		} catch(err) {
			console.log("Company Logo fetching error: ", err);
		}
	  }

      console.log("-----", payment.Contact )
      let data = {
        company: company_data,
        property: payment.Property,
        invoices: invoices,
        payment: payment,
        InterPropertyInvoices: interPropertyInvoices
      }


      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(data, req)
      });


    } catch(err) {
      next(err);
    }



  });

  router.delete('/:payment_id', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {

		try{
		  var connection = res.locals.connection;
			let params = req.params;
			let company = res.locals.active;
			let contact = res.locals.contact;

			await connection.beginTransactionAsync()
			let payment = new Payment({id: params.payment_id});
			await payment.find(connection);
			await payment.verifyAccess(connection, company.id, res.locals.properties);
			await payment.delete(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					payment: Hash.obscure(payment, req)
				}
			});

			let events = [];
			events.push('payment_deleted');

			events.map(e => {
        eventEmitter.emit(e, { company, contact, payment, property_id: payment.Property.id, cid: res.locals.company_id, locals: res.locals});
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}

	});

	router.post('/:payment_id/refund', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.refundPayment), Hash.unHash], async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			let params = req.params;
			let body = req.body;
			let company = res.locals.active;
			let user = res.locals.contact;
      let api = res.locals.api || {};
      let {reversal_type}  = body;

      let payment = new Payment({id:params.payment_id});
      await payment.find(connection);
      await payment.canReverse(connection,{by_pass:false,reversal_type, api});
      await payment.processRefund(connection, body, company, user, api, res);

      utils.send_response(res, {
        status: 200,
        data: {
          payment: Hash.obscure(payment, req)
        }
      });

      let events = [];
      events.push('payment_refunded');

      events.map(e => {
        eventEmitter.emit(e, { company, contact: user, payment, property_id: payment.Property.id, cid: res.locals.company_id, locals: res.locals});
      });


		} catch(err) {
			next(err);
		}

	});

	router.post('/:payment_id/void', [control.hasAccess(['admin','api']), control.hasPermission('card_void_permission'), Hash.unHash], async (req, res, next) => {
		try{
      var connection = res.locals.connection;
			let params = req.params;
			let body = req.body;
			let company = res.locals.active;
			let contact = res.locals.contact;
      let api  = res.locals.api || {};

			await connection.beginTransactionAsync();
			let payment = new Payment({id: params.payment_id});
			await payment.find(connection);

			await payment.verifyAccess(connection, company.id, res.locals.properties);
			await payment.getPaymentApplications(connection);
      await payment.hasPermissionToVoid(connection, api);

			if(payment.AppliedPayments){
				for(let i = 0; i < payment.AppliedPayments.length; i++){
					await payment.unapply(connection, payment.AppliedPayments[i].id, 0);
				}
			}

			await payment.void(connection, company.id, {
        api_info: res
      });

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					payment: Hash.obscure(payment, req)
				}
      });
      
      eventEmitter.emit('payment_voided', { company, contact, payment, property_id: payment.Property.id, cid: res.locals.company_id, locals: res.locals});
    

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.post('/:payment_id/email', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
        var connection = res.locals.connection;
      try {
          let params = req.params;
          let body = req.body;
          let user = res.locals.contact;
          let { property_id, email, browser_time = null } = body;

          //Company
          let company = new Company({id: res.locals.active.id});
          await company.find(connection);
          
          //Payment
          let payment = new Payment({id: params.payment_id});
          await payment.find(connection);
          await payment.verifyAccess(connection, company.id, res.locals.properties);

          //Property
          if(!property_id){
            property_id = payment.property_id;
          }

          let property = new Property({id: property_id});
          await property.find(connection)
          await property.getPhones(connection);

          company.webLogo =  await company.getWebLogoURL(Hashes.encode(property_id, res.locals.company_id));

          //Payment Details
          if(payment.lease_id){
            await payment.getLease(connection);
          }

          await payment.getProperty(connection);
          // TODO remove if web accessible
          await payment.Property.verifyAccess({company_id: company.id, properties: res.locals.properties});
          await payment.Property.getPhones(connection);
          await payment.Property.getEmails(connection);
          await payment.Property.getAddress(connection);
          await payment.getPaymentMethod(connection);

          if(payment.contact_id){
            await payment.getContact(connection, company.id);
          } else if (payment.PaymentMethod && payment.PaymentMethod.Contact && payment.PaymentMethod.Contact.id){
            payment.Contact = payment.PaymentMethod.Contact;
          } else if (payment.lease_id){
            await payment.getLease(connection);
            await payment.Lease.getTenants(connection, company.id);
            payment.Contact = payment.Lease.Tenants[0].Contact;
          }

          await payment.getAcceptedBy(connection, company.id);
          await payment.getPaymentApplications(connection);
          await payment.getInterPropertyPayment(connection);
          await payment.getAccountBalanceAfterPayment(connection);
          const { invoices, interPropertyInvoices } = await payment.getReceiptInvoices(connection, REMOVE_VOIDED_INVOICES);
          const useManagerInitials = await Setting.getSettingValue(connection, 'useManagerInitials', {company_id: company.id, property_id: payment.Property.id});

          let report_data = {
            company,
            property: payment.Property,
            invoices,
            payment,
            browser_time,
            InterPropertyInvoices: interPropertyInvoices,
            useManagerInitials: parseInt(useManagerInitials) || 0
          }

          //Generate PDF
          let url = settings.get_pdf_generator_app_url();
          url += 'receipt';

          var options = {
            uri: url,
            json: true,
            method: 'POST',
            body: {
              data: report_data,
              type: 'receipt',
              property,
              company
            }
          };

          let result;
          var pdf = await rp(options);
          if(pdf.status) {
            result = pdf.data;
          } else {
            e.th(400, "500: Error occured while generating report");
          }

          //Send Email
          let attachments = [{
            content: new Buffer(result.data).toString('base64'),
            content_type: "application/pdf",
            name: `Receipt${moment(payment.date).format('MMDDYYYY')}.pdf`
          }];

          let subject = `Your ${moment(payment.date).format('MMMM Do YYYY')} Receipt for $${payment.amount.toFixed(2)}`;
          let message = `Hello ${payment.Contact.first} ${payment.Contact.last},\n\n` +
                  `You’ve successfully made a payment, we’ve attached your payment receipt for your convenience.\n\n` +
                  `Thank you for continuing to trust us with your self storage needs. If you have any questions about your receipt, please reach out to ${property.Phones.length ? formatPhoneNumber(property.Phones[0].phone) : 'us'}.`;
          let space = 'Tenant';
		  if (payment.lease_id) {
			  let lease = new Lease({id: payment.lease_id});
			  await lease.find(connection);
			  if (lease && lease.Unit) {
			  	  space = lease.Unit.number;
			  }
		  }
          let response = await payment.Contact.sendEmail(connection, payment.Property.id, space, subject, message, attachments, user.id, 'payment_receipt', company.gds_owner_id, property.gds_id, email);

          utils.send_response(res, {
            status: 200,
            data: {
              msg: "The receipt payment has been sent by email."
            }
          });

        } catch(err){
          	next(err)
        }
	});
  /* depricated */
	// router.get('/:payment_id/update-status', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {

	// 	try{
	// 	  var connection = res.locals.connection;
	// 		let params = req.params;
	// 		let body = req.body;
	// 		let company = res.locals.active;
	// 		let contact = res.locals.contact;

	// 		await connection.beginTransactionAsync()
	// 		let payment = new Payment({id: params.payment_id});
	// 		await payment.find(connection);
	// 		await payment.verifyAccess(connection, company.id, res.locals.properties);

	// 		await payment.getStatus(connection);

	// 		await connection.commitAsync();

	// 		utils.send_response(res, {
	// 			status: 200,
	// 			data: {
	// 				payment: Hash.obscure(payment, req)
	// 			}
	// 		});


	// 	} catch(err) {
	// 		await connection.rollbackAsync();
	// 		next(err);
	// 	}

	// });

	router.post('/authorize',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;

      let company = res.locals.active;
      let body = req.body;
      let params = req.params;
      let property = {};

      let contact = new Contact({id: body.payment.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      body.paymentMethod.first = contact.first;
      body.paymentMethod.last = contact.last;

      if(body.payment.property_id){
        property = new Property({id: body.payment.property_id});
        await property.find(connection);
        await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      } else if (body.payment.lease_id){
        let lease = new Lease({id: body.lease_id});
        await lease.find(connection);
        await lease.canAccess(connection, company.id, res.locals.properties);
        await lease.getProperty(connection, company.id, res.locals.properties);
        property = lease.Property;
      } else {
        e.th(400, "Invalid parameters");
      }

      let paymentMethod = await property.getPaymentMethod(connection, body.payment.type, body.payment.payment_method_id);
      await paymentMethod.setData(connection, body.paymentMethod);
      let authorization = await paymentMethod.authorize(company.id, body.payment.amount);
      //await paymentMethod.save(connection, company.id, {amount: body.amount});

      utils.send_response(res, {
        status: 200,
        data: {
          authorization: authorization
        }
      });


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }

  })

  router.get('/tsys/generate-manifest/:type', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

    try{

      var connection = res.locals.connection;
      let company = res.locals.active;
      let query = req.query;

      let params = req.params;
      let property = {};
      if(query.lease_id) {
        var lease = new Lease({id: query.lease_id});
        await lease.find(connection);
        await lease.canAccess(connection, company.id, res.locals.properties);
        await lease.getProperty(connection, company.id, res.locals.properties);
        property = lease.Property;
      } else if ( query.property_id) {
        property = new Property({id: query.property_id});
        await property.find(connection);
        await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      }

      await property.getConnections(connection, params.type );
      if(!property.Connections.length) e.th(404,  "Connection information not found");

      let tsys_connection = property.Connections[0];
      if(tsys_connection.name !== 'tsys' || tsys_connection.type !== params.type) e.th(400, "Invalid connection.");

      let pm = await tsys_connection.getPaymentMethod();
      let creds = await pm.getCreds(query.amount || 0);

      utils.send_response(res, {
        status: 200,
        data: {
          creds: creds
        }
      });


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.post('/tsys/authenticate', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

    try{

      var connection = res.locals.connection;
      let company = res.locals.active;
      let query = req.query;
      let params = req.params;

      let lease = new Lease({id: query.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getProperty(connection, company.id, res.locals.properties);

      await lease.Property.getConnections(connection, params.type );

      if(!lease.Property.Connections.length) e.th(404,  "Connection information not found");

      let tsys_connection = lease.Property.Connections[0];
      if(tsys_connection.name !== 'tsys' || tsys_connection.type !== params.type) e.th(400, "Invalid connection.");

      let pm = await tsys_connection.getPaymentMethod();
      let creds = await pm.getCreds(query.amount || 0);

      utils.send_response(res, {
        status: 200,
        data: {
          creds: creds
        }
      });


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }

  });

  router.put('/payment-method/:payment_method_id/address', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let { body, params } = req,
        address_id = body?.id || null,
        billingAddress = {};
      //let company = res.locals.active;
      //var contact = res.locals.contact;

      if (!body.zip) e.th(400, "Payment Method billing address zip code is required.");

      let paymentMethod = new PaymentMethod({ id: params.payment_method_id });
      await paymentMethod.find(connection);

      await connection.beginTransactionAsync();

      if (!address_id) {

        billingAddress = new Address({
          address: body.address,
          address2: body.address2,
          city: body.city,
          state: body.state, 
          country: body.country, 
          zip: body.zip
        });

        await billingAddress.save(connection);
        // saving new address in the payment_method
        await paymentMethod.updateAddressId(connection, billingAddress.id);

      } else {

        billingAddress = new Address({ id: address_id })
        await billingAddress.find(connection)

        billingAddress.address = body.address
        billingAddress.address2 = body.address2
        billingAddress.city = body.city
        billingAddress.state = body.state
        billingAddress.country = body.country
        billingAddress.zip = body.zip

        billingAddress.save(connection)

      }

      //   let lease = new Lease({id: paymentMethod.lease_id});
      //   await lease.find(connection);
      //   await lease.canAccess(connection, company.id, res.locals.properties);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          BillingAddress: Hash.obscure(billingAddress, req)
        }
      });
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });
  

  // TODO: This does not follow basic REST patterns.  Payment methods belong to a contact, so this endpoint should be at POST contacts/:contact_id/payment-methods
  router.post('/payment-method',  [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

    var connection = res.locals.connection;
    try {

      let body = req.body;
      let company = res.locals.active;

      let property = new Property({ id: body.property_id });
      await property.find(connection);
      await property.verifyAccess({ company_id: company.id, properties: res.locals.properties });

      let contact = new Contact({ id: body.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      //Purpose of this endpoint is to save the payment method
      body.payment_method.save_to_account = true;

      await connection.beginTransactionAsync();

      let paymentMethod = await contact.getPaymentMethod(connection, property, null, body.payment.type, body.payment.source, body.payment_method, true);

      if (paymentMethod.tokenized === false && (paymentMethod.type !="ach" || paymentMethod.payment_gateway == "forte")) {
        e.th(400,"The gateway is configured incorrectly. Tokenization is not enabled. Contact your gateway provider to update your gateway configuration."); 
      }
      else {
        await connection.commitAsync();
        utils.send_response(res, {
          status: 200,
          data: {
            payment_method: Hash.obscure(paymentMethod, req)
          },
          message: 'Your Payment method have been added successfully'

        });
       }
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  /* Returns how many invoices (in single or multiple leases) can be paid against an amount,
     - In case leases are not created yet it create leases with unit_id and unit_configuration data
     - returns leases with billed_months (billed_months are added on top of previous billed months passed)
  */ 
  router.post('/get-leases-billed-months', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {    
    try {
      const { connection } = res.locals;
      const company = res.locals.active;			
      const body = req.body;
      let { amount, leases, is_lease_created } = body;

      const leasesRes = await Payment.getLeasesBilledMonthsByAmount(connection, { 
        is_lease_created: is_lease_created,
        leases: leases,
        amount: amount,
        company: company
      });

      utils.send_response(res, {
        status: 200,
        data: {
          leases: Hash.obscure(leasesRes, req) 
        }
      });
    } catch(err) {
      next(err);
    }
  });

  router.delete('/payment-method/:payment_method_id', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {

    var connection = res.locals.connection;
    try{

      let params = req.params;
      let company = res.locals.active;

      await connection.beginTransactionAsync();

      let paymentMethod = new PaymentMethod({id: params.payment_method_id});
      await paymentMethod.find(connection);
      if(!paymentMethod.id) e.th(404, "Payment method not found.");

      let property = new Property({id: paymentMethod.property_id});
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      paymentMethod = await property.getPaymentMethod(connection, null, params.payment_method_id)
      console.log("paymentMethod", paymentMethod)
      
      await paymentMethod.remove(connection, company.id );
      await paymentMethod.removeAutopay(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data:{},
        message: 'Your Payment method have been removed successfully'
      });

    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }

  });

  router.post('/pax-response', [Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    let data;
    let error;

    let paymentId = null
    try {

      let body = req.body;
      paymentId = Hashes.decode(body.paymentId)[0];
      //let paymentId = body.paymentId;
      console.log("***********Payment ID*************", paymentId);

      var payment = new Payment({ id: paymentId });
      await payment.find(connection);

      if (body.integrationError) {

        payment.status_desc = body.integrationError.message;
        payment.status = 0;

        if(payment.PaymentMethod){
          payment.PaymentMethod.active = 0;
        }

        error = `This payment failed: ${body.integrationError.message}`;

      } else {

        let response = JSON.parse(req.body.responseJSON);
        if (response.ExtData) {
          var options = { compact: true, ignoreComment: true, spaces: 4 };
          var json = xmljs.xml2js("<data>" + response.ExtData + "</data>", options);
          response.ExtData = json.data;
        }
        console.log("***********PAX Response*************", response);

        var expdate = response.ExtData && response.ExtData.ExpDate._text;

        payment.auth_code = response.AuthCode;
        payment.transaction_id = expdate && expdate.HRef;
        payment.status_desc = response.Message;
        payment.amount = response.ApprovedAmount / 100;
        payment.status = response.ResultTxt === 'OK' ? 1 : 0;

        if(payment.PaymentMethod){
          payment.PaymentMethod.card_end = response.BogusAccountNum;
          payment.PaymentMethod.card_type = response.CardType.toLowerCase();
          payment.PaymentMethod.active = response.ResultTxt === 'OK' ? payment.PaymentMethod.active : 0;
          payment.PaymentMethod.exp_warning = expdate && moment(`${expdate.substring(0, 2)}/${expdate.substring(2)}`, 'MM/YY').format('YYYY-MM-DD');
          payment.PaymentMethod.token = expdate && expdate.Token;
          payment.PaymentMethod.payment_method_type_id = await payment.PaymentMethod.getPaymentMethodTypeId(connection, payment.PaymentMethod.type, payment.PaymentMethod.card_type);
          payment.payment_method_type_id = payment.PaymentMethod.payment_method_type_id;
        }

        if (response.ResultTxt == 'OK') {
          data = {
            payment: {
              id: Hashes.encode(payment.id, res.locals.company_id),
              amount: payment.amount,
              status_desc: payment.status_desc
            },
            msg: {
                id: "MakePayment_Success",
                text: "Your Payments have been processed successfully",
              }
          }
        } else {
          error = `This payment failed: ${response.ResultTxt}`;
        }
      }
      console.log("PAYMENT before save", payment)
      await payment.save(connection);
      if (payment.PaymentMethod) {
        await payment.PaymentMethod.save(connection);
      }
      console.log("PAYMENT after save", payment)
      if(payment.status){
        let invoice_breakdowns = await models.Payment.getInvoicePaymentBreakdowns(connection, {payment_id: payment.id});
        for (let i = 0; i < invoice_breakdowns.length; i++) {
          let inv_breakdown = invoice_breakdowns[i];
          let accounting = new Accounting();
          let payload = { 
            cid: connection.cid, 
            invoiceId: inv_breakdown.invoice_id, 
            paymentId: inv_breakdown.payment_id, 
            propertyId: payment.property_id, 
            invoicesPaymentsBreakdownId: inv_breakdown.id 
          }; 
          let accountingEventData = await accounting.computeAccountingData(connection, payload);
          if(accountingEventData) await accounting.generateExport(connection, accountingEventData);
        }
      } else {
        await models.Payment.unapplyByPaymentId(connection, payment.id);
      }
      
      utils.send_response(res, { status: 200 });
    } catch (err) {
      if (error == null) {
        error = err.message || 'An error occurred while processing payment.';
      }
      console.log("ERROR1", err)
      console.log("payment_id" , paymentId)
      console.log("payment_id object " , payment.id)
      await models.Payment.unapplyByPaymentId(connection, paymentId);
      await connection.rollbackAsync();
      next(err)
    } finally {
      if (!payment) {
        let paymentId = Hashes.decode(body.paymentId)[0];
        payment = new Payment({ id: paymentId });
        await payment.find(connection);
      }
      let company = await models.Company.findByPropertyId(connection, payment.property_id);
      let socket = new Socket({
        company_id: company.id,
        contact_id: payment.accepted_by
      });
      await socket.createEvent("paymentReader", {
        data,
        error
      });
    }
  });

  router.post('/:payment_id/refund/:refund_id/send-email', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
      const { payment_id, refund_id } = req.params;
      const { company_id, connection } = res.locals;
      const payload = {
        cid: company_id,
        send_email: true
      };

      const payment = new Payment({ id: payment_id });
      await payment.find(connection);
      await payment.getProperty(connection, true);

      const refund = new Refund({ id: refund_id, Payment: payment });
      await refund.find(connection);
      await refund.processReversal(connection, payload);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

		} catch(err) {
			next(err);
		}

	});

  return router;

};

const Unit = require(__dirname + '/../classes/unit.js');
const Generic = require('../classes/generic');
const Setting = require(__dirname + '/../classes/settings.js');
const Refund = require('../classes/refund');
