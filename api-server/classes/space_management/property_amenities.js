"use strict";

var models  = require(__dirname + '/../../models');
var e  = require(__dirname + '/../../modules/error_handler.js');

const getQueue = require("../../modules/queue");
const Queue = getQueue('hummingbirdQueue');

var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
var Property = require('../property.js');
var refreshUnitGroup = require(__dirname + '/../../modules/refresh_unit_group.js');
var utils    = require(__dirname + '/../../modules/utils.js');
class Property_Amenities{
    constructor(data) {
        data = data || {};
		this.propertyId = data.propertyId || null;
		this.spaceType = data.spaceType || null;
        this.amenityList = data.amenityList || [];
        this.amenityId = data.amenityId || null;
        this.companyId = data.companyId || null;
        // For updating single amenity
        this.amenity  = {
            id: data.id || null,
            amenity_id: data.amenity_id || null,
            property_id: data.property_id || null,
            amenity_name: data.amenity_name || null,
            amenity_category_id: data.amenity_category_id || null,
            amenity_options: data.amenity_options || null,
            default_value: data.default_value || null,
            sort_order: data.sort_order || null
        };
    }

    validate(amenity) {       
        if(!amenity.name) e.th(422, 'Invalid parameters passed!');
        if(!amenity.property_type) e.th(422, 'Invalid parameters passed!');
        if(!amenity.category_id) e.th(422, 'Invalid parameters passed!');
        if(!amenity.options) e.th(422, 'Invalid parameters passed!');
        if(!amenity.property_id) e.th(422, 'Invalid parameters passed!');
        if(!amenity.default) e.th(422, 'Invalid parameters passed!');
    }

    async getAllPropertyAmenityDetails(connection, properties) {
        let amenities = await models.PropertyAmenity.getAllAmenities(connection, { properties, company_id: this.companyId });
        const categories = {};
        let categoryAmenities = [];

        amenities.reduce((acc, cval) => {
            const myAttribute = cval['property_category_name'];
            acc[myAttribute] = [...(acc[myAttribute] || []), cval]
            return acc;
        }, categories);
        Object.entries(categories).forEach(([category, v]) => {
            const amenities = [];
            v.forEach((value) => {
                try {
                    const amenity = amenities.find(a => a.property_amenity_name === value.property_amenity_name);
                    if (!amenity) amenities.push(value);
                    else {
                        const options = JSON.parse(amenity.property_options);
                        const valueOptions = JSON.parse(value.property_options);
                        if (options.type === "select" && valueOptions.type === "select") {
                            valueOptions.options.forEach((i) => {
                                if (!options.options.includes(i)) options.options.push(i);
                            })
                        }
                        amenity.property_options = JSON.stringify(options);
                    }
                } catch(e) {
                    console.log(e.message)
                }
            })
            categoryAmenities.push({ category, amenities })
        })

        return categoryAmenities;
    }

    async getPropertyAmenityDetails(connection, type) {
        let amenities = await models.PropertyAmenity.getAllAmenitiesWithPropertyMapping(connection, {
            property_id: this.propertyId,
            space_type: this.spaceType,
            amenity_id: this.amenityId,
            type: type,
            company_id:this.companyId
        });
        
        // Final object preparation for api response 
        const categories = {};
        let categoryAmenities = [];
        if (type == 'list' || type == 'edit') {
            categoryAmenities = amenities;            
        } else {
            amenities.reduce((acc, cval) => {
                let categoryName = cval['property_category_name']  || cval['master_category_name'];
                categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
                acc[categoryName] = [...(acc[categoryName] || []), cval]
                return acc;
            }, categories);           
            
            Object.keys(categories).sort().forEach(
                (key) => { 
                    categoryAmenities.push({category : key, amenities : categories[key]})
                }, 
            );
        }
    
        return categoryAmenities;
    }

