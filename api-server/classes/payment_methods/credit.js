var PaymentMethod = require(__dirname + './../payment_method.js');

class Credit extends PaymentMethod {

	constructor(data, connection_info){
		super(data, connection_info);
	}
}


module.exports = Credit;