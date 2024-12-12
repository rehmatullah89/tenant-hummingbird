var moment      = require('moment');
var jade = require('jade');
var fs = require('fs');

var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models      = require(__dirname + '/../models');
var Lease      = require(__dirname + '/../classes/lease.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var Invoice      = require(__dirname + '/../classes/invoice.js');
var Company      = require(__dirname + '/../classes/company.js');

var validator = require('validator');

var Promise = require('bluebird');
const { content } = require('pdfkit/js/page');
var Mail = require(__dirname + '/../modules/mail.js');
var pool = require(__dirname + '/../modules/db.js'); 
const base64Encoder = require('base64-arraybuffer');
var { getGDSMappingIds} = require('../modules/gds_translate');
const Property = require('../classes/property');
// const lease = require('../../api-server/classes/reports/report_fields/lease');

const utils = require('../modules/utils.js');
const ENUMS = require('../modules/enums');
const queue = require('../modules/queue');

var Charges = {

	INVOICE_FAILURE_REASONS : Object.freeze({
		GENERATE: 'failure_to_generate',
		SAVE: 'failure_to_save',
		SEND_EMAIL: 'failure_to_send_email',
	}),

	async generateInvoices(connection, data, job) {

		let generated_invoices = [];
		let failed_invoices = [];

		data.date = data.date || moment().format('YYYY-MM-DD');
		let lastTimestamp = new Date();

		let leases = await this.findLeasesToChargeOnDay(connection, data);
		lastTimestamp = utils.logTimestampDifference('DoneFetchingLeasesForProperty '+ data.property.id + ' in time', lastTimestamp);
		let isNotOnBoarded = null;

		for(let i = 0; i < leases.length; i++){
			// Get Invoice for each lease
			isNotOnBoarded = null;
			var lease = new Lease({id: leases[i].id});
			try {
				await lease.find(connection);
				await lease.findUnit(connection);
				await lease.Unit.setSpaceMixId(connection, false);
				await lease.getTenants(connection, {get_primary_only: true});
				await lease.findAutoPaymentMethods(connection);
				await lease.getPaymentCycleOptions(connection, lease.payment_cycle);
				lastTimestamp = utils.logTimestampDifference('DoneFetchingDataForLease '+ lease.id + ' in time', lastTimestamp);
				// if payment cycle, save new one. 
				if(!data.company_id) data.company_id = leases[i].company_id;

				let invoices = await this.getMonthlyChargesForLease(connection, lease, data);
				lastTimestamp = utils.logTimestampDifference('DoneFetchingChargesForLease '+ lease.id + ' in time', lastTimestamp);

				if(data.date && lease.property_onboarding_date) {
					isNotOnBoarded = moment(invoices[0].due).isBefore(lease.property_onboarding_date);
					if(isNotOnBoarded) throw new Error("Invoice due should be greater or equal than facility on boarding date.");
				}

				for(let j = 0; j < invoices.length; j++){
				
					let invoice = invoices[j];
				
					if (!invoice || !invoice?.InvoiceLines.length) {
						console.log("!invoice", JSON.stringify(invoices, null, 2));
						continue;
					}
 
					if (!data.dryrun) {

						if(data.property){
							invoice.property_id = data.property.id;
							invoice.Property = data.property;
						}
						
						invoice.contact_id = lease.primary_contact_id;
						invoice.Contact = lease.Tenants[0].Contact;

						try {
							invoice.id = await Charges.saveInvoice(connection, invoice, data.company);
							
							if(invoice.id && lease.payment_cycle && j == 0){
								
								await lease.savePaymentCycle(connection, moment(invoice.due, 'YYYY-MM-DD'), null, data.company_id, false);
							}
							lastTimestamp = utils.logTimestampDifference('DoneSavingInvoiceForLease '+ lease.id + ' in time', lastTimestamp);
						} catch (err) {
							console.log("Critical error: ", err);
							Charges.sendLogsToNewRelic({
								payload: {
									...data,
									lease_id: leases[i].id,
									invoice
								},
								reason: Charges.INVOICE_FAILURE_REASONS.SAVE,
								error: err?.stack || err?.message || err
							});
							lastTimestamp = utils.logTimestampDifference('DoneSaveFailureForLease '+ lease.id + ' in time', lastTimestamp);
							continue;
						}

						try {
							if (lease.send_invoice && invoice.id) {
								await Charges.sendInvoiceToGds(connection.cid, data.company, invoice, lease, data.property);
								lastTimestamp = utils.logTimestampDifference('DoneEmailingInvoiceForLease '+ lease.id + ' in time', lastTimestamp);
							}
						} catch (err) {
							console.log("Send Invoice Email Critical error: ", err);
							Charges.sendLogsToNewRelic({
								payload: {
									...data,
									lease_id: leases[i].id,
									invoice
								},
								reason: Charges.INVOICE_FAILURE_REASONS.SEND_EMAIL,
								error: err?.stack || err?.message || err
							});
							lastTimestamp = utils.logTimestampDifference('DoneEmailFailureForLease '+ lease.id + ' in time', lastTimestamp);
							continue;
						}
					} else {
						await invoice.total();
						generated_invoices.push({
							company_id: leases[i].company_id,
							company_name: leases[i].company_name,
							property_id: leases[i].property_id,
							property_name: leases[i].property_name,
							contact_id: lease.primary_contact_id,
							contact_name: lease?.Tenants[0]?.Contact && `${lease.Tenants[0].Contact.first} ${lease.Tenants[0].Contact.last}`,
							lease_id: leases[i].id,
							bill_day: lease?.bill_day,
							space_number: leases[i].unit_number,
							date: invoice.date, due: invoice.due,
							period_start: invoice.period_start, period_end: invoice.period_end,
							sub_total: invoice.sub_total, tax: invoice.total_tax,
							discounts: invoice.total_discounts, balance: invoice.balance,
							payments: invoice.total_payments,
						})

					}
				}
			} catch(err) {
				console.log("Invoice generation failed for following lease_id = ", leases[i].id);
				console.log("Invoice generation failed Data = ", data);
				console.log("Invoice generation Error ", err?.stack || err?.msg || err);

				if(!isNotOnBoarded) {
					Charges.sendLogsToNewRelic({
						payload: {
							...data,
							lease_id: leases[i].id
						},
						reason: Charges.INVOICE_FAILURE_REASONS.GENERATE,
						error: err?.stack || err?.msg || err
					});
				}
				lastTimestamp = utils.logTimestampDifference('DoneGenerationFailureForLease '+ lease.id + ' in time', lastTimestamp);

				if(data.dryrun){
					failed_invoices.push({
						company_id: leases[i].company_id,
						company_name: leases[i].company_name,
						property_id: leases[i].property_id,
						property_name: leases[i].property_name,
						contact_id: lease.primary_contact_id,
						contact_name: lease?.Tenants[0]?.Contact && `${lease.Tenants[0].Contact.first} ${lease.Tenants[0].Contact.last}`,
						lease_id: leases[i].id,
						bill_day: lease?.bill_day,
						space_number: leases[i].unit_number,
						message: err?.message
					})
				}
			}

			if(job){
				await queue.updateProgress(job, { total: leases.length, done: i + 1 });
				lastTimestamp = utils.logTimestampDifference('DoneProgressUpdateAfterLease '+ lease.id + ' in time', lastTimestamp);
			}
		}
		return { generated_invoices, failed_invoices };
	},

	async sendLogsToNewRelic(params){
		let {payload, reason, error} = params;
		await utils.sendLogs({
			event_name: ENUMS.LOGGING.GENERATE_INVOICE,
			logs: {
				payload,
				reason,
				error
			}
		})
	},

	async findLeasesToChargeOnDay(connection, data){
		data.date = data.date || moment().format('YYYY-MM-DD');
		return await models.Lease.findLeasesToInvoiceOnSpecifiedDate(connection, data);
	},
 
	async getMonthlyChargesForLease(connection, lease, data){

		
		let invoices = []; 
		let allowVoided = false;
 
		// GET bill date from date passed in. 
		let lastBilled = lease.getNextBillingDate(moment(data.date, 'YYYY-MM-DD'), true).subtract(1, 'day');
		let billedCurrentDate = lease.getNextBillingDate(moment(), true).subtract(1, 'day');

		if(moment(lastBilled.format('YYYY-MM-DD')).isSameOrAfter(billedCurrentDate.format('YYYY-MM-DD'))){
			allowVoided = true;
		}
	
		let billed_months = 1;
		if(lease.payment_cycle){
			let pc = lease.PaymentCycleOptions.find(pco => pco.label.toLowerCase() === lease.payment_cycle.toLowerCase());
			billed_months = pc ? pc.period: 1;
		}

		console.log("Billing lease id ", lease.id, " for months ",billed_months);
		for(let i = 0; i < billed_months; i++ ) {
			invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
			
			lastBilled = invoicePeriod.end.clone();
			let services = await this.getCurrentServicesToBill(connection, data, lease, invoicePeriod, allowVoided);

			
			
		// 	console.log("lease.Services", lease.Services)
			if(!services.length) continue;
			lease.Services = services;


			let invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: data.date,
				due: invoicePeriod.start,
				company_id: data.company_id,
				type: data?.admin?.email ? "admin" : "auto",
				status: 1
			});
			// invoice.Lease = lease;
			await invoice.makeFromServices(
				connection,
				lease.Services,
				lease,
				invoicePeriod.start.clone(),
				invoicePeriod.end.clone(),
				null,
				data.company_id
			);
			
			// await invoice.total();
			invoices.push(invoice);

			// Prevent future invoices from running if the first invoice is not generated
			if(!invoice.InvoiceLines.length && billed_months > 1 && i == 0 ){
				break;
			}
		}

		return invoices;
	},

	async getCurrentServicesToBill(connection, data, lease, invoicePeriod, allowVoided = false){

		let services = [];

		try {
			services = await lease.getCurrentServices(connection, data.company_id, invoicePeriod.start.clone(), invoicePeriod.end.clone(), invoicePeriod.start.clone().subtract(1, "month"), allowVoided);
			services = services.filter(s => ( s.service_type === 'lease' || s.service_type === 'insurance' )  ) 
		} catch(err){
			if(err.code === 409){
				return [];
			}
			throw err;
		}
		return services;
	},

	// getMonthlyCharges: function(data, pool){
	// 	var connection = {};
	// 	var routineType = data.type;
	// 	var date = data.date || moment().format('YYYY-MM-DD');
	//
	// 	var currDate;
	// 	var billdate = '';
	// 	var services = [];
	// 	var company = {};
	// 	var invoicePeriod = {};
	// 	return pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
	//
	// 		company = new Company({id: data.company.id});
	// 		return company.find(connection);
	// 	}).then(() =>{
	//
	//
	// 		if(routineType == 'TransactionalSummary' || routineType == 'TransactionalSendToTenants'){
	// 			currDate = data.date;
	// 			return models.Lease.findLeasesToInvoiceOnDay(connection, company.id, data.date);
	// 		} else {
	// 			// find invoices to charge today
	//
	// 			var offset = company.Settings.invoiceChargeOffset;
	// 			console.log("OOFET", offset);
	// 			currDate = moment(date, 'YYYY-MM-DD').add(offset, 'day').format('YYYY-MM-DD');
	// 			return models.Lease.findLeasesToInvoice(connection, company.id, routineType, currDate);
	//
	// 		}
	// 	}).mapSeries(function(l){
	// 		console.log("l", l);
	//
	// 		var lease = {};
	// 		lease = new Lease(l);
	// 		return lease.find(connection).then(function() {
	// 			return lease.findUnit(connection);
	// 		}).then(function(){
	//
	// 			return lease.getTenants(connection);
	// 		}).then(function(){
	// 			return lease.findPaymentMethods(connection);
	// 		}).then(function(){
	//
	// 			billdate = lease.getNextBillingDate(moment(currDate, 'YYYY-MM-DD'), true);
	//
	//
	// 			// // Find Invoice start and end dates.
	// 			invoicePeriod = {
	// 				start: billdate.clone(),
	// 				end: billdate.clone().add(1,'months').subtract(1,'day')
	// 			}
	//
	// 			return lease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
	// 				.filter(s => s.service_type == 'lease' || s.service_type == 'insurance' )
	// 				.catch(err => {
	// 					if(err.code == 409){
	// 						return [];
	// 					}
	// 					throw err;
	// 				})
	// 		}).then(function(servicesRes){
	//
	// 			if(!servicesRes.length) return;
	//
	// 			services = servicesRes;
	// 			var invoice = new Invoice({
	// 				lease_id: lease.id,
	// 				user_id: null,
	// 				date: invoicePeriod.start.clone().format('YYYY-MM-DD'),
	// 				due: invoicePeriod.start.clone().format('YYYY-MM-DD'),
	// 				company_id: company.id,
	// 				type: "auto",
	// 				status: 1
	// 			});
	// 			invoice.Lease = lease;
	// 			invoice.Company = company;
	//
	// 			return invoice.makeFromServices(
	// 				connection,
	// 				services,
	// 				lease,
	// 				invoicePeriod.start.clone(),
	// 				invoicePeriod.end.clone()
	// 			)
	// 				.then(() => invoice.calculatePayments())
	// 				.then(() => invoice.getOpenPayments(connection))
	// 				.then(() => invoice);
	// 		});
	// 	}).then(function(invoices) {
	// 		connection.release();
	// 		return {
	// 			invoices:   invoices,
	// 			billdate:   billdate,
	// 			company: company
	// 		}
	//
	// 	}).catch(function(err) {
	// 		console.log(err);
	// 		console.log(err.stack);
	// 		return {
	// 			status: false,
	// 			msg: err
	// 		};
	// 	});
	// 		/*
	// 		return connection.rollbackAsync().then(function(){
	// 			var activity = new Activity({
	// 				company_id: company_id,
	// 				lease_id: lease_id,
	// 				activity_types_id: 6,
	// 				status: 0,
	// 				read: 0,
	// 				details: JSON.stringify({
	// 					label: "The following error occurred while trying to auto-create an invoice",
	// 					error: err.toString(),
	// 					stack: err.stack
	// 				})
	// 			});
	// 			return activity.save(connection);
	//
	// 			return {
	// 				status: false,
	// 				msg: err
	// 			};
	//
	// 		}).then(function(){
	// 			return {
	// 			status: false,
	// 			msg: err
	// 			};
	// 		});
	// 			*/
	//
	// },

	async sendSummary(invoices, billdate, company, users) {

		try {
			let html = await new Promise((resolve, reject) => {
				jade.renderFile(__dirname + '/../views/invoice_summary.jade', { invoices, moment, Hashes, company, billdate, settings }, (err, html) => {
					if(err) reject(err);
					resolve(html);
				});
			})
			for (let i =0; i < users.length; i++ ){
				if(!users[i].email) continue;
				let email = {
					email: users[i].email,
					owner_id: company.gds_owner_id,
					to: company.name + ' Administrator',
					from: company.name + ' Reports',
					subject: company.name + ' - Summary of Charges for ' + moment(billdate).format('MM/DD/YY'),
					template: {
						name: 'invoice',
						data: [
							{
								name: 'content',
								content: html
							}
						]
					}
				};

				await Mail.sendInvoice(null, email);
				return;

			};

		} catch(err){
			// TODO what to do with errors?
			console.log(err);
		}
		return;
	},

	async saveInvoice(connection, invoice, company){
		
		if(!invoice.InvoiceLines.length) {
			console.log("No InvoiceLines found... no need to save")
			return;
		}

		try{
			await invoice.save(connection);
			let activity = new Activity();
			await activity.create(connection, company.id, null, 2, 41, invoice.id);
		} catch(err){
			
			let activity = new Activity();
			await activity.create(connection, company.id, null, 24, 41, invoice.lease_id, JSON.stringify({
				error: err.toString(),
				stack: err.stack
			}));
			throw err;
		}

		return invoice.id;
	},

	async sendInvoiceToGds(cid, company, invoice, lease,property=null){
		let propertyPhone=property.Phones?.length ? property.Phones[0].phone :""
		let propertyEmail=property.Emails?.length ? property.Emails[0].email :""

		let emailContent=""
		let phoneContent=""
		if(propertyEmail){
			emailContent=`email <a href = "mailto:${propertyEmail}">${propertyEmail}</a>`
		}else{
			emailContent=`email`
		}

		if(propertyPhone){
			phoneContent=`phone <a href="tel:${propertyPhone}">${utils.formatPhone(propertyPhone)}</a>`
		}else{
			phoneContent=`phone`
		}
		
		if(invoice.InvoiceLines.length === 0){
			return;
		}

		let utc_offset = invoice.Property.cleanUtcOffset(invoice.Property.utc_offset);
		let auto_pay = lease.PaymentMethods.length?  lease.PaymentMethods.filter(pm => pm.AutoPay) : []
		
		var Ids= [
			{
				"facility": Hashes.encode(lease.Unit.property_id, cid),
				"spaces": [Hashes.encode(lease.unit_id, cid)],
				"spacetypes": [lease.Unit.space_mix_id],
				"pmstype": "leasecaptain",
		  }
		];
		var mapped_ids = await getGDSMappingIds(Ids);
		let space_type_id = mapped_ids.spacetypes[0].gdsid;
		let owner_id = company.gds_owner_id;
		let dueDateFormat = String(invoice.due).split(" ")[0]
		let costs = [];
		for(let i=0; i< invoice.InvoiceLines.length; i++){
			let invoice_line = invoice.InvoiceLines[i];
			costs.push({
				amount: invoice_line.cost * invoice_line.qty,
				description: invoice_line.Service.Product.default_type === 'rent' ? 'rent' : invoice_line.Service.Product.name
			})
		}

		if (invoice.total_discounts) {
			costs.push({
				amount:  invoice.total_discounts * -1,
				description: "Discounts"
			})
		}
		
		costs.push({
			amount: invoice.total_tax,
			description: "tax"
		},
		{
			amount: Math.round(((invoice.sub_total + invoice.total_tax) - invoice.total_discounts) * 1e2) / 1e2 ,
			description: "total due"
		})
		// let phones = contact.Phones.map((a)=>{return {type: "cell", number: a.phone && a.phone.length === 10? `+1${a.phone}`: `+${a.phone}`, description: a.type}}),

		let phone;
		let contact = lease.Tenants[0].Contact;

		if (contact.Phones.length > 0) {
			if (contact.Phones[0].phone.length > 10) {
				phone = contact.Phones[0].phone.substring(1);
			}
			else{
				phone = contact.Phones[0].phone;
			}
			
		}

		let body = {
			interaction_created:false,
			"messages": [
				{
					"from":null,
						"to": [
							{
								"email": contact.email,
								"name": contact.first + " " + contact.last
							}
						],
						"subject": `Invoice Notification - ${dueDateFormat}`
				}
			],
			"facility_id": mapped_ids.facility.gdsid,
			"owner_id": company.gds_owner_id,
			"variables": {
				"template": {
					"tenant_info": { 
						"name": {
							"first": contact.first,
							"last": contact.last
						},
						"phone": phone ? phone : '',
						"email": contact.email
					},
					"invoice_number": invoice.number,
					
					"invoice_date": moment(`${invoice.due} 11:00:00`).utcOffset(utc_offset,true).toISOString(true).split('.')[0]+"Z",
					"copy": `Thank you for doing business with ${company.name}. Your invoice for ${dueDateFormat} is ready and due on ${dueDateFormat}. 
					For questions, please contact us via ${phoneContent} or ${emailContent}
					.  If you're enrolled in AutoPay, no further action is necessary.  If not, please ensure payment by ${dueDateFormat}.
					Thank you for your trust in our self storage services.`,
					"costs": costs,
					"unit_no": lease.Unit.number,
					"spacetype_id": space_type_id,
					"enable_autopay_button": auto_pay.length? false : true,
					"template_name": "future_invoice"
				}
			}
		}
		let result = await Mail.sendInvoiceToGds(body);

	},

	async sendInvoiceToTenant(data) {
		var connection = null;
		try {

			connection = await pool.getConnectionAsync();

			let invoice = new Invoice({id: data.invoice_id});
			await invoice.find(connection);

			let company = new Company({id: data.company_id});
			await company.find(connection);
			
			console.log("Data file received from pdf: ", data.file);
			let attachment = Buffer.from(data.file.data).toString("base64");
			console.log("Attachment from data file recieved from pdf: ", attachment);

			connection.release();
			return Promise.mapSeries(invoice.Lease.Tenants, t => {
				var content = '<h5>Find invoice in attachment</h5>'
				var email = {
					email:  t.Contact.email,
					owner_id: company.gds_owner_id,
					to:     t.Contact.first + ' ' + t.Contact.last,
					subject: 'Invoice Generated for month of ' + moment(invoice.due).format('MMMM'),
					from: company.name + " Payment Center",
					template: {
						name: 'basic-email',
						data: [
							{
								name: 'logo',
								content: company.getLogoPath()
							},
							{
								name: 'headline',
								content: 'Invoice Generated'
							},
							{
								name: 'content',
								content: content
							}]
					},
					company_id: company.id,
					contact_id: t.Contact.id,
					attachments: [
						{
							content_type: "application/pdf",
                            name: data.filename,
							content: attachment
						}
					]
				};
				return Mail.sendBasicEmail(null, email, content);
			});


		} catch(err){
			console.log('Error in sendInvoiceToTenant');
			console.log("---ERROR----");
			console.log(err);
			console.log(err.stack);
			connection.release();
		}
	},


