var models = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');
var validator = require('validator');
var QuickBooks  = require(__dirname + '/../classes/quickbooks.js');

class Settings {

	constructor(data = {}){
		this.company_id = data.company_id;
		this.property_id = data.property_id;
		this.id = data.id;
		this.name = data.name;
		this.value = data.value;
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

	async findTransactionalSettings(connection) {
		if(this.property_id) {
			const settings = await models.Setting.findPropertySettings(connection, 'transactional', this.company_id, this.property_id);
			if(settings && settings.length) return settings;
		}

		return await models.Setting.findCompanySettings(connection, 'transactional', this.company_id);
	}

	async getTransactionalSettings(connection) {
		let settings = await this.findTransactionalSettings(connection);
		const transformedData = {};
		for(let i = 0; i < settings.length; i++) {
			transformedData[settings[i].name] = settings[i].value;
		}

		return transformedData;
	}

	static async findSettings(connection, category, company_id){
		let settings = await models.Setting.findSettings(connection, category, company_id)
		let list = {};
		for(let i = 0; i < settings.length; i++ ){
			list[settings[i].name] = settings[i].value;
		}
		return list;
	}

	// Use saveSetting() function -> it is refactored to store settings history as well
	async save(connection, data, admin_id){
    await models.Setting.save(connection, data, data.id, admin_id);
  }
  	
  	static async findByCategory(connection, payload) {
		const { setting_category, company_id, property_id } = payload;

		if(property_id) {
			return await models.Setting.findPropertySettings(connection, setting_category, company_id, property_id);
		} 

		return await models.Setting.findCompanySettings(connection, setting_category, company_id);
	}

	static async findPropertyOrDefaultSettings(connection, payload) {
		const { category, company_id, property_id } = payload;

		return await models.Setting.findPropertyOrDefaultSettings(connection, {
			category: category,
			company_id: company_id,
			property_id: property_id
		});
	}

  	async saveSettingsHistory(connection, payload = {}) {
		const { api_info, old_setting } = payload;

		const isSettingValueChanged = this.value != old_setting?.value;
		if(!isSettingValueChanged) return;

		return await models.Setting.saveSettingHistory(connection, {
			settings_id: this.id,
			name: this.name,
			old_value: old_setting.value,
			new_value: this.value,
			modified_by: api_info.locals.contact.id
		});
	}

	async saveSetting(connection, payload = {}) {
		const { api_info, old_setting } = payload;
		const oldSetting = { ...old_setting };

		if (!this.id) {
			const newSetting = await models.Setting.saveSetting(connection, {
				value: this.value,
				company_id: this.company_id,
				property_id: this.property_id,
				name: this.name
			});

			this.id = newSetting.insertId;
		} else {
			if(!oldSetting) {
				oldSetting = await models.Setting.findById(connection, { id: this.id });
			}

			await models.Setting.saveSetting(connection, {
				id: this.id,
				value: this.value
			});
		}

		await this.saveSettingsHistory(connection, { api_info, old_setting: oldSetting });
	}

	static async saveMultiple(connection, payload = {}) {
		const { settings, setting_category, company_id, property_id, api_info} = payload;
		
		const currentSettings = await Settings.findByCategory(connection, { setting_category, company_id, property_id });
		for (let updatedSetting in settings) {
		  const existingSetting = currentSettings.find(cs => cs.name === updatedSetting);
	
		  const setting = new Settings({
			id: existingSetting?.id,
			value: settings[updatedSetting],
			company_id: company_id,
			property_id: property_id,
			name: updatedSetting
		  });
	
		  await setting.saveSetting(connection, { api_info, old_setting: existingSetting });

			if(updatedSetting === Enums.SETTINGS.BILLING.allowInterPropertyPayments.name && !settings[updatedSetting]){
				var Contact  = require(__dirname + '/../classes/contact.js');
				await Contact.dropRole(connection, {company_id})
			}
		}	
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
  static async deleteAdminNotification(connection, contact_id, notification_id){
    return await models.Setting.deleteNotificationSettings(connection, contact_id, notification_id);
  }

	static async getLeaseStandings(connection){
		return await models.Setting.getLeaseStandings(connection);
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

	static async saveAdminNotifications(connection,data, notification_id){
		return models.Setting.saveNotificationSettings(connection, data, notification_id);
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

	static async getGlobalSettings(connection){
		return await models.Setting.getGlobalSettings(connection);
	}

	/**
	 * This method returns an object of settings and there value for a given settings category
	 * Property will get precedence over company level setting
	 * @param connection
	 * @param payload - setting_category, company_id, property_id
	 * @returns An Object of settings for a category.
	 */
	static async getByCategory(connection, payload) {
		let settings;

		if (payload.property_id) {
			settings = await models.Setting.findPropertySettings(connection, payload.setting_category, payload.company_id, payload.property_id);
		};
		if (!settings?.length) {
			settings = await models.Setting.findCompanySettings(connection, payload.setting_category, payload.company_id);
		};

		let settingObject = {};
		for (let setting of settings) {
			settingObject[setting.name] = setting.value
		}
		return settingObject;

	}
}

module.exports = Settings;

var Enums = require(__dirname + '/../modules/enums.js');
