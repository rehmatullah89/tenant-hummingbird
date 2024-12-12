var express = require('express');
var router = express.Router();
var moment      = require('moment');
var Promise      = require('bluebird');
const { id } = require('../validation/objects/military');
var settings    = require(__dirname + '/../config/settings.js');
var flash    = require(__dirname + '/../modules/flash.js');
var validation    = require(__dirname + '/../modules/validation.js');
var utils    = require(__dirname + '/../modules/utils.js');

var models      = require(__dirname + '/../models');
var control    = require(__dirname + '/../modules/site_control.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Property  = require(__dirname + '/../classes/property.js');
var Brivo  = require(__dirname + '/../classes/access_control/brivo.js');
var AccessControl  = require(__dirname + '/../classes/access_control.js');
var PtiStorLogix  = require(__dirname + '/../classes/access_control/pti_stor_logix.js');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Contact  = require(__dirname + '/../classes/contact.js');

var Activity = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');


module.exports = function(app, sockets) {

	router.get('/vendors', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {
		try{

			var connection = res.locals.connection;
			let access = new AccessControl(connection.meta);
			
			const gateVendors = await access.getGateVendors();
			utils.send_response(res, {
				status: 200,
				data: {
					vendors: Hash.obscure(gateVendors, req)
				}
			});
		} catch(err) {
			next(err);
		}
	});

	router.post('/', [control.hasAccess(['admin']), control.hasPermission('manage_gates'), Hash.unHash],  async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			const body = req.body;
			const property = new Property({id: body.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});
			await property.getAddress(connection);


			let access = new AccessControl({
				property_id: property.id,
				access_id: body.access_id,
				...connection.meta
				
			});

			//await access.findByName(connection, body.access_label);
			await access.install(connection, company, property, body.Credentials, contact.id);

			utils.send_response(res, {
				status: 200,
				data: {
					// access: Hash.obscure(access)
				}
			});

			eventEmitter.emit('gate_access_configured', {company, contact, access, property, cid: res.locals.company_id, locals: res.locals });


		} catch(err) {
			next(err);
		}



	});

	router.get('/facilities/:property_id/sync', [control.hasAccess(['admin']), control.hasPermission('manage_gates'), Hash.unHash],  async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			var params = req.params;
			const property = new Property({id: params.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});

			await property.getAccessControl(connection);
			let facilities = await property.Access.facilitiesSync(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					facilities: Hash.obscure(facilities, req)
				}
			});

			eventEmitter.emit('gate_access_configured', {company, contact, access, property, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			next(err);
		}



	});

	router.post('/facilities/:property_id/sync-users', [control.hasAccess(['admin']), control.hasPermission('manage_gates'), Hash.unHash],  async (req, res, next) => {
		try{
			var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			var params = req.params;
			const property = new Property({id: params.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});

			await property.getAccessControl(connection);
			//await property.getAllUnits(connection);
			//let spaces = await property.Access.getSpaces(property.id);

			//Humingbird Users
			let contacts = await property.getAllUsers(connection);

			//Gate Access Users
			let users = await property.Access.getUsers();

			let updatedUsers = [];
			let i = 0;
			for (let hbContact of contacts) {
				let found = false;
				for (const user of users) {
					if (user.user_id == hbContact.id) {
						found = true;
						let updates = {}
						if(user.first != hbContact.first) updates.first = hbContact.first;
						if(user.last != hbContact.last) updates.last = hbContact.last;
						if(user.email != hbContact.email) updates.email = hbContact.email;
						if(user.phone != hbContact.phone) updates.phone = hbContact.phone;

						console.log("UPDATE: ", updates);
						if(Object.keys(updates).length > 0){
							let result = await property.Access.updateGAUser(hbContact, updates);
							console.log("UPDATE USER RESULT: ", result);
							updatedUsers[i] = {};
							updatedUsers[i].id = hbContact.id;
							updatedUsers[i].updates = updates;
							i++;
						}
						break;
					}
				}

				if(!found){
					let newUser = await property.Access.getUser(hbContact.id);
					if(!newUser){
						let creds = {
							status: 1
						}
						let result = await property.Access.createGAUser(hbContact, creds);
						updatedUsers[i] = result;
						i++;
					}
					
				}

			}

			utils.send_response(res, {
				status: 200,
				data: {
					updatedUsers: Hash.obscure(updatedUsers, req),
					//users: Hash.obscure(users, req),
					//contacts: Hash.obscure(contacts, req),
					//units: Hash.obscure(property.Units, req),
					//spaces: Hash.obscure(spaces, req),
				}
			});

		} catch(err) {
			next(err);
		}



	});

	router.post('/facilities/:property_id/sync-leases', [control.hasAccess(['admin']), control.hasPermission('manage_gates'), Hash.unHash],  async (req, res, next) => {
		try{
			var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			var params = req.params;
			const property = new Property({id: params.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});

			await property.getAccessControl(connection);
			//await property.getAllUnits(connection);
			//let spaces = await property.Access.getSpaces(property.id);

			//Humingbird Users
			//let leases = await property.getAllLeases(connection);

			//Gate Access Users
			let moveins = await property.Access.getAllMoveins();

			let updatedSpacesUers = [];
			// let i = 0;
			// for (let hbContact of contacts) {
			// 	let found = false;
			// 	for (const user of users) {
			// 		if (user.user_id == hbContact.id) {
			// 			found = true;
			// 			let updates = {}
			// 			if(user.first != hbContact.first) updates.first = hbContact.first;
			// 			if(user.last != hbContact.last) updates.last = hbContact.last;
			// 			if(user.email != hbContact.email) updates.email = hbContact.email;
			// 			if(user.phone != hbContact.phone) updates.phone = hbContact.phone;

			// 			console.log("UPDATE: ", updates);
			// 			if(Object.keys(updates).length > 0){
			// 				let result = await property.Access.updateGAUser(hbContact, updates);
			// 				console.log("UPDATE USER RESULT: ", result);
			// 				updatedUsers[i] = {};
			// 				updatedUsers[i].id = hbContact.id;
			// 				updatedUsers[i].updates = updates;
			// 				i++;
			// 			}
			// 			break;
			// 		}
			// 	}

			// 	if(!found){
			// 		let newUser = await property.Access.getUser(hbContact.id);
			// 		if(!newUser){
			// 			let creds = {
			// 				status: 1
			// 			}
			// 			let result = await property.Access.createGAUser(hbContact, creds);
			// 			updatedUsers[i] = result;
			// 			i++;
			// 		}
					
			// 	}

			// }

			utils.send_response(res, {
				status: 200,
				data: {
					updatedSpacesUers: Hash.obscure(updatedSpacesUers, req),
					//moveins: Hash.obscure(moveins, req),
				}
			});

		} catch(err) {
			next(err);
		}



	});

	router.get('/facilities/:property_id/gate_agent/info', [control.hasAccess(['admin'])], Hash.unHash, async(req, res, next) =>{
		try {

			const connection = res.locals.connection;
			const {property_id} = req.params;
			const {gate_vendor_id} =  req.query;
			const company = res.locals.active;

			const access = new AccessControl({
				property_id, ...connection.meta
			})

			await access.setAPIToken(connection, {company_id: company.id})

			const agentInfo  =  await access.getAgentInfo(gate_vendor_id);

			utils.send_response(res, {
				status: 200,
				data:{
					agentInfo: Hash.obscure(agentInfo, req)
				}
			})

		} catch (error) {
			next(err);
		}
	})

	router.get('/facilities/:property_id/gate_agent/download', [control.hasAccess(['admin'])], Hash.unHash, async(req, res, next) =>{
		try {

			const connection = res.locals.connection;
			const {property_id} = req.params;
			const {gate_vendor_id} =  req.query;
			const company = res.locals.active;

			const access = new AccessControl({
				property_id, ...connection.meta
			})

			await access.setAPIToken(connection, {company_id: company.id})

			const downloadFile  =  await access.getDownloadURI(gate_vendor_id);

			utils.send_response(res, {
				status: 200,
				data:{
					download: Hash.obscure(downloadFile, req)
				}
			})

		} catch (error) {
			next(err);
		}
	})

	router.get('/facilities/:property_id/gate_agent/install_token', [control.hasAccess(['admin'])], Hash.unHash, async(req, res, next) =>{
		try {

			const connection = res.locals.connection;
			const {property_id} = req.params;
			const {gate_vendor_id} =  req.query;
			const company = res.locals.active;

			const access = new AccessControl({
				property_id, ...connection.meta
			})

			await access.setAPIToken(connection, {company_id: company.id})

			const downloadToken  =  await access.getInstallToken(gate_vendor_id);

			utils.send_response(res, {
				status: 200,
				data:{
					download: Hash.obscure(downloadToken, req)
				}
			})

		} catch (error) {
			next(err);
		}
	})

	router.get('/connect/brivo', async (req, res, next) => {

		try{
			var connection = res.locals.connection;
			var code = req.query.code;
			var decoded = Hashes.decode(req.query.state);

			if(decoded[1] !== res.locals.company_id) e.th(404, "Resource not found")
      		let property_id = decoded[0];

			let access = new AccessControl({
				property_id,
				access_id: 1,
				...connection.meta
				
			});

			let company = await models.Company.findByPropertyId(connection, property_id);
			const property = new Property({id: property_id});
			await property.find(connection);
			await access.install(connection, company, property, {auth_code: code}, null);

			let admins = await Contact.findAdminsByPropertyId(connection, company.id, property.id);
			for(let i = 0; i < admins.length; i++){
				let socket = new Socket({
					company_id: company.id,
					contact_id: admins[i].contact_id
				});
				await socket.createEvent("brivoConnection", true);
			}

			res.write("<script>window.close();</script>");
			res.end();

		} catch(err) {
			next(err);
		}


	});

	router.post('/brivo', [control.hasAccess(['admin']),control.hasPermission('manage_gates'), Hash.unHash], async (req, res, next) => {
		try{
		  var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			const body = req.body;
			const property = new Property({id: body.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});
			await property.getAddress(connection);


			let access = new AccessControl({
				property_id: property.id,
				access_id: 1,
				...connection.meta
			});

			//await access.findByName(connection, body.access_label);
			await access.install(connection, company, property, body.Credentials, contact.id);

			var activity = new Activity();
			await activity.create(connection,company.id, contact.id, 2, 21, property.id, 1); // 1 is brivo

			utils.send_response(res, {
				status: 200,
				data: {
					// access: Hash.obscure(access)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	router.put('/brivo/:property_id', [control.hasAccess(['admin']),control.hasPermission('manage_gates'), Hash.unHash], async (req, res, next) => {
		try{
		  	var connection = res.locals.connection;
			const contact = res.locals.contact;
			const company = res.locals.active;

			const body = req.body;
			var params = req.params;

			const property = new Property({id: params.property_id});
			await property.find(connection);
			await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});

			let access = new AccessControl({
				property_id: property.id,
				access_id: 1,
				...connection.meta
				
			});

			//await access.findByName(connection, body.access_label);
			await access.install(connection, company, property, body.Credentials, contact.id);

			var activity = new Activity();
			await activity.create(connection,company.id, contact.id, 3, 21, property.id, 1);

			utils.send_response(res, {
				status: 200,
				data: {
					// access: Hash.obscure(access)
				}
			});


		} catch(err) {
			next(err);
		}


	});

	/* Todo This is refactored, please test this. */
	router.get('/brivo/:property_id/groups', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;
      var company = res.locals.active;
      var property = {};
      var params = req.params;
      var access = {};

      property = new Property({id: params.property_id});
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAccessControl(connection)
      let groups = await property.Access.groupsSync(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          groups
        }
      });
    } catch(err) {
      next(err);
    }

	});

	// get agent info

	router.get('/facilities/:property_id/agent_info', control.hasPermission(['admin', 'api']), async(req, res, next)=>{

	})
	// get install file
	// get token


  /* Todo Refactor this endpoint to use async/await. */
	// router.get('/brivo/:property_id/import', [control.hasAccess(['admin']), control.hasPermission('manage_gates')], function (req, res, next) {
  //
  //   var connection = res.locals.connection;
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var property = {};
	// 	var params = req.params;
	// 	var access = {};
  //
	// 	var totalUsersMatched = 0 ;
	// 	var skipped = [] ;
	// 	var imported = [] ;
	// 	var not_imported = [] ;
	// 	var unmatched = [] ;
  //
  //   property = new Property({id: params.property_id});
  //   property.find(connection)
  //     .then(() => property.verifyAccess(company.id, res.locals.properties))
	// 		.then(() => property.getAccessControl(connection))
	// 		.then(() => property.Access.userssSync(connection))
	// 		.then((users) => {
  //
	// 			return Promise.mapSeries(users, c => {
	// 				var conditions = {
	// 					first: c.firstName,
	// 					last: c.lastName
	// 				};
  //
	// 				return models.Contact.findTenantsByName(connection, c.firstName, c.lastName, company.id)
	// 					.then(contacts => {
	// 						if(!contacts.length){
	// 							unmatched.push(c);
	// 							return true;
	// 						}
  //
	// 						if(contacts.length > 1){
	// 							not_imported.push(c);
	// 							return true;
	// 						}
  //
	// 						// Find Access Credentials
  //
	// 						var foundContact = contacts[0];
	// 						return foundContact.findAccessCredentials(connection, property)
	// 							.then(() => {
  //
	// 								if(!contact.Access){
	// 									not_imported.push(c);
	// 									return true;
	// 								}
  //
	// 								return property.Access.userSync(c.id).then(user => {
	// 									let credentials = {};
	// 									credentials.external_id = user.id;
	// 									credentials.pin = user.pin;
	// 									credentials.status = 1;
  //
	// 									return property.Access.updateUser(foundContact, credentials);
  //
	// 								}).then(() => {
	// 									imported.push(c);
	// 									return true;
	// 								});
	// 							})
	// 					})
	// 			});
	// 		}).then(() => {
  //
	// 			var activity = new Activity();
	// 			return activity.create(connection,company.id, contact.id, 7, 21, property.id, property.Access.id);
  //
	// 		}).then(() => {
  //
	// 			utils.send_response(res, {
	// 				status: true,
	// 				data: {
	// 					imported: imported,
	// 					not_imported: not_imported,
	// 					unmatched: unmatched,
	// 					found: property.Access.Contacts.length
	// 				}
	// 			});
  //
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
  //
	// });

	return router;

}



