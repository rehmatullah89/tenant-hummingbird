"use strict";

var models  = require(__dirname + '/../models');
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
		this.DiscountTotals = {};

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

	/*
		make()

		Validates Invoice line,
		Checks permissions
		Creates tax lines items if needed

		@connection
		@discounts
		@company_id
		@lease_id

	*/

	async make(connection, discounts, company_id, lease_id, unit_id, property_id){

		let taxLines;
		this.validate();
		if(!this.Product || !this.Product.id || !this.Product.company_id) await this.findProduct(connection, property_id);

		if (this.Product.company_id !== company_id) {
			e.th(403, "You do not have access to this product")
		}

		if (this.service_id){
			await this.findService(connection);
			if (this.Service.product_id !== this.product_id) {
				e.th(400, "Misconfiguration. Product/Service mismatch.")
			}

			if (lease_id && this.Service.lease_id != lease_id) {
				e.th(400, "Misconfiguration. This service does not belong to this lease")
			}

		}

		
		if(this.cost == null || typeof(this.cost) == "undefined" || isNaN(this.cost)) this.cost = this.Product.price;
		if((this.Service && this.Service.taxable) || (!this.Service && this.Product.taxable)) {

			taxLines = new TaxLines(this);
			taxLines.unit_id = unit_id;
			taxLines.property_id = property_id;
			await taxLines.make(connection)
			this.TaxLines = taxLines.taxlines;

		}

		// return this.validate()
		// 	.then(() => this.findProduct(connection))
		// 	.then(() => {
		//
		// 		if (!this.service_id) return;
		// 		return this.findService(connection)
		// 			.then(() => {
		//
		// 				return true;
		// 			})
		// 	})
		// 	.then(() => {
		//
		// 		if(!this.cost) this.cost = this.Product.price;
		//
		// 		if((this.Service && !this.Service.taxable) || (!this.Service && !this.Product.taxable)) return true;
		//
		// 		var taxLines = new TaxLines(this);
		// 		return taxLines.make(connection).then(() => {
		// 			this.TaxLines = taxLines.taxlines;
		// 			return true;
		// 		});
		// 	})
	}

	async find(connection, payload = {}){
		const { property_id } = payload;
		if (!this.id) e.th(500, 'Invoice ID not defined');

		let line = await  models.Billing.findInvoiceLinesById(connection, this.id);

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

		await this.findProduct(connection, property_id);
		await this.findTaxLines(connection);
		await this.findDiscountLines(connection);
		await this.findService(connection);
		await this.calculateLineTotal(connection);
	}

	findService(connection){

		if(!this.service_id) return false;
		return models.Service.findById(connection, this.service_id ).then(service => {
			this.Service = service;
			return true;
		})
	}

	async findUnit(connection){
		if(!this.invoice_id) return true;
		let unit = await models.Invoice.findUnit(connection, this.invoice_id);
		this.Unit = unit;
	}


	async findProduct(connection, property_id){
			if(!this.product_id) return false;
      this.Product = await models.Product.findById(connection, this.product_id, null, property_id );
	}


	async findTaxLines(connection){
    // todo build tax line object
    if(!this.id) throw "Invoice line id not defined";
    this.TaxLines = await models.TaxLine.findByTaxLineByInvoiceLineId(connection, this.id);
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

			var discountLineItem = new DiscountLines({ ...discountLine })

			return discount.find(connection).then(function(){
				discountLineItem.Promotion = discount.Promotion;
				return discountLineItem;
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
			description: _this.description,
			qty: _this.qty,
			cost: Math.round(_this.cost * 1e2) / 1e2,
			date: _this.date,
			start_date: _this.start_date,
			end_date: _this.end_date,
			TaxLines: _this.TaxLines,
			DiscountLines: _this.DiscountLines,
			total_tax: Math.round(_this.total_tax * 1e2) / 1e2,
			total_discounts: Math.round(_this.total_discounts * 1e2) / 1e2
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
		var _this = this;
		var error = false;
		return Promise.resolve()
			.then(() => {

				if(_this.product_id && !validator.isInt(_this.product_id + '')) error = 'Product id must be an integer';
				if(_this.discount_id && !validator.isInt(_this.discount_id + '')) error = 'Discount id must be an integer or be null';
				if(!_this.product_id)  error = 'This line must include a product id';
				if(validator.isEmpty(_this.qty + '')) error = 'Qty must not be empty';

				if(error){
					var e = new Error(error);
					e.code = 403;
					throw e;
				}
				return true;
			})

	}

	async save(connection){

      await this.validate();
			await this.calculateLineTotal();

      let save = {
        invoice_id: this.invoice_id,
        product_id: this.product_id,
        qty: this.qty,
        date: this.date,
        start_date: this.start_date,
        end_date: this.end_date,
        service_id: this.service_id,
        cost: this.cost
	  };
	  
      // removing duplicate promotions if any
      if (this.DiscountLines) {
        let newDiscountLines = []
        this.DiscountLines.forEach(discountLine => {
            let id = discountLine.Promotion ? discountLine.Promotion.id : null
            if(newDiscountLines.findIndex(x=>  x.Promotion.id === id) === -1){
                newDiscountLines.push(discountLine)
            }
        })
        this.DiscountLines = newDiscountLines
	  }
	  
      let result = await models.Invoice.saveInvoiceLine(connection, save, this.id);

      if(result.insertId) this.id = result.insertId;

      if (this.TaxLines){
        for(let i = 0; i < this.TaxLines.length; i++){
          this.TaxLines[i].invoice_line_id = this.id;
          await this.TaxLines[i].save(connection);
        }
      }

      if (this.DiscountLines) {
        for(let i = 0; i < this.DiscountLines.length; i++){
		  this.DiscountLines[i].invoice_line_id = this.id;
		  this.DiscountLines[i].id = null
          await this.DiscountLines[i].save(connection);
        }
	  }
	  
	  await models.Invoice.updateInvoiceTotal(connection, save.invoice_id);
      await models.Invoice.updateInvoiceTotalTax(connection, save.invoice_id);
      await models.Invoice.updateInvoiceTotalDiscounts(connection, save.invoice_id);
	  	  
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

	calculateLineTotal(){

		var discountsExcludedFromTax = 0;
		var lineTotal = (this.qty * this.cost);

		var discounts = 0;
		
		if(this.DiscountLines.length){
			this.DiscountLines.forEach(discountLine => {
			
				this.DiscountTotals[discountLine.discount_id] = this.DiscountTotals[discountLine.discount_id] || {
					name: discountLine.Promotion.name,
					description: discountLine.Promotion.description,
					total: 0,
					discount_id: discountLine.discount_id
				}

				this.DiscountTotals[discountLine.discount_id].total +=  (discountLine.amount);


				if(discountLine.pretax){
					discountsExcludedFromTax += (discountLine.amount);
				}
				discounts += (discountLine.amount)
			});
		}
		var amountToTax = (lineTotal - discountsExcludedFromTax > 0)? lineTotal - discountsExcludedFromTax: 0 ;
		var taxamt = 0;
		if (this.TaxLines?.length) {
			this.TaxLines.forEach(taxLine => {
				taxLine.amount = InvoiceLine.calculateTax(amountToTax, taxLine.taxrate)
			});
		}
		
		this.totalDiscounts = Math.round(discounts * 1e2) / 1e2;
		this.totalTax = Math.round(this.TaxLines.reduce((a,b) => a + b.amount, 0) * 1e2) / 1e2;
		this.subtotal = Math.round(lineTotal * 1e2) / 1e2;
		this.total = Math.round( (lineTotal - discounts + taxamt) * 1e2) / 1e2;


	}

	totalLineCredit(date, move_out = false, isActiveInv = false, prorateRentOut = true) {
		let shouldProrateRentOut = this.Product && this.Product.default_type == 'rent' && !prorateRentOut;

		if((move_out && (!this.Service?.prorate_out || shouldProrateRentOut)) || (!move_out && isActiveInv && (!this.Service || !this.Service.recurring))) {
			this.Credit.total = 0;
			return;
		};

		this.Credit.period_end_date = this.period_end_date();
		this.Credit.period_start_date = this.period_start_date();
		this.Credit.prorate_date = this.prorate_date(date);
		this.Credit.period_days = this.diff_days();
		this.Credit.prorate_days = this.prorate_days(date);
		if(this.Credit.prorate_days < 0) {
			this.Credit.prorate_days = 0
		}
		this.Credit.per_day = this.per_day();
		this.Credit.total = Math.round((this.Credit.prorate_days  * this.Credit.per_day) * 1e2) / 1e2;
		
	}

	per_day(){
		if(!this.Credit.period_days) return 0;
		return (this.total + this.total_tax || 0) / this.diff_days();
	}

	diff_days(){
		return  this.Credit.period_end_date.diff(this.Credit.period_start_date, 'days') + 1;
	}

	prorate_days(date){
		var period_end =  moment(date).startOf('day');
		var days_to_bill =  period_end.diff(this.Credit.period_start_date, 'days');
		return this.Credit.period_days - (days_to_bill > 0 ? days_to_bill : 0);
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

	prorate_date(date){
		var date = moment(date, 'YYYY-MM-DD').startOf('day');
		var start_date = this.period_start_date();
		return (date > start_date)? date: start_date; 
	}


  getUsedAmt(date){
    date = date || moment();
    let start_date = moment(this.start_date, 'YYYY-MM-DD');
    let end_date = moment(this.end_date, 'YYYY-MM-DD');

    if(date.format('x') > end_date.format('x')  ) return Math.round(this.qty * this.cost * 1e2) / 1e2;

    let days_in_period = end_date.diff(start_date, 'days');
    let days_used = date.diff(start_date, 'days');
    let used_amt = Math.round(days_used / days_in_period * (this.qty * this.cost) *1e2) / 1e2;



    console.log('end_date', end_date.format('YYYY-MM-DD'));
    console.log('start_date', start_date.format('YYYY-MM-DD'));
    console.log('days_in_period', days_in_period);
    console.log('days_used', days_used);
    console.log('used_amt', used_amt);

    return used_amt;


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