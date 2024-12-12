const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const moment = require('moment');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const UserService = require('../services/userService');
const e = require(__dirname + '/../modules/error_handler.js');


const AccessControl = require(__dirname + '/../modules/access_control/access_control.js');
const PTICore = require(__dirname + '/../modules/access_control/pti_core');
const brivo = require(__dirname + '/../modules/access_control/brivo');
const noke = require(__dirname + '/../modules/access_control/noke');
const openTech = require(__dirname + '/../modules/access_control/open_tech_cia');

const logger = require(__dirname + '/../modules/logger.js')

var auth = require(__dirname + '/../modules/auth.js');

module.exports = function (app) {

	// Gets a list of all facilities for a company
	app.get('/v1/facilities', auth.access(['admin']), async (req, res, next) => {
		try {
			const facilities = await FacilityService.findAllFacilities(req.connection, res.locals.company.id);
			res.json({
				status: 200,
				data: {
					facilities: facilities
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/sync/:gate_vendor_id', auth.access(['admin']), async (req, res, next) => {
		try {
			const facility = new FacilityService({ facility_id: req.params.facility_id, company_id: res.locals.company.id });
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let facilities = await facility.GateConnection.get_facilities(req.connection);

			res.json({
				status: 200,
				data: {
					facilities: facilities
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Gets a list of all users at a facility
	app.get('/v1/facilities/:facility_id/users', auth.access(['admin']), async (req, res, next) => {
		try {
			const facility = new FacilityService({ facility_id: req.params.facility_id, company_id: res.locals.company.id });
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.findUsers(req.connection);

			res.json({
				status: 200,
				data: {
					users: facility.Users
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Gets a specific user
	app.get('/v1/facilities/:facility_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({ facility_id: req.params.facility_id, company_id: res.locals.company.id });
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			let user = new UserService({ id: req.params.user_id });

			await user.getSpaces(req.connection, facility.id);
			if (!user.Spaces.length) e.th(404, "User not found");

			await user.find(req.connection);
			await user.getGates(req.connection, facility.id);
			await user.getTimes(req.connection, facility.id);
			await user.getGroup(req.connection);



			res.json({
				status: 200,
				data: {
					user: user
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Gets a specific facility
	app.get('/v1/facilities/:facility_id', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);

			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);

			res.json({
				status: 200,
				data: {
					facility: facility
				}
			});

		} catch (err) {
			next(err);
		}

		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/sync', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({ facility_id: req.params.facility_id, company_id: res.locals.company.id });
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let units = await facility.GateConnection.initial_load(req.connection, res.locals.company.id, facility);

			res.json({
				status: 200,
				data: {
					units: units
				}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/sync', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let facilities = await facility.GateConnection.get_facilities();

			res.json({
				status: 200,
				data: {
					facilities
				}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({ company_id: res.locals.company.id }, req.body.Credentials);
			facility.create(req.body);
			//facility.Credentials = req.body.Credentials;
			facility.created_by = req.body.admin_id;
			facility.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
			facility.modified_by = req.body.admin_id;
			facility.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');

			console.log("FACILITY OBJ", facility);

			await req.connection.beginTransactionAsync();

			await facility.save(req.connection);
			await facility.getGateVendor(req.connection);
			await facility.GateConnection.setCredentials(req.body.Credentials);


			// test gate connection
			await facility.testGateConnection();
			await facility.GateConnection.saveCredentials(req.connection);

			await req.connection.commitAsync();

			res.json({
				status: 200,
				data: {
					facility: facility
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			// TODO require unique facility ids at a company
			facility.update(req.body);
			//facility.Credentials = req.body.Credentials;

			facility.modified_by = req.body.admin_id;
			facility.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');

			await req.connection.beginTransactionAsync();
			await facility.save(req.connection);
			await facility.getGateVendor(req.connection);
			await facility.GateConnection.setCredentials(req.body.Credentials);

			// test gate connection
			await facility.testGateConnection();
			await facility.GateConnection.saveCredentials(req.connection);

			await req.connection.commitAsync();

			res.json({
				status: 200,
				data: {
					facility: facility
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.delete('/v1/facilities/:facility_id', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			facility.modified_by = req.body.admin_id;
			facility.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');

			await facility.delete(req.connection);
			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Gets new generated code for facility
	app.get('/v1/facilities/:facility_id/generate-code', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let code = await facility.GateConnection.generateCode(req.connection);

			res.json({
				status: 200,
				data: {
					code
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// validate the code for facility
	app.post('/v1/facilities/:facility_id/validate-code', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			await facility.GateConnection.validateCode(req.connection, req.body.code, req.body.user_id);

			res.json({
				status: 200
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/generate-space-code', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let code = await facility.GateConnection.generateSpaceCode(req.connection, req.body.space_id, req.body.space_number);

			res.json({
				status: 200,
				data: {
					code
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/validate-space-code', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let code = await facility.GateConnection.validateSpaceCode(req.connection, req.body.code, req.body.space_number, req.body.space_id);

			res.json({
				status: 200, 
				data: {
					code
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.post('/v1/facilities/:facility_id/update-results', auth.access(['admin']), async (req, res, next) => {

		try {
			let body = req.body;

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);

			console.log("Result from local", body);

			await facility.sendResults(body);
			
			if (body.num_errors > 0) {
				body['component'] = "HB_GATE_ACCESS_GATE_PORTAL"
				let message = {
					message: body,
				}
				
				logger.httpError(JSON.stringify(message))
			}

			res.json({
				status: 200
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});




	return router;

}

