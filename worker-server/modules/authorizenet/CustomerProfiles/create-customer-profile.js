'use strict';

var SDKConstants =  require('../constants.js');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var moment = require('moment');
var errorResponse = {};


function createCustomerProfile(auth, data, company_id, callback) {

	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var customerProfileType = new ApiContracts.CustomerProfileType();
	if(settings.is_prod){
		customerProfileType.setMerchantCustomerId('C_' + data.contact_id);
	} else {
		customerProfileType.setMerchantCustomerId('C_' + data.contact_id + '_' + Math.floor(Math.random() * 1000) );
	}

	customerProfileType.setDescription('Name: ' + data.first + ' ' + data.last);

	var createRequest = new ApiContracts.CreateCustomerProfileRequest();
	createRequest.setProfile(customerProfileType);
	createRequest.setValidationMode(ApiContracts.ValidationModeEnum.NONE);
	createRequest.setMerchantAuthentication(merchantAuthenticationType);

	var ctrl = new ApiControllers.CreateCustomerProfileController(createRequest.getJSON());

	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	} else {

		ctrl.setEnvironment(SDKConstants.endpoint.development);
	}

	try{
		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			console.log("apiResponse", apiResponse);
			var response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);

      console.log("AUTHNET RESPONSE",  JSON.stringify(response, null, 2));

			if(response != null) {
				console.log("MESSAGES", response.getMessages());
				if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
					console.log('Successfully created a customer profile with id: ' + response.getCustomerProfileId());
					callback(null, response.getCustomerProfileId());
				} else {
					errorResponse = {
						code: response.getMessages().getMessage()[0].getCode(),
						msg: response.getMessages().getMessage()[0].getText()
					};

					callback(errorResponse);
				}
			} else {
				callback({
					code: 500,
					msg: "No response received"
				});
			}
		});
	} catch(err){
		errorResponse = {
			code: 500,
			msg: "No response received"
		};
		callback(errorResponse);
	}
}

module.exports.createCustomerProfile = createCustomerProfile;
