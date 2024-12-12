'use strict';
const Call = require(__dirname + '/../modules/calls.js');
const db = require(__dirname + '/../modules/db_handler.js');

const CharmEvents = {

    notifyReservation: async (payload, todo_id) => {
        const connection = await db.getConnectionByType('write', null, payload.cid);

        const charm = new Charm({});

        const hasPermission = await charm.hasPermission(connection);
        if (!hasPermission) return;

        const company = payload.company;
        const property = payload.property;

        const isPropertySubscribed = await Call.isCharmEnabledForProperty(connection, company, property.id);
        if (!isPropertySubscribed) return;

        try {
            const lease = payload.lease;
            const reservation = payload.reservation;

            const scope = {
                details: true,
                lead: true,
                access_codes: true,
                relationships: true,
            }
            const { contact, access_codes, relationships, lead } = await charm.getContactDetails(connection, company.id, [property.id], lease.Tenants[0].contact_id, lease.id, scope);

            const user = lease.Tenants && lease.Tenants.length ? lease.Tenants[0].Contact: {};
            const { address, phone, alternate_phones } = charm.transformContact(user);

            const transformedData = charm.transformData("reservation", {
                id: todo_id,
                contact_unknown: !user?.id,
                contact_id: user.id,
                property_id: property.id,
                phone_number: phone ? phone.phone : "",
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: user.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: lease.Unit ? [{
                    id: lease.Unit.id,
                    lease_id: lease.id,
                    type: lease.Unit.type,
                    number: lease.Unit.number,
                    address: charm.formatAddress(lease.Unit.Address),
                    status: "reserved"
                }] : [],
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_time: new Date(),
                communication_property: lead.Property?.name ? lead.Property.name : null,
                communication_source: lead.source,
                reservation_id: reservation.id,
                reservation_space_information: `${lead.Unit?.label ? lead.Unit.label : ''}${lead.Unit?.label && lead.Category?.name ? ', ' : ''}${lead.Category?.name ? lead.Category.name : ''}`,
                reservation_code: null,
                reservation_move_in_date: lease.start_date,
                reservation_in_store_price: lease.Unit ? lease.Unit.default_price : null,
                reservation_web_only_price: lease.Unit ? lease.Unit.price : null,
                time: new Date(),
                showToast: payload.source !== 'hummingbird',
            });

            await charm.sendEventToAdmins(connection, company.id, property.id, "charm_notify_reservation", {
                state: "Success",
                message: "",
                data: Hash.obscure(transformedData, { company_id: payload.cid }),
                status: 200
            });
        } catch (e) {}
    },

    notifyVoicemail: async payload => {
        const connection = await db.getConnectionByType('write', null, payload.cid);

        const charm = new Charm({});
        let validContacts;
        let contact_unknown;
        let contact_id;
        const hasPermission = await charm.hasPermission(connection);
        if (!hasPermission) return;

        const company = payload.company;
        const property = payload.property;

        const isPropertySubscribed = await Call.isCharmEnabledForProperty(connection, company, property.id);
        if (!isPropertySubscribed) return;

        try {
            const callerDetails = payload.callerDetails;
            const interaction_id = payload.interaction?.id;
            
            console.log("Charm notifyvoicemail contact", payload.contacts);
            validContacts = payload.contacts.filter((c) => c.first !== "New");
            console.log("Charm notifyvoicemail validContacts",validContacts);
            contact_unknown = validContacts.length === 0;
            console.log("Charm notifyvoicemail contact_unknown",contact_unknown);
            contact_id = contact_unknown ? payload.contacts[0].id : validContacts[0].id;
            console.log("Charm notifyvoicemail contact_id",contact_id);
                
            const scope = {
                details: true,
                access_codes: true,
                units: true,
                relationships: true,
            }
            const { contact, access_codes, units, relationships } = await charm.getContactDetails(connection, company.id, [property.id], contact_id, null, scope);
            const { address, phone, alternate_phones } = charm.transformContact(contact);

            const transformedData = charm.transformData("voicemail", {
                id: interaction_id,
                contact_unknown: contact_unknown,
                contact_id: contact_id,
                property_id: property.id,
                phone_number: callerDetails?.from_phone?.replace( /^\D+/g, ''),
                contact_name: charm.formatUserName(contact),
                contact_status: contact.status,
                contact_phone: phone ? phone.phone : "",
                contact_email: contact.email,
                contact_address: address && address.Address ? charm.formatAddress(address.Address) : "",
                contact_access_codes: access_codes,
                contact_units: units,
                alternate_phones: alternate_phones,
                alternate_contacts: relationships,
                communication_time: callerDetails.time_stamp,
                communication_property: property.name,
                communication_source: callerDetails.source_tag,
                voicemail_url: callerDetails.recording_url,
                time: callerDetails.time_stamp,
                showToast: true,
            });

            await charm.sendEventToAdmins(connection, company.id, property.id, "charm_notify_voicemail", {
                state: "Success",
                message: "",
                data: Hash.obscure(transformedData, { company_id: payload.cid }),
                status: 200
            });
        } catch (e) {}
    }
}

module.exports = CharmEvents;

const Hash = require(__dirname + '/../modules/hashes.js');
const Charm  = require(__dirname + '/../classes/charm-integration.js');
