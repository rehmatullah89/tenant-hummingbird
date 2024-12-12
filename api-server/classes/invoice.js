"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');

var QB = require('node-quickbooks');
var validator = require('validator');
var moment = require('moment');
const contact = require('../models/contact');
var e  = require(__dirname + '/../modules/error_handler.js');
const clsContext = require('../modules/cls_context');
const invoiceNumberGenerator = require('../modules/invoice_number_generator');
var Enums = require(__dirname + '/../modules/enums.js');

class Invoice {

	constructor(data){

		data = data || {};

		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.property_id = data.property_id || null;
		this.contact_id = data.contact_id || null;
		this.number = data.number || null;
		this.date = data.date || moment().format('YYYY-MM-DD');
		this.due = data.due || moment().format('YYYY-MM-DD');
		this.paid = data.paid || 0;
		this.qboPromise = {};
		this.qb_id = data.qb_id || null;
		this.type = data.type || 'manual';
		this.status = data.status || 1;
		this.period_start = data.period_start || moment().format('YYYY-MM-DD');
		this.period_end = data.period_end || moment().format('YYYY-MM-DD');
		this.total_amt = data.total_amt || 0;
		this.total_tax = data.total_tax || 0;
		this.total_discounts = data.total_discounts || 0;
		this.balance = data.balance || 0;
		this.reissued_from = data.reissued_from || null;
		this.adjusted_to = data.adjusted_to || null;
		this.adjusted_from = data.adjusted_from || null;
		this.msg = '';
		this.InvoiceLines = [];
		this.Charges = []; // For API
		this.Lease = {};
		this.Property = {};
		this.Contact = {};
		this.Payments = [];
		this.Unit = {};
		this.company_id = data.company_id || null;
		this.discounts = {};
		this.total_due = 0;
		this.total_tax = 0;
		this.sub_total = 0;
		this.rent_total = 0;
		this.utilities_total = 0;
		this.total_payments = 0;
		this.open_payments = 0;
		this.balance = 0;
		this.void_date = null;
		this.voided_at = null;
		this.voided_by_contact_id = null;
		this.created_by = data.created_by || null;
		this.apikey_id = data.apikey_id || null;
		this.effective_date = null;

		this.PaymentsToApply = [];
		this.ReissuedFrom = {};
		this.ReissuedTo = {};

		return this;
	}

	find(connection, payload = {}) {
		const { find_property_products = false } = payload;
		if (!this.id) e.th(500, "Invoice ID not set");

		return models.Billing.findInvoiceById(connection, this.id)
			.then(invoice => {

				if(!invoice) e.th(404, "invoice Not found");

				this.lease_id = invoice.lease_id;
				this.property_id = invoice.property_id;
				this.contact_id = invoice.contact_id;
				this.number = invoice.number;
				this.date = invoice.date;
				this.due = invoice.due;
				this.status = invoice.status;
				this.period_start = invoice.period_start;
				this.period_end = invoice.period_end;
				this.paid = invoice.paid;
				this.qb_id = invoice.qb_id;
				this.type = invoice.type;
				this.total_amt = invoice.total_amt;
				this.total_tax = invoice.total_tax;
				this.total_discounts = invoice.total_discounts;
				this.total_payments = invoice.total_payments;
				this.sub_total = invoice.subtotal;
				this.balance = invoice.balance;
				this.void_date = invoice.void_date;
				this.voided_at = invoice.voided_at;
				this.voided_by_contact_id = invoice.voided_by_contact_id;
				this.effective_date = invoice.effective_date;
				this.reissued_from = invoice.reissued_from;
				// TODO Single concern - remove this..

				return this.findInvoiceLines(connection, { property_id: find_property_products ? invoice.property_id : null }).then(() => {
					if(this.lease_id){
						return this.findLease(connection);
					}
					// if (this.contact_id) {
					// 	return this.findContact(connection);
					// }
				});


			// TODO Single concern - remove this..
			}).then(() => this.findPayments(connection))


	}

	findPayments(connection){

		return models.Payment.findPaymentsByInvoiceId(connection, this.id).then(payments => {
			this.Payments = payments;
			return true;
		})

	}

	addLine(line){

		if(this.company_id != line.Product.company_id){
			e.th(403,'Invalid company id');
		}
		this.InvoiceLines.push(line);
		return Promise.resolve()
	}

	findInvoiceLines(connection, payload = {}){
		const { property_id } = payload;
		if (!this.id) e.th(500, "Invoice ID not set")
		this.InvoiceLines = [];
		return models.Billing.findInvoiceLinesByInvoiceId(connection, this.id).map(line => {
			var invoiceLine = new InvoiceLine(line);
			return invoiceLine.find(connection, { property_id })
				.then(() => {
					this.InvoiceLines.push(invoiceLine);
					return true;
				})
		})
	}

	async findContactByLeaseId(connection, company_id){
		if(!this.lease_id) e.th(500, "lease id missing");
		let contacts= await new models.Contact.findByLeaseId(connection, this.lease_id)
		if(contacts.length > 0) {
			let contact = new Contact({id: contacts[0].id});
			await contact.find(connection);
			await contact.getPhones(connection)
			await contact.getLocations(connection)
			this.Contact = contact
		}
	}

	async findContact(connection, company_id){
    if(!this.contact_id) e.th(500, "contact id missing");
    this.Contact = new Contact({id: this.contact_id});
    await this.Contact.find(connection, company_id);
		await this.Contact.getLocations(connection);
	}

	async findProperty(connection, company_id, loggedInUserId, permissions = [], api = {}){
		if(!this.property_id) e.th(500, "property id missing");
		this.Property = new Property({id: this.property_id});
		await this.Property.find(connection);
		await this.Property.verifyAccess({connection, company_id, contact_id: loggedInUserId, permissions, api});
		await this.Property.getAddress(connection);
		await this.Property.getPhones(connection);
	}


	// TODO remove additional calls here. Make separate methods.
	findLease(connection){
		var lease = new Lease({id: this.lease_id});
		return lease.find(connection)
			.then(() => lease.getTenants(connection))
			.then(() => lease.findUnit(connection))
			.then(() => lease.getActivePaymentCycle(connection))
			.then(() => {
				this.Lease = lease
				return true
			});
	}

