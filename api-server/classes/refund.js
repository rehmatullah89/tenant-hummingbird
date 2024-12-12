'use strict';

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

class Refund {
	constructor(data = {}) {
		this.assembleRefund(data);
	}

	assembleRefund(data) {
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
		this.upload_id = data.upload_id || null;
		this.Payment = data.Payment || {};
	}

	async find(connection) {
		if(!this.id) e.th(500, 'Refund id not set');

      	const data = await models.Payment.getRefund(connection, this.id);

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
		this.upload_id = data.upload_id || null;

		return data;
	}

	async processReversal(connection, payload) {
		const { GENERATE_DOCUMENT_REVERSAL_TYPES } = ENUMS;
		const shouldGenerateReversalDocument = Object.values(GENERATE_DOCUMENT_REVERSAL_TYPES).includes(this.type);
		if(shouldGenerateReversalDocument) {
			const { cid, send_email } = payload;
			const { accepted_by: admin_contact_id, Property } = this.Payment;
			const { company_id, id: property_id } = Property;
			const reversal_types = [this.type];
			const reversalSettings = await models.Reversal.findPropertyOrDefaultSettings(connection, {
				company_id,
				property_id,
				reversal_types,
			});
			let verifyEmailConfig = true;
			if(send_email) {
				const reversalDelivery = await Reversal.findBulkReversalDeliveries(connection, {
					company_id,
					reversal_types,
				});
				verifyEmailConfig = !!(reversalDelivery.length && reversalDelivery[0].active);
			}

			if(verifyEmailConfig) {
				console.log('Processing reversal with settings ', reversalSettings);

				await Queue.add('process_reversal', {
					cid,
					company_id,
					contact_id: admin_contact_id,
					document_id: reversalSettings[0].document_id,
					reversal_id: reversalSettings[0].id,
					reversal_types,
					refund_id: this.id,
					upload_id: this.upload_id,
					socket_details: {
						company_id,
						contact_id: admin_contact_id,
					},
				}, { priority: 1 });
			} else {
				e.th(400, 'Email not configured in the reversal settings');
			}
		}
	}
}

module.exports = Refund;

const e = require('../modules/error_handler.js');
const ENUMS = require("../modules/enums");
const models = require("../models");
const Reversal = require("../classes/reversal");
