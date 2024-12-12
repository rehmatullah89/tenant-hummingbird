var Promise = require('bluebird');
var apiKey = Promise.promisify(require("crypto").randomBytes);
var models = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');
var validator = require('validator');
var moment = require('moment');
var QuickBooks  = require(__dirname + '/../classes/quickbooks.js');


class Settings {

	constructor(data = {}){
    this.company_id = data.company_id;
    this.property_id = data.property_id;
	}

	async saveSettings(connection, settings, company_id){
		if(settings.category && settings.data.qbTaxCode){
			let qb =  new QuickBooks(company_id);
			await qb.init(connection);
			if(!qb.isConfigured) e.th(400, "QuickBooks is not configured. Please refresh the page.");

			let qbTaxRate = await qb.getQbTaxRate(connection, settings.data.qbTaxCode);
			settings.data.taxRate = qbTaxRate;
		}

		if(validator.isEmpty(settings.category)) e.th(400, "Incomplete data");
		if(typeof settings.data == 'undefined') e.th(400, "No data to process");

		await models.Setting.saveSettings(connection, settings.data, settings.category, company_id, settings.property_ids);

		return settings;

	}


  async findSettingByName(connection, name){
    return await models.Setting.findCompanySetting(connection, name, this.company_id, this.property_id);
  }

	static async findSettings(connection, category, company_id){
		let settings = await models.Setting.findSettings(connection, category, company_id)
		let list = {};
		for(let i = 0; i < settings.length; i++ ){
			list[settings[i].name] = settings[i].value;
		}
		return list;
	}

	async save(connection, data){
    await models.Setting.save(connection, data, data.id);
  }

	static async findSpaceTypeParameters(connection, company_id, unit_type){
		return await models.Setting.findSpaceTypeParameters(connection, company_id, unit_type)
	}

	static async findSpaceTypes(connection, company_id, unit_type, space_type_parameters){
		return await models.Setting.findSpaceTypes(connection, company_id, unit_type, space_type_parameters)
	}

	static async findAdminNotifications(connection, contact_id, company_id){
		return await models.Setting.findNotificationSettings(connection, contact_id, company_id);
	}

	static async deleteAdminNotifications(connection, contact_id, company_id){
		return await models.Setting.deleteNotificationSettings(connection, contact_id, company_id);
	}

	static async getLeaseStandings(connection, company_id){
		return await models.Setting.getLeaseStandings(connection, company_id);
	}

	static async saveLeaseStanding(connection, data, lease_standing_id){
		return await models.Setting.saveLeaseStanding(connection, data, lease_standing_id);
	}

	static makeAdminNotifications(data, contact_id, company_id){
		var data = {
			contact_id: contact_id,
			company_id: company_id,
			activity_action_id: data.activity_action_id,
			activity_object_id: data.activity_object_id,
			text: data.text || 0,
			email: data.email || 0
		}
		return data;
	}

	static async saveAdminNotifications(connection,data){
		return models.Setting.saveNotificationSettings(connection, data);
	}

	static async getSettingValue(connection, settingName, settingLevel){
		let setting
		var {company_id, property_id} = settingLevel

		// Property will get precedence over company level setting
		if (property_id) {
			setting = await models.Setting.findPropertySetting(connection, settingName, property_id)
		}

		if (!setting && company_id) {
			setting = await models.Setting.findCompanySetting(connection, settingName, company_id)
		}

		return setting && setting.value
	}
}

module.exports = Settings;
