"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var { findCommonElements, cleanPhoneNumber } = require('../modules/utils');
const cmsManager = require(__dirname + '/../modules/cms_manager.js');
var crypto      = require('crypto');
var db = require(__dirname + '/../modules/db_handler.js');
var Enums = require(__dirname + '/../modules/enums.js');
var roles = [];

const status_priority = {
  "Active Lead": 0,
  "Retired Lead": 1,
  "Lease Closed": 2,
  "Pending": 3,
  "Suspended": 4,
  "Current": 5,
  "Delinquent": 6,
  "Gate Lockout": 7,
  "Active Lien": 8,
  "Auction":9,
  "Balance Due": 10,
  "Bankruptcy": 11,
}

class Contact {

  constructor(data){

    data = data || {};

    this.assembleContact(data);
    this.gdsOwnerId = "";

    this.roles = []; 
    this.Roles = [];
    //this.Role = {};
    // this.military = {};

    if(data.User) this.User = data.User;

    this.user_name = "";
    // this.status = "";
    // this.bankruptcy = "";
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
    this.NonHbProperties = data.nonHbProperties || [];
    this.Military = data.Military || {
      Phone: {},
      Address:{}, 
      CommandingOfficer:{
        Phone:{}
      }
    };
    this.Business = data.Business || {};
    this.Touchpoints = [];
    this.Delinquencies = [];
    this.Token = {};
    this.pin = "";
    this.ActiveLead = {};
    this.Leads = [];
    this.Notes = [];
    this.permission_properties = [];
    this.RolesProperties = [];
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
    
  }

