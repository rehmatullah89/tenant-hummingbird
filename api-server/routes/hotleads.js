var express = require('express');
var router = express.Router();
var moment      = require('moment');
var rp = require('request-promise');
var settings    = require(__dirname + '/../config/settings.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var control  = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');


var models  = require(__dirname + '/../models');
var validator = require('validator');
var prettyjson = require('prettyjson');
var Promise = require('bluebird');

var Lease = require(__dirname + '/../classes/lease.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Note = require(__dirname + '/../classes/note.js');
var Lead = require(__dirname + '/../classes/lead.js');
var Property = require(__dirname + '/../classes/property.js');
var Report = require(__dirname + '/../classes/report.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Category = require(__dirname + '/../classes/category.js');
var Notification = require(__dirname + '/../classes/notification.js');
var Touchpoint = require(__dirname + '/../classes/touchpoints.js');
var Todo = require(__dirname + '/../classes/todo.js');
var ENUMS = require(__dirname + '/../modules/enums.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var db = require(__dirname + '/../modules/db_handler.js');


var Joi      = require('joi');
var Activity = require(__dirname + '/../classes/activity.js');

var e  = require(__dirname + '/../modules/error_handler.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});

var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app) {
	router.post('/',  [control.hasAccess(['admin', 'api']), control.hasPermission('create_leads'), Hash.unHash], async(req, res, next) =>  {

		var connection = res.locals.connection;

		try{

			let api = res.locals.api;
			let user = res.locals.contact
			let company = res.locals.active;
			let body = req.body;
			let params = req.params;

			let contact = {};
			let property = {};
			let category = {};
			let unit = {};
			let basicInfo = false;

			let c = req.body.contacts[0];
			if(!c) e.th(400, "Contact info missing")
			console.log(`Tenant info first name: ${c.first} and last name: ${c.last}`)
			if(!c.first || !c.last) e.th(400, "First and last name are required");
			if(!c.email && (!c.Phones || !c.Phones.length && c.Phones.find(p => !p.phone))) e.th(400, "Either an email address or phone number is required")

			if (c.id) {
				contact = new Contact({id: c.id});
				basicInfo = true;

			} else {
				contact = new Contact({company_id: company.id});
				existing_contacts = await Contact.findMatchedContact(connection, company.id, c.email, c.Phones && c.Phones.length ? c.Phones[0].phone : null); // update to return most relevant first.  Dont know the criteria

				if(existing_contacts.length && !body.createNewContact){
					contact = new Contact({id: existing_contacts[0].id});
				}
			}

			if(contact.id){
				console.log("Contact with ID")
				await contact.find(connection);
				await contact.verifyAccess(company.id);
				await contact.getLeases(connection);

				if (basicInfo){
					await contact.updateBasic(connection, c);
				} else {
					if (contact.Leases.length){  //if there is an existing leases, just add to it, otherwise, replace the infomration
						await contact.updateIfNew(connection, c);
					} else {
						await contact.update(connection, c);
					}
				}


			} else {
				await contact.update(connection, c);
			}

			if(body.property_id) {
				property = new Property({id: body.property_id});
				await property.find(connection);
				await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: user? user.id : null, permissions: ['create_leads'], api});

			} else {
				e.th(400, "Property reference required.");
			}


			if(body.unit_id) {
				unit = new Unit({id: body.unit_id});
				await unit.find(connection);
				await unit.verifyAccess(connection, company.id, res.locals.properties);
				if(unit.property_id !== property.id) e.th(409, "Unit does not blong to this property");
				await unit.setSpaceMixId(connection);
			}

			if(body.category_id) {
				category = new Category({id: body.category_id});
				await category.find(connection);
				await category.verifyAccess(company.id);
			}



			await connection.beginTransactionAsync();
			await contact.save(connection);


			/// SAVE LEAD ATTRIBUTION - Should save source
			let lead_source = null;
			if (body.tracking && body.tracking.touchpoints && body.tracking.touchpoints.length) {
				await contact.saveTouchpoints(connection, body.tracking.touchpoints, 'lead');
				res.fns.addStep('saveTouchpoints');
			}

			// TODO find active lead, and if none, add new lead.
			// Make a new lead if there isnt an active lead
			let lead = new Lead({
				contact_id: contact.id
			});
			body.touchpoint_id = contact.Touchpoints.length ?  contact.Touchpoints[0].id: null;

			if(!body.source && api && api.id){
				body.source = api.name;
			}

			if(!body.source && user.roles.includes('application')){
				body.source = user.first + ' ' + user.last;
			}

			if (!body.source && contact.Touchpoints.length) {
				body.source = contact.Touchpoints[0].platform_source
			}
			await lead.update(connection, body, user ? user.id : null);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					lead_id: Hashes.encode(lead.id, res.locals.company_id),
					contact_id: Hashes.encode(lead.contact_id, res.locals.company_id)
				}
			});

			var events = ['lead_created'];
			let newLead = true;
			events.map(e => {
				eventEmitter.emit(e, {
					cid: res.locals.company_id,
					property,
					lead,
					user,
					api,
					company,
					contact,
					'contact_id': contact.id,
					'status': 'Active Lead',
					locals: res.locals,
					unit,
					newLead,
					lead_type: body.lead_type
				});
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	return router;

}