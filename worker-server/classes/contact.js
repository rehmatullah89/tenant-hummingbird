"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var crypto      = require('crypto');
var roles = [];

const status_priority = { 
	"Lease Closed": 0,
	"Retired Lead": 1,
	"Current": 2,
	"Pending": 3,
	"Suspended": 4,
	"Active Lead": 5,
	"Delinquent": 6,
	"Balance Due": 7,
	"Gate Lockout": 8,
	"Active Lien": 9,
	"Bankruptcy": 10,
}

class Contact {

	constructor(data){ 
 
		data = data || {}; 

		this.assembleContact(data);

		this.role =  '';
		// this.Roles = [];
		this.Role = {};

		if(data.User) this.User = data.User;
		this.status = "";
		this.bankruptcy = "";
		this.Access = [];
		this.Leases = [];
		this.Addresses = data.Addresses || [];
		this.role_id =  data.role_id;
		this.Phones = data.Phones || [];
		this.Companies = [];
		this.Applications = [];
		this.Reservations = [];
		this.Pending = [];
		this.Leases = [];
		this.Vehicles = data.Vehicles || [];
		this.Employment = data.Employment || [];
		this.Relationships = data.Relationships || [];
		this.Interactions = data.Interactions || [];
		this.Permissions = data.Permissions || [];
		this.Properties = data.Properties || [];
		this.Military = data.Military || {};
		this.Business = data.Business || {};
		this.Token = {};
		this.pin = "";
		this.have_secondary_contact = data.have_secondary_contact;
		this.opt_out = data.opt_out;
		this.type = data.type;

		return this;

	}

	async find(connection){

		if(!this.id && !this.user_id) e.th(500, "Id not set");
		let contact = {};

		if(this.id){
			contact = await models.Contact.findById(connection, this.id);
		} else {
			contact = await models.Contact.findByUserId(connection, this.user_id);
		}

		if (!contact) {
			e.th(404, "Contact not found");
		}



		this.assembleContact(contact);

		// TODO dont auto build this!

		//await this.getLeases(connection, company_id, properties);

		//await this.getRole(connection, company_id);

		// await this.setRole(connection);
		// await this.getLocations(connection);
		// await this.getPhones(connection);

		// let addresses =  await models.Contact.findLocations(connection, this.id);
		//
		// for(let i = 0; i < addresses.length; i++){
		//
		//   addresses[i].Address = await models.Address.findById(connection, addresses[i].address_id);
		//
		//   this.Addresses.push(addresses[i]);
		// }
		//
		// let phones = await models.Contact.findPhones(connection, this.id);
		// this.Phones = phones.map(p => {
		//   p.sms = !!p.sms;
		//   return p;
		// });
	}

	async findBusinessInfo(connection){
		let business_info = await models.Contact.findBusinessInfo(connection, this.id);
		this.Business = business_info || {};
		if(this.Business && this.Business.address_id){
			let address = new Address({id: this.Business.address_id});
			await address.find(connection);
			this.Business.Address = address;
		}
	}
	
	async findMilitaryInfo(connection){
		let military_info = await models.Contact.findMilitaryInfo(connection, this.id);
		
		if(!military_info) return;
	
		  this.Military = {
			id: military_info.id, 
			address_id: military_info.address_id,
			active: military_info.active,
			commanding_officer_contact_id: military_info.commanding_officer_contact_id,
			rank: military_info.rank,
			service_member_email: military_info.service_member_email,
			service_expiration: military_info.service_expiration,
			date_of_birth: military_info.date_of_birth,
			identification_number: military_info.identification_number,
			unit_name: military_info.unit_name,
			branch: military_info.branch,
			Address: {},
			Phone: {
			  type: military_info.phone_type,
			  phone: military_info.phone,
			  sms: military_info.phone_sms,
			  country_code: military_info.country_code
			}, 
			CommandingOfficer: {
			  id: '',
			  first: '',
			  last: '',
			  email: '', 
			  Phone: {
				type: '',
				phone: '',
				sms: "",
				country_code: ""
			  }
			}
		}
		if(this.Military && this.Military.address_id){
		  let address = new Address({id: this.Military.address_id});
		  await address.find(connection);
		  this.Military.Address = address;
		}
	
		if(military_info.commanding_officer_contact_id){
		  let commanding_officer = new Contact({id: military_info.commanding_officer_contact_id}); 
		  await commanding_officer.find(connection);
		  await commanding_officer.getPhones(connection);
		  this.Military.CommandingOfficer = {
			id: commanding_officer.id,
			first: commanding_officer.first,
			last: commanding_officer.last,
			email: commanding_officer.email,
			Phone: commanding_officer.Phones.length? commanding_officer.Phones[0]: {} 
		  }
		}
	
	
	  }

	async getBasicInfo(connection, company_id){

		if(!this.id && !this.user_id) e.th(500, "Id not set");

		if(!company_id) e.th(500, "Company id not set");

		let contact = {};

		if(this.id){
			contact = await models.Contact.findById(connection, this.id);
		} else {
			contact = await models.Contact.findByUserId(connection, this.user_id);
		}

		if (!contact) {
			e.th(404, "Contact not found");
		}

		this.assembleContact(contact);

	}

	async getPhones(connection){

		let phones = await models.Contact.findPhones(connection, this.id);
		if(!phones.length) return;
		this.Phones = phones.map(p => {
			p.sms = !!p.sms;
			return p;
		});
	}

	async optOut(connection){
		return await models.Contact.save(connection, {opt_out: 1}, this.id);
	}

	async getToken(connection, property_id, type){

		let token = await models.Contact.findToken(connection, this.id, property_id, type);
		this.Token = token;
		return;

	}

	async saveToken(connection, data){

		let token = await this.getToken(connection, data.property_id, data.type);
		if(token) e.th(409, "This user already has a token of this type for this facility");
		data.contact_id = this.id;
		data.id =  await models.Contact.saveToken(connection, data);
		this.Token = data;
		return;

	}

	/* this function saves a new payment method for a contact or returns an existing one */
	async getPaymentMethod(connection, property, payment_method_id, payment_type, payment_source, paymentMethod, tokenize) {

		let authorization = '';
		let offlinePaymentMethods = [Enums.PAYMENT_METHODS.CASH, Enums.PAYMENT_METHODS.CHECK, Enums.PAYMENT_METHODS.GIFTCARD];
		if(payment_method_id && offlinePaymentMethods.indexOf(payment_type.toLowerCase() < 0)){
			// Existing Payment Method
			paymentMethod = await property.getPaymentMethod(connection, payment_type.toLowerCase(), payment_method_id);

			paymentMethod.is_new = false;

		} else if( paymentMethod && offlinePaymentMethods.indexOf(payment_type.toLowerCase()) < 0) {

			// Pay with new card or ACH
			if( paymentMethod.authorization){
				authorization = paymentMethod.authorization;
			}
			paymentMethod.first = paymentMethod.first || this.first;
			paymentMethod.last = paymentMethod.last || this.last;

			paymentMethod = await this.savePaymentMethod(connection, paymentMethod, this.company_id, payment_source, property, tokenize);
			paymentMethod.is_new = true;

		} else {
			// Cash or check
			paymentMethod = await property.getPaymentMethod(connection, payment_type.toLowerCase());
			paymentMethod.is_new = true;
		}

		return paymentMethod;
	}

