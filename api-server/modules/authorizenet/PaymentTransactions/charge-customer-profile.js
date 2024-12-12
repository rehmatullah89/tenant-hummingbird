'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var e = require(__dirname + '/../../../modules/error_handler.js');
let errorResponse = {}; 
var settings    = require(__dirname + '/../../../config/settings.js');
var component_name = "HB_AUTHNET_INTEGRATION";
var { processTransactionResponse } = require('../utils.js');

async function chargeCustomerProfile(auth, amount, customerProfileId, customerPaymentProfileId, company_id,  meta, callback) {


	// try {
		
		var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(auth.authnetLogin);
		merchantAuthenticationType.setTransactionKey(auth.authnetKey);

		var profileToCharge = new ApiContracts.CustomerProfilePaymentType();
		profileToCharge.setCustomerProfileId(customerProfileId);

		var paymentProfile = new ApiContracts.PaymentProfile();
		paymentProfile.setPaymentProfileId(customerPaymentProfileId);
		profileToCharge.setPaymentProfile(paymentProfile);


		var transactionRequestType = new ApiContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
		transactionRequestType.setProfile(profileToCharge);
		transactionRequestType.setAmount(amount);

		var duplicateWindowSetting = new ApiContracts.SettingType();
		duplicateWindowSetting.setSettingName('duplicateWindow');
	
		if(!settings.is_prod || company_id === 1) {
			duplicateWindowSetting.setSettingValue(0);
		} else {
			duplicateWindowSetting.setSettingValue(30);		// 30 sec
		}
	
		transactionRequestType.setTransactionSettings([{setting:duplicateWindowSetting}]);


		var createRequest = new ApiContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		console.log("ChargeCustomerProfile REQ", JSON.stringify(createRequest.getJSON(), null, 2));
		var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
		var logs = createRequest.getJSON();
		logs.timing_start = Date.now();
	    if(settings.is_prod && company_id > 1){
	        ctrl.setEnvironment(SDKConstants.endpoint.production);
		}

		try {
			
			ctrl.execute(function(){ 
				var apiResponse = ctrl.getResponse();
				var response = new ApiContracts.CreateTransactionResponse(apiResponse);
				logs.response = response;
	
				const { error, result } = processTransactionResponse(response); 
				
				
				if(error){
					callback(error);
					logs.error = error;
				} else {
					callback(null, {
						transaction_id: result.getTransactionResponse().getTransId(),
						status_desc: result.getMessages().getMessage()[0].getText()
					});


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
	
		

		
	// 	if(response.getMessages().getResultCode() !== ApiContracts.MessageTypeEnum.OK){
	// 		console.log('Failed Transactionzzz. ',  JSON.stringify(response.getTransactionResponse().getErrors(),  null, 2));
	// 		if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){
	// 			errorResponse = {
	// 				transaction_id: null,
	// 				code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
	// 				msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
	// 			};
	// 			try{
	// 				errorResponse.transaction_id = response.getTransactionResponse().transId();
	// 			} catch(err){
	// 				console.log(err);
	// 			}
	// 		} else {
	// 			errorResponse = {
	// 				code: response.getMessages().getMessage()[0].getCode(),
	// 				msg: response.getMessages().getMessage()[0].getText()
	// 			};
	// 			e.th(400, errorResponse.msg)
	// 		}
	// 	}

	// 	if(response.getTransactionResponse().getMessages() === null){
	// 		console.log('Failed Transaction. YYY ',  JSON.stringify(response.getTransactionResponse().getErrors(),  null, 2));
	// 		if(response.getTransactionResponse().getErrors() != null){
	// 			errorResponse = {
	// 				transaction_id: null,
	// 				code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
	// 				msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
	// 			};
	// 			try{
	// 				errorResponse.transaction_id = response.getTransactionResponse().transId();
	// 			} catch(err){
	// 				console.log(err);
	// 			}
	// 			e.th(400, errorResponse.msg)
	// 		}
	// 	}


	// 	console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
	// 	console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
	// 	console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
	// 	console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
	// 	console.log('response: ' + response.getMessages().getMessage()[0].getText());

	// 	result = {
	// 		transaction_id: response.getTransactionResponse().getTransId(),
	// 		status_desc: response.getMessages().getMessage()[0].getText()
	// 	}
		
	// } catch(err){
	// 	logs.error = errorResponse;
	// 	console.log(err);
	// }

	// callback(errorResponse, result);

	// // if (logs.env !== 'test' && logs.env !== 'local'){ 
	// 	console.log("meta", meta)
	// 	utils.sendLogsToGDS(component_name, logs, '', logs.error ? 'error': 'info', meta.request_id,  meta.trace_id);
	// // }


}


module.exports.chargeCustomerProfile = chargeCustomerProfile;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)