// 	async sendInvoiceToTenant(connection, invoice, billdate, company, admin_id) {
// // send payment receipt
// 			var content = "Your bill for your lease at " + invoice.Lease.Unit.Address.address + ' #' + invoice.Lease.Unit.number + ' ' + invoice.Lease.Unit.Address.city + ' ' + invoice.Lease.Unit.Address.state + " is not";
// 			content += "<br /><br />";
//
// 			content += '<table style="text-align: left; width:100%">';
// 			if(payment.method == 'card'){
// 				content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(paymentMethod.card_type) + " ending in:</td><td>XXXX" + paymentMethod.card_end + "</td></tr>";
//
// 			} else {
// 				content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(paymentMethod.card_type)+ " account ending in:</td><td>XXXX" + paymentMethod.card_end + "</td></tr>";
// 			}
// 			content += "<tr><td>Name On Account:</td><td>" + payment.ref_name + "</td></tr>";
// 			content += "<tr><td>Charge Date:</td><td>" + moment(payment.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + "</td></tr>";
// 			content += "<tr><td>Amount Charged:</td><td>$" + payment.amount + "</td></tr>";
// 			content += '</table>';
//
// 			return Promise.mapSeries(invoice.Lease.Tenants, t => {
// 				var email = {
// 					email:  t.Contact.email,
// 					to:     t.Contact.first + ' ' + t.Contact.last,
// 					subject: 'Payment Received for invoice #' + Hashes.encode(invoice.id),
// 					from: invoice.Company.name + " Payment Center",
// 					template: {
// 						name: 'basic-email',
// 						data: [
// 							{
// 								name: 'logo',
// 								content: invoice.Company.getLogoPath()
// 							},
// 							{
// 								name: 'headline',
// 								content: 'Payment Received'
// 							},
// 							{
// 								name: 'content',
// 								content: content
// 							}]
// 					},
// 					company_id: invoice.Company.id,
// 					contact_id: t.Contact.id
// 				};
//
// 				return Mail.sendBasicEmail(connection, email);
// 			});
// 	},

	async sendToTenants(connection, invoice, billdate, company, admin_id){

		let html = await new Promise((resolve, reject) => {
			jade.renderFile(__dirname + '/../views/invoice.jade', {
				invoice,
				lease: invoice.Lease,
				moment,
				company,
				settings
			}, function(err, html){
				if(err) reject(err);
				return resolve(html);
			});
		});

		for(let i = 0; i < invoice.Lease.Tenants.length; i++ ){
			let tenant = invoice.Lease.Tenants[i];
			let email = {
				email:  tenant.Contact.email,
				to:     tenant.Contact.first + ' ' + tenant.Contact.last,
				admin_id: admin_id,
				contact_id: tenant.Contact.id,
				company_id: company.id,
				from: company.name + ' Reports',
				subject: 'Summary Of Charges for ' + moment(invoice.due).format('MM/DD/YYYY'),
				template: {
					name: 'invoice',
					data: [
						{
							name: 'content',
							content: html
						}
					]
				}
			}

			await Mail.sendInvoice(connection, email)



			return true;
		}


					// emails.push({
					// 	email:  "jeff@h6design.com",
					// 	to:     "Jeff Ryan",
					// 	admin_id: false,
					// 	contact_id: false,
					// 	company_id: company.id,
					// 	from:   company.name + ' Reports',
					// 	subject: 'Summary Of Charges for ' + moment(invoice.due).format('MM/DD/YYYY'),
					// 	template: {
					// 		name: 'invoice',
					// 		data: [
					// 			{
					// 				name: 'logo',
					// 				content: company.getLogoPath()
					// 			},
					// 			{
					// 				name: 'content',
					// 				content: html
					// 			}
					// 		]
					// 	}
					// });
					


	},

	async findAdvanceRentalLeases(connection, property_id, date) {
		return await models.Lease.findAdvanceRentalLeases(connection, property_id, date);
	}
}


module.exports = Charges;