	async savePaymentMethod(connection, pm, company_id, payment_source, property, tokenize){

		try{
			let address = {};
			if(!this.id) e.th(500, "Contact id not set");
			if(pm.address){
				address = new Address({
					address: pm.address,
					address2: pm.address2,
					city: pm.city,
					state: pm.state,
					zip: pm.zip
				});

				await address.findOrSave(connection);
			}

			let paymentMethod = await property.getPaymentMethod(connection, pm.type);

			paymentMethod.setAddress(address);
			paymentMethod.contact_id = this.id;
			paymentMethod.property_id = property.id;

			await paymentMethod.setData(connection, pm);
			await paymentMethod.save(connection, company_id, payment_source, tokenize);

			paymentMethod.setNonce();

			if(paymentMethod.auto_charge){
				await models.Payment.resetAutoChargeStatus(connection, this.id, paymentMethod.id);
			}

			return paymentMethod;

		} catch(err) {

			console.log(err.stack)
			throw err;

		}

	}

	async getBalance(connection){

		this.balance = await models.Contact.getBalance(connection, this.id)

	}

	async getCredits(connection, property_id){

		this.Payments = await models.Payment.findOpenPaymentsByContactId(connection, this.id, property_id, ['credit', 'payment']);

		this.Payments.map(p => {
			console.log("p", p)

			p.amt_remaining = Math.round( ( p.amount - p.amount_used ) *1e2) /1e2;
			return p;
		})


	}

	async getPaymentMethods(connection, property_id, properties){
		// if(!property_id) e.th(400, "no property id set");
		this.PaymentMethods = await models.Contact.findPaymentMethods(connection, this.id, property_id, null, properties);

	}

	async getActiveLeaseById(connection){
		
		return await models.Contact.findActiveLeaseById(connection, this.id);
	}

	async getStatus(connection){

		let activeLease = await models.Contact.findActiveLeaseById(connection, this.id);

		if (activeLease.length > 0) return this.status = "tenant";

		let vacatedLease = await models.Contact.findVacatedLeaseById(connection, this.id);
		if (vacatedLease.length > 0) return this.status = "vacated";

		let reservation = await models.Reservation.findByContactId(connection, this.id);
		if(reservation.length > 0) {
			return this.status = "reserved";
		}
		let lead = await models.Lead.getLeadByContactId(connection, this.id);
		if (lead || reservation.length > 0) {
			return this.status = lead.status;
		}

		let relationship = await models.Contact.findRelationshipById(connection, this.id);
		if (relationship.length > 0) return this.status = "related contact";

		return true;
	}

	async contact_business(connection,contact_id,data){
		var contact_business_address_id = null;
		var company_address = data.company_address ? company_address = data.company_address +  ',' + data.company_address_additional_info : null;
		let address_data = {
			address: company_address,
			zip: data.company_zip,
			state :data.company_state,
			city: data.company_city
		};

		let contact_business_id = await models.Contact.getContactBusiness(connection,contact_id);
		if (contact_business_id){
			contact_business_address_id = await models.Contact.getAddressId(connection,contact_business_id);
		}

		let company_address_id = await models.Address.addAddress(connection, address_data,contact_business_address_id);
		let contact_business = {
			address_id: company_address_id,
			contact_id: contact_id,
			name: data.company_name,
			phone: data.company_phone
		};
		await models.Contact.addContactBusiness(connection,contact_business,contact_business_id);
		return this;
	}
	async contact_military(connection,contact_id,data){
		let record_exists = await models.Contact.getContactMilitary(connection,contact_id);
		var contact_military_address_id;
		var contact_military_contact_id;
		record_exists ? contact_military_address_id = record_exists.address_id : null;
		record_exists ? contact_military_contact_id = record_exists.contact_id : null;
		let address_data = {
			address: data.military_address +  ',' + data.military_address_additional_info,
			zip: data.military_zip,
			state :data.military_state,
			city: data.military_city
		};
		let military_address_id = await models.Address.addAddress(connection, address_data,contact_military_address_id);
		let contact_military = {
			address_id: military_address_id,
			contact_id: contact_id,
			email: data.military_email,
			identification_number: data.military_identification_number,
			rank: data.military_ranks,
			date_of_birth: data.military_service_member_DOB,
			service_expiration: data.military_expiration,
			first_name: data.military_contact_first_name,
			last_name: data.military_contact_last_name,
			branch: data.military_branches,
			unit_name: data.military_unit_name,
			phone: data.military_phone
		};
		await models.Contact.addContactMilitary(connection,contact_military,contact_military_contact_id);
		return true;
	}

	assembleContact(data){
		this.id = data.id;
		this.company_id = data.company_id;
		this.status = data.status;
		this.bankruptcy = data.bankruptcy;
		this.user_id = data.user_id;
		this.salutation = data.salutation;
		this.first = data.first;
		this.middle = data.middle;
		this.last = data.last;
		this.notes = data.notes;
		this.company = data.company;
		this.email = data.email;
		this.suffix = data.suffix;
		this.dob = data.dob;
		this.source = data.source;
		this.ssn = data.ssn;
		this.gender = data.gender;
		this.driver_license = data.driver_license;
		this.driver_license_exp = data.driver_license_exp;
		this.driver_license_state = data.driver_license_state;
		this.driver_license_city = data.driver_license_city;
		this.active_military = data.active_military;
		this.military_branch = data.military_branch;
		this.status = data.status;
		this.have_secondary_contact = data.have_secondary_contact;
		this.pin = data.pin;
		this.opt_out = data.opt_out;
		this.type = data.type;
		return true;
  }

	async findTenantByEmail(connection, company_id){
		if(!this.email) e.th(500, "Email not set");
		if(!company_id) e.th(500, "Company id not set");
		let data = await models.Contact.findTenantByEmail(connection, this.email, company_id);
		if (!data) e.th(404, "No tenant with that email was found in our system");
		this.assembleContact(data);
		return true;
	}

	async findAdminByEmail(connection, company_id){
		if(!this.email) e.th(500, "Email not set");
		if(!company_id) e.th(500, "Company id not set");
		let data = await models.Contact.findAdminByEmail(connection, this.email, company_id);
		if (!data) e.th(404, "No admin with that email was found in our system");
		this.assembleContact(data);
		return true;
	}

	sortLeasesFn(a,b){

		const statuses = [ 'active', 'pending', 'innactive', 'ended' ];
		if(statuses.indexOf(a.status) < statuses.indexOf(b.status)) return -1;
		if(statuses.indexOf(a.status) > statuses.indexOf(b.status)) return 1;

		if(moment(a.start_date).format('x') < moment(b.start_date).format('x')) return -1;
		if(moment(a.start_date).format('x') > moment(b.start_date).format('x')) return 1;

		return 0;
	}

	async getLeases(connection, reference_company_id, properties, active_date){

		if(!this.id) e.th(500, "Contact id not set");
		if(!this.company_id){
			this.Leases = [];
			return true;
		}

		let leases = await models.Lease.findByContactId(connection, this.id, reference_company_id, properties);


		for(let i = 0; i < leases.length; i++){
			if(leases[i].status !== 1) continue;
			if(active_date && leases[i].end_date && moment(leases[i].end_date, 'YYYY-MM-DD').format('x') < moment(active_date, 'YYYY-MM-DD').format('x')){
				continue
			}
			if(leases[i].status !== 1) continue;
			let lease = new Lease({id: leases[i].id});
			await lease.find(connection)
			await lease.findUnit(connection)
			this.Leases.push(lease);
		}

		this.Leases.sort(this.sortLeasesFn);

		return true;

	}

