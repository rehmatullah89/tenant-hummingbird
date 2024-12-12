'use strict';

var SDKConstants =  require('../constants.js');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
var component_name = "HB_AUTHNET_INTEGRATION";
var { processProfileResponse } 	= require(__dirname + '/../utils.js');


async function createCustomerProfile(auth, data, company_id, meta, callback) {
	console.log("rcreateCustomerProfile");
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
	var logs = createRequest.getJSON();
	logs.timing_start = Date.now();

	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	} else {
		ctrl.setEnvironment(SDKConstants.endpoint.development);
	}

	try{
		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
			logs.response = response;
			
			const { error, result } = processProfileResponse(response); 

			if(error){
				callback(error);
				logs.error = error;
			} else {

				try {
					console.log("result", JSON.stringify(result, null, 2));  
					console.log("result.customerProfileId", result.customerProfileId);
					console.log("result.getCustomerProfileId()", result.getCustomerProfileId());
				} catch(err){
					console.log("result err", err);

				}

				callback(null, result.customerProfileId);

				// callback(null, result.getCustomerProfileId());
			}

			if (logs.env !== 'test' && logs.env !== 'local'){ 
				utils.sendLogsToGDS(component_name, logs, '', logs.error ? 'error': 'info', null,  meta.trace_id);
			}

			
		});
	} catch(err){
		errorResponse = {
			code: '0',
			msg: err.toString()
		};
		callback(errorResponse);
		logs.error = err;
	} 

	

	

}

module.exports.createCustomerProfile = createCustomerProfile;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)