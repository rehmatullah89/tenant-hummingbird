"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var e = require(__dirname + '/../modules/error_handler.js');



class Service {

	constructor(data){
		data = data || {};
		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.product_id = data.product_id || null;
		this.property_bill_id = data.property_bill_id || null;
		this.price = data.price || 0;
		this.start_date = data.start_date || null;
		this.end_date = data.end_date || null;
		this.name =  data.name || null;
		this.description =  data.description;
		this.qty = data.qty || 1;
		this.recurring = data.recurring || 0;
		this.prorate = data.prorate || 0;
		this.prorate_out = data.prorate_out || 0;
		this.service_type = data.service_type || 'lease';
		this.taxable = data.taxable;

		this.amount = 0;
		if(data.Product) this.Product = data.Product;
		if(data.Lease) this.Lease = data.Lease;
		if(data.BillsProperty) this.BillsProperty = data.BillsProperty;

		this.last_billed = '';
		this.servicePeriodStart = '';
		this.servicePeriodEnd = '';

		this.Periods = [];

		return this;
	}

	verifyAccess(connection, company_id, properties = []){
		return models.Lease.canAccess(connection, this.lease_id, company_id, properties).then(canAccess => {
			if(canAccess) return true;
			var error =  new Error("You do not have permission to access this resource");
			error.code = 403;
			throw error;
		})
	}

	async find(connection){



		if(!this.id) e.th(500, "Id not set");

		let service = await models.Service.findById(connection, this.id);

		this.lease_id = service.lease_id;
		this.product_id = service.product_id;
		this.property_bill_id = service.property_bill_id;
		this.price = service.price;
		this.start_date = service.start_date;
		this.end_date = service.end_date;
		this.name =  service.name;
		this.description =  service.description;
		this.qty = service.qty;
		this.recurring = service.recurring;
		this.prorate = service.prorate;
		this.prorate_out = service.prorate_out;
		this.taxable = service.taxable;

		this.Product = new Product({ id: service.product_id });
		await this.Product.find(connection);

	}

	async update(connection, body, company_id, properties){

		if(!this.id) e.th(500, "Id not set");
		await this.find(connection);
		await this.verifyAccess(connection, company_id, properties);

		this.price = body.price;
		this.start_date = body.start_date;
		this.end_date = body.end_date || null;
		this.qty = body.qty;
		this.description = body.description;
		this.recurring = body.recurring;
		this.prorate = body.prorate;
		this.prorate_out = body.prorate_out;
		this.taxable = body.taxable;

		await this.save(connection);


	}

	async create(connection, data,lease_id,  company_id){

		let product = new Product({
			id: data.product_id
		});

		await product.find(connection);
		await product.verifyAccess(company_id);

		this.taxable = product.taxable;
		this.lease_id = lease_id;
		this.price = data.price;
		this.description = data.description;
		this.name = product.name;
		this.qty = data.qty;
		this.recurring = !!data.recurring ?1:0;
		this.prorate = !!data.prorate;
		this.prorate_out = !!data.prorate_out;
		this.service_type = 'lease';
		this.status = 1;
		this.product_id = product.id;
		this.start_date = data.start_date ? moment(data.start_date).format('YYYY-MM-DD') : data.start_date;
		this.end_date = data.end_date ? moment(data.end_date).format('YYYY-MM-DD') : null;

		await this.save(connection);

	}

	async save(connection){

		await this.validate();
		var save = {
			lease_id: this.lease_id,
			product_id: this.product_id,
			property_bill_id: this.property_bill_id || null,
			price: this.price,
			start_date: this.start_date,
			end_date: this.end_date,
			name: this.name,
			description: this.description,
			qty: this.qty,
			recurring: !!this.recurring,
			prorate: !!this.prorate,
			prorate_out: !!this.prorate_out,
			service_type: this.service_type,
			taxable: this.taxable ? 1:0
		};

		console.log("SAVE SERVICE", save);
		let result = await models.Service.save(connection, save, this.id)
		if(!this.id) this.id = result.insertId;
	}

