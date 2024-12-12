var settings    = require(__dirname + '/../../config/settings.js');
var moment = require('moment');

var request = require('request-promise');


var requestHeaders = {
	"Accept": "application/json",
	"Content-Type": "application/json",
	"Cache-Control": "no-cache"
};

function voidTransaction(auth, transaction_id, auth_code, company_id) {

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

		var endpoint = "/organizations/org_"+auth.forteOrganizationId+"/locations/loc_" + auth.forteLocationId + "/transactions/" + transaction_id;

		var postVars = {
			location_id: "loc_" + auth.forteLocationId,
			action: 'void',
			authorization_code: auth_code
		};

		console.log(postVars);
		console.log(authHeader);
		console.log(url + endpoint);


		return request({
			headers: requestHeaders,
			uri: url + endpoint,
			body: postVars,
			method: 'PUT',
			json: true
		});

	});
}


module.exports.voidTransaction = voidTransaction;