const Hash = require(__dirname + "/../../modules/hashes.js")
const utils = require(__dirname + "/../../modules/utils.js")
const e = require(__dirname + "/../../modules/error_handler.js")
const RatePlanManagementModel = require(__dirname + "/../../models/rate-management/rate_management.js")
const CompanyRateManagementModel = require(__dirname + "/../../models/rate-management/company_rate_management.js")

class RatePlanManagement {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    static cleanData(params, reqBody) {
        let { company_id, contact_id } = params ?? {}
        let { id, name, description, price_delta_type, round_to, settings, tags } = reqBody ?? {}
        return {
            id: id ?? "",
            name: name ?? "",
            description: description ?? "",
            price_delta_type: price_delta_type ?? "",
            round_to: round_to ?? null,
            company_id: company_id ?? "",
            contact_id: contact_id ?? "",
            settings: settings ?? null,
            tags: tags ?? null
        }
    }

    static makeResponse(data) {
        return utils.pick(data, ["id", "name", "description", "round_to", "price_delta_type", "created_by", "settings", "tags"])
    }

    async validate(connection, { params, reqBody } = {}) {
        let { rate_plan_id, company_id } = params ?? this.params

        if(rate_plan_id && company_id) {
            let exists = await RatePlanManagementModel.checkExistance(connection, {
                toSqlString: () => `company_id = ${company_id} AND id = ${rate_plan_id}`
            })

            if(!exists) e.th(400, "Operation not allowed under this rate plan")
        }

        return true
    }

    async checkExistance(connection, { params } = {}) {
        let { rate_plan_id } = params ?? this.params

        let exists = await RatePlanManagementModel.checkExistance(connection, {
            id: rate_plan_id
        })

        return exists
    }

    async save(connection, { params, reqBody } = {}) {
        let data = RatePlanManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)

        try {
            let hasDuplicateName = await RatePlanManagementModel.checkExistance(connection, {
                toSqlString: () => `company_id = ${data.company_id} AND name = '${data.name}'`
            })
            if (hasDuplicateName) e.th(409, `A Rate Plan already exists with the name '${data.name}'.`);
            let response = await RatePlanManagementModel.saveRatePlan(connection, {
                ...utils.pick(data, [
                    "company_id",
                    "contact_id",
                    "name",
                    "description",
                    "price_delta_type",
                    "round_to",
                ]),
                ...utils.normalizeJson({
                    settings: data.settings,
                    tags: data.tags
                })
            })

            return RatePlanManagement.makeResponse({
                ...data,
                id: response.insertId,
                created_by: data.contact_id,
            })
        } catch (error) {
            throw error
        }
    }

    async update(connection, { params, reqBody } = {}) {
        let { rate_plan_id } = params ?? this.params

        let exists = await this.checkExistance(connection)

        if (!exists) e.th(404, "No such record exist")

        let data = RatePlanManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)

        try {
            await RatePlanManagementModel.updateRatePlan(
                connection,
                {
                    ...utils.pick(data, ["name", "description", "price_delta_type", "round_to"]),
                    ...utils.normalizeJson({
                        settings: data.settings,
                        tags: data.tags
                    })
                },
                `id = ${rate_plan_id}`
            )

            return RatePlanManagement.makeResponse({
                ...data,
                id: rate_plan_id,
                created_by: data.contact_id,
            })
        } catch (error) {
            throw error
        }
    }

    /**
     *
     * If id is present in the request, `id` takes priority
     */
    getRatePlans(connection, { params, company_id, id }) {
        if (!(id || company_id)) e.th(400, "Either provide company id or rate plan id")

        let clauses = {
            true: {
                attr: "id",
                value: id,
            },
            false: {
                attr: "company_id",
                value: company_id,
            },
        }[typeof id !== "undefined"]

        return RatePlanManagementModel.getRatePlans(connection, clauses.value, clauses.attr).then((response) => {
            if (!response) e.th(404, "No rate plans found")
            // Sort response by name
            response.sort(utils.sortBy('name'))
            return response
        })
    }

    async deleteRatePlan(connection, { id }) {
        const ERROR_MESSAGE = "Unable to delete rate plan"

        // we cant delete a default rate plan
        let isCompanyBoundedPlan = await CompanyRateManagementModel.checkExistance(connection, {
            default_rate_management_plan: id
        })

        if(isCompanyBoundedPlan) e.th(400, ERROR_MESSAGE)

        return RatePlanManagementModel.deleteRatePlan(connection, id).then((res) => {
            if (res.affectedRows === 0) e.th(404, ERROR_MESSAGE)
            return res
        })
    }
}

module.exports = RatePlanManagement