	async getReservations(connection, properties = []) {

		if(!this.id) throw new Error("Contact id not set");

		if(!this.company_id){
			this.Reservations = [];
			return true;
		}

		let reservation_response = await models.Reservation.findByContactId(connection, this.id, this.company_id, properties);

		for(let i = 0; i < reservation_response.length; i++){
			let reservation = new Reservation({ id: reservation_response[i].id });
			await reservation.find(connection);
			this.Reservations.push(reservation);
		}
	}

	async getPending(connection, properties = []) {

		if(!this.id) throw new Error("Contact id not set");

		if(!this.company_id){
			this.Pending = [];
			return true;
		}
		let pending_response = await models.Contact.getPending(connection, this.id,  this.company_id, properties);

		for(let i = 0; i < pending_response.length; i++){
			let lease = new Lease({ id: pending_response[i].id });
			await lease.find(connection);
			await lease.findUnit(connection)
			this.Pending.push(lease);

		}
	}

	getApplications(connection){

		return this.verifyId()
			.then(() => models.Application.findByContactId(connection, this.id))
			.mapSeries(a => {
				var application = new Application({id: a.id});
				return application.find(connection, this.company_id).then(() => {
					this.Applications.push(application);
					return true;
				})
			})
	}

	async getVehicles(connection){
		await this.verifyId();
		this.Vehicles =  await models.Contact.findVehicles(connection, this.id)
	}

	async getLocations(connection){
		let addresses =  await models.Contact.findLocations(connection, this.id);
		for(let i = 0; i < addresses.length; i++){
			addresses[i].Address = await models.Address.findById(connection, addresses[i].address_id);
			this.Addresses.push(addresses[i]);
		}
	}

	getEmployment(connection){
		return this.verifyId()
			.then(() => models.Contact.findEmployment(connection, this.id))
			.then(employment => {
				this.Employment = employment.map(e => {
					e.status = e.status.split(',');
					return e;
				});
				return true;
			})

	}

	getCompanies(connection){

		return  models.Contact.findCompanyList(connection, this.id).then( companies => {
			this.Companies = companies;
		});

	}

	async getPermissions(connection, company_id){

		let contactRoles = await models.Contact.getUserRoles(connection, this.id, company_id);

		for(let i = 0; i < contactRoles.length; i++){
			let permissions = await models.Role.findPermissions(connection, contactRoles[i].role_id)
			let properties = await models.Role.findProperties(connection, contactRoles[i].id)
			this.Permissions.push({permissions, properties})
		}

		return true;
	}

	async getRole(connection, company_id){
		let roles = await models.Contact.getUserRoles(connection, this.id, company_id);
		let role = roles.length ? roles[0] : {};
		if(!role.id) return;
		this.Role = role;
		this.role_id = role.role_id;
		this.status = role.status;
		this.pin = role.pin;
		await this.getProperties(connection, role.id);
		// await this.getPhones(connection);
		this.setRole();
	}

	async unpinInteraction(connection, interaction_id){
		return await models.Contact.unpinInteraction(connection, this.id, interaction_id);
	}

	async pinInteraction(connection, interaction_id){
		return await models.Contact.pinInteraction(connection, this.id, interaction_id);
	}

	async sendSMS (connection, phones = [], message, attachments, logged_in_user, context, owner_id, facility_id, delivery_method, primary_contact_id, lease_id, recipient_type = 'primary'){
		
		await this.getPhones(connection);
		
		let phone = {};
		let errors = [];
		
		var response = {};
		var sms_response = {};
		
		try{
			// if phones included, lets use that
			if(phones.length){
				let phone_obj = this.Phones.find(p => p.sms && phones.find(ph => ph === p.id) );
				if(phone_obj){
					phone = {
						contact_id: this.id,
						phone: phone_obj.phone
					}
				}
			} else {
				// other wise just send to all text numbers
				let phone_obj = this.Phones.find(p => p.sms && p.primary);
				if(phone_obj){
					phone = {
						contact_id: this.id,
						phone: phone_obj.phone
					}
				}
			}

			
			if(!phone || !phone.phone){
				sms_response.status = 'error';
				sms_response.message = 'SMS capable phone number not found';
			} else {

				sms_response = await sendSMS(phone.phone, message, null, owner_id, facility_id, null, true); 
			}

			let pinned = 0;
			let read = 1;
			let interaction = new Interaction();
			let space = await interaction.findSpaceByLeaseID(connection, lease_id);
			let property = await models.Property.findByGdsID(
			  connection,
			  facility_id
			);
			let property_id = 0;
			if (property) {
			  property_id = property.id;
			}			  
			await interaction.create(connection, property_id, space, this.id, logged_in_user,  message, delivery_method.id, pinned, context, read, null, null, primary_contact_id, lease_id, sms_response.notification_id, sms_response.status, recipient_type, sms_response.message);
	
			if(attachments.length){
				await interaction.saveAttachments(connection, attachments); 
			}

			let sms = new SMS({
				interaction_id: interaction.id,
				phone: phone.phone, 
				message: message
			});
			
			console.log("sms", sms)
			await sms.save(connection);


			response = sms_response; 
			response.interaction_id = interaction.id;
		

		} catch(err){
			console.log("SEND SMS ERROR", err);
			errors.push(err.msg || err.message); 			
		}
		return response;
	}


