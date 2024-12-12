var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
var PaymentMethod = require('./objects/payment_method.js');
var Contact = require('./objects/contact.js');
var Phone = require('./objects/phone.js');
var ContactAddress = require('./objects/contact_address.js');
var Relationship = require('./objects/relationship.js');
var Enums = require(__dirname + '/../modules/enums.js');

const paymentMethodObj = Object.assign({}, PaymentMethod);
const contactObj = Object.assign({}, Contact);

contactObj.Phones =  Joi.array().items(Phone);
contactObj.Addresses =  Joi.array().items(ContactAddress);
contactObj.Relationships =  Joi.array().items(Relationship);
contactObj.contact_id = Joi.string().length(10).allow('', null)

const ownerInfo = Joi.object().keys({
	address_id: Joi.string().allow('', null),
	first_name: Joi.string().allow('', null),
	last_name: Joi.string().allow('', null),
	address_id: Joi.string().allow('', null),
	address: Joi.string().allow('', null),
	address2: Joi.string().allow('', null),
	zip: Joi.string().allow('', null),
	state: Joi.string().allow('', null),
	country: Joi.string().allow('', null),
	city: Joi.string().allow('', null),
	is_tenant: Joi.boolean().truthy(1, "1").falsy(0, "0").allow('', null)
})

