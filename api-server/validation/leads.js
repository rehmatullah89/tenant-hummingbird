var Contact = require('./objects/contact.js');
var Phone = require('./objects/phone.js');
var ContactAddress = require('./objects/contact_address.js');
var Relationship = require('./objects/relationship.js');
var Touchpoints = require('./objects/touchpoints.js');
var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);


contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(ContactAddress);
contactObj.Relationships =  Joi.array().items(Relationship);




module.exports = {
	createLead: Joi.object().keys({
		source: Joi.string().allow('', null),
		property_id: Joi.string().length(10).allow('', null),
		unit_id: Joi.string().length(10).allow('', null),
		category_id: Joi.string().length(10).allow('', null),
		content: Joi.string().allow('', null),
		subject: Joi.string().allow('', null),
		extras: Joi.string().allow('', null),
		note: Joi.string().allow('', null),
		spaceMixId: Joi.string().allow('', null),
		length_of_stay: Joi.string().allow('', null),
		move_in_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		createNewContact: Joi.boolean().truthy(1, "1").falsy("0", 0),
		Contact: contactObj,
		lead_type: Joi.string().allow('', null),
    	tracking: Joi.object().keys({
     	visitor_id:  Joi.string().allow('', null),
      	touchpoints: Touchpoints
		})
	}),
}
