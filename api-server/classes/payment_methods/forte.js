var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');

var Promise = require('bluebird');

var PaymentMethod = require(__dirname + './../payment_method.js');

var forteACHFuncs = require(__dirname + '/../../modules/forte');

class Forte extends PaymentMethod {

  constructor(data, connection_info, payment_gateway){
    super(data, connection_info);
    this.payment_gateway = payment_gateway;
	}

	validate(){

		return Promise.resolve().then(() => {

			if(!this.account_number || !validator.isNumeric(this.account_number + ''))
				e.th(400, 'The account number is required and can only contain numbers');

			if(!this.routing_number || !validator.isLength(this.routing_number + '', {min:1, max:9}) ) e.th(400,  "You have entered an invalid routing number");

			if(!this.account_holder || !validator.isLength(this.account_holder + '', {min:2}))
				e.th(400,  "Please enter the name of the account holder");
			return true;
		})


	}

	authorize(){
	  return Promise.resolve()
  	}

	setData(connection, data, rent){
		var address = {};
		return Promise.resolve().then(() => {

			if(!data.address) return true;
			address = new Address({
				address: data.address,
				address2: data.address2,
				city: data.city,
				state: data.state,
				country: data.country,
				zip: data.zip
			});
			return address.findOrSave(connection).then(() => {
				return this.setAddress(address);
			})
		}).then(() => {

			this.type = 'ach';
			this.active = 1;
			this.company= data.company;
			this.first = data.first.trim();
			this.last = data.last.trim();
			this.auto_charge = data.auto_charge? 1 : 0;
			this.save_to_account = data.save_to_account? 1 : 0;

			this.account_holder = data.first + ' ' + data.last;
			this.routing_number = data.routing_number;
			this.account_number = data.account_number;
			this.account_type = data.account_type;
			this.name_on_card =  data.first + ' ' + data.last;

			this.address_id = address.id;
			this.address = address.address;
			this.address2 = address.address2;
			this.city = address.city;
			this.state = address.state;
			this.country = address.country;
			this.zip = address.zip;

			this.card_end = data.account_number.substr(data.account_number.length - 4)
			this.card_type     = data.account_type;
			return this.getPaymentMethodTypeId(connection, this.type,this.card_type).then((r) => {
				this.payment_method_type_id = r;
			})

		})

	}

	async save(connection, company_id, payment_source){
	  

	  await this.setCustomerProfileToken(connection, company_id);


    try{
      let responseToken = await forteACHFuncs.createCustomerPaymentProfile(this.connection_info, this, company_id);
      this.token = responseToken;
      if (this.token === null) {
        this.tokenized = false;
        this.active = 0;
      }
    } catch(err){

      err = JSON.parse(err.split('-')[1].trim());
      throw e.th(400, err.response.response_desc);
	}
    var save = {
      contact_id: this.contact_id,
      property_id: this.property_id,
      address_id: this.address_id,
      company: this.company,
      first: this.first,
      last: this.last,
      token: this.token,
      name_on_card: this.name_on_card,
      exp_warning: null,
      auto_charge: this.auto_charge || 0,
      rent: this.rent,
      utilities: this.utilities,
      active: this.save_to_account,
      type: this.type,
      card_end: this.card_end,
      card_type: this.card_type,
	  payment_method_type_id: this.payment_method_type_id
    };

    this.id = await models.Payment.savePaymentMethod(connection, save)

    return true;
	}

  async charge(connection, amount, payment_id, company_id, dryrun, contact, source, authorization, refund_effective_date, ip_override, paymentRef = {}){

	  try {
      await this.setCustomerProfileToken(connection,company_id)
      if(dryrun) return true;

      let body = await forteACHFuncs.chargeCustomerProfile(this.connection_info, { payment_id: payment_id, amount: amount }, this.ach_token, this.token, company_id)

      await models.Payment.save(connection, {
        transaction_id: body.transaction_id,
        auth_code: body.response.authorization_code,
        status_desc: body.response.response_desc,
        payment_gateway: this.payment_gateway
      }, payment_id)

    } catch(err){
      console.log("ERR", err);
	    await models.Payment.save(connection, {
        status: 0,
        status_desc: err.error.response.response_desc,
        payment_gateway: this.payment_gateway
      }, payment_id);

      paymentRef.PaymentInfo = {
        amount: amount,
        transaction_id: err.error.transaction_id,
        status: 0,
        status_desc: err.error.response.response_code +" - "+ err.error.response.response_desc,
        payment_gateway: this.payment_gateway
      }
      let errorMessage = err.error.response.response_code + " - " + err.error.response.response_desc;
      e.th(400, errorMessage)

	  }

	}

