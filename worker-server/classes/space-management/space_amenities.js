"use strict";
var models  = require(__dirname + '/../../models');
var Hash = require(__dirname + '/../../modules/hashes.js');
var Utils = require(__dirname + '/../../modules/utils.js');
var PropertyRateManagement = require('../../classes/property_rate_management');
var Hashes = Hash.init();

class SpaceAmenities {
    constructor(data) {
        this.unitList = data.units ? data.units.map((unit) => (
            Hashes.decode(unit)[0]
        )) : [];
        this.unit_amenityList = [];
        this.amenityList = data.amenities ? data.amenities.map((amenity) => (
            Hashes.decode(amenity.amenity_property_id)[0]
        )) : [];
        this.unitList.forEach((unit) => 
            data.amenities.forEach((amenity) => {
                if (amenity.value && amenity.value.toLowerCase() !== "no") {
                    let amenity_attr = [Hashes.decode(amenity.amenity_id)[0], Hashes.decode(amenity.amenity_property_id)[0], amenity.value, unit]
                    this.unit_amenityList.push(amenity_attr);
                }
            })
        );
    }

    async updateAmenities(connection, property_id = null){
        try {
            //await connection.beginTransactionAsync();
            let spaceAmenitiesData = await models.SpaceAmenities.findSpaceAmenities(connection, this.unitList, this.amenityList);
            spaceAmenitiesData = spaceAmenitiesData.map( Object.values );
            const checkUnitGroupRefresh = !await Utils.equalArrays(spaceAmenitiesData, this.unit_amenityList);
            await models.SpaceAmenities.deleteSpaceAmenities(connection, this.unitList, this.amenityList);
            if (this.unit_amenityList.length) {
                await models.SpaceAmenities.updateSpaceAmenities(connection, this.unit_amenityList);
            }
           
            if(checkUnitGroupRefresh){
                const propertyRateManagement = new PropertyRateManagement();
                return await propertyRateManagement.refreshUnitGroup(connection, { property_id: property_id });
            }
            return true;
        } catch(err) {
            return false;
        }
        
    }


}

module.exports = SpaceAmenities;