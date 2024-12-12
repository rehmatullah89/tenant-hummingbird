
var moment      = require('moment');

var fs = require('fs');
var Promise = require('bluebird');


var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var Payments   = require(__dirname + '/../models/payments.js');
var Invoices   = require(__dirname + '/../models/invoices.js');

var Lease =  require(__dirname + '/../classes/lease.js');
var Payment =  require(__dirname + '/../classes/payment.js');
var Invoice =  require(__dirname + '/../classes/invoice.js'); 
var PaymentMethod =  require(__dirname + '/../classes/payment_method.js');
var Contact      = require(__dirname + '/../classes/contact.js');
var Company      = require(__dirname + '/../classes/company.js');

var Property      = require(__dirname + '/../classes/property.js');

var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var QuickBooksRoutines      = require(__dirname + '/../routines/quickbooks.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var Mail = require(__dirname + '/../modules/mail.js');
var Utils = null;
process.nextTick(() => Utils = require("../modules/utils")); 
var pool 		= require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var queue = require(__dirname + '/../modules/queue');

var PaymentObj = {
	output: '',
	logs: [], 
	log: {},
	invoiceLeases: {},
	/* Moved from scheduler,
       TODO: Still needs some refactoring */
	async autoPayRoutine(data, job) {

		var connection = await db.getConnectionByType('write', data.cid);

		let output = '';
		PaymentObj.invoiceLeases = new Set();
		let invoices = [];

		try {
			// var connection = await pool.getConnectionAsync();

			let company = new Company({ id: data.property.company_id });
			await company.find(connection);

			data.company = company;

			PaymentRoutines.output = "AUTOPAYMENT INFO\r\n";
			PaymentRoutines.output += "Date,Company,Property,Num. Autopayments\r\n";

			try {
				this.logs = [];

				await PaymentRoutines.processAutoPayments(connection, data, company, invoices, data.dryrun, job);

			} catch (err) {
				console.log(err);
			}

			try {

				console.log("PaymentObj.invoiceLeases", PaymentObj.invoiceLeases);
				console.log("log", this.logs);

				if(this.logs.length){
					await db.saveData({
						created_at: + new Date(),
						record_type: 'auto-payments',
						property_id: data.property.id,
						dryrun: data.dryrun,
						company_id: data.cid,
						property_name: data.property.name,
						company_name: company.name,
						data: JSON.stringify(this.logs),
						admin: data.admin.first + ' ' + data.admin.last
					})
				}

			} catch (err) {
				console.log("ERROR", err);
			}

		} catch (err) {
			console.log(err);
			console.log(err.stack);
			output += err.toString() + '<br />';
			output += err.stack;
		} finally {

			await Utils.closeConnection(pool, connection);
		}

		return data;
        
	},

	async processAutoPayments(connection, data, company, invoices = [], dryrun, job){

		let property  = new Property({id: data.property.id});
		await property.find(connection);
		data.property = property;

		//find autopay cards with invoices
		let paymentMethods = await property.findAutoPaymentMethodsWithInvoices(connection, data.date);

		console.log("Auto payment methods with Invoices : ", paymentMethods);

		this.output += data.date + ',' +  company.name + ',' + property.name + "," + paymentMethods.length + "\r\n\r\n";

		this.output += "PAYMENT METHODS\r\n";
		for(let i = 0; i < paymentMethods.length; i++){
			
			try {

				this.log = {};
				this.output += "Number,payment Method ID,Name On Card,Card End,Token,Number of Invoices\r\n";
				
				if(paymentMethods[i].invoice_ids) {
					invoices  = JSON.parse(paymentMethods[i].invoice_ids);
				}
	
				console.log("Payment Method Invoices", invoices)

				await this.chargePaymentMethod(connection, paymentMethods[i], i + 1, data, property, company, invoices, dryrun);
				this.output += "\r\nOVER\r\n";
				if(this.log.invoice_applications.length){
					this.logs.push(this.log);
				}

			} catch (err) {
				console.log("Auto payment failed for following payment_method object");
				console.dir(paymentMethods[i]);
				console.log("Auto payment failed Data");
				console.dir(data);
				console.log("Auto payment Error ", err?.stack || err?.msg || err);

				if(!dryrun) {
					Utils.sendLogs({
						event_name: Enums.LOGGING.AUTO_PAYMENT,
						logs: {
							payload: {
								payment_method_obj: paymentMethods[i]
							},
							error: err?.stack || err?.msg || err
						}
					})
				}
			}

			if(job){
				await queue.updateProgress(job, { total: paymentMethods.length, done: i + 1 });
			}
		}
	},

	async chargePaymentMethod(connection, pm, index, data, property, company, invoices, dryrun){

		property.Connections = [];

		let contact = new Contact({id: pm.contact_id});
		await contact.find(connection);
		let paymentMethod = await contact.getPaymentMethod(connection, property, pm.payment_method_id, 'auto', null, null );

		this.log = {
			id: paymentMethod.id,
			name_on_card: paymentMethod.name_on_card,
			card_end: paymentMethod.card_end,
			token: paymentMethod.token,
			invoice_applications: [],
			payment: {}
		};

		this.output += index + "," + paymentMethod.id + "," +  paymentMethod.name_on_card + "," + paymentMethod.card_end +  "," + paymentMethod.token + ",";

		// get leases for this autopay, loop through invoice and find ones on that lease.
		if(invoices && invoices.length > 0) {
			let leases = await paymentMethod.findLeasesToAutoPay(connection, data.date);
			let lease_ids = leases.map(l => l.lease_id);
			invoices = invoices.filter(inv => inv && inv.lease_id && lease_ids.indexOf(inv.lease_id) >= 0);
			console.log("invoices", invoices);
		}

		let {total, invoice_applications } = await this.createAutoPayInvoiceApplications(connection, invoices, paymentMethod,  property, contact, company, dryrun );
		this.log.total = total;
		if(!total) return;

		console.log("Total and invoice_applications", total, invoice_applications)
		await this.autoPayInvoice(connection, data, paymentMethod, invoice_applications, total,  property, contact, company, dryrun);
		
		// All of this logic has been moved to lease.endDelinquencyProcess function
		/*if(!(dryrun || paymentError)) {
			
			let pm = new PaymentMethod({id:  paymentMethod.id})
			let leases = await pm.findLeasesToAutoPay(connection);
			for(let i=0; i<leases.length; i++){
				let lease = new Lease({id: leases[i].lease_id }); 
                await lease.find(connection); 
				await lease.findUnit(connection);
                await lease.getCurrentBalance(connection); 
        
                if( (!lease.end_date || moment(lease.end_date, 'YYYY-MM-DD').format('x') > moment().format('x') )  && lease.balance > 0) continue;  
            
                // end delinquency if there is no balance or if lease is closed
                await lease.getDelinquency(connection, null, { delinquency_statuses: [Enums.DELINQUENCY_STATUS.ACTIVE, Enums.DELINQUENCY_STATUS.PAUSED] }); 
            
                if(lease.Delinquency.id){
                    // We have an active delinquency
                    await lease.endDelinquency(connection);
                }

				//we are updating lease standing in applyToInvoices method.. rest is being done here..
				if(!lease.balance){
					console.log("No outstanding balance for lease => ", lease.id);
					await this.updateAccessStatus(connection,contact,property);

					await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.COLLECTION_CALL, Enums.TASK_TYPE.LEASE);
          			await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, Enums.TASK_TYPE.LEASE);
          			await lease.removeToOverlockFromSpace(connection);

					let overlock = await lease.Unit.getActiveOverlock(connection);
					if(overlock){
                        await lease.Unit.getProperty(connection);
                        await lease.Unit.Property.getAccessControl(connection);

                        // if is Noke, dont create the task, just unlock, and save lease status
                        if(lease.Unit.Property.Access.access_name.toLowerCase() === 'noke'){
                            await lease.Unit.removeOverlock(connection);
                        } else {
                            let already_created = await models.Todo.findTasksByObjectId(connection,lease.id,[Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL],Enums.TASK_TYPE.LEASE);
                            if(!already_created.length){
								let params = {
									property_id: property.id,
									company_id: company.id,
									cid: data.cid
								}
                                TaskEvent.createTask(params, lease.id, Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL, null, 'This event is created from worker server', null, Enums.TASK_TYPE.LEASE);
                            }
                        }
						
                    }
					if (lease.auction_status && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.MOVE_OUT) {
						console.log("Resolving auction related scenarios");
						await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE);
						await lease.removeLeaseAuction(connection);
						await lease.removeAuctionStatus(connection);
					
						let standing;
              			let currentDate = await property.getLocalCurrentDate(connection);
    
              			if (lease.end_date && (moment(lease.end_date).startOf('day') <= moment(currentDate).startOf('day'))) {
                			standing = 'Lease Closed';
              			} else {
                			standing = 'Current';
              			}
              			await lease.updateStanding(connection, standing);
					}
				}
			}
		}*/
	},

	async createAutoPayInvoiceApplications(connection, invoices, paymentMethod, property, contact, company, dryrun){

		let total = 0;
		let invoice_applications = [];
		// this.output += ",INVOICES TO PAY\r\n";
		// this.output += ",Number,Unit Number,Lease Id,Invoice Id,Subtotal,Total Tax,Total Discount,Original Total,Payments Applied,Invoice Balance,Rent To Pay,Other to Pay,Total AutoPayment\r\n";
		for(let i = 0; i < invoices.length; i++) {
			let invoice = {};
			if(invoices[i].id){
				invoice = new Invoice({id: invoices[i].id});
				await invoice.find(connection);
				await invoice.total();

				if(!invoice.balance) {
					this.output += ",No Balance - Skipping";
					console.log("Skipping!");
					continue;
				}
			} else {
				invoice = invoices[i];
			}

			console.log("Going to apply" );

			await paymentMethod.getAutoPayStatus(connection, invoice.lease_id);




			// this.output += "," + (i+1) + "," + invoice.Lease.Unit.number + "," + invoice.Lease.id + "," + invoice.id +  ",";
			// this.output += invoice.sub_total +  ",";
			// this.output += invoice.total_tax + "," ;
			// this.output += invoice.total_discounts +  ",";
			// this.output += (invoice.sub_total + invoice.total_tax - invoice.total_discounts) +  " (" + invoice.total_due + ")" + ",";
			// this.output += invoice.total_payments + ",";
			// this.output += invoice.balance +  ",";

			let payment_total = await paymentMethod.makeAutoPayment(invoice);

			this.log.invoice_applications.push({
				id: invoice.id,
				lease_id: invoice.Lease.id,
				unit_number: invoice.Lease.Unit.number,
				sub_total: invoice.sub_total,
				total_tax: invoice.total_tax,
				total_discounts: invoice.total_discounts,
				original_total: (invoice.sub_total + invoice.total_tax - invoice.total_discounts),
				total_payments: invoice.total_payments,
				balance: invoice.balance,
				rent_to_pay_percent: paymentMethod.AutoPay.rent + "%",
				rent_to_pay_amount: payment_total.rent_payment,
				invoice_rent: invoice.rent_total,
				other_to_pay_percent: paymentMethod.AutoPay.other + "%",
				other_to_pay_amount: payment_total.other_payment,
				invoice_other: invoice.utilities_total,
				payment_total: payment_total.amount
			});


			// this.output += paymentMethod.AutoPay.rent + "% ($" + payment_total.rent_payment + "/" + invoice.rent_total + ")" +  ",";
			// this.output += paymentMethod.AutoPay.other + "% ($" + payment_total.other_payment + "/" + invoice.utilities_total + ")" +  ",";

			console.log("payment_total", payment_total);
			this.output += payment_total.amount ;

			total = +total + +payment_total.amount +  "\r\n";

			invoice_applications.push({
				id: invoice.id,
				lease: invoice.Lease,
				amount: payment_total.amount
			})

			PaymentObj.invoiceLeases.add(invoice.Lease.id);

			this.output +=  "\r\n";
		}

		this.output +=  "\r\n";

		return { total, invoice_applications };

	},

	async autoPayInvoice(connection, data, paymentMethod, invoice_applications, total,  property, contact, company, dryrun ){

		this.output += ",Total Payment,Num Invoices,Payment Status,Transaction ID,Reason,ERR\r\n";
		let payment = new Payment();
		this.output += ",$" +  total +  "," + invoice_applications.length + ",";

		if(dryrun) return;

		await payment.create(connection, {
			amount: total,
			date: data.date,
			property_id: property.id,
			contact_id: contact.id,
			source: 'auto',
			ref_name: contact.first + ' ' + contact.last,
			method: null
		}, paymentMethod, 'auto', null, dryrun);

		payment.payment_remaining = payment.amount;

		let is_err = false;
		try{
			await payment.charge(connection, company.id, data.dryrun, null );
			this.output += payment.status +  "," + payment.transaction_id +    ",\r\n";	
		} catch(err) {
			console.log("ERROR: " +  err.toString());
			this.output += payment.status +  "," + payment.status_desc + ",";
			this.output += "ERROR: " +  err.toString() + "\r\n";
			is_err = true;
		}

		this.log.payment = {
			payment_id: payment.id,
			status: payment.status,
			transaction_id: payment.transaction_id,
			status_desc: payment.status_desc,
		};

		try {
			await payment.applyToInvoices(connection, invoice_applications, is_err);	
		} catch (err) {
			console.log("ERROR: " + err?.toString || err);
		}

		try {
			if(!is_err && process.env.NODE_ENV !== "local") {
				console.log("SENDING MESSAGE", payment);
				await this.sendConfirmationEmail(connection, invoice_applications, payment, paymentMethod, property, contact, company);	
			}
			
		} catch (err) {
			console.log("ERROR: " + err.toString());
		}
		return is_err;
	},

	getPaymentMethods(lease){

		let paymentMethods = lease.PaymentMethods.filter(method => {
			if(method.auto_charge){
				switch(method.type){
					case "card":
						if(!lease.token) throw new Error('This lease is not configured properly to charge this card');
						if(!method.token) throw new Error('This credit card is not configured properly');
						break;
					case "ach":
						if(!lease.achtoken) throw new Error('Missing ACH Lease Token: This lease is not configured properly to charge this ACH account');
						if(!method.token) throw new Error('Missing PaymentMethod Token. This ACH account is not configured properly');
						break;
				}
				return true;
			}
			return false;
		});

		return paymentMethods;

	},

	async processExistingPayments(connection, invoice, company, dryrun, currentPropertyDate){

		let paymentMethods = [];
		this.output += invoice.InvoiceLines.length + ',';
		// this.output += '$' + invoice.subtotal.toFixed(2) + ',';
		this.output += '$' + invoice.total_tax.toFixed(2) + ',';
		this.output += '$' + invoice.total_discounts.toFixed(2) + ',';
		this.output += '$' + invoice.balance.toFixed(2) + ',';


		if(invoice.PaymentsToApply.length && invoice.paymentToApplyTotal){
			this.output += invoice.PaymentsToApply.length + ',$' + invoice.paymentToApplyTotal.toFixed(2)  + ',';

		} else {
			this.output += '0,0,';
			return;
		}

		for(let i = 0; i < invoice.PaymentsToApply.length; i++){
			let apply = invoice.PaymentsToApply[i];
			if(!apply.amount) continue;

			let invoicesPayment = {
				invoice_id: invoice.id,
				payment_id: apply.payment_id,
				date: currentPropertyDate,
				amount: apply.amount
			};

			this.output += '$' + invoicesPayment.amount.toFixed(2);

			// send to ledger app - payment application

			// need to recognize revenue

			// Commented it out after reconsile changes. We need this funciton for dry run logs.
			// if(!dryrun){
			// 	try{
			// 		await Payments.applyPayment(connection, invoicesPayment);
			// 		if (!apply.remaining) {
			// 			await Payments.save(connection, {applied: 1}, apply.payment_id);
			// 		}
			// 		this.output += '(Y)';

			// 		var activity = new Activity();
			// 		await activity.create(connection, company.id, null, 2, 28, apply.payment_id );
			// 	} catch(err){
			// 		this.output +=  '(' + err.toString() + ')';

			// 		var activity = new Activity();
			// 		await activity.create(connection, company.id, null, 24, 28, invoice.lease_id, JSON.stringify({
			// 			invoices_payment: invoicesPayment,
			// 			error: err.toString(),
			// 			stack: err.stack
			// 		}));

			// 	}
			// }  else {
			// 	this.output +=  '(N)';
			// }
			this.output +=  '(N)';
		}
		this.output +=  ',';
	},


    async payInvoice (connection, invoice, company, dryrun, currentPropertyDate){

	    let output = '';
	    let paymentMethods = [];
	    try {
		    paymentMethods = this.getPaymentMethods(invoice.Lease);

	    } catch (err) {
		    output += err.toString();
		    output += err.stack;
		    return output;
	    }

	    output += 'This invoice total is $' + invoice.total_due.toFixed(2) + '. <br />';

	    if(invoice.PaymentsToApply.length){
		    output += invoice.PaymentsToApply.length + ' existing payments totalling $' + invoice.paymentToApplyTotal.toFixed(2)  + ' will be applied to this invoice <br />';
	    }

	    output += "There are " + paymentMethods.length + ' payment methods set up to pay this invoice automatically. <br />';

		if(paymentMethods.length){
            output += 'There is a balance of $' + invoice.balance.toFixed(2) + ' due. <br />';

		    for (let i = 0; i < paymentMethods.length; i++) {
			    let pm = paymentMethods[i];
			    output +=  pm.first + " " + pm.last + " Will Pay $" + pm.total.toFixed(2) + '<br />';
			    if(pm.total <= 0) continue;

				let paymentData = {
				    amount: pm.total,
				    method: pm.type,
				    ref_name: pm.first + ' ' + pm.last,
				    lease_id: pm.lease_id,
				    date: moment().format('YYYY-MM-DD'),
				    source: 'auto',
				    applied: 1
			    };

			    let payment = {};
			    try{
				    payment = new Payment(paymentData);
				    let paymentMethod = new PaymentMethod(pm);

					await paymentMethod.find(connection);
					await payment.setPaymentMethod(paymentMethod);

				    // Charge It!

				    if(!dryrun) {
					    await payment.charge(connection, company.id, dryrun);
					    await payment.save(connection);
					    output += 'Payment of ' + paymentData.amount + ' was successful! ID ' + payment.id + '<br />';
					    output += 'Transaction ID:  ' + payment.transaction_id + '<br />';
				
					    let invoicesPayment = {
						    invoice_id: invoice.id,
						    payment_id: payment.id,
						    date: currentPropertyDate,
						    amount: pm.total
					    };
					    await Payments.applyPayment(connection, invoicesPayment);
					    output += 'Applying $' + invoicesPayment.amount.toFixed(2) + ' was successful <br />';

					    // TODO Emit event
					    // TODO send one message for all payments on a lease
					    await this.sendConfirmationEmail(connection, invoice, payment, paymentMethod);

					    // record activity
					    var activity = new Activity();
					    await activity.create(connection, company.id, null, 2, 29, payment.id);
					    
				    }
			    } catch(err){
				    try{
						console.log("ERR", err);
						console.log("ERR", err);
					    output +=  err.toString() + '<br />';
					    output +=  err.stack + '<br />';
					    var activity = new Activity();
					    await activity.create(connection, company.id, null, 24, 29, invoice.lease_id, JSON.stringify({
						    payment: payment,
						    error: err.toString(),
						    stack: err.stack
					    }));
				    } catch(err){
						console.log("ACTIVITY ERROR", err);
				    }
			    }
		    }
	    }



	    if(!invoice.PaymentsToApply.length){
		    output += 'There are no outstanding payment to apply on this account <br />';
		    return output;
	    }

	    output += 'Applying Payments <br />';

		if(this.Property.id) {
            this.Property = new Property({ id: this.property_id });
        }

	    for(let i = 0; i < invoice.PaymentsToApply.length; i++){
			let apply = invoice.PaymentsToApply[i];
		    let invoicesPayment = {
			    invoice_id: invoice.id,
			    payment_id: apply.payment_id,
			    date: currentPropertyDate,
			    amount: apply.amount
		    };
		    
	        output += 'Trying to apply $' + invoicesPayment.amount.toFixed(2) + '';
		    if(!dryrun){
				try{
					await Payments.applyPayment(connection, invoicesPayment);
				    if (!apply.remaining) {
					    await Payments.save(connection, {applied: 1}, apply.payment_id);
				    }
				    output += ' - Success! <br />';

				    var activity = new Activity();
				    await activity.create(connection, company.id, null, 2, 28, apply.payment_id );
				} catch(err){
					output += ' - ERROR - ';
					output +=  err.toString() + '<br />';

					var activity = new Activity();
					await activity.create(connection, company.id, null, 24, 28, invoice.lease_id, JSON.stringify({
						invoices_payment: invoicesPayment,
						error: err.toString(),
						stack: err.stack
					}));

				}

		    }

		    // TODO Charge outstanding invoices, especially if they have been created in the previous month

	    }


	    return output;

				    // return Promise.mapSeries(invoice.PaymentsToApply, function(apply){
				    //
					 //    // Apply existing payments
				    //
					 //    var invoicesPayment = {
						//     invoice_id: invoice.id,
						//     payment_id: apply.payment_id,
						//     date: moment().format('YYYY-MM-DD'),
						//     amount: apply.amount
					 //    };
				    //
					 //    if(dryrun) return true;
					 //    return Payments.applyPayment(connection, invoicesPayment).then(function(result) {
						//     if (!apply.remaining) {
						// 	    return Payments.save(connection, {applied: 1}, apply.payment_id);
						//     }
						//     return;
				    //
					 //    }).then(() => {
				    //
						//     var activity = new Activity();
						//     return activity.create(connection, company_id, null, 2, 28, apply.payment_id );
				    //
				    //
					 //    }).catch(function(err){
				    //
						//     var activity = new Activity();
						//     return activity.create(connection, company_id, null, 24, 28, invoice.lease_id, JSON.stringify({
						// 	    invoices_payment: invoicesPayment,
						// 	    error: err.toString(),
						// 	    stack: err.stack
						//     }));
					 //    })
				    // });

    },

	async sendResultsEmail(connection, output, company, attachments){

		var email = {
			email:  settings.get_configured_reporting_emails(),
			to:     settings.get_configured_reporting_email_names(),
			subject: 'Autopayment Breakdown for ' + company.name,
			from: "Tenant Payment Center",
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'logo',
						content: company.getLogoPath()
					},
					{
						name: 'headline',
						content: 'Payment Breakdown'
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

	async sendConfirmationEmail(connection, invoices, payment, paymentMethod, property, contact, company){

		if(!contact.email) return;

		// send payment receipt
		var content = "This is a notice that we received the following payment of $" + payment.amount.toFixed(2) + " for your spaces at:<br /><br /><strong>" + property.name + "</strong><br />" + property.Address.address + '<br />' +  property.Address.city + ' ' +  property.Address.state + ' ' +  property.Address.zip;
		content += "<br /><br />";


		content += '<table style="text-align: left; width:100%">';
		if(payment.method == 'card'){
			content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(paymentMethod.card_type) + " ending in:</td><td>XXXX" + paymentMethod.card_end.substr(paymentMethod.card_end.length - 4) + "</td></tr>";

		} else {
			content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(paymentMethod.card_type)+ " account ending in:</td><td>XXXX" + paymentMethod.card_end.substr(paymentMethod.card_end.length - 4) + "</td></tr>";
		}
		content += "<tr><td>Name On Account:</td><td>" + payment.ref_name + "</td></tr>";
		content += "<tr><td>Charge Date:</td><td>" + moment(payment.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + "</td></tr>";
		content += "<tr><td>Amount Charged:</td><td>$" + payment.amount.toFixed(2) + "</td></tr>";
		content += '</table><br /><br />';

		content += '<table style="text-align: left; width:100%">';
		content += '<tr><td style="width: 200px;">Unit Number</td><td>Amount</td></tr>';
		invoices.map(inv => {
			content += '<tr><td style="width: 200px;">' + inv.lease.Unit.number + '</td><td>$'  + inv.amount.toFixed(2) +  '</td></tr>';
		});
		content += '</table>';

		var email = {
			email:  contact.email,
			owner_id: company.gds_owner_id,
			facility_id: property.gds_id,
			to:    	contact.first + ' ' + contact.last,
			subject: 'Payment Received',
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
						content: 'Payment Received'
					},
					{
						name: 'content',
						content: content
					}]
			},
			company_id: company.id,
			contact_id: contact.id
		};

		return Mail.sendBasicEmail(connection, email, content);


	},




//
// console.log("Invoice", {
// 	lease_id: invoice.lease_id,
// 	number: invoice.number,
// 	paid: invoice.paid,
// 	source: invoice.source,
// 	status: invoice.status,
// 	period_end: invoice.period_end,
// 	msg: invoice.msg,
// 	unit: invoice.Lease.Unit.Address.address + ' #' + invoice.Lease.Unit.number,
// 	discounts: invoice.discounts,
// 	total_due: invoice.total_due,
// 	total_tax: invoice.total_tax,
// 	sub_total: invoice.sub_total,
// 	rent_total: invoice.rent_total,
// 	utilities_total: invoice.utilities_total,
// 	totalPayments: invoice.totalPayments,
// 	openPayments: invoice.openPayments,
// 	balance: invoice.balance,
// 	PaymentsToApply: invoice.PaymentsToApply
// });
//
//
// console.log("Pay Method Length", paymentMethods.length);
//
// 		    if(!paymentMethods.length){
// console.log('No payment methods are configured to automatically pay this account');
// console.log("$" + invoice.balance + " is due");
// 				if(invoice.PaymentsToApply.length){
// console.log('There are payments to apply.');
// 				}
// 		        return true;
// 		    }
// console.log("Processing Payment");
// 		    return Promise.mapSeries(paymentMethods, function(pm){
//
// console.log(pm);
// console.log(pm.first + " " + pm.last + " Will Pay $" + pm.total + " for "  + invoice.Lease.Unit.Address.address + " #" + invoice.Lease.Unit.number);
//
//
//
// // Test with Dry Run
// console.log("Lease Id: ", pm.lease_id);
// console.log("PM ID: ", pm.id);
//
// 			    if(pm.total <= 0) return;
//
// 				var paymentData = {
// 					amount: pm.total,
// 					method: pm.type,
// 					ref_name: pm.first + ' ' + pm.last,
// 					lease_id: pm.lease_id,
// 					date: moment().format('YYYY-MM-DD'),
// 					source: 'auto',
// 					applied: 1
// 				};
//
// console.log(paymentData);
// console.log("DRY RUN", dryrun)
// 			    var payment = new Payment(paymentData);
//
// 			    var paymentMethod = new PaymentMethod(pm);
//
// 			    return paymentMethod.find(connection).then(function(paymentMethodRes){
// 				    if(!paymentMethodRes) throw new Error(paymentMethod.msg);
// 				    return payment.setPaymentMethod(paymentMethod);
//
// 			    }).then(function(){
//
// 				    return payment.charge(connection, company_id, dryrun).then(function(result) {
// 					    if (!result) throw new Error(payment.msg);
// 					    if(dryrun) return true;
// 					    return payment.save(connection);
// 				    });
// 			    }).then(function(response) {
// 				    if (!response) throw new Error(payment.msg);
//
//
// 				    // Apply payment just charged
// 				    if(dryrun) return true;
// 				    var invoicesPayment = {
// 					    invoice_id: invoice.id,
// 					    payment_id: payment.id,
// 					    date: moment().format('YYYY-MM-DD'),
// 					    amount: pm.total
// 				    };
// 				    return Payments.applyPayment(connection, invoicesPayment);
//
//
// 			    }).then(function(response) {
// 				    if(dryrun) return true;
//
// 					// send payment receipt
// 				    var content = "This is a notice that we received a the following payment for your lease at:<br />" + invoice.Lease.Unit.Address.address + ' #' + invoice.Lease.Unit.number + ' ' + invoice.Lease.Unit.Address.city + ' ' + invoice.Lease.Unit.Address.state;
// 				    content += "<br /><br />";
//
// 				    content += '<table style="text-align: left; width:100%">';
// 				    if(paymentData.method == 'card'){
// 				        content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(pm.card_type) + " ending in:</td><td>XXXX" + pm.card_end + "</td></tr>";
//
// 				    } else {
// 				        content += '<tr><td style="width: 200px;">' + Utils.capitalizeFirst(pm.card_type)+ " account ending in:</td><td>XXXX" + pm.card_end + "</td></tr>";
//
// 				    }
// 				    content += "<tr><td>Name On Account:</td><td>" + paymentData.ref_name + "</td></tr>";
// 				    content += "<tr><td>Charge Date:</td><td>" + moment(paymentData.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + "</td></tr>";
// 				    content += "<tr><td>Amount Charged:</td><td>$" + paymentData.amount + "</td></tr>";
// 				    content += '</table>';
//
// 				    return Promise.mapSeries(invoice.Lease.Tenants, t => {
// 					    var email = {
// 						    email:  t.Contact.email,
// 						    to:     t.Contact.first + ' ' + t.Contact.last,
// 						    subject: 'Payment Received for invoice #' + Hashes.encode(invoice.id),
// 						    from: invoice.Company.name + " Payment Center",
// 						    template: {
// 							    name: 'basic-email',
// 							    data: [
// 								    {
// 									    name: 'logo',
// 									    content: invoice.Company.getLogoPath()
// 								    },
// 								    {
// 									    name: 'headline',
// 									    content: 'Payment Received'
// 								    },
// 								    {
// 									    name: 'content',
// 									    content: content
// 								    }]
// 						    },
// 						    company_id: invoice.Company.id,
// 						    contact_id: t.Contact.id
// 					    };
//
// 					    return Mail.sendBasicEmail(connection, email);
//
// 				    });
//
// 			    }).then(function(result){
// 				    if(!result) throw new Error(invoice.msg);
//
// 				    if(dryrun) return true;
//
// 				    var activity = new Activity();
// 				    return activity.create(connection, company_id, null, 2, 29, payment.id);
//
// 			    }).catch(function(err){
//
// 				    var activity = new Activity();
// 				    return activity.create(connection, company_id, null, 24, 29, invoice.lease_id, JSON.stringify({
// 					    payment: payment,
// 					    error: err.toString(),
// 					    stack: err.stack
// 				    }))
// 				    .then(() => null);
//
// 			    })
// 		    });
//
// 	    }).then(function(){
//
// 		    if(!invoice.PaymentsToApply.length){
// 				console.log('No outstanding payment to apply on this account');
// 			    return true;
// 		    }
// 		    console.log('Applying payments');
// 		    return Promise.mapSeries(invoice.PaymentsToApply, function(apply){
//
// 			    // Apply existing payments
//
// 			    var invoicesPayment = {
// 				    invoice_id: invoice.id,
// 				    payment_id: apply.payment_id,
// 				    date: moment().format('YYYY-MM-DD'),
// 				    amount: apply.amount
// 			    };
//
// 			    if(dryrun) return true;
// 			    return Payments.applyPayment(connection, invoicesPayment).then(function(result) {
// 				    if (!apply.remaining) {
// 					    return Payments.save(connection, {applied: 1}, apply.payment_id);
// 				    }
// 				    return;
//
// 			    }).then(() => {
//
// 				    var activity = new Activity();
// 				    return activity.create(connection, company_id, null, 2, 28, apply.payment_id );
//
//
// 			    }).catch(function(err){
//
// 				    var activity = new Activity();
// 				    return activity.create(connection, company_id, null, 24, 28, invoice.lease_id, JSON.stringify({
// 					    invoices_payment: invoicesPayment,
// 					    error: err.toString(),
// 					    stack: err.stack
// 				    }));
// 			    })
// 		    });
//
// 	    }).then(function(){
// 		    connection.release();
// 		    return true;
// 	    })
	    // .catch(function(err){
		 //    console.log('********* ERROR ************');
		 //    console.log(invoice);
		 //    console.log(err);
		 //    if(dryrun) return true;
	    //
		 //    var activity = new Activity({
			//     company_id: company_id,
			//     lease_id: invoice.lease_id,
			//     activity_types_id: 1,
			//     status: 0,
			//     read: 0,
			//     details: JSON.stringify({
			// 	    label: "The following error occurred while trying to auto-pay an invoice",
			// 	    error: err.toString(),
			// 	    stack: err.stack
			//     })
		 //    });
		 //    return activity.save(connection).then(function(){
		 //    }).then(function(){
			//     return connection.release();
		 //    });
	    // })
    // },

    processLeasePayment: function(data, pool, Scheduler, currentPropertyDate){
        var connection;
        var lease_id = data.id;
        var company_id = data.company_id;

        var lease = {};
        var company = {};
        var paymentMethod = {};
        var payments = [];
        var payment = {};
        var totalToCharge = 0;
        var qb = 0;
        var paidInvoices = [];

        var paymentMethods = [];

        return db.getConnectionByType('write', data.company_id).then(function(conn) {
            connection = conn;
            
            return connection.beginTransactionAsync();
        }).then(function() {

            lease = new Lease({
                id: lease_id
            });

            return lease.find(connection).then(function(){
                return lease.findOpenInvoices(connection).then(function(invoices){
                    lease.Invoices = invoices;
                    lease.values();
                    return true;
                })
            })

        }).then(function(openInvoicesRes){

            if(!openInvoicesRes) throw Error(lease.msg);

            paymentMethods = lease.PaymentMethods.filter(function(method){
                if( method.auto_charge ){
                    switch(method.type){
                        case "card":
                            if(!lease.token) throw new Error('This lease is not configured properly to charge this card');
                            if(!method.token) throw new Error('This credit card is not configured properly');
                            break;
                        case "ach":
                            if(!lease.achtoken) throw new Error('This lease is not configured properly to charge this ACH account');
                            if(!method.token) throw new Error('This ACH account is not configured properly');
                            break;
                        case "check":
                            throw new Error('Could not auto charge this account. Check payments cant be used to auto pay. Please process this payment manually');
                            break;
                    }
                    return true;
                }
                return false;
            });

            if(!paymentMethods.length) throw new Error('No payment methods are configured to automatically pay this account');

            // End Testing
            var chargeDetails = {};
            var invoicetotal = 0;
            var breakdown = 0;

            lease.Invoices.forEach(function(invoice){
                invoicetotal += (invoice.totalDue * 100) - (invoice.totalPayments * 100);

                paidInvoices.push(Hashes.decode(invoice.id));

                breakdown = Math.floor(invoicetotal / paymentMethods.length);

                paymentMethods.forEach(function(paymethod, i){

                    chargeDetails[paymethod.id] = chargeDetails[paymethod.id] || {};
                    chargeDetails[paymethod.id].Invoices = chargeDetails[paymethod.id].Invoices || {};
                    chargeDetails[paymethod.id].total = chargeDetails[paymethod.id].total || 0;

                    if(i == paymentMethods.length - 1 ){
                        chargeDetails[paymethod.id].Invoices[invoice.id] = invoicetotal;
                        chargeDetails[paymethod.id].total += invoicetotal
                    } else {
                        chargeDetails[paymethod.id].Invoices[invoice.id] = breakdown;
                        chargeDetails[paymethod.id].total += breakdown;
                    }

                    invoicetotal -= breakdown;

                })
            });

            var payment_method_id;

            return Promise.mapSeries(Object.keys(chargeDetails), function(pm) {

                payment_method_id = Hashes.decode(pm)[0];

                payment = new Payment({
                    amount: chargeDetails[pm].total / 100,
                    date: moment().format('YYYY-MM-DD'),
                    source: 'auto',
                    applied: 1
                });

                paymentMethod = new PaymentMethod({
                    id: payment_method_id
                });

                return paymentMethod.find(connection).then(function () {
                    
                    payment.setPaymentMethod(paymentMethod);

                    return payment.charge(connection, company_id).then(function(result){
                        if(!result) throw new Error(payment.msg);

                        return payment.save(connection);
                    }).then(function(response){
                        if(!response) throw new Error(payment.msg);
				
                        return Promise.mapSeries(Object.keys(chargeDetails[pm].Invoices), function(inv) {

                            var invoice_id = Hashes.decode(inv)[0];

                            var invoicesPayment = {
                                invoice_id: invoice_id,
                                payment_id: payment.id,
                                date: currentPropertyDate,
                                amount: chargeDetails[pm].Invoices[inv] / 100
                            };

                            return Payments.applyPayment(connection, invoicesPayment).then(function(result){
                                if(!result) throw new Error(invoice.msg);

                                var activity = new Activity({
                                    company_id: company_id,
                                    lease_id: lease_id,
                                    activity_types_id: 1,
                                    status: 1,
                                    read: 0,
                                    details: JSON.stringify({
                                        payment_id: payment.id || null,
                                        invoice_id: invoice_id || null
                                    })
                                });
                                return activity.save(connection);
                            })
                        })
                    });

                }).catch(function(err){
                    console.log('*********************');
                    console.log(err);
                    console.log(err.stack);
                    var activity = new Activity({
                        company_id: company_id,
                        lease_id: lease_id,
                        activity_types_id: 1,
                        status: 0,
                        read: 0,
                        details: JSON.stringify({
                            label: "The following error occurred while trying to auto-pay an invoice",
                            error: err.toString(),
                            stack: err.stack
                        })
                    });
                    return activity.save(connection);

                })

            }).then(function(results) {
                //Todo update so that each invoice is marked properly as paid
                return Promise.mapSeries(paidInvoices, function(inv_id) {
                    return Invoices.saveInvoice(connection, {paid: 1}, inv_id);
                }).catch(function(err){
                    console.log(err);
                    console.log(err.stack);
                })
            }).then(function(results) {
                return true;
            }).catch(function(err){
                console.log(err);
                console.log(err.stack);
                throw new Error(err);
            });
/*
        }).then(function(result){


            // Upload to Quickbooks if needed
            qb = new QuickBooks(company_id);
            return qb.init(connection).then(function(qbConnectRes) {

                if(!qb.isConfigured) return true;

                var jobParams = [];
                payments.forEach(function(p){
                    jobParams.push({
                        category: 'quickbooks',
                        data: {
                            id: p.id,
                            action: 'send',
                            label: 'payment',
                            company_id: company_id
                        }
                    });
                });

                return Scheduler.addJobs(jobParams, function(err){
                    if(err) console.log(err);
                    return true;
                });

            });
*/
        }).then(function(result){
            console.log(Hashes.encode(data.lease_id));
            return connection.commitAsync();
        }).then(function(result){

            connection.release();
            console.log(result);

            return {
                status: true,
                data: result
            }

        }).catch(function(err){

            console.log(err);
            console.log(err.stack);

            connection.rollbackAsync().then(function(){

                var activity = new Activity({
                    company_id: company_id,
                    lease_id: lease_id,
                    activity_types_id: 1,
                    status: 0,
                    read: 0,
                    details: JSON.stringify({
                        label: "The following error occurred while trying to auto-pay an invoice",
                        error: err.toString(),
                        stack: err.stack
                    })
                });
                return activity.save(connection);

            }).then(function(){
                return {
                    status: false,
                    msg: err.toString()
                };
            })


        });
    },
	async updateAccessStatus(connection,contact,property){

	 	await contact.findAccessCredentials(connection, property);
		try{
			if(contact.Access && contact.Access.status === "SUSPENDED") {
				await property.Access.restoreUser(contact.id);
			}
		}catch(err){
			console.log("ERROR IN ACCESS UPDATE",err)
		}
	},
	
	async configureContactTokens(data){
		try{
			let {cid, company_id, dry_run} = data;
			var connection = await db.getConnectionByType('write', cid);
			await connection.beginTransactionAsync();
			let contactWithTokens = [];
			let contactTokens;
			//collecting contacts with double tokens
			let duplicateContactTokens = await models.Contact.getDuplicateContactTokens(connection, company_id);
			//collecting contacts with single tokens
			let singlecontactTokens = await models.Contact.getSingleContactTokens(connection, company_id);
			contactTokens = [...duplicateContactTokens, ...singlecontactTokens];
			for(let i = 0 ; i < contactTokens?.length ; i++)
			{
	
				let datainfo = {};
				let property = new Property({id: contactTokens[i].property_id});
				
				let payment_method
				try{
					payment_method = await property.getPaymentMethod(connection, 'card');
				}catch(err){
					console.log("Connection information not found")
				}
				if(payment_method){
					let customerProfile = await payment_method.getCustomerProfileWithProfileId(connection,contactTokens[i].token);
					if (customerProfile){
						let paymentProfiles = customerProfile.profile.paymentProfiles;
						if (paymentProfiles){
							datainfo = {
								contact_token: contactTokens[i],
								customer_profile: paymentProfiles,
							}
							for(let j = 0 ; j < paymentProfiles.length; j++){
								let customer_payment_method = await models.Payment.findPaymentMethodByToken(connection,paymentProfiles[j].customerPaymentProfileId);
								datainfo = {
								...datainfo,
								customer_payment_profile : {
									payment_profile_id : paymentProfiles[j].customerPaymentProfileId,
									payment_method: customer_payment_method
								}
								}
								if(customer_payment_method){
								let data = {
									contact_token_id: contactTokens[i]?.id,
									payment_method_id:  customer_payment_method?.id
								}
								if(!dry_run){
									await models.Payment.saveContactTokenPaymentMehtod(connection, data);
								}
								}else{
								console.log("Customer Payment method not exist");
								}
							}
							contactWithTokens.push(datainfo)
						}else{
							console.log(`payment profile not exist for ${contactTokens[i].token}`)
						}

					}else{
						console.log(`Custome profile not exist for ${contactTokens[i].token}`)
					}
				}else {
					console.log("Payment method not found")
				}

			}
			await connection.commitAsync();

		}catch(err){
			console.log("err", err);
			await connection.rollbackAsync();
		}


	},
	
	async adjustReserveBalance(data, job){
		try{
			let { cid, property_id, contact_id, company_id } =  data
			var connection = await db.getConnectionByType('write', cid );
			let open_payments = await models.Payment.getOpenPayments(connection, { company_id, property_id, contact_id, active_lease: true, affected_lease: true });

			if(open_payments && open_payments.length){
				for(let i = 0; i < open_payments.length; i++){
					let open_payment = open_payments[i];

					if(open_payment.remaining > 0 && open_payment.affected_lease_ids){
						try{

							let payment = new Payment( {id: open_payment.payment_id} );
							await payment.find(connection);
							payment.total_applied = open_payment.applied;
							payment.payment_remaining = open_payment.remaining;
							let affected_leases = open_payment.affected_lease_ids.split(',');
							let date_wise_allocation = open_payment.date_wise_capacity ? JSON.parse(open_payment.date_wise_capacity) : [];

							await connection.beginTransactionAsync();
							await payment.applyOpenAmount(connection, { company_id, active_leases: affected_leases, date_wise_allocation });
							await connection.commitAsync();

							for(let i = 0; i < affected_leases.length; i++) {
								const lease = new Lease({ id: affected_leases[i] });
								await lease.getCurrentBalance(connection); 
								if (lease.balance <= 0) {
									console.log('Ending delinquency after applying open balance');
									await lease.endDelinquencyProcess(connection);
								}
							}
 						} catch(err) {
							await connection.rollbackAsync();
							console.log(`Apply Open payment failed for company: ${company_id}, payment: ${open_payment.payment_id} `, err);
							console.log(err.stack);
						}
					}

					if(job){
						await queue.updateProgress(job, { total: open_payments.length, done: i + 1 });
					}
				}
			}

		} catch (err) {
            console.log('Adjust Open Payments routine error: ', err);
            console.log(err.stack);
        } finally {
			await db.closeConnection(connection);
        }		
	},
	async configureContactTokens(data){
		try{
			let {cid, company_id, dry_run} = data;
			var connection = await db.getConnectionByType('write', cid);
			await connection.beginTransactionAsync();
			let contactWithTokens = [];
			let contactTokens;
			//collecting contacts with double tokens
			let duplicateContactTokens = await models.Contact.getDuplicateContactTokens(connection, company_id);
			//collecting contacts with single tokens
			let singlecontactTokens = await models.Contact.getSingleContactTokens(connection, company_id);
			contactTokens = [...duplicateContactTokens, ...singlecontactTokens];
			for(let i = 0 ; i < contactTokens?.length ; i++)
			{
	
				let datainfo = {};
				let property = new Property({id: contactTokens[i].property_id});
				
				let payment_method
				try{
					payment_method = await property.getPaymentMethod(connection, 'card');
				}catch(err){
					console.log("Connection information not found")
				}
				if(payment_method){
					let customerProfile = await payment_method.getCustomerProfileWithProfileId(connection,contactTokens[i].token);
					if(customerProfile)
					{
						let paymentProfiles = customerProfile.profile.paymentProfiles;
						if (paymentProfiles){
							datainfo = {
								contact_token: contactTokens[i],
								customer_profile: paymentProfiles,
							}
							for(let j = 0 ; j < paymentProfiles.length; j++){
								let customer_payment_method = await models.Payment.findPaymentMethodByToken(connection,paymentProfiles[j].customerPaymentProfileId);
								datainfo = {
								...datainfo,
								customer_payment_profile : {
									payment_profile_id : paymentProfiles[j].customerPaymentProfileId,
									payment_method: customer_payment_method
								}
								}
								if(customer_payment_method){
								let data = {
									contact_token_id: contactTokens[i]?.id,
									payment_method_id:  customer_payment_method?.id
								}
								if(!dry_run){	
									let isExist = await models.Payment.findIsExistContactTokenPaymentMehtod(connection, data)
									if(!isExist){
										await models.Payment.saveContactTokenPaymentMehtod(connection, data);
									}else{
										console.log("Payment method token already exists")
									}		
								}
								}else{
									console.log("Customer Payment method not exist");
								}
							}
							contactWithTokens.push(datainfo)
						}else{
							console.log(`payment profile not exist for ${contactTokens[i].token}`)
						}
					}
					else{
						console.log("Customer profile not exist");
					}

				}else {
					console.log("Payment method not found")
				}

			}
			await connection.commitAsync();

		}catch(err){
			console.log("err", err);
			await connection.rollbackAsync();
		}


	},
	async settlePayment(data){
		try{
			let { cid, property_id, lease_id  } =  data;
			var connection = await db.getConnectionByType('write', cid );

			let oldest_open_invoices = await Payment.findOldestOpenInvoicesWithPayments(connection, { property_id, lease_id});
			if(oldest_open_invoices && oldest_open_invoices.length){
				
				for(let i = 0; i < oldest_open_invoices.length; i++){
					
					try{

						await connection.beginTransactionAsync();
						let open_invoice = oldest_open_invoices[i];
						let invoices = open_invoice.invoices;
						let lease_invoices_payments = [];

						console.log(`Processing lease => ${open_invoice.lease_id}  Invoices => ${invoices.length}`);

						for(let j=0; j < invoices.length; j++) {
							let inv = new Invoice({ id: invoices[j].id });
							await inv.findPayments(connection);
							let invoice_payment = inv.Payments;
							let delete_ipb = [], update_ipb = [];

							if(invoice_payment.length) {
								const invoice_payment_group = invoice_payment.filter(x=>x.amount > 0).reduce((acc, curr) => {
									if(!acc[curr.payment_id]) acc[curr.payment_id] = [];
									acc[curr.payment_id].push(curr);
									return acc;
								},{});

								for(let key in invoice_payment_group) {
									let applied_amount = invoice_payment_group[key].map(x=> x.amount).reduce((t,x) => (t + x || 0));
									lease_invoices_payments.push({
										lease_id: invoices[j].lease_id,
										payment_id: key,
										invoice_due: invoices[j].due,
										payment_date: invoice_payment_group[key][0].date,
										applied_amount
									})
								}
							}

							for(let k=0; k<invoice_payment.length; k++){
								let ip = invoice_payment[k];
								let ipb = await models.Payment.getAllBreakdowns(connection, ip.payment_id,ip.invoice_id);
								let refunds_ipb = ipb.filter(x=> x.refund_id);
								let non_refunds_ipb = ipb.filter(x=> x.refund_id === null);

								if(refunds_ipb.length === 0) {
									delete_ipb.push(...non_refunds_ipb.map(x=> ({ id: x.id, invoice_payment_id: x.invoice_payment_id })));
								} else {

									let refunds_ipb_sum = refunds_ipb.map(x=> x.amount).reduce((t,x) => (t + x || 0));
									let non_refunds_ipb_sum = non_refunds_ipb.map(x=> x.amount).reduce((t,x) => (t + x || 0)); 

									let diff = non_refunds_ipb_sum + refunds_ipb_sum;
									if((diff) > 0){
										if(non_refunds_ipb_sum > (-1 * refunds_ipb_sum)){
											update_ipb.push({
												id: non_refunds_ipb[0].id,
												amount: (-1 * refunds_ipb_sum),
												date: non_refunds_ipb[0].date,
												effective_date: non_refunds_ipb[0].effective_date,
												invoice_payment_id: non_refunds_ipb[0].invoice_payment_id
											});
											if(refunds_ipb.length > 1){
												delete_ipb.push(...non_refunds_ipb.filter(x=>x.id !== non_refunds_ipb[0].id).map(x=> ({ id: x.id, invoice_payment_id: x.invoice_payment_id })));
											}
										}
									}
								}
							}
							console.log(`Un appling payments on invoice => ${inv.id}`);
							await Invoice.deleteAndUpdateInvoicePaymentBreakDowns(connection, inv.id, delete_ipb,update_ipb);
						}

						if(lease_invoices_payments.length > 0)	Payment.applyLeaseOldestPaymentsToInvoice(connection, open_invoice.lease_id ,lease_invoices_payments);
					
						console.log(`Processing lease => ${open_invoice.lease_id} is finished.`);
						await connection.commitAsync();

					} catch(err) {
						await connection.rollbackAsync();
						console.log('Error in settle payment at',JSON.stringify(oldest_open_invoices[i]));
						console.log('settlePayment lease level error: ', err);
						console.log(err.stack);
						
					}

				}
			}

			console.log(`Processing is completed`);

		} catch (err) {
            console.log('settlePayment routine error: ', err);
            console.log(err.stack);
			
        } finally {
			await db.closeConnection(connection);
        }
	}
};




module.exports = PaymentObj;
var PaymentRoutines = require(__dirname + '/../routines/payment_routines.js');
var Todo      = require(__dirname + '/../classes/todo.js');
var TaskEvent 	  = require(__dirname + '/../events/tasks.js');
var Enums = require(__dirname +'/../modules/enums.js');
var models = require(__dirname + '/../models/index.js')

