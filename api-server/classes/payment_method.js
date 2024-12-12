"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');
var Contact = require(__dirname + '/../classes/contact.js');

const crypto = require('crypto');


class PaymentMethod {

	constructor(data, connection_info, type){

		data = data || {};
		this.id = data.id;
		this.lease_id = data.lease_id;
		this.contact_id = data.contact_id;
		this.property_id = data.property_id;
		this.address_id = data.address_id;
		this.address2 = data.address2;
		this.company = data.company;
		this.first = data.first;
		this.last = data.last;
		this.token = data.token;
		this.token_alt = data.token_alt;
		this.achtoken = data.achtoken;

		this.cc_token = '';
		this.ach_token = '';
    this.google_token = '';
    this.tokenized = data.tokenized || true;

		this.name_on_card = data.name_on_card;
		this.exp_warning = data.exp_warning;
		this.auto_charge = data.auto_charge || 0;
		this.active = data.active;
		this.type = data.type;
		this.card_end = data.card_end;
		this.routing_number = data.routing_number;
		this.card_type = data.card_type;
		this.nonce = '';
		this.rent = data.rent;
		this.utilities = data.utilities;
		this.connection_info = connection_info || {};  // Connection information
		this.Address = {};
		this.Lease = {};
		this.User = {};
		this.Property = {};
		this.AutoPay = null;

		this.msg = '';
		this.payment_method_type_id = data.payment_method_type_id || null;
	}

	setAddress(address){
		this.Address = address;
		this.address_id = address.id;
	}

  async getAddress(connection){
	  if(!this.address_id ) return;

	  this.Address = new Address({id: this.address_id});
    await this.Address.find(connection);
  }

	update(connection){
		if(!this.id) e.th(500, "Payment method id not set");
		var save = {
			auto_charge: this.auto_charge
		};
		return models.Payment.savePaymentMethod(connection, save, this.id);
	}

	async verifyAccess(connection, company_id, properties = []){
		// if(!this.lease_id) e.th(403, "Not authorized");
    let property = {};
    if(this.property_id) {
      property = await models.Property.findById(connection, this.property_id);
    } else {
		  property = await models.Lease.findProperty(connection, this.lease_id);
    }

    if(property.company_id !== company_id) e.th(403, 'You are not authorized to view this resource.');
    if(properties.length && properties.indexOf(property.id) < 0) e.th(403, 'You are not authorized to view this resource.');

    return true;

	}

	async getContact(connection){

	  if (!this.contact_id) return;
	  this.Contact = new Contact({id: this.contact_id});
	  await this.Contact.find(connection);

  }



	async getCardType(){
		// visa
		var re = new RegExp("^4[0-9]{12}(?:[0-9]{3})?$");

		if (this.card_number.match(re) != null)
			return "Visa";

		// Mastercard
		re = new RegExp("^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$");
		if (this.card_number.match(re) != null)
			return "Mastercard";

		// AMEX
		re = new RegExp("^3[47][0-9]{13}$");
		if (this.card_number.match(re) != null)
			return "AMEX";

		// Discover
		re = new RegExp("^65[4-9][0-9]{13}|64[4-9][0-9]{13}|6011[0-9]{12}|(622(?:12[6-9]|1[3-9][0-9]|[2-8][0-9][0-9]|9[01][0-9]|92[0-5])[0-9]{10})$");
		if (this.card_number.match(re) != null)
			return "Discover";

		// Diners
		re = new RegExp("^36");
		if (this.card_number.match(re) != null)
			return "Diners";

		// Diners - Carte Blanche
		re = new RegExp("^30[0-5]");
		if (this.card_number.match(re) != null)
			return "Diners - Carte Blanche";

		// JCB
		re = new RegExp("^35(2[89]|[3-8][0-9])");
		if (this.card_number.match(re) != null)
			return "JCB";
		
		return '';
	}

	validate(){
		return Promise.resolve().then(() =>  true );
	}

	// Overridden in the extended class
	setData(connection, data, rent){
		return Promise.resolve().then(() => true);
	}

	charge(){
		return Promise.resolve().then(() => true);
	}

	setCustomerProfileToken(){
		return Promise.resolve().then(() => true);
	}

	remove(){
		return Promise.resolve().then(() => true);
	}

	getTransactions(){
		return Promise.resolve().then(() => true);
	}

	refund(){
		return Promise.resolve().then(() =>  {
	        return {
		        auth_code: null,
				transaction_id: null
            }
	    });
	}

	getPaymentStatus(){
		return {
			is_settled: true
		};
	}

	// Overridden in the extended class
	async save(connection){

		let data = {
			lease_id: this.lease_id,
			contact_id: this.contact_id,
      		property_id: this.contact_id,
			address_id: this.address_id,
			address2: this.address2,
			company: this.company,
			first: this.first,
			last: this.last,
			token: this.token,
			token_alt: this.token_alt,
			name_on_card: this.name_on_card,
			exp_warning: this.exp_warning,
			auto_charge: this.auto_charge || 0,
			active: this.active,
			type: this.type,
			card_end: this.card_end,
			card_type: this.card_type,
			payment_method_type_id: this.payment_method_type_id
		};

		let insertId = await models.Payment.savePaymentMethod(connection, data, this.id );
		if(!this.id) this.id = insertId;

	}