	remove(connection, company_id){
		return this.setCustomerProfileToken(connection,company_id)
			.then(() =>  forteACHFuncs.deleteCustomerPaymentProfile(this.connection_info, this.ach_token, this.token, company_id))
			.catch(err => {
				e.th(400, err.error.response.response_desc);
			})
			.then(() => models.Payment.deletePaymentMethod(connection, this.id))
	}

	refund(connection, payment, company_id, amount, refund){

		return this.setCustomerProfileToken(connection, company_id)
			.then(()  => forteACHFuncs.refundCustomerPaymentProfile(this.connection_info, payment, this.ach_token, this.token, amount, company_id))
			.catch(err => {
				e.th(400, err.error.response.response_desc);
			})
			.then(body => {
				return {
					transaction_id: body.transaction_id,
					auth_code: body.authorization_code
				}
			})
	}

	void_payment(){

	}

	async getPaymentStatus(connection, payment, company_id){
		
		try {
			await this.setCustomerProfileToken(connection, company_id)
			let body = await forteACHFuncs.getTransaction(this.connection_info, payment, this.ach_token, this.token, company_id)
			switch (body.status.toLowerCase()) {
				case 'declined':
				case 'failed':
				case 'rejected':
				case 'voided':
				case 'funded':
				case 'settled':
						return {
							is_settled: true
						}; 
					
							
				case 'ready':
				case 'settling':
					return {
						is_settled: false
					}; 
				
				default:
					return {
						is_settled: false
					};
			}
		} catch(err){
			// e.th(400, err.error.response.response_desc);
			return {
				is_settled: true
			}
		}
	}


	async setCustomerProfileToken(connection, company_id){

    let contact = new Contact({id: this.contact_id});
    await contact.getToken(connection, this.property_id, 'forte_ach');

    if(contact.Token && contact.Token.token) {
      this.ach_token = contact.Token.token;
      return true;
    }

    var accountHolder = {
      first: this.first,
      last: this.last,
      contact_id: this.contact_id
    };
    try{
      let tokenRes = await forteACHFuncs.createCustomerProfile(this.connection_info, contact.id, accountHolder, company_id);

      if(tokenRes.status){
        this.ach_token = tokenRes.data.customer_token;

        console.log({
          property_id: this.property_id,
          token: tokenRes.data.customer_token,
          type: 'forte_ach'
        });

        await contact.saveToken(connection, {
          property_id: this.property_id,
          token: tokenRes.data.customer_token,
          type: 'forte_ach'
        });

      } else {
        throw tokenRes.msg;
      }
    } catch(err){
      console.log(err.msg);
      e.th(500, err.msg)
    }


		// return models.Lease.findById(connection, this.lease_id).then(lease => {
		// 	console.log("LEASE", lease);
		// 	if(lease.achtoken){
		// 		console.log("FOUND");
		// 		this.ach_token = lease.achtoken;
		// 		return true;
		// 	}
    //
		// 	//Todo Edit to include user Id when necessary
		// 	var accountHolder = {
		// 		first: this.first,
		// 		last: this.last
		// 	};
    //
		// 	return forteACHFuncs.createCustomerProfile(this.connection_info, lease.id, accountHolder, company_id)
		// 		.catch(err => {
		// 			e.th(500, err.msg)
		// 		})
		// 		.then(tokenRes => {
		// 			console.log("TEOKNERES", tokenRes);
		// 			if(tokenRes.status){
		// 				this.ach_token = tokenRes.data.customer_token;
		// 				return models.Lease.save(connection, { achtoken: tokenRes.data.customer_token}, lease.id)
		// 					.then(response => tokenRes.data.customer_token )
		// 			} else {
		// 				throw tokenRes.msg;
		// 			}
		// 		})
		// })

	}


}

var Address = require(__dirname + './../address.js');
var Contact = require(__dirname + './../contact.js');


module.exports = Forte;

