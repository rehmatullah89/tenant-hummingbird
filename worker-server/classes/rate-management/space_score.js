"use strict";
var SpaceScoreModel = require("../../models/rate-management/space_score");

class PropertyAmenities {
    constructor(item) {
        this.item = item || "";
        this.filteredSpaceScoreData = {
            storage: [],
            parking: []
        };
        this.spaceScoreData = []
    }

    async driver(connection, data) {
       try {
        this.spaceScoreData = await SpaceScoreModel.getSpaceScoreData(connection, data.property_id);
        this.spaceScoreData.forEach(amenity => this.filteredSpaceScoreData[amenity.property_type].push(amenity))
        await this[data.type](connection, data);
       } catch (error) {
        console.log(error);
       }
    }

    async create(connection, data) {
        if (this.spaceScoreData.length) {
            let amenities = await SpaceScoreModel.fetchNewAmenities(connection, data.data, data.property_id);
            let configuredData = [];
            amenities?.forEach((amenity) => {
                amenity.amenity_options = JSON.parse(amenity?.amenity_options);
                let propertyTypeData = this.filteredSpaceScoreData[amenity.property_type]
                let propertyTypeLastItem = propertyTypeData[propertyTypeData?.length - 1]
                if (amenity.field_type == "boolean") {
                        let data = {
                            amenity_property_id: amenity.id,
                            value: "Yes",
                            property_id: amenity.property_id,
                            sort_order: propertyTypeLastItem.sort_order + 1,
                            show_in_website: false
                        };
                        configuredData.push(data);
                } else {
                    let index = 0
                    amenity.amenity_options?.options?.forEach((value) => {
                        if (value !== "No") {
                            let data = {
                                amenity_property_id: amenity.id,
                                value: value,
                                property_id: amenity.property_id,
                                sort_order: propertyTypeLastItem.sort_order + index + 1,
                                show_in_website: false
                            };
                            configuredData.push(data);
                            index++
                        }
                    });
                }

            });
            let filteredData = configuredData.map(obj => Object.values(obj));
            await SpaceScoreModel.insertSpaceScoreData(connection, filteredData)
        }
    }

    async update(connection, data) {
        let alteredAmenity = data.data ?? {}
        alteredAmenity.amenity_options = JSON.parse(alteredAmenity?.amenity_options);
        let { property_type } = await SpaceScoreModel.getAmenityPropertyType(connection, alteredAmenity.id)
        let updatedOptions = []
        let newOptions = []
        let existingData = this.spaceScoreData?.filter(item => item.amenity_property_id === alteredAmenity.id)
        let propertyTypeData = this.filteredSpaceScoreData[property_type]
        let propertyTypeLastItem = propertyTypeData[propertyTypeData.length - 1]

        if (existingData?.length) {
            if (alteredAmenity.field_type == "boolean") {
                let item = existingData[0]
                updatedOptions.push({
                    id: item.id,
                    amenity_property_id: alteredAmenity.id,
                    value: "Yes",
                    property_id: alteredAmenity.property_id,
                    sort_order: item.sort_order,
                    show_in_website: item?.show_in_website
                })
                existingData?.splice(0, 1)
            } else {
                let index = 0
                alteredAmenity.amenity_options?.options?.forEach((value) => {
                    if (value !== "No") {
                        let itemIndex = ''
                        let exists = existingData?.find((item, idx) => {
                            itemIndex = idx
                            return value == item.value
                        })
                        if (exists) {
                            updatedOptions.push({
                                id: exists.id,
                                amenity_property_id: alteredAmenity.id,
                                value: value,
                                property_id: alteredAmenity.property_id,
                                sort_order: exists.sort_order,
                                show_in_website: exists?.show_in_website
                            })
                            existingData?.splice(itemIndex, 1)
                        } else {
                            newOptions.push({
                                amenity_property_id: alteredAmenity.id,
                                value: value,
                                property_id: alteredAmenity.property_id,
                                sort_order: propertyTypeLastItem.sort_order + index + 1,
                                show_in_website: false
                            })
                            index++
                        }
                    }
                })
            }
        } else {
            if (alteredAmenity.field_type == "boolean") {
                newOptions.push({
                    amenity_property_id: alteredAmenity.id,
                    value: "Yes",
                    property_id: alteredAmenity.property_id,
                    sort_order: propertyTypeLastItem.sort_order + 1,
                    show_in_website: false
                })
                existingData?.splice(0, 1)
            } else {
                let index = 0;
                alteredAmenity.amenity_options?.options?.forEach((value) => {
                    if (value !== "No") {
                        newOptions.push({
                            amenity_property_id: alteredAmenity.id,
                            value: value,
                            property_id: alteredAmenity.property_id,
                            sort_order: propertyTypeLastItem.sort_order + index + 1,
                            show_in_website: false
                        })
                        index++
                    }
                })
            }
        }
        if (updatedOptions?.length) await SpaceScoreModel.updateSpaceScoreData(connection, updatedOptions)
        if (newOptions?.length) {
            let filteredData = newOptions.map(obj => Object.values(obj));
            await SpaceScoreModel.insertSpaceScoreData(connection, filteredData)
        }
        if (existingData?.length) {
            let deletedOptionIds = existingData.map(data => data.id)
            await SpaceScoreModel.deleteSpaceScoreData(connection, alteredAmenity.property_id, deletedOptionIds)
        }
    }

    async delete(connection, data) {
        if (this.spaceScoreData?.length) {
            let { property_id, id } = data.data
            let spaceScoreIds = this.spaceScoreData?.filter(item => item.amenity_property_id === id)?.map((vv) => vv.id)
            await SpaceScoreModel.deleteSpaceScoreData(connection, property_id, spaceScoreIds)
        }
    }
}

module.exports = PropertyAmenities;
