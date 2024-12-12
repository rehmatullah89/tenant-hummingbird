const reqPromise = require("request-promise");
const Company = require("../../classes/company");
let settings = require("../../config/settings");
let utils = require("../utils.js");
let common = require('./common');
const headers = common.getGdsHeaders();
/**
 * This function is used to update message-bus event whenever a e-sign document occurs
 * @param {object} connection  the database connection
 * @param {object} payload Object containing details regarding e-sign
 * @returns The response from the message bus event.
 */
async function raiseDocSignEvent(connection, payload) {

  const property_id = payload?.property?.id
  const document_id = payload?.checklist?.document_id

  const company = new Company({ id: payload.company_id })
  await company.find(connection)
  const gdsOwnerId = company.gds_owner_id;

  const facilityId = await common.getGDSFacilityId(connection, property_id, payload.cid)

  let data = common.hashIds(
    {
      property_id,
      signer_id: payload?.contact_id,
      lease_id: payload?.lease_id,
      upload_id: payload?.upload.id,
      document_type_id: payload?.upload.document_type_id
    }, payload.cid);

  data.company_id = common.hashCompanyId(payload.cid);
  data.document = {
    id: document_id,
    documentName: payload?.upload.name,
    status: 'completed',
    signed: payload.signedTime,
    description: payload?.checklist?.description
  };

  let requestOptions = {
    uri: `${settings.get_messagebus_app_url()}/events`,
    headers,
    json: true,
    method: 'post',
    body:
    {
      "specversion": "1.0",
      "type": `${common.HB_EVENT_TYPE}EsignDocument`,
      "async": true,
      "source": process.env.GDS_APPLICATION_ID,
      "owner_id": gdsOwnerId,
      "facility_id": facilityId,
      "datacontenttype": "application/json",
      "application_id": process.env.GDS_APPLICATION_ID,
      data
    }
  }
  try {
    let response = await reqPromise(requestOptions)
    return response;
  }
  catch (err) {
    let logs = {
      env: settings.config.env,
      message: JSON.stringify(err),
      requestOptions,
      facilityId,
      property_id,
      document_id,
      err,
      err_stack: err.stack
    }
    console.log(err)
    await utils.handleErrors("Esign Doc Event", logs);
  }
}
module.exports = {
  raiseDocSignEvent
}