

const PropertyModel = require(__dirname + "/../../models/property.js")
const e  = require(__dirname + '/../../modules/error_handler.js');
const PropertyRateManagementModel = require(__dirname + "/../../models/rate-management/property_rate_management.js")
const Hash = require(__dirname + "/../../modules/hashes.js")

class PropertyRateManagement  {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    // static cleanData(params, reqBody) {
    //     let { company_id, property_id } = params
    //     let { round_to, active, rate_engine, space_group_profile } = reqBody

    //     return {
    //         company_id: company_id ?? "",
    //         property_id: property_id ?? "",
    //         active: active ?? true,
    //         round_to: round_to ?? null,
    //         rate_engine: rate_engine ?? "hummingbird",
    //         default_unit_group_profile_id: space_group_profile?.id ?? "",
    //     }
    // }

    async validate(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { company_id, property_id } = params

        let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)
        if (!isValidProperty) e.th(400, "Property does not exist")

        return true
    }

    async get(connection, { params }) {
        let { company_id, property_id } = params
        let response = await PropertyRateManagementModel.getConfiguration(connection, property_id) ?? {}
        return { rate_engine: response?.rate_engine ?? 'hummingbird' }
        // return Hash.makeHashes(
        //     {
        //         active: { 1: true, 0: false }[response.active] ?? false,
        //         round_to: response.round_to ?? null,
        //         space_group_profile: { id: response.default_unit_group_profile_id , name: response.rate_plan_name ?? null },
        //         rate_engine: response.rate_engine ?? 'hummingbird'
        //     },
        //     company_id
        // )
    }

    async save(connection, { params, reqBody } = {}) {
        // let data = PropertyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await PropertyRateManagementModel.saveConfiguration(connection, {
            rate_engine: this.reqBody.rate_engine,
            property_id: this.params.property_id
            // property_id: data.property_id,
            // active: data.active,
            // round_to: data.round_to,
            // rate_engine: data.rate_engine,
            // default_unit_group_profile_id: data.default_unit_group_profile_id,
        }).catch((err) => {
            if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
                e.th(409, "Validation Error: Configuration for this property already exists")
            } else throw err
        })
        return response
    }

    async update(connection, { params, reqBody } = {}) {
        // let data = PropertyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await PropertyRateManagementModel.updateConfiguration(
            connection,
            `property_id = '${connection.escape(this.params.property_id)}'`,
            {
                rate_engine: this.reqBody.rate_engine,
                property_id: this.params.property_id
                // active: data.active,
                // round_to: data.round_to,
                // rate_engine: data.rate_engine,
                // default_unit_group_profile_id: data.default_unit_group_profile_id,
            }
        ).then((resp) => {
            if (resp.affectedRows === 0) e.th(404, "Unable to update record")
        })
        return response
    }
}

module.exports = PropertyRateManagement