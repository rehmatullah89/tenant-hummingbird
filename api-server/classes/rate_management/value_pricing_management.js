const PropertyModel = require(__dirname + "/../../models/property.js")
const ValuePricingManagementModel = require(__dirname + "/../../models/rate-management/value_pricing_management.js")
const PropertyRateManagementModel = require(__dirname + "/../../models/rate-management/property_rate_management.js")

const e  = require(__dirname + '/../../modules/error_handler.js');

class ValuePricingManagement {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
    }

    static cleanData(params, reqBody) {
        let { property_id } = params
        let { active, settings } = reqBody

        return {
            property_id: property_id ?? "",
            value_pricing_active: active ?? false,
            settings: settings ?? null
        }
    }

    async validate(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { property_id, company_id } = params
        let minPriceDiff = {}

        let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)

        if (!isValidProperty) e.th(400, "Property does not exist")

        if (reqBody?.settings) {
            reqBody.settings?.forEach((item) => minPriceDiff[item.type] = item.min_price_difference)

            if (minPriceDiff["good"] !== 0) e.th(409, "Tier 'good' value should be zero")  
            if (!(minPriceDiff["better"] == 0 && minPriceDiff["best"] == 0)) {
                if (!(minPriceDiff["best"] > minPriceDiff["better"])) e.th(409, "Tier 'best' value should be greater than Tier 'better'")
            }
        }

        return true
    }

    get(connection, { params = this.params } = {}) {
        const { property_id } = params

        return ValuePricingManagementModel.get(connection, property_id).then((resp) => {
            return { ...(resp ?? {}), active: !!resp?.active }
        })
    }

    async saveSettings(connection, { params = this.params, reqBody = this.reqBody ?? [] } = {}) {
        let { property_id, settings } = ValuePricingManagement.cleanData(params, reqBody)

        try {
            let alreadyConfigured = await ValuePricingManagementModel.checkExistance(connection, {
                property_id
            })

            let _settings = (settings || []).reduce((dataPacket, { type, min_price_difference, label }) => {
                dataPacket.push(Array(property_id, type, min_price_difference, label))
                return dataPacket
            }, [])

            if (alreadyConfigured) {
                await ValuePricingManagementModel.deleteSettings(connection, {
                    property_id
                })
            }

            if (!settings) return Promise.resolve()

            await ValuePricingManagementModel.saveSettings(connection, _settings)
        } catch (error) {
            throw error
        }
    }

    async saveOrUpdate(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { property_id, value_pricing_active } = ValuePricingManagement.cleanData(params, reqBody)

        let exists = await PropertyRateManagementModel.checkExistance(connection, {
            property_id
        })

        try {
            await connection.beginTransactionAsync()

            if (!exists) {
                await PropertyRateManagementModel.saveConfiguration(connection, {
                    property_id,
                    active: false,
                    round_to: null,
                    default_unit_group_profile_id: null,
                    value_pricing_active
                })
            } else {
                await PropertyRateManagementModel.updateConfiguration(connection, `property_id = ${property_id}`, {
                    value_pricing_active
                })
            }

            await this.saveSettings(connection, {
                params,
                reqBody
            })
            await connection.commitAsync()

            return reqBody
        } catch (error) {
            await connection.rollbackAsync()
            throw error
        }
    }
}

module.exports = ValuePricingManagement
