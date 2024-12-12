'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var component_name = "HB_AUTHNET_INTEGRATION";
let errorResponse = {}; 
var { processTransactionResponse } = require('../utils.js');
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');

async function refundTransaction(auth, payment, customerProfileId, customerPaymentProfileId, amount, company_id,  meta, callback) {
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
	var logs = createRequest.getJSON();
	logs.timing_start = Date.now();
	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}

	try{
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

module.exports.refundTransaction = refundTransaction;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)
