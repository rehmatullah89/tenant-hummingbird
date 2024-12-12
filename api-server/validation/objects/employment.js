var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);



module.exports = Joi.object().keys({
	id: Joi.string().length(10).allow('', null),
	contact_id: Joi.string().length(10).allow('', null),
	status: Joi.array().allow(null),
	employer: Joi.string().allow('', null),
	start_date: Joi.date().format('YYYY-MM-DD').allow('', null),
	end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
	position: Joi.string().allow('', null),
	supervisor: Joi.string().allow('', null),
	phone: Joi.any().allow('', null),
	salary: Joi.any().allow('', null),
	salary_timeframe: Joi.string().valid('hour', 'month', 'year').insensitive().required()
});
