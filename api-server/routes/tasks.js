var express     = require('express');
var router      = express.Router();

var moment      = require('moment');
var control    = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');
var Enums  = require(__dirname + '/../modules/enums.js');


module.exports = function (app, sockets) {

    router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            var company = res.locals.active;
            var query = req.query;
            var loggedInUser = res.locals.contact;
            var properties = res.locals.properties;
            let gps_selection = res.locals.gps_selection;
            let tasks = [];

            let params = {
                ...(query.event_type_id && {event_type_ids: query.event_type_id}),
                //date: query.date ||moment().format('YYYY-MM-DD'),
                limit: query.limit && query.limit < 100 ? query.limit : 20,
                offset: query.offset || 0
            };

            if(gps_selection?.length) 
                properties = gps_selection;

            let open_todos = await Todo.findForToday(connection, company.id, loggedInUser.id, query.all, params, properties);

            let group_map = {}; 
            
            for (let i = 0; i < open_todos.length; i++) {
                let t = open_todos[i];
                let event_type = await Event.findEventTypeById(connection, t.event_type_id); 
                let lease = {};
                let contact = {};
                let rate_change = {};
                if(t.lease_id){
                    lease = new Lease({id: t.lease_id}); 
                    await lease.find(connection);
                    await lease.findUnit(connection);
                    await lease.getTenants(connection);
                    await lease.findTransfer(connection);
                    if(lease.Property) await lease.findAuction(connection, lease.Property.company_id);
                    if(lease.Transfer) await lease.Transfer.findTransferBy(connection);
                }
                if(t.follow_up_contact){
                    contact =  new Contact({id: t.follow_up_contact});
                    await contact.find(connection);
                    await contact.getPhones(connection);
                    await contact.getLocations(connection);
                }
                if(t.rate_change_id){
                    rate_change = new Rate_Change({id : t.rate_change_id});
                    await rate_change.findById(connection);
                    await rate_change.findRentChangeLeases(connection);
                    await rate_change.getStats(connection);
                }
                


                // let created_by = {};
                // if (t.created_by) {
                //     created_by = new Contact({ id: t.created_by });
                //     await created_by.find(connection);
                // }
                if(event_type.slug === 'task'){
                    event_type.text = t.details; 
                }

                if(event_type.slug === Enums.EVENT_TYPES.AUCTION.CUT_LOCK_SCHEDULE_AUCTION){
                    if(lease.auction_status == 'scheduled'){
                        event_type.text = `Verify if auction for space ${lease.Unit.number} has been closed and enter the bid amount`;
                        event_type.btn_text = 'View Auction';
                    }
                }

                tasks.push({
                    task: t,
                    EventType: event_type,
                    Lease: lease,
                    Contact: lease.Tenants && lease.Tenants.length ? lease.Tenants[0].Contact: contact,
                    Event: { "Rate_Change" : rate_change}
                    // AssignedTo: contact,
                    // CreatedBy: created_by,
                })
                // let todo = new Todo({ id: open_todos[i].id });
                // await todo.find(connection);
                // todo.Event = new Event({ id: todo.event_id });
                // await todo.Event.find(connection);
                // if (todo.Event.event_type_id) await todo.Event.findEventType(connection);
         
                // if(!open_todos[i].count){
                //     try {

                //         await todo.Event.findObject(connection);
                //     } catch (err) {
                //         console.log("err", err)
                //     }
                // }

                // if (todo.activity_object_id) {
                //     todo.ActivityObject = new ActivityObject({ id: todo.activity_object_id });
                //     await todo.ActivityObject.find(connection);
                //     await todo.ActivityObject.findObject(connection, todo.object_id);
                //     await todo.formatMessage(connection);
                // }

                // if (todo.created_by) {
                //     todo.Created = new Contact({ id: todo.created_by });
                //     await todo.Created.find(connection);
                // }


                // if (todo.contact_id) {
                //     todo.AssignedTo = new Contact({ id: todo.contact_id });
                //     await todo.AssignedTo.find(connection);
                // }

                // todo.formatEventText(open_todos[i].count );

                // todos.push({
                //     type: todo.Event.group_id ? 'group' : 'single',
                //     count: open_todos[i].count ? open_todos[i].count : 1,
                //     task: todo
                // })
            }
            

            utils.send_response(res, {
                status: 200,
                data: {
                    tasks: Hash.obscure(tasks, req)
                }
            });


        } catch (err) {
            next(err);
        }



    });

    router.get('/groups/:group_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            var company = res.locals.active;
            var params = req.params;
            var query = req.query;
            var loggedInUser = res.locals.contact;
            var properties = res.locals.properties;
            let todos = [];
            let gps_selection = res.locals.gps_selection;

            params = {
                ...params,
                limit: query.limit && query.limit < 100 ? query.limit : 20,
                offset: query.offset || 0
            };

            if(gps_selection?.length) 
                properties = gps_selection;

            let group_todos = await Todo.findByGroup(connection, company.id, loggedInUser.id, params, properties);

            for (let i = 0; i < group_todos.length; i++) {

                let todo = new Todo({ id: group_todos[i].id });
                await todo.find(connection);
                todo.Event = new Event({ id: todo.event_id });
                await todo.Event.find(connection);
                if (todo.Event.event_type_id) await todo.Event.findEventType(connection);
                try {
                    await todo.Event.findObject(connection);
                } catch (err) {

                }


                try {
                    await todo.Event.findContact(connection);
                    console.log("todo.Event", todo.Event);
                } catch (err) {

                    console.log(err);
                }

                if (todo.activity_object_id) {
                    todo.ActivityObject = new ActivityObject({ id: todo.activity_object_id });
                    await todo.ActivityObject.find(connection);
                    await todo.ActivityObject.findObject(connection, todo.object_id);
                    await todo.formatMessage(connection);
                }

                if (todo.created_by) {
                    todo.Created = new Contact({ id: todo.created_by });
                    await todo.Created.find(connection);
                }


                if (todo.contact_id) {
                    todo.AssignedTo = new Contact({ id: todo.contact_id });
                    await todo.AssignedTo.find(connection);
                }

                todo.formatEventText();

                todos.push({
                    type: 'single',
                    task: todo
                })
            }


            utils.send_response(res, {
                status: 200,
                data: {
                    tasks: Hash.obscure(todos, req)
                }
            });


        } catch (err) {
            next(err);
        }

    });

    router.get('/count', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            var company = res.locals.active;
            var query = req.query;
            var loggedInUser = res.locals.contact;
            var properties = res.locals.properties;
            let gps_selection = res.locals.gps_selection;
            let tasks_count = [];
            let params = {
                ...(query.event_type_id && {event_type_ids: query.event_type_id}),
                date: query.date || moment().format('YYYY-MM-DD'),
            };
            
            if(gps_selection?.length) 
                properties = gps_selection;

            let result = await Todo.findCount(connection, company.id, loggedInUser.id, params, properties);

            for (let i = 0; i < result.length; i++) {
                tasks_count.push({
                    event_type_id : result[i].id,
                    event_type_name : result[i].name,
                    count : result[i].count
                });
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    tasks_count: Hash.obscure(tasks_count, req)
                }
            });


        } catch (err) {
            next(err);
        }



    });

    router.get('/:contact_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            var company = res.locals.active;
            var query = req.query;
            var loggedInUser = res.locals.contact;
            let contact_id = req.params.contact_id;
            let properties = (query.property_id) ? [query.property_id] : res.locals.properties;
            let gps_selection = res.locals.gps_selection;
            let todos = [];

            let params = {
                contact_id: contact_id
            };

            if(query.limit || query.offset) {
                params.limit = query.limit < 100 ? query.limit : 20;
                params.offset = query.offset || 0;
            }
            
            if(gps_selection?.length) 
                properties = gps_selection;
            
            let open_todos = await Todo.findByContactId(connection,loggedInUser.id, company.id, params, properties);

            for (let i = 0; i < open_todos.length; i++) {

                let todo = new Todo({ id: open_todos[i].id });
                await todo.find(connection);
                todo.Event = new Event({ id: todo.event_id });
                await todo.Event.find(connection);
                if (todo.Event.event_type_id) await todo.Event.findEventType(connection);

                if(!open_todos[i].count){
                    try {
                        await todo.Event.findObject(connection);
                    } catch (err) {

                    }
                }

                todo.formatEventText(open_todos[i].count);

                todos.push({
                    type: todo.Event.group_id ? 'group' : 'single',
                    count: open_todos[i].count ? open_todos[i].count : 1,
                    task: todo
                })
            }
            console.log("formatted_list", todos);

            utils.send_response(res, {
                status: 200,
                data: {
                    tasks: Hash.obscure(todos, req)
                }
            });


        } catch (err) {
            next(err);
        }



    });

    return router;
}

var Todo  = require(__dirname + '/../classes/todo.js');
var Event  = require(__dirname + '/../classes/event.js');
var Lease  = require(__dirname + '/../classes/lease.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var Rate_Change = require(__dirname + '/../classes/rate_change.js');
var ActivityObject = require(__dirname + '/../classes/activity_object.js');
