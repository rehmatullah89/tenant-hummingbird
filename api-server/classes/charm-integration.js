const moment = require('moment');

const models  = require(__dirname + '/../models');
const e  = require(__dirname + '/../modules/error_handler.js');
const settings = require(__dirname + '/../config/settings.js');
const Phone_Call = require(__dirname + '/../classes/phone_call.js');
const Contact = require(__dirname + '/../classes/contact.js');
const Socket = require(__dirname + '/../classes/sockets.js');
const Interaction = require(__dirname + '/../classes/interaction.js');
const Lead = require(__dirname + '/../classes/lead.js');
const Todo  = require(__dirname + '/../classes/todo.js');
const DeliveryMethod =  require('../classes/delivery_method.js');

const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
const rp = require('request-promise');
const headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

class Charm {
    constructor (data) {
        data = data || {};

        this.status = data.status;
        this.permissionSet = ["mini_charm"];
    }

    transformData (type, values) {
        return {
            id: values.id || null,
            status: type,
            contact_unknown: values.contact_unknown || false,
            contact_id: values.contact_id || null,
            property_id: values.property_id || null,
            phone_number: values.phone_number || null,
            contact_name: values.contact_name || null,
            contact_status: values.contact_status || "",
            contact_phone: values.contact_phone || null,
            contact_email: values.contact_email || null,
            contact_address: values.contact_address || null,
            contact_access_codes: values.contact_access_codes || [],
            contact_units: values.contact_units || [],
            alternate_phones: values.alternate_phones || [],
            alternate_contacts: values.alternate_contacts || [],
            communication_type: type,
            communication_time: values.communication_time || null,
            communication_property: values.communication_property || null,
            communication_source: values.communication_source || null,
            call_back_time: values.call_back_time || "",
            call_duration_time: values.call_duration_time || "0:00",
            hold_duration_time: values.hold_duration_time || "0:00",
            playback_url: values.playback_url || null,
            voicemail_url: values.voicemail_url || null,
            reservation_id: values.reservation_id || null,
            reservation_space_information: values.reservation_space_information || null,
            reservation_move_in_date: values.reservation_move_in_date || null,
            reservation_code: values.reservation_code || null,
            reservation_in_store_price: values.reservation_in_store_price ? `$ ${parseFloat(values.reservation_in_store_price).toFixed(2)}` : null,
            reservation_web_only_price: values.reservation_web_only_price ? `$ ${parseFloat(values.reservation_web_only_price).toFixed(2)}` : null,
            phone_number_added_to_selected_contact: values.phone_number_added_to_selected_contact || null,
            contact_added_to_selected_contact: values.contact_added_to_selected_contact || null,
            time: values.time || null,
            showToast: values.showToast || false,
        }
    }

    async hasPermission (connection) {
        const user_permissions = await models.Role.findAllPermissions(connection);
        const permissions = this.permissionSet;
        let hasPermission = false;
        for (let i = 0; i < permissions.length; i++) {
            if (user_permissions.find(p => p.label === permissions[i])) {
                hasPermission = true;
                break;
            }
        }
        return hasPermission;
    }

    async getAllConnectedContacts () {
        const socket = new Socket();
        return socket.connectedContacts();
    }

    async sendEventToAdmins (connection, company_id, property_id, event, payload, allowed_agents = [], restricted_agents = []) {
        const admins =  await models.Company.findCharmRolesAtCompany(connection, property_id);

        let availableAgents = allowed_agents;
        if (availableAgents.length === 0) {
            availableAgents = await this.getAllConnectedContacts();
        }
        const socket = new Socket();
        for (const admin of admins) {
            try {
                if (!restricted_agents.includes(admin.contact_id) && availableAgents.includes(admin.contact_id)) {
                    socket.company_id = company_id;
                    socket.contact_id = admin.contact_id;
                    socket.createEvent(event, payload);
                }
            } catch (err) {}
        }
    }

    formatUserName (user) {
        if (!user) {
            return "";
        }
        const fullName = [];
        if (user.first) fullName.push(user.first);
        if (user.middle) fullName.push(user.middle);
        if (user.last) fullName.push(user.last);
        return fullName.join(" ");
    }

