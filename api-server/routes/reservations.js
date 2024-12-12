
var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};
var Hash = require(__dirname + '/../modules/hashes.js');
var Enums = require(__dirname + '/../modules/enums.js');
var Hashes = Hash.init();
var validator = require('validator');
var models = require(__dirname + '/../models');
var Promise = require('bluebird');
var Contact = require(__dirname + '/../classes/contact.js');
var Reservation = require(__dirname + '/../classes/reservation.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Unit = require(__dirname + '/../classes/reservation.js');
var Service = require(__dirname + '/../classes/service.js');
var Property = require(__dirname + '/../classes/property.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var Schema = require(__dirname + '/../validation/reservations.js');
var Todo = require(__dirname + '/../classes/todo.js');

var utils    = require(__dirname + '/../modules/utils.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});

var Unit = require(__dirname + '/../classes/unit.js');

var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Report = require(__dirname + '/../classes/report.js');



module.exports = function(app) {

	router.post('/search', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

		var connection = res.locals.connection;

		try{

			let company = res.locals.active;
			let body = req.body;

			let report = new Report({
				name: body.type + '_' + moment().format('x'),
				type: 'reservations',
				format: 'web',
				filters: body,
				connection: connection,
				company: company
			});

			await report.generate();

			utils.send_response(res, {
				status: 200,
				data: {
					reservations: Hash.obscure(report.reportClass.data, req),
					result_count: report.reportClass.result_count
				}
			});

		} catch(err){
			next(err)
		}


	});

	router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


		try{
			let api = res.locals.api;
			let contact = res.locals.contact;
			let company = res.locals.active;
			var connection = res.locals.connection;
			let query = req.query;
			let searchParams = {};
			if (query.property_id || res.locals.properties.length) searchParams.property_id = query.property_id || res.locals.properties
			let reservations = await models.Reservation.findByCompanyId(connection, company.id, searchParams);
			let reservation_list = [];


			for(let i= 0; i < reservations.length; i++){
				let reservation = new Reservation({id: reservations[i].id});
				await reservation.find(connection, api);
				await reservation.Lease.canAccess(connection, company.id, res.locals.properties);
				await reservation.Lease.findAllDiscounts(connection);
				await reservation.Lease.getCreatedByInfo(connection)
				if(reservation.Lease && reservation.Lease.Discounts){
					reservation.Promotions = reservation.Lease.Discounts.map(d=> ({
						id: d.promotion_id,
						start_date: d.start,
						end_date: d.end
					}))
				}
				reservation_list.push(reservation);
			}


			utils.send_response(res, {
				status: 200,
				data: {
					reservations: Hash.obscure(reservation_list, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/:reservation_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


		try{
			let contact = res.locals.contact || {};
			let api = res.locals.api || {};
			let params = req.params;
			let query = req.query;
			let company = res.locals.active;
			var connection = res.locals.connection;

			let reservation = new Reservation({id: params.reservation_id});
			await reservation.find(connection, api);
			await reservation.Lease.canAccess(connection, company.id, res.locals.properties);
			await reservation.Lease.findAllDiscounts(connection);
			reservation.move_in_date = reservation.Lease? reservation.Lease.start_date : null;
			if(reservation.Lease && reservation.Lease.Discounts){
				reservation.Promotions = reservation.Lease.Discounts.map(d=> ({
					id: d.promotion_id,
					start_date: d.start,
					end_date: d.end
				}))
			}

			// await reservation.Lease.getTenants(connection)
			// await reservation.Lease.getServices(connection)
			// await reservation.Lease.getCurrentBalance(connection)

			await reservation.calculateLeaseCosts(connection, company.id, query.billed_months, contact.id, api.id);
			reservation.Charges = reservation.Invoice;

			reservation.Charges.Detail = reservation.Charges.InvoiceLines.map(inline => {
				return {
					start_date: inline.start_date,
					end_date: inline.end_date,
					product_id: inline.product_id,
					name: inline.Product.name,
					qty: inline.qty,
					cost: inline.cost,
					Tax: inline.TaxLines,
					Discount: inline.DiscountLines
				}
			});

			utils.send_response(res, {
				status: 200,
				data: {
					reservation: Hash.obscure(reservation, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.put('/:reservation_id/convert-to-lease', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


    try {
      let contact = res.locals.contact;
      let api = res.locals.api;
      let params = req.params;
      let body = req.body;
      let company = res.locals.active;

	  const { auto_pay_after_billing_date: autoPayAfterBillingDate } = body;
      var post_params = {
        start_date: body.start_date || moment().format('YYYY-MM-DD'),
        rent: body.rent,
        security_deposit: body.security_deposit,
        bill_day: body.bill_day,
        coupons: body.coupons || [],
        insurance_id: body.insurance_id,
        promotions: body.promotions ? body.promotions.filter(p => p.promotion_id) : [],
        discount_id: body.discount_id || null,
        billed_months: body.additional_months || 0,
        hold_token: body.hold_token,
        products: body.products || [],
        save: body.save,
        reservation_id: body.reservation_id || null,
		auto_pay_after_billing_date: autoPayAfterBillingDate,
				user_id: contact?.id
      };


      var connection = res.locals.connection;


      let unit = new Unit({id: body.unit_id});
      await unit.find(connection);
      await unit.verifyAccess(connection, company.id, res.locals.properties);
      await unit.setState(connection);


      // let property = new Property({id: unit.property_id});
      // await property.find(connection);
      // await property.getTemplates(connection, unit.type)

      let reservation = new Reservation({id: params.reservation_id});
      await reservation.find(connection);
      await reservation.Lease.canAccess(connection, company.id, res.locals.properties);


      let { lease , leaseServices } = await unit.buildLease(connection, api, post_params, company.id, reservation,  'lease');
      lease.status = 2;

      await connection.beginTransactionAsync();
      await lease.save(connection, null, reservation.id);
      lease.Services = leaseServices;
      await lease.saveServices(connection, 'lease');
      await lease.saveDiscounts(connection);
      await lease.saveChecklist(connection);
      if(lease.end_date){
        await unit.save(connection, { available_date: lease.end_date});
      }





      // let leases = new Lease({
      //   id: reservation.Lease.id,
      //   status: 2,
      //   promotion_id: body.promotion_id,
      //   unit_id: unit.id,
      //   notes: body.notes,
      //   rent: body.rent,
      //   security_deposit: body.security_deposit,
      //   start_date: body.start_date,
      //   end_date: body.end_date,
      //   bill_day:  body.bill_day,
      //   send_invoice: body.send_invoice
      // });







      // lease.Unit = unit;
      // lease.Property = property;
      // reservation.Lease = lease;
      // if (!lease.Unit.product_id){
      //   let product = await models.Product.findRentProduct(connection, company.id);
      //   reservation.Lease.Unit.product_id = product.id;
      // }
      // await reservation.Lease.Unit.getProduct(connection);
      // reservation.Lease.Unit.Product.taxable = property.LeaseTemplates[lease.Unit.type].Template.tax_rent;
      // reservation.Lease.Unit.Product.prorate = property.LeaseTemplates[lease.Unit.type].Template.prorate_rent;
      // reservation.Lease.Unit.Product.prorate_out = property.LeaseTemplates[lease.Unit.type].Template.prorate_rent_out;
      //
      //
      // //TODO add prorate out
      // await reservation.Lease.Unit.buildService(connection, lease, lease.Unit.Product, lease.start_date, lease.end_date, lease.rent, 1, lease.Unit.Product.prorate, reservation.Lease.Unit.Product.prorate_out, 1, 'lease', 'lease')
      //
      // if(lease.security_deposit){
      //   let securityProduct =  await models.Product.findSecurityDepositProduct(connection, company.id);
      //   // if has ability to edit price.
      //   securityProduct.price = lease.security_deposit;
      //   await reservation.Lease.Unit.buildService(connection, lease, securityProduct, lease.start_date, lease.start_date, lease.security_deposit, 1, 0, 0, 0,  'lease', 'lease')
      // }
      //
      // // save services
      // if(property.LeaseTemplates[lease.Unit.type].Template) {
      //   let template = property.LeaseTemplates[lease.Unit.type].Template;
      //
      //   if(template.Services){
      //     for(let i = 0; i < template.Services.length; i++){
      //       let service = template.Services[i];
      //       if(service.optional || (service.service_type !== 'lease' && service.service_type !== 'insurance')) continue;
      //       let s = new Service({
      //         lease_id: lease.id,
      //         product_id: service.product_id,
      //         price: service.price,
      //         qty: service.qty,
      //         start_date: lease.start_date,
      //         end_date: (service.recurring)? null: lease.start_date,
      //         recurring: service.recurring,
      //         prorate: service.prorate,
      //         prorate_out: service.prorate_out,
      //         service_type: service.service_type,
      //         taxable: service.taxable,
      //         name: service.name
      //       });
      //       if( service.service_type === 'lease'){
      //         s.name = service.Product.name;
      //
      //       } else if(service.service_type === 'insurance'){
      //         s.name = service.Insurance.name;
      //       }
      //
      //       await s.save(connection);
      //     }
      //   }
      //
      //
      //   if(template.Checklist) {
      //     for(let i = 0; i < template.Checklist.length; i++){
      //       let t = template.Checklist[i];
      //       let save = {
      //         lease_id: lease.id,
      //         checklist_item_id: t.id,
      //         name: t.name,
      //         document_type_id: t.document_type_id,
      //         document_id: t.document_id,
      //         description: t.description,
      //         completed: 0,
      //         sort: t.sort
      //       };
      //       await  models.Checklist.saveItem(connection, save)
      //     }
      //   }
      // }

      // let invoice = await unit.generateInvoice(connection,lease, company.id, leaseServices, params.billed_months, false);
      // await invoice.total();

      await  connection.commitAsync();
      utils.send_response(res, {
        status: 200,
        data: {
          lease,
          // invoice,
          reservation,
          leaseServices
        }
      })


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

	router.put('/:reservation_id', [control.hasAccess(['admin']), joiValidator.body(Schema.updateReservation), Hash.unHash], async (req, res, next) =>  {

		try{
			let params = req.params;
			let body = req.body;
			let contact = res.locals.contact;
			let company = res.locals.active;
			var connection = res.locals.connection;

			let reservation = new Reservation({id: params.reservation_id});
			await reservation.find(connection);
			await reservation.Lease.canAccess(connection, company.id, res.locals.properties);


			await reservation.update(connection, body, company.id, res.locals.properties, contact?.id);


			utils.send_response(res, {
				status: 200,
				data: {
					reservation: Hashes.encode(reservation.id, res.locals.company_id)
				}
			});


			eventEmitter.emit('reservation_updated', {  contact, company, reservation, cid: res.locals.company_id, locals: res.locals});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.delete('/:reservation_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{

			let params = req.params;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let user = res.locals.contact || {};

			let reservation = new Reservation({id: params.reservation_id});
			await reservation.find(connection);
			await reservation.Lease.canAccess(connection, company.id, res.locals.properties);

			await connection.beginTransactionAsync();

			await reservation.Lease.deleteLease(connection, company.id, contact.id);
			await reservation.deleteReservation(connection);

			//Mark reservation tasks as complete
			await Todo.dismissTasks(connection, reservation.Lease.id, Enums.EVENT_TYPES_COLLECTION.RESERVATION, Enums.TASK_TYPE.LEASE, user.id);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {}
			});


			eventEmitter.emit('reservation_deleted', {  user, contact, company, reservation, cid: res.locals.company_id, locals: res.locals});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	// // Check not in use in API
	// router.post('/:reservation_id/convert-to-lease', control.hasAccess(['admin', 'api']), function(req, res, next) {
	//
	//
	// 	var body = req.body;
	// 	var params = req.params;
	//
	// 	var company = res.locals.active;
	// 	var api = res.locals.api || {};
	// 	var user = res.locals.contact || {};
	// 	var reservation = {};
	//
	// 	var connection, unit, lease, property;
	//
	// 	//TODO make sure only correct tenants can look at lease
	// 	//TODO && make sure that lease is active
	//
	// 	pool.getConnectionAsync()
	// 		.then(function(conn){
	// 			connection = conn;
	// 			reservation = new Reservation({id: params.reservation_id});
	// 			return reservation.find(connection);
	// 		})
	// 		.then(() => reservation.Lease.canAccess(connection, company.id))
	//
	// 		// TODO get property template to get bill date
	//
	// 		.then(function() {
	// 			reservation.Lease.unit_id = (body.unit_id) ? body.unit_id : reservation.Lease.unit_id;
	// 			reservation.Lease.start_date = (body.start_date) ? body.start_date : reservation.Lease.start_date;
	// 			reservation.Lease.end_date = (typeof body.end_date != 'undefined' ) ? body.end_date : reservation.Lease.end_date;
	// 			reservation.Lease.monthly = (reservation.Lease.end_date == null ) ? 0 : 1;
	// 			reservation.Lease.send_invoice = (typeof body.send_invoice != 'undefined' ) ? body.send_invoice : reservation.Lease.send_invoice;
	//
	// 			reservation.Lease.rent = (typeof body.rent != 'undefined' ) ? body.rent : reservation.Lease.rent;
	// 			reservation.Lease.security_deposit = (typeof body.security_deposit != 'undefined' ) ? body.security_deposit : reservation.Lease.security_deposit;
	// 			reservation.Lease.status = 2;
	//
	// 			// update rent
	// 			// update security deposit
	// 			// update update other charges
	//
	// 			return reservation.Lease.save(connection)
	//
	// 		})
	// 		.then(function() {
	//
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data: {
	// 					reservation: reservation
	// 				}
	// 			});
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });
	//





	return router;


}
