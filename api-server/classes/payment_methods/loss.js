var PaymentMethod = require(__dirname + './../payment_method.js');

class Loss extends PaymentMethod {

	constructor(data, connection_info){
		super(data, connection_info);
	}
}


module.exports = Loss;