    formatAddress (address) {
        if (!address) {
            return "";
        }
        const formatted_address = [];
        if (address.address) formatted_address.push(address.address);
        if (address.address2) formatted_address.push(address.address2);
        if (address.city) formatted_address.push(address.city);
        if (address.state) formatted_address.push(address.state);
        if (address.country) formatted_address.push(address.country);
        if (address.zip) formatted_address.push(address.zip);
        return formatted_address.join(", ");
    }

    getPhoneCalls (connection, params) {
        if (this.status) {
            return models.Charm.findPhoneCallDetailsByStatus(connection, this.status, params);
        }
        return [];
    }

    getVoiceMails (connection, params) {
        if (this.status) {
            return models.Charm.findPhoneCallWithVoiceMails(connection, this.status, params);
        }
        return [];
    }

    getPhoneCallById (connection, id) {
        return models.Charm.findPhoneCallDetailsById(connection, id);
    }

    async sendToVoicemail (callSId, body) {
        const uri = `${settings.get_communication_app_url()}/charm/conference/${callSId}/voicemail/redirect/`;
        const response = await rp({
            uri,
            headers,
            json: true,
            method: 'POST',
            body
        });
        const data = response.applicationData[process.env.COMMUNICATION_APP_KEY][0].data;

        if (!data.status) e.th(409, data.message);
    }

    async setPhoneCallAgentId (connection, callSId, agentId) {
        const phoneCall = await models.Phone_Call.findPhoneEventByCallId(connection, callSId);
        if (!phoneCall) e.th(409, 'Phone Call Not Found');
        const phone_call = new Phone_Call(phoneCall);
        phone_call.user_contact_id = agentId;
        return phone_call.savePhoneEvent(connection);
    }

    async setReservationAsRead (connection, id) {
        const reservation = new Todo({ id });
        await reservation.find(connection);
        if (reservation.read == "1") e.th(409, 'Reservation is already read');
        reservation.read = "1";
        await reservation.save(connection);
    }

    async setInteractionsAsRead (connection, id) {
        const interaction = new Interaction({ id });
        await interaction.find(connection);
        if (!interaction || !interaction.id) e.th(409, 'Interaction Not Found');
        if (interaction.read == "1") e.th(409, 'Interaction is already read');
        interaction.read = "1";
        await interaction.save(connection,interaction.data);
    }

    async getContactDetails (connection, company_id, properties, contact_id, lease_id = null, scope = {}) {
        if (!contact_id) {
            return { contact: {}, units: [], access_codes: [], lead: {}, relationships: [] };
        }
        const units = [];
        const access_codes = [];
        const relationships = [];
        let lead = {};

        let contact = new Contact({ id: contact_id });
        await contact.find(connection);
        await contact.getStatus(connection, properties);
        if (scope.details) {
            await contact.getPhones(connection);
            await contact.getLocations(connection);
        }

        if (scope.access_codes && properties.length > 0) {
            let access = await contact.buildAllAccessCredentials(connection, company_id, properties) || [];
            access.forEach((e) => {
                if (e.pin) access_codes.push(e.pin);
            });
        }
        if (scope.lead && properties.length > 0) {
            await contact.getLeads(connection, properties);
            if (contact.Leads && contact.Leads.length) {
                lead = contact.Leads.find((lead) => lead.lease_id === lease_id) || {};
            }
        }
        if (scope.units && properties.length > 0) {
            await contact.getLeases(connection, company_id, properties, { active_date: new Date() });
            await contact.getReservations(connection, properties);

            if (contact.Leases && contact.Leases.length > 0) {
                contact.Leases.forEach((lease) => {
                    let unit = {
                        id: lease.Unit.id,
                        property_id: lease.Unit.property_id,
                        lease_id: lease.id,
                        type: lease.Unit.type,
                        number: lease.Unit.number,
                        address: this.formatAddress(lease.Unit.Address),
                        status: "leased"
                    };
                    units.push(unit);
                });
            }
            if (contact.Reservations.length > 0) {
                contact.Reservations.forEach((reservation) => {
                    const unit = reservation?.Lease?.Unit;
                    if (unit?.id) {
                        units.push({
                            id: unit.id,
                            property_id: unit.property_id,
                            lease_id: reservation.Lease.id,
                            type: unit.type,
                            number: unit.number,
                            address: this.formatAddress(unit.Address),
                            status: "reserved"
                        });
                    }
                });
            }
        }
        if (scope.relationships) {
            let alt_contacts = await contact.getContactRelationships(connection, lease_id);
            alt_contacts.forEach((c) => {
                relationships.push({ id: c.related_contact_id });
            });
        }
        return { contact, units, access_codes, relationships, lead };
    }

