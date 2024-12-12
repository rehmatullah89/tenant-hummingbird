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

	}


	validate(){
		var _this = this;
		var error = false;

		return Promise.resolve().then(() => {


			if (!_this.name) {
				error = new Error('Invalid name');
				error.code = 400;
				throw error;
			}

			if (!_this.firstname) {
				error = new Error('Please enter a first name for this company');
				error.code = 400;
				throw error;
			}
			if (!_this.lastname) {

				error = new Error('Please enter a last name for this company');
				error.code = 400;
				throw error;
			}

			if (!_this.email || !validation.validateEmail(_this.email)) {

				error = new Error('Please enter a valid email');
				error.code = 400;
				throw error;
			}

			if (!_this.phone) {
				error = new Error('Please enter a phone number for this company');
				error.code = 400;
				throw error;
			}

			if (!_this.subdomain) {
				error = new Error('Please enter a subdomain for this company');
				error.code = 400;
				throw error;
			}
			return true;
		})

	}

	create(connection){
		var _this = this;
		return Promise.resolve()
			.then(() => _this.validate())
			.then(() => {
				if (_this.id) return;
				console.log("subdomaincheck", _this.subdomain);

				return models.Company.findBySubdomain(connection, _this.subdomain).then(c => {

					if(c) {
						var error = new Error('A company with this sub domain already exists. Please choose a different subdomain.');
						error.code = 400;
						throw error;
					}
					return true;
				})

			})
			.then(function() {

				var save = {
					name: _this.name,
					firstname: _this.firstname,
					lastname: _this.lastname,
					email: _this.email,
					phone: _this.phone,
					subdomain: _this.subdomain,
					logo: _this.logo,
					active: 1
				};



				return models.Company.save(connection, save, _this.id);


			})
			.then(function(company_id){
				_this.id = company_id;

				// add permissions to user 1
				return Promise.all([
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 1 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 2 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 3 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 4 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 5 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 6 }),
					models.User.saveUserRole(connection, { company_id: _this.id,  user_id: 1, role_id: 7 })
				])

			})
			.then(function(result){

				// set up defaults

				// save Document Types
				return models.Document.saveDocumentType(connection, {company_id: _this.id, name:'Lease',  active:1 })


			})
			.then(function(result){

				// save Products
				return  Promise.all([
					models.Product.save(connection, {company_id: _this.id, name:'Rent',  active:1, type: 'Product', default_type: 'rent' }),
					models.Product.save(connection, {company_id: _this.id, name:'Late Fee',  active:1, type: 'Product', default_type: 'late' }),
					models.Product.save(connection, {company_id: _this.id, name:'Security Deposit',  active:1, type: 'Product', default_type: 'security' })
				]);



			})
			.then(function(result){
				// Settings
				return  Promise.all([
					models.Setting.save(connection, {company_id: _this.id, name:'invoiceSendDay',  value: 1 }),
					models.Setting.save(connection, {company_id: _this.id, name:'invoiceLateDay',  value: 1 }),
					models.Setting.save(connection, {company_id: _this.id, name:'lateChargeAmt',  value: 0 }),
					models.Setting.save(connection, {company_id: _this.id, name:'lateChargeType',  value: '%' }),
					models.Setting.save(connection, {company_id: _this.id, name:'authnetLogin',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'twilioPhone',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'forteLogin',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'forteKey',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'forteOrganizationId',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'forteLocationId',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'taxRate',  value: '7' }),
					models.Setting.save(connection, {company_id: _this.id, name:'oauthToken',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'oauthTokenSecret',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'qbDepositLiability',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'qbIncomeAccount',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'qbPrepaymentLiability',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'qbTaxCode',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'quickbooksTokenRenewal',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'realmId',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'invoiceChargeOffset',  value: '' }),
					models.Setting.save(connection, {company_id: _this.id, name:'notificationEmails',  value: '[' + _this.email + ']' }),
				])

			})
			.then(function(){
				// SMS numbers
				return models.Setting.saveSMSNumber(connection, {company_id: _this.id, number:'4125153431' });
			})
	}

	find(connection){
		if (!this.id) e.th(500, "No id is set");

		return models.Company.findById(connection, this.id)
			.then(company => this.findDetails(connection, company))
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

	async findDetails(connection, data){

		if(!data) e.th(404, 'Company not found.');

		this.id = data.id;
		this.name = data.name;
		this.gds_owner_id = data.gds_owner_id;
		this.firstname = data.firstname;
		this.lastname = data.lastname;
		this.email = data.email;
		this.phone = data.phone;
		this.subdomain = data.subdomain;
		this.logo = data.logo;
		this.gds_owner_id = data.gds_owner_id;

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
		console.log("ROELS", roles);

		for(let i = 0; i < roles.length; i++ ){
			console.log("i", roles[i]);
			let role = new Role(roles[i]);
			console.log(role);
			await role.getPermissions(connection);
			this.Roles.push(role);
		}
	}

	async getWebLogURL() {
		let logo = null;
		if(this.gds_owner_id){
			try{
				let webInfo = await getWebsiteInfo(this.gds_owner_id);
	
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



}



module.exports = Company;

var Document      = require('../classes/document.js');
var Product      = require('../classes/product.js');
var { getWebsiteInfo } = require('../modules/gds_translate');