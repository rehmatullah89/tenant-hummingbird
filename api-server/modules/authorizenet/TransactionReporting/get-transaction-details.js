'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');

var errorResponse = {};	
var { processResponse } = require('../utils.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var component_name = "HB_AUTHNET_INTEGRATION";
var { processTransactionDetailsResponse } = require('../utils.js');



async function getTransactionDetails(auth, data, customerProfileId, customerPaymentProfileId, company_id,  meta, callback) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(auth.authnetLogin);
	merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var getRequest = new ApiContracts.GetTransactionDetailsRequest();
	getRequest.setMerchantAuthentication(merchantAuthenticationType);
	getRequest.setTransId(data.transaction_id);
	
	var ctrl = new ApiControllers.GetTransactionDetailsController(getRequest.getJSON());
	var logs = getRequest.getJSON();
	logs.timing_start = Date.now();
	if(settings.is_prod && company_id > 1){
		ctrl.setEnvironment(SDKConstants.endpoint.production);
	}

	try{
		ctrl.execute(function(){
			var apiResponse = ctrl.getResponse();
			var response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);
			logs.response = response;
			
			const { error, result } = processTransactionDetailsResponse(response); 

			if(error){
				callback(error);
				logs.error = error;
			} else {
				callback(null, {
					code: result.getTransaction().responseCode,
					transaction_id: result.getTransaction().getTransId(),
					status_desc: result.getTransaction().transactionStatus,
					message: result.getTransaction().responseReasonDescription,
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

	

	// 	if(response != null){
	// 		if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
	// 			callback(null, {
	// 				code: response.getTransaction().responseCode,
	// 				transaction_id: response.getTransaction().getTransId(),
	// 				status_desc: response.getTransaction().transactionStatus,
	// 				message: response.getTransaction().responseReasonDescription,
	// 			});
	// 		}
	// 		else{
			
	// 			errorResponse = {
	// 				code: response.getTransaction().responseCode,
	// 				transaction_id: response.getTransaction().getTransId(),
	// 				status_desc: response.getTransaction().transactionStatus,
	// 				message: response.getTransaction().responseReasonDescription,
	// 			};
	// 			callback(errorResponse);

	// 		}
	// 	}
	// 	else{
	// 		errorResponse = {
	// 			code: '0',
	// 			msg: "No response received"
	// 		};
	// 		callback(errorResponse);
	// 	}

	// 	callback(response);
	// });
}

// if (require.main === module) {
// 	getTransactionDetails('2259796597', function(){
// 		console.log('getTransactionDetails call complete.');
// 	});
// }

module.exports.getTransactionDetails = getTransactionDetails;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)