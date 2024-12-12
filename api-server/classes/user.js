"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');

var mask = require('json-mask');
var jwt         = require('jsonwebtoken');
var crypto      = require('crypto');
var e  = require(__dirname + '/../modules/error_handler.js');
class User {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.email = data.email; // actually username now.. Doesnt have to be an email
		this.password = data.password;
		this.active = data.active;
		this.created_at = data.created_at;
		this.gds_application_id = data.gds_application_id;
		this.Contact = {};
	}

	validate(){
		

		try {
			if (!_this.email) {
				throw 'Please enter a email address for this user';
			}

			// if (!_this.password) {
			// 	throw 'Please enter a password for this user';
			// }

		} catch(err){
			this.msg = err.toString();
			return false;
		}

		return true;
	}

	async save(connection){

		this.validate();
		var save = {
			id: this.id,
			email: this.email,
			password: this.password,
			active: this.active,
			gds_application_id: this.gds_application_id
		};

		this.id = await models.User.save(connection, save, this.id);
		return true;
	}

	async delete(connection){	
		return await models.User.delete(connection, this.id)
	}

	async authenticateApplication(connection, company){
		if(!this.gds_application_id) e.th(400, "Invalid application id");
		await this.find(connection);

		let contact = new Contact({ user_id: this.id});
		await contact.find(connection );
		await contact.getRole(connection, company.id);
		
		if(contact.Roles[0] && contact.Roles[0].is_active == 0) {
			e.th(403,"This application is not authorized for this company")
			e.th(403,"No user was found with application id")
		}
		if(!contact.Roles[0] || !contact.Roles[0]?.id) {
			e.th(403, "This application is not authorized for this company")
		}

		await contact.getPermissions(connection, company.id);
		
		contact.Company = company;
		contact.gds_application_id = this.gds_application_id;
		contact.type = 'application';
		this.Contact = contact;
		return contact;
	}

	async login(connection, password, company, requestUrl, cid, res){
		let pass = '';
		if(validator.isEmpty(this.email) || validator.isEmpty(password)) {
			e.th(401,"Invalid username or password. Please try again.")

		}
		await this.find(connection, company.id);

		if( requestUrl.startsWith('/v1/login') || requestUrl.startsWith('/v1/authenticate') ){
			var salt = moment(this.created_at).format('x');
			
		
			pass = control.hashPassword(password, salt);
			
		} else if(requestUrl === '/v1/switch'){
			pass = password;
		}
		
		if(pass !== this.password) e.th(403, "No user was found with that username, password combination");

		let contact = new Contact({ user_id:  this.id});
		await contact.find(connection );

		res.fns.addStep('beforeGettingRole');
		await contact.getRole(connection, company.id);
		res.fns.addStep('afterGettingRole');

		let any_active_user = !! contact.Roles.filter(role => role.status == 1).length

		if(contact.Roles.length && !any_active_user) {
			e.th(403,"User is inactive. Please activate user first.")
			e.th(403,"No user was found with that username, password combination")
		}

		await contact.getPhones(connection);
		await contact.getLocations(connection);
		// Get permissions

		if(contact.Roles.length) {
			await contact.getCompanies(connection);
		} else {
		  await contact.getLeases(connection, company.id);
    	}

		contact.Company = company;
		contact.type = 'admin';
		contact.gds_application_id = this.gds_application_id;
		this.Contact = contact;

		return contact;


	}

	async loginWithGateCode(connection, gate_code, property_id, unit_number, company){

		let unit = new Unit({
			number: unit_number,
			property_id: property_id
		});
		await unit.find(connection, unit_number);

		if(!unit || unit.property_id !== property_id) e.th(404, "Unit not found.")

		let property = new Property({ id: property_id });
		await property.find(connection);
		await property.getAccessControl(connection);

		let access = await property.Access.getUsers({pin: gate_code});

		if(!access || access.length == 0) e.th(403, "Invalid Credentials");

		let contact = new Contact({ id: access[0].user_id});
		await contact.find(connection, company.id );
		await contact.getLeases(connection);

		if(!contact.Leases || !contact.Leases.length){
		  e.th(404, "Account not found.");
		}

		contact.Company = company;

		this.Contact = contact;

		return contact;

	}


	async find(connection, company_id, contact_id ){

		let data = {};

		if(this.id){
			data = await models.User.findById(connection, this.id)
		} else if (this.email){
			data = await models.User.findByEmail(connection, this.email, company_id, contact_id)
		} else if (this.gds_application_id){
			data = await models.User.findByApplicationId(connection, this.gds_application_id);
		} else {
			e.th(500, "No user id or email is set");
		}
		
		if(!data) e.th(404, "User not found");

		this.id = data.id;
		this.email = data.email;
		this.password = data.password;
		this.active = data.active;
		this.created_at = data.created_at;
		this.gds_application_id = data.gds_application_id;

		return true;
	}

	saveToLease(connection, lease_id){

	}

	verifyUnique(connection, company_id){
		return models.User.findByEmail(connection, this.email, company_id).then(existing => {
			if(!existing) return true;
			e.th(409, "This username already exists. Please choose another. ");
		})
	}

	// GPS: global property selector
	static generateToken(company, contact, properties, cid, appId, gps_selection){
		var tokenData = {
      		cid: cid,
			contact: Hash.obscure(contact, {company_id: cid}),
			active: Hash.obscure(company, {company_id: cid}),
			requesting_application_id: appId ? appId : process.env.HUMMINGBIRD_APP_ID,
			properties: Hashes.encode(properties, cid),
			dynamo_company_id: Hashes.encode(cid),
			gps_selection: Hashes.encode(gps_selection, cid)
		};

		return jwt.sign(mask(tokenData, 'contact(id,first,last,email,created_at,roles),active(id,gds_owner_id,name,firstname,lastname,email,phone,subdomain,logo,platform_integration_enabled),requesting_application_id,properties,cid,dynamo_company_id,gps_selection'),
			settings.security.key, {
				expiresIn: 60 * 60 * 24 // expires in 24 hours
			}
		);

	}

	static async decodeToken(token){
		return new Promise((resolve, reject) => {
			jwt.verify(token, settings.security.key, (err, decoded) => {
				if (err || !decoded) reject("You are not logged in");
				resolve(decoded);
			});

		}).catch(err => {
			e.th(401, err);
		})
	}


	validatePassword(password, password_confirm){

		if (password != password_confirm) e.th(400, "Your passwords do not match");

		if(password.length < 8) {
			e.th(400, "Your passwords must be at least 8 characters long");

		}
		if(!/\d/.test(password)){
			e.th(400,"Your passwords must have at least 1 number");

		}
		if(!/[a-z]/.test(password)){
			e.th(400,"Your passwords must have at least 1 lowercase letter");

		}
		if(!/[A-Z]/.test(password)) {
			e.th(400,"Your passwords must have at least 1 uppercase letter");
		}



	}

	async findContact(connection, company_id){

		let contact = new Contact({user_id: this.id});

		await contact.find(connection);
		await contact.getRole(connection, company_id);
		await contact.verifyAccess(company_id);
		this.Contact = contact;
		return true
	}

	async resetPassword(connection, contact_id, password, password_confirm, company){

		this.validatePassword(password, password_confirm);

		let contact = new Contact({id: contact_id });
		await contact.find(connection, company.id);

		this.Contact = contact;

		this.id = contact.user_id;

		await this.find(connection);

		var salt = moment(this.created_at).format('x');
		this.password = control.hashPassword(password, salt);
		await this.save(connection);

		return true;

	}

	async setUpPassword(connection, contact_id, username, password, password_confirm, company){

		let contact = new Contact({id: contact_id });
		await contact.find(connection, company.id);

		if(contact.user_id) e.th(409, "This account has already been set up. If you have forgotten your password, please request a new one from the login page.");

		this.Contact = contact;

		this.email = username;
		this.password = password;
		this.active = 1;

		this.validatePassword(password, password_confirm);
		await this.verifyUnique(connection, company.id);

		await this.save(connection);
		await this.find(connection);

		var salt = moment(this.created_at).format('x');
		this.password = control.hashPassword(password, salt);
		await this.save(connection);

		contact.user_id = this.id;
		await contact.save(connection);

		return true;

	}

	static async findUserByEmailAtCompany(connection, email, company_id){
		return models.User.findUserByEmailAtCompany(connection, email, company_id);
	}

	async sendForgetUsernameEmail(connection, company, user_data) {
		if(!this.id) throw "User not found";

		let user_name = user_data.email
		let contact = this.Contact

		var values = {
			subject: 'Forgot Username Notification',
			body: `<p>Here is a list of user names we have associated with this email address.<br />` + user_name
		};

		let owner_id = company.gds_owner_id;
		await contact.sendEmail(connection, 0, 'Tenant', values.subject, values.body, null, null, null, owner_id, null)
	}

	async sendForgetPasswordEmail(connection, company){

		if(!this.id) throw "User not found";

		let contact_id = this.Contact.id
		let contact = new Contact({id: contact_id});
		await contact.find(connection, company.id);

		var shipment = {
			contact_id: contact_id,
			fn: 'reset password',
			requested: moment.utc(),
			domain:  company.subdomain
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted_token = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

		var values = {
			email: contact.email,
			to: contact.first + ' ' + contact.last,
			from:    `${company.name} Online Management`,
			subject: 'Password Reset Notification',
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'logo',
						// content: company.getLogoPath()
					},
					{
						name: 'headline',
						content: 'Reset Your Password'
					},
					{
						name: 'content',
						content: `<p>Somebody requested a password reset.<br />
						Please click the link below to reset your password. If you did not authorize this request, you can disregard this message.</p>
						<br /><a style="color: #3dc6f2" href="${settings.getBaseUrl(company.subdomain)}/reset-password/${encrypted_token}">Click here to reset your password</a><br />`
					}]
			},
			company_id : company.id,
			contact_id: contact.id
		};

		let owner_id = company.gds_owner_id;

		await sendEmail(connection, contact.first + " " + contact.last, contact.email, contact.id, null, values.subject, values.template.data[2].content, null, owner_id, null);
	}

}



module.exports = User;

var { sendEmail } = require(__dirname + '/../modules/mail');
var Contact = require(__dirname + '/../classes/contact.js');
var Unit = require(__dirname + '/../classes/unit.js');
var control    = require(__dirname + '/../modules/site_control.js');
var Property = require(__dirname + '/../classes/property.js');
