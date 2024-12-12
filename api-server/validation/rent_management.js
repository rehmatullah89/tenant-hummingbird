const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);


module.exports = {
    companyRentManagement: Joi.object().keys({
        round_to: Joi.string().valid('nearest-full', 'nearest-half', 'up-full', 'up-half', 'down-full', 'down-half').allow(null, '').required()
    }),
    propertyRentManagement: Joi.object().keys({
        active: Joi.boolean().required(),
        approval_type: Joi.when(`active`, {
            is: true,
            then: Joi.string().valid('automated', 'manual').required(),
        }),
        enable_automatic_rent_change: Joi.when(`active`, {
            is: true,
            then: Joi.boolean().required()
        }),
        advance_rent_change_queue_months: Joi.when(`enable_automatic_rent_change`, {
            is: true,
            then: Joi.number().min(1).max(12).integer().required(),
            otherwise: Joi.number().positive().integer().max(12).allow(null, '')
        }),
        notification_period: Joi.when(`active`, {
            is: true,
            then: Joi.number().positive().integer().required(),
        }),
        notification_document_id: Joi.when(`active`, {
            is: true,
            then: Joi.string().required(),
        }),
        round_to: Joi.when(`active`, {
            is: true,
            then: Joi.string().valid('nearest-full', 'nearest-half', 'up-full', 'up-half', 'down-full', 'down-half').allow(null, '').required(),
        }),
        // default_space_group_profile_id: Joi.when(`active`, {
        //     is: true,
        //     then: Joi.string().required(),
        // }),
        min_rent_change_interval: Joi.when(`active`, {
            is: true,
            then: Joi.number().max(12).positive().integer().required(),
        }),
        rent_cap: Joi.when(`active`, {
            is: true,
            then: Joi.object().keys({
                type: Joi.string().valid(`sell_rate_percent`, `set_rate_percent`).label(`rent_cap.type`).required(),
                value: Joi.number().positive().integer().min(1).required().label(`rent_cap.value`),
            }).required(),
        }),
        delivery_methods: Joi.when('active', {
            is: true,
            then: Joi.array()
              .unique('method.id')
              .items(
                Joi.object().keys({
                  active: Joi.boolean().required(),
                  method: Joi.object().keys({
                    id: Joi.string().required(),
                    key: Joi.string().required(),
                  }),
                  subject: Joi.when('method.key', {
                    is: Joi.string().valid('registered_email', 'standard_email').required(),
                    then: Joi.string().required(),
                    otherwise: Joi.string().allow(null, "").optional(),
                  }),
                  message: Joi.when('method.key', {
                    is: Joi.string().valid('registered_email', 'standard_email').required(),
                    then: Joi.string().required(),
                    otherwise: Joi.string().allow(null, '').optional(),
                  }),
                }).required()
              )
              .allow(null)
              .required(),
          }),
          
        rent_engine: Joi.string().valid("hummingbird", "prorize", "veritec", "price_monster").required()

    }),

    createRentManagementPlan: Joi.object().keys({
        name: Joi.string().required(),
        description: Joi.string().allow(null, ``),
        tags: Joi.array().unique().items(Joi.string().valid("parking", "storage").required()).required(),
        prepay_rent_raise: Joi.boolean().required(),
        maximum_raise: Joi.object().keys({
            type: Joi.string().valid(`dollar_amount`, `rent_percent`, `rent_sell_variance_percent`, `sell_rate_percent`, `set_rate_percent`).required().label(`maximum_raise.type`),
            value: Joi.number().required().label(`maximum_raise.value`).when(`type`, {
                is: `dollar_amount`,
                then: Joi.number().precision(2).min(1).less(10000000),
            }).concat(Joi.number().when(`type`, {
                is: `rent_sell_variance_percent`,
                then: Joi.number().greater(-100).less(1000),
                otherwise: Joi.number().required().integer().min(1).less(1000)
            }))
        }).required(),
        minimum_raise: Joi.object().keys({
            type: Joi.string().valid(`dollar_amount`, `rent_percent`).label(`minimum_raise.type`),
            value: Joi.number().positive().min(1).required().label(`minimum_raise.value`).when(`type`, {
                is: `dollar_amount`,
                then: Joi.number().precision(2).less(10000000),
                otherwise: Joi.number().integer().max(999)
            }),
        }).required(),
        rent_cap: Joi.object().keys({
            type: Joi.string().valid(`sell_rate_percent`, `set_rate_percent`).required().label(`rent_cap.type`),
            value: Joi.number().positive().integer().min(1).max(999).required().label(`rent_cap.value`),
        }).allow(null, ``),
        settings: Joi.array().items(
            Joi.object().keys({
                month: Joi.number().positive().integer().max(999).required().label(`settings.month`),
                sort_order: Joi.number().integer().min(0).max(999).required().label(`settings.sort_order`),
                recurrence_interval: Joi.number().integer().min(1).max(999).allow(null).label(`settings.recurrence_interval`),
                increase_by: Joi.object().keys({
                    change_type: Joi.string().valid(`dollar_amount`, `rent_percent`).required().label(`settings.increase_by.change_type`),
                    change_value: Joi.number().min(1).positive().required().label(`settings.increase_by.change_value`).when(`change_type`, {
                        is: `dollar_amount`,
                        then: Joi.number().precision(2).less(10000000),
                        otherwise:  Joi.number().integer().max(999)
                    }),
                }).allow(null).label(`settings.increase_by`),
                target: Joi.object().keys({
                    before: Joi.object().keys({
                        target_type: Joi.string().valid(`dollar_amount`, `rent_percent`, `rent_sell_variance_percent`, `sell_rate_percent`, `set_rate_percent`).required().label(`settings.target.before.target_type`),
                        target_value: Joi.number().required().label(`settings.target.before.target_value`).when(`target_type`, {
                            is: `dollar_amount`,
                            then: Joi.number().precision(2).min(1).less(10000000),
                        }).concat(Joi.number().when(`target_type`, {
                            is: `rent_sell_variance_percent`,
                            then: Joi.number().greater(-100).less(1000),
                            otherwise: Joi.number().required().integer().min(1).less(1000)
                        })),
                    }).required().label(`settings.target.before`),
                    after: Joi.object().keys({
                        change_type: Joi.string().valid(`dollar_amount`, `rent_percent`).label(`settings.target.after.change_type`),
                        change_value: Joi.number().positive().min(1).required().label(`settings.target.after.change_value`).when(`change_type`, {
                            is: `dollar_amount`,
                            then: Joi.number().precision(2).less(10000000),
                            otherwise: Joi.number().integer().max(999)
                        }),
                    }).required().label(`settings.target.after`)
                }).allow(null).label(`settings.target`)
            }).required().label(`settings-object`)
        ).required().label(`settings`),
        active: Joi.boolean().allow(null, ''),
        verified: Joi.boolean().allow(null, '')
    }),

    createRentDefaultPlan: {
        body: Joi.object().keys({
            plans: Joi.array().items(
                Joi.object().keys({
                    value_tier_type: Joi.string().valid('good', 'better', 'best').required(),
                    rent_plan_id: Joi.string().required(),
                }).min(1).required(),
            ).unique('value_tier_type').allow(null, '').required(),
        
        }),
        params: Joi.object({
            space_type: Joi.string().valid("parking", "storage"),
            company_id: Joi.string().required(),
            property_id: Joi.string().required()
        })
    },

    tenantRentChangeStatus: {
        body: Joi.object().keys({
            rent_change_ids: Joi.array().items(
                Joi.string().required()
            ).required(),
            note: Joi.string().required(),
            months_skipped: Joi.number().min(1).max(999).integer().allow(null, ''),
            resolve: Joi.boolean()
        }),
        params: Joi.object({
            company_id: Joi.string().required(),
            property_id: Joi.string().required(),
            action: Joi.string().required().valid(`skip`, `cancel`, `resolve`)
        })
    },

    tagRentChange: {
        body: Joi.object().keys({
            rent_change_ids: Joi.array().items(
                Joi.string().required()
            ).required(),
            tag: Joi.boolean().required(),
            note: Joi.string().allow(null, ''),
        }),
        params: Joi.object({
            company_id: Joi.string().required(),
            property_id: Joi.string().required(),
        })
    },

    approveRentChange: {
        body: Joi.object().keys({
            month: Joi.string(),
            rent_change_ids: Joi.array().items(
                Joi.string()
            )
        }),
        params: Joi.object({
            company_id: Joi.string().required(),
            property_id: Joi.string().required()
        })
    },

    RentManagementLeaseSettings: {
        params: Joi.object({
            company_id: Joi.string().required(),
            property_id: Joi.string().required(),
            lease_id: Joi.string()
        }),
        bulk: {
            body: Joi.object().keys({
                lease_ids: Joi.array().min(1).unique().required(),
                status: Joi.string().valid("exempt", "active").required(),
                note: Joi.string().allow(null, ''),
            })
        }
    },

    changeLeaseRentPlan: {
        body: Joi.object().keys({
            rent_plan_id: Joi.string().required()
        })
    },

    changeLeasesRentPlans: {
        body: Joi.array().items(
            Joi.object().keys({
                rent_plan_id: Joi.string().required(),
                lease_id: Joi.string().required()
            })).min(1).unique('lease_id').error(errors => {
                let errorCodes = { 'array.unique': 'lease_id must be unique' }
                errors.forEach((error) => {
                    if (errorCodes[error.type]) error.message = errorCodes[error.type]
                })
                return errors
            })
    },

    rentChange: Joi.array().min(1).items(
		Joi.object().keys({
			lease_id: Joi.string().required(),
			change_value: Joi.number().positive().allow(0).precision(2).required(),
            change_type: Joi.string().valid('rent_percent', 'dollar_amount', 'fixed').required(),
			target_date: Joi.date().format('YYYY-MM-DD').required(),
            affect_timeline: Joi.boolean().required(),
			dryrun: Joi.boolean().allow(null),
            note: Joi.string().allow(null, '').required(),
		})
	).unique('lease_id'),

    editRentChange: Joi.array().min(1).items(
		Joi.object().keys({
			rent_change_id: Joi.string().required(),
			change_value: Joi.number().positive().allow(0).precision(2).required(),
            change_type: Joi.string().valid('rent_percent', 'dollar_amount', 'fixed').required(),
			target_date: Joi.date().format('YYYY-MM-DD').required(),
            affect_timeline: Joi.boolean().required(),
			dryrun: Joi.boolean().allow(null),
            note: Joi.string().allow(null, '').required(),
		})
	).unique('rent_change_id'),

    customVariance: {
        body: Joi.object().keys({
            active:Joi.boolean().required(),
            date: Joi.date().format('YYYY-MM-DD').allow(null)
        }),
        params: Joi.object({
            company_id: Joi.string().required(),
            property_id: Joi.string().required()
        })
    }

}