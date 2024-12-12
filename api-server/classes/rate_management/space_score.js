const e = require(__dirname + "/../../modules/error_handler.js")
const PropertyModel = require(__dirname + "/../../models/property.js")
const SpaceScoreModel = require(__dirname + "/../../models/rate-management/space_score.js")


class SpaceScore {
    constructor(params, reqBody) {
        this.params = params ?? {}
        this.reqBody = reqBody ?? {}
        this.spaceScoreData = {
            storage: [],
            parking: []
        }
    }

    /**
     * Function to fetch space score data
     * @param {SQLConnectionObject} connection SQL connection instance
     * @returns {Object} Space score data
     */
    async getAmentiesList(connection) {
        let { property_id } = this.params
        let spaceScoreExists = await this.checkSpaceScoreExistence(connection, property_id)
        for (let type in spaceScoreExists) {
            await this.getAllSpaceScoreDataByType(connection, property_id, type)
        }
        return this.spaceScoreData
    }

    /**
     * Function to check whether the space score table does have data
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Number} property_id Id of the property
     * @param {String} space_type Type of the property
     * @returns {Boolean}
     */
    async checkSpaceScoreExistence(connection, property_id, space_type) {
        if (space_type) {
            return await SpaceScoreModel.checkExistance(connection, property_id, space_type)
        } else {
            let types = ["storage", "parking"]
            let [ storage, parking ] = await Promise.all(types.map(async(type) => await SpaceScoreModel.checkExistance(connection, property_id, type)))
            return { storage, parking }
        }
    }

    /**
     * Function to update the space score data and also
     * will insert data to the table if the specific data
     * doesn't have in the table
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Object}
     * @returns {Object} Space score data
     */
    async updateSpaceScore(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { property_id, space_type } = params
        let spaceScoringData = []
        let toDeleteSpaceScoreIds = []
        try {
            reqBody = SpaceScore.sortSpaceScoreData(reqBody)
            reqBody?.forEach(async (item) => {
                spaceScoringData.push([
                    item?.space_score_id,
                    property_id,
                    item?.amenity_property_id,
                    item?.value,
                    item?.sort_order,
                    item?.show_in_website
                ])
            })
            await SpaceScoreModel.saveSpaceScoreBulk(connection, spaceScoringData)
            let spaceScoreData = await SpaceScoreModel.getSpaceScoreDataByType(connection, property_id, space_type)
            spaceScoreData?.forEach((amenity) => {
                if (amenity.deleted_at || amenity.deleted_by) {
                    toDeleteSpaceScoreIds.push(amenity.space_score_id)
                } else {
                    this.spaceScoreData[space_type].push({
                        "space_score_id": amenity.space_score_id,
                        "amenity_property_id": amenity.amenity_property_id,
                        "name": amenity.amenity_name,
                        "value": amenity.value,
                        "sort_order": amenity.sort_order,
                        "property_type": space_type,
                        "show_in_website": { 1: true, 0: false }[amenity.show_in_website]
                    })
                }
            })
            if (toDeleteSpaceScoreIds?.length) await SpaceScoreModel.deleteSpaceScoreDataByIds(connection, toDeleteSpaceScoreIds)
            return this.spaceScoreData
        } catch (error) {
            console.log(error);
        }
    }

    static sortSpaceScoreData(spaceScoreData = []) {
        
        spaceScoreData.sort((a,b) => a.sort_order - b.sort_order)
        
        
        for (let i = 0; i < spaceScoreData.length; i++) {
            spaceScoreData[i].sort_order = i + 1;
        }
        
        return spaceScoreData;
    }

    /**
     * Check whether property remains on same company and also
     * space group profile exists under that property
     */
    async validate(connection, { params = this.params, reqBody = this.reqBody } = {}) {
        let { property_id, company_id} = params

        let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)

        if (!isValidProperty) e.th(400, "Property does not exist")

        return true
    }
    
    /**
     * Function to get all space scoring data from database and assign sort order
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Number} property_id Id of the property
     * @param {String} type Type of the property
     */

    async getAllSpaceScoreDataByType(connection, property_id, type) {
        let response = await SpaceScoreModel.getAllSpaceScoreDataByType(connection, property_id, type)
        let sortOrder = 1; // initial sort order is set as 1 for handling a case when there is no data in property_amenity_score_configuration table
        /* 
        response data is sorted according to sort order in property_amenity_score_configuration 
        For entries not in property_amenity_score_configuration then amenity_name in amenity_property table is used for sorting
        */
        response?.forEach((amenity) => {
            //sort order is field from property_amenity_score_configuration table
            if (amenity?.space_score_id) {
                this.spaceScoreData[type].push({
                    "space_score_id": amenity.space_score_id,
                    "amenity_property_id": amenity.amenity_property_id,
                    "name": amenity.amenity_name,
                    "value": amenity.value,
                    "sort_order": amenity.sort_order,
                    "property_type": type,
                    "show_in_website": { 1: true, 0: false }[amenity.show_in_website]
                })
                sortOrder = amenity.sort_order + 1
            } else {
                // sort order is incremented and assigned. Initial sort order is max(sort_order) + 1 from property_amenity_score_configuration table
                if (amenity.amenity_options) amenity.amenity_options = JSON.parse(amenity.amenity_options)
                if (amenity.field_type == "boolean") {
                    let data = {
                        "space_score_id": null,
                        "amenity_property_id": amenity.id,
                        "name": amenity.amenity_name,
                        "value": "Yes",
                        "property_type": type,
                        "sort_order": sortOrder,
                        "show_in_website": false
                    }
                    this.spaceScoreData[type].push(data)
                    sortOrder++
                } else {
                    amenity.amenity_options?.options?.sort()
                    amenity.amenity_options.options?.forEach((item) => {
                        if (item !== "No") {
                            this.spaceScoreData[type].push({
                                "space_score_id": null,
                                "amenity_property_id": amenity.id,
                                "name": amenity.amenity_name,
                                "value": item,
                                "property_type": type,
                                "sort_order": sortOrder,
                                "show_in_website": false
                            })
                            sortOrder++
                        }
                    })
                }
            }
        })
    }
}
module.exports = SpaceScore