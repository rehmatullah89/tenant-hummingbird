'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;

var errorResponse = {};
var component_name = "HB_AUTHNET_INTEGRATION";

var { processTransactionResponse } = require('../utils.js');


async function voidTransaction(transactionId, auth, payment, company_id,  meta, callback) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setCardNumber(payment.PaymentMethod.card_end);
	creditCard.setExpirationDate('XXXX');
	var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCard);

	var transactionRequestType = new ApiContracts.TransactionRequestType();
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
	transactionRequestType.setRefTransId(transactionId);
	transactionRequestType.setPayment(paymentType);
	// transactionRequestType.setAmount(amount);
	transactionRequestType.setRefTransId(payment.transaction_id);

	var createRequest = new ApiContracts.CreateTransactionRequest();
	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setTransactionRequest(transactionRequestType);

	var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
	var logs = createRequest.getJSON();
	logs.timing_start = Date.now();
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
				callback(null, result.getTransactionResponse().getTransId());
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


module.exports.voidTransaction = voidTransaction;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)

