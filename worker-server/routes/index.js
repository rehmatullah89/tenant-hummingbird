var express = require('express');
const ENUMS = require('../modules/enums');
var router = express.Router();
var moment      = require('moment');
var request = require('request');
var models  = require(__dirname + '/../models');
var settings = require(__dirname + '/../config/settings.js');
var control = require(__dirname + '/../modules/site_control.js');
var Enums = require(__dirname + '/../modules/enums.js');

var rp = require('request-promise');
const fs = require('fs');

var utils    = require(__dirname + '/../modules/utils.js');
var e    = require('../modules/error_handler.js');
var PaymentRoutines      = require(__dirname + '/../routines/payment_routines.js');
var Property      = require(__dirname + '/../classes/property.js');

var Event      = require(__dirname + '/../classes/event.js');
var User = require(__dirname + '/../classes/user.js');
 

var MessageRoutines      = require(__dirname + '/../routines/send_message.js');
var AutoActionReport      = require(__dirname + '/../routines/auto_action_report.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Lease =  require(__dirname + '/../classes/lease.js');
var Invoice =  require(__dirname + '/../classes/invoice.js');
var Company =  require(__dirname + '/../classes/company.js');
var Trigger =  require(__dirname + '/../classes/trigger.js');
const Auditing = require('../classes/auditing');
var TriggerRoutines      = require(__dirname + '/../routines/triggers.js');

var Scheduler = require('../modules/scheduler.js');

var Payment =  require(__dirname + '/../classes/payment.js');
var PaymentMethod =  require(__dirname + '/../classes/payment_method.js');
var TenantPaymentMethod =  require(__dirname + '/../classes/payment_methods/tenant_payments_card.js');
//var TenantPaymentMethodpro =  require(__dirname + '/../classes/payment_methods/tenant_payments_ach.js')
var AccountingExport      = require(__dirname + '/../classes/accounting_exports.js');
var forteACHFuncs = require(__dirname + '/../modules/forte');

var db = require('../modules/db_handler.js');

var jwt         = require('jsonwebtoken');
let {isMatch} = require('../utils/regex');
const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );

const DocumentBatch = require('../classes/document_batch');
var PropertyRateManagement = require("../classes/rate-management/property_rate_management")
var PropertyRentManagementSettings = require("../classes/rent-management/property_rent_management_settings")
var PropertyRentManagementReport = require("../classes/rent-management/report")
const FlowProducer = new bullmq.FlowProducer({ connection: redis_connection });

var kue = require('kue'); 
var redis = require('redis');

var queue = kue.createQueue({
	redis: {
		createClientFactory: function () {
			return redis.createClient({
				port: '6379',
				host: Settings.redis_host
			});
		}
	}
});
 

function SplitTotal( totalAmount, numberToSplit, precision ) {
	var precisionFactor = Math.pow(10, precision);
	var remainderFactor = 1 / precisionFactor;

	var splitAmount = Math.ceil( totalAmount / numberToSplit * precisionFactor ) / precisionFactor;
	var remainder = Math.round( (splitAmount * numberToSplit - totalAmount) * precisionFactor ) / precisionFactor;

	var result = [];
	for (var i = 0; i < numberToSplit; i++) {
		result.push( (remainder >= remainderFactor) ?
			Math.round( (splitAmount - remainderFactor) * precisionFactor ) / precisionFactor :
			splitAmount );
		remainder = Math.round( (remainder - remainderFactor) * precisionFactor ) / precisionFactor;
	}
	return result;
}



module.exports = function(app) {

	// router.get('/trigger-routines', async(req, res, next) => {
	// 	queue.create('runTransactionsRoutine').save();
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	// router.get('/run-transaction-routines', async(req, res, next) => {
	// 	queue.create('runTransactionsRoutine').save();
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	// router.get('/run-rent-raise-routines', async(req, res, next) => {
	// 	queue.create('runRateRaiseRoutine').save();
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	// router.get('/run-auction-day-routine', async(req, res, next) => {
	// 	queue.create('runAuctionDayRoutine').save();
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	// router.get('/run-advanced-rental-emails', async(req, res, next) => {
	// 	queue.create('runAdvanceRentalEmails').save();
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	router.get('/', async(req, res, next) => {
		res.send({
			status: 200
		})
	});

	// router.get('/concurrency-test', async(req, res, next) => {
	// 	for(let i = 1; i <= 100; i++){
	// 		await Queue.add('concurrency_test', {
	// 			name: "JOB " + i
	// 		});
	// 	}
	// 	res.send({
	// 		status: 200
	// 	})
	// });

	router.get('/event-test', async(req, res, next) => {





		// let chain = await FlowProducer.add(
			
		// 		{
		// 			name: 'event_test',
		// 			queueName: 'hummingbirdQueue',
		// 			data:{
		// 				name: "Finish Job"
		// 			},
		// 			opts: {
		// 				trace_id: "12345"
		// 			}, 
		// 			children: [
		// 				{ name: 'event_test_two', data: { name: 'Run One'}, opts: { trace_id: "12345"},  queueName: 'hummingbirdQueue' },
		// 				{ name: 'event_test_two', data: { name: 'Run Two'}, opts: { trace_id: "12345"}, queueName: 'hummingbirdQueue' },
		// 				{ name: 'event_test_two', data: { name: 'Run Thee'}, opts: { trace_id: "12345"}, queueName: 'hummingbirdQueue' },
		// 			],
		// 		},
		// 		{
		// 			queuesOptions : {
		// 				trace_id: "1235467879"

		// 			}
		// 		}
		// 		// {
		// 		// 	parent: {
		// 		// 	}
		// 		// }
			
		// );

		

		// console.log("chain", chain)

		await Queue.add('event_test', {
			name: "Job Name"
		});
		res.send({
			status: 200
		})
	});


	router.post('/login', async(req, res, next) => {
		try {

			let data = {
				email: 			req.body.email,
				password: 		req.body.password
			}

			try {
				var admin = await db.getAdminByEmail(data.email);
				if(!admin) throw "admin not found"

			} catch(err){
				e.th(404, "There is no user with this email address");
			} 

			let salted_password = control.hashPassword(req.body.password, settings.security.key);
			
			if(salted_password !== admin.password){
				e.th(403, "Incorrect password.");
			}
			// These changes have made to fetch a contact ID for the admin portal, which is used to establish a socket connection in the admin portal.
			let connection = await db.getConnectionByType('read', 1).catch(() => null);
			try {
				let appContact = await models.Contact.findContactByAppId(connection, process.env.ADMIN_APP_ID);
				admin.id = Hashes.encode(appContact.id, 1) ?? null;
			} catch (error) {
				console.log("Couldn't find Admin portal Contact", error);
			} finally {
				if (connection) await db.closeConnection(connection);
			}
			
			var tokenData = {
				email: admin.email,
				first: admin.first,
				last: admin.last,
				superadmin: admin.superadmin,
				id: admin.id ?? null
			};

			const token = jwt.sign(tokenData, settings.security.key, { expiresIn: 60 * 60 * 24 });

			res.send({
				status: 200,
				data: {
					token: token,
					contact: admin
				}
			})
		} catch(err){
			next(err);
		}

	});

	router.get('/logged-in-user', async(req, res, next) => {
		try {
			var connection = await res.locals.connection;
			const token = req.headers['authorization'];
			if(!token) e.th(401, "You are not logged in");
			const decoded =  await User.decodeToken(token);
			res.send({
				status: 200,
				data: {
					contact: decoded
				}
			})
		} catch (err) {
			console.log(err);
            next(err)
		}
	})

	router.get('/logout', (req, res) => {
        res.send({
            status: 200
        });
    });


	router.get('/test-doc-generation', async(req, res, next) => {

		try {
			await Queue.add('merge_document_routine', {
				filename: "TestDoc", 
				document_batch_id: 78,
				cid: 1,
				company_id: 1, 
				property_id: 41, 
				
			});
			res.send({
				status: 200,
				data: {
					
				}
			})
		} catch(err){
			next(err);
		}

	});


	router.get('/admins', control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let admins = await db.getAllAdmins();
			res.send({
				status: 200,
				data: {
					admins: admins
				}
			})
		} catch(err){
			next(err);
		}

	});

	router.post('/admins', control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let data = {
				email: 			req.body.email,
				password: 		req.body.password,
				first: 			req.body.first,
				last: 			req.body.last,
				superadmin: 	req.body.superadmin,
				sendEmailServicesDashboard: req.body.sendEmailServicesDashboard
			}			

			try {
				var admin = await db.getAdminByEmail(data.email);
			} catch(err){
				if(err.code !== 404) throw err;
			}

			if(admin){
				e.th(409, "An admin with this email already exists");
			}

			data.password = control.hashPassword(req.body.password, settings.security.key);

			await db.saveAdmin(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});

	/**
	 * ****************************************************************
	 * ************** Test endpoints for rate management **************
	 * ****************************************************************
	 */

	router.get('/rate-management/cron', async (req, res, next) => {
		try {
			const { query: { company_id, property_id } = {} } = req

			if (!company_id || !property_id) e.th(400, 'Please provide property_id and company_id')

			await Scheduler.runRateManagementCronRoutine({ company_id: Number(company_id), property_id })

			res.send({
				status: 200,
				data: {}
			})
		} catch (error) {
			console.log("error:",error)
			next(error)
		}
	})
	 
	router.get('/refresh-unit-groups', async (req, res, next) => {
		try {
			const { query } = req

			// Refresh units on the basis of profile / property / amenity
			const requestedMedium = (({ profile_id, property_id, company_id, amenity_property_id }) => ({
				profile_id,
				property_id,
				company_id: Number(company_id),
				amenity_property_id
			}))(query)

			if(!requestedMedium?.company_id || isNaN(requestedMedium?.company_id)) e.th(400, 'Please provide valid company id')

			await Scheduler.runRefreshUnitGroupRoutine(requestedMedium.company_id, {
				procedure_conditions: requestedMedium
			})
			res.send({
				status: 200,
				data: {}
			})
		} catch (err) {
			next(err)
		}
	})

	/**
	 * ****************************************************************
	 * ************** ************** **************** *****************
	 * ****************************************************************
	 */


	/**
     * @description get rate management configuration of the property
     * If no configuration exists then default configuration will be sent to client
     */
	router.get('/companies/:company_id/properties/:property_id/rate-management', control.hasAccess(['superadmin']), async(req, res, next) => {
		try {
			let { company_id, property_id } = req.params
			let mapping = await db.getMappingByCompanyId(parseInt(company_id));
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let hb_company_id = mapping.hb_company_id
			const rateManagement = new PropertyRateManagement({ company_id: hb_company_id, property_id }, req.body)
			await rateManagement.validate(connection)
            let response = await rateManagement.get(connection, { params: { company_id: hb_company_id, property_id } })
			res.send({
				status: 200,
				data: {
					...response
				}
			})
		} catch(err){
			next(err);
		}
		await db.closeConnection(connection);
	});

	/**
     * @description this will create/update property rate management configuration.
     */
	router.put('/companies/:company_id/properties/:property_id/rate-management', control.hasAccess(['superadmin']), async(req, res, next) => {
		try {
			const property_id  = parseInt(req.params.property_id)
			const body = Hash.clarify(req.body)
			let allowedEngines = ["prorize", "hummingbird", "veritec", "price_monster"]
			let errMsg = {
				invalid: `\"rate_engine\" must be one of [${allowedEngines}]`,
				required: "\"rate_engine\" is required"
			}
			let errResponse = {
				status: 400,
				data: {},
				msg: body.rate_engine ? errMsg.invalid : errMsg.required
			}
			if (!body.rate_engine) return res.send(errResponse)
			if (!allowedEngines.includes(body.rate_engine)) return res.send(errResponse)
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.company_id));
			var connection = await db.getConnectionByType('write', mapping.company_id);
			let hb_company_id = mapping.hb_company_id
			const rateManagement = new PropertyRateManagement({ company_id: hb_company_id, property_id }, body)
			await rateManagement.validate(connection)
			await rateManagement.save(connection).catch(async (error) => {
				if (error.code === 409) return await rateManagement.update(connection)
				else throw error
			})
			res.send({
				status: 200,
				data: {
					status: "success"
				}
			})
		} catch (error) {
			next(error)
		}
	})

	/**
     * @description get rent management configuration of the property
     * If no configuration exists then default configuration will be sent to client
     */
	router.get('/companies/:company_id/properties/:property_id/rent-management', control.hasAccess(['superadmin']), async(req, res, next) => {
		try {
			let { company_id, property_id } = req.params
			let mapping = await db.getMappingByCompanyId(parseInt(company_id));
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let hb_company_id = mapping.hb_company_id
			const rentManagement = new PropertyRentManagementSettings({ company_id: hb_company_id, property_id }, req.body)
			await rentManagement.validate(connection)
            let response = await rentManagement.get(connection, { params: { company_id: hb_company_id, property_id } })
			res.send({
				status: 200,
				data: {
					...response
				}
			})
		} catch(err){
			next(err);
		}
		await db.closeConnection(connection);
	});

	/**
     * @description this will create/update property rent management configuration.
     */
	router.put('/companies/:company_id/properties/:property_id/rent-management', control.hasAccess(['superadmin']), async(req, res, next) => {
		try {
			const property_id  = parseInt(req.params.property_id)
			const body = Hash.clarify(req.body)
			let allowedEngines = ["prorize", "hummingbird", "veritec", "price_monster"]
			let errors = []
			let errMsg = {
				invalidRentEngine: `\"rent_engine\" must be one of [${allowedEngines}]`,
				invalidSwitchValue: `\"automation_enabled_by_admin\" must be boolean type`,
				required: `Atleast one of \"rent_engine\",\"automation_enabled_by_admin\" key is required`
			}
			let errResponse = {
				status: 400,
				data: {},
				msg: errors
			}
			const requiredKeys = ['rent_engine', 'automation_enabled_by_admin']
			const hasAtLeastOneKey = Object.keys(body).some(key => requiredKeys.includes(key));
			if (!hasAtLeastOneKey)
				errors.push(errMsg.required)
			if (body?.rent_engine && !allowedEngines.includes(body.rent_engine)) 
				errors.push(errMsg.invalidRentEngine)
			if ("automation_enabled_by_admin" in body && typeof body.automation_enabled_by_admin !== 'boolean') 
				errors.push(errMsg.invalidSwitchValue)
			if ( errors.length) return res.send(errResponse)
			
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.company_id));
			var connection = await db.getConnectionByType('write', mapping.company_id);
			let appContact = await models.Contact.findContactByAppId(connection, process.env.ADMIN_APP_ID)
			let hb_company_id = mapping.hb_company_id
			const rentManagement = new PropertyRentManagementSettings({ company_id: hb_company_id, property_id }, body, appContact.id )
			await rentManagement.validate(connection)
			await rentManagement.saveOrUpdateConfiguration(connection).catch(async (error) => {
				throw error
			})
			res.send({
				status: 200,
				data: {
					status: "success"
				}
			})
		} catch (error) {
			next(error)
		}
	})

	router.post('/companies/:company_id/properties/:property_id/rent-management/generate', control.hasAccess(), async (req, res, next) => {
		try{
			let companyId = parseInt(req.params.company_id);
			let propertyId = parseInt(req.params.property_id);
			var mapping = await db.getMappingByCompanyId(companyId);
			var connection = await db.getConnectionByType('read', mapping.company_id);

			const report = new PropertyRentManagementReport({
				company: { id: mapping.hb_company_id },
				property_id: propertyId,
				body: req.body
			})
			let excel = await report.generate(connection)
			const contents = fs.readFileSync(excel, { encoding: 'base64' });
			fs.unlinkSync(excel);
			res.send({
				status: 200,
				data: contents,
			});
		} catch(err){
			next(err)
		}finally{
			await db.closeConnection(connection);
		}
		
	
	});

	router.post('/companies/:company_id/properties/:property_id/rent-management/upload', control.hasAccess(['superadmin']), async (req, res, next) => {
		try{
			let companyId = parseInt(req.params.company_id);
			let propertyId = parseInt(req.params.property_id);
			var mapping = await db.getMappingByCompanyId(companyId);
			var connection = await db.getConnectionByType('read', mapping.company_id);
			
			const report = new PropertyRentManagementReport({
				company: { id: mapping.hb_company_id, gds_owner_id: req.body.gds_owner_id },
				property_id: propertyId,
				body: req.body
			})

			let socketDetails = {
				contact_id: Hashes.decode(res.locals.admin?.id)[0],
				requesting_app_id: process.env.ADMIN_APP_ID,
				company_id: mapping.company_id
			}

			let structure = await report.getReportStructure(connection)
			report.initiateUploadRentChanges(connection, structure, socketDetails)
			res.send({
				status: 200,
				data: "Initiated to upload rent changes",
			});
		} catch(err){
			console.log(err);
			next(err)
		}finally{
			await db.closeConnection(connection);
		}	
	
	});

	

	router.put('/admins', control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let data = {
				email: 			req.body.email,
				first: 			req.body.first,
				last: 			req.body.last,
				superadmin: 	req.body.superadmin,
				sendEmailServicesDashboard: req.body.sendEmailServicesDashboard
			}

			try {
				let user = await db.getAdminByEmail(data.email);
				if(req.body.password && req.body.password === req.body.password2 ){
					data.password = control.hashPassword(req.body.password, settings.security.key);
				} else {
					data.password = user.password;
				}

			} catch(err){
				e.th(404, "Admin Not Found");
			}



			console.log("password", control.hashPassword(req.body.password, settings.security.key))


			await db.saveAdmin(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});

	router.get('/companies',  control.hasAccess(),async(req, res, next) => {
		try {
			
			// adding more queries to support missing search feature in the admin website
			// for bravo killers
			let {sort_by, companyName, hashId, dbId, database, domain, gdsId} = req.query
			// let { query : {sort_by} }  = req;
			let companies = await db.getAllCompanies();

			let qPredicate = (e) =>{
				return isMatch(e.name,companyName)
				&& isMatch(e.database, database) 
				&& isMatch(e.subdomain, domain) 
				&& isMatch(e.hashed_company_id, hashId, {eq: true})
				&& isMatch(e.company_id, dbId, {eq: true})
				&& isMatch(e.gds_owner_id, gdsId, {eq: true})
			}

			// query filter
			companies = companies.filter(qPredicate)

			if(companies && companies.length){
				if(sort_by && companies[0][sort_by]){
					companies = companies.sort((a,b) => (a[sort_by] > b[sort_by]) ? 1 : ((b[sort_by] > a[sort_by]) ? -1 : 0));
				}
			}

			res.send({
				status: 200,
				data: {
					companies: companies
				}
			})
		} catch(err){
			next(err);
		}

	});

	router.post('/companies',  control.hasAccess(['superadmin']),async(req, res, next) => {

		try {

			let companies = await db.getAllCompanies();

			if(companies.length) {
				companies.sort((a,b) => (a.company_id < b.company_id)? 1: -1);
			} else {
				companies = [{
					company_id: 0
				}]
			}

			let company_id = companies[0].company_id + 1;

			let data = {
				company_id: 		company_id,
				hashed_company_id: 	Hashes.encode(company_id),
				gds_owner_id: 		req.body.gds_owner_id,
				hb_company_id: 		parseInt(req.body.hb_company_id),
				name: 				req.body.name,
				subdomain: 			req.body.subdomain,
				collection: 		req.body.collection,
				database: 			req.body.database,
				redshift: 			req.body.redshift,
				redshift_schema: 	req.body.redshift_schema,
				namespace:			req.body.namespace
			}

			try {
				var mapping = await db.getMappingByCompanyId(data.company_id);
			} catch(err){

			}
			if(mapping){
				e.th(409, "A company with this ID already exists");
			}
			await db.saveCompany(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});

	router.put('/companies/:company_id',  control.hasAccess(['superadmin']), async(req, res, next) => {
		try {

			let data = {
				company_id: 		parseInt(req.params.company_id),
				hashed_company_id: 	Hashes.encode(req.params.company_id),
				hb_company_id: 		parseInt(req.body.hb_company_id),
				gds_owner_id: 		req.body.gds_owner_id,
				name: 				req.body.name,
				subdomain: 			req.body.subdomain,
				database: 			req.body.database,
				collection: 		req.body.collection,
				redshift: 			req.body.redshift,
				redshift_schema: 	req.body.redshift_schema,
				namespace: 			req.body.namespace
			}
			try {
				await db.getMappingByCompanyId(data.company_id);
			} catch(err){
				e.th(404, "Company Not Found");
			}
			await db.saveCompany(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}

	});

	router.get('/companies/:company_id/properties', control.hasAccess(), async(req, res, next) => {
		try {

			let { query : {sort} }  = req;
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.company_id));
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let properties = await Property.findByCompanyId(connection, mapping.hb_company_id, { sort });
			res.send({
				status: 200,
				data: {
					properties
				}
			})
		} catch(err){
			next(err);
		}
		await db.closeConnection(connection);

	});
//MVP TI - 12317 POC START
	router.get('/companies/:company_id/tenantPayment/properties', control.hasAccess(), async (req, res, next) => {
		try {

			let { query: { sort } } = req;
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.company_id));
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let properties = await Property.findByCompanyIdtp(connection, mapping.hb_company_id, { sort });
			res.send({
				status: 200,
				data: {
					properties
				}
			})
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);

	});