	validate(){

		return Promise.resolve().then(() => {

			if(this.end_date != null && this.end_date < this.start_date) {
				e.th(400,"Services start date cannot be before services end date");
			}

			if(!this.recurring && this.end_date == null){
				//_this.end_date = _this.start_date;
				//	throw new Error("Non-recurring services must have an end date");
			}
			return true;
		})
	}

	calculateRentDue(connection, period_start, period_end){
		var billedDays = [];
		var _this = this;
		return Promise.resolve().then(function(){

			if(!_this.Product || _this.Product.default_type != "rent") throw "Incorrect types:  This is not a rent product, or product information is missing";

			return models.Service.findBilledServices(connection, _this.id, period_start, period_end, 1)

		}).map(function(invoiceLine){

			var start = moment(invoiceLine.start_date);
			var end = moment(invoiceLine.end_date);

			while (start < end){
				if(start >= period_start && start < period_end){  // if in the billing period
					billedDays.push(start.clone().format('DDMMYY'));
				}
			}
			return invoiceLine;
		}).then(function getBillableLines(lines){

			var totalDaysInTimePeriod = period_end.diff(period_start, 'days');
			var unique = billedDays.filter(function(day, i){
				return billedDays.indexOf(day)== i;
			});
			return (totalDaysInTimePeriod - unique) / totalDaysInTimePeriod;
		}).then(function calculateRent(prorateMultiplier){
			_this.amount = _this.price * prorateMultiplier;

			return _this;
		});
	}

	calculateStartingCosts(lease, billed_months){

		var period_start = moment(this.start_date, 'YYYY-MM-DD');
		var lease_start = moment(lease.start_date, 'YYYY-MM-DD');


		this.servicePeriodEnd = lease.getNextBillingDate(null, true).startOf('day').subtract(1, 'day');
		this.servicePeriodStart = lease.getNextBillingDate(lease_start, true).startOf('day').subtract(1, 'Month');


		if(!this.recurring){
			if(period_start.isAfter(lease_start, 'day')){
				return 0;
			} else {
				return this.price;
			}
		} else {

			if(lease_start.isAfter(this.servicePeriodEnd, 'day')){
				return 0;
			}

			if(lease_start.isBefore(this.servicePeriodStart, 'day')){
				return this.price;
			}

			if(!this.prorate) return this.price;

			var totalDaysInTimePeriod = this.servicePeriodEnd.diff(this.servicePeriodStart, 'days') + 1;
			var totalDaysActiveService = this.servicePeriodEnd.diff(period_start, 'days') + 1;
			var prorateMultiplier = totalDaysActiveService / totalDaysInTimePeriod;
			prorateMultiplier = prorateMultiplier || 1;
			var proratedRent = Math.round((this.price * prorateMultiplier * Math.floor( totalDaysInTimePeriod / 30 )   )* 1e2) /1e2;

			// console.log("NOW", moment());
			// console.log("period_start", period_start);
			// console.log("totalDaysInTimePeriod", totalDaysInTimePeriod);
			// console.log("totalDaysActiveService", totalDaysActiveService);
			// console.log("proratedRent", proratedRent);


			return (proratedRent>0)? proratedRent : 0;

		}

	}

	getServicePeriod(invoice_period_start, invoice_period_end){

		var service_start = moment(this.start_date, 'YYYY-MM-DD').startOf('day');
		var service_end = this.end_date ?  moment(this.end_date).startOf('day') : null;

		var servicePeriodStart = invoice_period_start.isSameOrAfter(service_start) ? invoice_period_start : service_start;
		var servicePeriodEnd = (!service_end || invoice_period_end.isSameOrBefore(service_end)) ? invoice_period_end :service_end;

		return {
			start: servicePeriodStart,
			end: servicePeriodEnd
		}

	}

