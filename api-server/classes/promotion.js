"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

class Promotion {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
		this.name = data.name;
		this.description = data.description;
		this.label = data.label;
		this.value = data.value;
		this.type = data.type;
		this.months = data.months;
		this.offset = data.offset;
		this.sort = data.sort;
		this.pretax =  data.pretax;
		this.active =  data.active;
		this.PromotionTypes = [];
		this.PromotionRules = [];
		this.Units = [];
		this.Properties = [];
		this.Coupons = [];
		this.required_months = data.required_months;
		this.days_threshold = data.days_threshold;
		this.consecutive_pay = data.consecutive_pay;
		this.enable = data.enable;
		this.active_period = data.active_period;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.created_by = data.created_by;
		this.created_at = data.created_at;
		this.Creator = {};
		this.Properties = [];
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

	async findCoupon(connection, coupon_id){

		let coupon = await models.Promotion.findCouponById(connection, coupon_id);

		if(coupon.promotion_id != this.id) e.th(400, "This coupon does not belong to this promotion");

		let uses = await models.Promotion.findCouponUses(connection, coupon_id);

		coupon.uses = uses.length;

		return coupon;


	}

	updateCoupon(connection, coupon, body){

		if(body.max_uses === 0 || body.max_uses === null ) {
			coupon.max_uses = null;
		} else if(body.max_uses < coupon.max_uses) {
			 e.th(400, "This coupon has already been used more than the max uses you are trying to set.")
		} else {
			coupon.max_uses = body.max_uses;
		}

		coupon.description = body.description;
		coupon.start_date = body.start_date;
		coupon.end_date = body.end_date;
		coupon.active = body.active;

		return coupon;


	}

	async saveCoupon(connection, data, coupon_id){
		let save = {
			promotion_id: this.id,
			code: data.code,
			description: data.description,
			max_uses: data.max_uses || 0,
			start_date: data.start_date || null,
			end_date: data.end_date || null,
			active: data.active? 1: 0
		};

		let result = await models.Promotion.saveCoupon(connection, save, coupon_id);

		if(!data.id) save.id = result.insertId;

		return save;


	}

	async save(connection){

		await this.validate();

		let save = {
			company_id: this.company_id,
			name: this.name,
			description: this.description,
			label: this.label,
			value: this.value,
			type: this.type,
			months: this.months,
			offset: this.offset || 0,
			sort: this.sort,
			pretax:  this.pretax,
			active:  this.active,
			required_months: this.required_months,
			days_threshold: this.days_threshold,
			consecutive_pay: this.consecutive_pay,
			enable: this.enable,
			active_period: this.active_period,
			start_date: this.start_date,
			end_date: this.end_date,
			created_by: this.created_by,
		};

		let result = await models.Promotion.save(connection, save, this.id);
		if(!this.id) this.id = result.insertId;

		for(let i = 0; i < this.PromotionTypes.length; i++){
			let data = {
				promotion_id: this.id,
				promotion_type_id: this.PromotionTypes[i].promotion_type_id
			};

			let result = await models.Promotion.savePromotionPromoType(connection, data, this.PromotionTypes[i].id);
			if(!this.PromotionTypes[i].id){
				this.PromotionTypes[i].id = result.insertId;
			}
		}

		for(let i = 0; i < this.PromotionRules.length; i++){
			let data = {
				object: this.PromotionRules[i].object,
				attribute: this.PromotionRules[i].attribute,
				comparison: this.PromotionRules[i].comparison,
				value: this.PromotionRules[i].value,
				promotion_id: this.id
			};

			let result = await models.Promotion.savePromotionRule(connection, data, this.PromotionRules[i].id);
			if(!this.PromotionRules[i].id){
				this.PromotionRules[i].id = result.insertId;
			}
		}

		await this.updatePromotionRounding(connection);
	}

	async updatePromotionRounding(connection){
		let data = {
			object_id: this.id,
			object_type: this.label,
			status: 1,
			rounding_type: this.round,
			created_by: this.created_by
		}
		let rounding = new Rounding(data)
		await rounding.update(connection);
	}

	async delete(connection){

		this.verifyId();
		let rounding = new Rounding({object_id: this.id});
		await rounding.deleteByObjectId(connection);
		return await models.Promotion.delete(connection, this.id);
	}

