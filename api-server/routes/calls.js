var express     = require('express');
var router      = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');

var jwt = require('jsonwebtoken');
var models = require(__dirname + '/../models');

var Activity  = require(__dirname + '/../classes/activity.js');
var Notification  = require(__dirname + '/../classes/notification.js');
var Company  = require(__dirname + '/../classes/company.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var DeliveryMethod    	= require('../classes/property.js');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Lead  = require(__dirname + '/../classes/lead.js');
var Interaction  = require(__dirname + '/../classes/interaction.js');
var Maintenance  = require(__dirname + '/../classes/maintenance_request.js');
var request = require('request');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var validator = require('validator');

var control    = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');

var e  = require(__dirname + '/../modules/error_handler.js');


const twilio = require('twilio');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

module.exports = function(app, sockets) {


  /* TODO: Is this deprecated */
	router.post('/incoming', function(req, res, next) {

		var company = {};
    var connection = res.locals.connection;
		var contacts = [];
		var contact = {};
		var toNotify = {};
		var body = req.body;
		var VoiceResponse = twilio.twiml.VoiceResponse;
		var twilioRedirect;


    var called = body.Called.slice(2);

    models.Setting.findByCompanySetting(connection, 'twilioPhone', called )
    .then(c => {
			if(!c) throw new Error("Company not found");
			company = new Company({id: c.company_id});
			return company.find(connection);
		}).then(() => {

			if(!body.Caller) return; // No Caller ID.

			body.Caller = body.Caller.indexOf('+1') === 0 ?  body.Caller.slice(2): body.Caller;

			return models.Contact.findByPhone(connection, body.Caller, company.id).then(c => {
				if(!c.length) return; // no contact found, new caller
				// multiple contacts found
				if(c.length > 1) {
					contacts = c;
					return;
				}

				if(c.length === 1) { // one contact found
					contact = new Contact({id: c[0].id });
					return contact.find(connection)
            .then(() => contact.verifyAccess(company.id))
						// .then(() => contact.getLeases)
				}
			})
		}).then(() => {

			// find Out Where to redirect the call
			return models.Setting.findCompanySetting(connection, 'twilioRedirect', company.id)

		}).then(redirectNumber => {

			twilioRedirect = redirectNumber.value;

			return models.Setting.findCompanySetting(connection, 'incomingCalls', company.id ).then(n => {

				toNotify = new Contact({id: n.value});
				return toNotify.find(connection)
          .then(() => contact.verifyAccess(company.id))
			})
		}).then(() => {
			// push to frontend
			var socket = new Socket({
				token: req.headers['authorization'],
				contact_id: toNotify.id,
				company_id: company.id
			});

			var payload = {
				contact: Hash.obscure(contact, req),
				contacts: Hash.obscure(contacts, req),
				callSid: body.CallSid,
				callStatus: body.CallStatus,
				caller: body.Caller
			};

			socket.createEvent("incomingCall", payload);
			// sockets.sendAlert("incomingCall", toNotify.id, {
			// 	contact: Hash.obscure(contact),
			// 	contacts: Hash.obscure(contacts),
			// 	callSid: body.CallSid,
			// 	callStatus: body.CallStatus,
			// 	caller: body.Caller
			// });

			const response = new VoiceResponse();
			const dial = response.dial({
				callerId: body.Caller,
				action: '/v1/calls/status-change',
				statusCallbackEvent: ['initiated', 'ringing','answered', 'completed'],
				statusCallback:  '/v1/calls/status-change',
			});
			console.log('twilioRedirect', '+'+ twilioRedirect);

			dial.number('+'+ twilioRedirect);
			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.end(response.toString());

		})

		.catch(err=>{
			console.log(err);
			console.log(err.stack);
			utils.send_response(res, {
				status: 200
			});

		})


	});

	router.post('/sms-incoming', async (req, res, next) => {


    try{
      var connection = res.locals.connection;
		  let body = req.body;

			let called = body.To.slice(2);
		  let VoiceResponse = twilio.twiml.VoiceResponse;
			let company_setting =  await models.Setting.findByCompanySetting(connection, 'twilioPhone', called );
      let contact = {};
      let contact_type = '';
      if(!company_setting) e.th(400, "Company not found"); // todo log message?
      let property_id = company_setting.property_id;

      let company = new Company({id: company_setting.company_id});
      await company.find(connection);

      if(!body.From) e.th(400, "This is not from anyone");
        // save new lead
      let from = body.From.indexOf('+1') === 0 ?  body.From.slice(1): body.From;

      let contacts = await models.Contact.findByPhone(connection, from, company.id);

      if(contacts.length > 1){ // we found multiple, what do we do?
        // lets look for first current tenant
        //TODO fix when we have a rule
        contact = new Contact({id: contacts[0].id });
        await contact.find(connection).then(() => contact.verifyAccess(company.id))
        // lets look for most recent addition

      } else if (contacts.length === 1){
        // We found our guy
        contact = new Contact({id: contacts[0].id });
        await contact.find(connection).then(() => contact.verifyAccess(company.id))

      } else {
        // new lead!  can we get their name?
        // if not save with no name?
        contact = new Contact();
        contact.company_id = company.id;
        contact.first = "";
        contact.last = "";
        contact.Phones = [{
          type: "Phone",
          sms: true,
          phone: from
        }];
        await contact.save(connection);

        let lead = new Lead({
          contact_id: contact.id,
          property_id: property_id,
          content: body.Body,
          created: moment().format('YYYY-MM-DD HH:mm:ss'),
          extras: '',
          source: "SMS",
          subject: "",
          status: 'new',
		  created_by: res.locals.contact && res.locals.contact.id,
		  modified_by: res.locals.contact && res.locals.contact.id,
          opened: null
        });

        await lead.save(connection);
      }

	  let deliveryMethod = new DeliveryMethod();
      await deliveryMethod.findByGdsKey(connection, 'standard_sms');

      //Enter Interaction
      let interaction = new Interaction();
	  let pinned = 0;
	  let read = 0;
	  await interaction.create(connection, property_id, 'Tenant', contact.id, contact.id, body.Body, deliveryMethod.id, pinned, body.context, read, null, null, contact.id, null, null, null, null);

	  let smsMethod = new Sms({
        interaction_id: interaction.id,
        message: body.Body
      })

      await smsMethod.save(connection);

      let role_setting = await models.Setting.findCompanySetting(connection, 'incomingCalls', company.id );

      if(role_setting){

        try {
          let roles = JSON.parse(role_setting.value);

          // get roles for this company at this facility;
          let admins = await company.findRolesAtProperty(connection, roles, property_id);

          for(let i = 0; i < admins.length; i++){
            let socket = new Socket();

            await socket.isConnected(admins[0].contact_id);

            if(!socket.connected) continue;

            socket.company_id = company.id;
            socket.contact_id = admins[0].contact_id;
            var payload = {
              contact_id: contact.id,
              name: contact.first + ' ' + contact.last,
              message: body.Body,
            };

            socket.createEvent("incomingText", payload);


            //* send sms if not logged in */
            // return models.Setting.findCompanySetting(connection, 'twilioSMSRedirect', company.id).then(redirectNumber => {
            //   if(!company.Settings.twilioPhone) return;
            //
            //   return twilioClient.messages.create({
            //     to:  settings.is_prod ? '+1' + redirectNumber.value : '+13234198574', // Any number Twilio can deliver to
            //     from: '+1' + company.Settings.twilioPhone, // A number you bought from Twilio and can use for outbound communication
            //     body: "Someone has sent you a chat message, click here to view it: " + settings.getBaseUrl(company.subdomain) + '/chats?id=' + Hashes.encode(sms_thread.id)
            //   }).then(message => console.log(message.sid))
            // })
          }


        } catch(err){


        }
      }



      // move to events
      // let activity = new Activity();
      // return activity.create(connection,company.id, contact.id, 2, 56, contact.id, body.Body, moment.utc(body.created).format('YYYY-MM-DD HH:mm:ss'));

      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end();


    } catch(err) {
      next(err);
    }



	});

	/* Todo: Is this deprecated? */
	router.post('/status-change', function(req, res, next) {

		var company = {};
    var connection = res.locals.connection;
		var contacts = [];
		var contact = {};
		var toNotify = {};
		var body = req.body;
		var VoiceResponse = twilio.twiml.VoiceResponse;

    var called = body.Called.slice(2);
    models.Setting.findByCompanySetting(connection, 'twilioPhone', called ).then(c => {
			if(!c) throw new Error("Company not found");
			company = new Company({id: c.company_id});
			return company.find(connection);
		}).then(() => {

			// find Out Who to notify
			return models.Setting.findCompanySetting(connection, 'incomingCalls', company.id ).then(n => {
				toNotify = new Contact({id: n.value});
				return toNotify.find(connection).then(() => contact.verifyAccess(company.id))

			})
		}).then(() => {
			// push to frontend
			var socket = new Socket({
				token: req.headers['authorization'],
				contact_id: toNotify.id,
				company_id: company.id
			});

			var payload = {
				callSid: body.CallSid,
				callStatus: body.CallStatus,
			};

			socket.createEvent("callStatusUpdate", payload);
			// sockets.sendAlert("callStatusUpdate", toNotify.id, {
			// 	callSid: body.CallSid,
			// 	callStatus: body.CallStatus,
			// });


			const response = new VoiceResponse();
			response.hangup();
			res.writeHead(200, { 'Content-Type': 'text/xml' });
			res.end(response.toString());
			//res.end();
		})

		.catch(err=>{
			console.log(err);
			console.log(err.stack);
			utils.send_response(res, {
				status: 200
			});

		})

	});



	return router;

};
