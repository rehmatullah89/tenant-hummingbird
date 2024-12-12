var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	create: Joi.object().keys({
		description: Joi.string().allow('', null),
		name: Joi.string().required(),
		price: Joi.string().allow('', null),
		sort: Joi.string(),
		unit_type: Joi.string(),
		Attributes: Joi.array().items(
			Joi.object().keys({
				id: Joi.string(),
				amenity_id: Joi.string(),
				category_id: Joi.string(),
				value: Joi.string(),
				name: Joi.string()
			})
		)
	}),

	sort: Joi.object().keys({
		categories: Joi.array().items(
			Joi.object().keys({
				id: Joi.string().required()
			})
		)
	}),
	


}