	getUniqueDiscountDays(discount, period_start, period_end){
		var billedDays = [];
		var start = moment(discount.start);
		var end = moment(discount.end)
		if(!end.isValid()){
			end = period_end
		}
		while (end.diff(start, 'day') >= 0 ){
			if(start.isSameOrAfter(period_start, 'day') && start.isSameOrBefore(period_end, 'day')){
				// if in the billing period
				billedDays.push(start.clone().format('YYYY-MM-DD'));
			}
			start.add(1, 'day');
		}
		return billedDays.filter((day, i) => {
			return billedDays.indexOf(day) == i;
		});

	}

	getUniqueInvoicedDays(invoiceLines, period_start, period_end) {
		var billedDays = [];
		invoiceLines.map(line => {
			var start = moment(line.start_date);
			var end = moment(line.end_date);
			while (end.diff(start, 'day') >= 0 ){
				if(start.isSameOrAfter(period_start, 'day') && start.isSameOrBefore(period_end, 'day')){
					// if in the billing period
					billedDays.push(start.clone().format('YYYY-MM-DD'));
				}
				start.add(1, 'day');
			}
		})

		return billedDays.filter((day, i) => {
			return billedDays.indexOf(day) == i;
		});



	}

	calculateDue(connection, invoice_period_start, invoice_period_end, lease, isAnniversaryMannerDiscountPresent){

		var service_period = this.getServicePeriod(invoice_period_start.clone(), invoice_period_end.clone());

		var billedDays = [];
		var lines = []

		// Find dates we have already billed between our invoice period
		return models.Service.findBilledServices(connection, this.id, service_period.start.clone(), service_period.end.clone(), this.recurring)
			.then(invoiceLines => {

				if(!this.recurring){
					if(invoiceLines.length) return null;
					return {
						service_period: service_period,
						lines: [{
							start:  service_period.start.clone(),
							end:    service_period.end.clone(),
							amount: this.price
						}]
					}
				}

				// loop through invoice periods calculating amount owed for each one, add adding to the lines array
				var BillingPeriodEnd = isAnniversaryMannerDiscountPresent ? invoice_period_end.clone() : lease.getBillDateAfterDate(service_period.end.clone()).subtract(1, 'day');
				// var BillingPeriodStart = moment(BillingPeriodEnd.clone().add(1, 'day').subtract(1, 'month').format('YYYY-MM-DD'));

				// Get billingend month days
				let endMonthDays = parseInt(BillingPeriodEnd.format('D'));
				// Get number of days in month before billingend month
				let daysInPreviousMonth = parseInt(BillingPeriodEnd.clone().subtract(1, 'months').daysInMonth());
				// Total days to be billed.
				let billingDays = parseInt(endMonthDays  + parseInt(daysInPreviousMonth - lease.bill_day));
				// Get the billing start date base on total days to be billed.
				var BillingPeriodStart = (lease.bill_day) > BillingPeriodEnd.daysInMonth() ? BillingPeriodEnd.clone().subtract(billingDays, 'days') : BillingPeriodEnd.clone().add(1, 'day').subtract(1, 'month');
				while (BillingPeriodEnd.isSameOrAfter(service_period.start)){


					// get number of days in billing period
					var DaysInBillingPeriod = BillingPeriodEnd.diff(BillingPeriodStart, 'days') + 1;



					// get number of active service days in billing period
					var ActiveServiceInBillingPeriodEnd = BillingPeriodEnd.isSameOrBefore(service_period.end) ? BillingPeriodEnd : service_period.end.clone();
					var ActiveServiceInBillingPeriodStart = BillingPeriodStart.isSameOrAfter(service_period.start) ? BillingPeriodStart : service_period.start.clone();
					var ActiveServiceDaysInBillingPeriod = ActiveServiceInBillingPeriodEnd.diff(ActiveServiceInBillingPeriodStart, 'days') + 1;

					// Get Unique Invoiced Days between two moment dates
					var billedDays = this.getUniqueInvoicedDays(invoiceLines, ActiveServiceInBillingPeriodStart, ActiveServiceInBillingPeriodEnd);

					// amount to pay for this line is (Active Service Days - Minus unique billed days ) / Total days in billing period
					var prorateMultiplier = (ActiveServiceDaysInBillingPeriod - billedDays.length) / DaysInBillingPeriod;
					prorateMultiplier = prorateMultiplier > 1? 1: prorateMultiplier;

					// If service is already billed then do not add it to in lines.
					if(prorateMultiplier !== 0){

						if(billedDays && billedDays.length){
							if(ActiveServiceInBillingPeriodStart.isSame(billedDays[0])) {
								ActiveServiceInBillingPeriodStart = moment(billedDays[billedDays.length - 1]).add(1, 'day');
							} else if(ActiveServiceInBillingPeriodEnd.isSame(billedDays[billedDays.length - 1])) {
								ActiveServiceInBillingPeriodEnd = moment(billedDays[0]).subtract(1, 'day');
							}
						}
						
						//** Invoice generated from worker server(less than a month) should always be prorated **/
	
						//if(this.prorate){
							lines.push({
								start:  ActiveServiceInBillingPeriodStart.clone(),
								end:    ActiveServiceInBillingPeriodEnd.clone(),
								amount: this.price * prorateMultiplier
							})
						// } else{
						// 	lines.push({
						// 		start:  ActiveServiceInBillingPeriodStart.clone(),
						// 		end:    ActiveServiceInBillingPeriodEnd.clone(),
						// 		amount: ActiveServiceDaysInBillingPeriod > billedDays.length ? this.price: 0
						// 	})
	
	
						//}
					}


					this.getPreviousBillingPeriod(BillingPeriodStart,BillingPeriodEnd);

				}

				return {
					service_period: service_period,
					lines:lines
				}
			});


	}

