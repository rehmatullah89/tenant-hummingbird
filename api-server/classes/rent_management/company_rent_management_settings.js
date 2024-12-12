"use strict";
const CompanyRentManagementSettingsModel = require(__dirname + '/../../models/rent-management/company_rent_management');
const CompanyModel = require(__dirname + '/../../models/company.js')
const utils = require(__dirname + "/../../modules/utils.js");
const e = require(__dirname + "/../../modules/error_handler.js")

class CompanyRentManagementSettings {
    constructor(data) {
        this.params = data?.params ?? {}
		this.reqBody = data?.body ?? {}
    }

    /**
	 * Validating company based on approval type
	 * @param {Object} connection - The database connection object.
	 */
    async validate(connection, { params, reqBody } = {}) {
        let { company_id } = CompanyRentManagementSettings.cleanData(
			params ?? this.params,
			reqBody ?? this.reqBody
		)
        let isValidCompany = await CompanyModel.findById(connection, company_id)
		if (!isValidCompany) e.th(404, "Invalid Company ID")
	}

    /**
	 * Clean up data before processing it.
	 * @param {Object} params - The parameters to be cleaned.
	 * @param {Object} reqBody - The request body to be cleaned.
	 * @returns {Object} - The cleaned data.
	 */
	static cleanData(params, reqBody) {
		return {
            company_id: params.company_id,
            ...utils.nullifyFalsyValues({
				round_to: reqBody.round_to,
			})
		}
	}

    /**
	 * Save the configuration for the company rent management system.
	 * @param {Object} connection - The database connection object.
	 * @param {Object} options.params - The parameters to be used for saving the configuration.
	 * @param {Object} options.reqBody - The request body to be used for saving the configuration.
	 * @returns {Object} - The saved configuration object.
	 * */
    async saveConfiguration(connection, { params, reqBody } = {}) {
        let data = CompanyRentManagementSettings.cleanData(params ?? this.params, reqBody ?? this.reqBody)
        const exists = await CompanyRentManagementSettingsModel.checkExistance(connection, data.company_id);
        let response;
        if (exists) {
            response = await CompanyRentManagementSettingsModel.updateConfiguration(
				connection,
				`company_id = '${connection.escape(data.company_id)}'`,
				data
			)
        } else {
            response = await CompanyRentManagementSettingsModel.saveConfiguration(connection, data)
        }
		if (response.affectedRows === 0) e.th(404, "Unable to update the record")
        else return data
    }

    /**
	 * Get the configuration for the company rent management.
	 * @param {Object} connection - The database connection object.
	 * @returns {Object} - The configuration object.
	 */
    async get(connection) {
        let company_id = this.params.company_id
        let defaultConfiguration = {
            round_to: null,
        }
        let isValidCompany = await CompanyModel.findById(connection, company_id)
		if (!isValidCompany) e.th(404, "Invalid Company ID")

        const configuration = await CompanyRentManagementSettingsModel.getConfiguration(connection, company_id) ?? defaultConfiguration;
        return utils.nullifyFalsyValues(configuration)
    }

}



module.exports = CompanyRentManagementSettings;
