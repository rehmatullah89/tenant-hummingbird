"use strict";

const models  = require(__dirname + '/../models');
const settings    = require(__dirname + '/../config/settings.js');
const Promise = require('bluebird');
const QB = require('node-quickbooks');
const validator = require('validator');
const moment      = require('moment');
const Product  = require(__dirname + '/../classes/product.js');
const e  = require(__dirname + '/../modules/error_handler.js');

class Insurance {

	constructor(data){

		data = data || {};
		this.id = data.id ;

		this.company_id = data.company_id ;
		this.name = data.name;
		this.description = data.description;
		this.taxable = data.taxable;
		this.prorate = data.prorate;
		this.prorate_out = data.prorate_out;
		this.default_type = 'insurance';
		this.type = 'product';

		this.product_id = data.product_id ;
		this.coverage = data.coverage ;
		this.premium_value = data.premium_value ;
		this.premium_type = data.premium_type ;
		this.deductible = data.deductible ;

		this.premium = '';
		this.msg = '';
		this.Product = {};
		this.Properties = [];
		this.unit_type = data.unit_type;

		this.gl_account_code = data.gl_account_code || null;
		this.gl_account_name = data.gl_account_name || null;
		this.gl_account_active = data.gl_account_active || null;
	}

	validate(){
		if (!this.company_id) e.th(400, 'Invalid company id');
	}

	async save(connection){
		this.validate();

		let save = {
			company_id: this.company_id,
			product_id: this.product_id,
			coverage: this.coverage,
			premium_value: this.premium_value,
			premium_type: this.premium_type,
			deductible: this.deductible,
			unit_type: this.unit_type
		};

		let result = await models.Insurance.save(connection, save, this.id)
		this.id = (result.insertId) ? result.insertId: this.id;			
	}

	async delete(connection){

		return await models.Insurance.delete(connection, this.id);
	}

	async find(connection){
		if(!this.id && !this.product_id) e.th(500, "Id not set");//
		let data = {};

		if(this.id){
			data = await models.Insurance.findById(connection, this.id);
		} else {
			data = await models.Insurance.findByProductId(connection, this.product_id);
		}

		if(!data) e.th(404, "Insurance not found");

		this.id = data.id;
		this.company_id = data.company_id ;
		this.product_id = data.product_id ;
		this.coverage = data.coverage ;
		this.premium_value = data.premium_value ;
		this.premium_type = data.premium_type ;
		this.deductible = data.deductible ;
		this.unit_type = data.unit_type

		let product = new Product({id: this.product_id});
		await product.find(connection);
		await product.getVendor(connection);
		await product.findProductGlAccount(connection);

		if(!product) e.th(404, "Product not found");

		this.product_id = product.id;
		this.description = product.description;
		this.name = product.name;
		this.taxable = product.taxable;
		this.prorate = product.prorate;
        this.prorate_out = product.prorate_out;
        this.recurring = product.recurring;
        this.taxable = product.taxable;
		this.Vendor = product.Vendor;
		this.income_account_id = product.income_account_id;
		this.gl_account_code = product.gl_account_code;
		this.gl_account_name = product.gl_account_name;
		this.gl_account_active = product.gl_account_active;

	}

	setPremium(rent){

		if(this.premium_type === '$') this.premium = this.premium_value;
		if(this.premium_type === '%') this.premium = Math.round(this.premium_value * rent) / 1e2;


		return true;
	}

	verifyAccess(company_id){
		if(this.company_id !== company_id) {
			e.th(403, "Not authorized")
		}
		return Promise.resolve();
	}

	values(){
		return {
			id: this.id,
			company_id: this.company_id,
			name: this.name,
			description: this.description,
			active: this.active,
			price: this.price,
			prorate: this.prorate,
			prorate_out: this.prorate_out,
			recurring: this.recurring,
			type: this.type,
			default_type: this.default_type,
			taxable: this.taxable,
			qb_income_account: this.qb_income_account
		};
	}