    async bulkUpdatePropertyAmenityDetails(connection, user, company_id, company, isDelete) {
        let propertyAmenitiesToAdd = [];
        let propertyAmenitiesToUpdate = [];
        let propertyAmenitiesToDelete = [];

        this.amenityList.forEach(category => {
            category.amenities.forEach(amenity => {
                if (amenity.property_id != null) {
                    if(amenity.property_amenity_mapping_id != null){
                        if (amenity.checked) {
                            // update amenitites
                            const obj = {
                                id: amenity.property_amenity_mapping_id,
                                amenity_id: amenity.amenity_id,
                                property_id: amenity.property_id,
                                amenity_name: amenity.property_amenity_name || amenity.master_amenity_name,
                                amenity_category_id: amenity.amenity_category_id || amenity.master_category_id,
                                amenity_options: amenity.property_options || amenity.options,
                                default_value: amenity.property_default_value,
                                sort_order: amenity.property_sort_order
                            }                
                            propertyAmenitiesToUpdate.push(obj);
                        } else {
                            // delete amenitites
                            propertyAmenitiesToDelete.push({
                                id: amenity.property_amenity_mapping_id,
                                name: amenity.property_amenity_name,
                                amenity_id: amenity.amenity_id,
                                property_id: amenity.property_id,
                                property_type: amenity.property_type
                            })
                        }
                    }
                    else{
                        // Add amenitites
                        const amenityToAdd = [amenity.amenity_id, amenity.property_id, amenity.master_amenity_name, amenity.master_category_id, JSON.stringify(amenity.options), amenity.property_default_value, amenity.property_sort_order, amenity.property_type, amenity.field_type];
                        propertyAmenitiesToAdd.push({
                            data: amenityToAdd,
                            property_id: amenity.property_id,
                            property_type: amenity.property_type
                        });
                    }
                }
            })
        })

        /* kicks off the process to update property amenities. See Workers */

        await Queue.add(isDelete ? 'property_amenities_deletion' : 'update_property_amenities', {
            cid: company_id,
            company_id: company.id,
            contact_id: user.id,
            property_amenities_to_delete: propertyAmenitiesToDelete,
            property_amenities_to_add: propertyAmenitiesToAdd,
            property_amenities_to_update: propertyAmenitiesToUpdate,
            space_type: this.spaceType,
            socket_details: {
                company_id: company_id,
                contact_id: user.id
            }
        }, {priority: 1});
    }

    async updatePropertyAmenitiesSortOrder(connection) {
        let propertyAmenitiesToUpdate = [];

        this.amenityList.forEach(category => {
            category.amenities.forEach(amenity => {
                if (amenity.property_id != null) {
                    if (amenity.property_amenity_mapping_id != null) {
                        if (amenity.checked) {
                            // update amenitites
                            const obj = {
                                id: amenity.property_amenity_mapping_id,
                                amenity_id: amenity.amenity_id,
                                property_id: amenity.property_id,
                                amenity_name: amenity.property_amenity_name || amenity.master_amenity_name,
                                amenity_category_id: amenity.amenity_category_id || amenity.master_category_id,
                                amenity_options: amenity.property_options || amenity.options,
                                default_value: amenity.property_default_value,
                                sort_order: amenity.property_sort_order
                            }                
                            propertyAmenitiesToUpdate.push(obj);
                        }
                    }
                }
            })
        })
        if (propertyAmenitiesToUpdate.length > 0) {
            await models.PropertyAmenity.updatePropertyAmenities(connection, propertyAmenitiesToUpdate);
        }
    }
    
    async createPropertyAmenity(connection, amenity, user, company_id, company) {
        this.validate(amenity);
        let exists = await models.PropertyAmenity.isPropertyAmenitiesExist(connection, amenity.name, amenity.property_type, amenity.company_id);
        if (exists) e.th(409, `An amenity already exists with this '${amenity.name}' name.`);

        /* kicks off the process to update property amenities. See Workers */

        await Queue.add('custom_amenity_creation', {
            cid: company_id,
            company_id: company.id,
            contact_id: user.id,
            amenity: amenity,
            socket_details: {
                company_id: company_id,
                contact_id: user.id
            }
        }, {priority: 1});
    }

    async getAmenityCategories(connection) {
        let categories = await models.PropertyAmenity.getAmenityCategories(connection);
        return categories;
    }

