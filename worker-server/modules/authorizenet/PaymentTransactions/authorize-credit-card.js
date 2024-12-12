'use strict';

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('../constants.js');
var settings    = require(__dirname + '/../../../config/settings.js');
var errorResponse = {};

function authorizeCreditCard(auth, amount, data, company_id, callback) {


	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(auth.authnetLogin);
  merchantAuthenticationType.setTransactionKey(auth.authnetKey);

  var creditCard = new ApiContracts.CreditCardType();
  console.log("data", data);
  console.log("amount", amount);
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

  //
	// var orderDetails = new ApiContracts.OrderType();
	// orderDetails.setInvoiceNumber('INV-12345');
	// orderDetails.setDescription('Product Description');
  //
	// var tax = new ApiContracts.ExtendedAmountType();
	// tax.setAmount('4.26');
	// tax.setName('level2 tax name');
	// tax.setDescription('level2 tax');
  //
	// var duty = new ApiContracts.ExtendedAmountType();
	// duty.setAmount('8.55');
	// duty.setName('duty name');
	// duty.setDescription('duty description');
  //
	// var shipping = new ApiContracts.ExtendedAmountType();
	// shipping.setAmount('8.55');
	// shipping.setName('shipping name');
	// shipping.setDescription('shipping description');
  //
	// var billTo = new ApiContracts.CustomerAddressType();
	// billTo.setFirstName('Ellen');
	// billTo.setLastName('Johnson');
	// billTo.setCompany('Souveniropolis');
	// billTo.setAddress('14 Main Street');
	// billTo.setCity('Pecan Springs');
	// billTo.setState('TX');
	// billTo.setZip('44628');
	// billTo.setCountry('USA');
  //
	// var shipTo = new ApiContracts.CustomerAddressType();
	// shipTo.setFirstName('China');
	// shipTo.setLastName('Bayles');
	// shipTo.setCompany('Thyme for Tea');
	// shipTo.setAddress('12 Main Street');
	// shipTo.setCity('Pecan Springs');
	// shipTo.setState('TX');
	// shipTo.setZip('44628');
	// shipTo.setCountry('USA');

	// var lineItem_id1 = new ApiContracts.LineItemType();
	// lineItem_id1.setItemId('1');
	// lineItem_id1.setName('vase');
	// lineItem_id1.setDescription('cannes logo');
	// lineItem_id1.setQuantity('18');
	// lineItem_id1.setUnitPrice(45.00);
  //
	// var lineItem_id2 = new ApiContracts.LineItemType();
	// lineItem_id2.setItemId('2');
	// lineItem_id2.setName('vase2');
	// lineItem_id2.setDescription('cannes logo2');
	// lineItem_id2.setQuantity('28');
	// lineItem_id2.setUnitPrice('25.00');
  //
	// var lineItemList = [];
	// lineItemList.push(lineItem_id1);
	// lineItemList.push(lineItem_id2);
  //
	// var lineItems = new ApiContracts.ArrayOfLineItem();
	// lineItems.setLineItem(lineItemList);
  //
	// var userField_a = new ApiContracts.UserField();
	// userField_a.setName('A');
	// userField_a.setValue('Aval');
  //
	// var userField_b = new ApiContracts.UserField();
	// userField_b.setName('B');
	// userField_b.setValue('Bval');
  //
	// var userFieldList = [];
	// userFieldList.push(userField_a);
	// userFieldList.push(userField_b);
  //
	// var userFields = new ApiContracts.TransactionRequestType.UserFields();
	// userFields.setUserField(userFieldList);

	// var transactionSetting1 = new ApiContracts.SettingType();
	// transactionSetting1.setSettingName('testRequest');
	// transactionSetting1.setSettingValue('s1val');
  //
	// var transactionSetting2 = new ApiContracts.SettingType();
	// transactionSetting2.setSettingName('testRequest');
	// transactionSetting2.setSettingValue('s2val');
  //
	// var transactionSettingList = [];
	// transactionSettingList.push(transactionSetting1);
	// transactionSettingList.push(transactionSetting2);
  //
	// var transactionSettings = new ApiContracts.ArrayOfSetting();
	// transactionSettings.setSetting(transactionSettingList);

	// transactionRequestType.setLineItems(lineItems);
	// transactionRequestType.setUserFields(userFields);
	// transactionRequestType.setOrder(orderDetails);
	// transactionRequestType.setTax(tax);
	// transactionRequestType.setDuty(duty);
	// transactionRequestType.setShipping(shipping);
	// transactionRequestType.setBillTo(billTo);
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

		if(response != null){
      if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
        if(response.getTransactionResponse().getMessages() != null){
          console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
          console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
          console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
          console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());


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
			console.log('Null Response.');
		}

		callback(response);
	});
}

if (require.main === module) {
	authorizeCreditCard(function(){
		console.log('authorizeCreditCard call complete.');
	});
}

module.exports.authorizeCreditCard = authorizeCreditCard;
