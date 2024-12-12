'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};

function deleteCustomerPaymentProfile(auth, customerProfileId, customerPaymentProfileId, company_id, callback) {


	console.log(auth);
	console.log(customerProfileId);
	console.log(customerPaymentProfileId);
	console.log(company_id);

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
	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}

	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.DeleteCustomerPaymentProfileResponse(apiResponse);

		//pretty print response
		//console.log(JSON.stringify(response, null, 2));

		if(response != null) 
		{
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK)
			{
				console.log('Successfully deleted a customer payment profile with id: ' + customerPaymentProfileId);

				callback(null, customerPaymentProfileId);
			}
			else
			{
				errorResponse = {
					code: response.getMessages().getResultCode(),
					msg: response.getMessages().getMessage()[0].getText()
				};

				callback(errorResponse);
			}
		}
		else {
			errorResponse = {
				code: '0',
				msg: "No response received"
			};
			callback(errorResponse);
		}
	});
}


module.exports.deleteCustomerPaymentProfile = deleteCustomerPaymentProfile;