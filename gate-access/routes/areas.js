const express = require('express');
const router = express.Router();
const {promisify} = require('util');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils    = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const AreaService = require('../services/areaService');
const e = require(__dirname + '/../modules/error_handler.js');
var auth    = require(__dirname + '/../modules/auth.js');


module.exports = function(app) {

	app.get('/v1/facilities/:facility_id/areas', async (req,res, next) => {
		try{
			const areas = await AreaService.findAllAreas( req.connection );

			res.json({
				status: 200,
				data: {
					areas: areas
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.get('/v1/facilities/:facility_id/areas/:area_id', auth.access(['admin']), async (req,res, next) => {
		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);


			const area = new AreaService({id: req.params.area_id});
			await area.find( req.connection );
			area.verifyAccess(facility.id);



			res.json({
				status: 200,
				data: {
					area: area
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/areas', auth.access(['admin']), async (req,res, next) => {
		try{
			let company_id = res.locals.company.id;

			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);
			const area = new AreaService({facility_id: facility.id});

			//const area = new AreaService({facility_id: req.params.facility_id});
			area.create(req.body);
			await area.save( req.connection );

			res.json({
				status: 201,
				data: {
					area: area
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.put('/v1/facilities/:facility_id/areas/:area_id', auth.access(['admin']), async (req,res, next) => {

		try{

			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); 

			const area = new AreaService({id: req.params.area_id});
			await area.find( req.connection, false );
			area.verifyAccess(facility.id);

			area.create(req.body);
			await area.save( req.connection );

			res.json({
				status: 200,
				data: {
					area: area
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.delete('/v1/facilities/:facility_id/areas/:area_id', auth.access(['admin']), async (req,res, next) => {

		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); //TODO replace with company_id


			const area = new AreaService({id: req.params.area_id});
			await area.find( req.connection );
			area.verifyAccess(facility.id);

			await area.delete(req.connection, false);

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

