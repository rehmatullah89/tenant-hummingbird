'use strict';

const rp = require('request-promise');
const moment = require('moment');

const Company = require('./../classes/company');
const Property = require('./../classes/property');

const db = require('./db_handler');
const utils = require('./utils');
const { getGDSMappingIds } = require('./gds_translate');

const settings = require('../config/settings');

const Hash = require('./hashes');
const Hashes = Hash.init();

const headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

/**
 *
 * @param {object} payload payment event payload
 * @param {string} payload.cid Mapping company id
 * @param {string} payload.property_id
 * @param {string} payload.contact_id
 * @param {string} payload.payment_id
 * @param {string} payload.payment_amount Total payment amount
 * @param {object[]} payload.invoices List of invoices payment applied to
 * @param {string} payload.invoices.id
 * @param {string} payload.invoices.lease_id
 * @param {string} payload.invoices.space_id
 * @param {string} payload.invoices.tenant_id
 * @param {string} payload.invoices.amount Invoice amount
 * @returns
 */
async function raisePaymentEvent(payload) {
  let { payment_id, property_id, cid } = payload;

  const connection = await db.getConnectionByType('read', cid, null);

  const property = new Property({ id: property_id });
  await property.find(connection);
  const company = new Company({ id: property.company_id });
  await company.find(connection);

  const gdsOwner = company.gds_owner_id;
  let facilityID = property.gds_id || '';
  if (!facilityID) {
    let ids = [
      {
        facility: Hashes.encode(property_id, cid),
        pmstype: "leasecaptain"
      }];
    let mappedIds = await getGDSMappingIds(ids);
    facilityID = mappedIds?.facility?.gdsid;
  }

  let data = Hash.makeHashes(payload, cid);
  data.company_id = Hashes.encode(cid);
  delete data.cid;

  const requestOptions = {
    uri: `${settings.get_messagebus_app_url()}/events`,
    headers,
    json: true,
    method: 'post',
    body:
    {
      "specversion": "1.0",
      "type": 'urn:gds:schema:events:com.hummingbird:CreatePayment',
      "async": true,
      "source": process.env.GDS_APPLICATION_ID,
      "owner_id": gdsOwner,
      "facility_id": facilityID,
      "datacontenttype": "application/json",
      "application_id": process.env.GDS_APPLICATION_ID,
      data
    }
  };
  try {
    await rp(requestOptions);
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
    };
    utils.handleErrors("New Payment Event", logs);
  }
  await db.closeConnection(connection);
}

module.exports = {
  raisePaymentEvent
};