	async sendMail(connection, attachments, context, owner_id, facility_id, delivery_method, logged_in_user_id, primary_contact_id, lease_id, document_batches_deliveries_id, recipient_type = 'primary', trace_id){
    
			
		let response = {}
		let mail_response = {};
		let to = {};
		try{
			
			let address = this.Addresses && this.Addresses.find(a => a.primary);

			if(!address) {
				mail_response.status= 'error';
				mail_response.message= "There is no address on file for this recipient";
			} else {
				to = {
					id: this.id, 
					email: this.email,
					name: this.first + ' ' + this.last,
					address: {
							address1: address.Address.address,
							address2: address.Address.address2,
							city: address.Address.city,
							stateCode: address.Address.state,
							postalCode: address.Address.zip
					}
				}
			}
			
			
			if(mail_response.status != 'error'){
				mail_response = await sendMail(connection, [to], this.id, attachments, owner_id, facility_id, delivery_method.gds_key, trace_id, true);
			}


			let interaction = new Interaction();
			// save interaction
			let pinned = 0;
      		let read = 1;
			let space = await interaction.findSpaceByLeaseID(connection, lease_id);
			let property = await models.Property.findByGdsID(
			  connection,
			  facility_id
			);
			let property_id = 0;
			if (property) {
			  property_id = property.id;
			}			
			await interaction.create(connection, property_id, space, this.id, logged_in_user_id, null, delivery_method.id, pinned, context, read, null, document_batches_deliveries_id, primary_contact_id, lease_id, mail_response.notification_id, mail_response.status, recipient_type || 'primary', mail_response.message ? mail_response.message : mail_response.StatusMessage);
			
			// save Mail
			console.log("interaction", interaction)
			let mail = new Mail({
				interaction_id: interaction.id
			});
			
			await mail.save(connection);

			// save Attachments
			await interaction.saveAttachments(connection, attachments); 
			response = mail_response; 
			response.interaction_id = interaction.id;

		} catch(err){
		  console.log("err", err);
		  //error = err.msg || err;
			throw err;
		}
		
		// response.errors = errors;
		
		return response;
	  }
	
	
	async sendEmail(connection, subject,  message, attachments, logged_in_user, context, owner_id, facility_id, delivery_method, primary_contact_id, lease_id, document_batches_deliveries_id, recipient_type = 'primary', trace_id, cc = {}){
		let response = {}
		let email_response = {}
		try{
			console.log("Sending Email")
			
			let address = {};
			 
			if (!this.email){
				email_response.status = 'error';
				email_response.message = "This customer does not have a valid email address on file";
			}
			let cc_emails = []

			if(cc && (cc.include_alternate || cc.include_lien)){

				if(!this.Relationships?.length){
					await this.getRelationships(connection);
				}
                if(cc.include_alternate){
                    let alternate = this.Relationships.find(r => r.is_alternate);
                    if(alternate){
                        cc_emails.push({
                            name: alternate.Contact.first + ' ' + alternate.Contact.last, 
                            email: alternate.Contact.email
                        });
					} 
					// else {
					// 	email_response.status = 'error';
					// 	email_response.message = email_response.message || '';
					// 	email_response.message += " Alternate contact not found. ";
					// }
                }
            
                if(cc.include_lien){
                    let lien = this.Relationships.find(r => r.is_lien_holder);
                    if(lien){
                        cc_emails.push({
                            name: lien.Contact.first + ' ' + lien.Contact.last, 
                            email: lien.Contact.email
                        });
					} 
					// else {
					// 	email_response.status = 'error';
					// 	email_response.message = email_response.message || '';
					// 	email_response.message += " Lien holder not found.";
					// }
                }
            }
		
			let to = {
				name: this.first + " " + this.last,
				email: this.email,
				address: address
			}
			if(!email_response.status){
				email_response = await sendEmail(connection, [to], this.id, null, subject, message, attachments, owner_id, facility_id, cc_emails, delivery_method.gds_key, false, trace_id, true);
			}
			console.log("email_response", email_response)
		
			
			let interaction = new Interaction();

			let pinned = 0;
      		let read = 1;

			if (email_response.status === 'success') {
				email_response.status = 'sent'
			}
			let space = await interaction.findSpaceByLeaseID(connection, lease_id);
			let property = await models.Property.findByGdsID(
			  connection,
			  facility_id
			);
			let property_id = 0;
			if (property) {
			  property_id = property.id;
			}					
			await interaction.create(connection, property_id, space, this.id, logged_in_user, message, delivery_method.id, pinned, context, read, null, document_batches_deliveries_id, primary_contact_id, lease_id, email_response.notification_id, email_response.status, recipient_type, email_response.message);
			let email = new Email({
				interaction_id: interaction.id,
				reject_reason: email_response.status === 'error' ? email_response.message: null,
				email_address: to.email,
				message: message,
				subject: subject,
				clicked: false
			});
			
			await email.save(connection);

			if(attachments.length){
				await interaction.saveAttachments(connection, attachments); 
			} 
			response = email_response; 
			response.interaction_id = interaction.id;

		} catch(err){
			console.log("SEND MAIL ERROR", err);
			//let error = err.msg || err;
			throw err;
			// save errors to delivery methods; 
		}
		// response.error = error;
		return response;
	
	}



	async assembleCCs(connection, include_alternate, include_lien, method){
		if(!include_alternate && !include_lien) return [];
		if(!this.Relationships.length){
			// get alternate
			await this.getRelationships(connection); 
		}
		let cc = this.Relationships.filter(r => {
			if(include_alternate && !!r.is_alternate)  return true;
			if(include_lien && !!r.is_lien_holder)  return true;
			return false;
		}).map(c => {
			let type = c.is_alternate ? 'alternate' : 'lien' 
			let rc = {
				is_alternate: c.is_alternate,
				is_lien_holder: c.is_lien_holder,
				name: `${c.Contact.first} ${c.Contact.last}`,	
				error: false,
			}
			if(method === 'mail'){
				let rc_address_record = c.Contact.Addresses.find(a => a.primary)
				if(rc_address_record){
					rc.address = {
						address1: rc_address_record.Address.address,
						address2: rc_address_record.Address.address2,
						city: rc_address_record.Address.city,
						stateCode: rc_address_record.Address.state,
						postalCode: rc_address_record.Address.zip
					};
				} else {	
					rc.error =  `${type} ${c.Contact.first} ${c.Contact.last} does not have a primary address.`; 
				}
			} else if(method === 'email') {
				if(c.Contact.email){
					rc.email = c.Contact.email
				} else {
					rc.error =  `${type} ${c.Contact.first} ${c.Contact.last} does not have a valid email.`;
				}
			} else if (method === 'phone') {
				rc.phones = [];
				for(let j = 0; j < c.Contact.Phones.length; j++){
					rc.phones.push({
						contact_id: c.Contact.id,
						phone: c.Contact.Phones[j].phone
					}); 
				}
			}
			return rc; 
		}); 

		if(include_alternate && !cc.find(c => c.is_alternate )){
			cc.push({
				error: "Alternate contact not found",
			})
		}
		if(include_lien && !cc.find(c => c.is_lien_holder )){
			cc.push({
				error: "Lien holder not found",
			})
		}
		return cc;
	}


	async getProperties(connection, company_role_id){

		let properties = await models.Contact.getRoleProperties(connection, company_role_id);
		for(let i = 0; i < properties.length; i++){
			this.Properties[i] = new Property({id: properties[i].property_id});
			await this.Properties[i].find(connection);
		}
	}

	async saveAllRoles(connection, company_id){

		await this.getCompanies(connection);

		let existing_roles = this.Companies.find(c => c.id === company_id);

		if(existing_roles){
			e.th(409, "This user is already an admin on this company.");
		}

		let roles = await models.Role.findByCompany(connection, company_id);

		if(!roles.length) e.th(400, "Please create a default role to add this user to");
		let default_role = roles.find(r => r.is_default);
		if(!default_role) e.th(400, "Please create a default role to add this user to");
		let data = {
			company_id: company_id,
			contact_id: this.id,
			role_id: default_role.id
		};

		await models.Contact.saveContactRole(connection, data);

	}

	async updateRole(connection, company_id, role_id, properties, pin, status){
		await this.getRole(connection);
		var data = {
			contact_id: this.id,
			company_id: company_id,
			role_id: role_id,
			pin,
			status
		}


		let result = await models.Contact.saveContactRole(connection, data,  this.Role.id);
		let contact_role_id = this.Role.id? this.Role.id :  result.insertId;

		await models.Role.deleteProperties(connection, properties, contact_role_id );

		for(let i = 0; i < properties.length; i++){
			if(this.Properties.find(property => property.id === properties[i].id)) continue;
			let contact_prop = {
				property_id: properties[i].id,
				company_contact_role_id: contact_role_id
			}
			console.log("this.contact_prop", contact_prop);
			await models.Role.saveProperty(connection, contact_prop );
		}
	}

	setRole(){

		if(this.Role.id){
			this.role = 'admin';
		}
		if(this.Leases && this.Leases.length){
			this.role = 'tenant';
		}
		return true;
		//if (this.role != 'admin' && this.role != 'tenant') e.th(403, "Not authorized");
	}

