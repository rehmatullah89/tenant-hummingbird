'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};
var component_name = "HB_AUTHNET_INTEGRATION";
var { processTransactionResponse } = require('../utils.js');

async function capturePreviouslyAuthorizedAmount(auth, amount, company_id, authorization,  meta, callback) {


  var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(auth.authnetLogin);
  merchantAuthenticationType.setTransactionKey(auth.authnetKey);

	var transactionRequestType = new ApiContracts.TransactionRequestType();
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION);
	transactionRequestType.setRefTransId(authorization);

	var createRequest = new ApiContracts.CreateTransactionRequest();
	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setTransactionRequest(transactionRequestType);

	//pretty print request
	console.log("CPAA REQ", JSON.stringify(createRequest.getJSON(), null, 2));

  var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

  var logs = createRequest.getJSON();
  logs.timing_start = Date.now();
  //Defaults to sandbox
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
				console.log("AuthNet error-CPAA", error);
				callback(error);
				logs.error = error;
			} else {
				callback(null, {
					transaction_id: result.getTransactionResponse().getTransId(),
					status_desc: result.getMessages().getMessage()[0].getText()
				});
      }

      if (logs.env !== 'test' && logs.env !== 'local'){ 
        utils.sendLogsToGDS(component_name, logs, '', logs.error ? 'error': 'info', meta.request_id,  meta.trace_id);
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


  

	// 	//pretty print response
	// 	console.log(JSON.stringify(response, null, 2));

  //   if(response != null){
  //     if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
  //       if(response.getTransactionResponse().getMessages() != null){
  //         console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
  //         console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
  //         console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
  //         console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());


  //         callback(null, {
  //           transaction_id: response.getTransactionResponse().getTransId(),
  //           status_desc: response.getMessages().getMessage()[0].getText()
  //         });

  //       }
  //       else {
  //         console.log('Failed Transaction.',  JSON.stringify(response.getTransactionResponse(),  null, 2));
  //         if(response.getTransactionResponse().getErrors() != null){

  //           errorResponse = {
  //             transaction_id: null,
  //             code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
  //             msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
  //           };

  //           try{
  //             errorResponse.transaction_id = response.getTransactionResponse().transId();
  //           } catch(err){
  //             console.log(err);
  //           }

  //           console.log("errorResponse", errorResponse);
  //           callback(errorResponse);
  //         }
  //       }
  //     }
  //     else {
  //       console.log('Failed Transaction. ',  JSON.stringify(response.getTransactionResponse(),  null, 2));
  //       if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){

  //         errorResponse = {
  //           transaction_id: null,
  //           code: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
  //           msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
  //         };
  //         try{
  //           errorResponse.transaction_id = response.getTransactionResponse().transId();
  //         } catch(err){
  //           console.log(err);
  //         }
  //         console.log("errorResponse", errorResponse);

  //         callback(errorResponse);
  //       }
  //       else {

  //         errorResponse = {
  //           code: response.getMessages().getMessage()[0].getCode(),
  //           msg: response.getMessages().getMessage()[0].getText()
  //         };
  //         callback(errorResponse);

  //       }
  //     }
  //   }
	// 	else {
  //     errorResponse = {
  //       code: '0',
  //       msg: "No response received"
  //     };
  //     callback(errorResponse);
	// 	}
  //   callback(errorResponse);
	// });
}

// if (require.main === module) {
// 	capturePreviouslyAuthorizedAmount('2259764785', function(){
// 		console.log('capturePreviouslyAuthorizedAmount call complete.');
// 	});
// }

module.exports.capturePreviouslyAuthorizedAmount = capturePreviouslyAuthorizedAmount;
var utils = {}
setTimeout(() => {
	// Hack to fix dependency loading
	 utils = require(__dirname + '/../../utils.js');
}, 0)