	async find(connection){

		this.verifyId();

		let data = await models.Promotion.findById(connection, this.id)

		if(!data){
			e.th(404, "Promotion not found");
		}

		this.company_id = data.company_id;
		this.name = data.name;
		this.description = data.description;
		this.label = data.label;
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
		this.enable = data.enable;
		this.active_period = data.active_period;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.created_by = data.created_by;
		this.created_at = data.created_at;
		this.round = data.round;

		if(this.created_by){
			this.Creator = new Contact({id:  this.created_by});
			await this.Creator.find(connection);
		}

	}

	async findCoupons(connection, search){
		this.verifyId();
		this.Coupons = await models.Promotion.findCouponsByPromotionId(connection, this.id, search)
	}

	async verifyUniqueCouponCode(connection, code, coupon_id){

		this.verifyId();

		if(!this.company_id){
			await this.find(connection);
		}

		let found = await models.Promotion.findCouponByCode(connection, code, this.company_id);
		if(!found) return true;
		if(found.length == 1 && found[0].id == coupon_id) return true;

		e.th(409, "A coupon with this code already exists");

	}

	async validateCoupon(connection, coupon){


		if(!coupon.active){
			e.th(409, "This coupon is not valid.");
		}

		if(coupon.uses >= coupon.max_uses){
			e.th(409, "This coupon is no longer valid.  It has reached its maximum number of uses");
		}

		if(coupon.start_date && moment(coupon.start_date, 'YYYY-MM-DD').format('x') > moment().format('x')){
			e.th(409, "This coupon is not yet valid");
		}
		if(coupon.end_date && moment(coupon.end_date, 'YYYY-MM-DD').format('x') < moment().format('x')){
			e.th(409, "This coupon has expired");
		}



	}

	make(connection, data, company_id, sort){
		this.company_id = company_id;
		this.name = data.name;
		this.description = data.description;
		this.label = data.label;
		this.value = data.value;
		this.type = data.type;
		this.months = data.months;
		this.offset = data.offset;
		this.sort = sort;
		this.pretax = data.pretax;
		this.active =  1;
		this.required_months = data.required_months;
		this.days_threshold = data.days_threshold;
		this.consecutive_pay = data.consecutive_pay;
		this.enable = data.enable;
		this.active_period = data.active_period;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.created_by = data.created_by;
		this.created_at = data.created_at ;
		this.round = RoundOff.joinData(data.rounding);
		
		if(this.active_period === 'date_range'){
			this.start_date = data.start_date ? data.start_date : moment().format('YYYY-MM-DD');
		}

	}

	async findPromoType(connection, promo_type_id, company_id){

		let type = await models.Promotion.getPromoTypeById(connection, promo_type_id);
		if(!type) e.th(404, "Promotion type not found")
		if(type.company_id !== company_id) e.th(400, "Invalid promotion type");
		return type;
	}

	async findPromoRulesByPromotionId(connection){
		this.verifyId();
		this.PromotionRules = await models.Promotion.findRulesByPromotionId(connection,this.id)

	}

	formulatePropertiesInfo(property, property_address) {
      let propertyInformation = '';
      if(property.number) propertyInformation += property.number;
      if(property_address && property_address.city) propertyInformation += ` - ${property_address.city}`;
      if(property_address && property_address.address) propertyInformation += ` - ${property_address.address}`;

      return propertyInformation;
	}

