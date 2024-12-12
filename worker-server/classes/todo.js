"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class Todo {
	constructor(data) {

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
		this.regarding = '';
		this.link_to_resource = '';
		this.Event ={};
		this.Contact ={} ;
		this.ActivityObject ={};
		this.Object = {};

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
				completed: this.completed || 0
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

	find(connection){
		return this.verifyId()
			.then(() => models.Todo.findById(connection, this.id))

			.then(data => {
				if(!data) e.th(404);
				this.id = data.id;
				this.original_date = data.date;
				this.created_by = data.created_by;
				this.contact_id = data.contact_id;
				this.activity_object_id = data.activity_object_id;
				this.object_id =   data.object_id;
				this.event_id =  data.event_id;
				this.details =  data.details;
				this.snoozed_count = data.snoozed_count;
				this.completed = data.completed;
				return true;
			})
	}

	static async dismissTasks(connection, object_id, event_types, task_type){
		let todos = [];

		todos = await models.Todo.findTasksByObjectId(connection, object_id, event_types, task_type);


		for(let i=0; i < todos.length; i++){
			let todo = new Todo({ id: todos[i].id });
			//todo.verifyAccess(user.id);
			await todo.dismiss(connection);
		}

		return true;
	}

	verifyAccess(contact_id){

		return this.verifyId().then(() => {
			if(this.created_by != contact_id && this.contact_id != contact_id){
				e.th(403, "Not Authorized");
			}
			return true
		})

	}

	dismiss(connection){
		return this.verifyId()
			.then(() => models.Todo.save(connection, {completed: 1, completed_at: moment().format('YYYY-MM-DD HH:mm:ss')}, this.id))
			// .then(() => models.Event.save(connection, {end_date: moment().format('YYYY-MM-DD HH:mm:ss')}, this.event_id))


	}

	snooze(connection, until){
		return this.verifyId()
			.then(() => models.Todo.save(connection, {snoozed_count: this.snoozed_count + 1}, this.id))
			.then(() => models.Event.save(connection, {
				start_date: moment(until).format('YYYY-MM-DD HH:mm:ss'),
				end_date: moment(until).format('YYYY-MM-DD HH:mm:ss'),
			}, this.event_id))


	}

	formatMessage(){
		return this.verifyId().then(() => {
			switch(this.activity_object_id){
				case 52:
					// Interaction - link to contacts/contact_id/interactions
					var activity = this.ActivityObject.Object;
					this.regarding = "An " + this.ActivityObject.name + ' with ' + activity.Object.first + ' ' + activity.Object.last;
					this.link_to_resource = "/contacts?id=" + Hashes.encode(activity.Object.id) + '&v=interactions';
				break;
				case 34:
					// Maintenance Request - link to contacts/contact_id/interactions
					console.log("object", this.ActivityObject.Object);
					this.regarding = "An update to a maintenance request for unit #" + this.ActivityObject.Object.Address.number + " at " + this.ActivityObject.Object.Address.address + ", " + this.ActivityObject.Object.Address.city + " " + this.ActivityObject.Object.Address.state + " " + this.ActivityObject.Object.Address.zip;
					this.link_to_resource = "/maintenance-requests?id=" + Hashes.encode(this.ActivityObject.Object.maintenance_id) + "&submessage=" + Hashes.encode(this.ActivityObject.Object.id);
				break;
			}

			return true;

		})

	}

	static async dismissExpiredReservationsToDos(connection, property_id){
		return await models.Todo.dismissExpiredReservationsToDos(connection, property_id);
	}
}
module.exports = Todo;

var Event  = require('./event.js');