    transformContact (contact) {
        const address = contact?.Addresses?.find((a) => a.primary === 1) || {};
        const phone = contact?.Phones?.find((p) => p.primary === 1) || {};
        const alternate_phones = contact?.Phones?.filter((p) => p.primary !== 1).map((p) => p.phone);

        return {
            address,
            phone,
            alternate_phones,
        }
    }

    async createRelationship (connection, contact_id, related_contact_id, lease_id = null) {
        const contact = new Contact({ id: contact_id });
        const relationships = await contact.getContactRelationships(connection, lease_id);
        const relationshipExists = relationships.find((c) => c.related_contact_id === related_contact_id);

        if (relationshipExists) return;

        return contact.saveRelationship(connection, {
            related_contact_id,
            type: null,
            is_cosigner: 0,
            is_alternate: 1,
            is_emergency: 0,
            is_military: 0,
            is_authorized: 0,
            is_lien_holder: 0,
            lease_id,
        });
    }

    async addAdditionalPhone (connection, contact_id, body) {
        const contact = new Contact({ id: contact_id });
        await contact.getPhones(connection);
        const isContactExists = contact.Phones.find((p) => p.phone === body.phone);

        if (isContactExists) return;

        return models.Contact.savePhone(connection, {
            contact_id,
            type: body.type || 'primary',
            phone: body.phone.toString().replace(/\D+/g, ''),
            sms: body.sms || 0,
            verification_token: null,
            phone_verified: 0,
            primary: body.primary || 0
        })
    }

    async setAvailableAgents (company, body) {
        const uri = `${settings.get_communication_app_url()}/charm/owners/${company.gds_owner_id}/agent/availability/`;
        const method = body.from === 'login' ? 'POST' : 'PUT';
        return rp({
            uri,
            headers,
            json: true,
            method,
            body
        });
    }
    async getAgentAvailability (company, agent_contact_id) {
      const uri = `${settings.get_communication_app_url()}/charm/owners/${company.gds_owner_id}/agent/availability/?agent_id=${agent_contact_id}`;
      return rp({
        uri,
        headers,
        json: true,
        method:'GET'
      });
    }
    async updateVoiceMailSettings (company, data) {
      const uri = `${settings.get_communication_app_url()}/charm/voicemail/settings`;
      let body = data
      if(!data.facility_id){
        delete data.facility_id
      }
      return rp({
          uri,
          headers,
          json: true,
          method:'POST',
          body
      });
  }
  async getVoiceMail(company,facility_gds_id){
    const uri = `${settings.get_communication_app_url()}/charm/voicemail/settings?facility_id=${facility_gds_id}`;
      return rp({
        uri,
        headers,
        json: true,
        method:'GET'
      });
  }
    async callAcceptCallback (body) {
        const uri = `${settings.get_communication_app_url()}/charm/conference/agent/callback/`;
        return rp({
            uri,
            headers,
            json: true,
            method: 'POST',
            body: {
                conf_name: body.conf_name,
                agent_id: body.agent_id,
                facility_id: body.facility_id,
                from: body.from,
                call_count: body.call_count,
            }
        });
    }

