

var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
	create: Joi.object().keys({
		name: Joi.string().required(),
		description: Joi.string().allow('', null),
		label: Joi.string().valid('promotion','discount').required(),
		months: Joi.number().min(1).max(999).allow('', null),
		offset: Joi.number().min(0).max(999).allow('', null),
		pretax: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		type: Joi.string().valid('percent','dollar','fixed').required(),
		value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		required_months: Joi.number().min(1).allow('', null),
		days_threshold: Joi.number().min(1).max(31).allow('', null),
		consecutive_pay: Joi.boolean().required(),
		enable: Joi.boolean().truthy(1, "1").falsy("0", 0),
		active_period: Joi.string().valid('active','date_range','end_on').required(),
		start_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		Properties: Joi.array().allow(null),
		PromotionTypes: Joi.array().items(Joi.object().keys({
			promotion_type_id: Joi.string()
		})),
		PromotionRules: Joi.array().items(Joi.object().keys({
			id: Joi.string().allow('', null),
			object: Joi.string().required(),
			attribute: Joi.string().required(),
			comparison: Joi.string().required(),
			values: Joi.array().items(Joi.string())
		})),
		rounding: Joi.object().keys({
			round_type: Joi.string().valid('up','down','nearest'),
			dollar_type: Joi.string().valid('half','full')
		}).required().allow(null)
	}),
	sort: Joi.object().keys({
		promotions: Joi.array().items(
			Joi.object().keys({
				id: Joi.string().required()
			})
		)
	}),
	coupon: Joi.object().keys({
		code: Joi.string().regex(/^\S+$/).required(),
		description: Joi.string().allow('', null),
		max_uses: Joi.number().min(0),
		active: Joi.boolean().truthy(1, "1").falsy("0", 0),
		start_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
	}),
	createSpaceGroupPromotions: Joi.object().keys({
		promotions: Joi.array().items(
			Joi.object().keys({
				id: Joi.string().required(),
				website_promotion_type: Joi.string().valid('regular','military','student', 'senior', 'rent_now').required()
			})
		).unique('website_promotion_type')
	})
}




