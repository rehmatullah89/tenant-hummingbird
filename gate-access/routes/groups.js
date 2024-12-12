const express = require('express');
const router = express.Router();
const {promisify} = require('util');

// MYSQL CLIENT SETUP
const pool = require('../modules/db.js');
const utils    = require('../modules/utils.js');
const FacilityService = require('../services/facilityService');
const GroupService = require('../services/groupService');
const e = require(__dirname + '/../modules/error_handler.js');
var auth    = require(__dirname + '/../modules/auth.js');

module.exports = function(app) {

	app.get('/v1/facilities/:facility_id/groups', auth.access(['admin']), async (req,res, next) => {
		try{

			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);


			const group_res = await GroupService.findAllGroups( req.connection, {facility_id: facility.id} );
			let groups = [];


			for(let i = 0; i < group_res.length; i++){
				groups[i] = new GroupService(group_res[i]);
				await groups[i].findAreas( req.connection );
				await groups[i].findTimes( req.connection );
			}
			res.json({
				status: 200,
				data: {
					groups: groups
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.get('/v1/facilities/:facility_id/groups/sync', auth.access(['admin']), async (req,res, next) => {
		try{

			const facility = new FacilityService({
				facility_id: req.params.facility_id,
				company_id: res.locals.company.id
			});
			await facility.find( req.connection );
			facility.verifyAccess(res.locals.company.id);

			await facility.getGateVendor(req.connection);
			await facility.GateConnection.get_groups();

			// TODO save external groups in DB

			res.json({
				status: 200,
				data: {
					groups: facility.GateConnection.Groups
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.get('/v1/facilities/:facility_id/groups/:group_id', auth.access(['admin']), async (req,res, next) => {

		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);

			const group = new GroupService({id: req.params.group_id});
			await group.find( req.connection );
			group.verifyAccess(facility.id);

			await group.findAreas( req.connection );
			await group.findTimes( req.connection );


			res.json({
				status: 200,
				data: {
					group: group
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);


	});

	app.post('/v1/facilities/:facility_id/groups', auth.access(['admin']), async (req,res, next) => {
		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);

			const group = new GroupService({facility_id: facility.id});
			//const group = new GroupService({facility_id: req.params.facility_id});

			group.create(req.body);


			// ADD gate to remote system if possible
			await facility.getGateVendor(req.connection);
			group.external_id = await facility.GateConnection.add_group(group);

			if(req.body.access_times && req.body.access_times.length){
				for(let i = 0; i < req.body.access_times.length; i++){
					group.addHours(req.body.access_times[i]);
				}
			}

			if(req.body.access_areas && req.body.access_areas.length){
				await group.addAreas(req.connection, req.body.access_areas );
			}

			await group.save( req.connection );



			res.json({
				status: 201,
				data: {
					group: group
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	app.put('/v1/facilities/:facility_id/groups/:group_id', auth.access(['admin']), async (req,res, next) => {

		try{
			let company_id = res.locals.company.id;

			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id);

			const group = new GroupService({id: req.params.group_id});
			await group.find( req.connection, false );
			group.verifyAccess(facility.id);

			group.create(req.body);

			// TODO Update remote gate

			await group.save( req.connection );

			res.json({
				status: 200,
				data: {
					group: group
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

	app.delete('/v1/facilities/:facility_id/groups/:group_id', auth.access(['admin']), async (req,res, next) => {

		try{
			let company_id = res.locals.company.id;
			const facility = new FacilityService({facility_id: req.params.facility_id, company_id: res.locals.company.id});
			await facility.find( req.connection );
			facility.verifyAccess(company_id); 

			// TODO Delete remote gate if possible
			const group = new GroupService({id: req.params.group_id});
			await group.find( req.connection, false );
			group.verifyAccess(facility.id);

			await group.delete(req.connection);

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

