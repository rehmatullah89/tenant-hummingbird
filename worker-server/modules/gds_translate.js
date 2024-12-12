var rp = require('request-promise');
var moment = require('moment');
var settings = require('../config/settings');

let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

var GdsTranslate = {

  getWebsiteInfo: async function (gds_owner_id) {
    var website_info = {
      uri: `${settings.get_website_app_url()}/owners/${gds_owner_id}/website/`,
      headers,
      json: true,
      method: 'get',
    }
    console.log("getWebsiteInfo" + website_info);
    var res = await rp(website_info);
    console.log("getWebsiteInfo" + res)

    if(res){
      return res.applicationData[process.env.WEBSITE_APP_KEY].length && res.applicationData[process.env.WEBSITE_APP_KEY][0];
    }
  },

  getGDSMappingIds: async function (body) {
    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/translate`,
      headers,
      json: true,
      method: 'post',
      body: body,
    };
    console.info("Mo:gds_translate/GdsTranslate: Request options: ", requestOptions);
    var response = await rp(requestOptions);
    console.info("Mo:gds_translate/GdsTranslate: Translation API response: ", response)
    return response.data[0];
  },

  tenantOnBoarding: async function(tenant_id, facilityId){
    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/leasecaptain/tenant?sync=true&pmsFacilityId=${facilityId}&pmsTenantId=${tenant_id}`,
      headers,
      method: 'get',
      json: true,
    };
    console.info("Mo:gds_translate/tenantOnBoarding: Request Options: ", requestOptions);
    var res = await rp(requestOptions);
    console.info("Mo:gds_translate/tenantOnBoarding: Tenant Onboarding response: ", res);
    return res.data.tenant;
  },

  advanceRental: async function(connection, company_id, contact, lease, mapped_ids, gds_tenant, payment_method, accessCode, confidenceInterval, appId){
    var gds_owner = "*"
    var request_body;

    if(company_id){
      let Company = require('./../classes/company');
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }

    let cost = this.getMoveInCost(lease);
    try{
      request_body = {
        "resend_sms": false,
        "resend_phone_number": `+${contact.Phones[0].phone}`,
        "source": "desktop",
        "sourceAppId": appId,
        "move_in_cost": {
          "message": "success",
          "data": {
            "rental": {
              "accessCode": "",
              "spaceType": mapped_ids.spacetypes[0].gdsid,
              "paymentInstrument": payment_method ? {
                "card": {
                  "cvv": "",
                  "number": payment_method ? payment_method.account_number : "",
                  "name": payment_method? payment_method.name_on_card : "",
                  "zip": payment_method ? payment_method.Address.zip : "",
                  "expiration": payment_method ? moment(new Date(payment_method.exp_warning), 'YYYY-MM-DD').endOf('day').utc().add((6 * 7) , 'days').format('MM/YYYY'): ""
              },
                "address": {
                  "postalCode": payment_method ? payment_method.Address.zip : "",
                  "address1": payment_method ? payment_method.Address.address : "",
                  "address2": payment_method ? payment_method.Address.address2 : "",
                  "stateCode": payment_method ? payment_method.Address.state : "",
                  "city": payment_method ? payment_method.Address.city : ""
                }
              } : null,
              "tenantInfo": "",
              "space": mapped_ids.spaces[0].gdsid,
              "paymentAmount": payment_method ? lease.MoveInInvoice.Payments[0].amount : null,
              "moveinDate": lease.start_date,
              "discountEndDate": 0,
              "tenantID": gds_tenant.id,
              "insuranceId": mapped_ids.insurance ? mapped_ids.insurance.gdsid : "",
              "costs": [ ...cost ],
              "reservationId": "",
              "comments": "",
              "billingDate": '',
              "hold": "",
              "leadId": "",
              "documents": null,
              "discountIds": null
            }
          },
          "applicationData": {
            "app5586af56efcc4e19ba245b298c48b6e0": [
              {
                "status": "success",
                "event": {
                  "name": "RentalCost",
                  "disposition": "pre",
                  "metaData": null
                }
              }
            ]
          }
        },
        "rental": {
            "request": {
                "moveinDate": lease.start_date,
                "insuranceId": mapped_ids.insurance ? mapped_ids.insurance.gdsid : "" ,
                "hold": "",
                "paymentInstrument": payment_method ? {
                  "card": {
                    "cvv": "",
                    "number": payment_method ? payment_method.account_number : "",
                    "name": payment_method? payment_method.name_on_card : "",
                    "zip": payment_method ? payment_method.Address.zip : "",
                    "expiration": payment_method ? moment(new Date(payment_method.exp_warning), 'YYYY-MM-DD').endOf('day').utc().add((6 * 7) , 'days').format('MM/YYYY'): ""
                },
                  "address": {
                    "postalCode": payment_method ? payment_method.Address.zip : "",
                    "address1": payment_method ? payment_method.Address.address : "",
                    "address2": payment_method ? payment_method.Address.address2 : "",
                    "stateCode": payment_method ? payment_method.Address.state : "",
                    "city": payment_method ? payment_method.Address.city : ""
                  }
                } : null,
                "tenantInfo": {
                    "alternateDeclined": false,
                    "ssn": contact.ssn,
                    "driversLicense": {"state": contact.driver_license_state ? contact.driver_license_state : "", "number": contact.driver_license ? contact.driver_license : "", "confidenceInterval": confidenceInterval},
                    "business": false,
                    "contacts": [
                        {
                            "type": "primary",
                            "phones": contact.Phones.map((a)=>{return {type: "cell", number: `+${a.phone}`, description: a.type}}),
                            "address": {
                              "postalCode": contact.Addresses[0].Address.zip,
                              "address1": contact.Addresses[0].Address.address,
                              "address2": contact.Addresses[0].Address.address2,
                              "stateCode": contact.Addresses[0].Address.state,
                              "city": contact.Addresses[0].Address.city
                            },
                            "email": contact.email,
                            "name": {last: contact.last, first: contact.first}
                        },
                        {
                          "type": "alternate",
                          "phones": contact.Phones.map((a)=>{return {type: "cell", number: `+${a.phone}`, description: a.type}}),
                          "address": {
                            "postalCode": contact.Addresses[0].Address.zip,
                            "address1": contact.Addresses[0].Address.address,
                            "address2": contact.Addresses[0].Address.address2,
                            "stateCode": contact.Addresses[0].Address.state,
                            "city": contact.Addresses[0].Address.city
                          },
                          "email": contact.email,
                          "name": {last: contact.last, first: contact.first}
                      }
                    ],
                    "dob": contact.dob,
                    "military": false,
                    "email": contact.email
                },
                "space": mapped_ids.spaces[0].gdsid,
                "documents": [],
                "spaceType": mapped_ids.spacetypes[0].gdsid,
                "paymentAmount": payment_method ?  lease.MoveInInvoice.Payments[0].amount : "",
                "accessCode": 6589
            },
            "response": {
                "message": "success",
                "data": {
                    "tenant": {
                        "id": gds_tenant.id,
                        "spaces": [
                            {
                                "gateAccess": {
                                  "type": accessCode && accessCode.type.toLowerCase(),
                                  "pin":  accessCode && accessCode.pin
                                },
                                "startDate": lease.start_date,
                                "billingType": "",
                                "documents": [],
                                "lastUpdate": 0,
                                "spaceId": mapped_ids.spaces[0].gdsid,
                                "accessCode": "",
                                "autoPay": {},
                                "cost": [],
                                "billingDate": "",
                                "lockedOut": false,
                                "balance": [],
                                "paidThrough": ""
                            }
                        ]
                    }
                }
            }
        },
        "merchandise": [
          {
            "merchandise_id": "string",
            "request": {
              "tenantId": gds_tenant.id
            },
            "response": {
              "message": "success"
            }
          }
        ],
        "unit_no": lease.Unit.number,
        "links": {    }  
    }
    }catch(err){
      console.log("rentalerr" + err)
    }

    let uri = `${settings.get_communication_app_url()}/owners/${gds_owner}/facilities/${mapped_ids.facility.gdsid}/space-type/${mapped_ids.spacetypes[0].gdsid}/hummingbird/advance-rental/move-in-day/`;
    
    var rental = {
      uri: uri,
      headers,
      method: 'post',
      json: true,
      body: request_body
    }
    console.log("rentalURL =>",uri)
    console.log("rentaluobject => " + JSON.stringify(rental));

    var res = await rp(rental);
    console.log("rentalresponse" + res);
    return res;
  },

  getMoveInCost: function(lease){
    let cost = []
    let type = ''
    let name = ''

    lease.MoveInInvoice.InvoiceLines.forEach(x=> {

      switch(x.Product.default_type) {
        case 'security':
          type = 'deposit'
          break;
        case 'product':
          type = 'other';
          break;
        case 'insurance':
          type = 'insurance';
          break;
        case 'late':
          type = 'fee'
          break;
        case 'rent':
          type = 'rent'
          break;
        default:
          type = 'other';
      }

      name = x.Product.name;
      cost.push({
        "description": name,
        "costType": type,
        "start": x.start_date ?  new Date(x.start_date).getTime() / 1000 : null,
        "end": x.start_date ?  new Date(x.start_date).getTime() / 1000 : null,
        "tax": x.totalTax,
        "amount": x.subtotal,
        "total": x.total,
        "pmsRaw": null
      });

      // Adding discount if any
      if(x.DiscountLines) {
        x.DiscountLines.forEach(d => {
          cost.push({
            "amount": d.amount,
            "description": d.Promotion ? d.Promotion.name: 'Discount',
            "costType": "discount",
            "end": 0,
            "start": 0,
            "tax": 0,
            "total": d.amount,
            "pmsRaw": null
          })
        })
      }

    });

    return cost;
  }
};

module.exports = {
  getWebsiteInfo: async function(gds_owner_id){
    return await GdsTranslate.getWebsiteInfo(gds_owner_id);
  },
  getGDSMappingIds: async function(body){
    return await GdsTranslate.getGDSMappingIds(body);
  },
  advanceRental: async function(connection, company_id, contact, lease, mapped_ids, gds_tenant, payment_method,accessCode, confidenceInterval, appId){
    return await GdsTranslate.advanceRental(connection, company_id, contact, lease, mapped_ids, gds_tenant, payment_method,accessCode, confidenceInterval, appId);
  },
  tenantOnBoarding: async function(tenant_id, facilty_id){
    return await GdsTranslate.tenantOnBoarding(tenant_id, facilty_id)
  }
}