    async updateVoicemailURL(connection, body, res) {
        let company = await models.Company.findByGdsID(connection, body.owner_id);
        if (company.length === 0) e.th(400, "Company not found");

        let property = await models.Property.findByGdsID(
          connection,
          body.data.facility
        );

        let contacts = await models.Contact.findByPhone(
          connection,
          body.data.from_phone.replace( /^\D+/g, ''),
          company[0].id
        );
        console.log("Update voicemail url Contacts", contacts);
        //let contact = contacts.length > 0 ? contacts[0] : {};

        let phone_evt;

        if (body.data.conference_name) {
          phone_evt = await models.Phone_Call.findPhoneEventByConferenceName(connection, body.data.conference_name);
        } else {
          phone_evt = await models.Phone_Call.findPhoneEventByCallId(connection, body.data.call);
        }
        
        console.log('voicemail phone_evt', phone_evt);
        let phone_call;
        if (phone_evt) {
          phone_call = new Phone_Call(phone_evt);
          console.log('phone_call',phone_call)
          phone_call.status = "no-answer";
          phone_call.recording_url = body.data.recording;
          console.log('phone_call',phone_call)
          let phone_call_id = await phone_call.savePhoneEvent(connection);

          let interaction = await models.Interaction.findById(connection , phone_call.interaction_id ); 

          let data = {
            company: company[0],
            contacts,
            property,
            interaction,
            callerDetails: phone_call,
            cid: res?.locals?.company_id,
            locals: res?.locals
          }
          return data;
        }
    }

