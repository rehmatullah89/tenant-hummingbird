"use strict";

const models  = require(__dirname + '/../models');
const e  = require(__dirname + '/../modules/error_handler.js');

class Tenant {
	constructor(data) {
		this.id = data.id;
		this.contact_id = data.contact_id;
		this.lease_id = data.lease_id;
		this.sort = data.sort;
		this.type = data.type;
		this.Contact = {};
		this.Reservation = {};
		this.Lease = {};
        this.Business = {};
	}

	async find(connection, company_id, api){
		if(!this.id) e.th(500, "Email not set");

		let data = await models.ContactLeases.findById(connection, this.id);

		if(!data) e.th(404);

		this.id = data.id;
		this.contact_id = data.contact_id;
		this.lease_id = data.lease_id;
		this.sort = data.sort;
		this.type = data.type;

		this.Contact = new Contact({id: this.contact_id});
		await this.Contact.find(connection, company_id);
		await this.Contact.getLocations(connection);
		await this.Contact.getPhones(connection,api);
		await this.Contact.getRelationships(connection, this.lease_id);

		this.Lease = new Lease({id: this.lease_id});
		await this.Lease.find(connection);
		await this.Lease.getTransferredUnitInfo(connection);

		this.Reservation = new Reservation({lease_id: this.lease_id});

		try {
			await this.Reservation.findByLeaseId(connection);
		} catch(e){
			if(e.code === 404) return;
			throw e;
		}

	}

    static async getFormattedPhoneNumbers(phones, formatPhone) {
        if (!phones.length) return [];
        phones.forEach(p => {
          (p.sms = !!p.sms),
            (p.phone = formatPhone
              ? p.phone && p.phone.length === 10
                ? `+1${p.phone}`
                : `+${p.phone}`
              : p.phone);
        });
        return phones;
    }

	/**
	 * Find All Tenants
	 * @param    {Object}  connection
	 * @param    {string}  company_id
	 * @param    {Object}  api
	 * @param    {Object}  params search params
	 * @param    {Boolean} count flag to return total tenants
	 * @returns  {Array}   Returns All Tenants
	 */
	static async findAll(connection, company_id, api, params, count, properties) {
		if (count) {
			return await models.ContactLeases.findAll(connection, params, count, company_id, properties);
		} else {
			let allTenants = await models.ContactLeases.findAll(connection, params, count, company_id, properties) ?? [];
			let leases = allTenants.map(l=> l.lease_id)

			if (leases.length) {
				let contactLeases = await models.ContactLeases.findContactDetails(connection, leases, params) ?? [];
				let formatPhone = !!api?.id;
				let contactIds = []
				for (let tenant of contactLeases) {
					contactIds.push(tenant.contact_id)
					tenant.Contact.Phones = await this.getFormattedPhoneNumbers(tenant.Contact.Phone, formatPhone);
				}

				if (contactIds.length) {
					let allRelatedContacts = await models.Contact.findAllRelationship(connection, contactIds) ?? [];
					for (let tenant of contactLeases) {
						tenant.Contact.Relationships = [];
						for (let relatedContact of allRelatedContacts) {
							if (relatedContact.contact_id === tenant.contact_id) {
								relatedContact['Contact'].Phones = await this.getFormattedPhoneNumbers(relatedContact['Contact']?.Phones, formatPhone)
								tenant.Contact.Relationships.push(relatedContact);

							}
						}
					}
				}

				return contactLeases ?? [];
			} else return []
		}

	};
}

module.exports = Tenant;

const Contact = require(__dirname + '/../classes/contact.js');
const Lease = require(__dirname + '/../classes/lease.js');
const Reservation = require(__dirname + '/../classes/reservation.js');
