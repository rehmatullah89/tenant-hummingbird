var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = Joi.object().keys({
	id:             Joi.string().length(10).allow('', null),
	address:        Joi.string().allow('', null),
	address2:       Joi.string().allow('', null),
	city:           Joi.string().allow('', null),
	state:          Joi.string().allow('', null),
	neighborhood:   Joi.string().allow('', null),
	country:        Joi.string().allow('', null),
	lat:            Joi.number().min(-90).max(90).allow(null, ''),
	lng:            Joi.number().min(-180).max(180).allow(null, ''),
	zip:            Joi.any().allow('', null),
	formatted_address: Joi.string().allow('', null),
	region:   Joi.string().allow('', null),
	district: Joi.string().allow('', null)
});