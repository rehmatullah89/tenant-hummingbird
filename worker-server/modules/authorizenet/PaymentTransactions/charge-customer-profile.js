'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var utils = require('../utils.js');
var settings    = require(__dirname + '/../../../config/settings.js');


function chargeCustomerProfile(auth, amount, customerProfileId, customerPaymentProfileId, company_id, callback) {


	try{

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

		//pretty print request
		console.log("AUTHNET REQUEST", JSON.stringify(createRequest.getJSON(), null, 2));

		var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

	    if(settings.is_prod && company_id > 1){
	        ctrl.setEnvironment(SDKConstants.endpoint.production);
	    }

	} catch(err){
		console.log("ACK!", err);
		callback(err);
	}
	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.CreateTransactionResponse(apiResponse);

		//pretty print response
		console.log("AUTHNET RESPONSE",  JSON.stringify(response, null, 2));

		var errorResponse = {};


        if (response != null) {
            if (response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
                if (response.getTransactionResponse().getMessages() != null && response.getTransactionResponse().getMessages().getMessage()[0].getCode() === "1") {
                    console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
                    console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
                    console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
                    console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
                    console.log('response: ' + response.getMessages().getMessage()[0].getText());

					callback(null, {
						transaction_id: response.getTransactionResponse().getTransId(),
						status_desc: response.getMessages().getMessage()[0].getText()
					});

				}
				else {
          			console.log('Failed Transaction. YYY ',  JSON.stringify(response.getTransactionResponse().getErrors(),  null, 2));
					if(response.getTransactionResponse().getErrors() != null){

						errorResponse = {
							transaction_id: null,
							type: "Issuer Rejection: ",
							code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
							msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
						};

						try{
							errorResponse.transaction_id = response.getTransactionResponse().transId();
						} catch(err){
							console.log(err);
						}

            			console.log("errorResponse", errorResponse);
						callback(errorResponse);
					} else {
						errorResponse = {
							transaction_id: null,
							type: "Issuer Rejection: ",
							code: "0",
							msg: "Declined"
						};

						try{
							errorResponse.transaction_id = response.getTransactionResponse().transId();
						} catch(err){
							console.log(err);
						}

            			console.log("errorResponse declined", errorResponse);
						callback(errorResponse);
					}
				}
			}
			else {
				
				if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){
					console.log('Failed Transactionzzz. ',  JSON.stringify(response.getTransactionResponse().getErrors(),  null, 2));
					errorResponse = {
						transaction_id: null,
						type: "Issuer Rejection: ",
						code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
						msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
					};
					try{
						errorResponse.transaction_id = response.getTransactionResponse().transId();
					} catch(err){
						console.log(err);
					}
					console.log("errorResponse", errorResponse);

					callback(errorResponse);
				}
				else {

					errorResponse = {
						type: "GatewayError: ",
						code: response.getMessages().getMessage()[0].getCode(),
						msg: response.getMessages().getMessage()[0].getText()
					};

					console.log("errorResponse....", errorResponse);
					callback(errorResponse);

				}
			}
		}
		else {
			errorResponse = {
				code: '0',
				msg: "No response received"
			};

			console.log("errorResponse >>> ", errorResponse);
			callback(errorResponse);
		}
	});
}

module.exports.chargeCustomerProfile = chargeCustomerProfile;
