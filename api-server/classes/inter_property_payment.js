"use strict";

class InterPropertyPayment {
	constructor(data = {}) {
		this.assembleInterPropertyPayment(data);
	}

	assembleInterPropertyPayment(data) {
		const { id, payment_id, source_payment_id, created_at, created_by, modified_at, modified_by } = data;

		this.id = id;
		this.payment_id = payment_id;
		this.source_payment_id = source_payment_id;
		this.created_at = created_at;
		this.created_by = created_by;
		this.modified_at = modified_at;
		this.modified_by = modified_by;
	}

	async save(connection, payload) {
		const { inter_property_payment } = payload;

		let result = await models.Payment.saveInterPropertyPayment(connection, { data: inter_property_payment });
		this.id = this.id || result.insertId;
		return this.id;
	}

	async create(connection) {
		const interPropertyPayment = {
			payment_id: this.payment_id,
			source_payment_id: this.source_payment_id,
			created_by: this.created_by,
			modified_by: this.modified_by
		};

		return await this.save(connection, { inter_property_payment: interPropertyPayment });
	}
}

module.exports = InterPropertyPayment;

const models = require(__dirname + '/../models');