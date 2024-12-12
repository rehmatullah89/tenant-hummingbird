const PropertyModel = require(__dirname + "/../../models/property.js")
const SpaceGroupModel = require(__dirname + "/../../models/space_group.js")
const PropertyRateManagementModel = require(__dirname + "/../../models/rate-management/property_rate_management.js")

const e = require(__dirname + "/../../modules/error_handler.js")

const getQueue = require("../../modules/queue");
const Queue = getQueue('hummingbirdQueue');

class PropertyRateManagement {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    static cleanData(params, reqBody) {
        let { company_id, property_id } = params
        let { round_to, active, rate_engine, space_group_profile } = reqBody

        return {
            company_id: company_id ?? "",
            property_id: property_id ?? "",
            active: active ?? true,
            round_to: round_to ?? null,
            rate_engine: rate_engine ?? "hummingbird",
            default_unit_group_profile_id: space_group_profile?.id ?? "",
        }
    }

    async validate(connection, { params, reqBody } = {}) {
        let { company_id, property_id, default_unit_group_profile_id } = PropertyRateManagement.cleanData(
            params ?? this.params,
            reqBody ?? this.reqBody
        )
        /**
         * Check whether property remains on same company and also
         * space group profile exists under that property
         */
        let [space_group, property] = await Promise.all([
            SpaceGroupModel.findByPropertyAndId(connection, {
                id: default_unit_group_profile_id,
                property_id: property_id,
            }),
            PropertyModel.findById(connection, property_id, company_id),
        ])
        if (!Boolean(space_group && property)) e.th(400, "Validation Error: invalid entities")
    }

    async triggerRateManagementCron(dynamo_company_id) {
        let { company_id, default_unit_group_profile_id, property_id } = PropertyRateManagement.cleanData(this.params, this.reqBody)
        return await Queue.add(
            'rate_management_cron_routine',
            {
                company_id:  dynamo_company_id,
                hb_company_id: company_id,
                property_id: property_id,
                profile_id: default_unit_group_profile_id
            },
            { priority: 1 }
        ).catch(err => `Error on running rate management cron: ${err?.toString()}`)
    }

    async get(connection, { params }) {
        let property_id = connection.escape(params.property_id)
        let company_id = params.company_id

        let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)

        if (!isValidProperty) e.th(404, "Property not found")

        let response = (await PropertyRateManagementModel.getConfiguration(connection, property_id)) ?? {}
        return {
            active: { 1: true, 0: false }[response.active] ?? false,
            round_to: response.round_to ?? null,
            space_group_profile: { id: response.default_unit_group_profile_id , name: response.rate_plan_name ?? null },
            value_pricing : response.value_pricing,
            rate_engine: response.rate_engine ?? 'hummingbird'
        }
    }

    async save(connection, { params, reqBody } = {}) {
        let data = PropertyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await PropertyRateManagementModel.saveConfiguration(connection, {
            property_id: data.property_id,
            active: data.active,
            round_to: data.round_to,
            rate_engine: data.rate_engine,
            default_unit_group_profile_id: data.default_unit_group_profile_id,
        }).catch((err) => {
            if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
                e.th(409, "Validation Error: Configuration for this property already exists")
            } else throw err
        })
        return response
    }

    async update(connection, { params, reqBody } = {}) {
        let data = PropertyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await PropertyRateManagementModel.updateConfiguration(
            connection,
            `property_id = '${connection.escape(data.property_id)}'`,
            {
                active: data.active,
                round_to: data.round_to,
                rate_engine: data.rate_engine,
                default_unit_group_profile_id: data.default_unit_group_profile_id,
            }
        ).then((resp) => {
            if (resp.affectedRows === 0) e.th(404, "Unable to update record")
        })
        return response
    }
}

module.exports = PropertyRateManagement
