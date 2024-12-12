var rp = require('request-promise');
var moment      = require('moment');
var settings = require('../config/settings');
var Hash = require(__dirname + '/../modules/hashes.js');
var Property = require('./../classes/property');
var Company = require('./../classes/company');
var Hashes = Hash.init();
//TODO: Replace the urls and configurable options with respective variables in this file

let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

var MessageBus = {
  getGDSPropertyMappingId: async function (connection, property_id) {

    try {
      var property = new Property({ id: property_id});
      await property.find(connection);
      if(property && property.gds_id){
        return property.gds_id;
      }
    } catch (err) {
      console.log(err);
      console.log("Property doesn't exist.");
    }

    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/translate`,
      headers,
      json: true,
      method: 'post',
      body: [
        {
          "facility": Hashes.encode(property_id),
          "pmstype": "leasecaptain",
        }
      ]
    };
    var response = await rp(requestOptions);
    return response?.data?.length ? response.data[0].facility.gdsid : null;

  },
  subscribePhoneCall: async function (property_id, gds_owner_id) {
    var gds_facility_id = await getGDSPropertyMappingId(property_id)
    var phonecall_subscription_options = {
      uri: `${settings.get_messagebus_app_url()}/events/subscriptions`,
      headers,
      method: 'post',
      body:
      {
        "id": "",
        "type": "async",
        "application_id": "appbc35600a675841eea5893df84231789e",
        "endpoint": "/phone-call-event",
        "match_owner_id": gds_owner_id,
        "match_application_id": "app46ee9e2226c4443293a471b42dab6c20",
        "match_facility_id": gds_facility_id,
        "match_event_urn": "urn:gds:schema:events:com.tenantinc:phone-call",
      }
    }
    await rp(phonecall_subscription_options);
  },
  subscribeGDSEvent: async function (connection, property_id, company_id, exposed_endpoint, urn) {
    console.log("Subscribing Event ");
    
    var gds_facility = await this.getGDSPropertyMappingId(connection, property_id);
    var gds_owner = "*"
    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }

    console.log(gds_facility);
    console.log(gds_owner);

    

    var invalidUrs = ['email-spam', 'email-delivery', 'email-click', 'email-bounce', 'email-open']
    var emailEvent = invalidUrs.find(f => urn.includes(f));

    var event_subscription_options = {
      uri: `${settings.get_messagebus_app_url()}/events/subscriptions`,
      headers,
      method: 'post',
      json: true,
      body:
      {
        "type": "async",
        "application_id": "appbc35600a675841eea5893df84231789e",
        "endpoint": exposed_endpoint,
        "match_owner_id": gds_owner,
        "match_application_id": process.env.COMMUNICATION_APP_KEY,
        ...(!emailEvent && { "match_facility_id": gds_facility }),
        "match_event_urn": urn,
      }
    }
    try {
      var subs_id = await rp(event_subscription_options);
      console.log(`Subscription Id is : ${JSON.stringify(subs_id)}`);
    } catch (err) {
      console.log("Error in subscription --------------------------------")
      console.error(err.stack);
    }
  }
};

module.exports = {
  getGDSPropertyMappingId: async function(connection, property_id){
    return await MessageBus.getGDSPropertyMappingId(connection, property_id);
  },
  subscribePhoneCall: async function(property_id, gds_owner_id){
    return await MessageBus.subscribePhoneCall(property_id, gds_owner_id);
  },
  subscribeGDSEvent: async function(connection, property_id, gds_owner_id, exposed_endpoint, urn){
    return await MessageBus.subscribeGDSEvent(connection, property_id, gds_owner_id, exposed_endpoint, urn);
  }
}
