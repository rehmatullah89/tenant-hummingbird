const e = require(__dirname + '/../../modules/error_handler.js')

const SpaceGroupPromotionsModel = require('../../models/space-group-managament/promotions.js')

class SpaceGroupPromotions {
    constructor(params, reqBody = {}) {
        const { property_id, space_group_tier_hash, company_id } = params ?? {}

        // Initialize all the requrired values here
        this.propertyId = property_id ?? ''
        this.spaceGroupHash = space_group_tier_hash ?? ''
        this.companyId = company_id ?? ''

        this.reqBody = reqBody ?? {}
    }

    static async runValidations(validations) {
        let results = await Promise.all(validations)
        return results.every((result) => !!result)
    }

    static formatOutput(response) {
        return response
        // return response.map((res) => ({ ...res, website_promotion_type: JSON.parse(res.website_promotion_type) }))
    }

    async validate(connection) {
        const promises = [
            /**
             * Check if that hash belongs to same property
             * */
            SpaceGroupPromotionsModel.validateHash(connection, {
                propertyId: this.propertyId,
                spaceGroupHash: this.spaceGroupHash
            }).then((res) => {
                if (!res) e.th(400, "Hash doesn't belong to that property")
            })
        ]
        return SpaceGroupPromotions.runValidations(promises)
    }

    async validateRequestBody(connection) {
        let { promotions = [] } = this.reqBody

        if (!promotions.length) return

        const promises = [
            SpaceGroupPromotionsModel.checkExistance(
                connection,
                {
                    companyId: this.companyId,
                    promotions: promotions.map((promo) => promo.id)
                },
                'promotion'
            )
        ]

        return SpaceGroupPromotions.runValidations(promises)
    }

    async get(connection) {
        if (!(this.propertyId || this.spaceGroupHash)) e.th(400, 'Invalid property id or spacegroup hash')

        let response = await SpaceGroupPromotionsModel.get(connection, {
            companyId: this.companyId,
            spaceGroupHash: this.spaceGroupHash
        })

        return SpaceGroupPromotions.formatOutput(response)
    }

    async saveOrUpdate(connection) {
        let { promotions = [] } = this.reqBody
        let formattedBody = promotions.map(({ id, website_promotion_type }) => [
            id,
            this.spaceGroupHash,
            website_promotion_type
        ])

        await connection.beginTransactionAsync()

        try {
            const conditions = { unit_group_id: this.spaceGroupHash }

            await SpaceGroupPromotionsModel.delete(connection, conditions)

            if (formattedBody?.length) await SpaceGroupPromotionsModel.save(connection, formattedBody)

            await connection.commitAsync()
        } catch (error) {
            await connection.rollbackAsync()
            throw error
        }

        return await this.get(connection)
    }
}

module.exports = SpaceGroupPromotions
