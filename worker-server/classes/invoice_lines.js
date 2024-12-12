"use strict";

var models  = require(`./../models`);
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator');

var moment  = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');


class InvoiceLine {

	constructor(data){
		data = data || {};
		var _this = this;
		this.id = data.id || null;
		this.invoice_id = data.invoice_id || null;
		this.product_id = data.product_id || null;
		this.discount_id = data.discount_id || null;
		this.lease_id = data.lease_id || null;
		this.property_bill_id = data.property_bill_id || null;
		// this.type = data.type || null;
		this.qty = data.qty || 1;
		this.cost = data.cost;
		this.date = data.date || null;
		this.start_date = data.start_date || null;
		this.end_date = data.end_date || null;
		this.service_id = data.service_id || null;
		this.description = data.description || null;
		this.qb_id = data.qb_id || null;
		this.total_tax = data.total_tax || 0;
		this.total_discounts = data.total_discounts || 0;
		this.PropertyBill = {};
		this.Unit = {};
		this.Lease = {};
		this.Discount = {};
		this.Service =  data.Service;
		this.Product = {};
		this.TaxLines = [];
		this.DiscountLines = [];
		this.DiscountTotals = [];

		this.Credit = {};
		this.total = 0;


		this.qboPromise = {};
		this.msg = '';
		this.totalTax = 0;
		this.totalDiscounts = 0;
		this.subtotal = 0;
		this.total = 0;

		return this;
	}

	addDiscount(discount){
		this.DiscountLines.push(discount);
	}

	async make(connection, unit_id){

		let taxLines;

		this.validate();
		await this.findProduct(connection);

		if(!this.cost) this.cost = this.Product.price;

		if((this.Service && this.Service.taxable) || (!this.Service && this.Product.taxable)) {
			taxLines = new TaxLines(this);
			taxLines.unit_id = unit_id;
			await taxLines.make(connection)
			this.TaxLines = taxLines.taxlines;
		}
	}

	find(connection, payload = {}){
		const { property_id } = payload;
		if (!this.id) throw 'Invoice ID not defined'

		return models.Billing.findInvoiceLinesById(connection, this.id).then(line => {
			this.invoice_id = line.invoice_id;
			this.product_id = line.product_id;
			this.discount_id = line.discount_id;
			this.lease_id = line.lease_id;
			this.property_bill_id = line.property_bill_id;
			this.qty = line.qty;
			this.cost = Math.round(line.cost * 1e2) / 1e2;
			this.date = line.date;
			this.start_date = line.start_date;
			this.end_date = line.end_date;
			this.service_id = line.service_id;
			this.qb_id = line.qb_id;
			this.total_tax = Math.round(line.total_tax * 1e2) / 1e2;
			this.total_discounts = Math.round(line.total_discounts * 1e2) / 1e2;

			return this.findProduct(connection, property_id)
				.then(() => this.findTaxLines(connection))
				.then(() => this.findDiscountLines(connection))
				.then(() => this.findService(connection))
				.then(() => this.calculateLineTotal(connection));

		});
		return true;
	}

	update(data, invoice){
		this.product_id = data.product_id;
		this.discount_id = data.discount_id;
		this.service_id = data.service_id;
		this.description = data.description;
		this.type = data.type || null;
		this.qty = data.qty;
		this.cost = Math.round(data.cost * 1e2) / 1e2;
		this.Product = data.Product;
		this.start_date = invoice.period_start;
		this.end_date = invoice.period_end;
	}

	findService(connection){
		var _this = this;
		if(!this.service_id) return false;

		return models.Service.findById(connection, this.service_id ).then(function(service){
			_this.Service = service;
			return true;
		})
	}

	async findUnit(connection){
		if(!this.invoice_id) return true;
		let unit = await models.Invoice.findUnit(connection, this.invoice_id);
		this.Unit = unit;
	}


	findProduct(connection, property_id) {
		var _this = this;
		return Promise.resolve().then(function(){
			if(_this.product_id){
				return models.Product.findById(connection, _this.product_id, null, property_id ).then(function(product){
					_this.Product = product;
					return true;
				})
			}
			return true;
		})
	}

	findLease(connection){
		var _this = this;

		return Promise.resolve().then(function(){
			return _this;
		})
	}