	getPreviousBillingPeriod(BillingPeriodStart,BillingPeriodEnd){

		// if last day of month, find last day of previous month.
		if(BillingPeriodEnd.clone().endOf('month').format('D') > BillingPeriodEnd.format('D')){
			let days = parseInt(BillingPeriodEnd.format('D'));
			days += (BillingPeriodStart.daysInMonth() - parseInt(BillingPeriodStart.format('D'))) +1;
			BillingPeriodEnd.subtract(days, 'days');
		} else if(BillingPeriodEnd.clone().endOf('month').format('D') == BillingPeriodEnd.format('D')){
			BillingPeriodEnd.subtract(1,'month').endOf('month');
		} else {
			BillingPeriodEnd.subtract(1, 'month');
		}
		BillingPeriodStart.subtract(1, 'month');
		return;
	}

	getLastBilled(connection){
		return models.Service.hasBeenBilled(connection, this.id).then(lastInvoiceLine => {
			this.last_billed = null;
			if(!lastInvoiceLine) return true;
			this.last_billed = lastInvoiceLine.end_date;
			return true;
		})
	}

	obscure(){
		var s = {
			id: this.id,
			lease_id: this.lease_id,
			product_id: this.product_id,
			property_bill_id: this.property_bill_id,
			price: this.price,
			start_date: this.start_date,
			end_date: this.end_date,
			name: this.name,
			qty: this.qty,
			recurring: this.recurring,
			prorate: this.prorate,
			prorate_out: this.prorate_out,
			amount: this.amount,
			servicePeriodStart: this.servicePeriodStart,
			servicePeriodEnd: this.servicePeriodEnd,
		};

		if(this.Product) s.Product = this.Product;
		if(this.Lease) s.Lease = this.Lease;
		if(this.BillsProperty) s.BillsProperty = this.BillsProperty;
		return s;

	}

