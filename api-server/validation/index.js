var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	resetPassword: Joi.object().keys({
		email: Joi.string().required()
	}),
	register: Joi.object().keys({
		email: Joi.string().email().required()
	}),
	findUsernames: Joi.object().keys({
		email: Joi.string().email().required()
	}),

	login: Joi.object().keys({
		username: Joi.string().required(),
		password: Joi.string().required()
	}),
	authenticate: Joi.object().keys({
		username: Joi.string(),
		password: Joi.string(),
		property_id: Joi.string().length(10),
		unit_number: Joi.string(),
		gate_code: Joi.string(),
	}),

	resetPasswordConfirm: Joi.object().keys({
		username: Joi.string(),
		password: Joi.string(),
		password2: Joi.string()
	}),
	createCompany: Joi.object().keys({
		name: Joi.string().required(),
		firstname: Joi.string().required(),
		lastname: Joi.string().required(),
		email: Joi.string().email().required(),
		gds_owner_id: Joi.string(),
		platform_integration_enabled: Joi.boolean().truthy(1, "1").falsy("0", 0),
		phone: Joi.string().required(),
		subdomain: Joi.string().regex(/^[a-zA-Z0-9-_]+$/).required().error(() => {
			return {
				message: 'Invalid subdomain'
			}
		}),
		collection: Joi.string().required(),
		database: Joi.string().required(),
		redshift: Joi.string().required(),
		redshift_schema: Joi.string().required(),
		namespace: Joi.string().required()
	}),
	onboardCompany: Joi.object().keys({
		name: Joi.string().required(),
		email: Joi.string(),
		phone: Joi.string(),
		gds_owner_id: Joi.string(),
		subdomain: Joi.string().required(),
		collection: Joi.string().required(),
		database: Joi.string().required(),
		redshift: Joi.string().required(),
		redshift_schema: Joi.string().required(),
		namespace: Joi.string().required(),
	}),

}