	addPhone(phone){

		if(!phone.phone) return true;
		this.Phones.push({
			id: phone.id || null,
			type: phone.type,
			phone: phone.phone.toString().replace(/\D/g,''),
			sms: phone.sms || 0
		});
	}

	addLocation(address){
		if(!address.address) return true;
		this.Addresses.push(address);
	}

	async saveAsAlternate(connection) {
		await this.validate();

		let save = {
			first: this.first,
			last: this.last,
			email: this.email,
			company_id: this.company_id
		};



		let contactRes = await models.Contact.save(connection, save, this.id);

		if(!this.id) this.id = contactRes.insertId;

		this.Phones = this.Phones || [];
		let phone_ids = this.Phones.filter(p => p.id).map(p => p.id).join(',');

		await models.Contact.removePhones(connection, this.id, phone_ids.replace(/,\s*$/, ""));

		for(let i =0 ; i < this.Phones.length; i++){
			let p = this.Phones[0];
			if(!p.phone) continue;
			let phoneSave = {
				contact_id: this.id,
				type: p.type || 'primary',
				phone: p.phone.toString().replace(/\D+/g, ''),
				sms: p.sms || 0
			};

			await models.Contact.savePhone(connection, phoneSave, p.id);
		}

		for(let i =0 ; i < this.Phones.length; i++){
			let p = this.Phones[0];
			if(!p.phone) continue;
			let phoneSave = {
				contact_id: this.id,
				type: p.type || 'primary',
				phone: p.phone.toString().replace(/\D+/g, ''),
				sms: p.sms || 0
			};

			await models.Contact.savePhone(connection, phoneSave, p.id);
		}

	}

	async save(connection){

		if(!connection) e.th(500, "Connection not set");

		this.ssn = this.ssn ? String(this.ssn) : null;

		await this.validate();

		let save = {
			user_id:                    this.user_id,
			company_id:                 this.company_id,
			salutation:                 this.salutation,
			first:                      this.first,
			middle:                     this.middle,
			last:                       this.last,
			notes:                      this.notes,
			company:                    this.company,
			suffix:                     this.suffix,
			email:                      this.email,
			dob:                        this.dob || null,
			ssn:                        this.ssn ? this.ssn.replace(/\D+/g, '') : null,
			source:                     this.source,
			gender:                     this.gender || null,
			driver_license:             this.driver_license,
			driver_license_exp:			this.driver_license_exp,
			driver_license_city:		this.driver_license_city,
			driver_license_state:		this.driver_license_state,
			active_military:            this.active_military || 0,
			military_branch:            this.military_branch
		};

		let contactRes = await models.Contact.save(connection, save, this.id);

		if(!this.id) this.id = contactRes.insertId;

		this.Phones = this.Phones || [];

		let phone_ids = this.Phones.filter(p => p.id).map(p => p.id).join(',');

		await models.Contact.removePhones(connection, this.id, phone_ids.replace(/,\s*$/, ""))

		for(let i = 0; i< this.Phones.length; i++){
			let p = this.Phones[i];
			if(!p.phone) continue;

			let phoneSave = {
				contact_id: this.id,
				type: p.type || 'primary',
				phone: p.phone.toString().replace(/\D+/g, ''),
				sms: p.sms || 0
			}

			await models.Contact.savePhone(connection, phoneSave, p.id)
		}

		this.Addresses = this.Addresses || [];
		let address_ids = this.Addresses.filter(a => a && a.id).map(a => a.id).join(',');
		await models.Contact.removeLocations(connection, this.id, address_ids.replace(/,\s*$/, ""));


		for(let i = 0; i< this.Addresses.length; i++){
			let a = this.Addresses[i];
			if(!a || !a.Address || !a.Address.address) continue;

			let address = {
				address: a.Address.address,
				address2: a.Address.address2,
				city: a.Address.city,
				state: a.Address.state,
				zip: a.Address.zip
			}

			try{
				address.id = await models.Address.findOrSave(connection, address);
			} catch(err){
				e.th(400, err);

			}


			if(!address.id) e.th(500, "Invalid Address");


			let addressSave = {
				contact_id: this.id,
				type: a.type || 'primary',
				number: a.number,
				move_in: a.move_in,
				move_out: a.move_out,
				rent: a.rent,
				reason: a.reason,
				landlord: a.landlord,
				phone: a.phone ? a.phone.replace(/\D+/g, ''):null,
				address_id: address.id
			}
			await models.Contact.saveLocation(connection, addressSave, a.id)
		}



		let employment_ids = this.Employment.filter(e => e.id).map(e => e.id).join(',');
		await models.Contact.removeEmployment(connection, this.id, employment_ids.replace(/,\s*$/, ""))
		for(let i = 0; i < this.Employment.length; i++){
			let e = this.Employment[i];
			e.sort = i;
			e.contact_id = this.id;
			e.salary = e.salary || null;
			await models.Contact.saveEmployment(connection, e, e.id);
		}



		let vehicle_ids = this.Vehicles.filter(v => v.id).map(v => v.id).join(',');
		await models.Contact.removeVehicles(connection, this.id, vehicle_ids.replace(/,\s*$/, ""))
		for(let i = 0; i < this.Vehicles.length; i++){
			let v = this.Vehicles[i];
			v.sort = i;
			v.contact_id = this.id;
			if(v && v.RegisteredAddress && v.RegisteredAddress.address){
				let address = {
					address: v.RegisteredAddress.address,
					city: v.RegisteredAddress.city,
					state: v.RegisteredAddress.state,
					zip: v.RegisteredAddress.zip
				}
				v.registered_address_id = await  models.Address.findOrSave(connection, address)
			}
			let data = Object.assign({}, v);
			delete data.RegisteredAddress;
			await models.Contact.saveVehicles(connection, data, data.id);

		}

		this.Relationships = this.Relationships || [];
		for(let i = 0; i < this.Relationships.length; i++){
			let r = this.Relationships[i];

			if(!r.Contact || !r.Contact.first || !r.Contact.last) continue;

			let alternate = new Contact(r.Contact);

			alternate.company_id = this.company_id;

			await alternate.save(connection);

			await this.saveRelationship(connection, {
				related_contact_id: alternate.id,
				type:  r.type,
				is_cosigner: r.is_cosigner || 0,
				is_emergency: r.is_emergency || 0,
				is_military: r.is_military || 0,
				is_authorized: r.is_authorized || 0,
				is_lien_holder: r.is_lien_holder || 0,
				lease_id: r.lease_id || null,
			},  r.id)

		}

	}

	saveRelationship(connection, params, relationship_id ){

		params.contact_id = this.id;
		return models.Contact.saveRelationship(connection, params, relationship_id)

	}

	getContactRelationships(connection, lease_id){
		return models.Contact.findAlternate(connection,this.id, lease_id);
	}

	async getRelationships(connection, lease_id){
		await this.verifyId();

		let related_contacts = await models.Contact.findAlternate(connection, this.id, lease_id);
		
		for(let i=0; i < related_contacts.length; i++){
			related_contacts[i].Contact = new Contact({id: related_contacts[i].related_contact_id});
			await related_contacts[i].Contact.find(connection, this.company_id);
			await related_contacts[i].Contact.getLocations(connection);
			await related_contacts[i].Contact.getPhones(connection);
		}
		this.Relationships = related_contacts;
		
	}

