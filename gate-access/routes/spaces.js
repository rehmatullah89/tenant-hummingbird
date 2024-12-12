const express = require('express');
const router = express.Router();
const { promisify } = require('util');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const SpaceService = require('../services/spaceService.js');
const UserService = require('../services/userService');
const EdgeService = require("../services/edgeAppService.js");
const GroupService = require('../services/groupService');
const e = require(__dirname + '/../modules/error_handler.js');
const AccessControl = require(__dirname + '/../modules/access_control/access_control.js');
const moment = require('moment');
var auth = require(__dirname + '/../modules/auth.js');


module.exports = function (app) {

	app.get('/v1/facilities/:facility_id/spaces', auth.access(['admin']), async (req, res, next) => {
    try {
      // TODO use timetoken for sanity check
      let { version, timetoken, modified } = req.query;

      let { facility_id } = req.params;

      let _modified = modified
        ? moment(modified).format("YYYY-MM-DD HH:mm:ss")
        : null;

      // generate gates poll timestamp
      let _polltime = moment().utc().subtract(5, 'seconds').format("YYYY-MM-DD HH:mm:ss");

      //TODO check for existing polltime based on facility_Id
      let edgeApp = await EdgeService.get(req.connection, facility_id);

      // start registering the facilities with out edge service
      if (!edgeApp) {
        await EdgeService.register(req.connection, facility_id);
      }

      // temporary version switch. this will go away when we do the gates architecture
      if (version === "v2") {
        //Do full sync if no last polled time in edge service
        _modified = edgeApp?.lastpolled_on || null;

        //TODO  sanity check ??? time token against the lastpolled_on
      }

      const facility = new FacilityService({
        facility_id,
        company_id: res.locals.company.id,
      });

      await facility.find(req.connection);
      facility.verifyAccess(res.locals.company.id);

      await facility.getSpaces(req.connection, _modified);

      for (let i = 0; i < facility.Spaces.length; i++) {
        await facility.Spaces[i].getUsers(req.connection);
      }

      //update last polltime per facility
      // irrespective of the vendors we will start saving polltime
      await EdgeService.updatePolltime(req.connection, facility_id, _polltime);

      // send it back to agent for them to cache and send as timetoken on the next poll
      //can't send it in body,  may impact the existing live agent app
      res.set("X-tenant-poll-time", _polltime);

      res.json({
        status: 200,
        data: {
          spaces: facility.Spaces,
        },
      });
    } catch (err) {
      next(err);
    }

    await utils.closeConnection(pool, req.connection);

	});

	app.get('/v1/facilities/:facility_id/spaces/:space_id', auth.access(['admin']), async (req, res, next) => {
		try {


			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			console.log(facility);
			await space.find(req.connection);
			console.log(space);
			space.verifyAccess(facility.id);

			//await space.getArea(req.connection);
			await space.getUsers(req.connection);

			res.json({
				status: 200,
				data: {
					space: space
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.post('/v1/facilities/:facility_id/spaces', auth.access(['admin']), async (req, res, next) => {
		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				//space_id: req.params.space_id //there is no as such parameter in req
			});
			space.create(req.body);

			await facility.getGateVendor(req.connection);
			await req.connection.beginTransactionAsync();
			await space.save(req.connection);

			let external_id = await facility.GateConnection.create_unit(space);
			if (external_id) {
				space.external_id = external_id;
				space.soft_catch = 0;
				space.hard_catch = 0;
				space.late_catch = 0;

				await space.save(req.connection);
			}

			await req.connection.commitAsync();


			res.json({
				status: 201,
				data: {
					space: space
				}
			});

		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/spaces/:space_id', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);
			space.verifyAccess(facility.id);


			space.create(req.body);
			await space.save(req.connection);

			res.json({
				status: 200,
				data: {
					space: space
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.put('/v1/facilities/:facility_id/spaces/:space_id/status', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);

			await space.setStatus(req.connection, req.body.status);

			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/spaces/:space_id/code', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);

			await space.updateSpaceCode(req.connection, req.body.pin);

			res.json({
				status: 200,
				data: {
					pin: req.body.pin
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/spaces/:space_id/enable-access', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);
			await space.getUsers(req.connection);

			for (let i = 0; i < space.Users.length; i++) {
				await space.updateUser(req.connection, space.Users[i], { status: 'ACTIVE' });
			}

			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.put('/v1/facilities/:facility_id/spaces/:space_id/overlock', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);
			space.verifyAccess(facility.id);
			await space.setStatus(req.connection, 'OVERLOCK');

			if (facility.GateConnection.gate_vendor_id === 5) {
				await space.getUsers(req.connection);

				for (let i = 0; i < space.Users.length; i++) {
					await facility.GateConnection.overlock(space.Users[i], space);
				}
			}


			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/spaces/:space_id/remove-overlock', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);


			// if !noke return;
			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);
			space.verifyAccess(facility.id);
			await space.removeStatus(req.connection);

			if (facility.GateConnection.gate_vendor_id === 5) {
				await space.find(req.connection);
				await space.getUsers(req.connection);
				for (let i = 0; i < space.Users.length; i++) {
					let user = space.Users[i];
					// hack to work with existing method
					user.Spaces = [space];
					await facility.GateConnection.unsuspend(user);
					await space.updateUser(req.connection, space.Users[i], { status: 'ACTIVE' });
				}
			}

			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});



	app.put('/v1/facilities/:facility_id/spaces/:space_id/deny-access', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);
			await space.getUsers(req.connection);

			for (let i = 0; i < space.Users.length; i++) {
				await space.updateUser(req.connection, space.Users[i], { status: 'SUSPENDED' });
			}

			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.get('/v1/facilities/:facility_id/spaces/:space_id/catches', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);

			if (!space.soft_catch) space.soft_catch = 0;
			if (!space.hard_catch) space.hard_catch = 0;
			if (!space.late_catch) space.late_catch = 0;

			res.json({
				status: 200,
				data: {
					soft_catch: space.soft_catch,
					hard_catch: space.hard_catch,
					late_catch: space.late_catch
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.put('/v1/facilities/:facility_id/spaces/:space_id/catches', auth.access(['admin']), async (req, res, next) => {

		try {

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);

			await space.updateCatches(req.connection, req.body);

			res.json({
				status: 200,
				data: {
					status: req.body.status
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.delete('/v1/facilities/:facility_id/spaces/:space_id/status', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			console.log("HERE");
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);

			space.verifyAccess(facility.id);

			await space.removeStatus(req.connection);

			await space.find(req.connection);

			res.json({
				status: 200,
				data: {
					space: space
				}
			});
		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.delete('/v1/facilities/:facility_id/spaces/:space_id', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);

			await space.delete(req.connection);

			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Move a user into a space and create a user
	app.post('/v1/facilities/:facility_id/spaces/:space_id/users', auth.access(['admin']), async (req, res, next) => {
		try {

			let user = {};
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);

			let accessControl = await AccessControl.getGateService(req.connection, facility.gate_vendor_id, facility.id);
			await accessControl.getCredentials(req.connection);

			if (!req.body.user_id) {
				e.th(400, "Missing user_id in the request body");
			}

			// if user object, save user
			user = new UserService({ company_id: res.locals.company.id, facility_id: req.params.facility_id, user_id: req.body.user_id });
			await user.userExists(req.connection);


			if (req.body.user) {
				user.create(req.body.user);
			}

			await req.connection.beginTransactionAsync();

			let visitor = await accessControl.move_in(space, user)
			if (visitor) {
				console.log("move in visitor route =>", visitor);
				user.external_id = visitor.id;
				await user.save(req.connection);
			}

			// // save user to space
			// const settings = {
			// 	group_id: 1
			// };

			await space.moveUserIn(req.connection, user, req.body, facility.gate_vendor_id);

			// put user in default user group if they aren't there.
			// await user.addToGroup(req.connection, settings.group_id, facility.id);

			// get areas and add to user areas
			// if(space.access_area_id){
			// 	await space.getArea(req.connection);
			// 	await space.Area.getGates(req.connection);
			// }
			// await user.saveAccess(req.connection);

			await req.connection.commitAsync();

			res.json({
				status: 201,
				data: {
					user: user
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	// Update the status of a user in a space
	app.put('/v1/facilities/:facility_id/spaces/:space_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {
		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});

			await space.find(req.connection);
			space.verifyAccess(facility.id);


			let user = new UserService({
				user_id: req.params.user_id,
				facility_id: facility.id,
			});


			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);
			await req.connection.beginTransactionAsync();

			await space.updateUser(req.connection, user, req.body);
			if(req.body.status === "SUSPENDED"){
				await space.removeUserFromSpace(req.connection, user.id);
			}
			await user.getSpaces(req.connection, facility.id);
			await facility.GateConnection.update_user_to_unit(space, user);

			// put user in default user group if they aren't there.
			// await user.addToGroup(req.connection, settings.group_id, facility.id);

			// get areas and add to user areas
			// if(space.access_area_id){
			// 	await space.getArea(req.connection);
			// 	await space.Area.getGates(req.connection);
			// }
			// await user.saveAccess(req.connection);

			await req.connection.commitAsync();

			res.json({
				status: 201,
				data: {
					user: user
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	// Move an existing user into a space
	app.post('/v1/facilities/:facility_id/spaces/:space_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);


			let user = new UserService({
				user_id: req.params.user_id,
				facility_id: facility.id,
			});

			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);

			await req.connection.beginTransactionAsync();
			await space.moveUserIn(req.connection, user, req.body, facility.gate_vendor_id);

			await user.getSpaces(req.connection, facility.id);
			let result = await facility.GateConnection.move_in(space, user);

			if (result && result.external_id) {
				let external_id = result.external_id;
				if (result.space_level) {
					await space.updateUser(req.connection, user, { external_id });
				} else {
					user.external_id = external_id;
					await user.save(req.connection);
				}
			}

			// put user in default user group if they aren't there.
			// await user.addToGroup(req.connection, settings.group_id, facility.id);

			// get areas and add to user areas
			// if(space.access_area_id){
			// 	await space.getArea(req.connection);
			// 	await space.Area.getGates(req.connection);
			// }
			// await user.saveAccess(req.connection);

			await req.connection.commitAsync();

			res.json({
				status: 201,
				data: {
					user: user
				}
			});
		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	/* Move all users out of a Space */
	app.delete('/v1/facilities/:facility_id/spaces/:space_id/users', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});

			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);

			await space.vacateSpace(req.connection);

			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	/* Move one user out of a Space */
	app.delete('/v1/facilities/:facility_id/spaces/:space_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);

			let user = new UserService({
				user_id: req.params.user_id,
				facility_id: facility.id,
			});
			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);

			await req.connection.beginTransactionAsync();
			console.log("move out");
			
			/*
				*If brivo, do not set external_id to null when moving out. (Brivo returns an error if you use the same external_id)
			*/
			if (facility.GateConnection.access_id === 1) await space.updateUser(req.connection, user, { end_date: moment().format('YYYY-MM-DD'), status: 'INACTIVE'});
			else await space.updateUser(req.connection, user, { end_date: moment().format('YYYY-MM-DD'), external_id: null, status: 'INACTIVE'});
			await space.removeUserFromSpace(req.connection, user.id, facility.gate_vendor_id);
			await user.getSpaces(req.connection, facility.id);

			let creds = { external_id: null };
			let leases = user.currentLeases() || [];
			let deleteUser = false;
			if (!leases.length) {
				if (facility.GateConnection.gate_vendor_id === 10) {
					// remove user external id for PDK only
					await user.delete(req.connection, true);
				} else {
					await user.delete(req.connection, false);
				}
				creds.external_id = user.external_id;
				deleteUser = true;
			}

			console.log('Update user and space status is updated. User => ', JSON.stringify(user));
			console.log('Space => ', JSON.stringify(space));
			await facility.GateConnection.move_out(space, creds, user, deleteUser);

			await req.connection.commitAsync();

			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.delete('/v1/facilities/:facility_id/transfer/spaces/:space_id/users/:user_id', auth.access(['admin']), async (req, res, next) => {

		try {
			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find(req.connection);
			facility.verifyAccess(res.locals.company.id);
			await facility.getGateVendor(req.connection);

			const space = new SpaceService({
				facility_id: facility.id,
				space_id: req.params.space_id
			});
			await space.find(req.connection);
			space.verifyAccess(facility.id);

			let user = new UserService({
				user_id: req.params.user_id,
				facility_id: facility.id,
			});
			await user.find(req.connection);
			user.verifyAccess(res.locals.company.id);

			await req.connection.beginTransactionAsync();
			console.log("transfer move out");


			await space.updateUser(req.connection, user, { end_date: moment().format('YYYY-MM-DD'), external_id: null, status: 'INACTIVE' });
			await space.removeUserFromSpace(req.connection, user.id, facility.gate_vendor_id);
			await user.getSpaces(req.connection, facility.id);

			let creds = { external_id: null };
			let leases = user.currentLeases() || [];
			let deleteUser = false;
			if (!leases.length) {
				console.log('Remove access for user. User => ', JSON.stringify(user));
				await facility.GateConnection.remove_access(user);
			}

			console.log('Update user and space status is updated. User => ', JSON.stringify(user));
			console.log('Space => ', JSON.stringify(space));
			await facility.GateConnection.move_out(space, creds, user, deleteUser);

			await req.connection.commitAsync();

			res.json({
				status: 200,
				data: {}
			});

		} catch (err) {
			await req.connection.rollbackAsync();
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});



	return router;

}