    async handlePhoneCallEvents(connection, body, req, res) {
        let contact = null;
        let callerDetails = {};
        let isOutgoingCall = body.data.direction === "Outgoing Call";
        let callEventStatus = isOutgoingCall ? "call out" : "call in";
        let callToNumber = isOutgoingCall ? body.data.to_phone : body.data.from_phone;
        let phone_call;
        let phone_call_id;
        let interaction;
        let validContacts;
        let contact_unknown;
        let contact_id;
        let phone_evt;
        let company = await models.Company.findByGdsID(connection, body.owner_id);
        if (company.length === 0) e.th(400, "Company not found");
        let company_id = company[0].id;

        let property = await models.Property.findByGdsID(
          connection,
          body.data.facility
        );
        if (!property) e.th(400, "Property not found");
        const property_id = property.id;

        let contacts = await models.Contact.findByPhone(
          connection,
          callToNumber.replace( /^\D+/g, ''),
          company_id
        );
        console.log('handlePhoneCallEvents contacts', contacts);
        if (contacts.length > 0) {
        validContacts = contacts.filter((c) => c.first !== "New");
        contact_unknown = validContacts.length === 0;
        contact_id = contact_unknown ? contacts[0].id : validContacts[0].id;
        }
        if (body.data.conference_name) {
          phone_evt = await models.Phone_Call.findPhoneEventByConferenceName(connection, body.data.conference_name);
        } else {
          phone_evt = await models.Phone_Call.findPhoneEventByCallId(connection, body.data.call);
        }

        console.log('phone_evt', phone_evt);
        if (phone_evt) {
          phone_call = new Phone_Call(phone_evt);
          phone_call.status = body.data.status;
          if (phone_call.status === "in-progress") {
            phone_call.start_time = body.data.timestamp;
          } else if (phone_call.status === "completed") {
            if (phone_call.start_time) {
              const startTime = moment(phone_call.start_time, "YYYY-M-DD HH:mm:ss");
              const endTime = moment(body.data.timestamp, "YYYY-MM-DD HH:mm:ss");
              const secondsDiff = endTime.diff(startTime, "seconds");
              phone_call.duration = secondsDiff;
            }
            if (body.data.recording_status === 'completed') {
              console.log('Got the recording url', body.data.recording)
              phone_call.recording_url = body.data.recording;
            }
          } else {
            phone_call.duration = null;
          }
          phone_call_id = await phone_call.savePhoneEvent(connection);
          
          interaction = new Interaction({ id:phone_call.interaction_id });

          await interaction.find(connection);
         
          console.log('Interation object', interaction.id, interaction)
          if (interaction?.id && ["completed", "no-answer", "canceled", "failed"].includes(body.data.status)) {
            interaction.entered_by = phone_evt ? phone_evt.user_contact_id : null;
            await interaction.save(connection,interaction.data);
          }
        } else {
          phone_call = new Phone_Call({
            direction: isOutgoingCall ? "outgoing" : "incoming",
            status: body.data.status,
            conference_name: body.data.conference_name,
            source_tag: body.data.source_tag,
            call_id: body.data.call,
            facility_id: body.data.facility,
            owner_id: body.data.owner,
            from_phone: callToNumber,
            via_phone: body.data.via_phone,
            to_phone: body.data.to_phone,
            time_stamp: body.data.timestamp,
            name: body.data.name,
            recording_url: body.data.recording_url,
            notes: body.data.notes,
            zip_code: body.data.zip_code,
          });
          
          if (contacts.length > 0) {
          console.log('Interaction created for known caller',body);
          
          let deliveryMethod = new DeliveryMethod();
          await deliveryMethod.findByGdsKey(connection, 'phone_call');
  
            interaction = new Interaction();
            /*let interaction_body = {
              contact_id:  contact_id,
              entered_by: phone_evt ? phone_evt.user_contact_id : null,
              delivery_methods_id: deliveryMethod.id,
              pinned: false,
              context: body.context,
              read: false
              };*/
			let interaction_entered_by = phone_evt ? phone_evt.user_contact_id : null;
			await interaction.create(connection, property_id, 'Tenant', contact_id, interaction_entered_by, null, deliveryMethod.id, false, body.context, false, null, null, contact_id, null, null, phone_call.status, null);
            //let interaction_id = await interaction.save(connection, interaction_body);

            phone_call.interaction_id = interaction.id;
                        
          }
          phone_call_id = await phone_call.savePhoneEvent(connection);
        }

        callEventStatus = ["no-answer", "canceled"].includes(body.data.status) ? "missed" : callEventStatus;

        if (contacts.length > 0) {
          console.log('In known caller');
          const scope = {
            details: true,
            access_codes: true,
            units: true,
            relationships: true,
          }
          const { contact: contactDetails, access_codes, units, relationships } = await this.getContactDetails(connection, company_id, [property_id], contact_id, null, scope);
          const { address, phone, alternate_phones } = this.transformContact(contactDetails);

          contact = contactDetails;

          callerDetails = this.transformData(callEventStatus, {
            id: interaction?.id,
            contact_unknown: contact_unknown,
            contact_id: contact_id,
            property_id: property_id,
            phone_number: callToNumber.replace( /^\D+/g, ''),
            contact_name: this.formatUserName(contact),
            contact_status: contact.status,
            contact_phone: phone ? phone.phone : "",
            contact_email: contact.email,
            contact_address: address && address.Address ? this.formatAddress(address.Address) : "",
            contact_access_codes: access_codes,
            contact_units: units,
            alternate_phones: alternate_phones,
            alternate_contacts: relationships,
            communication_time: body.data.timestamp,
            communication_property: property.name,
            communication_source: body.data.source_tag,
            time: body.data.timestamp,
            playback_url : body.data.recording,
            showToast: true,
          });
        } else {
          console.log('In unknown caller')
          // new lead!  can we get their name?
          // if not save with no name?
          contact = new Contact();
          contact.company_id = company_id;

          contact.first = "New";
          contact.last = "Lead";
          contact.source = body.data.source_tag;
          if (body.data.name) {
            let [first, last] = body.data.name.split(' ');
            contact.first = typeof first == "undefined" || first == "" ? "New" : first;
            contact.last = typeof last == "undefined" || last == "" ? "Lead" : last;
          }

          contact.Phones = [{
            type: "Phone",
            sms: 1,
            phone: callToNumber
          }];
          await contact.save(connection);

          let lead = new Lead({
            contact_id: contact.id,
            property_id: property_id,
            content: body.content,
            created: moment().format('YYYY-MM-DD HH:mm:ss'),
            source: "Call",
            status: "active",
            created_by: res.locals.contact && res.locals.contact.id,
            modified_by: res.locals.contact && res.locals.contact.id,
          });

          await lead.save(connection);

          //Enter Interaction
          if (!interaction?.id) { 

            let deliveryMethod = new DeliveryMethod();
            await deliveryMethod.findByGdsKey(connection, 'phone_call');

            console.log('Interaction created in unknown caller',body);
            interaction = new Interaction();

            /*let interaction_body = {
              contact_id:  contact.id,
              entered_by: phone_evt ? phone_evt.user_contact_id : null,
              delivery_methods_id: deliveryMethod.id,
              pinned: false,
              context: body.context,
              read: false
              };*/
			let interaction_entered_by = phone_evt ? phone_evt.user_contact_id : null;
			await interaction.create(connection, property_id, 'Tenant', contact_id, interaction_entered_by, null, deliveryMethod.id, false, body.context, false, null, null, contact_id, null, null, phone_call.status, null);
            
            //let interaction_id = await interaction.save(connection, interaction_body);

            phone_call.id = phone_call_id;
            phone_call.interaction_id = interaction.id;

            await phone_call.savePhoneEvent(connection);

          }

          callerDetails = this.transformData(callEventStatus, {
            id: interaction?.id,
            contact_unknown: true,
            contact_id: contact.id,
            property_id: property_id,
            phone_number: callToNumber.replace( /^\D+/g, ''),
            contact_name: this.formatUserName(contact),
            communication_time: body.data.timestamp,
            communication_property: property.name,
            communication_source: body.data.source_tag,
            time: body.data.timestamp,
            playback_url : body.data.recording,
            showToast: true,
          });
        }
        if (isOutgoingCall || ['ringing', 'no-answer', 'in-progress', 'canceled', 'failed', 'calling'].includes(body.data.status)) {
          let payload = {
            twilioDetails: { data: body.data },
            callerDetails: Hash.obscure(callerDetails, req),
            callStatus: body.data.status
          };
          console.log("Payload to UI for web-socket events:", payload);
          if (isOutgoingCall) {
            payload = {
              ...payload,
              callerDetails: {
                ...payload.callerDetails,
                id: body.data.to_phone
              }
            };
            const agent_id = Hashes.decode(body.data.from_phone)[0];
            await this.sendEventToAdmins(connection, company_id, property_id, "charm_outgoing_status", payload, [agent_id]);
          } else if (callEventStatus === 'missed') {
            await this.sendEventToAdmins(connection, company_id, property_id, "charm_call_status", payload);
          } else {
            const agentIds = body.data.agent_list.map((agent) => Hashes.decode(agent)[0]);
            if (agentIds.length > 0) {
              if (body.data.status === "ringing") {
				  console.log("Sending ringing event to UI");
                await this.sendEventToAdmins(connection, company_id, property_id, "charm_incoming_call", payload, agentIds);
              } else if (body.data.status === "in-progress") {
                const rejectedAgentIds = body.data.agent ? [Hashes.decode(body.data.agent)[0]] : [];
                await this.sendEventToAdmins(connection, company_id, property_id, "charm_call_status", payload, agentIds, rejectedAgentIds);
              } else {
                await this.sendEventToAdmins(connection, company_id, property_id, "charm_call_status", payload, agentIds);
              }
            }
          }
        }

        if (phone_evt && phone_evt.user_contact_id) {
          let payload; 
          if (body.data.recording !== "") {
            payload = {
              callerDetails: Hash.obscure(callerDetails, req),
              callStatus: 'completed',
              recordingStatus: body.data.recording_status,
              twilioDetails: { data: body.data }
            }
          } else {
            payload = {
              callSid: body.data.call,
              callStatus: body.data.status,
              twilioDetails: { data: body.data }
            };
          }
          console.log("Payload", payload);
          if (!["in-progress", "no-answer", "canceled", "failed"].includes(phone_call.status) && phone_evt.user_contact_id) {
            await this.sendEventToAdmins(connection, company_id, property_id, "charm_call_status", payload, [phone_evt.user_contact_id]);
          }
        } else {
          console.log("Phone call picked user not updated!!");
        }
    }
}

module.exports = Charm;
