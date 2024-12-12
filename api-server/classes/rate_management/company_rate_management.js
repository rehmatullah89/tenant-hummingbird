const e = require(__dirname + "/../../modules/error_handler.js")
const Hash = require("../../modules/hashes.js")
const { checkExistance } = require("../../models/rate-management/rate_management.js")
const CompanyRateManagementModel = require("../../models/rate-management/company_rate_management.js")

class CompanyRateManagement {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    static cleanData(params, reqBody) {
        let { company_id } = params
        let { round_to, default_rate_plan_id } = reqBody

        return {
            company_id: company_id ?? "",
            default_rate_management_plan: default_rate_plan_id ?? null,
            round_to: round_to ?? null
        }
    }

    async validate(connection, { params, reqBody } = {}) {
        let { company_id, default_rate_management_plan } = CompanyRateManagement.cleanData(
            params ?? this.params,
            reqBody ?? this.reqBody
        )

        if (company_id && default_rate_management_plan) {
            let exists = await checkExistance(connection, {
                toSqlString: () =>
                    `company_id = ${company_id} AND id = ${connection.escape(default_rate_management_plan)}`
            })

            if (!exists) e.th(404, "No such rate plan available for this company")

            return true
        }
    }

    async get(connection, { params }) {
        let company_id = params.company_id
        let response = (await CompanyRateManagementModel.getConfiguration(connection, company_id)) ?? {}
        return {
            round_to: response.round_to ?? null,
            default_rate_plan_id: response.default_rate_management_plan ?? null
        }
    }

    async save(connection, { params, reqBody } = {}) {
        let data = CompanyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await CompanyRateManagementModel.saveConfiguration(connection, {
            company_id: data.company_id,
            default_rate_management_plan: data.default_rate_management_plan,
            round_to: data.round_to
        }).catch((err) => {
            if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
                e.th(409, "Validation Error: Configuration for this company already exists")
            } else throw err
        })

        return response
    }

    async update(connection, { params, reqBody } = {}) {
        let data = CompanyRateManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        let response = await CompanyRateManagementModel.updateConfiguration(
            connection,
            `company_id = '${connection.escape(data.company_id)}'`,
            {
                round_to: data.round_to,
                default_rate_management_plan: data.default_rate_management_plan
            }
        ).then((resp) => {
            if (resp.affectedRows === 0) e.th(404, "Unable to update record")
        })
        return response
    }
}

module.exports = CompanyRateManagement
