"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');



class Category {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
		this.name = data.name;
		this.description = data.description;
		this.price = data.price;
		this.Units = {
			min_price: '',
			max_price: '',
			unit_count: '',
		};
		this.Vacant = {
			min_price: '',
			max_price: '',
			unit_count: ''
		};

		this.msg = '';
	}

	
	validate(){
		var _this = this;
		return Promise.resolve().then(() => {
			if (!_this.company_id) e.th(500, 'Invalid company id');
			if (!_this.name) e.th(400, 'Please enter a name for this category');
			return true;
		});
	}

	save(connection){
		var _this = this;

		return this.validate().then(() =>  {

			var save = {
				company_id: _this.company_id,
				name: _this.name,
				description: _this.description,
				price: _this.price
			};
			return models.UnitCategory.save(connection, save, _this.id)
		})
		.then(function(result){
			if(result.insertId) _this.id = result.insertId;
			return true;
		})
	}

	find(connection){

		this.verifyId();
		return models.UnitCategory.findById(connection, this.id).then(data => {

			if(!data || data.status == 0) e.th(404, 'Category not found');

			this.id = data.id;
			this.company_id =  data.company_id;
			this.name =  data.name;
			this.description =  data.description;
			this.price =  data.price;
			return true;
		})

	}

	getPropertyBreakdown(connection, property_id){

		return this.verifyId()
			.then(() => models.UnitCategory.getBreakdown(connection, this.id, this.company_id, property_id))
			.then(data => {
				this.Units.unit_count = data.count;
				this.Units.min_price = data.min;
				this.Units.max_price = data.max;
				return true;
			})
	}

	getPropertyAvailableBreakdown(connection, property_id){
		return this.verifyId()
			.then(() => models.UnitCategory.getAvailableBreakdown(connection, this.id, this.company_id, property_id))
			.then(data => {
				this.Vacant.unit_count = data.count;
				this.Vacant.min_price = data.min;
				this.Vacant.max_price = data.max;
				return true;
			})
	}

	verifyId(){
		return Promise.resolve().then(() => {
			if (!this.id) e.th(500, 'No category id is set');
			return true;
		})
	}

	verifyAccess(company_id){

		if(this.company_id !== company_id) {
			e.th(403)
		}
		return Promise.resolve();

	}

	delete(connection){

		this.verifyId();
		return  models.UnitCategory.delete(connection, this.id).then(() => {
			return models.UnitCategory.unsetUnits(connection, this.id);
		})
	}



}

module.exports = Category;
