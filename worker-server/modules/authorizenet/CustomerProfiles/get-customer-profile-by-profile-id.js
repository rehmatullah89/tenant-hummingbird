
'use strict';

var SDKConstants =  require('../constants.js');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var moment = require('moment');
var errorResponse = {};


function getCustomerProfileByProfileId(auth, data, callback) {

	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var getRequest = new ApiContracts.GetCustomerProfileRequest();
    getRequest.setCustomerProfileId(data.customerProfileId);
	getRequest.setMerchantAuthentication(merchantAuthenticationType);

	//pretty print request
	//console.log(JSON.stringify(createRequest.getJSON(), null, 2));

	var ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());

	if(settings.is_prod){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	} else {
		ctrl.setEnvironment(SDKConstants.endpoint.development);
	}

	try{
		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.GetCustomerProfileResponse(apiResponse);
			//pretty print response
			// console.log("REPOSNE", JSON.stringify(response, null, 2));

			if(response != null) {
				if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
					callback(null, response);
				} else {

					errorResponse = {
						code: response.getMessages().getMessage()[0].getCode(),
						msg: response.getMessages().getMessage()[0].getText()
					};
					callback(errorResponse);
				}


			} else {
				callback({
					code: '0',
					msg: "No response received"
				});
			}
			callback(response);
		});
	} catch(err){
		errorResponse = {
			code: '0',
			msg: "No response received"
		};
		callback(errorResponse);
	}
}


// if (require.main === module) {
// 	getCustomerProfile('40936719', function(){
// 		console.log('getCustomerProfile call complete.');
// 	});
// }

module.exports.getCustomerProfileByProfileId = getCustomerProfileByProfileId;