module.exports = {
	createTenantAdmin: Joi.object().keys({
		id: Joi.string().length(10).allow('', null),
		lease_id: Joi.string().length(10).allow('', null),
		contact_id: Joi.string().allow('', null),
		type: Joi.string().allow('', null),
		sort: Joi.number().allow('', null),
		created_at: Joi.string().allow('', null),
		Contact: contactObj,
		Access: Joi.object().keys({
			id:             Joi.string().length(10).allow('', null),
			contact_id:     Joi.string().length(10).allow('', null),
			property_id:    Joi.string().length(10).allow('', null),
			pin:            Joi.any().allow('', null),
			external_id:    Joi.string().allow('', null),
			access_id:      Joi.string().length(10).allow('', null),
			status:         Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
		})
	}),
	createPayment: Joi.object().keys({
		payment_method_id: Joi.string().length(10),
		payment_amount: Joi.number().max(99999).required(),
		nonce: Joi.string(),
		PaymentMethod: paymentMethodObj
	}),
	createPaymentMethod: Joi.object().keys(paymentMethodObj),
	createTenant: Joi.object().keys(contactObj),
	createInvoice: Joi.object().keys({
		date: Joi.date().format('YYYY-MM-DD').allow(null),
		due: Joi.date().format('YYYY-MM-DD').allow(null),
		Lines: Joi.array().items(Joi.object().keys({
			product_id:   Joi.string().required(),
			qty:   Joi.number().required()
		}))
	}),
	createLease: Joi.object().keys({
		start_date: Joi.date().format('YYYY-MM-DD').required(),
		end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		unit_id:  Joi.string().length(10).required(),
    promotions: Joi.array().items(Joi.object().keys({
      promotion_id:   Joi.string().length(10)
    })),
    coupons: Joi.array(),
    discount_id: Joi.string().length(10).allow('', null),
		rent:  Joi.number().min(0).required(),
		send_invoice:  Joi.boolean().truthy(1, "1").falsy("0", 0),
		decline_insurance:  Joi.boolean().truthy(1, "1").falsy("0", 0),
		bill_day:  Joi.number().min(1).max(31),
		security_deposit:  Joi.number().min(0),
		reservation_id:  Joi.string().length(10).allow('', null),
		application_id:  Joi.string().length(10).allow('', null),
		notes:  Joi.string().allow('', null),
		terms:  Joi.string().allow('', null),
		insurance_exp_month: Joi.number().min(1).max(12).allow('', null),
        insurance_exp_year: Joi.string().length(4).allow('', null),

	}),
	createService: Joi.object().keys({
		lease_id:  Joi.string().length(10),
		product_id:  Joi.string().length(10).required(),
		start_date: Joi.date().format('YYYY-MM-DD').required(),
		end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		price:  Joi.number().min(0).required(),
		name:  Joi.string().required(),
		description:  Joi.string().allow('', null),
		prorate:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
    prorate_out:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		taxable: Joi.boolean().truthy(1, "1").falsy("0", 0),
		recurring:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		qty:   Joi.number().min(1).required()
	}),
	updateService: Joi.object().keys({
		start_date: Joi.date().format('YYYY-MM-DD').required(),
		end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		price:  Joi.number().min(0).required(),
		taxable: Joi.boolean().truthy(1, "1").falsy("0", 0),
		name:  Joi.string().required(),
		description:  Joi.string().allow('', null),
		prorate:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
    prorate_out:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		recurring:  Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		qty:   Joi.number().min(1).required()
	}),
	declineInsurance: Joi.object().keys({
		decline_insurance: Joi.boolean().truthy(1, "1").falsy("0", 0).required(),
		insurance_exp_month:  Joi.number().allow('', null),
		insurance_exp_year:  Joi.string().allow('', null)
	}),
	templateInsurance: Joi.object().keys({
		insurance_id: Joi.string().length(10).required()
	}),

	createChecklistItem: Joi.object().keys({
		name:  Joi.string(),
		description:  Joi.string().allow('', null),
		document_id:  Joi.string().length(10).allow('', null),
		document_type_id:  Joi.string().length(10).allow('', null),
		require_all:  Joi.boolean().truthy(1, "1").falsy("0", 0)
	}),
	updateChecklistItem: Joi.object().keys({
		upload_id:  Joi.string().length(10).allow('', null),
    completed:  Joi.boolean().truthy(1, "1").falsy("0", 0)
	}),
	finalizeLease: Joi.object().keys({
		billed_months:  Joi.number().min(0).allow('', null),
    dryrun: Joi.boolean().truthy(1, "1").falsy("0", 0),
    total: Joi.number(),
		payment:  Joi.object().keys({
      date: Joi.date().format('YYYY-MM-DD').allow('', null),
			amount: Joi.number().min(0).allow('', null),
			payment_method_id: Joi.string().length(10).allow('', null),
      contact_id: Joi.string().length(10).allow('', null),
      property_id: Joi.string().length(10).allow('', null),
			method: Joi.string().valid('cash', 'check', 'giftcard', 'ach', 'card').insensitive().allow('', null),
			ref_name: Joi.string().allow('', null),
			number: Joi.string().allow('', null),
      source: Joi.string().allow('', null),
      type: Joi.string().allow('', null),
      transaction_id: Joi.string().allow('', null),
			notes: Joi.string().allow('', null)
		}),
    paymentMethod: paymentMethodObj,
	threshold:  Joi.boolean().truthy(1, "1").falsy("0", 0)
	}),

	autopay: Joi.object().keys({
		payment_methods: Joi.array().items(
			Joi.object().keys({
				id: Joi.string().length(10).required().allow('', null),
				rent: Joi.number().min(0).required().allow('', null),
				utilities: Joi.number().min(0).required().allow('', null)
			})
		)
	}),

	updateStanding: Joi.object().keys({
		lease_standing_id: Joi.string().length(10).required().allow('', null)
	}),

	updateLease: Joi.object().keys({
		auto_pay_after_billing_date: Joi.number().min(0).max(31),
		sensitive_info_stored: Joi.boolean().truthy(1, "1", true).falsy(0, "0", false)
	}),

	saveVehicle: Joi.object().keys({
		id: Joi.string().allow('', null),
    contact_id: Joi.string().allow('', null),
    type: Joi.string().valid(Object.values(Enums.VEHICLE_TYPES)).when('active', { is: 0 || false, then: '', otherwise: Joi.required() }),
    make: Joi.string().allow('', null),
    year: Joi.string().allow('', null),
    model: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    license_plate_number: Joi.string().allow('', null),
    license_plate_state: Joi.string().allow('', null),
    license_plate_country: Joi.string().allow('', null),
		registration_expiry_date: Joi.date().format('YYYY-MM-DD').allow('', null),
    registration_upload_id: Joi.string().allow('', null), 
    insurance_provider_name: Joi.string().allow('', null),
    insurance_policy_upload_id: Joi.string().allow('', null),
    vechile_identification_number: Joi.string().allow('', null),
    hull_identification_number: Joi.string().allow('', null),
    serial_number: Joi.string().allow('', null),
    approximation_value: Joi.number().allow('', null),
    registered_owner: ownerInfo,
    legal_owner: ownerInfo,
	    active: Joi.boolean().truthy(1, "1").falsy(0, "0").allow('', null)
	}),

	sendEsignLink: Joi.object().keys({
		email: Joi.string().email().allow('', null),
		phone: Joi.string().allow('', null),
		message: Joi.string().allow('', null),
	}),

	// Validation for saving stored contents of a lease
	leaseStoredContents: Joi.array().items(Joi.object().keys({
		id: Joi.string().allow('', null),
		stored_content_id: Joi.string().required(),
		name: Joi.string().allow('', null),
		value: Joi.string().allow('', null)
	}))
}
