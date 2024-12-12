var settings    = require(__dirname + '/../../config/settings.js');
var moment = require('moment');
var Promise = require('bluebird');
var request = require('request-promise');

var requestHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
};


function createCustomerProfile(config, contact_id, accountHolder, company_id) {

    var error = '';

    return Promise.resolve().then(function(){
        var url = '';

        if(settings.is_prod && company_id > 1){
            url = settings.forte.prod.base_url;
        } else {
            url = settings.forte.dev.base_url;
        }

        var authHeader = new Buffer(config.forteLogin+":"+config.forteKey).toString('base64');

        requestHeaders["Authorization"] = "Basic " + authHeader;
        requestHeaders["X-Forte-Auth-Organization-Id"] = "org_"+ config.forteOrganizationId;

        //  Customer create request params
        var endpoint = "/organizations/org_"+config.forteOrganizationId+"/locations/loc_"+config.forteLocationId+"/customers";
        var postVars = {
//            organization_id: "org_" + config.forteOrganizationId,
            location_id: "loc_" + config.forteLocationId,
            first_name: accountHolder.first,
            last_name: accountHolder.last,
            customer_id: 'C_' + contact_id // internal customer ID
        };
        return request({
            headers: requestHeaders,
            uri: url + endpoint,
            method: 'POST',
            body:  postVars,
            json: true,
            transform:function(res){
                error = (res.response.response_desc !== "Create Successful.") ? res.response.response_desc: error;
                return res;
            }
        })

    }).then(function(body){
        console.log(body);

        return {
            status:true,
            data: {
                customer_token: body.customer_token
            }
        }

    }).catch(function(err){

        return {
            status: false,
            data: {},
            msg: err
        }

    });


}


module.exports.createCustomerProfile = createCustomerProfile;
