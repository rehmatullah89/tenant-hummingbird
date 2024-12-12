var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
var Contact = require('./objects/contact.js');
var Phone = require('./objects/phone.js');
var ContactAddress = require('./objects/contact_address.js');
var Relationship = require('./objects/relationship.js');
var Military = require('./objects/military.js');
var PaymentMethod = require('./objects/payment_method.js');
var Touchpoints = require('./objects/touchpoints.js');

const contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(ContactAddress);
contactObj.Relationships =  Joi.array().items(Relationship);
contactObj.Military = Joi.object().keys(Military); 

const paymentMethodObj = Object.assign({}, PaymentMethod);


module.exports = {
	createLease: {
		token : Joi.string().allow('', null),
		start_date: Joi.date().format('YYYY-MM-DD'),
		time: Joi.date().iso(),
		idv_id: Joi.string().allow('', null),
		promotions: Joi.array().items(Joi.object().keys({
			promotion_id:   Joi.string().length(10)
		})),
		payment_cycle: Joi.string().valid('Quarterly','Annual'),
		coupons: Joi.array(),
    	discount_id: Joi.string().length(10).allow('', null),
		insurance_id: Joi.string().allow('', null),
		products: Joi.array().items(Joi.object().keys({
			product_id:   Joi.string().length(10).allow('', null),
			qty:   Joi.number().allow('', null)
		})),
		stored_contents: Joi.array().items(Joi.object().keys({
			stored_content_id: Joi.string(),
			value: Joi.string().allow('', null)
		})),
		additional_months: Joi.number().integer().min(0),
		hold_token: Joi.string(),
		lead_id: Joi.string(),
		reservation_source: Joi.string().allow('', null),
		source: Joi.string().allow('', null),
		pending: Joi.boolean(),
		comments: Joi.string().allow('', null),
    	end_date:  Joi.date().format('YYYY-MM-DD'),
    	bill_day: Joi.number().integer().min(0).max(31),
		gate_code: Joi.string(),
		rent: Joi.number().min(0),
		security_deposit: Joi.number().min(0),
		contacts: Joi.array().items(contactObj),
		payment_method:  Joi.object().keys(paymentMethodObj),
		documents: Joi.array().items(Joi.object().keys({
			document_type:   Joi.string(),
			src:   Joi.string(),
			filename: Joi.string()
		})),
		reservation_id: Joi.string().allow('', null),
		tracking: Joi.object().keys({
			visitor_id:  Joi.string().allow('', null),
			touchpoints: Touchpoints
		}),
		auto_pay_after_billing_date: Joi.number().min(0).max(31),
		sensitive_info_stored: Joi.boolean().truthy(1, "1", true).falsy(0, "0", false).default(0),
		move_in_date: Joi.date().format('YYYY-MM-DD'),
		length_of_stay: Joi.string().allow('', null),
		content: Joi.string().allow('', null),
	},
	leaseSetUp: {
		start_date: Joi.date().format('YYYY-MM-DD'),
		promotions: Joi.array().items(Joi.object().keys({
			promotion_id:   Joi.string().length(10)
		})),
		payment_cycle: Joi.string().valid('Quarterly','Annual'),
		coupons: Joi.array(),
    	discount_id: Joi.string().length(10).allow('', null),
    	lease_id: Joi.string().allow('', null),
		insurance_id: Joi.string().allow('', null),
		products: Joi.array().items(Joi.object().keys({
			product_id:   Joi.string().length(10).allow('', null),
			qty:   Joi.number().allow('', null)
		})),
		additional_months: Joi.number().integer().min(0),
		hold_token: Joi.string(),
		reservation_id: Joi.string(),
    	tracking: Joi.object().keys({
			visitor_id:  Joi.string().allow('', null),
			touchpoints: Touchpoints
		})
	},
	apply: {
		contact: contactObj,
		Employment: Joi.array().items(Joi.object().keys({
			employer: Joi.string().allow('', null),
			start_date: Joi.date().format('YYYY-MM-DD').allow('', null),
			end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
			salary: Joi.number().allow('', null),
			salary_timeframe: Joi.string().allow('', null),
			status: Joi.array().items(Joi.string().allow('', null)),
			supervisior: Joi.string().allow('', null),
			position: Joi.string().allow('', null),
		})),
		bankruptcy: Joi.boolean().allow(null),
		evicted: Joi.boolean().allow(null),
		refused_to_pay: Joi.boolean().allow(null),
		driver_license_state: Joi.string().allow('', null),
		driver_license_country: Joi.string().allow('', null),
		terms_and_conditions: Joi.boolean().allow(null),
		vehicle_make: Joi.string().allow('', null),
		vehicle_model: Joi.string().allow('', null),
		vehicle_plate: Joi.string().allow('', null),
		vehicle_state: Joi.string().allow('', null),
		vehicle_country: Joi.string().allow('', null),
		vehicle_year: Joi.string().allow('', null),

	},
	rentRule: {
		apiKey_id:Joi.string().length(10),
		change: Joi.number().max(999),
		change_type: Joi.string().valid('$','%')
	},
	bulkEditPrices: Joi.array().items(
		Joi.object().keys({
			id: Joi.string(),
			adjusted: Joi.number().min(0),
			dryrun: Joi.boolean().allow(null),
			number: Joi.string(),
			price: Joi.number().min(0),
			set_rate: Joi.number().min(0),
			rounding: Joi.object().keys({
				round_type: Joi.string().valid('up','down','nearest'),
				dollar_type: Joi.string().valid('half','full')
		}).allow(null)
		})
	),
	userVerification: Joi.object().keys({
		data: Joi.object().keys({
			emailVerificationToken: Joi.string().regex(/^otp[a-zA-Z0-9]{32}$/).allow('', null),
			emailVerified: Joi.boolean().allow(null),
			phone: Joi.string().allow('', null),
			email: Joi.string().email().allow('', null),
			phoneVerificationToken: Joi.string().regex(/^otp[a-zA-Z0-9]{32}$/).allow('', null),
			phoneVerified: Joi.boolean().allow(null),
			tenantId: Joi.string().regex(/^tnt[a-zA-Z0-9]{32}$/).allow('', null),
		}),
	}).unknown(),
}
