"use strict";

const Hash = require(__dirname + "/../modules/hashes.js")
const RentManagementPlansModel = require(__dirname + '/../models/rent_management_plans');
const e = require(__dirname + '/../modules/error_handler.js');
const utils = require(__dirname + "/../modules/utils.js");
class RentManagementPlans {

    constructor(data = {}) {
        this.id = data.id;
        this.company_id = data.company_id || null;
        this.contact_id = data.contact_id || null;
        this.name = data.name || ``;
        this.description = data.description || ``;
        this.settings = data.settings || null;
        this.maximum_raise = data.maximum_raise || null;
        this.minimum_raise = data.minimum_raise || null;
        this.rent_cap = data.rent_cap || null;
        this.prepay_rent_raise = data.prepay_rent_raise || false;
        this.active = data.active;
        this.verified = data.verified;
        this.tags = data.tags || null;
    }
    
    async save(connection, edit = false) {
        try {

            let rentPlanData = {
                id: this.id,
                company_id: this.company_id,
                contact_id: this.contact_id,
                name: this.name,
                description: this.description,
                prepay_rent_raise: this.prepay_rent_raise,
                active: this.active,
                verified: this.verified,
                ...utils.normalizeJson({
                    maximum_raise: this.maximum_raise,
                    minimum_raise: this.minimum_raise,
                    rent_cap: this.rent_cap,
                    settings: this.settings,
                    tags: this.tags,
                })
            }

            let isRentPlanDuplicate = await RentManagementPlansModel.checkForDuplicateRentPlan(connection, this.company_id, this.name, this.id);
            if (isRentPlanDuplicate) e.th(409, `A Rent Plan already exists with the name '${this.name}'.`);

            if (edit) {
                let rentPlanExists = await RentManagementPlansModel.checkRentPlanExistence(connection, this.id, this.company_id);
                if (!rentPlanExists) e.th(403, "Invalid rent plan id");
            }
            
            let result = await RentManagementPlansModel.save(connection, rentPlanData, edit);

            if (result?.affectedRows !== 1) e.th(500, `Error while ${edit ? 'updating' : 'creating'} Rent plan`)
            if (result?.insertId) this.id = result.insertId;

            rentPlanData.id = this.id;

            return this.makeResponse(rentPlanData);

        } catch (error) {
            throw(error);
        }

    }

    async validateRentPlan(connection) {
        if (!this.id) e.th(403);
        let rentPlanStatus = await RentManagementPlansModel.checkRentPlanStatus(connection, this.id, this.company_id);
        if (['lease', 'space group', 'space type'].includes(rentPlanStatus)) e.th(409, `Cannot delete a rent plan assigned to a ${rentPlanStatus}`);
        if (!(rentPlanStatus == 'rent_plan_exists')) e.th(404, `Rent Plan not found`)
    }

    async delete(connection) {
        if (!this.id) e.th(403);
        await RentManagementPlansModel.delete(connection, this.id);
    }

    /**
     *
     * If id is present in the request, `id` takes priority
     */
    getRentPlans(connection) {
        if (!(this.id || this.company_id)) e.th(400, "Either provide company id or rent plan id");

        let clauses = {
            true: {
                attr: "id",
                value: this.id,
            },
            false: {
                attr: "company_id",
                value: this.company_id,
            },
        }[typeof this.id !== "undefined"];

        return RentManagementPlansModel.getRentPlans(connection, clauses.value, clauses.attr)
            .then((response) => {
                if (!response) e.th(404, "No rent plans found");
                return response.sort(utils.sortBy('name'));
            });
    }

    makeResponse(data) {
        let response = {
            ...utils.pick(data, [
                `id`,
                `name`,
                `description`,
                `prepay_rent_raise`,
                `active`,
                `verified`
            ]),
            settings: JSON.parse(data.settings),
            maximum_raise: JSON.parse(data.maximum_raise),
            minimum_raise: JSON.parse(data.minimum_raise),
            rent_cap: JSON.parse(data.rent_cap),
            tags: JSON.parse(data.tags),
            created_by: JSON.parse(data.contact_id)
        }
        return Hash.makeHashes(response, this.company_id, ["created_by"])
    }

    async validateSettings(settings = this.settings, maximumRaise = this.maximum_raise, minimumRaise = this.minimum_raise) {
            let 
                hasRecurring = false,
                highestSortOrder = 0,
                recurringSortOrder = 0,
                sort_orders = [],
                errors = []
            ;

            settings?.forEach((setting) => {
                sort_orders.push(setting.sort_order)

                if(highestSortOrder < setting.sort_order) highestSortOrder = setting.sort_order;

                if(!!setting.recurrence_interval) {
                    if(hasRecurring) {
                        errors.push(`\"settings\" recurring type should not be repeated`);
                    }
                    else {
                        recurringSortOrder = setting.sort_order
                        hasRecurring = true
                    }
                }
                
                if (setting.increase_by && setting.target) errors.push(`\"settings\" can't contain both increase_by and target fields`);

                if (!setting.increase_by && !setting.target) errors.push(`\"settings\" must contain atleast one from increase_by or target fields`);

            });

            if(new Set(sort_orders).size !== sort_orders.length) errors.push("\"settings\" sort_order should be unique");

            if (hasRecurring && highestSortOrder > recurringSortOrder) errors.push("\"settings\" recurring type should be the last stage (highest sort_order)");

            if (maximumRaise?.type === minimumRaise?.type) {
                if (maximumRaise.value <= minimumRaise.value) errors.push(`\"maximum_raise.value\" should be greater than \"minimum_raise.value\" if both types are ${maximumRaise?.type}`);
            }

            if (errors.length > 0) e.th(400, errors.join(`; `));

        return true
    }
}



module.exports = RentManagementPlans;
