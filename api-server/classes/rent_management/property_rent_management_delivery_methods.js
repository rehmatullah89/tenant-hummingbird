"use strict";
const RentManagementDeliveryMethodModel = require(__dirname + '/../../models/rent-management/property_rent_management_delivery_methods');
const DeliveryMethodModel = require(__dirname + '/../../models/delivery_methods');
const e = require(__dirname + "/../../modules/error_handler.js")
class PropertyRentManagementDeliveryMethod {
    constructor(data) {
        data = data || {};
        this.propertyId = data.property_id || "";
        this.deliveryMethods = data.delivery_methods || null
    }

    /**
     * Deactivating the status of delivery methods that exist in the db but are not included in the request body..
     * @param {Object} connection - The database connection object
     * @param {Array} deliveryMethods - The delivery methods that are in the request body
     */
    async disableDeliveryMethodsStatus(connection, deliveryMethods) {
        let activeIds = deliveryMethods?.map(item => connection.escape(item.method.id)).join(', ');
        let clause = `property_id = '${connection.escape(this.propertyId)}' AND active = 1`
        clause += activeIds?.length ? ` AND delivery_method_id NOT IN (${activeIds})` : ''
        await RentManagementDeliveryMethodModel.disableDeliveryMethodsStatus(
            connection,
            clause
        )
    }

    /**
     * Validates the delivery method with the specified ID..
     * @param {Object} connection - The database connection object
     * @param {number} method_id - The ID of the delivery method to validate
     * @throws {Error} Throws a 400 error if the delivery method ID is invalid
     */
	static async validate(connection, method_id) {
        let exists = await DeliveryMethodModel.findById(connection, method_id)
        if (!exists) e.th(400, "Invalid delivery method ID")
    }

    /**
     * Fetches the delivery methods associated with the property.
     * @param {Object} connection - The database connection object
     * @returns An array of delivery methods.
     */
    async fetchDeliveryMethodsByProperty(connection) {
        let response  = await RentManagementDeliveryMethodModel.findByProperty(connection, this.propertyId) || null;
        if (response?.length) {
            response = response.map((method) => ({
                active: !!method.active,
                method: {
                    id: method.delivery_method_id,
                    key: method.gds_key
                },
                subject: method.subject,
                message: method.message
            }))
        }
        return response
    }

    /**
     * Create/Update the delivery methods for the property.
     * 
     * @param {Object} connection - The database connection object.
     * @returns {Object} An object containing the saved delivery methods.
     */
    async saveDeliveryMethods(connection, { reqBody } = {}) {
        if (this.deliveryMethods?.length) {
            for (const item of this.deliveryMethods) {
                let deliveryMethodID = item.method.id
                await PropertyRentManagementDeliveryMethod.validate(connection, deliveryMethodID)
                let exists = await RentManagementDeliveryMethodModel.checkExistance(connection, this.propertyId, deliveryMethodID);
    
                if (exists) {               
                    await RentManagementDeliveryMethodModel.updateDeliveryMethod(connection,
                        `property_id = '${connection.escape(this.propertyId)}' AND delivery_method_id = '${deliveryMethodID}'`,
                        {
                            active: item.active,
                            subject: item.subject,
                            message: item.message
                        })
                } else {
                    await RentManagementDeliveryMethodModel.insertDeliveryMethod(connection, {
                        property_id: this.propertyId,
                        delivery_method_id: deliveryMethodID,
                        subject: item.subject,
                        message: item.message,
                        active: item.active
                    })
                }
            }
        }
        await this.disableDeliveryMethodsStatus(connection, this.deliveryMethods)
        
        return { delivery_methods: this.deliveryMethods }
    }
}


module.exports = PropertyRentManagementDeliveryMethod;
