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

var Product  = require(__dirname + '/../classes/product.js');
var ProductCategory  = require(__dirname + '/../classes/product_categories.js');
var Activity = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');


var Joi      = require('joi');
const joiValidator = require('express-joi-validation')({
  passError: true
});

var Schema = require(__dirname + '/../validation/product_category.js');


module.exports = function(app, sockets) {

  router.get('/',  [control.hasAccess(['admin','api']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let api = res.locals.api;
      let company = res.locals.active;
      let query = req.query;
      let searchParams = {
        search: query.search || '',
        limit: query.limit || 20,
        offset: query.offset || 0
      };

      let category_list = await ProductCategory.findByCompanyId(connection, company.id || api.company_id, searchParams);
      let categories = [];
      for(let i = 0; i < category_list.length; i++ ){
        let category = new ProductCategory(category_list[i]);

        await category.find(connection);
        await category.verifyAccess( company.id || api.company_id);
        categories.push(category);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          product_categories: Hash.obscure(categories, req)
        }
      });


    } catch(err) {
      next(err);
    }



  });

  router.post('/', [ control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createProductCategory), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let category = new ProductCategory();
      body.company_id = company.id;
      category.update(body);
      await connection.beginTransactionAsync();
      await category.save(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          product_category_id: Hashes.encode(category.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('product_category_created', {company, contact, api, category, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.put('/:product_category_id',  [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createProductCategory), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let category = new ProductCategory({id: params.product_category_id});
      await category.find(connection);
      category.verifyAccess(company.id);

      category.update(body);
      await connection.beginTransactionAsync();
      await category.save(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          product_category_id: Hashes.encode(category.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('product_category_updated', {company, contact, api, category, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.delete('/:product_category_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let category = new ProductCategory({id: params.product_category_id});
      await category.find(connection);
      category.verifyAccess(company.id);

      await category.delete(connection);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('product_category_deleted', {company, contact, api, category, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  return router;
};