	update(data){
		this.coverage = data.coverage || null;
		this.deductible = data.deductible || null;
		this.premium_value = data.premium_value;
		this.premium_type = data.premium_type;
		this.unit_type = data.unit_type;
	}

	static async search(connection, conditions, searchParams, company_id, count){
		return await models.Insurance.search(connection, conditions, searchParams, company_id, count);
	}

	async getProperties(connection){
		if(!this.product_id) e.th(403, "Invalid product Id");
		
		let prodProperties = await models.Product.findPropertiesByProduct(connection, this.product_id);
		this.Properties = prodProperties.map(val => {
		  return {id: val.property_id};
		});
	  }

	/* Takes a list of template insurance services and turns them into Services */
	static async makeServicesFromTemplate(connection, templateInsuranceServices, lease, start_date, company_id){

		let insuranceServices = [];

		for (let i = 0; i < templateInsuranceServices.length; i++ ){
			let service = new Service();
			service.makeFromTemplate(templateInsuranceServices[i]);
			let insurance = new Insurance(templateInsuranceServices[i].Insurance);

			await insurance.find(connection);
			insurance.setPremium(lease.rent);
			service.price = insurance.premium;
			service.Product = insurance;


			let invoice = {};
			let datetime = await lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD');
			invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: moment(datetime).format('YYYY-MM-DD'),
				company_id: company_id,
				type: "auto",
				status: 1
			});
			invoice.Lease = lease;
			invoice.Company = {
				id: company_id
			};

			service.end_date = null;

			if(start_date){
				service.start_date = lease.getNextBillingDate(moment(start_date, 'YYYY-MM-DD').startOf('day')).add(1,'day').format('YYYY-MM-DD');
			} else {
				service.start_date = moment().startOf('day').format('YYYY-MM-DD');
			}

			let invoice_start = moment().startOf('day');
			let invoice_end = lease.getNextBillingDate(moment().startOf('day')).subtract(1, 'day');

			await invoice.makeFromServices(connection, [service], lease, invoice_start, invoice_end, null, company_id);

			insurance.due_today = invoice.balance;
			insuranceServices.push(insurance);

		}
		return insuranceServices;
	}

	static async findByCompanyId(connection, company_id){
		return await models.Insurance.findByCompanyId(connection, company_id);
	}

	async calculateLeaseDue(connection, lease, start_date, company_id){

		this.setPremium(lease.rent);
		let service = new Service({
			product_id: this.product_id,
			qty: 1,
			prorate: this.prorate,
			prorate_out: this.prorate_out,
			recurring: this.recurring,
			optional: 1,
			taxable: this.taxable,
			price: this.premium
		});
		service.Product = this;

		let datetime = await lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
		let invoice =  new Invoice({
			lease_id: lease.id,
			user_id: null,
			date: moment(datetime).format('YYYY-MM-DD'),
			due: moment(datetime).format('YYYY-MM-DD'),
			company_id: company_id,
			type: "auto",
			status: 1
		});
		invoice.Lease = lease;
		invoice.Company = {
			id: company_id
		};

		service.end_date = null;

		if(start_date){
			service.start_date = lease.getNextBillingDate(moment(start_date, 'YYYY-MM-DD').startOf('day')).add(1,'day').format('YYYY-MM-DD');
		} else {
			service.start_date = moment().startOf('day').format('YYYY-MM-DD');
		}

		let invoice_start = moment().startOf('day');
		let invoice_end = lease.getNextBillingDate(moment().startOf('day')).subtract(1, 'day');

		await invoice.makeFromServices(connection, [service], lease, invoice_start, invoice_end, null, company_id);
		
		this.due_today = invoice.balance;
	}
}

module.exports = Insurance;

const Invoice      = require('../classes/invoice.js');
const Service      = require('../classes/service.js');