  async getContactDetails(connection, api){
    if(!this.id) e.th(500, "Id not set");
    await this.getPhones(connection, api);
    await this.getLocations(connection);
    await this.getRelationships(connection);
    await this.getVehicles(connection);
    await this.getEmployment(connection);
    await this.findBusinessInfo(connection);
    await this.findMilitaryInfo(connection);
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
        contact_id:military_info.contact_id,
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

  async getPhones(connection, api){
    var formatPhone = api && api.id? true: false;
    let phones = await models.Contact.findPhones(connection, this.id);
    if(!phones.length) return;
    this.Phones = phones.map(p => {
      p.sms = !!p.sms,
        p.phone = formatPhone? p.phone && p.phone.length === 10? `+1${p.phone}`: `+${p.phone}`: p.phone
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

 /**
 * Used to save user verification details from message bus event
 * @param {Object} connection Connection details
 * @param {Object} contact contact details
 * @param {Object} data from messagebus event
 **/
  async updateUserVerification(connection, contact, data) {
    try {
      let contactId = contact?.id?.id;
      let contactEmail = contact?.id?.email;
      let email = data?.email;
      let phoneNumber = data?.phone.toString().replace(/\D+/g, '');

      if (contactEmail === email) {
          await models.Contact.updateUserVerificationStatus(connection, contactId, data);
          console.log("Email verified", email);
      }
      let phones = await models.Contact.findPhones(connection, contactId);
      //used forEach because user can add same phone number multiple times
      phones?.forEach(async phone => {
        if (phone?.phone === phoneNumber) {
          await models.Contact.updatePhoneVerificationStatus(connection, phone?.id, data);
          console.log("Phone verified", phoneNumber);
        }
      })
    } catch (e) {
        console.log("Failed to update verification details", e);
    }
  }

 /**
 * Function used to revoke verification status when verified email is changed
 * @param {Object} connection Message details
 * @param {String} email email id
 * @param {String} updatedEmail updated email id
 * @returns {Object} Returns status
 **/
  async revokeUserVerification(connection, email, updatedEmail) {
    if(email != updatedEmail) {
      this.verification_token = null;
      await models.Contact.revokeEmailVerification(connection, this.id);
    }
  }

  /* this function saves a new payment method for a contact or returns an existing one */
  async getPaymentMethod(connection, property, payment_method_id, payment_type, payment_source, paymentMethod, tokenize) {

    let authorization = '';
    let offlinePaymentMethods = [Enums.PAYMENT_METHODS.CASH, Enums.PAYMENT_METHODS.CHECK, Enums.PAYMENT_METHODS.GIFTCARD];
    if(payment_method_id && offlinePaymentMethods.indexOf(payment_type.toLowerCase() < 0)){
      
      // Existing Payment Method
      paymentMethod = await property.getPaymentMethod(connection, payment_type.toLowerCase(), payment_method_id, paymentMethod.device_id);

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
      // Cash, check or gift card
      paymentMethod = await property.getPaymentMethod(connection, payment_type.toLowerCase());
      paymentMethod.is_new = true;
    }

    return paymentMethod;
  }

  async savePaymentMethod(connection, pm, company_id, payment_source, property, tokenize){

    try{
      let address = {};
      if(!this.id) e.th(500, "Contact id not set");
      // Sets address in the payment method setData method
      // if(pm.address){
      //   address = new Address({
      //     address: pm.address,
      //     address2: pm.address2,
      //     city: pm.city,
      //     state: pm.state,
      //     zip: pm.zip
      //   });

      //   await address.findOrSave(connection);
      // } 

      let paymentMethod = await property.getPaymentMethod(connection, pm.type, null, pm.device_id);
      console.log(paymentMethod, 'payment method')
      
      //paymentMethod.setAddress(address);
      paymentMethod.contact_id = this.id;
      paymentMethod.property_id = property.id;

      await paymentMethod.setData(connection, pm);
      
      await paymentMethod.save(connection, company_id, payment_source, tokenize);
    
      paymentMethod.setNonce();

      return paymentMethod;

    } catch(err) {

      console.log(err.stack)
      throw err;

    }

  }

  async getCurrentBalance(connection, company_id, properties){
    let params = { contact_id: this.id, company_id, properties };
    let result = await models.Billing.findCurrentBalance(connection, params);

    if(result) this.balance = result.balance;
  }

  async getCredits(connection, property_id, params = {}){

    params.types = params && params.types && params.types.length ? params.types : ['credit', 'payment'];
    this.Payments = await models.Payment.findOpenPaymentsByContactId(connection, this.id, property_id, params);

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

  async getMilitaryContact(connection,contact_id){
    this.Business.Address = {};
    this.Military.Address = {};
    let military_record = await models.Contact.getMilitaryContact(connection, contact_id);


    if (!military_record) {
      this.Military = {};
      this.Military.Address = {};
      return;
    }
    this.Military = military_record;

    let military_address = await models.Address.findById(connection,this.Military.address_id);
    military_address ? this.Military.Address = military_address : this.Military.Address = {};
    return;

  }

  async addBusinessContact(connection,contact_id,data){
    var contact_business_address_id = null;
    let company_address_id = null;
    if (!data.Business) return;
    let {Address, ...contact_business} =  data.Business;
    if (Object.keys(contact_business).length === 0 && Object.keys(data.Business.Address).length === 0){
      return;
    }
    this.Business.Address = {};
    let contact_business_id = await models.Contact.getContactBusiness(connection,contact_id);
    if (contact_business_id){
      contact_business_address_id = await models.Contact.getAddressId(connection,contact_business_id);
    }
    let address_data = data.Business.Address;
    if (Object.keys(address_data).length !== 0){
      company_address_id = await models.Address.addAddress(connection, address_data,contact_business_address_id);
    }
    contact_business.address_id = company_address_id;
    contact_business.contact_id = contact_id;
    await models.Contact.addBusinessContact(connection,contact_business,contact_business_id);
    return true;
  }

  async addMilitaryContact(connection,contact_id,data){
    var contact_military_address_id = null;
    var contact_military_contact_id = null;
    let military_address_id = null;
    if (!data.Military) return;
    let {Address, ...contact_military} =  data.Military;
    if (Object.keys(contact_military).length === 0 && Object.keys(data.Military.Address).length === 0){
      return;
    }
    let military_record = await models.Contact.getMilitaryContact(connection,contact_id);
    if (military_record){
      contact_military_address_id = military_record.address_id;
      contact_military_contact_id = military_record.contact_id
    }
    let address_data = data.Military.Address;
    if (Object.keys(address_data).length !== 0){
      military_address_id = await models.Address.addAddress(connection, address_data,contact_military_address_id);
    }
    contact_military.address_id = military_address_id;
    contact_military.contact_id = contact_id;
    await models.Contact.addMilitaryContact(connection,contact_military,contact_military_contact_id);
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
    this.verification_token = data?.verification_token;
    this.email_verified = data.email_verified;
    this.suffix = data.suffix;
    this.dob = data.dob;
    this.source = data.source;
    this.ssn = data.ssn;
    this.gender = data.gender;
    this.driver_license = data.driver_license;
    this.driver_license_exp = data.driver_license_exp;
    this.driver_license_state = data.driver_license_state;
    this.driver_license_country = data.driver_license_country;
    this.driver_license_city = data.driver_license_city;
    
    this.have_secondary_contact = data.have_secondary_contact;
    this.pin = data.pin;
    this.opt_out = data.opt_out;
    this.type = data.type;
    this.employee_id = data.employee_id;

    return true;
  }

  async findUserName(connection) {
    if(this.user_id) {
      const user_data = await models.User.findById(connection, this.user_id)
      this.user_name = user_data.email
    }
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

  static sortAllLeasesFn(a,b){

    if(moment(a.start_date).format('x') < moment(b.start_date).format('x')) return -1;
    if(moment(a.start_date).format('x') > moment(b.start_date).format('x')) return 1;

    if(status_priority[a.Standing.name] < status_priority[b.Standing.name]) return 1;
    if(status_priority[a.Standing.name] > status_priority[b.Standing.name]) return -1;

    return 0;
  }

  sortLeasesByEndDateFn(a, b) {

    if (moment(a.end_date).format('x') > moment(b.end_date).format('x')) return -1;
    if (moment(a.end_date).format('x') < moment(b.end_date).format('x')) return 1;

    return 0;
  }

  async getLeases(connection, reference_company_id, properties, params = {}){

    this.Leases = [];
    if(!this.id) e.th(500, "Contact id not set");
    if(!this.company_id) return true;

    let leases = await models.Lease.findByContactId(connection, this.id, reference_company_id, properties, params);
    console.log('Contact Leases from db =>', JSON.stringify(leases));

    for(let i = 0; i < leases.length; i++){
      if(leases[i].status !== 1) continue;
      if(params.active_date && leases[i].end_date && moment(leases[i].end_date, 'YYYY-MM-DD').format('x') <= moment(params.active_date, 'YYYY-MM-DD').format('x')){
        continue
      }

      let lease = new Lease({id: leases[i].id});
      await lease.find(connection)
      await lease.findRentChange(connection)
      await lease.findUnit(connection)
      await lease.findAuction(connection, this.company_id);
      await lease.getActivePaymentCycle(connection);
      this.Leases.push(lease);
    }

    if (params.sort_by_desc) {
      this.Leases.sort(this.sortLeasesByEndDateFn);
    } else {
      this.Leases.sort(this.sortLeasesFn);
    }

    // console.log('Final Contact Leases =>',JSON.stringify(this.Leases));
    return true;

  }

  async getAllContactLeases(connection, reference_company_id, properties, params = {}){

    this.Leases = [];
    if(!this.id) e.th(500, "Contact id not set");
    if(!this.company_id) return true;

    let leases = await models.Lease.findByContactId(connection, this.id, reference_company_id, properties, params);
    console.log('Contact Leases from db =>', JSON.stringify(leases));

    for(let i = 0; i < leases.length; i++){
      if(leases[i].status !== 1) continue;
      const leaseIsClosed = params.active_date && leases[i].end_date && moment(leases[i].end_date, 'YYYY-MM-DD').format('x') <= moment(params.active_date, 'YYYY-MM-DD').format('x');

      let lease = new Lease({id: leases[i].id});
      await lease.find(connection)
      await lease.findRentChange(connection)
      await lease.findUnit(connection)
      await lease.findAuction(connection, this.company_id);
      lease['lease_is_active'] = leaseIsClosed ? false : true;
      this.Leases.push(lease);
    }

    if (params.sort_by_desc) {
      this.Leases.sort(this.sortLeasesByEndDateFn);
    } else {
      this.Leases.sort(this.sortLeasesFn);
    }

    console.log('Final Contact Leases =>',JSON.stringify(this.Leases));
    return true;

  }  

  async getAllLeases(connection, reference_company_id, properties, params = {}){

    if(!this.id) e.th(500, "Contact id not set");
    if(!this.company_id){
      this.Leases = [];
      return true;
    }

    let leases = await models.Lease.findByContactId(connection, this.id, reference_company_id, properties, params);

    for(let i = 0; i < leases.length; i++){
      let lease = new Lease({id: leases[i].id});
      await lease.find(connection)
      await lease.findUnit(connection)
      await lease.getStanding(connection);

      this.Leases.push(lease);
    }

    this.Leases.sort(Contact.sortAllLeasesFn);

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
  async getOldReservations(connection, properties = []) {

    if(!this.id) throw new Error("Contact id not set");

    if(!this.company_id){
      this.Reservations = [];
      return true;
    }

    let reservation_response = await models.Reservation.findOldByContactId(connection, this.id, this.company_id, properties);

    for(let i = 0; i < reservation_response.length; i++){
      let reservation = new Reservation({ id: reservation_response[i].id });
      await reservation.find(connection);
      this.Reservations.push(reservation);
    }
  }

  async getContactLead(connection){
    if(!this.id) throw new Error("Contact id not set"); 
    this.Lead = await models.Lead.getLeadByContactId(connection, this.id);      
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
          e.status = e?.status?.split(',');
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

    let contactRoles = await models.Contact.getUserRole(connection, this.id, company_id);
    let role_ids = contactRoles.map(role => role.role_id);
    if(contactRoles.length) {
      let permissions = await models.Role.findPermissions(connection, role_ids);
      this.Permissions = permissions
    }

    return true;
  }

  async getRole(connection, company_id){
    let roles = await models.Contact.getUserRole(connection, this.id, company_id);
    
    if(!roles.length) return;
    this.Roles = roles;
    //this.role_id = role.role_id;
    // this.status = role.status;
    // this.is_active = role.is_active;
    // this.pin = role.pin;
    
    let role_ids = this.Roles.map(role => role.id);
    await this.getProperties(connection, role_ids);
    // await this.getPhones(connection);
    this.setRole();
  }
  async getNonHbRole(connection, company_id){
    let role = await models.Contact.getUserRole(connection, this.id, company_id);
    role = role[0];

    if(!role) return;
    this.Roles = [role];
    this.role_id = role.role_id;
    this.status = role.status;
    this.is_active = role.is_active;
    this.pin = role.pin;
    await this.getNonHbProperties(connection, role.id);
    this.setRole();
  }

  async findNonHbProperty(connection, company_id){
    let propertyIds = []
    let properties = await models.Property.findNonHbPropertyByCompanyId(connection, company_id);
    properties.forEach(property => {
      propertyIds.push(property.id)
    })
    return propertyIds
  }

  async unpinInteraction(connection, interaction_id){
    let all_ids = await models.Contact.getInteractionIds(connection, this.id);
    let found  = all_ids.find(p => p.id === interaction_id);
    if(!found) e.th(404, "Interaction does not exist.");
    return await models.Contact.unpinInteraction(connection, this.id, interaction_id);
  }

  async pinInteraction(connection, interaction_id){
    return await models.Contact.pinInteraction(connection, this.id, interaction_id);
  }


  
	async sendSMS(connection, params) {
		let { property_id, space, phones = [], message, attachments = [], logged_in_user, context, owner_id, facility_id, delivery_method, primary_contact_id, lease_id = null, recipient_type = 'primary' } = params;
		await this.getPhones(connection);
		
		let phone_nums = [];
		let errors = [];
		
		var interactions = [];
		try{
			// if phones included, lets use that
			if(phones.length){
				phone_nums = this.Phones.filter(p => p.sms && phones.find(ph => ph === p.id) ).map(p => {
					return {
						contact_id: this.id,
						phone: p.phone
					}
				})
			} else {
				// other wise just send to all text numbers
				phone_nums = this.Phones.filter(p => p.sms).map(p => {
					return {
						contact_id: this.id,
						phone: p.phone
					}
				})
			}

			for(let i = 0; i < phone_nums.length; i++){
				let sms_response = await sendSMS(phone_nums[i].phone, message, null, owner_id, facility_id); 
				if(sms_response.error){
					errors.push(sms_response.error.message); 
				} 
				console.log("delivery_method", delivery_method)
				if (!delivery_method || !delivery_method?.id) {
					delivery_method = new DeliveryMethod()
					await delivery_method.findByGdsKey(connection, 'standard_sms')
				}

				let interaction = new Interaction();
				if (space === 'Tenant') {
					if (lease_id) {
						space = interaction.findSpaceByLeaseID(connection, lease_id);
					}
				}
				if (facility_id && property_id === 0) {
					let property = await models.Property.findByGdsID(
					  connection,
					  facility_id
					);
					if (property) {
					  property_id = property.id;
					}
				}
                               //connection, property_id, space, recipient_contact_id, entered_by, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status, contact_type
				await interaction.create(connection, property_id, space, this.id, logged_in_user, message, delivery_method.id, 0, context, 1, null, null, primary_contact_id, lease_id, sms_response.notification_id, sms_response.status, recipient_type)

				let smsMethod = new Sms({
					interaction_id: interaction.id,
					phone: phone_nums[i].phone,
					message: message
				})

				await smsMethod.save(connection);
				
				if(attachments?.length){
					await interaction.saveAttachments(connection, attachments); 
				}


				interactions.push(interaction);
				
			}

		} catch(err){
			console.log("SEND SMS ERROR", err);
			errors.push(err.msg || err.message); 			
		}
		return {
			interactions,
			errors
		}
	}

  /**
   * This method sends an SMS to a custom number and it records that interaction
   * @param connection - the connection to the database
   * @param to_phone - The phone number to send the SMS to.
   * @param message - The message you want to send
   * @param company - The company object
   * @param logged_in_user - The user who is logged in and is sending the SMS.
   */
  async sendSMSToNumber(connection, params) {
    let { property_id, space, to_phone, message, logged_in_user, context, owner_id, facility_id } = params;

    try {
      let response = await sendSMS(to_phone, message, null, owner_id, facility_id);
      let interaction = new Interaction();

      let deliveryMethod = new DeliveryMethod()
      await deliveryMethod.findByGdsKey(connection, 'standard_sms')

      let pinned = 0;
      let read = 1; 
	  
		if (facility_id && property_id === 0) {
			let property = await models.Property.findByGdsID(
			  connection,
			  facility_id
			);
			if (property) {
			  property_id = property.id;
			}
		}
			
      await interaction.create(connection, property_id, space, this.id, logged_in_user, message, deliveryMethod.id, pinned, context, read, null, null, null, null, null, null, null);

      let smsMethod = new Sms({
        interaction_id: interaction.id,
        phone: to_phone,
        message: message
      })

      await smsMethod.save(connection);
      
      return interaction;
    } catch (error) {
      console.log('error while trying to sms to a custom number', error)
      e.th(409, "Cannot send SMS to this number")
    }
  }

  

  async sendEmail(connection, property_id, space, subject,  message, attachments, logged_in_user, context, owner_id, facility_id, delivery_method, primary_contact_id, lease_id, document_batches_deliveries_id, recipient_type = 'primary'){
		let response = {}
		let errors = []

		try{

			let cc = [];
			let address = {};
			 
			if (!this.email){
				e.th(409, "This customer does not have a valid email address on file")
			}
			// cc = await this.assembleCCs(connection, include_alternate, include_lien, is_mail ? 'mail' : 'email' );
			// errors = cc.filter(c => c.error).map(c => c.error); 
			
			let to = {
				name: this.first + " " + this.last,
				email: this.email,
				address: address
			}
			
			let email_response = await sendEmail(connection, to.name, to.email,  this.id, null, subject, message, attachments, owner_id, facility_id, null);
			if(email_response.error){
				errors.push(email_response.error.message); 
			} 
			
			let interaction = new Interaction();
			let pinned = 0;
			let read = 1;

			if (!delivery_method || !delivery_method?.id) {
				delivery_method = new DeliveryMethod()
				await delivery_method.findByGdsKey(connection, 'standard_email')
			}
			if (space === 'Tenant') {
				if (lease_id) {
					space = interaction.findSpaceByLeaseID(connection, lease_id);
				}
			}
			if (facility_id && property_id === 0) {
				let property = await models.Property.findByGdsID(
				  connection,
				  facility_id
				);
				if (property) {
				  property_id = property.id;
				}
			}
			await interaction.create(connection, property_id, space, this.id, logged_in_user, message, delivery_method.id, pinned, context, read, null, document_batches_deliveries_id, primary_contact_id, lease_id, email_response.notification_id, email_response.status, recipient_type);

			let email = new Email({
				interaction_id: interaction.id,
				reject_reason: email_response.error? email_response.error.message: null,
				email_address: to.email,
				message: message,
				subject: subject,
				clicked: false
			});
			
			await email.save(connection);

			if(attachments?.length){
				await interaction.saveAttachments(connection, attachments); 
			} 
			response = email_response.response  || {}; 
			response.interaction_id = interaction.id;

		} catch(err){
			console.log("SEND MAIL ERROR", err);
			errors.push(err.msg || err); 
			// save errors to delivery methods; 
		}
		response.errors = errors;
		return response;
	
	}

	async sendMail(connection, property_id, space, attachments, context, owner_id, facility_id, delivery_method, logged_in_user_id, primary_contact_id, lease_id, document_batches_deliveries_id, recipient_type = 'primary'){
    
		
		
		let response = {}
		let errors = []

		if(!this.Addresses.length) {
		  e.th(400, "There is no address on file for this recipient");
		}
		
		let to = {
		  id: this.id, 
		  email: this.email,
		  name: this.first + ' ' + this.last,
		  address: {
				address1: this.Addresses[0].Address.address,
				address2: this.Addresses[0].Address.address2,
				city: this.Addresses[0].Address.city,
				stateCode: this.Addresses[0].Address.state,
				postalCode: this.Addresses[0].Address.zip
		  }
		}
	
		try{
			console.log("attachments", attachments)
		  	let mail_response = await sendMail(connection, [to], this.id, attachments, owner_id, facility_id, delivery_method.gds_key);
		  	if(mail_response.error){
				errors.push(mail_response.error.message); 
			} 


			let interaction = new Interaction();
			console.log("mail_response", mail_response)
			console.log("recipient_type", recipient_type)

            let pinned = 0
            let read = 1
			if (space === 'Tenant') {
				if (lease_id) {
					space = interaction.findSpaceByLeaseID(connection, lease_id);
				}
			}
			if (facility_id && property_id === 0) {
				let property = await models.Property.findByGdsID(
				  connection,
				  facility_id
				);
				if (property) {
				  property_id = property.id;
				}
			}
            await interaction.create(connection, property_id, space, this.id, logged_in_user_id, message, delivery_method.id, pinned, context, read, null, document_batches_deliveries_id, primary_contact_id, lease_id, mail_response.response.notification_id, mail_response.response.status, recipient_type);
			
			// save Mail
			
			let mail = new Mail({
				interaction_id: interaction.id
			});
			
			await mail.save(connection);

			// save Attachments
			await interaction.saveAttachments(connection, attachments); 
			response = mail_response.response  || {}; 
			response.interaction_id = interaction.id;

		} catch(err){
		  console.log("err", err);
		  errors.push(err.msg || err); 
		}
		
		response.errors = errors;
		
		return response;
	  }


  async getProperties(connection, company_role_ids){

    let properties = await models.Contact.getRoleProperties(connection, company_role_ids);
    for(let i = 0; i < properties.length; i++){
      this.Properties[i] = new Property({id: properties[i].property_id});
      await this.Properties[i].find(connection);
    }
  }
  async getNonHbProperties(connection, company_role_id){

    let properties = await models.Contact.getNonHbRoleProperties(connection, company_role_id);
    for(let i = 0; i < properties.length; i++){
      this.NonHbProperties[i] = new Property({id: properties[i].property_id});
      await this.NonHbProperties[i].findNonHbProperty(connection);
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

  async updateRole(connection, company_id, role_id, properties = [], nonHbProperties, pin, status){
    
    await this.getRole(connection, company_id);
    await this.getNonHbRole(connection, company_id);

    var data = {
      contact_id: this.id,
      company_id: company_id,
      role_id: role_id,
      pin,
      status
    }


    let result = await models.Contact.saveContactRole(connection, data,  this.Roles[0]?.id);
    let contact_role_id = this.Roles[0]?.id ? this.Roles[0]?.id :  result.insertId;
      
    await models.Role.deleteProperties(connection, properties, contact_role_id );
    await models.Role.deleteNonHbProperties(connection, nonHbProperties, contact_role_id );

    if(!properties.length && !nonHbProperties?.length) return;

    //save properties in bulk instead of 1 by 1
    for(let i = 0; i < properties.length; i++){
      
      if(this.Properties.find(property => property.id === properties[i].id)) continue;
      await this.savePropertyAccess(connection, properties[i].id, contact_role_id)
    }
    for(let i = 0; i < nonHbProperties?.length; i++){
      
      if(this.NonHbProperties.find(property => property.id === nonHbProperties[i].id)) continue;
        await this.saveNonHbPropertyAccess(connection, nonHbProperties[i].id, contact_role_id)
      }

    await this.getRole(connection, company_id);

  
  }

  async updateRoles(connection, company_id, roles_properties, status){
    await this.getNonHbRole(connection, company_id);
    await this.getRole(connection, company_id);
    await this.getPropertiesByRoles(connection, company_id);

    for(let i = 0; i < roles_properties.length; i++ ){
      let rp = roles_properties[i];
      rp.Properties = rp.Properties || [];
      rp.NonHbProperties = rp.NonHbProperties || [];

      rp.Properties = rp.Properties || [];
      rp.NonHbProperties = rp.NonHbProperties || [];

      if(rp.id && !this.Roles.find(r => r.id === rp.id)) 
        e.th(500, "Contact role id mismatched")

      let data = {
        contact_id: this.id,
        company_id: company_id,
        role_id: rp.role_id,
        status
      }      

      let result = await models.Contact.saveContactRole(connection, data, rp.id);
      let contact_role_id = rp.id ? rp.id :  result.insertId;

      let not_to_deleted_props = rp.Properties?.map(p => {return {id: p}});
      await models.Role.deleteProperties(connection, not_to_deleted_props, contact_role_id );
      
      not_to_deleted_props = rp.NonHbProperties?.map(p => {return {id: p}});
      await models.Role.deleteNonHbProperties(connection, not_to_deleted_props, contact_role_id );

      let role_properties = this.RolesProperties.find(rp => rp.id == contact_role_id);
      
      let new_properties;
      if(role_properties && role_properties.Properties?.length) new_properties = rp.Properties.filter(pid => !role_properties.Properties.find(p => p == pid));
      else new_properties = rp.Properties || []

      if(new_properties.length) await this.savePropertiesAccessInBulk(connection, new_properties, contact_role_id);

      if(role_properties && role_properties?.NonHbProperties?.length) new_properties = rp.NonHbProperties.filter(pid => !role_properties?.NonHbProperties.find(p => p == pid));
      else new_properties = rp.NonHbProperties || []

      if(new_properties.length) await this.saveNonHbPropertiesAccessInBulk(connection, new_properties, contact_role_id);
    
      await this.getRole(connection, company_id);
      await this.getPropertiesByRoles(connection, company_id);
    }
  }

  async removeCompanyAccess(connection, company_id){
    await this.getRole(connection, company_id);
    
    await models.Role.deletePermissions(connection, [], this.Roles[0]?.role_id)
    await models.Role.deleteProperties(connection, [], this.Roles[0]?.id);
    await models.Role.deleteCompanyContactRole(connection, this.Roles[0]?.id);
    await models.Role.hardDeleteRole(connection, this.Roles[0]?.role_id);
  }

  async savePropertyAccess(connection, property_id, company_contact_role_id){
    if (!company_contact_role_id){
      company_contact_role_id = this.Roles[0] && this.Roles[0].id;
    }

    if(!company_contact_role_id) e.th(500, "Contact role id not set");

    let contact_prop = {
      property_id,
      company_contact_role_id
    }
    await models.Role.saveProperty(connection, contact_prop);
  
  }

  async saveNonHbPropertyAccess(connection, property_id, company_contact_role_id){
    if (!company_contact_role_id){
      company_contact_role_id = this.Roles[0] && this.Roles[0].id;
    }

    if(!company_contact_role_id) e.th(500, "Contact role id not set");

    let contact_prop = {
      property_id,
      company_contact_role_id
    }
    await models.Role.saveNonHBProperty(connection, contact_prop);
  
  }

  setRole(){
    // TODO set application role if its an application
    console.log("this.Roles", this.Roles)
    if(this.Roles.length){

      let role_types = this.Roles.map(role => role.type)
      let unique_roles = new Set(role_types)
      this.roles = Array.from(unique_roles);
    } else {
      this.roles = ['tenant'];
    }
    
    return;
    
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

  // Not called anywhere in the application.
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
        phone: cleanPhoneNumber(p.phone),
        sms: p.sms || 0
      };

      await models.Contact.savePhone(connection, phoneSave, p.id);
    }

    

  }

  async saveLocation(connection){
    if(!this.Addresses || !this.Addresses.length) return ;
    let address_ids = this.Addresses.filter(a => a && a.id).map(a => a.id).join(',');
    console.info("Contact saveLocation: Address ids to NOT be removed before save ", address_ids);
    await models.Contact.removeLocations(connection, this.id, address_ids.replace(/,\s*$/, ""));
    console.info("Contact saveLocation: Address not included have been removed");

    for(let i = 0; i< this.Addresses.length; i++){
      let a = this.Addresses[i];
      if(!a || !a.Address || !a.Address.address) continue;

      let address = {
        address: a.Address.address,
        address2: a.Address.address2,
        city: a.Address.city,
        neighborhood: a.Address.neighborhood,
        state: a.Address.state,
        zip: a.Address.zip,
        country: a.Address.country,
        lat: a.Address.lat,
        lng: a.Address.lng
      }

      try{
        address.id = await models.Address.findOrSave(connection, address);
        console.info("Contact saveLocation: Address found or saved", address.id);
      } catch(err){
        e.th(400, err);
        console.error("Contact saveLocation: Error while saving address", err);
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
        address_id: address.id,
        primary: a.primary || 0
      }
      await models.Contact.saveLocation(connection, addressSave, a.id);
      console.info("Contact saveLocation: Location saved for contact ", addressSave);
    }

    await models.Contact.updatePrimaryContactLocations(connection, this.id);
    console.info("Contact saveLocation: Updated contact primary address");
  }

  async saveRelationshipContact(connection) {
    this.Relationships = this.Relationships || [];

    let relationship_ids = this.Relationships.filter(r => r && r.id).map(r => r.id).join(',');

    // Should we remove this additional contact from contacts table ?
    /* let deleted_relationship_contact_ids = await this.getContactRelationships(connection, null, relationship_ids).map(r => r.related_contact_id);
    deleted_relationship_contact_ids.map(async (contact_id) => {
      await models.Contact.removeLocations(connection, contact_id);
      await models.Contact.removePhones(connection, contact_id);
      await models.Contact.delete(connection, contact_id);
    }); */

    await models.Contact.removeRelationships(connection, this.id, relationship_ids.replace(/,\s*$/, ""));

    for(let i = 0; i < this.Relationships.length; i++){
      let r = this.Relationships[i];

      if(!r.Contact) continue;

      let alternateContact = new Contact(r.Contact);

      alternateContact.company_id = this.company_id;

      await alternateContact.save(connection);

      await this.saveRelationship(connection, {
        related_contact_id: alternateContact.id,
        type:  r.type,
        is_cosigner: r.is_cosigner || 0,
        is_alternate: r.is_alternate || 0,
        is_emergency: r.is_emergency || 0,
        is_military: r.is_military || 0,
        is_authorized: r.is_authorized || 0,
        is_lien_holder: r.is_lien_holder || 0,
        lease_id: r.lease_id || null,
      },  r.id)

    }
  }

  async save(connection, scope, updatedFieldName = ""){

    if(!connection) e.th(500, "Connection not set");

    this.ssn = this.ssn ? String(this.ssn) : null;

    await this.validate(updatedFieldName);

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
      verification_token:         this.verification_token || null,
      dob:                        this.dob || null,
      ssn:                        this.ssn ? this.ssn.replace(/\D+/g, '') : null,
      source:                     this.source,
      gender:                     this.gender || null,
      driver_license:             this.driver_license || null,
      driver_license_exp:			    this.driver_license_exp || null,
      driver_license_city:		    this.driver_license_city || null,
      driver_license_state:		     this.driver_license_state || null,  
      driver_license_country:		     this.driver_license_country || null,  
      have_secondary_contact:     this.have_secondary_contact || 0,
      employee_id:                this.employee_id || null
    };



    let contactRes = await models.Contact.save(connection, save, this.id);
    if(!this.id) this.id = contactRes.insertId;

    if(this.verification_token) {
      await new Promise((resolve, reject) => {
        Scheduler.addJobs([{
            category: 'verify_email_token',
            data: {
                cid: this.company_id,
                verification_token: this.verification_token || null,
                owner_id: this.gdsOwnerId,
                contact_id: this.id
            }
        }], function(err) {
            if (err) return reject(err);
            return resolve();
        });
    })
  }

    await this.savePhone(connection);
    
    await this.saveLocation(connection);
    
    let employment_ids = this.Employment.filter(e => e.id).map(e => e.id).join(',');
    await models.Contact.removeEmployment(connection, this.id, employment_ids.replace(/,\s*$/, ""))
    for(let i = 0; i < this.Employment.length; i++){
      let e = this.Employment[i];
      e.sort = i;
      e.contact_id = this.id;
      e.salary = e.salary || null;
      await models.Contact.saveEmployment(connection, e, e.id);
    }

    if (this.Vehicles?.length || scope?.toLowerCase() === 'vehicles') {
      let vehicle_ids = this.Vehicles.filter(v => v.id).map(v => v.id).join(',');
      await models.Contact.removeVehicles(connection, this.id, vehicle_ids.replace(/,\s*$/, ""))
      for (let i = 0; i < this.Vehicles.length; i++) {
        let v = this.Vehicles[i];
        v.sort = i;
        v.contact_id = this.id;
        if (v && v.RegisteredAddress && v.RegisteredAddress.address) {
          let address = {
            address: v.RegisteredAddress.address,
            city: v.RegisteredAddress.city,
            state: v.RegisteredAddress.state,
            zip: v.RegisteredAddress.zip
          }
          v.registered_address_id = await models.Address.findOrSave(connection, address)
        }
        let data = Object.assign({}, v);
        delete data.RegisteredAddress;
        await models.Contact.saveVehicles(connection, data, data.id);
      }
    }
    
    if(scope && scope.toLowerCase() == "contacts") {
      await this.saveRelationshipContact(connection);
    }
        
    // var military_address = new Address({id: })
    if(!(Object.keys(this.Business).length === 0 && this.Business.constructor === Object)){
      // Store or udpated business address first.
      let address = {
        address: this.Business.Address.address,
        address2: this.Business.Address.address2,
        city: this.Business.Address.city,
        state: this.Business.Address.state,
        zip: this.Business.Address.zip,
        country: this.Business.Address.country
      }
      
      var address_id = await models.Address.save(connection, address, this.Business.Address.id);
      
      let business_info = {
        name: this.Business.name,
        phone_type: this.Business.phone_type,
        phone: cleanPhoneNumber(this.Business.phone),
        country_code: this.Business.country_code,
        contact_id: this.id,
        address_id: !this.Business.Address.id? address_id.insertId: this.Business.Address.id
      };
      await models.Contact.saveBusinessInfo(connection, business_info, this.Business.id);
    }
    
    await this.saveMilitary(connection);
    // if(!(Object.keys(this.Military).length === 0 && this.Military.constructor === Object)){

    //   let address = {
    //     address: this.Military.Address.address,
    //     address2: this.Military.Address.address2,
    //     city: this.Military.Address.city,
    //     state: this.Military.Address.state,
    //     zip: this.Military.Address.zip,
    //     country: this.Military.Address.country
    //   }

    //   var address_id = await models.Address.save(connection, address, this.Military.Address.id);

    //   var { email, identification_number, rank, date_of_birth, service_expiration,first_name,last_name, branch, unit_name,phone_type, phone,country_code } = this.Military;
    //   let military_info = {
    //     email,
    //     identification_number,
    //     rank,
    //     date_of_birth,
    //     service_expiration,
    //     first_name,
    //     last_name,
    //     branch,
    //     unit_name,
    //     phone_type,
    //     phone,
    //     country_code,
    //     contact_id: this.id,
    //     address_id: !this.Military.Address.id? address_id.insertId: this.Military.Address.id
    //   }

    //   await models.Contact.saveMilitaryInfo(connection, military_info, this.Military.id);
    // }
  }


  async saveMilitary(connection){
    let address_id = null
    
    try {
      console.log("SAAVE MILITARY", this.Military); 
      if(this.Military.id && this.Military.active === 0){
        await models.Contact.saveMilitaryInfo(connection, {active: 0 }, this.Military.id);
      }




      if(!this.Military.CommandingOfficer.first || !this.Military.CommandingOfficer.last) return;
      if(this.Military.Address.address){
        let address = new Address({
          address: this.Military.Address.address,
          address2: this.Military.Address.address2,
          city: this.Military.Address.city,
          state: this.Military.Address.state,
          zip: this.Military.Address.zip,
          country: this.Military.Address.country
        });

        await address.findOrSave(connection, address);
        address_id = address.id
      
      }

      let co = new Contact({
        id: this.Military.CommandingOfficer.id, 
        company_id: this.company_id, 
        first: this.Military.CommandingOfficer.first,
        last: this.Military.CommandingOfficer.last,
        email: this.Military.CommandingOfficer.email
      });
        
      co.addPhone(this.Military.CommandingOfficer.Phone); 
  
      await co.save(connection); 
      this.Military.CommandingOfficer.id = co.id;
      
      let save = {
        contact_id: this.id, 
        commanding_officer_contact_id: this.Military.CommandingOfficer.id,
        address_id: address_id, 
        identification_number: this.Military.identification_number,
        active: !!this.Military.active, 
        rank: this.Military.rank,
        service_member_email: this.Military.service_member_email,
        service_expiration: this.Military.service_expiration,
        date_of_birth: this.Military.date_of_birth,
        branch: this.Military.branch, 
        unit_name: this.Military.unit_name,
        phone: this.Military.Phone?.phone, 
        phone_sms: this.Military.Phone?.sms ? 1 : 0, 
        phone_type: this.Military.Phone?.type, 
        country_code: this.Military.Phone?.country_code
      }
      
      
      this.Military.id = await models.Contact.saveMilitaryInfo(connection, save, this.Military.id);
      
    } catch(err){
      console.log("err", err)
      throw err;
    }
    


  }

  async saveRelationship(connection, params, relationship_id ){

    params.contact_id = this.id;
    return await models.Contact.saveRelationship(connection, params, relationship_id)

  }

  async getContactRelationships(connection, lease_id, excluded_ids_string){
    return await models.Contact.findAlternate(connection,this.id, lease_id, excluded_ids_string);
  }

  async getRelationships(connection, lease_id, type){
    await this.verifyId();

    let related_contacts = await models.Contact.findAlternate(connection, this.id, lease_id, type);
    for(let i=0; i < related_contacts.length; i++){
      related_contacts[i].Contact = new Contact({id: related_contacts[i].related_contact_id});
      await related_contacts[i].Contact.find(connection, this.company_id);
      await related_contacts[i].Contact.getLocations(connection);
      await related_contacts[i].Contact.getPhones(connection);
    }
    this.Relationships = related_contacts;
  }

  async validate(fieldToValidate = "all"){

    if(["name", "email", "ssn", "phone", "driver_license", "gender", "notes", "dob"].indexOf(fieldToValidate) < 0) fieldToValidate = "all";

    if((fieldToValidate === "name" || fieldToValidate === "all") && !this.first) e.th(422, 'Please enter a first name or check if there is any additional contact with missing first name');
    if((fieldToValidate === "name" || fieldToValidate === "all") && !this.last) e.th(422, 'Please enter a last name or check if there is any additional contact with missing last name');
    if((fieldToValidate === "email" || fieldToValidate === "all") && this.email && !validator.isEmail(this.email)) e.th(422, 'Please enter a valid email address');

    if((fieldToValidate === "ssn" || fieldToValidate === "all") &&  this.ssn){
      let stripped1 = validator.whitelist(this.ssn.toString(), "01233456789");
      if(this.ssn && !validator.isLength(stripped1, { min:0, max:9 } )) {
        e.th(422, 'You have entered an invalid SSN');
      };
    }

    if((fieldToValidate === "phone" || fieldToValidate === "all") && this.Phones && this.Phones.length){
      this.Phones.map(p => {
        if(p.phone){
          let stripped2 = validator.whitelist(p.phone.toString(), "01233456789+x");
          if(p.phone && !validator.isLength(stripped2, {min: 7, max: 15}))  {
            e.th(422, "The phone number you entered is not valid");
          };
        }
      });
    }

    return Promise.resolve();


  }

  async update(connection, data, scope){
    this.gdsOwnerId = data.gds_owner_id || "";
    if (this.id && scope){
      if(scope.toLowerCase() == "addresses"){
        await this.getLocations(connection);
      }else if (scope.toLowerCase() == "contacts"){
        await this.getRelationships(connection);
      }else if (scope.toLowerCase() == 'military'){
        await this.findMilitaryInfo(connection);
      }else if (scope.toLowerCase() == 'general'){
        await this.getPhones(connection);
      }else if (scope.toLowerCase() == 'vehicles'){
        await this.getVehicles(connection);
      }else if(scope.toLowerCase() == 'employment'){
        await this.getEmployment(connection);
      }
     
    }else if(this.id){
      await this.getContactDetails(connection);
    }
    console.log(`Update ${JSON.stringify(data)}`);
    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';
    if(typeof data.first !== 'undefined') this.first = data.first || '';
    if(typeof data.middle !== 'undefined') this.middle = data.middle || '';
    if(typeof data.last !== 'undefined') this.last = data.last || '';
    if(typeof data.suffix !== 'undefined') this.suffix = data.suffix || '';
    if(typeof data.email !== 'undefined') this.email = data.email || '';
    if(typeof data.emailVerificationToken !== 'undefined') this.verification_token = data?.emailVerificationToken || null;
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
    if(typeof data.driver_license_country !== 'undefined') this.driver_license_country = data.driver_license_country || '';
    if(typeof data.driver_license_city !== 'undefined') this.driver_license_city = data.driver_license_city || '';
    
    if(typeof data.have_secondary_contact !== 'undefined') this.have_secondary_contact = data.have_secondary_contact || '';
    
    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';

    if(typeof data.Phones !== 'undefined') this.Phones = data.Phones || '';
    //TODO: .name .email is a hack to identify if a valid business/military info is passed, if no business/military info is required that this object should be passed empty from front-end.
    if(typeof data.Business !== 'undefined') {
      var {name, phone,phone_type,country_code, Address: address} = data.Business;
      this.Business.name = name || '';
      this.Business.phone_type = phone_type || '';
      this.Business.phone = phone || '';
      this.Business.country_code = country_code || '';
      this.Business.Address = this.Business.Address || {};
      this.Business.Address.address = address && address.address || '';
      this.Business.Address.address2 = address && address.address2 || '';
      this.Business.Address.city = address && address.city || '';
      this.Business.Address.state = address && address.state || '';
      this.Business.Address.zip = address && address.zip || '';
      this.Business.Address.country = address && address.country || '';
    }
    if(typeof data.Military !== 'undefined') {
      
      var { identification_number, rank, date_of_birth, service_expiration, branch, unit_name, active, service_member_email } = data.Military;
      
      this.Military.identification_number = identification_number || '',
      this.Military.rank = rank || '';
      this.Military.date_of_birth = date_of_birth || null;
      this.Military.service_expiration = service_expiration || null;
      this.Military.branch = branch || '';
      this.Military.unit_name =unit_name || '';
      this.Military.active = active || 0;
      this.Military.service_member_email = service_member_email || '';
      
      if(data.Military.Phone){
      
        this.Military.Phone.type = data.Military.Phone.type || '';
        this.Military.Phone.phone = data.Military.Phone.phone || '';
        this.Military.Phone.sms = data.Military.Phone.sms || '';
        this.Military.Phone.country_code = data.Military.Phone.country_code || '';
      }
      
      if(data.Military.CommandingOfficer){
        this.Military.CommandingOfficer.first = data.Military.CommandingOfficer.first;
        this.Military.CommandingOfficer.last = data.Military.CommandingOfficer.last;
        this.Military.CommandingOfficer.email = data.Military.CommandingOfficer.email;
        
        if(data.Military.CommandingOfficer.Phone){
          this.Military.CommandingOfficer.Phone.type = data.Military.CommandingOfficer.Phone.type;
          this.Military.CommandingOfficer.Phone.phone = data.Military.CommandingOfficer.Phone.phone;
          this.Military.CommandingOfficer.Phone.sms = data.Military.CommandingOfficer.Phone.sms;
          this.Military.CommandingOfficer.Phone.country_code = data.Military.CommandingOfficer.Phone.country_code;
        }
      }
      
      
      if(data.Military.Address){
        this.Military.Address.address = data.Military.Address.address || '';
        this.Military.Address.address2 = data.Military.Address.address2 || '';
        this.Military.Address.city = data.Military.Address.city || '';
        this.Military.Address.state = data.Military.Address.state || '';
        this.Military.Address.zip = data.Military.Address.zip || '';
        this.Military.Address.country = data.Military.Address.country || '';
      }

    }

    if(typeof data.Addresses !== 'undefined') {
      this.Addresses = data.Addresses.map(a => {
        a.move_in = a.move_in ? moment(a.move_in).format('YYYY-MM-DD') : null;
        a.move_out = a.move_out ? moment(a.move_out).format('YYYY-MM-DD') : null;
        a.rent = a.rent || null;
        return a;
      });
    }

    if(typeof data.Relationships !== 'undefined' && scope ? scope == 'contacts': true) {
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
    console.log(`Update ${this.first} and ${this.last}`)

  }

  async updateBasic(connection, data = {}){
    if(this.id){
      await this.getPhones(connection);
    }

    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';
    if(typeof data.first !== 'undefined') this.first = data.first || '';
    if(typeof data.middle !== 'undefined') this.middle = data.middle || '';
    if(typeof data.last !== 'undefined') this.last = data.last || '';
    if(typeof data.suffix !== 'undefined') this.suffix = data.suffix || '';
    if(typeof data.email !== 'undefined') this.email = data.email || '';
    if(typeof data.emailVerificationToken !== 'undefined') this.verification_token = data?.emailVerificationToken || null;
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
    if(typeof data.driver_license_country !== 'undefined') this.driver_license_country = data.driver_license_country || '';
    if(typeof data.driver_license_city !== 'undefined') this.driver_license_city = data.driver_license_city || '';
    
    if(typeof data.have_secondary_contact !== 'undefined') this.have_secondary_contact = data.have_secondary_contact || '';
    
    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';

    if(typeof data.Phones !== 'undefined') this.Phones = data.Phones || '';
  }

  async updateBasic(connection, data = {}){
    if(this.id){
      await this.getPhones(connection);
    }

    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';
    if(typeof data.first !== 'undefined') this.first = data.first || '';
    if(typeof data.middle !== 'undefined') this.middle = data.middle || '';
    if(typeof data.last !== 'undefined') this.last = data.last || '';
    if(typeof data.suffix !== 'undefined') this.suffix = data.suffix || '';
    if(typeof data.email !== 'undefined') this.email = data.email || '';
    if(typeof data.emailVerificationToken !== 'undefined') this.verification_token = data?.emailVerificationToken || null;
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
    if(typeof data.driver_license_country !== 'undefined') this.driver_license_country = data.driver_license_country || '';
    if(typeof data.driver_license_city !== 'undefined') this.driver_license_city = data.driver_license_city || '';
    
    if(typeof data.have_secondary_contact !== 'undefined') this.have_secondary_contact = data.have_secondary_contact || '';
    
    if(typeof data.salutation !== 'undefined') this.salutation = data.salutation || '';

    if(typeof data.Phones !== 'undefined') this.Phones = data.Phones || '';
  }

  async updateIfNew(connection, data = {}){

    if (this.id){
      await this.getContactDetails(connection);
    }
    console.log(`UpdateIfnew ${JSON.stringify(data)}`);
    if( data.salutation && !this.salutation) this.salutation = data.salutation || '';
    if( data.first && !this.first) this.first = data.first || '';
    if( data.middle && !this.middle) this.middle = data.middle || '';
    if( data.last && !this.last) this.last = data.last || '';
    if( data.suffix && !this.suffix) this.suffix = data.suffix || '';
    if( data.email && !this.email) this.email = data.email || '';
    if( data.emailVerificationToken && !this.verification_token) this.verification_token = data.emailVerificationToken || null;
    if( data.notes && !this.notes) this.notes = data.notes || '';
    if( data.company && !this.company) this.company = data.company || '';
    if( data.dob && !this.dob) this.dob = data.dob || '';
    if( data.ssn && !this.ssn){
      this.ssn = data.ssn ? data.ssn.replace(/[^0-9]/g, ''): null;
    }

    if( data.gender && !this.gender) this.gender = data.gender || '';
    if( data.source && !this.source) this.source = data.source || '';
    if( data.driver_license && !this.driver_license) this.driver_license = data.driver_license || '';
    if( data.driver_license_exp && !this.driver_license_exp) this.driver_license_exp = data.driver_license_exp || '';
    if( data.driver_license_state && !this.driver_license_state) this.driver_license_state = data.driver_license_state || '';
    if( data.driver_license_country && !this.driver_license_country) this.driver_license_country = data.driver_license_country || '';
    if( data.driver_license_city && !this.driver_license_city) this.driver_license_city = data.driver_license_city || '';
    
    if( data.have_secondary_contact && !this.have_secondary_contact) this.have_secondary_contact = data.have_secondary_contact || '';
    
    if( data.salutation && !this.salutation) this.salutation = data.salutation || '';

    if( data.Phones &&  data.Phones.length  ) {
      
      for(let i = 0; i < data.Phones.length; i++){
        let p = data.Phones[i];
        if(this.Phones.find(ph => ph.phone === p.phone)) continue;
        p.primary = p.primary || !this.Phones.length ? 1 : 0;
        p.sms = p.sms || 0;
        p.type = p.type || 'Cell';
        p.verificationToken = p.verificationToken;
        p.contact_id = this.id;
        this.Phones.push(p);
      }

    }
    
    //TODO: .name .email is a hack to identify if a valid business/military info is passed, if no business/military info is required that this object should be passed empty from front-end.
    if(data.Business) {
      var {name, phone,phone_type,country_code, Address: address} = data.Business;

      this.Business.name = this.Business.name || name || '';
      this.Business.phone_type = this.Business.phone_type || phone_type || '';
      this.Business.phone = this.Business.phone || phone || '';
      this.Business.country_code = this.Business.country_code || country_code || '';
      this.Business.Address = this.Business.Address || {};
      if(!this.Business.Address.address && address && address.address) this.Business.Address.address = address.address || '';
      if(!this.Business.Address.address2 && address && address.address2) this.Business.Address.address2 = address.address2 || '';
      if(!this.Business.Address.city && address && address.city) this.Business.Address.city = address.city || '';
      if(!this.Business.Address.state && address && address.state) this.Business.Address.state = address.state || '';
      if(!this.Business.Address.zip && address && address.zip) this.Business.Address.zip = address.zip || '';
      if(!this.Business.Address.country && address && address.country) this.Business.Address.country = address.country || '';

    }
    if(data.Military) {
      //var { email, identification_number, rank, date_of_birth, service_expiration, first_name, last_name, branch, unit_name, phone,  Address: address } = data.Military;
      //var { service_member_email , identification_number, rank, date_of_birth, service_expiration,first_name,last_name, branch, unit_name, phone_type, phone,country_code,  Address: address } = data.Military;
      var { identification_number, rank, date_of_birth, service_expiration, branch, unit_name, active, service_member_email } = data.Military;

      this.Military.identification_number = this.Military.identification_number || identification_number || '',
      this.Military.rank = this.Military.rank || rank || '';
      this.Military.date_of_birth = this.Military.date_of_birth || date_of_birth || null;
      this.Military.service_expiration = this.Military.service_expiration || service_expiration || '';
      this.Military.branch = this.Military.branch || branch || '';
      this.Military.unit_name = this.Military.unit_name || unit_name || '';
      this.Military.active = this.Military.active || active || '';
      this.Military.service_member_email = this.Military.service_member_email || service_member_email || '';
      
      if(data.Military.Phone){
      
        this.Military.Phone.type = this.Military.Phone.type || data.Military.Phone.type || '';
        this.Military.Phone.phone = this.Military.Phone.type || data.Military.Phone.phone || '';
        this.Military.Phone.sms = this.Military.Phone.sms || data.Military.Phone.sms || '';
        this.Military.Phone.country_code = this.Military.Phone.country_code || data.Military.Phone.country_code || '';
      }
      
      if(!this.Military.CommandingOfficer.first && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.first) this.Military.CommandingOfficer.first = data.Military.CommandingOfficer.first;
      if(!this.Military.CommandingOfficer.last && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.last) this.Military.CommandingOfficer.last = data.Military.CommandingOfficer.last;
      if(!this.Military.CommandingOfficer.email && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.email) this.Military.CommandingOfficer.email = data.Military.CommandingOfficer.email;
      
      if(!this.Military.CommandingOfficer.Phone.type && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.Phone && data.Military.CommandingOfficer.Phone.type) this.Military.CommandingOfficer.Phone.type = data.Military.CommandingOfficer.Phone.type;
      if(!this.Military.CommandingOfficer.Phone.phone && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.Phone && data.Military.CommandingOfficer.Phone.phone) this.Military.CommandingOfficer.Phone.phone = data.Military.CommandingOfficer.Phone.phone;
      if(!this.Military.CommandingOfficer.Phone.sms && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.Phone && data.Military.CommandingOfficer.Phone.sms) this.Military.CommandingOfficer.Phone.sms = data.Military.CommandingOfficer.Phone.sms;
      if(!this.Military.CommandingOfficer.Phone.country_code && data.Military && data.Military.CommandingOfficer && data.Military.CommandingOfficer.Phone && data.Military.CommandingOfficer.Phone.country_code) this.Military.CommandingOfficer.Phone.country_code = data.Military.CommandingOfficer.Phone.country_code;
       
      if(!this.Military.Address.address && address && address.address) this.Military.Address.address = address.address || '';
      if(!this.Military.Address.address2 && address && address.address2) this.Military.Address.address2 = address.address2 || '';
      if(!this.Military.Address.city && address && address.city) this.Military.Address.city = address.city || '';
      if(!this.Military.Address.state && address && address.state) this.Military.Address.state = address.state || '';
      if(!this.Military.Address.zip && address && address.zip) this.Military.Address.zip = address.zip || '';
      if(!this.Military.Address.country && address && address.country) this.Business.Address.country = address.country || '';

    }

    if(data.Addresses && data.Addresses.length) {
      // add addresses only if they dont already exist
      for(let i = 0; i < data.Addresses.length; i++){
          let a = data.Addresses[i];
          if(this.Addresses.find(add => add.address === a.address && add.address2 === a.address2 && add.city === a.city && add.state === a.state && add.zip === a.zip)) continue;
          a.move_in = a.move_in ? moment(a.move_in).format('YYYY-MM-DD') : null;
          a.move_out = a.move_out ? moment(a.move_out).format('YYYY-MM-DD') : null;
          a.rent = a.rent || null;
          this.Addresses.push(a);
      }
    }

    if(data.Relationships && data.Relationships.length) {
      // add relationships only if they dont already exist. Matching currently on name and email address
      for(let i = 0; i < data.Relationships.length; i++){
        let r = data.Relationships[i];
        if(this.Relationships.find(rel => rel.first === r.first && rel.last === r.last && rel.email === r.email)) continue;
        this.Relationships.push(r);
      }
    };

    if(data.Vehicles && data.Vehicles.length){
      for(let i = 0; i < data.Vehicles.length; i++){
        let v = data.Vehicles[i];
        if(this.Vehicles.find(veh => veh.year === v.year && veh.make === v.make && veh.model === veh.model)) continue;
        v.year = v.year || null;
        v.width = v.width || null;
        v.length = v.length || null;
        v.value = v.value || null;
        v.registration_exp = v.registration_exp || null;
        v.horsepower = v.horsepower || null;
        this.Vehicles.push(v);
      }
    }

    if(data.Employment && data.Employment.length) {
      for(let i = 0; i < data.Employment.length; i++){
        let e = data.Employment[i];
        if(this.Employment.find(emp => emp.start_date === e.start_date && emp.status === e.status)) continue;
        e.end_date = e.end_date || null;
        e.status = e.status.join(',');
        this.Employment.push(e);
      }
    }
    console.log(`UpdateIfNew ${this.first} and ${this.last}`);
  }

  static async getMultipleById(connection, data, properties, company_id){
    return await models.Contact.getMultipleById(connection, data, properties, company_id);
  }


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
    if(this.company_id && this.company_id !== company_id){
      e.th(403);
    } else if(!this.company_id && !this.roles.includes('admin') && !this.roles.includes('application')){ //TODO add check for properties here
      e.th(403);
    }
  }

  async sendWelcomeEmail(connection, company_id, type, fromEmail){

    if(!this.id) throw "Contact not found";
    var data = {
      category: 'welcomeEmail',
      data: {
        id: this.id,
        action: 'email',
        label: type,//this.user_id ? 'newLease': 'setup',
        company_id: company_id
      }
    }
    Company = require(`${__dirname}/company.js`);
    let company = new Company({ id: company_id });
    await company.find(connection, company_id)

    var shipment = {
      contact_id: this.id,
      fn: 'setup password',
      requested: moment.utc(),
      domain: company.subdomain
    };

    var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
    var encrypted_token = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

    var values = {
      email: this.email,
      to: `${this.first} ${this.last}`
    };

    if(!this.user_id) {
      values.subject = 'Welcome To Our Online Lease Management System';
      values.template = {
        name: 'basic-email',

        from: company.name + " Online Management",
        data: [
          {
            name: 'logo',
            content: company.getLogoPath()
          },
          {
            name: 'headline',
            content: 'Your account has been set up.'
          },
          {
            name: 'content',
            content: `<p>Welcome! A new account has been set up for you.<br />
						Click the link below to set up your username and password. </p>
						<br /><a style="color: #3dc6f2" href="${settings.getBaseUrl(company.subdomain)}/setup/${encrypted_token}">Click here to set your password</a><br />`
          }]
      }
    } else if(data.label === 'setup'){
      values.subject = 'Welcome To Our Online Lease Management System';
      values.template = {
        name: 'basic-email',
        from: company.name + " Online Management",
        data: [
          {
            name: 'logo',
            content: company.getLogoPath()
          },
          {
            name: 'headline',
            content: 'Your account has been set up.'
          },
          {
            name: 'content',
            content: `<p>Welcome! A new account has been set up for you.<br />
						Please click the link below to set up your password.</p>
						<br /><a style="color: #3dc6f2" href="${settings.getBaseUrl(company.subdomain)}/setup/${encrypted_token}">Click here to set your password</a><br />`
          }]
      }
    } else if (data.label === 'newLease'){
      values.subject = 'You have a new lease!';
      values.template = {
        name: 'basic-email',
        from: company.name + " Online Management",
        data: [
          {
            name: 'logo',
            content: company.getLogoPath()
          },
          {
            name: 'headline',
            content: 'Your have a new lease.'
          },
          {
            name: 'content',
            content: `<p>Welcome! A new account has been set up for you.<br />
							Please click the link below to log in.</p>
							<br /><a style="color: #3dc6f2" href="${settings.getBaseUrl(company.subdomain)}/login">Click here to login</a><br />`
          }]
      }
    }else if (data.label === 'lead'){
      values.subject = 'We have received your inquiry!';
      values.template = {
        name: 'basic-email',
        from: company.name + " Online Management",
        data: [
          {
            name: 'logo',
            content: company.getLogoPath()
          },
          {
            name: 'headline',
            content: 'Thanks for getting in touch'
          },
          {
            name: 'content',
            content: `<p>We have received your inquiry and will reach out via as soon as possible.</p>
						<br /><br />Thanks,<br />${company.name}`
          }]
      }
    };


    values.company_id = company.id;
    values.contact_id = this.id;
    let logged_in_user = this.id;
    let owner_id = company.gds_owner_id;

    let deliveryMethod = new DeliveryMethod()
    await deliveryMethod.findByGdsKey(connection, 'standard_email')

    let attachments = [];
    await this.sendEmail(connection, 0, 'Tenant', values.subject,  values.template.data[2].content , attachments, logged_in_user, null, owner_id, null, deliveryMethod);

  }

  async findAccessCredentials(connection, property){
    if(!property.Access) {
      await property.getAccessControl(connection);
    }
    let access = await property.Access.getUser(this.id);
    this.Access = access;
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
      await property.verifyAccess({company_id, properties});
      await property.getAddress(connection);

      await this.findAccessCredentials(connection, property);

      let access = {
        access_id: property.Access.access_id,
        name: property.Access.access_name,
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

  async buildAllSpaceAccessCredentials(connection, company_id, properties){

    await this.verifyId();

    await this.getLeases(connection, company_id, properties);
    if(!this.Leases.length){
      return false;
    }

    const unique = [...new Set(this.Leases.map(l => l.Unit.property_id))];

    let space_access_list = [];

    for(let i = 0; i < unique.length; i++ ){

      let property = new Property({id: unique[i]});
      await property.find(connection);
      await property.verifyAccess({company_id, properties});
      await property.getAddress(connection);
      await property.getAccessControl(connection);

      await this.findAccessCredentials(connection, property);

      let access = {
        access_id: property.Access.access_id,
        name: property.Access.access_name,
        contact_id: this.id,
        property_id: property.id
      };

      if(this.Access){
        access = {
          ...access,
          id: this.Access.id,
          status: this.Access.status === 'ACTIVE'? 1 : 0,
          Spaces: this.Access.Spaces,
        };
      }
			
  
      access.Property = property;
      access.Access = property.Access.Credentials;

      let activeSpaces = access.Spaces?.filter(s => s.status === 'ACTIVE');

      if(activeSpaces){
        for(let j = 0; j < activeSpaces.length; j++){
          let unit = new Unit({
            id: activeSpaces[j].unit_id
          })
          await unit.find(connection);
  
          let space = await property.Access.getSpace(property.id, unit.id);
  
          let tmp = {
            contact_access_id: access.id,
            access_id: property.Access.access_id,
            name: property.Access.access_name,
            contact_id: this.id,
            property_id: property.id,
            soft_catch: space.soft_catch,
            late_catch: space.late_catch,
            hard_catch: space.hard_catch,
            pin: space.pin,
            unit_id: activeSpaces[j].unit_id,
            unit_number: unit.number,
            unit_type: unit.type,
            Property: property,
            Access: property.Access.Credentials
          }
          space_access_list.push(tmp)
        }
      }

    }
    return space_access_list;
  }

  async saveAccess(connection, property, body, lease, unit_id) {
    console.log('Finding the Access to specific user');
    await this.findAccessCredentials(connection, property);
    console.log('The Access to specific user =>', JSON.stringify(this.Access));

    let space_level = (property.Access.access_name.toLowerCase() === 'derrels');
    console.log('Use space level codes =>', space_level);

    let tmpPin;
    if(space_level){
      tmpPin = parseInt(body.pin.toString().slice(-4)).toString().padStart(4, '0');
    }


    if (space_level && property && property.Access && body && tmpPin && unit_id) await property.Access.validateSpaceCode(tmpPin, body.unit_number, unit_id);
    else if(property && property.Access && body && body.pin) await property.Access.validateCode(body.pin, this.id);

    if(!this.Phones?.length) {
			await this.getPhones(connection);
		}

    console.log('Access: Contact Phones ', this.Phones);

    let has_access = true;
    if (lease) {
      let today = moment().format('YYYY-MM-DD');
      has_access = lease.end_date === null || moment(lease.end_date) > moment(today);
    }
    console.log('has_access:', has_access);
    if (has_access) {
      if (this.Access) {
        console.log('Updating User with body =>', JSON.stringify(body));
        await property.Access.updateUser(this, body);
      } else {
        console.log('Creating User with body =>', JSON.stringify(body));
        await property.Access.createUser(this, body);
      }
      //if space level, make sure space code is 8 digits for Derrels
      if (space_level) {
        if (body?.pin?.length < 8) {
          let unitNumber;
          if (body.unit_number) {
            const numString = body.unit_number.toString();
            const leadingZeros = "0000";
            unitNumber = leadingZeros.substring(0, leadingZeros.length - numString.length) + numString;
            body.pin = unitNumber + body.pin;
          }
        }
        if (unit_id) {
          let unit = new Unit({ id: unit_id });
          await unit.find(connection);
          console.log('Creating space if non-existant with Unit => ', JSON.stringify(unit));
          let space = await property.Access.createSpaceIfNotExist(unit);
        }
        if (unit_id && body && body.pin) await property.Access.updateSpaceCode(property.id, unit_id, body.pin)
      }

    }

    console.log('Setting access to user to specific space');
    if(lease){
      console.log('Setting access to user to specific space with lease =>',JSON.stringify(lease));
      await property.Access.updateUserSpace(this, lease, body);
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
    this.employee_id = data.employee_id;

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

  static async findMatchedContact(connection, company_id, email, phone, first, last){

    return await models.Contact.findMatchedContact(connection, company_id, email, phone, first, last); 

  }
  
  static async checkForExisting(connection, params, company_id, exact){
    
    if(params.email){
      return  await models.Contact.findAllByEmail(connection, params.email,company_id, params.id)
    } else if(params.phone){
      // Here CC stands for Country Code
      let phoneWithoutCC = params.phone.length === 10? params.phone: params.phone.slice(-10);
      let phoneWithCC = params.phone.length === 10? `1${params.phone}`: params.phone.replace(/[+\s+]/g,"");

      let withoutCC = await models.Contact.findByPhone(connection, phoneWithoutCC, company_id, params.id);
      let withCC = await models.Contact.findByPhone(connection, phoneWithCC, company_id, params.id);
      return [...withoutCC, ...withCC];
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

  static async findActiveAdminsByCompanyId(connection, company_id){
    return await models.Contact.findActiveAdminsByCompanyId(connection, company_id)
  }

  static async findAdminsByPropertyId(connection, property_id, company_id){
    return await models.Contact.findAdminsByPropertyId(connection, property_id ,company_id)
  }


  static async validateAdminEmail(connection, email,company_id, existing_contact_id){
    let existing_contact =  await models.Contact.findAdminByEmail(connection, email,company_id);
    if( existing_contact  && existing_contact.id !== existing_contact_id){
            e.th(409,"This email already exists in our system. Please use a different email address.");
    }
  }

  static async saveCmsManager(connection, res, req, data){
    let gds_owner_id = res.locals.active.gds_owner_id;
    let totalPermissions = [];
    let properties = [];
    let roleId = data?.role_id;

    let ownerPermissions = cmsManager.getOwnerPermissions();
    let propertyPermissions = cmsManager.getFacilityPermissions();

    let permissions = await models.Role.findPermissions(connection, [roleId]);
    permissions?.forEach(permission => {
      if(permission.category === "CMS") {
        totalPermissions.push(permission.label)
      }
    })
    
    let selectedOwnerPermissions = findCommonElements(ownerPermissions, totalPermissions);
    let selectedFacilityPermissions = findCommonElements(propertyPermissions, totalPermissions);
    let totalProperties = [...data?.Properties, ...data?.NonHbProperties]
    totalProperties?.forEach(property => {
      let data = {
          id: property.gds_id,
          permissions: selectedFacilityPermissions ?? []
      }
      if(property.gds_id && selectedFacilityPermissions.length) properties.push(data)
    })

    let admin = {
      user: {
        name: {
          first: data?.first,
          last: data?.last
        },
        email: data?.email,
        phone: data?.Phones?.[0]?.phone ?? data?.phone
      },
      permissions: selectedOwnerPermissions ?? [],
      facilities: properties ?? []
    }
    cmsManager.save(gds_owner_id, admin, req);
  }

  
  async isOnLease(connection, lease_id){

    let check = await models.Contact.isOnLease(connection, lease_id, this.id);
    return !!check.length;

  }

  async getInteractions(connection, company_id, properties, conditions, searchParams){
    if(!this.id) e.th(500, "Contact id not set");
    if(!this.company_id){
      this.Interactions = [];
      return true;
    }
    console.log("conditions:", conditions)
    console.log("searchParams:", searchParams)

    let interactions = await models.Interaction.findAllInteractionsByContactId(connection, this.id, conditions, searchParams, properties);

    //console.log("INTERACTIONS", interactions )
    for (let i = 0; i < interactions.length; i++) {
		try {
		  let interaction = new Interaction(interactions[i]);
		  await interaction.findContact(connection);
		  await interaction.findEnteredBy(connection, this.company_id);
		  await interaction.findInteractionMethod(connection);
		  await interaction.findUploadsInteractions(connection);
		  this.Interactions.push(interaction); 
		} catch (error) {
		  console.log('#########Error processing interaction:#######', error);
		  continue;
		}
    }
    return true;
  }

  async getNotes(connection, company_id, searchParams) {
    if(!this.id) e.th(500, "Contact id not set");
    let notes = await models.Notes.findNotesByContactId(connection, this.id, searchParams);
    for (let contact_num = 0; contact_num < notes.length; contact_num++) {
      let enteredBy = new Contact({id : notes[contact_num].last_modified_by});
	  try {
      await enteredBy.find(connection);
	  } catch (err) {
		console.log(err);
        continue; 
	  }
      await enteredBy.getRole(connection, company_id);
      notes[contact_num].EnteredBy = enteredBy;
    }
    this.Notes = notes;
    return true;
  }

  async saveNote(connection, data) {
    if(!this.id) e.th(500, "Contact id not set");
    let notes = await models.Notes.save(connection, data);
    return notes;
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

  async getPayNowLink(connection, property_id, company, loggedInUserId){

    if(!property_id){
      await this.getLeases(connection);
      if(!this.Leases.length) e.th(400, "This contact has no active leases.");
      await this.Leases[0].getProperty(connection, company.id, null, loggedInUserId);
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

    /**
   * Function used to check verified phone is updated 
   * @param {Object} phoneDetails Phone number details
   * @param {Object} UpdatedPhoneDetails Updated phone details
   **/
  checkIfPhoneChanges(phoneDetails, UpdatedPhoneDetails) {
    if(phoneDetails?.phone && phoneDetails?.phone != UpdatedPhoneDetails.phone) {
      if(phoneDetails?.phone_verified) { 
        return null;
      }
    }
    else return UpdatedPhoneDetails?.verificationToken || null;
  }

  async savePhone(connection){
    
    let jobs = [], is_primary = 0;
    if(!connection) e.th(500, "Connection not set");

    // if(!this.Phones || !this.Phones.length) return;
    
    let phone_ids = this.Phones.map(p => p.id);
    console.info("Contact savePhone: Removing phone ids ", phone_ids);

    let existing_phones = await models.Contact.findPhones(connection, this.id);
    let extra_phone_ids = existing_phones.filter(p => p.id && !phone_ids.includes(p.id)).map(p => p.id);
    if(extra_phone_ids.length)
      await models.Contact.removePhonesByIds(connection, extra_phone_ids);

    is_primary = existing_phones.find(p => p.primary && phone_ids.includes(p.id)) ? 1 : 0;

    for(let i = 0; i< this.Phones.length; i++){
      let p = this.Phones[i];
      if(!p.phone) continue;

      let phone = await models.Contact.findPhone(connection, p.id)
      let phoneDetails = phone?.[0]
      let phoneSave = {}
      
      phoneSave = {
        contact_id: this.id,
        type: p.type || 'primary',
        phone: cleanPhoneNumber(p.phone),
        sms: p.sms || 0,
        verification_token: this.checkIfPhoneChanges(phoneDetails, p),
        phone_verified: this.checkIfPhoneChanges(phoneDetails, p) ? p?.phone_verified : 0
      }

      let insertion_meta_data = await models.Contact.savePhone(connection, phoneSave, p.id);
      p.id = p.id || insertion_meta_data.insertId

      console.info("Contact savePhone: Phone saved ", phoneSave);

      if(p?.verificationToken) {
        jobs.push({
          category: 'verify_phone_token',
          data: {
            cid: this.company_id,
            verification_token: p?.verificationToken || null,
            owner_id: this.gdsOwnerId,
            contact_id: this.id
          }
        });
      }
    }
    if(jobs.length) {
      await new Promise((resolve, reject) => {
        Scheduler.addJobs(jobs, err => {
          if(err) reject(err);
          resolve()
        });
      });
    }

    if(!is_primary && this.Phones.length) {
      let to_be_primary = this.Phones.reduce((prev, curr) => prev.id < curr.id ? prev : curr);
      await models.Contact.updatePrimaryContactPhones(connection, to_be_primary.id);
    }
    console.info("Contact savePhone: Updated primary contact phone");
  }

  async getTouchpoints(connection){
    this.Touchpoints = await models.Contact.getTouchpoints(connection, this.id);
  }

  async saveTouchpoints(connection, touchpoints, type){
    for (let i = 0; i < touchpoints.length; i++) {
      let tp = new Touchpoint();
      touchpoints[i].event_type = type;
      tp.make(touchpoints[i], this.id);
      await tp.save(connection);
      this.Touchpoints.push(tp)
    }
  }

  async getStatus(connection, properties = []){
    

    let status = await models.Contact.getStatus(connection, this.id, properties);


    // if(this.bankruptcy) {
    //   status = 'Bankruptcy';
    // } else {

    //   try {
    //     let leases = await models.Lease.findByContactId(connection, this.id, this.company_id);
    //     if(leases.length){
    //       status = "Active Lead";
    //       for( let i=0 ; i < leases.length; i++){
    //         if (leases[i].status === 0) continue;
    //         let lease = new Lease(leases[i])
    //         await lease.find(connection);
    //         await lease.getStanding(connection);

    //         let name = lease.Standing.name || 'Current';
    //         if(!status || status_priority[name] > status_priority[status]){
    //           status = name;
    //         }
    //       }
    //     } else {
    //       // let lead = await models.Lead.getLeadByContactId(connection, this.id);
    //       let leads = await models.Lead.findAllByContactId(connection, this.id, properties);
    //       if(leads.find(l => l.status.toLowerCase() == 'active')){
    //         status = 'Active Lead';
    //       } else {
    //         status = 'Retired Lead';
    //       }
    //     }
    //   } catch(err) {
    //     console.log("Err", err)
    //     //TODO Log error -
    //   }
    // }

//    await models.Contact.updateContactStatus(connection, this.id, status);
console.log("status_res.status", status); 
    this.status = status;

  }

  static async searchWithDelinquentLeases(connection, company_id, properties){
    return await models.Contact.searchWithDelinquentLeases(connection, company_id, properties)
  }

  async getLeasedProperties(connection) {
    if(!this.Leases || this.Leases.length === 0) return [];

    const uniquePropertiesIds = [...new Set(this.Leases.map(lease => lease.Unit.property_id))];

    let properties = [];

    for(let i = 0; i < uniquePropertiesIds.length; i++) {
      let property = new Property({id: uniquePropertiesIds[i]});

      await property.find(connection);
      await property.getUnitCount(connection);
      await property.getLeaseCount(connection);

      properties.push(property);
    }

    return properties;
  }

  // use_credits is used when we do payments of invoices through credits
  // and want to override credits amount used in invoice over invoice total balance
  async reconcile(connection, property_id, invoices = [], use_credits){
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

    for(let i = 0; i < payments.length; i++){
      let payment = new Payment({id: payments[i].id});
      await payment.find(connection);
      await payment.getPaymentApplications(connection);
      let payment_remaining = payment.payment_remaining;
      let invoicesToapply = [];

      for(let j = startInvoiceIndex; j < invoices.length; j++){
        let invoice = new Invoice(invoices[j]);
        await invoice.find(connection);

        if(use_credits && invoices[j].credits_amount_used) {
          invoice.balance = invoices[j].credits_amount_used;
        } else {
          await invoice.total();
        }

        if(invoice.balance <= payment_remaining){
          invoice.amount = invoice.balance;
          payment_remaining -= invoice.balance;
          startInvoiceIndex++;
        } else {
          invoice.amount = payment_remaining;
          payment_remaining = 0;
        }

        if(use_credits && invoices[j].credits_amount_used) {
          invoices[j].credits_amount_used -= invoice.amount;
        }

        invoicesToapply.push(invoice);

        if (leases.indexOf(invoice.lease_id) == -1) {
          leases.push(invoice.lease_id);
        }

        if(!payment_remaining) break;
      }

      if(invoicesToapply.length){
        await payment.applyToInvoices(connection, invoicesToapply);
      }

      if(startInvoiceIndex == invoices.length) break;
    }

    leases = leases.map(l_id => { return { id: l_id }});

    return {leases};
  }

  static async findContactsByLead(connection, company_id, params, properties, api) {
    let contacts = await models.Lead.findContactsByLead(connection, company_id, params,properties);
    let count = await models.Lead.findContactsCountByLead(connection, company_id, params, properties);
    let contact;
    let contactList = []
    for(let i=0; i<contacts.length; i++) {
      contact = new Contact(contacts[i]);
      await contact.getContactDetails(connection, api);
      await contact.getStatus(connection, properties);
      contactList.push(contact);
    }

    return {
      contact_list: contactList,
      count
    }
  }
  /* returns the first active lead */ 
  async getActiveLead(connection, property_id){
    let lead = await models.Lead.findActiveByContactId(connection, this.id, property_id);
    if(!lead) return;
    this.ActiveLead = new Lead(lead);
  }

  async getActiveLeadByLeaseId(connection, property_id, lease_id){
    let lead = await models.Lead.findActiveByContactId(connection, this.id, property_id);

    if (lead && !lead.lease_id) {
      this.ActiveLead = new Lead(lead);
    } else {
      lead = await models.Lead.findActiveByContactIdAndLeaseId(connection, this.id, property_id, lease_id)
      if(!lead) return;
      this.ActiveLead = new Lead(lead);
    }
  }
  
  async findLeadByContactIdAndLeaseId(connection, property_id, lease_id){
    let lead = await models.Lead.findLeadByContactIdAndLeaseId(connection, this.id, property_id, lease_id);

    if (lead) {
      this.Lead = new Lead(lead);
    }
    return
  }

  async getLeads(connection, properties){
   let leads =  await models.Lead.findAllByContactId(connection, this.id, properties);
    console.log("before", leads);
    leads.sort((a,b) => {
      console.log("a.status < b.status", a.status, b.status, a.status < b.status)
      if (a.status > b.status) return 1;
      if (a.status < b.status) return -1;
      return 0
    })
    console.log("after", leads);
   this.Leads = leads.map(l => {
     let lead = new Lead(l);
     
     lead.Lease = {};
     lead.Reservation = {};

     lead.CreatedBy = {
       id: l.created_by,
       name: l.lead_created_by
     }

     lead.Contact = {
        id: l.contact_id,
        first: l.first,
        last: l.last, 
        email: l.email, 
      };
      lead.Property = {
        id: l.property_id,
        name: l.property_name
      };
      lead.Unit = {
        id: l.unit_id,
        number: l.lead_unit_number,
        label: l.unit_label,
        price: l.unit_price
      };
      lead.Category = {
        id: l.category_id,
        name: l.unit_category_name
      };
      
      if(l.lease_id){
        lead.Lease = {
          status: l.lease_status,
          rent: l.quoted_price,
          id: l.lease_id,
          unit_id: l.lease_unit_id,
          Unit: {
            id: l.lease_unit_id,
            number: l.lease_unit_number,
            Property:{
              id: l.lease_property_id
            }
          }
        }
        
        if(l.reservation_id){
          lead.Reservation = {
            id: l.reservation_id,
            expires: l.reservation_expires, 
            time: l.reservation_time
          }
        }
      }
      return lead;
   }); 


  }

  async getDelinquencies(connection, properties){
    
    this.Delinquencies = [];

    let delinquencies = await models.Delinquency.getDelinquentLeasesByContactId(connection, this.id, properties);
    
    for(let i = 0; i < delinquencies.length; i++){
    
      let delinquency = new Delinquency({id: delinquencies[i].id});
      
      try {
    
        await delinquency.find(connection);
        await delinquency.findLease(connection);
        await delinquency.findActions(connection);
        await delinquency.findPauses(connection);
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
			if(this.Access && this.Access.status === 'SUSPENDED') {
				await property.Access.restoreUser(this.id);
			}
		} catch(err) {
			console.log('Err in access update ', err);
		}
  }

  async saveDefaultReports(connection, company){
    
    await this.getPermissions(connection, company.id);
    
    for(let i=0; i < this.Permissions.length; i++){
      let template =  '';
      let name = '';
      let default_filters = {}
      let reports = [];
      switch(this.Permissions[i].label){
        case 'create_leads':

          reports.push({
            template: 'lead_activity',
            name: 'Leads',
            default_filters: {
              lead_created_by: [Hashes.encode(this.id, connection.cid)]
            }
          });
          
          
          
          break;
        case 'create_rentals':
          reports.push({
            template: 'rentals',
            name: 'Rentals',
            default_filters: {
              lease_created_by: [Hashes.encode(this.id, connection.cid)]
            }
          });
          
          reports.push({
            template: 'pending_move_in_activity',
            name: 'Pending Move Ins',
            default_filters: {
              lease_created_by: [Hashes.encode(this.id, connection.cid)]
            }
          });
          break;
        case 'accept_payments':
                    
          reports.push({
            template: 'payments',
            name: 'Payments',
            default_filters: {
              payment_accepted_by: [Hashes.encode(this.id, connection.cid)]
            }
          });
          break;
        default: 
          continue;  
      }

      for(let i = 0; i < reports.length; i++){
        let existing_reports = await Report.findSaved(connection, this.id, company.id, reports[i].template);
        if(existing_reports.length) continue; 

        let report = new Report({
          template: reports[i].template,
          connection: connection,
          company: company,
        });
        console.log(reports[i])
        
        await report.setUpReport();  
        report.reportClass.parseConfig();
        report.reportClass.config.filters.search = Object.assign(report.reportClass.config.filters.search, reports[i].default_filters);
      
        let data = {
          name: `${this.first} ${reports[i].name}`,
          description: `This is an autogenerated ${name.toLowerCase()} report for ${this.first}`,
          filters: report.reportClass.config.filters,
          is_default: 0,
          path: '',
          template: report.template,
          type: 'application'
        }
  
        let r = new Report();
        r.create(data, this.id, company.id);
        await r.save(connection);

      }
    }
    
    return;




  }

  async convertActiveLeads(connection, lease_id, property_id, unit_id){
    await models.Lead.convertActiveLeads(connection, this.id, lease_id, property_id, unit_id);
  }

  static async getMessageList(connection, company_id, properties, read_status, query) {
    return await models.Interaction.findAllInteractorsByContactId(connection, company_id, properties, read_status, query)
  }

  static async getUnreadMessages(connection, company_id, properties, query){
    return await models.Interaction.findAllUnreadMessages(connection, company_id, properties, query)
  }

  static async validateCoWorkers(connection ,send_to){

  let invalid_phones = [];
  
  await Promise.all(send_to.map(async contact => {
    let phone;

    let phones = await models.Contact.findPhones(connection, contact.contact_id);

    if(phones && phones.length){
      phone = phones.find(p => p.type == 'primary' );
      (phone && phone.phone) && (!phoneValidator.isValidPhoneNumber('+' + phone.phone) ? invalid_phones.push('+' + phone.phone):'');    
    }

  }));
  return invalid_phones;

  }

  async updateAccessStatus(connection, payload) {
    const { property } = payload;
    await this.findAccessCredentials(connection, property);
    if (this.Access?.status?.toUpperCase() === ENUMS.GATE_ACCESS.CONTACT_STATUS.SUSPENDED.toUpperCase()) {
      await property.Access.restoreUser(this.id);
    }
  }

  async findBalance(connection, payload) {
    const result = await models.Billing.findBalance(connection, {
      contact_id: this.id,
      ...payload
    });

    this.balance = result.balance;
  }

  async getPermissionProperties(connection, data){
    let {ipp_feature, company_id, cid, properties, gps_selection}  = data

    let is_hb_user = connection.meta.is_hb_user;

    if(!properties.length) return;

    if(is_hb_user && ipp_feature && gps_selection?.length) {
      let payload = {company_id, cid, properties, gps_selection}
      await this.ipModePermissionProperties(connection, payload)
    }
    else {
      let payload = {company_id, cid, properties}
      await this.primaryModePermissionProperties(connection, payload)
    }
  }

  async ipModePermissionProperties(connection, data) {
    let {company_id, cid, properties, gps_selection} = data;
    let unselected_gps_props = [];
    let selected_gps_props = [];

    let gps_selection_map = new Map();

    for(let i=0; i<gps_selection.length; i++){
      gps_selection_map.set(gps_selection[i], true);
    }
    
    for(let i=0; i<properties.length; i++) {
      let prop = properties[i]

      if(gps_selection_map.has(prop)) 
        selected_gps_props.push({p_id: prop, hash_id: Hashes.encode(prop, cid)})
      else 
        unselected_gps_props.push({p_id: prop, hash_id: Hashes.encode(prop, cid)})
    }

    let payload = {company_id, id: this.id, selected_prop_hash: selected_gps_props, unselected_prop_hash: unselected_gps_props}
    this.permission_properties = await models.Contact.findIpModePropertyPermissions(connection, payload);
  }

  async primaryModePermissionProperties(connection, data) {
    let {company_id, cid, properties} = data;
  
    let properties_hash = properties?.map(p => { 
      return {p_id: p, hash_id: Hashes.encode(p, cid)}
    })
    
    this.permission_properties = await models.Contact.findPropertyPermissions(connection, {company_id, id: this.id, properties_hash});
  }

  async getPropertiesByRoles(connection, company_id){
    this.RolesProperties = [];
    let roles_properties = await models.Contact.getPropertiesByRoles(connection, {company_id, contact_id: this.id});

    roles_properties.forEach(rp => {
      rp.Properties = rp.Properties?.split(',').map(p => +p);
      rp.NonHbProperties = rp.NonHbProperties?.split(',').map(p => +p);
      this.RolesProperties.push(rp)
    })

  }

  async savePropertiesAccessInBulk(connection, properties, company_contact_role_id){
    if(!company_contact_role_id) e.th(500, "Contact role id not set");

    let data = [];
    properties.forEach(p => {
      data.push({property_id: p, company_contact_role_id})
    })

    await models.Role.savePropertiesInBulk(connection, data);
  }

  async saveNonHbPropertiesAccessInBulk(connection, properties, company_contact_role_id){
    if(!company_contact_role_id) e.th(500, "Contact role id not set");

    let data = [];
    properties.forEach(p => {
      data.push({property_id: p, company_contact_role_id})
    })

    await models.Role.saveNonHBPropertiesInBulk(connection, data);
  }

  static async dropRole(connection, payload){
    let {company_id} = payload;

    let role = new Role({company_id, name: ENUMS.ROLES.INTER_PROPERTY_OPERATIONS})
    await role.find(connection)
    let role_id = role?.id;

    if(!role_id) return
    let roles_to_be_deleted = await models.Contact.findContactRoleByCompany(connection, company_id, role_id);
    if(!roles_to_be_deleted.length) return
    roles_to_be_deleted = roles_to_be_deleted.map(item => item.id);
    await models.Role.deletePropertiesBulk(connection, [], roles_to_be_deleted);
    await models.Role.deleteCompanyContactRoleBulk(connection, roles_to_be_deleted);
  }

  static async getContactLeasesOmniSearch(connection, payload){
    let records = []
    if(payload.contact_ids?.length) {
      records = await models.Contact.contactLeasesOmniSearch(connection, payload)
      records.forEach(function(record){
        record.Leases = record.Leases.map(lease => JSON.parse(lease))
        record.Leases = record.Leases.filter(lease => lease !== null)
        record.Phones = JSON.parse(record.Phones)
        record.Leases.sort(Contact.sortAllLeasesFn)
      });
    }
    return records
  }


  async verifyContactProperties(connection, payload){
    let contact_ids = [this.id, payload.secondary_contact_id];
    let result = await models.Contact.getContactLeasesForProperties(connection, contact_ids);

    if (result && result.length && result[0].properties_count > 1) e.th(400, `Unable to link as tenant ${result[0].tenant_name} have leases in multiple properties.`);
    if (result && result.length && result[0].property_ids !== result[1].property_ids) e.th(400, `Unable to link as we do not allow linking across property.`);

    console.log("verifyContactProperties result:", result);
    return;
  }

  async linkContacts(connection, payload) {

    const { secondary_contact_id, login_user_id, company, property_id } = payload;

    const response = await models.Contact.insertInContactHistoryTable(connection, secondary_contact_id);
    console.log('RESPONSE AFTER INSERTION')
    console.log(response)

    const contact_history_id = response.insertId 

    const records = {
      primary_contact_id: this.id,
      secondary_contact_id,
      contact_history_id
    }

    await models.Contact.linkContactLeases(connection, records);
    await models.Contact.linkContactLeads(connection, records);
    await models.Contact.linkInvoicePayments(connection, records);
    await models.Contact.linkContactInvoices(connection, records);
    await models.Contact.linkContactPayments(connection, records);
    await models.Contact.linkContactPaymentMethods(connection, records);
    await models.Contact.linkContactInteractions(connection, records);
    await models.Contact.linkContactActivity(connection, records);
    await models.Contact.linkContactUploadSigners(connection, records);
    
    await models.Contact.linkContactPhones(connection, records);
    await models.Contact.linkContactLocations(connection, records);
    await models.Contact.linkContactRelationship(connection, records); 
    await models.Contact.linkContactNotes(connection, records); 
    await models.Contact.linkContactVehicles(connection, records); 
    await models.Contact.linkContactCredentials(connection, records); 
    await models.Contact.linkContactBusinesses(connection, records);
    await models.Contact.linkContactEmployment(connection, records);
    await models.Contact.linkContactToken(connection, records);
    await models.Contact.linkContactUpload(connection, records);
    await models.UnlinkHistory.updateUnlinkHistory(connection, records);

    try {
      let access = new AccessControl(connection.meta);
      await access.getToken(connection, company, login_user_id)
      await access.linkContact(connection, this.id, secondary_contact_id, property_id);

      await models.Contact.linkContactHistory(connection, this.id, contact_history_id, login_user_id);
      await models.Contact.removeSecondaryContact(connection, secondary_contact_id);
      
    } catch (error) {
      console.log(error);
      console.log("Error while updating users spaces table in gate-access");
      throw error;
    }

    return;
  }
      
  async duplicateContactBusiness(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactBusiness(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactBusiness(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async duplicateContactLocations(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactLocation(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactLocations(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async duplicateContactMilitary(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactMilitary(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactMilitary(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async updatePaymentsForLease(connection, payload){
    let result = [];

    // It will update all the payments without payment_methods_id
    let payments = await models.Payment.updatePaymentsContactId(connection, payload);

    // This will deal with payments that have payment_methods_id
    // Here are steps in which it will work
    // 1. Get all payment_methods for that tenant
    // 2. Take one payment_method
    // 3. Duplicate its address and get new address_id
    // 4. Duplicate payment_methods with new address id
    // 5. Update lease_payment_methods base on payment_method_id and lease_id
    // 6. Update contact_id of all the payments with the following payment_methods and lease_id
    let payment_methods = await models.Payment.getAllPaymentMethods(connection, payload.contact_id);
    if (payment_methods && payment_methods.length > 0){
      for (const payment_method of payment_methods) {
        let new_address_id = payment_method.address_id ? await models.Address.duplicateAddress(connection, payment_method.address_id) : null;
        
        let params = payload
        params.new_address_id = new_address_id;
        params.payment_method_id = payment_method.id

        let new_payment_methods_id = await models.Payment.duplicatePaymentMethod(connection, params);

        params.new_payment_methods_id = new_payment_methods_id;

        let lease_payment_methods = await models.Payment.updateLeasePaymentMethod(connection, params);
        let payments = await models.Payment.updatePaymentsContactId(connection, params);

        result.push({
          address_id: new_address_id,
          new_payment_methods_id: new_payment_methods_id,
          lease_payment_methods: lease_payment_methods,
          payments: payments
        })
      }
    }

    result.push({
      payments: payments
    })

    return result
  }

  async updateGateAccess(connection, params, lease){
    try {
      let new_contact = new Contact({ id: params.new_contact_id });
      await new_contact.find(connection, params.company.id, params.properties);
      await new_contact.getLeases(connection, params.company.id, params.properties);

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: params.company.id, properties: params.properties});
      await property.getAccessControl(connection);

      // Remove Access Control if Already Exist
      if(property?.Access){
        try {
          await property.Access.removeContactFromSpace(this, lease.Unit.id, lease.Unit.property_id);
        } catch (error) {
          console.log(error)
        }
      }

      if (params?.unit_id) {
        await new_contact.saveAccess(connection, property, params, lease, params?.unit_id);
      } else {
        await new_contact.saveAccess(connection, property, params, lease);
      }

      params.unit_id = lease.Unit.id;
      params.contact_id = this.id;
      let results = await property.Access.updateSpaceGateAccess(params);

      return{
        old_user_id: results.data?.old_user_id,
        new_user_id: results.data?.new_user_id
      }

    } catch (error) {
      console.log(error);
      console.log("Error while updating users spaces table in gate-access");
      throw error;
    }
  }

  async unlinkLease(connection, params) { 
    // Find lease details
    let lease = new Lease({id: params.lease_id});
    await lease.find(connection)
    await lease.verifyLeasePayment(connection, this.id);
    await lease.findUnit(connection)

    // Duplicate contact
    let new_contact_id = await models.Contact.duplicateContactDetails(connection, this.id);

    let payload = {
      lease_id: lease.id,
      contact_id: this.id,
      new_contact_id: new_contact_id
    }

    console.log("unlinkLease payload:", payload)

    // Duplicate details of contacts
    await models.Contact.duplicateContactPhones(connection, payload);
    await models.Contact.duplicateContactEmployment(connection, payload);
    await models.Contact.duplicateContactCredentials(connection, payload);
    await models.Contact.duplicateContactRelationship(connection, payload);
    await models.Contact.updateContactRelationshipContactId(connection, payload);
    await models.Contact.duplicateContactTokens(connection, payload);
    await models.Contact.updateVehiclesContactId(connection, payload);
    await this.duplicateContactLocations(connection, payload);
    await this.duplicateContactBusiness(connection, payload);
    await this.duplicateContactMilitary(connection, payload);
    
    // Update interaction and notes
    await models.Interaction.updateInteractionContactId(connection, payload);
    await models.Notes.updateNotesContactId(connection, payload);

    // Update lease, payments, invoices and documents
    await this.updatePaymentsForLease(connection, payload);
    await models.Invoice.updateInvoicesContactId(connection, payload);
    await models.ContactLeases.updateContactLeaseContactId(connection, payload);
    await models.Lead.updateLeadContactId(connection, payload);
    await models.LeaseAuction.updateLeaseAuctionContactId(connection, payload);
    await models.Upload.updateUploadsContactId(connection, payload);

    // Duplicate activities of contact
    await models.Activity.duplicateActivities(connection, payload);

    // Update Gate-access for contact and user
    params.new_contact_id = new_contact_id;
    let result = await this.updateGateAccess(connection, params, lease)

    await models.UnlinkHistory.save(connection, {
      created_by: params.logged_in_user.id,
      old_contact_id: this.id,
      new_contact_id: new_contact_id,
      lease_id: lease.id,
      old_gate_access_user_id: result.old_user_id,
      new_gate_access_user_id: result.new_user_id,
    });
    
    return {
      new_contact_id: new_contact_id,
      old_contact_id: this.id,
      lease_id: lease.id
    };
  }

  async getSMSContactsByContactId(connection){
    const SMSNumberList = await models.Contact.getSMSContactsByContactId(connection, this.id)
    return SMSNumberList;
  }

  async getPrimaryRoleProperties(connection) {
    let data = {id: this.id, company_id: this.company_id};
    let props =  await models.Contact.getPrimaryRoleProperties(connection, data);
        
    return props?.properties;
  }


  // async getAllProperties(connection){
  //   let data = {
  //     companyId: this.company_id, 
  //     contactId: this.id
  //   }
    
  //   let properties = await models.Contact.getAllProperties(connection, data);
  //   properties = properties.map(p => p.property_id)
  //   return properties;
  // }
  async verifyContactProperties(connection, payload){
    let contact_ids = [this.id, payload.secondary_contact_id];
    let result = await models.Contact.getContactLeasesForProperties(connection, contact_ids);

    if (result && result.length && result[0].properties_count > 1) e.th(400, `Unable to link as tenant ${result[0].tenant_name} have leases in multiple properties.`);
    if (result && result.length && result[0].property_ids !== result[1].property_ids) e.th(400, `Unable to link as we do not allow linking across property.`);

    console.log("verifyContactProperties result:", result);
    return;
  }

  async linkContacts(connection, payload) {

    const { secondary_contact_id, login_user_id, company, property_id } = payload;

    const response = await models.Contact.insertInContactHistoryTable(connection, secondary_contact_id);
    console.log('RESPONSE AFTER INSERTION')
    console.log(response)

    const contact_history_id = response.insertId 

    const records = {
      primary_contact_id: this.id,
      secondary_contact_id,
      contact_history_id
    }

    await models.Contact.linkContactLeases(connection, records);
    await models.Contact.linkContactLeads(connection, records);
    await models.Contact.linkInvoicePayments(connection, records);
    await models.Contact.linkContactInvoices(connection, records);
    await models.Contact.linkContactPayments(connection, records);
    await models.Contact.linkContactPaymentMethods(connection, records);
    await models.Contact.linkContactInteractions(connection, records);
    await models.Contact.linkContactActivity(connection, records);
    await models.Contact.linkContactUploadSigners(connection, records);
    
    await models.Contact.linkContactPhones(connection, records);
    await models.Contact.linkContactLocations(connection, records);
    await models.Contact.linkContactRelationship(connection, records); 
    await models.Contact.linkContactNotes(connection, records); 
    await models.Contact.linkContactVehicles(connection, records); 
    await models.Contact.linkContactCredentials(connection, records); 
    await models.Contact.linkContactBusinesses(connection, records);
    await models.Contact.linkContactEmployment(connection, records);
    await models.Contact.linkContactToken(connection, records);
    await models.Contact.linkContactUpload(connection, records);
    await models.UnlinkHistory.updateUnlinkHistory(connection, records);

    try {
      let access = new AccessControl(connection.meta);
      await access.getToken(connection, company, login_user_id)
      await access.linkContact(connection, this.id, secondary_contact_id, property_id);

      await models.Contact.linkContactHistory(connection, this.id, contact_history_id, login_user_id);
      await models.Contact.removeSecondaryContact(connection, secondary_contact_id);
      
    } catch (error) {
      console.log(error);
      console.log("Error while updating users spaces table in gate-access");
      throw error;
    }

    return;
  }
      
  async duplicateContactBusiness(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactBusiness(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactBusiness(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async duplicateContactLocations(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactLocation(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactLocations(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async duplicateContactMilitary(connection, params){
    let result = [];
    let contact_businesses = await models.Contact.getAllContactMilitary(connection, params.contact_id);
    if (contact_businesses && contact_businesses.length > 0){
      await Promise.all(contact_businesses.map(async contact_business => {
        let new_address_id = contact_business.address_id ? await models.Address.duplicateAddress(connection, contact_business.address_id) : null;
        let payload = {
          new_contact_id: params.new_contact_id,
          contact_id: params.contact_id,
          new_address_id: new_address_id,
          address_id: contact_business.address_id
        }
        let contact_business_id = await models.Contact.duplicateContactMilitary(connection, payload);
        result.push({
          address_id: new_address_id,
          contact_business_id: contact_business_id
        })
      }));
    }

    return result
  }

  async updatePaymentsForLease(connection, payload){
    let result = [];

    // It will update all the payments without payment_methods_id
    let payments = await models.Payment.updatePaymentsContactId(connection, payload);

    // This will deal with payments that have payment_methods_id
    // Here are steps in which it will work
    // 1. Get all payment_methods for that tenant
    // 2. Take one payment_method
    // 3. Duplicate its address and get new address_id
    // 4. Duplicate payment_methods with new address id
    // 5. Update lease_payment_methods base on payment_method_id and lease_id
    // 6. Update contact_id of all the payments with the following payment_methods and lease_id
    let payment_methods = await models.Payment.getAllPaymentMethods(connection, payload.contact_id);
    if (payment_methods && payment_methods.length > 0){
      for (const payment_method of payment_methods) {
        let new_address_id = payment_method.address_id ? await models.Address.duplicateAddress(connection, payment_method.address_id) : null;
        
        let params = payload
        params.new_address_id = new_address_id;
        params.payment_method_id = payment_method.id

        let new_payment_methods_id = await models.Payment.duplicatePaymentMethod(connection, params);

        params.new_payment_methods_id = new_payment_methods_id;

        let lease_payment_methods = await models.Payment.updateLeasePaymentMethod(connection, params);
        let payments = await models.Payment.updatePaymentsContactId(connection, params);

        result.push({
          address_id: new_address_id,
          new_payment_methods_id: new_payment_methods_id,
          lease_payment_methods: lease_payment_methods,
          payments: payments
        })
      }
    }

    result.push({
      payments: payments
    })

    return result
  }

  async updateGateAccess(connection, params, lease){
    try {
      let new_contact = new Contact({ id: params.new_contact_id });
      await new_contact.find(connection, params.company.id, params.properties);
      await new_contact.getLeases(connection, params.company.id, params.properties);

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: params.company.id, properties: params.properties});
      await property.getAccessControl(connection);

      // Remove Access Control if Already Exist
      if(property?.Access){
        try {
          await property.Access.removeContactFromSpace(this, lease.Unit.id, lease.Unit.property_id);
        } catch (error) {
          console.log(error)
        }
      }

      if (params?.unit_id) {
        await new_contact.saveAccess(connection, property, params, lease, params?.unit_id);
      } else {
        await new_contact.saveAccess(connection, property, params, lease);
      }

      params.unit_id = lease.Unit.id;
      params.contact_id = this.id;
      let results = await property.Access.updateSpaceGateAccess(params);

      return{
        old_user_id: results.data?.old_user_id,
        new_user_id: results.data?.new_user_id
      }

    } catch (error) {
      console.log(error);
      console.log("Error while updating users spaces table in gate-access");
      throw error;
    }
  }

  async unlinkLease(connection, params) { 
    // Find lease details
    let lease = new Lease({id: params.lease_id});
    await lease.find(connection)
    await lease.verifyLeasePayment(connection, this.id);
    await lease.findUnit(connection)

    // Duplicate contact
    let new_contact_id = await models.Contact.duplicateContactDetails(connection, this.id);

    let payload = {
      lease_id: lease.id,
      contact_id: this.id,
      new_contact_id: new_contact_id
    }

    console.log("unlinkLease payload:", payload)

    // Duplicate details of contacts
    await models.Contact.duplicateContactPhones(connection, payload);
    await models.Contact.duplicateContactEmployment(connection, payload);
    await models.Contact.duplicateContactCredentials(connection, payload);
    await models.Contact.duplicateContactRelationship(connection, payload);
    await models.Contact.updateContactRelationshipContactId(connection, payload);
    await models.Contact.duplicateContactTokens(connection, payload);
    await models.Contact.updateVehiclesContactId(connection, payload);
    await this.duplicateContactLocations(connection, payload);
    await this.duplicateContactBusiness(connection, payload);
    await this.duplicateContactMilitary(connection, payload);
    
    // Update interaction and notes
    await models.Interaction.updateInteractionContactId(connection, payload);
    await models.Notes.updateNotesContactId(connection, payload);

    // Update lease, payments, invoices and documents
    await this.updatePaymentsForLease(connection, payload);
    await models.Invoice.updateInvoicesContactId(connection, payload);
    await models.ContactLeases.updateContactLeaseContactId(connection, payload);
    await models.Lead.updateLeadContactId(connection, payload);
    await models.LeaseAuction.updateLeaseAuctionContactId(connection, payload);
    await models.Upload.updateUploadsContactId(connection, payload);

    // Duplicate activities of contact
    await models.Activity.duplicateActivities(connection, payload);

    // Update Gate-access for contact and user
    params.new_contact_id = new_contact_id;
    let result = await this.updateGateAccess(connection, params, lease)

    await models.UnlinkHistory.save(connection, {
      created_by: params.logged_in_user.id,
      old_contact_id: this.id,
      new_contact_id: new_contact_id,
      lease_id: lease.id,
      old_gate_access_user_id: result.old_user_id,
      new_gate_access_user_id: result.new_user_id,
    });
    
    return {
      new_contact_id: new_contact_id,
      old_contact_id: this.id,
      lease_id: lease.id
    };
  }
}

module.exports = Contact;
var Company			= require('../classes/company.js');
var Lease			= require('../classes/lease.js');
var Lead			= require('../classes/lead.js');
var Address     	= require('../classes/address.js');
var Application 	= require('../classes/application.js');
var Property    	= require('../classes/property.js');
var DeliveryMethod    	= require('../classes/delivery_method.js');
var Reservation 	= require('../classes/reservation.js');
var Payment 		= require('../classes/payment.js');
var Invoice		 	= require('../classes/invoice.js');
var Report		 	= require('../classes/report.js');
var Scheduler 		= require(__dirname + '/../modules/scheduler.js');
var Delinquency 	= require(__dirname + '/../classes/delinquency.js');
var Interaction 	= require(__dirname + '/../classes/interaction.js');
var Email 	= require(__dirname + '/../classes/email.js');
var Mail 	= require(__dirname + '/../classes/mail.js');
var Sms 	= require(__dirname + '/../classes/sms.js');
var Role 			= require(__dirname + '/../classes/role.js');
var Touchpoint = require('./touchpoints.js');
var { sendSMS } 	= require('./../modules/sms');
var { sendEmail, sendMail } 	= require('./../modules/mail');
const { CommandingOfficer } = require('../validation/objects/military.js');
const upload = require('../models/upload.js');
var phoneValidator = require('libphonenumber-js');
const { Console } = require('console');


const ENUMS = require('../modules/enums');const AccessControl = require('./access_control');
const Unit = require('./unit');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
