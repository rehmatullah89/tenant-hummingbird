const express = require('express');
const router = express.Router();
const moment = require('moment');

const settings = require(__dirname + '/../config/settings.js');
const utils = require(__dirname + '/../modules/utils.js');
const models = require(__dirname + '/../models');

const Socket = require(__dirname + '/../classes/sockets.js');
const Phone_Call = require(__dirname + '/../classes/phone_call.js');
const Charm = require(__dirname + '/../classes/charm-integration.js');
const e  = require(__dirname + '/../modules/error_handler.js');
const control    = require(__dirname + '/../modules/site_control.js');
const Todo  = require(__dirname + '/../classes/todo.js');
const Event  = require(__dirname + '/../classes/event.js');
const Lease  = require(__dirname + '/../classes/lease.js');
const Enums = require(__dirname + '/../modules/enums.js');
const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();

const Call = require(__dirname + '/../modules/calls.js');

/*Added by BCT*/
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const rp = require('request-promise');
const headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

/*End Code*/

module.exports = function (app) {

    router.post('/event/socket/test', async(req, res, next)=> {
        const socket = new Socket({
                    company_id: 1,
                    contact_id: 2152,
                });
                const data = {
                            'accessToken':'accessToken',
                            'twiliodata':'twilio'
                        }
                const connected = await socket.isConnected(2152);
                if(!connected) return;
    
                await socket.createEvent("Incoming_call",data );

        console.log('Event Triggered')
        res.json({
        status: 200
        });

    });

    router.post('/token', control.hasAccess(['admin']), async (req, res, next) => {
        try{
            let url = `${settings.get_communication_app_url()}/charm/token/`;
            console.info(url);
            let generate_token = {
                uri: url, 
                headers,
                json: true,
                method: 'POST',
                body : req.body
            };  
            console.info('Generate Token');  
            let com_app_resp = await rp(generate_token);
            let token = com_app_resp.applicationData[process.env.COMMUNICATION_APP_KEY][0].data.token;
            console.log('token',token);
            res.json({
                status: 200,
                data:{
                token: token
                }
            });
        } 
        catch(err){
            next(err);
        }		
    });

    router.get('/reservations', [control.hasAccess(['admin']), control.hasPermission('mini_charm'), Hash.unHash], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const query = req.query;
        const loggedInUser = res.locals.contact;

        try {
            let data = [];
            
            let charm = new Charm({});

            let event_types = await Event.findEventTypes(connection, "task");

            let reservation_types = event_types.filter((type) => [Enums.EVENT_TYPES.LEAD.NEW_WEB_RESERVATION, Enums.EVENT_TYPES.LEAD.NEW_RESERVATION].includes(type.slug))

            let options = {
                event_type_ids: reservation_types.map((type) => type.id),
                limit: query.limit && query.limit > 0 ? query.limit : null,
                offset: query.offset && query.offset > 0 ? query.offset : null,
                is_read: 0
            };

            const properties = query.properties && query.properties.length > 0 ? query.properties.split(',').map((id) => Hashes.decode(id)[0]) : [];

            let reservations = await Todo.findForToday(connection, company.id, loggedInUser.id, query.all, options, properties);

            for (let i = 0; i < reservations.length; i++) {
                let t = reservations[i];

                if (!t.lease_id) continue;

                let lease = new Lease({id: t.lease_id});
                await lease.find(connection);
                await lease.getProperty(connection, company.id, properties);
                if (!lease.Property?.id || !properties.includes(lease.Property.id)) continue;

                await lease.getTenants(connection);

                const user = lease.Tenants && lease.Tenants.length ? lease.Tenants[0].Contact: {};

                const transformedData = charm.transformData("reservation", {
                    id: t.id,
                    contact_unknown: !user?.id,
                    contact_id: user.id,
                    property_id: lease.Property ? lease.Property.id : null,
                    contact_name: charm.formatUserName(user),
                    contact_status: user.status,
                    contact_email: user.email,
                    communication_time: moment(t.created_at).format('YYYY-MM-DDTHH:mm:ss+00:00'),
                    reservation_id: t.id,
                    reservation_move_in_date: lease.start_date,
                    reservation_in_store_price: lease.Unit ? lease.Unit.default_price : null,
                    reservation_web_only_price: lease.Unit ? lease.Unit.price : null,
                    time: moment(t.created_at).format('YYYY-MM-DDTHH:mm:ss+00:00'),
                    showToast: true,
                });

                data.push(transformedData);
            }
            // sorted in descending order (newest first)
            const result = data.sort((a, b) => new Date(a.communication_time) < new Date(b.communication_time) ? 1 : -1);

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(result, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/reservation/:reservation_id', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const loggedInUser = res.locals.contact;
        const params = req.params;

        try {
            const reservation_id = Hashes.decode(params.reservation_id)[0];

            let event_types = await Event.findEventTypes(connection, "task");

            let reservation_types = event_types.filter((type) => [Enums.EVENT_TYPES.LEAD.NEW_WEB_RESERVATION, Enums.EVENT_TYPES.LEAD.NEW_RESERVATION].includes(type.slug))

            let options = {
                id: reservation_id,
                event_type_ids: reservation_types.map((type) => type.id),
            };

            let reservations = await Todo.findForToday(connection, company.id, loggedInUser.id, null, options);
            if (!reservations || !reservations[0].lease_id) e.th(409, 'Invalid Reservation Id');

            const reservation = reservations[0];
            
            let charm = new Charm({});

            let lease = new Lease({id: reservation.lease_id});
            await lease.find(connection);
            await lease.getProperty(connection, company.id);
            if (!lease.Property?.id) e.th(409, 'Invalid Reservation');

            await lease.findUnit(connection);
            await lease.getTenants(connection);
            await lease.findTransfer(connection);
            await lease.findAuction(connection, lease.Property.company_id);
            if (lease.Transfer) await lease.Transfer.findTransferBy(connection);

            const units = [];

            if (lease.Unit) {
                units.push({
                    id: lease.Unit.id,
                    property_id: lease.Unit.property_id,
                    lease_id: lease.id,
                    type: lease.Unit.type,
                    number: lease.Unit.number,
                    address: charm.formatAddress(lease.Unit.Address),
                    status: "reserved"
                });
            }
            const scope = {
                details: true,
                access_codes: true,
                lead: true,
                relationships: true,
            }
            const { contact, access_codes, relationships, lead } = await charm.getContactDetails(connection, company.id, [lease.Property.id], lease.Tenants[0].contact_id, reservation.lease_id, scope);
            const { address, phone, alternate_phones } = charm.transformContact(contact);

            const transformedData = charm.transformData("reservation", {
                id: reservation.id,
                contact_unknown: !contact?.id,
                contact_id: contact.id,
                property_id: lease.Property ? lease.Property.id : null,
                phone_number: phone ? phone.phone : "",
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: contact.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: units,
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_time: moment(reservation.created_at).format('YYYY-MM-DDTHH:mm:ss+00:00'),
                communication_property: lead.Property?.name ? lead.Property.name : null,
                communication_source: lead.source,
                reservation_id: reservation.id,
                reservation_space_information: `${lead.Unit?.label ? lead.Unit.label : ''}${lead.Unit?.label && lead.Category?.name ? ', ' : ''}${lead.Category?.name ? lead.Category.name : ''}`,
                reservation_move_in_date: lease.start_date,
                reservation_in_store_price: lease.Unit ? lease.Unit.default_price : null,
                reservation_web_only_price: lease.Unit ? lease.Unit.price : null,
                time: moment(reservation.created_at).format('YYYY-MM-DDTHH:mm:ss+00:00'),
                showToast: true,
            });

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(transformedData, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/missed-calls', [control.hasAccess(['admin']), control.hasPermission('mini_charm'), Hash.unHash], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const query = req.query;

        try {
            let data = [];

            let options = {
                limit: query.limit && query.limit > 0 ? query.limit : null,
                offset: query.offset && query.offset > 0 ? query.offset : null,
                missed: true,
                direction: 'incoming'
            };

            let charm = new Charm({ status: ["no-answer", "canceled"] });
            let missedCalls = await charm.getPhoneCalls(connection, options);

            const properties = query.properties && query.properties.length > 0 ? query.properties.split(',').map((id) => Hashes.decode(id)[0]) : [];

            for (let i = 0; i < missedCalls.length; i++) {
                let t = missedCalls[i];

                if (!t.facility_id) continue;
                let property = await models.Property.findByGdsID(connection, t.facility_id) || {};

                if (!property?.id || !properties.includes(property.id)) continue;
                const { contact } = await charm.getContactDetails(connection, company.id, [property.id], t.contact_id);

                const transformedData = charm.transformData("missed", {
                    id: t.id,
                    contact_unknown: !t.contact_id,
                    contact_id: t.contact_id,
                    property_id: property.id,
                    phone_number: t.from_phone ? t.from_phone.replace( /^\D+/g, '') : "",
                    contact_name: charm.formatUserName(contact),
                    contact_status: contact.status,
                    contact_email: contact.email,
                    communication_time: t.time_stamp,
                    communication_property: property.name,
                    communication_source: t.source_tag,
                    time: t.time_stamp,
                    showToast: true,
                });

                data.push(transformedData);
            }
            // sorted in descending order (newest first)
            const result = data.sort((a, b) => new Date(a.communication_time) < new Date(b.communication_time) ? 1 : -1);

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(result, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/missed-call/:call_id', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const params = req.params;

        try {
            const call_id = Hashes.decode(params.call_id)[0];
            
            let charm = new Charm({});
            let phone_call = await charm.getPhoneCallById(connection, call_id);
            if (!phone_call || !phone_call.facility_id) e.th(409, 'Invalid Phone Call Id');

            let property = await models.Property.findByGdsID(connection, phone_call.facility_id) || {};
            if (!property?.id) e.th(409, 'Invalid Phone Call');

            const scope = {
                details: true,
                access_codes: true,
                units: true,
                relationships: true,
            }
            const { contact, access_codes, units, relationships } = await charm.getContactDetails(connection, company.id, [property.id], phone_call.contact_id, null, scope);
            const { address, phone, alternate_phones } = charm.transformContact(contact);

            const transformedData = charm.transformData("missed", {
                id: phone_call.id,
                contact_unknown: !phone_call.contact_id,
                contact_id: phone_call.contact_id,
                property_id: property.id,
                phone_number: phone_call.from_phone ? phone_call.from_phone.replace( /^\D+/g, '') : "",
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: contact.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: units,
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_time: phone_call.time_stamp,
                communication_property: property.name,
                communication_source: phone_call.source_tag,
                time: phone_call.time_stamp,
                showToast: true,
            });

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(transformedData, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/voicemails', [control.hasAccess(['admin']), control.hasPermission('mini_charm'), Hash.unHash], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const query = req.query;

        try {
            let data = [];

            let options = {
                limit: query.limit && query.limit > 0 ? query.limit : null,
                offset: query.offset && query.offset > 0 ? query.offset : null,
            };

            let charm = new Charm({ status: ["no-answer"] });
            let voiceMails = await charm.getVoiceMails(connection, options);

            const properties = query.properties && query.properties.length > 0 ? query.properties.split(',').map((id) => Hashes.decode(id)[0]) : [];

            for (let i = 0; i < voiceMails.length; i++) {
                let t = voiceMails[i];

                if (!t.facility_id) continue;
                let property = await models.Property.findByGdsID(connection, t.facility_id) || {};

                if (!property?.id || !properties.includes(property.id)) continue;
                const { contact } = await charm.getContactDetails(connection, company.id, [property.id], t.contact_id);

                const transformedData = charm.transformData("voicemail", {
                    id: t.id,
                    contact_unknown: !t.contact_id,
                    contact_id: t.contact_id,
                    property_id: property.id,
                    phone_number: t.from_phone ? t.from_phone.replace( /^\D+/g, '') : "",
                    contact_name: charm.formatUserName(contact),
                    contact_status: contact.status,
                    contact_email: contact.email,
                    communication_time: t.time_stamp,
                    communication_property: property.name,
                    communication_source: t.source_tag,
                    voicemail_url: t.recording_url,
                    time: t.time_stamp,
                    showToast: true,
                });

                data.push(transformedData);
            }
            // sorted in descending order (newest first)
            const result = data.sort((a, b) => new Date(a.communication_time) < new Date(b.communication_time) ? 1 : -1);

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(result, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/voicemail/:call_id', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const params = req.params;

        try {
            const call_id = Hashes.decode(params.call_id)[0];

            let charm = new Charm({});
            let phone_call = await charm.getPhoneCallById(connection, call_id);
            if (!phone_call || !phone_call.facility_id) e.th(409, 'Invalid Phone Call Id');

            let property = await models.Property.findByGdsID(connection, phone_call.facility_id) || {};
            if (!property?.id) e.th(409, 'Invalid Phone Call');

            const scope = {
                details: true,
                access_codes: true,
                units: true,
                relationships: true,
            }
            const { contact, access_codes, units, relationships } = await charm.getContactDetails(connection, company.id, [property.id], phone_call.contact_id, null, scope);
            const { address, phone, alternate_phones } = charm.transformContact(contact);

            const transformedData = charm.transformData("voicemail", {
                id: phone_call.id,
                contact_unknown: !phone_call.contact_id,
                contact_id: phone_call.contact_id,
                property_id: property.id,
                phone_number: phone_call.from_phone ? phone_call.from_phone.replace( /^\D+/g, '') : "",
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: contact.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: units,
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_time: phone_call.time_stamp,
                communication_property: property.name,
                communication_source: phone_call.source_tag,
                voicemail_url: phone_call.recording_url,
                time: phone_call.time_stamp,
                showToast: true,
            });

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(transformedData, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/contact/:contact_id', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;
        const params = req.params;
        const query = req.query;

        try {
            const contact_id = Hashes.decode(params.contact_id)[0];

            const fetchLead = query.scope === "message-center";

            let charm = new Charm({});
            const properties = await Call.getCharmEnabledPropertyIds(connection, company, res.locals.properties);

            const scope = {
                details: true,
                access_codes: true,
                units: true,
                lead: fetchLead,
                relationships: true,
            }
            const { contact, access_codes, units, relationships } = await charm.getContactDetails(connection, company.id, properties, contact_id, null, scope);
            const { address, phone, alternate_phones } = charm.transformContact(contact);

            let property_id;
            let property_name;
            let source;

            if (fetchLead) {
                const lead = contact.Leads.find((l) => l.property_id);
                if (lead) {
                    property_id = lead.property_id;
                    source = lead.source;
                } else {
                    property_id = properties.length ? properties[0] : null;
                }
                if (property_id) {
                    const property = await models.Property.findById(connection, property_id) || {};
                    property_name = property.name;
                }
            }

            const transformedData = charm.transformData("contact", {
                id: contact_id,
                contact_unknown: false,
                contact_id: contact_id,
                property_id: property_id,
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: contact.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: units,
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_property: property_name,
                communication_source: source,
                showToast: true,
            });

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(transformedData, req)
            });
        } catch (err) {
            next(err);
        }
    });

    router.put('/reservation/:id/read', [control.hasAccess(['admin']), control.hasPermission('mini_charm'), Hash.unHash], async (req, res, next) => {
        const connection = res.locals.connection;
        const id = req.params.id;

        try {
            let charm = new Charm({});
            await charm.setReservationAsRead(connection, id);

            utils.send_response(res, {
                status: 200,
                msg: "Reservation marked as read Successfully!"
            });
        } catch (err) {
            next(err);
        }
    });

    router.put(['/voicemail/:id/read', '/missed-call/:id/read'], [control.hasAccess(['admin']), control.hasPermission('mini_charm'), Hash.unHash], async (req, res, next) => {
        const connection = res.locals.connection;
        const id = req.params.id;

        try {
            let charm = new Charm({});
            await charm.setInteractionsAsRead(connection, id);

            utils.send_response(res, {
                status: 200,
                msg: "Interaction marked as read Successfully!"
            });
        } catch (err) {
            next(err);
        }
    });

    router.post('/hold', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        try{		
        let body = req.body;
        
        let url = `${settings.get_communication_app_url()}/charm/conference/${body.call_sid}/hold/`;
		console.info(url);
        let call_hold_unhold = {
            uri: url, 
            headers,
            json: true,
            method: 'POST',
            body : body
        };  
        console.info('Customer Hold Unhold');  
        let com_app_resp = await rp(call_hold_unhold);
        let data = com_app_resp.applicationData[process.env.COMMUNICATION_APP_KEY][0].data;
        console.log('data',data);
        let phone_evt = await models.Phone_Call.findPhoneEventByCallId(connection, data.customer_call_sid);
        console.log('phone_evt',phone_evt);
        let phone_call;
        if (phone_evt) {
            phone_call = new Phone_Call(phone_evt);
            phone_call.status = data.status;
            await phone_call.updatePhoneCallHoldStatus(connection);
        }
        res.json({
            status: 200
        });
        }catch(err) {
            next(err);
        }  
    });

    router.get('/subscriptions', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;

        try {
            const properties = await Call.findSubscriptions(connection, company);

            utils.send_response(res, {
                status: 200,
                data: {
                    properties: Hash.obscure(properties, req),
                }
            });
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    });

    router.put('/phonecall', [control.hasAccess(['admin'])], async (req, res, next) => {
        const connection = res.locals.connection;
        try {
            let data = req.body;
            let phone_call;
            console.log('Data', req.body);
            try {
                const charm = new Charm({});
                await charm.callAcceptCallback(data);

                const user_contact_id = Hashes.decode(data.contact_id)[0];
                let phone_evt = await models.Phone_Call.findPhoneEventByCallId(
                    connection,
                    data.call_sid
                );
                console.log('phone_evt' , phone_evt)
                if (phone_evt) {
                    phone_call = new Phone_Call(phone_evt);
                    phone_call.user_contact_id = user_contact_id;
                    await phone_call.savePhoneEvent(connection);
                }
                phone_evt = await models.Phone_Call.findPhoneEventByCallId(
                    connection,
                    data.agent_call_sid
                );
                if (phone_evt) {
                    phone_call = new Phone_Call(phone_evt);
                    phone_call.user_contact_id = user_contact_id;
                    await phone_call.savePhoneEvent(connection);
                }
            } catch (error) {
                e.th(400, error);
            }

            utils.send_response(res, {
                status: 200,
            });
        } catch (err) {
            next(err);
        }

    });
    router.post('/voicemails/send', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;

        try {
            const body = req.body;
            const propertyId = Hashes.decode(body.property_id)[0];
            const agentId = Hashes.decode(body.agent_id)[0];

            const charm = new Charm({});

            charm.sendEventToAdmins(connection, company.id, propertyId, "charm_send_to_voicemail", body);
            await charm.sendToVoicemail(body.call_sid, body);
            await charm.setPhoneCallAgentId(connection, body.call_sid, agentId);

            utils.send_response(res, {
                status: 200,
            });
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    });

    router.post('/outgoing', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const company = res.locals.active;

        try {
            const body = req.body;
            const property_id = Hashes.decode(body.property_id)[0];

            const property = await models.Property.findById(connection, property_id, company.id) || {};
            await rp({
                uri: `${settings.get_communication_app_url()}/charm/owners/${company.gds_owner_id}/facilities/${property.gds_id}/calls/customer/`,
                headers,
                json: true,
                method: 'POST',
                body: {
                    To: body.To,
                    agent_id: body.agent_id
                }
            });

            res.json({
                status: 200,
            });
        } catch(err) {
            next(err);
        }
    });   

    router.post('/agent/available', [control.hasAccess(['admin'])], async (req, res, next) => {
        const company = res.locals.active;

        try {
            const body = req.body;
            console.log('req.body', req.body)
            const charm = new Charm({});
            const response = await charm.setAvailableAgents(company, body);
            
            utils.send_response(res, {
                status: 200,
                data: response
            });
            } catch(err) {
                console.log("error", err)
                next(err);
            }
    });
      


    router.get('/agent/available', [control.hasAccess(['admin'])], async (req, res, next) => {  
        const company = res.locals.active;
        try {
            const charm = new Charm({});
            const response = await charm.getAgentAvailability(company, req.query.agent_id); 
            let available
            if(response){
                if(response.applicationData[process.env.COMMUNICATION_APP_KEY][0].data.agent_details.length>0){
                     available =   response.applicationData[process.env.COMMUNICATION_APP_KEY][0].data.agent_details.filter(ele=>{
                        if(ele.availability=='available'){
                            return ele 
                        }
                   })                }
                 
            }
            utils.send_response(res, {
                status: 200,
                data: {available: available.length ? true : false }
            });
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    })
    router.post('/voicemail-settings', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
      
        const company = res.locals.active;
        try {
            const body = req.body;
            const charm = new Charm({});
            const {facility,voicemail_text,voice_type} = body
            let owner_id=company.gds_owner_id
           
            if(voicemail_text && voice_type){
                const response = await charm.updateVoiceMailSettings(company, {facility_id:facility,voicemail_text,voice_type,owner_id} );
                utils.send_response(res, {
                    status: 200,
                    data: response
                });
            }else{
                e.th(400, "Please Provide voicemail_text/voice_type");
            }
        
            } catch(err) {
                console.log("error", err)
                next(err);
            }
        
    });
    router.get('/voicemail-settings', [control.hasAccess(['admin']),Hash.unHash], async (req, res, next) => {
        const company = res.locals.active;
        try {
            const charm = new Charm({});
            const connection = res.locals.connection;
            if(await  Call.isCharmEnabledForProperty(connection, company, req.query.property_id)){

                     if(req.query?.facility){

                            let response = await charm.getVoiceMail(company,req.query.facility)
                            if(response.applicationData[process.env.COMMUNICATION_APP_KEY][0].voicemail_text){
                                utils.send_response(res, {
                                    status: 200,
                                    data:  response.applicationData[process.env.COMMUNICATION_APP_KEY][0]
                                });
                            }else{
                                e.th(400, "Something went wrong");
                            }
                            
           
                        
                }else{
                    e.th(400, "Please Provide Facility_id");
                }
                 
              
            }else{
                e.th(400, "Property not subscribed for Charm")
           }
            
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    })   
    router.post('/end', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        try{		
        let body = req.body;
        
        let url = `${settings.get_communication_app_url()}/charm/conference/${body.call_sid}/calls/hangup/`;
		console.info(url);
        let agent_call_hungup = {
            uri: url, 
            headers,
            json: true,
            method: 'POST',
            body : body
        };  
        console.info('Agent hung up!!');  
        let com_app_resp = await rp(agent_call_hungup);
        console.log('Agent hung up data',com_app_resp);
        res.json({
            status: 200
        });
        }catch(err) {
            next(err);
        }  
    });

    router.put('/contact/:contact_id/additional-contact', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const params = req.params;

        try {
            const body = req.body;
            const contact_id = Hashes.decode(params.contact_id)[0];
            const related_contact_id = Hashes.decode(body.related_contact_id)[0];
            const lease_id = body.lease_id ? Hashes.decode(body.lease_id)[0] : null;

            const charm = new Charm({});

            await charm.createRelationship(connection, contact_id, related_contact_id, lease_id);

            utils.send_response(res, {
                status: 200,
            });
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    });

    router.put('/contact/:contact_id/additional-phone', [control.hasAccess(['admin']), control.hasPermission('mini_charm')], async (req, res, next) => {
        const connection = res.locals.connection;
        const params = req.params;

        try {
            const body = req.body;
            const contact_id = Hashes.decode(params.contact_id)[0];

            const charm = new Charm({});

            await charm.addAdditionalPhone(connection, contact_id, body);

            utils.send_response(res, {
                status: 200,
            });
        } catch(err) {
            console.log("error", err)
            next(err);
        }
    });

    return router;
};