	enumerateDaysBetweenDates(startDate, endDate) {
		var dates = [];

		var currDate = startDate.startOf('day');
		var lastDate = endDate.startOf('day');

		while(currDate.add(1, 'days').diff(lastDate) < 0) {
			dates.push(currDate.clone().toDate());
		}

		return dates;
	};

	makeFromTemplate(data){

		this.product_id = data.product_id;
		this.qty = data.qty;
		this.prorate = data.prorate;
		this.prorate_out = data.prorate_out;
		this.recurring = data.recurring;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.optional = data.optional;
		this.taxable = data.taxable;
		return;
	}

	static async getActiveInsuranceService(connection, lease_id){

		let active = await models.Service.findActiveInsuranceService(connection, lease_id);
		if(!active) return false;
		let activeInsuranceService = new Service(active);
		await activeInsuranceService.find(connection);
		await activeInsuranceService.getLastBilled(connection);

		let insurance = new Insurance({product_id: activeInsuranceService.product_id});
		await insurance.find(connection);
		activeInsuranceService.Insurance = insurance;
		activeInsuranceService.insurance_id = insurance && insurance.id;

		return activeInsuranceService;
	}

	static async getFutureInsuranceService(connection, lease_id) {

		let future = await models.Service.findFutureInsuranceService(connection, lease_id);
		if (!future) return false;
		let futureInsuranceService = new Service(future);
		await futureInsuranceService.find(connection);
		await futureInsuranceService.getLastBilled(connection);

		let insurance = new Insurance({ product_id: futureInsuranceService.product_id });
		await insurance.find(connection);
		futureInsuranceService.Insurance = insurance;
		futureInsuranceService.insurance_id = insurance && insurance.id;

		return futureInsuranceService;
	}

	static async getActiveRecurringInsuranceService(connection, lease_id, start_date){

		let activeRecurring = await models.Service.findActiveRecurringInsuranceService(connection, lease_id,start_date);
		if(!activeRecurring) return false;
		let activeRecurringInsuranceService = new Service(activeRecurring);
		await activeRecurringInsuranceService.find(connection);
		await activeRecurringInsuranceService.getLastBilled(connection);

		let insurance = new Insurance({product_id: activeRecurringInsuranceService.product_id});
		await insurance.find(connection);
		activeRecurringInsuranceService.Insurance = insurance;
		activeRecurringInsuranceService.insurance_id = insurance && insurance.id;

		return activeRecurringInsuranceService;

	}

	static async getActiveRentService(connection, lease_id, date){

		let active = await models.Service.findActiveRentService(connection, lease_id, date);
		if(!active) return false;
		let activeRentService = new Service(active);
		await activeRentService.find(connection);
		await activeRentService.getLastBilled(connection);

		return activeRentService;
	}

	static async getFutureRentServices(connection, lease_id, date) {

		let res_future_rent_services = await models.Service.findFutureRentServices(connection, lease_id, date);
		if (!res_future_rent_services) return null;

		let future_rent_services = [];

		for (let i = 0; i < res_future_rent_services.length; i++) {
			const future_rent_service = new Service(res_future_rent_services[i]);
			await future_rent_service.find(connection);
			future_rent_services.push(future_rent_service);
		}

		return future_rent_services;
	}

	static async endFutureServices(connection, data, frs_ids) {
		await models.Service.updateServicesInBulk(connection, data, frs_ids);
	}

	//**** * Run getLastBilled if you don't want to let them edit a billed service * ***//
	async endCurrentService(connection, date){

		let data = {};
		date = date ? date : moment().subtract(1, 'day').format('YYYY-MM-DD');

		if(this.last_billed && this.last_billed > date) e.th(409, "This change must take place after " + this.last_billed)
		data = {
			end_date: date,
			status: 1
		};

		await models.Service.save(connection, data, this.id )

	}

}

module.exports = Service;

var Product      = require('../classes/product.js');
var Insurance		= require('../classes/insurance');