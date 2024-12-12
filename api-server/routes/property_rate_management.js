const express = require("express")
const router = express.Router({ mergeParams: true })
const control = require(__dirname + "/../modules/site_control.js")
const Hash = require(__dirname + "/../modules/hashes.js")
const utils = require(__dirname + "/../modules/utils.js")
const joiValidator = require("express-joi-validation")({
    passError: true
})
const Schema = require(__dirname + "/../validation/rate_management.js")
const PropertyRateManagement = require(__dirname + "/../classes/rate_management/property_rate_management.js")
const ValuePricingManagement = require(__dirname + "/../classes/rate_management/value_pricing_management.js")
const SpaceScore = require(__dirname + "/../classes/rate_management/space_score.js")

module.exports = function (app, sockets) {
    /**
     * @description get rate management configuration of the property
     * If no configuration exists then default configuration will be sent to client
     */
    router.get("/", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const rateManagement = new PropertyRateManagement()
        try {
            let response = await rateManagement.get(connection, { params: { ...req.params, company_id: active.id } })

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(response, req)
            })
        } catch (error) {
            next(error)
        }
    })
    /**
     * @description this will create/update property rate management configuration.
     */
    router.put(
        "/",
        [control.hasAccess(["admin"]), control.hasPermission('manage_rate_management'), joiValidator.body(Schema.propertyConfiguration), Hash.unHash],
        async (req, res, next) => {
            const { connection, active, company_id: dynamo_company_id } = res.locals
            const { body } = req
            try {
                const rateManagement = new PropertyRateManagement({ ...req.params, company_id: active?.id }, body)
                await rateManagement.validate(connection)
                await rateManagement.save(connection).catch(async (error) => {
                    if (error.code === 409) return await rateManagement.update(connection)
                    else throw error
                }).finally(() => {
                    // company_id for creating connection
                    rateManagement.triggerRateManagementCron(dynamo_company_id);
                })
                utils.send_response(res, {
                    status: 200,
                    data: {
                        status: "success"
                    }
                })
            } catch (error) {
                next(error)
            }
        }
    )
    /**
     * @description get value pricing configuration.
     */
    router.get("/value-pricing", [control.hasAccess(["admin"]), control.hasPermission('manage_value_pricing'), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const { params, body } = req
        try {
            const ValuePricingManager = new ValuePricingManagement({ ...params, company_id: active.id }, body)
            await ValuePricingManager.validate(connection)
            let response = await ValuePricingManager.get(connection)
            utils.send_response(res, {
                status: 200,
                // Do not hash unless it contains maskable entities
                data: response
            })
        } catch (error) {
            next(error)
        }
    })
    /**
     * @description this will create/update value pricing configuration.
     */
    router.put(
        "/value-pricing",
        [control.hasAccess(["admin"]), control.hasPermission('manage_value_pricing'), joiValidator.body(Schema.valuePricingConfiguration), Hash.unHash],
        async (req, res, next) => {
            const { connection, active } = res.locals
            const { params, body } = req
            try {
                const ValuePricingManager = new ValuePricingManagement({ ...params, company_id: active.id }, body)
                await ValuePricingManager.validate(connection)
                let response = await ValuePricingManager.saveOrUpdate(connection)
                utils.send_response(res, {
                    status: 200,
                    // Do not hash unless it contains maskable entities
                    data: response
                })
            } catch (error) {
                next(error)
            }
        }
    )

    /**
     * @description get space scoring data.
     */
    router.get("/space-score", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const { params, body } = req
        try {
            const SpaceScoring = new SpaceScore({...params, company_id: active.id}, body)
            await SpaceScoring.validate(connection)
            let response = await SpaceScoring.getAmentiesList(connection)
            utils.send_response(res, {
                status: 200,
                // Do not hash unless it contains maskable entities
                data: {
                    amenities: Hash.obscure(response, req)
                }
            })
        } catch (error) {
            next(error)
        }
    })
    
    /**
     * @description this will create/update space score data
     */
     router.put("/space-score/:space_type", [control.hasAccess(["admin"]), joiValidator.body(Schema.spaceScore.body), joiValidator.params(Schema.spaceScore.params), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const { params, body } = req
        try {
            const SpaceScoring = new SpaceScore({...params, company_id: active.id}, body)
            await SpaceScoring.validate(connection)
            let response = await SpaceScoring.updateSpaceScore(connection)
            utils.send_response(res, {
                status: 200,
                // Do not hash unless it contains maskable entities
                data: {
                    amenities: Hash.obscure(response, req)
                }
            })
        } catch (error) {
            next(error)
        }
    })


    return router
}
