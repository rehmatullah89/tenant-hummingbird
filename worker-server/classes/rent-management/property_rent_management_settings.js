

const PropertyModel = require(__dirname + "/../../models/property.js")
const e  = require(__dirname + '/../../modules/error_handler.js');
const PropertyRentManagementSettingsModel = require(__dirname + "/../../models/rent-management/property_rent_management_settings.js")
const LeaseRentChange = require(__dirname + "/../../classes/rent-management/lease_rent_change.js")

class PropertyRentManagement  {
    constructor(params, reqBody, userId) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}     
        this.userId = userId ?? {}
    }

    async validate(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { company_id, property_id } = params

        let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)
        console.log('isValidProperty: ', isValidProperty);
        if (!isValidProperty) e.th(400, "Property does not exist")

        return true
    }

    async get(connection, { params }) {
        let { property_id } = params
        let response = await PropertyRentManagementSettingsModel.getConfiguration(connection, property_id) ?? {}
        return { 
            rent_engine: response?.rent_engine ?? 'hummingbird', 
            automation_enabled_by_admin: !!response?.automation_enabled_by_admin
        }
    }

    async saveOrUpdateConfiguration(connection, { params, reqBody } = {}) {
        let payloadData = await this.getPayload(connection)
        let response = ""
		let propertyConfExists = await PropertyRentManagementSettingsModel.checkExistance(connection, payloadData.property_id)

        if (propertyConfExists) {
            response = await PropertyRentManagementSettingsModel.updateConfiguration(
                connection,
                `property_id = '${connection.escape(this.params.property_id)}'`,
                payloadData
            )
        } else {
            response = await PropertyRentManagementSettingsModel.saveConfiguration(connection, payloadData)
        }
        if (response?.affectedRows === 0) e.th(404, "Unable to update the record")
        
        if (payloadData?.automation_enabled_by_admin === false)
            this.cancelAllAutomatedRentChangesByPropertyId(connection, this.params.property_id)
        return response
    }

    async getPayload(connection) {
        let dbConf = {}

        if (!this.reqBody?.rent_engine)
            dbConf = await PropertyRentManagementSettingsModel.getConfiguration(connection, this.params.property_id) ?? {}

        //condition to add automation_enabled_by_admin key to update table
        let automationEnabledKeyCondition = 
            this.reqBody?.rent_engine === 'hummingbird' && this.reqBody.hasOwnProperty('automation_enabled_by_admin') || !this.reqBody?.rent_engine && dbConf?.rent_engine === 'hummingbird'

        let payload = {
            ...(this.reqBody?.rent_engine && { rent_engine: this.reqBody.rent_engine }),
            ...(automationEnabledKeyCondition && { 
                automation_enabled_by_admin: this.reqBody.automation_enabled_by_admin,
                ...(this.reqBody?.automation_enabled_by_admin === false && { enable_automatic_rent_change: false })
            }),
            property_id: this.params.property_id
        }

        return payload
    }

    async cancelAllAutomatedRentChangesByPropertyId(connection, property_id) {
        const leaseRentChange = new LeaseRentChange({userId: this.userId}, {property:{id: property_id}})
        leaseRentChange.cancelAutomatedRentChangesByPropertyId(connection)
    }
}

module.exports = PropertyRentManagement