	async setAsAutoPay(connection, lease_id){

		if(!this.id) e.th(500, 'Payment Method Id Missing');

		let data = {
      payment_method_id: this.id,
      lease_id: lease_id,
			rent: 100,
			other: 100
		};

		let auto_payments = await models.Payment.findPaymentMethodsByLeaseId(connection, lease_id);

    let existing = auto_payments.find(a => a.payment_method_id === this.id );

    if(existing){
      e.th(409, "This payment method is already set to auto pay for this lease.");
    }

		return await models.Payment.saveAutoPayment(connection, data);

	}

	async updateSplits(connection, rent, utilities){

		if (!this.id) e.th(500, 'payment method id missing');
		await models.Payment.savePaymentMethod(connection, {
			auto_charge: rent || utilities ? 1: 0,
			rent: rent,
			utilities: utilities
			}, this.id);
	}

	async find(connection) {
		if (!this.id) e.th(500, 'payment method id missing');
		let data =  await models.Payment.findPaymentMethodById(connection, this.id);
		if (!data) e.th(404, "payment Method not found");
		
		this.lease_id = data.lease_id;
		this.contact_id = data.contact_id;
		this.property_id = data.property_id;
		this.address_id = data.address_id;
		this.company = data.company;
		this.first = data.first;
		this.last = data.last;
		this.token = data.token;
		this.token_alt = data.token_alt;
		this.name_on_card = data.name_on_card;
		this.exp_warning = data.exp_warning;
		this.auto_charge = data.auto_charge || 0;
		this.active = data.active;
		this.type = data.type;
		this.account_number = data.card_end;
		this.card_end = data.card_end && data.card_end.substr(data.card_end.length - 4, data.card_end.length) ;
		this.card_type = data.card_type;
		this.payment_method_type_id = data.payment_method_type_id;
		if(this.address_id){
		this.Address = new Address({id: this.address_id});
		await this.Address.find(connection);
		}

		this.setNonce();


				// // TODO resolve issues in code.  Don't find Lease in Payment Method
				// if(!this.lease_id) return;
				// this.Lease = new Lease({id: this.lease_id});
				// return this.Lease.find(connection)

	}

	async getAutoPayStatus(connection, lease_id){
	    if(this.AutoPay) return true;
      let auto = await models.Lease.findAutoCharges(connection, lease_id, this.id);
      this.AutoPay = auto.length ? auto[0]: null;
  }

	setNonce(){

		if(!this.id) throw "Id not found.";

		var shipment = {
			payment_methods_id: this.id,
			method: 'payment',
			expiry: moment().utc().add(3, 'hours')
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

		this.nonce = encrypted;
		return true;
	}

	validateNonce(nonce){

		if(!nonce) e.th(422, "Missing nonce.")

		var decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
		try{
			var decrypted = JSON.parse(decipher.update(nonce, 'hex', 'utf8') + decipher.final('utf8'));

			var expiry = moment(decrypted.expiry);
			if(moment() > expiry.local()) e.th(422, "Nonce has expired")

			if(decrypted.method !== 'payment')  e.th(422, "Invalid Request");
			if(decrypted.payment_methods_id !== this.id)  e.th(422, "Invalid Request");
		} catch(err){
			e.th(422, err.toString());
		}
		return true;
	}

	// TODO this is depricated - should just transfer auto pay info

	transferLease(connection, transfer_lease_id){

		var payment_method = {
			lease_id: transfer_lease_id,
			contact_id: this.contact_id,
			address_id: this.address_id,
			company: this.company,
			first: this.first,
			last: this.last,
			token: this.token,
      		token_alt: this.token_alt,
			name_on_card: this.name_on_card,
			exp_warning: this.exp_warning,
			auto_charge: this.auto_charge || 0,
			active: this.active,
			type: this.type,
			card_end: this.card_end,
			card_type: this.card_type,
			rent: this.rent,
			utilities: this.utilities,
			qb_customer_id: this.qb_customer_id,
			payment_method_type_id: this.payment_method_type_id
		}

		return models.Payment.savePaymentMethod(connection, payment_method);

	}

	getCreds(){

		return null;
	}

	async findInvoicesToAutoPay(connection, date){
		return await models.PaymentMethod.findInvoicesToAutoPay(connection, this.id, date);
	}

	async removeAutopay(connection){
		await models.Payment.removeAutopayment(connection, this.id);
	}

	async getPaymentMethodTypeId(connection,type,sub_type){
		let method_type_id = await models.Payment.getPaymentMethodTypeId(connection,type,sub_type)
		return method_type_id;
	}
	async checkDeviceHeartBeat(){
		
	}
	async validateCredentials(){

	}

	async updateAddressId(connection, address_id){
		await models.Payment.updateAddressIdOfPaymentMethod(connection, this.id, address_id);
	}

	async getLastAutopayActivity(connection){
		if (this.lease_id) {
			let last_activity = await models.Payment.getLastAutopayActivity(connection, this.lease_id);
			if (last_activity) {

				let contact_name;
				let contact_id = last_activity.deleted_by || last_activity.created_by;
				if(contact_id){
					let contact = new Contact({id: contact_id});
					await contact.find(connection, connection.company_id);
					contact_name = contact.first + " "  + contact.last;
				} else {
					contact_name = 'Not Available';
				}
				
				return { 
					activity_by: contact_name,
					activity: last_activity.deleted_by ? "delete"  : "add",
					activity_at: last_activity.deleted_by ? last_activity.deleted  : last_activity.created_at,
				};
			} else {
				return {};
			}
		} else {
			e.th(422, "Missing lease ID.");
		}
	}

}




module.exports = PaymentMethod;

var Lease = require(__dirname + '/./lease.js');
var Property = require(__dirname + '/./property.js');
var Address = require(__dirname + '/./address.js');
var Contact = require(__dirname + '/./contact.js');
