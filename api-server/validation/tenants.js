var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const Contact = require('./objects/contact.js');
const Phone = require('./objects/phone.js');
const ContactAddress = require('./objects/contact_address.js');
const Relationship = require('./objects/relationship.js');


var contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(ContactAddress);
contactObj.Relationships =  Joi.array().items(Relationship);


module.exports = {

	createTenant: {
		body: Joi.object().keys({
			id: Joi.string().length(10).allow('', null),
			lease_id: Joi.string().length(10).allow('', null),
			contact_id: Joi.string().allow('', null),
			type: Joi.string().allow('', null),
			sort: Joi.number().allow('', null),
			created_at: Joi.string().allow('', null),
			Contact: contactObj
		})


	}
};

 


// Relationships: Joi.array().items(Joi.object().keys({
// 	Contact:    Joi.object().keys({
// 		id: Joi.string().length(10).allow('', null),
// 		salutation: Joi.string().allow('', null),
// 		first: Joi.string(),
// 		middle: Joi.string().allow('', null),
// 		last: Joi.string(),
// 		suffix: Joi.string().allow('', null),
// 		company: Joi.string().allow('', null),
// 		email: Joi.string().email().allow('', null),
// 		source: Joi.string().allow('', null),
// 		dob: Joi.date().format('YYYY-MM-DD').allow('', null),
// 		ssn: Joi.string().regex(/^[0-9]{3}\-?[0-9]{2}\-?[0-9]{4}$/).allow('', null),
// 		gender: Joi.string().valid('male', 'female', 'no response').insensitive().allow('', null),
// 		driver_license: Joi.string().allow('', null),
// 		active_military: Joi.boolean().allow('', null),
// 		military_branch: Joi.string().allow('', null),
//
// 		Phones:         Joi.array().items(Joi.object().keys({
// 			id:         Joi.string().length(10).allow('', null),
// 			contact_id: Joi.string().length(10).allow('', null),
// 			created_at: Joi.any(),
// 			type:       Joi.string().allow('', null),
// 			phone:      Joi.any().allow('', null),
// 			sms:        Joi.boolean().allow('', null)
// 		})),
// 		Addresses: Joi.array().items(Joi.object().keys({
// 			id:   Joi.string().length(10).allow('', null),
// 			address_id: Joi.any().allow('', null),
// 			type:   Joi.string().allow('', null),
// 			address: Joi.string().allow('', null),
// 			number: Joi.any().allow('', null),
// 			city: Joi.string().allow('', null),
// 			state: Joi.string().allow('', null),
// 			neighborhood: Joi.string().allow('', null),
// 			country: Joi.string().allow('', null),
// 			lat: Joi.number().min(-90).max(90).allow(null,''),
// 			lng: Joi.number().min(-180).max(180).allow(null,''),
// 			zip: Joi.any().allow('', null)
// 		}))
// 	}),
// 	contact_id:             Joi.string().allow('', null),
// 	created_at:             Joi.any(),
// 	related_contact_id:     Joi.string().allow('', null),
// 	type:                   Joi.string().allow('', null),
// 	is_emergency:           Joi.boolean().allow('', null),
// 	is_cosigner:            Joi.boolean().allow('', null),
// 	is_military:            Joi.boolean().allow('', null),
// 	lease_id:               Joi.boolean().allow('', null)
// }))
