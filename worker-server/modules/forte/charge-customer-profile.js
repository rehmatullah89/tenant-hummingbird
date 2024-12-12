var settings    = require(__dirname + '/../../config/settings.js');
var moment = require('moment');
var request = require('request-promise');
var Promise = require('bluebird');
var requestHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
};
 
function chargeCustomerProfile(auth, payment, leaseToken, paymentMethodToken, company_id) {

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

        var endpoint = "/organizations/org_"+auth.forteOrganizationId+"/locations/loc_" + auth.forteLocationId + "/transactions";

        console.log("ENDPOINT", endpoint);
        console.log("ENDPOINT", endpoint);

        var postVars = {
//            organization_id: "org_" + auth.forteOrganizationId,
            location_id: "loc_" + auth.forteLocationId,
            action: 'sale',
            customer_token: leaseToken,
            paymethod_token: paymentMethodToken,
            reference_id: payment.id,             // payment_id
            authorization_amount: payment.amount
            // entered_by: 34                      // user_id of person entering transaction
        };
        return request({
            headers: requestHeaders,
            uri: url + endpoint,
            body: postVars,
            method: 'POST',
            json: true
        });
    })
    
}


module.exports.chargeCustomerProfile = chargeCustomerProfile;