"use strict";
const models = require(__dirname + "/../models")
const RoundOff = require(__dirname + '/../modules/rounding.js');
const Property = require(__dirname + "/../classes/property.js");

class PropertyRateManagement {
    constructor() {}

    static calculateSellRate(selectedRatePlanSetting, unitGroup, setRate, rounding) {
        let calculatedPriceDelta = 0;
        let calculatedSellRate = 0;
        let PlanSettingValue = Number(selectedRatePlanSetting?.value ?? 0);

        if (unitGroup?.price_delta_type === 'percentage') {
            calculatedPriceDelta = (PlanSettingValue / 100) * setRate
        } else {
            calculatedPriceDelta = PlanSettingValue
        }

        if (selectedRatePlanSetting?.type === 'increase') {
            calculatedSellRate = setRate + calculatedPriceDelta
        }
        else {
            calculatedSellRate = setRate - calculatedPriceDelta
        }

        if (rounding && calculatedSellRate % 1 !== 0) {
            rounding = rounding.replace(/-/g, "_")
            calculatedSellRate = RoundOff.convert({ value: calculatedSellRate, type: rounding })
        }
        else {
            calculatedSellRate = calculatedSellRate.toFixed(2)
        }

        if(calculatedSellRate < 0) {
            calculatedSellRate = 0
        }

        if(typeof calculatedPriceDelta == 'undefined' || typeof calculatedPriceDelta == 'NaN' || typeof calculatedSellRate == 'undefined' || typeof calculatedSellRate == 'NaN') {
            console.log("------------Error Cases For Rate Cron Job----------")
            console.log("selectedRatePlanSetting: ",selectedRatePlanSetting)
            console.log("unitGroup: ",unitGroup)
            console.log("setRate: ",setRate)
            console.log("calculatedPriceDelta: ",calculatedPriceDelta)
            console.log("calculatedSellRate: ",calculatedSellRate)
            console.log("rounding: ",rounding)
        }
        return { sellRate: calculatedSellRate, priceDelta: calculatedPriceDelta }
    }

    async getActiveProperties(connection, company_id) {
        return await models.PropertyRateChange.getActiveProperties(connection, company_id)
    }

    async getUnitGroups(connection, property_id, profile_id = null, unit_id = null) {
        return await models.PropertyRateChange.getUnitGroups(connection, property_id, profile_id, unit_id)
    }

    async saveRateChanges(connection, rateChanges) {
        try {
            if (rateChanges.insert.length) {
                await models.PropertyRateChange.insertUnitPriceChanges(connection, rateChanges.insert)
            }
            if (rateChanges.update.length) {
                await models.PropertyRateChange.updateUnitPriceChanges(connection, rateChanges.update)
            }
        } catch (err) {
            throw err
        }
    }

    async calculateSellRateUnitGroups(connection, unitGroups) {
        const currentDate = new Date()
        let unitsPriceChangesUpdates = []
        let unitsPriceChangesInserts = []
        let setRate
        let sellRate
        let ratePlanSettings = []
        let newSellRateData
        let unitsData
        let selectedRatePlanSetting
        let rounding
        let changePrice
        for (let unitGroup of unitGroups) {
            unitsData = await models.PropertyRateChange.getUnitsPrice(connection, unitGroup.unit_group_hashed_id)
            ratePlanSettings = JSON.parse(unitGroup.settings)
            selectedRatePlanSetting = ratePlanSettings
                ?.filter((s) => s.occupancy_percentage <= unitGroup.occupancy * 100)
                ?.sort((a, b) => a.occupancy_percentage - b.occupancy_percentage)
                ?.pop()
            if(!selectedRatePlanSetting) {
                selectedRatePlanSetting = {"type": "increase", "value": 0, "occupancy_percentage": 0} // when no plan setting is found
            }
            for (let unit of unitsData) {
                newSellRateData = null
                setRate = unit?.price ?? null
                sellRate = unit?.sell_rate ?? 0
                rounding = unitGroup.round_to
                if(setRate != null){
                    if (selectedRatePlanSetting && (unit?.price >=0)) {
                        newSellRateData = PropertyRateManagement.calculateSellRate(selectedRatePlanSetting, unitGroup, setRate, rounding)
                        if (newSellRateData.sellRate != sellRate) {
                            if (unit?.id) {
                                changePrice = newSellRateData.sellRate - sellRate
                                unitsPriceChangesInserts.push([unit.id, newSellRateData.sellRate, changePrice, currentDate, setRate])
                            }
                            if (unit?.upcm_id) {
                                unitsPriceChangesUpdates.push([unit.upcm_id, currentDate])
                            }
                        }
                    }
                }
            }

        }

        return { insert: unitsPriceChangesInserts, update: unitsPriceChangesUpdates }
    }

    async refreshUnitGroup(connection, conditions) {
        console.log("unit group refresh trigger starting for conditions ",conditions)
        let profilesData = null
        try {

            if(conditions?.property_id) {
                profilesData = await models.PropertyRateChange.findProfileByProperty(connection, conditions?.property_id)
            } 
            else if (conditions?.profile_id) {
                profilesData = [{ id: conditions.profile_id }]
            }
            else if(conditions?.amenity_property_id) {
                console.log("amenity property id in ws ::",conditions?.amenity_property_id)
                console.log("Profiles found to run trigger::::",profilesData)
                profilesData = await models.PropertyRateChange.findProfileByAmenity(connection, conditions?.amenity_property_id);
            }

            if(profilesData && profilesData?.length) {
                const results = await this.triggerRefresh(connection, profilesData ?? [])
                console.log("Success", results)
            }

            return true;
        } catch(e) {
            console.log("\n\nError on calling procedure", e, "\n\n")
            return false;
        }
    }

    async findProfileByProperty(connection, property_id) {
        return await models.PropertyRateChange.findProfileByProperty(connection, property_id);
    }

    async triggerRefresh(connection, profiles) {
        let promises = profiles.map(profile => models.PropertyRateChange.refreshUnitGroup(connection, profile?.id))
        return Promise.allSettled(promises)
    }
}

module.exports = PropertyRateManagement;
