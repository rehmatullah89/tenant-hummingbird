'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};

var component_name = "HB_AUTHNET_INTEGRATION";
var { processProfileResponse } 	= require(__dirname + '/../utils.js');

async function deleteCustomerPaymentProfile(auth, customerProfileId, customerPaymentProfileId, company_id,  meta, callback) {

	try {
		
		var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(auth.authnetLogin);
		merchantAuthenticationType.setTransactionKey(auth.authnetKey);

		var deleteRequest = new ApiContracts.DeleteCustomerPaymentProfileRequest();
		deleteRequest.setMerchantAuthentication(merchantAuthenticationType);
		deleteRequest.setCustomerProfileId(customerProfileId);	
		deleteRequest.setCustomerPaymentProfileId(customerPaymentProfileId);
	
	
		//pretty print request
		//console.log(JSON.stringify(createRequest.getJSON(), null, 2));
			
		var ctrl = new ApiControllers.DeleteCustomerPaymentProfileController(deleteRequest.getJSON());
		var logs = deleteRequest.getJSON();
		logs.timing_start = Date.now();
		if(settings.is_prod && company_id > 1){
			ctrl.setEnvironment(SDKConstants.endpoint.production);
		} else {
			ctrl.setEnvironment(SDKConstants.endpoint.development);
		}
	
		ctrl.execute(function(){

			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.DeleteCustomerPaymentProfileResponse(apiResponse);
			logs.response = response;

			const { error, result } = processProfileResponse(response, ApiContracts); 
			
			if(error){
				callback(error);
				logs.error = error;
			} else { 
				callback(null, customerPaymentProfileId);
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


module.exports.deleteCustomerPaymentProfile = deleteCustomerPaymentProfile;

var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)