
var Contact = require('./objects/contact.js');
var Phone = require('./objects/phone.js');
var ContactAddress = require('./objects/contact_address.js');
var Relationship = require('./objects/relationship.js');
var Military = require('./objects/military.js');
var Vehicle = require('./objects/vehicle.js');
var Employment = require('./objects/employment.js');
var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);


var contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(ContactAddress);
contactObj.Relationships =  Joi.array().items(Relationship);
contactObj.Military =   Joi.object().keys(Military);
contactObj.Vehicles =  Joi.array().items(Vehicle);
contactObj.Employment =  Joi.array().items(Employment);

module.exports = {
	createContact: contactObj,
	updateLead: Joi.object().keys({
		source: Joi.string().allow('', null),
		property_id: Joi.string().length(10).allow('', null),
		unit_id: Joi.string().length(10).allow('', null),
		category_id: Joi.string().length(10).allow('', null),
		content: Joi.string().allow('', null),
		subject: Joi.string().allow('', null),
		note: Joi.string().allow('', null),
		length_of_stay: Joi.string().allow('', null),
		move_in_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		spaceMixId: Joi.string().allow('', null)
	}),
  retireLead: Joi.object().keys({
    reason: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    opt_out: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null)
  }),
	updateLeadStatus: Joi.object().keys({
		status: Joi.string().required()
	}),
	recordActivity: Joi.object().keys({
		Todo: Joi.object().keys({
			start_date: Joi.date().iso(),
			end_date: Joi.date().iso(),
			details: Joi.string().allow('', null),
			contact_id: Joi.string().length(10).allow('', null),
			pinned: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
		}),
		method: Joi.string().required(),
		content: Joi.string().required(),
		pinned: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
		created: Joi.date().iso(),
		context: Joi.string().required(),
		tenant_answer: Joi.string().allow('', null),
		ref_object_type: Joi.string().valid('lease').allow(null, ''),
		ref_object_id: Joi.string().allow('', null),
		property_id: Joi.string().allow('', null),
		space: Joi.string().allow('', null),
		unit_id: Joi.string().allow('', null),
		external_interaction:Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
		reject_reason:Joi.string().allow('', null),
		name:Joi.string().allow('', null),
		email:Joi.string().allow('', null),
		from:Joi.string().allow('', null),
		number:Joi.string().allow('', null),
		gds_notificationid:Joi.string().allow('', null),
		attachments:Joi.array().allow([], []),
		contact_type:Joi.string().allow('', null),
		status:Joi.string().allow('', null),
		subject:Joi.string().allow('', null)
	}),
}
