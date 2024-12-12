'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
function createCustomerPaymentProfile(auth, data, company_id, callback) {


	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setCardNumber(data.card_number);
	creditCard.setExpirationDate(data.exp_mo + "" + data.exp_yr);
	creditCard.setCardCode(data.cvv2);

	var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCard);

	var customerAddress = new ApiContracts.CustomerAddressType();
	customerAddress.setFirstName(data.first);
	customerAddress.setLastName(data.last);
	customerAddress.setAddress(data.address);
	customerAddress.setCity(data.city);
	customerAddress.setState(data.state);
	customerAddress.setZip(data.zip);


	var profile = new ApiContracts.CustomerPaymentProfileType();
	profile.setBillTo(customerAddress);
	profile.setPayment(paymentType);

	console.log("PROFILE", profile);

	var createRequest = new ApiContracts.CreateCustomerPaymentProfileRequest();

	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setCustomerProfileId(data.cc_token);
    createRequest.setValidationMode(ApiContracts.ValidationModeEnum.LIVEMODE);
	createRequest.setPaymentProfile(profile);


	var ctrl = new ApiControllers.CreateCustomerPaymentProfileController(createRequest.getJSON());

	console.log(settings.is_prod);

    if(settings.is_prod && company_id > 1){
        ctrl.setEnvironment(SDKConstants.endpoint.production);
    }


	ctrl.execute(function(){

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.CreateCustomerPaymentProfileResponse(apiResponse);

		//pretty print response
    console.log("AUTHNET RESPONSE",  JSON.stringify(response, null, 2));
		//console.log(JSON.stringify(response, null, 2));

		if(response != null) {
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
				console.log('Successfully created a customer payment profile with id: ' + response.getCustomerPaymentProfileId());

				callback(null, response.getCustomerPaymentProfileId());
			} else {

				errorResponse = {
					code: 400,
					msg: response.getMessages().getMessage()[0].getText()
				};
				callback(errorResponse);
			}
		} else {
			errorResponse = {
				code: 500,
				msg: "No response received"
			};
			callback(errorResponse);
		}


	});
}



module.exports.createCustomerPaymentProfile = createCustomerPaymentProfile;
