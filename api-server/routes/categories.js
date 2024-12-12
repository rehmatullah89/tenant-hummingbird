var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');

var utils    = require(__dirname + '/../modules/utils.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Category = require(__dirname + '/../classes/category.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var db = require(__dirname + '/../modules/db_handler.js');
var Schema = require(__dirname + '/../validation/categories.js');
const joiValidator = require('express-joi-validation')({
	passError: true
});

var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app) {

	router.get('/',  [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		try{
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let query = req.query;
			let params = {
				type: query.type,
				properties: query.property_id ? [query.property_id]: []
			}

			let categories = await Category.getCategoryDetails(connection, company.id, params);

			utils.send_response(res, {
				status: 200,
				data: {
					categories: Hash.obscure(categories, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/list',  [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let properties = res.locals.properties;
			let query = req.query;
			let categories = [];

			let categoryList = await Category.search(connection, company.id, query.property_id ? [query.property_id] : properties);

			for(let i = 0; i < categoryList.length; i++ ){
				categories.push({
					id: categoryList[i].id,
					name: categoryList[i].name,
					description: categoryList[i].description,
					price: categoryList[i].price,
					unit_type: categoryList[i].unit_type
				});
			}

			utils.send_response(res, {
				status: 200,
				data: {
					categories: Hash.obscure(categories, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.post('/',  [control.hasAccess(['admin']),joiValidator.body(Schema.create), control.hasPermission('manage_categories'), Hash.unHash], async(req, res, next) => {
		try{
		  var connection = res.locals.connection;

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let category = new Category({
				company_id: company.id,
				name: req.body.name,
				price: req.body.price,
				description:  req.body.description,
				unit_type: req.body.unit_type || 'residential'
			});

			category.Attributes = body.Attributes || [];

			await category.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					category_id: Hashes.encode(category.id, res.locals.company_id)
				}
			});

			eventEmitter.emit('category_created', {company, contact, category, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			next(err);
		}



	});

	router.get('/:category_id',  [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;
			let category = new Category({id:  params.category_id});

			await category.find(connection);
			await category.getPropertyBreakdown(connection);
			await category.getPropertyAvailableBreakdown(connection);
			await category.getAttributes(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					category: Hash.obscure(category, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.put('/sort', [control.hasAccess(['admin']), joiValidator.body(Schema.sort), control.hasPermission('manage_categories'), Hash.unHash], async(req, res, next) => {
		try{
		  var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			for(let i = 0; i < body.categories.length; i++ ){
				var category = new Category({id: body.categories[i].id});
				await category.find(connection);
				await category.verifyAccess(company.id);
				category.sort = i;
				await category.save(connection);
			}

			utils.send_response(res, {
				status: 200,
				data: {}
			});

			//TODO How should we handle this? Separate event or event on each category?
			//eventEmitter.emit('category_updated', {company, contact, category, locals: res.locals});


		} catch(err) {
			next(err);
		}


	});

	router.put('/:category_id', [control.hasAccess(['admin']), joiValidator.body(Schema.create), control.hasPermission('manage_categories'), Hash.unHash], async(req, res, next) => {


		try{

		  const connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let category = new Category({id: params.category_id});
			await category.find(connection);
			await category.verifyAccess(company.id);

			category.name = body.name;
			category.price = body.price;
			category.description = body.description;
			category.Attributes = body.Attributes || [];
			category.unit_type = body.unit_type || 'residential'
			await category.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					category_id: Hashes.encode(category.id, res.locals.company_id)
				}
			});


			eventEmitter.emit('category_updated', {company, contact, category, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			next(err);
		}



	});

	router.delete('/:category_id', [control.hasAccess(['admin']), control.hasPermission('manage_categories'), Hash.unHash], async(req, res, next) => {
		try {

		  var connection = res.locals.connection;
			let company = res.locals.active;
			let contact = res.locals.contact;
			let params = req.params;
			let category = new Category({id:  params.category_id});

			await category.find(connection);
			await category.verifyAccess(company.id);
			await category.deleteCategory(connection);

			utils.send_response(res, {
				status: 200,
				data: {
				}
			});

			eventEmitter.emit('category_deleted', {company, contact, category, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}



	});

	return router;

}