	async findUnit(connection){
		if(this.lease_id) {
			let unit = await models.Invoice.findUnit(connection, this.lease_id);
			this.Unit = unit;
		}
	}

	async getMaxInvoiceNumber (connection, company_id){
		let num = await models.Billing.findMaxInvoiceNumber(connection, company_id);
		return num ? parseInt(num) : 99;
	}

	getDueDate(connection, company_id){
		var _this = this;
		return Promise.resolve().then(function(){
			// return models.Billing.findMaxInvoiceNumber(connection, company_id);
		});
	}

	validate(connection){

		var error = false;
		return Promise.resolve().then(() => {
			if(this.lease_id && !validator.isInt(this.lease_id + '')) error = 'Lease Id must be an integer or be null';

			if(this.property_id && !validator.isInt(this.property_id + '')) error = 'Property Id must be an integer or be null';

			if(!this.property_id && !this.lease_id) error = 'Property id or Lease id must not be empty';

			if(this.contact_id && !validator.isInt(this.contact_id + '')) error = 'Contact ID missing';

			if(!this.contact_id && !this.lease_id) error = 'Contact Id or Lease id must not be empty';

			if(!validator.isNumeric(this.number + '')) error = 'Invoice number must be numeric';

			if(!validator.isDate(this.date + '')) error = 'Date must be a date';

			if(!validator.isDate(this.due + '')) error = 'Due must be a date';
		
			// if(this.due < this.date)  error = 'Due date must be on or after invoice date.';
			//if(moment(this.due).isBefore(this.date, 'day')) error = 'Due date must be on or after invoice date.';

			if(error) {
				e.th(400, error);
			}
			return this.validateUniqueNumber(connection)
		})

	}


	async save(connection){
		if(!this.date) this.date = moment().format('YYYY-MM-DD');
		if (!this.number){
			this.number =  await invoiceNumberGenerator.generate(connection.cid, this.company_id);
		}

		if(!this.id) {
			if(!this.property_id){ 
				let property = await models.Lease.findProperty(connection, this.lease_id);
				this.property_id = property.id
			}

			if(!this.Property || !this.Property.id) this.Property = new Property({ id:this.property_id });	
			this.effective_date = await this.Property.getEffectiveDate(connection);
		}

		await this.validate(connection);
      	// TODO is this necessary?  We are triggering updated in db table
		await this.total();
		var save = {
			lease_id: this.lease_id,
			date: this.date,
			due: this.due,
			property_id: this.property_id,
			contact_id: this.contact_id,
			period_start: this.period_start,
			period_end: this.period_end,
			number: this.number,
			type: this.type,
			status: this.status,
			created_by: this.created_by,
			apikey_id: this.apikey_id,
			reissued_from: this.reissued_from,
			adjusted_to: this.adjusted_to,
			adjusted_from: this.adjusted_from,
			...(!this.id && {effective_date: this.effective_date}),
			// total_amt: this.total_payments,
			// total_tax: this.total_tax,
			// total_discounts: this.discounts,
			// balance: this.balance
		};
		
		let result = await models.Invoice.saveInvoice(connection, save, this.id);

		if(!this.id) clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, { event_id: Enums.ACCOUNTING.EVENTS.GENERATING_INVOICE, invoice_id: result.insertId, property_id: this.property_id });

		if(this.id){
			await this.killInvoiceParts(connection);
		}
      	this.id = (result.insertId) ? result.insertId : this.id;

