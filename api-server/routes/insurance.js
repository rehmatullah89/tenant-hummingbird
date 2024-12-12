var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var response = {};
var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');

var utils    = require(__dirname + '/../modules/utils.js');
var models  = require(__dirname + '/../models');
var Product  = require(__dirname + '/../classes/product.js');
var Property  = require(__dirname + '/../classes/property.js');
var Insurance  = require(__dirname + '/../classes/insurance.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');
var eventEmitter = require(__dirname + '/../events/index.js');


module.exports = function(app) {


	router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let company = res.locals.active;
			let query = req.query;

			let insurance = [];
			let insuranceList = await Insurance.findByCompanyId(connection, company.id);

			for(let i = 0; i < insuranceList.length; i++ ){
				let insurance_item = new Insurance({id: insuranceList[i].id});
				await insurance_item.find(connection);
				await insurance_item.getProperties(connection);
				insurance.push(insurance_item);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					insurance:  Hash.obscure(insurance, req)
				}
			});


		} catch(err) {
			next(err);
		}




	});

	router.get('/search', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact;
			let query = req.query;
			let company = res.locals.active;


			let searchParams = {};
			let conditions = {};

			if(query.name) conditions.name = query.name;

			searchParams.limit = query.limit || 20;
			searchParams.offset = query.offset || 0;
			searchParams.sort =  query.sort || 'id';
			searchParams.sortdir =  query.sortdir || 'asc';

			let insurance = await Insurance.search(connection, conditions, searchParams, company.id, false);
			let count = await Insurance.search(connection, conditions, searchParams, company.id, true);

			utils.send_response(res, {
				status: 200,
				data: {
					insurance: Hash.obscure(insurance, req),
					result_count: count[0].count
				}
			});


		} catch(err) {
			next(err);
		}




	});

	router.post('/',  [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let product = new Product();
			body.default_type = 'insurance';
			body.type = 'product';
			body.amount_type= 'fixed';
			product.make(body, company.id);

			await connection.beginTransactionAsync();
			await product.save(connection, contact);

			body.Properties = body.Properties || [];
            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }

            await product.updateProperties(connection, body.Properties);

			let insurance = new Insurance({
				company_id: company.id,
				product_id: product.id,
				coverage: body.coverage || null,
				deductible: body.deductible || null,
				premium_value: body.premium_value,
				premium_type: body.premium_type,
				unit_type: body.unit_type
			});

			await insurance.save(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					insurance_id: Hashes.encode(insurance.id, res.locals.company_id),
					product_id: Hashes.encode(insurance.product_id, res.locals.company_id)
				}
			});

			eventEmitter.emit('insurance_saved', {company, contact, insurance, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.put('/:insurance_id',  [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let insurance = new Insurance({id: params.insurance_id});
			await insurance.find(connection)
			await insurance.verifyAccess(company.id)

			if(body.name != insurance.name){
				let verified = await Product.verifyName(connection, body.name, company.id, insurance.product_id);
				if(!verified) e.th(409, "A product with that name already exists.  Please choose a different name");

			}

			let product = new Product({id: insurance.product_id});
            await product.find(connection);
			await product.verifyAccess(company.id);

			await connection.beginTransactionAsync();

            await product.update(connection, body);
            await product.save(connection);

			body.Properties = body.Properties || [];
            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }

            await product.updateProperties(connection, body.Properties);

			insurance.update(body);
			await insurance.save(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					insurance_id: Hashes.encode(insurance.id, res.locals.company_id),
					product_id: Hashes.encode(insurance.product_id, res.locals.company_id)
				}
			});

			eventEmitter.emit('insurance_updated', {company, contact, insurance, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}




	});

	router.delete('/:insurance_id',  [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			let contact = res.locals.contact
			let company = res.locals.active;

			let params = req.params;

			let insurance = new Insurance({id: params.insurance_id});
			await insurance.find(connection);
			await insurance.verifyAccess(company.id);

			let product = new Product({id: insurance.product_id});
            await product.find(connection);
            await product.verifyAccess(company.id);
			await product.delete(connection);
			// await insurance.delete(connection);

			utils.send_response(res, {
				status: 200,
				data: {}

			});

			eventEmitter.emit('insurance_deleted', {company, contact, insurance, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}



	});

	return router;



};


