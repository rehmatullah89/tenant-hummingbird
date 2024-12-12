'use strict';

var SDKConstants =  require('../constants.js');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;

var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
var utils = require(__dirname + '../../utils.js')
var component_name = "HB_AUTHNET_INTEGRATION";
var { processProfileResponse } 	= require(__dirname + '/../utils.js');

async function getCustomerProfile(auth, data, company_id, meta, callback) {
	console.log("getCustomerProfile"); 
	try {
		var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(auth.authnetLogin);
		merchantAuthenticationType.setTransactionKey(auth.authnetKey);

		var getRequest = new ApiContracts.GetCustomerProfileRequest();
		getRequest.setMerchantCustomerId('C_' + data.contact_id);
		getRequest.setMerchantAuthentication(merchantAuthenticationType);


		var ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());
		var logs = getRequest.getJSON();
		logs.timing_start = Date.now();

		if(settings.is_prod && company_id > 1){
			ctrl.setEnvironment(SDKConstants.endpoint.production);
		} else {
			ctrl.setEnvironment(SDKConstants.endpoint.development);
		}

		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.GetCustomerProfileResponse(apiResponse);
			logs.response = response;

			const { error, result } = processProfileResponse(response, ApiContracts); 
		
			if(error){
				callback(error);
				logs.error = error;
			} else { 
				// callback(null, result.profile.customerProfileId);
				console.log("result.profile.customerProfileId", JSON.stringify(result, null, 2));  
				console.log("result.profile.customerProfileId", result.profile.customerProfileId)
				callback(null, result.profile.customerProfileId);
				// callback(null, result.getCustomerProfileId());
			}

			if (logs.env !== 'test' && logs.env !== 'local'){ 
				utils.sendLogsToGDS(component_name, logs, '', logs.error ? 'error': 'info', null,  meta.trace_id);
			}
			
		});
	} catch(err){
		console.log("error", err); 
		errorResponse = {
			code: '0',
			msg: err.toString()
		};
		callback(errorResponse);
		logs.error = err;
	}

	
}




module.exports.getCustomerProfile = getCustomerProfile;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)