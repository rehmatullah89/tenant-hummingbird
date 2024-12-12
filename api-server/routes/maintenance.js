var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var control  = require(__dirname + '/../modules/site_control.js');

var validator = require('validator');

var prettyjson = require('prettyjson');

var MaintenanceRequest = require(__dirname + '/../classes/maintenance_request.js');
var models    = require(__dirname + '/../models');
var Lease = require(__dirname + '/../classes/lease.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var Report = require(__dirname + '/../classes/report.js');
var Event = require(__dirname + '/../classes/event.js');
var Todo = require(__dirname + '/../classes/todo.js');

var Upload  = require(__dirname + '/../classes/upload.js');
var replyParser = require("node-email-reply-parser");

var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Company = require(__dirname + '/../classes/company.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app) {

    router.get('/chats', control.hasAccess(['admin']), async(req, res, next) => {

        var connection = res.locals.connection;

        try{
            let contact = res.locals.contact;
            let company = res.locals.active;

            let chats = await models.Maintenance.getActiveChats(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    chats: Hash.obscure(chats, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    // Chat Related
    router.post('/:maintenance_id/sms-message', control.hasAccess(['admin','tenant']), async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;

            let body = Hash.clarify(req.body);
            let params = Hash.clarify(req.params);
			let property_id = params.property_id;
			let space = params.space;
            if(!body.content.length && body.label === 'message'){
                e.th(400, "You have not entered a message to send.");
            }

            let maintenance = new MaintenanceRequest({id: params.maintenance_id});
            await maintenance.find(connection, company.id);

            let subMessage = maintenance.makeChatMessage(connection, contact.id, body.content, body.label, "User Account" );

            await connection.beginTransactionAsync();
            let message = await maintenance.saveMessage(connection, subMessage);


            //let interaction = new Interaction();
            //await interaction.create(connection, property_id, space, maintenance.contact_id, contact.id, moment.utc(body.created).format('YYYY-MM-DD HH:mm:ss'), message.content, 'chat', null, message.id, null, null, body.context, null, true);

            if(subMessage.label !== 'message'){
                await maintenance.updateStatus(connection, subMessage);
            }

            await maintenance.markRead(connection);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    submessage: Hash.obscure(subMessage, req)
                },
            });

            eventEmitter.emit('new_chat_message', {company, contact, maintenance, subMessage, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }



    });

    // mark chat read
    router.put('/:maintenance_id/mark-read', control.hasAccess(['admin']), async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let body = Hash.clarify(req.body);
            let params = Hash.clarify(req.params);

            let company = res.locals.active;

            // Does this need to be here?
            // Admin contact
            let contact = new Contact({id: res.locals.contact.id});
            await contact.find(connection);

            let maintenance = new MaintenanceRequest({id: params.maintenance_id});
            await maintenance.find(connection, company.id);
            await maintenance.getThread(connection, company.id);

            //await maintenance.verifyChatAccess(connection, company, contact);

            // Only update if its not already read.
            if(!maintenance.Thread[0].read){
                await maintenance.markRead(connection);
                eventEmitter.emit('chat_read', {company, contact, maintenance, cid: res.locals.company_id, locals: res.locals});
            }

            utils.send_response(res, {
                status: 200,
                data: {}
            });



        } catch(err) {
            next(err);
        }



    })

    router.post('/search', control.hasAccess(['admin']), async(req, res, next) => {
        var connection = res.locals.connection;

        try{
            var company = res.locals.active;
            var body = Hash.clarify(req.body);

            let report = new Report({
                name: body.type + '_' + moment().format('x'),
                type: 'maintenance',
                format: 'web',
                filters: body,
                connection: connection,
                company: company
            });

            await report.generate();

            utils.send_response(res, {
                status: 200,
                data: {
                    maintenance: Hash.obscure(report.reportClass.data, req),
                    result_count: report.reportClass.result_count
                }
            });

        } catch(err){
            next(err)
        }


    });

    router.get('/types', control.hasAccess(['admin','tenant']), async(req, res, next) => {


        var connection = res.locals.connection;

        try{
            var query = Hash.clarify(req.query);
            let contact = res.locals.contact;
            let company = res.locals.active;

            let types = [];
            if(query.lease_id){

              let lease = new Lease({id: query.lease_id })
              await lease.find(connection);
              await lease.canAccess(connection, company.id, res.locals.properties)

              types = await models.MaintenanceType.findByLeaseId(connection, lease.id);
            } else {
              types = await MaintenanceRequest.findAll(connection, res.locals.properties);

            }

            console.log("types", types);
            utils.send_response(res, {
                status: 200,
                data: {
                    types: Hash.obscure(types, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/extras', control.hasAccess(['admin','tenant']), async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let query = Hash.clarify(req.query);


            let lease = new Lease({id: query.lease_id });
            await lease.find(connection);
            await lease.canAccess(connection, company.id, res.locals.properties);

            let property = await models.Property.findByLeaseId(connection, lease.id);
            if(!property) e.th(500);
            let extras = await models.MaintenanceExtra.findByPropertyId(connection, property.id);



            utils.send_response(res, {
                status: 200,
                data: {
                    extras: Hash.obscure(extras, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/', [control.hasAccess(['admin','tenant']), control.hasPermission('manage_maintenance')], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = new Contact({id: res.locals.contact.id});
            let company = res.locals.active;

            try{
                req.body.extras = JSON.parse(req.body.extras);
            } catch(err){
                req.body.extras = [];
            }

            let body = Hash.clarify(req.body);
            let files = req.files;

            if(validator.isEmpty(body.content)) {
                e.th(400, "Please describe the issue");
            };

            await contact.find(connection, company.id);

            let lease = new Lease({id: body.lease_id});
            await lease.find(connection)
            await lease.canAccess(connection, company.id, res.locals.properties);

            let maintenance = new MaintenanceRequest();

            body.source = 'user account';
            await connection.beginTransactionAsync();

            await maintenance.create(connection, body, lease, contact, company, files);
            await connection.commitAsync();

          utils.send_response(res, {
              status: 200,
              data: {
                  maintenance_id: Hashes.encode(maintenance.id, res.locals.company_id)
              },
              msg: 'Your maintenance request has been saved. Someone will be in touch shortly'
          });

            eventEmitter.emit('maintenance_request_created', {company, contact, maintenance, lease, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }



    });

    router.post('/:maintenance_id/message', control.hasAccess(['admin','tenant']), async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let params = Hash.clarify(req.params);
            let body = Hash.clarify(req.body);
			let property_id = params.property_id;
			let space = params.space;
            let company = res.locals.active;

            let contact = res.locals.contact;

            let maintenance = new MaintenanceRequest({id: params.maintenance_id});
            await maintenance.find(connection, company.id);

            await maintenance.getLease(connection, company);
            await maintenance.verifyAccess(connection, company, res.locals.properties);


            await connection.beginTransactionAsync();

            let message = maintenance.makeMessage(contact, body);
            await maintenance.saveMessage(connection, message);

          //let interaction = new Interaction();
          //await interaction.create(connection, property_id, space, maintenance.contact_id, message.contact_id, moment.utc().format('YYYY-MM-DD HH:mm:ss'), message.content, 'message', null, message.id, null, null, body.context, null, true);


            if(message.label !== 'message'){
                await maintenance.updateStatus(connection, message);
            }

            await maintenance.uploadFileToMessage(connection, company, contact, message, req.files);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    id: Hashes.encode(message.id, res.locals.company_id)
                }
            });

            eventEmitter.emit('maintenance_request_updated', {company, contact, maintenance, message, cid: res.locals.company_id, locals: res.locals});



        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }




    });

    router.get('/:maintenance_id', control.hasAccess(['admin', 'tenant']), async (req, res, next) => {

        //TODO make sure tenants can view this message

        var connection = res.locals.connection;
        try{

            let query = Hash.clarify(req.query);
            let params = Hash.clarify(req.params);

            let company = res.locals.active;
            let contact = new Contact({id: res.locals.contact.id});
            await contact.find(connection);

            let maintenance = new MaintenanceRequest({id: params.maintenance_id});
            await maintenance.find(connection, company.id);
            await maintenance.getLease(connection, company);
            if(maintenance.type === 'Maintenance Request'){
                await maintenance.verifyAccess(connection, company, res.locals.properties);
            }
            await maintenance.getThread(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    contact: Hash.obscure(res.locals.contact, req),
                    maintenance:  Hash.obscure(maintenance, req),
                    severity: Hash.obscure(maintenance.severityCodes, req),
                }
            });


        } catch(err) {
            next(err);
        }


    });

    // need to test
    router.post('/incoming', async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            let body = Hash.clarify(req.body);

            if(typeof body.mandrill_events == 'undefined') next();

            let details = JSON.parse(body.mandrill_events);

            for(let i = 0; i < details.length; i++ ){
                let detail = details[i];

                // get maintenance from  subject line
                let maintenance_match = detail.msg.subject.match(/#([a-zA-Z0-9]{10})$/);

                if(!maintenance_match || maintenance_match.length !==  2){
                    e.th(500,"Maintenance id not found" );
                }

                let maintenance_id = Hashes.decode( maintenance_match[1])[0];
                let maintenance = new MaintenanceRequest({id: maintenance_id});
                let company_id = await maintenance.getCompanyId(connection);

                let company = new Company({id: company_id});
                await company.find(connection);

                await maintenance.find(connection, company_id);
                await maintenance.getLease(connection);


                console.log("maintenance.Lease", maintenance.Lease);

                if(!maintenance.Lease.Tenants){
                    e.th(500, "Contact not found")
                }

                let matchedContact = maintenance.Lease.Tenants.find(t => t.Contact.email == detail.msg.from_email);

                if(!matchedContact) {
                    e.th(500, "Contact not found")
                }

                let contact = new Contact({id: matchedContact});
                await contact.find(connection);
                await contact.verifyAccess(company.id, company_id);

                let data = {
                    source: 'email-reply',
                    label: 'message',
                    content: replyParser(detail.msg.text, true)
                };

                let message = maintenance.makeMessage(matchedContact, data);
                await maintenance.saveMessage(connection);
                eventEmitter.emit('maintenance_request_updated', {company, contact, maintenance, message, cid: res.locals.company_id, locals: res.locals});
            }

            utils.send_response(res, {
                status: 200,
                data: {}
            });


        } catch(err) {
            next(err);
        }









        // var connection;
        // var maintenanceRequest = {};
        // var maintenance_id;
        //
        // var contact = {};
        // var company;
        // var jobParams = [];;
        // if(typeof req.body.mandrill_events == 'undefined') next();
        // pool.getConnectionAsync()
        //     .then(function(conn) {
        //         connection = conn;
        //
        //         var details = JSON.parse(req.body.mandrill_events);
        //         var data = {};
        //
        //         return Promise.mapSeries(details, message => {
        //
        //             data = {
        //                 from: message.msg.from_email,
        //                 subject: message.msg.subject, // put message id in here...
        //                 received: message.msg.headers.Date,
        //                 mandrillMessageId: message.msg.headers["Message-Id"],
        //                 text: replyParser(message.msg.text, true)
        //             };
        //
        //             var maintenance_match = message.msg.subject.match(/#([a-zA-Z0-9]{10})$/);
        //
        //             if(maintenance_match && maintenance_match.length == 2){
        //                 maintenance_id = maintenance_match[1];
        //             } else {
        //                 e.th(500,"Maintenance id not found" )
        //             }
        //
        //             try{
        //                 maintenance_id = Hashes.decode(maintenance_id)[0];
        //             } catch(err){
        //                 e.th(500)
        //             }
        //
        //             if(!maintenance_id) return;
        //
        //             return models.Maintenance.findCompanyId(connection, maintenance_id)
        //                 .then(cid => models.Company.findById(connection, cid))
        //                 .then(c => {
        //                     company = c;
        //                     maintenanceRequest = new MaintenanceRequest({id: maintenance_id});
        //                     return maintenanceRequest.find(connection, company.id)
        //                 })
        //                 .then(() => maintenanceRequest.getLease(connection))
        //                 .then(() => {
        //
        //                     var matchedContact = maintenanceRequest.Lease.Tenants.filter(t => t.Contact.email == message.msg.from_email);
        //
        //                     if(!matchedContact.length) {
        //                         e.th(500, "Contact not found")
        //                     }
        //
        //                     contact = matchedContact[0];
        //
        //                     var subMessage = {
        //                         maintenance_id: maintenance_id,
        //                         contact_id: contact.id,
        //                         content: data.text,
        //                         send_to: null,
        //                         date: moment().format("YYYY-MM-DD HH:mm:ss"),
        //                         source: 'external',
        //                         label: 'message'
        //                     };
        //
        //                     return models.Maintenance.saveSubmessage(connection, subMessage);
        //
        //                 }).then(subMessageId => {
        //
        //                     var activity = new Activity();
        //                     return activity.create(connection,company.id,contact.id,3,34, maintenance_id)
        //                         .then(() => subMessageId)
        //
        //                 }).then(function(subMessageId) {
        //
        //                     jobParams.push({
        //                         category: 'maintenance',
        //                         data: {
        //                             id: subMessageId,
        //                             action: 'email',
        //                             label: 'notify',
        //                             domain: company.subdomain
        //                         }
        //                     });
        //                     return Scheduler.addJobs(jobParams, function(err){
        //                         if(err) console.log(err);
        //                         res.send('ok');
        //                     });
        //                 })
        //
        //             })
        //
        //     })
        //     .catch(err => {
        //         res.send('ok');
        //     })
        //     .finally(() => utils.closeConnection(pool, connection))


            // if message but no email, add user email and add to message
            // if email but no message, add as new message on account, and open a ticket

    });

    return router;

};


