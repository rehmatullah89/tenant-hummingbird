"use strict";

const LeaseRentChange = require('./lease_rent_change.js');
const Property = require('./../../classes/property.js');

const PropertyRentManagementModel = require('./../../models/rent-management/property_rent_management');
const SpaceGroupModel = require(__dirname + "/../../models/space_group.js")
const PropertyModel = require(__dirname + "/../../models/property.js")
const e = require(__dirname + "/../../modules/error_handler.js")
const utils = require(__dirname + "/../../modules/utils.js")
const moment = require(`moment`)
const _ = require('lodash');
class PropertyRentManagement {
	constructor(data) {
		this.params = data?.params ?? {}
		this.reqBody = data?.body ?? {}
	}

	/**
	 * Clean up data before processing it.
	 * @param {Object} params - The parameters to be cleaned.
	 * @param {Object} reqBody - The request body to be cleaned.
	 * @returns {Object} - The cleaned data.
	 */
	static cleanData(params, reqBody) {
		return {
			property_id: params.property_id ?? "",
			active: reqBody.active,
			status_updated_by: params.status_updated_by ?? "",
			enable_automatic_rent_change: reqBody.enable_automatic_rent_change,
			...utils.nullifyFalsyValues({
				advance_rent_change_queue_months: reqBody.advance_rent_change_queue_months,
				approval_type: reqBody.approval_type,
				// default_space_group_profile_id: reqBody.default_space_group_profile_id,
				notification_document_id: reqBody.notification_document_id,
				notification_period: reqBody.notification_period,
				round_to: reqBody.round_to,
				rent_cap: reqBody.rent_cap,
				min_rent_change_interval: reqBody.min_rent_change_interval
			}),
			...utils.normalizeJson({
				rent_cap: reqBody.rent_cap
			}),
			rent_engine:reqBody.rent_engine
		}
	}

	static normalizeParameters(args = {}, context = {}) {
		let { company_id, property_id, lease_id } = (args?.params ?? context?.params) || {}
		let body = (args?.reqBody ?? context?.reqBody) || {}

		return {
			company_id,
			property_id,
			lease_id,
			body,
			contact_id: body?.contact_id || ''
		}
	}

	static mergeByLeaseId(existingLeaseConfig, entireLeases) {
		const merged = existingLeaseConfig.concat(entireLeases);
		const result = [];
		const map = {};
		for (const item of merged) {
		  const key = item.lease_id;
		  if (!map[key]) {
			result.push(item);
			map[key] = item;
		  } else {
			Object.assign(map[key], item, { existing: true });
		  }
		}
		return result;
	}

	// /**
	//  * Validating space group id and property based on approval type
	//  * @param {Object} connection - The database connection object.
	//  */
	// async validate(connection, { params, reqBody } = {}) {
	// 	let { property_id, default_space_group_profile_id, approval_type, active } = PropertyRentManagement.cleanData(
	// 		params ?? this.params,
	// 		reqBody ?? this.reqBody
	// 	)
	// 	/**
	// 	 * Check whether property remains on same company and also
	// 	 * space group profile exists under that property
	// 	 * 
	// 	 * Check for the space group validation only if the rent management is enabled(active).
	// 	 * If rent management is disabled, there is no need for this validation.
	// 	 */
	// 	let [space_group, property] = await Promise.all([
	// 		active ? SpaceGroupModel.findByPropertyAndId(connection, {
	// 			id: default_space_group_profile_id,
	// 			property_id,
	// 		}) : Promise.resolve(true),
	// 		PropertyModel.findById(connection, property_id, this.params.company_id),
	// 	])
	// 	if (!Boolean(space_group && property)) e.th(400, "Validation Error: invalid entities")
	// }

