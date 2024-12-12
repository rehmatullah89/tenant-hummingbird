'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var utils = require('../utils.js');
var constants = require('../constants.js');

var sanboxCreds = {
    login:  '7Qr2p4gSks73',
    key: '8FsLbe9FM562Fg5j',
    secret: 'Simon'
}



function chargeCreditCard(callback) {

    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(constants.apiLoginKey);
    merchantAuthenticationType.setTransactionKey(constants.transactionKey);

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber('4242424242424242');
    creditCard.setExpirationDate('0822');
    creditCard.setCardCode('999');

    var paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    var transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(2.99);

    var createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    //pretty print request
    console.log("ChargeCreditCard - REQ", JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

    ctrl.execute(function(){

        var apiResponse = ctrl.getResponse();

        var response = new ApiContracts.CreateTransactionResponse(apiResponse);

        //pretty print response
        console.log(JSON.stringify(response, null, 2));

        if(response != null){
            if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK &&
                response.getTransactionResponse().getResponseCode() == '1'){
                console.log('Transaction ID: ' + response.getTransactionResponse().getTransId());
            }
            else{
                console.log('Result Code: ' + response.getMessages().getResultCode());
                console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
                console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
            }
        }
        else{
            console.log('Null Response.');
        }

        callback(response);
    });
}

if (require.main === module) {
    chargeCreditCard(function(){
        console.log('chargeCreditCard call complete.');
    });
}

module.exports.chargeCreditCard = chargeCreditCard;