//* split into different files in order to avoid possible circular-dependance
const Company = require("../../classes/company");
const rp = require("request-promise");
let settings = require("../../config/settings");

let utils = require("../utils.js");

let {
    hashResponse,
    HB_EVENT_TYPE,
    getGDSFacilityId,
    getGdsHeaders
} = require("./common");

const headers = getGdsHeaders();

/**
 * Trigger a message bus event when contact is updated
 * Only trigger event if there is a lease associated with the contact
 * @param {object} connection
 * @param {object} contact  contact information
 * @param {number} cid mapping table company id
 **/
async function generateContactEvent(connection, contact, cid) {

    const companyId = contact.company_id;
    const contactId = contact.id;

    let leases = contact?.Leases;
    let propertyList = [];

    let company = new Company({ id: companyId });
    await company.find(connection);
    let gdsOwner = company.gds_owner_id;

    let rawData = [{
        data: contact,
        company_id: cid,
        objName: "contact",
        baseUrl: "/v1/contacts",
        routePath: "/:contact_id",
        apiMethod: "get"
    }];

    let facilityIds = [];

    for (let lease of leases) {
        let propertyId = lease?.Unit?.property_id;
        if (!propertyList.includes(propertyId)) {

            propertyList.push(propertyId);

            let facilityID = await getGDSFacilityId(connection, propertyId, cid);
            facilityIds.push(facilityID);
            let data = hashResponse(rawData);

            let requestOptions = {
                uri: `${settings.get_messagebus_app_url()}/events`,
                headers,
                json: true,
                method: "post",
                body: {
                    specversion: "1.0",
                    type: `${HB_EVENT_TYPE}UpdateContact`,
                    async: true,
                    source: process.env.GDS_APPLICATION_ID ||
                        "appbc35600a675841eea5893df84231789e",
                    owner_id: gdsOwner,
                    facility_id: facilityID,
                    datacontenttype: "application/json",
                    application_id: process.env.GDS_APPLICATION_ID ||
                        "appbc35600a675841eea5893df84231789e",
                    data
                }
            };
            try {
                //* request to message bus event
                let response = await rp(requestOptions)
                return response;
            } catch (err) {
                console.log(err)
                let logs = {
                    env: settings.config.env,
                    message: JSON.stringify(err),
                    requestOptions,
                    facilityID,
                    propertyId,
                    contactId,
                    err,
                    err_stack: err.stack
                };

                await utils.handleErrors("Contacts Event", logs);
            }

        }

    }
}

module.exports = {
    generateContactEvent: generateContactEvent
}