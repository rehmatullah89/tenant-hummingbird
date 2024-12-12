"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();
var Promise = require('bluebird');
const { unit } = require('joi');
var QB = require('node-quickbooks');
var validator = require('validator');
var e  = require(__dirname + '/../modules/error_handler.js');
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
		this.company_id = '';
		this.unit_id = '';
		this.property_id = '';

		return this;
	}

	async make(connection){
		if(!this.InvoiceLine.Product){
			e.th(500, "Product not set")
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
		console.log("unit", unit)
		console.log("this.InvoiceLine.Product.default_type", this.InvoiceLine.Product.default_type)
		if(unit){
			let type;

			switch(this.InvoiceLine.Product.default_type){
				case 'rent':
					type = unit.type;
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
			
			if(type) property_type_tax = await models.Property.findTaxRate(connection, null, unit && unit.property_id ? unit.property_id : this.property_id, type);
			
			console.log("property_type_tax", property_type_tax)
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

}


module.exports = TaxLines;

class TaxLine {

	constructor(data){

		this.id = data.id || null;
		this.invoice_line_id = data.invoice_line_id || null;
		this.tax_authority_id = data.tax_authority_id || null;
		this.taxrate = data.taxrate || null;
		this.amount = '';
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
	  amount: this.amount,
	  tax_profile_id: this.tax_profile_id,
    };
    let result = await models.TaxLine.save(connection, toSave, this.id );
    if(result.insertId) this.id = result.insertId;
    return true;

	}

}

const { calculateTax } = require('./invoice_lines');