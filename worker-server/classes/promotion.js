"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var utils    = require(__dirname + '/../modules/utils.js');

class Promotion {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
		this.name = data.name;
		this.description = data.description;
		this.value = data.value;
		this.type = data.type;
		this.months = data.months;
		this.offset = data.offset;
		this.sort = data.sort;
		this.pretax =  data.pretax;
		this.active =  data.active;
		this.required_months = data.required_months;
		this.days_threshold = data.days_threshold;
		this.consecutive_pay = data.consecutive_pay;
		this.round = data.round || null;
	}

	validate(){
		var _this = this;
		return Promise.resolve().then(() => {
			if (!_this.name) e.th(400, "Please enter a name");
			if (!_this.company_id) e.th(500, "Company id not set");
			return true;
		})
	}

	save(connection){

		return this.validate().then(() => {

			var save = {
				company_id: this.company_id,
				name: this.name,
				description: this.description,
				value: this.value,
				type: this.type,
				months: this.months,
				offset: this.offset,
				sort: this.sort,
				pretax:  this.pretax,
				active:  this.active,
				required_months: this.required_months,
				days_threshold: this.days_threshold,
				consecutive_pay: this.consecutive_pay
			};

			return models.Promotion.save(connection, save, this.id);
		}).then(result =>{
			if(!this.id) this.id = result.insertId;
			return true;
		})
	}

	delete(connection, company_id){

		this.verifyId();
		return models.Promotion.delete(connection, this.id, company_id);
	}

	find(connection, active = true){

		this.verifyId();

		return models.Promotion.findById(connection, this.id,active).then(data => {

			if(!data){
				e.th(404, "Promotion not found");
			}

			this.company_id = data.company_id;
			this.name = data.name;
			this.description = data.description;
			this.value = data.value;
			this.type = data.type;
			this.months = data.months;
			this.offset = data.offset;
			this.sort = data.sort;
			this.pretax =  data.pretax;
			this.active =  data.active;
			this.required_months = data.required_months,
			this.days_threshold = data.days_threshold,
			this.consecutive_pay = data.consecutive_pay
			this.round = data.round;
			
			return true;
		})
	}

	verifyId(){
		if (!this.id) e.th(500, 'No promotion id is set');
		return true;
	}

	verifyAccess(company_id){

		if(this.company_id !== company_id) {
			e.th(403, "Not authorized");
		}
		
		return Promise.resolve();

	}

	async findPromoRulesByPromotionId(connection){
		this.verifyId();
		this.PromotionRules = await models.Promotion.findRulesByPromotionId(connection,this.id)

	}

	async getPromotionUnits(connection, unit_id = null){
		this.Units = await models.Promotion.getPromotionUnits(connection, this.id, unit_id);
		for(let i = 0; i < this.Units.length; i++){
			this.Units[i].Unit = new Unit({id: this.Units[i].unit_id });
			await this.Units[i].Unit.find(connection);
		}
	}

	async updateAffectedUnits(connection){
		let promo_rules = this.getRuleHierarchy();

		// get units affected by rules
		let units = await models.Promotion.getAffectedUnits(connection, promo_rules, this.id, this.company_id);

		await models.Promotion.deletePromoUnits(connection, this.id, units.map(u => u.id));

		for(let i = 0; i < units.length; i++){
			let unit = units[i];

			// calculate discount on unit price

			let data = {
				promotion_id: this.id,
				unit_id: unit.id,
				discount: unit.promotion_units_discount
			}

			await models.Promotion.savePromoUnit(connection, data, unit.promotion_units_id);
		}
	}

	getRuleHierarchy(){
		let hierarchy = {}
		for(let i = 0; i < this.PromotionRules.length; i++){
			let rule = this.PromotionRules[i];
			hierarchy[rule.object] =  hierarchy[rule.object] || {};
			hierarchy[rule.object][rule.attribute] =  hierarchy[rule.object][rule.attribute] || [];
			hierarchy[rule.object][rule.attribute].push({
				comparison: rule.comparison,
				value: rule.attribute === 'category' ? utils.base64Decode(rule.value).split(',') : rule.value
			})
		}
		return hierarchy;
	}

	async modifyAffectedUnits(connection, propertyUnits){
		let promo_rules = this.getRuleHierarchy();
		// get units affected by rules
		let units = await models.Promotion.getAffectedUnits(connection, promo_rules, this.id, this.company_id, propertyUnits);
		await models.Promotion.removePromotionUnits(connection, this.id, propertyUnits);
		let data = units.map(unit => {
			return [this.id , unit.id, unit.promotion_units_discount]
		})
		await models.Promotion.saveBulkPromotionUnits(connection, data);
	}

	static async findByCompanyId(connection, company_id, filter){
		return await models.Promotion.findByCompanyId(connection, company_id, filter);
	}
}



module.exports = Promotion;

var Contact = require(__dirname + '/../classes/contact.js');