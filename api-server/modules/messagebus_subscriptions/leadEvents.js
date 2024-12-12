//* split into different files in order to avoid possible circular-dependance
const Property = require("../../classes/property");
const Company = require("../../classes/company");
const Lead = require("../../classes/lead");

const rp = require("request-promise");
let settings = require("../../config/settings");

let utils = require("../utils.js");

let moment = require('moment');
let {
    hashResponse,
    HB_EVENT_TYPE,
    getGDSFacilityId,
    getGdsHeaders
} = require("./common");

const headers = getGdsHeaders();

/**
 * Trigger a message bus event when lead is created or updated
 * @param {object} connection
 * @param {number} property_id  property id
 * @param {object} leadData lead data
 * @param {boolean} isNewLead flag for whether new nor updated lead
 * @param {number} cid mapping table company id
 **/
async function generateLeadEvent(connection, property_id, leadData, isNewLead, cid) {
    
    let property = new Property({id: property_id});
    await property.find(connection)
    
    let company = new Company({ id: property.company_id })
    await company.find(connection)
    let gdsOwner = company.gds_owner_id;

    let facilityID = await getGDSFacilityId(connection, property_id, cid)
    
    let lead = new Lead({ id: leadData.id });
    await lead.find(connection);
    const lead_id = lead.id;
    
    //* parameters for hashing and filtering lead data
    let rawData = [{
        data: lead,
        company_id: cid,
        objName: 'lead',
        baseUrl: '/v1/leads',
        routePath: '/:lead_id',
        apiMethod: 'get'
    }];
    const data = hashResponse(rawData);
   
    //* request body for gds event
    // TODO remove hardcode values
    let requestOptions = {
        uri: `${settings.get_messagebus_app_url()}/events`,
        headers,
        json: true,
        method: 'post',
        body: {
            "specversion": "1.0",
            "type": `${HB_EVENT_TYPE}${isNewLead ? 'CreateLead' : 'UpdateLead'}`,
            "async": true,
            "source": process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
            "owner_id": gdsOwner,
            "facility_id": facilityID,
            "datacontenttype": "application/json",
            "application_id": process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
            data
        }
        
    }
    try {
        //* request to message bus event
        let response = await rp(requestOptions)
        return response;
    } catch (err) {
        let logs = {
            env: settings.config.env,
            message: JSON.stringify(err),
            requestOptions,
            facilityID,
            property_id,
            lead_id,
            err,
            err_stack: err.stack
        }
        console.log(err)

        await utils.handleErrors("Leads Event", logs);
    }
}

module.exports = {
    generateLeadEvent: generateLeadEvent
}
