const express = require("express")
const { active } = require("../validation/objects/military")
const control = require(__dirname + "/../modules/site_control.js")
const router = express.Router({ mergeParams: true })
const Hash = require(__dirname + "/../modules/hashes.js")
const utils = require(__dirname + "/../modules/utils.js")
const joiValidator = require("express-joi-validation")({
    passError: true,
})
const Schema = require(__dirname + "/../validation/rate_management.js")
const SpaceGroupRateManagement = require(__dirname + "/../classes/rate_management/space_group_rate_management.js")

module.exports = function (app, sockets) {
    /**
     * @description get rate management configuration of that space-group
     */
    router.get("/:space_group_tier_hash", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        try {
            const spaceGroupRateManager = new SpaceGroupRateManagement({ ...req.params, company_id: active.id })

            await spaceGroupRateManager.validate(connection)
            let response = await spaceGroupRateManager.get(connection)

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(response, req),
            })      
        } catch (error) {
            next(error)
        }
    })
    
    /**
     * @description save/update rate management configuration of that space-group
     */
    router.put(
        "/:space_group_tier_hash",
        [control.hasAccess(["admin"]), control.hasPermission('assign_rate_plan'), joiValidator.body(Schema.spaceGroupRateManagementConfig), Hash.unHash],
        async (req, res, next) => {
            const { connection, active } = res.locals
            const { body } = req
            try {
                const spaceGroupRateManager = new SpaceGroupRateManagement({ ...req.params, company_id: active.id }, body)

                await spaceGroupRateManager.validate(connection)
                let response = await spaceGroupRateManager.saveOrUpdate(connection)

                utils.send_response(res, {
                    status: 200,
                    data:  Hash.obscure(response, req),
                })
            } catch (error) {
                next(error)
            }
        }
    )

    return router
}
