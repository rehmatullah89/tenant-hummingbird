var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	search: Joi.object().keys({
		limit: Joi.number().integer().min(0).allow('', null),
		offset: Joi.number().integer().min(0).allow('', null),
		page: Joi.number().integer().min(0).allow('', null),
		sort: Joi.object().keys({
			field: Joi.string().allow(null).allow('', null),
			dir: Joi.string().valid('ASC','DESC').allow('', null)
		}),
		columns: Joi.array(),
		search: Joi.object().keys({
			search: Joi.string().allow('', null),
			status: Joi.array().items(Joi.string().insensitive().valid('Active','Accepted','Rejected')).allow('', null),
			property_id: Joi.array().items(Joi.string().length(10)).allow('', null),
			unit_id: Joi.array().items(Joi.string().length(10)).allow('', null)
		})
	}),
	createDocument: Joi.object().keys({
		name: Joi.string().required(),
		description: Joi.string(),
		document_type_id: Joi.string(),
		unit_type: Joi.string().valid('Storage','Residential').insensitive().required(),
		public: Joi.bool()
	})
}