	/**
	 * Get the configuration for the property rent management system.
	 * @param {Object} connection - The database connection object.
	 * @returns {Object} - The configuration object.
	 */
	async get(connection, { params }) {
		let property_id = connection.escape(params.property_id)
		let company_id = params.company_id
		let defaultConfiguration = {
			active: false,
			approval_type: 'manual',
			advance_rent_change_queue_months: 3,
			// default_space_group_profile_id: null,
			notification_document_id: null,
			notification_period: null,
			round_to: null,
			rent_cap: null,
			min_rent_change_interval: null,
			rent_engine: 'hummingbird',
			enable_automatic_rent_change: false,
			automation_enabled_by_admin: false
		}

		let isValidProperty = await PropertyModel.findById(connection, property_id, company_id)
		if (!isValidProperty) e.th(404, "Property not found")

		let configuration = await PropertyRentManagementModel.getConfiguration(connection, property_id) ?? defaultConfiguration
		
		return {
				...utils.nullifyFalsyValues(configuration),
				...{
					active: !!configuration.active,
					enable_automatic_rent_change: !!configuration.enable_automatic_rent_change,
					automation_enabled_by_admin: !!configuration.automation_enabled_by_admin
				}
			}
	}

	/**
	 * Save the configuration for the property rent management system.
	 * @param {Object} connection - The database connection object.
	 * @param {Object} options.params - The parameters to be used for saving the configuration.
	 * @param {Object} options.reqBody - The request body to be used for saving the configuration.
	 * @returns {Object} - The saved configuration object.
	 * */
	async saveConfiguration(connection, { params, reqBody } = {}) {
		let data = PropertyRentManagement.cleanData(params ?? this.params, reqBody ?? this.reqBody)
		await this.validateNotificationPeriod(connection, data)
		await this.validateEnableAutomaticRentChange(connection, data)
		/** 
		 * Only update the data if rent management is enabled. otherwise update only the active status.
		 */
		if(!data.active) {
			data = {
				property_id: data.property_id,
				active: data.active,
				status_updated_by: data.status_updated_by
			}
		}
		let response = ""
		let propertyConfExists = await PropertyRentManagementModel.checkExistance(connection, data.property_id)

		if (propertyConfExists) {
			response = await PropertyRentManagementModel.updateConfiguration(
				connection,
				`property_id = '${connection.escape(data.property_id)}'`,
				data
			)
		} else {
			response = await PropertyRentManagementModel.saveConfiguration(connection, data)
		}
		if (response.affectedRows === 0) e.th(404, "Unable to update the record")
		else {
			return {
				...data,
				rent_cap: this.reqBody?.rent_cap
			}
		}
	}
 
	/**
	 * Validate enable_automatic_rent_change key in the payload
	 * Should not enable enable_automatic_rent_change if automation is disabled from admin portal
	 * @param {connection} connection - The database connection object.
	 * @param {Object} data - The property rent management settings. 
	 */
	async validateEnableAutomaticRentChange(connection, data) {
		let	response = await this.get(connection, { params: this.params})
		if (!response?.automation_enabled_by_admin && data.enable_automatic_rent_change)
			e.th(404, `Cannot enable \"enable_automatic_rent_change\" as automation is disabled from admin portal. Please contact admin to enable automation.`)
	}

	/**
	 * Validate notification period on property rent management settings to that of lease configuration
	 * @param {connection} connection -  The database connection object.
	 * @param {Object} data - The property rent management settings.
	 * @returns {undefined}
	 */
	async validateNotificationPeriod(connection, data) {
		let property = new Property({ id: data.property_id });
		await property.find(connection);
		await property.getTemplates(connection);

		const haveValidStorageTemplates = !_.isEmpty(property.LeaseTemplates.storage)
		const haveValidParkingTemplates = !_.isEmpty(property.LeaseTemplates.parking)

		// If lease template is neither set for storage nor set for parking
		if(!haveValidStorageTemplates && !haveValidParkingTemplates)
			e.th(400, "Lease Configuration is not setup for this property. Please contact admin to setup the Lease Configuration inorder to set Notification Period.")

		// Minimum notication period should be the maximum b/w storage invoice send day and parking invoice send day + 5 days
		// If lease template is available for only one category, choose the min notifiaction period as the invoice send day for that category + 5 days
		let storageInvoiceSendDay = 
			haveValidStorageTemplates 
			? property.LeaseTemplates.storage.Template.invoiceSendDay
			: 0
		let parkingInvoiceSendDay = 
			haveValidParkingTemplates
			? property.LeaseTemplates.parking.Template.invoiceSendDay
			: 0
		let minimumNotificationPeriod = Math.max(storageInvoiceSendDay, parkingInvoiceSendDay) + 5
		if(Number(data.notification_period) < minimumNotificationPeriod)
			e.th(400, "Given Notification Period is less than 5 days from invoice days. Please check the Lease Configuration settings for the invoice day.")
	}

