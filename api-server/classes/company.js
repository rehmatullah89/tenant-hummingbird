"use strict";

var models  = require(__dirname + '/../models');
var Settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Company {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.gds_owner_id = data.gds_owner_id;
		this.name = data.name;
		this.firstname = data.firstname;
		this.lastname = data.lastname;
		this.email = data.email;
		this.phone = data.phone;
		this.subdomain = data.subdomain;
		this.logo = data.logo;
		this.msg = '';
		this.Settings = {};
		this.Roles = [];
		this.webLogo = data.webLogo;
		this.platform_integration_enabled = data.platform_integration_enabled;
	}

	validate(){

		return Promise.resolve().then(() => {
			if (!this.name) e.th(400, 'Invalid name')
			if (!this.firstname) e.th(400, 'Please enter the primary contact\'s first name')
			if (!this.lastname) e.th(400, 'Please enter the primary contact\'s last name')
			if (!this.email || !validation.validateEmail(this.email)) e.th(400, 'Please enter a valid email')
			if (!this.phone) e.th(400, 'Please enter a phone number for this company')
			if (!this.subdomain) e.th(400, 'Please enter a subdomain for this company')
			return true;
		})

	}

    /**
     * Onboard a new company
     * @param {Object}  connection
     * @param {Object}  contact Contact details
     */
	async onboardCompany(connection, contact) {
		await this.validate();
		let companyDetails = {
			id: this.id,
			name: this.name,
			firstname: this.firstname,
			lastname: this.lastname,
			gds_owner_id: this.gds_owner_id,
			email: this.email,
			phone: this.phone,
			subdomain: this.subdomain,
			logo: this.logo,
			platform_integration_enabled: this.platform_integration_enabled ?? 0,
			active: 1
		};
		/* Save company details */
		if (companyDetails.id) await models.Company.save(connection, companyDetails);
		
		let roleDetails = {
			company_id: this.id,
			name: "Super Admin"
		};
		/* Save role */
		let result = await models.Role.save(connection, roleDetails, null)
		let roleId = result?.insertId;
		
		/* Get all permissions */
		let totalPermissions = await models.Role.findAllPermissions(connection);
		
		/* Assign all permissions to the created role */
		await totalPermissions?.forEach(async (permissions) => {
			await models.Role.savePermission(connection, permissions, roleId);
		})
		/* Get roles for the created company */
		await this.getRoles(connection)
		
		/* Save user role for the contact */
		await models.User.saveUserRole(connection, {
			company_id: this.id,
			contact_id: contact.id,
			role_id: roleId,
			status: true
		});
	  }

	async create(connection){

	  await this.validate()
			let c = await models.Company.findBySubdomain(connection, this.subdomain);
      if(c) e.th(409, 'A company with this sub domain already exists. Please choose a different subdomain.');

      var save = {
        name: this.name,
        firstname: this.firstname,
        lastname: this.lastname,
        gds_owner_id: this.gds_owner_id,
        email: this.email,
        phone: this.phone,
        subdomain: this.subdomain,
        logo: this.logo,
        active: 1
      };
      let company_id = await  models.Company.save(connection, save, this.id);


      this.id = company_id;
      let roles = await models.Admin.findDistinctRoles(connection);

      for(let i = 0; i < roles.length; i++){
        await models.User.saveUserRole(connection, { company_id: this.id, contact_id: 1010, role_id: roles[i].id});
      }

			await  models.Document.saveDocumentType(connection, {company_id: this.id, name:'Lease',  active:1 });

			await  models.Product.save(connection, {company_id: this.id, name:'Rent',  status:1, type: 'Product', default_type: 'rent' })
			await  models.Product.save(connection, {company_id: this.id, name:'Late Fee',  status:1, type: 'Product', default_type: 'late' })
			await  models.Product.save(connection, {company_id: this.id, name:'Security Deposit',  status:1, type: 'Product', default_type: 'security' })

			// Settings
			await  models.Setting.save(connection, {company_id: this.id, name:'reservationExpiration',  value: '1' })
			await  models.Setting.save(connection, {company_id: this.id, name:'authnetLogin',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'twilioPhone',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'forteLogin',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'forteKey',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'forteOrganizationId',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'forteLocationId',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'taxRate',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbOauthToken',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbOauthTokenSecret',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbDepositLiability',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbIncomeAccount',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbPrepaymentLiability',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbTaxCode',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbTokenRenewal',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'qbRealmId',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'invoiceChargeOffset',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'notificationEmails',  value: '[' + this.email + ']' })
			await  models.Setting.save(connection, {company_id: this.id, name:'incomingCalls',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'twilioRedirect',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'twilioSMSRedirect',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'transunionUser',  value: '' })
			await  models.Setting.save(connection, {company_id: this.id, name:'transunionPassword',  value: '' })
			await  models.Setting.savePromoType(connection, {name: 'military', company_id: this.id });
			await  models.Setting.savePromoType(connection, {name: 'student', company_id: this.id });
			await  models.Setting.savePromoType(connection, {name: 'senior', company_id: this.id });
			await  models.Setting.saveLeaseStanding(connection, { name: 'Good', company_id: this.id, sort: 0, type: 'default' });
			await  models.Setting.saveLeaseStanding(connection, { name: 'Past Due', company_id: this.id, sort: 1, type: 'past_due' });

	}

	async find(connection, payload = {}) {
		if (!this.id) e.th(500, "Id is required to find company");
		const { should_find_details = true } = payload;

		const company = await models.Company.findById(connection, this.id);
		if(should_find_details) {
			return await this.findDetails(connection, company);
		} else {
			this.assembleCompany(company);
		}
	}

	async findBySubdomain(connection){

		if (!this.subdomain) e.th(500, "No subdomain is set");
		let company = await models.Company.findBySubdomain(connection, this.subdomain);
		return await this.findDetails(connection, company)
  	}

	async findByGdsID(connection){

		if(!this.gds_owner_id) e.th(500, "No owner id found");
		let company = await models.Company.findByGdsID(connection, this.gds_owner_id);
		return await this.findDetails(connection, company)
	}

	assembleCompany(data) { 
		this.id = data.id;
		this.name = data.name;
		this.gds_owner_id = data.gds_owner_id;
		this.firstname = data.firstname;
		this.lastname = data.lastname;
		this.email = data.email;
		this.phone = data.phone;
		this.subdomain = data.subdomain;
		this.logo = data.logo;
		this.platform_integration_enabled = data.platform_integration_enabled;
	}

	async findDetails(connection, data){

		if(!data) e.th(404, 'Company not found.');
		this.assembleCompany(data);

		let settings = await models.Setting.findAllSettings(connection, this.id);

		settings.map(setting => {

			if(setting.name == 'notificationEmails'){
				try{
					this.Settings[setting.name] = JSON.parse(setting.value);
				} catch(err){
					this.Settings[setting.name] = [];
				}
			} else {
				this.Settings[setting.name] = setting.value;
			}
		});
		return true;
	}

	async findRolesAtProperty(connection, roles, property_id){
	  let admins = await models.Company.findRolesAtProperty(connection, roles, property_id, this.id);
	  return admins;
  	}

	getLogoPath(){
		return '<img src="' + Settings.getBaseUrl(this.subdomain) + '/static/img/company/' + this.logo + '" style="display:block; font-size:0px; line-height:0px; border:0px;"  width="150" alt="img"/>';
	}

	getLogoUrl(){
		return  Settings.config.get_base_url() + 'img/company/' + this.logo;
	}

	get_base_url (){
		let url = process.env.API_PROTOCOL + '://' + this.subdomain + '.' + process.env.DOMAIN ;
		if(process.env.PORT !== '80' && process.env.PORT !== '443'){
		url += ":" +  process.env.PORT
		}
		url += '/'
		return url;
	}

	async getRoles(connection){

		if(!this.id) e.th(500, "Company id not set");
		let roles = await models.Role.findByCompany(connection, this.id);
		for(let i = 0; i < roles.length; i++ ){
			let role = new Role(roles[i]);
			await role.getPermissions(connection);
			this.Roles.push(role);
		}
	}

	async getAdminWithPermission(connection, permission_slug){
		return await models.Role.getAdminWithPermission(connection, this.id, permission_slug);
	}


	async getWebLogoURL(property_id) {
		let logo = null;
		
		if(this.gds_owner_id){
			try{
				let webInfo = await getWebsiteInfo(this.gds_owner_id, property_id);
	
				if(webInfo.status == 'success'){
					logo = {
						desktop: webInfo?.data?.logo?.desktop?.url || '',
						mobile: webInfo?.data?.logo?.mobile?.url || ''
					}
				} else if (webInfo.status == 'error') {
					let err = {
						message: webInfo.message,
						data: webInfo.data
					}
					console.log("Company Logo fetching error: ", err);
				}
			} catch(err) {
				console.log("Company Logo fetching error: ", err);
			}
		}

		this.webLogo = logo;
		return logo;
	}

	async updateCompanyDetails(connection, body) {
		let data = {
			gds_owner_id: body?.gds_owner_id,
			email: body?.email,
			phone: body?.phone
		}
		await models.Company.updateCompanyDetails(connection, data, body?.subdomain);
		await this.find(connection)
		return;
	}
	
	/**
	 * Creating a company
	 * @param {Object}  connection
	 * @param {Object}  body details
	 */
	async createCompany(connection, body) {
	
		let company = await models.Company.findBySubdomain(connection, this.subdomain);
		if (company) e.th(409, 'A company already exist with the configurations given');
	
		let oldOwner = await models.Company.findPreviousOwner(connection);
		if (oldOwner === body.name) e.th(409, 'A company already exist with the owner name given');
	
		let data = {
			old_owner: oldOwner,
			new_owner: body.name ?? null,
			facility1: body.name + ' Storage 1',
			facility2: body.name + ' Storage 2',
			old_facility1: oldOwner + ' Storage 1',
			old_facility2: oldOwner + ' Storage 2',
			subdomain: body.subdomain ?? null,
		}
	
		await models.Company.updateMigrationData(connection, data);
	
		let facilities = [data.facility1, data.facility2];
		for (let facility of facilities) {
			await models.Company.callMigrationProcedure(connection, facility, data.subdomain);
		}
	
		let properties = await models.Property.findPropertyBySubdomain(connection, body.subdomain)
		let propertyIds = properties?.map(property => property?.id)
	
		for (let id = 0; id < properties.length; id++) {
			let propertyId = propertyIds?.[id];
			if (propertyId) {
				await models.Amenity.onboardNewAmenityProperties(connection, propertyId);
				await models.Amenity.onboardNewAmenityUnits(connection, propertyId);
				await models.Amenity.updateAmenityProperties(connection, propertyId);
			}
		}
	
	}

	async getApplications(connection){
		let applications = await models.Company.getApplications(connection, this.id);
		return applications;
	}

}

module.exports = Company;

var Document      = require('../classes/document.js');
var Product      = require('../classes/product.js');
var Role      = require('../classes/role.js');
var { getWebsiteInfo } = require('../modules/gds_translate');