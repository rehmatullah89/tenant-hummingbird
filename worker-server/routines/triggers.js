"use strict";

var moment = require('moment');
var jade = require('jade');
var fs = require('fs');

var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models = require(__dirname + '/../models');
var Todo = require(__dirname + '/../classes/todo.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Service = require(__dirname + '/../classes/service.js');
var Trigger = require(__dirname + '/../classes/trigger.js');
var Document = require(__dirname + '/../classes/document.js');
var TriggerGroup = require(__dirname + '/../classes/trigger_group.js');
var DocumentBatch = require(__dirname + '/../classes/document_batch.js');

var Company = require(__dirname + '/../classes/company.js');
var Property = require(__dirname + '/../classes/property.js');
var Upload = {};
var mask = require('json-mask');
setTimeout(() => Upload = require(__dirname + '/../classes/upload.js'), 10); // Hack for circular dependency https://stackoverflow.com/questions/10869276/how-to-deal-with-cyclic-dependencies-in-node-js/65315780#65315780

var e = require(__dirname + '/../modules/error_handler.js');
var db = require(__dirname + '/../modules/db_handler.js');
var utils = null;
process.nextTick(() => utils = require("../modules/utils"));


var { getGDSPropertyMappingId } = require('../modules/messagebus_subscriptions');

var validator = require('validator');

var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');

var request = require('request');
var rp = require('request-promise');
const Delinquency = require(__dirname + '/../classes/delinquency.js');
var twilioClient = require('twilio')(settings.twilio.accountSid, settings.twilio.authToken);
const ENUMS = require('../modules/enums');


const bullmq = require('bullmq');
const IORedis = require('ioredis');

const redis_connection = new IORedis({ host: process.env.REDIS_HOST });
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });



function logError(data, err, fn, err_type = 'error'){

	let logs = {
		request: {
		  name: fn,
		  data: data
		},
		response: {
		  error: err.message || err.toString() || err,
		  stack: err.stack || ''
		}
	  } 

	console.log("logs",JSON.stringify(logs, null, 2));
	utils.sendLogsToGDS('HB_WORKER_SERVER', logs, null, err_type || 'error', data.tracking?.request_id, data.tracking?.trace_id,  {event_name: data.tracking?.event_name || ENUMS.LOGGING.DELINQUENCY_PROCESS });
}


