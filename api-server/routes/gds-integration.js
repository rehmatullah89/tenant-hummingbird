var express = require('express');
var router = express.Router();
var moment = require('moment');

var settings = require(__dirname + '/../config/settings.js');
var utils = require(__dirname + '/../modules/utils.js');
var models = require(__dirname + '/../models');

var Company = require(__dirname + '/../classes/company.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Socket = require(__dirname + '/../classes/sockets.js');
var Lead = require(__dirname + '/../classes/lead.js');
var Property = require(__dirname + '/../classes/property.js');
var Charm = require(__dirname + '/../classes/charm-integration.js');
var Phone_Call = require(__dirname + '/../classes/phone_call.js');
var Mail = require(__dirname + '/../classes/mail.js');
var Email = require(__dirname + '/../classes/email.js');
var DeliveryMethod    	= require(__dirname + '/../classes/delivery_method.js');

var Event = require(__dirname + '/../classes/email.js');
var Sms = require(__dirname + '/../classes/sms.js');
var Interaction = require('../classes/interaction');
var Hash = require(__dirname + '/../modules/hashes.js');
var e = require(__dirname + '/../modules/error_handler.js');
var Hashes = Hash.init();
var e = require(__dirname + '/../modules/error_handler.js');
var { getTenantId } = require('../modules/gds_translate');
var Schema = require(__dirname + '/../validation/units.js');
const joiValidator = require('express-joi-validation')({
  passError: true
});

const { gds_events } = require('../helpers/gds_events');

var control = require(__dirname + '/../modules/site_control.js');
var eventEmitter = require(__dirname + '/../events/index.js');

/**
 * common handler for email events
 * status - spam, bounce, open, click
 */
const processCertifiedInteraction = async (connection, payload) => {

  //TODO log event received
  try {
    if (!payload.notification_id) {
      throw new Error(`notification_id not found in event`);
    }
  
    let notification_id = payload.notification_id;
  
    // sample event type -> 'urn:gds:schema:events:com.tenantinc:email-bounce'
    // let eventName = event.type.split('com.communication-app:')[1]
  
    // if (!gds_events.email.includes(eventName) &&  !gds_events.mail.includes(eventName)) {
    //   throw new Error(`unrecognized/invalid outbound event: "${eventName}"`);
    // }
  
    // console.log(`Email event received: notification id: ${notification_id}`);
  
    // TODO // await Interaction.findByMessageId(connection, payload.message_id);
    let interaction = new Interaction();
    await interaction.findByGDSNotificationId(connection, notification_id);
    
    if (payload.provider_response && payload.provider_response.Data) {
      // let provider_data = payload.provider_response.Data[0];
      let mail = new Mail({interaction_id: interaction.id});
      await mail.findByInteractionId(connection);
      if(Array.isArray(payload.documents) && payload.documents.length >0){
        mail.updateSrc(payload.documents);
      }
      
      await mail.save(connection)
    }

    if (payload.file_id) {
      let email = new Email({interaction_id : interaction.id});
      await email.findByInteractionId(connection);
      email.delivery_receipt_refid = payload.file_id;
      await email.save(connection);
    }
    
    let status = payload.status;
    interaction.status = status;
    await interaction.save(connection);
  
    //update interaction with status
    await interaction.saveStatusHistory(connection, status);
  } catch(err) {
    console.log("ERROR", err)
  }
  
};

module.exports = function (app, sockets) {

  router.get('/', function (req, res, next) {
    utils.send_response(res, {
      status: 200
    });

  });

  router.post('/', function (req, res, next) {
    utils.send_response(res, {
      status: 200
    });

  });

  router.post('/phone-call-event', async (req, res, next) => {

    var connection = res.locals.connection;
    try {
      console.log('body',req.body);
      let body = req.body;
      if (body.data.mini_charm_subscription_status == true) {
        console.log('body.RecordingStatus', body.RecordingStatus);
        if (body.data.voicemail_resp) {
          console.log('In if')
          let charm = new Charm({});
          let result = await charm.updateVoicemailURL(connection, body, res);
          if (result) {
            eventEmitter.emit('new_voicemail', result);
          }
        } else {
          console.log('In else')
          let charm = new Charm({});
          await charm.handlePhoneCallEvents(connection, body, req, res);
        }
      }
      else {
              let contact = {};
      let company = await models.Company.findByGdsID(connection, body.owner_id);
      if (company.length === 0) e.th(400, "Company not found");
      let company_id = company[0].id;

      let property = new Property({ gds_id: body.data.facility })
      await property.find(connection);
      let property_id = property.id;

      let contacts = await models.Contact.findByPhoneWithPropertyId(connection, body.data.from_phone.replace('+', ''), company_id, property_id);

      if(!contacts.length){
        contacts = await models.Contact.findByPhoneWithPropertyId(connection, body.data.from_phone.replace('+1', ''), company_id, property_id);
      }

      if(!contacts.length){
        contacts = await models.Contact.findByPhone(connection, body.data.from_phone.replace('+', ''), company_id);
      }

      if(!contacts.length){
        contacts = await models.Contact.findByPhone(connection, body.data.from_phone.replace('+1', ''), company_id);
      }

      if (contacts.length >= 1) {
        contact = new Contact({ id: contacts[0].id });
        await contact.find(connection, company_id);
      }
      else {

        // new lead!  can we get their name?
        // if not save with no name?
        contact = new Contact();
        contact.company_id = company_id;

        contact.first = "New";
        contact.last = "Lead";
        if (body.data.name) {
          let [first, last] = body.data.name.split(' ');
          contact.first = typeof first == "undefined" || first == "" ? "New" : first;
          contact.last = typeof last == "undefined" || last == "" ? "Lead" : last;
        }

        contact.Phones = [{
          type: "Phone",
          sms: true,
          phone: body.data.from_phone
        }];
        await contact.save(connection);

        let lead = new Lead({
          contact_id: contact.id,
          property_id: property_id,
          content: '',
          created: moment().format('YYYY-MM-DD HH:mm:ss'),
          extras: '',
          source: "Call",
          subject: "",
          status: 'active',
          created_by: res.locals.contact && res.locals.contact.id,
          modified_by: res.locals.contact && res.locals.contact.id,
          opened: null
        });

        await lead.save(connection);
      }

      let role_setting = await models.Setting.findCompanySetting(connection, 'incomingCalls', company_id);
      console.log("role_setting", role_setting);
      if (role_setting) {

        try {
          let roles = JSON.parse(role_setting.value);

          // get roles for this company at this facility;
          let company_obj = new Company({ id: company_id });
          let admins = await company_obj.findRolesAtProperty(connection, roles, property_id);

          for (var admin of admins) {
            let socket = new Socket();

            await socket.isConnected(admin.contact_id);

            if (!socket.connected) continue;
            socket.company_id = company_id;
            socket.contact_id = admin.contact_id;
            var payload = {
              contact: Hash.obscure(contact, req),
              contacts: Hash.obscure(contacts, req),
              callSid: body.data.call,
              callStatus: body.data.status,
              caller: body.data.name
            };
            console.log("creating socket");
            socket.createEvent("incomingCall", payload);
          }
        } catch (err) {
        }
      }
      let phone_evt = await models.Phone_Call.findPhoneEventByCallId(connection, body.data.call);
      let phone_call;
      if (phone_evt) {
        phone_call = new Phone_Call(phone_evt);
        phone_call.status = body.data.status;

        if (phone_call.status === "in-progress") {
          phone_call.start_time = body.data.timestamp;
        }

        if(phone_call.status === "completed"){
          if(body.data.duration){
            phone_call.duration = body.data.duration
          }
          else if(phone_call.start_time){
            var startTime = moment(phone_call.start_time, 'YYYY-M-DD HH:mm:ss')
            var endTime = moment(body.data.timestamp, 'YYYY-MM-DD HH:mm:ss')
            var secondsDiff = endTime.diff(startTime, 'seconds');
            phone_call.duration = secondsDiff;
          }
          else{
            phone_call.duration = null;
          }
          if(!phone_call.recording_url){
            phone_call.recording_url = body.data.recording;
          }
        } else {
          phone_call.duration = null;
        }
        if(!phone_call.source_tag){
          phone_call.source_tag = body.data.source_tag ? body.data.source_tag : null;
        }
      }
      else {
        phone_call = new Phone_Call({
          status: body.data.status,
          source_tag: body.data.source_tag,
          call_id: body.data.call,
          facility_id: body.data.facility,
          owner_id: body.data.owner,
          from_phone: body.data.from_phone,
          via_phone: body.data.via_phone,
          to_phone: body.data.to_phone,
          time_stamp: body.data.timestamp,
          name: body.data.name,
          recording_url: body.data.recording,
          notes: body.data.notes,
          zip_code: body.data.zip_code,
          duration: body.data.duration
        });
      }

      
      
      //Enter Interaction
      if (phone_call.status === 'completed') {
        let deliveryMethod = new DeliveryMethod()
        await deliveryMethod.findByGdsKey(connection, 'phone_call')

        let interaction = new Interaction();
        await interaction.create(connection, property_id, 'Tenant', contact.id, contact.id, null, deliveryMethod.id, null, body.context, null, null, null, contact.id, null, null, phone_call.status, null);
        phone_call.interaction_id = interaction.id
      }
      
      await phone_call.savePhoneEvent(connection);

      }

      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      next(err);
    }

  });

  router.post('/inbound-email', async (req, res, next) => {
    let payload = req.body;

    var connection = res.locals.connection;
    try {


      let contact = {};
      let company = await models.Company.findByGdsID(connection, payload.owner_id);
      if (company.length === 0) e.th(400, "Company not found");
      let company_id = company[0].id;

      let property = new Property({ gds_id: payload.facility_id })

      await property.find(connection);
      let property_id = property.id;

      let contacts = await models.Contact.findAllByEmailWithProperty(connection, payload.data.from.email, company_id, property_id);

      if(!contacts.length){
        contacts = await models.Contact.findAllByEmail(connection, payload.data.from.email, company_id);
      }

      if (contacts.length >= 1) {
        contact = new Contact({ id: contacts[0].id });
        await contact.find(connection, company_id);
      }
      else {
        contact = new Contact();
        contact.company_id = company_id;
        contact.first = "New";
        contact.last = "Lead";
        contact.email = payload.data.from.email;
        await contact.save(connection);

        let lead = new Lead({
          contact_id: contact.id,
          property_id: property_id,
          content: payload.data,
          created: moment().format('YYYY-MM-DD HH:mm:ss'),
          extras: '',
          source: 'Email',
          subject: "",
          status: 'active',
          opened: null,
          created_by: res.locals.contact && res.locals.contact.id,
          modified_by: res.locals.contact && res.locals.contact.id,
        });

        await lead.save(connection);
      }

      

      //Save entry to interactions as well.
      let deliveryMethod = new DeliveryMethod()
      await deliveryMethod.findByGdsKey(connection, 'standard_email')

      var interaction = new Interaction();

      let pinned = 0;
      let read = 0;
      await interaction.create(connection, property_id, 'Tenant', contact.id, contact.id, payload.data.html_body, deliveryMethod.id, pinned, null, read, null, null, contact.id, null, null, null, null)

      let email = new Event({
        interaction_id: interaction.id,
        subject: payload.data.subject,
        message: payload.data.text_body,
        email_address: payload.data.to && payload.data.to.length > 0 ? payload.data.to[0].email : "",
        from_name: payload.data.from.name,
        from_email: payload.data.from.email,
      });

      await email.save(connection);

      let role_setting = await models.Setting.findCompanySetting(connection, 'emailsSendReceive', company_id);

      if (role_setting) {

        try {

          let roles = JSON.parse(role_setting.value);

          // get roles for this company at this facility;
          let company_obj = new Company({ id: company_id });
          let admins = await company_obj.findRolesAtProperty(connection, roles, property_id);

          let socket = new Socket();
          for (var admin of admins) {

            await socket.contactIsConnected(admin.contact_id);
            if (!socket.connected) continue;
            socket.company_id = admin.company_id;
            socket.contact_id = admin.contact_id;

            socket.createEvent("incomingEmail", Hash.obscure({
              contact_id: email.contact_id,
              email_id: email.id,
              email_address: email.email_address,
              from_email: email.from_email,
              from_name: email.from_name,
              message: email.message,
              subject: email.subject,
              property_id: property_id,
              time: interaction.created,
              contact: {
                first: contact.first,
                last: contact.last
              },
              application: res.locals.contact

            }, { company_id: res.locals.company_id }));
          }
        } catch (err) {
          console.log("err", err)
        }
      }

      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }
  });

  router.post('/inbound-sms', async (req, res, next) => {
    let payload = req.body;
    var connection = null;

    try {
      connection = res.locals.connection;

      let contact = {};
      let company = await models.Company.findByGdsID(connection, payload.owner_id);
      if (company.length === 0) e.th(400, "Company not found");
      let company_id = company[0].id;

      let property = new Property({ gds_id: payload.facility_id })
      await property.find(connection);
      let property_id = property.id;

      let contacts = await models.Contact.findByPhoneWithPropertyId(connection, payload.data.from.replace('+', ''), company_id, property_id);
      if(!contacts.length){
        contacts = await models.Contact.findByPhoneWithPropertyId(connection, payload.data.from.replace('+1', ''), company_id, property_id);
      }

      if(!contacts.length){
        contacts = await models.Contact.findByPhone(connection, payload.data.from.replace('+', ''), company_id);
      }
      if(!contacts.length){
        contacts = await models.Contact.findByPhone(connection, payload.data.from.replace('+1', ''), company_id);
      }

      if (contacts.length >= 1) {
        contact = new Contact({ id: contacts[0].id });
        await contact.find(connection, company_id);
      } else {
        contact = new Contact();
        contact.company_id = company_id;
        contact.first = "New";
        contact.last = "Lead";
        contact.Phones = [{
          type: "Phone",
          sms: true,
          phone: payload.data.from.replace('+', '')
        }];
        await contact.save(connection);

        let lead = new Lead({
          contact_id: contact.id,
          property_id: property_id,
          content: payload.data,
          created: moment().format('YYYY-MM-DD HH:mm:ss'),
          extras: '',
          source: "SMS",
          subject: "",
          status: 'active',
          opened: null,
          created_by: res.locals.contact && res.locals.contact.id,
          modified_by: res.locals.contact && res.locals.contact.id,
        });

        await lead.save(connection);
      }
      let interaction = new Interaction();

      let deliveryMethod = new DeliveryMethod()
      await deliveryMethod.findByGdsKey(connection, 'standard_sms')

      let pinned = 0;
      let read = 0;
      await interaction.create(connection, property_id, 'Tenant', contact.id, contact.id, payload.data.body, deliveryMethod.id, pinned, null, read, null, null, contact.id, null, null, null, null)

      let smsMethod = new Sms({
        interaction_id: interaction.id,
        phone: payload.data.from.replace('+', ''),
        message: payload.data.body
      })

      await smsMethod.save(connection);

      await interaction.findContact(connection);
      await interaction.findEnteredBy(connection, company_id);


      utils.send_response(res, {
        status: 200
      });

      let role_setting = await models.Setting.findCompanySetting(connection, 'smsSendReceive', company_id);

      if (role_setting) {
        try {
          let roles = JSON.parse(role_setting.value);

          // get roles for this company at this facility;
          let company_obj = new Company({ id: company_id });
          let admins = await company_obj.findRolesAtProperty(connection, roles, property_id);

          let socket = new Socket();
          for (var admin of admins) {

            await socket.contactIsConnected(admin.contact_id);

            if (!socket.connected) continue;
            socket.company_id = admin.company_id;
            socket.contact_id = admin.contact_id;

            socket.createEvent("incomingSMS", Hash.obscure({
              contact_id: interaction.contact_id,
              interaction_id: interaction.id,
              message: interaction.content,
              sender_id: interaction.contact_id,
              property_id: property_id,
              contact: {
                first: interaction.Contact.first,
                last: interaction.Contact.last,
                status: interaction.Contact.status
              }

            }, { company_id: res.locals.company_id }));




          }
        } catch (err) {
          console.log(err.stack);
          console.log(err);
        }
      }
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }


  });

  router.post('/update-user-verification', [joiValidator.body(Schema.userVerification)], async (req, res, next) => {
    try {
      let payload = req.body;
      var connection = null;
      connection = res.locals.connection;
      let data = payload?.data;

      let tenantId = data?.tenantId;
      let facilityId = payload?.facility_id;
      utils.send_response(res, {
        status: 200,
        message: `Updated user verification details`,
        data: data
      });
      let pmsTenantId = Hashes.decode(await getTenantId(tenantId, facilityId));
      let contactId = await models.Contact.findById(connection, pmsTenantId?.[0]);
      let contact = new Contact({ id: contactId })
      await contact.updateUserVerification(connection, contact, data);
    }
    catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }
  });

  /**
   * 
   */
  router.post('/email-delivery', async (req, res, next) => {

    try {

      let payload = req.body;

      if (!payload) {
        throw new Error('no event data for email delivery:');
      }
      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-delivery')
      }

      await processCertifiedInteraction(connection, body);
      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }

  });

  router.post('/email-bounce', async (req, res, next) => {

    try {
      let payload = req.body;

      if (!payload) {
        throw new Error('no event data for email bounce:');
      }

      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-bounce')
      }

      await processCertifiedInteraction(connection, body);

      utils.send_response(res, {
        status: 200
      });
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }

  });

  router.post('/email-spam', async (req, res, next) => {

    try {
      let payload = req.body;

      if (!payload) {
        throw new Error('no event data for email spam:');
      }
      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-spam')
      }

      await processCertifiedInteraction(connection, body);
      utils.send_response(res, {
        status: 200
      });
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }

  });

  router.post('/email-open', async (req, res, next) => {

    try {
      let payload = req.body;

      if (!payload) {
        throw new Error('no event data for email open:');
      }
      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-open')
      }

      await processCertifiedInteraction(connection, body);

      utils.send_response(res, {
        status: 200
      });
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }

  });

  router.post('/email-click', async (req, res, next) => {

    try {
      let payload = req.body;

      if (!payload) {
        throw new Error('no event data for email click:');
      }
      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-click')
      }

      await processCertifiedInteraction(connection, body);
      utils.send_response(res, {
        status: 200
      });
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }
  });

  router.post('/certified-update', async (req, res, next) => {
    try {
      let body = req.body;

      if (!body) {
        throw new Error('no event data for email click:');
      }
      let connection = res.locals.connection;

      if (!connection) {
        throw new Error('no connection object available in res!: /email-click')
      }
      console.log("BODY:", body)
      await processCertifiedInteraction(connection, body.data);
      utils.send_response(res, {
        status: 200
      });
    } catch (err) {
      console.log(err.stack);
      console.log(err);
      next(err);
    }
  })

  return router;
};
