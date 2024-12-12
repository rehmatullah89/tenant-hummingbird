"use strict";
var models  = require(__dirname + '/../../models');

class PropertyAmenities {
    constructor(data) {
        this.amenities = data || [];
    }

    async findUnitGroupProfileAmenities(connection) {
        let amenityIds = [];
        let propertyIds = [];
        for(let amenity of this.amenities){
            if(amenity?.amenity_id && amenity?.property_id) {
                amenityIds.push(amenity?.amenity_id);
                propertyIds.push(amenity?.property_id);
            }
        }
        if(amenityIds.length && propertyIds.length){
            return await models.PropertyAmenities.findAmenityPropertyIds(connection, amenityIds, propertyIds);
        } else {
            return [];
        }
    }

    async deleteUnitGroupProfileAmenities(connection, amenityPropertyIds) {
        return await models.PropertyAmenities.deleteUnitGroupProfileAmenities(connection, amenityPropertyIds);
    }

    async addAmenities(connection, company_id) {      
        let insertedAmenities = []
        for (let i = 0; i < this.amenities.length; i++) {
            try {
                let amenity = this.amenities[i];
                const { insertId } = await models.PropertyAmenities.addAmenityToProperty(connection, [amenity.data]);
                
                const unit_list = await models.PropertyAmenities.getPropertyUnits(connection, amenity.property_id, amenity.property_type);
                
                if (unit_list.length) {
                    const amenity_units = [];
                    unit_list.forEach((unit) => {
                        if (amenity.data[5] && amenity.data[5].toLowerCase() !== "no") {
                            amenity_units.push([insertId, unit.id, amenity.data[5], amenity.data[0]]);
                        }
                    })
                    if (amenity_units.length) {
                        await models.PropertyAmenities.addAmenityToUnits(connection, amenity_units);
                    }
                }
                if (insertId) {
                    insertedAmenities.push({
                        insertId,
                        property_id: amenity.property_id,
                        company_id
                    })
                }
            } catch(err) {
                console.log(this.amenities[i] + ' not added to property.')
                console.log(err);
            }
        }
        return insertedAmenities
    }
    
    async updateAmenities(connection) {
        try {
            await models.PropertyAmenities.updatePropertyAmenities(connection, this.amenities);
        } catch(err) {
            console.log('Amenities not updated to property.')
            console.log(err);
        }
    }

    async deleteAmenities(connection, user, company_id) {
        let deletedAmenities = []
        for (let i = 0; i < this.amenities.length; i++) {
            try {
                let amenity = this.amenities[i];
                

                const unit_list = await models.PropertyAmenities.getPropertyUnits(connection, amenity.property_id, amenity.property_type);

                if (unit_list.length) {
                    const amenity_units = unit_list.map((unit) => unit.id);
                    await models.PropertyAmenities.deleteAmenityFromUnits(connection, amenity.id, amenity_units);
                }

                await models.PropertyAmenities.deletePropertyAmenities(connection, user, [amenity.id]);
                deletedAmenities.push({
                    data: amenity,
                    property_id: amenity.property_id,
                    company_id
                })
            } catch(err) {
                console.log(this.amenities[i] + ' not deleted from property.')
                console.log(err);
            }
        }
        return deletedAmenities
    }

    async createAmenities(connection, data) {
        try {
            const amenity = {
                name: data.name,
                property_type: data.property_type,
                category_id: data.category_id,
                status: 1,
                options: JSON.stringify(data.options),
                company_id : data.company_id,
                default_value: data.default,
                field_type: data.field_type
            }
            const { insertId } = await models.PropertyAmenities.createPropertyAmenities(connection, amenity);
            return { amenity_id: insertId };
        } catch(err) {
            console.log("Error while creating custom amenity.")
            console.log(err);
        }
    }

    async getAmenities(connection) {
        try {
            return await models.PropertyAmenities.getPropertyAmenities(connection, this.amenities);
        } catch(err) {
            console.log(err);
        }
    }

}

module.exports = PropertyAmenities;