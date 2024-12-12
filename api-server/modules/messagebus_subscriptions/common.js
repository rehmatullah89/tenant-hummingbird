const moment = require('moment');

const Hash = require('../hashes');
let Hashes = Hash.init();

const Property = require('../../classes/property');

let
{
    getGDSMappingIds
} = require("../gds_translate");
let common = {
    /**
     * This method will filter and hash ids based on request path
     * @param {object} reqObj an object with data that mimics a request
     * @param {object} reqObj.data an object with rawdata
     * @param {string} reqObj.company_id mapping table company id
     * @param {string} reqObj.baseUrl base url of a endpoint
     * @param {string} reqObj.routePath used for filtering from response var
     * @param {string} reqObj.method used for filtering from response var(get/post)
     * @param {string} reqObj.objName contains name for the returned object
     * @returns {object} data filtered & hashed data
     **/
    hashResponse(reqObj)
    {
        // hashing and filtering data
        // TODO optimize
        let hashedData = {};
        for (let obj of reqObj)
        {
            let req = {
                company_id: obj.company_id,
                baseUrl: obj.baseUrl,
                route:
                {
                    path: obj.routePath
                },
                method: obj.apiMethod
            }
            hashedData[obj.objName] = Hash.obscure(obj.data, req)
        }
        return hashedData
    },
    /**
     * Given a list of data and a company id, return a list of hashed IDs of the data
     * @param {object} data The data to be hashed.
     * @param {number} cid mapping table company id
     * @returns An array of hashes.
     */
    hashIds(data, cid){
        return (Hash.makeHashes(data, cid))
    },

    /**
     * It takes a company id (cid) and returns a hash of that id
     * @param {number} cid mapping table company id
     * @returns {string} The hash of the company id.
     */
     hashCompanyId(cid) {
        return (Hashes.encode(cid))
    },
    /**
     * Method to get Facility GDS id for a property
     * This method will check if facility id already exist for a property in DB,
     * if not then then it will make API to translate the required property id to facility id
     * @param  {object} connection
     * @param  {number} propertyId
     * @param  {number} companyId mapping table company id
     * @returns {string} GDS id for a property
     */
    async getGDSFacilityId(connection, propertyId, companyId)
    {
        let property = new Property(
        {
            id: propertyId
        })
        await property.find(connection);
        if (!property.gds_id)
        {
            let ids = [
            {
                facility: Hashes.encode(propertyId, companyId),
                pmstype: "leasecaptain"
            }];
            let mappedIds = await getGDSMappingIds(ids)
            return mappedIds.facility.gdsid
        }
        return property.gds_id
    },
    /* This is a constant that is the base of messagebus event id */
    HB_EVENT_TYPE: 'urn:gds:schema:events:com.hummingbird:',
    
    /**
     * @returns An object with the headers needed to make a request to the GDS API.
     */
    getGdsHeaders()    {
        return {
            "x-storageapi-key": process.env.GDS_API_KEY,
            "x-storageapi-date": moment()
                .format('x'),
            "Content-Type": "application/json"
        }
    }
}
module.exports = common;