	findTaxLines(connection){
		var _this = this;

		return Promise.resolve().then(function(){
			if(!_this.id) throw "Invoice line id not defined";
			return models.TaxLine.findByTaxLineByInvoiceLineId(connection, _this.id);
		}).then(function(taxLinesRes){
			_this.TaxLines = taxLinesRes;
			return true;
		}).catch(function(err){
			console.log(err);
			_this.msg = err.toString();
			return false;
		})
	}

	findDiscountLines(connection){
		var _this = this;

		return Promise.resolve().then(function(){
			if(!_this.id) throw "Invoice line id not defined";
			return models.Discount.findByDiscountLineByInvoiceLineId(connection, _this.id);
		}).map(function(discountLine){

			var discount = new Discount({
				id: discountLine.discount_id
			});

			return discount.find(connection).then(function(){
				discountLine.Promotion = discount.Promotion;
				return discountLine;
			});

		}).then(function(discoutLinesRes){
			_this.DiscountLines = discoutLinesRes;
			return true;
		}).catch(function(err){

			_this.msg = err.toString();
			return false;
		})
	}

	findDiscount(connection){
		var _this = this;
		if(_this.discount_id){

			return models.Promotion.getDiscountById(connection, _this.discount_id )
				.then(function(discount){
					if(!discount) return false;
					_this.Discount = discount;
					_this.Discount.Promotion = {};
					return models.Promotion.getById(connection, discount.promotion_id);
				}).then(function(promotion) {
					_this.Discount.Promotion = promotion;
					return true;
				});
		}
		return _this;
	}

	findPropertyBill(connection){
		var _this = this;
		return Promise.resolve().then(function(){
			
			return _this;
		})
	}

	getValues(){
		var _this = this;

		var data = {
			id: _this.id,
			invoice_id: _this.invoice_id,
			product_id: _this.product_id,
			discount_id: _this.discount_id,
			lease_id: _this.lease_id,
			property_bill_id: _this.property_bill_id,
			service_id: _this.service_id,
			qty: _this.qty,
			cost: Math.round(_this.cost * 1e2) / 1e2,
			date: _this.date,
			start_date: _this.start_date,
			end_date: _this.end_date,
			TaxLines: _this.TaxLines,
			DiscountLines: _this.DiscountLines
		}

		if(_this.Product){
			data.Product = {
				id: _this.Product.id,
				company_id: _this.Product.company_id,
				name: _this.Product.name,
				active: _this.Product.name,
				price: _this.Product.price,
				type: _this.Product.type,
				default_type: _this.Product.default_type,
				taxable: _this.Product.taxable,
				taxrate: _this.Product.taxrate,
				qb_income_account: _this.Product.qb_income_account
			}
		}


		if(_this.Discount){
			data.Discount = _this.Discount;
			data.Discount.id = _this.Discount.id;
			data.Discount.promotion_id = _this.Discount.promotion_id;

			if(_this.Discount.Promotion){
				data.Discount.Promotion = _this.Discount.Promotion;
				data.Discount.Promotion.id = _this.Discount.Promotion.id;
				data.Discount.Promotion.company_id = _this.Discount.Promotion.company_id;
			}


		}

		return data;
	}

	validate(){

		if(this.product_id && !validator.isInt(this.product_id + '')) e.th(403, 'Product id must be an integer');
		if(this.discount_id && !validator.isInt(this.discount_id + '')) e.th(403, 'Discount id must be an integer or be null')
		if(!this.product_id)  e.th(403, 'This line must include a product id');
		if(validator.isEmpty(this.qty + '')) e.th(403, 'Qty must not be empty');

	}

	async save(connection){

		this.validate();

		var save = {
			invoice_id: this.invoice_id,
			product_id: this.product_id,
			qty: this.qty,
			date: this.date,
			start_date: this.start_date,
			end_date: this.end_date,
			service_id: this.service_id,
			cost: this.cost
		};

		let result = await models.Invoice.saveInvoiceLine(connection, save)
		if( result.insertId){
			this.id = result.insertId
		}

		if (this.TaxLines.length) {
			for(let i = 0; i < this.TaxLines.length; i++){
				this.TaxLines[i].invoice_line_id = this.id;
				await this.TaxLines[i].save(connection)
			}
		}
		if (this.DiscountLines.length) {
			for(let i = 0; i < this.DiscountLines.length; i++){
				this.DiscountLines[i].invoice_line_id = this.id;
				await this.DiscountLines[i].save(connection)
			}

		}
	}

