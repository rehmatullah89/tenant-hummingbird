"use strict";
const PaymentMethod = require(__dirname + './../payment_method.js');

class GiftCard extends PaymentMethod {
	constructor(data, connection_info) {
		super(data, connection_info);
	}
}

module.exports = GiftCard;