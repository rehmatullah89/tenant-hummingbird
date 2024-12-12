const moment      = require('moment');
const propertyRentManagementModel = require(`../../models/rent-management/property_rent_management`);
const utils = require('../../modules/utils');
const enums = require('../../modules/enums');
const e = require('../../modules/error_handler.js');

class PropertyRentManagement {

  constructor(data, date) {
    this.propertyId = data.propertyId || data.property_id || null;
    this.propertyName = data.propertyName || data.property_name || ``;
    this.companyId = data.company_id;
    this.date = date || moment().format(`YYYY-MM-HH`);
    this.notificationPeriod = data.notification_period;
    this.invoiceDaysForParking = data.parkingInvoiceSendDay;
    this.invoiceDaysForStorage = data.storageInvoiceSendDay;
    this.approvalType = data.approval_type;
    this.propertyLeaseRentChanges = [];
    this.propertyRentChangeLogs = {};
  }

	static async getRentManagementEnabledProperties(connection, company_id, property_id, min_hour = null, max_hour = null) {
		let properties =  await propertyRentManagementModel.findRentManagementEnabledProperties(connection, company_id, property_id, min_hour, max_hour);

    if (!properties || properties?.length == 0) {
      console.log(`No Rent Management enabled properties!`);
      return;
    }
    return properties;
  }

  async getConsolidatedLeaseRentPlanData(connection) {
    let leases = await propertyRentManagementModel.findConsolidatedLeaseRentPlanData(connection, this.propertyId, this.date);

    if (!leases || leases?.length == 0){
      console.log(`No lease with active Rent Plan Settings and without an active rent change found for property ${this.propertyName}(${this.propertyId})`);
      return;
    }
    return leases;
  }

  async bulkInsertLeaseRentChangesForProperty(connection) {
    if (this.propertyLeaseRentChanges?.length == 0) {
      console.log(`No rent change scheduled for property: ${this.propertyName}(${this.propertyId})\n`);
      return;
    }

    let fieldsToInsert = [
      `type`,
      `lease_id`,
      `property_id`,
      `rent_plan_id`,
      `rent_plan_trigger`,
      `affect_timeline`,
      `change_type`,
      `change_value`,
      `change_amt`,
      `new_rent_amt`,
      `target_date`,
      `effective_date`,
      `deployment_month`,
      `created_by`
    ];

    let rentChangesArray = utils.extractPropertiesFromArrayOfObjects(this.propertyLeaseRentChanges, fieldsToInsert, `array`);
    let bulkInsertResult = await propertyRentManagementModel.bulkInsert(connection, fieldsToInsert, rentChangesArray);

    if (bulkInsertResult?.affectedRows == this.propertyLeaseRentChanges.length) {
      console.log(`${bulkInsertResult.affectedRows} rent change${bulkInsertResult.affectedRows>1? 's':''} created.`);
      this.propertyRentChangeLogs.saveResult = bulkInsertResult
    } else {
      e.th(500, `Mismatch between number of Rent Change Leases and affected table rows. Any entries created will be rolled back.`);
    }
  }

  /**
   * This functions populates the deleted_at field for existing skipped/cancelled rent changes
   * in the same month.
   * @param { SqlConnectionObject } connection
   */
  async deleteConflictingRentChanges(connection) {
    if (this.propertyLeaseRentChanges?.length == 0) return;

    let
      conditionsArray = [],
      data = { deleted_at: new Date };

    this.propertyLeaseRentChanges.forEach((rentChange) => {
      conditionsArray.push(`(
          lease_id = ${rentChange.lease_id} AND
          property_id = ${rentChange.property_id} AND
          status IN ('skipped', 'cancelled') AND
          deployment_month = '${rentChange.deployment_month}' AND
          deleted_at IS NULL
      )`)
    });

    let condition = conditionsArray.join(` OR `);
    await propertyRentManagementModel.bulkUpdateLeaseRentChange(connection, data, condition);
  }

  async getLeaseRentChangesByEffectiveDate(connection, propertyId, effectiveDate, retryDate, date) {
    return await propertyRentManagementModel.getLeaseRentChangesByEffectiveDate(
      connection,
      propertyId,
      effectiveDate,
      retryDate,
      date
    );
  }

  async getDeployingRentChanges(connection, propertyId, date, invoiceDays) {
    return await propertyRentManagementModel.getDeployingRentChanges(connection, propertyId, date, invoiceDays)
  }

  static async isActiveDeliveryMethodExist(connection, propertyId) {
    return await propertyRentManagementModel.isActiveDeliveryMethodExist(connection, propertyId)
  }

	static async sendRentManagementCronLogs(payload, err = null, event_name = "RENT_MANAGEMENT_CRON", summary = null) {
    if (!summary) {
      summary = {
        stage: payload?.stage,
        time: payload?.time
      }
      if (payload?.data?.date) {
        summary.date = payload?.data?.date
      }
      if (payload?.data?.property) {
        summary.property = {
          id: payload?.data?.property?.id,
          name: payload?.data?.property?.property_name,
          company_id: payload?.data?.property?.company_id
        }
      }
      if (payload?.data?.rent_change_id) {
        summary.rent_change_id = payload.data.rent_change_id
      }
      if (payload?.data?.lease_id) {
        summary.lease_id = payload.data.lease_id
      }
    }
		return utils.sendLogs({
			event_name: enums.LOGGING[event_name],
			logs: {
				payload,
				error: err?.stack || err?.msg || err || undefined
			},
      summary
		});
	}

