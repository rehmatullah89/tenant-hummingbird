var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

const Contact = require('./contact.js');
const Phone = require('./phone.js');
const Address = require('./contact_address.js');

var contactObj = Object.assign({}, Contact);
contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(Address);

module.exports = Joi.object().keys({
	id: Joi.string().length(10).allow('', null),
	contact_id: Joi.string().length(10).allow('', null),
	related_contact_id: Joi.string().length(10).allow('', null),
	lease_id: Joi.string().length(10).allow('', null),
	type: Joi.string().allow('', null),
	is_cosigner: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	is_emergency: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	is_alternate: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	is_military: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	is_authorized: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	is_lien_holder: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	Contact: contactObj
}); 