var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

const Address = require('./address.js');

module.exports = Joi.object().keys({
	id: Joi.string().length(10).allow('', null),
	contact_id: Joi.string().length(10).allow('', null),
	registered_address_id: Joi.string().length(10).allow('', null),
	RegisteredAddress: Address,
	type: Joi.string().allow('', null),
	name: Joi.string().allow('', null),
	make: Joi.string().allow('', null),
	model: Joi.string().allow('', null),
	year: Joi.string().allow('', null),
	plate: Joi.string().allow('', null),
	state: Joi.string().allow('', null),
	width: Joi.number().allow('', null),
	length: Joi.number().allow('', null),
	id_number: Joi.string().allow('', null),
	value: Joi.number().allow('', null),
	insurance_provider: Joi.string().allow('', null),
	policy_number: Joi.string().allow('', null),
	registration_number: Joi.string().allow('', null),
	registration_exp: Joi.string().allow('', null),
	registered_owner: Joi.string().allow('', null),
	lien_holder: Joi.string().allow('', null),
	home_port: Joi.string().allow('', null),
	horsepower: Joi.string().allow('', null)
});