var Triggers = {

	async runTriggerRoutine(data) {
		// var data = job.data;
		// This should be different  

		try {
			var connection = await db.getConnectionByType('write', data.cid);

			await this.addNewDelinquencyProcesses(connection, data);
			await this.addNewDelinquencyActions(connection, data);
			await this.process(connection, data);

		} catch (err) {
			logError(data, err, 'runTriggerRoutine');
		}

		await db.closeConnection(connection);
		return data;
	},

	async addNewDelinquencyProcesses(connection, data) {
		try {
			await Delinquency.createDelinquencies(connection, data.property.id, data.date, data.lease_id, data.action_source);
		} catch (err) {
			logError(data, err, 'AddNewDelinquencyProcesses');
		}
	},

	async addNewDelinquencyActions(connection, data) {
		try {
			
			let triggers = await Trigger.findByPropertyId(connection, data.property.id);
			for (let i = 0; i < triggers.length; i++) {
				await Delinquency.addTimelineActionsForTrigger(connection, triggers[i].id, data.property.id, data.date, data.lease_id, data.run_actions, data.action_source)
			}
		} catch (err) {
			logError(data, err, 'AddNewDelinquencyActions');			
		}
	},

	async process(connection, data) {
		try {
			var connection = await db.getConnectionByType('write', data.cid);
			// let date = data.date;
			let company = new Company({ id: data.property.company_id });
			let property = new Property({ id: data.property.id });
			let date = data.date;
			
			await property.find(connection);

			var global_errors = [];

			if (!property.gds_id) {
				try {
					property.gds_id = await getGDSPropertyMappingId(connection, property.id);
				} catch (err) {
					logError(data, err, 'getGDSPropertyMappingId');	
					console.log("Could Not Find GDS ID", err);
				}
			}

			await company.find(connection);

			var compiled_documents = [];
			// if there is a delinquecy ID, just run for that process
			if (data.lease_id) {

				let delinquency = new Delinquency({ lease_id: data.lease_id });

				await delinquency.find(connection);
				await delinquency.findActions(connection, date);

				date = date || await property.getLocalCurrentDate(connection);
				let actions = delinquency.Actions.filter(a => !a.completed && moment(a.execution_date).format('x') <= moment(date).format('x'));
				let lease = new Lease({ id: data.lease_id });
				await lease.find(connection);
				await lease.findUnit(connection);
				await lease.getTenants(connection);
				if (!actions || !actions.length) return;
				let document = await Triggers.handleActions(connection, date, actions, delinquency, lease, data, property, company, data.tracking);
				compiled_documents = compiled_documents.push(document)
			} else if (date) {
				// else run for all at the property
				
				// get all actions to process at property on date
				let leases = await Delinquency.findLeasesWithDelinquencyActionsOnDate(connection, property.id, date)

				for (let i = 0; i < leases.length; i++) {

					let lease = new Lease({ id: leases[i].lease_id });
					await lease.find(connection);
					await lease.findUnit(connection);
					await lease.getTenants(connection);
					await lease.getDelinquency(connection, date);

					if (!lease.Delinquency.Actions || !lease.Delinquency.Actions.length) continue;
					let documents = await Triggers.handleActions(connection, date, lease.Delinquency.Actions, lease.Delinquency, lease, data, property, company, data.tracking);

					compiled_documents = compiled_documents.concat(documents)
				}
			} else if (data.type === "migration" && data.run_actions) {
				let leases = await Delinquency.findLeasesWithOpenDelinquencyActions(connection, property.id)

				for (let i = 0; i < leases.length; i++) {
					let lease = new Lease({ id: leases[i].lease_id });
					await lease.find(connection);
					await lease.findUnit(connection);
					await lease.getTenants(connection);
					await lease.getDelinquency(connection, date);
					if (!lease.Delinquency.Actions || !lease.Delinquency.Actions.length) continue;
					let documents = await Triggers.handleActions(connection, date, lease.Delinquency.Actions, lease.Delinquency, lease, data, property, company, data.tracking)

					compiled_documents = compiled_documents.concat(documents)
				}
			}

			// handle compiled documents
			// Compiled documents is empty if its a dry run 

			if (compiled_documents.length) {

				// separate each by Document Type
				let documents_by_id = {};
				for (let i = 0; i < compiled_documents.length; i++) {
					let d = compiled_documents[i];
					d.delivery_methods_id = d.delivery_methods_id || 'none';
					documents_by_id[d.document_id] = documents_by_id[d.document_id] || {};
					documents_by_id[d.document_id][d.delivery_methods_id] = documents_by_id[d.document_id][d.delivery_methods_id] || {
						uploads: [],
						interactions: []
					}
					if (d.interaction_id) {
						documents_by_id[d.document_id][d.delivery_methods_id].interactions.push(d.interaction_id);
					}
					documents_by_id[d.document_id][d.delivery_methods_id].uploads.push(d.upload_id);
				}

				for (let document_id in documents_by_id) {
					// save batch
					let batch = new DocumentBatch({
						property_id: property.id,
						document_manager_template_id: document_id,
						delivered_by: null,
						upload_id: null,
						document_type: 'Delinquency'
					});
					await batch.save(connection);

					for (let delivery_methods_id in documents_by_id[document_id]) {
						// save delivery
						if (delivery_methods_id !== 'none') {
							let delivery_id = await batch.saveDelivery(connection, delivery_methods_id);
							await Interaction.saveBulkDeliveryBatches(connection, delivery_id, documents_by_id[document_id][delivery_methods_id].interactions);
						}
						await Upload.saveBulkDdocumentBatches(connection, batch.id, documents_by_id[document_id][delivery_methods_id].uploads)
					}

					// Generate documents
					// write job to assemble PDf document
					await Queue.add('merge_document_routine', {
						filename: "delinquency_documents_" + property.name.toLowerCase().replace(' ', '_') + "_" + moment().format('YYYY_MM_DD'),
						document_batch_id: batch.id,
						cid: data.cid,
						company_id: company.id,
						property_id: property.id,
						tracking: {
							trace_id: data.tracking?.trace_id,
							event_name: data.tracking?.event_name
						},
					});
				}	
			}
		} catch (err) {
			logError(data, err, 'Process');
		} finally {
			await db.closeConnection(connection)
		}
	},

	async handleActions(connection, date, actions = [], delinquency, lease, data, property, company, tracking) {
		
		//let api_uri = 'http://' + process.env.API_SUBDOMAIN + '.' + process.env.DOMAIN + '/';
		let compiled_documents = [];

		for (let i = 0; i < actions.length; i++) {
			let a = actions[i];
			console.log("action", a);
			if (a.completed) continue;
			let log = this.setUpLogs(a, lease, delinquency, data, company, tracking);
			
			try {
				switch (a.action) {
					case "deny_payments":
						await this.denyPayments(connection, lease, delinquency, a, data.dryrun);
						break;
					case "cancel_insurance":
						await this.cancelInsurance(connection, lease, delinquency, a, date, data.dryrun);
						break;
					case "schedule_auction":
						await this.scheduleAuction(connection, lease, delinquency, a, company, date, data.dryrun);
						break;
					case "lease_standing":
						await this.updateLeaseStanding(connection, lease, delinquency, a, date, data.dryrun);
						break;
					case "task":
						if (data.type === "migration") continue;
						await this.createTask(connection, lease, delinquency, a, company, date, data.dryrun)
						break;
					case "fee":
						if (data.type === "migration") continue;
						await this.addFee(connection, lease, delinquency, a, company, property, date, data.dryrun)
						// ok
						break;
					case "document":
						if (data.type === "migration") continue;
						let documents = await this.generateDocument(connection, lease, delinquency, a, company, property, date, data.dryrun, data.cid, log);
						compiled_documents = compiled_documents.concat(documents)
						// merge tokens
						break;
					case "message":
						if (data.type === "migration") continue;
						await this.sendMessage(connection, lease, delinquency, a, company, property, date, data.dryrun, data.cid, log)
						// merge tokens
						break;
					case "deny_access":
						await this.denyAccess(connection, lease, delinquency, a, company, date, property, data.dryrun);
						// Lock out of front gate if noke
						break;
					// case "overlock":
					// 	await this.overlock(connection, lease, delinquency, a, company, date, property, data.dryrun);
					// 	// Lock out of door if noke
					// 	break;
				}
			} catch(err) {
				
				logError(log, err, log.action.action, err.type);
				
			}
		}

		//ensure the overlock update is being sent after
		for (let i = 0; i < actions.length; i++) {
			let a = actions[i];
			if (a.completed) continue;
			let log = this.setUpLogs(a, lease, delinquency, data, company, tracking);

			try {
				if(a.action === "overlock"){
					console.log("action", a);
					await this.removePreviousOverlockTask(connection, lease);
					await this.overlock(connection, lease, delinquency, a, company, date, property, data.dryrun);
				}
			} catch(err) {
				logError(log, err, log.action.action, err.type);
			}
		}

		return compiled_documents;
	},

	async removePreviousOverlockTask(connection, lease){
		await lease.Unit.getProperty(connection);
		await lease.Unit.Property.getAccessControl(connection);	
		let existing_overlock = await lease.Unit.getActiveOverlock(connection);
		console.log(`checking existing overlock for lease: ${lease.id}`, existing_overlock);
		if(existing_overlock){
			await lease.Unit.removeOverlock(connection);
			await Todo.dismissTasks(connection, lease.id, ENUMS.EVENT_TYPES_COLLECTION.LOCK_REMOVAL, ENUMS.TASK_TYPE.LEASE);
			console.log(`overlock removed and lock remoal task completed for lease: ${lease.id}`);
		}    
	},

	// this function was created when we have to run a specific case which is: when a person was delinquent for a month of july, and he paid late. So, status of his door become "remove overlock" and task was there for lock removal then next month he again got delinquent So, "lock removal" task and status will be deleted and "to overlock" task and status will be shown there. So in this function we are handling only first part.
	async removePreviousOverlockTask(connection, lease){
		await lease.Unit.getProperty(connection);
		await lease.Unit.Property.getAccessControl(connection);	
		let existing_overlock = await lease.Unit.getActiveOverlock(connection);
		console.log(`checking existing overlock for lease: ${lease.id}`, existing_overlock);
		if(existing_overlock){
			console.log(`removePreviousOverlockTask lease: ${lease.id}`, existing_overlock);
			await lease.Unit.removeOverlock(connection);
			await Todo.dismissTasks(connection, lease.id, ENUMS.EVENT_TYPES_COLLECTION.LOCK_REMOVAL, ENUMS.TASK_TYPE.LEASE);
		}    
	},

	async denyPayments(connection, lease, delinquency, action, dryrun) {
		let result = await delinquency.denyPayments(connection, lease, action, dryrun);
	},

	async cancelInsurance(connection, lease, delinquency, action, date, dryrun) {
		date = date || moment().format('YYYY-MM-DD');
		let result = await delinquency.cancelInsurance(connection, lease, action, date, dryrun);
	},
	async scheduleAuction(connection, lease, delinquency, action, company, date, dryrun) {
		date = date || moment().format('YYYY-MM-DD');
		let result =  await delinquency.scheduleAuction(connection, lease, action, company, date, dryrun);
	},
	async updateLeaseStanding(connection, lease, delinquency, action, date, dryrun) {
		let result =  await delinquency.updateLeaseStanding(connection, lease, action, date, dryrun);
	},

	async createTask(connection, lease, delinquency, action, company, date, dryrun) {
		let result = await delinquency.createTask(connection, lease, action, company, date, dryrun);
	},

	async addFee(connection, lease, delinquency, action, company, property, date, dryrun) {	
		let result = await delinquency.applyLateFees(connection, lease, action, company, property, date, dryrun);
	},

	async generateDocument(connection, lease, delinquency, action, company, property, date, dryrun, cid, log) {

		let documents = []
		let errors = []
		try {

			// create document
			if (!action.DeliveryMethods.length) {
				try {
					let document = await delinquency.generateDocument(connection, lease, 'primary', action, company, dryrun, cid);
					documents.push({
						upload_id: document.upload_id,
						document_id: document.document_id,
						delivery_methods_id: null,
						interaction_id: null,
					});
				} catch (err) {
					
					// await models.Delinquency.saveDeliveryMethod(connection, {
					// 	completed: moment().format('YYYY-MM-DD HH:mm:ss'),
					// 	error: err.msg,
					// }, action.DeliveryMethods[i].id)

					logError(log, err, log.action.action, 'error');
				}
			}

			// send via delivery method
			// todo do we send separate delivery methods for email?
			for (let i = 0; i < action.DeliveryMethods.length; i++) {


				



				switch (action.DeliveryMethods[i].gds_key) {

					case 'certified_mail':
					case 'first_class':
					case 'certificate_of_mailing':
					case 'certified_mail_with_err':

						try {
							let document = await delinquency.generateDocument(connection, lease, action.DeliveryMethods[i].recipient_type, action, company, dryrun, cid);
							let result = await delinquency.sendMail(connection, lease, action, document, company, property, action.DeliveryMethods[i], dryrun);
							// console.log("action.DeliveryMethods[i]", action.DeliveryMethods[i])
							documents.push({
								upload_id: document.upload_id,
								document_id: document.document_id,
								delivery_methods_id: action.DeliveryMethods[i].delivery_methods_id,
								interaction_id: result.interaction_id,
							});
						} catch (err) {
							// handle error and save to action. 
							
							await models.Delinquency.saveDeliveryMethod(connection, {
								completed: moment().format('YYYY-MM-DD HH:mm:ss'),
								error: err.msg,
							}, action.DeliveryMethods[i].id)
							logError(log, err, log.action.action, 'error');
						}

						break;
					case 'registered_email':
					case 'certified_email':
					case 'standard_email':
						try {
							let document = await delinquency.generateDocument(connection, lease, null, action, company, dryrun, cid);
							
							let cc = {
								include_alternate: action.Document.include_alternate,
								include_lien: action.Document.include_lien
							}

							let result = await delinquency.sendEmail(connection, lease, cc, [document], company, property, action.DeliveryMethods[i], dryrun);
							documents.push({
								upload_id: document.upload_id,
								document_id: document.document_id,
								delivery_methods_id: action.DeliveryMethods[i].delivery_methods_id,
								interaction_id: result.interaction_id,
							});

						} catch (err) {
							// handle error and save to action. 
							await models.Delinquency.saveDeliveryMethod(connection, {
								completed: moment().format('YYYY-MM-DD HH:mm:ss'),
								error: err.msg,
							}, action.DeliveryMethods[i].id)
							logError(log, err, log.action.action, 'error');

						}
						break;

					// case 'standard_sms':
					// 	try {
					// 		let document = await delinquency.generateDocument(connection, lease, null, action,  company, dryrun, cid);
					// 		let result = await delinquency.sendSMS(connection, lease, action,  document, company, property, action.DeliveryMethods[i], dryrun);

					// 		documents.push({
					// 			document,
					// 			interaction_id: result.interaction_id,
					// 		});
					// 	} catch(err){
					// 		// handle error and save to action. 
					// 		console.log("err", err); 
					// 	}
					// 	break;
					default: 
						throw "Invalid GDS Key"
				}
			}
			
		} catch (err) {
			console.log("I caught an error: ", err);
			logError(log, err, log.action.action, 'error');
		}
		return documents;
	},
 
	async sendMessage(connection, lease, delinquency, action, company, property, date, dryrun, cid, log) {
		// create document
		// send via delivery method

		for (let i = 0; i < action.DeliveryMethods.length; i++) {

			console.log("action", action)
			switch (action.DeliveryMethods[i].gds_key) {

				case 'registered_email':
				case 'certified_email':
				case 'standard_email':

					try {
						let cc = {
							include_alternate: action.Message.include_alternate,
							include_lien: action.Message.include_lien
						}

						let email = await delinquency.sendEmail(connection, lease, cc, [], company, property, action.DeliveryMethods[i], dryrun);
					} catch (err) {
						// handle error and save to action. 
						await models.Delinquency.saveDeliveryMethod(connection, {
							completed: moment().format('YYYY-MM-DD HH:mm:ss'),
							error: err.msg,
						}, action.DeliveryMethods[i].id)
						logError(log, err, log.action.action, 'error');
						
					}

					break;
				// case 'mail':
				// 	break;
				case 'standard_sms':
					try {
						let sms = await delinquency.sendSMS(connection, lease, action, [], company, property, action.DeliveryMethods[i], dryrun);
					} catch (err) {
						// handle error and save to action. 
						await models.Delinquency.saveDeliveryMethod(connection, {
							completed: moment().format('YYYY-MM-DD HH:mm:ss'),
							error: err.msg,
						}, action.DeliveryMethods[i].id)
						logError(log, err, log.action.action, 'error');
						
					}
					break;
			}
		}

		await models.Delinquency.saveAction(connection, {
			completed: moment().format('YYYY-MM-DD HH:mm:ss')
		}, action.id);

	},

	async denyAccess(connection, lease, delinquency, action, company, date, property, dryrun) {
		let result = await delinquency.updateGateAccess(connection, lease, action, company, date, property, dryrun);
	},

	async overlock(connection, lease, delinquency, action, company, date, property, dryrun, log) {
		let result = await delinquency.overlockUnit(connection, lease, action, company, date, property, dryrun);
	},


	sendErrorEmail(err, trigger, lease) {

		let content = "Trigger ID: " + trigger.id + "<br />";
		if (lease) {
			content += "Lease ID: " + lease.id + "<br />";
		}
		content += err.toString() + '<br /><br />' + err.stack;

		var email = {
			email: 'jeff@h6design.com',
			to: 'Jeff Ryan',
			subject: "Error occurred in processing trigger",
			from: 'LeaseCaptain Reports',
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'headline',
						content: 'Error '
					},
					{
						name: 'content',
						content: content
					}]
			}
		};

		return Mail.sendBasicEmail(null, email).then(function () {
			return {
				status: false,
				msg: err
			};

		})

	},
	configureSMS: function (phone, twilioPhone, message, media_url, company) {
		return new Promise(function (resolve, reject) {
			if (!company.Settings.twilioPhone) return reject();
			if (typeof phone == 'undefined') return reject();

			twilioClient.sendMessage({
				to: settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
				from: twilioPhone, // A number you bought from Twilio and can use for outbound communication
				body: message,
				mediaUrl: media_url
			}, function (err, responseData) { //this function is executed when a response is received from Twilio
				console.log(err);
				if (err) return reject();

				if (!err) { // "err" is an error received during the request, if any
					// "responseData" is a JavaScript object containing data received from Twilio.
					// A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
					// http://www.twilio.com/docs/api/rest/sending-sms#example-1
					console.log(responseData.from); // outputs "+14506667788"
					console.log(responseData.body); // outputs "word to your mother."
					return resolve();
				}
			});
		});
	},


	chargeLateFees: function (data, pool) {

		var connection = {};
		var company_id = data.company.id;

		var company = {};
		var lateFee = {};

		return pool.getConnectionAsync().then(function (conn) {
			connection = conn;
			return models.Company.findById(connection, company_id);
		}).then(function (companyRes) {
			company = companyRes;

			return models.Product.findDefaultProduct(connection, company_id, "late");

		}).then(function (lateFeeRes) {
			if (!lateFeeRes) throw "No late fee product.";
			lateFee = lateFeeRes;
			return models.Invoice.findOverdueForLateFee(connection, company_id).mapSeries(function (i) {
				var invoice = {};
				invoice = new Invoice(i);
				return invoice.find(connection).then(function () {
					invoice.total();

					var lateFeeAmt = 0;


					if (moment().subtract(invoice.Lease.late_fee_days, 'DAY').isSame(moment(invoice.due), 'day')) {

						if (invoice.Lease.late_fee_type == "dollars") {
							lateFeeAmt = invoice.Lease.late_fee;
						} else { // latefee is percent
							lateFeeAmt = Math.round(invoice.balance * invoice.Lease.late_fee) / 1e2;
						}

					} else {
						if (invoice.Lease.late_fee_subsequent_type == "dollars") {
							lateFeeAmt = invoice.Lease.late_fee_subsequent;
						} else { // latefee is percent
							lateFeeAmt = Math.round(invoice.balance * invoice.Lease.late_fee_subsequent) / 1e2;
						}

					}

					var service = new Service({
						lease_id: invoice.lease_id,
						product_id: lateFee.id,
						price: lateFeeAmt,
						start_date: moment().format('YYYY-MM-DD'),
						end_date: moment().format('YYYY-MM-DD'),
						name: "Late fee for invoice #" + invoice.number + " due on " + moment(invoice.due).format('MM/DD/YYYY'),
						qty: 1,
						recurring: 0,
						prorate: 0
					});

					return service.save(connection);
				})
			})

		}).then(function (results) {
			connection.release();
			return {
				invoices: results
			}

		}).catch(function (err) {
			console.log(err);
			console.log(err.stack);
			return {
				status: false,
				msg: err
			};
		});

	},

	verify: async function (data, pool) {
		let connection = await pool.getConnectionAsync();
		let _this = this;

		try {
			let date = data.date;
			let company = new Company({ id: data.company_id });
			let property = new Property({ id: data.property_id });
			let trigger = new Trigger({ id: data.trigger_id });

			await company.find(connection);
			await property.find(connection);

			await trigger.find(connection);
			await trigger.findFees(connection);
			await trigger.findEmails(connection);
			await trigger.findSMSs(connection);
			await trigger.findAttachments(connection);
			await trigger.findEvents(connection);
			let leases = await trigger.getLeases(connection, date, property.id);

			let output = "Verify Triggers Fired\r\n";
			output += "Lease ID, Trigger ID, Property ID, Date, Invoices Created, Document Generated, Emails Sent, Event Created, Overlocked, Payment Denied\r\n";

			for (let j = 0; j < leases.length; j++) {
				try {
					output += leases[j].id + ',';
					output += trigger.id + ',';
					output += property.id + ',';
					output += date + ',';
					try {
						if (trigger.Fees && trigger.Fees.length) {
							let invoices = await trigger.isLateFeesApplied(connection, leases[j], company, date);
							output += invoices && invoices.length ? true : false + ',';;
						} else output += ',';
					} catch (err) {
						console.log("LATE FEE ERROR", err);
					}

					try {
						if (trigger.Attachments && trigger.Attachments.length) {
							let documents = await trigger.isDocumentGenerated(connection, leases[j], date);
							output += documents && documents.length ? true : false + ',';;
						} else output += ',';
					} catch (err) {
						console.log(err);
					}

					try {
						if (trigger.Emails && trigger.Emails.length) {
							let emails_not_sent_list = await trigger.isEmailSent(connection, leases[j], date);
							output += emails_not_sent_list && emails_not_sent_list.length ? false : true + ',';
						} else output += ',';
					} catch (err) {
						console.log(err);
					}

					try {
						if (trigger.Events && trigger.Events.length > 0) {
							let events_not_created = await trigger.isEventCreated(connection, company, date);
							output += events_not_created && events_not_created.length ? false : true + ',';
						} else output += ',';
					} catch (err) {
						console.log("err", err);
					}

					try {
						output += trigger.overlock && leases[j].overlock ? true : false + ',';
					} catch (err) {
						console.log("err", err);
					}
					try {
						output += trigger.deny_payments && leases[j].deny_payments ? true : false + ',';
					} catch (err) {
						console.log("err", err);
					}
					output += "\r\n"
					console.log("OK Done");

				} catch (err) {
					console.log("Stage 1 error", err);
				}
				console.log("Next One")
			}

			if (leases.length > 0) {
				try {

					let attachments = [{
						content_type: "text/csv",
						name: company.name + "_" + property.name + "_triggers_verification" + moment(data.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + '.csv',
						content: Buffer.from(output).toString('base64')
					}]
					await _this.sendResultsEmail(connection, output, company, attachments)
				} catch (err) {
					console.log("ERROR", err);
				}
			}

		} catch (err) {
			console.log("err found", err)
		}
		connection.release();
	},

	async sendResultsEmail(output, company, attachments) {

		var email = {
			email: settings.get_configured_reporting_emails(),
			to: settings.get_configured_reporting_email_names(),
			subject: 'Trigger Verification for ' + company.name,
			from: "Tenant",
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'headline',
						content: 'Trigger Verification'
					},
					{
						name: 'content',
						content: output
					}]
			},
			company_id: company.id,
			contact_id: 1010,
			attachments: attachments
		};
		await Mail.sendBasicEmail(null, email, output);

	},
	setUpLogs(action, lease, delinquency, data, company, tracking) {

		var log = {
			action: mask(action, "(id,trigger_id,delinquency_action_type_id,past_due_invoice_id,invoice_id,event_id,upload_id,interaction_id,reference_id,description,excecution_date,date,recurred,error,completed,created,deleted,action,action_name,Document(id,document_id,document_name,DeliveryMethods(id,trigger_attachment_id,delivery_methods_id,delivery_type))"),
			lease: {
				id: lease.id,
				invoice_id: lease.invoice_id,
				balance: lease.balance,
				due: lease.duedate,
				number: lease.invoice_number, 
				unit_number: lease.Unit.number
			}, 
			tracking: tracking,
			delinquency: {
				id: delinquency.id, 
				start_date: delinquency.start_date,
				end_date: delinquency.end_date,
				created: delinquency.created
			},
			data: data,
			company: {
				id: company.id,
				name: company.name,
				gds_owner_id: company.gds_owner_id,
				subdomain: company.subdomain,

			}
		};
		return log;
	},

	async runEndDelinquencyRoutine(data) {
		try {
			let { cid, property_id, lease_id } = data;
			var connection = await db.getConnectionByType('write', cid);

			const delinquencies = await Delinquency.getActiveDelinquenciesWithNoPastDueBalance(connection, {
				property_id: property_id,
				lease_id: lease_id
			});

			for (let i = 0; i < delinquencies.length; i++) {
				const lease = new Lease({ id: delinquencies[i].lease_id });
				await lease.endDelinquencyProcess(connection, {
					delinquency_id: delinquencies[i].delinquency_id
				});
			}
		} catch (err) {
			console.log('runEndDelinquency routine error: ', err);
			console.log(err.stack);
		} finally {
			await db.closeConnection(connection);
		}
	},

	async generateMergeDocuments(data) {

		var connection = await db.getConnectionByType('write', data.cid);

		try {

			var doc = new Document();
			await doc.generateMergeDocuments(connection, {
				...data,
				dry_run: false,
				generate_doc: true
			});

		} catch (err) {
			console.log("error while merging document => ", err);
		} finally {
			await db.closeConnection(connection);
		}
	}
}



module.exports = {
	process: function (data, pool) {
		return Triggers.process(data, pool);
	},
	// processPropertyTrigger: (data, pool) => {
	// 	return Triggers.processPropertyTrigger(data, pool);
	// },
	verify: function (data, pool) {
		return Triggers.verify(data, pool);
	},
	runTriggerRoutine: function (data) {
		return Triggers.runTriggerRoutine(data);
	},
	runEndDelinquencyRoutine: function (data) {
		return Triggers.runEndDelinquencyRoutine(data);
	},
	generateMergeDocuments: function (data) {
		return Triggers.generateMergeDocuments(data);
	}
};
