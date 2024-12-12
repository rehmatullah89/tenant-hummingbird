
var express = require('express');
var router = express.Router();
var moment      = require('moment');
var Promise      = require('bluebird');
var settings    = require(__dirname + '/../config/settings.js');
var flash    = require(__dirname + '/../modules/flash.js');
var validation    = require(__dirname + '/../modules/validation.js');
var utils    = require(__dirname + '/../modules/utils.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();


var XLSX = require('xlsx');
var validator = require('validator');
var models = require(__dirname + '/../models');
var control  = require(__dirname + '/../modules/site_control.js');
var Connection  = require(__dirname + '/../classes/connection.js');
var QuickBooks  =  require(__dirname + '/../classes/quickbooks.js');
var Unit  = require(__dirname + '/../classes/unit.js');
var Lease  = require(__dirname + '/../classes/lease.js');
var Category = require(__dirname + '/../classes/category.js');
var Property  = require(__dirname + '/../classes/property.js');
var Product  = require(__dirname + '/../classes/product.js');
var Template      = require('../classes/template.js');
var breadcrumbs = [];
var Activity = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');

var Joi      = require('joi');
const joiValidator = require('express-joi-validation')({
	passError: true
});

var Schema = require(__dirname + '/../validation/templates.js');
var eventEmitter = require(__dirname + '/../events/index.js');



module.exports = function(app, sockets) {



	router.get('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

		try{

  		var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let templates = await Template.findByCompanyId(connection, company.id);
			
			utils.send_response(res, {
				status: 200,
				data: {
					templates: Hash.obscure(templates, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/:template_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;

			let template = new Template({id: params.template_id});
			await template.find(connection);
			await template.verifyAccess(company.id);

			await template.findChecklist(connection);
			await template.findServices(connection, 'lease');
			await template.findPaymentCycles(connection);
			console.log("template", template)
			utils.send_response(res, {
				status: 200,
				data: {
					template: Hash.obscure(template, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.post('/', [control.hasAccess(['admin'])], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = Hash.clarify(req.body);
			let params = Hash.clarify(req.params);
			console.log("body", body)
			let template = new Template({
				company_id: company.id,
				created_by: contact.id
			});

			template.update(body);

			await connection.beginTransactionAsync();
			await template.save(connection);
			
			if (body.products) {
				for(let i=0; i<body.products.length; i++){
					let product = new Product({id: body.products[i].product_id});
					await product.find(connection);
					await product.verifyAccess(company.id);
					
					let service = template.makeService(body.products[i], 'lease');
	
					service.id = await template.saveService(connection, service);
				}
			}
			
			if (body.checklist) {
				for(let i=0; i<body.checklist.length; i++){
					let item = template.makeChecklistItem(body.checklist[i]);
					item.created_by = contact.id;
	
					item.id = await template.saveChecklist(connection, item);
				}
			}

			if(body.payment_cycle_options && body.payment_cycle_options.length && body.enable_payment_cycles){
				await template.savePaymentCycles(connection, body.payment_cycle_options, body.enable_payment_cycles, company.id);
			}
			

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					template_id: Hashes.encode(template.id, res.locals.company_id)
				},

			});

			eventEmitter.emit('template_created', {company, contact, template, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			next(err);
		}




	});

	// router.put('/:template_id', [control.hasAccess(['admin']), joiValidator.body( Schema.newTemplate)], async(req, res, next) => {
	router.put('/:template_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{
			let contact = res.locals.contact;
			let company = res.locals.active;
			
			let body = req.body;
			let params = req.params;
			

			let template = new Template({
				id: params.template_id,
				last_updated_by: contact.id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);
			body.last_updated_by = contact.id;
			template.update(body);

			await template.save(connection);

			await template.updateChecklist(connection, body);
			await template.updateProducts(connection, body);
			
			await template.savePaymentCycles(connection, body.payment_cycle_options, body.enable_payment_cycles, company.id);
		
			utils.send_response(res, {
				status: 200,
				data: {
					template_id: Hashes.encode(template.id, res.locals.company_id)
				},

			});

			eventEmitter.emit('template_updated', {company, contact, template, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}



	});

	router.get('/:template_id/services/:service_type', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;


			if(['lease','insurance','reservation','application'].indexOf(params.service_type) < 0)
				e.th(400, 'Invalid service type');

			let template = new Template({id: params.template_id});
			await template.find(connection);
			await template.verifyAccess(company.id);

			if(params.service_type === 'insurance'){
				await template.findInsuranceServices(connection)
			} else {
				await template.findServices(connection, params.service_type)
			}

			utils.send_response(res, {
				status: 200,
				data: {
					services: Hash.obscure(template.Services, req)
				}
			});


		} catch(err) {
			next(err);
		}




	});

	// router.get('/:template_id/insurance', control.hasAccess(['admin']), function(req, res, next) {
	// 	var connection = {};
	// 	var company = res.locals.active;
	//
	// 	var params = req.params;
	// 	var template = {};
	//
	// 	pool.getConnectionAsync()
	// 		.then(function(conn){
	// 			connection = conn;
	// 			template = new Template({id: params.template_id});
	// 			return template.find(connection);
	//
	// 		})
	// 		.then(() => template.verifyAccess(company.id))
	// 		.then(() => template.findInsuranceServices(connection))
	// 		.then(() => {
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data: {
	// 					services: Hash.obscure(template.Services)
	// 				}
	//
	// 			});
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });

	router.get('/:template_id/checklist', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;

			let template = new Template({id: params.template_id});
			await template.find(connection);
			await template.verifyAccess(company.id);
			await template.findChecklist(connection);


			utils.send_response(res, {
				status: 200,
				data: {
					checklist: Hash.obscure(template.Checklist, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.post('/:template_id/checklist', [control.hasAccess(['admin']), joiValidator.body( Schema.newChecklistItem), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;


			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);
			await template.findChecklist(connection);

			let item = template.makeChecklistItem(body);

			item.id = await template.saveChecklist(connection, item);


			utils.send_response(res, {
				status: 200,
				data: {
					checklist_id: Hashes.encode(item.id, res.locals.company_id)
				},

			});

			eventEmitter.emit('template_checklist_item_created', {company, contact, template, item, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}



	});

	router.put('/:template_id/checklist', [control.hasAccess(['admin'])], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);
			// let item = await template.findChecklistItem(connection, params.checklist_id );

			// if(!item) e.th(404, "Item not found");
			// if(item.template_id !== params.template_id) e.th(400, "Invalid request");

			// item.document_id = body.document_id;
			// item.document_type_id = body.document_type_id;
			// item.description = body.description;
			// item.name = body.name;
			// item.require_all = body.require_all;



			// await template.saveChecklist(connection, item, item.id);

			await template.updateChecklist(connection, body);
			
			await template.findChecklist(connection);
			utils.send_response(res, {
				status: 200,
				data: {
					checklist: Hash.obscure(template.checklist, req)
				},

			});

			eventEmitter.emit('template_checklist_item_updated', {company, contact, template, item, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}


	});

	router.delete('/:template_id/checklist/:checklist_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {



		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);
			let item = await template.findChecklistItem(connection, params.checklist_id );

			if(!item) e.th(404, "Item not found");
			if(item.template_id != params.template_id) e.th(400, "Invalid request");

			await template.deleteChecklist(connection, params.checklist_id);

			utils.send_response(res, {
				status: 200,
				data: {},

			});

			eventEmitter.emit('template_checklist_item_deleted', {company, contact, template, item, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}


	});

	router.post('/:template_id/services/:service_type', [control.hasAccess(['admin']), joiValidator.body( Schema.newService), Hash.unHash] , async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);

			let product = new Product({id: body.product_id});
			await product.find(connection);
			await product.verifyAccess(company.id);

			if(product.default_type == 'security' || product.default_type == 'rent' || product.default_type == 'late')
				e.th(400, "You cannot add this type of product to a template");

			if(product.default_type == 'insurance' && params.service_type != 'insurance')
				e.th(400, "Invalid product type");

			let service = template.makeService(body, params.service_type);

			service.id = await template.saveService(connection, service);

			utils.send_response(res, {
				status: 200,
				data: {
					service_id: Hashes.encode(service.id, res.locals.company_id)
				},

			});

			eventEmitter.emit('template_checklist_service_created', {company, contact, template, service, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}




	});

	router.put('/:template_id/services', [control.hasAccess(['admin'])], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);

			await template.updateProducts(connection, body);
			
			await template.findServices(connection, 'lease');
			utils.send_response(res, {
				status: 200,
				data: {
					products: Hash.obscure(template.products, req)
				},

			});

			// eventEmitter.emit('template_checklist_service_updated', {company, contact, template, service, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}





	});

	router.delete('/:template_id/services/:service_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;


			let params = req.params;

			let template = new Template({
				id: params.template_id
			});

			await template.find(connection);
			await template.verifyAccess(company.id);
			let service = await  template.findService(connection, params.service_id);

			if(!service) e.th(404, "Item not found");
			if(service.template_id != params.template_id) e.th(400, "Invalid request");

			await  template.deleteService(connection, service.id);

			utils.send_response(res, {
				status: 200,
				data: {},

			});

			eventEmitter.emit('template_checklist_service_deleted', {company, contact, template, cid: res.locals.company_id, locals: res.locals});



		} catch(err) {
			next(err);
		}



	});

  router.delete('/:template_id/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;


      let params = req.params;

      let template = new Template({
        id: params.template_id
      });

      await template.find(connection);
      await template.verifyAccess(company.id);

      await  template.delete(connection);

      utils.send_response(res, {
        status: 200,
        data: {},
      });
      eventEmitter.emit('template_deleted', {company, contact, template, cid: res.locals.company_id, locals: res.locals});



    } catch(err) {
      next(err);
    }



  });



	return router;
};
