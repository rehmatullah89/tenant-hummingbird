var moment = require('moment');
var models = require(__dirname + '/../models');
var pool = require(__dirname + '/../modules/db.js');
var Event = require(__dirname + '/../classes/event.js');
var utils = require(__dirname + '/../modules/utils.js');
var e = require(__dirname + '/../modules/error_handler.js');
const Socket = require(__dirname + '/../classes/sockets.js');
var Enums = require(__dirname + '/../modules/enums.js');
// const company = require('../models/company');

const bullmq = require('bullmq');
const IORedis = require('ioredis');

const redis_connection = new IORedis({ host: process.env.REDIS_HOST });
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });
var db = require('../modules/db_handler.js');
var Tokens = require('../modules/tokens');
var PandaDocs = require('../modules/pandadocs.js');


var RateChangeRoutines = {

	async createNotifications(data) {
		try {
			var connection = await db.getConnectionByType('write', data.cid);
			let rate_change_configuration = new RateChangeConfiguration({ property_id: data.property_id, type: 'auto' });
			let rate_configurations = await rate_change_configuration.findAllByPropertyAndType(connection);
			const date = moment(data.date);

			if (rate_configurations.length != 0) {
				for (const rent_raise of rate_configurations) {
					console.log('Rent Raise', rent_raise);

					let changeRange = {};
					switch (rent_raise.frequency) {
						case 'monthly':
							changeRange.from = date.clone().month(date.month()).startOf('month').add(1, 'days');
							changeRange.to = date.clone().month(date.month()).endOf('month').add(1, 'days');
							break;
						case 'quarterly':
							changeRange.from = date.clone().quarter(date.quarter()).startOf('quarter').add(1, 'days');
							changeRange.to = date.clone().quarter(date.quarter()).endOf('quarter').add(1, 'days');
							break;
						case 'yearly':
							changeRange.from = date.clone().year(date.year()).startOf('year').add(1, 'days');
							changeRange.to = date.clone().year(date.year()).endOf('year').add(1, 'days');
							break;
						default:
							console.log("Invalid frequecy: ", rent_raise.frequency);
							continue;
					}

					let notification_date = changeRange.to.clone().subtract(rent_raise.notification_period, 'days');

					console.log('Current Date', date.format('YY-MM-DD'));
					console.log('Notification Date', notification_date.format('YY-MM-DD'));

					if (!(date.isSame(notification_date, 'day'))) continue;

					let rentChangeLength = {
						length: rent_raise.change_length,
						period: rent_raise.change_period
					};

					let rent_raises = [];
					var rate_change = new RateChange({
						rate_change_configuration_id: rent_raise.id,
						property_id: rent_raise.property_id,
						name: rent_raise.name,
						type: 'auto',
						change_amt: rent_raise.change_amt,
						notification_period: rent_raise.notification_period,
						change_direction: rent_raise.change_direction,
						change_type: rent_raise.change_type,
						document_id: rent_raise.document_id,
						email_text: rent_raise.email_text,
						email_subject: rent_raise.email_subject,
						created_at: date,
						target_date: changeRange.to.clone().format('YYYY-MM-DD'),
						rounding: rent_raise.rounding
					});

					var leases = await models.RateChangeConfiguration.findLeasesByConfiguration(connection, changeRange, rentChangeLength, rent_raise.trigger, rent_raise.property_id);
					if (leases.length === 0) continue;

					await rate_change.save(connection);

					for (const lease of leases) {
						if (lease.end_date && moment(lease.end_date, 'YYYY-MM-DD') < date.endOf('day')) continue;
						let rent_chnage_lease = new Lease({ id: lease.id })
						let rent_service = await rent_chnage_lease.findActiveRentService(connection);
						let current_rent = rent_service?.price || lease.rent;
						rent_raises.push({ lease_id: lease.id, rate_change_id: rate_change.id, change_amt: rent_raise.change_amt, current_rent });
					}

					var rent_change_lease = new RentChangeLease();
					await rent_change_lease.bulkSave(connection, rate_change, rent_raises);
					console.log("Saved");

					let property = new Property({ id: rent_raise.property_id });
					await property.find(connection);

					// let datetime = date ? moment(date, 'YYYY-MM-DD') : moment();
					// let event_type = await Event.findEventType(connection, 'new_rate_change');
					// let start_date = datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
					// var evntTypeExp = moment(start_date).add(event_type.expiration_days , 'days');
					// let end_date = evntTypeExp.format('YYYY-MM-DD HH:mm:ss');

					let task = new Task({
						'company_id': property.company_id,
						'event_type': Enums.EVENT_TYPES.RATE_CHANGE.REVIEW_RATE_CHANGE,
						'task_type': Enums.TASK_TYPE.RATE_CHANGE,
						'created_by': data.contact_id || null,
						'object_id': rate_change.id,
					});

					await task.save(connection, property.company_id, data.date);
				}
			}
		}
		catch (err) {
			// log errors
			console.log('Create Notifications error ', err);
		} finally {
			await db.closeConnection(connection);
		}

		return {
			status: true,
			data: {}
		};
	},

	async generateNotifications(data) {

		try {
			var connection = await db.getConnectionByType('write', data.cid);

			let rate_change = new RateChange({ id: data.rate_change_id });
			await rate_change.findById(connection);

			let property = new Property({ id: rate_change.property_id });
			await property.find(connection);
			let rent_change_leases_records = [];
			//if event contains rent_change_leases, send notifications for those rcl only
			if (data?.rent_change_leases?.length) {
				rent_change_leases_records = data.rent_change_leases;
			} else {
				let rent_change_leases = new RentChangeLease({rate_change_id : rate_change.id});
				rent_change_leases_records = await rent_change_leases.findByRateChangeId(connection);
			}

			// create document batch
			let documentBatch = new DocumentBatch({
				created_by: data.contact_id, 
				property_id: property.id,
				document_manager_template_id: rate_change.document_id,
				document_type: 'Rent Change'
			});
			
			await documentBatch.save(connection);
			let delivery_id = null;
			if (rate_change.delivery_methods_id) {
				// save document_batch_deliveries
				delivery_id = await documentBatch.saveDelivery(connection, rate_change.delivery_methods_id);
			}



			for (let i = 0; i < rent_change_leases_records.length; i++) {

				let rent_change_lease = new RentChangeLease(rent_change_leases_records[i]);
				await rent_change_lease.findById(connection);

				let lease = new Lease({ id: rent_change_lease.lease_id });
				await lease.find(connection);
				if (lease.end_date && moment(lease.end_date, 'YYYY-MM-DD') < moment().endOf('day')) {
					await rent_change_lease.update(connection, { status: 'error', message: 'The tenant has already moved out' });
					continue;
				} else {
					await rent_change_lease.update(connection, { status: 'initiated' });
				}

				//Call Generate Document workflow

				await Queue.add('send_notification', {
					document_batch_id: documentBatch.id,
					document_batch_delivery_id: delivery_id,
					cid: data.cid,
					priority: data.priority,
					rate_change_id: rate_change.id,
					company_id: property.company_id,
					rent_change_lease_id: rent_change_lease.id,
					lease_id: rent_change_lease.lease_id,
					document_id: rate_change.document_id,
					contact_id: data.contact_id,
					tracking: {
						trace_id: data.tracking?.trace_id,
						event_name: data.tracking?.event_name
					},
					// email: {
					// 	message: rate_change.email_text,
					// 	subject: rate_change.email_subject
					// },
					socket_details: {
						contact_id: data.socket_details.contact_id,
						company_id: data.socket_details.company_id,
						document_id: data.socket_details.document_id,
					},
					trace_id: data.trace_id
				}, { priority: data.priority });
			}

			return data;
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},


	async deliverDocument(data) {
		// copy from delinquencies
		console.log("deliverDocument data", data);
		let { document_batch_id, document_batch_delivery_id, rent_change_lease_id, cid, company_id, lease_id, rate_change_id, upload_id, trace_id } = data;

		try {
			var connection = await db.getConnectionByType('write', cid);

			let company = new Company({ id: company_id });
			await company.find(connection);

			console.log("PARAMS:", document_batch_id, document_batch_delivery_id, rent_change_lease_id, cid, company_id);

			let rate_change = new RateChange({ id: rate_change_id });
			await rate_change.findById(connection);


			// get Rent Change Lease
			let lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.getTenants(connection);
			await lease.getProperty(connection, company.id);
			let tenant = lease.Tenants.find(t => t.contact_id == lease.primary_contact_id)

			if (!company.gds_owner_id || !lease.Property.gds_id) {
				console.log("Missing company's owner_id or properties GDS id");
				console.log("Company: ", company.gds_owner_id);
				console.log("Property: ", lease.Property.gds_id);
				await utils.closeConnection(pool, connection);
				return data;
			}

			let upload = new Upload({ id: upload_id })
			await upload.find(connection);
			await upload.findSigners(connection, company.id);
			upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
			let file = await upload.download();

			let attachments = [{
				upload_id: upload.id,
				content_type: "application/pdf",
				name: `${upload.name}.pdf`, 	// change ?
				content: file.Body.toString('base64'),
			}];

			let delivery = await DocumentBatch.getDeliveryById(connection, document_batch_delivery_id);

			let dm = {
				id: delivery.delivery_methods_id,
				gds_key: delivery.gds_key,
			}

			let response = {};
			
			switch (delivery.gds_key) {
				case 'certified_mail':
				case 'first_class':
				case 'certificate_of_mailing':
				case 'certified_mail_with_err':
					response = await tenant.Contact.sendMail(connection, attachments, 'rent_raise', company.gds_owner_id, lease.Property.gds_id, dm, null, lease.primary_contact_id, lease.id, delivery.id, null,  trace_id);
					break;
				case 'registered_email':
				case 'certified_email':
				case 'standard_email':

					await lease.findUnit(connection);
					await lease.getCurrentBalance(connection, company.id);
					await lease.getActiveRent(connection);
					
					if (!tenant.Contact.email) {
						throw `Email not present for Contact ${tenant.Contact.first} ${tenant.Contact.last}`; 
					}
					let message = await RateChangeRoutines.mergeTokens(connection, rate_change.email_text, lease, company, lease.property);
					response = await tenant.Contact.sendEmail(connection, rate_change.email_subject, message, attachments, null, 'rent_raise', company.gds_owner_id, lease.Property.gds_id, dm, lease.primary_contact_id, lease.id, delivery.id, null, trace_id);
					break;
			}
	

			console.log("deliverDocument response", response)
			
			data.interaction_id = response.interaction_id;
			
			return data;

		} catch (err) {
			console.log("deliverDocument err", err)
			throw err; 
		} finally {
			await db.closeConnection(connection);
		}
	},


	// async sendEmails(data) {
	// 	console.log("routines create_panda_doc", data);
	// 	try {
	// 		var connection = await db.getConnectionByType('write', data.cid);

	// 		let company = new Company({ id: data.company_id });
	// 		await company.find(connection);

	// 		let lease = new Lease({ id: data.lease_id });
	// 		await lease.find(connection);
	// 		await lease.getTenants(connection);
	// 		await lease.getProperty(connection, company.id);

	// 		if (!company.gds_owner_id || !lease.Property.gds_id) {
	// 			console.log("Missing company's owner_id or properties GDS id");
	// 			console.log("Company: ", company.gds_owner_id);
	// 			console.log("Property: ", lease.Property.gds_id);
	// 			await utils.closeConnection(pool, connection);
	// 			return data;
	// 		}

	// 		let upload = new Upload({
	// 			id: data.upload_id
	// 		});

	// 		await upload.find(connection);
	// 		await upload.findSigners(connection, company.id);
	// 		upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
	// 		let file = await upload.download();

	// 		let tenant = lease.Tenants[0];
	// 		console.log(tenant.Contact);
	// 		if (data.email.subject) {
	// 			if (!tenant.Contact.email) {
	// 				// todo record that email couldn't be send without a valid email
	// 				console.log(`Email not present for Contact ${tenant.Contact.first} ${tenant.Contact.last}`);
	// 				await db.closeConnection(connection);
	// 				return data;
	// 			}

	// 			let message = "";
	// 			if (data.email.message) {
	// 				message = Trigger.mergeFields(data.email.message, tenant, lease);
	// 				message = Trigger.replaceNewLineEmail(message);
	// 			}
	// 			console.log("message", message);

	// 			let attachments = [{
	// 				content: file.Body.toString('base64'),
	// 				content_type: "application/pdf",
	// 				name: `${upload.name}.pdf` 	// change ?
	// 			}];

	// 			let signer = upload.signers.find(s => s.Contact.id === tenant.Contact.id);
	// 			if (signer) {
	// 				let sign_link = await Upload.sendEmailForSignature(connection, tenant.Contact, [upload], company, false, { property_id: lease.Property.id });
	// 				message += '<br /><br /><a href="' + sign_link.shortUrl + '">Click here to sign this document</a>';
	// 			}

	// 			let email = await tenant.Contact.sendEmail(connection, data.email.subject, message, attachments, company, null, 'rate-change', company.gds_owner_id, lease.Property.gds_id);
	// 			console.log("response", email);

	// 			data.email_id = email && email.id;
	// 			console.log("We have send the email", data);
	// 		}

	// 		await db.closeConnection(connection);
	// 		return data;

	// 	} catch (err) {
	// 		try {
	// 			console.log(err.stack);
	// 		} catch (err) {
	// 			console.log(err);
	// 		}
	// 		await db.closeConnection(connection);
	// 		throw err;
	// 	}
	// },

	async notificationSuccess(wf) {
		console.log("*********WorkFlow:", wf);
		try {
			if (wf.dependencies.length) {
				let data = wf.dependencies[wf.dependencies.length - 1].data;
				console.log('notificationSuccess data', data);
				var connection = await db.getConnectionByType('write', data.cid);
				let workflow = JSON.stringify(wf.dependencies, null, 2);
				console.log("*********WorkFlow:", workflow);
				let rent_change_lease = new RentChangeLease({ id: data.rent_change_lease_id });
				await rent_change_lease.findById(connection);
				await rent_change_lease.update(connection, { upload_id: data.upload_id, interaction_id: data.interaction_id, status: 'done', notification_sent: moment.utc().format('YYYY-MM-DD HH:mm:ss') });
				await RateChangeRoutines.checkFinal(connection, rent_change_lease, data);
				
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			if (connection) {
				await db.closeConnection(connection);
			}
			throw err;
		} finally {
			if (connection) {
				await db.closeConnection(connection);
			}
		}
	},

	async notificationFailure(data) {

		var connection = await db.getConnectionByType('write', data.cid);
		try {
			console.log("********RateChangeFaulire:", data);
			if (data && data.rent_change_lease_id) {
				let rent_change_lease = new RentChangeLease({ id: data.rent_change_lease_id });
				await rent_change_lease.findById(connection);

				let message = data.msg;
				let wf = data.workflow && data.workflow.dependencies && data.workflow.dependencies.find(d => d.status == 'initiated');
				if (wf) {
					message = `Step: ${wf.job_name}${data.msg ? `, Message: ${data.msg}` : ''}`;
				}

				await rent_change_lease.update(connection, { upload_id: data.upload_id, email_id: data.email_id, status: 'error', message });
				await RateChangeRoutines.checkFinal(connection, rent_change_lease, data);
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			await db.closeConnection(connection);
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},

	async applyRateChange(data) {
		try {
			var connection = await db.getConnectionByType('write', data.cid);

			let rate_change = new RateChange({ id: data.rate_change_id });
			await rate_change.findById(connection);

			let property = new Property({ id: rate_change.property_id });
			await property.find(connection);
			let rent_change_leases_records = [];
			//if event contains rent_change_leases, create services for those rcl only
			if (data?.rent_change_leases?.length) {
				rent_change_leases_records = data.rent_change_leases;
			} else {
				let rent_change_leases = new RentChangeLease({ rate_change_id: rate_change.id });
				rent_change_leases_records = await rent_change_leases.findByRateChangeId(connection);
			}

			for(let i = 0; i < rent_change_leases_records.length; i++){
				try{
					var rent_change_lease = new RentChangeLease(rent_change_leases_records[i]);
					await rent_change_lease.findById(connection);
					let lease = new Lease({ id: rent_change_lease.lease_id });
					await lease.find(connection);
					if (lease.end_date && moment(lease.end_date, 'YYYY-MM-DD') < moment().endOf('day')) continue;

					await lease.find(connection);

					let last_billed = await lease.getLastBillingDate(connection, { rent: true });
					
					let activeRentService = await Service.getActiveRentService(connection, lease.id, moment(last_billed, 'YYYY-MM-DD'));

					let future_rent_services = await Service.getFutureRentServices(connection, lease.id, moment(last_billed, 'YYYY-MM-DD'));
					
					
					// as per discussion ending all future_rent_services
					if (future_rent_services?.length) {
						let frs_ids = future_rent_services.map(frs => frs.id);
						await Service.endFutureServices(connection, { status: 0 }, frs_ids);
					}

					let newStartDate;
					if (moment(activeRentService.last_billed).isSameOrAfter(moment(rate_change.target_date))) {
						newStartDate = lease.getNextBillingDate(moment(activeRentService.last_billed, 'YYYY-MM-DD'), true);
					} else {
						newStartDate = lease.getNextBillingDate(moment(rate_change.target_date, 'YYYY-MM-DD'), true);
					}


					// checking for duplicate Active Rent Service, and ending it.
					if (moment(newStartDate).isSame(activeRentService.start_date)) {
						await models.Service.save(connection, { status: 0, end_date: moment(newStartDate).format('YYYY-MM-DD') }, activeRentService.id);
					} else {
						await activeRentService.endCurrentService(connection, newStartDate.clone().startOf('day').subtract(1, 'day').format('YYYY-MM-DD'));
					}
					




					let service = new Service({
						lease_id: activeRentService.lease_id,
						product_id: activeRentService.product_id,
						property_bill_id: activeRentService.property_bill_id,
						name: activeRentService.name,
						description: activeRentService.description,
						qty: activeRentService.qty,
						taxable: activeRentService.taxable,
						recurring: activeRentService.recurring,
						prorate: activeRentService.prorate,
						prorate_out: activeRentService.prorate_out,
						service_type: activeRentService.service_type
					});

					let change_lease = new RentChangeLease({ id: rent_change_lease.id });
					await change_lease.findById(connection);

					//service.price = RateChangeRoutines.calculateChangedRent(rate_change, activeRentService.price);
					service.price = change_lease.new_rent_amt || 0;
					service.start_date = newStartDate.format('YYYY-MM-DD');
					service.end_date = null;

					await service.save(connection);
					await change_lease.update(connection, { service_id: service.id, change_applied: moment.utc().format('YYYY-MM-DD HH:mm:ss') });


					// run generated invoices routine for any open payments. 





				} catch (e) {
					console.log("Rent change failed for: ", rent_change_lease.lease_id);
					console.error(e);
				}
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},

	async checkFinal(connection, rent_change_lease, data){
		try{

			console.log("THIS IS checkFinal", data);
			let response = await models.RentChangeLease.findUnnotifiedCount(connection, rent_change_lease.rate_change_id);
			let count = response.length && response[0].count;
			console.log("response", response);
			if (!count) {

				let rate_change = new RateChange({ id: rent_change_lease.rate_change_id });
				await rate_change.findById(connection);

				let property = new Property({ id: rate_change.property_id });
				await property.find(connection);


				// Generate documents
				// write job to assemble PDf document
				await Queue.add('merge_document_routine', {
					filename: rate_change.name,
					rate_change_id: rate_change.id,
					document_batch_id: data.document_batch_id,
					cid: data.cid,
					company_id: data.company_id,
					property_id: property.id,
					socket_details: data.socket_details,
					tracking: {
						trace_id: data.tracking?.trace_id,
						event_name: data.tracking?.event_name
					},
				});
				// Auto approved automated rent changes will always have a reviewed date
				// Avoid creating tasks in this scenario
				if (!rate_change.reviewed) {
					try {
						let task = new Task({
							company_id: property.company_id,
							event_type: Enums.EVENT_TYPES.RATE_CHANGE.GENERATED_RATE_CHANGE_DOCUMENTS,
							task_type: Enums.TASK_TYPE.RATE_CHANGE,
							created_by: data.contact_id || null,
							object_id: rate_change.id,
						});
	
						await task.save(connection, property.company_id);
					} catch (err) {
						console.log("Generate Documenents error" + err);
					}
	
					try {
						let task = new Task({
							company_id: property.company_id,
							event_type: Enums.EVENT_TYPES.RATE_CHANGE.APPROVE_RATE_CHANGE,
							task_type: Enums.TASK_TYPE.RATE_CHANGE,
							created_by: data.contact_id || null,
							object_id: rate_change.id,
						});
	
						await task.save(connection, property.company_id);
					} catch (err) {
						console.log("Approve Rate Change error" + err);
					}
				}
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
		}
	},

	calculateChangedRent(rate_change_config, current_rent) {
		let amount;
		let direction = rate_change_config.change_direction === 'Increase' ? 1 : -1;
		switch (rate_change_config.change_type) {
			case 'fixed':
				amount = rate_change_config.change_amt;
				break;
			case 'percent':
				let change_amt = Math.round(((rate_change_config.change_amt / 100) * current_rent) * 1e2) / 1e2;
				amount = (direction * change_amt) + current_rent;
				break;
			case 'dollar':
				amount = (direction * rate_change_config.change_amt) + current_rent;
				break;
		}

		return amount;
	},

	async mergeTokens(connection, message, lease, company, property, is_html) {
		// document.Details.tokens
		if (!message) return '';
		try {

			let found_tokens = [];
			for (let s in Tokens) {
				if (typeof Tokens[s] === 'function') continue;
				let section = Tokens[s];
				const regex = /[A-Z]/g;
				for (let i = 0; i < section.length; i++) {
					if (message.indexOf(`[${section[i]}]`) < 0) continue;
					found_tokens.push({
						name: section[i]
					})
				}
			}

			let document = {
				Details: {
					tokens: found_tokens
				}
			}

			await lease.findFull(connection, company, [property], document)
			let merged_tokens = await PandaDocs.mergeTokens(connection, lease, document.Details)
			merged_tokens = merged_tokens || [];
			for (let i = 0; i < merged_tokens.length; i++) {
				var re = new RegExp(`\\[${merged_tokens[i].name}\\]`, 'g');
				message = message.replace(re, merged_tokens[i].value)
			}
			if (is_html) {
				message = message.replace(/\n/g, '<br />');
			}
			return message;

		} catch (err) {
			throw err;
		}

		// extract tokens, 
		// find full, 
		// str replace tokens
	}
}


module.exports = {
	createNotifications: async (data) => {
		return await RateChangeRoutines.createNotifications(data);
	},

	generateNotifications: async (data) => {
		return await RateChangeRoutines.generateNotifications(data);
	},

	deliverDocument: async (data) => {
		return await RateChangeRoutines.deliverDocument(data);
	},

	// sendEmails: async (data) => {
	// 	return await RateChangeRoutines.sendEmails(data);
	// },

	notificationSuccess: async (data) => {
		return await RateChangeRoutines.notificationSuccess(data);
	},

	notificationFailure: async (data) => {
		return await RateChangeRoutines.notificationFailure(data);
	},

	applyRateChange: async (data) => {
		return await RateChangeRoutines.applyRateChange(data);
	},

	mergeTokens: async (data) => {
		return await RateChangeRoutines.mergeTokens(data);
	},
};

var RateChangeConfiguration = require('../classes/rate_change_configuration.js');
var RentChangeLease = require('../classes/rent_change_lease.js');
var RateChange = require('../classes/rate_change.js');
var Property    = require('../classes/property.js');
// var Document      = require('../classes/document.js');
var Company		= require('../classes/company.js');
var Lease      	= require('../classes/lease.js');
// var Trigger 	= require('../classes/trigger.js');
const Upload      = require('../classes/upload.js');
var Service 	= require('../classes/service.js');
var Task 	= require('../classes/task.js');
var DocumentBatch = require('../classes/document_batch.js');

