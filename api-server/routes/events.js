var express     = require('express');
var router      = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var jwt = require('jsonwebtoken');
var models = require(__dirname + '/../models');

var Todo  = require(__dirname + '/../classes/todo.js');
var Event  = require(__dirname + '/../classes/event.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var Promise = require('bluebird');
var request = require('request');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var fs = Promise.promisifyAll(require('fs'));
var validator = require('validator');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var control    = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var ActivityObject = require(__dirname + '/../classes/activity_object.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Upload = require(__dirname + '/../classes/upload.js');
var eventEmitter = require(__dirname + '/../events/index.js');

var crypto      = require('crypto');

module.exports = function(app, sockets) {

  router.post('/',  [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let contact = {};

      let event = new Event({
        company_id: company.id,
        created_by: loggedInUser.id,
        start_date: moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        end_date: moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        title: 'Todo',
        details: body.details,
        duration: 0,
        is_all_day: 0,
        type: 'todo'
      });


      await connection.beginTransactionAsync();
      await event.save(connection);
      await event.setTrigger(company);

      let todo = new Todo({
        original_date:  moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        created_by: loggedInUser.id,
        activity_object_id: body.activity_object_id,
        object_id: body.object_id,
        event_id: event.id,
        snoozed_count: 0,
        completed: 0
      });

      if(body.contact_id && body.contact_id > 0){
        contact = new Contact({id: body.contact_id});
        await contact.find(connection);
        await contact.verifyAccess(company.id);
        todo.contact_id = body.contact_id;
      } else {
        todo.contact_id = null
      }

      await todo.save(connection);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('todo_saved', {company, loggedInUser, contact, todo, event, cid: res.locals.company_id, locals: res.locals});



    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.post('/units', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let contact = {};
      let events = [];

      // let event_list = await Event.findEventsByIds(connection, company.id, body.events.map(e => e.event_id) );
      for(let i = 0; i < body.events.length; i++){
        let event = new Event({id: body.events[i].event_id});
        await event.find(connection);
        await event.findLease(connection);
        await event.Lease.findUnit(connection);
        await event.Lease.getTenants(connection);

        for(let i = 0; i < event.Lease.Tenants.length; i++ ){
          await event.Lease.Tenants[i].Contact.getRelationships(connection)

        }
        events.push(event);
      }
      utils.send_response(res, {
        status: 200,
        data: {
          events: Hash.obscure(events, req)
        }
      });





    } catch(err) {
      next(err);
    }




  });

  router.get('/', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let contact = {};

      let conditions = {
        company_id: company.id
      };

      let events = await Event.findEventsByCompanyId(connection, conditions );

      utils.send_response(res, {
        status: 200,
        data: {
          events: Hash.obscure(events, req)
        }
      });





    } catch(err) {
      next(err);
    }




  });

  router.get('/event-types', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    var connection = res.locals.connection;
    var query = req.query;
    const type = query.type ? query.type : "";
    const source = query.source ? query.source : "";

    try {

      let company = res.locals.active;

      let event_types = await Event.findEventTypes(connection, type);

      utils.send_response(res, {
        status: 200,
        data: {
          event_types: Hash.obscure(event_types, req)
        }
      });





    } catch(err) {
      next(err);
    }




  });

  router.post('/event-types', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    var connection = res.locals.connection;

    try {

      let company = res.locals.active;
      let contact = res.locals.contact;
      let body = req.body;

      let data = {
        company_id: company.id,
        name: body.name
      };

      let event_type_id = await Event.saveEventType(connection, data);

      utils.send_response(res, {
        status: 200,
        data: {
          event_type_id: Hashes.encode(event_type_id, res.locals.company_id)
        }
      });

      // TODO Save Activity


    } catch(err) {
      next(err);
    }




  });

  router.post('/documents/print/link', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    var connection = res.locals.connection;


    try {
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let contact = {};
      let events = [];

      for(let i = 0; i < body.events.length; i++){

        let event = new Event({id: body.events[i].event_id });
        await event.find(connection);
        event.verifyAccess(company.id);

        for(let j = 0; j < body.events[i].contacts.length; j++){
          if(body.events[i].contacts[j]){
            events.push({
              event_id: event.id,
              contact_id: body.events[i].contacts[j].contact_id
            });
          }
        }
      }

      let shipment = {
        company_id: company.id,
        contact_id: loggedInUser.id,
        events: events,
        date: moment().format('x')
      }

      var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
      var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

      let link = settings.baseURL + '/v1/events/documents/print/' + body.print_type + '?token=' + encrypted;
      utils.send_response(res, {
        status: 200,
        data: {
          link: link
        }
      });




    } catch(err) {
      next(err);
    }



  });

  router.get('/documents/print/documents',  async (req, res, next) => {


    var connection = res.locals.connection;

    try {

      let hash = req.query.token;
      let decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
      let decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
      let sent = moment(decrypted.date, 'x');
      let ms = moment().diff(moment(sent));
      console.log("decrypted", decrypted);
      // if( ms > 1000 * 10) {
      //   e.th(403, 'You followed an invalid or expired link. Please try again.');
      // }

      let contact = {};
      let documents = [];
      // let event_list = await Event.findEventsByGroupId(connection, company.id, req.params.group_id );
      let event_list = decrypted.events;

      for(let i = 0; i < event_list.length; i++){
        let event = new Event({id: event_list[i].event_id});
        await event.find(connection);
        event.verifyAccess(decrypted.company_id);

        let upload = new Upload({id: event.upload_id});
        await upload.find(connection);
        documents.push(upload);
      }


      let file = Upload.combineToFile(documents);

      let contents = await fs.readFileAsync( file );
      if(!contents) e.th(404, "File not found");

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(contents),
        'Content-Type': documents[0].mimetype
      });

      res.end(contents);



    } catch(err) {
      next(err);
    }



  });

  router.get('/documents/print/labels',  async (req, res, next) => {

    var connection = res.locals.connection;

    try {

      let hash = req.query.token;
      let decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
      var decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
      let sent = moment(decrypted.date, 'x');

      let ms = moment().diff(moment(sent));
      // if( ms > 1000 * 10) {
      //   e.th(403, 'You followed an invalid or expired link. Please try again.');
      // }

      let contact = {};
      let labels = [];
      // let event_list = await Event.findEventsByGroupId(connection, company.id, req.params.group_id );
      let event_list = decrypted.events;


      for(let i = 0; i < event_list.length; i++){
        let event = new Event({id: event_list[i].event_id});
        await event.find(connection);
        event.verifyAccess(decrypted.company_id);

        let contact = new Contact({id: event_list[i].contact_id});
        await contact.verifyAccess(decrypted.company_id);
        labels.push(contact);

      }

      //let file = Upload.combineToFile(documents);
      let file = Upload.createLabels(labels);

      let contents = await fs.readFileAsync( file );
      if(!contents) e.th(404, "File not found");

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(contents),
        'Content-Type': 'application/pdf'
      });

      res.end(contents);



    } catch(err) {
      next(err);
    }




  });


  return router;

};



