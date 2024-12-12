var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

const Military = require('./military.js');
// const Phone = require('./phone.js');
// const Address = require('./contact_address.js');


module.exports = {
	id: Joi.string().length(10).allow('', null),
	user_id: Joi.string().length(10).allow('', null),
	company_id: Joi.string().length(10).allow('', null),
	welcome:  Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	salutation: Joi.string().allow('', null),
	first: Joi.string().allow('', null),
	middle: Joi.string().allow('', null),
	last: Joi.string().allow('', null),
	suffix: Joi.string().allow('', null),
	company: Joi.string().allow('', null),
	email: Joi.string().email().allow('', null),
	emailVerificationToken: Joi.string().regex(/^otp[a-zA-Z0-9]{32}$/).allow('', null),
	dob: Joi.date().format('YYYY-MM-DD').allow('', null).error(new Error('Please enter a valid date of birth')),
	ssn: Joi.string().allow('', null),
	gender: Joi.string().valid('male', 'female', 'no response').insensitive().allow('', null),
	driver_license: Joi.string().allow('', null),
	driver_license_state: Joi.string().allow('', null),
	driver_license_country: Joi.string().allow('', null),
	driver_license_city: Joi.string().allow('', null),
	driver_license_exp: Joi.date().format('YYYY-MM-DD').allow('', null),
	active_military: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	have_secondary_contact: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
	source: Joi.string().allow('', null),
	notes: Joi.string().allow('', null),
	updatedFieldName: Joi.string().allow('', null),
	driver_license_confidence_interval: Joi.number().allow('', null),
	// Military: Joi.object().keys(Military),
	Business: Joi.object().keys({
		id: Joi.string().length(10).allow('', null),
		address_id: Joi.string().length(10).allow('', null),
		contact_id: Joi.string().length(10).allow('', null),
		name: Joi.string().allow('', null),
		phone_type: Joi.string().allow('', null),
		phone: Joi.string().allow('', null),
		country_code: Joi.string().allow('', null),
		Address: Joi.object().keys({
			id: Joi.string().length(10).allow('', null),
			neighborhood: Joi.string().allow('', null),
			country: Joi.string().allow('', null),
			lat: Joi.number().min(-90).max(90).allow(null, ''),
			lng: Joi.number().min(-180).max(180).allow(null, ''),
			formatted_address: Joi.string().length(10).allow('', null),
			address: Joi.string().allow('', null),
			address2: Joi.string().allow('', null),
			city: Joi.string().allow('', null),
			state: Joi.string().allow('', null),
			zip: Joi.string().allow('', null),
		}),
	}),
}
