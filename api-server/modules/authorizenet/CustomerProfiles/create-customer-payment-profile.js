'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
var component_name = "HB_AUTHNET_INTEGRATION";
var { processProfileResponse } 	= require(__dirname + '/../utils.js');


async function createCustomerPaymentProfile(auth, data, company_id, meta, callback) {

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

	var createRequest = new ApiContracts.CreateCustomerPaymentProfileRequest();

	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setCustomerProfileId(data.cc_token);
    createRequest.setValidationMode(ApiContracts.ValidationModeEnum.LIVEMODE);
	createRequest.setPaymentProfile(profile);


	var ctrl = new ApiControllers.CreateCustomerPaymentProfileController(createRequest.getJSON());
	
	var logs = createRequest.getJSON();
	logs.timing_start = Date.now();
    if(settings.is_prod && company_id > 1){
        ctrl.setEnvironment(SDKConstants.endpoint.production);
    }

	try { 
		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.CreateCustomerPaymentProfileResponse(apiResponse);
			logs.response = response;

			const { error, result } = processProfileResponse(response); 
			
			if(error){
				callback(error);
				logs.error = error;
			} else {
				callback(null, result.getCustomerPaymentProfileId());
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



module.exports.createCustomerPaymentProfile = createCustomerPaymentProfile;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)