    async updatePropertySingleAmenity(connection, cid=null) {
        let existingAmenity;
        let checkAmenityNameUniqueInMaster = await models.PropertyAmenity.amenityNameDuplicateInMaster(connection, this.amenity, this.companyId, this.spaceType);
        if (checkAmenityNameUniqueInMaster.length) e.th(409, `An amenity already exists with this '${this.amenity.amenity_name}' name.`);

        let checkAmenityNameUniqueInProperty = await models.PropertyAmenity.amenityNameDuplicateInProperty(connection, this.amenity, this.spaceType);
        if (checkAmenityNameUniqueInProperty.length) e.th(409, `An amenity already exists with this '${this.amenity.amenity_name}' name.`);
        existingAmenity = await models.PropertyAmenity.findPropertyAmenityData(connection, this.amenity.id);
        this.amenity.field_type = (this.amenity.default_value == 'Yes') || (this.amenity.default_value == 'No')?'boolean':'text';
        await models.PropertyAmenity.updatePropertyAmenities(connection, [this.amenity]);
        await Queue.add('trigger_space_score_updation', {
            data: this.amenity,
            type: "update",
            cid: this.companyId,
            property_id: this.amenity.property_id
        }, { priority: 1 });
        
        if (!await utils.equalArrays([existingAmenity], [{
            amenity_id: this.amenity?.amenity_id, property_id: this.amenity?.property_id, amenity_name: this.amenity?.amenity_name,
            amenity_category_id: this.amenity?.amenity_category_id, amenity_options: this.amenity?.amenity_options
        }])) {
            await refreshUnitGroup.callRefreshUnitGroupProcedure(cid, { property_id: this.amenity.property_id });
        }
    }

    async validateSpaceNumber(connection, unitList) {
        let spaces = await models.PropertyAmenity.validateSpaceNumber(connection, unitList, this.propertyId);
        return spaces.map((space) => space.number)
    }

    async deleteSpaces(connection, user, data, cid=null, properties=null) {
        let spacesToDelete = [];
        data.forEach(item => {
            spacesToDelete.push(Hashes.decode(item.id)[0]);
        })

        let leased = await models.PropertyAmenity.checkLeased(connection, spacesToDelete);

        if (leased.length > 0) {
            let spaceIds = leased.map((unit) => unit.unit_id);
            let spaceNumbers = await models.PropertyAmenity.getSpaceNumber(connection, spaceIds);
            return { result: false, leased: spaceNumbers.map((unit) => unit.number) }
        } else {
            await models.PropertyAmenity.deleteSpaces(connection, user, spacesToDelete);
            if (properties?.length) {
                await refreshUnitGroup.callRefreshUnitGroupProcedure(cid, { property_id: properties });
            }
            return { result: true, leased: [] };
        }
    }

    async deactivateSpaces(connection, user, deactivate, data) {
        
        let spacesToDeactivate = [];
        let property = new Property({id: this.propertyId});
        let currDate = await property.getLocalCurrentDate(connection);
        data.forEach(item => {
            let id = Hashes.decode(item.id)[0];
            if (!item.status) {
                e.th(409, `Please provide status with all individual units.`);
            }
            if (deactivate && item.status !== 'Deactivated' || !deactivate && item.status === 'Deactivated') {
                spacesToDeactivate.push(id);
            }
        })

        if (!spacesToDeactivate.length) {
            return { result: true, leased: [] };
        }

        let leased = await models.PropertyAmenity.checkActiveLeased(connection, spacesToDeactivate, currDate);

        if (leased.length > 0) {
            let spaceIds = leased.map((unit) => unit.unit_id);
            let spaceNumbers = await models.PropertyAmenity.getSpaceNumber(connection, spaceIds);
            return { result: false, leased: spaceNumbers.map((unit) => unit.number) }
        } else {
            deactivate = deactivate == true ? 0 : 1;
            await models.PropertyAmenity.deactivateSpaces(connection, spacesToDeactivate,deactivate,user?.id);
            return { result: true, leased: [] };
        }
    }
}

module.exports = Property_Amenities;