	async validate(){

		if(!this.first) e.th(422, 'Please enter a first name');
		if(!this.last) e.th(422, 'Please enter a last name');
		if(this.email && !validator.isEmail(this.email)) e.th(422, 'Please enter a valid email address');

		if(this.ssn){
			let stripped1 = validator.whitelist(this.ssn.toString(), "01233456789");
			if(this.ssn && !validator.isLength(stripped1, { min:9, max:9 } )) {
				e.th(422, 'You have entered an invalid SSN');
			};
		}

		if(this.Phones && this.Phones.length){
			this.Phones.map(p => {
				let stripped2 = validator.whitelist(p.phone.toString(), "01233456789+x");
				if(p.phone && !validator.isLength(stripped2, {min: 9, max: 12}))  {
					e.th(422, "The phone number you entered is not valid");
				};
			});
		}

		return Promise.resolve();


	}

	update(data){

		if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';
		if(typeof data.first !== 'undefined') this.first = data.first || '';
		if(typeof data.middle !== 'undefined') this.middle = data.middle || '';
		if(typeof data.last !== 'undefined') this.last = data.last || '';
		if(typeof data.suffix !== 'undefined') this.suffix = data.suffix || '';
		if(typeof data.email !== 'undefined') this.email = data.email || '';
		if(typeof data.notes !== 'undefined') this.notes = data.notes || '';
		if(typeof data.company !== 'undefined') this.company = data.company || '';
		if(typeof data.dob !== 'undefined') this.dob = data.dob || '';
		if(typeof data.ssn !== 'undefined'){
			this.ssn = data.ssn ? data.ssn.replace(/[^0-9]/g, ''): null;
		}
		if(typeof data.gender !== 'undefined') this.gender = data.gender || '';
		if(typeof data.source !== 'undefined') this.source = data.source || '';
		if(typeof data.driver_license !== 'undefined') this.driver_license = data.driver_license || '';
		if(typeof data.driver_license_exp !== 'undefined') this.driver_license_exp = data.driver_license_exp || '';
		if(typeof data.driver_license_state !== 'undefined') this.driver_license_state = data.driver_license_state || '';
		if(typeof data.driver_license_city !== 'undefined') this.driver_license_city = data.driver_license_city || '';
		if(typeof data.active_military !== 'undefined') this.active_military = data.active_military || '';
		if(typeof data.military_branch !== 'undefined') this.military_branch = data.military_branch || '';
		if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';

		if(typeof data.Phones !== 'undefined') this.Phones = data.Phones || '';

		if(typeof data.Addresses !== 'undefined') {
			this.Addresses = data.Addresses.map(a => {
				a.move_in = a.move_in ? moment(a.move_in).format('YYYY-MM-DD') : null;
				a.move_out = a.move_out ? moment(a.move_out).format('YYYY-MM-DD') : null;
				a.rent = a.rent || null;
				return a;
			});
		}

		if(typeof data.Relationships !== 'undefined') {
			this.Relationships = data.Relationships || ''
		};

		if(typeof data.Vehicles !== 'undefined'){
			this.Vehicles = data.Vehicles.map(v => {
				v.year = v.year || null;
				v.width = v.width || null;
				v.length = v.length || null;
				v.value = v.value || null;
				v.registration_exp = v.registration_exp || null;
				v.horsepower = v.horsepower || null;
				return v;
			});
		}

		if(typeof data.Employment !== 'undefined') {
			this.Employment = data.Employment.map(e => {
				e.end_date = e.end_date || null;
				e.status = e.status.join(',');
				return e;
			});
		}


	}

	static async getMultipleById(connection, data, properties, company_id){
		return await models.Contact.getMultipleById(connection, data, properties, company_id);
	}

	// response(){
	//
	// 	var _this = this;
	// 	var s = {
	// 		id :                      _this.id,
	// 		user_id :                 _this.user_id,
	// 		company_id :              _this.company_id,
	// 		salutation :              _this.salutation,
	// 		first :                   _this.first,
	// 		middle :                  _this.middle,
	// 		last :                    _this.last,
	// 		suffix :                  _this.suffix,
	// 		company :                 _this.company,
	// 		email :                   _this.email,
	// 		source :                  _this.source,
	// 		dob :                     _this.dob,
	// 		ssn :                     _this.ssn? _this.ssn.toString(): null,
	// 		gender :                  _this.gender,
	// 		driver_license :          _this.driver_license,
	// 		active_military :         _this.active_military,
	// 		military_branch :         _this.military_branch
	// 	};
	// 	s.Phones = _this.Phones;
	// 	s.Addresses = _this.Addresses;
	// 	s.Leases = _this.Leases;
	// 	s.Relationships = _this.Relationships;
	//
	// 	return s;
	//
	// }

	findDuplicateTenant(connection, email, company_id){

		var cid = this.company_id || company_id || null;
		if(!cid) throw "Company id not set";

		return models.Contact.findTenantByEmail(connection, email, cid, this.id).then(c => {
			if(c){
				var error = new Error("A tenant with this email address already exists. If you want to add this contact to a new lease, please submit the contact ID along with the request");
				error.code = 409;
				throw error;
			}
		})
	}

	verifyId(){
		if(!this.id) e.th(500, "Contact id not set");
		return Promise.resolve();
	}

	async verifyUniqueTenantOnLease(connection, lease_id){

		if(!this.id) e.th(500, "Contact id not set");

		let tenants = await  models.Contact.verifyUniqueTenantOnLease(connection, this.id, lease_id);


		if(tenants.length) e.th(409, 'This tenant already exists');


	}

	async findTenantId(connection, lease_id){
		if(!this.id) e.th(500, "Contact id not set");
		let tenants = await  models.Contact.verifyUniqueTenantOnLease(connection, this.id, lease_id);
		return tenants.length ? tenants[0].id : null;
	}

	verifyAccess(company_id){
		console.log("this.company_id", this.company_id);
		console.log("company_id", company_id);
		console.log("role", this.role);

		if(this.company_id && this.company_id !== company_id){
			e.th(403);
		} else if(!this.company_id && this.role !== 'admin'){ //TODO add check for properties here
			e.th(403);
		}
	}

	sendWelcomeEmail(connection, company_id, type){


		if(!this.id) throw "Contact not found";
		var data = {
			category: 'welcomeEmail',
			data: {
				id: this.id,
				action: 'email',
				label: this.user_id ? 'newLease': 'setup',
				company_id: company_id
			}
		}

		return new Promise((resolve, reject) => {
			Scheduler.addJobs([data], function(err) {
				if (err) return reject(err);
				return resolve();
			});
		})

	}

	async findAccessCredentials(connection, property){
		if(!property.Access) {
			await property.getAccessControl(connection);
		}
		let access = await property.Access.getUser(this.id);
		this.Access = access;
	}

	async getAccessCredentialsById(connection, access_id){
		await this.verifyId();

		let creds = await models.Contact.findAccessCredentialsById(connection, access_id);
		if(!creds) e.th(404);
		if(creds.contact_id !== this.id) e.th(403);
		return creds;

	}

