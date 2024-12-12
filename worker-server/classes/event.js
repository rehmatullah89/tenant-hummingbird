"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Enums = require(__dirname + '/../modules/enums.js');


var rp = require('request-promise');
const enums = require('../modules/enums.js');

class Event {

	constructor(data = {}) {

		this.id = data.id;
		this.company_id = data.company_id;
		this.created_by = data.created_by;
		this.created_at = data.created_at;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.title =   data.title;
		this.details =  data.details;
		this.duration = data.duration;
		this.is_all_day = data.is_all_day;
		this.upload_id = data.upload_id;
		this.type = data.type;
		
		this.event_type_id = data.event_type_id;
		this.event_type = data.event_type || {};
	}

	validate(){
		return Promise.resolve();
	}

	verifyId(){
		return Promise.resolve().then(() => {
			if(!this.id) e.th(400, "Missing ID");
			return true;
		})
	}

  	verifyAccess(company_id){
			if(this.company_id !== company_id) e.th(403, "YOu do not have access to this event");
	}

	async find(connection){
		await this.verifyId();
		var event = await models.Event.findById(connection, this.id);

		if(!event) e.th(404);

		this.company_id = event.company_id;
		this.created_by = event.created_by;
		this.created_at = event.created_at;
		this.start_date = event.start_date;
		this.end_date = event.end_date;
		this.title =   event.title;
		this.details =  event.details;
		this.duration = event.duration;
		this.is_all_day = event.is_all_day;
		this.group_id = event.group_id;
		this.upload_id = event.upload_id;
		this.event_type_id = event.event_type_id;
	}


	async findObject(connection){
		let res = await models.Event.findEventObject(connection, this.id);

		switch (res.object_type) {
			case Enums.TASK_TYPE.LEASE:
				this.Lease = new Lease({id: res.object_id});
				await this.Lease.find(connection);
				await this.Lease.findUnit(connection);
				await this.Lease.getTenants(connection);
				
				for (let i = 0; i < this.Lease.Tenants.length; i++) {
					await this.Lease.Tenants[i].Contact.getRelationships(connection);
				}
				break;
			case Enums.TASK_TYPE.CONTACT:
				this.Contact = new Contact({id: res.object_id});
				await this.Contact.find(connection, this.company_id);
                await this.Contact.getPhones(connection);
                await this.Contact.getLocations(connection);
				break;
			case Enums.TASK_TYPE.RATE_CHANGE:
				this.Rate_Change = new Rate_Change({id : res.object_id});
            	await this.Rate_Change.findById(connection);
				break;
		}
		

	}

  async findGroupTodoCount(connection){
    let todo_count = await models.Event.findGroupTodoCount(connection, this.group_id);

    return todo_count[0].count;

  }
  async findEventUploadCount(connection){
    let todo_count = await models.Event.findEventUploadCount(connection, this.group_id);
    return todo_count[0].count;

  }

	async create(connection, type, data, user_id, company){

		this.company_id = company.id;
		this.created_by = user_id;
		this.start_date = moment.utc(data.start_date).format('YYYY-MM-DD HH:mm:ss');
		this.end_date = data.end_date ?  moment.utc(data.end_date).format('YYYY-MM-DD HH:mm:ss') : this.start_date;
		this.title = data.title || type;
		this.details = data.details;
		this.duration = data.duration || 0;
		this.is_all_day = data.is_all_day || 0;
		this.type = type;
		this.group_id = data.group_id;
		this.upload_id = data.upload_id;
		this.event_type_id = data.event_type_id;

		await this.save(connection);
		//await this.setTrigger(company)

	}

	save(connection){

		return this.validate().then(() => {

			var save = {
				company_id: this.company_id,
				created_by: this.created_by,
				created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
				start_date: this.start_date,
				end_date: this.end_date,
				title: this.title,
				details: this.details,
				duration: this.duration || 0,
				is_all_day: this.is_all_day || 0,
        		upload_id: this.upload_id,
        		group_id: this.group_id,
				type: this.type || 'todo',
				event_type_id: this.event_type_id
			};
			return models.Event.save(connection, save, this.id)


		})
		.then(id => {
			this.id = id;
			return true;
		})
	}

  async saveEventObject(connection, object_id, object_type){
    var save = {
	  object_id,
	  object_type,
      event_id: this.id
    };
    return models.Event.saveEventObject(connection, save)
  }


  async saveLeaseEvent(connection, lease_id){
    var save = {
      lease_id: lease_id,
      event_id: this.id
    };
    console.log("Save", save)
    return models.Event.saveLeaseEvent(connection, save)
  }

  async saveContactEvent(connection, contact_id){
    var save = {
      contact_id: contact_id,
      event_id: this.id
    };
    console.log("Save", save)
    return models.Event.saveContactEvent(connection, save)
  }

  // setTrigger(company){
  //
	// 	return new Promise((resolve, reject) => {
	// 		var jobParams = [];
	// 		jobParams.push({
	// 			category: 'new_event',
	// 			data: {
	// 				id: this.id,
	// 				action: 'register',
	// 				domain: company.subdomain
	// 			}
	// 		});
  //
	// 		Scheduler.addJobs(jobParams, function(err){
	// 			if(err) return reject();
	// 			return resolve();
	// 		});
	// 	})
	// }

	ping(){
		// TODO Test this works...
		if(settings.is_prod){
			return rp("https://api/v1/todos/ping/" + this.company_id);
		} else {
			return rp("http://api/v1/todos/ping/" + this.company_id);
		}

	}

  static async findEventsByCompanyId(connection, conditions, searchParams) {
	  searchParams = {
	    limit: 15,
      offset: 0
    }
	  return await models.Event.findEventsByCompanyId(connection, conditions, searchParams);
  }

  static async findEventsByType(connection, company_id, type, date){
    return await models.Event.findEventsByType(connection, company_id, type, date);

  }

  static async findEventsByGroupId(connection, company_id, group_id){
    return await models.Event.findEventsByGroupId(connection, company_id, group_id);

  }

  static async findEventsByIds(connection, company_id, event_ids){
    return await models.Event.findEventsByIds(connection, company_id, event_ids);

  }


  static async findEventTypes(connection, type){
    return await models.Event.findEventTypes(connection, type);

  }

  async findEventType(connection, event_type_name) {
	
	let event_type = !event_type_name? await models.Event.findEventType(connection, this.event_type_id):  await models.Event.findEventType(connection, null, event_type_name);
	
	if(event_type) {
		this.event_type = event_type;
		this.event_type_id = event_type.id;
	}
  }

  async setEventEndDate(connection, params) {
	if(this.event_type){

		if(Enums.EVENT_TYPES_COLLECTION.RESERVATION.includes(this.event_type.slug)){
			if(params.lease_id){
				var reservation = await models.Reservation.findByLeaseId(connection, params.lease_id);
				this.end_date = reservation && moment(reservation.expires).format('YYYY-MM-DD HH:mm:ss');
			}
		}

		if(this.event_type.expiration_days){
			var evntTypeExp = moment(this.start_date).add(this.event_type.expiration_days , 'days');
			this.end_date = !this.end_date || moment(this.end_date) > evntTypeExp ? evntTypeExp.format('YYYY-MM-DD HH:mm:ss') : this.end_date;
		}		
	 }
  }

  static async saveEventType(connection, data){
    return await models.Event.saveEventType(connection, data);

  }

}
module.exports = Event;


var Lease = require(__dirname + '/../classes/lease.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Rate_Change = require(__dirname + '/../classes/rate_change.js')


