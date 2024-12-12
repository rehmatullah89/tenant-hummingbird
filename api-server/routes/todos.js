var express     = require('express');
var router      = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var jwt = require('jsonwebtoken');
var models = require(__dirname + '/../models');

var Todo  = require(__dirname + '/../classes/todo.js');
var Event  = require(__dirname + '/../classes/event.js');
var Contact  = require(__dirname + '/../classes/contact.js');

var request = require('request');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var validator = require('validator');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var control    = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Enums = require(__dirname + '/../modules/enums.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var ActivityObject = require(__dirname + '/../classes/activity_object.js');
var Activity = require(__dirname + '/../classes/activity.js');
var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app, sockets) {


	router.post('/',  [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    console.log('called', req)


    try {
	    var connection = res.locals.connection;
      let loggedInUser = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let contact = {};

      console.log('level1')

      let event = new Event({
        company_id: company.id,
        created_by: loggedInUser.id,
        event_type_id: body.event_type_id,
        start_date: moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        //end_date: moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        title: body.name,
        details: '',
        duration: 0,
        is_all_day: 0,
        type: 'todo'
      });


      await event.findEventType(connection);
      await event.setEventEndDate(connection, {lease_id: body.lease_id, contact_id: body.contact_id});
      console.log('body-req', body)
      await connection.beginTransactionAsync();
      await event.save(connection);
      // await event.setTrigger(company);

      if(body.lease_id) {
        await event.saveEventObject(connection, body.lease_id, Enums.TASK_TYPE.LEASE);
      } else if(body.contact_id) {
        await event.saveEventObject(connection, body.contact_id, Enums.TASK_TYPE.CONTACT);
      }

      let todo = new Todo({
        original_date: moment.utc(body.start_date).format('YYYY-MM-DD HH:mm:ss'),
        created_by: loggedInUser.id,
        activity_object_id: body.activity_object_id,
        object_id: body.object_id,
        event_id: event.id,
        details: body.details,
        snoozed_count: 0,
        completed: 0,
        action: body.action

      });

      if(body.assign_to && body.assign_to > 0){
        contact = new Contact({id: body.assign_to});
        await contact.find(connection);
        if (contact.company_id == null)  contact.company_id = company.id;
        await contact.verifyAccess(company.id);
        todo.contact_id = body.assign_to;
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
      console.log('catch', err)
      await connection.rollbackAsync();
      next(err);
    }



	});

	router.get('/', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {


    try{
      var connection = res.locals.connection;
      var company =  res.locals.active;
      var query = req.query;
      var loggedInUser =  res.locals.contact;
      let todos = {};

      let td = {
        details: '',
        assigned_to: '',
        assigned_by: ''
      }
      let params = {
        limit: query.limit && query.limit < 50 ? query.limit: 2,
        offset: query.offset || 0
      };

      let todo_res = await Todo.findOpen(connection, company.id, loggedInUser.id, query.all, params);


      let formatted_list = [];
      let group_map = {};


      for (let i = 0; i < todo_res.length; i++){

        let todo = new Todo({id: todo_res[i].id});
        await todo.find(connection);
        todo.Event = new Event({id: todo.event_id});
        await todo.Event.find(connection);
        try {
          await todo.Event.findLease(connection);
          await todo.Event.Lease.findUnit(connection);
          await todo.Event.Lease.getTenants(connection);
          for(let i = 0; i < todo.Event.Lease.Tenants.length; i++ ){
            await todo.Event.Lease.Tenants[i].Contact.getRelationships(connection)

          }
        } catch(err){

        }


        try {
          await todo.Event.findContact(connection);
          // await todo.Event.Lease.findUnit(connection);
          // await todo.Event.Lease.getTenants(connection);
          // for(let i = 0; i < todo.Event.Lease.Tenants.length; i++ ){
          //   await todo.Event.Lease.Tenants[i].Contact.getRelationships(connection)
          //
          // }

          console.log("todo.Event", todo.Event);
        } catch(err){

          console.log(err);
        }

        if(todo.activity_object_id){
          todo.ActivityObject = new ActivityObject({id:  todo.activity_object_id});
          await todo.ActivityObject.find(connection);
          await todo.ActivityObject.findObject(connection, todo.object_id);
          await todo.formatMessage(connection);
        }

        if(todo.created_by){
          todo.Created = new Contact({id:  todo.created_by});
          await todo.Created.find(connection);
        }


        if(todo.contact_id){
          todo.AssignedTo = new Contact({id:  todo.contact_id});
          await todo.AssignedTo.find(connection);
        }

        // store map of date / Group ID to present like tasks together

        let todo_date = moment(todo.original_date).format('YYYY-MM-DD');

        todos[todo_date] = todos[todo_date] || [];
        if(todo.Event.group_id){
          group_map[todo_date] = group_map[todo_date] || {};
          if(typeof group_map[todo_date][todo.Event.group_id] === 'undefined') {
            todos[todo_date].push({
                type: 'group',
                date: todo.original_date,
                event_type: todo.Event.type,
                details: todo.details,
                document_count: todo.Event.upload_id? 1:0,
                Children: [todo]
            })
            group_map[todo_date][todo.Event.group_id] = todos[todo_date].length - 1;
          } else {

            todos[todo_date][group_map[todo_date][todo.Event.group_id]].Children.push(todo);
            if(todo.Event.upload_id){
              todos[todo_date][group_map[todo_date][todo.Event.group_id]].document_count++;
            }
          }
        } else {
          todos[todo_date].push({
            type: 'single',
            todo: todo
          })

        }

      }

      //
      //
      // for (let i = 0; i < todos.length; i++){
      //     if(todos[i].Event.group_id){
      //       if(typeof group_map[todos[i].Event.group_id] == 'undefined') {
      //
      //         formatted_list.push({
      //           type: 'group',
      //           date: todos[i].original_date,
      //           event_type: todos[i].Event.type,
      //           details: todos[i].details,
      //           document_count: todos[i].Event.upload_id? 1:0,
      //           Children: [todos[i]]
      //         });
      //         group_map[todos[i].Event.group_id] = formatted_list.length -1 ;
      //       } else {
      //         formatted_list[group_map[todos[i].Event.group_id]].Children.push(todos[i]);
      //         if(todos[i].Event.upload_id){
      //           formatted_list[group_map[todos[i].Event.group_id]].document_count++;
      //         }
      //       }
      //     } else {
      //       formatted_list.push({
      //         type: 'single',
      //         todo: todos[i]
      //       });
      //     }
      //
      // }


      console.log("formatted_list", todos);

      utils.send_response(res, {
        status: 200,
        data: {
          todos: Hash.obscure(todos, req)
        }
      });


    } catch(err) {
      next(err);
    }



	});

	router.put('/dismiss', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {


    try{
      var connection = res.locals.connection;
      let company =  res.locals.active;
      let loggedInUser =  res.locals.contact;
      let params = req.params;
      let body = req.body;

      await connection.beginTransactionAsync();
      for(let i = 0; i < body.todos.length; i++){
        let todo = new Todo({
          id: body.todos[i].id
        });

        await todo.find(connection);
        todo.verifyAccess(loggedInUser.id);
        await todo.dismiss(connection,loggedInUser.id);

        //TODO FIX Once notifications are under control....
        // eventEmitter.emit('todo_completed', { company, loggedInUser, todo, locals: res.locals});

      }
      await connection.commitAsync();
      utils.send_response(res, {
        status: 200,
        data: {},
      });


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



  });
  
  router.put('/mark-incomplete', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {


    try{
      var connection = res.locals.connection;
      
      let loggedInUser =  res.locals.contact;

      let body = req.body;

      await connection.beginTransactionAsync();
      for(let i = 0; i < body.todos.length; i++){
        let todo = new Todo({
          id: body.todos[i].id
        });

        await todo.find(connection);
        todo.verifyAccess(loggedInUser.id);
        await todo.markIncomplete(connection,loggedInUser.id);

        //TODO FIX Once notifications are under control....
        // eventEmitter.emit('todo_completed', { company, loggedInUser, todo, locals: res.locals});

      }
      await connection.commitAsync();
      utils.send_response(res, {
        status: 200,
        data: {},
      });


    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }



	});

	router.put('/:todo_id/snooze', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

    try{
      var connection = res.locals.connection;
      var company =  res.locals.active;

      var loggedInUser =  res.locals.contact;
      var params = req.params;
      var body = req.body;

      if(!body.until) e.th(400, 'Please provide a time to snooze until');

      let todo = new Todo({
        id: params.todo_id
      });
      await todo.find(connection)
			todo.verifyAccess(loggedInUser.id);
			await todo.snooze(connection, body.until);

      var jobParams = [];

      jobParams.push({
        category: 'new_event',
        data: {
          id: todo.event_id,
          action: 'register',
          domain: company.subdomain
        }
      });


      await new Promise((resolve, reject) => {
        Scheduler.addJobs(jobParams, (err) => {
          if (err) e.th(500, err);
          return resolve();
        });
      });

      utils.send_response(res, {
        status: 200,
        data: {},
      });


      eventEmitter.emit('todo_snoozed', {company, loggedInUser, todo, cid: res.locals.company_id, locals: res.locals});

    } catch(err) {
      next(err);
    }


	});

	return router;

};