	async formatPromoRules(connection){
		this.PromotionRules.count = this.PromotionRules.length;
		for(let i = 0; i < this.PromotionRules.length; i++){
			let rule = this.PromotionRules[i];
			switch(rule.object){
				case 'unit':
					switch(rule.attribute.toLowerCase()){
						case 'category':

							let space_mix_id = utils.base64Decode(rule.value).split(',');
							let category = await models.UnitCategory.findById(connection, space_mix_id[1]);
							let space_mix_name = null;
							if(space_mix_id.length === 5) {
								let length = space_mix_id[2];
								let width = space_mix_id[3];
								let height = space_mix_id[4];
								space_mix_name = `${length} x ${width} x ${height}`;
							}

							rule.value_label = (space_mix_name && `${space_mix_name} - `) + (category && category.name);
							break;
						case 'floor':
							rule.value_label = rule.value;
							break;
						case 'price':
							let comparisons = {
								'>': 'Greater Than',
								'<': 'Less Than',
								'=': 'Equal to'
							};
							rule.value_label = `${comparisons[rule.comparison]} $${parseFloat(rule.value).toFixed(2)}`;
							break;
						case 'unit_category':
							let hash_value = Hashes.decode(rule.value);
							let unit_category_id = hash_value && hash_value.length && hash_value[0];
							if(!unit_category_id){
								break;
							}

							let unit_category = await models.UnitCategory.findById(connection, unit_category_id);
							rule.value_label = unit_category ? unit_category.name: '';
							break;
						case 'size':
							rule.value_label = rule.value;
							break;
					}
					break;

				case 'property':
					switch(rule.attribute.toLowerCase()){
						case 'address':
							let property = await models.Property.findById(connection, rule.value);
							let address = await models.Address.findById(connection, property.address_id);
							rule.value = Hashes.encode(rule.value, connection.cid);
							rule.value_label = this.formulatePropertiesInfo(property, address);
							break;
						case 'zip':
						case 'neighborhood':
							rule.value = rule.value;
							rule.value_label = rule.value;
							break;
					}
					break;
			}
			this.PromotionRules[i] = rule;
		}

		const transformedRule = [...this.PromotionRules.reduce((r, o) => {
			const key = o.object + '-' + o.attribute + '-' + o.comparison;

			const item = r.get(key) || Object.assign({}, {
				promotion_id: o.promotion_id,
				object: o.object,
				attribute: o.attribute,
				comparison: o.comparison,
				values: []
			});

			item.values.push({
				id: o.id,
				value: o.value,
				value_label: o.value_label,
			})

			return r.set(key, item);
		}, new Map).values()];


		this.PromotionRules = transformedRule;
	}

	parsePromoRule(rule){
		switch(rule.object.toLowerCase()){
			case 'unit':
				switch(rule.attribute.toLowerCase()){
					case 'category':
						rule.value = Hashes.decode(rule.value)[0];

						break;
					case 'floor':
					case 'price':
						rule.value = rule.value;
						break;
				}
				break;
			case 'property':
				switch(rule.attribute.toLowerCase()){
					case 'region':
					case 'address':
						rule.value = Hashes.decode(rule.value)[0];
						break;
					case 'neighborhood':
					case 'zip':
						rule.value = rule.value.toLowerCase();
						break;
				}
				break;
		}
		return rule;

	}

	// Finds
	async findPromoTypesByPromotionId(connection){

		this.verifyId();
		let promotion_types =  await models.Promotion.findTypesByPromotionId(connection,this.id)

		for(let i = 0; i < promotion_types.length; i++){
			promotion_types[i].PromotionType =  await models.Promotion.getPromoTypeById(connection,promotion_types[i].promotion_type_id);

		}

		this.PromotionTypes = promotion_types;

	}

	async removePromoTypes(connection, to_keep){
		return await models.Promotion.removePromotionPromoTypes(connection, this.id, to_keep);
	}

	async updateEnable(connection, enable){
		return await models.Promotion.updateEnable(connection, enable, this.id);
	}

	async removePromoRules(connection, to_keep){
		return await models.Promotion.removePromotionRules(connection, this.id, to_keep);
	}

	async setPromoTypes(connection, promotion_types, company_id){

		if(!this.company_id) e.th(500, "Company id not set");

		for(let i = 0; i < promotion_types.length; i++){
			let promo_type = promotion_types[i];

			// if we already have this one, we dont need to save again, so continue
			if(this.PromotionTypes.find(pt => pt.promotion_type_id === promo_type.promotion_type_id)){
				continue;
			}

			let pt = await this.findPromoType(connection, promo_type.promotion_type_id, company_id);
			this.PromotionTypes.push({
				promotion_type_id: pt.id,

			});
		}
	}

	setPromoRules(promotion_rules){

		if(!this.company_id) e.th(500, "Company id not set");
		for(let i = 0; i < promotion_rules.length; i++){
			let promotion_rule = {};
			let promotion_values = promotion_rules[i].values;
			for(let j = 0; j < promotion_values.length; j++) {

				promotion_rule = {
					id: promotion_rules[i].id || null,
					promotion_id: this.id,
					object: promotion_rules[i].object,
					attribute: promotion_rules[i].attribute,
					comparison: promotion_rules[i].comparison,
					value: promotion_rules[i].attribute == 'address' ? Hashes.decode(promotion_values[j])[0] : promotion_values[j]
				}

				this.PromotionRules.push(promotion_rule);
			}
		}
			// if we already have this one, we dont need to save again, so continue
			/*let existing = this.PromotionRules.find(pr => {
				return pr.object === promotion_rule.object &&
					pr.attribute === promotion_rule.attribute &&
					pr.comparison === promotion_rule.comparison // &&
					pr.value === promotion_rule.value
			});

			if(existing){
				continue;
			}

			promotion_rule.promotion_id = this.id;
			this.PromotionRules.push(promotion_rule);*/
	}

