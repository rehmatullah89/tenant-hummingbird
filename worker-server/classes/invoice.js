"use strict";

var models  = require(`./../models`);
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');

var QB = require('node-quickbooks');
var validator = require('validator');
var moment = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Invoice {

	constructor(data){

		data = data || {};

		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.property_id = data.property_id || null;
		this.contact_id = data.contact_id || null;
		this.number = data.number || null;
		this.date = data.date || moment().format('YYYY-MM-DD HH:mm:ss');
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
		this.effective_date = null;	
		this.Unit = {};

		this.PaymentsToApply = [];
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

		return models.Billing.findInvoiceLinesByInvoiceId(connection, this.id).map(line => {

			var invoiceLine = new InvoiceLine(line);
			return invoiceLine.find(connection,{ property_id })
				.then(() => {
					this.InvoiceLines.push(invoiceLine);
					return true;
				})

		})
	}


	async findContact(connection, company_id){
		if(!this.contact_id) e.th(500, "contact id missing");
		this.Contact = new Contact({id: this.contact_id});
		await this.Contact.find(connection, company_id);
	}

	async findProperty(connection, company_id){
		if(!this.property_id) e.th(500, "property id missing");
		this.Property = new Property({id: this.property_id});
		await this.Property.find(connection);
		await this.Property.verifyAccess(company_id);
		await this.Property.getAddress(connection);
	  	await this.Property.getPhones(connection);
	}
	

	findLease(connection){
		var lease = new Lease({id: this.lease_id});
		return lease.find(connection)
			.then(() => lease.getTenants(connection))
			.then(() => lease.findUnit(connection))
			.then(() => {
				this.Lease = lease;
				return true;
			});
	}


	//TODO remove
	getValues(){
		var _this = this;

		var data = {
			id: _this.id,
			lease_id: _this.lease_id,
			property_id: _this.property_id,
      		contact_id: _this.contact_id,
			number: _this.number,
			date: _this.date,
			due: _this.due,
			status: _this.status,
			period_start: _this.period_start,
			period_end: _this.period_end,
			paid: _this.paid,
			balance: _this.balance,
			utilities_total:  _this.utilities_total,
			rent_total: _this.rent_total,
			InvoiceLines:[],
			Payments:[],
			total_due: _this.total_due,
			total_tax: _this.total_tax,
			total_amt: _this.total_amt,
			total_discounts: _this.total_discounts,
			total_payments: _this.total_payments,
			discounts: _this.discounts,
			sub_total: _this.sub_total,
			Lease: _this.Lease
		}

		_this.InvoiceLines.forEach(function(inLine){
			data.InvoiceLines.push(inLine.getValues());
		});
		if(_this.Payments){
			data.Payments = _this.Payments
		}

		return data;
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

	async assignAndGetCompanyInvoiceNumber(connection, company_id){
		let num = await models.Billing.assignCompanyNewInvoiceNumber(connection, company_id);
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
		return Promise.resolve().then(async () => {
			if(this.lease_id && !validator.isInt(this.lease_id + '')) error = 'Lease Id must be an integer or be null';

			if(this.property_id && !validator.isInt(this.property_id + '')) error = 'Property Id must be an integer or be null';

			if(!this.property_id && !this.lease_id) error = 'Property id or Lease id must not be empty';

			if(this.contact_id && !validator.isInt(this.contact_id + '')) error = 'Contact ID missing';

			if(!this.contact_id && !this.lease_id) error = 'Contact Id or Lease id must not be empty';

			if(!validator.isNumeric(this.number + '')) error = 'Invoice number must be numeric';

			if(!validator.isDate(this.date + '')) error = 'Date must be a date';
			
			if(!moment(this.date).isValid()) error = 'Date must be a valid date';

			if(!validator.isDate(this.due + '')) error = 'Due must be a date';

			// if(this.due < this.date)  error = 'Due date must be on or after invoice date.';
			console.log("this.due", this.due)
			console.log("this.date", this.date)
			if(moment(this.due).isBefore(this.date, 'day')) error = 'Due date must be on or after invoice date.';

			if(error) {
				e.th(400, error);
			}

			// return this.validateUniqueNumber(connection)
		})

	}

	async save(connection, shouldCommit = true){

		if(!this.date) this.date = moment().format('YYYY-MM-DD HH:mm:ss');

		if (!this.number){
				this.number =  await invoiceNumberGenerator.generate(connection.cid, this.company_id);
		}

		if(!this.id) {
			if(!this.property_id){ 
				let property = await models.Lease.findProperty(connection, this.lease_id);
				this.property_id = property.id
			}

			if(!this.Property || !this.Property.id){
				this.Property = new Property({id: this.property_id});
			} 

			if(!this.Property.effective_date){
				await this.Property.getEffectiveDate(connection)
			}

			this.effective_date = this.Property.effective_date;
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
			...(!this.id && {effective_date: this.effective_date}),
			...(this.adjusted_from && { adjusted_from: this.adjusted_from })
			// total_amt: this.total_payments,
			// total_tax: this.total_tax,
			// total_discounts: this.discounts,
			// balance: this.balance
		};

		let result = await models.Invoice.saveInvoice(connection, save, this.id);
		
		if(this.id){
			await this.killInvoiceParts(connection);
		}

		this.id = (result.insertId) ?  result.insertId: this.id;

		for(let i = 0; i  < this.InvoiceLines.length; i++){
			this.InvoiceLines[i].invoice_id = this.id;
			await this.InvoiceLines[i].save(connection);
		}

		let payload = {
			event_id: Enums.ACCOUNTING.EVENTS.GENERATING_INVOICE,
			invoice_id: this.id,
			property_id: this.property_id,
			date: this.date,
			cid: connection.cid
		};
		await AccountingEvent.generateAccountingExport(connection, payload);
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


		let total_payments = 0
		this.Payments.forEach(payment => {
			total_payments += payment.amount;
		});

		this.total_payments =  Math.round(total_payments * 1e2) / 1e2;

		var balance = this.total_due - this.total_payments - this.discounts;
		this.total_discounts = Math.round( this.discounts * 1e2) / 1e2;
		this.balance = Math.round(balance * 1e2) / 1e2;

		if(this.balance <= 0){
			this.paid = 1;
		}

		return Promise.resolve();

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

	async makeFromServices(connection, services, lease, period_start, period_end, discounts = [], company_id) {

		discounts = discounts || [];
		if (!discounts.length) {
			// TODO check this now! Add multiple Discounts..
			let discountList = await models.Promotion.findActiveDiscounts(connection, this.lease_id, period_start.clone().format('YYYY-MM-DD'));
			for (let i = 0; i < discountList.length; i++) {
				let discount = new Discount({id: discountList[i].id});
				await discount.find(connection);
				discounts.push(discount);
			}
		}

		let isAnniversaryMannerDiscount = await Discount.findIfFixedAnniversaryPromotion(connection, discounts);
		let minLineStartDate, maxLineEndDate;



		for (let i = 0; i < services.length; i++) {
			let service = services [i];
			let serviceDetails = await service.calculateDue(connection, period_start.clone(), period_end.clone(), lease, isAnniversaryMannerDiscount);
			
			if (!serviceDetails) {
				console.log("No Service details found for ",service)
				continue;
			}
			

			for (let j = 0; j < serviceDetails.lines.length; j++) {
				let line = serviceDetails.lines[j];
				let amount = line.amount;
				if (amount < 0) {
					console.log("Service is not chargeable...",line)
					continue;
				}
				let invoice_line = this.generateInvoiceLineFromService(service, line.start, line.end, amount);

				if (service.Product.default_type === 'rent') {
					let amtToDiscount = invoice_line.cost * invoice_line.qty;
					let activeDiscounts = this.filterActiveDiscounts(discounts, serviceDetails.service_period);

					for (let j = 0; j < activeDiscounts.length; j++) {
						let dLine =  this.calculateDiscountOnLine(activeDiscounts[j], service, line, amtToDiscount, period_start.clone(), period_end.clone());
						if(!dLine) continue;
						amtToDiscount -= dLine.amount;
						invoice_line.addDiscount(dLine);
					}
				}

				await invoice_line.make(connection, lease.unit_id);
				await this.addLine(invoice_line);

				minLineStartDate = !minLineStartDate || minLineStartDate.isAfter(line.start) ? line.start.clone() : minLineStartDate;
				maxLineEndDate = !maxLineEndDate || maxLineEndDate.isBefore(line.end) ? line.end.clone() : maxLineEndDate;
			}
		}

		if(this.InvoiceLines?.length) {
			console.log('Calculating Invoice Details..');

			if(!minLineStartDate || !maxLineEndDate) {
				e.th(500, 'Invoice should have period start and period end');
			}

			this.period_start = minLineStartDate.clone().format('YYYY-MM-DD HH:mm:ss');
			this.period_end = maxLineEndDate.clone().format('YYYY-MM-DD HH:mm:ss');
			this.due = minLineStartDate.clone().format('YYYY-MM-DD')
			this.total();
		} else {
			console.log('No invoice generated with services: ', JSON.stringify(services));
		}
	}

	filterActiveDiscounts(discounts, service_period) {
		return discounts.filter(d => {
			// https://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
			// TODO:  Only discount the overlapped amount!

			d.end = d.end || service_period.end.format('YYYY-MM-DD');
			return (moment(d.start).isSameOrBefore(service_period.end)) && (moment(d.end).isSameOrAfter(service_period.start));

		});
	}

	calculateDiscountOnLine(discount, service, line, amt_to_discount, period_start, period_end){

		var discAmt = 0;
		var uniqueDays = service.getUniqueDiscountDays(discount, line.start, line.end);
		if (!uniqueDays.length) return;
		var activeLineDays = line.end.diff(line.start, 'days') + 1;
		var activeDays = period_end.diff(period_start, 'days') + 1;
		switch (discount.type) {
			case 'percent':
				discAmt += Math.round(amt_to_discount * discount.value * (uniqueDays.length / activeLineDays)) / 1e2;
				break;
			case 'dollar':
				discAmt += Math.round(discount.value * (uniqueDays.length / activeDays) * 1e2) / 1e2;
				break;
			case 'fixed':
				discAmt += Math.round((amt_to_discount - discount.value) * (uniqueDays.length / activeDays) * 1e2) / 1e2;
				break;
		}

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
		return invoice_line;
	}


	create(data, company_id){

		this.id = data.id; // ToDO take out of create
		this.lease_id = data.lease_id;
		this.property_id = data.property_id;
		this.contact_id = data.contact_id;
		this.date = data.date || moment().format('YYYY-MM-DD HH:mm:ss')
		this.due = data.due || moment().format('YYYY-MM-DD')
		this.number = data.number;
		this.company_id = company_id;
		this.period_start = data.period_start || moment().format('YYYY-MM-DD');
		this.period_end = data.period_end || moment().format('YYYY-MM-DD');

	}

	async generateLines(connection, lines, discounts, company_id){

		for(let i = 0; i < lines.length; i++ ){
			let line = lines[i];

			let invoice_line = {};

			console.log("LINE", line);
			if(line.id){
				invoice_line = new InvoiceLine({id: line.id });
				await invoice_line.find(connection);
			} else {
				invoice_line = new InvoiceLine();
			}
			invoice_line.update(line, this);
			await invoice_line.make(connection, discounts, company_id, this.lease_id, this.property_id);
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

		let payment_application = {
		};

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

		// take open payments, and figure out how to much applu
		for(let i = 0; i < payments.length; i++){
			let payment = new Payment(payments[i]);
			await payment.getPaymentApplications(connection);
			let payment_application = await this.applyOpenPaymentToInvoice(payment, balance);
			if(!payment_application.amount) continue;
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
		// if(response) { 
		// 	clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, { event_id: Enums.ACCOUNTING.EVENTS.VOIDING_INVOICE, invoice_id: this.id, property_id: this.property_id });
		// 	clsContext.push(Enums.EVENTS.END_DELINQUENCY, { 
		// 		lease_ids: [this.lease_id],
		// 		contact_id: this.contact_id 
		// 	});
		// }
		
		return response;

	}

	totalInvoiceCredit(date){
		return this.InvoiceLines.reduce( (a, line) => a + line.Credit.total,0)
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

	validateUniqueNumber(connection){

		return models.Invoice.findInvoiceByNumber(connection, this.company_id, this.number, this.id)
			.then(invoice => {
				if(invoice){
					e.th(409, "An invoice already exists with this invoice number")
				}
				return true;

			});
	}

	async findInvoicesByLeaseId(connection){
		return await models.Invoice.findInvoicesByLeaseId(connection, this.lease_id, this.date, this.type);
	}

	static async searchAging(connection, conditions, searchParams, company_id, count){
		return models.Invoice.getAging(connection, conditions, searchParams, company_id, count)
	}

	async findContactByLeaseId(connection){
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
	
	async getUappliedPayments(connection){
		let invoicePaymentIds = await models.Invoice.findInvoicePaymentsFromBreakdown(connection, this.id);
		let openPayments = [];
		for(let i=0; i< invoicePaymentIds.length; i++) {
			let payment = new Payment({id:invoicePaymentIds[i].payment_id});
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

	async findPropertyIdByInvoice(connection) {
		let property_id = await models.Invoice.findPropertyIdByInvoice(connection, this.id);
		this.property_id = property_id;
		return property_id
	}

	async getTimeSpan(connection, payload = {}) {
		const { use_due_date = false, date } = payload;
		let timeSpan = Enums.TIME_SPAN;
		if(!this.number) await this.find(connection);
		if(!this.property_id) await this.findPropertyIdByInvoice(connection);

		let property = new Property({ id: this.property_id });
		let currentPropertyDate = date || await property.getLocalCurrentDate(connection);
		const start_date = use_due_date ? this.due : this.period_start;
		const end_date = use_due_date ? this.due : this.period_end;

		if(moment(start_date) > moment(currentPropertyDate)) return timeSpan.FUTURE;
		else if(moment(currentPropertyDate) > moment(end_date)) return timeSpan.PAST;
		
		return timeSpan.PRESENT;
	}

	/**
	 * Function voids all invoices future to the provided date and create new
	 * invoices corresponding to the voided invoices. If called after updating the
	 * service of a lease, invoices with new services will be created. If invoice amount
	 * is less, new invoices will be created.
	 * @param { SQL Connection Object } connection
	 * @param { Number } leaseId Lease ID for the lease to adjust invoice.
	 * @param { Number } companyId
	 * @param { Date } date Adjusts all invoices starting from this date
	 * @returns If success returns an array with all invoices -both void and new-
	 * starting from the date. If failed returns an object with failure data
	 */
	static async bulkAdjustInvoices(connection, leaseId, companyId, date) {
		if (!leaseId || !date) return {
			status: `failed`,
			message: `Lease ID and Date is required`
		};

		let
			newInvoices = [],
			lease = new Lease({ id: leaseId }),
			oldInvoices = await lease.getFutureInvoicesByDate(connection, date, 'active');

		if (!oldInvoices?.length) return {
			status: `okay`,
			message: `No invoices to regenerate`
		};

		let totalPayments = utils.findSumOfObjectPropertyInArray(oldInvoices, `total_payments`) || 0;

		for (let invoice of oldInvoices) {
			let oldInvoice = new Invoice({ id: invoice.id });

			await oldInvoice.find(connection);
			await oldInvoice.unapplyInvoicePayments(connection);
			await oldInvoice.void_invoice(connection);

			let newInvoicePayload = {
				company_id: companyId,
				adjusted_from: invoice.id,
				type: `auto`
			};

			let
				period = { start: invoice.period_start, end: invoice.period_end },
				newInvoice = await lease.createCustomInvoice(connection, period, newInvoicePayload, oldInvoice.InvoiceLines);

			newInvoices.push(newInvoice);
		}

		if (!newInvoices.length) return {
			status: `failed`,
			message: `Regenerated invoices not returned`
		};

		let
			openPayments = await lease.getUnappliedPayments(connection),
			totalOpenPayments = utils.findSumOfObjectPropertyInArray(openPayments, `amount`) || 0,
			totalNewInvoiceBalance = utils.findSumOfObjectPropertyInArray(newInvoices, `balance`) || 0;

		if (totalOpenPayments != totalPayments) return {
			status: `failed`,
			message: `Mismatch between total payments(${ totalPayments }) and open payments(${ totalOpenPayments })`,
			openPayments,
			oldInvoices
		};

		while (totalOpenPayments > totalNewInvoiceBalance) {
			let
				lastInvoice = newInvoices[newInvoices.length - 1],
				period = { start: moment(lastInvoice.period_end).add(1, `day`).format(`YYYY-MM-DD`) };

			let newInvoicePayload = {
				company_id: companyId,
				type: `auto`
			},
			newInvoice = await lease.createCustomInvoice(connection, period, newInvoicePayload);

			newInvoices.push(newInvoice)
			totalNewInvoiceBalance = utils.findSumOfObjectPropertyInArray(newInvoices, `balance`) || 0;
		}

		await Invoice.applyOpenPaymentsToUnpaidInvoices(connection, newInvoices, openPayments);
		let allFutureInvoices = await lease.getFutureInvoicesByDate(connection, date, 'all');

		return {
			status: `success`,
			voidInvoices: oldInvoices,
			newInvoices: allFutureInvoices.filter(invoice => invoice.status == '1'),
			voidInvoicePayments: totalPayments,
			openedPayment: totalOpenPayments,
			totalNewInvoiceBalance
		}
	}

	static async applyOpenPaymentsToUnpaidInvoices(connection, unpaidInvoices = [], openPayments = []) {
		if (!unpaidInvoices.length || !openPayments.length) return {
			status: `failed`,
			message: `Provide some invoices and payments`
		};

        let startInvoiceIndex = 0;
		for (let payment of openPayments ) {
			let openPayment = new Payment({ id: payment.id });

			await openPayment.find(connection);
			await openPayment.getPaymentApplications(connection);

			let
				paymentRemaining = openPayment.payment_remaining,
				invoicesToApply = [];

			for (let i = startInvoiceIndex; i < unpaidInvoices.length; i++) {
				let unpaidInvoice = new Invoice(unpaidInvoices[i]);

				await unpaidInvoice.find(connection);
				await unpaidInvoice.total();

				if (unpaidInvoice.balance <= paymentRemaining) {
					unpaidInvoice.amount = unpaidInvoice.balance;
					paymentRemaining -= unpaidInvoice.balance;
					startInvoiceIndex++;
				} else {
					unpaidInvoice.amount = paymentRemaining;
					paymentRemaining = 0;
				}

				invoicesToApply.push(unpaidInvoice);
				if (!paymentRemaining) break;
			}

			if (invoicesToApply.length) await openPayment.applyToInvoices(connection, invoicesToApply, false, false);
		}
	}

	async unapplyInvoicePayments(connection) {
		if(!this.Payments?.length) await this.findPayments(connection);
		let invoicePayments = this.Payments || [];

		for (let invoicePayment of invoicePayments) {
			let payment = new Payment({ id: invoicePayment.payment_id })
			await payment.find(connection);
			await payment.unapplyInvoicePayment(connection, invoicePayment.id, 0, this);
		}
	}

	static async findInvoiceAndBreakdowns(connection, company_id, params){
		return models.Invoice.findInvoiceAndBreakdowns(connection, company_id, params)
	}

	static async deleteAndUpdateInvoicePaymentBreakDowns(connection, invoice_id, delete_ipb = [], update_ipb = []){

        let allocations = await models.Invoice.findInvoiceLineAllocationByInvoiceId(connection, invoice_id);
		if(allocations && allocations.length) await models.Invoice.deleteInvoiceLineAllocation(connection,allocations.map(x=>x.id));
		
		let updated_ips = update_ipb.concat(delete_ipb);
		await models.Payment.clearAccountingExports(connection, invoice_id, updated_ips.map(x=> x.id));
		
		if(delete_ipb.length) await models.Invoice.deleteInvoicePaymentBreakDowns(connection,delete_ipb.map(x=> x.id));
		if(update_ipb.length) await models.Invoice.UpdateInvoicePaymentBreakDowns(connection,update_ipb);


		let un_ip = [...new Set(updated_ips.map(x=> x.invoice_payment_id))];

		for(let i=0; i< un_ip.length; i++) {
			await models.Invoice.UpdateInvoicePayments(connection, un_ip[i]);
		}

		return models.Payment.updateInvoicePaymentTotal(connection, invoice_id);
	}

	async isInterPropertyProductInvoice(connection) {
		const data = await models.Invoice.isInterPropertyInvoiceById(connection, this.id);
		return data?.length && data[0].is_inter_property;
	}

	async unapplyPayments(connection) {
		// await this.find(connection);
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

	static getAppliedPayments(invoice = {}){
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

var Lease = require('./lease');
var InvoiceLine  = require('./invoice_lines');
var Payment  = require(`./payment`);
var Discount  = require(__dirname + '/discount.js');
var DiscountLine  = require(__dirname + '/discount_lines.js');
var Property = require(__dirname + '/property.js');
var Contact = require(__dirname + '/contact.js');
var Enums = require(__dirname + '/../modules/enums.js');
// var AccountingEvent = require(__dirname + '/../events/accounting.js');
const AccountingEvent = require('../events/accounting');
const utils = require('../modules/utils');
var invoiceNumberGenerator = require('../modules/invoice_number_generator');
