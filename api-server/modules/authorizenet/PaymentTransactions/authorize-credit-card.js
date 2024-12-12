'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
var component_name = "HB_AUTHNET_INTEGRATION";
var { processTransactionResponse } = require('../utils.js');

async function authorizeCreditCard(auth, amount, data, company_id, meta, callback) {


	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setCardNumber(data.card_number);
	creditCard.setExpirationDate(data.exp_mo + "" + data.exp_yr );
	creditCard.setCardCode(data.cvv2);

	var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCard);

	var billTo = new ApiContracts.CustomerAddressType();
	billTo.setFirstName(data.first);
	billTo.setLastName(data.last);
	billTo.setAddress(data.address + data.address2);
	billTo.setCity(data.city);
	billTo.setState(data.state);
	billTo.setZip(data.zip);

	var transactionRequestType = new ApiContracts.TransactionRequestType();
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
	transactionRequestType.setPayment(paymentType);
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

	var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
	var logs = getRequest.getJSON();
	logs.timing_start = Date.now();
	
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
	
	
}

// if (require.main === module) {
// 	authorizeCreditCard(function(){
// 		console.log('authorizeCreditCard call complete.');
// 	});
// }

module.exports.authorizeCreditCard = authorizeCreditCard;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)