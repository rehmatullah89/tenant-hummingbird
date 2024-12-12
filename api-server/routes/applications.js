var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var response = {};
var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');
const User = require('../classes/user');
const Contact = require('../classes/contact');

var models = require(__dirname + '/../models');
var utils    = require(__dirname + '/../modules/utils.js');


var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Schema = require(__dirname + '/../validation/applications.js');
const joiValidator = require('express-joi-validation')({
	passError: true
});

module.exports = function(app) {

	/* 
		This endpoint will handle new application registrations, and setting of permissions and proprties for a company. 
		
		This will also handle ADDING properties and permissions. 

		It will currently ADD the properties in the array if there are new ones, and add permissions if there are new ones to the role if it exists. 

		If the application or role does not exists it will create it. 
	*/

	router.post('/', [control.hasAccess(['nectar']), Hash.unHash], async(req, res, next) => {

		try {

			var connection = res.locals.connection;
			const { body } = req;
			
			let company = res.locals.active;
			let company_exists = false;
			let properties = [];
			let permissions = [];
			let role = {}
			let nectar_app_contact = {}
			// make sure nectar app is making the call
			// TODO make sure this is the Application ID that should make these changes

			let user = new User({gds_application_id: body.nectar_application_id, active: 1});
			// check to see if application is already registered
				
			await connection.beginTransactionAsync();
			try {
				await user.find(connection);
			} catch (err){
				console.log("not authenticated");
				await user.save(connection);
				await user.find(connection);	
			}

			if(!user.Contact.id){
				// save user
				nectar_app_contact = new Contact({
					first: body.name,
					last:  'Application', 
					user_id: user.id
				});
				try{
					await nectar_app_contact.find(connection );
				} catch(err){
					// save new contact
					await nectar_app_contact.save(connection);
					await nectar_app_contact.find(connection );
				}
			} else {
				nectar_app_contact = user.Contact;
			}


			await nectar_app_contact.getRole(connection, company.id);
			await nectar_app_contact.getPermissions(connection, company.id);
			if(!nectar_app_contact.Roles[0]?.id){	
				// save role
				role = new Role({
					company_id: company.id,
					type: 'application', 
					name: "Application: " + body.name 
				});
				await role.save(connection);
				await nectar_app_contact.updateRole(connection, company.id, role.id, properties, null, null, 1);
				await nectar_app_contact.getRole(connection, company.id);
				await nectar_app_contact.getPermissions(connection, company.id);
			} else {
				role = new Role({id: nectar_app_contact.Roles[0]?.role_id});
				await role.find(connection);	
			}

			permissions = JSON.parse(JSON.stringify(nectar_app_contact.Permissions));
			properties = JSON.parse(JSON.stringify(nectar_app_contact.Properties));

			
			
			// get properties
			for(let i = 0; i < body.properties.length; i++){
				if(!properties.find(p => p.gds_id === body.properties[i])){
					let property = new Property({gds_id: body.properties[i]}) 
					await property.find(connection);
					await property.verifyAccess({company_id: company.id});
					properties.push(property); 
				}
			}
		
			let allPermissions = await Role.getAllPermissions(connection);
		
			// get permission
			for(let i = 0; i < body.permissions.length; i++){

				if(!permissions.find(p => p.label === body.permissions[i])){
					let permission = allPermissions.find(p => p.label == body.permissions[i]);
					if(!permission) continue;
					permissions.push(permission);
				}
			}
			

			// add permissions to role
			await role.updatePermissions(connection, permissions);
			
			// add contact to role at properties
			await nectar_app_contact.updateRole(connection, company.id, role.id, properties, null, null, 1);
 
			// save default reports
			await nectar_app_contact.saveDefaultReports(connection, company);
	
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {
					company_id: Hashes.encode(res.locals.company_id), 
					application_id: Hashes.encode(nectar_app_contact.id, res.locals.company_id)
				}
			});

		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	/* this takes an array of properties and will update the intregration with the properties. */

	router.put('/properties', [control.hasAccess(['nectar']), Hash.unHash], async(req, res, next) => {
		
		try {

			var connection = res.locals.connection;
			const { body  } = req;
			let company = res.locals.active;

			let properties = [];

			let user = new User({gds_application_id: body.nectar_application_id });
			// check to see if application is already registered
			await user.authenticateApplication(connection, company);

			// get properties
			for(let i = 0; i < body.properties.length; i++){
				let property = new Property({gds_id: body.properties[i]}) 
				await property.find(connection);
				await property.verifyAccess({company_id: company.id});
				properties.push(property); 
			}
			
			// add update properties at role
			await user.Contact.updateRole(connection, company.id, user.Contact.Roles[0]?.role_id, properties, null, null, 1);

			utils.send_response(res, {
				status: 200,
				data: {}
			});


		} catch(err) {
			next(err);
		}
	}); 


	/* this takes an array of permissions and will update the role with the permissions. */
	router.put('/permissions', [control.hasAccess(['nectar']), Hash.unHash], async(req, res, next) => {
		
		try {
			var connection = res.locals.connection;
			const { body  } = req;
			let company = res.locals.active;
			let permissions = [];
			let role = {};
		
			let user = new User({gds_application_id: body.nectar_application_id });
			// check to see if application is already registered
			await user.authenticateApplication(connection, company);

			role = new Role({id: user.Contact.Roles[0]?.role_id});
			await role.find(connection);	


			let allPermissions = await Role.getAllPermissions(connection);
		
			// get permission
			for(let i = 0; i < body.permissions.length; i++){
				if(!permissions.find(p => p.label === body.permissions[i])){
					let permission = allPermissions.find(p => p.label == body.permissions[i]);
					if(!permission) continue;
					permissions.push(permission);
				}
			}
			

			// add permissions to role
			await role.updatePermissions(connection, permissions);


			utils.send_response(res, {
				status: 200,
				data: {}
			});


		} catch(err) {
			next(err);
		}
	});

	/* deactivates an integration completly */

	router.delete('/:application', [control.hasAccess(['nectar']), Hash.unHash], async(req, res, next) => {

		try {

			var connection = res.locals.connection;
			const { params } = req;
			let company = res.locals.active;
		
	
			let user = new User({gds_application_id: params.application});
			// check to see if application is already registered
			await user.authenticateApplication(connection, company);
			
			role = new Role({id: user.Contact.Roles[0]?.role_id});
			await role.find(connection);
			await role.verifyAccess(company.id);
			await connection.beginTransactionAsync();
			await user.Contact.removeCompanyAccess(connection, company.id);
			await connection.commitAsync();
		
			
			utils.send_response(res, {
				status: 200,
				data: {}
			});
			
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	/* returns the information for an application at a company. Name, Role, and permissions */
	router.get('/:application', [control.hasAccess(['nectar']), Hash.unHash], async(req, res, next) => {
		
		try {

			var connection = res.locals.connection;
			const { params } = req;
			let company = res.locals.active;
			
			let user = new User({gds_application_id: params.application});
			// check to see if application is already registered
			await user.authenticateApplication(connection, company);
			
			let data = {
				nectar_application_id: user.gds_application_id,
				name: user.Contact.first,
				role: user.Contact.Roles[0]?.name,
				permissions: user.Contact.Permissions.map(p => p.label),
				properties: user.Contact.Properties.map(p => p.gds_id)
			}

			utils.send_response(res, {
				status: 200,
				data: {
					application: Hash.obscure(data, res)
					
				}
			});


		} catch(err) {
			next(err);
		}
	}); 
	
	/* returns the company applications */
	router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
		
		try {
			const connection = res.locals.connection;
			let company = new Company({ id: res.locals.active.id });
			let data = await company.getApplications(connection)
			utils.send_response(res, {
				status: 200,
				data: {
					application: Hash.obscure(data, req)
				}
			});

		} catch(err) {
			next(err);
		}
	}); 

	return router;
};


var Activity = require(__dirname + '/../classes/activity.js');
var Role = require(__dirname + '/../classes/role.js');
var Company = require(__dirname + '/../classes/company.js');
var Application = require(__dirname + '/../classes/application.js');
var Property = require(__dirname + '/../classes/property.js');
