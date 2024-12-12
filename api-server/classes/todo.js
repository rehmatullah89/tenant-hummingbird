"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Enums  = require(__dirname + '/../modules/enums.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class Todo {

	constructor(data = {}) {

		this.id = data.id;
		this.original_date = data.original_date;
		this.created_by = data.created_by;
		this.contact_id = data.contact_id;
		this.activity_object_id = data.activity_object_id;
		this.object_id =   data.object_id;
		this.event_id =  data.event_id;
		this.snoozed_count = data.snoozed_count;
		this.completed = data.completed;
		this.details = data.details;
		this.completed_by = data.completed_by;
		this.regarding = '';
		this.link_to_resource = '';
		this.Event ={};
		this.Contact ={} ;
		this.ActivityObject ={};
		this.Object = {};
		this.action = data.action;
		this.read = data.read || 0;

	}

	validate(){
		return Promise.resolve();
	}

	save(connection){

		return this.validate().then(() => {
			var save = {
				original_date: this.original_date,
				created_by: this.created_by,
				contact_id: this.contact_id,
				activity_object_id: this.activity_object_id,
				object_id: this.object_id,
				event_id: this.event_id,
       		 	details: this.details,
				snoozed_count: this.snoozed_count || 0,
				completed: this.completed || 0,
				action: this.action,
				completed_by: this.completed_by,
				read: this.read,
			};


			return models.Todo.save(connection, save, this.id)
		})
		.then(id => {
			this.id = id;
			return true;
		})
	}

	verifyId(){
		return Promise.resolve().then(() => {
			if(!this.id) e.th(400, "Missing ID");
			return true;
		})
	}

	async create(connection, data, object_id, activity_object_id, user_id, company){

		this.Event = new Event();
		data.title = "Todo";
		//data.end_date = data.start_date;
		await this.Event.create(connection, 'todo', data, user_id, company );

		this.original_date =  moment.utc(data.start_date).format('YYYY-MM-DD HH:mm:ss');
		this.created_by = user_id;
		this.contact_id = data.contact_id;
		this.activity_object_id = activity_object_id;
		this.object_id = object_id;
		this.event_id = this.Event.id;
		this.snoozed_count = 0;
		this.details = data.details;
		this.completed = 0;
		this.completed_by = data.completed_by;
		this.read = data.read;

		await this.save(connection);

	}

  async find(connection){

    if(!this.id) e.th(400, "Missing ID");
    let data = await  models.Todo.findById(connection, this.id);
    if(!data) e.th(404);

    this.id = data.id;
    this.original_date = data.original_date;
    this.created_by = data.created_by;
    this.contact_id = data.contact_id;
    this.activity_object_id = data.activity_object_id;
    this.object_id =   data.object_id;
    this.event_id =  data.event_id;
    this.snoozed_count = data.snoozed_count;
    this.completed = data.completed;
    this.details = data.details;
	this.completed_by = data.completed_by;
	this.read = data.read;

	}

	static async findOpen(connection, company_id, contact_id, all, params, properties){
	  let todos =  await models.Todo.findOpen(connection, company_id, contact_id, all, params, properties);
	  return todos;
	}

	static async findAllOpen(connection, company_id, contact_id, all){
		return await models.Todo.findAllOpen(connection, company_id, contact_id, all);
	}

	static async findForToday(connection, company_id, contact_id, all, params, properties){
		let todos =  await models.Todo.findForToday(connection, company_id, contact_id, all, params, properties);
		return todos; 
	  }

	static async findByGroup(connection, company_id, contact_id, params, properties){
		return await models.Todo.findByGroup(connection, company_id, contact_id, params, properties);
	}

	static async findCount(connection, company_id, contact_id, params = {}, properties){
		let todos =  await models.Todo.findCount(connection, company_id, contact_id, params, properties);
		return todos;
	}

	static async findByContactId(connection, contact_id, company_id, params, properties){
		let todos =  await models.Todo.findByContactId(connection, contact_id, company_id, params, properties);
		return todos;
	}
	

	static async findTasksByObjectId(connection, contact_id, company_id, params, properties){
		todos = await models.Todo.findTasksByObjectId(connection, object_id, event_types, task_type);
		return todos;
	}

	static async findTasksByEventType(connection, event_types, contact_id, properties){
		return await models.Todo.findTasksByEventType(connection, event_types, contact_id, properties);
	}

	static async dismissTasks(connection, object_id, event_types, task_type, contact_id, apikey_id){
		let todos = [];

		todos = await models.Todo.findTasksByObjectId(connection, object_id, event_types, task_type);
		for(let i=0; i < todos.length; i++){
			let todo = new Todo({ id: todos[i].id });
			//todo.verifyAccess(user.id);
			await todo.dismiss(connection, contact_id, apikey_id);
		}

		return true;
	}

	static async dismissTasksByEventType(connection, event_types, task_type, contact_id, apikey_id, properties){
		let todos = [];

		todos = await models.Todo.findTasksByEventType(connection, event_types, task_type);

		for(let i=0; i < todos.length; i++){
			let todo = new Todo({ id: todos[i].id });
			//todo.verifyAccess(user.id);
			await todo.dismiss(connection, contact_id, apikey_id);
		}

		return true;
	}

	verifyAccess(contact_id){

		if(!this.id) e.th(400, "Missing ID");
		if(this.created_by !== contact_id && this.contact_id && this.contact_id != contact_id){
			e.th(403, "Not Authorized");
		}


	}
	static async findUnitsFromTasks(connection, task_ids){
		return await models.Todo.findUnitsFromTasks(connection, task_ids); 
	}

	dismiss(connection, contact_id, apikey_id){
		return this.verifyId()
			.then(() => {
				if(contact_id) 
					models.Todo.save(connection, {completed: 1, completed_by: contact_id, completed_at: moment().format('YYYY-MM-DD HH:mm:ss') }, this.id)
				else 
					models.Todo.save(connection, {completed: 1, apikey_id: apikey_id , completed_at: moment().format('YYYY-MM-DD HH:mm:ss') }, this.id)
			})
			//.then(() => models.Event.save(connection, {end_date: moment().format('YYYY-MM-DD HH:mm:ss')}, this.event_id))
	}
	async markIncomplete(connection){
		await this.verifyId();
		await models.Todo.save(connection, {completed: 0, completed_by: null, completed_at: null}, this.id)
	}

	static async dismissAllById(connection, contact_id, ids){
		models.Todo.saveAll(connection, {completed: 1, completed_by: contact_id , completed_at: moment().format('YYYY-MM-DD HH:mm:ss')}, ids)
	}

	async snooze(connection, until){

    if(!this.id) e.th(400, "Missing ID");

		await models.Todo.save(connection, {snoozed_count: this.snoozed_count + 1}, this.id);
		await models.Event.save(connection, {
      start_date: moment(until).format('YYYY-MM-DD HH:mm:ss'),
      end_date: moment(until).format('YYYY-MM-DD HH:mm:ss'),
    }, this.event_id)

	}

	formatEventText(toReplace){
		if(this.Event.event_type){

			if(this.Event.event_type.slug === Enums.EVENT_TYPES.RATE_CHANGE.REVIEW_RATE_CHANGE || this.Event.event_type.slug === Enums.EVENT_TYPES.RATE_CHANGE.APPROVE_RATE_CHANGE){
				toReplace = this.Event.Rate_Change ? this.Event.Rate_Change.Total : '';
			}

			if(this.Event.event_type.slug === Enums.EVENT_TYPES.AUCTION.CUT_LOCK_SCHEDULE_AUCTION){
				if(this.Event.Lease.auction_status == 'scheduled'){
					this.Event.event_type.text = `Verify if auction for space ${this.Event.Lease.Unit.number} has been closed and enter the bid amount`;
					this.Event.event_type.btn_text = 'View Auction';
					this.Event.created_at = this.Event.Lease.LeaseAuction.scheduled_date;
				}
			}


			if(this.Event.event_type.slug === Enums.EVENT_TYPES.AUCTION.AUCTION_DAY){
				toReplace = this.Event.Lease.Unit.number;
			}

			if(this.Event.event_type.slug === Enums.EVENT_TYPES.RATE_CHANGE.GENERATED_RATE_CHANGE_DOCUMENTS){
				toReplace = this.Event.Rate_Change.name
			}

			if(this.Event.event_type.slug === Enums.EVENT_TYPES.LEAD.NEW_WEB_RESERVATION || this.Event.event_type.slug === Enums.EVENT_TYPES.LEAD.NEW_WEB_LEAD) {
				toReplace = 'Application: Web'
				
				if (!!this.Event.Created && !!this.Event.Created.Role) {
					toReplace = this.Event.Created.Role.name;
				}
			}

			var text = this.Event.event_type.text;
			if(text && text.includes("[8]")){
				this.Event.event_type.text = text.replace("[8]", toReplace && toReplace > 1 ? toReplace : '').replace(/\s+/g, ' ');
			}

			if(text && text.includes("[N]")){
				this.Event.event_type.text = text.replace("[N]", toReplace).replace(/\s+/g, ' ');
			}
		}
	}

	formatMessage(connection){
		return this.verifyId().then(() => {
			switch(this.activity_object_id){
				case 52:
					// Interaction - link to contacts/contact_id/interactions
					var activity = this.ActivityObject.Object;
					this.regarding = "An " + this.ActivityObject.name + ' with ' + activity.Object.first + ' ' + activity.Object.last;
					this.link_to_resource = "/contacts?id=" + Hashes.encode(activity.Object.id, connection.cid) + '&v=interactions';
				break;
				case 34:
					// Maintenance Request - link to contacts/contact_id/interactions
			
					this.regarding = "An update to a maintenance request for unit #" + this.ActivityObject.Object.Address.number + " at " + this.ActivityObject.Object.Address.address + ", " + this.ActivityObject.Object.Address.city + " " + this.ActivityObject.Object.Address.state + " " + this.ActivityObject.Object.Address.zip;
					this.link_to_resource = "/maintenance-requests?id=" + Hashes.encode(this.ActivityObject.Object.maintenance_id, connection.cid) + "&submessage=" + Hashes.encode(this.ActivityObject.Object.id, connection.cid);
				break;
			}

			return true;

		})

	}


}
module.exports = Todo;

var Event  = require('./event.js');const { User } = require('../models/index.js');