//MVP TI - 12317 POC END

	router.get('/schemas', control.hasAccess(['superadmin']), async (req, res, next) => {
		try {
			let { db_name } = req.query;
			console.log("Database Name", db_name);
			if (!db_name) e.th(400, "Database name is missing");
			var connection = await db.getConnectionByDBName("read", db_name);
			let schemas = await db.getDatabaseSchemas(connection, db_name);

			res.send({
				status: 200,
				data: {
					schemas
				}
			})

		} catch (err) {
			next(err);
		} finally {
			await db.closeConnection(connection);
		}
	});

	router.get('/databases', control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			
			let {dbName} = req.query;
			let databases = await db.getAllDatabases();
			databases = databases.filter((e) => isMatch(e.name, dbName))
			res.send({
				status: 200,
				data: {
					databases: databases
				}
			})
		} catch(err){
			next(err);
		}

	});

	router.post('/databases',  control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let data = {
				name: 				req.body.name,
				user: 				req.body.user,
				password: 			req.body.password,
				read_hostname: 		req.body.read_hostname,
				write_hostname: 	req.body.write_hostname,
				redshift_hostname: 	req.body.redshift_hostname
			}

			try {
				var database = await db.getDatabaseByName(data.name);
			} catch(err){

			}
			if(database){
				e.th(409, "A database with this ID already exists");
			}
			await db.saveDatabase(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});

	router.put('/databases/:database_name',  control.hasAccess(['superadmin']),async(req, res, next) => {
		try {

			let data = {
				name: 				req.params.database_name,
				user: 				req.body.user,
				password: 			req.body.password,
				read_hostname: 		req.body.read_hostname,
				write_hostname: 	req.body.write_hostname,
				redshift_hostname: 	req.body.redshift_hostname
			}
			try {
				await db.getDatabaseByName(data.name);
			} catch(err){
				e.th(404, "Database Not Found");
			}
			await db.saveDatabase(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}

	});

	router.get('/redshift-databases',  control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let databases = await db.getAllRedshiftDatabases();
			res.send({
				status: 200,
				data: {
					databases: databases
				}
			})
		} catch(err){
			next(err);
		}

	});

	router.post('/redshift-databases',  control.hasAccess(['superadmin']), async(req, res, next) => {

		try {
			let data = {
				name: 				req.body.name,
				user: 				req.body.user,
				password: 			req.body.password,
				hostname: 			req.body.hostname,
				port: 				req.body.port,
				database: 			req.body.database
			}

			try {
				var database = await db.getRedshiftDatabaseByName(data.name);
			} catch(err){

			}
			if(database){
				e.th(409, "A database with this ID already exists");
			}
			await db.saveRedshiftDatabase(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});

	router.put('/redshift-databases/:database_name',  control.hasAccess(['superadmin']), async(req, res, next) => {
		try {

			let data = {
				name: 				req.params.database_name,
				user: 				req.body.user,
				password: 			req.body.password,
				hostname: 			req.body.hostname,
				port: 				req.body.port,
				database: 			req.body.database
			}
			try {
				await db.getRedshiftDatabaseByName(data.name);
			} catch(err){
				e.th(404, "Database Not Found");
			}
			await db.saveRedshiftDatabase(data);

			res.send({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}

	});

	router.post('/unhash',  control.hasAccess(), async(req, res, next) =>{

		var hash = req.body.hash;
		let unhashed = Hashes.decode(hash);
		var mapping = {};
		try{
			mapping = await db.getMappingByCompanyId(unhashed[1]);
		} catch(err){
			console.log(err)
		}
		


		res.send({
			status: 200,
			data: {
				id:  unhashed[0],
				company_id:  unhashed[1],
				company_database: mapping.database,
				company_name: mapping.name,
				company_collection: mapping.collection,
				company_subdomain: mapping.subdomain,
			}
		})


	})

	router.post('/issueTenantPaymentRefunds',  control.hasAccess(), async(req, res, next) =>{
		//var t_id = "000000"
		var transaction_id = req.body.transaction_id
		var property_id = req.body.property_id;
		var company_id = req.body.company_id
		var amount= req.body.amount
		var reason= req.body.reason
		console.log (company_id);
		console.log (amount);
		console.log (property_id);
		


		// invoke refund method in payments class
		//let property = new Property();
		this.Property = new Property({id: this.property_id})
		var connection = await db.getConnectionByType('read', company_id);
		let tenantPaymentMethod = new TenantPaymentMethod();
		//let payment = {transaction_id,property_id}
		var property_name = await models.Payment.getPropertyName(connection, property_id);
		property_name = property_name[0].name
		console.log("property name",property_name)
		try{
		let result = await tenantPaymentMethod.directRefund(connection, company_id, amount, transaction_id, property_id, reason);
		if(result.status==1){
			res.send({
		
				status: 200,
				data: {
					message: 'Refund Success',
					transactionId: result.transactionId
				}
			})
			}
			propay_db_connection = await db.get_propay_db_connection();
    		await models.Payment.updatePropyRefundsTable(propay_db_connection, company_id, property_id, property_name, transaction_id, amount, reason, result.transactionId);
    		await db.close_propay_db_connection(propay_db_connection);
		}catch(err){

				//e.th(400,err.msg);
				console.log("error",err)
				propay_db_connection = await db.get_propay_db_connection();
				await models.Payment.updatePropyRefundsTable(propay_db_connection, company_id, property_id, property_name, transaction_id, amount, reason, null);
    			await db.close_propay_db_connection(propay_db_connection);
				
				next(err);
			}
		
			
			
			//throw("Transaction rejected because the referenced original transaction is invalid");
		}
		
	
	
	)

	router.post('/hash',  control.hasAccess(), async (req, res, next) => {
		var id = Hashes.encode(+req.body.id, +req.body.company_id);
		
		res.send({
			status: 200,
			data: {
				hashed_id: id
			}
		})
	})

	router.get('/migrate-companies',  control.hasAccess(), async (req, res, next) => {

		try {
			// all are in the same DB now
			let mapping = await db.getMappingByCompanyId(1);

			var connection = await db.getConnectionByType('read', 1);
			let companies = await connection.queryAsync("Select * from companies");
			for(let i = 0; i < companies.length; i++){
				let data = {
					company_id: 		parseInt(companies[i].id),
					hashed_company_id: 	Hashes.encode(companies[i].id),
					gds_owner_id: 		companies[i].gds_owner_id,
					hb_company_id: 		parseInt(companies[i].id),
					name: 				companies[i].name,
					subdomain: 			companies[i].subdomain,
					database: 			mapping.database,
					redshift: 			mapping.redshift,
					redshift_schema: 	mapping.redshift_schema,
					collection: 		"hummingbird"
				}
				await db.saveCompany(data);
			}
			res.send({
				status: 200
			})
		} catch(err){
			console.log("Err", err)
			next(err);
		}
		await db.closeConnection(connection);

	})

	router.get('/legacy-mapping', control.hasAccess(), async (req, res, next) => {

		let mapping = [];

		try {
			let companies = await db.getAllCompanies();

			for(let i = 0; i < companies.length; i++){

				var connection = await db.getConnectionByType('read', companies[i].company_id);
				let properties = await Property.findByCompanyId(connection, companies[i].hb_company_id);

				for(let j = 0; j < properties.length; j++){
					mapping.push({
						gds_id: properties[j].gds_id,
						old_id: Hashes.encode(properties[j].id),
						new_id: Hashes.encode(properties[j].id, companies[i].company_id),
						name: properties[j].name,
						number: properties[j].number
					});
				}
				await db.closeConnection(connection);
			}
			res.send({
				status: 200,
				data: {
					mapping: mapping
				}
			})
		} catch(err){
			next(err);
		}

	})

	// TODO API URL implementation finish here
	router.get('/resubscribe-properties', control.hasAccess(), async(req, res, next) => {

		try {
			let companies = await db.getAllCompanies();
			for(let i = 0; i < companies.length; i++){
				var connection = await db.getConnectionByType('read', companies[i].company_id);
				let properties = await Property.findByCompanyId(connection, companies[i].hb_company_id);

				let apiKeys = await models.Api.findKeys(connection, companies[i].hb_company_id);

				if(!apiKeys.length) continue;
				let key = apiKeys[0].apikey;
				for(let j = 0; j < properties.length; j++){
					let resubscribe_url = `${settings.api_base_url}/companies/${Hashes.encode(companies[i].company_id)}/properties/${Hashes.encode(properties[j].id, companies[i].company_id)}/resubscribe-message-bus`;
					console.log("resubscribe_url", resubscribe_url);
					try{
						let data = await rp({
							headers: {
								"LeaseCaptain-API-Key": key
							},
							uri: resubscribe_url,
							method: 'GET',
							json: true
						});
					} catch(err){
						console.log("err", err);
					}
				}
				await db.closeConnection(connection);
			}
			res.send({
				status: 200,
			})
		} catch(err){
			next(err);
		}
	});

	router.get('/migrate-documents', async(req, res, next) => {

		let connection = await db.getConnectionByType('write', 1);

		let sql = 'select *, (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from uploads_leases where upload_id = uploads.id)))) as company_id from uploads where src like "http://api.hummingbird.local%"';
		console.log("sql", sql);
		let uploads = await connection.queryAsync(sql);

		for (let i = 0; i < uploads.length; i++){
			let hashed_id = Hashes.encode(uploads[i].company_id);
			uploads[i].src = uploads[i].src.replace('http://api.hummingbird.local:3001/v1/', `http://api.hummingbird.local:3001/v1/companies/${hashed_id}/`);
			console.log("upload", uploads[i]);

			let save_sql = "Update uploads set ? where id =  " + connection.escape(uploads[i].id);

			await connection.queryAsync(save_sql, {src: uploads[i].src});
		}
		await db.closeConnection(connection);

		res.send({
			status: 200
		})
	});

	router.get('/logs/:type',  control.hasAccess(), async(req, res, next) => {

		try {
			let logs = await db.getLogs(req.params.type);
			console.log(JSON.stringify(logs.map(m => ({Property: m.property_name, record_type: m.record_type, admin: m.admin, created_at: m.created_at }))));
			res.json({
				status: 200,
				data: {
					logs: logs
				}
			})
		} catch(err){
			next(err);
		}
	});

	router.delete('/logs/:type', control.hasAccess(), async(req, res, next) => {

		try {

			if(!req.query.created_at) e.th(400, "Missing key")
			await db.deleteLogs(req.params.type, req.query.created_at);
			res.json({
				status: 200,
				data: {}
			})
		} catch(err){
			next(err);
		}
	});


	router.get('/jobs',  control.hasAccess(), async(req, res, next) => {

		try {
			let { type, itemsPerPage, page } =  req.query;
			type = type || 'active';
			itemsPerPage = itemsPerPage ? parseInt(itemsPerPage) : 10;
			page = page ? parseInt(page) : 1;
			const jobs = await Queue.getJobs(type && [type], (itemsPerPage * (page - 1)), ((itemsPerPage * page) - 1));

			let totalJobs = await Queue.getJobCounts(type && [type]);
			if(type) totalJobs = totalJobs[type];

			res.send({
				status: 200,
				data: {
					jobs,
					totalJobs
				}
			})
		} catch(err){
			next(err);
		}
	});

	router.get('/jobs/logs/:job_id', control.hasAccess(), async(req, res, next) => {

		try {
			const logs = await Queue.getJobLogs(req.params.job_id)
			res.send({
				status: 200,
				data: {
					logs: logs
				}
			})
		} catch(err){
			next(err);
		}
	});

	router.post('/jobs/retry/:job_id', control.hasAccess(), async(req, res, next) => {

		try {
			const job = await Queue.getJob(req.params.job_id);
			try {
				await job.retry();
			} catch(err) {
				e.th(400, err.toString())
			}
			res.send({
				status: 200,
				data: {
					logs: logs
				}
			})
		} catch(err){
			next(err);
		}
	});

	router.delete('/jobs/:job_id', control.hasAccess(), async(req, res, next) => {

		try {
			const job = await Queue.getJob(req.params.job_id)
			await job.remove();
			res.send({
				status: 200
			})
		} catch(err){
			next(err);
		}
	});

	router.get('/script-jobs', control.hasAccess(['superadmin']), async(req, res, next) => {
		try {
			const script_jobs = await db.getAllScriptJobs();
			console.log("All Script Jobs", script_jobs);
			res.send({
				status: 200,
				data: {
					script_jobs
				}
			})
		} catch(err){
			next(err);
		}
	});

	router.delete('/script-job/:id',  control.hasAccess(['superadmin']), async(req, res, next) => {

		let { id } = req.params;
		let { filename } = req.query;
		console.log("JOB to Delete", id);

		try {
			if (!id || id === '')
				e.th(404, "Script Job ID not found");

			await db.deleteScripJobById(id);
			if (filename) {
				// delete file from S3 based on the filename
				await s3_handler.deleteFileFromS3(filename);
			}
			res.send({
				status: 200,
				data: `Job has been delete from Dynamo${filename ? 'and file has been deleted from S3.' : ''}`
			})
		} catch(err){
			console.log("Error", err);
			next(err);
		}
	});

	router.get('/update-lease-status', async(req, res, next) => {
	
		var date = req.query.date || null;
		var cid = req.query.company_id ? parseInt(req.query.company_id) : null;
		var property_id = req.query.property_id || null;
		let mapping = await db.getMappingByCompanyId(cid);
		let company_id = mapping.hb_company_id;

		Scheduler.runLeaseStatusUpdate(cid, { 
			date: date,
			company_id: company_id,
			property_id: property_id
		});
		
		res.send({
			status: 200,
			data: {}
		});
	});

	router.post('/generate-invoices', control.hasAccess(), async (req, res, next) => {

		console.log("req.body", req.body);

		var dryrun = req.body.dryrun || false;
		var date = req.body.date || null;
		var till_date = req.body.till_date || null;
		var cid = +req.body.company_id || null;
		var property_id = req.body.property_id || null;
		var lease_id = req.body.lease_id || null;
		var created_at = + new Date();
		let mapping = await db.getMappingByCompanyId(cid);
		let company_id = mapping.hb_company_id;
		let admin = res.locals.admin;
		
		await Scheduler.runInvoiceCreateRoutine(cid, { date, till_date, dryrun, company_id, property_id, lease_id, created_at, admin });

		res.send({
			status: 200,
			data: {}
		});
	});


	

	router.post('/generate-advance-invoices-exports', control.hasAccess(), async (req, res, next) => {
		var date = req.body.date || null;
		var cid = req.body.cid || null;
		var property_id = req.body.property_id || null;
		let mapping = await db.getMappingByCompanyId(cid);
		let company_id = mapping.hb_company_id;

		await Scheduler.runAdvanceInvoicesExportsRoutine(cid, { date, company_id, property_id });

		res.send({
			status: 200,
			data: {}
		});
	});

	router.post('/generate-status-discrepancies', control.hasAccess(), async (req, res, next) => {

		var date = req.body.date || null;
		var cid = req.body.company_id || null;
		var property_id = req.body.property_id || null;
		let dryrun = req.body.dryrun ;
		var created_at = + new Date();
		let mapping = await db.getMappingByCompanyId(cid);
		let company_id = mapping.hb_company_id;
		let admin = res.locals.admin;
		//var save = req.query.save || false;

		await Scheduler.runLeaseStatusDiscrepancies(cid, { date, company_id, property_id, created_at, dryrun, admin });
		res.end('ok');

	});

	router.post('/generate-autopayments', async (req, res, next) => {

		var date = req.body.date || null;
		var cid = +req.body.company_id || null;
		var property_id = req.body.property_id || null;
		let dryrun = req.body.dryrun;
		var created_at = + new Date();
		let mapping = await db.getMappingByCompanyId(cid);
		let company_id = mapping.hb_company_id;
		let admin = res.locals.admin;

		await Scheduler.runProcessAutoPaymentsRoutine(cid, { date, company_id, property_id, created_at, dryrun, admin });

		res.end('ok');

	});

	router.post('/generate-reconcile', control.hasAccess(), async (req, res, next) => {

		var cid =  req.body.company_id;
		let mapping = await db.getMappingByCompanyId(cid);
		let data = {
			date: req.body.date,
			property_id: req.body.property_id,
			company_id:  mapping.hb_company_id,
			dryrun: req.body.dryrun,
			created_at: + new Date(),
			admin: res.locals.admin
		};
		await Scheduler.runAutoReconcileRoutine(cid, data);
		res.end('ok');

	});

	router.post('/generate-triggers', async (req, res, next) => {

        let action_source;
		action_source = (req.body.type == 'Date') ? Enums.DELINQUENCY_SOURCE.ADMIN_DATE : ((req.body.type == 'Migration') ? Enums.DELINQUENCY_SOURCE.ADMIN_MIGRATION : ((req.body.type == 'Lease') ? Enums.DELINQUENCY_SOURCE.ADMIN_LEASE : action_source));


        action_source = action_source ?? Enums.DELINQUENCY_SOURCE.MANUAL;

        var cid = req.body.company_id;
        console.log("cid", typeof cid);
		let mapping = await db.getMappingByCompanyId(cid);
        let data = {
            date: req.body.date,
            property_id: req.body.property_id,
			company_id:  mapping.hb_company_id,
            dryrun: req.body.dryrun,
            lease_id: req.body.lease_id,
			created_at: + new Date(),
            type: req.body.type.toLowerCase(),
            run_actions: req.body.run_actions,
            admin: res.locals.admin,
            action_source: action_source
        };

		await Scheduler.triggerTriggers(cid, data);
		res.end('ok');
	});

	router.get('/revert-payment-cycles', control.hasAccess(), async (req, res, next) => {

		try {

			let { query: { cid, property_id, lease_id, date } } = req;

			let mapping = await db.getMappingByCompanyId(parseInt(cid));
			date = date || moment().format('YYYY-MM-DD');

			const company_id = mapping.hb_company_id;

			var connection = await db.getConnectionByType('read', mapping.company_id);

			let leases_payment_cycles = await models.Lease.getPaymentCyclesForReversion(connection, date, property_id, lease_id );

			res.send({
				status: 200,
				data: leases_payment_cycles
			});
		} catch (error) {
			next(error);
		}
		await db.closeConnection(connection);
	});


	router.post('/revert-payment-cycles', control.hasAccess(), async (req, res, next) => {

		var cid =  +req.body.company_id;
		
		let mapping = await db.getMappingByCompanyId(cid);

		var date = req.body.date || null;
		
		var property_id = req.body.property_id || null;
		var lease_id = req.body.lease_id || null;
		var created_at = + new Date();
		let company_id = mapping.hb_company_id;
		let admin = res.locals.admin;
		
		await Scheduler.runPaymentCycleRevertRoutine(cid, { date, company_id, property_id, lease_id, created_at, admin });

		res.send({
			status: 200,
			data: {
			}
		});
	});

	router.get('/triggers',  control.hasAccess(), async (req, res, next) => {


		var cid =  +req.query.company_id;
		var property_id =  +req.query.property_id;

		var connection = await db.getConnectionByType('read', cid);
		let triggers = await Trigger.getTriggersByPropertyId(connection, property_id)
		await db.closeConnection(connection);
		res.json({
			status: 200,
			data: {
				triggers: triggers
			}
		})

	});

		// ^ NEW //

	// router.get('/lease-status-update',  function(req, res, next){
	//
	// 	var jobParams = [];
	// 	jobParams.push({
	// 		category: 'process_lease_statuses',
	// 		data: {
	// 			company: {id: 1},
	// 			date: moment().format('YYYY-MM-DD')
	// 		}
	// 	});
	//
	// 	Scheduler.addJobs(jobParams, function(err){
	// 		if(err) console.log(err);
	// 		res.json({
	// 			status: 200
	// 		});
	// 	});
	//
	// })

	

	router.get('/verify-auto-charges', async(req, res, next) => {

		var dryrun = req.query.dryrun || false;
		var date = req.query.date || null;
		var company_id = req.query.company_id || null;
		var property_id = req.query.property_id || null;

		await Scheduler.runVerifyAutoChargesRoutine({pool: pool, queue:queue }, {
			date:date,
			dryrun:true,
			company_id:company_id,
			property_id:property_id
		});

		res.end('ok');

	});

	//MVP TI - 12317 POC START

	router.get('/generateTenantPaymentStatement', async (req, res, next) => {

		var dryrun = req.query.dryrun || false;
		var date = req.query.date || null;

		await Scheduler.runMonthlyTenantPaymnetTransaction();

		res.end('ok');

	});

	//MVP TI - 12317 POC END

	router.get('/verify-triggers-fired', function(req, res, next) {

		let data = { pool: pool, queue:queue };

		if(req.query.trigger_id){
			data.trigger_id = req.query.trigger_id;
		}

		if(req.query.company_id){
			data.company_id = req.query.company_id;
		}
		if(req.query.property_id){
			data.property_id = req.query.property_id;
		}

		if(req.query.date){
			data.date = req.query.date;
		}

		if (!req.query.company_id || !req.query.property_id || !req.query.date || !req.query.trigger_id) {
			res.status(400).end("company_id, property_id, date and trigger_id required");
		}

		Scheduler.verifyTriggers(data);
		res.end('ok');
	});

	router.get('/error-states-summary', async function(req, res, next) {
		var dryrun = req.query.dryrun || false;
		var date = req.query.date || null;

		var company_id = req.query.company_id || null;
		var property_id = req.query.property_id || null;
		Scheduler.runErrorStateSummaryRoutine({pool: pool, queue:queue }, {date:date, dryrun:dryrun,company_id:company_id,property_id:property_id});
		res.end('ok');
	});

	router.get('/severe-error-states-summary', async function(req, res, next) {
		var dryrun = req.query.dryrun || false;
		var date = req.query.date || null;

		var company_id = req.query.company_id || null;
		var property_id = req.query.property_id || null;
		Scheduler.runSevereErrorStateSummaryRoutine({pool: pool, queue:queue }, {date:date, dryrun:dryrun,company_id:company_id,property_id:property_id});
		res.end('ok');

		// var connection = {};
		// connection = await pool.getConnectionAsync();

		// try{

		// 	let invoice = new Invoice();
		// 	await invoice.sendSevereErrorStateSummary(connection);
		// 	res.end('email sent');

		// } catch(err) {
		// 	console.log("err", err);
		// 	console.log(err.stack);
		// 	next(err);
		// }
		// await utils.closeConnection(pool, connection);
	});


	router.get('/test-welcome-email', function(req, res, next) {
		var jobParams = [];
		jobParams.push({
			category: 'welcomeEmail',
			data: {
				company_id: 1,
				id: 13273,
				action: 'email',
				label: 'setup',
				domain: 'h6design'
			}
		});

		Scheduler.addJobs(jobParams, function(err){
			if(err) console.log(err);
			res.json({
				status: true
			});
		});



	})

	router.get('/sync-forte', async (req, res, next) => {

		var connection = await pool.getConnectionAsync();

		try {

			await connection.beginTransactionAsync();

			let requestHeaders = {
				"Accept": "application/json",
				"Content-Type": "application/json",
				"Cache-Control": "no-cache"
			};
			requestHeaders["Authorization"] = "Basic ZDg2MGZhMDFiZmM2NjEyZWVjOTAyMTRhYjJkMmNiMTM6ZDc2MzgyMTg3ZDRjZTE1MTlmZjJlMjZhODMwMmRlYmQ=";
			requestHeaders["X-Forte-Auth-Organization-Id"] = "org_235401";
			let page = 0;
			let received_date = moment();
			let endpoint = "https://api.forte.net/v3/organizations/org_235401/transactions?orderby=received_date+desc";

			for (let i = 0; i < 4; i++){

				let data = await rp({
					headers: requestHeaders,
					uri: endpoint + '&page_index=' + i,
					method: 'GET',
					json: true
				});
				console.log("data", data.results.length);
				for(let j = 0; j < data.results.length; j++){
					let p = data.results[j];
					if(!p.customer_id) continue;
					let received_date = moment(p.received_date).format('YYYY-MM-DD');
					if(received_date !== '2019-11-30') continue;

					console.log("p", p);

					let lease = await models.Lease.findByACHToken(connection, p.customer_token);
					console.log("lease", lease);
					if(!lease) throw "No Lease Found!";
					let lease_id = lease.id;

					let payment_method = await models.Payment.findACHPaymentMethodLastFour(connection, lease_id, p.echeck.last_4_account_number);
					if(!payment_method) throw "No Payment Method Found!";
					console.log("payment_method", payment_method);
					if(!payment_method) continue;
					let payment = new Payment();
					payment.lease_id = lease_id;
					payment.amount = p.authorization_amount;
					payment.transaction_id = p.transaction_id;
					payment.auth_code = p.authorization_code;
					payment.payment_methods_id = payment_method.id;
					payment.source = 'auto';
					payment.credit_type = 'payment';
					payment.status = 1;
					payment.method = 'ach';
					payment.date = moment(received_date).format('YYYY-MM-DD');

					console.log("payment", payment);
					await payment.save(connection);


					let property = new Property({ id: req.query.property_id });

					const currentPropertyDate = await property.getLocalCurrentDate(connection);

					let invoice = await models.Invoice.findAutoByDate(connection, moment().add(1, 'day').format('YYYY-MM-DD'), null, lease_id);
					console.log("invoice", invoice);
					let invoicesPayment = {
						invoice_id: invoice.id,
						payment_id: payment.id,
						date: moment(currentPropertyDate).add(1, 'day').format('YYYY-MM-DD'),
						amount: payment.amount
					};
					await models.Payment.applyPayment(connection, invoicesPayment);

					console.log("invoicesPayment", invoicesPayment);


				}
			}

			await connection.commitAsync();

		} catch(err) {
			console.log(err);
			await connection.rollbackAsync()
		}
		await utils.closeConnection(pool, connection);
		res.end('ok');

	});

	router.get('/companies/:company_id/facilities/:property_id/sync', async (req, res, next) => {

		try {
			let params = req.params;
			console.log("PARAMS", params)
			let company_id = parseInt(req.params.company_id);
			let property_id = parseInt(req.params.property_id);
			
			console.log("COMPANY_ID", req.params)
			var mapping = await db.getMappingByCompanyId(company_id);
			var connection = await db.getConnectionByType('read', mapping.company_id);

			const property = new Property({id: property_id});
			await property.find(connection);
			await property.getAllUnits(connection);
			let formattedUnit = property.formatUnitsById()
			await property.getAccessControl(connection);
			let unitsSynced = await property.Access.unitsSync(formattedUnit);
			res.send({
				status: 200,
				data: unitsSynced
			})

			// await connection.commitAsync();

		} catch(err) {
			console.log(err);
			next(err);
			// await connection.rollbackAsync()
		}
		// await utils.closeConnection(pool, connection);

	});

	router.get('/test-external-message-sending', function(req, res, next) {
		var jobParams = [];
		jobParams.push({
			category: 'external_lead',
			data: {
				lead_id: 193,
				action: 'received',
				label: '',
				domain: 'sandbox'
			}
		});

		Scheduler.addJobs(jobParams, function(err){
			if(err) console.log(err);
			res.json({
				status: true
			});
		});
	});

	router.post('/configure-contact-payment-methods', async (req, res, next) => {
		try{
			  let companies = await db.getAllCompanies();
	  
			  let {company_id , dry_run = true} = req.body;
	  
			  if(company_id){
				  if(Array.isArray(company_id)){
					  companies = companies.filter(c => company_id.some(cid => c.company_id === cid));
				  }else{
					  companies = companies.filter(x => x.company_id === company_id);
				  }
			  }
			  for(let i = 0; i < companies.length; i++){
	  
				  let data = {
					  company_id: companies[i].hb_company_id,
					  dry_run
				  }
	  
				  Scheduler.runConfigureContactTokenRoutine(companies[i].company_id, data);
			  }
		  
			  res.send({
				  status: 200,
				  data: {
				  result: {},
				  message: 'success'
				  }
			  })
		}catch(err){
		  console.log("Error: ", err);
		  //await connection.rollbackAsync();
		  next(err);
		}
	  
	});

	// router.get('/property-triggers', function(req, res, next) {

	// 	let data = { pool: pool, queue: queue }

	// 	// if(req.query.trigger_id){
	// 	// 	data.trigger_id = req.query.trigger_id;
	// 	// }
	// 	if(req.query.company_id){
	// 		data.company_id = req.query.company_id;
	// 	}

	// 	if(req.query.date){
	// 		data.date = req.query.date;
	// 	}

	// 	Scheduler.propertyTriggers(data);
	// 	res.end('ok');
	// });

	router.get('/test-sms', function(req, res, next) {
		Scheduler.triggerTriggers({ pool: pool, queue:queue });
		res.end('ok');
	});

	router.get('/events', function(req, res, next) {
		var connection;
		var company_id = 1;
		var date = moment().format('YYYY-MM-DD');
		pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			return models.Event.findByCompanyId(connection, company_id).map(e => {
				var event = new Event(e);
				return event.find(connection).then(function (status) {
					switch (event.trigger_reference) {
						case 'past_due':
							return models.Event.findOverdue(connection, date, event, company_id);
							break;
						default:
							return true;
					}
				})
			})

		}).then(function(overdue) {

			console.log(overdue);
			connection.release();
			res.end('ok');

		}).catch(function(err){
			console.error(err);
			console.error(err.stack);
			res.end('ok');
		})

	});

	router.get('/apply-late-payments', function(req, res, next) {


		var connection = {};
		var company = {};

		pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			return Scheduler.applyLatePayments({pool: pool, queue:queue });
		}).then(function(invoice){
			console.log(invoice);
			connection.release();
			res.end('ok');
		}).catch(function(err){
			console.log(err);
			console.log(err.stack);
		});

	});

	router.get('/regenerate-invoice', function(req, res, next) {

		var connection = {};
		var lease = {};
		var billdate = '';
		var company = {};
		var invoice = {};
		var services = [];
		if(!req.query.lease_id || !req.query.billdate ){
			res.end('missing params');
		} else {
			pool.getConnectionAsync().then(function(conn) {
				connection = conn;

				return models.Company.findByLeaseId(connection, req.query.lease_id);
			}).then(function(companyRes){
				company = companyRes;
				billdate = moment(req.query.billdate, "YYYY-MM-DD");
				lease = new Lease({id: req.query.lease_id});
				return lease.find(connection);
			}).then(function(){

				return lease.getCurrentServices(connection, company.id)

			}).then(function(servicesRes){


				if(!servicesRes) throw new Error(lease.msg);
				services = servicesRes;
				return lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
			}).then(function(datetime){
				invoice = new Invoice({
					lease_id: lease.id,
					user_id: null,
					date: moment(datetime).format('YYYY-MM-DD'),
					due: billdate.format('YYYY-MM-DD'),
					company_id: company.id,
					type: "auto",
					status: 1
				});
				invoice.Lease = lease;
				invoice.Company = company;

				return invoice.makeFromServices(connection, services);

			}).then(function(){
				console.log(invoice);
				if(!invoice.InvoiceLines.length) return;
				console.log("INVOICELINES LENGTH", invoice.InvoiceLines);
				//        return invoice.save(connection).then(function(){
				return invoice;
				//        });
			}).then(function(invoice){
				console.log(invoice);
				connection.release();
				res.end('ok');
			}).catch(function(err){
				console.log(err);
				console.log(err.stack);
			});

			//        Scheduler.sendChargesSummary({pool: pool, queue:queue });
		}


	});

	router.get('/test-payment-methods', function(req, res, next) {

		var company = {};
		var connection = {};
		var lease = {};
		var billdate = {};
		var company_id = 2;
		var services= [];
		var invoice = {};

		pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			return models.Company.findById(connection, company_id);
		}).then(function(companyRes){
			company = companyRes;
			lease = new Lease({id: 2});

			return models.Payment.findPaymentMethodsByLeaseId(connection, lease.id, true);

		}).then(function(payMethods){
			lease.PaymentMethods = payMethods;
			return lease.getNextBillingDate();
		}).then(function(nextBillDate){
			billdate = nextBillDate;
			return true;
		}).then(function(){
			return lease.getCurrentServices(connection, company_id)
		}).then(function(servicesRes) {

			services = servicesRes;
			return lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
		}).then((datetime) => {
			invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: billdate.format('YYYY-MM-DD'),
				company_id: company_id
			});
			invoice.Lease = lease;
			invoice.Company = company;

			return invoice.makeFromServices(connection, services);
		}).then(function(){
			return invoice.calculatePayments();
		}).then(function(){
			res.end('ok');
			//return invoice;
		});

	});

	router.get('/send-charges-summary', function(req, res, next) {
		Scheduler.sendChargesSummary({pool: pool, queue:queue });
		res.end('ok');
	});

	router.get('/send-charges-to-tenants', function(req, res, next) {
		Scheduler.sendChargesToTenants({pool: pool, queue:queue });
		res.end('ok');
	});

	router.get('/trigger-payouts', control.hasAccess(['superadmin']), function(req, res, next) {
		Scheduler.trigger_payouts();
		res.end('ok');
	});

	// router.get('/process-auto-payments', function(req, res, next) {
	//     var company_id = req.query.company_id;
	//     var dryrun = req.query.dryrun;
	//     var date = req.query.date;
	//     var connection = {};
	//     var lease = {};
	//     var leasesCount = 0;
	//
	//     console.log("dryrun", dryrun);
	//
	//
	//     pool.getConnectionAsync().then(function(conn){
	//         connection = conn;
	//
	//         if(!company_id) {
	//             throw new Error("Company Id not set")
	//         }
	//         return models.Invoice.findInvoicesToAutoCharge(connection, company_id, date).mapSeries(i => {
	//
	// 			var invoice = new Invoice(i);
	//
	//             return invoice.find(connection).then(r => {
	//
	// 	            invoice.total();
	//
	// 	            return invoice.calculatePayments();
	//             }).then(function(){
	// 	            return invoice.getOpenPayments(connection);
	//             }).then(function(){
	//
	// 	            if(invoice.balance <= 0) {
	// 		            console.log("Invoice", {
	// 			            number: invoice.number,
	// 			            paid: invoice.paid,
	// 			            type: invoice.type,
	// 			            status: invoice.status,
	// 			            period_end: invoice.period_end,
	// 			            msg: invoice.msg,
	// 			            unit: invoice.Lease.Unit.Address.address + ' #' + invoice.Lease.Unit.number,
	// 			            discounts: invoice.discounts,
	// 			            totalDue: invoice.totalDue,
	// 			            totalTax: invoice.totalTax,
	// 			            subTotal: invoice.subTotal,
	// 			            rentTotal: invoice.rentTotal,
	// 			            utilitiesTotal: invoice.utilitiesTotal,
	// 			            totalPayments: invoice.totalPayments,
	// 			            openPayments: invoice.openPayments,
	// 			            balance: invoice.balance,
	// 			            PaymentsToApply: invoice.PaymentsToApply,
	// 		            });
	//
	// 		            console.log("There is no balance on this invoice.");
	// 	            };
	//
	// 	            return PaymentRoutines.payInvoice(pool, invoice, company_id, dryrun).then(function(response){
	// 		            console.log(response);
	// 	                return;
	// 	            });
	//             })
	//         });
	//
	//     }).then(function(openInvoicesRes){
	//         res.end('ok');
	//
	//     }).catch(function(err){
	//         console.log(err);
	//         console.log(err.stack);
	//         res.render('pay-invoices', {
	//             err: err.toString()
	//         });
	//     })
	// });

	router.post('/pay-invoices', function(req, res, next) {

		var lease_id = Hashes.decode(req.body.lease_id)[0];
		var company_id = req.body.company_id;

		PaymentRoutines.processPayment({
			lease_id: lease_id,
			company_id: company_id
		}, pool, Scheduler).then(function(response){
			res.send(response);
		});
	});

	router.get('/message-test', async(req, res, next) => {

		try{
			var cid =  +req.query.company_id;
			var property_id =  +req.query.property_id;
			var contact_id =  +req.query.contact_id;
			var connection = await db.getConnectionByType('read', cid);

			let contact = new Contact({id: contact_id});
			await contact.find(connection);
			await contact.sendEmail(connection, "Test Email", "This is a test email. Please disregard.", [], null, 'WORKER TEST', cid, property_id, {id: 5}, contact.id, null )


			res.write('ok');
			res.end();
		} catch(err){

			res.write(err);
			res.end();
		}

	});

	router.get('/ach-test', function(req, res, next) {

		// Merchant ID: 193806
		// Transmitter ID: 37823
		// API Key: 0af3312fb6eee0443247b784a365625b
		// API Secret: 02c7e87deb601966dafae373d5640e4a


		var baseUrl = "https://sandbox.forte.net/api/v3";
		var organization_id = "334316";
		var location_id = "192642";
		var authOrganizationId = "334316";
		var apiID = "4fefaf5f77d944ce10bdd3d88f7a2da9";
		var apiSecret = "51302217c0fbb534f81457adb369930c";
		var authHeader = new Buffer(apiID+":"+apiSecret).toString('base64');

		var requestHeaders = {
			"Authorization": "Basic " + authHeader,
			"X-Forte-Auth-Organization-Id": "org_"+authOrganizationId,
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Cache-Control": "no-cache"
		}


		var postVars = {};


		/*
        //  Customer create request params
        var endpoint = "/organizations/org_"+organization_id+"/locations/loc_"+location_id+"/customers";
        postVars = {
            organization_id: "org_" + organization_id,
            location_id: "loc_" + location_id,
            first_name: "Jeff",
            last_name: "Ryan",
            customer_id: "34234", // internal customer ID
        }
        */

		/*
        // Create Payment Method
        // security code vars: ARC, CCD, CIE, CTX, POP, POS, PPD, RCK, TEL, WEB

        var endpoint = "/organizations/org_"+organization_id+"/locations/loc_"+location_id+"/paymethods";
        var customer_id = "cst_iWDhp6-0PUaBbyaTg65zTA";

        postVars = {
            organization_id: "org_" + organization_id,
            location_id: "loc_" + location_id,
            customer_token: customer_id,
            label: "ACH Payments",
            echeck: {
                account_holder: "Jeff Ryan",
                account_number: "1111111111111",
                routing_number: "021000021",
                account_type: "Checking",
                sec_code: "RCK"
            }
        };

        */


		/*
        // Create Payment

        var endpoint = "/organizations/org_"+organization_id+"/locations/loc_"+location_id+"/transactions";
        var customer_id = "cst_iWDhp6-0PUaBbyaTg65zTA";
        var paymethod_token = "mth_TMVa_YYLvk-9qa7oBGe1Og";

        postVars = {
            organization_id: "org_" + organization_id,
            location_id: "loc_" + location_id,
            action: 'sale',
            customer_token: customer_id,
            paymethod_token: paymethod_token,
            reference_id: "3442342",             // payment_id
            authorization_amount: "100.00",
            entered_by: 34                      // user_id of person entering transaction
        };

        // var transaction_id = trn_84333dd7-ac5f-4fa1-8351-0fe9e26233ea
        */


		/*
         // Create Payment

         var endpoint = "/organizations/org_"+organization_id+"/locations/loc_"+location_id+"/transactions";
         var customer_id = "cst_iWDhp6-0PUaBbyaTg65zTA";
         var paymethod_token = "mth_TMVa_YYLvk-9qa7oBGe1Og";

         postVars = {
         organization_id: "org_" + organization_id,
         location_id: "loc_" + location_id,
         action: 'sale',
         customer_token: customer_id,
         paymethod_token: paymethod_token,
         reference_id: "3442342",             // payment_id
         authorization_amount: "100.00",
         entered_by: 34                      // user_id of person entering transaction
         };

         // var transaction_id = trn_84333dd7-ac5f-4fa1-8351-0fe9e26233ea
        */

		// DELETE Payment Method
		var paymethod_token = "mth_TMVa_YYLvk-9qa7oBGe1Og";
		var endpoint = "/organizations/org_"+organization_id+"/locations/loc_"+location_id+"/paymethods/"+paymethod_token;



		request({
			headers: requestHeaders,
			uri: baseUrl + endpoint,
			//     body: postVars,
			method: 'DELETE',
			json: true
		}, function (err, r, body) {
			console.log(err);
			res.send(body);
		});






		//X-Forte-Auth-Organization-Id
		//Accept:




		// Authorization
		// X-Forte-Auth-Organization-Id


	});

	router.get('/send-auto-report-summary', function(req, res, next) {

		pool.getConnectionAsync().then(function(conn) {

			if(!req.query.company_id) throw new Error('Company id not defined');
			var data = {
				company_id: req.query.company_id,
				date: req.query.date || moment().format('YYYY-MM-DD')
			};

			return AutoActionReport.createPaymentSummary(data, pool);
		}).then(function(filename){
			console.log(filename);
			res.download(filename);

		}).catch(err => {
			res.end();
		}).finally(() => utils.closeConnection(pool, connection))

	});

	router.get('/test-company-notification-email', function(req, res, next) {
		var connection;
		var company_id = 2;
		var company = {};
		pool.getConnectionAsync().then(function(conn) {
			connection = conn;

			company = new Company({id: company_id});
			return company.find(connection);

		}).then(function(companyRes) {

			connection.release();
			res.end('ok');

		}).catch(function(err){
			console.error(err);
			console.error(err.stack);
			res.end('ok');
		})
	});

	router.get('/void-transaction', function(req, res, next) {

		var transaction_id = req.query.transaction_id;
		var auth_code = req.query.auth_code;
		var connection;
		var payment = {};
		var paymentMethod = {};
		var company_id = {};
		var configVals = {};

		pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			return models.Payment.findPaymentByTransactionId(connection, transaction_id);
		}).then(function(p){

			payment = new Payment(p);

			return models.Company.findByLeaseId(connection, payment.lease_id);

		}).then(function(p){

			return payment.find(connection);

		}).then(function(p){

			paymentMethod = new PaymentMethod({id: payment.payment_methods_id});

			return paymentMethod.find(connection)

		}).then(function(){

			return paymentMethod.getExternalConnectionValues(connection, company_id);

		}).then(function(configValsRes){
			configVals = configValsRes;

			console.log("Payment", payment);

			console.log("Payment Method", paymentMethod);

			console.log("Config", configVals);
			console.log("Voiding...");

			return forteACHFuncs.voidTransaction(configVals, transaction_id, auth_code ).then(function(body, r, e){
				console.log('Successfully voided transaction');
				console.log(body);
				console.log(r);
				console.log(e);
				return true;

			}).catch(function(err){
				console.error(err);
				console.error(err.error.response.response_desc);
				throw err.error.response.response_desc;
			})



		}).then(function(){
			res.end('ok');
			//return invoice;
		}).catch(function(err){
			res.end('ok');
		}).finally(() => utils.closeConnection(pool, connection))


	});



	// Create manual rate change schedule based on automated rate change
	router.get('/companies/:cid/manual-rate-change-creation', async(req, res, next)=> {
		try{

			let mapping = await db.getMappingByCompanyId(parseInt(req.params.cid));
			var date = req.query.date || null;
			var company_id = mapping.hb_company_id;
			var property_id = req.query.property_id || null;
	
			Scheduler.runRateRaiseRoutine(mapping.company_id, {
				date: date,
				company_id: company_id,
				property_id: property_id
			});
			res.end('ok');
		}catch(err){
			next(err)
		}
	});


	router.get('/companies/:cid/rent-cron', control.hasAccess(['superadmin']), async(req, res, next)=> {
		try{
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.cid));
			var date = req.query.date || null;
			var company_id = mapping.hb_company_id;
			var property_id = req.query.property_id || null;
			var bypass = req.query.bypass || null;

	
			Scheduler.runRateRaiseRoutine(mapping.company_id, {
				date: date,
				company_id: company_id,
				property_id: property_id,
				bypass: bypass
			});
			res.end('ok');
		} catch(err){
			console.log(`ERROR: `, err)
			next(err)
		}
	});

	// Generate report for schedule exports
	router.get('/companies/:cid/generate-schedule-export-report', async(req, res, next)=> {
		try{

			let mapping = await db.getMappingByCompanyId(parseInt(req.params.cid));
			var date = req.query.date || null;
			var company_id = mapping.hb_company_id;
			var property_id = req.query.property_id || null;
			
			Scheduler.runScheduleExportsRoutine(mapping.company_id, {
				date: date,
				company_id: company_id,
				property_id: property_id
			});

			res.end('ok');
		}catch(err){
			next(err)
		}
	});


	router.get('/companies/:cid/auction-day', async(req, res, next) => {
		try {
			let mapping = await db.getMappingByCompanyId(req.params.cid);
			let data = {};
	
			if(req.query.property_id){
				data.property_id = req.query.property_id;
			}
			data.company_id = mapping.hb_company_id;
			
			if(req.query.date){
				data.date = req.query.date;
			}
	
			if(req.query.dryrun){
				data.dryrun = (req.query.dryrun == 'true' || req.query.dryrun == 'True');
			}
	
			// req.query.dryrun = true;
			Scheduler.runAuctionDayRoutine(mapping.company_id, data);
			res.end('ok');
		} catch(err){
			next(err)
		}	
	});

	router.get('/companies/:cid/send-advance-rental-email', async(req, res, next) => {

		try {
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.cid));
			let data = {};
	
			if(req.query.property_id){
				data.property_id = req.query.property_id;
			}
			data.company_id = mapping.hb_company_id;
			
			if(req.query.date){
				data.date = req.query.date;
			}
	
			if(req.query.dryrun){
				data.dryrun = (req.query.dryrun == 'true' || req.query.dryrun == 'True');
			}
	
			// req.query.dryrun = true;
			Scheduler.sendAdvanceRentalEmails(mapping.company_id, data);
			res.end('ok');
		} catch(err){
			next(err)
		}
	});

	router.get('/companies/:cid/transactions-flow', async(req, res, next) => {
		
		try {
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.cid));
			let data = {};
	
			if(req.query.property_id){
				data.property_id = req.query.property_id;
			}
			data.company_id = mapping.hb_company_id;
			
			if(req.query.date){
				data.date = req.query.date;
			}
	
			if(req.query.dryrun){
				data.dryrun = (req.query.dryrun == 'true' || req.query.dryrun == 'True');
			}
	
			// req.query.dryrun = true;
			Scheduler.runTransactionsRoutine(mapping.company_id, data);
			res.end('ok');
		} catch(err){
			next(err)
		}
		
	});

	router.get('/companies/:cid/rent-raise', async(req, res, next) =>{
		
		try {
			let mapping = await db.getMappingByCompanyId(req.params.cid);
			let data = {};
	
			if(req.query.property_id){
				data.property_id = req.query.property_id;
			}
			data.company_id = mapping.hb_company_id;
			
			if(req.query.date){
				data.date = req.query.date;
			}
	
			if(req.query.dryrun){
				data.dryrun = (req.query.dryrun == 'true' || req.query.dryrun == 'True');
			}
	
			// req.query.dryrun = true;
			Scheduler.runTransactionsRoutine(mapping.company_id, data);
			res.end('ok');
		} catch(err){
			next(err)
		}
		
	});

	router.post('/test-export', async (req, res, next) => {
		let mapping = await db.getMappingByCompanyId(parseInt(req.body.cid));
		var connection = await db.getConnectionByType('read', mapping.company_id);
		let exports = new AccountingExport({
			company_id: mapping.company_id,
        	// property_id: req.body.property_id,
        	property_id: [req.body.property_id],
        	start_date: req.body.start_date,
        	end_date: req.body.end_date,
        	type: req.body.type,
        	format: req.body.format,
		});
		await exports.generateDocument(connection)
		res.send({
			status: 200,
		})
		await db.closeConnection(connection);
	})

	router.post('/revenue-recognition', control.hasAccess(), async(req, res, next) => {
		
		try {
			var date = req.body.date || null;
			var cid = +req.body.cid || null;
			var property_id = req.body.property_id || null;
			let mapping = await db.getMappingByCompanyId(cid);
			let data = {};

			data.property_id = property_id || null;
			data.company_id = +mapping.hb_company_id || null;
			data.date = date;

			Scheduler.runRevenueRecognitionRoutine(cid, data);
			res.end('ok');
		} catch(err){
			next(err)
		}
		
	});

	router.get('/populate-exports', async (req, res, next) => {

		try {
			let { query : {cid, property_id, from_date, to_date} }  = req;

			const mapping = await db.getMappingByCompanyId(parseInt(cid));
			var connection = await db.getConnectionByType('read', mapping.company_id);

			if(!to_date && property_id) {
				const property = new Property({ id: property_id });
				let date = await property.getLocalCurrentDate(connection);
				to_date = date;
			}

			let company_id = mapping.hb_company_id;
			let data = { company_id, property_id, from_date, to_date };
			let invoices = await Accounting.generateInvoicesExports(connection, data);
			let void_invoices = await Accounting.generateVoidInvoicesExports(connection, data);
			let allowances = await Accounting.generateAllowanceExports(connection, data);
			let applied_payments = await Accounting.generatePaymentsExports(connection, data);
			let revenue_recogs = await Accounting.generateRevenueRecognitionExports(connection, data);
			let refunds = await Accounting.generateRefundsExports(connection, data);
			let interPropertyPayments = await Accounting.generateInterPropertyPaymentExportsExports(connection, data);
			let missing_events =  await Accounting.findMissingJournalEventConfig(connection, { company_id, property_id });

			let result = [
				{
					name: 'Invoice Exports',
					slug: 'invoices',
					count: invoices && invoices.length ? invoices.length : 0,
					data: invoices && invoices.length ? invoices : []
				},
				{
					name: 'Void Invoice Exports',
					slug: 'void_invoices',
					count: void_invoices && void_invoices.length ? void_invoices.length : 0,
					data: void_invoices && void_invoices.length ? void_invoices : []
				},
				{
					name: 'Allowance Exports',
					slug: 'allowances',
					count: allowances && allowances.length ? allowances.length : 0,
					data: allowances && allowances.length ? allowances : []
				},
				{
					name: 'Applied Payments Exports',
					slug: 'applied_payments',
					count: applied_payments && applied_payments.length ? applied_payments.length : 0,
					data: applied_payments && applied_payments.length ? applied_payments : []
				},
				{
					name: 'Revenue Recognition Exports',
					slug: 'revenue_recogs',
					count: revenue_recogs && revenue_recogs.length ? revenue_recogs.length : 0,
					data: revenue_recogs && revenue_recogs.length ? revenue_recogs : []
				},
				{
					name: 'Refund Exports',
					slug: 'refunds',
					count: refunds && refunds.length ? refunds.length : 0,
					data: refunds && refunds.length ? refunds : []
				},
				{
					name: 'Inter property payments Exports',
					slug: 'inter_property_payments',
					count: interPropertyPayments && interPropertyPayments.length ? interPropertyPayments.length : 0,
					data: interPropertyPayments && interPropertyPayments.length ? interPropertyPayments : []
				}
			]

			let accounting_data = {
				exports: result,
				missing_events
			}

			res.send({
				status: 200,
				data: accounting_data
			});
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.post('/populate-exports', async (req, res, next) => {

		try {
			const { body : {cid, property_id, from_date, to_date} }  = req;
			
			const mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			await Scheduler.runPopulateExportsRoutine(cid, { company_id, property_id, from_date, to_date });

			res.send({
				status: 200,
				data: {}
			});
		} catch (err) {
			next(err);
		}
	});

	router.post('/migrate-company-accounting', async (req, res, next) => {

		try {
			const { cid }  = req.body;
			let companies = await db.getCompaniesByNamespace();
			console.log('Namespace companies ', companies);

			if(cid){
				companies = companies.filter(x => x.company_id == cid);
			}
			
			for(let i = 0; i < companies.length; i++){
				try{
					var connection = await db.getConnectionByType('write', companies[i].company_id);

					utils.sendLogs({
						event_name: ENUMS.LOGGING.MIGRATE_ACCOUNTING,
						logs: {
							payload: {
								cid: companies[i].company_id,
								company_id: companies[i].hb_company_id
							}
						}
					}); 

					let company_id = companies[i].hb_company_id;
					let name = companies[i].name;

					let company_accounting_setup = await models.Accounting.findAccountingSetupByCompanyId(connection, company_id);
					let accountingTemplate = await models.Accounting.findAccountingTemplate(connection, company_id);

					if(company_accounting_setup.length){
						if(accountingTemplate.length) {
							console.log("Accounting already migrated for company: ", company_id);
							e.th(409, `Accounting already migrated for company: ${company_id}`);
						}

						let admins = await models.Contact.findHBAdminContact(connection);
						let admin_contact = admins.length ? admins.find(a => a.first === 'Hummingbird' && a.last === 'Settings' && a.status === 'active') : null;
						admin_contact = admin_contact && admin_contact.id ? admin_contact : (admins.length? admins.find(a => a.status === 'active') : null);
						let admin_id = admin_contact && admin_contact.id;

						await connection.beginTransactionAsync();

						console.log("Migrating Accounting For Company => ", name);

						let accounting_template_id = await Accounting.createDefaultAccountingTemplateForCompany(connection, { company_id, admin_id });
				
						await Accounting.assignTemplateToAccountingBook(connection, { company_id, accounting_template_id });
						await Accounting.assignTemplateToGlEvents(connection, { company_id, accounting_template_id });
						await Accounting.assignTemplateAndAccountsToDefaultSubTypes(connection, { company_id, accounting_template_id, admin_id });
						await Accounting.assignCorporateAccountToPropertyProducts(connection, { company_id });
						await Accounting.assignDefaultTemplateToAllPropertiesOfCompany(connection, { company_id, accounting_template_id, admin_id });
						await Accounting.assignAccountingToggleSettingsToCompany(connection, { company_id });

						await connection.commitAsync();

						console.log("Done Migrating Accounting For Company => ", name);
					}else{
						console.log("Accounting Not Setup For Company => ", name);
					}

				} catch(err) {
					await utils.sendLogs({
						event_name: ENUMS.LOGGING.MIGRATE_ACCOUNTING,
						logs: {
							payload: {
								cid: companies[i].company_id,
								company_id: companies[i].hb_company_id
							},
							error: err?.stack?.toString() || err?.message?.toString() || err
						}
					});

					console.log("AccountingMigrationError: ",err)
					await connection.rollbackAsync();
				} finally {
					await db.closeConnection(connection);
				}
			}

			res.send({
				status: 200,
				data: {}
			});
		} catch (error) {
			next(error);
		}
	});

	router.get('/generate-invoice-allocation', async (req, res, next) => {

		try {
			const { query : {cid, property_id, invoice_id} }  = req;

			const mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			var connection = await db.getConnectionByType('read', mapping.company_id);
			let invoice_breakdowns = await Invoice.findInvoiceAndBreakdowns(connection, company_id, { property_id, invoice_id });

			res.send({
				status: 200,
				data: invoice_breakdowns
			});
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.post('/generate-invoice-allocation', async (req, res, next) => {
		try {
			const { body : {cid, property_id, invoice_id} }  = req;

			const mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			await Scheduler.runGenerateInvoiceAllocation(cid, { company_id, property_id, invoice_id });

			res.send({
				status: 200,
				data: {}
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/send-invoice-emails', async (req, res, next) => {
		try {
			const { query : {cid, property_id = null, created_date_start, created_date_end, due_date_start, due_date_end} }  = req;
			let companies = await db.getCompaniesByNamespace();

			let invoices_to_email = [];
			

			if(cid){
				companies = companies.filter(x => x.company_id == cid);
			}

			for(let i = 0; i < companies.length; i++){
				try{
					var connection = await db.getConnectionByType('write', companies[i].company_id);
					let company_invoices = await models.Invoice.getUnPaidUnEmailedAutoInvoices(connection, {company_id: companies[i].hb_company_id, property_id, created_date_start, created_date_end, due_date_start, due_date_end});
					invoices_to_email.push({
						cid: companies[i].company_id,
						hb_company_id: companies[i].hb_company_id,
						company_name: companies[i].name,
						count: company_invoices.length,
						invoices_to_be_emailed: company_invoices
					})

				} catch(err){
					console.log("Error while fetching invoices for company => ",companies[i].name);
					console.log(err);
				} finally {
					await db.closeConnection(connection);
				}
			}


			res.send({
				status: 200,
				data: {invoices_to_email}
			});
		} catch (err) {
			next(err);
		}
	});

	router.post('/send-invoice-emails', async (req, res, next) => {
		try {
			const { body : {cid, created_date_start, created_date_end, due_date_start, due_date_end} }  = req;
			let companies = await db.getCompaniesByNamespace();
			

			if(cid){
				companies = companies.filter(x => x.company_id == cid);
			}

			await Scheduler.runSendEmailsForInvoices({ companies, created_date_start, created_date_end, due_date_start, due_date_end });

			res.send({
				status: 200,
				data: {}
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/adjust-reserve-balance', async (req, res, next) => {
		try {
			let { query : {cid, property_id, contact_id, active_lease, affected_lease} }  = req;

			active_lease = active_lease ? JSON.parse(active_lease) : false;
			affected_lease = affected_lease ? JSON.parse(affected_lease) : false;
			const mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			var connection = await db.getConnectionByType('read', mapping.company_id);
			let open_payments = await models.Payment.getOpenPayments(connection, { company_id, property_id, contact_id, active_lease, affected_lease, details: true });

			res.send({
				status: 200,
				data: open_payments
			});
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.post('/adjust-reserve-balance', async (req, res, next) => {
		try {
			const { body : {cid, property_id, contact_id} }  = req;

			let mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			await Scheduler.runBalanceAdjustmentRoutine(cid, { company_id, property_id, contact_id });
			res.end('ok');

		} catch (err) {
			next(err);
		}
	});

	router.post('/onboarding-companies', control.hasAccess(), async (req, res, next) => {

		try {
			let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('write', 1);

			await connection.beginTransactionAsync();

			let companies = await db.getAllCompanies();
			
			if (companies.length) {
				companies.sort((a, b) => (a.company_id < b.company_id) ? 1 : -1);
			} else {
				companies = [{
					company_id: 0
				}]
			}

			let companyId = companies[0].company_id + 1;

			let company = new OnboardingCompany(req.body);

			let company_id = await company.createOnboardingCompany(connection);

			let owner = await company.generateGDSOwnerId(Hashes.encode(companyId),company.name);
			await company.updateCompany(connection,{gds_owner_id:owner.id},company_id)
	
			let mappingData = {
				company_id: parseInt(companyId),
				hashed_company_id: Hashes.encode(companyId),
				gds_owner_id: owner.id,
				hb_company_id: parseInt(company_id),
				name: req.body.name,
				subdomain: req.body.subdomain,
				database: mapping.database,
				redshift: mapping.redshift,
				redshift_schema: mapping.redshift_schema,
				collection: mapping.collection
			}

			try {
				var mapping1 = await db.getMappingByCompanyId(mappingData.company_id);
			} catch (err) {

			}
			if (mapping1) {
				e.th(409, "A company with this ID already exists");
			}
			await db.saveCompany(mappingData);
			await connection.commitAsync();
			res.send({
				status: 200,
				data: {
					message: 'success'
				}
			})

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.put('/onboarding-companies', control.hasAccess(), async (req, res, next) => {

		try {
			//let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('write', 1);
			await connection.beginTransactionAsync();

			let onboardCompany = new OnboardingCompany(req.body);
			await onboardCompany.save(connection)
			await connection.commitAsync();
			res.send({
				status: 200,
				data: {
					message: 'success'
				}
			})
		} catch (err) {
			await connection.rollbackAsync();
			next(err);
			

		}
		await db.closeConnection(connection);
	});

	router.put('/onboarding-companies-status', control.hasAccess(), async (req, res, next) => {

		try {
			//let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('write', 1);
			await connection.beginTransactionAsync();

			let onboardCompany = new OnboardingCompany(req.body);//{subdomain:''} or status if needed or we can hardcode "active" status
			await onboardCompany.updateStatus(connection)
			await connection.commitAsync();
			res.send({
				status: 200,
				data: {
					message: 'success'
				}
			})
		} catch (err) {
			await connection.rollbackAsync();
			next(err);
			
		}
		await db.closeConnection(connection);
	});

	router.post('/onboarding-properties', control.hasAccess(), async (req, res, next) => {

		try {
			req.body = Hash.clarify(req.body);
			let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('write', 1);

			await connection.beginTransactionAsync();

			
			let property = new OnboardingProperty(req.body)
			
			await property.saveProperty(connection)
			
			let companies = await db.getAllCompanies();

			if (companies && companies.length) {
				var company = companies.find((company) =>  (company.hb_company_id == parseInt(req.body.company_id))&&(company.subdomain == req.body.company_subdomain));
			}
			if(!company) e.th(404,"No entry found of this company in DynamoDB")
			await connection.commitAsync();
			let GDSInfo = await OnboardingCompany.generateGDSFacilityId(connection,property.id,company.hashed_company_id,company.gds_owner_id)
			await property.updateProperty(connection,{gds_id:GDSInfo.id}, property.id)
			
			res.send({
				status: 200,
				data: {
					message: 'success'
				}
			})

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
		await db.closeConnection(connection);
	});


	router.put('/onboarding-properties', control.hasAccess(), async (req, res, next) => {

		try {
			req.body = Hash.clarify(req.body);
			let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('write', 1);

			await connection.beginTransactionAsync();
			await OnboardingProperty.formalValidate(connection,req.body.company_id,req.body.property_id)
		
			let property = new Property({id: req.body.property_id});

            await property.find(connection);
			let property_list = await Property.findByCompanyId(connection,req.body.company_id);
            let propertyID_list = property_list.map(p => p.id);
			await property.verifyAccess(parseInt(req.body.company_id),propertyID_list);
			await property.getPhones(connection);
            await property.getEmails(connection);

			if(req.body.Address){
                let address = new Address(req.body.Address);
                await address.findOrSave(connection);	
                req.body.address_id = address.id; 
            }

			property.update(req.body); 
    
		    await OnboardingProperty.verifyUniqueProperty(connection,property.company_id,property)
            await property.save(connection);

			let property_status_data = await OnboardingProperty.searchByPropertyID(connection,req.body.property_id)

			if(!(property_status_data && property_status_data.length)){
				e.th(404, 'No records found.');
			}
			let merge_status = req.body.merge_status; 
			let property_status = req.body.property_status;
			let data = {
				...(req.body.property_id && { property_id:req.body.property_id }),
				...(req.body.golive_date && { golive_date:req.body.golive_date }),
				...(req.body.due_date && { due_date:req.body.due_date }),
				...(property_status && { property_status ,
					 ...( property_status === 'active' &&
					  		{ 
								  launch_date : moment().utcOffset(property_status_data[0].utc_offset).format('YYYY-MM-DD') // browser's date
							} 
						) 
					 }
					),
				...(merge_status && { merge_status })
	
			}
			await OnboardingProperty.savePropertyStatus(connection,data,property_status_data[0].id)

			if(merge_status && merge_status=='trial' && property_status && property_status=='active') //reupload and re-merge
				await OnboardingProperty.reuploadRemerge(connection,req.body.company_id,property_status_data[0].id,req.body.company_subdomain,req.body.company_name,req.body.property_name)
				
			if(merge_status && merge_status=='final' && property_status && property_status=='launched') //launch property
				await OnboardingProperty.deleteMenuItems(connection,req.body.company_id,['mainmenu','property']);

			await connection.commitAsync();
			res.send({
				status: 200,
				data: {
					message: 'success'
				}
			})

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
			
		}
		await db.closeConnection(connection);
	});

	router.get('/onboarding-companies', control.hasAccess(), async (req, res, next) => {

		try {
			//let mapping = await db.getMappingByCompanyId(1);
			var connection = await db.getConnectionByType('read', 1);

			let OnboardingCompanyData = await OnboardingCompany.findAll(connection)

			OnboardingCompanyData = await Promise.all(OnboardingCompanyData.map(async (obj)=>{
				let properties = await OnboardingProperty.findAll(connection,obj.company_id)//properties:[{},{}]
				obj.company_id = Hashes.encode(obj.company_id)
				return {...obj,properties}

			})	)
			

			res.send({
				status: 200,
				data: {
					OnboardingCompanyData
				}
			})
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.post('/onboarding-email', control.hasAccess() ,async (req, res, next) => {
 
        try {
			let mapping = await db.getMappingByCompanyId(1);
            var connection = await db.getConnectionByType('write', 1);

			let body = req.body;
			let contact_email = body.contact_email;

			let company = new Company({id: Hashes.decode(body.company_id)});
			await company.find(connection);

			let property = new Property({id : Hashes.decode(body.property_id)})
			await property.find(connection);

			if (!body.subject.length) {
				e.th(400, "You have not entered a subject.");
			}

			// Email Types: 'owner_launch_cocoon', 'ri_instance_ready', 'ri_launch_cocoon',owner_begin_merge
			let contactArr = (body.email_type == 'owner_launch_cocoon' || body.email_type == 'owner_begin_merge') ? 
				await models.Contact.findAdminByEmail(connection,contact_email, Hashes.decode(body.company_id) ) :
				await models.Onboarding.getAllContacts(connection, contact_email);
			
			if(!((contactArr && contactArr.length) || (contactArr && contactArr.id))){
				e.th(400, "No records for this email");
			}
			
			let contact_id = (body.email_type == 'owner_launch_cocoon' || body.email_type == 'owner_begin_merge') ? contactArr.id : contactArr[0].contact_id;
			
			let contact = new OnboardingContact({ id: contact_id });
			await contact.find(connection);
			
		
			let template = contact.selectTemplate(body)

			let gds_owner_id = company.gds_owner_id;
			let property_id = property.gds_id;
			response = await contact.sendEmail(connection, body.subject, template, body.attachments, company, null , body.context, gds_owner_id, property_id, true);

			await (body.email_type == 'owner_launch_cocoon' || body.email_type == 'ri_launch_cocoon') ? contact.assignContactProperties(connection, Hashes.decode(body.company_id), Hashes.decode(body.property_id) ) : '';

            res.send({
                status: 200,
                data: {
                    message: 'success'
                }
            })
        } catch (err) {
            next(err);
        }
		await db.closeConnection(connection);
	});

	router.get('/technical-contacts', control.hasAccess(), async (req, res, next) => {
		try {
			var connection = await db.getConnectionByType('read', 1);
			let technicalContacts = new OnboardingContact();
			const List = await technicalContacts.getOnboardingContact(connection);
			res.send({
				status: 200,
				data: {List}
			})
		} catch (err) {
			next(err);
		}
		await db.closeConnection(connection);
	});

	router.post('/update-saved-reports', control.hasAccess(), async (req, res, next) => {
		try {

			let companies = await db.getCompaniesByNamespace();

			const { company_id }  = req.body;

			let result = [];

			if(company_id){
				if(Array.isArray(company_id)){
					companies = companies.filter(c => company_id.some(cid => c.company_id === cid));
				}else{
					companies = companies.filter(x => x.company_id === company_id);
				}
			}

			for(let i = 0; i < companies.length; i++){
				try{
					var connection = await db.getConnectionByType('write', companies[i].company_id);
					
					await connection.beginTransactionAsync();
					let updated_reports = await Report.updateSavedReportsOfCompany(connection,companies[i].hb_company_id,companies[i].company_id);
					await connection.commitAsync();

					result.push({company_id: companies[i].company_id, reports: updated_reports});
				} catch(err){
					console.log("saved reports error", err);
					await connection.rollbackAsync();
				}finally{
					await db.closeConnection(connection);
				}
			}

			res.send({
				status: 200,
				data: result
			})
		} catch (err) {
			next(err);
		}
	});

	router.post('/subscribe-message-bus', control.hasAccess(), async (req, res, next) => {
		try{
			var cid = req.body.company_id;
			var property_id = req.body.property_id;
			var mapping = await db.getMappingByCompanyId(cid);
			var company_id = mapping.hb_company_id;

			var connection = await db.getConnectionByType('read', mapping.company_id);
			let apiKeys = await models.Api.findKeys(connection, mapping.hb_company_id);

			if(!apiKeys.length) e.th(404, 'No API key found against company id');
			let key = apiKeys[0].apikey;

			let subscribe_url = `${settings.api_base_url}/companies/${Hashes.encode(mapping.company_id)}/properties/${Hashes.encode(property_id, mapping.company_id)}/subscribe-message-bus`;
            console.log("subscribe_url", subscribe_url);

			let data = await rp({
				headers: {
					"LeaseCaptain-API-Key": key
				},
				uri: subscribe_url,
				method: 'POST',
				json: true,
				body: {}
			});
			res.send({
				status: 200,
				data:{msg: "Subscribed Successfully!"} 
			});
		} catch(err){
			console.log("Error while subscribing!! ",err);
			next(err)
		}finally{
			await db.closeConnection(connection);
		}
		

	});

	router.post('/settle-payments', control.hasAccess(), async (req, res, next) => {
		try {
			const { body : {cid, property_id, lease_id} }  = req;

			let mapping = await db.getMappingByCompanyId(parseInt(cid));
			const company_id = mapping.hb_company_id;

			await Scheduler.runSettlePaymentsRoutine(cid, { company_id, property_id, lease_id });
			res.end('ok');

		} catch (err) {
			next(err);
		}
	});

	router.get('/settle-payments', control.hasAccess(), async (req, res, next) => {
		try {
			const { query : {cid, property_id, lease_id} }  = req;
			var connection = await db.getConnectionByType('read', parseInt(cid));
			let open_invoices = await Payment.findOldestOpenInvoicesWithPayments(connection, { property_id, lease_id }) || [];

			res.send({
				status: 200,
				data: open_invoices.map(x=> {
					return {
						lease_id: x.lease_id,
						due: x.due,
						invoice_id: x.invoices && x.invoices.length ? x.invoices[0].id: null
					}
				})
			});

		} catch (err) {
			next(err);
		}

		await db.closeConnection(connection);
	});

	//Trigger Schedule Report Job manually. (BCT Team)
	router.post('/schedule-report-trigger',control.hasAccess(), async (req, res, next) => {		
		const executeManually = true;
		const schedule_report_master_id = req.body.schedule_report_master_id;
		const company_id = req.body.company_id;

		console.log("->::POST /schedule-report-trigger endpoint called from worker-server::START");		
		let companies = await db.getAllCompanies();

		if(company_id){
			if(Array.isArray(company_id)){
				companies = companies.filter(c => company_id.some(cid => c.hb_company_id === cid));
			}else{
				companies = companies.filter(x => x.hb_company_id === company_id);
			}
		}
		
        for (let i = 0; i < companies.length; i++) {   			
			console.log(`->::Scheduler.runScheduleReport(${companies[i].company_id}, { company_id: ${companies[i].hb_company_id}, executeManually: ${executeManually}, schedule_report_master_id: ${schedule_report_master_id} })`);
			await Scheduler.runScheduleReport(companies[i].company_id, { company_id: companies[i].hb_company_id, executeManually, schedule_report_master_id });			
        }

		console.log("->::POST /schedule-report-trigger endpoint called from worker-server::END");
		res.json({
			success: true,
			data: "Job executed!!"
		})
	});

	router.post('/companies/:company_id/properties/:property_id/subscribe-simple-certified', control.hasAccess(), async (req, res, next) => {
		try{
			let companyId = parseInt(req.params.company_id);
			let propertyId = parseInt(req.params.property_id);
			var mapping = await db.getMappingByCompanyId(companyId);
			let admin = res.locals.admin;
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let apiKeys = await models.Api.findKeys(connection, mapping.hb_company_id);

			if(!apiKeys.length) e.th(404, 'No API key found against company id');
			let key = apiKeys[0].apikey;
			let subscribe_url = `${settings.api_base_url}/companies/${Hashes.encode(mapping.company_id)}/properties/${Hashes.encode(propertyId, mapping.company_id)}/mailhouse/simple-certified`;
            console.log("subscribe_url", subscribe_url);

			let body = {
				username: req.body.user_name,
				password: req.body.password,
				client_code: req.body.client_code,
				partner_key: req.body.partner_key,
				group_name: req.body.group_name
			}

			console.log("BODY", body)
			let data = await rp({
				headers: {
					"LeaseCaptain-API-Key": key
				},
				uri: subscribe_url,
				method: 'POST',
				json: true,
				body: body
			});

			console.log("REACHED")
			res.send({
				status: 200,
				data:{msg: "Subscribed Successfully!"} 
			});
		} catch(err){
			console.log("Error while subscribing!! ",err);
			next(err)
		}finally{
			await db.closeConnection(connection);
		}
		

	});

	router.post('/companies/:company_id/properties/subscribe-rpost', control.hasAccess(), async (req, res, next) => {
		try{
			let companyId = parseInt(req.params.company_id);
			var mapping = await db.getMappingByCompanyId(companyId);

			var connection = await db.getConnectionByType('read', mapping.company_id);
			let apiKeys = await models.Api.findKeys(connection, mapping.hb_company_id);

			if(!apiKeys.length) e.th(404, 'No API key found against company id');
			let key = apiKeys[0].apikey;
			let subscribe_url = `${settings.api_base_url}/companies/${Hashes.encode(mapping.company_id)}/properties/mailhouse/rpost`;
            console.log("subscribe_url", subscribe_url);

			//hash property ids
			let properties = []
			for (let propertyNumber = 0; propertyNumber < req.body.properties.length; propertyNumber++) {
				properties.push(req.body.properties[propertyNumber].id)
			}

			let body = {
				username: req.body.connection.user_name,
				password: req.body.connection.password,
				client_id: req.body.connection.client_id,
				properties: properties
			}

			console.log("BODY", body)
			console.log("properties", req.body.properties)
			let data = await rp({
				headers: {
					"LeaseCaptain-API-Key": key
				},
				uri: subscribe_url,
				method: 'POST',
				json: true,
				body: body
			});

			console.log("REACHED")
			res.send({
				status: 200,
				data:{msg: "Subscribed Successfully!"} 
			});
		} catch(err){
			console.log("Error while subscribing!! ",err);
			next(err)
		}finally{
			await db.closeConnection(connection);
		}
		

	});

	router.post('/extra-payment-settlement', async (req, res, next) => {
		try {
			const { body : {cid} }  = req;

			var connection = await db.getConnectionByType('write', cid);
			await connection.beginTransactionAsync();
			await updateInvoicePay(connection);
			await connection.commitAsync();

			res.send({
				status: 200,
				data: 'Done'
			});
		} catch (err) {
        await connection.rollbackAsync()
			next(err);
		} finally {
			await db.closeConnection(connection);
		}
	});

	router.get('/end-delinquency', async (req, res, next) => {
		try {
			let { query : { cid, property_id, lease_id } }  = req;
			cid = parseInt(cid);
			const mapping = await db.getMappingByCompanyId(cid);
			var connection = await db.getConnectionByType('read', mapping.company_id);

			const delinquencies = await Delinquency.getActiveDelinquenciesWithNoPastDueBalance(connection, {
				property_id: property_id,
				lease_id: lease_id
			});

			res.send({
				status: 200,
				data: delinquencies
			});
		} catch (err) {
			next(err);
		} finally {
			await db.closeConnection(connection);
		}
	});

	router.post('/end-delinquency', async (req, res, next) => {
		try {
			let { body : { cid, property_id, lease_id } }  = req;
			cid = parseInt(cid);
			let mapping = await db.getMappingByCompanyId(cid);
			const company_id = mapping.hb_company_id;

			await Scheduler.runEndDelinquencyRoutine(cid, { company_id, property_id, lease_id });

			res.send({
				status: 200,
				data: 'end delinquency started successfully'
			});
		} catch (err) {
			next(err);
		} 
	});

	router.post('/generate-merge-document', control.hasAccess(), async (req, res, next) => {

		var date = req.body.date || null;
		var cid = req.body.cid || null;
		var property_id = req.body.property_id || null;
		var document_type = req.body.document_type || null;

		let document_batch_id, filename;
		let connection = await db.getConnectionByType('read', parseInt(cid));

		try {
			if (![`rent_management`, `delinquency`].includes(document_type)) e.th(404, `Document type not found`);

			if (document_type == `rent_management`) {
				let property = new Property({id: property_id});
				await property.find(connection);

				let documentBatch = new DocumentBatch( {  property_id, document_type: `Rent Change` });
				await documentBatch.getDocumentBatchByTypeAndDate(connection, date);

				document_batch_id = documentBatch?.id || null;
				if (!document_batch_id) e.th(404, `Can't find document batch for the given date`);

				filename = `rent_change_documents_${ property.name.toLowerCase().replace(' ', '_') }_${ date }`;
			}

			let mapping = await db.getMappingByCompanyId(parseInt(cid));
			let company_id = mapping.hb_company_id;

			let socket_details = {
				contact_id: Hashes.decode(res.locals.admin?.id)[0],
				company_id: mapping.company_id
			}

			let data = { company_id, property_id, date, document_type, document_batch_id, filename, socket_details };

			await Scheduler.runMergeDocumentRoutine(cid, data);
			res.end('ok');
		} catch (error) {
			next(error)
		} finally {
			await db.closeConnection(connection);
		}

	});

	router.get('/generate-merge-document', control.hasAccess(), async (req, res, next) => {

		const { query : {cid, property_id, document_type, rate_id, date } }  = req;
		let connection = await db.getConnectionByType('read', parseInt(cid));

		try {
			generate_doc = req.query.generate_doc === 'true';
			let mapping = await db.getMappingByCompanyId(parseInt(cid));
			let company_id = mapping.hb_company_id;

			if (![`rent_management`, `delinquency`].includes(document_type)) e.th(404, `Document type not found`);

			let doc = new Documents();
			let uploads = await doc.generateMergeDocuments(connection,{company_id, property_id, document_type, rate_id, date, generate_doc, dry_run: true });

			res.send({
				status: 200,
				data: uploads
			});
		} catch (err) {
			next(err);
		} finally {
			await db.closeConnection(connection);
		}
	});
	  

	router.post('/auto-expire-leads', control.hasAccess(), async (req, res, next) => {
		let body = req.body || {};
		if (Object.keys(body).length === 0) {
			let err_response = {
				status: 400,
				msg: "There is no data in the request's body."
			}
			res.send(err_response);
		}
		let { date = null, property_id = null, company_id: cid = null } = body;
		let created_at = + new Date();
		let mapping = await db.getMappingByCompanyId(cid);
		let hb_company_id = mapping.hb_company_id;

		await Scheduler.runAutoExpireLeadsRoutine(cid, { date, property_id, company_id: hb_company_id, created_at });

		res.end('ok');
	});

	router.post('/created_at-modified_at-cols', async (req, res) => {
		try {
			let table_limit = req.query.table_limit || -1;
			let run_on_tables = req.query.run_on_tables || "";
			let userProvidedDbs = req.query.dbs || {};
			if (Object.keys(userProvidedDbs).length) {
				userProvidedDbs = JSON.parse(userProvidedDbs.trim());
			}
			if (run_on_tables){
				run_on_tables = run_on_tables.split(",");
			} else {
				run_on_tables = [];
			}

			let currentConnection = null;
			let connectionIterator = null;
			connectionIterator = await db.getConnectionIteratorWithContinue('write');
			console.log("connectionIterator Object -----> ", connectionIterator);

			let results = {};
			let errors = [];
			while(currentConnection = await connectionIterator.next()){
				const audit = new Auditing();
				
				if (audit.canRunScriptOnServer({connection: currentConnection, userProvidedDbs})) {
					console.log("currentConnection", currentConnection.config);
					if (!results[currentConnection.config.host]) {
						results[currentConnection.config.host] = {};
					}
					if (!results[currentConnection.config.host][currentConnection.config.database]) {
						results[currentConnection.config.host][currentConnection.config.database] = {};
					}
					
					const result = await audit.runCreatedAtAndModifiedAt({connection: currentConnection, table_limit, run_on_tables});

					console.log("Auditing Class Result -----> ", result);
					results[currentConnection.config.host][currentConnection.config.database] = result;
					
					await db.closeConnection(currentConnection);
				}
			}
			const payload = {
				status: 200,
				message: "ok",
				results,
				userProvidedDbs,
				run_on_tables
			};
			utils.sendLogs({
				event_name: ENUMS.LOGGING.AUDITING,
				logs: {
					payload
				},
			}); 
			res.send(payload);
		} catch (err) {
			utils.sendLogs({
				event_name: ENUMS.LOGGING.AUDITING,
				logs: {
					payload: {
						endpoint: "/created_at-modified_at-cols",
						query: req.query
					}
				},
				error: err?.stack?.toString() || err?.message?.toString() || err
			}); 
			res.send({
				status: 500,
				message: err.message || "There is error, please check logs",
				results: []
			});
			
		} finally {
		}
    });
	
    router.get('/missing-auditing-tables', async (req, res) => {
		try {
			let table_limit = req.query.table_limit || -1;
			let run_on_tables = req.query.run_on_tables || "";
			let userProvidedDbs = req.query.dbs || {};
			if (Object.keys(userProvidedDbs).length) {
				userProvidedDbs = JSON.parse(userProvidedDbs.trim());
			}
			if (run_on_tables){
				run_on_tables = run_on_tables.split(",");
			} else {
				run_on_tables = [];
			}
			let currentConnection = null;
			let connectionIterator = null;
			connectionIterator = await db.getConnectionIteratorWithContinue('read');
			console.log("connectionIterator Object -----> ", connectionIterator);

			let results = {};
			let errors = [];
			while(currentConnection = await connectionIterator.next()){
				const audit = new Auditing();
				
				if (audit.canRunScriptOnServer({connection: currentConnection, userProvidedDbs})) {
					console.log("currentConnection", currentConnection.config);
					if (!results[currentConnection.config.host]) {
						results[currentConnection.config.host] = {};
					}
					if (!results[currentConnection.config.host][currentConnection.config.database]) {
						results[currentConnection.config.host][currentConnection.config.database] = {};
					}
					
					const result = await audit.runMissingAuditingScript({connection: currentConnection, table_limit, run_on_tables});

					console.log("Auditing Class Result -----> ", result);
					results[currentConnection.config.host][currentConnection.config.database] = result;
					// await db.closeConnection(currentConnection);
				}
			}
			const payload = {
				status: 200,
				message: "ok",
				results,
				userProvidedDbs,
				run_on_tables
			};
			utils.sendLogs({
				event_name: ENUMS.LOGGING.AUDITING,
				logs: {
					payload
				},
			}); 
			res.send(payload);
		} catch (err) {
			utils.sendLogs({
				event_name: ENUMS.LOGGING.AUDITING,
				logs: {
					payload: {
						endpoint: "/missing-auditing-tables",
						query: req.query
					}
				},
				error: err?.stack?.toString() || err?.message?.toString() || err
			}); 
			res.send({
				status: 500,
				message: err.message || "There is error, please check logs",
				results: []
			});
			
		} finally {
		}
  	});
  
  	router.post('/invoice-consolidation', async (req, res, next) => {
		try {

			let company_id;
			if(settings.is_uat && req.body.company_id == 1){
				company_id = 1;
			}
			else if(settings.is_prod && req.body.company_id == 15)
			{
				company_id = 15
			}
			else if(settings.is_staging && req.body.company_id == 1)
			{
				company_id = 1
			}else{
				res.send({
					status: 404,
					msg: 'Comapny not found'
				})
			};

			let result = await rp({
				headers: {
					"Content-Type": 'application/json'
				},
				uri: settings.getInvoiceConsolidationUrl(),
				method: 'POST',
				body:{
					companyID: company_id,
					month: parseInt(req.body.month), 
					year: parseInt(req.body.year), 
					sendEmail: req.body.sendEmail,
					downloadFile: req.body.downloadFile,
					isAuto: req.body.isAuto
				},
				json: true
			});

			if(result){
				res.send({
					status: 200,
					data: result
				});
			}else{
				res.send({
					status: 404,
					msg: 'No result found'
				})
			}
			
		} catch (match) {
				const errorMessageRegex = /{"error":"(.*?)"/;
				match = JSON.stringify(match).match(errorMessageRegex);
			if (match && match[1]) {
				next({message:match[1]});
			} else {
				next(match);
			}
		}
	});

	router.post('/invoice-consolidation-cron-test', async (req, res, next) => {
		await Scheduler.runConsolidationInvoiceEmail({created_at: req.body.created_at});
		res.end('ok');
	});


	router.post('/execute-scripts', async (req, res, next) => {
		let { body = {}, files } = req;
		let db_configs = typeof body.db_configs === 'string' ? JSON.parse(body.db_configs) : (body.db_configs || []);
		let script_file = null, queries = [];

		try {
			if (db_configs?.length === 0)
				e.th(404, 'DB Config not Found');
			if (!files?.file)
				e.th(404, "Script file is not found");
			if (files?.file?.extension !== 'sql')
				e.th(415, "Unsupported Media Type. Only '.sql' files are supported.");

			console.log("DB config", db_configs);
			console.log("Files", files);

			script_file = files.file;
			queries = await fh.readDataFormSqlFile(script_file.path);

			console.log("Queries LENGTH", queries.length);

			await fh.deleteFile(script_file.path);
	
			if (queries?.length === 0) {
				e.th(404, 'There are no Scripts to Execute');
			}

			await Scheduler.runExecuteScriptsRoutine(db_configs, queries, script_file.originalname);

			res.send({
				status: 200,
				data: "Execution has started."
			});

		} catch (err) {
			next(err);
		}

	});

	return router;

};


async function updateInvoicePay(connection) {
	// run script
	let sql = `
		select ip.payment_id, max(ip.date) as max_date, sum(amount) as ip_amount,
		(select sum(r.amount) from refunds r where r.payment_id = ip.payment_id) as refund_amount, 
		(select sum(p.amount) - ifnull(r.amount, 0) from payments p left join refunds r on r.payment_id = p.id where ip.payment_id = p.id) as payment_amount_available,
			sum(case when l.end_date is null then 1 else 0 end) as chuss
	from invoices_payments ip 
		join invoices i on i.id = ip.invoice_id 
		join leases l on i.lease_id = l.id
		join properties p on p.id = i.property_id and p.id != 404 and p.company_id not in (72, 13, 28)
	where
		1 = 1
	group by ip.payment_id
	having ip_amount > payment_amount_available and max_date >= '2021-01-01' and chuss > 0;
	`;

	const invoicePaymentBreakdowns = await connection.queryAsync(sql);


	console.log('fetchExtraPayments', invoicePaymentBreakdowns);

	for(let i = 0; i < invoicePaymentBreakdowns.length; i++) {
		await updateIndividualInvPay(connection, {
			payment_id: invoicePaymentBreakdowns[i].payment_id, 
			original_payment: invoicePaymentBreakdowns[i].payment_amount_available, 
			applied_payment: invoicePaymentBreakdowns[i].ip_amount
		});
	}
}

async function updateIndividualInvPay(connection, params) {
	console.log('Updating Extra payments Individually');

	const { payment_id, original_payment, applied_payment } = params;
	
	// extra_payment = 50 - 35 = 15
	let extraPayment = ((applied_payment * 1e2) - (original_payment * 1e2)) / 1e2;

	;

	let sql = `select * from invoices_payments_breakdown ipb where ipb.payment_id = ${payment_id} order by ipb.date desc, ipb.id desc`;
	const invoicePaymentBreakdowns = await connection.queryAsync(sql);
		
		for(let i = 0; i < invoicePaymentBreakdowns.length; i++) {
			if(invoicePaymentBreakdowns[i].refund_id) {
				continue;
			}
			
			if(invoicePaymentBreakdowns[i].refund_id == null && invoicePaymentBreakdowns[i].amount < 0) {
				await deleteVoidCase(connection, {
					payment_id: invoicePaymentBreakdowns[i].payment_id,
					invoice_id: invoicePaymentBreakdowns[i].invoice_id
				});

				continue;
			}

			// const amountRemaining = invoicePaymentBreakdowns[i].amount - extraPayment;
			sql = `select sum(amount) as sum_amount from invoices_payments_breakdown ipb where ipb.payment_id = ${invoicePaymentBreakdowns[i].payment_id} 
				and invoice_id = ${invoicePaymentBreakdowns[i].invoice_id}`;
			const appliedAmountOnInvoice = await connection.queryAsync(sql).then(arr => arr[0].sum_amount);

			if(appliedAmountOnInvoice <= 0) {
				continue;
			}

			const shouldUnApplyFull = extraPayment - appliedAmountOnInvoice >= 0 && appliedAmountOnInvoice === invoicePaymentBreakdowns[i].amount;	
			;

			if(shouldUnApplyFull) {
				await unapplyAll(connection, {
					invoice_payment_breakdown_id: invoicePaymentBreakdowns[i].id,
					invoice_payment_id: invoicePaymentBreakdowns[i].invoice_payment_id,
					unapplied_amount: invoicePaymentBreakdowns[i].amount,
					invoice_id: invoicePaymentBreakdowns[i].invoice_id
				});	

				extraPayment = extraPayment - invoicePaymentBreakdowns[i].amount;
			} else {
				console.log('invoicePaymentBreakdowns amount ', invoicePaymentBreakdowns[i].amount);
				console.log('appliedAmountOnInvoice:  ', appliedAmountOnInvoice);
				;

				const partialAmount = Math.min(invoicePaymentBreakdowns[i].amount, appliedAmountOnInvoice, extraPayment);
				await partialUnapply(connection, {
					invoice_payment_breakdown_id: invoicePaymentBreakdowns[i].id,
					invoice_payment_id: invoicePaymentBreakdowns[i].invoice_payment_id,
					unapplied_amount: partialAmount, // invoicePaymentBreakdowns[i].amount,
					invoice_id: invoicePaymentBreakdowns[i].invoice_id
				});

				extraPayment = extraPayment - partialAmount;
			}

			if(extraPayment <= 0) {
				break;
			}
		}

}

async function deleteVoidCase(connection, payload) {
	const { payment_id, invoice_id } = payload;

	console.log('delete void case', payload)

	sql = `delete from invoice_lines_allocation ila where ila.id > 0 and ila.invoice_id = (${invoice_id});`;	
	await connection.queryAsync(sql);

	sql  = `delete from invoices_payments_breakdown ipb where ipb.id >0 and ipb.invoice_id = (${invoice_id}) and ipb.payment_id = ${payment_id}`;
	await connection.queryAsync(sql);

	sql = `UPDATE invoices_payments ip SET ip.amount = 0 where ip.id > 0 and ip.invoice_id = ${invoice_id} and ip.payment_id = ${payment_id}`;
	await connection.queryAsync(sql);
		
	sql = `update invoices i set i.total_payments = 0 where i.id = ${invoice_id}`;
	await connection.queryAsync(sql);
}

async function unapplyAll(connection, payload) {
	const { invoice_payment_breakdown_id, invoice_payment_id, unapplied_amount, invoice_id } = payload;

	console.log('unapplyAll', payload);

	sql = `delete from invoice_lines_allocation ila where ila.id > 0 and ila.invoice_payment_breakdown_id = (${invoice_payment_breakdown_id});`;	
	await connection.queryAsync(sql);

	sql  = `delete from invoices_payments_breakdown ipb where ipb.id = (${invoice_payment_breakdown_id})`;
	await connection.queryAsync(sql);

	sql = `UPDATE invoices_payments ip SET ip.amount = 0 where ip.id = ${invoice_payment_id}`;
	await connection.queryAsync(sql);
		
	sql = `update invoices i set i.total_payments = i.total_payments - ${unapplied_amount} where i.id = ${invoice_id}`;
	await connection.queryAsync(sql);
}

async function partialUnapply(connection, payload) {
	const { invoice_payment_breakdown_id, invoice_payment_id, unapplied_amount, invoice_id } = payload;

	console.log('partialUnapply',  payload);

	sql = `delete from invoice_lines_allocation ila where ila.id > 0 and ila.invoice_payment_breakdown_id = (${invoice_payment_breakdown_id});`;	
	await connection.queryAsync(sql);

	sql  = `Update invoices_payments_breakdown ipb set ipb.amount = ipb.amount - ${unapplied_amount} 
		where ipb.id = (${invoice_payment_breakdown_id})`;
	await connection.queryAsync(sql);

	sql = `UPDATE invoices_payments ip SET ip.amount = ip.amount - ${unapplied_amount} 
		where ip.id = ${invoice_payment_id}`;
	await connection.queryAsync(sql);
		
	sql = `update invoices i set i.total_payments = i.total_payments - ${unapplied_amount} where i.id = ${invoice_id}`;
	await connection.queryAsync(sql);
}




var Contact =  require(__dirname + '/../classes/contact.js');
var Address = require(__dirname + '/../classes/address.js');
var OnboardingCompany = require(__dirname + '/../classes/onboarding/onboarding_company.js');
var OnboardingProperty = require(__dirname + '/../classes/onboarding/onboarding_property.js');
var OnboardingContact = require(__dirname + '/../classes/onboarding/onboarding_contact.js');
var Report = require(__dirname + '/../classes/report.js')
var Invoice = require(__dirname + '/../classes/invoice.js');
var Accounting =  require(__dirname + '/../classes/accounting.js');
var { subscribeGDSEvent } = require('./../modules/messagebus_subscriptions');
const Delinquency = require('../classes/delinquency');
const Documents = require('../classes/document');
const admin = require('../models/admin');
var settings = require('../config/settings');
const fh = require('../modules/execute-scripts/file_handler');
const s3_handler = require('../modules/execute-scripts/s3');
