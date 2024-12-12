var express = require('express');
var router = express.Router();
var moment = require('moment');
var settings = require(__dirname + '/../config/settings.js');
var control = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Enums = require(__dirname + '/../modules/enums.js');
var Hashes = Hash.init();
var validator = require('validator');
var models = require(__dirname + '/../models');
var Promise = require('bluebird');
var { sendSMS } = require('./../modules/sms');
var { getGDSPropertyMappingId } = require('../modules/messagebus_subscriptions');
var Socket = require('./../classes/sockets');

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var utils = require(__dirname + '/../modules/utils.js');
var getContactDetails = require(__dirname + '/../modules/contact_details.js');

var Schema = require(__dirname + '/../validation/contacts.js');
var Contact = require(__dirname + '/../classes/contact');
var DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
var Todo = require(__dirname + '/../classes/todo.js');

var db = require(__dirname + '/../modules/db_handler.js'); 

var Joi = require('joi');
var Company = require(__dirname + '/../classes/company.js')

const joiValidator = require('express-joi-validation')({
	passError: true
});
var Email 	= require('../classes/email');
var Sms = require('../classes/sms');
var Unit = require('../classes/unit')
var e = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');


var crypto      = require('crypto');

module.exports = function (app) {
 
	router.get('/', [control.hasAccess(['api', 'admin']), Hash.unHash], async (req, res, next) => {
		try {
  			var connection = res.locals.connection;
			let api = res.locals.api;
			let company = res.locals.active;
			let properties = res.locals.properties;
			let params = req.query;

			let result = await Contact.findContactsByLead(connection, company.id, params, properties, api);

			utils.send_response(res, {
				status: 200,
				data: {
					results: Hash.obscure(result.contact_list,req),
					result_count: result.count
				}
			});
		} catch (err) {
			next(err);
		}
	});

	//Checks for an existing tenant
	router.get('/check', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
	  try {
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
			var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let query = req.query;
			
			let contacts = await Contact.checkForExisting(connection, query, company.id);
      		contacts = contacts.filter(c => c.company_id);
			if (contacts.length) {
				for (let i = 0; i < contacts.length; i++) {
					let contact = new Contact({ id: contacts[i].id });
					await contact.find(connection);
					await contact.verifyAccess(company.id);
					await contact.getLocations(connection);
					await contact.getPhones(connection);
					await contact.getLeases(connection)

					let lead = await models.Lead.getLeadByContactId(connection, contact.id);
					if(lead) {
						contact.lead_id = lead.id
					} else {
						contact.lead_id = null
					}
					contacts[i] = contact;
				}
			}

			utils.send_response(res, {
				status: 200,
				data: {
					contacts: Hash.obscure(contacts, req)
				}
			});


		} catch (err) {
			next(err);
		}

	});

	/* Current searches on name, email, and phone number. */

	router.post('/omni-search', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
			var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let body = req.body;
			var properties = [];

			body.limit = body.limit || 20;
			body.offset = body.offset || 0;
			body.search = body.search || '';
			body.roles_id = body.roles_id || [];

			if(body.roles_id.length){
				let adminContact = new Contact({id: user.id});
				await adminContact.getPropertiesByRoles(connection, company.id);
				
				const filteredRoles = adminContact.RolesProperties.filter(role => body.roles_id.includes(role.role_id));
				const filteredRolesProperties = filteredRoles.flatMap(role => role.Properties);
				properties = filteredRolesProperties.filter(propertyId => res.locals.properties.includes(propertyId));
			}else{
				properties = res.locals.properties;
			}

			let contacts = await models.Contact.omniSearch(connection, body, company.id, properties);
			let contactCount = await models.Contact.omniSearchCount(connection, body, company.id, properties);

			if (contacts.length) {
				for (let i = 0; i < contacts.length; i++) {
					let contact = new Contact({ id: contacts[i].contact_id });
					await contact.find(connection);
					await contact.verifyAccess(company.id);
					await contact.getPhones(connection);
					// await contact.getLocations(connection);
					if(contacts[i].lease_id){
					  let lease = new Lease({id: contacts[i].lease_id});
					  await lease.find(connection);
					  await lease.findUnit(connection);
					  await lease.getCurrentBalance(connection);
					  await lease.getStanding(connection);

					  contact.Lease = lease;

          } else {

					}
					contacts[i] = contact;

				}
			}

			utils.send_response(res, {
				status: 200,
				data: {
					results: Hash.obscure(contacts, req),
					result_count: contactCount,
					t: body.t
				}
			});


		} catch (err) {
			next(err);
		}



	});

	router.get('/interactors', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
			
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
			var connection = res.locals.connection;

			let user = res.locals.contact;
			let company = res.locals.active;
			let properties = res.locals.properties;
			console.log("PROPERTIES:", properties);
			let gps_selection = res.locals.gps_selection;
            if(gps_selection?.length) 
                properties = gps_selection;
			console.log("GPS:", properties);
			let query = req.query;
			if(query.type ==='latest') delete query.type
			let unreadcontacts = []
            if (query.offset === '0') {
				console.log("Called unread", typeof query.offset);
			  unreadcontacts = await Contact.getMessageList(connection, company.id, properties, 0, query);
			}
			  let readcontacts = await Contact.getMessageList(connection, company.id, properties, 1, query);
			  unreadcontacts = unreadcontacts?.length >= 1 ? unreadcontacts:[[]];
			  let contacts = [...unreadcontacts[0], ...readcontacts[0]] //(unreadcontacts || []).concat(readcontacts);
			
			for(let i = 0; i < contacts.length; i++){
				contacts[i].status = await models.Contact.getStatus(connection, contacts[i].id, properties);
				let property = await models.Property.findByGdsID(connection, contacts[i].last_interaction_phone_call_property_name) || {};
				contacts[i].last_interaction_phone_call_property_name = property?.name;
			}

			utils.send_response(res, {
				status: 200,
				data: {
					contacts: Hash.obscure(contacts, req)
				}
			});

		} catch (err) {
			next(err);
		}
	});

	router.get('/unread-interactors', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
			res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
			var connection = res.locals.connection;
			let company = res.locals.active;
			let properties = res.locals.properties;
			console.log("PROPERTIES:", properties);
			let gps_selection = res.locals.gps_selection;
            if(gps_selection?.length) 
                properties = gps_selection;
			console.log("GPS:", properties);
			let unreadCount = await Contact.getUnreadMessages(connection, company.id, properties);
			
			utils.send_response(res, {
				status: 200,
				data: {
					unreadCount: Hash.obscure(unreadCount.unread_count, req)
				}
			});

		} catch (err) {
			next(err);
		}
	});

	router.get('/:contact_id/interaction-details', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  	var connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;
			let contact = new Contact({id: params.contact_id});
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let interactor = await Interaction.interactorDetails(connection, params.contact_id);

			utils.send_response(res, {
				status: 200,
				data: {
					interactor: Hash.obscure(interactor, req)
				}
			});

		} catch (err) {
			next(err);
		}
	});

  	router.post('/:contact_id/pinned-interactions',  [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {
    try{

	    var connection = res.locals.connection;
		let params = req.params;
		let body = req.body;
		let company = res.locals.active;

    //   if(body.Contact.id !== params.contact_id){
    //     e.th(403);
    //   }
      let contact = new Contact({id: params.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      
      await contact.pinInteraction(connection, body.id);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

    } catch(err) {
      next(err);
    }



  });

  	router.post('/:contact_id/pinned-interactions/:interaction_id',  [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {
    try{
	    var connection = res.locals.connection;
      let params = req.params;
      let company = res.locals.active;

      let contact = new Contact({id: params.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      await contact.unpinInteraction(connection, params.interaction_id);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

    } catch(err) {
      next(err);
    }



  });

  	router.get('/parse-pay-now-token/:token', [Hash.unHash],  async (req, res, next) => {

    try{
      let params = req.params;
      // let query = req.query;
      // let company = res.locals.active;
      let decrypted = {};
      try{
        var decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
        decrypted = JSON.parse(decipher.update(params.token, 'hex', 'utf8') + decipher.final('utf8'));
        console.log("decrypted", decrypted);
        var sent = moment(decrypted.requested);
        var ms = moment().diff(moment(sent));
        if( ms > 1000 * 2 * 60 * 60 * 24 * 2) e.th(400,  'You followed an invalid or expired link. Please ask an adminstrator to resend the email to you.');
      } catch(err){
        e.th(400,  'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
      }

      utils.send_response(res, {
        status: 200,
        data: {
          contact_id: decrypted.contact_id,
          property_id: decrypted.property_id,
        }
      });

    }
    catch(err) {
      next(err);
    }

  });

	router.get('/:contact_id/contact-interactions', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let properties = res.locals.properties;
			let query = req.query;
			let params = req.params;
			console.log("PROPERTIES:", properties);
			let gps_selection = res.locals.gps_selection;
            if(gps_selection?.length) 
                properties = gps_selection;
			console.log("GPS:", properties);
			let searchParams = {};
			let delivery_method = new DeliveryMethod();
			switch (query.method) {
				case 'email':
					await delivery_method.findByGdsKey(connection, 'standard_email');
					break;
				case 'sms':
					await delivery_method.findByGdsKey(connection, 'standard_sms');
					break;
				case 'phone_call':
					await delivery_method.findByGdsKey(connection, 'phone_call');
					break;
				case 'phone':
					query.context = 'phone_call';
				case 'note':
					break;
				default:
			}
				
			let conditions = {
				context: query.context,
				delivery_methods_id: delivery_method.id,
				method: query.method
			};
			searchParams.limit = query.limit;
			searchParams.offset = query.offset;
			searchParams.filter = query?.filter;
			searchParams.space_number = query?.space_number;
			
			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);
			
			if (query.method === 'note') {
				await contact.getNotes(connection, company.id, searchParams)
			} else if (delivery_method.id) {
				await contact.getInteractions(connection, company.id, properties, conditions, searchParams);
			} else {
				await contact.getInteractions(connection, company.id, properties, conditions, searchParams);
if (searchParams.space_number === 'Tenant' || !searchParams.space_number) {
				await contact.getNotes(connection, company.id, searchParams)
			}
}

			let contactInteractions = contact.Interactions.concat(contact.Notes);
			//let sortedInteractions = contactInteractions.sort((a, b) => new Date(b.created) - new Date(a.created));
			utils.send_response(res, {
				status: 200,
				data: {
					Interactions: Hash.obscure(contactInteractions, req)
				}
			});
		} catch (err) {
			next(err);
		}


	});

	router.get('/:contact_id/notes', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  	var connection = res.locals.connection;
			let company = res.locals.active;
			let query = req.query;
			let params = req.params;

			let searchParams = {};
			searchParams.limit = query.limit;
			searchParams.offset = query.offset;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			await contact.getNotes(connection, company.id, searchParams);
			
			utils.send_response(res, {
				status: 200,
				data: {
					Notes: Hash.obscure(contact.Notes, req)
				}
			});
		} catch (err) {
			next(err);
		}


	});

	router.post('/:contact_id/notes', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  	var connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;
			let body = req.body;
			let user = res.locals.contact;
			let noteCategories;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let data = {
				contact_id: contact.id,
				content: body.content,
				last_modified_by: user.id,
				pinned: req.body.pinned,
				notes_category_id:req?.body?.notes_category_id

			}
			// Note category filter
			noteCategories = await Note.getNotesCatagories(connection); // get all notes categories
			if(req?.body?.notes_category_id){ // if category id is send in body
				if(!noteCategories.some(category=> category.id === req?.body?.notes_category_id)){ // check if valid category id
					console.log('unknown category id given');
					data.notes_category_id = noteCategories.filter(category=> category.notes_category==='Miscellaneous')[0].id // assign default if note valid id
				}
			}else{
				data.notes_category_id = noteCategories.filter(category=> category.notes_category==='Miscellaneous')[0].id // assign default if id not present
			}
			
			await contact.saveNote(connection, data);
			
			utils.send_response(res, {
				status: 200,
				data: {
					Interactions: Hash.obscure(contact.Notes, req)
				}
			});
		} catch (err) {
			next(err);
		}


	});

	router.get('/:contact_id', [control.hasAccess(['api', 'admin', 'tenant']), Hash.unHash], async (req, res, next) => {
		try {

			var connection = res.locals.connection;
			const company = res.locals.active;
			let params = req.params;
			//* get contact details
			const contact = await getContactDetails(connection, res.locals.api, company.id, params.contact_id, res.locals.properties)

			console.log('Params ContactId ', params.contact_id);

			//add catches and pin for Derrels
			if(contact.Leases.length > 0){
				await Promise.all(
				contact.Leases.map(async (lease) => {
					let accessControl = new AccessControl({
						property_id: lease.Unit.property_id,
						...connection.meta
					});
					try {
						console.log('Fetching access control');
						await accessControl.fetch(connection, {id: company.id})
						
						console.log('Getting space');
						let spaceLevel = await accessControl.getSpace(lease.Unit.property_id, lease.unit_id);
						if(spaceLevel){
							lease.Unit.soft_catch = spaceLevel.soft_catch;
							lease.Unit.late_catch = spaceLevel.late_catch;
							lease.Unit.hard_catch = spaceLevel.hard_catch;
							lease.Unit.pin = spaceLevel.pin;
						}
						  
					  
					} catch(err) {
						console.log(err);
					}
					return lease;
				})
				)
			}

			if(contact.Pending.length > 0){
				await Promise.all(
				contact.Pending.map(async (pending) => {
					let accessControl = new AccessControl({
						property_id: pending.Unit.property_id,
						...connection.meta
					});
					try {
						await accessControl.fetch(connection, {id: company.id})
						let spaceLevel = await accessControl.getSpace(pending.Unit.property_id, pending.unit_id);
						if(spaceLevel){
							pending.Unit.soft_catch = spaceLevel.soft_catch;
							pending.Unit.late_catch = spaceLevel.late_catch;
							pending.Unit.hard_catch = spaceLevel.hard_catch;
							pending.Unit.pin = spaceLevel.pin;
						}
						  
					  
					} catch(err) {
						console.log(err);
					}
					return pending;
				})
				)
			}
			
			utils.send_response(res, {
				status: 200,
				data: {
					contact: Hash.obscure(contact, req)
				}
			});
	
		} catch (err) {
			next(err);
		}
	
	});

	router.get('/:contact_id/lead', [control.hasAccess(['tenant', 'admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);

			let lead = new Lead({ contact_id: contact.id });
			
			try {
				await lead.find(connection)
			} catch (err) {
				if (err.code !== 404) throw err;
			}

			utils.send_response(res, {
				status: 200,
				data: {
					lead: Hash.obscure(lead, req)
				}
			});


		} catch (err) {
			next(err);
		}
	});

	// Gets inquiries, reservations, and pending leases all at once. 
	router.get('/:contact_id/leads', [control.hasAccess(['tenant', 'admin']), Hash.unHash], async (req, res, next) => {

		try {
			var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;
			const properties = res.locals.properties;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);

			await contact.getLeads(connection, properties); 

			utils.send_response(res, {
				status: 200,
				data: {
					leads: Hash.obscure(contact.Leads, req)
				}
			});


		} catch (err) {
			next(err);
		}




	});

	router.get('/:contact_id/applications', [control.hasAccess(['tenant', 'admin']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      await contact.verifyAccess(company.id);
			await contact.getApplications(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					applications: Hash.obscure(contact.Applications, req)
				}
			});


		} catch (err) {
			next(err);
		}



	});

	// Properties of the leased units of contact in past, present or future
	router.get('/:contact_id/leased-properties', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

		try {
		  var connection = res.locals.connection;
			const company = res.locals.active;
			const params = req.params;
			const properties = res.locals.properties;

			const { contact_id } = params;
			if(!contact_id) e.th(400, 'Contact id required');

			const contact = new Contact({ id: contact_id })
			await contact.find(connection);
			await contact.getLeases(connection, company.id, properties);
			const leasedUnitsProperties = await contact.getLeasedProperties(connection, company.id, properties);

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(leasedUnitsProperties, req)
			});


		} catch(err) {
			next(err);
		}


	})

	router.get('/:contact_id/leases', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;
			let query = req.query;

			let properties = res.locals.properties;

			if(query.property_id) {
        		if(properties.length && properties.indexOf(query.property_id) < 0) {
          			e.th(403);
        		}
        		properties = [query.property_id];
      		}


			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);
      		// await contact.getLeases(connection, company.id, properties, query);
					await contact.getAllContactLeases(connection, company.id, properties, query);


			for (let i = 0; i < contact.Leases.length; i++) {
				await contact.Leases[i].findAutoPaymentMethods(connection);
				await contact.Leases[i].getNextBillingDate();
				await contact.Leases[i].getCurrentBalance(connection);
				await contact.Leases[i].getProperty(connection, company.id, properties);
				await contact.Leases[i].getActivePaymentCycle(connection);
				await contact.Leases[i].getPaymentCycleOptions(connection);
				try {
					contact.Leases[i].Services = await contact.Leases[i].getCurrentServices(connection, company.id, moment(), moment().add(1, 'month'))
				} catch(err) {
					contact.Leases[i].Services = []
				}


			}

			let data = {
				contact: contact,
				leases: contact.Leases
			};

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure(data, req)
			});


		} catch (err) {
			next(err);
		}


	});

  	router.get('/:contact_id/payment-methods', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    try {
	    var connection = res.locals.connection;
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;
      let properties = [];


      if(!query.property_id){
        properties = res.locals.properties;
      } else {
        if(res.locals.properties.length && res.locals.properties.indexOf(query.property_id) < 0) {
          e.th(403);
        }
        properties = [query.property_id];
      }

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);
	    await contact.getPaymentMethods(connection, query.property_id, properties);

	    let PaymentMethods = [];

	    for(let i=0; i < contact.PaymentMethods.length; i++) {
	      let pm = new PaymentMethod(contact.PaymentMethods[i]);
	      await pm.getAddress(connection);
        PaymentMethods.push(pm);
	  }

      let data = {
        payment_methods: PaymentMethods
      };

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(data, req)
      });


    } catch (err) {
      next(err);
    }



  });

  	router.get('/:contact_id/credits', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try {
	    var connection = res.locals.connection;
      let loggedInUser = res.locals.contact;

      let company = res.locals.active;
      let params = req.params;
      let query = req.query;

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      await contact.getCredits(connection, query.property_id);

      let data = {
        payments: contact.Payments
      };

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(data, req)
      });


    } catch (err) {
      next(err);
    }



  });

	router.post('/bulk-config', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


		try {

		  var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let body = req.body;
			const contact_ids = body.contact_ids.map(item => item.id)

			let contact_list = await Contact.getMultipleById(connection, contact_ids, res.locals.properties, company.id);
			let contacts = [];
			for (let i = 0; i < contact_list.length; i++) {
				let c = new Contact(contact_list[i]);
				await c.getPhones(connection);
				contacts.push(c);
			}

			utils.send_response(res, {
				status: 200,
				data: {
					contacts: Hash.obscure(contacts, req)
				}
			});


		} catch (err) {
			next(err);
		}



	});


	router.put('/:contact_id/lead/retire', [control.hasAccess(['admin']), joiValidator.body(Schema.retireLead), Hash.unHash], async (req, res, next) => {
		try {
			var connection = res.locals.connection;
			let user = res.locals.contact || {};
			let company = res.locals.active;
			let properties = res.locals.properties;
			let params = req.params;
			let body = req.body;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection, company.id);
			await contact.verifyAccess(company.id);
			await contact.getReservations(connection, properties);
			await contact.getOldReservations(connection, properties);

			if(body.opt_out){
				await contact.optOut(connection, company.id);
			}

			let lead = new Lead({ contact_id: contact.id });
			await lead.find(connection, company.id);

			await connection.beginTransactionAsync();

			await lead.retire(connection, body);

			for(let i = 0; i < contact.Reservations.length; i++){
				let reservation = contact.Reservations[i];
				if(reservation.Lease.status === 0){
					await reservation.Lease.deleteLease(connection, company.id, user.id);
				}
				await reservation.deleteReservation(connection);
				await Todo.dismissTasks(connection, reservation.Lease.id, Enums.EVENT_TYPES_COLLECTION.RESERVATION, Enums.TASK_TYPE.LEASE, user.id);
			}

			await Todo.dismissTasks(connection, params.contact_id, Enums.EVENT_TYPES_COLLECTION.LEAD, Enums.TASK_TYPE.CONTACT, user.id);
			await connection.commitAsync();


			
			//Enter Note
			let note = new Note({});
			let data = {
				content: body.notes,
				context: body.context,
				pinned: 0,
				contact_id: contact.id,
				last_modified_by: user.id
			}
			await note.update(body);
			await note.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
				lead_id: Hashes.encode(lead.id, res.locals.company_id)
				}
			});
			var events = ['lead_retired'];
			events.map(e => {
				eventEmitter.emit(e, {company, user, contact, lead, 'contact_id': contact.id,'status': 'Retired Lead', cid: res.locals.company_id, locals: res.locals});
			});

			//
			} catch (err) {
				await connection.rollbackAsync();
				next(err);
			}



 	 });

	router.put('/:contact_id/lead/:lead_id', [control.hasAccess(['tenant', 'admin', 'api']), control.hasPermission('manage_contacts'), joiValidator.body(Schema.updateLead), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact || {};
			let company = res.locals.active;
			let params = req.params;
			let body = req.body;
			console.log("body", body)
			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let lead = new Lead({ id: params.lead_id });
			try {
				await lead.find(connection, company.id)
			} catch (err) {
				if (err.code !== 404) throw err;
			}
			if (lead.contact_id != contact.id) {
				e.th(404, 'Lead not found');
			}
			await lead.update(connection, body, user ? user.id : null);

			utils.send_response(res, {
				status: 200,
				data: {
					lead_id: Hashes.encode(lead.id, res.locals.company_id)
				}
			});

			var events = ['lead_updated']
			let newLead = false;
			events.map(e => {
				eventEmitter.emit(e, {
					company,
					user,
					contact,
					lead,
					'contact_id': contact.id,
					'status': 'Active Lead',
					cid: res.locals.company_id,
					locals: res.locals,
					newLead
				});
			});


		} catch (err) {
			next(err);
		}



	});

	router.post('/:contact_id/interaction', [control.hasAccess(['admin' , 'api']), joiValidator.body(Schema.recordActivity), Hash.unHash], async (req, res, next) => {


		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let api = res.locals.api;
			let company = res.locals.active;
			let params = req.params;
			let body = req.body;
			let property_id = 0;
			let space = 'Tenant';
			let todo = {};
            if (body.property_id) {
				property_id = body.property_id;
			}
			if (body.space) {
				space = body.space;
			}
			if (body.ref_object_id && space === 'Tenant') {
				// using lease_id
				let lead = new Lead({ contact_id: params.contact_id });
				let lease = new Lease({id: body.ref_object_id});
			    await lease.find(connection);
				var p_id = 0;
				if (lease && lease.Unit) {
					p_id = lease.Unit.property_id;
					space = lease.Unit.number;
				} else {
					p_id = lead.property_id;
				}
				if (property_id === 0) {
					property_id = p_id;					
				}
			}
			if (body.unit_id  && space === 'Tenant') {
				// units unit_id
				let lead = new Lead({ contact_id: params.contact_id });
				let unit = new Unit({id: body.unit_id});
			    await unit.find(connection);
				var p_id = 0;
				if (unit && unit.property_id) {
					p_id = unit.property_id;
					space = unit.number;
				} else {
					p_id = lead.property_id;
				}				
				if (property_id === 0) {
					property_id = p_id;
				}				
			}
			
			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection, company.id);
			await contact.verifyAccess(company.id);

			await connection.beginTransactionAsync();
			//Enter Interaction
			// connection, recipient_contact_id, entered_by, time, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status) {
			let interaction = new Interaction();
			
			
			let read = 1;
			let pinned = 0;
			let deliveryMethod = new DeliveryMethod();

			switch (body.method) {
				case 'email':
					await deliveryMethod.findByGdsKey(connection, 'standard_email');
					break;
				case 'sms':
					await deliveryMethod.findByGdsKey(connection, 'standard_sms');
					break;
				case 'phone_call':
					await deliveryMethod.findByGdsKey(connection, 'phone_call');
					break;
				case 'phone':
					body.context = 'phone_call'
				case 'note':
					let note = new Note({});
					let data = {
						content: body.content,
						context: body.context,
						pinned: pinned,
						contact_id: contact.id,
						last_modified_by: user.id
					}
					await note.update(data);
					await note.save(connection);
					break;
				default:
					e.th(400, 'invalid method');
					break;
			}
			let response
			if (deliveryMethod.id) {
				if(user && (user.roles.includes('admin') || user.roles.includes('application'))){
					response = await interaction.create(connection, property_id, space, contact.id, user.id, body.content, deliveryMethod.id,    pinned, body.context, read, null, null, contact.id, null,body.gds_notificationid,body.status, body.contact_type);
				} else {
					response = await interaction.create(connection, property_id, space, contact.id,              null, body.content,    deliveryMethod.id, pinned,    body.context, read, null, null, contact.id, null,body.gds_notificationid,body.status, body.contact_type);
				}
								if(body.external_interaction){
										switch (body.method) {
						case 'email':
							let email = new Email({
								interaction_id: interaction.id,
								subject: body.subject,
								message: body.content,
								reject_reason: body.reject_reason,
								from_name: body.name,
								from_email: body.from,
								email_address:body.email
							});
						   if(body.attachments?.length){
								body.attachments.forEach(async element => {
									let upload = new Upload()
									upload.contentBase64 = element.Content ??  element.content
									upload.external_interaction = true
									let user = res.locals.contact;
									await contact.find(connection);
									  await contact.verifyAccess(company.id);
								   
									await upload.setDocumentType(connection, element.document_type_id,element.document_type || 'file', company.id);
						
									
									upload.setFile(null,null,null,element);
									upload.uploaded_by = user ? user.id : null;
									await upload.save(connection);
									//await upload.saveUploadContact(connection, user.id); // not able to find user id when interaction is outside hummingbird 
									upload.saveUploadInteraction(connection, interaction.id)
									
									    element.upload_id = upload.id
										await interaction.saveAttachments(connection, [element]);
								});
								
							}
							await email.save(connection);
							break;
						case 'sms':
							let smsMethod = new Sms({
								interaction_id: interaction.id,
								phone: body.number,
								message: body.content
							})
							await smsMethod.save(connection);
							break;
						
						default:
							e.th(400, 'invalid method');
							break;
					}
					
				}	
			}
			
			
			if(user && user.roles.includes('admin') && body.context == 'delinquencyCenter' && body.method == 'phone' && body.ref_object_id){
				// if this is a delinquency phone call remove collection call tasks
				await Todo.dismissTasks(connection, body.ref_object_id, Enums.EVENT_TYPES_COLLECTION.COLLECTION_CALL, Enums.TASK_TYPE.LEASE, user.id);
			}
            if(body.Todo){
				if (Object.keys(body.Todo).length >0) {		
					todo = new Todo();
					await todo.create(connection, body.Todo, null, null, user.id, company);
					// save contact events
					await todo.Event.saveEventObject(connection, contact.id, Enums.TASK_TYPE.CONTACT);
				}
			}
			
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {}
			});

			eventEmitter.emit('contact_activity_entered', { company, user, interaction, contact, todo, cid: res.locals.company_id , locals: res.locals});


		} catch (err) {
			await connection.rollbackAsync()
			next(err);
		}



	});

	router.get('/:contact_id/uploads', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;
			let query = req.query;
			let properties = query.property_id ? [query.property_id] : res.locals.properties;
			let uploads = [];

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);
			await contact.getLeases(connection, company.id, properties, query);

			for(let i = 0; i < contact.Leases.length; i++) {
				await contact.Leases[i].getUploads(connection, company.id);
				// INC 4074 null document types were failing document tab in tenant profile
				uploads.push(...contact.Leases[i].Uploads.filter((e) => !!e.DocumentType));
			}


			utils.send_response(res, {
				status: 200,
				data: {
					uploads: Hash.obscure(uploads, req)
				}
			})


		} catch(err) {
			next(err);
		}


	})

	router.post('/:contact_id/upload', [control.hasAccess(['admin']), control.hasPermission('manage_contacts'), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let files = req.files;
			let params = req.params;
			let body = req.body;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);

			let upload = new Upload();
			await upload.setDocumentType(connection, body.document_type_id, body.document_type || 'file', company.id);

			var file = files.file || files['file[0]'];
			upload.setFile(file, body.src);
			upload.uploaded_by = user ? user.id : null;
			await upload.save(connection);
			await upload.saveUploadContact(connection, user.id);
			
			utils.send_response(res, {
				status: 200,
				data: {
					uploads: Hash.obscure(upload, req)
				},
			})

			eventEmitter.emit('uploaded_contact_file', { company, user, contact, upload, cid: res.locals.company_id , locals: res.locals});


		} catch (err) {
			next(err);
		}



	});

	router.post('/uploads', [control.hasAccess(['admin']), control.hasPermission('manage_contacts'), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let files = req.files;
			let params = req.params;
			let body = req.body;

			

			let upload = new Upload();
			await upload.setDocumentType(connection, body.document_type_id, body.document_type || 'file', company.id);

			var file = files.file || files['file[0]'];
			upload.setFile(file, body.src);
			upload.uploaded_by = user ? user.id : null;
			await upload.save(connection);

			for (let contact = 0; contact > body.contacts.length; contact++) {
				let contact = new Contact({ id: params.contact_id });
				await contact.find(connection);
				await contact.verifyAccess(company.id);
				await upload.saveUploadContact(connection, user.id);
			}
			
			
			utils.send_response(res, {
				status: 200,
				data: {
					uploads: Hash.obscure(upload, req)
				},
			})

			// eventEmitter.emit('uploaded_contact_file', { company, user, contact, upload, cid: res.locals.company_id , locals: res.locals});


		} catch (err) {
			next(err);
		}



	});

	router.get('/:contact_id/transactions', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

	  try{

		  var connection = res.locals.connection;
			let company = res.locals.active;

			let params = req.params;
			let query = req.query;

			  query.contact_id = params.contact_id;

        let accounting = new Accounting({ company_id: company.id });
        let transactions = await accounting.getContactTransactions(connection, query);

        utils.send_response(res, {
            status: 200,
            data: {
              //transactions: transactions.ledger
              transactions: Hash.obscure(transactions, req),
            }
        });


        } catch(err) {
            next(err);
        }


    });

	// Should be interaction/search or something
  // TODO WHats the difference between this and the contact-interactions route
	router.get('/:contact_id/interactions', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;
			let query = req.query;
            let properties = res.locals.properties;
			console.log("PROPERTIES:", properties);
			let gps_selection = res.locals.gps_selection;
            if(gps_selection?.length) 
                properties = gps_selection;
			console.log("GPS:", properties);
			let searchParams = {};
			let conditions = {
				// description: req.query.description,
				content: req.query.content,
				method: req.query.method
			};
			searchParams.limit = query.limit || 20;
			searchParams.offset = query.offset || 0;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);
			await contact.getInteractions(connection, company.id, properties, conditions, searchParams);
			await contact.getInteractionsCount(connection, conditions);

			utils.send_response(res, {
				status: 200,
				data: {
					interactions: Hash.obscure(contact.Interactions, req),
					result_count: contact.InteractionsCount
				}
			});



		} catch (err) {
			next(err);
		}



	});

	router.get('/:contact_id/contacts', [control.hasAccess(['admin', 'tenant']), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let params = req.params;
			let query = req.query;

			let searchParams = {
				contact_id: params.contact_id,
				search: params.search,
				offset: params.offset || 0,
				limit: params.limit || 10
			}

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);
			let contactActivity = await models.Activity.findContactActivity(connection, searchParams);

			let activityList = [];
			for (let i = 0; i < contactActivity.length; i++) {
				let activity = new Activity({ id: contactActivity[i].id });
				await activity.assemble(connection, company.id);
				activityList.push(activity)
			}

			utils.send_response(res, {
				status: 200,
				data: {
					activity: Hash.obscure(activityList, req),
					pagination: {

					}
				}
			});



		} catch (err) {
			next(err);
		}



	});

	// get access code for a lease
	router.get('/:contact_id/lease/:lease_id/access', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {
		try {
		  	var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;
			let body = req.body;


			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.getProperty(connection);
			let creds = {};
			let spacePin = null;
			try {
				  await lease.Property.getAccessControl(connection);
				  if(req.query.unit_id){
					spacePin = await lease.Property.Access.getSpaceCode(req.query.unit_id);
				  }
				  
				  await contact.findAccessCredentials(connection, lease.Property);
				  
				if(contact.Access){
					creds = contact.Access;
					if(req.query.unit_id){
						creds.pin = spacePin;
					}
				}
			} catch(err) {
				console.log(err);
			}
			
			utils.send_response(res, {
				status: 200,
				data: {
					creds: Hash.obscure(creds, req)
				}
			});
			// TODO Emit event for this


		} catch (err) {
			next(err);
		}



	});

	// GATE ACCESS
	router.put('/:contact_id/access/:access_id', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {
		
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;
			let body = req.body;

			let properties = res.locals.properties;
			if(body.property_id && res.locals.properties.length) {
				if(res.locals.properties.indexOf(body.property_id) < 0) {
				e.th(403);
				}
				properties = [body.property_id];
      		}

			let contact = new Contact({id: params.contact_id});
			await contact.find(connection);
      		await contact.getLeases(connection, company.id, properties);

			let property = new Property({id: body.property_id});
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
			//await property.getAccessControl(connection);

			// if(!api){
			// 	if(body.status === 1 && !creds.status){
			// 		await property.Access.restoreUser(contact.id)
			// 	} else if(body.status === 0 && creds.status) {
			// 		await property.Access.suspendUser(contact.id)
			// 	}
			// }

			let unit_id = body.unit_id ? body.unit_id : null;
			if (unit_id) {
				await contact.saveAccess(connection, property, body, null, unit_id);
			} else {
				await contact.saveAccess(connection, property, body);
			}



			utils.send_response(res, {
				status: 200,
				data: {}
			});
			// TODO Emit event for this
			/*
			 var activity = new Activity();


			 if(body.status) {
			 if(api){
			 return activity.createApi(connection, company.id, api.id, 14, 35, contact.id, body.content);
			 } else {
			 return activity.create(connection, company.id, user.id, 14, 35, contact.id, body.content);
			 }
			 } else {
			 if(api){
			 return activity.createApi(connection, company.id, api.id, 15, 35, contact.id, body.content);
			 } else {
			 return activity.create(connection, company.id, user.id, 15, 35, contact.id, body.content);
			 }
			 }
			 */

		} catch (err) {
			let error = err.error;
			next({
				error : {
					data: error.data,
					msg: err.statusCode === 500 ? 'Invalid access code' : error.msg,
					status: error.status
				},
				message: err.message,
				name: err.name
			});
		}
	});

	router.delete('/:contact_id/access/:access_id/:property_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

		try {

		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;
			let contact = new Contact({id: params.contact_id});
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let property = new Property({id: params.property_id});
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			await property.getAccessControl(connection);
			await property.Access.deleteUser(contact.id);

			utils.send_response(res, {
				status: 200,
				data: {
				},
			});

			eventEmitter.emit('contact_access_deleted', { company, user, api, property, contact, cid: res.locals.company_id, locals: res.locals});


		} catch (err) {
			next(err);
		}


	});

	router.post('/:contact_id/access/', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {


		try {

			var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;
			let body = req.body;

      let properties = res.locals.properties;
      if(body.property_id && res.locals.properties.length) {
        if(res.locals.properties.indexOf(body.property_id) < 0) {
          e.th(403);
        }
        properties = [body.property_id];
      }

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection, company.id, properties);
			await contact.getLeases(connection, company.id, properties);

			let property = new Property({ id: body.property_id });
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
			let unit_id = body.unit_id ? body.unit_id : null;
			if (unit_id) {
				await contact.saveAccess(connection, property, body, null, unit_id);
			} else {
				await contact.saveAccess(connection, property, body);
			}

			utils.send_response(res, {
				status: 200,
				data: {
				},
			});

			eventEmitter.emit('contact_access_created', { company, user, api, property, contact, cid: res.locals.company_id, locals: res.locals});


		} catch (err) {
			next(err);
		}

	});
	
	router.put('/:contact_id/access/:access_id/status', [control.hasAccess(['admin']), control.hasPermission('manage_contacts'), Hash.unHash], async (req, res, next) => {
		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;
			let body = req.body;
			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection, company.id);
			await contact.verifyAccess(company.id);


			let property = new Property({id: body.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: user.id, permissions: ['manage_contacts']});

			await property.getAccessControl(connection);
			await contact.findAccessCredentials(connection, property);

			if(body.status){
				await property.Access.restoreUser(contact.id)
			} else {
				await property.Access.suspendUser(contact.id)
			}

			utils.send_response(res, {
				status: 200,
				data: {},
			});


			if (body.status) {
				eventEmitter.emit('contact_access_granted', { company, user, api, property, contact, cid: res.locals.company_id });

			} else {
				eventEmitter.emit('contact_access_suspended', { company, user, api, property, contact, cid: res.locals.company_id , locals: res.locals, locals: res.locals});
			}


		} catch (err) {
			next(err);
		}

	});

	router.get('/:contact_id/access', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {



		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let query = req.query;
			let params = req.params;
			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let properties = query.property_id ? [query.property_id] : res.locals.properties;
			let access = await contact.buildAllAccessCredentials(connection, company.id, properties) || [];
			
			utils.send_response(res, {
				status: 200,
				data: {
					access: Hash.obscure(access, req)
				}
			});


		} catch (err) {
			next(err);
		}



	});

	router.get('/:contact_id/space-access', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

		

		try {
		  var connection = res.locals.connection;
			let user = res.locals.contact;
			let company = res.locals.active;
			let api = res.locals.api;
			let query = req.query;
			let params = req.params;
			let contact = new Contact({ id: params.contact_id });
			
			//if(!query.unit_id) e.th(400, "unit_id is missing.");
			
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let properties = query.property_id ? [query.property_id] : res.locals.properties;
			let access = await contact.buildAllSpaceAccessCredentials(connection, company.id, properties, user.id) || [];
			
			utils.send_response(res, {
				status: 200,
				data: {
					access: Hash.obscure(access, req)
				}
			});


		} catch (err) {
			next(err);
		}



	});

	// CONTACT

	router.post('/bulk-send-email', [control.hasAccess(['admin']), control.hasPermission('delinquent_send_email'), Hash.unHash], async (req, res, next) => {


		try {
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let user = res.locals.contact;
			let logged_in_user = res.locals.contact; 
			let params = req.params;
			let body = req.body;

			if (!body.contacts.length) {
				e.th(400, "You are not sending this email to anyone.");
			}
			if (!body.email.length) {
				e.th(400, "You have not entered a message to send.");
			}
			if (!body.subject.length) {
				e.th(400, "You have not entered a subject.");
			}

			let upload = null
			if (body.attachments.length) {
				upload = new Upload({id: body.upload_id});
				await upload.find(connection);
				let file = await upload.download();
				body.attachments[0].content = file.Body.toString('base64');
				body.attachments[0].name = upload.filename;
        body.attachments[0].upload_id=body.upload_id;
				
			}

			const distinctContactIDs = Array.from(new Set(body.contacts.map(contact => contact.id)));
			let verified = await models.Contact.verifyBulk(connection, distinctContactIDs, company.id);

			if (!verified) e.th(403, "You do not have permission to edit this resource");
      // TODO: This should probably send the entire list of contacts to the worker server, and run the loop there in order to reduce load on the api server
			for (let i = 0; i < body.contacts.length; i++) {
				// send email
				let contact = body.contacts[i];
				
				await new Promise(async (resolve, reject) => {
					Scheduler.addJobs([{
						category: 'email_to_users',
						data: {
						  cid: res.locals.company_id,
							contact_id: contact.id,
							lease_id: contact.lease_id,
							company_id: company.id,
							sms: false,
							send_email: true,
							subject: body.subject,
							message: body.email,
							action: 'write',
							label: '',
							admin_id: user.id,
							delivery_method: 'standard_email',
							attachments: body.attachments,
							logged_in_user_id: logged_in_user.id,
							upload: upload
						}
					}], err => {
						if (err) reject(err);
						resolve()
					});
					let email = {
						subject: body.subject,
						message: body.email
					}
					 eventEmitter.emit('contact_sent_email', { company, user, contact, email, cid: res.locals.company_id , locals: res.locals});
				});
			}


			utils.send_response(res, {
				status: 200,
				data: {}
			});




		} catch (err) {
			next(err);
		}



	});

	router.post('/bulk-send-sms', [control.hasAccess(['admin']), control.hasPermission('delinquent_send_email'), Hash.unHash], async (req, res, next) => {


		try {
		  var connection = res.locals.connection;
			let company = res.locals.active;
			let user = res.locals.contact;

			let params = req.params;
			let body = req.body;

			if (!body.contacts.length) {
				e.th(400, "You are not sending this email to anyone.");
			}
			if (!body.message.length) {
				e.th(400, "You have not entered a message to send.");
			}

			let contact_ids = body.contacts.map(c => c.id);

			let verified = await models.Contact.verifyBulk(connection, contact_ids, company.id);

			if (!verified) e.th(403, "You do not have permission to edit this resource");


			// TODO: why use the worker server to send SMS if we are going to run the loop here?
			for (let i = 0; i < body.contacts.length; i++) {
				let contact = body.contacts[i];
				if (!contact.Phone || !contact.Phone.phone) continue;

				await new Promise(async (resolve, reject) => {
					Scheduler.addJobs([{
						category: 'sms_to_users',
						data: {
						  cid: res.locals.company_id,
							contact_id: contact.id,
							lease_id: contact.lease_id,
							company_id: company.id,
							phone: contact.Phone.phone,
							message: body.message,
							action: 'send',
							admin_id: user.id
						}
					}], err => {
						if (err) reject(err);
						resolve()
					});
					let email = {
						message: body.message
					}
					eventEmitter.emit('contact_sent_sms', { company, user, contact, email, cid: res.locals.company_id, locals: res.locals});
				});
			}


			utils.send_response(res, {
				status: 200,
				data: {}
			});




		} catch (err) {
			next(err);
		}



	});

	router.put('/:contact_id', [control.hasAccess(['admin', 'api', 'tenant']), control.hasPermission('manage_contacts'), joiValidator.body(Schema.createContact), Hash.unHash], async (req, res, next) => {

		let connection = res.locals.connection;
		
		try {

			let company = res.locals.active;
			let user = res.locals.contact;
			let api = res.locals.api;
			let params = req.params;
			let body = req.body;
			let { scope } = req.query
			let contact = new Contact({ id: params.contact_id});
			await contact.find(connection);
			await contact.verifyAccess(company.id);			
            
			let email = contact?.email || null;
			let updatedEmail = body?.email || null;
			//revoke email verified status when verified email is updated
			if (email != updatedEmail) await contact.revokeUserVerification(connection, email, updatedEmail)
			await contact.verifyAccess(company.id);
			await connection.beginTransactionAsync();
			await contact.update(connection, body, scope);
			await contact.save(connection, scope, body.updatedFieldName);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					contact_id: Hashes.encode(contact.id, company.id),
					military_id: contact.Military.id ? Hashes.encode(contact.Military.id, company.id) : null,
				}
			});
			eventEmitter.emit('contact_updated', {
				company,
				api,
				user,
				contact,
				cid: res.locals.company_id,
				locals: res.locals
			});
		} catch (err) {
			console.log("err:" ,err);
			await connection.rollbackAsync();
			next(err);
		}
	});

