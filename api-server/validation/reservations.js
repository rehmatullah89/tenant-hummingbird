var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
var PaymentMethod = require('./objects/payment_method.js');
var Contact = require('./objects/contact.js');
var Phone = require('./objects/phone.js');
var ContactAddress = require('./objects/contact_address.js');
var Relationship = require('./objects/relationship.js');

const paymentMethodObj = Object.assign({}, PaymentMethod);
const contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
// contactObj.Addresses =  Joi.array().items(ContactAddress);
// contactObj.Relationships =  Joi.array().items(Relationship);
contactObj.contact_id = Joi.string().length(10).allow('', null);


module.exports = {
	updateReservation: {
		time: Joi.date().iso(),
		expires: Joi.date().iso(),
		rent: Joi.number().required(),
		unit_id: Joi.string().required(),
		contacts: Joi.array().items(contactObj).required(),
		comments: Joi.string().allow('',null)
	},

}