	async buildAllAccessCredentials(connection, company_id, properties){

		await this.verifyId();

		await this.getLeases(connection, company_id, properties);
		if(!this.Leases.length){
			return false;
		}

		const unique = [...new Set(this.Leases.map(l => l.Unit.property_id))];

		let access_list = [];

		for(let i = 0; i < unique.length; i++ ){

			let property = new Property({id: unique[i]});
			await property.find(connection);
			await property.verifyAccess(company_id, properties);
			await property.getAddress(connection);

			await this.findAccessCredentials(connection, property);

			let access = {
				access_id: property.Access.access_id,
				contact_id: this.id,
				property_id: property.id
			};

			if(this.Access){
				access = {
					...access,
					id: this.Access.id,
					pin: this.Access.pin,
					status: this.Access.status === 'ACTIVE'? 1 : 0,
					Spaces: this.Access.Spaces,
				};
			}

			access.Property = property;
			access.Access = property.Access.Credentials;
			access_list.push(access);

		}
		return access_list;
	}

	async saveAccess(connection, property, body, lease){
		console.log('Finding the Access to specific user');
    	await this.findAccessCredentials(connection, property);
    	console.log('The Access to specific user =>', JSON.stringify(this.Access));

    	if(property && property.Access && body && body.pin) await property.Access.validateCode(body.pin, this.id);

    	if(!this.Phones?.length) {
			await this.getPhones(connection);
		}

    	console.log('Access: Contact Phones ', this.Phones);

    	let has_access = true;
		if(lease){
			let today = moment().format('YYYY-MM-DD');
			has_access = lease.end_date === null || moment(lease.end_date) > moment(today);
		}

		if(has_access){
			if(this.Access) {
				console.log('Updating User with body =>', JSON.stringify(body));
				await property.Access.updateUser(this, body);
		  } else {
				console.log('Creating User with body =>', JSON.stringify(body));
				await property.Access.createUser(this, body);
		  }
  
		  console.log('Setting access to user to specific space');
		  if(lease){
				console.log('Setting access to user to specific space with lease =>',JSON.stringify(lease));
				await property.Access.updateUserSpace(this, lease, body);
		  }
		}
	}

	creditCheckEmploymentStatus(){

		if(!this.Employment.length) return "Other";
		if(this.Employment[0].end_date != null) return "Other";
		if(this.Employment[0].status.indexOf('Full Time') >= 0) return 'Full Time';
		if(this.Employment[0].status.indexOf('Part Time')  >= 0) return 'Part Time';
		if(this.Employment[0].status.indexOf('Student') >= 0 ) return 'Student';
		if(this.Employment[0].status.indexOf('Retired') >= 0) return 'Retired';
		return "Other";

	}

	makeAdmin(data){

		this.company_id = null;
		this.first = data.first;
		this.last = data.last;
		this.email = data.email;

		this.addPhone({
			phone: data.phone,
			type: 'primary',
			sms: true
		})
	}

	static async checkExisting(connection, params, company_id){

		if(params.email) {
			let found = await models.Contact.findAllByEmail(connection, params.email, company_id);
			if(found.length){
				for(let j=0; j<found.length; j++){
					if(found[j].first.toLowerCase() === params.first.toLowerCase() && found[j].last.toLowerCase() === params.last.toLowerCase()){
						return found;
					}
				}
			}
			return;
		}

		if(params.Phones.length) {
			for(let i = 0; i < params.Phones.length; i++){
				if(!params.Phones[i]) continue;
				let found = await models.Contact.findByPhone(connection, params.Phones[i].phone, company_id);
				if(found.length){
					for(let j=0; j < found.length; j++){
						if(found[j].first.toLowerCase() === params.first.toLowerCase() && found[j].last.toLowerCase() === params.last.toLowerCase()){
							return found;
						}
					}
				}
				return
			}
		}

		if(!params.email && !params.Phones.length){
			let found = await models.Contact.findAllByName(connection, params.first, params.last, company_id);
			if(found.length){
				for(let j=0; j<found.length; j++){
					if(found[j].first.toLowerCase() === params.first.toLowerCase() && found[j].params.toLowerCase() === params.last.toLowerCase()){
						return found;
					}
				}
			}
		}
	}

	static async checkForExisting(connection, params, company_id){

		if(params.email){
			return  await models.Contact.findAllByEmail(connection, params.email,company_id, params.id)
		} else if(params.phone){
			return await models.Contact.findByPhone(connection, params.phone, company_id, params.id)
		} else if(params.first && params.last){
			return await models.Contact.findAllByName(connection, params.first, params.last, company_id, params.id)
		} else {
			e.th(400, "No data to search on");
		}

	}

	static async omniSearch(connection, params, company_id){
		return await models.Contact.omniSearch(connection, params, company_id)
	}

	static async searchWithAnyLease(connection, params, company_id, properties){
		return await models.Contact.searchWithAnyLease(connection, params, company_id, properties);
	}

	static async searchWithActiveLease(connection, params, company_id, properties){

		return await models.Contact.searchWithActiveLease(connection, params, company_id, properties);
	}

	static async findAdminByEmail(connection, email){
		return await models.Contact.findAdminByEmail(connection, email)
	}

	static async findAdminsByCompanyId(connection, company_id){
		return await models.Contact.findAdminsByCompanyId(connection, company_id)
	}

	static async findAdminsByPropertyId(connection, property_id, company_id){
		return await models.Contact.findAdminsByPropertyId(connection, property_id ,company_id)
	}


	static async validateAdminEmail(connection, email){
		let existing_contact =  await models.Contact.findAllByEmail(connection, email);

		if(existing_contact.length){
			e.th(409,"This email already exists in our system. Please use a different email address.");
		}

	}

	async isOnLease(connection, lease_id){

		let check = await models.Contact.isOnLease(connection, lease_id, this.id);
		return !!check.length;

	}

	async getInteractions(connection, conditions, searchParams){
		if(!this.id) e.th(500, "Contact id not set");
		if(!this.company_id){
			this.Interactions = [];
			return true;
		}

		let interactions = await models.Interaction.findAllInteractionsByContactId(connection, this.id, conditions, searchParams);

		for (let i = 0; i < interactions.length; i++) {


			let interaction = new Interaction(interactions[i]);
			await interaction.findContact(connection);
			await interaction.findEnteredBy(connection, this.company_id);
			await interaction.findPhoneCall(connection);
			await interaction.findEmail(connection);

			this.Interactions.push(interaction);
		}




		return true;
	}

	async getInteractionsCount(connection, conditions){
		if(!this.id) e.th(500, "Contact id not set");

		let count = await models.Interaction.findByContactId(connection, this.id, conditions, null, true);
		this.InteractionsCount = count[0].count;
		return true;
	}


	async parsePayNow(connection, message, property_id, company, type = 'email'){

		// Find paynow text  save location and string length
		var patt = /\[PayNow\]/i;
		var patt2 = /\[\/PayNow\]/i;
		let match1 = message.match(patt);
		if(!match1) return;
		let match2 = message.match(patt2);
		if(!match2) return;

		//let string_length = match2.index - match1.index;
		let  start  = '[PayNow]';
		let  end  = '[/PayNow]';
		let link = '';
		try {
			link = await this.getPayNowLink(connection, property_id, company);
		} catch(err) {
			return message;
		}
		console.log("link", link);
		try {

			const middleText = message.split(start)[1].split(end)[0];
			let encrypted = '';
			console.log(type);
			if(type === 'email'){
				return  message.substring(0, match1.index) + '<a href="' + link +'">' +  middleText + '</a>' +  message.substring(match2.index + end.length);
			}
			if(type === 'sms'){
				return  message.substring(0, match1.index) + ' ' + link + ' ' +  message.substring(match2.index + end.length);
			}


		} catch(err) {
			return message;

		}


		// get pay now link
		// replace paynow text with html.
		return message;

	}

