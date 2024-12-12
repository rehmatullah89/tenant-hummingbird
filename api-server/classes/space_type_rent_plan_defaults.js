"use strict";
const SpaceTypeRentPlanDefaultsModel = require(__dirname + '/../models/space_type_rent_plan_defaults');
const RentManagementPlans = require (__dirname + '/../models/rent_management_plans');
const e  = require(__dirname + '/../modules/error_handler.js');
class SpaceTypeRentPlanDefaults {

    constructor(data) {
        data = data || {};
        this.space_type = data.space_type || null;
        this.plans = data.plans;
    }

    async save(connection, company_id, property_id) {
        try {
            let labels = null;
            let valuePricingEnabled = await SpaceTypeRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
            if(valuePricingEnabled) labels = await SpaceTypeRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
            let save = [];
            if (this.plans) {
                for (let plan of this.plans) {
                    const planExists = await RentManagementPlans.checkRentPlanExistence(connection, plan.rent_plan_id, company_id);
                    if (!planExists) e.th(403, "invalid rent plan id");
                    save.push([
                        this.space_type,
                        plan.value_tier_type,
                        plan.rent_plan_id,
                        property_id,
                    ]);
                }
                await SpaceTypeRentPlanDefaultsModel.save(connection, save);
            }
        }
        catch (error) {
            throw error;
        }
    }
    
    async findAll(connection, property_id) {
        let labels = null;
        const valuePricingEnabled = await SpaceTypeRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
        const SpaceTypePlanData = await SpaceTypeRentPlanDefaultsModel.findAll(connection, property_id, valuePricingEnabled);
        if(valuePricingEnabled) labels = await SpaceTypeRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
        let data ={ 
            "types": SpaceTypePlanData,
            "value_pricing_config": { labels: labels ?? null, value_pricing_active: valuePricingEnabled },
        }
        return data;
    }

    async find(connection, property_id) {
        let data;
        let labels = null;
        const valuePricingEnabled = await SpaceTypeRentPlanDefaultsModel.checkValuePricingEnabled(connection, property_id);
        const condition = { space_type: this.space_type, property_id: property_id };
        const SpaceTypePlanData = await SpaceTypeRentPlanDefaultsModel.find(connection, condition, valuePricingEnabled);
        if(valuePricingEnabled) labels = await SpaceTypeRentPlanDefaultsModel.findValueTierLabel(connection, property_id);
        data = { 
            "type": SpaceTypePlanData,
            "value_pricing_config": { labels: labels ?? null, value_pricing_active: valuePricingEnabled },
        }
        return data;
    }

    async findValueTierLabel(connection, property_id) {
        return await SpaceTypeRentPlanDefaultsModel.findValueTierLabel(connection, property_id);   
    }
}



module.exports = SpaceTypeRentPlanDefaults;
