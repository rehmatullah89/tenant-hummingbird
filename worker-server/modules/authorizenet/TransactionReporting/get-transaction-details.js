'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var utils = require('../utils.js');
var settings    = require(__dirname + '/../../../config/settings.js');


function getTransactionDetails(auth, data, customerProfileId, customerPaymentProfileId, company_id, callback) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var getRequest = new ApiContracts.GetTransactionDetailsRequest();
	getRequest.setMerchantAuthentication(merchantAuthenticationType);

	console.log(data);

	getRequest.setTransId(data.transaction_id);

	console.log(JSON.stringify(getRequest.getJSON(), null, 2));

	var ctrl = new ApiControllers.GetTransactionDetailsController(getRequest.getJSON());

	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}

	var errorResponse = {};
	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);

		if(response != null){
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
				console.log('Transaction Id : ' + response.getTransaction().getTransId());
				console.log('Transaction Type : ' + response.getTransaction().getTransactionType());
				console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
				console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
				callback(null, {
          code: response.getTransaction().responseCode,
          transaction_id: response.getTransaction().getTransId(),
          status_desc: response.getTransaction().transactionStatus,
          message: response.getTransaction().responseReasonDescription,
				});
			}
			else{
				console.log('Result Code: ' + response.getMessages().getResultCode());
				console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
				console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
				errorResponse = {
          code: response.getTransaction().responseCode,
          transaction_id: response.getTransaction().getTransId(),
          status_desc: response.getTransaction().transactionStatus,
          message: response.getTransaction().responseReasonDescription,
				};
				callback(errorResponse);

			}
		}
		else{
			errorResponse = {
				code: '0',
				msg: "No response received"
			};
			callback(errorResponse);
		}

		callback(response);
	});
}

if (require.main === module) {
	getTransactionDetails('2259796597', function(){
		console.log('getTransactionDetails call complete.');
	});
}

module.exports.getTransactionDetails = getTransactionDetails;
