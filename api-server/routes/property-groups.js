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
var Upload      = require('../classes/upload.js');
var Address      = require('../classes/address.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Category = require(__dirname + '/../classes/category.js');
var Property  = require(__dirname + '/../classes/property.js');
var PropertyGroup  = require(__dirname + '/../classes/property_groups.js');
var Template      = require('../classes/template.js');
var Service      = require('../classes/service.js');
var breadcrumbs = [];
var Activity = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var UnitSearch = require(__dirname + '/../modules/unit_searcher.js');
var eventEmitter = require(__dirname + '/../events/index.js');


var Joi      = require('joi');
const joiValidator = require('express-joi-validation')({
  passError: true
});

var Schema = require(__dirname + '/../validation/property_group.js');


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

      let group_list = await PropertyGroup.findByCompanyId(connection, company.id || api.company_id, searchParams);
      let groups = [];

      for(let i = 0; i < group_list.length; i++ ){
        let group = new PropertyGroup(group_list[i]);
        await group.find(connection);

        await group.verifyAccess( company.id || api.company_id);
        await group.getProperties(connection);
        for(let j = 0; j < group.Properties.length; j++){
          await  group.Properties[j].getUnitCount(connection);
          await  group.Properties[j].getLeaseCount(connection);
        }
        groups.push(group);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          property_groups: Hash.obscure(groups, req)
        }
      });


    } catch(err) {
      next(err);
    }



  });

  router.post('/', [ control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createPropertyGroup), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let group = new PropertyGroup();
      body.company_id = company.id;
      group.update(body);
      await group.addProperties(connection, body.property_ids, res.locals.properties);

      await connection.beginTransactionAsync();
      await group.save(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          property_group_id: Hashes.encode(group.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_group_created', {company, contact, api, group, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.put('/:property_group_id',  [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createPropertyGroup), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let group = new PropertyGroup({id: params.property_group_id});
      await group.find(connection);
      group.verifyAccess(company.id);

      group.update(body);
      await group.addProperties(connection, body.property_ids, res.locals.properties);

      await connection.beginTransactionAsync();
      await group.save(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          property_group_id: Hashes.encode(group.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_group_updated', {company, contact, api, group, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.delete('/:property_group_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try{

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let body = req.body;
      let params = req.params;

      let group = new PropertyGroup({id: params.property_group_id});
      await group.find(connection);
      group.verifyAccess(company.id);

      await group.delete(connection);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('property_group_deleted', {company, contact, api, group, cid: res.locals.company_id, locals: res.locals});


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  return router;
};