	/**
	 * validate rent plans before saving it to a lease
	 * @param {Object} connection - The database connection object.
	 * @param {Object} _args.params - The parameters to be used for saving the configuration.
	 * @param {Object} _args.reqBody - The request body to be used for saving the configuration.
	 * @returns {undefined}
	 * */
	async validateRentPlan(connection, _args) {
		let { company_id, body: { lease_to_plan_mapping = [] } } = PropertyRentManagement.normalizeParameters(_args, this)

		let isValidRentPlans = await PropertyRentManagementModel.isValidRentPlans(
			connection,
			company_id,
			[...new Set(lease_to_plan_mapping.map(plan => plan.rent_plan_id ))]
		);

		if (!isValidRentPlans) e.th(404, `Invalid Rent Plan ID`);
	}

	/**
	 * validate leases
	 * @param {Object} connection - The database connection object.
	 * @param {Object} _args.params - The parameters to be used for saving the configuration.
	 * @param {Object} _args.reqBody - The request body to be used for saving the configuration.
	 * @returns {undefined | Error}
	 * */

	async validateLeases(connection, _args) {
		let { body: { lease_to_plan_mapping = [] }, property_id} = PropertyRentManagement.normalizeParameters(_args, this)

		let lease_ids = lease_to_plan_mapping.map(lease => lease.lease_id)
		
		if (!lease_ids?.length) e.th(400, 'lease_ids are required')

		let lease_property = await PropertyModel.findPropertiesByLeaseIds(connection, lease_ids)
		if (!(lease_property.length === 1 && lease_property?.[0]?.id === property_id)) {
                     e.th(400, "Invalid Lease Ids")
                }
	}


	async adjustLeasesRentPlan(connection, _args) {
		let { body: { lease_to_plan_mapping = [] }, property_id, contact_id } = PropertyRentManagement.normalizeParameters(_args, this)

		let activeLeaseConfig = await PropertyRentManagementModel.retrieveLeaseToPlanConfiguration(
			connection,
			property_id,
			lease_to_plan_mapping.map(lease => lease.lease_id)
		);

		let mergedConfigurations = PropertyRentManagement.mergeByLeaseId(activeLeaseConfig, lease_to_plan_mapping)

		let compressedData = mergedConfigurations.reduce((acc, curr) => {
			let { id, lease_id, status, existing, rent_plan_id } = curr, currentDate = new Date()
			
			// For already existing lease configurations
			if (existing) {
				let dataToUpdate = { end_date: currentDate, ...((status !== 'exempt') && { status: 'cancelled' }) }
				acc.update.push({ data: dataToUpdate, id })
			}
			
			// For all applicable leases
			acc.insert.push({
				lease_id,
				rent_plan_id,
				property_id,
				created_contact_id: contact_id,
				status: status || 'active',
				start_date: currentDate
			})
			
			return acc
			
		  }, { update: [], insert: [] })

		  try {
			await PropertyRentManagementModel.bulkUpdateLeaseToPlanConfig(connection, compressedData.update ?? [])
			await PropertyRentManagementModel.bulkInsertLeaseToPlanConfig(connection, compressedData.insert ?? [])
			
		  } catch (error) {
			e.th(parseInt(error.code) || 500, error.message || `Cannot update the rent plan settings for selected leases`);
		  }
	}

