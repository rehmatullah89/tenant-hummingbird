"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator');
var moment      = require('moment');
var Product  = require(__dirname + '/../classes/product.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Insurance {

	constructor(data){

		data = data || {};
		this.id = data.id ;

		this.company_id = data.company_id ;
		this.name = data.name;
		this.description = data.name;
		this.taxable = data.taxable;
		this.prorate = data.prorate;
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

		this.gl_account_code = data.gl_account_code || null;
		this.gl_account_name = data.gl_account_name || null;
		this.gl_account_active = data.gl_account_active || null;
	}

	validate(){
		var _this = this;

		try {

			if (!_this.company_id) {
				throw 'Invalid company id';
			}

		} catch(err){
			_this.msg = err.toString();
			return false;
		}
		return true;
	}

	save(connection){
		var _this = this;

		return Promise.resolve().then(function() {

			if (!_this.validate()) {
				throw _this.msg;
			}

			if(_this.product_id){

				_this.Product = new Product({
					id: _this.product_id
				});

				return _this.Product.find(connection).then(() => {
					_this.Product.name = _this.name;
					_this.Product.description = _this.description;
					_this.Product.taxable = _this.taxable ? 1 : 0;
					// _this.Product.prorate = _this.prorate ? 1 : 0;
					return _this.Product.save(connection)
				});

			} else {

				_this.Product = new Product({
					company_id: _this.company_id,
					default_type: 'insurance',
					type: 'product',
					name: _this.name,
					description: _this.description,
					taxable:    _this.taxable ? 1 : 0,
					// prorate: _this.prorate  ? 1 : 0
				});

				return _this.Product.save(connection).then(product => {
					_this.product_id = _this.Product.id;
					return true;
				})
			}
		}).then(() => {
			var save = {
				company_id: _this.company_id,
				product_id: _this.product_id,
				coverage: _this.coverage,
				premium_value: _this.premium_value,
				premium_type: _this.premium_type,
				deductible: _this.deductible,
				prorate: _this.prorate
			};
			
			return models.Insurance.save(connection, save, _this.id).then(function(result){
				if(result.insertId) _this.id = result.insertId;
				return _this;
			})
		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})
	}

	delete(connection){

		return models.Insurance.delete(connection, this.id);
	}

	find(connection){

		var _this = this;
		return Promise.resolve()
			.then(function(){
				if(!_this.id && !_this.product_id){
					var error = new Error("id not set");
					error.code = 500;
					throw error;
				}


				if(_this.id) {
					return models.Insurance.findById(connection, _this.id);
				}
				if(_this.product_id) {
					return models.Insurance.findByProductId(connection, _this.product_id);
				}

			}).then(data => {

				if(!data) e.th(404, 'Insurance not found');
				
				_this.id = data.id ;
				_this.company_id = data.company_id ;
				_this.product_id = data.product_id ;
				_this.coverage = data.coverage ;
				_this.premium_value = data.premium_value ;
				_this.premium_type = data.premium_type ;
				_this.deductible = data.deductible ;
				_this.prorate = data.prorate ;


				var product = new Product({id: _this.product_id});
				return product.find(connection)
					.then(() => product.getVendor(connection))
					.then(() => product)
			}).then(product => {
				_this.product_id = product.id;
				_this.description = product.description;
				// _this.prorate = product.prorate;
				_this.name = product.name;
				_this.taxable = product.taxable;
				_this.Vendor = product.Vendor;
				
				return true;
			})




	}
	
	setPremium(rent){

		if(this.premium_type == '$') this.premium = this.premium_value;
		if(this.premium_type == '%') this.premium = Math.round(this.premium_value * rent) / 1e2;


		return true;
	}

	verifyAccess(company_id){
		if(this.company_id !== company_id) {
			e.th(403, "Not authorized")
		}
		return Promise.resolve();
	}

	values(){
		var _this = this;
		var ret = {
			id: _this.id,
			company_id: _this.company_id,
			name: _this.name,
			description: _this.description,
			active: _this.active,
			price: _this.price,
			prorate: _this.prorate,
			type: _this.type,
			default_type: _this.default_type,
			taxable: _this.taxable,
			qb_income_account: _this.qb_income_account
		};

		return ret;

	}

}

module.exports = Insurance;