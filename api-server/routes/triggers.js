var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');
const  Delinquency = require(__dirname + '/../classes/delinquency.js');

var models  = require(__dirname + '/../models');
var utils    = require(__dirname + '/../modules/utils.js');
var Trigger  = require(__dirname + '/../classes/trigger.js');
var TriggerGroup = require(__dirname + '/../classes/trigger_group.js')
var Property  = require(__dirname + '/../classes/property.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var e = require(__dirname + '/../modules/error_handler.js');


module.exports = function(app) {

	// Action Types

	router.get('/action-types', [control.hasAccess(['admin']), Hash.unHash], async (req,res, next) => {

		try{
  		var connection = res.locals.connection;
			let actionTypes = await Trigger.getActionTypes(connection);
			utils.send_response(res, {
				status: 200,
				data: {
					action_types: Hash.obscure(actionTypes, req)
				}
			});
		} catch(err){
			next(err);
		}

	});

	// Triggers

	router.get('/', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {


		try {
		  var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let query = req.query;
			let params = req.params;
			let triggers = [];
			let triggerList = await Trigger.findByCompanyId(connection, company.id, query)


			for(let i = 0; i < triggerList.length; i++ ){
				let trigger = new Trigger(triggerList[i]);
				await trigger.find(connection);
				await trigger.findFees(connection);
				await trigger.findMessages(connection);
				await trigger.findAttachments(connection);
				await trigger.findMessages(connection);
				await trigger.findEvents(connection);
				console.log("triger 1", trigger); 
				await trigger.composeActions(connection);
				console.log("triger 2", trigger); 
				triggers.push(trigger);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					triggers: Hash.obscure(triggers, req)
				}
			});


		} catch(err) {
			next(err);
		}
	});

	router.post('/',  [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {
		
		try{

		  	var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;


			let trigger = new Trigger({
				company_id: company.id,
				name: body.name,
				description: body.description,
				repeat: !!body.repeat,
				max_repeat: !!body.max_repeat,
				start: body.start,
				trigger_reference:  body.trigger_reference,
				deny_access:  body.deny_access,
				lease_standing_id:  body.lease_standing_id,
				overlock: body.overlock,
				schedule_auction: body.schedule_auction || 0,
				apply_to_all: !!body.apply_to_all,
				group_id: body.group_id
			});

			
			await connection.beginTransactionAsync();

			await trigger.update(connection, body);
			await trigger.save(connection);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					trigger: Hash.obscure(trigger, req)
				}

			});

			eventEmitter.emit('trigger_saved', {company, contact, trigger, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
		
	});

	router.put('/:trigger_id',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

		try{
		  var connection = res.locals.connection;

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let trigger = new Trigger({id: params.trigger_id});
			await trigger.find(connection);

			await connection.beginTransactionAsync();

			await trigger.update(connection, body);
			await trigger.save(connection);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_id: Hashes.encode(trigger.id, res.locals.company_id)
				}

			});

			eventEmitter.emit('trigger_updated', {company, contact, trigger, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}



	});

	router.delete('/:trigger_id',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

		try{
  		var connection = res.locals.connection;

			let contact = res.locals.contact
			let company = res.locals.active;

			let body = req.body;
			let params = req.params;

			let trigger = new Trigger({id: params.trigger_id});
			await trigger.find(connection);

			//trigger.update(body);
			await trigger.delete(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_id: Hashes.encode(trigger.id, res.locals.company_id)
				}

			});

			eventEmitter.emit('trigger_deleted', {company, contact, trigger, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			next(err);
		}



	});


	//Trigger Groups

	router.get('/groups', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

		try {
		var connection = res.locals.connection;

		let contact = res.locals.contact;
		let company = res.locals.active;

		let groups = await TriggerGroup.findByCompanyId(connection, company.id);
		let tg = [];
		for(let i = 0; i < groups.length; i++){
			let trigger_group = new TriggerGroup({ id: groups[i].id});
			await trigger_group.find(connection);
			await trigger_group.findProperties(connection);
			tg.push(trigger_group);
		}

		utils.send_response(res, {
			status: 200,
			data: {
			trigger_groups: Hash.obscure(tg, req)
			}
		});
		} catch (error) {
			next(error);
		} finally {

		}
	});

	router.post('/groups', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		try {
  		var connection = res.locals.connection;
			let contact = res.locals.contact;
			let body = req.body;
      let company = res.locals.active;

			await connection.beginTransactionAsync();
			let trigger_group = new TriggerGroup({
				company_id: company.id,
				name: body.name,
				description: body.description
			});

			await trigger_group.save(connection);

			body.Properties = body.Properties || [];
            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }
			await trigger_group.updateProperties(connection, body.Properties, contact?.id);
			await trigger_group.findProperties(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_group: Hash.obscure(trigger_group, req)
				}
			});
		} catch (error) {
			await connection.rollbackAsync();
			next(error);
		} finally {

		}
	});

	router.put('/groups/:id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		try {
			var {connection, active: company, contact} = res.locals;
			let body = req.body;
			let params = req.params;

			let trigger_group = new TriggerGroup({id: params.id});
			await trigger_group.find(connection);

			await trigger_group.verifyAccess(company.id);

			trigger_group.Properties = body.Properties;
			if(body.Properties.length) {
				const areAccessible = await trigger_group.areAttachementsAccessibleAtProperties(connection, { company, api_info: res });
				if(!areAccessible) e.th(500, 'Documents attached in the delinquency stages are not accessible on these properties.');
			}
			await connection.beginTransactionAsync();
			trigger_group.update(body);
			await trigger_group.save(connection);

			body.Properties = body.Properties || [];
			body.removeProperties = body.removeProperties || [];
            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }
			await trigger_group.updateProperties(connection, body.Properties, contact?.id, body.removeProperties);
			// await trigger_group.findProperties(connection);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_group: Hash.obscure(trigger_group, req)
				}
			});
		} catch (error) {
			await connection.rollbackAsync();
			next(error);
		} finally{

		}
	});

	router.delete('/groups/:id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		try {

		  var connection = res.locals.connection;
			let contact = res.locals.contact;
			let body = req.body;
			let params = req.params;


			let trigger_group = new TriggerGroup({id: params.id});
			await trigger_group.find(connection);

			await trigger_group.delete(connection, contact?.id);

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_group_id: Hashes.encode(trigger_group.id, res.locals.company_id)
				}
			});
		} catch (error) {
			next(error);
		} finally{

		}
	});

	router.post('/groups/:id/duplicate', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		try {
  			var connection = res.locals.connection;
		  	let company = res.locals.active;
			let body = req.body;
			let params = req.params;

			let trigger_group = new TriggerGroup({id: params.id});
			await trigger_group.find(connection);
			await trigger_group.verifyAccess(company.id);
			await trigger_group.setDuplicateName(connection);
			trigger_group.resetIds();
			await trigger_group.save(connection);

			let triggerList = await Trigger.findByCompanyId(connection, company.id, {trigger_group_id: params.id});

			for(let i = 0; i < triggerList.length; i++ ){
				let trigger = new Trigger(triggerList[i]);
				await trigger.find(connection);
				await trigger.findFees(connection);
				await trigger.findMessages(connection);
				// await trigger.findSMSs(connection);
				await trigger.findAttachments(connection);
				await trigger.findEvents(connection);

				trigger.resetTriggerIds();
				trigger.trigger_group_id = trigger_group.id;
				await trigger.save(connection);

			}

			utils.send_response(res, {
				status: 200,
				data: {
					trigger_group: Hash.obscure(trigger_group, req)
				}
			});
		} catch (error) {
			next(error);
		}finally{

		}
	});


	router.get('/make-timelines', [Hash.unHash],  async(req, res, next) => {

		try {
			var connection = res.locals.connection;
			let company = res.locals.active;
			let query = req.query;
			let date = moment().format('YYYY-MM-DD')
			await Delinquency.createDelinquencies(connection, query.property_id, date ); 
			
			
			let triggers = await Trigger.findByPropertyId(connection, query.property_id ); 
			
			for(let i = 0; i < triggers.length; i++){

				await Delinquency.addTimelineActionsForTrigger(connection, triggers[i].id, query.property_id, date)
				
				// for(let i = 0; i < actions.length; i++){
				// 	t.addTimelineAction(connection, actions[i].action, actions[i].reference_id || null,  t.id, t.start, query.property_id)
				// }
			}

			utils.send_response(res, {
				status: 200,
				data: {
					// triggers: Hash.obscure(triggers, req)
				}
			});


		} catch(err) {
			next(err);
		}


	});



	return router;

};


