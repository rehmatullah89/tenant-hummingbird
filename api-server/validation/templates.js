var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
	newService: Joi.object().keys({
		optional: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		product_id:  Joi.string().length(10).required(),
		template_id:  Joi.string().length(10),
		price:  Joi.number().min(0),
		prorate:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
    prorate_out:  Joi.boolean().truthy(1, "1").falsy("0", 0),
		recurring:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		qty:   Joi.number().min(1).required()
	}),

	newTemplate: Joi.object().keys({
		name:  Joi.string().max(50).required(),
		bill_day: Joi.string().valid('1st of the month','Anniversary').insensitive().required(),
		description:  Joi.string(),
		email_statement:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		is_default:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		lease_duration:  Joi.number(),
		lease_duration_type:  Joi.string().valid('Years','Months').insensitive(),
		lease_type:  Joi.string().valid('Month to Month','Fixed Length').insensitive().required(),
		prorate_rent:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		prorate_rent_out:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		tax_rent:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		terms:  Joi.string().allow('', null),
		security_deposit:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		security_deposit_months:  Joi.number(),
		unit_type:  Joi.string().valid('Storage','Residential','Parking').insensitive().required(),
		auto_pay: Joi.boolean().truthy(1, "1").falsy("0", 0),
		invoiceSendDay: Joi.number(),
		allow_back_days: Joi.number(),
		prorate_days: Joi.number(),
		security_deposit_type: Joi.string().valid('fixed', 'percent', 'number').insensitive(),
		deposit_amount: Joi.number().max(99999)
	}),
	newChecklistItem: Joi.object().keys({
		name:  Joi.string().required(),
		description:  Joi.string(),
		require_all:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		document_type_id:  Joi.string().length(10).allow(null, ''),
		document_id:  Joi.string().allow(null, '')
	}),

}