	async bulkUpdateLeasePlanStatus(connection, _args) {
		const currentDate = new Date()
		const {
			body: { lease_ids = [], status, note },
			contact_id,
			property_id
		} = PropertyRentManagement.normalizeParameters(_args, this)
		
		// items with this statuses have the potential to both create and update entries
		const needsModification = ['active'].includes(status)
		let queriedLeases = await PropertyRentManagementModel.retrieveLeaseConfiguration(
			connection,
			property_id,
			lease_ids,
			status
		)

		let transformedResponse = queriedLeases.map(lease => ({
			...lease,
                        // If there exists an entry in lease_rent_plan settings
			...(lease.settings_id && { existing: true }),
                        // new lease that does't have an entry and to be exempted
			...(!(lease.settings_id && lease.status) && { new_lease_to_be_exempted: true }),
                        created_contact_id: contact_id,
		}))
		
		/**
		 * Re-applying same status leases will get omitted
		 */
		let result = transformedResponse.reduce( (resultant, leaseToPlanConfig) => {

				if (leaseToPlanConfig.status === status) return resultant
	
				if (leaseToPlanConfig.existing) {
					resultant.update.push({
						id: leaseToPlanConfig.settings_id,
						data: { ...(needsModification ? { end_date: currentDate } : { status }) }
					})
				} 

				/**
				 * Pushing notes only for 'exempt' status
				*
				* As of now lease_rent_change_notes only supports a limited set of status's
				*
				*/
				if(['exempt'].includes(status)) {
					resultant.notes.push({
						lease_id: leaseToPlanConfig.lease_id,
						type: status,
						creation_type: 'manual',
						contact_id: leaseToPlanConfig.tenant,
						last_modified_by: contact_id,
						content: note,
						context: 'rent_management'
					})
					resultant.rent_changes_to_cancel.push(...(leaseToPlanConfig.rent_changes_to_cancel ?? []))
				}
				if (needsModification || leaseToPlanConfig.new_lease_to_be_exempted) {
					let insertPayload = Object.assign(
						{},
						{
							...utils.pick(leaseToPlanConfig, [
								'lease_id',
								'rent_plan_id',
								'property_id',
								'created_contact_id'
							]),
							start_date: currentDate,
							status
						}
						)
						resultant.insert.push(insertPayload)
					}
					
					return resultant
				},
				{ update: [], insert: [], notes: [], error: [], rent_changes_to_cancel: [] }
		)
		try {
			await PropertyRentManagementModel.bulkUpdateLeaseToPlanConfig(connection, result.update)
			await PropertyRentManagementModel.bulkInsertLeaseToPlanConfig(connection, result.insert)
			await this.cancelRentChangesIfAny(connection, result.rent_changes_to_cancel, contact_id)
		} catch (error) {
			e.th(parseInt(error.code) || 500, error.message || `Cannot update the status for selected leases`)
		}

		return { error: !!result.error.length && result.error, notes: result.notes }
	}

	async cancelRentChangesIfAny(connection, rent_changes_to_cancel, contact_id) {
		if(!rent_changes_to_cancel?.length)
			return
		rent_changes_to_cancel.map(rentChange => (rentChange.note = `Rent change for ${rentChange?.deployment_month} cancelled due to exemption`))
		const leaseRentChange = new LeaseRentChange();
		leaseRentChange.validRentChanges = rent_changes_to_cancel ?? []
		leaseRentChange.userId = contact_id
		return await leaseRentChange.cancelRentChanges(connection)

	}

	async getRentManagementEnabledProperties(connection, company_id, property_id) {
		return await PropertyRentManagementModel.findRentManagementEnabledProperties(
			connection,
			company_id,
			property_id,
			true
		);
  }

	async getCustomVarianceSettings(connection) {
		const { property_id } = this.params;
		return await PropertyRentManagementModel.fetchCustomVarianceSettings(connection, property_id);

	}

	async saveCustomVarianceSettings(connection) {
		const { active, date } = this.reqBody;

		const customVarianceData = { enable_custom_variance: active };
		if (date !== undefined) customVarianceData[`custom_variance_date`] = date;

		const clause = `property_id = ${this.params.property_id}`;
		const result = await PropertyRentManagementModel.updateConfiguration(connection, clause, customVarianceData);

		if (result?.affectedRows != 1) e.th(500, `Error while updating custom variance`);
	}

	async validatePropertyCustomVariance(connection) {
		const { property_id } = this.params;
		const { active, date } = this.reqBody;

		if (date && moment(date).isSameOrAfter(moment())) e.th(400, `Date should be in the past`);

		const propertySettings = await PropertyRentManagementModel.fetchCustomVarianceSettings(connection, property_id);

		if (!propertySettings) e.th(400, `Rent Management settings not found for the property`);

		if (active && !date && !propertySettings?.custom_variance_date)
			e.th(400, `No variance date saved. Please provide a date for calculating custom variance`);

		if (active && date === null && propertySettings?.custom_variance_date)
			e.th(400, `Cannot set variance date to null while enabling`);

	}

}

module.exports = PropertyRentManagement;