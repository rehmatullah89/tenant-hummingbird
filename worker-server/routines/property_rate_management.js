const pool = require(__dirname + '/../modules/db.js');
const utils = require(__dirname + '/../modules/utils.js');
const db = require(__dirname + '/../modules/db_handler.js');
const ENUMS = require('../modules/enums');

const PropertyRateManagement = require(__dirname + '/../classes/property_rate_management.js')
const Property = require(__dirname + '/../classes/property.js');

/**
 * Here property_id and dynamo_company_id is a must *
 */
const PropertyRateManagementRoutine = {
    async triggerUnitPriceChanges({ company_id, hb_company_id, property_id, profile_id, unit_id }) {
        console.log("Conditions to run cron job: ", company_id, hb_company_id, property_id, profile_id, unit_id)
        const connection = await db.getConnectionByType('write', company_id);
        try {
            let propertyRateManagement = new PropertyRateManagement()
            if (profile_id || unit_id || property_id) {
                await this.propertyWiseUnitPriceChanges(connection, propertyRateManagement, property_id, profile_id, unit_id)
            } else {
                let activeProperties = await propertyRateManagement.getActiveProperties(connection, hb_company_id)
                for (let property of activeProperties) {

                    let min_hour = 0;
                    let max_hour = 1;

                    /**
                     * Check whether the cron will be running on facility's midnight if yes, trigger the price change
                     * */
                    let properties = await Property.findAllActive(connection, property.property_id, hb_company_id, min_hour, max_hour);

                    if (properties.length) {
                        await this.propertyWiseUnitPriceChanges(connection, propertyRateManagement, property.property_id)
                    }
                }
            }
        } catch (err) {
            throw err
        } finally {
            await utils.closeConnection(pool, connection)
        }
    },

    async propertyWiseUnitPriceChanges(connection, propertyRateManagement, property_id, profile_id = null, unit_id = null) {
        try {
            let unitGroups = await propertyRateManagement.getUnitGroups(connection, property_id, profile_id, unit_id)

            if (!unitGroups) {
                console.log('Rate management is inactive or no default rate plan is configured. Skipping!!')
                return
            }

            await connection.beginTransactionAsync()

            PropertyRateManagementRoutine.sendCronLogs({ property_id, profile_id, unit_id, status: 'Initiated' })

            const newSellRateData = await propertyRateManagement.calculateSellRateUnitGroups(connection, unitGroups)
            await propertyRateManagement.saveRateChanges(connection, newSellRateData)

            PropertyRateManagementRoutine.sendCronLogs({ property_id, profile_id, unit_id, status: 'Completed' })

            await connection.commitAsync()

        } catch (err) {
            await connection.rollbackAsync()
            PropertyRateManagementRoutine.sendCronLogs({ property_id, profile_id, unit_id, status: 'Error' }, err)
            throw err
        }
    },

    async triggerUnitProfileRefresh({ company_id, procedure_conditions } = {}) {
        const connection = await db.getConnectionByType('write', company_id);

        try {
            const PropertyRateManager = new PropertyRateManagement();

            return await PropertyRateManager.refreshUnitGroup(connection, procedure_conditions);
        } catch (err) {
            console.error(err);
            console.error(err.stack);
        } finally {
            await db.closeConnection(connection);
        }
    },

    sendCronLogs(payload, err = null) {
         return utils.sendLogs({
            event_name: ENUMS.LOGGING.RATE_MANAGEMENT_CRON,
            logs: {
              payload: payload,
              error: err?.stack || err?.msg || err || undefined
            },
          })
    }
};

module.exports = {
    PropertyRateManagementRoutine: async (data) => {
        return await PropertyRateManagementRoutine.triggerUnitPriceChanges(data);
    },
    RefreshUnitProfilesRoutine: async (data) => {
        return await PropertyRateManagementRoutine.triggerUnitProfileRefresh(data)
    }
};