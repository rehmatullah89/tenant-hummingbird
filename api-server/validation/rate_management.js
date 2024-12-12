var BaseJoi = require("joi")
const Extension = require("joi-date-extensions")
const Joi = BaseJoi.extend(Extension)

const commmon = {
    round_to: Joi.string().valid("nearest-full", "nearest-half", "up-full", "up-half", "down-full", "down-half")
}

module.exports = {
    createRateManagement: Joi.object().keys({
        property_id: Joi.string().length(10).required(),
        name: Joi.string().required(),
        type: Joi.string().required(),
        change_length: Joi.number().when("type", { is: "auto", then: Joi.required(), otherwise: Joi.allow(null) }),
        change_period: Joi.string().when("type", { is: "auto", then: Joi.required(), otherwise: Joi.allow("", null) }),
        frequency: Joi.string().when("type", { is: "auto", then: Joi.required(), otherwise: Joi.allow("", null) }),
        change_amt: Joi.number().required(),
        trigger: Joi.string().when("type", { is: "auto", then: Joi.required(), otherwise: Joi.allow("", null) }),
        notification_period: Joi.number().required(),
        change_direction: Joi.string().required(),
        change_type: Joi.string().required(),
        document_id: Joi.string().min(22).max(30).required(),
        email_text: Joi.string().allow("", null),
        email_subject: Joi.string().allow("", null),
        target_date: Joi.date()
            .format("YYYY-MM-DD")
            .when("type", { is: "auto", then: Joi.allow("", null), otherwise: Joi.required() }),
        leases: Joi.array()
            .items(
                Joi.object().keys({
                    id: Joi.string().length(10).required()
                })
            )
            .when("type", { is: "auto", then: Joi.allow("", null), otherwise: Joi.required() }),
        notify_now: Joi.boolean().truthy(1, "1").falsy("0", 0)
    }),
    update: Joi.object().keys({
        //reviewed: Joi.date().format('YYYY-MM-DD').when('type', { is: 'auto', then: Joi.allow('', null), otherwise: Joi.required()}),
        leases: Joi.array()
            .items(
                Joi.object().keys({
                    id: Joi.string().length(10).required()
                })
            )
            .when("type", { is: "auto", then: Joi.allow("", null), otherwise: Joi.required() }),
        skipped: Joi.boolean().truthy(1, "1").falsy("0", 0).required()
    }),
    propertyConfiguration: Joi.object().keys({
        active: Joi.boolean().insensitive(false).required(),
        round_to: commmon.round_to.allow(null).required(),
        rate_engine: Joi.string().valid("hummingbird", "prorize", "veritec", "price_monster").required(),
        space_group_profile: Joi.object({
            id: Joi.string().required()
        })
    }),
    companyConfiguration: Joi.object().keys({
        round_to: commmon.round_to.allow(null).required(),
        default_rate_plan_id: Joi.string().allow(null).required()
    }),
    createRatePlan: Joi.object().keys({
        name: Joi.string().required(),
        description: Joi.string().required(),
        price_delta_type: Joi.string().valid("dollar", "percentage").required(),
        tags: Joi.array().unique().items(Joi.string().valid("parking", "storage").required()).allow(null).required(),
        round_to: Joi.string()
            .valid("nearest-full", "nearest-half", "up-full", "up-half", "down-full", "down-half")
            .allow(null)
            .required(),
        settings: Joi.array()
            .items(
                Joi.object({
                    occupancy_percentage: Joi.number().positive().allow(0).integer().less(100).required(),
                    type: Joi.string().valid("increase", "decrease").required(),
                    value: Joi.number().positive().allow(0).precision(2).required()
                })
            )
            .min(1)
            .unique("occupancy_percentage")
            .required()
            .allow(null)
    }),
    spaceGroupRateManagementConfig: Joi.object().keys({
        rate_plan_id: Joi.string().required(),
        active: Joi.boolean().insensitive(false).required()
    }),
    valuePricingConfiguration: Joi.object().keys({
        active: Joi.boolean().insensitive(false).required(),
        settings: Joi.array().items(
            Joi.object({
                type: Joi.string().valid("good", "better", "best").required(),
                label: Joi.string().max(255, 'utf8').required(),
                min_price_difference: Joi.number().precision(2).positive().required().allow(0)
            })
        ).unique("type").min(1).allow(null)
    }),
    spaceScore: {
        body: Joi.array().items(
            Joi.object({
            space_score_id: Joi.string().allow(null).required(),
            amenity_property_id: Joi.string().required(),
            name: Joi.string().required(),
            value: Joi.string().required().allow(""),
            property_type: Joi.string().required(),
            sort_order: Joi.number().required().positive(),
            show_in_website: Joi.boolean().insensitive(false).required()
        })
        ).unique("sort_order").min(1),
        params: Joi.object({
            space_type: Joi.string().valid("parking", "storage"),
            company_id: Joi.string().required(),
            property_id: Joi.string().required()
        })
    },
    rentChange: Joi.object().keys({
        property_id: Joi.string().length(10).required(),
        type: Joi.string().required().invalid("hummingbird"),
        change_amt: Joi.number().required(),
        change_direction: Joi.string().required().valid('increase', 'decrease').insensitive(),
        change_type: Joi.string().required().valid('dollar', 'percent', 'fixed'),
        target_date: Joi.date().format('YYYY-MM-DD'),
        leases: Joi.array().min(1).items(Joi.object().keys({
          id: Joi.string().length(10).required(),
        })).unique('id'),
        // Below fields are not used
        name: Joi.string().allow('', null),
        email_text: Joi.string().allow('', null),
        email_subject: Joi.string().allow('', null),
        trigger: Joi.string().allow('', null),
        rounding: Joi.object().allow(null)
    })
}