	async getPayNowLink(connection, property_id, company){

		if(!property_id){
			await this.getLeases(connection);
			if(!this.Leases.length) e.th(400, "This contact has no active leases.");
			await this.Leases[0].getProperty(connection);
			property_id = this.Leases[0].Property.id;
		}


		var shipment = {
			contact_id: this.id,
			property_id: property_id,
			fn: 'pay bill',
			requested: moment.utc(),
			expiry: moment().utc().add(48, 'hours'),
			domain: company.subdomain
		};
		let cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		let encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');
		return settings.getBaseUrl(company.subdomain) + '/pay-now/' + encrypted;
	}


	// TODO finish
	async delete(connection){
		if(!this.id) e.th(400, "Contact id not set");

		return true;

		// if admin, remove roles.

		// await models.Contact.delete(connection, this.id)

	}

	async savePhone(connection){

		if(!connection) e.th(500, "Connection not set");


		this.Phones = this.Phones || [];

		let phone_ids = this.Phones.filter(p => p.id).map(p => p.id).join(',');

		await models.Contact.removePhones(connection, this.id, phone_ids.replace(/,\s*$/, ""))

		for(let i = 0; i< this.Phones.length; i++){
			let p = this.Phones[i];
			if(!p.phone) continue;

			let phoneSave = {
				contact_id: this.id,
				type: p.type || 'primary',
				phone: p.phone.toString().replace(/\D+/g, ''),
				sms: p.sms || 0
			}

			await models.Contact.savePhone(connection, phoneSave, p.id)
		}

	}


	async updateStatus(connection){

		let status;

		if(this.bankruptcy) {
			status = 'Bankruptcy';
		} else {

			try{
				let leases = await models.Lease.findByContactId(connection, this.id, this.company_id);
				if(leases){
					status = "Lease Closed";
					for( let i=0 ; i < leases.length; i++){
						if (leases[i].status === 0) continue;
						let lease = new Lease(leases[i])
						await lease.find(connection);
						await lease.getStanding(connection);

						let name = lease.Standing.name || 'Current';
						console.log("name", name);
						if(!status || status_priority[name] > status_priority[status]){
							status = name;
						}
						console.log("status", status);
					}
				} else {
					let lead = await models.Lead.getLeadByContactId(connection, this.id);
					switch(lead.status.toLowerCase()){
						case "retired":
						case "deleted":
							status = 'Retired Lead';
							break;
						default:
							status = 'Active Lead';
					}
				}
			} catch(err) {
				//TODO Log error -
			}

		}

		await models.Contact.updateContactStatus(connection, this.id, status);
		this.status = status;



	}

	static async searchWithDelinquentLeases(connection,company_id){
		return await models.Contact.searchWithDelinquentLeases(connection,company_id)
	}

	async reconcile(connection, property_id, invoices = [], dryrun) {
		let payments = [];

		let open_payments = await models.Payment.findOpenPaymentsByContactId(connection, this.id, property_id, { types: ['payment'], sort_by_created : true});
		if(open_payments && open_payments.length) payments.push(...open_payments);

		let credits = await models.Payment.findOpenPaymentsByContactId(connection, this.id, property_id, { types: ['credit'], sort_by_created : true});
		if(credits && credits.length) payments.push(...credits);

		if(!invoices.length){
			invoices = await models.Contact.findOpenInvoices(connection, this.id, property_id);
		}
		let startInvoiceIndex = 0;
		let leases = [];
		let invoice_list = [];
		let payment_list = [];
		for(let i = 0; i < payments.length; i++){
			let payment = new Payment({id: payments[i].id});
            await payment.find(connection);
            console.log("payments number", i);
            await payment.getPaymentApplications(connection);
			let payment_remaining = payment.payment_remaining;
			let invoicesToApply = [];

			 for(let j = startInvoiceIndex; j < invoices.length; j++){
			 	let invoice = new Invoice(invoices[j]);
             	await invoice.find(connection);
			 	await invoice.total();
			//
				console.log("j", j);
				console.log("startInvoiceIndex", startInvoiceIndex);
			//
			 	if(invoice.balance <= payment_remaining){
					invoice.amount = invoice.balance;
					payment_remaining -= invoice.balance;
					startInvoiceIndex++;
			 	} else {
					invoice.amount = payment_remaining;
					payment_remaining = 0;
			 	}
			//
				invoicesToApply.push(invoice);
			//
			 	if (leases.indexOf(invoice.lease_id) === -1) {
					leases.push(invoice.lease_id);
			 	}
			 	console.log("payment_remaining", payment_remaining);
			 	if(!payment_remaining) break;
			 }

			console.log("invoicesToApply", invoicesToApply.length);
			if(invoicesToApply.length && !dryrun){
				await payment.applyToInvoices(connection, invoicesToApply);
				payment_list = payment_list.concat(payment.invoicesPayment);
			}


			invoice_list = invoice_list.concat(invoicesToApply);

			if(startInvoiceIndex === invoices.length) break;
		}
		console.log("reconcile end");
		leases = leases.map(l_id => { return { id: l_id }});

		return { leases, invoice_list, payment_list };
	}


	async getDelinquencies(connection, properties){
    
		this.Delinquencies = [];
	
		let leases = await models.Delinquency.getDelinquentLeasesByContactId(connection, this.id, properties);
		
		for(let i = 0; i < leases.length; i++){
		
		  let delinquency = new Delinquency({lease_id: leases[i].lease_id});
		
		  try {
		
			await delinquency.find(connection);
			await delinquency.findLease(connection);
			await delinquency.findActions(connection);
			delinquency.formatTimeline();
			
			this.Delinquencies.push(delinquency);
		
		  } catch(err){
			console.log(err);
			continue; 
		  }
		}
	}

	async updateAccessStatus(connection, payload) {
		const { property } = payload;
		await this.findAccessCredentials(connection, property);
		try {
			if (this.Access && this.Access.status === 'SUSPENDED') {
				await property.Access.restoreUser(this.id);
			}
		} catch(err) {
			console.log('Err in access update ', err);
		}
   	}

	async findBalance(connection, payload) {
		const result = await models.Billing.findBalance(connection, {
			contact_id: this.id,
			...payload
		});

		this.balance = result.balance;
		return this.balance;
	}
}

module.exports = Contact;
var Company      = require('../classes/company.js');
var Lease      = require('../classes/lease.js');
var Address      = require('../classes/address.js');
var Application      = require('../classes/application.js');
var Property      = require('../classes/property.js');
var Reservation      = require('../classes/reservation.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Delinquency 	= require(__dirname + '/../classes/delinquency.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Role = require(__dirname + '/../classes/role.js');
var SMS = require(__dirname + '/../classes/sms.js');
var Email = require(__dirname + '/../classes/email.js');
var Mail = require(__dirname + '/../classes/mail.js');
var { sendSMS } = require('./../modules/sms');
var { sendEmail, sendMail } = require('./../modules/mail');
const Enums = require(__dirname + '/../modules/enums');