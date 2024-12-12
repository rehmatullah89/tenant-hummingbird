var rp = require('request-promise');
var moment      = require('moment');
var settings = require('../../config/settings');
var Hash = require('../hashes.js');
var Property = require('../../classes/property');
var Company = require('../../classes/company');
var Hashes = Hash.init();
var { getGDSMappingIds } = require('../gds_translate');
var e  = require('../error_handler');
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
    try {
      var requestOptions = {
        uri: `${settings.get_gds_url()}pmses/translate`,
        headers,
        json: true,
        method: 'post',
        body: [
          {
            "facility": Hashes.encode(property_id, connection.cid),
            "pmstype": "leasecaptain",
          }
        ]
      };
      var response = await rp(requestOptions);
      return response.data[0].facility.gdsid

    } catch(err){
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions, 
        property_id, 
        err,
        err_stack: err.stack
      }
      
      await utils.handleErrors("GDSPropertyMapping", logs); 
      throw err;
    }

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

  subscribeGDSEvent: async function (connection, gds_property_id, company_id, exposed_endpoint, urn) {
    console.log("Subscribing Event ");
    
    var gds_owner = "*"
    var type = "async";

    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }
    

    var invalidUrs = ['email-spam', 'email-delivery', 'email-click', 'email-bounce', 'email-open', 'urn:gds:schema:events:com.communication-app:certified-mail-status-update', 'urn:gds:schema:events:com.communication-app:rpost-status-update']
    var emailEvent = invalidUrs.find(f => urn.includes(f));
    if(urn === "urn:gds:schema:events:com.tenantinc:phone-call" )
    {
      type = "sync";
    }
    var event_subscription_options = {
      uri: `${settings.get_messagebus_app_url()}/events/subscriptions`,
      headers,
      method: 'post',
      json: true,
      body:
      {
        "type": type,
        "application_id": process.env.GDS_APPLICATION_ID,
        "endpoint": exposed_endpoint,
        "match_owner_id": gds_owner,
        "match_application_id": process.env.COMMUNICATION_APP_KEY,
        ...(!!emailEvent && { "match_facility_id": gds_property_id }),
        "match_event_urn": urn,
      }
    }
    try {
      var subs_id = await rp(event_subscription_options);
      console.log(`Subscription Id is : ${JSON.stringify(subs_id)}`);
      return subs_id
    } catch (err) {
      console.log("Error in subscription --------------------------------");
      console.log(err);

      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions: event_subscription_options, 
        gds_property_id, 
        company_id, 
        exposed_endpoint, 
        urn, 
        err,
        err_stack: err.stack
      }
      throw err;
      // await utils.handleErrors("Subscribe GDS Event", logs);
    }
  },

  getGDSSubscriptions: async function (connection, property_id, company_id) {

    var gds_owner = "*";
    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }

    var event_subscription_options = {
      uri: `${settings.get_messagebus_app_url()}/events/subscriptions`,
      headers,
      method: 'get',
      json: true
    }



    try {

      var subs = await rp(event_subscription_options);
      console.log("subs:", process.env.MESSAGE_BUS_APP_ID,  subs.applicationData["app890184b2e17e432ea6eaa33dd47e7ba9"][0].data.length)
      return subs.applicationData["app890184b2e17e432ea6eaa33dd47e7ba9"][0].data;
    } catch (err) {
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions: event_subscription_options,
        company_id, 
        property_id, 
        err,
        err_stack: err.stack
      }
      
      await utils.handleErrors("Get GDS Subscriptions", logs); 
      console.log("Error in subscription --------------------------------")
      //console.error(err.stack);
      return []
    }


  },
  updateGDSEvent: async function (connection, subscription, cid, property_id ) {

    var gds_facility_id = await MessageBus.getGDSPropertyMappingId(connection, property_id);

    subscription.endpoint = '/v1/companies/' + cid + subscription.endpoint.substring(3, subscription.endpoint.length);
    subscription.endpoint = subscription.endpoint.split('/companies/' + cid)
      .filter((item, pos, self) => item.length)
      .join('/companies/' + cid)

    subscription.match_facility_id = gds_facility_id;
    if(subscription.match_event_urn === "urn:gds:schema:events:com.tenantinc:phone-call"){
      subscription.type = 'sync';
    }
    else{
      subscription.type = 'async';
    }
    

    var requestOptions = {
      uri:`${settings.get_messagebus_app_url()}/events/subscriptions/` + subscription.id,
      headers,
      json: true,
      method: 'put',
      body: subscription
    };


    try {
      var subs = await rp(requestOptions);
      return subs.applicationData[process.env.MESSAGE_BUS_APP_ID][0].data;
    } catch (err) {
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions, 
        subscription, 
        cid, 
        property_id, 
        err,
        err_stack: err.stack
      }
      
      await utils.handleErrors("Update GDS Event", logs); 
      console.log("Error in updateGDSEvent subscription --------------------------------", err)
    }


  },
  updateGdsUnitInfo: async function (connection,property_id,unit_id,newPrice) {
    var gds_owner = "*";
    var Ids= [
			{
        "facility": Hashes.encode(property_id, connection.cid),
        "spaces": [Hashes.encode(unit_id, connection.cid)],
        "pmstype": "leasecaptain",
		  }
		];
    try {

      var property = new Property({ id: property_id});
      await property.find(connection);

      var company = new Company({id: property.company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;

      var mapped_ids = await getGDSMappingIds(Ids);
      let eventType = 'urn:gds:schema:events:com.hummingbird:';
      eventType += newPrice ? 'space-price-update':'space-occupancy-update';

      var requestOptions = {
        uri:`${settings.get_messagebus_app_url()}/events`,
        headers,
        json: true,
        method: 'post',
        body: {
          "specversion": "1.0",
          "type": eventType,
          "async": true,
          "source":  process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
          "owner_id": gds_owner, // GDS owner id for the space
          "facility_id": mapped_ids.facility.gdsid, // GDS facility id for the space
          "datacontenttype": "application/json",
          "application_id": process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
          "data": {
            "space_id": mapped_ids.spaces[0].gdsid,
            ...(newPrice && {"base_price": newPrice})
          }
        }
      };
      console.log('GDS:space-info-update request =>', JSON.stringify(requestOptions));
      var response = await rp(requestOptions);
      console.log('GDS:space-info-update response =>', JSON.stringify(response));
      return response;

    } catch (err) {

      console.log(err);
      
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions, 
        mapped_ids, 
        property_id,
        unit_id,
        newPrice, 
        err,
        err_stack: err.stack
      }

      await utils.handleErrors("Update GDS Unit Info", logs); 

    }
  },
  /**
   * @param {*} connection 
   * @param {Array} properties Array of objects with `property_id` and its units under `unit_ids`- (units are optional)
   * @returns {Array} Objects with translated property id and unit id
   */
   generateBodyForTranslateAPI(connection, properties) {
    let body = []
    properties?.forEach((property) => {
      body.push({
        "facility": Hashes.encode(property.property_id, connection.cid),
        "spaces": property.unit_ids ?? [],
        "pmstype": "leasecaptain",
      })
    })
    return body
  },
  /**
   * 
   * @param {*} connection 
   * @param {String} property_id Property ID
   * @param {Array} units Array of units with unit_id and data to be updated. This parameter must always contain unit ID
   * @param {String} event_schema Event schema in URN format
   * @param {Object} unit_data Common unit data which will be applied to all units in units parameter.Data passed to this variable will override data passed in units parameter. 
   */
  bulkUpdateGdsUnitInfo: async function(connection, property_id, units, event_schema, unit_data = null) {
    if (!event_schema || !units.length || !property_id) {
      e.th(400, `Invalid parameters`)
    }

    let unit_ids = []
    let mapped_units = {}

    // Generate a Map of units with key as hashed unit ID and an Array of hashed unit ID's
    units.forEach((unit) => {
      let hashed_unit_id = Hashes.encode(unit.id, connection.cid)
      mapped_units[hashed_unit_id] = unit
      unit_ids.push(hashed_unit_id)
    })

    let translateAPIBody = this.generateBodyForTranslateAPI(connection, [{
      property_id: property_id,
      unit_ids: unit_ids
    }])
    let translated_ids = await getGDSMappingIds(translateAPIBody, {
      isTranslatingMultipleIds: true
    }) ?? [];
    let property = new Property({
      id: property_id
    });
    await property.find(connection);
    let company = new Company({
      id: property.company_id
    })
    await company.find(connection);
    let gds_owner = company?.gds_owner_id;
    if (!gds_owner) return 

    for (let property of translated_ids) {
      if (property?.spaces?.length) {
        for (let unit of property.spaces) {
          let space_data = unit_data ?? mapped_units[unit.pmsid]
          if (space_data) {
            let request_options = {
              uri: `${settings.get_messagebus_app_url()}/events`,
              headers,
              json: true,
              method: 'post',
              body: {
                "specversion": "1.0",
                "type": event_schema,
                "async": true,
                "source": process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
                "owner_id": gds_owner,
                "facility_id": property.facility.gdsid,
                "datacontenttype": "application/json",
                "application_id": process.env.GDS_APPLICATION_ID || 'appbc35600a675841eea5893df84231789e',
                "data": {
                  "space_id": unit.gdsid,
                  ...space_data
                }
              }
            };
            console.log('MessageBus Event: Space info bulk update', request_options)
            rp(request_options);
          }
        }
      }
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
  },
  updateGdsUnitPrice: async function(connection, property_id, unit_id, newPrice) {
    return await MessageBus.updateGdsUnitInfo(connection, property_id, unit_id, newPrice);
  },
  bulkUpdateGdsUnitInfo: async function(connection, property_id, units, event_schema, unit_data) {
    return await MessageBus.bulkUpdateGdsUnitInfo(connection, property_id, units, event_schema, unit_data);
  },
  updateGdsUnitStatus: async function(connection, property_id, unit_id) {
    return await MessageBus.updateGdsUnitInfo(connection, property_id, unit_id, null);
  },
  getGDSSubscriptions: MessageBus.getGDSSubscriptions,
  updateGDSEvent: MessageBus.updateGDSEvent,
  
}

var utils = require('./../utils.js');
