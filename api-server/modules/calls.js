const moment = require('moment');

const settings = require(__dirname + '/../config/settings.js');
const models  = require(__dirname + '/../models');

const rp = require('request-promise');
let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

const callFn = {
  subscribed_properties: [],
  is_loaded: false,
  async findSubscriptions (connection, company) {
    const url = `${settings.get_communication_app_url()}/charm/owners/${company.gds_owner_id}/facilities/`;
    const response = await rp({
        uri: url,
        headers,
        json: true,
        method: 'GET'
    });
    const data = response.applicationData[process.env.COMMUNICATION_APP_KEY][0].data;
    const properties = await models.Property.findByCompanyId(connection, company.id);
    console.log('>>>COMM-App Facilities:', data);
    console.log('>>>HB Properties:', properties);
    const propertyIds = [];
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const isSubscriptionEnabled = data.facilities.find((p) => p.facility_id === property.gds_id)?.mini_charm_subscription || false;
        propertyIds.push({
            property_id: property.id,
            mini_charm_enabled: isSubscriptionEnabled,
            gds_id: property.gds_id
        });
    }
    this.subscribed_properties = propertyIds;
    this.is_loaded = true;
    return this.subscribed_properties;
  },
  async getCharmEnabledPropertyIds (connection, company, propertyIds) {
    if (!this.is_loaded) {
      await this.findSubscriptions(connection, company);
    }
    return this.subscribed_properties
      .filter((property) => propertyIds.includes(property.property_id) && property.mini_charm_enabled)
      .map((property) => property.property_id);
  },
  async isCharmEnabledForProperty (connection, company, property_id) {
    if (!this.is_loaded) {
      await this.findSubscriptions(connection, company);
    }
    return this.subscribed_properties.find((property) => property.property_id === property_id)?.mini_charm_enabled;
  }
};


module.exports = callFn;
