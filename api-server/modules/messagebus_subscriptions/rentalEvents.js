const rp = require("request-promise");
const Property = require("../../classes/property");
const Company = require("../../classes/company");
let settings = require("../../config/settings");
let utils = require("../utils");
let common = require('./common');

const headers = common.getGdsHeaders();
/**
 * This method create a event to message-bus whenever a lease is finalized
 * @param connection  The connection object to the database
 * @param payload  The payload of the event.
 * @returns The response from the message bus.
 */
async function raiseRentalEvent(connection, payload) {

    const property_id = payload.unit.property_id;
    const lease_id = payload?.lease?.id;

    let property = new Property({ id: property_id });
    await property.find(connection)

    let company = new Company({ id: property.company_id })
    await company.find(connection)
    let gdsOwner = company.gds_owner_id;

    let facilityID = await common.getGDSFacilityId(connection, property_id, payload.cid)
    console.log('Raise Rental Event facilityId ', facilityID);

    /* This is creating a hash of the ID's that will be sent to the message bus. */
    let data = {
        lease_id,
        tenant_id: payload?.lease?.Tenants[0]?.id,
        contact_id: payload?.contact_id,
        space_id: payload?.unit?.id,
        payment_id: payload?.payment?.id,
        property_id,
    };
    
    data = common.hashIds(data, payload.cid);
    data.company_id = common.hashCompanyId(payload.cid);

    console.log('Raise Rental Event Data ', data);

    //* request body for gds event
    // TODO remove hardcode values
    let requestOptions = {
        uri: `${settings.get_messagebus_app_url()}/events`,
        headers,
        json: true,
        method: 'post',
        body:
        {
            "specversion": "1.0",
            "type": `${common.HB_EVENT_TYPE}CreateRental`,
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
        console.log('Rental Event end point ', requestOptions);
        //* request to message bus event
        let response = await rp(requestOptions)
        return response;
    }
    catch (err) {
        console.log('Rental event error ', err);

        let logs = {
            env: settings.config.env,
            message: JSON.stringify(err),
            requestOptions,
            facilityID,
            property_id,
            lease_id,
            err,
            err_stack: err.stack
        }

        await utils.handleErrors("New Rental Event", logs);
    }
}
module.exports = {
    raiseRentalEvent
}