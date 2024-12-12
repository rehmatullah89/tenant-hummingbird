
var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	createDocumentType: Joi.object().keys({
		name: Joi.string().required()
	}),
	createDocument: Joi.object().keys({
		name: Joi.string().required(),
		description: Joi.string(),
		document_type_id: Joi.string(),
		unit_type: Joi.string().valid('Storage','Residential').insensitive().required(),
		public: Joi.bool()
	})
}