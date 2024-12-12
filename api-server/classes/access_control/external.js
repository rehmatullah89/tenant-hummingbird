"use strict";
var models  = require(__dirname + '/../../models');
var settings    = require(__dirname + '/../../config/settings.js');
var Promise = require('bluebird');
var request = require('request-promise');

var fillTemplate = require('es6-dynamic-template');
var moment      = require('moment');
var AccessControl = require(__dirname + '/../access_control.js');
var Settings = require(__dirname + '/../settings.js');

var e  = require(__dirname + '/../../modules/error_handler.js');


class External extends AccessControl {

	constructor(data) {
		super(data);
		// this.id = '';
		// data.Credentials = data.Credentials || {};
		// this.property_id = data.property_id;

		// this.access_id = data.access_id;
		// this.name = data.name;

		// this.endpoint = process.env.GATE_ACCESS_APP_ENDPOINT;
		// this.Groups = [];
		// this.Contacts = [];
		// this.Token = {}
	}
	// find(connection){
	// 	return models.Access.findCredentials(connection, this.name)
	// 		.then(data => this.setCredentials(data))
  //
	// }
  //
	// async findPropertyCredentials(connection, access_id){
  //
	// 	if(!this.property_id) throw new Error("Missing parameters");
	// 	let data = await models.Access.findPropertyAccess(connection, this.access_id,  this.property_id)
  //
	// 	for (let i = 0; i < data.length; i++){
	// 		this.Credentials[data[i].key] = data[i].value;
	// 	}
  // }
  //
  // async create(connection, contact, creds){
  //
  //   let phone;
  //   for(let i = 0; i < contact.Phones.length; i++){
  //     phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
  //     break;
  //   }
  //
  //   // if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");
  //
  //   let user = {
  //     user_id: contact.id,
  //     first: contact.first,
  //     last: contact.last,
  //     email: contact.email,
  //     phone,
  //     pin: creds.pin,
  //     status:'ACTIVE',
  //     active: 1
  //   }
  //
  //   try{
	// 	  await this.createUser(user, creds);
  //     await models.Contact.saveAccessCredentials(connection, creds, creds.id );
  //   } catch(err){
  //     // TODO what to do when we fail?
  //     return;
  //   }
  //
	// }
  //
	// async update(connection, contact, creds){
  //
  //   let phone;
  //
  //   for(let i = 0; i < contact.Phones.length; i++){
  //     phone = contact.Phones[i].phone.toString().replace(/\D+/g, '');
  //     break;
  //   }
  //
  //   let user = {
  //     user_id: contact.id,
  //     first: contact.first,
  //     last: contact.last,
  //     email: contact.email,
  //     phone,
  //     pin: creds.pin,
  //     status:'ACTIVE',
  //     active: 1
  //   };
  //
	// 	await this.updateUser(user, creds);
	// 	await models.Contact.saveAccessCredentials(connection, creds, creds.id );
  //
  // }
  //
  // async updateUser(user, creds){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/' + creds.property_id + '/users/'  + user.user_id,
  //       body: user,
  //       method: 'PUT',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //   return result.data;
  //
  // }
  //
  // async createUser(user, creds){
  //
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + creds.property_id + '/users',
  //       body: //{
  //         user,
  //         // start_date: dates.access_start,
  //         // end_date: dates.access_end
  //       //},
  //       method: 'POST',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //
  //   }
  //
  //   return result
  // }
  //
  // makeNewCode(){
  //     var text = "";
  //     var possible = "0123456789";
  //     for (var i = 0; i < 6; i++){
  //       text += possible.charAt(Math.floor(Math.random() * possible.length));
  //     }
  //     return text;
  // }
  //
  //
  // async denyAccessToSpace(lease){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/deny-access',
  //       body: {},
  //       method: 'PUT',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //   console.log("RESULT", result);
  //
  // }
  //
  //
  // async allowAccessToSpace(lease){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + lease.Property.id + '/spaces/'  + lease.unit_id + '/enable-access',
  //       body: {},
  //       method: 'PUT',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //   console.log("RESULT", result);
  //
  // }
  //
  // async addContactToSpace(connection, contact, creds, unit_id, property_id){
  //
  //   try{
  //
  //     //await this.createSpaceIfNotExist({});
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
  //       body: {
  //         user_id: contact.id,
  //         status: creds.status,
  //         start_date: creds.start_date,
  //         end_date: creds.end_date
  //       },
  //       method: 'POST',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //   console.log("RESULT", result);
  // }
  //
  // async updateContactToSpace(connection, contact, creds, unit_id, property_id){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + property_id + '/spaces/'  + unit_id + '/users/' + contact.id,
  //       body: {
  //         status: creds.status,
  //         start_date: creds.start_date,
  //         end_date: creds.end_date
  //       },
  //       method: 'PUT',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  // }
  //
  //
  //
  // async createSpaceIfNotExist(unit){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces/'  + unit.id,
  //       method: 'GET',
  //       json: true
  //     });
  //   } catch(err) {
  //     if(err.error.status === 404) {
  //       return await this.createSpace(unit);
  //     }
  //     throw err;
  //   }
  //
  //   return result.data.space
  //
  // }
  //
  // async createSpace(unit){
  //   console.log("creating space");
	//   console.log('------------', this.endpoint + 'facilities/'  + unit.property_id + '/spaces');
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + unit.property_id + '/spaces',
  //       body: {
  //         space_id: unit.id,
  //         name: unit.number,
  //         status: 'VACANT',
  //         active: 1
  //       },
  //       method: 'POST',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //   return result.data.space;
  //
  // }
  //
  // async generateCode(){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + this.property_id + '/generate-code',
  //       method: 'GET',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //
  //   return result.data.code;
  //
  // }
  //
  // async validateCode(code){
  //
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + this.property_id + '/validate-code',
  //       method: 'GET',
  //       json: true
  //     });
  //   } catch(err) {
  //     throw err;
  //   }
  //
  // }
  //
  // setCredentials(creds){
  //
  //   this.property_id = creds.property_id ? creds.property_id: this.property_id;
  //   this.Credentials.site_key = creds.site_key ? creds.site_key: this.Credentials.site_key;
  //
  // }
  //
	// async deleteCreds(connection, contact_id, creds){
	// 	try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/' + creds.property_id + '/users/'  + contact_id,
  //       body: {},
  //       method: 'DELETE',
  //       json: true
  //     });
  //   } catch(err) {
  //     console.log(err);
  //   }
  //
  //   await models.Contact.deleteAccessCredentials(connection, creds.id );
  //
	// }
  //
	// async suspendUser(connection, contact, creds){
  //   var user = {};
  //
  //   creds.status = 0;
  //
  //   user = {
  //     user_id: contact.id,
  //     status:'SUSPENDED'
  //   };
  //
	// 	await this.updateUser(user, creds);
  //
	// 	await models.Contact.saveAccessCredentials(connection, creds, creds.id );
	// }
  //
	// async restoreUser(connection, contact, creds){
  //
	// 	var user = {};
  //
  //   creds.status = 1;
  //
  //   user = {
  //     user_id: contact.id,
  //     status:'ACTIVE'
  //   }
  //
	// 	await this.updateUser(user, creds);
	// 	await models.Contact.saveAccessCredentials(connection, creds, creds.id );
  //
	// }
  //
  // async install(connection, company, property){
  //
  //   await this.getToken(connection, company);
  //   await this.createFacility(property);
  //
  //   property.access_id = this.access_id;
  //   await property.save(connection);
  //
	//   // Check if company exists in settings create company,
  //
  //   // Check of property exists , if not create property, and upload units
  //   // Check if access is configured, if not add
  //   // sync
  //
  //
  //
  // }
  //
  // // Gets token from settings, if there is not one, registers a new company, saves and returns the token
  // async getToken(connection, company){
  //
  //   let s = new Settings({company_id: company.id});
  //   let token_response = await s.findSettingByName(connection, 'gateAccessCompanyToken');
  //   let token = '';
  //
  //   if(!token_response){
  //     let r = await this.createCompany(company, s);
  //
  //     if(r.data && r.data.company){
  //       token = r.data.company.token;
  //       await s.save(connection, {
  //         name: 'gateAccessCompanyToken',
  //         value: token,
  //         company_id: company.id
  //       })
  //     }
  //   } else {
  //     token = token_response.value;
  //   }
  //
  //   this.token = token;
  //
  // }
  //
  // // creates a facility with the default settings
  // async getFacility(property){
  //   try{
  //     var result = await request({
  //       headers: {
  //         "x-api-key": this.token
  //       },
  //       uri: this.endpoint + 'facilities/'  + property.id,
  //       method: 'GET',
  //       json: true
  //     });
  //   } catch(err) {
  //     if(err.error.status === 404) return;
  //     throw err;
  //   }
  //
  //   this.facility = result.data.facility;
  //
  // }
  //
  // async createFacility(property){
  //
	//   await this.getFacility(property);
  //   if(this.facility) return;
  //
  //   let res = await request({
  //     headers: {
  //       "x-api-key": this.token
  //     },
  //     uri: this.endpoint + 'facilities',
  //     method: 'POST',
  //     body: {
  //       gate_vendor_id: this.access_id,
  //       name: property.name,
  //       facility_id: property.id,
  //       description: property.description,
  //       address: property.Address.address,
  //       address2: property.Address.address2,
  //       city: property.Address.city,
  //       state: property.Address.state,
  //       zip: property.Address.zip,
  //       lat: property.Address.lat,
  //       lng: property.Address.lng
  //     },
  //     json: true
  //   });
  //
  //   this.facility = res.data.facility;
  // }
  //
  // async saveCredentials(){
  //
  // }
  //
  // sync(){
  //
  // }
  //
  // display(){
  //
  //   return {
  //     access_id: this.access_id,
  //     property_id: this.property_id,
  //     name: this.name,
  //     Credentials: {
  //       connected: true,
  //       site_key: this.Credentials.site_key
  //     },
  //   }
  // }
  //
  // async createCompany(company){
  //    return await request({
  //     uri: this.endpoint + 'companies',
  //     method: 'POST',
  //     body: {
  //       name: company.name
  //     },
  //     json: true
  //   })
  //
  //
  //
  // }
  //
  // async updateUserSpaces(connection, contact, creds){
  //
  //   //if(!contact.Leases.length) e.th(409, "This person does not have any active units at this facility");
  //
  //   let today = moment().format('YYYY-MM-DD');
  //   for(let i= 0; i < contact.Leases.length; i++){
  //     let lease = contact.Leases[i];
  //     this.updateUserSpace(connection, contact, creds, lease)
  //   }
  // }
  //
  // async updateUserSpace(connection, contact, creds, lease){
  //   let today = moment().format('YYYY-MM-DD');
  //   let space = await this.createSpaceIfNotExist(lease.Unit);
  //   let user_exists = space.Users.find(u => u.user_id === contact.id);
  //
  //
  //   let has_access = lease.start_date <= today &&  (lease.end_date === null || lease.end_date >= today) && lease.status === 1;
  //
  //   creds.start_date = lease.start_date;
  //   creds.end_date = lease.end_date;
  //   creds.status = lease.balance ? 0: 1;
  //
  //   if(has_access && user_exists) {
  //     // update users
  //     await this.updateContactToSpace(connection, contact, creds, lease)
  //   } else if (has_access && !user_exists){
  //     // create users
  //     await this.addContactToSpace(connection, contact, creds, lease.Unit.id, lease.Unit.property_id)
  //   } else if(!has_access && user_exists) {
  //     // remove user from space
  //   }
  //
  // }


}


module.exports = External;
