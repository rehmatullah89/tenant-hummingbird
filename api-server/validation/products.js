var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	create: Joi.object().keys({
		name: Joi.string().required(),
		description: Joi.string().allow('', null),
		price: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null,'').required(),
		//percentage: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null,'').required(),
		prorate: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		prorate_out: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		recurring: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		taxable: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		type: Joi.string().valid('product', 'utility', 'deposit','insurance','fee','rent').required(),
		default_type: Joi.string().valid('rent', 'security', 'late', 'insurance', 'product', 'utility' ),
		income_account_id: Joi.string().allow(null,''),
		expense_account_id: Joi.string().allow(null,''),
		concession_account_id: Joi.string().allow(null,''),
		liability_account_id: Joi.string().allow(null,''),
		sku: Joi.string().allow(null,''),
		has_inventory: Joi.boolean().truthy(1, "1").falsy("0", 0),
		amount_type: Joi.string().valid('fixed', 'variable', 'scheduled', 'percentage'),
		Properties: Joi.array().allow(null),
		Rules: Joi.array().allow(null),
		category_type: Joi.string().allow(null),
	}),

}
