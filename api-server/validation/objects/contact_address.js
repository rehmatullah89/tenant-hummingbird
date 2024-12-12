var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const Address = require('./address.js');


module.exports = Joi.object().keys({
	id:             Joi.string().length(10).allow('', null),
	address_id:     Joi.any().allow('', null),
	contact_id:     Joi.any().allow('', null),
	type:           Joi.string().allow('', null),
	landlord:       Joi.string().allow('', null),
	move_in:        Joi.date().format('YYYY-MM-DD').allow('', null),
	move_out:       Joi.date().format('YYYY-MM-DD').allow('', null),
	phone:          Joi.any().allow('', null),
	reason:         Joi.string().allow('', null),
	rent:           Joi.number().allow('', null),
	created_at:     Joi.string().allow('', null),
	primary:				Joi.number().min(0).max(1).allow('', null),
	Address:        Joi.object().keys({
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
	})
});