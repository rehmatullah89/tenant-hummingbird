"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator');
var Enums = require(__dirname + '/../modules/enums.js');
var Unit = require(__dirname + '/../classes/unit.js');

/*
 This class takes an InvoiceLine in the constructor as generates the applicable taxes for it.

 The InvoiceLine object should include Product data from the findProduct method of the InvoiceLines class.

 In the future we will generate from the Tax Authority, but for now, we take taxable amount from settings.
 */

class TaxLines {

	constructor(InvoiceLIne){

		var _this = this;
		this.InvoiceLine = InvoiceLIne;
		this.taxlines = [];
		this.qboPromise = {};
		this.msg = '';
		this.company_id;
		this.unit_id = '';

		return this;
	}

	async make(connection){
		if(!this.InvoiceLine.Product){
			var error = new Error("Product not set");
			error.code = 500;
			throw error
		}

		// if product is not taxable, there is nothing to do
		if((this.InvoiceLine.Service && !this.InvoiceLine.Service.taxable) || (!this.InvoiceLine.Service && !this.InvoiceLine.Product.taxable)) return true;

		if(!this.InvoiceLine.Product.company_id) {
			e.th(500, "Company ID not set");
		}

		let property_type_tax;
		let unit;

		if(this.unit_id){
			unit = new Unit({id: this.unit_id});
			await unit.find(connection);
		} else {
			await this.InvoiceLine.findUnit(connection);
			unit = this.InvoiceLine.Unit;
		}		

		if(unit){
			let type = TaxLines.getTaxProfileTypeByProductType(this.InvoiceLine.Product.default_type, unit.type);
			if(type) property_type_tax = await models.Property.findTaxRate(connection, null, unit.property_id, type);
		}


		let tax_data;

		if(property_type_tax){
			tax_data = {
				taxrate: property_type_tax.tax_rate,
				tax_profile_id: property_type_tax.tax_profile_id
			}

			var lineTotal = (this.InvoiceLine.cost * this.InvoiceLine.qty) ;

			this.taxlines.push(new TaxLine({
				invoice_line_id: this.InvoiceLine.id,
				tax_authority_id: null,
				qb_tax_code: tax_data.qbTaxCode,
				taxrate: tax_data.taxrate,
				tax_profile_id: tax_data.tax_profile_id,
				amount: calculateTax(lineTotal, tax_data.taxrate)
			}));

		}

		return true;
	};

	static getTaxOfService(service, products, property_tax_profiles, params = []){
		let { unit_type } = params;
		
		let service_tax = 0, type = '', property_type_tax = null;

		type = TaxLines.getTaxProfileTypeByProductType(products.find(p => p.id === service.product_id).default_type, unit_type);

		if (type) property_type_tax = property_tax_profiles.find(ptp => ptp.type === type);

		console.log("property_type_tax", property_type_tax);

		if(property_type_tax){
			service_tax = calculateTax((service.qty * service.price), property_type_tax.tax_rate);
		}

		return service_tax;
	}

	static getTaxProfileTypeByProductType(product_type, unit_type) {
		if(!product_type) e.th(500, "product_type not found");
		
		let type = null;
		switch (product_type.toLowerCase()) {
			case 'rent':
				type = unit_type;
				break;
			case 'late':
				type = Enums.PRODUCT_TYPES.FEE
				break;
			case 'insurance':
				type = Enums.PRODUCT_TYPES.INSURANCE
				break;
			case 'product':
				type = Enums.PRODUCT_TYPES.MERCHANDISE
				break;
			case 'auction':
				type = Enums.PRODUCT_TYPES.AUCTION
				break;
			case 'security':
			case 'cleaning':
				type = Enums.PRODUCT_TYPES.DEPOSIT
				break;
		}
		return type;
	}

}


module.exports = TaxLines;



class TaxLine {

	constructor(data){

		var _this = this;
		this.id = data.id || null;
		this.invoice_line_id = data.invoice_line_id || null;
		this.tax_authority_id = data.tax_authority_id || null;
		this.taxrate = data.taxrate || null;
		this.amount = data.amount || null;
		this.qboPromise = {};
		this.msg = '';
		this.tax_profile_id = data.tax_profile_id || null;

		return this;
	}

	validate(){
		var _this = this;
		var error = false;

		return Promise.resolve().then(() => {
			if(!_this.invoice_line_id) error =  "Missing invoiceline id";
			//if(!_this.taxrate) error = "Missing taxrate";
			if(error) {
				var e = new Error(error);
				e.code = 400;
				throw e
			}
			return true;
		});
	}

	async save(connection){
		await this.validate();

		var toSave = {
			invoice_line_id: this.invoice_line_id,
			tax_authority_id: this.tax_authority_id,
			taxrate: this.taxrate,
			amount: this.amount || null,
			tax_profile_id: this.tax_profile_id,
		};
		let result = await models.TaxLine.save(connection, toSave, this.id );
		if(result.insertId) this.id = result.insertId;
		return true;

	}

}

const { calculateTax } = require('./invoice_lines');
const e = require('../modules/error_handler');