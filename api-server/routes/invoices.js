var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Promise = require('bluebird');

var validator = require('validator');

var models = require(__dirname + '/../models');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Payment = require(__dirname + '/../classes/payment.js');
var InvoiceLine = require(__dirname + '/../classes/invoice_lines.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Property = require(__dirname + '/../classes/property.js');

var { getWebsiteInfo } = require('../modules/gds_translate');
var Activity  = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Report = require(__dirname + '/../classes/report.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});
var Schema = require(__dirname + '/../validation/invoices.js');

var eventEmitter = require(__dirname + '/../events/index.js');


var pdf = require('html-pdf');
const Company = require('../classes/company');
var options = {
	format: 'Letter',
    border: {
        top: "0.5in",            // default is 0, units: mm, cm, in, px
        right: "0.25in",
        bottom: "0.5in",
        left: "0.25in"
    }

};

module.exports = function(app) {

    router.post('/search',  [control.hasAccess(['admin', 'tenant']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            let company = res.locals.active;
            let body = req.body;
            console.log(body);

            let report = new Report({
                name: body.type + '_' + moment().format('x'),
                type: 'invoice_history',
                format: 'web',
                filters: body,
                connection: connection,
                company: company
            });

            await report.generate();

            utils.send_response(res, {
                status: 200,
                data: {
                    invoices: Hash.obscure(report.reportClass.data, req),
                    result_count: report.reportClass.result_count
                }
            });

        } catch(err){
            next(err)
        }
    });

    router.post('/invoice-breakdown-allocation', [Hash.unHash], async(req, res, next) => {
    
        //req.clearTimeout(); // clear request timeout
        req.setTimeout(300000); //set a 5mins timeout for this request
    
        try{
            let query = req.query;
            var connection = res.locals.connection;
            await Invoice.setInvoiceBreakdownAllocation(connection, query);
    
            utils.send_response(res, {
                status: 200
            });
    
    
        } catch(err) {
            next(err);
        }
    
    
    });

    router.get('/max-invoice-number', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;


            let invoice = new Invoice();
            let num = await invoice.getMaxInvoiceNumber(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    invoice_number: num
                }
            });

        } catch(err) {
            next(err);
        }


    });

    router.get('/past-due', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        let { connection, properties } = res.locals;

        try {
            let { limit, offset } = utils.cleanQueryParams(req.query, { limit: 100 });

            let property_ids = utils.validateProperties(req.query.property_id, properties);
            let invoice = new Invoice();

            let { total_count, invoices } = await invoice.getAllPastDueInvoices(connection, {
                limit, offset, property_ids
            });
            const paging = utils.generatePagingObject(req, { limit, offset }, total_count, invoices.length);

            utils.send_response(res, {
                status: 200,
                data: {
                    invoices: Hash.obscure(invoices, req),
                    paging
                }
            });
        } catch (e) {
            next(e);
        }
    });

    router.get('/:invoice_id', [control.hasAccess(['admin','tenant']), Hash.unHash], async(req, res, next) => {
        //Todo Make sure tenants can view this invoice



        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            var params = req.params;

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.verifyAccess(connection, company.id, res.locals.properties);
            await invoice.total();

            await invoice.findProperty(connection, company.id, contact.id);

            if(invoice.contact_id){
                await invoice.findContact(connection, company.id);
                await invoice.Contact.getPhones(connection)
			    await invoice.Contact.getLocations(connection)
            } else if(invoice.lease_id){
                await invoice.findContactByLeaseId(connection, company.id);
            }

            await invoice.canVoidOrAdjust(connection, company.id, contact.id);
            await invoice.canReissue(connection);

            if(invoice.reissued_from){
                await invoice.findReissuedFromInvoice(connection);
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    invoice: Hash.obscure(invoice, req)
                }
            });

        } catch(err) {
            next(err);
        }



    });

    router.get('/:invoice_id/payments', [control.hasAccess(['admin']), Hash.unHash], async(req,res,next) => {

        var connection = res.locals.connection;
        try{
            let params = req.params;
            let company = res.locals.active;
            let contact = res.locals.contact;

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.verifyAccess(connection, company.id, res.locals.properties);
            await invoice.findPayments(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    payments: Hash.obscure(invoice.Payments, req)
                }
            });



        } catch(err) {
            next(err);
        }

    });

    router.get('/web/:invoice_id', [control.hasAccess(['admin','tenant']), Hash.unHash], async(req, res, next) => {

        // Todo create a hash so they cant just guess any invoice ID
        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            var params = req.params;

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.total();

            if(invoice.Lease) {
                invoice.property_id = invoice.Lease.Unit.property_id
            }
            await invoice.findProperty(connection, company.id, contact.id)
            await invoice.findContactByLeaseId(connection,company.id)

            let company_data = {
                name: company.name
            };

            if(company && company.gds_owner_id){
                try{
                    let webInfo = await getWebsiteInfo(company.gds_owner_id, Hashes.encode(invoice.property_id, res.locals.company_id));

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

            invoice.Company = company_data;

            utils.send_response(res, {
                status: 200,
                data: {
                    invoice: Hash.obscure(invoice, req)
                }
            });

        } catch(err) {
            next(err);
        }



    });

    router.get('/web/:invoice_id/unauthenticated', async(req, res, next) => {

        // Todo create a hash so they cant just guess any invoice ID
        var connection = res.locals.connection;
        try{

            var params = req.params;

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.total();
            let company_id = await invoice.findCompanyIdByInvoice(connection);
            var company = new Company({ id: company_id})
            await company.find(connection);

            if(invoice.Lease) {
                invoice.property_id = invoice.Lease.Unit.property_id
            }

            await invoice.findProperty(connection, company.id, res.locals.contact.id)
            await invoice.findContactByLeaseId(connection,company.id)

            let company_data = {
                name: company.name
            };

            if(company && company.gds_owner_id){
                try{
                    let webInfo = await getWebsiteInfo(company.gds_owner_id, Hashes.encode(invoice.property_id, res.locals.company_id));

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

            invoice.Company = company_data;

            utils.send_response(res, {
                status: 200,
                data: {
                    invoice: Hash.obscure(invoice, req)
                }
            });

        } catch(err) {
            next(err);
        }



    });

    router.post('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact || {};
            let api = res.locals.api || {};
            let company = res.locals.active;

            let body = req.body;
            let lease = {};
            let property = {};
            let datetime = '';

            if (!body.InvoiceLines || !Array.isArray(body.InvoiceLines) || !body.InvoiceLines.length) e.th(400, "This invoice contains no lines");
            if (!body.lease_id && !body.property_id) e.th(400, "This invoice contains no Lease Id or Property Id");


            if (body.lease_id){
                lease = new Lease({id: body.lease_id});
                await lease.canAccess(connection, company.id, res.locals.properties);
                datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD HH:mm:ss')
            } else {
                property = new Property({id: body.property_id});
                await property.find(connection);
			    await property.verifyAccess({company_id: company.id});
                datetime = await property.getLocalCurrentDate(connection,'YYYY-MM-DD');

            }
            body.date = datetime;
            body.due = body.due? body.due : datetime;
            let invoice = new Invoice({created_by: contact.id, apikey_id: api.id});

            invoice.create(body, company.id);
            let discounts = await Discount.findActiveOnLease(connection, lease.id, invoice.due);
            await invoice.generateLines(connection, body.InvoiceLines, discounts, company.id, lease.unit_id);

            await invoice.save(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    invoice_id: Hashes.encode(invoice.id, res.locals.company_id)
                },
            });

            let events = ['invoice_created'];
            events.map(e => {
                eventEmitter.emit(e, { company, contact, invoice,  property_id: body.property_id, cid: res.locals.company_id, locals: res.locals});
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/adjust/:invoice_id', [control.hasAccess(['admin']), control.hasPermission('edit_invoices'), Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;

      try {
        let contact = res.locals.contact
        let company = res.locals.active;
        var params = req.params;
        let body = req.body;
        let { dryrun } = body;

        let invoice = new Invoice({id: params.invoice_id});
        await invoice.find(connection);
        await invoice.findProperty(connection, company.id, contact.id, ['void_invoice']);
        await invoice.total();

        await connection.beginTransactionAsync();

        let { adjustInfo, accessPayments, new_invoice } = await invoice.adjustInvoice(connection, body, res);
        await connection.commitAsync();

        utils.send_response(res, {
          status: 200,
          data: {
            invoice: Hash.obscure(adjustInfo, req),
            paymentDetails: Hash.obscure(accessPayments, req),
            new_invoice: Hash.obscure(new_invoice, req)
          },
        });

        if(!dryrun) {
          let invoice_lease = new Lease({id: invoice.lease_id});
          await invoice_lease.getProperty(connection);

          let events = ['invoice_created', 'invoice_adjusted'];
          events.map(e => {
            eventEmitter.emit(e, { company, contact, invoice, user: contact, property_id: invoice_lease.Property.id, leases: [invoice_lease], invoice_leases: [invoice_lease], adjust_info: adjustInfo, cid: res.locals.company_id , locals: res.locals});
          });
        }

      } catch(err) {
        await connection.rollbackAsync();
        next(err);
      }

    });

    router.post('/reissue/:invoice_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
  
        try {
          let contact = res.locals.contact
          let company = res.locals.active;
          var params = req.params;
          let body = req.body;
  
          let invoice = new Invoice({id: params.invoice_id});
          await invoice.find(connection);
          await invoice.findProperty(connection, company.id, contact.id);
          await connection.beginTransactionAsync();
  
          let reissuedInvoice = await invoice.reissueInvoice(connection, body, contact, company);
          await connection.commitAsync();
  
          utils.send_response(res, {
            status: 200,
            data: {
                invoice_id: Hashes.encode(reissuedInvoice.id, res.locals.company_id)
            },
          });
   
          let invoice_lease = new Lease({id: invoice.lease_id});
          await invoice_lease.getProperty(connection);
  
          let events = ['invoice_created'];
          events.map(e => {
              eventEmitter.emit(e, { company, contact, invoice: reissuedInvoice, user: contact, property_id: invoice_lease.Property.id, leases: [invoice_lease], invoice_leases: [invoice_lease], cid: res.locals.company_id, locals: res.locals});
          });
          
        } catch(err) {
          await connection.rollbackAsync();
          next(err);
        }
  
    });

    router.post('/send-review', [control.hasAccess(['admin']), joiValidator.body( Schema.sendReview), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let user = res.locals.contact;
            let company = res.locals.active;
            let body = req.body;


            await new Promise( (res, rej) => {
                Scheduler.addJobs([{
                    category: 'sendChargesSummary',
                    data: {
                        type: 'TransactionalSummary',
                        users: [user],
                        company: company,
                        date: moment(body.date).format('YYYY-MM-DD')
                    }
                }], err => {
                    if(err) rej(err);
                    res();
                });
            });

            utils.send_response(res, {
                status: 200,
                data: {}
            });


        } catch(err) {
            next(err);
        }




    })

    router.post('/send-to-tenants', [control.hasAccess(['admin']), joiValidator.body( Schema.sendReview), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let body = req.body;

            await new Promise( (res, rej) => {
                Scheduler.addJobs([{
                    category: 'sendChargesToTenants',
                    data: {
                        type: 'TransactionalSendToTenants',
                        company: company,
                        admin_id: contact.id,
                        date: moment(body.date).format('YYYY-MM-DD')
                    }
                }], err => {
                    if(err) rej(err);
                    res();
                });
            });

            utils.send_response(res, {
                status: 200,
                data: {}
            });


            eventEmitter.emit('send_charges_to_tenants', {company, contact, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }




    })

    // where do we use - it seems no longer using ??
    router.delete('/:invoice_id', [control.hasAccess(['admin']), control.hasPermission('void_invoice'), Hash.unHash], async(req, res, next) => {

        //Todo Make sure tenants can view this invoice

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            var params = req.params;

            await connection.beginTransactionAsync();

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.verifyAccess(connection, company.id, res.locals.properties);
            await invoice.void_invoice(connection, contact);

            let lease = new Lease({id: invoice.lease_id});
            await lease.find(connection);
            if(!lease.status) e.th(404, "Lease not found");
            await lease.getCurrentBalance(connection);
            await lease.updateCurrentStanding(connection);
            await lease.getTenants(connection);

            if(!lease.balance){
                let primaryContact = lease.Tenants && lease.Tenants.length && lease.Tenants[0].Contact;
                let _contact = new Contact({ id: primaryContact.id });
                await _contact.find(connection);

                let property = new Property({id: lease.Property.id});
			    await property.find(connection);
			    await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['void_invoice']});
                await property.getAccessControl(connection);
			    await _contact.findAccessCredentials(connection, property);
                await property.Access.restoreUser(_contact.id);


                


            }

            let openPayments = await invoice.getUnappliedPayments(connection)
            if(openPayments && openPayments.length) {
				await Lease.applyUnallocatedBalanceOnlease(connection, company.id, lease.id, openPayments, contact.id, ['void_invoice']);
			}

            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            if(!invoice.property_id) await invoice.findPropertyIdByInvoice(connection);

        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }




    });

    router.post('/:invoice_id/void', [control.hasAccess(['admin']), control.hasPermission('void_invoice'), Hash.unHash], async(req, res, next) => {

        //Todo Make sure tenants can view this invoice

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            var params = req.params;
            let body = req.body;
            let { PaymentDetails } =  body;
            let lease = {};
            let events = [];

            await connection.beginTransactionAsync();

            let invoice = new Invoice({id: params.invoice_id});
            await invoice.find(connection);
            await invoice.verifyAccess(connection, company.id, res.locals.properties);
            await invoice.findProperty(connection, company.id, contact.id, ['void_invoice']);
            let lease_present = !!invoice.lease_id;
            let invoices_payments_breakdown_ids = await invoice.unapplyPayments(connection);
            let payment = new Payment();
            let invoices_payments_breakdown = await payment.findInvoicePaymentBreakdownById(connection, invoices_payments_breakdown_ids)
            await invoice.void_invoice(connection, contact);

            if(PaymentDetails && PaymentDetails.length){
                for(let i = 0; i < PaymentDetails.length; i++) {
                    if(PaymentDetails[i].type == 'refund'){
                        let invoice_payment_breakdown = invoices_payments_breakdown.find(ipb => ipb.payment_id === PaymentDetails[i].id)
                        let payment = new Payment({ id: PaymentDetails[i].id });
                        await payment.find(connection);
                        await payment.canReverse(connection,{by_pass:true});
                        await payment.refund(connection, company, PaymentDetails[i].amount, "",  "Refunding applied payment on voiding invoice", null, [invoice_payment_breakdown?.id], 'refund', contact, ['void_invoice']);
                    }
                }
            }

            if(lease_present){
                lease = new Lease({id: invoice.lease_id});
                await lease.find(connection);
                if(!lease.status) e.th(404, "Lease not found");
                
                let openPayments = await invoice.getUnappliedPayments(connection)
                if(openPayments && openPayments.length) {
				    await Lease.applyUnallocatedBalanceOnlease(connection, company.id, lease.id, openPayments, contact.id, ['void_invoice']);
			    }
            }
            
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            if(!invoice.property_id) await invoice.findPropertyIdByInvoice(connection);

            events.push('invoice_voided_activity');
            events.map(e => {
                eventEmitter.emit(e, { company, user: contact, invoice,  property_id: invoice.property_id, cid: res.locals.company_id, locals: res.locals, lease});
            });


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }




    });

    return router;


};

var Contact = require(__dirname + '/../classes/contact.js');
