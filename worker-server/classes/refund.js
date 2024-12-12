"use strict";

class Refund {
	constructor(data = {}) {
		this.assembleAccountingTemplate(data);
	}

	assembleAccountingTemplate(data) {
		this.amount = data.amount || 0;
		this.created_by = data.created_by || null;
		this.date = data.date || null;
		this.effective_date = data.effective_date || null;
		this.id = data.id || null;
		this.payment_id = data.payment_id || null;
		this.reason = data.reason || null;
		this.ref_num = data.ref_num || null;
		this.refund_to = data.refund_to || null;
		this.transaction_id = data.transaction_id || null;
		this.type = data.type || null;
		this.Payment = data.Payment || {};
	}

    async save(connection, payload) {
        await models.Payment.saveRefund(connection, payload, this.id);
    }

	async findBulkReversalDeliveries(connection, payload) {
        return models.Payment.findBulkReversalDeliveries(connection, payload);
    }

    async saveRefundDelivery(connection, data) {
        return models.Payment.saveRefundDelivery(connection, data);
    }

    async mergeTokens(connection, message, lease, company, property, is_html, reversal) {
		if (!message) return '';
		try {
			let found_tokens = [];
			for (let s in Tokens) {
				if (typeof Tokens[s] === 'function') continue;
				let section = Tokens[s];
				const regex = /[A-Z]/g;
				for (let i = 0; i < section.length; i++) {
					if (message.indexOf(`[${section[i]}]`) < 0) continue;
					found_tokens.push({
						name: section[i]
					})
				}
			}

			let document = {
				Details: {
					tokens: found_tokens,
                    reversal,
				}
			}

			await lease.findFull(connection, company, [property], document)
			let merged_tokens = await PandaDocs.mergeTokens(connection, lease, document.Details)
			merged_tokens = merged_tokens || [];
			for (let i = 0; i < merged_tokens.length; i++) {
				var re = new RegExp(`\\[${merged_tokens[i].name}\\]`, 'g');
				message = message.replace(re, merged_tokens[i].value)
			}
			if (is_html) {
				message = message.replace(/\n/g, '<br />');
			}
			return message;

		} catch (err) {
			throw err;
		}
	}

	async sendReversalDocEmail(connection, payload) {
		try {
			const {
				company_id,
				contact_id,
				lease_id,
				reversal,
				reversal_types,
				upload,
				tracking: {
					trace_id
				},
			} = payload;

			const reversalDelivery = await this.findBulkReversalDeliveries(connection, {
                company_id,
                reversal_types,
            });
			if(!reversalDelivery.length || !reversalDelivery[0].active) return;
			const company = new Company({ id: company_id });
			await company.find(connection);

			const { gds_owner_id } = company;
			const gds_key = 'standard_email';

			upload.setBucketNameByDocumentType(ENUMS.DOCUMENT_TYPES.UN_SIGNED);
			const file = await upload.download();

			const attachments = [{
				upload_id: upload.id,
				content_type: "application/pdf",
				name: `${upload.name}.pdf`,
				content: file.Body.toString('base64'),
			}];

			// Fetch required data through lease
			const lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.getTenants(connection);
			await lease.getProperty(connection, company_id);

			const { primary_contact_id } = lease;
			const tenant = lease.Tenants.find(t => t.contact_id == primary_contact_id);

			const deliveryMethod = new DeliveryMethod();
			await deliveryMethod.findByGdsKey(connection, gds_key);
			const dm = {
				id: deliveryMethod.id,
				gds_key,
			};

			const { subject } = reversalDelivery[0];
            let { message } = reversalDelivery[0];
            message = await this.mergeTokens(connection, message, lease, company, lease.Property, true, reversal);
			const response = await tenant.Contact.sendEmail(
				connection,
				subject,
				message,
				attachments,
				null,
				'reversal',
				gds_owner_id,
				lease.Property.gds_id,
				dm,
				primary_contact_id,
				lease_id,
				null,
				null,
				trace_id
			);
			await this.saveRefundDelivery(connection, {
				refund_id: this.id,
				interaction_id: response.interaction_id,
				error: response.status === 'error' ? response.message : null,
				created_by: contact_id,
				modified_by: contact_id
			});
		} catch(err) {
			console.log('Email Reversal Document Error: ', err);
			throw err;
		}
	}
}

module.exports = Refund;

const Company = require('../classes/company');
const DeliveryMethod = require('../classes/delivery_method');
const ENUMS = require('../modules/enums');
const Lease = require('../classes/lease');
const models = require('../models');
const PandaDocs = require('../modules/pandadocs.js');
const Tokens = require('../modules/tokens');
