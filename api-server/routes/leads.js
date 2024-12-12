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
var Schema = require(__dirname + '/../validation/leads.js');

var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app) {

    router.get('/',  [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {

      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        var company = res.locals.active;
        let query = req.query;
        let searchParams;
        let conditions = {};
        
        if(query.source) conditions.source = utils.convertToArray(query.source).map(source => source.toLowerCase());
        if(query.status) conditions.status = utils.convertToArray(query.status).map(status => status.toLowerCase());
        if(query.name) conditions.name = query.name;
        if(query.email) conditions.email = query.email;
        if(query.property_id) conditions.property_id = query.property_id;
        if(query.from_date) conditions.fromDate = moment(query.from_date).format('YYYY-MM-DD');
        if(query.to_date) conditions.toDate = moment(query.to_date).format('YYYY-MM-DD');
        
        let { limit, offset, sort, sortdir } = { ...utils.cleanQueryParams(query, {
          sort: 'leads.created',
          sortdir: 'desc'
        }) };

        searchParams = { limit, offset, sort, sortdir };
        const leads =  await models.Lead.search(connection, conditions, searchParams, company.id, false, true);
        const leadDetails = await Lead.getLeadsDetails(connection, leads);
        const totalCount = await models.Lead.search(connection, conditions, null, company.id, true);

        let property_id = query.property_id || ''
        if(property_id) {
          // encrypting for paging
          if (property_id.length) {
            searchParams["property_id"] = []
            for (let propertyId of property_id) {
              searchParams.property_id.push(Hashes.encode(propertyId, company.id));
            }
          } else {
            searchParams["property_id"] = Hashes.encode(property_id, company.id)
          }
        }
        const paging = utils.generatePagingObject(req, searchParams, totalCount[0].count, leads.length)
        
        utils.send_response(res, {
          status: 200,
          data: {
            leads: Hash.obscure(leadDetails, req),
            paging
          }
        });

      } catch(err){
        next(err);
      }

    });

    router.post('/search',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        try{

          var connection = res.locals.connection;
            let company = res.locals.active;
            let body = req.body;

            let report = new Report({
                name: body.type + '_' + moment().format('x'),
                type: 'leads',
                format: 'web',
                filters: body,
                connection: connection,
                company: company
            });

            await report.generate();

            utils.send_response(res, {
                status: 200,
                data: {
                    leads: Hash.obscure(report.reportClass.data, req),
                    result_count: report.reportClass.result_count
                }
            });

        } catch(err){
            next(err)
        }

    });

    router.get('/reservations', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {

      const connection = res.locals.connection;

      try {

        let company = res.locals.active;
        let properties = res.locals.properties;
        let reservations = await models.Lead.findReservations(connection, company.id, properties);

        utils.send_response(res, {
          status: 200,
          data: {
            reservations: Hash.obscure(reservations, req)
          }
        });



      } catch(err) {
        next(err);
      }




    });

    router.get('/sources', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;

            let sources = await Lead.getSources(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    sources: Hash.obscure(sources.filter(s => s.source.trim().length), req)
                }
            });


        } catch(err) {
            next(err);
        }


    })

    router.get('/:lead_id',  [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{
            let api = res.locals.api;
            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;

            let lead = new Lead({id: params.lead_id});
            await lead.find(connection, api);

            utils.send_response(res, {
                status: 200,
                data: {
                    lead: Hash.obscure(lead,req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.put('/:lead_id/retire', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => { 

      try {

        var connection = res.locals.connection;
        let user = res.locals.contact || {};
        let company = res.locals.active;
        let properties = res.locals.properties;
        let params = req.params;
        let body = req.body;
        

        let lead = new Lead({id: params.lead_id});
        await lead.find(connection);

        let contact = new Contact({ id: lead.contact_id });
        await contact.find(connection, company.id);
        await contact.verifyAccess(company.id);

        await connection.beginTransactionAsync();
        
        await lead.retire(connection, body.reason,  user.id, company.id);
        
        if(body.opt_out){
          await contact.optOut(connection, company.id);
        }

        if(lead.lease_id){
          await Todo.dismissTasks(connection, lead.lease_id, ENUMS.EVENT_TYPES_COLLECTION.RESERVATION, ENUMS.TASK_TYPE.LEASE, user.id);
        }
        

        await contact.getActiveLead(connection, lead.property_id);
        // Dismissing tasks only happens for all properties.  Do we need to remove specific tasks associated with that lead?
        if(!contact.ActiveLead.id){
          console.log("DISMISSING ALL LEAD TASKS");
          await Todo.dismissTasks(connection, contact.id, ENUMS.EVENT_TYPES_COLLECTION.LEAD, ENUMS.TASK_TYPE.CONTACT, user.id);
        }

        await connection.commitAsync();

        //Enter Note? 

        let note = new Note({});
        let data = {
            content: body.notes,
            context: 'leadFollowUp',
            pinned: 0,
            contact_id: contact.id,
            last_modified_by: user.id
        }
        await note.update(data)
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
      
      } catch (err) {
				await connection.rollbackAsync();
				next(err);
			}
      
    })

    /* Testing 

      fails without contact info
      fails without property reference


      saves category_refence, or determines based on unit if not included
      saves unit_refernce
      saves property_reference
      Lead gets entered
      touchpoints get saved to the contact
      
      new contact
        Contact gets entered with relevant phone, address info
      
      contact is matched with existing contact with no previous leases
        contact info gets updated

      contact is matched with existing contact we previous leases
        contact info gets added to

      
    */


    router.post('/',  [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.createLead ), control.hasPermission('create_leads'), Hash.unHash], async(req, res, next) =>  {

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
            
            let c = req.body.Contact;
            if(!c) e.th(400, "Contact info missing")
            console.log(`Tenant info first name: ${c.first} and last name: ${c.last}`)
            if(!c.first || !c.last) e.th(400, "First and last name are required");
            // if(c.Phones && c.Phones.length && c.Phones.find(p => !p.phone)) e.th(400, "An invalid phone number was entered");
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

    router.get('/:contact_id/request-dossier/:unit_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
      var connection = res.locals.connection;
      try{
        let params = req.params;
        let company = res.locals.active;
        //var query = req.query;

        let lead = new Lead({contact_id: params.contact_id});
        await lead.find(connection);
        //const unit_id = query.unit_id ? query.unit_id : lead.unit_id;
        let unit = new Unit({id: params.unit_id});
        await unit.find(connection);
        await unit.getCategory(connection);


        var  options = {
          uri: 'http://uat.tenantapi.com/v3/pmses/translate',
          headers: {
            "x-storageapi-key": "309365e7685b4b048d79dc7d29bd4f57",
            "x-storageapi-date": moment().format('x'),
            "Content-Type": "application/json"
          },
          json: true,
          method: 'post',
          body: [
            {
              "facility": Hashes.encode(unit.property_id, res.locals.company_id),
              "spaces": [Hashes.encode(unit.id, res.locals.company_id)],
              "spacetypes": [Hashes.encode(unit.category_id, res.locals.company_id)],
              "pmstype": "leasecaptain",
            }
          ]
        };

        let res_gds = await rp(options);

        var contact = new Contact({id: lead.contact_id});
        await contact.find(connection, company.id);

        var contact_obj = {
          "type": "primary",
          "name": {
            "first": contact.first,
            "last": contact.last
          },
          "email": contact.email,
          "address": {
            "name": contact.first + " " + contact.last,
            "address1": contact.Addresses && contact.Addresses.length > 0 ? contact.Addresses[0].Address.address + contact.Addresses[0].Address.address2 : null,
            "city": contact.Addresses && contact.Addresses.length > 0 ? contact.Addresses[0].city : null,
            "stateCode": contact.Addresses && contact.Addresses.length > 0 ? contact.Addresses[0].state : null,
            "postalCode": contact.Addresses && contact.Addresses.length > 0 ? contact.Addresses[0].zip : null
          },
          "phones": [
            {
                "number": contact.Phones && contact.Phones.length > 0 ? contact.Phones[0].phone : null,
                "type": contact.Phones && contact.Phones.length > 0 ? contact.Phones[0].type : null
            }
          ],
        }
        var appid = 'app6508921b95114e7f8dde789bf65af98b'
        var options_dossier = {
          uri: "https://uat.tenantapi.com/v3/applications/"+ settings.dossier_app_id +"/v1/owners/" + company.gds_owner_id + "/facilities/" + res_gds.data[0].facility.gdsid + "/dossiers/",
          headers: {
                "x-storageapi-key": "309365e7685b4b048d79dc7d29bd4f57",
                "x-storageapi-date": moment().format('x'),
                "Content-Type": "application/json"
              },
          json: true,
          method: 'post',
          body: {
            "rental":{
              "tenantInfo": {
                "alternateDeclined": false,
                "contacts": [contact_obj],
                "spaceType": res_gds.data[0].spacetypes ? res_gds.data[0].spacetypes[0].gdsid : "",
                "space": res_gds.data[0].spaces ? res_gds.data[0].spaces[0].gdsid : "",
              }
            }
          }
        }

        let res_dossier = await rp(options_dossier);
        utils.send_response(res, {
          status: 200,
        });

      } catch(err) {
        console.log("error" + err.message);
        next(err);
      }




  });

    router.put('/bulk-edit', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{
        let body = req.body;
        body.lead_ids = body.lead_ids.map(id => Hashes.decode(id)[0]);
        await Lead.bulkEdit(connection, body);
        utils.send_response(res, {
          status: 200,
          data: {}
        });
        // eventEmitter.emit('units_bulk_edited', {company, contact, units: body.unit_ids.join(', '), locals: res.locals});

      } catch(err) {
        next(err);
      }

    });


    return router;

};
