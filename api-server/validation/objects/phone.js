var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = Joi.object().keys({
	id:   Joi.string().length(10).allow('', null),
	type:   Joi.string().allow('', null),
	phone:  Joi.any().allow('', null),
	sms:   Joi.boolean().truthy(1, "1").falsy("0", 0, '', null),
	primary: Joi.number().min(0).max(1).allow('', null),
	country_code: Joi.number().min(1).allow('', null),
	verificationToken: Joi.string().regex(/^otp[a-zA-Z0-9]{32}$/).allow('', null),
	phone_verified:   Joi.boolean().truthy(1, "1").falsy("0", 0, '', null)
})