  async getPendingRentChangesByDaysLeftForApproval(connection, daysLeftArray = []) {
    if (daysLeftArray.length == 0 || this.approvalType != `manual`) return;

    this.rentChangesByDaysLeftForApproval = {};
    let
      datesArray = daysLeftArray.map((days) => moment(this.date).add((this.notificationPeriod + days), `days`).format(`YYYY-MM-DD`)),
      pendingRentChanges = await propertyRentManagementModel.fetchInitiatedRentChangesByEffectiveDates(connection, this.propertyId, datesArray);

    for (let days of daysLeftArray) this.rentChangesByDaysLeftForApproval[days] = [];

    for (let rentChange of pendingRentChanges) {
      let daysLeftForApproval = (moment(rentChange.effective_date).diff(this.date, `days`)) - this.notificationPeriod;
      this.rentChangesByDaysLeftForApproval[daysLeftForApproval].push(rentChange);
    }
    return this.rentChangesByDaysLeftForApproval;
  }

  async getDeploymentFailedRentChanges(connection) {
    let effectiveDateForParkingDeployment = moment(this.date).add((this.invoiceDaysForParking), `days`).format(`YYYY-MM-DD`);
    let effectiveDateForStorageDeployment = moment(this.date).add((this.invoiceDaysForStorage), `days`).format((`YYYY-MM-DD`));

    let effectiveDatesForDeployment = [ effectiveDateForParkingDeployment, effectiveDateForStorageDeployment ]

    this.deploymentFailedRentChanges = await propertyRentManagementModel.fetchDeploymentFailedRentChanges(connection, this.propertyId, effectiveDatesForDeployment);
    return this.deploymentFailedRentChanges;
  }

  async getnotificationFailedRentChanges(connection) {
    let effectiveDateWithTodayAsNotificationRetryDay = moment(this.date).add((this.notificationPeriod - 1), `days`).format(`YYYY-MM-DD`);

    this.notificationFailedRentChanges = await propertyRentManagementModel.fetchNotificationFailedRentChanges(connection, this.propertyId, effectiveDateWithTodayAsNotificationRetryDay);
    return this.notificationFailedRentChanges;
  }

  async getContactsWithRentManagementAlertPermission(connection) {
    let permissionsData = {
      propertyId: this.propertyId,
      companyId: this.companyId,
      label: `rent_management_alerts`,
    }

    this.contactsWithAlertsPermission = (await propertyRentManagementModel.fetchContactsWithRentManagementAlertPermission(connection, permissionsData)) || [];
    return this.contactsWithAlertsPermission;
  }

  static generateApprovalAlertMailContent(alertPayload = {}) {
    let pendingRentChangesCount = 0;

    for (let day in alertPayload) pendingRentChangesCount += alertPayload[day].length;
    if (pendingRentChangesCount == 0) return;

    let text = `<p>We are writing to bring your attention to pending rent changes that require your approval.</p><p>As of now, there are rent changes in the pipeline that have not yet received your approval, and the approval deadline is fast approaching. If these rent changes are not approved within the designated timeline, they will not take effect as scheduled and will be postponed to the following month.</p><p>To ensure a seamless transition and avoid any disruptions, we kindly request your immediate review and approval of the rent changes in the To Approve status.</p>
    `;

    return text;
  }

  static generateDeploymentFailureAlertMailContent(alertPayload = []) {
    if (alertPayload.length == 0) return;

    let text = `<p>One or more rent changes have encountered deployment errors, which may lead to disruptions in the scheduled rent change dates for the tenants involved. To maintain our commitment to a seamless rental process and prevent any undue delays, we urgently  request that you promptly review the Rent Change Queue and take the necessary actions to address these deployment errors. Your swift response is vital in ensuring that the rent changes proceed as scheduled and do not impact your tenants adversely.</p>`

    return text;
  }

  static generateNotificationFailureAlertMailContent(alertPayload = []) {
    if (alertPayload.length == 0) return;

    let text = `
      <p>There are approximately ${ alertPayload.length } document${ (alertPayload.length > 1) ? 's' : '' }/delivery method${ (alertPayload.length > 1) ? 's' : '' } that have encountered errors. These errors could potentially disrupt the scheduled rent change dates for affected tenants. To prevent any delays and ensure a smooth process, we kindly request your prompt intervention. Please access the rent change queue and manually generate the documents for these tenants.</p>
      <p>Once this is completed, please follow these steps:
        <ul>
          <li>Access the Rent Change Queue.</li>
          <li>Select the relevant rent change associated with the affected tenant.</li>
          <li>Identify the specific space for which the document/delivery method has errored out.</li>
          <li>Click on the ellipsis (...) menu.</li>
          <li>Mark the issue as "resolved" </li>
        </ul>
      </p>
      <p>By taking these steps, you will help ensure that the rent change proceeds as scheduled on the designated dates.</p>
    `

    return text;
  }

}

module.exports = PropertyRentManagement;
