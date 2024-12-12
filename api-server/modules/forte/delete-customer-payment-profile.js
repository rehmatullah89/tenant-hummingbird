var settings    = require(__dirname + '/../../config/settings.js');
var moment = require('moment');

var request = require('request-promise');
var Promise = require('bluebird');

var requestHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
};

function deleteCustomerPaymentProfile(auth, data, paymethod_token, company_id) {

    return Promise.resolve().then(function(){

        var url = '';
        if(settings.is_prod && company_id > 1){
            url = settings.forte.prod.base_url;
        } else {
            url = settings.forte.dev.base_url;
        }

        console.log("COMPANY ID", company_id);
        console.log("url", url);

        var authHeader = new Buffer(auth.forteLogin+":"+auth.forteKey).toString('base64');

        requestHeaders["Authorization"] = "Basic " + authHeader;
        requestHeaders["X-Forte-Auth-Organization-Id"] = "org_"+ auth.forteOrganizationId;

        //  Customer create request params
        var endpoint = "/organizations/org_"+auth.forteOrganizationId+"/locations/loc_"+auth.forteLocationId+"/paymethods/" + paymethod_token;
        
        return request({
            headers: requestHeaders,
            uri: url + endpoint,
            method: 'DELETE',
            json: true
        });

    });
}


module.exports.deleteCustomerPaymentProfile = deleteCustomerPaymentProfile;