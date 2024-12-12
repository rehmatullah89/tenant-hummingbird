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
var qs = require('querystring');
var request = require('request');
var requestPromise = require('request-promise');

var models = require(__dirname + '/../models');

var QB = require('node-quickbooks');
var QuickBooks  = require(__dirname + '/../classes/quickbooks.js');
var Setting  = require(__dirname + '/../classes/settings.js');
var ApiKey  = require(__dirname + '/../classes/api_key.js');
var Product  = require(__dirname + '/../classes/product.js');
var Insurance  = require(__dirname + '/../classes/insurance.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var Settings  = require(__dirname + '/../classes/settings.js');

var eventEmitter = require(__dirname + '/../events/index.js');
var e  = require(__dirname + '/../modules/error_handler.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});

var Schema = require(__dirname + '/../validation/settings.js');
var UnitSearch = require(__dirname + '/../modules/unit_searcher.js');



module.exports = function(app, sockets) {


	router.get('/:unit_type', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;

		try{
			const company = res.locals.active;
			let params = req.params;

			let space_type_parameters = await Settings.findSpaceTypeParameters(connection, company.id, params.unit_type);

			let space_types = await Settings.findSpaceTypes(connection, company.id, params.unit_type, space_type_parameters);

			utils.send_response(res, {
				status: 200,
				data: {
					space_type_parameters: Hash.obscure(space_type_parameters, req),
					space_types: Hash.obscure(space_types, req)
				}
			});

		} catch(err){
			next(err)
		}

	});


	router.get('/:unit_type', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;

		try{
			const company = res.locals.active;
			let params = req.params;

			let space_type_parameters = await Settings.findSpaceTypeParameters(connection, company.id, params.unit_type);

			let space_types = await Settings.findSpaceTypes(connection, company.id, params.unit_type, space_type_parameters);

			utils.send_response(res, {
				status: 200,
				data: {
					space_type_parameters: Hash.obscure(space_type_parameters, req),
					space_types: Hash.obscure(space_types, req)
				}
			});

		} catch(err){
			next(err)
		}

	});
  /* Todo, this looks unfinished */
	router.post('/units', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;
		try {
			const company = res.locals.active;
			let params = req.params;
			let body = req.body;

			var unit_type  = body.unit_type || 'residential';
			var searcher = new UnitSearch(company.id, unit_type);

			let space_type_parameters = await Settings.findSpaceTypeParameters(connection, company.id, body.unit_type);

			// compare parameters to body to make sure they are pulling on the right criteria
			if(body.parameters.length != space_type_parameters.length){
				e.th(400, "Requested parameters dont match space type definition");
			}

			for(let i = 0; i < space_type_parameters.length; i++){
				let body_param = body.parameters.find(p => p.id === space_type_parameters[i].id)
				if(!body_param){

					e.th(400, 'Parameter ' + space_type_parameters[i].name + ' missing' )

					searcher.build_amenity_conditions_from_array(connection, space_type_parameters[i].name, null, body_param.value );

				}
			}


			for(let i = 0; i < space_type_parameters.length; i++){

			}

			utils.send_response(res, {
				status: 200,
				data: {}
			});

		} catch(err){
			next(err)
		}


	});


	return router;

};
