var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const Address = require('./objects/address.js');
const Enums = require(__dirname + '/../modules/enums.js');

const Phone = Joi.object().keys({
	id:   Joi.string().length(10).allow('', null),
	property_id:   Joi.string().length(10).allow('', null),
	type:   Joi.string().allow('', null),
	phone:  Joi.any().allow('', null),
	sort:   Joi.number(),
});


const Email = Joi.object().keys({
	id:   Joi.string().length(10).allow('', null),
	property_id:   Joi.string().length(10).allow('', null),
	type:   Joi.string().allow('', null),
	email:  Joi.string().allow('', null),
	sort:   Joi.number(),
});

const Device = Joi.object().keys({
	id:   Joi.string().length(10).allow('', null),
	connection_id:   Joi.string().length(10).allow('', null),
	name:   Joi.string().allow('', null),
	ip:  Joi.string().allow('', null),
	port:   Joi.number(),
	identifier:  Joi.string().allow('', null),
	lan:  Joi.number()
});

const TaxRate = Joi.object().keys({
	id: Joi.string().allow('', null),
	tax_rate: Joi.number().required(),
	tax_profile_id: Joi.string().max(45).required(),
	type: Joi.string().valid(Object.values(Enums.SPACE_TYPES), Object.values(Enums.PRODUCT_TYPES)).required()
});

