var rp = require('request-promise');
var moment = require('moment');

var { getGDSPropertyMappingId } = require('./messagebus_subscriptions/messagebus_subscriptions.js')
var settings = require('../config/settings');

var Company = require('../classes/company');
var Property = require('../classes/property.js');

let e = require('./error_handler.js');


let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

module.exports = {
  subscribeSimpleCertified: async function (connection, propertyId, companyId, userName, password, groupName, partnerKey, client_code) {
    console.log("subscribe simple certified", propertyId);

    let gdsFacilityId = await getGDSPropertyMappingId(connection, propertyId);

    let company = new Company({ id: companyId });
    await company.find(connection);
    let gdsOwnerId = company.gds_owner_id;

    console.log("GDS facility", gdsFacilityId);
    console.log("GDS owner", gdsOwnerId);

    let subscribeRequest = {
      uri: `${settings.get_communication_app_url()}/owners/${gdsOwnerId}/facilities/${gdsFacilityId}/providers/simple-certified-mail/`,
      headers,
      json: true,
      body: {
        username: userName,
        password: password,
        group_name: groupName,
        partner_key: partnerKey,
        client_code: client_code
      },
      method: 'post'
    }

    console.log("request", subscribeRequest)
    try {
      let request = await rp(subscribeRequest);

      console.log("REQUEST", request);
    } catch (error) {
      console.log("Error in subscription simple certified --------------------------------");
      console.log(error);

      let logs = {
        env: settings.config.env,
        message: error.toString(),
        propertyId,
        companyId,
        error,
        err_stack: error.stack
      }
      e.th(400, error);
      //   await utils.handleErrors("Subscribe GDS Event", logs);
    }
  },
  subscribeRpost: async function (connection, propertyId, companyId, userName, password, clientId) {
    console.log("subscribe simple certified", propertyId);

    let gdsFacilityId = await getGDSPropertyMappingId(connection, propertyId);

    let company = new Company({ id: companyId });
    await company.find(connection);
    let gdsOwnerId = company.gds_owner_id;

    console.log("GDS facility", gdsFacilityId);
    console.log("GDS owner", gdsOwnerId);

    let subscribeRequest = {
      uri: `${settings.get_communication_app_url()}/owners/${gdsOwnerId}/facilities/${gdsFacilityId}/providers/rpost/`,
      headers,
      json: true,
      body: {
        username: userName,
        password: password,
        client_id: clientId,
      },
      method: 'post'
    }

    console.log("request", subscribeRequest)
    try {
      let request = await rp(subscribeRequest);

      console.log("REQUEST", request);
    } catch (error) {
      console.log("Error in subscription simple certified --------------------------------");
      console.log(error);

      let logs = {
        env: settings.config.env,
        message: error.toString(),
        propertyId,
        companyId,
        error,
      }
      e.th(400, error);
      // await utils.handleErrors("Subscribe GDS Event", logs);
    }
  },
  getRpostSubscription: async function (connection, property_id, company_id) {

    try {

      let property = new Property({ id: property_id })
      await property.find(connection);

      let company = new Company({ id : company_id});
      await company.find(connection);

      if (!property.gds_id || !company.gds_owner_id) return false;

      let subscribeRequest = {
        uri: `${settings.get_communication_app_url()}/owners/${company.gds_owner_id}/facilities/${property.gds_id}/providers/rpost/`,
        headers,
        json: true,
        method: 'GET'
      }

      console.log("request", subscribeRequest)

      let request = await rp(subscribeRequest);

      console.log("REQUEST", request);

      if (request.applicationData[process.env.COMMUNICATION_APP_KEY][0].status  === 'success') {
        return request.applicationData[process.env.COMMUNICATION_APP_KEY][0].data.is_active;
      }
      return false;
    } catch (error) {
      console.log("Error in subscription simple certified --------------------------------");
      console.log(error);
    }
  },

  getSimpleCertifiedSubscription: async function (connection, property_id, company_id) {
    
    try {

     let property = new Property({ id: property_id })
      await property.find(connection);

      let company = new Company({ id : company_id});
      await company.find(connection);

      if (!property.gds_id || !company.gds_owner_id) return false;

      let subscribeRequest = {
        uri: `${settings.get_communication_app_url()}/owners/${company.gds_owner_id}/facilities/${property.gds_id}/providers/simple-certified-mail/`,
        headers,
        json: true,
        method: 'GET'
      }

      console.log("request", subscribeRequest)

      let request = await rp(subscribeRequest);

      console.log("REQUEST", request);

      if (request.applicationData[process.env.COMMUNICATION_APP_KEY][0].status  === 'success') {
        return request.applicationData[process.env.COMMUNICATION_APP_KEY][0].data.is_active;
      }
      return false;
    } catch (error) {
      console.log("Error in subscription simple certified --------------------------------");
      console.log(error);
    }
  }
}