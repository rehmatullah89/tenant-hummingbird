'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var constants = require('../constants.js');
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');

function refundTransaction(auth, payment, customerProfileId, customerPaymentProfileId, amount, company_id, callback) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setCardNumber(payment.PaymentMethod.card_end);
	creditCard.setExpirationDate('XXXX');
	var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCard);

	var transactionRequestType = new ApiContracts.TransactionRequestType();
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION);
	transactionRequestType.setPayment(paymentType);
	transactionRequestType.setAmount(amount);
	transactionRequestType.setRefTransId(payment.transaction_id);

	var createRequest = new ApiContracts.CreateTransactionRequest();
	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setTransactionRequest(transactionRequestType);

	//pretty print request
	console.log(JSON.stringify(createRequest.getJSON(), null, 2));
		
	var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());


	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}


	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.CreateTransactionResponse(apiResponse);

		//pretty print response
		console.log(JSON.stringify(response, null, 2));
		var errorResponse = {};


		if(response != null){
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
				if(response.getTransactionResponse().getMessages() != null){
					console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
					console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
					console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
					console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
					callback(null, response.getTransactionResponse().getTransId());
				}
				else {
					console.log('Failed Transaction.');
					if(response.getTransactionResponse().getErrors() != null){

						errorResponse = {
							type: "Issuer Rejection: ",
							code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
							msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
						};
						callback(errorResponse);
					}
				}
			}
			else {
				console.log('Failed Transaction. ');
				if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){

					errorResponse = {
						type: "Issuer Rejection: ",
						code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
						msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
					};
					callback(errorResponse);
				}
				else {

					errorResponse = {
						type: "GatewayError: ",
						code: response.getMessages().getMessage()[0].getCode(),
						msg: response.getMessages().getMessage()[0].getText()
					};
					callback(errorResponse);

				}
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

if (require.main === module) {
	refundTransaction('2259764785', function(){
		console.log('refundTransaction call complete.');
	});
}

module.exports.refundTransaction = refundTransaction;