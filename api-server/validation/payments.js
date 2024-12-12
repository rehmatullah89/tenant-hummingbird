var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
var PaymentMethod = require('./objects/payment_method.js');
var Enums = require('../modules/enums.js')

const paymentMethodObj = Object.assign({}, PaymentMethod);


module.exports = {
	createPayment: Joi.object().keys({
		payment: Joi.object().keys({
			lease_id: Joi.string().length(10).required(),
			amount:Joi.number().max(99999).required(),
			date: Joi.date().format('YYYY-MM-DD').required(),
			payment_method_id: Joi.string().length(10).allow(null, ''),
			payment_method: paymentMethodObj,
			nonce: Joi.string().allow(null, ''),
			type: Joi.string().valid('cash', 'check', 'giftcard', 'card', 'ach', 'paypal', 'google','amazon', 'apple').allow(null, ''),
			source: Joi.string().valid('in-store', 'telephone/moto', 'e-commerce', 'auto').insensitive().allow(null, ''),
			ref_name: Joi.string().allow(null, ''),
			number: Joi.string().allow(null, ''),
			notes: Joi.string().allow(null, ''),
			params: Joi.object()
		}),
		invoices: Joi.array().items(Joi.object().keys({
			id: Joi.string().length(10),
			amount: Joi.alternatives().try(Joi.string(), Joi.number()),
		}))
	}),

  createBulkPayment: Joi.object().keys({
      lease_id: Joi.string().length(10).required(),
      amount:Joi.number().max(99999).required(),
      date: Joi.date().format('YYYY-MM-DD').required(),
      payment_method_id: Joi.string().length(10).allow(null, ''),
      payment_method: paymentMethodObj,
      nonce: Joi.string().allow(null, ''),
      type: Joi.string().valid('cash', 'check', 'card', 'giftcard', 'ach', 'paypal', 'google','amazon', 'apple').allow(null, ''),
      source: Joi.string().valid('in-store', 'telephone/moto', 'e-commerce').insensitive().allow(null, ''),
      ref_name: Joi.string().allow(null, ''),
      number: Joi.string().allow(null, ''),
      notes: Joi.string().allow(null, ''),
      params: Joi.object()
  }),

	applyPayment: Joi.object().keys({
		invoices: Joi.array().required().items(Joi.object().keys({
			id: Joi.string().length(10),
			amount: Joi.alternatives().try(Joi.string(), Joi.number())
		}))
	}),
	refundPayment: Joi.object().keys({
		amount: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		reason: Joi.string().required().max(1000),
		invoices: Joi.array().items(Joi.object().keys({
			invoices_payment_id: Joi.string().length(10),
			amount: Joi.alternatives().try(Joi.string(), Joi.number()),
			number: Joi.string().optional(),
			invoice_amount: Joi.number().optional()
		})),
		is_prepay: Joi.boolean().allow(null),
		reversal_type: Joi.string().valid(Object.values(Enums.REVERSAL_TYPES)).allow(null, Enums.REVERSAL_TYPES.REFUND),
		is_auction_retained_revenue_refund: Joi.boolean().allow(null),
		refund_to: Joi.string().allow(null),
		refund_contact_id: Joi.string().allow(null)
	})
}
