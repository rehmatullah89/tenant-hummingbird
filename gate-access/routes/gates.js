const express = require('express');
const router = express.Router();
const {promisify} = require('util');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils    = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const GateService = require('../services/gateService');
const e = require(__dirname + '/../modules/error_handler.js');
var auth    = require(__dirname + '/../modules/auth.js');


module.exports = function(app) {

	app.get('/v1/facilities/:facility_id/gates', async (req,res, next) => {
		try{
			const gates = await GateService.findAllGates( req.connection );

			res.json({
				status: 200,
				data: {
					gates: gates
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.get('/v1/facilities/:facility_id/gates/:gate_id', auth.access(['admin']), async (req,res, next) => {
		try{

			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); //TODO replace with company_id


			const gate = new GateService({id: req.params.gate_id});
			await gate.find( req.connection );
			gate.verifyAccess(facility.id);



			res.json({
				status: 200,
				data: {
					gate: gate
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/gates', auth.access(['admin']), async (req,res, next) => {
		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id)
			const gate = new GateService({facility_id: facility.id});

			//const gate = new GateService({facility_id: req.params.facility_id});
			gate.create(req.body);
			await gate.save( req.connection );

			res.json({
				status: 201,
				data: {
					gate: gate
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.put('/v1/facilities/:facility_id/gates/:gate_id', auth.access(['admin']), async (req,res, next) => {

		try{

			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); 

			const gate = new GateService({id: req.params.gate_id});
			await gate.find( req.connection, false );
			gate.verifyAccess(facility.id);

			gate.create(req.body);
			await gate.save( req.connection );

			res.json({
				status: 200,
				data: {
					gate: gate
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.delete('/v1/facilities/:facility_id/gates/:gate_id', auth.access(['admin']), async (req,res, next) => {

		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); //TODO replace with company_id


			const gate = new GateService({id: req.params.gate_id});
			await gate.find( req.connection, false );
			gate.verifyAccess(facility.id);

			await gate.delete(req.connection);

			res.json({
				status: 200,
				data: {}
			});

		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});



	return router;

}