	calculateLineTotal(){

		var discountsExcludedFromTax = 0;
		var lineTotal = (this.qty * this.cost);

		var discounts = 0;

		if(this.DiscountLines.length){
			this.DiscountLines.forEach(discountLine => {
				//// TODO - I believe we don't need it any more, so will keep it here for a couple of weeks.
				// if(this.DiscountTotals[discountLine.discount_id]){
				// 	this.DiscountTotals[discountLine.discount_id].total +=  (discountLine.amount);
				// } else {
				// 	this.DiscountTotals[discountLine.discount_id] =  {
				// 		name: discountLine.Promotion.name,
				// 		description: discountLine.Promotion.description,
				// 		total: discountLine.amount,
				// 		discount_id: discountLine.discount_id
				// 	};
				// }
				if(discountLine.pretax){
					discountsExcludedFromTax += (discountLine.amount);
				}
				discounts += (discountLine.amount)
			});
		}
		var amountToTax = (lineTotal - discountsExcludedFromTax > 0)? lineTotal - discountsExcludedFromTax: 0 ;
		if (this.TaxLines?.length) {
			this.TaxLines.forEach(taxLine => {
				taxLine.amount = InvoiceLine.calculateTax(amountToTax, taxLine.taxrate)
			});
		}
		this.totalDiscounts = Math.round(discounts * 1e2) / 1e2;
		this.totalTax = Math.round(this.TaxLines.reduce((a,b) => a + b.amount, 0) * 1e2) / 1e2;
		this.subtotal = Math.round(lineTotal * 1e2) / 1e2;
		this.total = Math.round( (lineTotal - discounts + this.totalTax) * 1e2) / 1e2;
	}

	totalLineCredit(date){

		if(!this.Service.prorate) {
			this.Credit.total = 0;
			return;
		};
		this.Credit.period_end_date = this.period_end_date();
		this.Credit.period_start_date = this.period_start_date();
		this.Credit.period_days = this.diff_days();
		this.Credit.prorate_days = this.prorate_days(date);
		this.Credit.per_day = this.per_day();
		console.log("aaaaaa", this.Credit.prorate_days  * this.Credit.per_day)
		console.log("ccccccc", Math.round(this.Credit.prorate_days  * this.Credit.per_day * 1e2 ) / 1e2)
		//this.Credit.total = Math.round(this.Credit.prorate_days  * this.Credit.per_day * 1e2 ) / 1e2;
		this.Credit.total = this.Credit.prorate_days  * this.Credit.per_day;
	}

	per_day(){
		if(!this.Credit.period_days) return 0;
		return this.total / this.diff_days();
	}

	diff_days(){
		return  this.Credit.period_end_date.diff(this.Credit.period_start_date, 'days') + 1;
	}

	prorate_days(date){
		var period_end =  moment(date).startOf('day');
		var days_to_bill =  period_end.diff(this.Credit.period_start_date, 'days');
		return this.Credit.period_days - days_to_bill;
	}

	period_start_date(){
		var line_start_date = moment(this.start_date,'YYYY-MM-DD').startOf('day');
		if(!this.Service) return line_start_date;
		var service_start_date = moment(this.Service.start_date,'YYYY-MM-DD').startOf('day');
		return (service_start_date > line_start_date)? service_start_date: line_start_date;
	}

	period_end_date(){
		var line_end_date = moment(this.end_date,'YYYY-MM-DD').startOf('day');
		if(!this.Service || !this.Service.end_date) return line_end_date;
		var service_end_date = this.Service.end_date ? moment(this.Service.end_date,'YYYY-MM-DD').startOf('day'): null;
		return (!service_end_date || service_end_date > line_end_date)? line_end_date: service_end_date;
	}

	static calculateTax(amount, tax_rate) {
		let tax_amt = (amount * tax_rate) / 100;
		return rounding.round(tax_amt);
	}

}



module.exports = InvoiceLine;

var TaxLines  = require(__dirname + '/tax_lines.js');
var DiscountLines  = require(__dirname + '/discount_lines.js');
var Discount  = require(__dirname + '/discount.js');
const rounding = require('../modules/rounding');