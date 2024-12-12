const express = require('express');
const router = express.Router();
const { promisify } = require('util');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const SpaceService = require('../services/spaceService.js');
const UserService = require('../services/userService');
const AccessControl = require(__dirname + '/../modules/access_control/access_control.js');
const e = require(__dirname + '/../modules/error_handler.js');
var auth = require(__dirname + '/../modules/auth.js');

module.exports = function (app) {


	app.get('/v1/facilities/:facility_id/users', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const conditions = {
				company_id: res.locals.company.id,
				facility_id: facility.id,
				pin: req.query.pin
			}

			const users = await UserService.findAllUsers(req.connection, conditions);

			res.json({
				status: 200,
				data: {
					users: users
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const user = new UserService({ company_id: res.locals.company.id, user_id: req.params.user_id, facility_id: facility.id });
			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);
			await user.getSpaces(req.connection, facility.id);

			res.json({
				status: 200,
				data: {
					user
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/users', auth.access(['admin']), async (req, res, next) => {

		try {

			if (!req.body.user_id) e.th(400, "Missing user ID");
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			let found = await UserService.findUserById(req.connection, req.body.user_id, facility.id)
			console.log("found", found);
			if (found) {
				e.th(409, "This user already exists");
			}

			await facility.getGateVendor(req.connection);
			const user = new UserService({ company_id: res.locals.company.id, facility_id: facility.id, user_id: req.body.user_id });
			await user.userExists(req.connection);
			user.create(req.body);

			await req.connection.beginTransactionAsync();
			await user.save(req.connection);
			let external_id = await facility.GateConnection.add_user(user);

			if (external_id) {
				user.external_id = external_id;
				await user.save(req.connection);
			}
			await req.connection.commitAsync();

			res.json({
				status: 201,
				data: {
					user: user
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			console.log("USER NOT FOUND", err);
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const user = new UserService({ company_id: res.locals.company.id, facility_id: facility.id, user_id: req.params.user_id });
			await user.find(req.connection);
			let existingPin = user.pin
			user.verifyAccess(res.locals.company.id);
			await user.getActiveSpaces(req.connection, facility.id);
			// Don't pass status flag in req body if it is not intended to be change. This is handling 2 scenarios, 1) Autopayment, 2) Contact Update
			data = { ...req.body, status: req.body.status ? req.body.status : user.status }
			user.create(data);
			await facility.getGateVendor(req.connection);
			await facility.GateConnection.update_user(user, existingPin);
			await user.save(req.connection);

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

	app.post(['/v1/facilities/:facility_id/users/:user_id/suspend', '/v1/facilities/:facility_id/users/:user_id/restore'], auth.access(['admin']), async (req, res, next) => {

		try {
			console.info(`${req.url.indexOf('suspend') >= 0 ? 'SUSPENDED' : 'ACTIVE'} user ${req.params.user_id}`);
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);


			const user = new UserService({ company_id: res.locals.company.id, facility_id: facility.id, user_id: req.params.user_id });
			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);

			// Taking the changes from merge conflcit, so commenting this out.  Untested 
			// await user.getSpaces(req.connection, facility.id);

			await user.getActiveAndSuspendedSpaces(req.connection, facility.id);

			let status = req.url.indexOf('suspend') >= 0 ? 'SUSPENDED' : 'ACTIVE';

			let space;


			console.log("user.Spaces", user)

			if (req.body.space_id) {
				space = new SpaceService({
					facility_id: facility.id,
					space_id: req.body.space_id
				});
				await space.find(req.connection);
				space.verifyAccess(facility.id);
			}

			await facility.getGateVendor(req.connection);
			if (status === 'SUSPENDED') {
				await facility.GateConnection.suspend(user, space);
				console.info("Space suspended: ", space);
			} else if (status === 'ACTIVE') {
				await facility.GateConnection.unsuspend(user, space);
				console.info("Space activated: ", space);
			}
			// else if (status === 'overlock'){
			// 	await facility.GateConnection.overlock(user, space);
			// 	console.info("Space activated: ", space);
			// }

			if (space) {
				await space.updateUser(req.connection, user, { status });
				console.info("User updated with status: ", user);
			} else {
				user.status = status;
				await user.save(req.connection);
				console.info("User updated: ", user);
			}

			res.json({
				status: 200,
				data: {
					user: user
				}
			});
		} catch (err) {
			console.error("Error occured while changing space status: ", err);
			next(err);
		} finally {
			await utils.closeConnection(pool, req.connection);
		}
	});

	app.post('/v1/facilities/:facility_id/users/:user_id/unlink', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);


			console.log("Request body: ", req.body);

			const old_user = new UserService({ company_id: res.locals.company.id, facility_id: facility.id, user_id: req.params.user_id });
			await old_user.userExists(req.connection);

			const new_user = new UserService({ company_id: res.locals.company.id, facility_id: facility.id, user_id: req.body.new_contact_id });
			await new_user.userExists(req.connection);

			if(old_user?.id && old_user?.status == 'SUSPENDED' && new_user?.id) {
				new_user.status = "SUSPENDED";
				await new_user.save(req.connection);
				await new_user.getSpaces(req.connection);
				await facility.getGateVendor(req.connection);
				await facility.GateConnection.suspend(new_user);
			}

			res.json({
				status: 200,
				data: {
					old_user_id: old_user?.id,
					new_user_id: new_user?.id
				}
			});
		} catch (err) {
			console.error("Error occurred while changing space status: ", err);
			next(err);
		} finally {
			await utils.closeConnection(pool, req.connection);
		}
	});

	app.delete('/v1/facilities/:facility_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const user = new UserService({ user_id: req.params.user_id, facility_id: facility.id, company_id: res.locals.company.id });
			await user.find(req.connection);

			user.verifyAccess(res.locals.company.id);

			await user.delete(req.connection);

			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/users/sync', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			await facility.GateConnection.get_users();

			res.json({
				status: 200,
				data: {
					users: facility.GateConnection.Users
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/users/:user_id/sync', auth.access(['admin']), async (req, res, next) => {
		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			let result = await facility.GateConnection.get_user({ external_id: user_id });

			// TODO save external groups in DB

			res.json({
				status: 200,
				data: {
					groups: result
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/users/:user_id/link-contact', auth.access(['admin']), async (req, res, next) => {
		console.log('REACHED IN CORRECT PLACE AGAIN')

			try {
				const facility = new FacilityService({
					facility_id: req.params.facility_id,
					company_id: res.locals.company.id,
				});

				await facility.find(req.connection);
				facility.verifyAccess(res.locals.company.id);

				const primaryUser = new UserService({
					company_id: res.locals.company.id,
					facility_id: facility.id,
					user_id: req.body.primary_contact_id,
				});

				await primaryUser.find(req.connection);
				primaryUser.verifyAccess(res.locals.company.id);				

				console.log('PRIMARY USER')
				console.log(primaryUser);

				const secondaryUser = new UserService({
					company_id: res.locals.company.id,
					facility_id: facility.id,
					user_id: req.params.user_id,
				});

				await secondaryUser.find(req.connection);
				secondaryUser.verifyAccess(res.locals.company.id);							

				console.log('SECONDARY USER')
				console.log(secondaryUser);

				const response = await secondaryUser.linkSpace(req.connection, primaryUser.id);

				console.log('spaces_users record updated')
				console.log(response)

				if(primaryUser.status == 'SUSPENDED' || secondaryUser.status == 'SUSPENDED') {
					primaryUser.status = "SUSPENDED";
					await primaryUser.save(req.connection);
					await primaryUser.getSpaces(req.connection);
					await facility.getGateVendor(req.connection);
					await facility.GateConnection.suspend(primaryUser);
				}

				res.json({
					status: 200,
					data: {
						result: response,
					},
				});
			} catch (err) {
				console.error('Error occurred while changing space status: ', err);
				next(err);
			} finally {
				await utils.closeConnection(pool, req.connection);
			}
		}
	);	

	return router;

}

