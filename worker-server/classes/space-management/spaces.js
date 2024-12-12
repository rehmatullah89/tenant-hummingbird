"use strict";
var models  = require(__dirname + '/../../models');
var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
const e = require('../../modules/error_handler');

class Spaces {
    constructor(data) {
        this.type = data.spaceDetails.space_type;
        this.property_id = data.spaceDetails.property_id ? Hashes.decode(data.spaceDetails.property_id)[0] : '';
        this.category_id = data.spaceDetails.website_group ? Hashes.decode(data.spaceDetails.website_group)[0] : '';
        this.width = data.spaceDetails.Width;
        this.length = data.spaceDetails.Length;
        this.height = data.spaceDetails.Height;
        this.doorwidth = data.spaceDetails.doorWidth;
        this.doorheight = data.spaceDetails.doorHeight;
        this.price = data.spaceDetails.setPrice;
        this.set_rate = data.spaceDetails.setPrice;
        this.units = data.unitList;
        this.label = data.spaceDetails.Width+"\'"+" x "+data.spaceDetails.Length+"\'";
        this.amenityList = data.amenityList ? data.amenityList.map((amenity) => ({
            ...amenity,
            amenity_id: Hashes.decode(amenity.amenity_id)[0],
            amenityPropertyId: Hashes.decode(amenity.amenityPropertyId)[0]
        })) : [];
        this.status = 1;
        this.spaceAmenities = ['width', 'length', 'height', 'door width', 'door height', 'sqft']
        this.requiredAmenities = ['width', 'length', 'height', 'door width', 'door height', 'sqft']
        this.sqft = this.width * this.length * this.height;
    }

    async createSpaces(connection, company_id,user_id) {
        try {
            const exists = await models.Spaces.isSpacesExist(connection, this.units, this.property_id);
            if (exists) e.th(400, "Space Already Exists");

            const amenityList = await models.Spaces.findAmenitiesIdx(connection, this.spaceAmenities, this.type, this.property_id);

            const amenitiesMissing = this.requiredAmenities.filter((spaceAmenity) => !amenityList.find(amenity => amenity.name.toLowerCase() === spaceAmenity));

            if (amenitiesMissing.length > 0) {
                console.log(` Missing Amenities of property_type: ${this.type} and property_id: ${this.property_id}`);
                console.log("Missing Amenities", amenitiesMissing);

                e.th(400, `Internal Configuration Error: Spaces cannot be created as ${amenitiesMissing.length > 1 ? 'Amenities' : 'Amenity'} ${amenitiesMissing.join(', ')} ${amenitiesMissing.length > 1 ? 'are' : 'is'} missing in this property. For creating the space please contact the Tenant.inc support team.`);
            }

            const address = await models.Spaces.findAddressIdx(connection, this.property_id);
            const address_id = address[0].address_id;

            const product = await models.Spaces.findProductIdx(connection, company_id);
            const product_id = product[0].id;

            const spaces = this.units.map((unit) => [ unit, this.type, this.property_id, this.category_id, address_id, product_id, this.label, this.status,user_id ]); 
            const { insertId } = await models.Spaces.createSpaces(connection, spaces);

            console.log(`Units added`, this.units);

            const amenities = [];
            const unit_prices = [];
            
            for (let index = 0; index < this.units.length; index++) {
                for (let ai = 0; ai < this.amenityList.length; ai++) {
                    const amenity = this.amenityList[ai];
                    if (amenity.value && amenity.value.toLowerCase() !== "no") {
                        amenities.push([ insertId + index, amenity.amenity_id, amenity.amenityPropertyId, amenity.value ]);
                    }
                }
                for (let i = 0; i < amenityList.length; i++) {
                    const amenity = amenityList[i];
                        if (amenity.name.toLowerCase() === 'width') amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.width ]);
                        else if (amenity.name.toLowerCase() === 'length') amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.length ]);
                        else if (amenity.name.toLowerCase() === 'height') amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.height ]);
                        else if (amenity.name.toLowerCase() === 'sqft') amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.sqft ]);
                        else {
                            let amenityArr = amenity.name.split(' ');
                            if (amenityArr[0].toLowerCase()==='door' && amenityArr[1].toLowerCase()==='width')
                            {
                                amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.doorwidth ]);
                            }
                            else{
                                amenities.push([ insertId + index, amenity.amenity_id, amenity.id, this.doorheight ]);
                            }
                        }
                }
                unit_prices.push([insertId + index, this.price, this.set_rate])
            }

            console.log("Final Amenities", amenities);

            await models.Spaces.createAmenityUnits(connection, amenities);
            await models.Spaces.updateUnitPrices(connection, unit_prices);

            return insertId;
        } catch (err) {
            throw err;
        }
	}
}

module.exports = Spaces;