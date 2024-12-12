"use strict";
const SpaceGroupRentPlanDefaultsModel = require(__dirname + '/../models/space_group_rent_plan_defaults');
const RentManagementPlans = require (__dirname + '/../models/rent_management_plans');
const e  = require(__dirname + '/../modules/error_handler.js');
class SpaceGroupRentPlanDefaults {

    constructor(data) {
        data = data || {};
        this.tier_id = data.space_group || null;
        this.plans = data.plans;
    }

    async save(connection, company_id, property_id) {
        try {
            let labels = null;
            let valuePricingEnabled = await SpaceGroupRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
            if(valuePricingEnabled) labels = await SpaceGroupRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
            let save = [];
            if (this.plans) {
                for (let plan of this.plans) {
                    const planExists = await RentManagementPlans.checkRentPlanExistence(connection, plan.rent_plan_id, company_id);
                    if (!planExists) e.th(403, "invalid rent plan id");
                    save.push([
                        this.tier_id,
                        plan.value_tier_type,
                        plan.rent_plan_id,
                        property_id,
                    ]);
                }
                await SpaceGroupRentPlanDefaultsModel.save(connection, save);
            }
        }
        catch (error) {
            throw error;
        }
    }

    async findAll(connection, property_id) {
        let labels = null;
        const valuePricingEnabled = await SpaceGroupRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
        const SpaceGroupPlanData = await SpaceGroupRentPlanDefaultsModel.findAll(connection, property_id, valuePricingEnabled);
        if(valuePricingEnabled) labels = await SpaceGroupRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
        let data ={ 
            "groups": SpaceGroupPlanData,
            "value_pricing_config": { labels: labels ?? null, value_pricing_active: valuePricingEnabled },
        }
        return data;
    }

    async find(connection, property_id) {
        let data;
        let labels = null;
        const valuePricingEnabled = await SpaceGroupRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
        const condition = { space_group: this.tier_id, property_id: property_id };
        const SpaceGroupPlanData = await SpaceGroupRentPlanDefaultsModel.find(connection, condition, valuePricingEnabled);
        if(valuePricingEnabled) labels = await SpaceGroupRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
        data = { 
            "group": SpaceGroupPlanData,
            "value_pricing_config": { labels: labels ?? null, value_pricing_active: valuePricingEnabled },
        }
        return data;
    }

    async findValueTierLabel(connection, property_id) {
        return await SpaceGroupRentPlanDefaultsModel.findValueTierLabel(connection, property_id);   
    }
}



module.exports = SpaceGroupRentPlanDefaults;
