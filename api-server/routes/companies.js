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

var models = require(__dirname + '/../models');

var Company = require(__dirname + '/../classes/company.js');
var utils    = require(__dirname + '/../modules/utils.js');

var e  = require(__dirname + '/../modules/error_handler.js');

module.exports = function(app) {

	router.get('/', [control.hasAccess(['superadmin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{

			let companies_list = await models.Company.findAll(connection);
			let companies = [];

			for(let i = 0; i < companies_list.length; i++ ){
				let company = new Company(companies_list[i]);
				await company.find(connection);
				company.logo_url = company.getLogoUrl();
				companies.push(company);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					companies: Hash.obscure(companies, req)
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/details', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      var connection = res.locals.connection;

			let company = new Company({ id: res.locals.active.id });
	        await company.find(connection);
    	    await company.getWebLogoURL();

			utils.send_response(res, {
				status: 200,
				data: {
					company: Hash.obscure(company, req)
				}
			});

		} catch {
			next(err);
		}
	});

	router.post('/', [control.hasAccess(['superadmin']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;
		try{

			await connection.beginTransactionAsync();
			let company = new Company(req.body);
			await company.create(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {}
			});

			//eventEmitter.emit('company_created', {active, contact, company , locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	return router;
};
