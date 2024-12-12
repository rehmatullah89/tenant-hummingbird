//* split into different files in order to avoid possible circular-dependance
'use strict'
const rp = require("request-promise");

const Company = require("../../classes/company");
const Property = require("../../classes/property");

let settings = require("../../config/settings");

let utils = require("../utils");
let common = require('./common');


const headers = common.getGdsHeaders();

/**
 * This method raises an event to message-bus whenever a payment is made.
 * @param connection  The connection object to the database
 * @param {object} payload  The payload object that contains the payment event details
 * @param {number} payload.cid Mapping company id
 * @param {number} payload.property_id
 * @param {object} payload.payment Payment details
 * @param {number} payload.payment.id
 * @param {number} payload.payment.contact_id
 * @param {number} payload.payment.amount Total amount paid
 * @param {object[]} payload.payment.invoicesPayment Payment applied invoices
 * @param {number} payload.payment.invoicesPayment.invoice_id
 * @param {number} payload.payment.invoicesPayment.lease_id
 * @param {number} payload.payment.invoicesPayment.space_id Unit id
 * @param {number} payload.payment.invoicesPayment.tenant_id
 * @param {number} payload.payment.invoicesPayment.amount invoice amount
 * @returns The response from the message bus.
 */

async function raisePaymentEvent(connection, payload) {

    let { property_id, payment, cid } = payload;
    const payment_id = payment.id

    let property = new Property({ id: property_id });
    await property.find(connection)

    let company = new Company({ id: property.company_id })
    await company.find(connection)

    let gdsOwner = company.gds_owner_id;
    let facilityID = property.gds_id || await common.getGDSFacilityId(connection, property_id, cid);

    let data = {
        payment_id,
        contact_id: payment.contact_id,
        payment_amount: payment.amount,
        property_id,
        invoices: payment.invoicesPayment.map(inv => ({
            id: inv.invoice_id,
            lease_id: inv.lease_id,
            space_id: inv.space_id,
            tenant_id: inv.tenant_id,
            amount: inv.amount
        }))
    };

    data = common.hashIds(data, cid);
    data.company_id = common.hashCompanyId(cid);

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
            "type": `${common.HB_EVENT_TYPE}CreatePayment`,
            "async": true,
            "source": process.env.GDS_APPLICATION_ID,
            "owner_id": gdsOwner,
            "facility_id": facilityID,
            "datacontenttype": "application/json",
            "application_id": process.env.GDS_APPLICATION_ID,
            data
        }
    }
    try {
        //* request to message bus event
        let response = await rp(requestOptions)
        return response;
    }
    catch (err) {
        let logs = {
            env: settings.config.env,
            message: JSON.stringify(err),
            requestOptions,
            facilityID,
            property_id,
            payment_id,
            err,
            err_stack: err.stack
        }

        console.log('error occurred while raise a payment event', err);
        await utils.handleErrors("New Payment Event", logs);
    }
}
module.exports = {
    raisePaymentEvent
}