module.exports = {
	createProperty: Joi.object().keys({
		name: Joi.string().required(),
		legal_name: Joi.string().allow('', null),
		gds_id: Joi.string().allow('', null),
		place_id: Joi.string().allow('', null),
		utc_offset: Joi.number().allow('', null),
		number: Joi.string().max(45).allow('', null),
		description: Joi.string().allow('', null),
		Address: Address,
		Emails:  Joi.array().items(Email),
		Phones:  Joi.array().items(Phone),
	}),
	createNonHbProperty: Joi.object().keys({
		name: Joi.string().required(),
		legal_name: Joi.string().allow('', null),
		gds_id: Joi.string().allow('', null),
		place_id: Joi.string().allow('', null),
		utc_offset: Joi.number().allow('', null),
		number: Joi.string().max(45).allow('', null),
		description: Joi.string().allow('', null),
		Address: Address,
		email:  Joi.string().allow('', null),
		phone:  Joi.string().allow('', null),
	}),

	updateProperty: Joi.object().keys({
		id: Joi.string().length(10).allow('', null),
		name: Joi.string(),
		legal_name: Joi.string().allow('', null),
		number: Joi.string().max(45).allow('', null),
		gds_id: Joi.string().allow('', null),
		description: Joi.string().allow('', null),
		Address: Address,
		Phones:  Joi.array().items(Phone),
		Emails:  Joi.array().items(Email)
	}),
	updateNonHummingbirdProperty: Joi.object().keys({
		id: Joi.string().length(10).allow('', null),
		name: Joi.string(),
		legal_name: Joi.string().allow('', null),
		number: Joi.string().max(45).allow('', null),
		gds_id: Joi.string().allow('', null),
		description: Joi.string().allow('', null),
		Address: Address,
		email:  Joi.string().allow('', null),
		phone:  Joi.string().allow('', null),
	}),
	createPropertyHours: Joi.object().keys({
		start_hr: Joi.number().required(),
		start_min: Joi.number().required(),
		start_ap: Joi.string().required(),
		end_hr: Joi.number().required(),
		end_min: Joi.number().required(),
		end_ap: Joi.string().required(),
		first_day: Joi.string().required(),
		last_day: Joi.string().required(),
		type: Joi.string().required(),
		order: Joi.number().allow(null)
	}),
	updatePropertyHours: Joi.object().keys({
		id: Joi.string().length(10),
		property_id: Joi.string().length(10),
		start_hr: Joi.number().required(),
		start_min: Joi.number().required(),
		start_ap: Joi.string().required(),
		end_hr: Joi.number().required(),
		end_min: Joi.number().required(),
		end_ap: Joi.string().required(),
		first_day: Joi.string().required(),
		last_day: Joi.string().required(),
		type: Joi.string().required(),
		order: Joi.number().allow(null)
	}),
	createPhone: Joi.object().keys({
		number: Joi.string(),
		type: Joi.string()
	}),

	createEmail: Joi.object().keys({
		email: Joi.string().email(),
		type: Joi.string()
	}),

	createProduct: Joi.object().keys({
		// product_id: Joi.string().length(10).required(),
		price: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null,''),
		prorate: Joi.boolean().truthy(1, "1").falsy("0", 0),
		prorate_out: Joi.boolean().truthy(1, "1").falsy("0", 0),
		recurring: Joi.boolean().truthy(1, "1").falsy("0", 0),
		taxable: Joi.boolean().truthy(1, "1").falsy("0", 0),
		inventory: Joi.number().allow(null),
		amount_type: Joi.string().valid('fixed', 'variable','scheduled','percentage'),
		Rules: Joi.array().allow(null),
		income_account_id: Joi.string().allow(null,''),
	}),


	propertyConnection: Joi.object().keys({
		id: Joi.string().length(10),
		property_id: Joi.string().length(10),
		name: Joi.string(),
		type: Joi.string().required(),
		value: Joi.object().required(),
		status: Joi.string(),
		account_number: Joi.string(),
		Devices:  Joi.array().items(Device),
	}),
	propertyConnectionApplication: Joi.object().keys({
		id: Joi.string().length(10),
		property_id: Joi.string().length(10),
		name: Joi.string(),
		type: Joi.string().required(),
		value: Joi.object().required(),
		Devices:  Joi.array().items(Device),
	}),

	setTemplate: Joi.object().keys({
		unit_type: Joi.string().required().valid('residential','storage','parking'),
		lease_template_id: Joi.string().length(10).required(),
	}),

	createUnit: {
		address_id: Joi.string().length(10).allow('', null),
		product_id: Joi.string().length(10).required(),
		price: Joi.number().required(),
		set_rate: Joi.number().required(),
		floor: Joi.number().integer().required(),
		number: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		type: Joi.string().valid('storage','residential','parking'),
		category_id: Joi.string().length(10).allow('', null),
		available_date: Joi.date().format('YYYY-MM-DD').allow('', null),
		description: Joi.string().allow('', null),
		"door type": Joi.string().insensitive().allow('', null),
		"unit type": Joi.string().insensitive().allow('', null),
		furnished: Joi.boolean().truthy(1, "1").falsy("0", 0),
		laundry: Joi.string().allow('', null),
		status: Joi.boolean().truthy(1, "1").falsy("0", 0),
		featured: Joi.boolean().truthy(1, "1").falsy("0", 0),
		parking: Joi.string().allow('', null),
		pets: Joi.string().allow('', null),
		unit_type: Joi.string().allow('', null),
		'year built': Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
		'vehicle storage':  Joi.string().allow('', null),
		// Updated By BCT Team - HB-1046 - Space size validations updated for all space types
		width: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		height: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		length: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
		sqft: Joi.alternatives().try(Joi.string(), Joi.number()).when('type', {is: 'residential', then: Joi.required() }),
		beds: Joi.alternatives().try(Joi.string(), Joi.number()).when('type', {is: 'residential', then: Joi.required() }),
		baths: Joi.alternatives().try(Joi.string(), Joi.number()).when('type', {is: 'residential', then: Joi.required() }),
		'door width': Joi.allow('', null),
		'door height': Joi.allow('', null),
		scope: Joi.string().allow('', null),
	},



	utility: Joi.object().keys({
		product_id: Joi.string().required(),
		vendor_id: Joi.string().allow('', null),
		amount: Joi.number().allow('', null),
		splittype: Joi.string().valid('units', 'tenants', 'sqft', 'leases')
	}),
	updateUtility: Joi.object().keys({
		vendor_id: Joi.string().allow('', null),
		amount: Joi.number().allow('', null),
		splittype: Joi.string().valid('units', 'tenants', 'sqft', 'leases')
	}),
	propertyBill: Joi.object().keys({
		property_bills: Joi.array().items(Joi.object().keys({
			utility_id: Joi.string().required(),
			amount: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
			custom: Joi.object().allow('', null),
		}))
	}),
	maintenanceQuestion: Joi.object().keys({
		name: Joi.string().required(),
		vendor_id: Joi.string().length(10).allow('', null),
		email: Joi.array().allow(null),
		text: Joi.array().allow(null),
	}),
	maintenanceExtra: Joi.object().keys({
		name: Joi.string().required(),
		required: Joi.boolean().truthy(1, "1").falsy("0", 0)
	}),

	applicationConfig: Joi.object().keys({
		fields: Joi.object().keys({
			active_military: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			additional_info: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			address_history: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			allow_applications: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			applicant_info: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			bankruptcy: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			confirmation: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner_dob: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner_email: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner_name: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner_phone: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			cosigner_relationship: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			dob: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			driver_license: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			email: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			emergency_contact: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			emergency_email: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			emergency_phone: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			emergency_relationship: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			employer: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			employment_dates: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			employment_history: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			employment_status: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			evicted: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			first: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			gender: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			general_questions: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			last: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			middle: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			military_branch: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			phone: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			phone_business: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			phone_cell: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			phone_home: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			position: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address_dates: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address_landlord: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address_phone: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address_reason: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			previous_address_rent: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			refused_to_pay: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			salary: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			ssn: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			supervisor: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			supervisor_phone: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			terms_and_conditions: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			vehicle_make_model: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			}),
			vehicle_plate: Joi.object().keys({
				description: Joi.string().allow('', null),
				id: Joi.string().length(10).allow('', null),
				include: Joi.boolean().truthy(1, "1").falsy("0", 0),
				required: Joi.boolean().truthy(1, "1").falsy("0", 0)
			})
		})
	}),

	editTaxRate: {
		tax_rates: Joi.array().items(TaxRate)
  },
  reservationSettings:Joi.object().keys({
	maxAdvanceReservation: Joi.number()
}).required().min(1),
unitGroupRateChange:Joi.object().keys({
	price: Joi.number().positive().allow(0)
}).required().min(1),
	
Promotions: Joi.object().keys({
	name: Joi.string().required(),
	description: Joi.string().allow('', null),
	months: Joi.number().min(1).max(999).allow('', null),
	offset: Joi.number().min(0).max(999).allow('', null),
	type: Joi.string().valid('percent','dollar','fixed').required(),
	value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
	required_months: Joi.number().min(1).max(12).allow('', null),
	days_threshold: Joi.number().min(1).max(31).allow('', null),
	consecutive_pay: Joi.boolean().required(),
	enable: Joi.boolean().truthy(1, "1").falsy("0", 0),
	active_period: Joi.string().valid('active','date_range','end_on').required(),
	start_date: Joi.date().format('YYYY-MM-DD').allow('', null),
	end_date: Joi.date().format('YYYY-MM-DD').allow('', null),
	PromotionTypes: Joi.array().items(Joi.object().keys({
		promotion_type_id: Joi.string()
	})),
	rounding: Joi.object().keys({
		round_type: Joi.string().valid('up','down','nearest'),
		dollar_type: Joi.string().valid('half','full')
	}).required().allow(null)
})
}
