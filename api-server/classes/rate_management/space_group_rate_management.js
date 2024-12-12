const utils = require(__dirname + "/../../modules/utils.js")
const e = require(__dirname + "/../../modules/error_handler.js")
const SpaceGroupRateManagementModel = require(__dirname +
    "/../../models/rate-management/space_group_rate_management.js")
const PropertyModel = require(__dirname + "/../../models/property.js")
const RatePlanManagementModel = require(__dirname + "/../../models/rate-management/rate_management.js")

class SpaceGroupRateManagement {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    static cleanData(params, reqBody) {
        let { space_group_tier_hash, property_id } = params ?? {}
        let { rate_plan_id, active } = reqBody ?? {}

        return {
            tier_id: space_group_tier_hash,
            rate_management_plan_id: rate_plan_id ?? "",
            active: active ?? false,
            property_id: property_id
        }
    }

    static makeResponse(data) {
        let { rate_management_plan_id, active } = data ?? {}
        return {
            active: Boolean(active) ?? false,
            rate_plan_id: rate_management_plan_id ?? null
        }
    }

    static #handleResponse(res, message = "") {
        if (!res) e.th(400, message)
        return res
    }

    async validate(connection, { params, reqBody: body } = {}) {
        /**
         * Check whether property remains on same company and also
         * rate_plan_id belongs to that company (if exists)
         */
        let { property_id, company_id } = params ?? this.params
        let reqBody = body ?? this.reqBody
        let validations = [
            PropertyModel.findById(connection, property_id, company_id).then((res) =>
                SpaceGroupRateManagement.#handleResponse(res, "unable to find property under this company")
            )
        ]

        if (reqBody && Object.keys(reqBody)?.length) {
            let { rate_management_plan_id } = SpaceGroupRateManagement.cleanData(params, reqBody)
            validations.push(
                RatePlanManagementModel.checkExistance(connection, {
                    toSqlString: function () {
                        return `company_id = ${connection.escape(company_id)} AND id = ${connection.escape(
                            rate_management_plan_id
                        )}`
                    }
                }).then((res) =>
                    SpaceGroupRateManagement.#handleResponse(
                        res,
                        "unable to find specified rate plan under this company"
                    )
                )
            )
        }

        return await Promise.all(validations).then((validationArray) => validationArray.every((x) => Boolean(x)))
    }

    async get(connection, { params } = {}) {
        let { space_group_tier_hash } = params ?? this.params

        return SpaceGroupRateManagementModel.get(connection, {
            tier_id: space_group_tier_hash
        }).then((response) => SpaceGroupRateManagement.makeResponse(response))
    }

    async save(connection, { params, reqBody } = {}) {
        let data = SpaceGroupRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        try {
            await SpaceGroupRateManagementModel.save(
                connection,
                utils.pick(data, ["tier_id", "rate_management_plan_id", "active", "property_id"])
            )
            return SpaceGroupRateManagement.makeResponse(data)
        } catch (error) {
            throw error
        }
    }

    async update(connection, { params, reqBody } = {}) {
        let data = SpaceGroupRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        try {
            await SpaceGroupRateManagementModel.update(
                connection,
                utils.pick(data, ["rate_management_plan_id", "active"]),
                `tier_id = '${data.tier_id}'`
            )

            return SpaceGroupRateManagement.makeResponse(data)
        } catch (error) {
            throw error
        }
    }

    async saveOrUpdate(connection, { params, reqBody } = {}) {
        let { tier_id } = SpaceGroupRateManagement.cleanData(params ?? this.params, reqBody ?? this.params)

        let exists = await this.checkExistance(connection, {
            id: tier_id
        })

        return this[exists ? "update" : "save"](connection, {
            params,
            reqBody
        })
    }

    async checkExistance(connection, { id }) {
        return await SpaceGroupRateManagementModel.checkExistance(connection, {
            tier_id: id
        })
    }
}

module.exports = SpaceGroupRateManagement
