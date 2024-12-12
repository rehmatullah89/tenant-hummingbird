var settings    = require(__dirname + '/../../config/settings.js');
var moment = require('moment');

var request = require('request-promise');


var requestHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
};


function createCustomerPaymentProfile(auth, data, company_id) {

    return Promise.resolve().then(function(){

        var url = '';
        console.log("SETTINGS!!!", settings);
        if(settings.is_prod && company_id > 1){
            url = settings.forte.prod.base_url;
        } else {
            url = settings.forte.dev.base_url;
        }


        var authHeader = new Buffer(auth.forteLogin+":"+auth.forteKey).toString('base64');

        requestHeaders["Authorization"] = "Basic " + authHeader;
        requestHeaders["X-Forte-Auth-Organization-Id"] = "org_"+ auth.forteOrganizationId;

        //  Customer create request params
        var endpoint = "/organizations/org_"+auth.forteOrganizationId+"/locations/loc_"+auth.forteLocationId+"/paymethods";


        var postVars = {
//            organization_id: "org_" + auth.forteOrganizationId,
            location_id: "loc_" + auth.forteLocationId,
            customer_token: auth.customerToken,
            label: "ACH Payment Method",
            echeck: {
                account_holder: data.account_holder, 
                account_number: data.account_number,
                routing_number: data.routing_number,
                account_type: data.account_type
      //          sec_code: "RCK"
            }
        };

        console.log('postVars', postVars);
        console.log('url + endpoint', url + endpoint);
        return request({
            headers: requestHeaders,
            uri: url + endpoint,
            body: postVars,
            method: 'POST',
            json: true
        });

    }).then(function(body){
        console.log(body);
        return body.paymethod_token;

    }).catch(function(err){

        throw err.toString();
    });



}


module.exports.createCustomerPaymentProfile = createCustomerPaymentProfile;