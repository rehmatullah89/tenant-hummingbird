'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};

function chargeCreditCard(auth, amount, data, company_id, callback) {

	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var creditCard = new ApiContracts.CreditCardType();

	creditCard.setCardNumber(data.card_number);
	creditCard.setExpirationDate(data.exp_mo + "" + data.exp_yr);
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
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
	transactionRequestType.setPayment(paymentType);
	transactionRequestType.setAmount(amount);
	transactionRequestType.setBillTo(billTo);
	// transactionRequestType.setLineItems(lineItems);
	// transactionRequestType.setUserFields(userFields);
	// transactionRequestType.setOrder(orderDetails);
	// transactionRequestType.setTax(tax);
	// transactionRequestType.setDuty(duty);
	// transactionRequestType.setShipping(shipping);
	// transactionRequestType.setShipTo(shipTo);
	// transactionRequestType.setTransactionSettings(transactionSettings);

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
	console.log(JSON.stringify(createRequest.getJSON(), null, 2));

	var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
	//Defaults to sandbox
	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}

	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.CreateTransactionResponse(apiResponse);

		//pretty print response
		console.log(JSON.stringify(response, null, 2));

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
          console.log('Failed Transaction.',  JSON.stringify(response.getTransactionResponse(),  null, 2));
					if(response.getTransactionResponse().getErrors() != null){

						errorResponse = {
              transaction_id: response.getTransactionResponse().transId,
							type: "Issuer Rejection: ",
							code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
							msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
						};
						callback(errorResponse);
					}
				}
			}
			else {
        console.log('Failed Transaction. ',  JSON.stringify(response.getTransactionResponse(),  null, 2));
				if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){

					errorResponse = {
            transaction_id: response.getTransactionResponse().transId,
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
    callback(errorResponse);
	});
}

if (require.main === module) {
	chargeCreditCard(function(){
		console.log('chargeCreditCard call complete.');
	});
}

module.exports.chargeCreditCard = chargeCreditCard;