	update( data){
		this.name = data.name;
		this.description = data.description;
		//this.label = data.label;
		this.value = data.value;
		this.type = data.type;
		this.months = data.months;
		this.offset = data.offset;
		this.pretax = data.pretax;
		this.required_months = data.required_months;
		this.days_threshold = data.days_threshold;
		this.consecutive_pay = data.consecutive_pay;
		this.enable = data.enable;
		this.active_period = data.active_period;
		this.start_date = data.start_date;
		this.end_date = data.end_date;
		this.round = RoundOff.joinData(data.rounding);

		if(this.active_period === 'date_range'){
			this.start_date = data.start_date ? data.start_date : moment().format('YYYY-MM-DD');
		}

	}

	static async findByCompanyId(connection, company_id, filter){
		return await models.Promotion.findByCompanyId(connection, company_id, filter);
	}

	static async validateName(connection, name, company_id, existing_id){
		return await models.Promotion.validateDuplicatesByName(connection, name, company_id, existing_id)

	}

	static async findTypes(connection, company_id){
		return await models.Promotion.findTypesByCompanyId(connection,company_id)
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

	async getPromotionUnits(connection, unit_id = null){
		this.Units = await models.Promotion.getPromotionUnits(connection, this.id, unit_id);
		for(let i = 0; i < this.Units.length; i++){
			this.Units[i].Unit = new Unit({id: this.Units[i].unit_id });
			await this.Units[i].Unit.find(connection);
		}
	}

  async validatePromotionOnUnit(connection, unit_id = null){
    let pu = await models.Promotion.validatePromotionOnUnit(connection, this.id, unit_id);

    if(pu.has_promo || !pu.unit_count) return true;
    return false;

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


	static async findCouponByCode(connection, code, company_id){
		return await models.Promotion.findCouponByCode(connection, code, company_id);
	}

	async deleteDiscountByLeaseId(connection, lease_id){
        await models.Promotion.removeDiscountFromLease(connection, lease_id, this.id);
	}

	async updateProperties(connection, properties, local_properties){

		let promProperties = await models.Promotion.findPropertiesByPromotion(connection, this.id);
		let difference = [];
		for (var i = 0; i < properties.length; i++) {
		  let result = promProperties.find(p => p.property_id === properties[i].id);

		  if(!result){
			let data = {
			  promotion_id: this.id,
			  property_id: properties[i].id,
			}

			await models.Property.savePromotionProperties(connection, data)
		  }

		}

		for (var j = 0; j < promProperties.length; j++) {
			let result = properties.find(p => p.id === promProperties[j].property_id);

			if(!result){
			  difference.push(promProperties[j].property_id);
			}
		}

		let property_ids = properties.map(x => x.id);
		let local_difference = local_properties.filter(x => !property_ids.includes(x));

		for (var k = 0; k < difference.length; k++) {
			let result = local_difference.find(p => p === difference[k]);

			if(result){
			  local_difference.push(difference[k]);
			}
		}

		if(local_difference.length > 0){
			let diff = local_difference.join();
			await models.Property.deletePomotionProperty(connection, diff, this.id);
		}

	  }

	  async getProperties(connection, properties){
		let promProperties = await models.Promotion.findPropertiesNameByPromotion(connection, this.id, properties);

		if(promProperties){
			this.Properties = promProperties;
		}
	  }

	  transformData() {
		const data = { ...this };
		data.rounding = RoundOff.splitData(this.round); 
		return data;
	  }

  /**
   * It returns the promotions sold or there total count
   * @param connection {Object} - the connection to the database
   * @param company_id {String}- The id of the company
   * @param query {Object} - limit,offset,from_date,to_date,property_id
   * @param count {Boolean} - if true, it will return the count of the total promotions
   * @returns promotions sold.
   */
  static async getPromotionsSold(connection, company_id, query, count) {
    let soldPromotions = await models.Promotion.findPromotionsSold(connection, company_id, query, count)
    if (count) return soldPromotions[0].count;
    return soldPromotions
  }

}



module.exports = Promotion;

var Unit = require(__dirname + '/../classes/unit.js');
var Contact = require(__dirname + '/../classes/contact.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');
var Rounding = require(__dirname + '/../classes/rounding.js');