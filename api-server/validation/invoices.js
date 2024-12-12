var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);


module.exports = {
	sendReview: Joi.object().keys({
		date: Joi.date().format('YYYY-MM-DD').required()
	}),
}