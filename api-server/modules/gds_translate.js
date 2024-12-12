var rp = require('request-promise');
var moment      = require('moment');
var settings = require('../config/settings');
var Hash = require(__dirname + '/../modules/hashes.js');
var utils = require(__dirname + '/../modules/utils.js');
var Hashes = Hash.init();
//TODO: Replace the urls and configurable options with respective variables in this file
var { sendEmail } 	= require(__dirname + '/../modules/mail');


let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

var GdsTranslate = {

  getGDSMappingIds: async function (body, payload = {}) {
    const { isTranslatingMultipleIds } = payload;

    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/translate`,
      headers,
      json: true,
      method: 'post',
      body: body,
    };
    console.info("Mo:gds_translate/GdsTranslate: Request options: ", requestOptions);
    try {
      var response = await rp(requestOptions);
      console.info("Mo:gds_translate/GdsTranslate: Translation API response: ", response);
      if(isTranslatingMultipleIds) return response.data;
      return response.data[0];

    } catch(err){
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions, 
        body, 
        err,
        err_stack: err.stack
      }
      console.log("err", err, logs)
      await utils.handleErrors("GDS Translate Ids", logs); 
    }
  },

  registerLead: async function (contact_id, property_id){
    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/leasecaptain/customers?pmsFacilityId=${property_id}&pmsCustomerId=${contact_id}`,
      headers,
      json: true,
      method: 'GET'
    };
    console.info("Mo:gds_translate/registerLead: Request options: ", requestOptions);
    try {
      var response = await rp(requestOptions);
      console.info("Mo:gds_translate/registerLead: Translation API response: ", JSON.stringify(response.data, null, 2));
      return response.data.id;

    } catch(err){
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions,
        err,
        err_stack: err.stack
      }
      console.log("err", err, logs)
      await utils.handleErrors("GDS registerLead", logs); 
    }
  }, 

  // registerTenant: async (connection, payload) => {
  //     let gds_tenant = null;
  //       let gds_reservation = null;
  //       let ids = {
  //           pmstype: "leasecaptain"
  //       };
  //       let property_id = '';
  //       try {
  //           if(payload.property){
  //               property_id = payload.property.id
  //           } else if (payload.unit && payload.unit.property_id){
  //               property_id = payload.unit.property_id
  //           }
  //           ids.facility = Hashes.encode(property_id, payload.cid)


  //           let units = [];
  //           if(payload.unit && payload.unit.id){
  //               units.push(Hashes.encode(payload.unit.id, payload.cid));
  //               ids.spaces = units;
  //               await payload.unit.setSpaceMixId(connection);
  //               ids.spacetypes = [payload.unit.space_mix_id];
  //           }

  //           if(payload.reservation && payload.reservation.id){
  //               gds_reservation = await getGdsReservationInfo(Hashes.encode(payload.reservation.id, payload.cid), Hashes.encode(property_id, payload.cid));
  //               ids.reservations = [Hashes.encode(payload.reservation.id, payload.cid)];
  //           }

  //           let tenant_id = payload.lease.Tenants[0].id; 
  //           // if(payload.lease && payload.lease.id && payload.lease.status === 1){ // Question: Should we register a tenant when its a lead, reservation, or pending lease?
  //           if(payload.lease && payload.lease.id){
  //               gds_tenant = await tenantOnBoarding(Hashes.encode(tenant_id, payload.cid), Hashes.encode(property_id, payload.cid));
  //           }


  //           var mapped_ids = await getGDSMappingIds([ids]);
        
  //           return {gds_tenant, gds_reservation, mapped_ids}

  //       } catch(err){
  //           console.log("err", err); 
  //           let logs = {
  //             env: settings.config.env, 
  //               message: err.toString(),
  //               gds_reservation,
  //               mapped_ids, 
  //               payload,
  //               err: err,
  //               err_stack: err.stack
  //           }
           
  //           await utils.handleErrors("Register GDS Contact", logs);
            
            
  //           throw err;
  //       }

  // }, 


  lead: async (contact, lead, company_id, property_id, property, space_type) => {

    let move_in_date = lead.move_in_date; 
    move_in_date = move_in_date ? moment(move_in_date).utcOffset(property.utc_offset,true).toISOString(true) : null;

    let phone = null;

    if(contact.Phones && contact.Phones.length){
      phone = utils.parsePhoneNumber(contact.Phones);
    }

    var requestOptions = {    
      uri: `${settings.get_communication_app_url()}/owners/${company_id}/facilities/${property_id}/hummingbird/leads/`,
      headers,
      json: true,
      method: 'post',
      body: {
        "source": "desktop",
        ...(space_type && {"spaceType": space_type}),
        "name": {
            "first": contact.first,
            "last": contact.last
        },
        "email": contact.email,
        "phone": phone,
        "move_in_date": move_in_date,
        "message": lead.message  // TODO what is this for?
      },
    };
    try {
      console.log("requestOptions", requestOptions)
      var response = await rp(requestOptions);
    } catch(err){
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        requestOptions, 
        contact, 
        lead,
        company_id,
        property_id,
        err,
        err_stack: err.stack
      }
  
      await utils.handleErrors("GDS Send Leads Ids", logs); 
    }
    console.log(requestOptions)

  }, 

  // softReservation: async function (mapped_ids, gds_owner_id, contact) {
  //   var request_body;
  //   try{
   
  //     request_body = {
  //       "source": "desktop",
  //       "type": 'soft',
  //       "request": {
  //           "facilityId": mapped_ids.facility.gdsid,
  //           "email": contact.email,
  //           "phones": contact.Phones.map((a)=>{return {type: a.type, number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
  //           "name": {last: contact.last, first: contact.first},
  //           "tenantInfo": {
  //               "dob": contact.dob,
  //               "ssn": contact.ssn,
  //               "contacts": [
  //                   {
  //                       "phones": contact.Phones.map((a)=>{return {type: "cell", number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
  //                       "address": {},
  //                       "email": contact.email,
  //                       "name": {last: contact.last, first: contact.first},
  //                       "type": "primary",
  //                   },
  //                   {
  //                     "phones": contact.Phones.map((a)=>{return {type: "cell", number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
  //                     "address": {},
  //                     "email": contact.email,
  //                     "name": {last: contact.last, first: contact.first},
  //                     "type": "alternate",
  //                 }
  //               ],
  //           },
            
  //           "paymentAmount": 0,
  //           "type": 'soft',
  //           "discountIds": []
  //       },
  //       "response": {
  //           "message": 'success',
  //           "data": {
  //               "reservation": {
  //               }
  //           }
  //       }
  //   }
  //     console.info("Mo:gds_translate/soft_reservation: Request body: ", request_body)
    

  //     var soft_reservation = {
  //       uri: `${settings.get_communication_app_url()}/owners/${gds_owner_id}/facilities/${mapped_ids.facility.gdsid}/reservation/`,
  //       headers,
  //       json: true,
  //       method: 'post',
  //       body: request_body
  //     };
  //     console.info("Mo:gds_translate/hard_reservation: Hard reservation object: ", JSON.stringify(soft_reservation));
  //     var res = await rp(soft_reservation);

  //   } catch(err){
  //     console.error("Mo:gds_translate/soft_reservation: Request body error: " + err);


  //     let logs = {
  //       message: err.toString(),
  //       mapped_ids, 
  //       gds_owner_id, 
  //       contact, 
  //       soft_reservation, 
  //       err: err,
  //       err_stack: err.stack
  //     }

  //     await utils.handleErrors("Send Soft Reservation Email", logs); 



  //   }

  //   console.info("Mo:gds_translate/hard_reservation: Hard reservation response: ", JSON.stringify(res));
  // },

  reservation: async function (mapped_ids, gds_owner_id, contact, reservation, unit, gds_tenant, gds_reservation, start_date,   connection) {
    var request_body;


    try {
      request_body = {
        "source": "desktop",
        "type": 'hard',
        "request": {
            "spaceType": mapped_ids.spacetypes[0].gdsid,
            "facilityId": mapped_ids.facility.gdsid,
            "email": contact.email,
            "phones": contact.Phones.map((a)=>{return {type: a.type, number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
            "name": {last: contact.last, first: contact.first},
            "tenantInfo": {
                "dob": contact.dob,
                "ssn": contact.ssn,
                "contacts": [
                    {
                        "phones": contact.Phones.map((a)=>{return {type: "cell", number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
                        "address": {},
                        "email": contact.email,
                        "name": {last: contact.last, first: contact.first},
                        "type": "primary",
                    },
                    {
                      "phones": contact.Phones.map((a)=>{return {type: "cell", number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),
                      "address": {},
                      "email": contact.email,
                      "name": {last: contact.last, first: contact.first},
                      "type": "alternate",
                  }
                ],
            },
            "space": mapped_ids.spaces[0].gdsid,
            "paymentAmount": 0,
            "moveinDate": start_date,
            // "hold": "1558423905.17316bea",
            "type": 'hard',
            "discountIds": [],
            "offerToken": reservation.Lease.offerToken || null
        },
        "response": {
            "message": 'success',
            "data": {
                "reservation": {
                    "pmsRaw": null,
                    // "lastUpdate": 1558423146,
                    "facilityId": mapped_ids.facility.gdsid,
                    "pmsCode": Hashes.encode(reservation.id, connection.cid),
                    // "notes": null,
                    // "dateExpires": 1558483200,
                    // "moveinDate": 0,
                    "pmsId": mapped_ids.facility.pmsid,
                    "dateCreated": 1558423146,
                    "spaceId": mapped_ids.spaces[0].gdsid,
                    "leaseId": "",
                    "leadId": "",
                    "type": "hard",
                    "id": mapped_ids.reservations[0].gdsid,
                    "discountIds": null,
                    "tenantId": gds_tenant.id,
                }
            }
        },
        "space": {
          "id": mapped_ids.spaces[0].gdsid,
          "rent": { 
              "amount": reservation.Lease.rent || 0,
              "description": "Monthly Rent",
              "costType": "rent",
              "end": 0,
              "start": 0,
              "tax": 0,
              "total": reservation.Lease.rent || 0,
              "pmsRaw": {}
          },
          "spaceType": mapped_ids.spacetypes[0].gdsid,
          "spaceNumber": unit.number
        },
        "unit_no": unit.number
      }
      console.info("Mo:gds_translate/hard_reservation: Request body: ", request_body)
      
      var hard_reservation = {
        uri: `${settings.get_communication_app_url()}/owners/${gds_owner_id}/facilities/${mapped_ids.facility.gdsid}/space-type/${mapped_ids.spacetypes[0].gdsid}/reservation/`,
        headers,
        json: true,
        method: 'post',
        body: request_body
      };
      console.info("Mo:gds_translate/hard_reservation: Hard reservation object: ", JSON.stringify(hard_reservation));
      var res = await rp(hard_reservation);
    
  } catch(err){

    let logs = {
      env: settings.config.env, 
      message: err.toString(),
      hard_reservation, 
      mapped_ids, 
      gds_owner_id, 
      contact, 
      reservation, 
      unit, 
      gds_tenant, 
      gds_reservation, 
      start_date,
      err: err,
      err_stack: err.stack
    }

    await utils.handleErrors("Send Reservation Email", logs); 
    console.error("Mo:gds_translate/hard_reservation: Request body error: " + err);
    
}
    
    // console.info("Mo:gds_translate/hard_reservation: Hard reservation response: ", JSON.stringify(res));
  },

  autoPay: async function (connection, company_id, mapped_ids, unit_number, gds_tenant) {
    // var gds_facility = await this.getGDSPropertyMappingId(connection, property_id);
    var gds_owner = "*"
    try {
      if(company_id){
        var company = new Company({id: company_id})
        await company.find(connection);
        gds_owner = company.gds_owner_id;
      }
      
      var request_body = {
        "source": "mobile",
        "request": {
            "documents": [
                {
                    "type": "auto",
                    "name": "Auto Pay Enrollment",
                    "location": ""
                }
            ],
            "spaceId": mapped_ids.spaces[0].gdsid,
        },
        "response": {
            "message": "success"
        },
        "unit_no": unit_number,
        "links": {}
    }

      var auto_pay = {
        uri: `${settings.get_communication_app_url()}/owners/${gds_owner}/facilities/${mapped_ids.facility.gdsid}/tenant/${gds_tenant.id}/autopay/`,
        headers,
        method: 'post',
        json: true,
        body: request_body
      }
      console.log("autopay", auto_pay);
      
      var res = await rp(auto_pay);
    } catch(err){
      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        request_body, 
        auto_pay, 
        company_id, 
        mapped_ids, 
        unit_number, 
        gds_tenant,
        err: err,
        err_stack: err.stack
      }

      await utils.handleErrors("Send Auto Pay Email", logs); 
    }

    console.log("autopayresponse" + res);
    return res;

    
  
  },


  payBillAndEmail: async function(connection, invoice_leases, property_id, company_id, payment, contact,endDates){
    let start_time = Date.now();
    console.log("payBill::start_time",  Date.now() - start_time);

    var gds_owner = "*"
    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }
  
    console.log("payBill::invoice_leases : ", invoice_leases);
    let leases = invoice_leases.map(il => il.Lease);
    console.log("payBill::leases : ", leases);

    let uniqLeases = [...new Map(leases.map(item => [item['id'], item])).values()]
    console.log("payBill::uniqLeases : ", uniqLeases);

    for (let i = 0; i < uniqLeases.length; i++) {

      console.log("payBill::new invoice " + i,  Date.now() - start_time);

      var ids = [{
        "facility": Hashes.encode(property_id, connection.cid),
        "spaces": [Hashes.encode(uniqLeases[i].Unit.id, connection.cid)],
				"pmstype": "leasecaptain",
      }]

      var gds_tenant = await GdsTranslate.tenantOnBoarding(Hashes.encode(uniqLeases[i].Tenants[0].id, connection.cid), Hashes.encode(property_id, connection.cid));
      var mapped_ids = await GdsTranslate.getGDSMappingIds(ids);

      let email_data = {
        gds_tenant,
        mapped_ids,
        request_body: {
          "source": "desktop",
          "balance": [],
          "prepay": {},
          "payment": {
              "request": {
                  "paymentAmount":  0,
                  "paymentInstrument": {
                      "card": {
                          "cvv": "",
                          "number": payment.PaymentMethod.account_number ? payment.PaymentMethod.account_number : null,
                          "name": payment.PaymentMethod.name_on_card ? payment.PaymentMethod.name_on_card : null,
                          "zip": payment.PaymentMethod.Address.zip ? payment.PaymentMethod.Address.zip : null,
                          "expiration": payment.PaymentMethod.exp_warning ? moment(new Date(payment.PaymentMethod.exp_warning), 'YYYY-MM-DD').endOf('day').utc().add((6 * 7) , 'days').format('MM/YYYY'): null
                      },
                      "address": {
                          "postalCode": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.zip : null,
                          "address1": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.address : null,
                          "address2": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.address2 : null,
                          "stateCode": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.state : null,
                          "city": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.city : null
                      }
                  },
                  "periods": 0,
                  "spaceId": mapped_ids.spaces[0].gdsid,
                  "paymentCycle": uniqLeases[i]?.payment_cycle || ''
              },
              "response": {
                  "message": "success"
              }
          },
          "unit_no": uniqLeases[i].Unit.number,
          // "confirmation_no": 454,
          "links": {}
        }
      };

      let invoiveLinePayment = await GdsTranslate.getInvoiceLineAllocation(connection, payment, uniqLeases[i]);
      
      console.log("invoiveLinePayment: ", invoiveLinePayment);

      email_data.request_body.payment.request.paymentAmount = invoiveLinePayment.amount;
      email_data.request_body.balance = invoiveLinePayment.balance;

      try {
        if(invoiveLinePayment && invoiveLinePayment.amount && invoiveLinePayment.amount > 0){
          var pay_bill = {
            uri: `${settings.get_communication_app_url()}/owners/${gds_owner}/facilities/${email_data.mapped_ids.facility.gdsid}/tenant/${email_data.gds_tenant.id}/payment/`,
            headers,
            method: 'post',
            json: true,
            body: email_data.request_body
          }

          console.log("payBill::generate request " + uniqLeases[i].id,  Date.now() - start_time);
          console.log("paybill request =>", JSON.stringify(pay_bill));
          var res = await rp(pay_bill);
          console.log("payBill::paybill response " + uniqLeases[i].id,  Date.now() - start_time);
          console.log("paybillresponse" + res);
        }
      } catch(err){

        let logs = {
          env: settings.config.env, 
          message: err.toString(),
          pay_bill, 
          invoice_leases, 
          property_id, 
          company_id, 
          payment, 
          contact,
          endDates,
          lease: uniqLeases[i], 
          err,
          err_stack: err.stack
        }
  
        await utils.handleErrors("Send Pay Bill Email", logs); 
        console.log("PAY BILL ERR " + err)
      }

      console.log("payBill::done " + uniqLeases[i].id,  Date.now() - start_time);
    }

  },

  getInvoiceLineAllocation: async function(connection, payment, lease){
    let balance = []
    let amount = 0
    let invoiceLines = await Invoice.getInvoiceLineAllocationByPaymentAndLease(connection, payment.id, lease.id)
    invoiceLines.forEach(x=> {

      let total = x.amount + x.tax
      amount = amount + total
      balance.push({
        "description": x.description,
        "costType": x.costType,
        "start": x.start ?  new Date(x.start).getTime() / 1000 : null,
        "end": x.end ?  new Date(x.end).getTime() / 1000 : null,
        "tax": x.tax,
        "amount": x.amount,
        "total": total,
        "pmsRaw": x.pmsRaw
      });

    });

    return { 
      amount: amount,
      balance: balance
    };
  },

  payBill: async function(connection, invoice_leases, property_id, company_id, payment, contact,endDates){
    let start_time = Date.now();
    console.log("payBill::start_time",  Date.now() - start_time);
    
    var gds_owner = "*"
    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }
  
    var email_data = {};
    for (let i = 0; i < invoice_leases.length; i++){
      console.log("payBill::new invoice " + i,  Date.now() - start_time);
      let invoiceLease = invoice_leases[i].Lease;
      let lease_id = invoice_leases[i].lease_id.toString();
      let InvoiceLines = invoice_leases[i].InvoiceLines;

      var ids = [{
        "facility": Hashes.encode(property_id, connection.cid),
        "spaces": [Hashes.encode(invoiceLease.Unit.id, connection.cid)],
				"pmstype": "leasecaptain",
      }]
      
      let appliedPayment = payment.AppliedPayments.filter(ap => ap.Invoice.id === invoice_leases[i].id);
      var end_date = new Date(endDates[i])

      // Not found
      var gds_tenant = await GdsTranslate.tenantOnBoarding(Hashes.encode(invoiceLease.Tenants[0].id, connection.cid), Hashes.encode(property_id, connection.cid));
      var mapped_ids = await GdsTranslate.getGDSMappingIds(ids);
      console.log("payBill::tenant onbaording and mapping " + i,  Date.now() - start_time);
        if(appliedPayment && appliedPayment.length > 0) {
          appliedPayment = appliedPayment[0];
            if (!email_data[lease_id]) {
              email_data[lease_id] = {
                gds_tenant,
                mapped_ids,
                request_body: {
                  "source": "desktop",
                  "balance": [],
                  "prepay": {},
                  "payment": {
                      "request": {
                          "paymentAmount":  0,
                          "paymentInstrument": {
                              "card": {
                                  "cvv": "",
                                  "number": payment.PaymentMethod.account_number ? payment.PaymentMethod.account_number : null,
                                  "name": payment.PaymentMethod.name_on_card ? payment.PaymentMethod.name_on_card : null,
                                  "zip": payment.PaymentMethod.Address.zip ? payment.PaymentMethod.Address.zip : null,
                                  "expiration": payment.PaymentMethod.exp_warning ? moment(new Date(payment.PaymentMethod.exp_warning), 'YYYY-MM-DD').endOf('day').utc().add((6 * 7) , 'days').format('MM/YYYY'): null
                              },
                              "address": {
                                  "postalCode": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.zip : null,
                                  "address1": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.address : null,
                                  "address2": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.address2 : null,
                                  "stateCode": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.state : null,
                                  "city": JSON.stringify(payment.PaymentMethod.Address) !== JSON.stringify({}) ? payment.PaymentMethod.Address.city : null
                              }
                          },
                          "periods": 0,
                          "spaceId": mapped_ids.spaces[0].gdsid
                      },
                      "response": {
                          "message": "success"
                      }
                  },
                  "unit_no": invoiceLease.Unit.number,
                  // "confirmation_no": 454,
                  "links": {}
                }
              };
            }

            let cost = GdsTranslate.getMoveInCost(InvoiceLines);
            let balanceArr = email_data[lease_id].request_body.balance.concat(cost);
            
            email_data[lease_id].request_body.payment.request.paymentAmount += appliedPayment.amount;
            email_data[lease_id].request_body.balance = balanceArr;
        }
    }

    // Now sending emails from GDS lease wise
      for (const lease_id in email_data) {
      try {
        var pay_bill = {
          uri: `${settings.get_communication_app_url()}/owners/${gds_owner}/facilities/${email_data[lease_id].mapped_ids.facility.gdsid}/tenant/${email_data[lease_id].gds_tenant.id}/payment/`,
          headers,
          method: 'post',
          json: true,
          body: email_data[lease_id].request_body
        }
        console.log("payBill::generate request " + lease_id,  Date.now() - start_time);
        console.log("paybill request =>", JSON.stringify(pay_bill));
        var res = await rp(pay_bill);
        console.log("payBill::paybill response " + lease_id,  Date.now() - start_time);
        console.log("paybillresponse" + res);
      } catch(err){

        let logs = {
          env: settings.config.env, 
          message: err.toString(),
          pay_bill, 
          invoice_leases, 
          property_id, 
          company_id, 
          payment, 
          contact,
          endDates, 
          err,
          err_stack: err.stack
        }
  
        await utils.handleErrors("Send Pay Bill Email", logs); 
        console.log("PAY BILL ERR" + err)
      }

      console.log("payBill::done " + lease_id,  Date.now() - start_time);
      }
  },

  rental: async function(connection, company_id, contact, lease, unit, mapped_ids, gds_tenant, payment_method, accessCode, documents, payment_cycle = '', confidence_interval, app_id){
    var gds_owner = "*"

    if(company_id){
      var company = new Company({id: company_id})
      await company.find(connection);
      gds_owner = company.gds_owner_id;
    }
    console.log("Rental: documents- ", documents);
    let cost = GdsTranslate.getMoveInCost(lease.MoveInInvoice.InvoiceLines);
    let cellPhone = contact?.Phones?.find(item => item.type === 'cell' && item.primary)?.phone ?? ""
    try {
      var spaceTypeId = (mapped_ids?.spacetypes != undefined && mapped_ids?.spacetypes != 'undefined' && mapped_ids?.spacetypes?.length > 0) ? mapped_ids?.spacetypes[0]?.gdsid : ''
      let request_body = {
        "autopay": {
          "dayOfMonth": lease.bill_day,
          "enrolled": Boolean(payment_method && payment_method.AutoPay)
        },
        "cost": [...cost],
        "documents":
          lease.Checklist.length > 0
            ? lease.Checklist.filter(doc => doc.completed).map(doc => ({
                type:
                  doc.Checklist && doc.Checklist.document_tag
                    ? doc.Checklist.document_tag
                    : "",
                name: doc.name ? doc.name : "",
                location: doc.Upload && doc.Upload.src ? doc.Upload.src : ""
              }))
            : documents?.map(doc => ({
                type: doc?.type || doc?.document_type,
                name: doc?.name || doc?.filename,
                location: doc?.location || doc?.src
              })),
        "links": {},
        "merchandise": [],
        "source": "desktop",
        "sourceAppId": app_id,
        "space": {
          "access": {
            "code": accessCode && accessCode.pin,
            "type": accessCode && accessCode.type && accessCode.type.toLowerCase()
          },
          "id": mapped_ids.spaces[0].gdsid,
          "insuranceId": mapped_ids.insurance ? mapped_ids.insurance.gdsid : "",
          "moveindate": lease.start_date,
          "paymentCycle": payment_cycle,
          "rent": {
            "amount": lease.rent,
            "description": "Monthly Rent",
            "costType": "rent",
            "end": 0,
            "start": 0,
            "tax": 0,
            "total": lease.rent
          },
          "spaceType": spaceTypeId,
          "spaceNumber": unit.number
        },
        "tenant": {
          "address": {
            "zipcode":
              contact.Addresses && contact.Addresses.length
                ? contact.Addresses[0].Address.zip
                : null,
            "address1":
              contact.Addresses && contact.Addresses.length
                ? contact.Addresses[0].Address.address
                : null,
            "address2":
              contact.Addresses && contact.Addresses.length
                ? contact.Addresses[0].Address.address2
                : null,
            "state":
              contact.Addresses && contact.Addresses.length
                ? contact.Addresses[0].Address.state
                : null,
            "city":
              contact.Addresses && contact.Addresses.length
                ? contact.Addresses[0].Address.city
                : null
          },
          "driversLicense": {
            "confidenceInterval": confidence_interval
          },
          "email": contact.email,
          "id": gds_tenant.id,
          "name": { last: contact.last, first: contact.first },
          "phone": cellPhone ? `+${cellPhone}` : ""
        }
      };

      let uri = `${settings.get_communication_app_url()}/owners/${gds_owner}/facilities/${mapped_ids.facility.gdsid}/space-type/${spaceTypeId}/hummingbird/rental/`;
      console.log("rentalrequest:  ", request_body);
      var rental = {
        uri: uri,
        headers,
        method: 'post',
        json: true,
        body: request_body
      }
      var res = await rp(rental);
      console.log("rentalresponse" + res);
    } catch(err){

      let logs = {
        env: settings.config.env, 
        message: err.toString(),
        rental, 
        company_id, 
        contact, 
        lease, 
        unit, 
        mapped_ids, 
        gds_tenant, 
        payment_method, 
        accessCode,
        err,
        err_stack: err.stack
      }

      await utils.handleErrors("Send Rental Email", logs); 

      console.log("rentalerr", err)
      console.log("rentalerr staack", err.stack)
    }
    return res;

  },

  getGdsReservationInfo: async function(reservation_id, facilityId){
    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/leasecaptain/reservation?sync=true&pmsFacilityId=${facilityId}&pmsReservationId=${reservation_id}`,
      headers,
      method: 'get',
      json: true,
    };
  
    var res = await rp(requestOptions);
    console.log("getGdsReservationInfo gds_reservation", res.data); 
    return res.data.reservation;
  }, 

  tenantOnBoarding: async function(tenant_id, facilityId){
    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/leasecaptain/tenant?sync=true&pmsFacilityId=${facilityId}&pmsTenantId=${tenant_id}`,
      headers,
      method: 'get',
      json: true,
  };
    
    var res = await rp(requestOptions);
    
    return res.data.tenant;
  },

    /**
   * Function used to get pms id
   * @param {String} tenantId tenant id
   * @param {String} facilityId facility id
   * @returns {String} Returns pamsid
   **/
  getTenantId: async function(tenantId, facilityId){
    let requestOptions = {
      uri: `${settings.get_gds_url()}facilities/${facilityId}/tenants/${tenantId}`,
      headers,
      method: 'get',
      json: true,
  };
    let res = await rp(requestOptions);
    let contacts = res?.data?.tenant?.contacts;
    let pmsId = "";
    contacts.filter(contact => {
      if(contact.type === "primary") {
        pmsId = contact?.pmsId;
      }
  })
    return pmsId;
  },

  getWebsiteInfo: async function (gds_owner_id, property_id) {
    
    let uri = `${settings.get_website_app_url()}/owners/${gds_owner_id}/website/`
    if(property_id) {
      let translate_payload = [{
        pmstype: "leasecaptain",
        facility: property_id,
      }]
      var mapped_ids = await GdsTranslate.getGDSMappingIds(translate_payload);
      let facility_id = mapped_ids.facility.gdsid;
      uri += `facilities/${facility_id}/?liveData=true`;
    }
    
    var website_info = {
      uri,
      headers,
      json: true,
      method: 'get',
    }
    console.log("getWebsiteInfo" + JSON.stringify(website_info));
    var res = await rp(website_info);
    console.log("getWebsiteInfoResult" + JSON.stringify(res))

    if(res){
      return res.applicationData[process.env.WEBSITE_APP_KEY].length && res.applicationData[process.env.WEBSITE_APP_KEY][0];
    }
  },

  getMoveInCost: function(InvoiceLines){
    let cost = []
    let type = ''
    let name = ''

    InvoiceLines.forEach(x=> {

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
        "end": x.end_date ?  new Date(x.end_date).getTime() / 1000 : null,
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

// module.exports = {
//   getGDSMappingIds: async function(body){
//     return await GdsTranslate.getGDSMappingIds(body);
//   },
//   hardReservation: async function(mapped_ids, gds_owner_id, contact, reservation, unit, gds_tenant, gds_reservation, start_date, connection){
//     return await GdsTranslate.hardReservation(mapped_ids, gds_owner_id, contact, reservation, unit, gds_tenant, gds_reservation, start_date, connection);
//   },
//   softReservation: async function(mapped_ids, gds_owner_id, contact, reservation, unit, gds_tenant, start_date, connection){
//     return await GdsTranslate.softReservation(mapped_ids, gds_owner_id, contact, reservation, unit, gds_tenant, start_date, connection);
//   },
//   autoPay: async function(connection, company_id, mapped_ids, unit_number, gds_tenant){
//     return await GdsTranslate.autoPay(connection, company_id, mapped_ids, unit_number, gds_tenant);
//   },
//   payBill: async function(connection, units, property_id, company_id, payment, contact,leasesPaymentsValidTill){
//     return await GdsTranslate.payBill(connection,units, property_id, company_id, payment, contact,leasesPaymentsValidTill)
//   },
//   rental: async function(connection, company_id, contact, lease, mapped_ids, gds_tenant, payment_method,accessCode){
//     return await GdsTranslate.rental(connection, company_id, contact, lease, mapped_ids, gds_tenant, payment_method,accessCode);
//   },
//   tenantOnBoarding: async function(tenant_id, facilty_id){
//     return await GdsTranslate.tenantOnBoarding(tenant_id, facilty_id)
//   },
//   getGdsReservationInfo: async function(reservation_id, facilty_id){
//     return await GdsTranslate.getGdsReservationInfo(reservation_id, facilty_id)
//   },
//   getWebsiteInfo: async function(gds_owner_id){
//     return await GdsTranslate.getWebsiteInfo(gds_owner_id);
//   }
// }

module.exports = GdsTranslate;

var Company = require('./../classes/company');
const Invoice = require('../models/invoices');
var utils    = require(__dirname + '/../modules/utils.js');
