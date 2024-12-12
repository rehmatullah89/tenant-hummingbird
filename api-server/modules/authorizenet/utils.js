'use strict';
var ApiContracts = require('authorizenet').APIContracts;
function getRandomString(text){
	return text + Math.floor((Math.random() * 100000) + 1);
}

function getRandomInt(){
	return Math.floor((Math.random() * 100000) + 1);
}

function getRandomAmount(){
	return ((Math.random() * 100) + 1).toFixed(2);
}

function getDate(){
	return (new Date()).toISOString().substring(0, 10) ;
}

function processProfileResponse(response){
	let error = null;
	let result = response;
	try {
		if(response != null) {
			if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
				return { error, result }; 
			} else {
				console.log("Error", response.getMessages().getMessage()[0].getCode());
				let code = response.getMessages().getMessage()[0].getCode();
				error = {
					msg: response.getMessages().getMessage()[0].getText()
				};

				if(code === 'E00039'){
					error.code = 409
				} else if(code === 'E00040'){
					error.code = 404;
				} else {
					error.code = 400;
				}

				
				console.log("Error", error);	
			}
		} else {
			console.log("response", response);
			throw "err"
		}
	} catch(err){
		console.log("catch", err); 
		error = {
			code: '0',
			msg: "Cant get response"
		}
	}
	
	return { error, result }; 

}


function processTransactionResponse(response){
	let error = null;
	let result = response;
	try {
		if(response !== null){
			if(response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK){
				if(response.getTransactionResponse().getMessages() != null){	

					return { error, result }; 
				} else {
					if(response.getTransactionResponse().getErrors() != null){
						error = {
							transaction_id: null,
							code:'Issuer Rejection: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
							msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
						};
						try{
							error.transaction_id = response.getTransactionResponse().transId();
						} catch(err){
							console.log(err);
						}
					} else {
						error = {
							code: 'GatewayError: ' + response.getMessages().getMessage()[0].getCode(),
							msg: response.getMessages().getMessage()[0].getText()
						};
					}
				}
			} else {		
				if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){
					error = {
						transaction_id: null,
						code: 'Issuer Rejection: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
						msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
					};
					try{
						error.transaction_id = response.getTransactionResponse().transId();
					} catch(err){
						console.log(err);
					}
				} else {
					error = {
						transaction_id: null,
						code: 'GatewayError: ' + response.getMessages().getMessage()[0].getCode(),
						msg: response.getMessages().getMessage()[0].getText()
					};
				}
			}
		} else {
			console.log("response error here"); 
			throw "error"
		}
	} catch(err){
		console.log("processResponse", err); 
		error = {
			code: '0',
			msg: "Network Error: Transaction failed because of a network error."
		}
	}
	
	return { error, result }; 

}


function processTransactionDetailsResponse(response){
	let error = null;
	console.log("processTransactionDetailsResponse")
	let result = response;
	try {
		if(response !== null){
			if(response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK){
				return { error, result }; 
			} else {		
				error = {
					code: response.getTransaction().responseCode,
					transaction_id: response.getTransaction().getTransId(),
					status_desc: response.getTransaction().transactionStatus,
					message: response.getTransaction().responseReasonDescription,
				}
				console.log("Error", error)
			}
		} else {
			console.log("response error here"); 
			throw "error"
		}
	} catch(err){
		console.log("processResponse", err); 
		error = {
			code: '0',
			msg: "Cant get response"
		}
	}
	console.log("Error", error)
	return { error, result }; 

}



module.exports = {
	getRandomString,
	getRandomInt,
	getRandomAmount,
	getDate,
	processProfileResponse,
	processTransactionResponse,
	processTransactionDetailsResponse
}