		for(let i = 0; i  < this.InvoiceLines.length; i++){
			this.InvoiceLines[i].invoice_id = this.id;
			this.InvoiceLines[i].id = null
			await this.InvoiceLines[i].save(connection);
		}
	}

	async killInvoiceParts(connection) {
		if (!this.id) return Promise.resolve();
		return await models.Invoice.deleteInvoiceLines(connection, this.id);
	}

	sendToQuickbooks(){
		//  Check if QuickBooks is set up
		// create job to transfer to QuickBooks.
		return true;
	}

	updatePaid(connection) {
		var _this = this;
		var totalPaid = 0;

		return Promise.resolve().then(function() {
			if(!_this.id) throw new Error("Invoice id not set");
			var totalBilled = _this.getTotal();
			_this.AppliedPayments.forEach(function (payment) {
				totalPaid += (payment.amount * 100)
			});
			if (totalBilled == (totalPaid / 100)) {
				return models.Invoice.saveInvoice(connection, {paid: 1}, _this.id);
			} else {
				return models.Invoice.saveInvoice(connection, {paid: 0}, _this.id);
			}
		}).then(function(result){
			return true;
		}).catch(function(err){
			_this.msg = err.toString();
			return false;
		});
	}

	total (){

	  	if(this.id){
			this.InvoiceLines.forEach(line => line.calculateLineTotal());
			this.total_due = Math.round((this.sub_total + this.total_tax) * 1e2) / 1e2;
			this.discounts = this.total_discounts;
			
			for(var d in this.discounts ){
				this.discounts[d].total = ( this.discounts[d].total/100 ).toFixed(2)
			}
			
			this.balance = Math.round( (this.total_due - this.total_payments - this.total_discounts) * 1e2) / 1e2;
			
			if(this.balance <= 0){
				this.paid = 1;
			}
			return Promise.resolve();
		} else {
				// if there is no id, we have to calculate ourselves
			this.total_payments = 0;
			this.InvoiceLines.forEach(line => line.calculateLineTotal());

			//totalDue = subTotal + totalTax;
			this.sub_total = Math.round(this.InvoiceLines.reduce( (a,line) => a + line.subtotal, 0) * 1e2) / 1e2;
			this.total_tax = Math.round(this.InvoiceLines.reduce( (a,line) => a + line.totalTax, 0)  * 1e2) / 1e2;
			this.total_due = Math.round((this.sub_total + this.total_tax) * 1e2) / 1e2;
			
			

			this.discounts = Math.round(this.InvoiceLines.reduce( (a,line) => a + line.totalDiscounts, 0)  * 1e2) / 1e2;

			this.utilities_total = Math.round(this.InvoiceLines.reduce( (a,line) => {
				if(line.Product.default_type === 'rent') return a;
				return a + line.total;
			}, 0)  * 1e2) / 1e2;

			this.rent_total = Math.round(this.InvoiceLines.reduce( (a,line) => {
				if(line.Product.default_type !== 'rent') return a;
				return a + line.total;
			}, 0)  * 1e2) / 1e2;


			for(var d in this.discounts ){
				this.discounts[d].total = ( this.discounts[d].total/100 ).toFixed(2)
			}

		

			this.Payments.forEach(payment => {
				this.total_payments += payment.amount;
			});

			this.total_payments =  Math.round(this.total_payments * 1e2) / 1e2;

			var balance = this.total_due - this.total_payments - this.discounts;
			

			this.total_discounts = Math.round( this.discounts * 1e2) / 1e2;

			this.balance = Math.round(balance * 1e2) / 1e2;

			if(this.balance <= 0){
				this.paid = 1;
			}

			return Promise.resolve();
		}
	}

	removeDiscounts(){
		this.total_discounts = 0;
		for(let i = 0; i < this.InvoiceLines.length; i++){

			this.InvoiceLines[i].totalDiscounts = 0;
			this.InvoiceLines[i].DiscountLines = [];
			this.InvoiceLines[i].DiscountTotals = [];
		}
		return; 
	}

	prorate(amt, period_start, period_end, lease_start, lease_end ){

		var activeServiceStart = (lease_start > period_start)? lease_start: period_start;
		var activeServiceEnd = (!lease_end || lease_end > period_end)? period_end: lease_end;
		var totalDaysInBillingPeriod = period_end.diff(period_start, 'days') + 1; // this bills for the current day
		var totalDaysActiveService = activeServiceEnd.diff(activeServiceStart, 'days') + 1;
		var prorateMultiplier = totalDaysActiveService / totalDaysInBillingPeriod;
		prorateMultiplier = prorateMultiplier || 1;
		var proratedRent = Math.round((amt * prorateMultiplier)* 1e2) / 1e2;
		return (proratedRent>0)? proratedRent : 0;

	}

	async makeFromServices(connection, services, lease, period_start, period_end, discounts = [], company_id, should_fetch_discounts = true, payload = {}) {
		discounts = discounts || [];
		this.period_start = period_start.clone().format('YYYY-MM-DD HH:mm:ss');
		this.period_end = period_end.clone().format('YYYY-MM-DD HH:mm:ss');
		
		if (should_fetch_discounts 
			// && !discounts.length
		) {
			// TODO check this now! Add multiple Discounts..
			let discountList = await models.Promotion.findActiveDiscounts(connection, this.lease_id, period_start.clone().format('YYYY-MM-DD'));
		
			
			for (let i = 0; i < discountList.length; i++) {
				let discount = new Discount({id: discountList[i].id});
				await discount.find(connection);
				discounts.push(discount);
			}
		}
		
		let isAnniversaryMannerDiscount = await Discount.findIfFixedAnniversaryPromotion(connection, discounts);
		let currentRent;
	
		for (let i = 0; i < services.length; i++) {
			let service = services [i];
			let serviceDetails = await service.calculateDue(connection, period_start.clone(), period_end.clone(), lease,  isAnniversaryMannerDiscount, payload);
		
			if (!serviceDetails) continue;
			let amount = serviceDetails.lines.reduce((a, b) => a + b.amount, 0);
			if (amount < 0) continue;
			let invoice_line = this.generateInvoiceLineFromService(service, period_start, period_end, amount);

			if (service.Product && service.Product.default_type === 'rent') {
				let amtToDiscount = invoice_line.cost * invoice_line.qty;
				let activeDiscounts = this.filterActiveDiscounts(discounts, serviceDetails.service_period);
		
				for (let j = 0; j < activeDiscounts.length; j++) {
					let dLine =  this.calculateDiscountOnLine(activeDiscounts[j], service, serviceDetails.lines, amtToDiscount, invoice_line);
					if(!dLine) continue;
					amtToDiscount -= dLine.amount;
					invoice_line.addDiscount(dLine);
				}
			}

			if(service?.Product?.default_type === 'rent') currentRent = invoice_line.cost * invoice_line.qty;
			if(service?.Product?.amount_type === 'percentage'){
				invoice_line.cost = invoice_line.cost * currentRent / 100;
				invoice_line.Service.price = invoice_line.Service.price * currentRent /100;
				invoice_line.Product.price = invoice_line.Product.price * currentRent /100;
			}

			await invoice_line.make(connection, [], company_id, lease.id, lease.unit_id);
			await this.addLine(invoice_line);
		}



		this.total();

	}

	filterActiveDiscounts(discounts, service_period) {
		return discounts.filter(d => {
			// https://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
			// TODO:  Only discount the overlapped amount!

			d.end = d.end || service_period.end.format('YYYY-MM-DD');
			return (moment(d.start).isSameOrBefore(service_period.end)) && (moment(d.end).isSameOrAfter(service_period.start));
		});
	}

	calculateDiscountOnLine(discount, service, lines, amt_to_discount, invoice_line){

		var discAmt = 0;
		if(!amt_to_discount || amt_to_discount === 0) return;
		
		service.Periods = lines.map(line => {
			var uniqueDays = service.getUniqueDiscountDays(discount, line.start, line.end);
			
			if (!uniqueDays.length) return;
			 
			var activeDays = line.end.diff(line.start, 'days') + 1;
			
			switch (discount.type) {
				case 'percent':
					var ratio = line.amount / (invoice_line.cost * invoice_line.qty);
					discAmt += Math.round((amt_to_discount * ratio) * discount.value * (uniqueDays.length / activeDays)) / 1e2;
					break;
				case 'dollar':
					discAmt += Math.round(discount.value * (uniqueDays.length / activeDays) * 1e2) / 1e2;
					break;
        case 'fixed':
          discAmt += Math.round(((invoice_line.cost * invoice_line.qty) - discount.value) * (uniqueDays.length / activeDays) * 1e2) / 1e2;
          break;
			}
		});

		
		//if(discAmt < 0) return;
		discAmt = discAmt < 0? Math.abs(discAmt): discAmt;

		if(discount.round) {
			discAmt = Discount.roundDiscountAmount(amt_to_discount, discAmt, discount.round);
		}
		
		let amount = (discAmt > amt_to_discount) ? amt_to_discount : discAmt;
		if(amount <= 0) return;

		return new DiscountLine({
			discount_id: discount.id,
			pretax: discount.pretax,
			amount,
			Promotion: discount.Promotion
		});
	}

	generateInvoiceLineFromService(service, period_start, period_end, amount){

		// create invoice line
		var invoice_line = new InvoiceLine({
			product_id:     service.product_id,
			service_id:     service.id,
			description:    service.description,
			invoice_id:     null,
			discount_id:    null,
			qty:            service.qty,
			cost:           Math.round(amount * 1e2) / 1e2,
			Product:        service.Product || null,
			date:           moment().format('YYYY-MM-DD'),
			Service:        service
		});

		if(service.recurring){
			invoice_line.start_date = period_start.clone().format('YYYY-MM-DD');
			invoice_line.end_date =  period_end.clone().format('YYYY-MM-DD');
		} else {
			invoice_line.start_date = service.start_date;
			invoice_line.end_date = service.start_date;
		}

		// Prorate?

		console.log("generateInvoiceLineFromService : ", invoice_line);

		return invoice_line;
	}

	create(data, company_id){

		this.id = data.id;
		this.lease_id = data.lease_id;
		this.property_id = data.property_id;
		this.contact_id = data.contact_id;
		this.date = data.date || moment().format('YYYY-MM-DD')
		this.due = data.due || moment().format('YYYY-MM-DD')
		this.number = data.number;
		this.company_id = company_id;
		this.period_start = data.period_start || moment().format('YYYY-MM-DD');
		this.period_end = data.period_end || moment().format('YYYY-MM-DD');

	}

	async generateLines(connection, lines, discounts, company_id, unit_id){

		for(let i = 0; i < lines.length; i++ ){
			let line = lines[i];

			let invoice_line = {};

			if(line.id){
				invoice_line = new InvoiceLine({id: line.id });
				await invoice_line.find(connection);
			} else {
				  invoice_line = new InvoiceLine();
			}
			invoice_line.update(line, this);
			await invoice_line.make(connection, discounts, company_id, this.lease_id, unit_id, this.property_id);
			await this.addLine(invoice_line);

		}

	}

	calculatePayments(){

		if(!this.Lease.PaymentMethods) return;

		var rent_total = this.rent_total;
		var utilities_total = this.utilities_total;

		this.Lease.PaymentMethods.forEach((pm, i) => {

			if(pm.active && pm.auto_charge){

				// if last payment method, bill the remainder to ensure we collect exactly the amount due.
				if( i === this.Lease.PaymentMethods.length - 1){
					this.Lease.PaymentMethods[i].rent_total = Math.round(rent_total * 1e2) / 1e2;
					this.Lease.PaymentMethods[i].utilities_total =  Math.round(utilities_total * 1e2) / 1e2;
				} else {
					// Dont multiply by 100 since percentage is in whole number form
					this.Lease.PaymentMethods[i].rent_total =  Math.round(this.rent_total * pm.rent) / 1e2;
					this.Lease.PaymentMethods[i].utilities_total =  Math.round(this.utilities_total * pm.utilities) / 1e2;

					rent_total -=  this.Lease.PaymentMethods[i].rent_total;
					utilities_total -=  this.Lease.PaymentMethods[i].utilities_total;
				}

				this.Lease.PaymentMethods[i].total = Math.round( (this.Lease.PaymentMethods[i].rent_total + this.Lease.PaymentMethods[i].utilities_total) * 1e2) / 1e2;

			}
		});

		return true;
	}

	async applyOpenPaymentToInvoice(payment, balance){

		let remainingPayment = Math.round((payment.amount - payment.total_applied) * 1e2) / 1e2;

		let payment_application = {};

		if(balance > 0 && balance <= remainingPayment){
			payment_application.amount = balance;
			payment_application.remaining = Math.round((remainingPayment - balance) * 1e2) / 1e2;
		} else if(balance > 0){
			payment_application.amount = remainingPayment;
			payment_application.remaining = 0;
		}
		return payment_application;

	}

	async getOpenPayments(connection){

		let paymentToApplyTotal = 0;
		var balance = this.balance;
		let payments = await models.Payment.findPaymentOpenPaymentsByLeaseId(connection, this.lease_id);


		// take open payments, and figure out how much to apply
		for(let i = 0; i < payments.length; i++){
			let payment = new Payment(payments[i]);
			await payment.getPaymentApplications(connection);
			let payment_application = await this.applyOpenPaymentToInvoice(payment, balance);
			payment_application.payment_id = payment.id;
			payment_application.invoice_id = this.id;
			balance -= payment_application.amount;
			paymentToApplyTotal += payment_application.amount;
			this.PaymentsToApply.push(payment_application);
		}

		this.paymentToApplyTotal = paymentToApplyTotal;



		let amtLeftToReduce = paymentToApplyTotal;
		let paymentTotal = this.Lease.PaymentMethods.reduce((a,b)=>{return a + (b.total || 0) }, 0);
		// reduce amount paid on payment methods

		for (let i = 0; i < this.Lease.PaymentMethods.length; i++){
			let pm = this.Lease.PaymentMethods[i];

			if(!this.Lease.PaymentMethods[i].total) continue;

			var percentageOfTotal = this.Lease.PaymentMethods[i].total / paymentTotal;
			var amtToReduce = Math.round( (paymentToApplyTotal * percentageOfTotal) * 1e2) / 1e2;
			if(amtLeftToReduce > 0 && this.balance >= 0){
				//If the last method, reduce by amount remaining. This ensure we apply exactly the right discount amount
				if( i == this.Lease.PaymentMethods.length -1){
					this.Lease.PaymentMethods[i].total -=  Math.round(amtLeftToReduce * 1e2) / 1e2;
				} else {
					this.Lease.PaymentMethods[i].total -=  amtToReduce;
				}
				amtLeftToReduce -= amtToReduce;
				this.balance -= amtToReduce;
			}
			this.balance =  Math.round(this.balance * 1e2) / 1e2;
			this.Lease.PaymentMethods[i].total = Math.round(this.Lease.PaymentMethods[i].total * 1e2) / 1e2;
		};
	}

	async void_invoice(connection, admin_voiding, adjusted_to){

		if (!this.id) {
			this.msg = 'Invoice ID not defined';
			return false;
		}

		if(this.property_id){
			this.Property = new Property({id: this.property_id});
			this.void_date = await this.Property.getLocalCurrentDate(connection);
		}

		this.voided_at = moment().utc().format('YYYY-MM-DD HH:mm:ss');
		this.voided_by_contact_id = admin_voiding && admin_voiding.id;

		var save = {
			status: -1,
			void_date: this.void_date,
			voided_at: this.voided_at,
			voided_by_contact_id: this.voided_by_contact_id,
			...(adjusted_to && {adjusted_to})
		};
			
		// set context for void invoice event
		let response =  await models.Invoice.saveInvoice(connection, save, this.id);
		if(response) { 
			clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, { event_id: Enums.ACCOUNTING.EVENTS.VOIDING_INVOICE, invoice_id: this.id, property_id: this.property_id });
			clsContext.push(Enums.EVENTS.END_DELINQUENCY, { 
				lease_ids: [this.lease_id],
				contact_id: this.contact_id 
			});
		}
		
		return response;
	}

	totalInvoiceCredit(){
		// total that should be credited on this day per the prorate settings (calculated elsewhere)
		let credit =  this.InvoiceLines.reduce( (a, line) => a + line.Credit.total,0);

		let amt_credited_already = this.Payments.filter(p => p.Payment.credit_type == 'adjustment' ).reduce((a,b) => a + b.amount, 0)
		
		credit = amt_credited_already > credit ? 0: credit - amt_credited_already; 

		return credit; 

	}

	async verifyAccess(connection, company_id, properties = []){
		if (!this.id) {
		  e.th(500, 'Invoice ID not defined')
		}
		let cid = await models.Invoice.findCompanyIdByInvoice(connection, this.id);
		if(cid !== company_id){
			e.th(403, 'You are not authorized to view this resource.');
		}
		
		if(!properties.length) return;

		let pid = await models.Invoice.findPropertyIdByInvoice(connection, this.id);
		if(properties.indexOf(pid) < 0 ){
		e.th(403, 'You are not authorized to view this resource.');
		}
	}

	async findPropertyIdByInvoice(connection) {
		let property_id = await models.Invoice.findPropertyIdByInvoice(connection, this.id);
		this.property_id = property_id;
		return property_id
	}

	async findCompanyIdByInvoice (connection) {
		return await models.Invoice.findCompanyIdByInvoice(connection, this.id);
	}

	async addDiscount(connection, discount){
		let invoice_line = this.InvoiceLines.find(il => il.Product.default_type == 'rent' && il.Product.category_type !== "adjustment");
		if(invoice_line){
			let discounts = [];
			let period_start = moment(this.period_start);
			let period_end = moment(this.period_end);
			// TODO check this now! Add multiple Discounts..
			let discountList = [];
			if(discount) {
				discounts.push(discount); 
			}  else {
				discountList = await models.Promotion.findActiveDiscounts(connection, this.lease_id, period_start.clone().format('YYYY-MM-DD'));
				for (let i = 0; i < discountList.length; i++) {
					let discount = new Discount({id: discountList[i].id});
					await discount.find(connection);
					discounts.push(discount);
				}
			}
			
			
			let service = new Service({id: invoice_line.service_id});
			await service.find(connection);
			let amtToDiscount = invoice_line.cost * invoice_line.qty;
			
			
			let lines = [{
				start:  period_start.clone(),
				end:    period_end.clone(),
				amount: amtToDiscount
			}];

			invoice_line.DiscountLines = []
			for (let j = 0; j < discounts.length; j++) {
				let dLine =  this.calculateDiscountOnLine(discounts[j], service, lines, amtToDiscount, invoice_line);
				if(!dLine) continue;
				amtToDiscount -= dLine.amount;
				invoice_line.addDiscount(dLine);
			}
		}
	}

	async adjustInvoice(connection, body, res) {

		let user = res.locals.contact || {};
		let api  = res.locals.api || {};
		let company = res.locals.active;
		let { dryrun, PaymentDetails } =  body;
		let adjustInfo = {};
		let accessPayments = [];

		let lease;
		let propertyDate = await this.Property.getLocalCurrentDate(connection);
		let new_invoice_date = propertyDate;
		let new_invoice_due_date = propertyDate;

		if(moment(body.period_start).isAfter(propertyDate)) {
			new_invoice_due_date = moment(body.period_start).format('YYYY-MM-DD');
		}

		if(this.lease_id) {
			lease = new Lease({ id: this.lease_id });
			await lease.find(connection);
			await lease.getProperty(connection);
		}

		let invoice = new Invoice({
			lease_id: this.lease_id,
			property_id: this.property_id,
			contact_id: this.contact_id,
			date: new_invoice_date,
			due: new_invoice_due_date,
			company_id: company.id,
			period_start: body.period_start,
			period_end: body.period_end,
			created_by: user.id,
			apikey_id: api.id,
			adjusted_from: this.id
		});
	
		await invoice.generateLines(connection, body.InvoiceLines, [], company.id, lease && lease.unit_id);
		await invoice.addDiscount(connection);
		await invoice.total();

		if(dryrun){
			if(invoice.balance < this.total_payments){
				let canRefund = Math.round((this.total_payments - invoice.balance) * 1e2) / 1e2;
				await this.findPayments(connection);

				for(let i = this.Payments.length - 1;  i >= 0; i--){
					let payment = this.Payments[i];
					payment.credit = payment.amount <= canRefund ? payment.amount : canRefund;
					canRefund -= payment.credit;
					accessPayments.push(payment);
					
					if(canRefund <= 0) break;
				}
			}
		}
		else {
			
			await invoice.save(connection);

			if(invoice.balance >  this.total_payments) {
				let amount_diff = invoice.balance - this.total_payments;
				await this.unapplyPayments(connection);

				let invoices =  this.lease_id ? await models.Invoice.findPaidInvoicesByDate(connection, this.due, this.lease_id, {sort_by_desc: true}) : [this];
				for(let i=0; i< invoices.length; i++) {
					let inv = new Invoice({ id: invoices[i].id });
					await inv.unapplyPayments(connection);
					amount_diff -=invoices[i].total_payments;
					if(amount_diff <=0) break;
				}
			} else {
				let invoices_payments_breakdown_ids = await this.unapplyPaymentsForRefunds(connection, PaymentDetails);
				let invoices_payments_breakdown = [];
				if(invoices_payments_breakdown_ids?.length) {
					let payment = new Payment();
					invoices_payments_breakdown = await payment.findInvoicePaymentBreakdownById(connection, invoices_payments_breakdown_ids)
				}
				await this.unapplyPayments(connection);
				if(PaymentDetails && PaymentDetails.length){
					for(let i = 0; i < PaymentDetails.length; i++) {
						if(PaymentDetails[i].type == 'refund'){
							let invoice_payment_breakdown = invoices_payments_breakdown.find(ipb => ipb.payment_id === PaymentDetails[i].id)
							let payment = new Payment({ id: PaymentDetails[i].id });
							await payment.find(connection);
							await payment.canReverse(connection,{by_pass:true});
							await payment.refund(connection, company, PaymentDetails[i].amount, "",  "Refunding extra payment on Adjusting invoice", null, [invoice_payment_breakdown?.id]);
						}
					}
				}
			}

			if(this.voided_at) {
				e.th(405, 'This invoice has already voided.');
			}

			await this.void_invoice(connection, user);
			let openPayments = await this.getUnappliedPayments(connection);
			if(this.lease_id && openPayments && openPayments.length){
				await Lease.applyUnallocatedBalanceOnlease(connection, company.id, this.lease_id, openPayments, user.id);
			}

			adjustInfo = {
				prior_invoice_number: this.number,
				new_invoice_number: invoice.number,
				id: invoice.id
			}
		}

		return { adjustInfo, accessPayments, new_invoice: invoice };
	}

	async setRefundedInvoices (connection, res, date, lease_id, invoice_id, total_balance, permissions) {
		let user = res.locals.contact || {};
		let company = res.locals.active;
		const { api } = res.locals;

		let amount_diff = total_balance;
		let invoices =  await models.Invoice.findPaidInvoicesByDate(connection, date, lease_id, {sort_by_desc: true}) || [];

		invoices = invoices.filter(i=> i.id !== invoice_id);
		if (!invoices.length) return;

		for(let i=0; i< invoices.length; i++) {
			let inv = new Invoice({ id: invoices[i].id });
			await inv.unapplyPayments(connection);
			amount_diff -= invoices[i].total_payments;
			if(amount_diff <=0) break;
		}

		let openPayments = await this.getUnappliedPayments(connection);
		if(lease_id && openPayments && openPayments.length){
			await Lease.applyUnallocatedBalanceOnlease(connection, company.id, lease_id, openPayments, user.id, permissions, api);
		}
	}

	async reissueInvoice(connection, body, user, company) {

		let { due } = body; 
		let currentDate = this.Property && this.Property.id ? await this.Property.getLocalCurrentDate(connection) : moment().format('YYYY-MM-DD');

		let lease;
		if(this.lease_id){
			lease = new Lease({ id: this.lease_id });
			await lease.find(connection);
		}

		let invoice = new Invoice({
			lease_id: this.lease_id,
			property_id: this.property_id,
			contact_id: this.contact_id,
			date: currentDate,
			due: due ? moment(due).format('YYYY-MM-DD') : currentDate,
			company_id: company.id,
			period_start: this.period_start,
			period_end: this.period_end,
			created_by: user.id,
			//apikey_id: api.id,
			reissued_from: this.id
		});
	
		let invoiceLines = await this.copyInvoiceLines(connection);
		await invoice.generateLines(connection, invoiceLines, [], company.id, lease && lease.unit_id);
		for(let i = 0; i < invoice.InvoiceLines.length; i++){
			invoice.InvoiceLines[i].DiscountLines = [...invoiceLines[i].DiscountLines];
		}
		await invoice.save(connection);
		await invoice.total();

		// Reconcile with the reserved amount
		// let contact = new Contact({ id: this.contact_id });
		// await contact.reconcile(connection, invoice.property_id);
		return invoice;
	}

	async copyInvoiceLines(connection){
		let invoiceLines = [];
		if(this.InvoiceLines && this.InvoiceLines.length){
			for(let i = 0; i < this.InvoiceLines.length; i++){
				let invoice_line = new InvoiceLine(Object.assign({}, this.InvoiceLines[i]));
				await invoice_line.findDiscountLines(connection);
				delete invoice_line.id;			
				for(let j = 0; j < invoice_line.DiscountLines.length; j++){
					delete invoice_line.DiscountLines[j].id;
				}
				invoiceLines.push(invoice_line);
			}
		}
		return invoiceLines;
	}

	async unapplyPayments(connection) {
		await this.find(connection);
		if(!this.Payments?.length) await this.findPayments(connection);
		
		let invoices_payments_breakdown = [];
		let invoice_payments = this.Payments || [];
		for (let i = 0; i < invoice_payments.length; i++) {
			let payment = new Payment({ id: invoice_payments[i].payment_id });
			await payment.find(connection);
			let invoice_payment_breakdown = await payment.unapply(connection, invoice_payments[i].id, 0);
			invoices_payments_breakdown.push(invoice_payment_breakdown);
		}
		return invoices_payments_breakdown;
	}

	async unapplyPaymentsForRefunds(connection, payment_details) {
		await this.findPayments(connection);
		
		let invoices_payments_breakdown = [];
		let invoice_payments = this.Payments || [];
		let refund_invoice_payments = []
		let amounts_to_unapply = []
		for(let pd of payment_details) {
		 if( pd.type !== 'refund') continue	
		 let invoice_payment = invoice_payments.find(ip => ip.payment_id === pd.id);
		 if(!invoice_payment) continue
		 refund_invoice_payments.push(invoice_payment)
		 amounts_to_unapply.push(pd.amount)
		}

		for (let i = 0; i < refund_invoice_payments.length; i++) {
			let amount_to_unapply = amounts_to_unapply[i];
			let payment = new Payment({ id: refund_invoice_payments[i].payment_id });
			await payment.find(connection);
			let new_amount = 0
			if(amount_to_unapply && amount_to_unapply > 0) 	new_amount = refund_invoice_payments[i].amount - amount_to_unapply
			let invoice_payment_breakdown = await payment.unapply(connection, refund_invoice_payments[i].id, new_amount);
			invoices_payments_breakdown.push(invoice_payment_breakdown);
		}
		return invoices_payments_breakdown;
	}
	//Not in use anywhere. Code wont run, reference errors
	// async validateInvoice() {
	// 	let lease, property;
	// 	if (!this.lease_id && !this.property_id) e.th(400, "This invoice contains no Lease Id or Property Id");
	// 	if (this.lease_id) {
	// 		lease = new Lease({id: this.lease_id});
	// 		await lease.canAccess(connection, company.id, res.locals.properties);
	// 	} else {
	// 		property = new Property({ id: this.property_id });
	// 		await property.find(connection);
	// 		await property.verifyAccess(company_id);
	// 	}
	// }

	async invoiceBalanceAfterPayment(connection, payment_id){
		let balance = await models.Invoice.findInvoiceBalanceWhenPaymentLastApplied(connection, this.id, payment_id);
		return balance;
	}

	validateUniqueNumber(connection){

		return models.Invoice.findInvoiceByNumber(connection, this.company_id, this.number, this.id)
			.then(invoice => {
				if(invoice){
					e.th(409, "An invoice already exists with this invoice number")
				}
				return true;

			});
	}

	async canVoidOrAdjust(connection, company_id, loggedInUserId){
		if(!this.id) e.th(500, 'Missing Invoice ID')
		let canVoidAdjust = true;
		let invoice_adj_setting = await models.Invoice.getInvoiceAdjustmentSetting(connection, this.id);

		if(!this.Property.id){
			await this.findProperty(connection, company_id, loggedInUserId);
		}
		let currentDate = await this.Property.getLocalCurrentDate(connection);
		let invoiceAdjDays = invoice_adj_setting ? invoice_adj_setting.invoice_adjustment_days : 'EOM';

		if(!isNaN(parseInt(invoiceAdjDays))){
			let days = parseInt(invoiceAdjDays);
			canVoidAdjust = !moment(currentDate).isAfter(moment(this.due).clone().add(days, 'days'));
		} else if (invoiceAdjDays == 'EOM'){
			canVoidAdjust = !moment(currentDate).isAfter(moment(this.due).endOf("month"));
		}
		
		this.InvoiceLines.forEach(line =>{
			if (line.Product && line.Product.default_type === 'auction') canVoidAdjust = false;
		});
		this.can_void_adjust = canVoidAdjust;
	}

	async canReissue(connection){
		if(!this.id) e.th(500, 'Missing Invoice ID')
		let canReissue = false;
		
		if(this.status == '-1'){
			await this.findReissuedToInvoice(connection);
			canReissue = this.ReissuedTo && this.ReissuedTo.id ? false : true;
		}

		this.can_reissue = canReissue;
	}

	async findReissuedToInvoice(connection){
		if(this.id){
			let invoices = await models.Invoice.findReissuedToInvoice(connection, this.id);
			if(invoices && invoices.length){
				let reissued_to = invoices[0].id;
				let invoice = new Invoice({id: reissued_to});
				await invoice.find(connection);
				this.ReissuedTo = invoice;
			}
		}
	}

	async findReissuedFromInvoice(connection){
		if(this.reissued_from){
			let invoice = new Invoice({id: this.reissued_from});
			await invoice.find(connection);
			this.ReissuedFrom = invoice;
		}
	}

	static async searchAging(connection, conditions, searchParams, company_id, count){
		return models.Invoice.getAging(connection, conditions, searchParams, company_id, count)
	}

	static async setInvoiceBreakdownAllocation(connection, { company_id, property_id } ){
		if (!company_id || !property_id) {
			e.th(500, 'Missing Company or Property ID')
		}
		
		let invoice_breakdowns = await models.Invoice.findInvoiceAndBreakdowns(connection, company_id, property_id);
		for(let i = 0; i  < invoice_breakdowns.length; i++){
			let invoice_breakdown = invoice_breakdowns[i];

			try{
				await connection.beginTransactionAsync();

				await models.Payment.clearPreviousAllocations(connection, invoice_breakdown.invoice_id, invoice_breakdown.breakdown_ids, invoice_breakdown.refund_ids);

				let breakdown_ids = invoice_breakdown.breakdown_ids ? invoice_breakdown.breakdown_ids.split(',') : [];
				for(let i = 0; i  < breakdown_ids.length; i++){
					let invoice_breakdown_id = breakdown_ids[i];
					await models.Payment.updateInvoiceLineAllocation(connection, invoice_breakdown_id);
				}

				await connection.commitAsync();


			} catch(err){
				console.log(`Allocation generation failed for invoice_id = ${invoice_breakdown.invoice_id}, breakdownIds = ${invoice_breakdown.breakdown_ids}:`, err);
				await connection.rollbackAsync();
				throw err;
			}
			
		}
	}

	async getUnappliedPayments(connection){
		let invoicePaymentIds = await models.Invoice.findUnappliedPayments(connection, this.lease_id);
		let openPayments = [];
		for(let i=0; i< invoicePaymentIds.length; i++) {
			let payment = new Payment({id:invoicePaymentIds[i].id});
			await payment.find(connection);
			await payment.getPaymentApplications(connection);
			if(payment.payment_remaining) {
				openPayments.push({
					id: payment.id,
					amount: payment.payment_remaining
				})
			}
		}
		return openPayments;
	}
	
	async getTimeSpan(connection, payload = {}) {
		const { use_due_date = false } = payload;
		let timeSpan = Enums.TIME_SPAN;
		if(!this.number) await this.find(connection);
		if(!this.property_id) await this.findPropertyIdByInvoice(connection);

		let property = new Property({ id: this.property_id });
		let currentPropertyDate = await property.getLocalCurrentDate(connection);
			
		const start_date = use_due_date ? this.due : this.period_start;
		const end_date = use_due_date ? this.due : this.period_end;

		if(moment(start_date) > moment(currentPropertyDate)) return timeSpan.FUTURE;
		else if(moment(currentPropertyDate) > moment(end_date)) return timeSpan.PAST;
		
		return timeSpan.PRESENT;
	}

	/**
	Returns all past due invoices along with their total count
	@param {Object} connection - Database connection object
	@param {Object} params - Query parameters object
	@returns {Object} - An object containing total count and array of invoices
	*/
	async getAllPastDueInvoices(connection, params) {
		let total_count = await models.Invoice.getAllPastDueInvoices(connection, params, true)
		let invoices = await models.Invoice.getAllPastDueInvoices(connection, params)
		invoices.forEach((invoice) => {
			invoice.InvoiceLines = invoice.InvoiceLines
			invoice.DiscountLines = invoice.DiscountLines
			invoice.TaxLines = invoice.TaxLines
		})
		return { total_count: total_count, invoices: invoices }
	}

	async isInterPropertyProductInvoice(connection) {
		const data = await models.Invoice.isInterPropertyInvoiceById(connection, this.id);
		return data?.length && data[0].is_inter_property;
	}

	static async applyOpenPaymentsToInvoices(connection, invoices = [], open_payments = [], params = {}){
		let { dryrun = false } = params;
		let open_payment_amount = open_payments.reduce((total, op) => total + op.amount, 0);

		if(!invoices.length)  return [];
		console.log(`DRYRUN: ${dryrun} -- applying open payments:`, open_payment_amount, 'to', invoices );

		let start_invoice_index = 0;
		for (let i = 0; i < open_payments.length; i++) {

			if(dryrun){
				let payment = open_payments[i];
				let payment_remaining = payment.amount;

				for (let j = start_invoice_index; j < invoices.length; j++) {
					let invoice = invoices[j];

					if (invoice.balance <= payment_remaining) {
						invoice.total_payments += invoice.balance;
						payment_remaining -= invoice.balance;
						invoice.balance -= invoice.balance;
						start_invoice_index++;
					} else {
						invoice.total_payments += payment_remaining;
						invoice.balance -= payment_remaining;
						payment_remaining = 0;
					}

					if (!payment_remaining) break;
				}
			} else {
				let payment = new Payment({ id: open_payments[i].id });
				await payment.find(connection);
				await payment.getPaymentApplications(connection);
				let payment_remaining = payment.payment_remaining;
				let invoices_to_apply = [];
	
				for (let j = start_invoice_index; j < invoices.length; j++) {
						let invoice = new Invoice(invoices[j]);
						await invoice.find(connection);
						await invoice.total();
	
					if (invoice.balance <= payment_remaining) {
						invoice.amount = invoice.balance;
						payment_remaining -= invoice.balance;
						start_invoice_index++;
					} else {
						invoice.amount = payment_remaining;
						payment_remaining = 0;
					}
	
					invoices_to_apply.push(invoice);
					if (!payment_remaining) break;
				}
	
				if (invoices_to_apply.length) {
					await payment.applyToInvoices(connection, invoices_to_apply);
				}
			}

			if (start_invoice_index == invoices.length) break;
		}

		return invoices;

	}

	static async getPaymentDetailsByInvoiceIds(connection, invoice_ids) {
		if (!Array.isArray(invoice_ids) || !invoice_ids.length) return [];

		const invoicePaymentDetails = await models.Payment.getPaymentsByInvoiceIds(connection, invoice_ids);
		const paymentIds = new Set(invoicePaymentDetails.map((obj) => obj.payment_id).filter(Boolean));
		const paymentDetails = await models.Payment.getByIds(connection, [...paymentIds]);
		const paymentMethodIds = new Set(paymentDetails.map((obj) => obj.payment_methods_id).filter(Boolean));
		const paymentMethodDetails = await models.Payment.getPaymentMethodsByIds(connection, [...paymentMethodIds]);
		const paymentMap = new Map(paymentDetails.map((payment) => [payment.id, payment]));
		const paymentMethodMap = new Map(paymentMethodDetails.map((method) => [method.id, method]));

		for (let appliedPayments of invoicePaymentDetails) {
			const payment = paymentMap.get(appliedPayments.payment_id);
			if (payment) {
				appliedPayments['Payment'] = payment;
				const paymentMethodId = payment.payment_methods_id;
				if (paymentMethodId) {
					const paymentMethod = paymentMethodMap.get(paymentMethodId);
					if (paymentMethod) {
						appliedPayments['PaymentMethod'] = paymentMethod;
					}
				}
			}
		}
		return invoicePaymentDetails
	}

	static getAppliedPayments(invoice = {}) {
		let applied_payments = [];
		if (invoice?.Payments?.length > 0) {
			applied_payments = invoice.Payments.map(pay => {
				return { id: pay.payment_id, amount: pay.amount }
			});
			console.log(`applied_payments for invoice ${invoice.id} of lease ${invoice.lease_id}\n`, JSON.stringify([...applied_payments], null, 2));
		}
		return applied_payments;
	}

	static async getInvoicesObjects(connection, invoices = []) {
		let Invoices = [];
		for (let i = 0; i < invoices.length; i++) {
			let invoice = new Invoice({
				id: invoices[i].id
			});
			await invoice.find(connection)
			await invoice.total();
			Invoices.push(invoice);
		}

		return Invoices;
	}
}

module.exports = Invoice;

var Lease = require(__dirname + '/lease.js');
var InvoiceLine  = require(__dirname + '/invoice_lines.js');
var Payment  = require(__dirname + '/payment.js');
var Discount  = require(__dirname + '/discount.js');
var DiscountLine  = require(__dirname + '/discount_lines.js');
var Property  = require(__dirname + '/property.js');
var Contact = require(__dirname + '/contact.js');
var Service = require(__dirname + '/service.js');

