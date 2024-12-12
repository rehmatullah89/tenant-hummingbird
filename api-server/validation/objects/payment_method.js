var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports =  {
	company:            Joi.string().allow('', null),
	first:              Joi.string(),
	last:               Joi.string(),
  	type:               Joi.string().valid('cash', 'card', 'ach', 'check', 'paypal', 'google','amazon', 'apple', 'giftcard').insensitive().required(),
	address:            Joi.string(),
	address2:           Joi.string().allow('', null),
	city:               Joi.string().allow('', null),
	state:              Joi.string().allow('', null),
	zip:                Joi.string().regex(/^\d+$/),
  	country:            Joi.string().allow('', null),
	paypalOrderId:      Joi.string().when('type', {is: 'paypal', then: Joi.string().required() }),
	paypalPayerId:      Joi.string().when('type', {is: 'paypal', then: Joi.string().required() }),
	payerEmail:         Joi.string().when('type', {is: 'paypal', then: Joi.string().required() }),
	account_number:     Joi.string().when('type', {is: 'ach', then: Joi.string().required() }),
	routing_number:     Joi.string().when('type', {is: 'ach', then: Joi.string().required() }),
	account_type:       Joi.string().when('type', {is: 'ach', then: Joi.string().valid('checking','savings').insensitive().required() }),
	name_on_card:       Joi.string().when('type', {is: 'card', then: Joi.string().required() }),
  	card_number:        Joi.string().when('type', {is: 'card', then: Joi.string().required() }),
	exp_mo:             Joi.string().when('type', {is: 'card', then: Joi.string().length(2).required() }),
	exp_yr:             Joi.string().when('type', {is: 'card', then: Joi.string().max(4).required() }),
	cvv2:               Joi.string().when('type', {is: 'card', then: Joi.string().max(4).required() }),
  	transactionID:      Joi.string().when('type', {is: 'card', then: Joi.string() }),
  	token:              Joi.string().when('type', {is: 'card', then: Joi.string() }),
  	card_type:          Joi.string().when('type', {is: 'card', then: Joi.string() }),
	save_to_account:    Joi.bool(),
	auto_charge:        Joi.bool(),
	authorization:      Joi.string().allow('', null),
	contact_id:			Joi.string().allow('', null)
}