router.post('/:contact_id/send-message', [control.hasAccess(['admin' , 'api']), Hash.unHash], async (req, res, next) => {


		try {

		  	var connection = res.locals.connection;
			let company = res.locals.active;
			let logged_in_user = res.locals.contact;

			let params = req.params;
			let body = req.body;
			let contact = new Contact({ id: params.contact_id });
			// let contact = new Contact({ id: body.primary_contact_id });
			await contact.find(connection);
      		await contact.verifyAccess(company.id);

			let lead = new Lead({ contact_id: body.primary_contact_id });

			try{
				await lead.find(connection, company.id);
			} catch(err) {
				// no lead found
			}

			if(body.message ){
				let message  = await contact.parsePayNow(connection, body.message, null, company, body.send_email ? 'email' : 'sms' );
				body.message = message ||  body.message;
      }
	  	console.log("body.sms", body.sms)
			body.sms = body.sms ? body.sms.map(sms_id => Hashes.decode(sms_id)[0]) : [];

			if (!body.sms.length && (!body.send_email || body.send_email === 'false')) {
				e.th(400, "This message is not being sent to anyone");
			}

			if (!body.message || !body.message.length) {
				e.th(400, "You have not entered a message to send.");
			}
			if (!body.subject.length) {
				e.th(400, "You have not entered a subject.");
			}
			if (!body.space) {
				body.space = 'Tenant';
			}			
			let upload = null
			if (body.send_email && body.attachments && body.attachments.length) {
				upload = new Upload({id: body.upload_id});
				if(!body.src){
					await upload.find(connection);
					let file = await upload.download();
					body.attachments[0].content = file.Body.toString('base64');
					body.attachments[0].name =  upload.name				
					const parts = upload.src.split(".");
					const fileExtension = parts.length > 1 ? parts.pop().toLowerCase() : ''   
						if (fileExtension.length<5) {
						  if(!upload.name.endsWith(`.${fileExtension}`)){
							body.attachments[0].name = `${upload.name}.${fileExtension}`
						  }else{
							body.attachments[0].name = upload.name
							 }
						} else {
							body.attachments[0].name = upload.name
						}
					body.attachments[0].upload_id=body.upload_id
				}else{
					const fileUrl = req.body.src;
					try{
						let response = await upload.downloadDoc(fileUrl);
						const buffer = Buffer.from(response.data, 'binary');
						body.attachments[0].content = buffer.toString('base64');
						body.attachments[0].name = body.docName
						body.attachments[0].upload_id = body.upload_id
						delete body["docName"]
						delete body["src"]
					}catch{
						e.th(400, "Could not attach file");
					}
			        
				}
				
			}

			//Enter Interaction
			let response = {};
			if(contact.Leases.length === 0) await contact.getLeases(connection);
			var p_id = contact.Leases.length > 0? contact.Leases[0].Unit.property_id: lead.property_id;
			if(body?.property_id){
				p_id = body?.property_id
			}
			//console.log(p_id);
			var mapped_property_id = await getGDSPropertyMappingId(connection, p_id);
			let owner_id = company.gds_owner_id;
			let facility_id = mapped_property_id;

			// var eventSettings = null;
			// var socketEvent = null;
			if(!body.send_email){
				let deliveryMethod = new DeliveryMethod();
				await deliveryMethod.findByGdsKey(connection, 'standard_sms');
				let sendSMSPayload = {
					property_id: p_id,
					space: body.space,
					phones: body.sms,
					message: body.message,
					attachments: [],
					logged_in_user: logged_in_user.id,
					context: body.context,
					owner_id,
					facility_id: facility_id,
					delivery_method: deliveryMethod,
					primary_contact_id: body.primary_contact_id,
					recipient_type: body.contact_type
				};
				response = await contact.sendSMS(connection, sendSMSPayload);
				// eventSettings = "smsSendReceive";
				// socketEvent = "incomingSMS";
			} else {
				// var { owner_id, property_id } = await getOwnerPropertyInfo(connection, contact, company); // { owner_id: "owna75dac1ee5af4b7383ac3ea195e0df77", property_id: "fac9d40739e0ad056669f8905e60760571a"};
				let deliveryMethod = new DeliveryMethod();
				console.log("body.subject", body.subject)
				await deliveryMethod.findByGdsKey(connection, 'standard_email');
												//connection, property_id, space, subject,  message, attachments, logged_in_user, context, owner_id, facility_id, delivery_method, primary_contact_id, lease_id, document_batches_deliveries_id, recipient_type = 'primary'
				response = await contact.sendEmail(connection, p_id, body.space, body.subject, body.message, body.attachments || [], logged_in_user.id, body.context, owner_id, facility_id, deliveryMethod,body.primary_contact_id,null,null,body.contact_type);

				if (body.attachments && body.attachments.length) {
					upload.saveUploadInteraction(connection, response.interaction_id)
				}
				// eventSettings = "emailsSendReceive";
				// socketEvent = "incomingEmail";
			}

			// let role_setting = await models.Setting.findCompanySetting(connection, eventSettings, company.id);
      //
			// if (role_setting) {
			// 	try {
			// 		let roles = JSON.parse(role_setting.value);
			// 		// get roles for this company at this facility;
			// 		let company_obj = new Company({ id: company.id });
			// 		let admins = await company_obj.findRolesAtProperty(connection, roles, p_id);
      //
			// 		let socket = new Socket();
			// 		for(var admin of admins) {
			// 			await socket.isConnected(admin.contact_id);
			// 			if (!socket.connected) continue;
			// 			socket.company_id = admin.company_id;
			// 			socket.contact_id = admin.contact_id;
      //
			// 			console.log(`creating socket event for ${eventSettings == 'smsSendReceive'? "SMS": "Email"}`);
			// 			var interact = Array.isArray(response)? response[0]: response;
			// 			var interaction = new Interaction(interact);
      //
			// 			await interaction.findContact(connection);
      // 					await interaction.findEnteredBy(connection, company.id);
      // 					await interaction.findPhoneCall(connection);
	  	// 				await interaction.findEmail(connection);
      //
			// 			socket.createEvent(socketEvent, interaction);
			// 		}
			// 	} catch (err) {
			// 	}
			// }
			utils.send_response(res, {
				status: 200,
				data: {
					contact_id: Hashes.encode(contact.id, res.locals.company_id),
					interaction: Hashes.encode(response, res.locals.company_id)
				}
			});

			eventEmitter.emit('contact_sent_message', {company, logged_in_user, contact, body, cid: res.locals.company_id , locals: res.locals});


		} catch (err) {
			console.log(err);
			next(err);
		}


	});

	router.post('/search', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


		try {

  		var connection = res.locals.connection;
			let company = res.locals.active;
			let user = res.locals.contact;

			let params = req.params;
			let body = req.body;

			console.log(body);


			utils.send_response(res, {
				status: 200,
				data: {
					// contacts:  Hashes.encode(contact.id)
				}
			});

			//eventEmitter.emit('contact_sent_message', {company, user, contact, body , locals: res.locals});


		} catch (err) {
			next(err);
		}


	});

  router.get('/:contact_id/pay-now-link', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

    try{

      var connection = res.locals.connection;
      let params = req.params;
      let query = req.query;
      let company = res.locals.active;
      let property_id = query.property_id;
      let contact = new Contact({id: params.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);


      let link = contact.getPayNowLink(connection, property_id, company);

      utils.send_response(res, {
				status: 200,
				data: {
          link: Hash.obscure(link, req) // TODO this seems wrong...
				}
			});

    }
    catch(err) {
			next(err);
    }


  });

  router.post('/:contact_id/credit', [control.hasAccess(['admin']), control.hasPermission('issue_credits'), Hash.unHash], async (req, res, next) => {


    try {

      var connection = res.locals.connection;
      let company = res.locals.active;
      let user = res.locals.contact;

      let params = req.params;
      let body = req.body;

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      // TODO Verify Lease id

      let property = new Property({ id: body.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, contact_id: user.id, permissions: ['issue_credits']});

      body.contact_id = contact.id;

	  await connection.beginTransactionAsync();

      let payment = new Payment();
      await payment.createCredit(connection, body, user.id);

	  await connection.commitAsync();


      utils.send_response(res, {
        status: 200,
        data: {
          contact_id: Hashes.encode(contact.id, res.locals.company_id)
        }
      });

			let events = ['contact_credit'];
			events.map(e => {
					eventEmitter.emit(e, { company, user, contact, body, property_id: property.id, cid: res.locals.company_id , locals: res.locals, account});
			});

    } catch (err) {
		await connection.rollbackAsync();
      	next(err);
    }


  });

  router.get('/:contact_id/reservations', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    try {

      var connection = res.locals.connection;
      let company = res.locals.active;
      let params = req.params;
      let properties = res.locals.properties;
      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      await contact.getReservations(connection);
      await contact.getOldReservations(connection, properties);
      utils.send_response(res, {
        status: 200,
        data: {
          reservations: Hash.obscure(contact.Reservations, req)
        }
      });
    } catch (err) {
      console.log(err);
      next(err);
    }

  });

  router.post('/:contact_id/auto-reconcile', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
	  
    try {

      var connection = res.locals.connection;
      let company = res.locals.active;
	    let user = res.locals.contact;

      let params = req.params;
      let body = req.body;

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      let property = new Property({ id: body.property_id });
      await property.find(connection);
	  await property.verifyAccess({company_id: company.id});

	  await connection.beginTransactionAsync();

	  let {leases} = await contact.reconcile(connection, [property.id]);

	  await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          contact_id: Hashes.encode(contact.id, res.locals.company_id)
        }
	  });

    } catch (err) {
	  await connection.rollbackAsync();
      next(err);
    }


  });

  router.get('/:contact_id/delinquencies', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

    try{
		var connection = res.locals.connection;
		let params = req.params;
		let query = req.query;
		let company = res.locals.active;
		let properties = query.property_id ? [query.property_id] : [];
		let contact = new Contact({id: params.contact_id});
		await contact.find(connection);
		await contact.verifyAccess(company.id);
		await contact.getDelinquencies(connection, properties);
	
		utils.send_response(res, {
			status: 200,
			data: {
				delinquencies: Hash.obscure(contact.Delinquencies, req) // TODO this seems wrong...
			}
		});
    }
    catch(err) {
			next(err);
    }


  });


	router.post('/link-contacts', [control.hasAccess(['admin']), control.hasPermission('linking_contact'), Hash.unHash], async (req, res, next) => {
		
		let connection = res.locals.connection;
		
		try {

			let company = res.locals.active;
			let user = res.locals.contact;
			
			let params = req.params;
			let body = req.body;
			let { primary_contact_id, secondary_contact_id, property_id } = body
			let primaryContact = new Contact({ id: primary_contact_id });

			await connection.beginTransactionAsync();

			const payload = {
				secondary_contact_id, 
				login_user_id: user.id, 
				company, 
				property_id
			};
			
			await primaryContact.verifyContactProperties(connection, payload);
			// await primaryContact.linkContacts(connection, secondary_contact_id, user.id, company, property_id);
			await primaryContact.linkContacts(connection, payload);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					message: 'Contacts have been linked successfully'
				},
			});

		} catch (err) {
			console.log("Error while linking two contacts")
			await connection.rollbackAsync();
			next(err);
		}

	});	

	router.post('/link-contacts/verify-properties', [control.hasAccess(['admin']), control.hasPermission('linking_contact'), Hash.unHash], async (req, res, next) => {

		let connection = res.locals.connection;

		try {
			let body = req.body;
			let { primary_contact_id, secondary_contact_id } = body

			let primaryContact = new Contact({ id: primary_contact_id });
			await primaryContact.verifyContactProperties(connection, {secondary_contact_id});

			utils.send_response(res, {
				status: 200,
				data: {
					message: 'Both contacts are in same property and have leases in one property.'
				},
			});
		} catch (err) {
			console.log(err)
			next(err);
		}
	});


  router.post('/:contact_id/unlink', [control.hasAccess(['admin', 'api']), control.hasPermission('unlinking_space'), Hash.unHash], async (req, res, next) => {

    try {

      var connection = res.locals.connection;
      let company = res.locals.active;

      let params = req.params;
      let body = req.body;

      let properties = res.locals.properties;
      if(body.property_id && res.locals.properties.length) {
        if(res.locals.properties.indexOf(body.property_id) < 0) {
          e.th(403);
        }
        properties = [body.property_id];
      }

      if (body && (!body.pin || !body.lease_id)) throw new Error("Provide a pin code or lease_id for space to unlink");;

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      let payload = {
        ...body,
        logged_in_user: res.locals.contact,
        company: company,
        properties: properties
      }

      console.log("/:contact_id/unlink payload:", payload)

      await connection.beginTransactionAsync();
      let result = await contact.unlinkLease(connection, payload);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          ...Hash.obscure(result, req)
        }
      });
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

	router.get('/:contact_id/lease/:lease_id/verify-payment', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			let connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.verifyLeasePayment(connection, contact.id);

			utils.send_response(res, {
				status: 200,
				data: {
					message: "No payment found to apply on multiple leases"
				}
			});

		} catch (err) {
			next(err);
		}
	});

  router.post('/:contact_id/unlink', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    try {

      var connection = res.locals.connection;
      let company = res.locals.active;

      let params = req.params;
      let body = req.body;

      let properties = res.locals.properties;
      if(body.property_id && res.locals.properties.length) {
        if(res.locals.properties.indexOf(body.property_id) < 0) {
          e.th(403);
        }
        properties = [body.property_id];
      }

      if (body && (!body.pin || !body.lease_id)) throw new Error("Provide a pin code or lease_id for space to unlink");;

      let contact = new Contact({ id: params.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);

      let payload = {
        ...body,
        logged_in_user: res.locals.contact,
        company: company,
        properties: properties
      }

      console.log("/:contact_id/unlink payload:", payload)

      await connection.beginTransactionAsync();
      let result = await contact.unlinkLease(connection, payload);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          ...Hash.obscure(result, req)
        }
      });
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

	router.get('/:contact_id/lease/:lease_id/verify-payment', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			let connection = res.locals.connection;
			let company = res.locals.active;
			let params = req.params;

			let contact = new Contact({ id: params.contact_id });
			await contact.find(connection);
			await contact.verifyAccess(company.id);

			let lease = new Lease({id: params.lease_id});
			await lease.find(connection);
			await lease.canAccess(connection, company.id, res.locals.properties);
			await lease.verifyLeasePayment(connection, contact.id);

			utils.send_response(res, {
				status: 200,
				data: {
					message: "No payment found to apply on multiple leases"
				}
			});

		} catch (err) {
			next(err);
		}
	});
	router.get('/:contact_id/get-all-SMS-numbers', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

		try {
	
		  var connection = res.locals.connection;
		  let company = res.locals.active;
	
		  let params = req.params;
		  let body = req.body;
	
		  let contact = new Contact({ id: params.contact_id });
		  const SMSNumberList = await contact.getSMSContactsByContactId(connection)	
		  console.log('SMSNumberList', SMSNumberList);
		  console.log('Hash.obscure(SMSNumberList, req)',Hash.obscure(SMSNumberList, req));
				utils.send_response(res, {
			status: 200,
			data: Hash.obscure(SMSNumberList, req)
			
		  });
		} catch (err) {
				await connection.rollbackAsync();
				next(err);
		}
	  });
	return router;

};


var Activity = require(__dirname + '/../classes/activity.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var Property = require(__dirname + '/../classes/property.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Note = require(__dirname + '/../classes/note.js');
var Upload = require('../classes/upload.js');
var Lease = require('../classes/lease.js');
const Address = require('../classes/address');
const units = require('../models/units');
// const { try } = require('bluebird');
var Payment = require(__dirname + '/../classes/payment.js');
var PaymentMethod = require(__dirname + '/../classes/payment_method.js');
var Lead = require(__dirname + '/../classes/lead.js');
var Event = require(__dirname + '/../classes/event.js');
var Todo = require(__dirname + '/../classes/todo.js');
let Accounting = require('../classes/accounting.js');
const { error } = require('console');
const upload = require('../models/upload');
const AccessControl = require('../classes/access_control');



