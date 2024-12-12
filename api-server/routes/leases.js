var express = require('express');
var router = express.Router();
var moment      = require('moment');
var rp = require('request-promise');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var { getGDSMappingIds, autoPay, rental, tenantOnBoarding, getWebsiteInfo, payBill} = require('../modules/gds_translate');
var { updateGdsUnitStatus } = require('../modules/messagebus_subscriptions');

var Promise = require('bluebird');
var models       = require(__dirname + '/../models');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Enums = require(__dirname + '/../modules/enums.js');
var validator = require('validator');
var Invoice = require(__dirname + '/../classes/invoice.js');
var InvoiceLine = require(__dirname + '/../classes/invoice_lines.js');
var Todo = require(__dirname + '/../classes/todo.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var Tenant = require(__dirname + '/../classes/contact.js');

var Service = require(__dirname + '/../classes/service.js');
var Signer = require(__dirname + '/../classes/signer.js');

var Checklist = require(__dirname + '/../classes/checklist.js');
var Promotion = require(__dirname + '/../classes/promotion.js');

var Contact = require(__dirname + '/../classes/contact.js');
var Lead = require(__dirname + '/../classes/lead.js');
var Address = require(__dirname + '/../classes/address.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Insurance = require(__dirname + '/../classes/insurance.js');
var Product = require(__dirname + '/../classes/product.js');
var Upload      = require('../classes/upload.js');
var Company      = require('../classes/company.js');
var Property      = require('../classes/property.js');
var Payment      = require('../classes/payment.js');
var Unit      = require('../classes/unit.js');
const Transfer = require('../classes/transfer');

var Cash      = require(__dirname +'/../classes/payment_methods/cash.js');
var Check      = require(__dirname +'/../classes/payment_methods/check.js');
var Ach      = require(__dirname +'/../classes/payment_methods/ach.js');
var Card      = require(__dirname +'/../classes/payment_methods/card.js');


var Connection      = require('../classes/connection.js');
var Maintenance      = require('../classes/maintenance_request.js');
var PaymentMethod = require(__dirname + '/../classes/payment_method.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var db = require(__dirname + '/../modules/db_handler.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});
var Schema = require(__dirname + '/../validation/leases.js');

var eventEmitter = require(__dirname + '/../events/index.js');

// var expressJoi = require('express-joi');
// var Joi = expressJoi.Joi; // The exposed Joi object used to create schemas and custom types

const { connect } = require('../modules/sockets');
const { post } = require('request-promise');

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

// var stages = [
// 	'REQUEST SIGNING',
// 	'CONSENT TO ELECTRONIC SIGN',
// 	'CONFIRM'
// ];

module.exports = function(app) {

	router.get('/:lease_id/pinned-interactions',  [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {

		try{

			let params = req.params;
			var connection = res.locals.connection;
      let company = res.locals.active;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      await lease.findPinnedInteractions(connection)

			utils.send_response(res, {
				status: 200,
				data: {
					pinned_interactions: Hash.obscure(lease.PinnedInteractions, req)
				}
			});

		} catch(err) {
			next(err);
		}



	});
	router.get('/recurring-transactions', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		const connection = res.locals.connection;
		const query = req.query
		try {
			let properties = utils.validateProperties(query.property_id, res.locals.properties);
			let { limit, offset } = { ...utils.cleanQueryParams(query, { limit: 100 }, true) };
			const searchParams = {
				limit: limit,
				offset: offset,
				status: ['all', 'active', 'future', 'inactive'].includes(query.status) ? query.status : 'active'
			}
			const {
				data,
				total_records
			} = await Lease.getRecurringTransactions(connection, searchParams, properties);
			const paging = utils.generatePagingObject(req, searchParams, total_records, data.length, true);
			utils.send_response(res, {
				status: 200,
				data: Hash.obscure({
					transactions: data,
					paging
				}, req),
				paging
			});
		} catch (err) {
			next(err);
		}
	});
  /* A route that returns a list of moveouts. */ 
  router.get('/move-out', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    try {
      const query = req.query;
      let searchParams = {};
      const company = res.locals.active;
	  let defaultLimit = query.concise ? { limit: 100 } : {}
	  let isConcise = !!query.concise;
      let { limit, offset } = { ...utils.cleanQueryParams(query, defaultLimit, isConcise) };
      searchParams = { limit, offset }
      searchParams.from_date = query.from_date || "";
      searchParams.to_date = query.to_date || "";
      searchParams.days = query.days || "";
      searchParams.property_id = utils.validateProperties(query.property_id, res.locals.properties) 

      if (searchParams.to_date && (!searchParams.from_date && !searchParams.days)) {
        e.th(400, 'At a time you can only filter either from date or days with to_date')
      }
	  let moveOutLeases = []
	  const totalMoveOuts = await Lease.getMoveOuts(connection, company.id, searchParams, true);
	  if (query.concise) {
		moveOutLeases = await Lease.getConciseLeaseInfo(connection,company.id, searchParams, true);
	  } else {
		moveOutLeases = await Lease.getMoveOuts(connection,company.id, searchParams, false);
	  }
      if (searchParams.property_id) {
        // encrypting for paging
        if (Array.isArray(searchParams.property_id) && searchParams.property_id.length) {
          let tempProperties = []
          for (let propertyId of searchParams.property_id) {
            tempProperties.push(Hashes.encode(propertyId, company.id));
          }
          searchParams.property_id = tempProperties;
        } else {
          searchParams["property_id"] = Hashes.encode(searchParams.property_id, company.id)
        }
      }
      const paging = utils.generatePagingObject(req, searchParams, totalMoveOuts, moveOutLeases.length, isConcise);
      utils.send_response(res,
        {
          status: 200,
          data:
          {
            leases: Hash.obscure(moveOutLeases, req),
            paging
          }
        });
    }
    catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  router.get('/pending',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{
      let query = req.query;

      let company = res.locals.active;
      var connection = res.locals.connection;
	  let leases = [];

      let properties = query.property_id ? [query.property_id]: res.locals.properties;

      let pending = await Lease.findPending(connection, company.id, properties, query.contact_id);

      for(let i = 0; i < pending.length; i++){
        let lease = new Lease(pending[i]);
        await lease.find(connection);
        await lease.canAccess(connection, company.id, res.locals.properties);
        await lease.findUnit(connection);
        await lease.getTenants(connection);
        await lease.findTransfer(connection);
        if(lease.Transfer) await lease.Transfer.findTransferBy(connection);

        leases.push(lease);
      }


      utils.send_response(res, {
        status: 200,
        data: {
          leases: Hash.obscure(leases, req)
        }
      });



    } catch(err) {
      next(err);
    }



  });

  router.get('/standings', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{

      let company = res.locals.active;
      var connection = res.locals.connection;
      let standings = await Lease.findStandings(connection, company.id);

      utils.send_response(res, {
        status: 200,
        data: {
          standings: Hash.obscure(standings, req)
        }
      });



    } catch(err) {
      next(err);
    }



  });

  router.put('/:lease_id/standing',  [control.hasAccess(['admin']), joiValidator.body( Schema.updateStanding ), Hash.unHash], async(req, res, next) => {

		try{

			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact;
			let company = res.locals.active;
			var connection = res.locals.connection;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.saveStanding(connection, body.lease_standing_id, params.lease_id);
			await lease.getTenants(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					lease_id: Hashes.encode(lease.id, res.locals.company_id)
				}
			});

			var events = ['lease_status_update'];
			events.map(e => {
				eventEmitter.emit(e, {contact, company, lease, cid: res.locals.company_id, locals: res.locals});
			});
		} catch(err) {
			next(err);
		}
		
	});

	router.get('/:lease_id/checklist', [control.hasAccess(['admin', 'tenant']), Hash.unHash], async(req, res, next) => {

		try{
			let params = req.params;

			let company = res.locals.active;
			var connection = res.locals.connection;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getTenants(connection);
			await lease.getCosigners(connection, company.id);
			await lease.getChecklist(connection, company.id);
			await lease.findVehicles(connection);

			await lease.findPaymentMethods(connection, null, null, company.id);
			await lease.getServices(connection);
			
			let auto_pay = lease.PaymentMethods.map(a => {if(a.AutoPay) return a;})
			let active_military = lease.Tenants.map(a => {if( a.Contact.Military.active) return  a.Contact.Military.active})
			let processed_checklist = []
			for(let i = 0; i<lease.Checklist.length; i++){
				let check_list = new Checklist({id: lease.Checklist[i].checklist_item_id});
				let item = await check_list.findItemById(connection);
				if (!lease.decline_insurance && item.document_tag === 'deny-coverage') {
					continue;
				}

				if (lease.InsuranceServices.length === 0 && item.document_tag === 'enroll-coverage') {
					continue;
				}

				if (!auto_pay[0] && item.document_tag === 'autopay') {
					continue;
				}

				if (!active_military[0] && item.document_tag === 'military') {
					continue;
				}

				if ((!lease.Vehicles || !lease.Vehicles.id) && item.document_tag === 'vehicle') {
					continue;
				}

				processed_checklist.push(lease.Checklist[i]);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					items: Hash.obscure(processed_checklist, req)
				}
			});



		} catch(err) {
			next(err);
		}



	});

	//TODO Combine with call above
	router.get('/:lease_id/checklist/open', [control.hasAccess(['admin', 'tenant']), Hash.unHash], async(req, res, next) => {

		try{
			let params = req.params;

			let company = res.locals.active;
			var connection = res.locals.connection;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getTenants(connection);
			await lease.getCosigners(connection, company.id);
			await lease.getChecklist(connection, company.id);

			utils.send_response(res, {
				status: 200,
				data: {
					items: Hash.obscure(lease.Checklist.filter(c => !c.completed), req)
				}
			});



		} catch(err) {
			next(err);
		}



	});

	router.get('/:lease_id/property', [control.hasAccess(['admin', 'tenant']), Hash.unHash], async (req, res, next) =>  {

		try{

			let params = req.params;
			let company = res.locals.active;
			var connection = res.locals.connection;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection, company.id, res.locals.properties);

			utils.send_response(res, {
				status: 200,
				data: {
					property: Hash.obscure(lease.Property, req)
				}
			});




		} catch(err) {
			next(err);
		}



	});

	router.post('/:lease_id/generate-move-in-invoice',[control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try {

			let params = req.params;
			let body = req.body;
			let company = res.locals.active;
			var logged_in_user = res.locals.contact || {};
			let api = res.locals.api || {};
			let events = [];
			let invoices = [];
			let should_fetch_discounts = true;
			let lease = new Lease({id: params.lease_id});

			body.payment_cycle = body.payment_cycle && body.payment_cycle.toLowerCase() !== 'monthly' ? body.payment_cycle : null; 
			await lease.find(connection, company.id);
			lease.payment_cycle = body.payment_cycle; 
			// await lease.getActivePaymentCycle(connection);
			let payment_cycle = await lease.getPaymentCycleOptions(connection, body.payment_cycle);

			// payment_cycle = body.payment_cycle;	
			// if(!body.payment_cycle) {

			// 	payment_cycle = null;	
			// 	// if there is an existing payment cycle, we need to unset it and not pass discounts.  
			// 	// the discount is already saved on the lease here, so we need to pass this flag to not fetch the existing discounts from the database. 
			// 	// if(lease.payment_cycle) should_fetch_discounts = false; 
			// }
			
			// TODO which invoice should we find?
			// Currently we are returning the most recent, which may work
			if(lease.status !== 2){
				e.th(409, "Only pending leases can have a move in invoice generated for them.");
			}
			await connection.beginTransactionAsync();
			await lease.findInvoices(connection, company.id);
			if(lease.Invoices.length){
				invoices = lease.Invoices;
				console.log("A move in invoice already exists : ", invoices);
				if(!body.dryrun) e.th(400, "A move in invoice already exists for this lease");
			}
			
			if(!invoices.length){
				let lastBillingDate =  await lease.getLastBillingDate(connection);
				let lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day'): null;
				let services = [];
				let billed_months = body.billed_months || 1;
				if(payment_cycle){
					// Calculating billed months according to Multi Month Payment Cycle.
					billed_months = body.billed_months == 0 ? payment_cycle.period : Math.ceil(body.billed_months / payment_cycle.period) * payment_cycle.period;
				}
				if(payment_cycle && billed_months > 1 && (billed_months % payment_cycle.period ) !== 0){
					e.th(409, `Payment Cycles must be billed in groups of ${payment_cycle.period}`);
				}
				
				let discountsToPass = [];
				for(let i = 0; i < billed_months; i++ ) {
					let initialInvoice = i == 0;
					let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled && lastBilled.clone(), initialInvoice ? 0 : 1);
					lastBilled = invoicePeriod.end.clone();
					
					if(payment_cycle){
						if(i % payment_cycle.period === 0){
							if(!body.dryrun){
								if(i == 0 ){
									// delete old one, and save new one
									// await lease.removePaymentCycle(connection, lease.start_date, true); 
									// await lease.getPaymentCycleOptions(connection);	
									
									lease.payment_cycle = payment_cycle.label; 
									
									let period_start = invoicePeriod.start.clone();
									// this is just the first invoice, we need to add 1 day to get to the first of the next billing period, then add the payment_cycle periods ( -1 ) then subtract 1 day to get to the end of that biling period. 
									let period_end = invoicePeriod.end.clone().add(1, 'day').add(payment_cycle.period - 1, 'months').subtract(1, 'day'); 
									await lease.saveMoveInPaymentCycle(connection, period_start, period_end, company.id); 

								} else if ( i > 0){
									await lease.savePaymentCycle(connection, invoicePeriod.start.clone(), payment_cycle.period, company.id);
								}
							} else {
								if(i == 0){
									let tempPromotion = await lease.addPromotion(connection, payment_cycle.promotion_id, company.id, true, null, payment_cycle.period);
									discountsToPass.push(tempPromotion);
								} else {
									let tempPromotion = await lease.addPromotion(connection, payment_cycle.promotion_id, company.id, true, invoicePeriod.start, payment_cycle.period);
									discountsToPass.push(tempPromotion);
								}
							}
						}
					}else if(payment_cycle == null && lease?.id){
						await models.Lease.save(connection, {payment_cycle: null}, lease?.id);
					}
	

					try {
						services = await lease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
						.filter(s => (s.service_type === 'lease' || s.service_type === 'insurance') && ((initialInvoice || s.recurring === 1) || (!s.last_billed && !s.recurring && initialInvoice)) );
						} catch (err) {
							if (err.code !== 409) {
						throw err;
						}
						services = [];
					}

					let lease_bill_day = 1;
					if(lease.bill_day <= invoicePeriod.start.format('D')){
						lease_bill_day = lease.bill_day;
					} else {
						lease_bill_day = invoicePeriod.start.format('D')
					}

					let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
					let invoice = new Invoice({
						lease_id: lease.id,
						user_id: null,
						date: moment(datetime).format('YYYY-MM-DD'),
						due: !initialInvoice ? invoicePeriod.start.clone().date(lease_bill_day).format('YYYY-MM-DD') : invoicePeriod.start.format('YYYY-MM-DD'),
						company_id: company.id,
						type: "manual",
						status: 1,
						created_by: logged_in_user.id,
						apikey_id: api.id 
					});
					invoice.Lease = lease;
					invoice.Company = company;
					
					await invoice.makeFromServices(
						connection,
						services,
						lease,
						invoicePeriod.start.clone(),
						invoicePeriod.end.clone(),
						JSON.parse(JSON.stringify(discountsToPass)),
						company.id,
						should_fetch_discounts,
						{override_prorate: false}
					);

					console.log("Generate move in invoice *****", invoice);
	
					invoices.push(invoice)

					if(!body.dryrun){
						if(!invoice.property_id) await invoice.findPropertyIdByInvoice(connection);
						await invoice.save(connection);
						events.push('invoice_created');

					}

				}
			}
			await connection.commitAsync();
			// e.th(400, "Test");
			for(const invoice of invoices){
				await invoice.total();
				await invoice.calculatePayments();
				await invoice.getOpenPayments(connection);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					invoices: Hash.obscure(invoices, req),
				}
			});


		} catch(err) {
			console.log(err);
			await connection.rollbackAsync();
			next(err);
		}

	});


	/* 
		Activate lease 
x		Set gate access
x		Send Rental Email
x       Register GDS temant
x		Update GDS unit status
x		Dismiss tasks
	*/

	router.post('/:lease_id/finalize', [control.hasAccess(['admin']), joiValidator.body( Schema.finalizeLease ),  control.hasPermission('create_rentals'), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;

		try {
			res.fns.addStep('start');
			let params = req.params;
			let body = req.body;

			body.payment.method = body.payment.method || body.payment.type;

			let company = res.locals.active;
			var logged_in_user = res.locals.contact || {};
			let events = [];
			let payment = {};
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection, company.id);
			await lease.findUnit(connection);
			await lease.getTenants(connection, company.id);
			
			lease.Discounts = [];
			await lease.canAccess(connection, company.id, res.locals.properties);
			if(lease.status === 1) e.th(409, "This lease is already active. Please refresh the page.");
			if (!lease.Tenants.length) e.th(400, "Please add some tenants to this lease");
			res.fns.addStep('getLeaseInfo');
			
			await connection.beginTransactionAsync();
			if(!body.dryrun) {
				await lease.activate(connection, {company, logged_in_user, dryrun: body.dryrun});
				events.push('lease_finalized');
			}

			await Todo.dismissTasks(connection, lease.Tenants[0].contact_id, Enums.EVENT_TYPES_COLLECTION.LEAD, Enums.TASK_TYPE.CONTACT, logged_in_user.id);

			await connection.commitAsync();
			
			utils.send_response(res, {
				status: 200,
				data: {}
			});

			if (!lease.advance_rental || !moment(lease.start_date, 'YYYY-MM-DD').isAfter(moment().utc().format("YYYY-MM-DD"), 'day')) {
				console.log('Setting the Access to tenants with property access => ', lease);
				events.push('set_access_on_lease');
			}
			

			// EMIT ALL THE EVENTS THAT HAPPENED
			events.map(e => {
				let paymentMethod = payment.PaymentMethod;
				let contact = logged_in_user;
				let unit = lease.Unit;
				eventEmitter.emit(e, {company, contact, payment, paymentMethod, lease, unit,  'contact_id': lease.Tenants[0].contact_id,'status': 'Current', cid: res.locals.company_id, locals: res.locals});
			});


		} catch(err) {
			console.log(err);
			console.log(err.stack);
			await connection.rollbackAsync();
			next(err);
		}
	})

	router.put('/:lease_id/checklist-item/:checklist_item_id',  [control.hasAccess(['admin', 'tenant']), joiValidator.body( Schema.updateChecklistItem ), Hash.unHash], async(req, res, next) => {

		try{

			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact;
			let company = res.locals.active;
			var connection = res.locals.connection;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let checklist_item = await lease.updateChecklistItem(connection, body, params.checklist_item_id);

			utils.send_response(res, {
				status: 200,
				data: {
					checklist_item_id: Hashes.encode(params.checklist_item_id, res.locals.company_id)
				}
			});


			eventEmitter.emit('lease_checklist_item_updated', {  contact, company, lease, checklist_item, cid: res.locals.company_id, locals: res.locals});
		} catch(err) {
			next(err);
		}






	});

	router.delete('/:lease_id/checklist-item/:checklist_item_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;

		try{

			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			await lease.deleteChecklistItem(connection, body, params.checklist_item_id);

			utils.send_response(res, {
				status: 200,
				data: {}
			});


			eventEmitter.emit('lease_checklist_item_deleted', {  contact, company, lease, checklist_item_id: params.checklist_item_id, cid: res.locals.company_id, locals: res.locals});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

  router.delete('/:lease_id/checklist-item/:checklist_item_id/upload', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try{

      let params = req.params;
      let body = req.body;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.deleteChecklistUpload(connection, params.checklist_item_id);

      utils.send_response(res, {
        status: 200,
        data: {}
      });


      eventEmitter.emit('lease_checklist_item_deleted', {  contact, company, lease, checklist_item_id: params.checklist_item_id, cid: res.locals.company_id, locals: res.locals});
    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  // No longer in use
	router.post('/:lease_id/checklist-item', [control.hasAccess(['admin']), joiValidator.body( Schema.createChecklistItem ), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;

		try{

			let contact = res.locals.contact;
			let company = new Company(res.locals.active);
			var ip_address = req.ip;
			let body = req.body;
			let params = req.params;


			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let checklist_item = await lease.createChecklistItem(connection, body, company.id, contact, ip_address, res.locals.properties);

			utils.send_response(res, {
				status: 200,
				data: {
					checklist_item_id: Hashes.encode(checklist_item.id, res.locals.company_id)
				}
			});


			eventEmitter.emit('lease_checklist_item_created', {  contact, company, lease, checklist_item, cid: res.locals.company_id, locals: res.locals});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	// router.post('/', [control.hasAccess(['admin']), joiValidator.body( Schema.createLease )], async(req, res, next) => {
  //
  //
  //   var connection = res.locals.connection;
  //
  //   try {
  //     let body = req.body;
  //     let company = res.locals.active;
  //     let contact = res.locals.contact;
  //     let reservation_id = req.body.reservation_id ? Hashes.decode(req.body.reservation_id)[0]: null;
  //
  //
  //     var post_params = {
  //       start_date: body.start_date,
  //       rent: body.rent,
  //       security_deposit: body.security_deposit,
  //       bill_day: body.bill_day,
  //       coupons: body.coupons || [],
  //       insurance_id: body.insurance_id,
  //       discount: body.discount,
  //       promotions: body.promotions,
  //       billed_months: body.additional_months || 0,
  //       hold_token: body.hold_token,
  //       products: body.products || [],
  //       type: 'lease',
  //       save: body.save,
  //       reservation_id: body.reservation_id || null
  //     };
  //
  //
  //     let  unit = new Unit({id: body.unit_id } );
  //     await unit.find(connection)
  //     await unit.verifyAccess(connection, company.id)
  //     await unit.getProduct(connection)
  //     // await unit.getCurrentLease(connection) // TODO get status
  //     // await unit.getNextLeaseStart(connection) // TODO get status
  //     // await unit.getHold(connection) // TODO get status
  //     // await unit.setState(connection) // TODO get status
  //     // await unit.canRent(connection) // TODO get status
  //
  //     let property = new Property({id: unit.property_id});
  //     await property.find(connection)
  //
  //
  //     let { lease, leaseServices, applicationServices, reservationServices } = await unit.buildLease(connection, api, post_params, company.id, reservation, type);
  //
  //   } catch(err){
  //
  //
  //   }
  //
  //       var errors = [];
  //       var lease = {};
  //
	//     var reservation = {};
	//     var promotion = {};
	//     var property = {};
	//     var unit = {};
	//     var template = {};
  //
  //       pool.getConnectionAsync()
	//         .then(function(conn) {
	//             connection = conn;
	//             return connection.beginTransactionAsync();
	//         })
	//         .then(() => {
  //
	// 	        return unit.find(connection)
  //
	// 		        .then(() => unit.verifyAccess(connection, company.id))
  //             .then(()=> unit.getProduct(connection))
  //             .then(()=> unit.getCurrentLease(connection))
  //             .then(()=> unit.getNextLeaseStart(connection))
	// 		        .then(()=> unit.getHold(connection))
	// 		        .then(()=> unit.setState(connection))
	// 		        .then(()=> unit.canRent(moment(body.start_date, 'YYYY-MM-DD'), null, null))
	// 		        .then(() => {
	// 			        property = new Property({id: unit.property_id});
	// 			        return property.find(connection)
	// 		        })
	// 		        .then(() => property.getTemplates(connection, unit.type))
	//         })
	//         .then(() => {
	// 	        lease = new Lease();
  //           lease.unit_id = body.unit_id;
  //           lease.rent = body.rent || null;
  //           lease.security_deposit = body.security_deposit || null;
  //           lease.start_date = body.start_date;
  //           lease.end_date = body.end_date || null;
  //           lease.bill_day = body.bill_day;
  //           lease.promotion_id = body.promotion_id;
  //           lease.send_invoice = body.send_invoice;
  //           lease.notes = body.notes;
  //           lease.code = body.code;
  //           lease.terms = body.terms;
	// 	        lease.status = 2;
	// 	        return lease.save(connection)
  //           }).then(() => {
  //             lease.getTenants(connection)
  //           })
  //
	//         .then(() => {
  //
	//           unit.Product.taxable = property.LeaseTemplates[unit.type].Template.tax_rent;
	//           unit.Product.prorate = property.LeaseTemplates[unit.type].Template.prorate_rent;
	//           unit.Product.prorate_out = property.LeaseTemplates[unit.type].Template.prorate_rent_out;
	//           return unit.buildService(connection, lease, unit.Product, lease.start_date, lease.end_date, lease.rent, 1, unit.Product.prorate, unit.Product.prorate_out, 1, 'lease', 'lease')
  //
	//         })
	//         .then(() => {
	// 	        if(!body.security_deposit) return true;
	//             return models.Product.findSecurityDepositProduct(connection, company.id)
	// 				.then(securityProduct => unit.buildService(connection, lease, securityProduct, lease.start_date, lease.start_date, lease.security_deposit, 1, 0, 0, 0, 'lease', 'lease'))
  //
	//         })
	//         .then(() => {
  //
	//             if(!property.LeaseTemplates[unit.type].Template) return true;
  //
	//             template = property.LeaseTemplates[unit.type].Template;
  //
	//             if(!template.Services) return true;
  //
	//             return Promise.mapSeries(template.Services, function(service){
	// 	            if(service.optional || (service.service_type !== 'lease' && service.service_type !== 'insurance')) return;
  //
	// 	            var s = new Service({
	// 		            lease_id: lease.id,
	// 		            product_id: service.product_id,
	// 		            price: service.price,
	// 		            qty: service.qty,
	// 		            start_date: lease.start_date,
	// 		            end_date: (service.recurring)? null: lease.start_date,
	// 		            recurring: service.recurring,
	// 		            prorate: service.prorate,
	// 		            prorate_out: service.prorate_out,
	// 		            service_type: service.service_type,
	// 		            taxable: service.taxable,
	// 		            name: service.name
	// 	            });
  //
	// 	            if( service.service_type === 'lease'){
	// 		            s.name = service.Product.name;
  //
	// 	            } else if(service.service_type === 'insurance'){
	// 		            s.name = service.Insurance.name;
	// 	            }
	// 	            return s.save(connection);
	//             });
  //
	//         })
	//         .then(function() {
  //
	// 	        if(!template.Checklist) return true;
  //
	// 	        return Promise.mapSeries(template.Checklist, t => {
  //
	// 		        var save = {
	// 			        lease_id: lease.id,
	// 			        checklist_item_id: t.id,
	// 			        name: t.name,
	// 			        document_type_id: t.document_type_id,
	// 			        document_id: t.document_id,
	// 			        description: t.description,
	// 			        completed: 0,
	// 			        sort: t.sort
	// 		        };
	// 		        return models.Checklist.saveItem(connection, save)
	// 	        })
	//         })
	//         .then(function() {
  //
	// 	        if(!lease.end_date) return true;
	// 	        if (moment(unit.available_date) < moment(lease.end_date)) {
	// 		        return unit.save(connection, { available_date: lease.end_date});
	// 	        }
	// 	        return true;
  //           })
	//         .then(function() {
  //
	// 	        // // If Application_id is set, save the user as well.
	// 	        // if(!body.application_id) return true;
	// 	        // var tenant_id = '';
	// 	        //
	// 	        // var application = new Application({id: body.application_id});
	// 	        // return application.find(connection, company.id).then(function(status) {
	// 	        //
	// 		     //    if (!status) throw application.msg;
	// 		     //    return application.accept(connection, lease.id);
	// 	        // });
  //
  //           })
	//         .then(function() {
  //
	// 	        // // If lead_id is set, save the user as well.
	// 	        // if(!body.lead_id) return true;
	// 	        // var lead = new Lead({id: lead_id});
	// 		     //    console.log("lead", lead);
	// 	        // return lead.find(connection, company_id).then(function(status) {
	// 		     //    if (!status) throw lead.msg;
	// 		     //    return lead.convert(connection, lease.id);
	// 	        // });
  //
  //           })
	//         .then(function() {
	// 	        // if(!user_id) return;
	// 	        //
	// 	        // var user = new User({id: user_id});
	// 	        // var tenant = {};
	// 	        // return user.find(connection).then(function(status) {
	// 		     //    if (!status) throw user.msg;
	// 	        //
	// 		     //    if(user.Tenant.id) {
	// 	        //
	// 				// 	tenant = new Tenant({id: user.Tenant.id});
	// 			 //        return tenant.find(connection);
	// 	        //
	// 		     //    } else {
	// 	        //
	// 				// 	tenant = new Tenant({
	// 				// 		User: user,
	// 				// 		user_id: user.id,
	// 				// 		first: user.first,
	// 				// 		last: user.last,
	// 				// 		phone: user.phone
	// 				// 	});
	// 	        //
	// 				// 	return tenant.save(connection);
	// 		     //    }
	// 	        // }).then(function() {
	// 	        //
	// 		     //    return models.Lease.AddTenantToLease(connection, tenant.id, lease.id);
	// 	        // });
	// 	        return true;
  //           })
	//         .then(function() {
	// 	        var activity = new Activity();
	// 	        return activity.create(connection,company.id,contact.id, 9, 18, lease.id);
	//         })
	//         .then(() => connection.commitAsync())
	//         .then(function() {
  //
	//             utils.send_response(res, {
	//                 status: 200,
	//                 data: {
	// 	                lease_id: Hashes.encode(lease.id)
	//                 }
	//             });
  //
  //       })
  //       .then(() => utils.saveTiming(connection, req, res.locals)).then(()=>{
  //         eventEmitter.emit(e, {company, contact, 'contact_id': lease.Tenants[0].contact_id,'status': 'Pending', locals: res.locals});
  //       })
  //       .catch(err => {
	//         return connection.rollbackAsync().then(() => next(err));
  //       })
  //       .finally(() => utils.closeConnection(pool, connection))
  //   });

  	router.put('/:lease_id/close',[control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;

		try {

		let contact = res.locals.contact || {};
		let company = new Company(res.locals.active);
		let body = req.body;
		let params = req.params;
		let status = '';

		let lease = new Lease({id: params.lease_id});
		await lease.find(connection);
		await lease.canAccess(connection, company.id, res.locals.properties);
		await lease.getProperty(connection, company.id, res.locals.properties, contact.id, ['move_out_lease']);

		if(lease.end_date && moment(lease.end_date, 'YYYY-MM-DD') < moment().endOf('day')){
			e.th(409, "this lease is already closed");
		}

		await lease.findUnit(connection);
		await lease.getTenants(connection);

		await connection.beginTransactionAsync();

		await lease.close(connection, body.moved_out, contact.id);

		//await lease.Unit.save(connection, { available_date: body.available_date || moment().format('YYYY-MM-DD') });

		lease.Unit.update({status: 0})
		await lease.Unit.save(connection);
		
		// INC 1784 Remove Autocharges;
		await lease.removeAutoCharges(connection);

		let over_lock_move_out = [...Enums.EVENT_TYPES_COLLECTION.MOVE_OUT, ...Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, ...[Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL]];
		await Todo.dismissTasks(connection, params.lease_id, over_lock_move_out, Enums.TASK_TYPE.LEASE, contact.id);

		let invoices = await lease.findFutureUnpaidInvoices(connection, body.moved_out);
		for (let i = 0; i < invoices?.length; i++) {
			let invoice = new Invoice({ id: invoices[i].id });
			await invoice.find(connection);
			await invoice.void_invoice(connection, res.locals.contact);
		}

		// duplicate call, why is this being called twice?
		//await Lease.setAccessOnLease(connection, lease.id);
		await connection.commitAsync();

		await Lease.setAccessOnLease(connection, lease.id);

			utils.send_response(res, {
			status: 200,
			data: {
			lease_id: Hashes.encode(lease.id, res.locals.company_id)
			}
		});

		} catch(err) {
		await connection.rollbackAsync();
		next(err);
		}
	});

//  //admin for testing only singluar is api.... plural is App
	router.post('/:lease_id/tenant', [control.hasAccess(['api','admin']), joiValidator.body( Schema.createTenant ), Hash.unHash], async(req, res, next) => {

		try{

		  var connection = res.locals.connection;
			let api = res.locals.api;
			let user = res.locals.contact
			let company = res.locals.active;
			let body = req.body;
			let params = req.params;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			await connection.beginTransactionAsync();
			let tenant = await lease.addTenant(connection, body, company.id);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					tenant_id: Hashes.encode(tenant.id, res.locals.company_id)
				},
			});

			eventEmitter.emit('tenant_created', { user, api, company, lease, tenant, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}






		//
		// var params =  req.params;
		// var body =  req.body;
		//
		// // var contact_id =  Hashes.decode(req.body.contact_id)[0];
		// // var application_id =  (req.body.application_id)? Hashes.decode(req.body.application_id)[0]: null;
		// var company = res.locals.active;
		// var user = res.locals.contact || {};
		// var api = res.locals.api || {};
		// var connection;
		// var lease = {};
		// var contact = {};
		// var tenant_id = null;
		//
		// pool.getConnectionAsync()
		// 	.then(conn => {
		// 		connection = conn;
		// 		lease = new Lease({id: params.lease_id});
		// 		return lease.find(connection)
		// 	})
		// 	.then(() => lease.canAccess(connection, company.id))
		// 	.then(() => {
		// 		if(!body.contact_id) {
		// 			contact = new Contact();
		// 			contact.company_id = company.id;
		// 			// return contact.findDuplicateTenant(connection, body.email, company.id);
		// 			return true;
		// 		}
		//
		// 		contact = new Contact({ id: body.contact_id });
		// 		return contact.find(connection, company.id)
		// 			.then(() =>  contact.verifyUniqueTenantOnLease(connection, params.lease_id))
		//
		// 	})
		//
		// 	.then(() => connection.beginTransactionAsync())
		// 	.then(() => {
		// 		contact.update(body)
		// 		return contact.save(connection);
		// 	})
		// 	.then(() => models.Lease.AddTenantToLease(connection, contact.id, params.lease_id))
		// 	.then(saveRes => {
		// 		tenant_id = saveRes;
		// 		var activity = new Activity();
		// 		if(api.id){
		// 			return activity.createApi(connection,company.id,api.id,2,33, tenant_id);
		// 		} else {
		// 			return activity.create(connection,company.id,user.id,2,33, tenant_id);
		// 		}
		// 	}).then(() => connection.commitAsync())
		// 	.then(() => {
		// 		utils.send_response(res, {
		// 			status: 200,
		// 			data: {
		// 				tenant_id: Hashes.encode(tenant_id)
		// 			}
		// 		});
		// 	})
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// 	.catch(function(err){
		// 		return connection.rollbackAsync().then(() => next(err));
		// 	})
		// 	.finally(() => utils.closeConnection(pool, connection))

	})

  // admin for testing only
	router.post('/:lease_id/payment', [control.hasAccess(['api', 'admin']), joiValidator.body( Schema.createPayment), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;
		try{
			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact || {};
			let company = res.locals.active;
			var api = res.locals.api || {};

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection, company.id, res.locals.properties);
			await lease.getTenants(connection);
			await lease.findOpenInvoices(connection);
			var contact_id = null;
			if(body.PaymentMethod.contact_id){
				if(!lease.Tenants.find(t => t.Contact.id == body.PaymentMethod.contact_id)) e.th(400, "Invalid contact")
				contact_id = body.PaymentMethod.contact_id;
			} else{
				contact_id = lease.Tenants[0].Contact.id;
			}

			var type = body.PaymentMethod ? body.PaymentMethod.type: null;
      		type = type ? type : body.method;
			let paymentMethod = await lease.Property.getPaymentMethod(connection, type, body.payment_method_id);
			if(!paymentMethod.contact_id) paymentMethod.contact_id = contact_id;
			if(!paymentMethod.property_id) paymentMethod.property_id = lease.Property.id;
      		paymentMethod.lease_id = lease.id;
			if(body.PaymentMethod){
					body.PaymentMethod.lease_id = lease.id;
			}
			// set data

			if(paymentMethod.id) {
				await paymentMethod.validateNonce(body.nonce);
			} else {

				await paymentMethod.setData(connection, body.PaymentMethod, lease.rent);

					await paymentMethod.save(connection, company.id);
					if(paymentMethod.save_to_account && paymentMethod.auto_charge){
						await lease.setAsAutoPay(connection, paymentMethod);
					}
			}

			let payment = new Payment();

			let data = body;
      data.amount = Math.round(body.payment_amount * 1e2) / 1e2;
      data.ref_name = paymentMethod.name_on_card;
      data.method = paymentMethod.type;
      data.lease_id = lease.id;
	  data.property_id = lease.Property.id;
	  data.contact_id = contact_id;

      try {
        await connection.beginTransactionAsync();
        await payment.create(connection, data, paymentMethod, body.source || 'e-commerce', contact.id);
        await payment.charge(connection, company.id, false, contact );
        await connection.commitAsync();
      } catch(err){
        await connection.rollbackAsync();
        throw err;
      }
      if(payment.status_desc.toLowerCase() === "partially approved"){
        e.th(400, "This payment was only  authorized for $" + payment.amount.toFixed(2) + ' and has been voided');
      }

      if(payment.status_desc.toLowerCase() === "declined"){
        e.th(400, "This payment has been declined");
      }

      await payment.getPaymentApplications(connection);
      payment.getTotalApplied();

      if(payment.payment_remaining){
        // TODO this could be refactored
        if(payment.source === 'e-commerce'){  // Or other auto apply flag
          await payment.autoApplyToInvoices(connection, lease.OpenInvoices);
        } else if(body.invoices && body.invoices.length) {
          await payment.applyToInvoices(connection, body.invoices);
        }
      }

			utils.send_response(res, {
				status: 200,
				data: {
					payment_id: Hashes.encode(payment.id, res.locals.company_id),
					payment_method_id: Hashes.encode(paymentMethod.id, res.locals.company_id),
          payment_amount: payment.amount,
          payment_status_desc: payment.status_desc
				}
			});

			let events = ['payment_created'];

			events.map(e => {
        eventEmitter.emit(e, { contact, company, api, lease, payment, paymentMethod, invoices: lease.OpenInvoices, 'invoice_leases': [lease], 'user': contact, property_id: lease.Property.id, cid: res.locals.company_id, locals: res.locals});
			});



		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.post('/:lease_id/paypal-payment-create', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;

		try{
			let contact = res.locals.contact || {};
			let company = res.locals.active;
			let params = req.params;
			let body = req.body;
			let api = res.locals.api || {};


			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let p = await models.Property.findByLeaseId(connection, lease.id);
			let property = new Property({id: p.id});
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			let paypal = await property.getPaymentMethod(connection, 'paypal');

			let payment = await  paypal.createPayment(connection, body.amount, company.id);

			utils.send_response(res, {
				status: 200,
				data: payment
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});
  /* not in use: Commenting until needed.  Change db methods when in use again */

  /* convenience function to add a payment method for who ever is on the lease. */
	router.post('/:lease_id/payment-methods', [control.hasAccess(['admin','api','tenant']), joiValidator.body( Schema.createPaymentMethod), Hash.unHash], async (req, res, next) =>{

		var connection = res.locals.connection;

		try{
			let contact = res.locals.contact || {};
			let company = res.locals.active;
			let params = req.params;
			let body = req.body;
			let api = res.locals.api || {};

			body.save_to_account = true; // we are saving so it be set to true
			if(contact.id){
					body.source = "Telephone/Moto"; // we are saving set to
			} else {
					body.source = "Internet"; // we are saving set to
			}

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			lease.isActiveLease();
			await lease.canAccess(connection, company.id);
			await lease.getTenants(connection);

			await lease.getProperty(connection, company.id, res.locals.properties);

			body.property_id = lease.Unit.property_id;

			if(!body.contact_id) {
				if(lease.Tenants.length){
				body.contact_id = lease.Tenants[0].contact_id;
				} else {
				e.th(403, "Please include a contact id");
				}
			}
			let c = new Contact({id: body.contact_id});
			await c.find(connection);

			await connection.beginTransactionAsync();
			let paymentMethod = await c.getPaymentMethod(connection, lease.Property, null, body.type, body.source, body, true);
			if(!paymentMethod.active) e.th(409,'Payment method could not be saved.  Make sure this payment method does not already exist on this account.');

			//Gds is sending request to autopay endpoint seperately. So, calling the below method is redundant.
			// if(paymentMethod.auto_charge){
			//   await lease.setAsAutoPay(connection, paymentMethod);
			// }

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					paymentMethod: Hash.obscure(paymentMethod, req)
				}
			});

			let events = ['payment_method_created'];
			events.map(e => {
				eventEmitter.emit(e, { contact, company, api, lease, paymentMethod, property_id: body.property_id, cid: res.locals.company_id , locals: res.locals});
			});



		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.put('/:lease_id/payment-methods/:payment_method_id/autopay', [control.hasAccess(['admin','tenant','api']), Hash.unHash] , async(req, res, next) => {
		try{
			var connection = res.locals.connection;
			let params = req.params;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let adminReq = req.headers['authorization']? true : false;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);

			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection);
			await lease.getTenants(connection);

			let unit = new Unit({id: lease.unit_id});
			await unit.find(connection);


			let payment_method = new PaymentMethod({id: params.payment_method_id });
			await payment_method.find(connection);
			await payment_method.verifyAccess(connection, company.id, res.locals.properties);

			if(lease.Property.id !== payment_method.property_id){
			  e.th(409, "This payment method is not valid on this property")
      }
      if(!lease.Tenants.find(t => t.contact_id === payment_method.contact_id)){
			  e.th(409, "This person is not on the lease you are trying to set auto pay for")
      }

			await lease.setAsAutoPay(connection, payment_method);
			var Ids= [
				{
				"facility": Hashes.encode(unit.property_id, res.locals.company_id),
				"spaces": [Hashes.encode(unit.id, res.locals.company_id)],
				"pmstype": "leasecaptain",
			}
			];

			utils.send_response(res, {
				status: 200,
				data: {}
			});
			
			if(adminReq){
				try{
					var gds_tenant = await tenantOnBoarding(Hashes.encode(lease.Tenants[0].id, res.locals.company_id), Hashes.encode(unit.property_id, res.locals.company_id));
					var mapped_ids = await getGDSMappingIds(Ids);
					var auto_pay = await autoPay(connection, company.id, mapped_ids, unit.number, gds_tenant);
				}catch(err){
					console.log(err)
				}
			}



			let events = ['payment_method_autopay'];
			events.map(e => {
				eventEmitter.emit(e, { contact, company, lease, payment_method, property_id: unit.property_id, cid: res.locals.company_id, locals: res.locals});
			});
		} catch(err) {
			next(err);
		}


	});

	router.delete('/:lease_id/payment-methods/autopay', [control.hasAccess(['admin','tenant','api']), Hash.unHash] , async(req, res, next) => {

		try{
			var connection = res.locals.connection;
			let params = req.params;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			await lease.removeAutoCharges(connection);
			await lease.getProperty(connection);

			utils.send_response(res, {
				status: 200,
				data: {}
			});



			let events = ['delete_lease_autopay'];
			events.map(e => {
				eventEmitter.emit(e, { contact, company, lease, property_id: lease.Property.id, cid: res.locals.company_id, locals: res.locals});
			});
		} catch(err) {
			next(err);
		}




	});

	router.put('/:lease_id/payment-methods/autopay', [control.hasAccess(['admin','tenant']), joiValidator.body( Schema.autopay ), Hash.unHash] , async(req, res, next) => {

		try{

			var connection = res.locals.connection;
			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let paymentMethods = body.payment_methods;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection);

			let total_rent = paymentMethods.reduce((a,b) => a + +b.rent, 0);
			let total_utilities = paymentMethods.reduce((a,b) => a + +b.utilities, 0);

			if(total_rent === 0 && total_utilities === 0){
				await lease.removeAutoCharges(connection);

			} else {

				if(total_rent != lease.rent){
					e.th(400, "$" + total_rent + ' on payment methods does not equal lease rent of $' + lease.rent);
				}

				if(total_utilities != 100){
					e.th(400, "Utilities do not equal 100: " + total_utilities);
				}
			}

			for(let i =0; i < paymentMethods.length; i++){
				let pm = new PaymentMethod({id: paymentMethods[i].id});
				await pm.find(connection);

				if(pm.property_id !== lease.Property.id) e.th(403, "Invalid parameters");

				// TODO Should we limit payment methods to only tenants on the lease? Maybe for now..
				let rent = paymentMethods[i].rent > 0 ? paymentMethods[i].rent / lease.rent  * 100 : null;
				let utilities = paymentMethods[i].utilities > 0 ?  paymentMethods[i].utilities: null;
				await pm.updateSplits(connection, rent, utilities);
			}

			utils.send_response(res, {
				status: 200,
				data: {}
			});


			let events = ['payment_method_autopay'];
			events.map(e => {
        eventEmitter.emit(e, { contact, company, lease, property_id: lease.Property.id, cid: res.locals.company_id, locals: res.locals});
			});

		} catch(err) {
			next(err);
		}



	});

	router.delete('/:lease_id/payment-methods/:payment_method_id',[control.hasAccess(['admin', 'tenant']), Hash.unHash], async(req, res, next) => {


		try{
			var connection = res.locals.connection;
			let params = req.params;
			let contact = res.locals.contact;
			let company = res.locals.active;


			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.findPaymentMethods(connection);

			let p = await models.Property.findByLeaseId(connection, params.lease_id);
			let property = new Property(p);
			// await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			let paymentMethod = await property.getPaymentMethod(connection, null, params.payment_method_id)

			if(!paymentMethod.id) e.th(404, "Payment method not found.");

			// TODO: Ask jeff if this is still required, as not payment_mehtods are configured against contact instead of lease
			// if(paymentMethod.lease_id !== lease.id) e.th(403, "Invalid parameters");
			// if(paymentMethod.auto_charge){
			// 	e.th(409, "This payment method is set up for auto pay. Please remove autopay and try again.");
			// };

			var autoCharge = await models.Payment.findPaymentMethodsByLeaseId(connection, lease.id);
			if(autoCharge && autoCharge.length > 0 && autoCharge.filter(a => a.payment_method_id == paymentMethod.id).length > 0){
				e.th(409, "This payment method is set up for auto pay. Please remove autopay and try again.");
			}

			// TODO check for last payment method 
			if(!contact.roles.includes('admin') && !lease.PaymentMethods.filter(pm => pm.id !== paymentMethod.id).length ){
				e.th(409, "You cannot remove the last payment method on the lease");
			}

			await paymentMethod.remove(connection, company.id );


			utils.send_response(res, {
				status: 200,
				data: {}
			});



			let events = ['payment_method_deleted'];
			events.map(e => {
        eventEmitter.emit(e, { contact, company, lease, paymentMethod, property_id: property.id, cid: res.locals.company_id, locals: res.locals});
			});

		} catch(err) {
			next(err);
		}



	});

	router.get(':lease_id/activity',[control.hasAccess(['admin','tenant']), Hash.unHash], async(req, res, next) => {


	    try{

		    let params = req.params;

		    let company = res.locals.active;
		    var connection = res.locals.connection;

		    let lease = new Lease({id: params.lease_id});
		    await lease.find(connection);
		    await lease.canAccess(connection, company.id, res.locals.properties);

		    // TODO implement this route

		    let activity = [];

		    utils.send_response(res, {
			    status: 200,
			    data: {
				    activity: Hash.obscure(activity, req)
			    }
		    });



	    } catch(err) {
		    next(err);
	    }



    });

    // router.delete('/:lease_id/tenant',[control.hasAccess(['admin']), function(req, res, next) {
    //
	 //    var body = req.body;
    //     var contact;
    //     var lease;
    //     var connection ={};
    //     var company = res.locals.active;
    //     var user = res.locals.contact;
    //
    //     pool.getConnectionAsync()
	 //        .then(function(conn) {
    //             connection = conn;
    //
		//         contact = new Contact({ id: body.tenant_id });
		//         return contact.find(connection, company.id);
    //
	 //        })
	 //        .then(function(){
    //
		//         lease = new Lease({id: body.lease_id });
		//         return lease.find(connection);
    //
	 //        })
	 //        .then(() => lease.canAccess(connection, connection))
	 //        .then(() => models.Lease.RemoveTenantFromLease(connection, contact.id, lease.id ))
		//     .then(() => {
		// 	    var activity = new Activity();
		// 	    return activity.create(connection,company.id,user.id,4,33, contact.id);
    //
		//     }).then(() => {
	 //            utils.send_response(res, {
	 //                status: 200,
	 //                data: {}
	 //            })
	 //        })
	 //        .catch(next)
	 //        .finally(() => utils.closeConnection(pool, connection))
    //
    // });

  router.delete('/:lease_id',[control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


	    var connection = res.locals.connection;

	    try{
		    let params = req.params;

		    let company = res.locals.active;
		    let contact = res.locals.contact || {};
		    let lease = new Lease({id: params.lease_id});
		    await lease.find(connection);
			await lease.findUnit(connection);
		    await lease.canAccess(connection, company.id, res.locals.properties)

			await lease.getProperty(connection);
			await lease.Property.getAccessControl(connection);

		    await connection.beginTransactionAsync();
			await lease.deleteLease(connection, company, contact.id);
			if(lease.Property.Access.access_name.toLowerCase() === 'derrels'){
				await lease.Property.Access.updateSpaceCode(lease.Property.id, lease.unit_id, null);
				await lease.Property.Access.updateCatches(lease.unit_id, {soft_catch: 0, late_catch: 0, hard_catch: 0});
			}
			await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.RESERVATION, Enums.TASK_TYPE.LEASE, contact.id);
		    await connection.commitAsync();

		    let activity = [];

		    utils.send_response(res, {
			    status: 200,
			    data: {}
		    });


			eventEmitter.emit('lease_deleted', {  contact, company, lease, cid: res.locals.company_id, locals: res.locals});

	    } catch(err) {
		    await connection.rollbackAsync();
		    next(err);
	    }



    });

	router.get('/:lease_id/payment-method-options/',[control.hasAccess(['admin', 'tenant']), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;

		try{

			let params = req.params;

			let company = res.locals.active;
			let contact = res.locals.contact;
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let p = await models.Property.findByLeaseId(connection, params.lease_id);
			let property = new Property({id: p.id});
			await  property.find(connection);

			await property.getConnections(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					connections: property.Connections.map(c =>  {
						return {
							type: c.type,
							name: c.name,
							config: c.config
						}
					})
				}
			});




		} catch(err) {
			next(err);
		}



	})

  router.get('/:lease_id/invoices/:type',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try{

      let params = req.params;

      let company = res.locals.active;
      let contact = res.locals.contact;

      var options = {
        limit: req.query.limit || null,
        offset: req.query.offset || 0
      };

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);



      if(params.type === "past-due"){
        await lease.getPastDueInvoices(connection);
      } else if(params.type === "unpaid") {
        await lease.findOpenInvoices(connection);
      }
	  let invoices = params.type === 'past-due'? lease.PastDue: lease.OpenInvoices;
      console.log("R:leases/invoice-type: Invoices: ", invoices);

      utils.send_response(res, {
        status: 200,
        data: {
          invoices: Hash.obscure(invoices, req)
        }
      });

     //

    } catch(err) {
      next(err);
    }




        // var connection;
        // var company = res.locals.active;
        // var params = req.params;
        // var invoice;
        //
        // var options = {
        //     limit: req.query.limit || null,
        //     offset: req.query.offset || 0
        // };
        //
        // pool.getConnectionAsync()
	      //   .then(function(conn) {
		    //     connection = conn;
        //
		    //     if(params.type == "past-due"){
	      //           return models.Invoice.findPastDueByLease(connection, params.lease_id);
        //
		    //     } else if(params.type == "unpaid") {
	      //           return models.Invoice.findUnpaidByLease(connection, params.lease_id);
		    //     }
		    //     e.th(404);
        //
	      //   }).mapSeries(function(inv){
        //
	      //       invoice = new Invoice({ id: inv.id });
	      //       return invoice.find(connection)
		    //         .then(() => invoice.verifyAccess(connection, company.id, res.locals.properties))
		    //         .then(() => invoice.total())
		    //         .then(() => invoice);
        //
	      //   }).then(function(invoiceList){
	      //       utils.send_response(res, {
	      //           status: 200,
	      //           data: {
	      //               invoices: Hash.obscure(invoiceList, req)
	      //           }
	      //       });
        //     })
	      //   .then(() => utils.saveTiming(connection, req, res.locals))
	      //   .catch(next)
	      //   .finally(() => utils.closeConnection(pool, connection))
    });

	// admin for testing only
  /* TODO:  Refactor */
	router.post(['/:lease_id/invoices', '/:lease_id/invoices/calculate'], [control.hasAccess(['api','admin']), joiValidator.body( Schema.createInvoice), Hash.unHash], function(req, res, next) {

		var body = req.body;
		var contact = res.locals.contact || {};
		var api = res.locals.api || {};
		var params = req.params;
		var company = res.locals.active;
		var invoice;
		var lease;
		var qb;
		var discounts = [];

    var connection = res.locals.connection;
    if(!body.Lines || !body.Lines.length) e.th(400, "This invoice is empty");
    return connection.beginTransactionAsync()
      .then(() => {
				lease = new Lease({id: params.lease_id});
				return lease.find(connection);
			})
			.then(() => lease.canAccess(connection, company.id, res.locals.properties))
			.then(() => {return lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')})
			.then((datetime) => {
				// get next invoice number
				var today = moment();
				invoice = new Invoice({
					lease_id: params.lease_id,
					date: req.body.date || moment(datetime).format('YYYY-MM-DD'),
					due: req.body.due ||  moment(datetime).format('YYYY-MM-DD'),
					company_id: company.id,
					period_start: today.format('YYYY-MM-DD'),
					period_end: today.endOf('day').format('YYYY-MM-DD'),
					type: 'manual',
					created_by: contact.id,
					apikey_id: api.id
				});
				return models.Promotion.findActiveDiscounts(connection, invoice.lease_id, invoice.due).map(function(d){
					var discount = new Discount({
						id: d.id
					});
					return discount.find(connection).then(function(){
						discounts.push(discount);
						return true;
					});
				})

			})
			.then(() => lease.getProperty(connection, company.id, res.locals.properties))
			.then(() => {
				var invoice_line = {};
				return Promise.mapSeries(body.Lines, function(line){
					return Promise.resolve().then(()=> {
						invoice_line = new InvoiceLine();
						invoice_line.product_id = line.product_id;
						invoice_line.date = invoice.date;

						// invoice_line.discount_id = line.discount_id;
						// invoice_line.service_id = line.service_id;
						// get service, and product info

						// invoice_line.type = line.type || null;
						invoice_line.qty = line.qty;
						invoice_line.start_date = invoice.period_start;
						invoice_line.end_date = invoice.period_end;

						return invoice_line.make(connection, discounts, company.id, params.lease_id, lease.unit_id, lease.Property.id)
							.then(() => invoice.addLine(invoice_line))
					});
				});

			})
			.then(() => {

				if(req.url.includes("calculate")){
					return invoice.total().then(() => {
						utils.send_response(res, {
							status: 200,
							data:{
								invoice: Hash.obscure(invoice, {
									baseUrl: '/v1/leases',
									method: 'post',
									route: {
										path: '/:lease_id/invoices/calculate',
									},
                  company_id: req.company_id
								})
							}
						});
					})

				} else {
					return invoice.save(connection)
						.then(() =>{
							var activity = new Activity();
							if(api.id){
								return activity.createApi(connection,company.id,api.id,2,41, invoice.id);
							} else{
								return activity.create(connection,company.id,contact.id,2,41, invoice.id);
							}
						})
						.then(() => connection.commitAsync())
						.then(function(){
							utils.send_response(res, {
								status: 200,
								data:{
									invoice_id: Hashes.encode(invoice.id, res.locals.company_id)
								}
							});

						})
				}
			})
			.catch(function(err){
				return connection.rollbackAsync().then(() => next(err));
			})


	});

  router.post('/:lease_id/invoices/write-off', [control.hasAccess(['admin','api','tenant']), control.hasPermission('write_off'), Hash.unHash], async (req, res, next) =>{

    var connection = res.locals.connection;
    try{
      let contact = res.locals.contact || {};
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;
      let api = res.locals.api || {};

      if(!body.invoices || !body.invoices.length) e.th(400, "You have not included any invoices to write off.")

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getProperty(connection, company.id, res.locals.properties, contact.id, ['write_off'], api);
      let invoices = [];
      for(let i = 0; i < body.invoices.length; i++){
        let invoice = new Invoice({ id: body.invoices[i].invoice_id });
        await invoice.find(connection);
        await invoice.verifyAccess(connection, company.id, res.locals.properties);
        await invoice.total(connection);

        invoices.push({
          id: invoice.id,
          amount: invoice.balance
        });

      }

      let balance = Math.round(invoices.reduce((a,b) => a + b.amount, 0)* 1e2) / 1e2;

      if(balance < Number(body.amount).toFixed(2)) e.th(409, "You are trying to write off $" + Number(body.amount).toFixed(2) + ", but there is only $" + Number(balance).toFixed(2) + " due.");

      await connection.beginTransactionAsync();

      let payment = new Payment({
        amount: balance,
        method: 'loss',
        credit_type: 'loss',
        source: 'account',
        date: moment().format('YYYY-MM-DD'),
        lease_id: lease.id,
        status: 1,
        status_desc: 'Success',
        notes: body.notes,
        contact_id: body.contact_id,
		property_id: lease.Property.id,
		accepted_by: contact.id,
      });

      await payment.save(connection);
      await payment.getPaymentApplications(connection);
      await payment.applyToInvoices(connection, invoices);

      // e.th(400, "test");
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });

    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }


  });

  router.get('/:lease_id/status',[control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
	var connection = res.locals.connection;
	try{
		let params = req.params;
		
		let lease = new Lease({id: params.lease_id});
		await lease.find(connection);
		utils.send_response(res, {
			status: 200,
			data: {
			lease: Hash.obscure(lease, req)
			}
		});
	}
	catch(err){
		next(err);
	}
  });

	router.get('/:lease_id',[control.hasAccess(['admin','api','tenant']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;
		try{
			let params = req.params;
			let query = req.query;

			let company = res.locals.active;
			let contact = res.locals.contact;
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			if(!lease.status) e.th(404, "Lease not found");
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.findUnit(connection);
			await lease.getTenants(connection);
			await lease.getCurrentBalance(connection, query.source);
			await lease.getStanding(connection);
			await lease.getActiveRent(connection); // This is to get latest rent of lease
			await lease.findAllDiscounts(connection);
			await lease.getPaidThroughDate(connection);
			await lease.getMetrics(connection);
			await lease.findRentPlanByLeaseId(connection);
			await lease.findRentChange(connection);
			await lease.getNextRentChange(connection);
			await lease.getLastRentChange(connection);
			await lease.getActivePaymentCycle(connection);
			await lease.getStoredContents(connection);
			await lease.getTransferredUnitInfo(connection);
			await lease.getActivePaymentCycle(connection);
			await lease.getMoveInData(connection);

			let insuranceService = await lease.findActiveInsuranceService(connection);
			if(insuranceService){
				lease.InsuranceService = insuranceService;
			}

			utils.send_response(res, {
				status: 200,
				data: {
				lease: Hash.obscure(lease, req)
				}
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
		// var params = req.params;
		// var company = res.locals.active;
		// var connection, unit, lease, property;
    //
    //
		// pool.getConnectionAsync()
		// 	.then(function(conn){
		// 		connection = conn;
		// 		lease = new Lease({id: params.lease_id});
		// 		return lease.findActive(connection);
		// 	})
		// 	.then(() => lease.canAccess(connection, company.id))
		// 	.then(() => lease.findUnit(connection))
		// 	.then(() => lease.getTenants(connection))
		// 	.then(() => lease.getCurrentBalance(connection, company.id))
		// 	.then(() => {
		// 		utils.send_response(res, {
		// 			status: 200,
		// 			data: {
		// 				lease: Hash.obscure(lease, req)
		// 			}
		// 		});
		// 	})
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// 	.catch(next)
		// 	.finally(() => utils.closeConnection(pool, connection))
	});

	/* Endpoint returns all leases from a particular company */
	router.get('/', [control.hasAccess(['admin', 'api', 'tenant']), Hash.unHash], async (req, res, next) => {
		
		
		try {
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
			var connection = res.locals.connection;
		  
			let query = req.query;
		  let searchParams = {};
	  
		  let company = res.locals.active;
		  let isConcise = !!query.concise;
		  let { limit, offset } = { ...utils.cleanQueryParams(query, { limit: 200 }, isConcise) };

		  searchParams.limit = limit || 200;
		  searchParams.offset = offset || 0;
		  searchParams.from_date = query.from_date || "";
		  searchParams.to_date = query.to_date || "";
		  searchParams.status = query.status || "active";
		  searchParams.property_id = query.property_id || res.locals.properties;

		  if (query.property_id) {
			let property = new Property({id: query.property_id});
			await property.find(connection);
			await property.verifyAccess({company_id:company.id, properties: res.locals.properties});
		  }

		  let count = 0
		  let totalLeases = []
		  if (searchParams.to_date) {
			if (!searchParams.from_date) e.th(400, 'Required from date (YYYY-MM-DD)');
		  }
		  if (Number.isInteger(parseInt(searchParams.limit)) && Number.isInteger(parseInt(searchParams.offset))) {
			count = await Lease.findAll(connection, company.id, searchParams, true);
			if ('concise' in query) {
				totalLeases = await Lease.getConciseLeaseInfo(connection, company.id, searchParams)
			} else {
				totalLeases = await Lease.findAll(connection, company.id, searchParams, false);
				const leaseIds = totalLeases.map((l) => l.id);
				if (leaseIds?.length) {
					totalLeases = await Lease.getAllLeaseInfo(connection, leaseIds, searchParams.property_id);
				}
			}
        // encrypting for paging
        if (query.property_id) {
          if (Array.isArray(query.property_id) && query.property_id.length) {
            searchParams.property_id = query.property_id.map(x => Hashes.encode(x, company.id));
          } else {
            searchParams["property_id"] = Hashes.encode(query.property_id, company.id)
			}
        } else {
          searchParams.property_id = ''
        }
  
			const paging = utils.generatePagingObject(req, { limit, offset }, count, totalLeases.length, isConcise);
		  
			  utils.send_response(res, {
			  status: 200,
				data: {
				  leases: Hash.obscure(totalLeases, req),
				  paging
			  }
			  });
		  } else e.th(400, 'Limit and Offset must be integers');
	  
		} catch (err) {
		  await connection.rollbackAsync();
		  next(err);
		  }
	  });

	router.get('/:lease_id/tenants',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) =>  {

    var connection = res.locals.connection;

    try {
		let api = res.locals.api;
      let params = req.params;
      let company = res.locals.active;
      let lease = new Lease({id: params.lease_id});
	  await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties)
      await lease.getTenants(connection, api);

      for (let i = 0; i < lease.Tenants.length; i ++){
        await lease.Tenants[i].Contact.getStatus(connection, res.locals.properties);
        await lease.Tenants[i].Contact.getRelationships(connection);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          tenants: Hash.obscure(lease.Tenants, req)
        }
      });



    } catch(err) {
      next(err);
    }



	});

	router.post('/:lease_id/tenants', [control.hasAccess(['admin','api']), joiValidator.body( Schema.createTenantAdmin), Hash.unHash],  async(req, res, next) => {
		var connection = res.locals.connection;

		try {

			let params = req.params;
			let body = req.body;
			let company = res.locals.active;
			let user = res.locals.contact || {};
			let api = res.locals.api || {};
			let contact = {};

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.findUnit(connection);

			body.Contact = body.Contact || {};

			// if lead Id, get from lead
			// if reservation_id get from reservation
			// if application_id, get from application
			// if contact_id get from contact
			var contact_id = body.Contact.id || body.contact_id || null;
			// Adding a tenant without a contact ID should attempt to create a new contact - so we should verify email address isn't taken by another tenant.

			if(contact_id) {
				contact = new Contact({id: contact_id});
				await contact.find(connection)
				await contact.verifyAccess(company.id);
				await contact.verifyUniqueTenantOnLease(connection, params.lease_id);
			} else {
				contact = new Contact({company_id: company.id});
			}

			await connection.beginTransactionAsync();

			if(Object.keys(body.Contact).length){
				contact.salutation =  body.Contact.salutation;
				contact.first = body.Contact.first;
				contact.company_id = company.id;
				contact.middle = body.Contact.middle;
				contact.company = body.Contact.company;
				contact.last = body.Contact.last;
				contact.suffix = body.Contact.suffix;
				contact.email = body.Contact.email;
				contact.dob = body.Contact.dob;
				contact.ssn = body.Contact.ssn;
				contact.gender = body.Contact.gender;
				contact.source = body.Contact.source;
				contact.driver_license =  body.Contact.driver_license;
				contact.active_military =  body.Contact.active_military;
				contact.military_branch =  body.Contact.military_branch;
				contact.Phones = body.Contact.Phones;
				contact.Addresses = body.Contact.Addresses;
				contact.Relationships = body.Contact.Relationships;
				await contact.save(connection);
			}


			let tenant = {
				contact_id: contact.id,
				lease_id: params.lease_id,
				type: 'tenant',
				primary: body.primary || 0
			};

			tenant.id = await models.ContactLeases.save(connection, tenant);
			// need to add user to space regardless
			// await lease.getProperty(connection, company.id);
			// await lease.Property.getAccessControl(connection);

      try {
        if (body.Access && body.Access.pin) {
			await contact.saveAccess(connection, lease.Property, { pin: body.Access.pin, unit_number: lease.Unit.number }, lease, lease.unit_id);
        }
      }catch(err){
          console.log("Could not save access code.")
      }

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					tenant_id: Hashes.encode(tenant.id, res.locals.company_id),
					contact_id: Hashes.encode(contact.id, res.locals.company_id),
					lease_id: Hashes.encode(params.lease_id, res.locals.company_id)
				}
			});

			eventEmitter.emit('tenant_added_to_lease', { lease, user, api, contact, company, cid: res.locals.company_id , locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.delete('/:lease_id/tenants/:tenant_id',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

		var params = req.params;
		var company = res.locals.active;
		var api = res.locals.api || {};
		var user = res.locals.contact || {};
		var contact = {};

		var connection = res.locals.connection;
		try {
			var lease = new Lease({id: params.lease_id});
			await lease.canAccess(connection, company.id, res.locals.properties);

			var cl = await models.ContactLeases.findById(connection, params.tenant_id);
			if(!cl) e.th(404, 'Tenant not found');
			if(cl.lease_id !== lease.id) e.th(400, 'Invalid Tenant id');

			await lease.getTenants(connection);

			if (lease.Tenants.length === 1) e.th(400, 'Lease must have at least one tenant');
			contact = new Contact({ id: cl.contact_id });
			await contact.find(connection);
      await contact.verifyAccess(company.id);
			await models.ContactLeases.remove(connection, params.tenant_id, params.lease_id)


			await lease.getProperty(connection, company.id);
			try {
        await lease.Property.getAccessControl(connection);
        await lease.Property.Access.deleteUser(contact.id);;
      } catch(err) {
        console.log(err);
      }

			var activity = new Activity();
			if(api) {
				await activity.createApi(connection,company.id,api.id,4,33, contact.id);
			} else {
				await activity.create(connection,company.id,user.id,4,33, contact.id);
			}
			utils.send_response(res, {
				status: 200,
				data: {}
			});
			eventEmitter.emit('tenant_removed_from_lease', { lease, user, api, contact, company, cid: res.locals.company_id, locals: res.locals});

		} catch (error) {
			next(error);
		}
	});

	router.post('/:lease_id/upload',[control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

		var company = res.locals.active;
    	var contact = res.locals.contact;
		var api = res.locals.api;

    try {

      var params = req.params;
      var body = req.body;
      var files = req.files;
      var connection = res.locals.connection;


      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      let file_list = [];
      if (Array.isArray(files.file)){
        file_list = files.file;
      } else {
        file_list.push(files.file);
      }
      let saved_uploads = []
      for (let i = 0; i < file_list.length; i++){
        let file = file_list[i];
        let upload = new Upload();
        await upload.setDocumentType(connection, body.document_type_id, body.document_type || 'file', company.id)
        upload.setFile(file, body.src);
        upload.uploaded_by = contact? contact.id: null;
        upload.status = 1;
        await upload.save(connection);
        await upload.find(connection);
        await upload.saveUploadLease(connection, lease.id);

        saved_uploads.push(upload);
      }
      utils.send_response(res, {
        status: 200,
        data: {
          uploads: Hash.obscure(saved_uploads, req)
        }
      });
      eventEmitter.emit('file_uploaded_to_lease', { lease, contact, api, company, cid: res.locals.company_id, locals: res.locals});

    } catch (error) {
      next(error);
    }

	});

	router.get('/:lease_id/uploads',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try{
	  let params = req.params;
	  let { api, isNectarRequest } = res.locals;
	  let company = res.locals.active;
	  let contact = res.locals.contact;
	  let lease = new Lease({id: params.lease_id});

	  var searchParams = {
        limit: req.query.limit || 20,
        offset: req.query.offset || 0
	  };

      await lease.find(connection);
      if(!lease.start_date) e.th(404, "Lease not found");
      await lease.canAccess(connection, company.id, res.locals.properties);
	    await lease.getUploads(connection, company.id);

	  // In case of api call only sending uploads/documents that are public (i.e. not private)
	  if(api || isNectarRequest){
		  lease.Uploads = lease.Uploads.filter(u => !u.private);
	  }

      utils.send_response(res, {
        status: 200,
        data: {
          uploads: Hash.obscure(lease.Uploads, req)
        }
      })




    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



	});


  /* Todo - refactor */
	router.get('/:lease_id/uploads/:upload_id:/:filename', Hash.unHash, function(req, res, next) {

		var company = res.locals.active;
		var lease = {};
		let params = req.params
		var lease_id = params.lease_id;
		var count;
		var uploads;

    var connection = res.locals.connection;
    lease = new Lease({id: lease_id});
    return lease.find(connection)
			.then(() => lease.canAccess(connection, company.id, res.locals.properties))
			.then(() => {
				return models.Upload.findByEntity(connection, 'lease',  lease_id).mapSeries(file => {
					file.Upload = new Upload({id: file.upload_id});
					return file.Upload.find(connection).then(() => file).then(() => {
						return models.Document.findTypeById(connection, file.document_type_id)
					}).then(document_type => {
						file.DocumentType = document_type || {};
						file.src = settings.config.protocol + '://api.' + settings.config.domain + "/v1/companies/"+ Hashes.encode(connection.cid) +"/uploads/files/" + Hashes.encode(file.Upload.id, res.locals.company_id) + "/" + file.Upload.name;
						return file;
					});
				});
			}).then(files => {
			uploads = files;
			return models.Upload.findByEntity(connection,  'lease', lease_id, null, true)
		}).then(countRes => {
				count = countRes[0].count;
				utils.send_response(res, {
					status: 200,
					data: {
						uploads: Hash.obscure(uploads, req),
						result_count: count
					}
				})
			})
			.catch(next)

	});


  /* Todo - Refactor */
	router.get('/:lease_id/access',[control.hasAccess(['admin']), Hash.unHash], function(req, res, next) {

		var lease = {};
		var params = req.params;
		var company = res.locals.active;
		var property = {};
		var tenants = [];
    var connection = res.locals.connection;

    lease = new Lease({id: params.lease_id});
    return lease.find(connection)
			.then(() => lease.canAccess(connection, company.id, res.locals.properties))
			.then(() => models.Property.findByLeaseId(connection, lease.id))
			.then(p => {
				property = new Property(p);
				return property.getAccessControl(connection)

			})
			.then(() => models.ContactLeases.findTenantsByLeaseId(connection, lease.id))
				.map((t, i) => {

					var c = new Contact({id: t.contact_id});

					return c.find(connection, company.id)
						.then(() => c.verifyAccess(company.id))
						.then(() => c.findAccessCredentials(connection, property))
						.then(() => {
							t.Contact = c;
							return t;
						});
				})
			.then( tenants =>  {
				utils.send_response(res, {
					status: 200,
					data:{
						tenants: Hash.obscure(tenants, req)
					}
				});

			})
			.catch(next)

	});

	router.get('/:lease_id/invoices', [control.hasAccess(['admin','tenant']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {
      var params = req.params;
      var query = req.query;
      var company = res.locals.active;

      var searchParams = {};

      searchParams.limit = query.limit || 50;
      searchParams.offset = query.offset || 0;
      searchParams.sort =  query.sort_field || 'due';
      searchParams.sortdir =  query.sort_dir || 'DESC';


      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      var conditions = {
        lease_id: params.lease_id
      };

      let invoices = await models.Invoice.search(connection, conditions, searchParams, company.id);
      let count = await models.Invoice.search(connection, conditions, null, company.id, true);


      utils.send_response(res, {
        status: 200,
        data:{
          invoices: Hash.obscure(invoices, req),
          pagination:{
            result_count: count[0].count,
            num_pages: Math.ceil(count / searchParams.limit),
            showing:{
              from: parseInt(searchParams.offset),
              to: parseInt(searchParams.offset + invoices.length)
            }
          }
        }
      });



    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



	});

	router.get('/:lease_id/payment-methods',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

		try{
			var connection = res.locals.connection;
			let params = req.params;
			let company = res.locals.active;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.findPaymentMethods(connection);

			lease.convertPaymentMethodRentToValue();

			let p = await models.Property.findByLeaseId(connection, lease.id);
			let property = new Property({id: p.id});
			await property.find(connection);
			await property.getConnections(connection);

			var google = { enabled: false };
			var apple = { enabled: false};
			var amazon = { enabled: false };
			var paypal = { enabled: false };

			property.Connections.map(c => {

				if(c.value.google){
					google.enabled = true;
					google.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
					google.googleGatewayMerchantId = c.value.googleGatewayMerchantId;
					google.googleMerchantName = c.value.googleMerchantName;
				}

				if(c.value.apple){
					apple.enabled = true;
					apple.appleMerchantId = c.value.appleMerchantId;
					apple.appleMerchantName = c.value.appleMerchantName;
				}

				if(c.name === 'amazon'){
					amazon.enabled = true;
					amazon.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
					amazon.amazonSellerId = c.value.amazonSellerId;
					amazon.amazonClientId = c.value.amazonClientId;
				}

				if(c.name === 'paypal'){
					paypal.enabled = true;
					paypal.paypalClientId = c.value.paypalClientId;
				}
			});

			utils.send_response(res, {
				status: 200,
				data: {
					paymentMethods: Hash.obscure(lease.PaymentMethods, req),
					integrations: {
						google,
						apple,
						amazon,
						paypal
					}
				}
			});



		} catch(err) {
			next(err);
		}




			//
			//
			//
			// .then(function(conn){
			// 	connection = conn;
			// 	lease = new Lease({id: params.lease_id});
			// 	return lease.find(connection)
			// })
			// .then(() => lease.canAccess(connection, company.id))
			// .then(() => lease.findPaymentMethods(connection))
			// .then(() => models.Property.findByLeaseId(connection, lease.id))
			// .then(p => {
			// 	property = new Property({id: p.id});
			// 	return property.find(connection)
			// })
			// .then(() => property.getConnections(connection))
			// .then(() => {
			// 	var google = { enabled: false };
			// 	var apple = { enabled: false};
			// 	var amazon = { enabled: false };
			// 	var paypal = { enabled: false };
			//
			// 	property.Connections.map(c => {
			//
			// 		if(c.value.google){
			// 			google.enabled = true;
			// 			google.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
			// 			google.googleGatewayMerchantId = c.value.googleGatewayMerchantId;
			// 			google.googleMerchantName = c.value.googleMerchantName;
			// 		}
			//
			// 		if(c.value.apple){
			// 			apple.enabled = true;
			// 			apple.appleMerchantId = c.value.appleMerchantId;
			// 			apple.appleMerchantName = c.value.appleMerchantName;
			// 		}
			//
			// 		if(c.name == 'amazon'){
			// 			amazon.enabled = true;
			// 			amazon.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
			// 			amazon.amazonSellerId = c.value.amazonSellerId;
			// 			amazon.amazonClientId = c.value.amazonClientId;
			// 		}
			//
			// 		if(c.name == 'paypal'){
			// 			paypal.enabled = true;
			// 			paypal.paypalClientId = c.value.paypalClientId;
			// 		}
			// 	});
			//
			// 	utils.send_response(res, {
			// 		status: 200,
			// 		data: {
			// 			paymentMethods: Hash.obscure(lease.PaymentMethods, req),
			// 			integrations: {
			// 				google,
			// 				apple,
			// 				amazon,
			// 				paypal
			// 			}
			// 		}
			// 	});
			// })
			// .then(() => utils.saveTiming(connection, req, res.locals))
			// .catch(next)
			// .finally(() => utils.closeConnection(pool, connection))
	});

  router.get('/:lease_id/payment-methods/autopay',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    try{
      var connection = res.locals.connection;
      let params = req.params;
      let company = res.locals.active;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.findAutoPaymentMethods(connection);

      lease.convertPaymentMethodRentToValue();

	  let lpm = new PaymentMethod({lease_id: params.lease_id});
	  let autoPaymentMethodActivity = await lpm.getLastAutopayActivity(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          paymentMethods: Hash.obscure(lease.PaymentMethods, req),
		  autoPaymentMethodActivity
        }
      });



    } catch(err) {
      next(err);
    }




    // .then(function(conn){
    // 	connection = conn;
    // 	lease = new Lease({id: params.lease_id});
    // 	return lease.find(connection)
    // })
    // .then(() => lease.canAccess(connection, company.id))
    // .then(() => lease.findPaymentMethods(connection))
    // .then(() => models.Property.findByLeaseId(connection, lease.id))
    // .then(p => {
    // 	property = new Property({id: p.id});
    // 	return property.find(connection)
    // })
    // .then(() => property.getConnections(connection))
    // .then(() => {
    // 	var google = { enabled: false };
    // 	var apple = { enabled: false};
    // 	var amazon = { enabled: false };
    // 	var paypal = { enabled: false };
    //
    // 	property.Connections.map(c => {
    //
    // 		if(c.value.google){
    // 			google.enabled = true;
    // 			google.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
    // 			google.googleGatewayMerchantId = c.value.googleGatewayMerchantId;
    // 			google.googleMerchantName = c.value.googleMerchantName;
    // 		}
    //
    // 		if(c.value.apple){
    // 			apple.enabled = true;
    // 			apple.appleMerchantId = c.value.appleMerchantId;
    // 			apple.appleMerchantName = c.value.appleMerchantName;
    // 		}
    //
    // 		if(c.name == 'amazon'){
    // 			amazon.enabled = true;
    // 			amazon.environemnt = c.value.production ? "PRODUCTION": "SANDBOX";
    // 			amazon.amazonSellerId = c.value.amazonSellerId;
    // 			amazon.amazonClientId = c.value.amazonClientId;
    // 		}
    //
    // 		if(c.name == 'paypal'){
    // 			paypal.enabled = true;
    // 			paypal.paypalClientId = c.value.paypalClientId;
    // 		}
    // 	});
    //
    // 	utils.send_response(res, {
    // 		status: 200,
    // 		data: {
    // 			paymentMethods: Hash.obscure(lease.PaymentMethods, req),
    // 			integrations: {
    // 				google,
    // 				apple,
    // 				amazon,
    // 				paypal
    // 			}
    // 		}
    // 	});
    // })
    // .then(() => utils.saveTiming(connection, req, res.locals))
    // .catch(next)
    // .finally(() => utils.closeConnection(pool, connection))
  });

  router.get('/:lease_id/ledger',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    try{
      var connection = res.locals.connection;
      let company = res.locals.active;
      let params = req.params;
      let options = {
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      await lease.findLedger(connection, null, options);

      utils.send_response(res, {
        status: 200,
        data:{
          ledger: Hash.obscure(lease.Ledger, req)
        }
      })

    } catch(err) {
      next(err);
    }

  });



	router.get('/:lease_id/payments',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    try{

      var connection = res.locals.connection;
      let company = res.locals.active;
      let params = req.params;
      let options = {
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      await  lease.findPayments(connection, null, options);


      utils.send_response(res, {
        status: 200,
        data:{
          payments: Hash.obscure(lease.Payments, req)
        }
      })

    } catch(err) {
      next(err);
    }





    // var params = req.params;
		// var company = res.locals.active;
		// var connection;
		// var lease = {};
		// var options = {
		// 	limit: req.query.limit || 50,
		// 	offset: req.query.offset || 0
		// };
		// pool.getConnectionAsync()
		// 	.then(function(conn){
		// 		connection = conn;
		// 		lease = new Lease({id: params.lease_id});
		// 		return lease.find(connection);
		// 	})
		// 	.then(() => lease.canAccess(connection, company.id, res.locals.properties))
		// 	.then(() => lease.findPayments(connection, null, options))
		// 	.then(function() {
		// 		utils.send_response(res, {
		// 			status: 200,
		// 			data: {
		// 				payments: Hash.obscure(lease.Payments, req)
		// 			}
		// 		});
		// 	})
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// 	.catch(next)
		// 	.finally(() => utils.closeConnection(pool, connection))
	});

	router.get('/:lease_id/payments/open',[control.hasAccess(['admin','tenant']), Hash.unHash], async (req,res, next) => {

    try{

      var connection = res.locals.connection;
      let company = res.locals.active;
      let params = req.params;


      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      await lease.getOpenPayments(connection) ;


      utils.send_response(res, {
        status: 200,
        data:{
          payments: Hash.obscure(lease.OpenPayments, req)
        }
      })

    } catch(err) {
      next(err);
    }



		// var connection;
		// var company = res.locals.active;
    //
		// var lease = {};
		// var payment = {};
		// var openPayments = [];
		// var params = req.params;
    //
		// pool.getConnectionAsync()
    //
		// 	.then(function(conn) {
		// 		connection = conn;
		// 		lease = new Lease({id: params.lease_id});
		// 		return lease.find(connection);
		// 	})
		// 	.then(() => lease.canAccess(connection, company.id, res.locals.properties))
		// 	.then(() => {
    //
		// 		return models.Payment.findPaymentOpenPaymentsByLeaseId(connection, params.lease_id)
		// 			.mapSeries(pmt => {
		// 				payment = new Payment({
		// 					id: pmt.id
		// 				});
    //
		// 				return payment.find(connection)
		// 					.then(() => payment.getPaymentApplications(connection))
		// 					.then(() => payment)
		// 				// .then(function(){
		// 				// 	openPayments.push(payment.values());
		// 				// 	return true;
		// 				// });
		// 			})
		// 	})
		// 	.then(payments =>{
    //
		// 		utils.send_response(res, {
		// 			status: 200,
		// 			data:{
		// 				payments: Hash.obscure(payments, req)
		// 			}
		// 		})
		// 	})
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// 	.catch(next)
		// 	.finally(() => utils.closeConnection(pool, connection))

	});


	router.get('/:lease_id/payment-cylce-options',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		
		try{
			var connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;
			let options = {
			  limit: req.query.limit || 50,
			  offset: req.query.offset || 0
			};
	  
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
	  
			await  lease.getPaymentCycleOptions(connection);
	  
	  
			utils.send_response(res, {
			  status: 200,
			  data:{
				options: Hash.obscure(lease.PaymentCycleOptions, req)
			  }
			})
	  
		  } catch(err) {
			next(err);
		  }
  })


  router.get('/:lease_id/payment-cycles',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    try{

      var connection = res.locals.connection;

      var params = req.params;
      var company = res.locals.active;
      
      let lease = new Lease({id: params.lease_id}); 
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
	  await lease.getProperty(connection, company.id);
	  await lease.getPaymentCycleOptions(connection);
	
		utils.send_response(res, {
			status: 200,
			data: {
			lease: Hash.obscure(lease, req)
			}
		})

      } catch(err) {
        next(err);
    }




  })

  router.get('/:lease_id/advance-pay',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    try{

      var connection = res.locals.connection;

      var params = req.params;
      var company = res.locals.active;
      let invoices = [];
      var date = req.query.date ? req.query.date : moment().format('YYYY-MM-DD');
	  let promotionIds = (req.query && req.query.promotion_ids && JSON.parse(req.query.promotion_ids)) || [];
	  promotionIds = promotionIds.map(p => Hashes.decode(p)[0])
	  var payment_cycle = req.query.payment_cycle || null;
	  var billed_months = req.query.billed_months || 0;
	  let is_payment_cycle_change = false, open_invoices = [], payment_cycle_shift_data = {};
	  
      let lease = new Lease({id: params.lease_id}); 
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
	  await lease.getProperty(connection, company.id);
	  await lease.findOpenInvoices(connection);
	  open_invoices = lease.OpenInvoices;
	  
	  // validate billing periods
	  let current_date = await lease.getCurrentLocalPropertyDate(connection);

	  //let lastBillingDate = await lease.getLastBillingDate(connection); // Should be last billed.
		
		//let nextBillingDate = await lease.getNextBillingDate(moment(current_date), false); // Should be next billing

      // subtract a day to get even with lastBillingDate
      //nextBillingDate.subtract(1, 'day');
      //let lastBillingDateMoment =  moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
      //let lastBilled = lastBillingDate && (nextBillingDate.format('x') < lastBillingDateMoment.format('x')) ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day'): nextBillingDate;
			
		let lastBillingDate = await lease.getLastBilledDate(connection); // Last billed rent invoice
		let lastBilled = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') 
		let services = [];

		var discountsToPass = [], discounts_to_exclude = [];
		let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);

		let previous_payment_cycle = lease?.payment_cycle;

		/* NEW CHANGES QAL-503 */
		if (previous_payment_cycle != payment_cycle) {

			let previous_last_billed = lastBilled;
			is_payment_cycle_change = true;

			payment_cycle_shift_data = await lease.processPaymentCycleShifting(connection, current_date, res, { payment_cycle, previous_payment_cycle, dryrun: true });
			lastBilled = payment_cycle_shift_data.last_billed || lastBilled;
			discounts_to_exclude = payment_cycle_shift_data.delete_discount_ids || [];

			invoicePeriod = !moment(previous_last_billed).isSame(lastBilled) ? await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1) : invoicePeriod;
		}


		let payment_cycle_option = {};
		if(payment_cycle && payment_cycle !== 'null'){
			payment_cycle_option = await lease.getPaymentCycleOptions(connection, payment_cycle);
			if(!payment_cycle_option) e.th(400, "Payment cycle not found");

			lease.payment_cycle = payment_cycle_option.label;

			billed_months = billed_months || payment_cycle_option.period;
			
			await lease.savePaymentCycle(connection, invoicePeriod.start.clone(), billed_months, null, true) // This is a DRY RUN!!!
			promotionIds = [payment_cycle_option.promotion_id];

			// how to ident
			// let discount = await this.addPromotion(connection, payment_cycle.promotion_id, company_id, true, nextBillingDate, payment_cycle.period);


		}

		// Calculations are done after adding these promotions but these are not saved in database
		for(let i = 0; i < promotionIds.length; i++) {
			let promotionID = promotionIds[i];
			const tempPromotion = await lease.addPromotion(connection, promotionID, company.id, true, invoicePeriod.start, payment_cycle_option && payment_cycle_option.id && billed_months);
			discountsToPass.push(tempPromotion);
		}
		
		// removing open rent invoices whose period is greater then equal to invoicePeriod.start
		if(is_payment_cycle_change && open_invoices?.length > 0){
			// filter rent open invoices
			let rent_invoices_to_remove = open_invoices.filter(oi => oi.InvoiceLines.find(il => il.Product.default_type == 'rent' && il.Product.category_type == 'rent'));
			rent_invoices_to_remove = rent_invoices_to_remove.filter(oi => moment(oi.period_start).isSameOrAfter(invoicePeriod.start)).map(ri => ri.id);
			open_invoices = open_invoices.filter(ol => !rent_invoices_to_remove.includes(ol.id));
			console.log("OPEN INVOICES_IDS AFTER FILTER", JSON.stringify(open_invoices.map(op => op.id)));
		}
		
		let discount_arr = [];
		let discounts_arr_sorted = [];
		for(let i = 0; i < billed_months; i++ ) {
			let firstAdvanceInvoice = i == 0;
			invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
			lastBilled = invoicePeriod.end.clone();

			try {
				services = await lease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
				.filter(s => (s.service_type === 'lease' || s.service_type === 'insurance') && ((s.recurring === 1) || (!s.last_billed && !s.recurring && firstAdvanceInvoice)) );
			} catch (err) {
				if (err.code !== 409) {
				throw err;
				}
				services = [];
			}
			let datetime = lease?.current_property_date || await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD');
			let invoice = new Invoice({
				lease_id: lease.id,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: invoicePeriod.start.format('YYYY-MM-DD'),
				company_id: company.id,
				type: "manual",
				status: 1
			});
	
			invoice.Lease = lease;
			invoice.Company = company;
			
			let invoicePeriodStartDate = invoicePeriod.start.format('YYYY-MM-DD')
			await lease.getDiscounts(connection,invoicePeriodStartDate);

			if(discounts_to_exclude.length > 0){
				lease.Discounts = lease.Discounts.filter(discount => !discounts_to_exclude.includes(discount.id));
			}
			discount_arr = [].concat(discountsToPass, lease.Discounts);
			discounts_arr_sorted = await lease.sortLeaseDiscounts(connection,discount_arr,invoicePeriodStartDate);
		
			await invoice.makeFromServices(
			connection,         // connection
			services,   // services
			lease,              // services
			invoicePeriod.start,
			invoicePeriod.end,
			discounts_arr_sorted, // if not saving, include the discounts, otherwise we will search.
			company.id,
			false,
			{ payment_cycle_change_dryrun: is_payment_cycle_change }
			)

			await invoice.total();
			await invoice.calculatePayments();
			await invoice.getOpenPayments(connection);
			invoices.push(invoice)
		}

		if (payment_cycle_shift_data?.open_payments?.length > 0) {
			invoices = await Invoice.applyOpenPaymentsToInvoices(connection, invoices, payment_cycle_shift_data.open_payments, { dryrun: true });
		}

		utils.send_response(res, {
			status: 200,
			data: {
				invoices: Hash.obscure(invoices, req),
				open_invoices: Hash.obscure(open_invoices, req),
				is_payment_cycle_change
			}
		})

	} catch (err) {
		next(err);
	}




  })


	router.get('/:lease_id/current-charges',[control.hasAccess(['admin', 'api','tenant']), Hash.unHash], async (req, res, next) => {

    try {

		var connection = res.locals.connection;

		var params = req.params;
		var company = res.locals.active;
		var offset = req.query.offset || 0;
		var date = req.query.date ? moment(req.query.date, 'YYYY-MM-DD') : null;
		let lease = new Lease({id: params.lease_id});
		await lease.find(connection);
		await lease.canAccess(connection, company.id, res.locals.properties);

		let invoice = {}

		let invoicePeriod = {};
		let start_limit = {};

		let startDate = moment(lease.start_date).startOf('day').add(+offset + 1, 'months').subtract(1, 'day');
		let leasePromotions = [];
		invoicePeriod = await lease.getBillDayByPromotion(connection, leasePromotions, date && date.clone() || startDate);

		if(invoicePeriod == null) {

			if(date){
				let start = lease.getInvoicePeriodEnd(date.clone()).add(1, 'Days');
				let end = lease.getInvoicePeriodEnd(start.clone());
				invoicePeriod = { start, end }

			} else {

				//let lastBilled = await lease.getLastBillingDate(connection);
				let lastBilled = await lease.getLastBilledDate(connection);
				
				if(!lastBilled) {
					let prop_date = await lease.getCurrentLocalPropertyDate(connection);
					lastBilled = moment(prop_date);
				}
				
				lastBilled = moment(lastBilled, 'YYYY-MM-DD HH:mm:ss').startOf('day');


				for(let i = 0; i <= +offset; i++ ) {
					invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone());
					lastBilled = invoicePeriod.end.clone();
				}
			}
		}

		start_limit = invoicePeriod.start.clone().subtract(1,'month');
		
		
		if(lease.payment_cycle){
			await lease.getPaymentCycleOptions(connection);
			let pc = lease.PaymentCycleOptions.find(o => o.label === lease.payment_cycle);	
			
			console.log("pc", pc);
			console.log("invoicePeriod", invoicePeriod);
			if(pc){
				let discount = await lease.addPromotion(connection, pc.promotion_id, company.id, true, invoicePeriod.start, null, invoicePeriod.end);
				leasePromotions.push(discount);
			}
		}
		let invoicePeriodStartDate = invoicePeriod.start.format('YYYY-MM-DD')
		await lease.getDiscounts(connection,invoicePeriodStartDate);
		leasePromotions = [...leasePromotions, ...lease.Discounts];
		let services = [];

		try {
			services = await lease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone(), start_limit).filter(s => s.service_type === 'lease' || s.service_type === 'insurance' )
		} catch(err){
			if(err.code !== 409){
			throw err;
			}
			services = [];
		}
		if(services.length){
			let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
			invoice = new Invoice({
			lease_id: lease.id,
			user_id: null,
			date: moment(datetime).format('YYYY-MM-DD'),
			due: lease.bill_day <= invoicePeriod.start.format('D')? invoicePeriod.start.clone().date(lease.bill_day).format('YYYY-MM-DD'): invoicePeriod.start.clone().format('YYYY-MM-DD'),
			company_id: company.id,
			type: "auto",
			status: 1
			});
			invoice.Lease = lease;
			invoice.Company = company;

			await invoice.makeFromServices(
			connection,
			services,
			lease,
			invoicePeriod.start.clone(),
			invoicePeriod.end.clone(),
			leasePromotions,
			company.id,
			false
			);

			await invoice.calculatePayments();
			await invoice.getOpenPayments(connection)

		}

		utils.send_response(res, {
			status: 200,
			data: {
			invoice: Hash.obscure(invoice, req)
			}
		})

		} catch(err) {
			next(err);
		}
	})


	// SERVICES //
	router.get('/:lease_id/services',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    try{
      var connection = res.locals.connection;

      let params = req.params;
      let query = req.query;
      let company = res.locals.active;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getServices(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          services: Hash.obscure(lease.Services, req),
          insurance: Hash.obscure(lease.InsuranceServices, req)
        }
      });

    } catch(err) {
      next(err);
    }

	});

	router.get('/:lease_id/all-services',[control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try{
      var connection = res.locals.connection;
      const params = req.params;
      const company = res.locals.active;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getCurrentLocalPropertyDate(connection);
      await lease.getServices(connection, ['rent', 'insurance']);
			const services = lease.categorizeServices();
			
      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(services, req)
      });

    } catch(err) {
      next(err);
    }

	});

	router.get('/:lease_id/insurance',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

		// Should return the current Insurance product plus a breakdown of other options.

		try{
			var connection = res.locals.connection;
			let params = req.params;
			let company = res.locals.active;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);


			let activeInsuranceService = await Service.getActiveInsuranceService(connection, lease.id);

			let unit = new Unit({id: lease.unit_id});
			await unit.find(connection);

			let filter = {
				unit_type: unit.type
			}

			let property = new Property({id: unit.property_id});
			await property.find(connection);

			let insuranceServices = await property.getInsurances(connection, company.id, filter);
			for(let i = 0; i < insuranceServices.length; i++){
				await insuranceServices[i].calculateLeaseDue(connection, lease, null, company.id);
			}

			activeInsuranceService.billed_through = activeInsuranceService.last_billed;

			const data = {
				insurance_service: activeInsuranceService,
				options: insuranceServices
			}

			utils.send_response(res, {
				status: 200,
				data: {
					data: Hash.obscure(data, req)
				}
			});



		} catch(err) {

			next(err);
		}



	});

	router.get('/:lease_id/all-insurances', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {			
			const { locals: { active: company, connection } } = res;
			const { params: { lease_id: leaseId } } = req;

			let lease = new Lease({ id: leaseId });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getCurrentLocalPropertyDate(connection);
			await lease.getAllInsurances(connection);
			const insurances = lease.categorizeInsurances();

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(insurances, req)
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/:lease_id/insurance-start-date', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {			
			const { locals: { active: company, connection } } = res;
			const { params: { lease_id: leaseId } } = req;

			let lease = new Lease({ id: leaseId });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			let date = await lease.getCurrentLocalPropertyDate(connection);
			const latestInsuranceApplicationDate = await lease.getLastestInsuranceApplicationDate(connection);
			const insuranceStartDate = moment(latestInsuranceApplicationDate || date).startOf('day').add(1, 'day').format('YYYY-MM-DD');

			utils.send_response(res, {
				status: 200,
				data: insuranceStartDate
			});
		} catch (err) {
			next(err);
		}
	});

	/* TODO:  add input validation  */
	router.put('/:lease_id/insurance',[control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;
      let params = req.params;
      let body = req.body;
      let company = res.locals.active;
      var logged_in_user = res.locals.contact || {};
	  let api = res.locals.api || {};
	  let events = [];
	  
      let payment = {};
      let paymentMethod = {};

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      let contact = new Contact({id: body.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);

	  //let service_start_date = body.start_date || moment().startOf('day').format('YYYY-MM-DD');

      let data = {};

      let unit = new Unit({id: lease.unit_id});
      await unit.find(connection);

      let property = new Property({id: unit.property_id});
      await property.find(connection);
	  await property.getLocalCurrentDate(connection);
      //await property.getTemplates(connection);

      let activeInsurance = await Service.getActiveRecurringInsuranceService(connection, lease.id);
	  let futureInsurances = await Service.getFutureInsuranceServices(connection, lease.id);

      if(activeInsurance) {
        await activeInsurance.find(connection);
        await activeInsurance.getLastUnAvoidedBilled(connection, property.localCurrentDate);
        //await activeInsurance.endCurrentService(connection, moment(service_start_date, 'YYYY-MM-DD').subtract(1, 'day'));
      }

      if(!body.dryrun){
        await connection.beginTransactionAsync();
	  }

	  const propertyDate = property.localCurrentDate ? moment(property.localCurrentDate).startOf('day') : moment().startOf('day'); 
      let service_start_date = body.starting_date ? moment(body.starting_date).startOf('day') : propertyDate;
      let invoice = {};
	  let service = {};

      if(body.decline) {

        if(!body.dryrun && activeInsurance){
			await activeInsurance.endCurrentService(connection, moment(activeInsurance.last_billed, 'YYYY-MM-DD').format('YYYY-MM-DD'));

			let serviceStartDate = moment(activeInsurance.last_billed, 'YYYY-MM-DD').startOf('day').add(1, 'day');
		  	let nextActiveInsurance = await models.Service.findActiveInsuranceService(connection, lease.id, serviceStartDate);
		  	if(nextActiveInsurance){
				  await models.Service.delete(connection, nextActiveInsurance.id);
			}
        }

		if(!body.dryrun && futureInsurances && futureInsurances.length){
			await Service.endFutureServices(connection, {status: 0}, futureInsurances.map(frs => frs.id));
		}
        await lease.declineInsurance(connection, body.decline, body.insurance_exp_month, body.insurance_exp_year);

      } else {

		let insurances = await property.getInsurances(connection, company.id, {insurance_id: body.insurance_id});
		if(!insurances.length) e.th(400, "This is not a valid insurance id");

		let insurance = insurances[0];
		insurance.setPremium(lease.rent);

        service = new Service({
          lease_id: lease.id,
          product_id: insurance.product_id,
          property_bill_id: null,
          end_date: null,
          name: insurance.name,
          description: insurance.description,
          qty: 1,
          recurring: insurance.recurring,
          prorate: insurance.prorate,
          prorate_out: insurance.prorate_out,
          service_type: 'insurance',
          taxable: insurance.taxable || 0,
          price: insurance.premium
        });

        service.Product = insurance;

        let credit = 0;

        if(activeInsurance){
			await activeInsurance.getLastBilled(connection);
			let serviceStartDate = moment(activeInsurance.last_billed, 'YYYY-MM-DD').startOf('day').add(1, 'day');

            service.start_date = serviceStartDate.format('YYYY-MM-DD');

            if (!body.dryrun) {
				await activeInsurance.endCurrentService(connection, moment(activeInsurance.last_billed, 'YYYY-MM-DD').format('YYYY-MM-DD'));
				let nextActiveInsurance = await models.Service.findActiveInsuranceService(connection, lease.id, serviceStartDate);
				if(nextActiveInsurance){
					await models.Service.delete(connection, nextActiveInsurance.id);
				}
            }
        //   }
        } else {
		  if(!body.dryrun && futureInsurances && futureInsurances.length){
			await Service.endFutureServices(connection, {status: 0}, futureInsurances.map(frs => frs.id));
		  }	
          service.start_date = service_start_date.clone().format('YYYY-MM-DD');
        }

        if (!body.dryrun) {
          await service.save(connection)
		  await lease.declineInsurance(connection, 0, null, null);
        }

		// if there is no amount due,
        //let invoice_end = await lease.getNextBillDate(activeInsurance && moment(activeInsurance.last_billed)).subtract(1, 'day');
				let start = activeInsurance ? moment(activeInsurance.last_billed) : propertyDate
				let invoice_end = lease.getInvoicePeriodEnd(start);

				let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD');

        if(moment(service.start_date, 'YYYY-MM-DD').format('x') <= invoice_end.format('x')){
         
					invoice = new Invoice({
            lease_id: lease.id,
            user_id: null,
            date: moment(datetime).format('YYYY-MM-DD'),
            due:  moment(datetime).format('YYYY-MM-DD'),
            company_id: company.id,
            type: "auto",
            status: 1,
			created_by: logged_in_user.id,
			apikey_id: api.id
          });
          invoice.Lease = lease;
          invoice.Company = company;

          let invoice_start = moment(service.start_date, 'YYYY-MM-DD').startOf('day');

          await invoice.makeFromServices(connection, [service], lease, invoice_start, invoice_end, null, company.id);

          invoice.InvoiceLines[0].cost =  Math.round( (invoice.InvoiceLines[0].cost - credit) * 1e2 ) / 1e2;
          invoice.InvoiceLines[0].cost = invoice.InvoiceLines[0].cost > 0 ? invoice.InvoiceLines[0].cost: 0;

          await invoice.total();
          await invoice.calculatePayments();
          await invoice.getOpenPayments(connection);

          if(!body.dryrun) {

            await invoice.save(connection);

			// if(body.use_credits) {
			// 	if(body.Invoices && body.Invoices.length){
			// 		invoice.credits_amount_used = body.Invoices[0].credits_amount_used;
			// 	}
			// 	await contact.reconcile(connection, property.id, [invoice], true);
			// }

            let invoices = [{
              id: invoice.id,
              amount: body.Invoices && body.Invoices.length ? body.Invoices[0].amount : invoice.total_due
			}];

            if(body.payment && body.payment.id) {
              // Apply existing payment to invoices

              payment = new Payment({id: body.payment.id});
              await payment.find(connection);
              await payment.verifyAccess(connection, company.id, res.locals.properties);
              await payment.getPaymentApplications(connection);
              await payment.applyToInvoices(connection, invoices);
            } else if (body.payment && body.payment.amount) {

              paymentMethod = await contact.getPaymentMethod(connection, property, body.payment.payment_method_id, body.payment.type, body.payment.source, body.paymentMethod );

              payment = new Payment();
              await payment.create(connection, body.payment, paymentMethod, null, logged_in_user.id);
              events.push('payment_created');

              await payment.getPaymentApplications(connection);

              if(payment.status && payment.payment_remaining && invoices){
                await payment.applyToInvoices(connection, invoices);
              }

              await payment.charge(connection, company.id, false, logged_in_user );

            }

          }
        }

				if(!body.dryrun){
					let billing_date = invoice_end.clone().add(1, 'Days')
					await lease.generateInvoiceAccordingToThreshold(connection, {billing_date, company});
				}
      }
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          Service: service && Hash.obscure(service, req),
          Invoice: invoice && Hash.obscure(invoice, req),
		  payment_id: payment && payment.id && Hashes.encode(payment.id, res.locals.company_id), 
		  msg: "Insurance has been updated."
        }
      });

	  // if(!body.dryrun){
	  // 	eventEmitter.emit('tenant_added_to_lease', { lease, user, api, contact, company, locals: res.locals});
	  // }

    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }


		// var params = req.params;
		// var body = req.body;
		// var company = res.locals.active;
		// var connection;
		// var lease = {};
		// var unit = {};
		// var property = {};
		// var activeInsurance = {};
		// var lastBilled = '';
		// var newInsurance = {};
		// var service = {};
		// var invoice = {};
		// var start_date = moment().format('YYYY-MM-DD');
		// pool.getConnectionAsync()
		// 	.then(function(conn) {
		// 		connection = conn;
		// 		lease = new Lease({id: params.lease_id});
		// 		return lease.find(connection);
    //
		// 	})
		// 	.then(() => connection.beginTransactionAsync())
		// 	.then(() => lease.canAccess(connection, company.id))
		// 	.then(() => models.Service.findActiveInsuranceService(connection, lease.id))
		// 	.then(active  => {
		// 		console.log(active);
    //
		// 		if (!active) return;
		// 		activeInsurance = new Service(active);
		// 		// End Current Insurance
		// 		return activeInsurance.find(connection)
		// 			.then(() => activeInsurance.getLastBilled(connection))
		// 			.then(() => {
		// 				// end current service
		// 				var data = {}
		// 				if(activeInsurance.last_billed){
		// 					data = {
		// 						end_date: activeInsurance.last_billed,
		// 						status: 0
		// 					}
		// 				} else {
		// 					data = {
		// 						end_date: moment().format('YYYY-MM-DD'),
		// 						status: 0
		// 					}
		// 				}
    //
		// 				return models.Service.save(connection, data, activeInsurance.id )
    //
		// 			})
    //
		// 	})
		// 	.then(() =>  {
    //
		// 		unit = new Unit({id: lease.unit_id});
		// 		return unit.find(connection);
		// 	})
		// 	.then(() =>  {
		// 		property = new Property({id: unit.property_id});
		// 		return property.getTemplates(connection)
		// 			.then(() => {
		// 				if(!property.LeaseTemplates[unit.type]) e.th(400, "This is not a valid option");
		// 				return property.LeaseTemplates[unit.type].Template.Services.filter(s => {
		// 					return s.service_type === 'insurance' && s.Insurance.id == body.insurance_id;
		// 				})
		// 			})
		// 	})
		// 	.then(s => {
    //
		// 		if (!s.length) e.th(400, "This is not a valid insurance option");
    //
		// 		var insurance = new Insurance(s[0].Insurance);
    //
		// 		return insurance.find(connection).then(() => {
		// 			insurance.setPremium(lease.rent);
    //
		// 			service = new Service({
		// 				lease_id: lease.id,
		// 				product_id: insurance.product_id,
		// 				property_bill_id: null,
		// 				end_date: null,
		// 				name: insurance.name,
		// 				description: insurance.description,
		// 				qty: 1,
		// 				recurring: s[0].recurring,
		// 				prorate: s[0].prorate,
		// 				service_type: 'insurance',
		// 				taxable: s[0].taxable || 0
		// 			});
    //
		// 			service.price = insurance.premium;
		// 			service.Product = insurance;
    //
		// 			if(activeInsurance.last_billed){
		// 				service.start_date = lease.getNextBillingDate(moment(activeInsurance.last_billed, 'YYYY-MM-DD').startOf('day')).add(1,'day').format('YYYY-MM-DD');
		// 			} else {
		// 				service.start_date = moment().startOf('day').format('YYYY-MM-DD');
		// 			}


			// 		return service.save(connection).then(() => {
      //
			// 			invoice = new Invoice({
			// 				lease_id: lease.id,
			// 				user_id: null,
			// 				date: moment().format('YYYY-MM-DD'),
			// 				due: moment().format('YYYY-MM-DD'),
			// 				company_id: company.id,
			// 				type: "auto",
			// 				status: 1
			// 			});
			// 			invoice.Lease = lease;
			// 			invoice.Company = company;
      //
			// 			var invoice_start = moment().startOf('day');
			// 			var invoice_end = lease.getNextBillingDate(moment().startOf('day')).subtract(1, 'day');
      //
			// 			return invoice.makeFromServices(
			// 				connection,
			// 				[service],
			// 				lease,
			// 				invoice_start,
			// 				invoice_end,
			// 				null,
			// 				company.id
			// 			)
			// 		}).then(() => {
			// 			if(!invoice.InvoiceLines.length) return;
			// 			return invoice.save(connection)
			// 		})
			// 	})
			// })
			// .then(() => connection.commitAsync())
			// .then(() => {
			// 	utils.send_response(res, {
			// 		status: 200,
			// 		data: {
			// 			service_id: Hashes.encode(service.id),
			// 			invoice_id: invoice.id ? Hashes.encode(invoice.id): null
			// 		}
			// 	})
			// })
			// .then(() => utils.saveTiming(connection, req, res.locals))
			// .catch(function(err){
			// 	return connection.rollbackAsync().then(() => next(err));
			// })
			// .finally(() => utils.closeConnection(pool, connection))
	});

	/* TODO:  add input validation  */
  router.post('/:lease_id/insurance',[control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;
      let params = req.params;
      let body = req.body;
      let api = res.locals.api;
      let company = res.locals.active;
      let contact = res.locals.contact;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      let service_start_date = body.start_date || moment().format('YYYY-MM-DD');

      let activeInsuranceService = await Service.getActiveInsuranceService(connection, lease.id);

      if(activeInsuranceService) {
        await activeInsuranceService.find(connection);
        await activeInsuranceService.getLastBilled(connection);
        if(!activeInsuranceService.end_date || activeInsuranceService.end_date > service_start_date){
          e.th(409, "There is already an insurance policy in place.  Please end the existing one before adding a new one.");
        }
        // await activeInsuranceService.endCurrentService(connection, moment(service_start_date, 'YYYY-MM-DD').subtract(1, 'day').format('YYYY-MM-DD));
      }

     // await connection.beginTransactionAsync();
      let activeInsurance = {};
      let data = {};

      let unit = new Unit({id: lease.unit_id});
      await unit.find(connection);

      let property = new Property({id: unit.property_id});
      await property.find(connection);
      await property.getTemplates(connection);

      if(!property.LeaseTemplates[unit.type]) e.th(400, "This is not a valid option");

      let s = property.LeaseTemplates[unit.type].Template.Services.find(
        s => s.service_type === 'insurance' && s.Insurance.id === body.insurance.id
      );

      if (!s) e.th(400, "This is not a valid insurance option");
      let insurance = new Insurance(s.Insurance);

      let service = new Service({
        lease_id: lease.id,
        product_id: insurance.product_id,
        property_bill_id: null,
        end_date: null,
        name: insurance.name,
        description: insurance.description,
        qty: 1,
        recurring: s.recurring,
        prorate: s.prorate,
        prorate_out: s.prorate_out,
        service_type: 'insurance',
        taxable: s.taxable || 0
      });
      insurance.setPremium(lease.rent);
      service.price = insurance.premium;
      service.Product = insurance;

      service.start_date = service_start_date;

      // if(activeInsurance.last_billed){
      //   service.start_date = lease.getNextBillingDate(moment(activeInsurance.last_billed, 'YYYY-MM-DD').startOf('day')).add(1,'day').format('YYYY-MM-DD');
      // } else {
      //   service.start_date = moment().startOf('day').format('YYYY-MM-DD');
      // }


      await service.save(connection);

      // let invoice = new Invoice({
      //   lease_id: lease.id,
      //   user_id: null,
      //   date: moment().format('YYYY-MM-DD'),
      //   due: moment().format('YYYY-MM-DD'),
      //   company_id: company.id,
      //   type: "auto",
      //   status: 1
      // });
      // invoice.Lease = lease;
      // invoice.Company = company;
      //
      // let invoice_start = moment().startOf('day');
      // let invoice_end = lease.getNextBillingDate(moment().startOf('day')).subtract(1, 'day');
      //
      // await invoice.makeFromServices(connection, [service], lease, invoice_start, invoice_end, null, company.id)
      //
      // if(invoice.InvoiceLines.length){
      //   await invoice.save(connection)
      // }

      utils.send_response(res, {
        status: 200,
        data: {
          service_id: Hashes.encode(service.id, res.locals.company_id),
    //      invoice_id: invoice.id ? Hashes.encode(invoice.id): null
        }
      });

      eventEmitter.emit('insurance_added_to_lease', { lease, contact, api, company, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      // await connection.rollbackAsync();
      next(err);
    }


    // var params = req.params;
    // var body = req.body;
    // var company = res.locals.active;
    // var connection;
    // var lease = {};
    // var unit = {};
    // var property = {};
    // var activeInsurance = {};
    // var lastBilled = '';
    // var newInsurance = {};
    // var service = {};
    // var invoice = {};
    // var start_date = moment().format('YYYY-MM-DD');
    // pool.getConnectionAsync()
    // 	.then(function(conn) {
    // 		connection = conn;
    // 		lease = new Lease({id: params.lease_id});
    // 		return lease.find(connection);
    //
    // 	})
    // 	.then(() => connection.beginTransactionAsync())
    // 	.then(() => lease.canAccess(connection, company.id))
    // 	.then(() => models.Service.findActiveInsuranceService(connection, lease.id))
    // 	.then(active  => {
    // 		console.log(active);
    //
    // 		if (!active) return;
    // 		activeInsurance = new Service(active);
    // 		// End Current Insurance
    // 		return activeInsurance.find(connection)
    // 			.then(() => activeInsurance.getLastBilled(connection))
    // 			.then(() => {
    // 				// end current service
    // 				var data = {}
    // 				if(activeInsurance.last_billed){
    // 					data = {
    // 						end_date: activeInsurance.last_billed,
    // 						status: 0
    // 					}
    // 				} else {
    // 					data = {
    // 						end_date: moment().format('YYYY-MM-DD'),
    // 						status: 0
    // 					}
    // 				}
    //
    // 				return models.Service.save(connection, data, activeInsurance.id )
    //
    // 			})
    //
    // 	})
    // 	.then(() =>  {
    //
    // 		unit = new Unit({id: lease.unit_id});
    // 		return unit.find(connection);
    // 	})
    // 	.then(() =>  {
    // 		property = new Property({id: unit.property_id});
    // 		return property.getTemplates(connection)
    // 			.then(() => {
    // 				if(!property.LeaseTemplates[unit.type]) e.th(400, "This is not a valid option");
    // 				return property.LeaseTemplates[unit.type].Template.Services.filter(s => {
    // 					return s.service_type === 'insurance' && s.Insurance.id == body.insurance_id;
    // 				})
    // 			})
    // 	})
    // 	.then(s => {
    //
    // 		if (!s.length) e.th(400, "This is not a valid insurance option");
    //
    // 		var insurance = new Insurance(s[0].Insurance);
    //
    // 		return insurance.find(connection).then(() => {
    // 			insurance.setPremium(lease.rent);
    //
    // 			service = new Service({
    // 				lease_id: lease.id,
    // 				product_id: insurance.product_id,
    // 				property_bill_id: null,
    // 				end_date: null,
    // 				name: insurance.name,
    // 				description: insurance.description,
    // 				qty: 1,
    // 				recurring: s[0].recurring,
    // 				prorate: s[0].prorate,
    // 				service_type: 'insurance',
    // 				taxable: s[0].taxable || 0
    // 			});
    //
    // 			service.price = insurance.premium;
    // 			service.Product = insurance;
    //
    // 			if(activeInsurance.last_billed){
    // 				service.start_date = lease.getNextBillingDate(moment(activeInsurance.last_billed, 'YYYY-MM-DD').startOf('day')).add(1,'day').format('YYYY-MM-DD');
    // 			} else {
    // 				service.start_date = moment().startOf('day').format('YYYY-MM-DD');
    // 			}


    // 		return service.save(connection).then(() => {
    //
    // 			invoice = new Invoice({
    // 				lease_id: lease.id,
    // 				user_id: null,
    // 				date: moment().format('YYYY-MM-DD'),
    // 				due: moment().format('YYYY-MM-DD'),
    // 				company_id: company.id,
    // 				type: "auto",
    // 				status: 1
    // 			});
    // 			invoice.Lease = lease;
    // 			invoice.Company = company;
    //
    // 			var invoice_start = moment().startOf('day');
    // 			var invoice_end = lease.getNextBillingDate(moment().startOf('day')).subtract(1, 'day');
    //
    // 			return invoice.makeFromServices(
    // 				connection,
    // 				[service],
    // 				lease,
    // 				invoice_start,
    // 				invoice_end,
    // 				null,
    // 				company.id
    // 			)
    // 		}).then(() => {
    // 			if(!invoice.InvoiceLines.length) return;
    // 			return invoice.save(connection)
    // 		})
    // 	})
    // })
    // .then(() => connection.commitAsync())
    // .then(() => {
    // 	utils.send_response(res, {
    // 		status: 200,
    // 		data: {
    // 			service_id: Hashes.encode(service.id),
    // 			invoice_id: invoice.id ? Hashes.encode(invoice.id): null
    // 		}
    // 	})
    // })
    // .then(() => utils.saveTiming(connection, req, res.locals))
    // .catch(function(err){
    // 	return connection.rollbackAsync().then(() => next(err));
    // })
    // .finally(() => utils.closeConnection(pool, connection))
  });

	router.post('/:lease_id/services', [control.hasAccess(['admin']), joiValidator.body( Schema.createService), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection
		try {
			let company = res.locals.active;
			let contact = res.locals.contact;
			let params = req.params;
			let body = req.body;


			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.getProperty(connection);
			await lease.canAccess(connection, company.id, res.locals.properties)

			let service = new Service();
			await service.create(connection, body, lease.id, company.id, false, lease.Property.id);

			utils.send_response(res, {
				status: 200,
				data:{
					service_id: Hashes.encode(service.id, res.locals.company_id)
				}
			});


			eventEmitter.emit('lease_service_created', {  contact, company, service, lease, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}



	});

	router.put('/:lease_id/decline-insurance', [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.declineInsurance), Hash.unHash], function(req, res, next){

		var company = res.locals.active;
		var contact = res.locals.contact;
		var params = req.params;
		var body = req.body;

		var lease = {};
    var connection = res.locals.connection
    lease = new Lease({id: params.lease_id});
    return lease.find(connection)
			.then(() => lease.canAccess(connection, company.id, res.locals.properties))
			.then(() => lease.declineInsurance(connection, body.decline_insurance, body.insurance_exp_month, body.insurance_exp_year))
			.then(() => {
				var activity = new Activity();
				return activity.create(connection,company.id, contact?.id, 26, 18, params.lease_id);
			})
			.then(() => {
				utils.send_response(res, {
					status: 200,
					data:{},
				});
			})
			.catch(next)

	});

	router.put('/:lease_id/services/:service_id', [control.hasAccess(['admin']), joiValidator.body( Schema.updateService), Hash.unHash], async(req, res, next) => {

		try{
  		var connection = res.locals.connection;
			let company = res.locals.active;
			let contact = res.locals.contact;
			let params = req.params;
			let body = req.body;			

			let lease =  new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			lease.modified_by = contact?.id;

			let service =  new Service({id: params.service_id});			
			await service.update(connection, body, company.id, res.locals.properties);

			if(service.Product.default_type === 'rent'){
				lease.rent = service.price;
				await lease.save(connection);
			}

			utils.send_response(res, {
				status: 200,
				data:{
					service_id: Hashes.encode(service.id, res.locals.company_id)
				}
			});


			eventEmitter.emit('lease_service_updated', {  contact, company, service, lease, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}

	});

	router.delete('/:lease_id/services/:service_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{
      var connection = res.locals.connection;
      let company = res.locals.active;
      let contact = res.locals.contact;
      let params = req.params;
      let body = req.body;

      let lease =  new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
			lease.modified_by = contact?.id;

	  await lease.getProperty(connection, company.id);

      let service =  new Service({id: params.service_id});
	  if (body && Object.keys(body).length === 0){
		await service.updateEndDate(connection);
	  } else {
		await service.update(connection, body, company.id, res.locals.properties);
		if(service.Product.default_type === 'rent'){
			lease.rent = service.price;
			await lease.save(connection);
		  }
	  }

      utils.send_response(res, {
        status: 200,
        data:{
          service_id: Hashes.encode(service.id, res.locals.company_id)
        }
      });


      eventEmitter.emit('lease_service_updated', {  contact, company, service, lease, cid: res.locals.company_id, locals: res.locals});

    } catch(err) {
      next(err);
    }

  });

	router.post('/:lease_id/template-insurance', [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.templateInsurance), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;
		try{
			var company = res.locals.active;
			var contact = res.locals.contact;
			var params = req.params;
			var body = req.body;

			let lease =  new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let unit = new Unit({id: lease.unit_id});
			await unit.find(connection);

			let property = new Property({id: unit.property_id});
			await property.find(connection);

			let insurances = await property.getInsurances(connection, company.id, {insurance_id: body.insurance_id});
			if(!insurances.length) e.th(404, "No insurance found");

			let insurance = insurances[0];
			await models.Service.deleteInsuranceServices(connection, lease.id);
			insurance.setPremium(lease.rent);

			let service = new Service({
				lease_id: lease.id,
				product_id: insurance.product_id,
				price: insurance.premium,
				taxable: insurance.taxable,
				qty: 1,
				start_date: lease.start_date,
				end_date: null, //(insurance.recurring)? null: lease.start_date,
				recurring: insurance.recurring,
				prorate: insurance.prorate,
				prorate_out: insurance.prorate_out,
				service_type: 'insurance',
				name: insurance.name
			});
			await service.save(connection);

			await lease.declineInsurance(connection, false);

			var activity = new Activity();
			await activity.create(connection,company.id,contact?.id, 3, 48, params.lease_id, service.id );

			utils.send_response(res, {
				status: 200,
				data:{
					insurance: Hashes.encode(service.id, res.locals.company_id)
				}
			});



		} catch(err) {
			next(err);
		}


	});

  /* Todo - Is this deprecated? */
	router.delete('/:lease_id/template-insurance',[control.hasAccess(['admin', 'api'] ), Hash.unHash], function(req, res, next){

		var company = res.locals.active;
		var contact = res.locals.active;
		var params = req.params;


    var connection = res.locals.connection
    var lease = new Lease({id: params.lease_id});
    return lease.find(connection)
			.then(() => lease.canAccess(connection, company.id, res.locals.properties))
			.then(() => models.Service.deleteInsuranceServices(connection, lease.id))
			// .then(() => {
			// 	var activity = new Activity();
			// 	return activity.create(connection,company.id,contact.id, 4, 48, params.lease_id );
			// })
      .then(() => {
				utils.send_response(res, {
					status: 200,
					data:{}
				});
			})

			.catch(next)

	});

	// MAINTENANCE //

	router.get('/:lease_id/maintenance/:type',[control.hasAccess(['admin','tenant'] ), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;
		try{
			let params = req.params;
			let query = req.query;
			let company = res.locals.active;

			let lease =  new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let requests = await lease.findMaintenance(connection, params.type, company);

			utils.send_response(res, {
				status: 200,
				data: {
					maintenance: Hash.obscure(requests, req)
				}
			})



		} catch(err) {
			next(err);
		}
	});

	router.get('/:lease_id/over-payments',[control.hasAccess(['admin', 'api'] ), Hash.unHash], async(req, res, next) => {

		/*
			if in an annual payment Cycle. 
			Calulate time from start of payment cycle. Divide by 3
		*/
	
		
		try {
			var connection = res.locals.connection;
		
			var contact = res.locals.contact || {};
			const { api } = res.locals;
			let params = req.params;
			let query = req.query;
			let confirm = query.confirm; 
			let company = res.locals.active;
			let date = query.moved_out;
			let lease =  new Lease({id: params.lease_id});
			let ref_num = null;
			let overpayments = {};
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.findUnit(connection);
			
			await lease.getPaymentCycleOptions(connection);
			await lease.getActivePaymentCycle(connection);
			
			let prorate_day = moment(query.moved_out, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
			
			let invoices = await lease.findInvoicesToRefund(connection, prorate_day);
			
			let total_to_refund = invoices.reduce( (a,b)  => b.total_payments > 0 ? a + (b.balance > 0 ? (b.credit - b.balance) : b.credit) : a , 0);
			
			// loop through invoices
			for(let i = 0 ; i < invoices.length; i++){
				if(!invoices[i].credit) continue;
				// task 'credit' or 'void'
				// credit should add payment_credits to invoice. 
				if( moment(date, 'YYYY-MM-DD').format('x') < moment(invoices[i].due, 'YYYY-MM-DD').format('x') ){
					invoices[i].task = 'void';
				} else {
					invoices[i].task = 'credit';
				}

				invoices[i].payment_credits = [];
				let amount_to_credit = invoices[i].balance > 0 ? (invoices[i].credit - invoices[i].balance) : invoices[i].credit;  

				for(let j = 0; j < invoices[i].Payments.length; j++){
					if(!amount_to_credit) continue; 
					let payment_application = invoices[i].Payments[j];	
									
					if(payment_application.Payment.sub_method === 'move_out'){
						amount_to_credit -= payment_application.amount;

						continue
					}
					
					if(payment_application.Payment.method === 'loss'){
						amount_to_credit -= payment_application.amount;
						total_to_refund = total_to_refund > payment_application.amount ? total_to_refund - payment_application.amount : 0;

						continue
					}

					let amt = payment_application.amount > amount_to_credit ? amount_to_credit : payment_application.amount;

					overpayments[payment_application.payment_id] = overpayments[payment_application.payment_id] || {
						date: payment_application.Payment.date,
						amount: 0,
						Payment: payment_application.Payment
					};

					overpayments[payment_application.payment_id].amount += amt; 
	
					invoices[i].payment_credits.push({
						...payment_application, 
						refund_amount: amt,
						invoice: invoices[i]
					});

					amount_to_credit -= amt; 
				}
			}
			

			let account_balance = 0;
			let amt_to_refund = utils.r(total_to_refund);
			
			// calcualte invoice to create
			// making this future proof
			
			let adjustment_invoice = null;
			if(lease.PaymentCycle && lease.PaymentCycle.id){ 
				adjustment_invoice = await lease.createPaymentCycleAdjustmentInvoice(connection, invoices, company.id, date);
				if(adjustment_invoice?.balance){
					amt_to_refund = utils.r(amt_to_refund - adjustment_invoice.balance);
				}
			}
			
	
			if(confirm){
				
				try{
					await utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['refund_on_move_out']});
				} catch {
					e.th(403, "You do not have permission to perform this action. Please contact your administrator.");
				}

				await connection.beginTransactionAsync();
				
				if(adjustment_invoice?.balance){
					await adjustment_invoice.save(connection);
				}

				// new invoice_payment_breakdown ids
				let invoice_payment_breakdown_ids = [];

				// if we should prorate out invoice, we should apply a move out credit, 

				// Future invoices should be voided, and the payment should be unapplied. 
				
				for(let i = 0; i < invoices.length; i++){
					if(invoices[i].task === 'void'){
						let ipbd_ids = await invoices[i].unapplyPayments(connection);
						invoice_payment_breakdown_ids = invoice_payment_breakdown_ids.concat(ipbd_ids);
						await invoices[i].void_invoice(connection);
					} else if (invoices[i].task === 'credit'){
						for(let j = 0; j < invoices[i].payment_credits.length; j++){
							let payment_credit = invoices[i].payment_credits[j]
							// update to apply a lower amount to invoice
				
							let invoice_payment_breakdown_id = await models.Payment.applyPayment(connection, {date: date, amount : payment_credit.amount - payment_credit.refund_amount }, payment_credit.id);
							invoice_payment_breakdown_ids.push(invoice_payment_breakdown_id);
							// Apply a credit to invoice
							let payment = new Payment(payment_credit.Payment);
							await payment.find(connection);

							var data = {
								amount: payment_credit.refund_amount,
								property_id: payment.property_id,
								contact_id: payment.contact_id,
								date: date,
								number: ref_num, // TODO how to get this?
								lease_id: lease.id,
								sub_method: Enums.ADJUSTMENT_SUB_METHOD.MOVE_OUT,
								notes: "Move out adjustment"
							}
							
							let creditPayment = new Payment();
							
							await creditPayment.createAdjustment(connection, data, contact.id);
		
							var invoiceCreditApplication = {
								amount:payment_credit.refund_amount,
								payment_id: creditPayment.id,
								invoice_id: invoices[i].id,
								date: date
							}
				
							await models.Payment.applyPayment(connection, invoiceCreditApplication);	
						}
					}
				}
				
				
				// get open payments and apply it to the outstanding balance if there is any 	
				account_balance = adjustment_invoice && adjustment_invoice?.balance || 0;
				
				
		
			

				
				for(let i = 0; i < Object.values(overpayments).length; i++){
					let overpayment = Object.values(overpayments)[i];
				
					
					if(account_balance){
						let payment_amount = account_balance > overpayment.amount ? overpayment.amount: account_balance;

				

						//reduce the refund amount by the amount we are going to apply to this invoice. 
						overpayment.amount -= payment_amount;
						//reduce the account balance by the amount we are going to apply to this invoice. 
						account_balance -= payment_amount;  
						
						let invoicesPayment = {
							invoice_id: adjustment_invoice.id,
							payment_id: overpayment.Payment.id,
							date: date,
							amount: utils.r(payment_amount)
						};

						await models.Payment.applyPayment(connection, invoicesPayment);

					}

					overpayment.amount = utils.r(overpayment.amount); 
					if(	overpayment.amount){

						// await overpayment.Payment.refund(connection, company, overpayment.amount, null, null, null, [invoice_payment_breakdown_id]);
						let payment = new Payment(overpayment.Payment);
						await payment.find(connection);
						await payment.canReverse(connection,{by_pass:true});
						await payment.refund(connection, company, overpayment.amount, "", "Refund extra amount of move-out", null, invoice_payment_breakdown_ids);
					}

				}
				
				if(adjustment_invoice?.balance){
					
					await adjustment_invoice.find(connection);
					await adjustment_invoice.total();
				}
					
				await connection.commitAsync();
			}
			
			utils.send_response(res, {
				status: 200,
				data: {
					overpayments: total_to_refund,
					account_balance: adjustment_invoice && adjustment_invoice?.balance,
					amt_to_refund: amt_to_refund
				}
			});



		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.post('/:lease_id/process-overpayment',[control.hasAccess(['admin'] ), Hash.unHash], async(req, res, next) => {

		var params = req.params;
		var body = req.body;
		var company = res.locals.active;
		var contact = res.locals.contact;

		var connection = res.locals.connection;

		try{
			await connection.beginTransactionAsync();

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection, company.id, res.locals.properties);

			if(body.refunds.length) {
				for (let i = 0; i < body.refunds.length; i++){
					let refund  = body.refunds[i];
					if(refund.credit > 0){
						var payment = new Payment({
							id: refund.payment_id
						});

						await payment.find(connection)
						await payment.verifyAccess(connection, company.id, res.locals.properties);

						// Deducting credit amount from the invoice payment
						let paymentApplication = await Payment.getPaymentApplicationById(connection, refund.id);
						let invoice_payment_breakdown_id = await models.Payment.applyPayment(connection, {date: body.date, amount : paymentApplication.amount - refund.credit }, refund.id);

						// Generating credit payment
						var data = {
							amount: refund.credit,
							property_id: payment.property_id,
							contact_id: payment.contact_id,
							date: body.date,
							number: body.ref_num,
							lease_id: lease.id,
							sub_method: Enums.ADJUSTMENT_SUB_METHOD.MOVE_OUT,
							notes: "Move out adjustment",
						}
						let creditPayment = new Payment();
						await creditPayment.createAdjustment(connection, data, contact.id);

						var invoicePayment = {
							amount: refund.credit,
							payment_id: creditPayment.id,
							invoice_id: body.id,
							date: body.date
						}
						await models.Payment.applyPayment(connection, invoicePayment);
						await payment.canReverse(connection,{by_pass:true});
						await payment.refund(connection, company, refund.credit, null, null, null, [invoice_payment_breakdown_id]);
					}

				}
			}

			var activity = new Activity();
			await activity.create(connection,company.id,contact.id, 3, 41, body.id );

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {}
			});

			let events = [];
			events.push('overpayment_processed');
			events.map(e => {
        eventEmitter.emit(e, { contact, company, lease, property_id: property.id, cid: res.locals.company_id, locals: res.locals});
			});



		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

  /*router.post('/:lease_id/transfer',[control.hasAccess(['admin']), async(req, res, next) => {

    var connection = res.locals.connection;
    try{
      let params = req.params;
      let body = req.body;
      let company = res.locals.active;
      let ip_address = req.ip;
      let newCredit = {};
      let new_start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');

      await connection.beginTransactionAsync();
      let unit = new Unit({id: body.unit_id})
      await unit.find(connection);
      await unit.verifyAccess(connection, company.id, res.locals.properties);

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      // MOVE INTO NEW UNIT
      let transferLease = await lease.transfer(connection, body.unit_id, new_start_date, company.id);

      // Handle over-payments
      let invoices = await lease.findInvoicesToRefund(connection, new_start_date);
      for (let i = 0; i< invoices.length; i++){
        let inv = invoices[0];

        var amtToApplyOld = 0;
        var amtToCredit = inv.totalInvoiceCredit();
        var paymentTotal = inv.total_payments;
        var balance = inv.balance;

        console.log("inv", inv);
        console.log("lines", inv.InvoiceLines);
        console.log("paymentTotal", paymentTotal);
        console.log("amtToCredit", amtToCredit);
        console.log("balance", balance);


        // if there is a balance on the old account, apply credit as possible. If no balance due save credit for new lease
        amtToApplyOld = balance > amtToCredit ? amtToCredit: balance;

        if(amtToApplyOld > 0 ) {

          let credit = new Payment({
            source: 'manual',
            method: 'credit',
            amount: amtToApplyOld,
            lease_id: lease.id,
            date: body.date,
            number: body.ref_num,
            created: moment.utc()
          });


          await credit.save(connection);
          let invoicePayment = {
            amount: amtToApplyOld,
            payment_id: credit.id,
            invoice_id: inv.id,
            date: body.date
          }

          await models.Payment.applyPayment(connection, invoicePayment );
          for(let j = 0; i < inv.InvoiceLines; j++){
            if(!inv.InvoiceLines[j].Service.prorate) continue;
            await models.Invoice.saveInvoiceLine(connection, {end_date: body.date}, inv.InvoiceLines[j].id);
          }
        }

        amtToCredit -= amtToApplyOld;
        if(amtToCredit > 0) {
          newCredit = new Payment({
            source: 'manual',
            method: 'credit',
            amount: amtToCredit,
            lease_id: transferLease.id,
            date: body.date,
            number: body.ref_num,
            created: moment.utc()
          });

          await newCredit.save(connection)
        }
      }


      // move out of old lease
      await lease.moveOut(connection, body.date);

      // transfer Tenants, PaymentMethods, and Discounts
      for(let i = 0; i < lease.Tenants.length; i++){
				let tenant = {
					contact_id: lease.Tenants[i].contact_id,
					lease_id: transferLease.id,
					primary: body.primary || 0
				};

				await models.ContactLeases.save(connection, tenant);
      }

      for(let i = 0; i < lease.PaymentMethods.length; i++){
        await lease.PaymentMethods[i].transferLease(connection, transferLease.id);
      }

      for(let i = 0; i < lease.Discounts.length; i++){
        let d = lease.Discounts[i];
        d.lease_id = transferLease.id;
        d.id = null;
        await d.save(connection)
      }
      // transfer services

      for(let i = 0; i < lease.Services.length; i++){
        let s = lease.Services[i];

        // Dont transfer these

        if(!s.recurring && s.last_billed) continue;
        if(s.recurring && s.end_date <= moment().format('YYYY-MM-DD')) continue;
        if(s.recurring && s.end_date && s.end_date <= s.last_billed) continue;

        // save these
        if(s.Product.default_type === 'rent'){
          s.price = body.rent;
        }
        if(s.recurring && s.start_date < body.date){
          s.start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
        }
        s.lease_id = transferLease.id;
        s.id = null;
        console.log("Service", s);
        await s.save(connection);
      }


      for(let i = 0; i < lease.InsuranceServices.length; i++){
        let s = lease.InsuranceServices[i];
        // Dont transfer these
        if(!s.recurring && s.last_billed) continue;
        if(s.recurring && s.end_date && s.end_date <= s.last_billed) continue;

        if(s.recurring && s.start_date < body.date){
          s.start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
        }
        s.lease_id = transferLease.id;
        s.id = null;
        await s.save(connection);
      }

      // Create invoice on new lease for charges
      let invoicePeriod = transferLease.getCurrentInvoicePeriod();
      // For a given invoice period, find:
      let services = await transferLease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone());


      if (services) {
        let invoice = new Invoice({
          lease_id: transferLease.id,
          user_id: null,
          date: new_start_date,
          due: new_start_date,
          company_id: company.id,
          type: "auto",
          status: 1
        });
        invoice.Lease = transferLease;
        invoice.Company = company;


        await invoice.makeFromServices(
          connection,
          services,
          transferLease,
          invoicePeriod.start,
          invoicePeriod.end,
          null,
          company.id
        )

        await invoice.save(connection)

        // if there is a credit, apply what we can to the invoice
        if(newCredit.id) {
          let  amtToApply = invoice.balance > newCredit.amount? newCredit.amount : invoice.balance;

          console.log(invoice.InvoiceLines);
          console.log(invoice.sub_total);
          console.log("invoice.balance", invoice.balance);
          console.log("AmtToApply", amtToApply);

          let invoicePayment = {
            amount: amtToApply,
            payment_id: newCredit.id,
            invoice_id: invoice.id,
            date: body.date
          }
          await  models.Payment.applyPayment(connection, invoicePayment )
        }
      }

      await connection.commitAsync();
      utils.send_response(res, {
        status: 200,
        data: {

        }
      });

      // var activity = new Activity();
      // return activity.create(connection,company.id,contact.id,22,18, transferLease.id );



    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }






    // var company = res.locals.active;
    // var contact = res.locals.contact;
    // var ip_address = req.ip;
    // var params = req.params;
    // var body = req.body;
    // var connection = {};
    // var lease = {};
    // var unit = {};
    // var billday = {};
    // var credit = {};
    // var transferLease = {};
    // var new_start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
    // var newCredit = {};
    // var period_start = '';
    // var period_end = '';
    // var invoicePeriod = '';
    // var invoiceCredit = '';
    //
    // pool.getConnectionAsync()
    // 	.then(function (conn) {
    // 		connection = conn;
    // 		// begin transaction
    // 		return connection.beginTransactionAsync();
    // 	}).then(function () {
    // 		unit = new Unit({id: body.unit_id})
    // 		return unit.find(connection)
    // 	})
    // 	.then(() => unit.verifyAccess(connection, company.id))
    // 	.then(function () {
    // 		lease = new Lease({id: params.lease_id});
    //
    // 		return lease.find(connection)
    // 	})
    // 	.then(() => lease.canAccess(connection, company.id))
    // 	.then(() => lease.getTenants(connection))
    // 	.then(() => lease.getServices(connection))
    // 	.then(() => lease.findAllDiscounts(connection))
    // 	.then(() => lease.findPaymentMethods(connection))
    // 	.then(() => lease.getCurrentBalance(connection))
    // 	.then(() => lease.getChecklist(connection, company.id))
    // 	.then(() => {
    //
    // 		// create new lease
    // 		transferLease = new Lease({
    // 			unit_id: body.unit_id,
    // 			start_date: new_start_date,
    // 			end_date: lease.end_date,
    // 			bill_day: lease.bill_day,
    // 			notes: lease.notes,
    // 			terms: lease.terms,
    // 			rent: lease.rent,
    // 			status: lease.status,
    // 			token: lease.token,
    // 			achtoken: lease.achtoken,
    // 			security_deposit: lease.security_deposit,
    // 			moved_out: lease.moved_out
    // 		});
    // 		return transferLease.save(connection);
    // 	})
    // 	.then(() => lease.findInvoicesToRefund(connection, new_start_date))
    // 	.map(inv => {
    // 		// validate values..
    // 		// create a credit memo
    //
    //
    // 		var amtToApplyOld = 0;
    // 		var amtToCredit = inv.totalInvoiceCredit();
    // 		var paymentTotal = inv.total_payments;
    // 		var balance = inv.balance;
    //
    // 		console.log("inv", inv);
    // 		console.log("lines", inv.InvoiceLines);
    // 		console.log("paymentTotal", inv.total_payments);
    // 		console.log("amtToCredit", amtToCredit);
    // 		console.log("balance", balance);
    //
    //
    //
    //
    //     return Promise.resolve().then(() => {
    // 			// if there is a balance on the old account, apply credit as possible. If no balance due save credit for new lease
    // 			amtToApplyOld = balance > amtToCredit ? amtToCredit: balance;
    // 			if(amtToApplyOld == 0 ) return;
    // 			var credit = new Payment({
    // 				type:'manual',
    // 				method: 'credit',
    // 				amount: amtToApplyOld,
    // 				lease_id: lease.id,
    // 				date: body.date,
    // 				number: body.ref_num,
    // 				created: moment.utc()
    // 			});
    //
    // 			return credit.save(connection).then(() => {
    // 				var invoicePayment = {
    // 					amount: amtToApplyOld,
    // 					payment_id: credit.id,
    // 					invoice_id: inv.id,
    // 					date: body.date
    // 				}
    // 				return models.Payment.applyPayment(connection, invoicePayment )
    // 			}).then(() => {
    // 				return Promise.map(inv.InvoiceLines, line => {
    // 					if(!line.Service.prorate) return true;
    // 					return models.Invoice.saveInvoiceLine(connection, {end_date: body.date}, line.id)
    // 				});
    // 			})
    //
    // 		}).then(() => {
    // 			amtToCredit -= amtToApplyOld;
    //
    // 			if(amtToCredit == 0) return;
    // 			// Apply remaining credit to new lease
    // 			newCredit = new Payment({
    // 				type:'manual',
    // 				method: 'credit',
    // 				amount: amtToCredit,
    // 				lease_id: transferLease.id,
    // 				date: body.date,
    // 				number: body.ref_num,
    // 				created: moment.utc()
    // 			});
    //
    // 			return newCredit.save(connection)
    //
    // 		})
    // 	}).then(() => {
    // 		// move out of old lease
    // 		lease.end_date = body.date;
    // 		lease.moved_out = body.date;
    // 		if(moment(lease.end_date, 'YYYY-MM-DD').isBefore(moment(lease.start_date, 'YYYY-MM-DD'))){
    // 			lease.end_date = lease.start_date;
    // 		}
    // 		return lease.save(connection);
    // 	})
    // 	.then(() => Promise.mapSeries(lease.Tenants, t => models.Lease.AddTenantToLease(connection, t.contact_id, transferLease.id)))
    // 	.then(() => Promise.mapSeries(lease.PaymentMethods, p => p.transferLease(connection, transferLease.id)))
    // 	.then(() => Promise.mapSeries(lease.Discounts, d => {
    // 		d.lease_id = transferLease.id;
    // 		d.id = null;
    // 		return d.save(connection)
    // 	}))
    // 	.then(() => Promise.mapSeries(lease.Services, s => {
    // 		// end all current services & create new service
    //
    // 		if(!s.recurring && s.last_billed) return;
    //
    // 		if(s.recurring && s.end_date && s.end_date <= s.last_billed) return;
    //
    // 		if(s.Product.default_type == 'rent'){
    // 			s.price = body.rent;
    // 		}
    //
    // 		if(s.recurring && s.start_date < body.date){
    // 			s.start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
    // 		}
    // 		s.lease_id = transferLease.id;
    // 		s.id = null;
    // 		return s.save(connection);
    // 	}))
    //
    //
    // 	.then(() => Promise.mapSeries(lease.InsuranceServices, s => {
    //
    // 		if(!s.recurring && s.last_billed) return;
    // 		if(s.recurring && s.end_date && s.end_date <= s.last_billed) return;
    //
    // 		if(s.recurring && s.start_date < body.date){
    // 			s.start_date = moment(body.date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
    // 		}
    // 		s.lease_id = transferLease.id;
    // 		s.id = null;
    // 		return s.save(connection);
    // 	}))
    //
    // 	.then(() => {
    //
    // 		invoicePeriod = transferLease.getCurrentInvoicePeriod();
    // 		// For a given invoice period, find:
    // 		return transferLease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone());
    //
    // 		// // generate new invoice
    // 		// billday =  transferLease.getNextBillingDate();
    // 		// period_start = billday.clone().subtract(1, 'month');
    // 		// period_end = billday.clone().subtract(1,'day');
    // 		// return transferLease.getCurrentServices(connection, company.id, period_start.clone(), period_end.clone() )
    // 	})
    //
    // 	.then((services) => {
    //
    // 		if (!services) return;
    // 		var invoice = new Invoice({
    // 			lease_id: transferLease.id,
    // 			user_id: null,
    // 			date: new_start_date,
    // 			due: new_start_date,
    // 			company_id: company.id,
    // 			type: "auto",
    // 			status: 1
    // 		});
    // 		invoice.Lease = transferLease;
    // 		invoice.Company = company;
    //
    // 		return invoice.makeFromServices(
    // 			connection,
    // 			services,
    // 			transferLease,
    // 			invoicePeriod.start,
    // 			invoicePeriod.end,
    // 			null,
    // 			company.id
    // 		)
    // 		.then(() => invoice.save(connection))
    // 		.then(() => {
    // 			if(!newCredit.id) return;
    // 			var amtToApply = invoice.balance > newCredit.amount? newCredit.amount : invoice.balance;
    //
    // 			console.log(invoice.InvoiceLines);
    // 			console.log(invoice.sub_total);
    // 			console.log("invoice.balance", invoice.balance);
    // 			console.log("AmtToApply", amtToApply);
    //
    //
    //
    // 			var invoicePayment = {
    // 				amount: amtToApply,
    // 				payment_id: newCredit.id,
    // 				invoice_id: invoice.id,
    // 				date: body.date
    // 			}
    // 			return models.Payment.applyPayment(connection, invoicePayment )
    // 		})
    // 	})
    // 	.then(() => {
    //
    // 		var activity = new Activity();
    // 		return activity.create(connection,company.id,contact.id,22,18, transferLease.id );
    // 	})
    // 	.then(() => connection.commitAsync())
    // 	.then(() => {
    // 		utils.send_response(res, {
    // 			status: 200,
    // 			data:{
    // 				lease_id: Hashes.encode(transferLease.id)
    // 			}
    // 		});
    // 	})
    // 	.then(() => utils.saveTiming(connection, req, res.locals))
    // 	.catch(function(err){
    // 		return connection.rollbackAsync().then(() => next(err));
    // 	})
    // 	.finally(() => utils.closeConnection(pool, connection))

  });*/

  router.get('/:lease_id/discounts', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
	var connection = res.locals.connection;
	try{

		let contact = res.locals.contact;
		let company = res.locals.active;
		let query = req.query;
		let body = req.body;
		let params = req.params;

		query.date = query.date || moment().format('YYYY-MM-DD');

		let lease = new Lease({id: params.lease_id});
		await lease.find(connection);
		await lease.getDiscounts(connection, query.date);

		utils.send_response(res, {
			status: 200,
			data: {
				discounts: Hash.obscure(lease.Discounts, req)
			}
		})
	} catch(err) {
		next(err);
	}
	});	

  router.get('/:lease_id/contacts', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact
      let company = res.locals.active;
      let query = req.query;
      let body = req.body;
      let params = req.params;


      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getTenants(connection);
      let contacts = [];
      for(let i = 0; i < lease.Tenants.length; i++ ){

        await lease.Tenants[i].Contact.getRelationships(connection)

        contacts.push(lease.Tenants[i].Contact);
      }
      utils.send_response(res, {
        status: 200,
        data: {
          contacts: Hash.obscure(contacts, req)
        }
      });


    } catch(err) {
      next(err);
    }


  });


  router.post('/:lease_id/send-message', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{

      let user = res.locals.contact;
      let company = res.locals.active;
      let query = req.query;
      let body = req.body;
      let params = req.params;
      let jobs = [];
      if(!body.message.length){
        e.th(400, "You have not entered a message to send.");
      }
      if(!body.subject.length){
        e.th(400, "You have not entered a subject.");
      }

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      let upload = new Upload({id: body.upload_id})
      await upload.find(connection);
      await upload.findUploadLeases(connection);


      // Check if this upload is on this lease.
      if(!upload.Leases.filter(l => l.id === lease.id).length) e.th(403);

      let file = await upload.download();

      //console.log('encoded3', typeof encoded);
      for(let i = 0; i < body.emails.length; i++ ){
        let contact = new Contact({id: body.emails[i].contact_id});
        await contact.find(connection);
        await contact.verifyAccess(company.id);

        let valid = await contact.isOnLease(connection, params.lease_id);
        if(!valid) e.th(403);

        jobs.push({
          category: 'message_to_user',
          data: {
            cid: res.locals.company_id,
            admin_id: user.id,
            contact_id: contact.id,
            company_id: company.id,
            send_email: true,
            subject: body.subject,
            message: body.message,
            action: 'write',
            label: '',
            admin: user.id,
            attachments: [{
              content: file.Body.toString('base64'),
              type: "application/pdf",
              name: upload.filename
            }]
          }
        });

      }


      utils.send_response(res, {
        status: 200,
        data: {}
      });

      await new Promise((resolve, reject) => {
        Scheduler.addJobs(jobs, err => {
          if(err) reject(err);
          resolve()
        });
      });



    } catch(err) {
      next(err);
    }

  });

  // router.get('/:lease_id/documents', [control.hasAccess(['admin']), async(req, res, next) => {
  //
  //   var connection = res.locals.connection;
  //   try{
  //
  //     let contact = res.locals.contact;
  //     let company = res.locals.active;
  //     let params = req.params;
  //
  //
  //     let lease = new Lease({id: params.lease_id});
  //     await lease.find(connection);
  //     await lease.canAccess(connection, company.id);
  //     await lease.getDocuments(connection, company);
  //
  //     utils.send_response(res, {
  //       status: 200,
  //       data: {
  //         documents: lease.Documents
  //       }
  //     });
  //
  //
  //   } catch(err) {
  //     next(err);
  //   }
  //
  //
  // });

  router.get('/:lease_id/documents/:document_id/generate', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{

      let user = res.locals.contact;
      let company = res.locals.active;
      let query = req.query;

      let params = req.params;
	  let { document_id, lease_id } = params;
      let lease = new Lease({id: params.lease_id});

      await lease.find(connection);
      await lease.canAccess(connection, company.id);
	  await lease.getContactByLeaseId(connection);

		const { SIGNED, UN_SIGNED } = Enums.DOCUMENT_TYPES;
		const { document_type, type } = query;

		let documentInstanceType = null;
		if (!document_type && !type?.length) documentInstanceType = Document;
		else if (document_type) {
			switch (document_type) {
				case SIGNED:
					documentInstanceType = Document;
					break;
				case UN_SIGNED:
					documentInstanceType = DocumentManager;
					break;
			}
		}

	  	const documentFactory = new DocumentFactory({ static_instance: true, type: type, instance_type: documentInstanceType });
	  	const document = documentFactory.createDocument();
		let documentFlow;

      /* kicks off the process to create, send, and upload panda doc to S3. See Workers */

	  if (documentFactory.instance_type === Document) {
		documentFlow = 'generatePandaDoc';
	  } else {
		documentFlow = 'run_document_flow';
	  }
	  
	  const result = await Queue.add(documentFlow, {
        cid: res.locals.company_id,
        lease_id: lease_id,  
        document_id: document_id,  
        checklist_id: query.checklist_id,
        company_id: company.id,
        uploaded_by: user.id,
        contact_id: lease.Contact.id,
        priority: 1,
        socket_details: {
          company_id: res.locals.company_id,
          contact_id: user.id
        },
		// add context to document workflow jobs
		ctx: {
			traceId: res.locals.trace_id,
			requestId: res.locals.request_id,
		}
      }, {priority: 1});

	  res.locals.logging.redisKey = `bull:hummingbirdQueue:${result?.id}`;

      utils.send_response(res, {
        status: 200,
        data: {
			message: "document added to  generation queue"
		}
      });

    } catch(err) {
      next(err);
	}
	
  });

  router.get('/:lease_id/metrics', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {

	try{

		let params = req.params;
		var connection = res.locals.connection;
		let company = res.locals.active;

		let lease = new Lease({id: params.lease_id});
		await lease.find(connection);
		await lease.canAccess(connection, company.id, res.locals.properties);
		await lease.getMetrics(connection);

		utils.send_response(res, {
			status: 200,
			data: {
				metrics: lease.Metrics
			}
		});

	} catch(err) {
		next(err);
	}



});

  router.get('/:lease_id/vehicles',[control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

	const connection = res.locals.connection;

	try {
		const params = req.params;
		const company = res.locals.active;

		let lease = new Lease({ id: params.lease_id });
		await lease.canAccess(connection, company.id, res.locals.properties);
		await lease.findVehicles(connection);

		utils.send_response(res, {
			status: 200,
			data: {
				vehicles: Hash.obscure(lease.Vehicles, req)
			}
		});



	} catch(err) {
		next(err);
	}


});

  router.post('/:lease_id/vehicles', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.saveVehicle), Hash.unHash], async (req, res, next) =>  {

	const connection = res.locals.connection;

	try {
			const params = req.params;
			const company = res.locals.active;
			const body = req.body;

			let lease = new Lease({ id: params.lease_id });
			await lease.canAccess(connection, company.id, res.locals.properties);
			let vehicle_id = await lease.saveVehicle(connection, body);

			utils.send_response(res, {
				status: 200,
				data: {
					vehicles: Hashes.encode(vehicle_id, res.locals.company_id)
				}
			});
		} catch(err) {
			next(err);
		}
	});

	router.put('/:lease_id/vehicles', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.saveVehicle), Hash.unHash], async (req, res, next) =>  {

		const connection = res.locals.connection;

		try {
				const params = req.params;
				const company = res.locals.active;
				const body = req.body;

				if(!body.id) {
					e.th(400, "vehicle_id is required")
				}

				let lease = new Lease({ id: params.lease_id });
				await lease.canAccess(connection, company.id, res.locals.properties);

				let vehicle_id;
				if(body.active == 0) {
					vehicle_id = await lease.removeVehicle(connection, body);
				} else {
					vehicle_id = await lease.saveVehicle(connection, body);
				}

				utils.send_response(res, {
					status: 200,
					data: {
						vehicles: Hashes.encode(vehicle_id, res.locals.company_id)
					}
				});



			} catch(err) {
				next(err);
			}


		});

	router.get('/:lease_id/transfer-credits',[control.hasAccess(['admin'] ), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			let params = req.params;
			let query = req.query;
			let company = res.locals.active;

			let lease =  new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			let prorate_day = moment(query.transfer_date).format('YYYY-MM-DD');
			let invoices = await lease.findTransferCreditInvoices(connection, prorate_day, { search_all: false });

			utils.send_response(res, {
				status: 200,
				data: {
					invoices: Hash.obscure(invoices, req)
				}
			});



		} catch(err) {
			next(err);
		}


	});

	router.post('/:lease_id/transfer', [control.hasAccess(['admin'] ), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;

		try {
			let contact = res.locals.contact;
			let company = res.locals.active;
			const params = req.params;
			let body = req.body;
			let api = res.locals.api;
			let permissions = res.locals.permissions;
			let events = [];
			const { payment } = body;
			var post_params = {
				id: body.id,
				start_date: body.start_date || moment().format('YYYY-MM-DD'),
				end_date: body.end_date || null,
				rent: body.rent,
				security_deposit: body.security_deposit,
				coupons: body.coupons || [],
				discount_id: null,
				insurance_id: body.insurance_id,
				promotions: body.promotions ? body.promotions.filter(p => p.promotion_id) : [],
				discount_id: body.discount_id || null,
				billed_months: body.billed_months || 0,
				hold_token: body.hold_token,
				products: body.products || [],
				save: body.save,
				reservation_id: body.reservation_id || null,
				is_transfer: 1,
				payment_cycle: body.payment_cycle,
				user_id: contact?.id
			  };

			const isNewPayment = payment?.amount > 0;
			if (isNewPayment) {
				post_params.billed_months++;
			}
			  // console.log("post_params", post_params);
			  // if in a payment cycle, just get the dates from the existing payment cycle and use that for the new payment cycle. 
			
			try{
				await utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['edit_bill_day_transfer_process']});
				post_params.bill_day = body.bill_day;
			} catch(err){
				console.log("edit_bill_day_transfer_process error", err);
			}

			if(body.promotions && body.promotions.length > 1){
				let promotionIds =  body.promotions.map(x=> x.promotion_id)
				let newPromotions = [...new Set(promotionIds)]
				if(newPromotions.length !== body.promotions.length) {
					e.th(400,"Duplicate promotions are not allowed.");
				}
			}

			try {
				post_params.rent = body.rent;
			} catch(err){
				console.log("err", err);
			}

			try {
				// utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['apply_promotions']});
				post_params.discount_id = body.discount_id || null;
				post_params.promotions = body.promotions.filter(p => p.promotion_id);
			} catch(err){
				console.log("err", err);
			}


			// For testing, 2nd parameter would be params.lease_id
			await connection.beginTransactionAsync();
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.getTenants(connection);
	
			const apiKeyId = res.locals.api?.id;
			const loggedInUserId = contact?.id;
			await lease.checkOverlockStatusAndRemove(connection, apiKeyId, loggedInUserId);

			// var transfer_lease = await lease.transferLease(connection, body, post_params, company, res, ['edit_move_in_rate', 'apply_promotions', 'transfer_lease']);
			var transfer_lease = await lease.transferLease(connection, body, post_params, company, res, ['transfer_lease']);
			if(transfer_lease.openPayments && transfer_lease.openPayments.length) {
				// await Lease.applyUnallocatedBalanceOnlease(connection, company.id, transfer_lease.lease.id, transfer_lease.openPayments, contact.id, ['edit_move_in_rate', 'apply_promotions', 'transfer_lease']);
				await Lease.applyUnallocatedBalanceOnlease(connection, company.id, transfer_lease.lease.id, transfer_lease.openPayments, contact.id, ['transfer_lease']);
			}
				
			//events.push({ name: 'lease_finalized', lease: transfer_lease.lease });
			let transfer = true;
			await Lease.setAccessOnLease(connection, lease.id, lease_closed = false, transfer);
			
			await connection.commitAsync();

			try{
				let pay_bill = await payBill(connection,transfer_lease.invoices,body.property_id,company.id,transfer_lease.payment,contact,transfer_lease.endDates);
				console.log("pay_bill: pay_bill: ", pay_bill);
			} catch(err){
				console.log("Error while sending email =>" , err);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					transfer:
						{
							lease_id: Hashes.encode(transfer_lease.lease.id, res.locals.company_id),
							payment_id: Hashes.encode(transfer_lease.payment.id, res.locals.company_id)
						}
				}
			});

			// emit event emitter
			events.map(e => {
				eventEmitter.emit(e.name, {  contact, company, lease: e.lease, cid: res.locals.company_id, locals: res.locals});
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.get('/:lease_id/transfer-receipt',[control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			let params = req.params;
			let company = res.locals.active;

			// Transfer details
			let transfer = new Transfer({to_lease_id: params.lease_id});
			await transfer.find(connection);
			await transfer.findFromLease(connection);
			await transfer.findToLease(connection);

			// Transfer-in lease and invoices
			let lease_in =  new Lease({id: params.lease_id});
			await lease_in.find(connection);
			await lease_in.canAccess(connection, company.id, res.locals.properties);
			await lease_in.findInvoices(connection, {sort_order: 1});
			for(let i = 0; i < lease_in.Invoices.length; i++){
				if(lease_in.Invoices[i].Lease){
				  await lease_in.Invoices[i].Lease.findUnit(connection);
				  await lease_in.Invoices[i].Lease.Unit.getCategory(connection);
				}
			}

			// Transfer-in Lease contact
			await lease_in.getTenants(connection);
			let contact = lease_in.Tenants.length ? lease_in.Tenants[0].Contact : null;

			// Transferin Property details
			await lease_in.getProperty(connection);
			await lease_in.Property.verifyAccess({company_id: company.id, properties: res.locals.properties});
			await lease_in.Property.getPhones(connection);
			await lease_in.Property.getEmails(connection);
			await lease_in.Property.getAddress(connection);

			// Transfer-out lease and inovices
			let lease_out = new Lease({id: transfer.from_lease_id});
			await lease_out.find(connection);
			let credit_invoices = await lease_out.findTransferCreditInvoices(connection, transfer.date, { search_all: true });
			for(let i = 0; i < credit_invoices.length; i++){
				if(credit_invoices[i].Lease){
				  await credit_invoices[i].Lease.findUnit(connection);
				  await credit_invoices[i].Lease.Unit.getCategory(connection);
				}
			}

			// Transfer payment
			let payment;
			if(transfer.payment_id){
				payment = new Payment({id: transfer.payment_id});
				await payment.find(connection);
				await payment.verifyAccess(connection, company.id);
				await payment.getPaymentMethod(connection);
				await payment.getAcceptedBy(connection, company.id);
			}

			// Company info
			let company_data = {
				name: company.name
			};
			if(company && company.gds_owner_id){
			  try{
				  let webInfo = await getWebsiteInfo(company.gds_owner_id, Hashes.encode(lease_in.Property.id, res.locals.company_id));

				  if(webInfo.status == 'success'){
					  company_data.logo = (webInfo?.data?.logo?.desktop?.url || webInfo?.data?.logo?.mobile?.url) || ''
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

			let data = {
				company: company_data,
				property: lease_in.Property,
				contact,
				move_in_invoices: lease_in.Invoices,
				move_out_invoices: credit_invoices,
				transfer,
				payment
			}

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(data, req)
			});



		} catch(err) {
			next(err);
		}


	});

	router.patch('/:lease_id/update', [ joiValidator.body(Schema.updateLease), control.hasAccess(['admin']) ], async(req, res, next) => {
		try {
			const params = Hash.clarify(req.params);
			const body = Hash.clarify(req.body);
			const connection = res.locals.connection;
			let user = res.locals.contact;

			const lease = new Lease({ id: params.lease_id });
			body.modified_by = user?.id;
			await lease.update(connection, body);

			utils.send_response(res, {
				status: 200,
				data: {
					lease_id: Hashes.encode(lease.id, res.locals.company_id)
				}
			});
		} catch(err) {
			next(err);
		}
	});

	router.put('/:lease_id/send-invoice',  [control.hasAccess(['admin'])], async(req, res, next) => {

		try{

			let params = Hash.clarify(req.params);
			let body = Hash.clarify(req.body);
			let company = res.locals.active;
			var connection = res.locals.connection;
			let contact = res.locals.contact;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			lease.send_invoice = body.send_invoice;
			lease.modified_by = contact?.id;

			await lease.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					lease_id: Hashes.encode(lease.id, res.locals.company_id)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	router.get('/:lease_id/all-discounts', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const query = req.query;
			const params = req.params;
			
			const { lease_id } = params;
			const { label } = query;

			const lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.getCurrentLocalPropertyDate(connection);
			await lease.getDiscounts(connection, null, label);
			const discounts = await lease.categorizeDiscountsData();

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(discounts, req)
			})
		} catch(err) {
			next(err);
		}
	});

	router.post('/:lease_id/discount', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const company = res.locals.active;
			let permissions = res.locals.permissions;
			let user = res.locals.contact;
			let api = res.locals.api || {};
			const { body, params } = req;
			const { id, label, payment_details } = body;			
			const { lease_id } = params;
			let accept_late_payments = false;
			if(!label || (label !== 'promotion' && label !== 'discount')) {
				e.th(500, 'label should be set to promotion or discount in body');
			}

			const lease = new Lease({ id: lease_id });
			await lease.find(connection);

			await connection.beginTransactionAsync();

			let discountRes, paymentRes = null;
			if(label === 'discount') {
				discountRes = await lease.addDiscount(connection, id);			
			} else if(label === 'promotion') {
				discountRes = await lease.addPromotion(connection, id, company.id);
			}

			let paymentData, events, eventsData;
			if(payment_details && payment_details.payment) {
				utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['accept_payments']}); 
				
				try{
					utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['accept_late_payments']}); 
					accept_late_payments = true;
				} catch(err){
					// cant accept late paymetns
				}
				const payment = new Payment();
				const response = await payment.processInBulk(connection, payment_details, res, accept_late_payments, null, {}, ['accept_payments','accept_late_payments']);	
				({ paymentData, events, eventsData } = response );
			}

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					discount_id: Hashes.encode(discountRes.id, res.locals.company_id),
					payment_id: paymentData && Hashes.encode(paymentData.id, res.locals.company_id)
				}
			})

			events && eventsData && events.map(e => {
				eventEmitter.emit(e, eventsData);
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.put('/:lease_id/discount', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const { body, params } = req;
			
			/* 	old_id is id in discounts table, 
				new_id is id in promotions table */ 
			const { old_id, new_id, is_future_discount_updated } = body;			
			const { lease_id } = params;

			const lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.updateDiscount(connection, old_id, new_id, is_future_discount_updated);			

			utils.send_response(res, {
				status: 200,
				data: {}
			})
		} catch(err) {
			next(err);
		}
	});

	router.get('/:lease_id/promotions', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const params = req.params;

			const lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			
			const promotions = await lease.getEligiblePromotions(connection);

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(promotions, req)
			})
		} catch(err) {
			next(err);
		}
	});

	router.post('/:lease_id/create-invoice', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const query = req.query;
			const params = req.params;
			
			let invoices = [];
			let promotions = [];

			let user = res.locals.contact || {};
			let api  = res.locals.api || {};
			let company = res.locals.active;
			let body = req.body;
		
			lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			let datetime = await lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
			

			let invoice = new Invoice({
				lease_id: lease.id,
				property_id: body.Property.id,
				contact_id: body.Contact.id,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: moment(body.due).format('YYYY-MM-DD'),
				company_id: company.id,
				period_start: body.period_start,
				period_end: body.period_end,
				created_by: user.id,
				apikey_id: api.id
			});
		
			// let discounts = await Discount.findActiveOnLease(connection, this.lease_id, invoice.due);
			await invoice.generateLines(connection, body.InvoiceLines, null, company.id, lease && lease.unit_id);
			await invoice.save(connection);
			await invoice.total();

			// if(!dryrun) {
			// 	let invoice_lease = new Lease({id: invoice.lease_id});
			// 	await invoice_lease.getProperty(connection);
	  
			// 	let events = ['invoice_created'];
			// 	events.map(e => {
			// 	  eventEmitter.emit(e, { company, contact: user, invoice, user, property_id: invoice_lease.Property.id, leases: [invoice_lease], invoice_leases: [invoice_lease], cid: res.locals.company_id, locals: res.locals});
			// 	});
			// }
	

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(promotions, req)
			})
		} catch(err) {
			next(err);
		}
	});

	router.get('/:lease_id/billing_periods', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			const query = req.query;
			const params = req.params;
			const { lease_id } = params; 
			let lease = new Lease({ id: lease_id });
			await lease.find(connection);
			let billing_months = await lease.getBillingIntervals(connection, query);

			utils.send_response(res, {
				status: 200,
				data:{ 
					billing_months
				}
			})
		} catch(err) {
				next(err);
		}
	});

	router.get('/:lease_id/credits', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		try {
			var connection = res.locals.connection;		
			let company = res.locals.active;
			let params = req.params;
		
			let lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			await lease.getCredits(connection);
		
			let data = {
				payments: lease.Payments
			};
		
			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(data, req)
			});
		} catch (err) {
		  next(err);
		}
	  });

	router.post('/:lease_id/credit', [control.hasAccess(['admin']), control.hasPermission('issue_credits'), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try {
			let company = res.locals.active;
		  	let user = res.locals.contact;
			let params = req.params;
			let body = req.body;  

		  	let lease = new Lease({ id: params.lease_id });
		  	await lease.find(connection);
		  	await lease.getTenants(connection);
			await lease.getProperty(connection);
			await lease.Property.getLocalCurrentDate(connection);

			body.lease_id = lease.id;
		  	body.contact_id = (lease.Tenants && lease.Tenants.find(t => t.isPrimary)) ? lease.Tenants.find(t => t.isPrimary).Contact.id : '';
			body.property_id = lease.Property.id;
			body.date = lease.Property.localCurrentDate;

			console.log("Body: ", body);
			
		  	await connection.beginTransactionAsync();
			
		  	let payment = new Payment();
			await payment.createCredit(connection, body, user.id);
			await Lease.applyUnallocatedBalanceOnlease(connection, company.id, lease.id, [payment], user.id, ['issue_credits']); 
			
		  	await connection.commitAsync();
			
			
		  	utils.send_response(res, {
				status: 200,
				data: {
				  lease_id: Hashes.encode(lease.id, res.locals.company_id)
				}
			});
	
		} catch (err) {
			await connection.rollbackAsync();
			  next(err);
		}
	
	
	});

	// Can add service, generate invoice for that service and make payment
	router.post('/:lease_id/service-workflow', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			const { params, body } = req;
			const logged_in_user = res.locals.contact || {};
			const api = res.locals.api || {};
			const { properties } = res.locals;
			const company = res.locals.active;
			let permissions = res.locals.permissions;
			const { lease_id } = params;
			let accept_late_payments = false;
			let { skip_payment, dryrun } = body;
			
			let skip_payment_permission = permissions.some(permission => permission.label === 'tenant_profile_add_service_skip_payment');

		        if(skip_payment && !skip_payment_permission){
			  e.th(403, "You do not have the permission to skip payment")
		        }

			let required_permissions = ['accept_late_payments'];

			let lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, properties);

			await connection.beginTransactionAsync();
			
			if(!dryrun && !skip_payment) {
				utils.hasPermission({connection, company_id: company.id, contact_id: logged_in_user.id, api, permissions: ['accept_payments']});
				required_permissions.push('accept_payments');
			}
			try{
				utils.hasPermission({connection, company_id: company.id, contact_id: logged_in_user.id, api, permissions: ['accept_late_payments']}); 
				accept_late_payments = true;
			} catch(err){
				// cant accept late paymetns
			}

			({ service, invoice, paymentData, events, eventsData } = await lease.makeInvoicefromService({ connection, ...body, company, logged_in_user, api, res,  accept_late_payments, required_permissions }))
			
			if(!dryrun && body?.product?.recurring){
				let billing_date = invoice ? moment(invoice.period_end).add(1, 'days') : moment(body?.product?.start_date);
				await lease.generateInvoiceAccordingToThreshold(connection, {billing_date, company});
			}


			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data:{ 
					...((!dryrun) && { service_id: Hashes.encode(service.id, res.locals.company_id) }),
					...((dryrun || skip_payment) && { invoice: Hash.obscure(invoice, req) }),
					...(!dryrun && !skip_payment && { payment_id: paymentData && Hashes.encode(paymentData.id, res.locals.company_id) })
				}
			})

			events && eventsData && events.map(e => {
				eventEmitter.emit(e, eventsData);
			});

			if(service && service.id) eventEmitter.emit('lease_service_created', { contact: logged_in_user, company, service, lease, cid: res.locals.company_id, locals: res.locals});
			
		}catch(err){
			await connection.rollbackAsync();
			next(err)
		}
	});

	// Can add service, generate invoice for that service and make payment
	/*router.post('/:lease_id/service-workflow', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			const { params, body } = req;
			const logged_in_user = res.locals.contact || {};
			const api = res.locals.api || {};
			const { properties } = res.locals;
			const company = res.locals.active;
			const { lease_id } = params;
			let { skip_payment, dryrun } = body;

			let lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, properties);

			await connection.beginTransactionAsync();
			
			({ service, invoice, paymentData, events, eventsData } = await lease.makeInvoicefromService({ connection, ...body, company, logged_in_user, api, res }))
			
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data:{ 
					...((!dryrun) && { service_id: Hashes.encode(service.id, res.locals.company_id) }),
					...((dryrun || skip_payment) && { invoice: Hash.obscure(invoice, req) }),
					...(!dryrun && !skip_payment && { payment_id: paymentData && Hashes.encode(paymentData.id, res.locals.company_id) })
				}
			})

			events && eventsData && events.map(e => {
				eventEmitter.emit(e, eventsData);
			});

			if(service && service.id) eventEmitter.emit('lease_service_created', { contact: logged_in_user, company, service, lease, cid: res.locals.company_id });
			
		}catch(err){
			await connection.rollbackAsync();
			next(err)
		}
	});*/
	

	router.get('/:lease_id/delinquency', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

		try {
			var connection = res.locals.connection;
			let company = res.locals.active;
			const { params, query } = req;
			const { properties } = res.locals;

			
			let lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, properties);
			
			await lease.getDelinquency(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					delinquency: Hash.obscure(lease.Delinquency, req)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	router.put('/:lease_id/delinquency/:delinquency_id/pause', [control.hasAccess(['admin', 'api']), control.hasPermission('pause_delinquency'), Hash.unHash],  async(req, res, next) => {

		try {
			var connection = res.locals.connection;
			let company = res.locals.active;
			const { params, body } = req;
			const { properties, contact } = res.locals;

			
			let lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, properties);
			
			await lease.pauseDelinquency(connection, body.reason, contact.id, params.delinquency_id);

			utils.send_response(res, {
				status: 200,
				data: {
					delinquency: Hash.obscure(lease.Delinquency, req)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	router.put('/:lease_id/delinquency/:delinquency_id/resume', [control.hasAccess(['admin', 'api']), control.hasPermission('pause_delinquency'), Hash.unHash],  async(req, res, next) => {

		try {
			var connection = res.locals.connection;
			let company = res.locals.active;
			const { params, query } = req;
			const { properties, contact } = res.locals;

			
			let lease = new Lease({ id: params.lease_id });
			await lease.find(connection);
			await lease.canAccess(connection, company.id, properties);
			
			await lease.resumeDelinquency(connection, contact.id, params.delinquency_id);

			utils.send_response(res, {
				status: 200,
				data: {
					delinquency: Hash.obscure(lease.Delinquency, req)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	router.post('/:lease_id/change-bill-day', [control.hasAccess(['admin']), control.hasPermission('edit_bill_day_tenant_profile'), Hash.unHash], async (req, res, next) => {
		try {
			var connection = res.locals.connection;

			let company = res.locals.active;
			let contact = res.locals.contact;
			const params = req.params;
			const body = req.body;
			const { lease_id } = params;
			const { new_bill_day, dryrun, payment_details, generate_invoice_advance_months } = body;
			
			const lease = new Lease({ id: lease_id });
			await lease.find(connection);
			
			const changeBillDayData = {
				dryrun,
				newBillDay: new_bill_day,
				company,
				paymentDetails: payment_details,
				res,
				generateInvoiceAdvanceMonths: generate_invoice_advance_months,
				modified_by: contact?.id
			};

			let result = {};
			await connection.beginTransactionAsync();
			result = await lease.changeBillDay(connection, changeBillDayData) || {};
			const { events, eventsData, ...response } = result;
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(response, req) 
			});

			console.log('Change bill day events: ', events);
			events && eventsData && events.map(e => {
				eventEmitter.emit(e, eventsData);
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.post('/:lease_id/protected-property-items', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
		const connection = res.locals.connection;
		try {
			const { body, params } = req;
			const { lease_id } = params;
			const { active_protected_items } = body;

			const { locals } = res;
			const { contact: user } = locals;

			const reqData = {
				user: user,
				lease_id: lease_id,
				active_protected_items: active_protected_items
			};			

			await connection.beginTransactionAsync();
			await LeaseProtectedPropertyItem.bulkUpdate(connection, reqData);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {}
			});
		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	});
	

	router.get('/:lease_id/protected-property-items', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
		const connection = res.locals.connection;
		try {
			const { params } = req;
			const { lease_id } = params;
			
			const data = await LeaseProtectedPropertyItem.getAll(connection, { lease_id: lease_id });

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(data, req)
			});
		} catch(err) {
			next(err);
		}
	});

	router.get('/:lease_id/security-deposit', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const { params } = req;
			const { lease_id } = params;

			const lease = new Lease({ id: lease_id });
			let sec_deposit_lines = await lease.findSecurityDepositLines(connection);
			
			utils.send_response(res, {
				status: 200,
				data: {
					lines: Hash.obscure(sec_deposit_lines, req)
				}
			});
		} catch(err) {
			next(err);
		}
	});

	router.post('/:lease_id/security-deposit/refund', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {
		try {
			var connection = res.locals.connection;
			let company = new Company(res.locals.active);
			let user = res.locals.contact || {};
			let body = req.body;
			var params = req.params;
			const { api, contact: admin_contact } = res.locals;
	  
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.getProperty(connection);
			await lease.getTenants(connection);
	  
			await connection.beginTransactionAsync();

			// await utils.hasPermission({connection, company_id: company.id, contact_id: admin_contact.id, api, permissions: ['reverse_payment']});
			await lease.refundSecurityDeposit(connection, body.amount, { company, user });

			await connection.commitAsync();
	  
			utils.send_response(res, {
			  status: 200
			});
	  
		  } catch(err){
			await connection.rollbackAsync();
			next(err);
		  }
	});

	router.post('/:lease_id/send-esign-link', [control.hasAccess(['admin']), joiValidator.body(Schema.sendEsignLink), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection
			const company = res.locals.active;

			let payload = {};
			payload.to_email = req.body.email || '';
			payload.to_phone = req.body.phone || '';
			payload.method = payload.to_phone ? 'phone' : 'email';
			payload.message = req.body.message || 'Please click the link to sign your documents';

			let lease = new Lease({ id: req.params.lease_id });
			await lease.find(connection);
			if (!lease.status) e.th(404, "Lease not found"); // if lease is a reservation then abort
			await lease.getUnsignedUploads(connection);
			if (!lease.Uploads.length) e.th(404, "All documents are signed");
			await lease.getProperty(connection);
			await lease.getContactByLeaseId(connection);

			payload.property_id = lease.Property.id;
			await Upload.sendEmailForSignature(connection, lease.Contact, lease.Uploads, company, true, payload, lease.id);

			utils.send_response(res, {
				status: 200
			})
		} catch (error) {
			console.log(error);
			next(error)
		}
	});

	/* To get stored contents under a lease */
	router.get('/:lease_id/stored-contents', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
		const connection = res.locals.connection;
		try {
			let { params } = req;
			let { lease_id } = params;
			let company = res.locals.active;

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			
			let storedContent = new LeaseStoredContents({ lease_id: lease_id });
			let data = await storedContent.find(connection);
			utils.send_response(res, {
				status: 200,
				data: {
					stored_contents: Hash.obscure(data, req)
				},
				message: "Success"
			});
		} catch(err) {
			next(err);
		}
	});

	/* For saving stored contents of a lease */
	router.post('/:lease_id/stored-contents', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.leaseStoredContents), Hash.unHash],  async(req, res, next) => {
		const connection = res.locals.connection;
		try {
			let { body, params } = req;
			let { lease_id } = params;

			let { locals } = res;
			let { contact: user } = locals;
			let company = res.locals.active;
			
			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);

			let storedContents = [...new Map(body?.map(obj => [obj?.stored_content_id, obj])).values()];
			let reqData = {
				user,
				lease_id,
				active_stored_contents: storedContents
			};			

			await connection.beginTransactionAsync();

			await LeaseStoredContents.bulkUpdate(connection, reqData);
			let storedContent = new LeaseStoredContents({ lease_id: lease_id });
			let data = await storedContent.find(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					stored_contents: Hash.obscure(data, req)
				},
				message: "Success"
			});
		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.put('/:lease_id/change-payment-cycle', [control.hasAccess(['admin']), control.hasPermission('change_payment_cycle'), Hash.unHash], async (req, res, next) => {
		try {
			var connection = res.locals.connection;

			let company = res.locals.active;
			const { params, body } = req;
			const { lease_id } = params;
			const { new_payment_cycle } = body;

			await connection.beginTransactionAsync();

			const lease = new Lease({ id: lease_id });
			await lease.changePaymentCycle(connection, {
				api_info: res,
				new_payment_cycle,
				company
			});

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					lease_id: Hashes.encode(lease.id, res.locals.company_id)
				}
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});
	
	return router;
};

const LeaseProtectedPropertyItem = require(__dirname + '/../classes/lease_protected_property_item.js');
const LeaseStoredContents = require(__dirname + '/../classes/lease_stored_contents.js');

const Document = require('../classes/document');
const DocumentManager = require('../classes/document_manager');
const DocumentFactory = require('../classes/document_factory');
