
const moment = require('moment');
const models = require('../models');
const pool = require('../modules/db.js');
const utils = require('../modules/utils.js');
const Enums = require('../modules/enums.js');

const bullmq = require('bullmq');
const IORedis = require('ioredis');

const redis_connection = new IORedis({ host: process.env.REDIS_HOST });
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });
const db = require('../modules/db_handler.js');
const Tokens = require('../modules/tokens');
const PandaDocs = require('../modules/pandadocs.js');

const Company = require('../classes/company.js');
const Lease = require('../classes/lease.js');
const Service = require('../classes/service.js');
const DocumentBatch = require('../classes/document_batch.js');
const LeaseRentChange = require('../classes/rent-management/lease_rent_change.js');
const PropertyRentManagement = require(`../classes/rent-management/property_rent_management`);
const Property = require('../classes/property.js');
const Invoice = require('../classes/invoice');
const settings = require('../config/settings');
var rp = require('request-promise');

const RentManagementRoutines = {

	/**
	 * Find all the rent changes for a property that are supposed to happen
	 * within the rent change recommendation period and save it to the lease_rent_changes table.
	 * @param { Object } data Object with property level data
	 */
	async scheduleRentChange(data) {
		const
			connection = await db.getConnectionByType('write', data.cid),
			rentManagementByProperty = new PropertyRentManagement(data.property, data.date);

		try {
			let 
				leases = await rentManagementByProperty.getConsolidatedLeaseRentPlanData(connection),
				leaseLogs = [];

			rentManagementByProperty.propertyRentChangeLogs = {
				property: data.property,
				date: data.date,
				triggered_at: data.triggered_at
			};

			if (!leases) return;
			console.log(`\n\nLeases`, leases);

			for (let lease of leases) {
				console.log(`\n---------------\nLease:`, lease.lease_id);

				const rentChangeLease = new LeaseRentChange(lease, data);

				rentChangeLease.calculateConstraints();
				rentChangeLease.computeRentPlanSettingForLeaseStage();

				if (rentChangeLease.ignoreLeaseRentChange() || !rentChangeLease.rentChangeIntervalMonths)
					continue;

				rentChangeLease.calculateNextRentChangeDate();

				if (!rentChangeLease.nextRentChangeDate) continue;

				if (!rentChangeLease.isLeaseInStage() && !rentChangeLease.isNextRentChangeDateInPast()) 
					continue;

				rentChangeLease.calculateEffectiveDateForRentChange(); 
				rentChangeLease.calculateEffectiveDateForPrepaidTenants();

				if (rentChangeLease.isRentChangeWithinMinimumInterVal())
					continue;

				rentChangeLease.findRentChangeTypeAndValue(); 
				rentChangeLease.calculateRentChange();
				rentChangeLease.calculateNewRent();
				rentChangeLease.applyMaximumRaiseConstraint();
				rentChangeLease.applyRentCapConstraint();
				rentChangeLease.applyMinimumRaiseConstraint();
				rentChangeLease.roundNewRent();

				let rentChangeData = {
					type: rentChangeLease.type,
					lease_id: rentChangeLease.leaseId,
					property_id: rentChangeLease.propertyId,
					rent_plan_id: rentChangeLease.rentPlan.id,
					rent_plan_trigger: JSON.stringify({
						settings: rentChangeLease.stageRentPlanSetting,
						interval: rentChangeLease.rentChangeIntervalMonths
					}),
					affect_timeline: rentChangeLease.affectTimeline,
					change_type: rentChangeLease.changeType,
					change_value: rentChangeLease.changeValue,
					change_amt: rentChangeLease.rentChangeAmount,
					new_rent_amt: rentChangeLease.newRent,
					target_date: rentChangeLease.nextRentChangeDate.format(`YYYY-MM-DD`),
					effective_date: rentChangeLease.effectiveDate.format(`YYYY-MM-DD`),
					deployment_month: rentChangeLease.effectiveDate.format(`MMM YYYY`),
					created_by: rentChangeLease.created_by,
				}

				rentChangeLease.logData.rentIncrease = {
					effectiveDate: rentChangeLease.effectiveDate,
					newRent: rentChangeLease.newRent,
					rentChangeAmount: rentChangeLease.rentChangeAmount
				}

				console.log(`Lease ${rentChangeLease.leaseId} in stage. Rent Change queued. Current rent is ${rentChangeLease.currentRent}. New rent is ${rentChangeLease.newRent}(${rentChangeLease.currentRent} + ${rentChangeLease.rentChangeAmount}) and will be effective on the first billing date after ${rentChangeLease.nextRentChangeDate.format(`YYYY-MM-DD`)}, i.e., ${rentChangeLease.effectiveDate.format(`YYYY-MM-DD`)}\nData: ${JSON.stringify(rentChangeData)}`);

				rentManagementByProperty.propertyLeaseRentChanges.push(rentChangeData);
				leaseLogs.push(rentChangeLease.logData);
			}

			rentManagementByProperty.propertyRentChangeLogs.leases = leaseLogs;

			await connection.beginTransactionAsync();
			await rentManagementByProperty.bulkInsertLeaseRentChangesForProperty(connection);
			await rentManagementByProperty.deleteConflictingRentChanges(connection);
			await connection.commitAsync();

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...rentManagementByProperty.propertyRentChangeLogs,
					totalRentChangesScheduled: rentManagementByProperty.propertyRentChangeLogs.leases.length
				},
				stage: `ScheduleRentChangesSuccess`,
				method: `scheduleRentChange`,
				time: (new Date).toLocaleString()
			});

		} catch (error) {

			PropertyRentManagement.sendRentManagementCronLogs({
				data: rentManagementByProperty.propertyRentChangeLogs,
				stage: `ScheduleRentChangeFailure`,
				method: `scheduleRentChange`,
				time: (new Date).toLocaleString()
			}, error);

			console.log(`Error while scheduling rent change`, error)
			await connection.rollbackAsync();

		} finally {
			await db.closeConnection(connection);
		}
	},

	/**
	 * This function will deploy the already approved rent changes,
	 * which has the invoice generation date of (today + invoiceSendDays)
	 * @param { Object } data Property level data
	 */
	async deployRentChanges(data) {
		const connection = await db.getConnectionByType('write', data.cid);

		try {
			let
				deployedRentChangeIds = [],
				failedRentChangeIds = [],
				invoiceAdjustedLeaseIds = [],
				rentChangesToSkip = [],
				successfullySkipped = false,
				rentManagement = new PropertyRentManagement(data.property),
				date = data.date || moment().format('YYYY-MM-DD'),
				invoiceDays = {
					parking: data.property.parkingInvoiceSendDay || 0,
					storage: data.property.storageInvoiceSendDay || 0
				}

			// Fetches the rent changes which have the invoiceDate tomorrow (or the date in the query param + 1)
			let rentChangesToBeDeployed = await rentManagement.getDeployingRentChanges(
				connection,
				data.property.property_id,
				data.date,
				invoiceDays
			);
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					invoice_days: invoiceDays,
					total_rent_changes_to_be_deployed: rentChangesToBeDeployed.length
				},
				stage: `InitiatedDeployment`,
				method: `deployRentChanges`,
				time: (new Date).toLocaleString()
			});

			for (let rentChange of rentChangesToBeDeployed) {
				let	leaseLogs = { leaseId: rentChange.lease_id, rentChangeId: rentChange.id };
					
				rentChange.isSkippableDueToNotificationError = await this.isRentChangeNotificationFailed(rentChange);
					
				if (rentChange?.isSkippableDueToNotificationError) {
					rentChangesToSkip.push(rentChange);
					console.log(`Skipping Rent Change (ID: ${rentChange.id}) for lease ${rentChange.lease_id} due to notification failure`);
					continue;
				}

				let dateResponse = await LeaseRentChange.computeDatesForInvoiceAdjustment(connection, rentChange) || {};

				leaseLogs.invoiceAdjustment = { dateResponse };
				console.log(`dateResponse for invoice adjustment:`, dateResponse);

				let { startDateForAdjustingInvoices, newEffectiveDateForRentChange } = dateResponse;

				if (newEffectiveDateForRentChange) rentChange.effective_date = newEffectiveDateForRentChange;

				await connection.beginTransactionAsync();
				try {
					let newService = await this.updateLeaseService(connection, rentChange);

					if (startDateForAdjustingInvoices) {
						let invoiceAdjustmentResponse = await this.adjustInvoicesForPrepayRentRaise(connection, {
							leaseId: rentChange.lease_id,
							companyId: data.property.company_id,
							dateResponse
						});

						if (invoiceAdjustmentResponse?.status != `success`) throw { message: `Invoices adjustment failed`, ...invoiceAdjustmentResponse };

						invoiceAdjustedLeaseIds.push(rentChange.lease_id);

						leaseLogs.invoiceAdjustment = {
							...leaseLogs.invoiceAdjustment,
							...invoiceAdjustmentResponse,
							voidInvoices: utils.extractPropertiesFromArrayOfObjects(invoiceAdjustmentResponse.voidInvoices, [`id`, `number`, `period_start`, `total_amount`, `total_payments`, `last_paid_on`]),
							newInvoices: utils.extractPropertiesFromArrayOfObjects(invoiceAdjustmentResponse.newInvoices, [`id`, `number`, `period_start`, `total_amount`, `total_payments`])
						}
					}

					let leaseRentChange = new LeaseRentChange({ id: rentChange.id });

					await leaseRentChange.save(connection, {
						status: "deployed",
						service_id: newService.id,
						change_applied: moment.utc().format('YYYY-MM-DD HH:mm:ss'), // Date in which service_id was created,
						last_modified_by: data.hbAppContactId,
						status_updated_at: new Date()
					}, rentChange.id);

					await connection.commitAsync();
					deployedRentChangeIds.push(rentChange.id)

					PropertyRentManagement.sendRentManagementCronLogs({
						data:{ ...data, leaseLogs },
						stage: `LeaseDeploymentSuccess`,
						method: `deployRentChanges`,
						time: (new Date).toLocaleString()
					});

				} catch (error) {
					failedRentChangeIds.push(rentChange.id);
					leaseLogs.error = error;

					await connection.rollbackAsync();

					console.log(`Deployment of Rent Change (ID: ${rentChange.id}) for lease ${rentChange.lease_id} failed.`, error);
					PropertyRentManagement.sendRentManagementCronLogs({
						data:{ ...data, leaseLogs },
						stage: `LeaseDeploymentFailure`,
						method: `deployRentChanges`,
						time: (new Date).toLocaleString()
					}, error);
				}

			}

			await connection.beginTransactionAsync();
			try {

				await this.skipRentChanges(
					connection,
					rentChangesToSkip,
					data.property.notification_period,
					data.property.min_rent_change_interval,
					date,
					data.hbAppContactId
				);

				await connection.commitAsync();
				successfullySkipped = true;

			} catch (error) {

				successfullySkipped = false;
				console.log(`Failed to skip rent changes`, error)
				await connection.rollbackAsync();

			}

			let deploymentSummary = {
				total: rentChangesToBeDeployed.length,
				deployed: deployedRentChangeIds.length,
				failed: failedRentChangeIds.length,
				toSkip: rentChangesToSkip.length,
				skipped: successfullySkipped ? rentChangesToSkip.length : 0,
				invoiceAdjustedLeases: invoiceAdjustedLeaseIds.length
			}

			console.log(`Deployment of Rent changes completed.`, deploymentSummary);

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					deploymentSummary,
					deployedRentChangeIds,
					failedRentChangeIds,
					invoiceAdjustedLeaseIds,
					skippedRentChanges: (rentChangesToSkip.length && successfullySkipped) ? utils.extractPropertiesFromArrayOfObjects(rentChangesToSkip, [`id`, `lease_id`]) : []
				},
				stage: `DeploymentSuccess`,
				method: `deployRentChanges`,
				time: (new Date).toLocaleString()
			});

		} catch (error) {

			PropertyRentManagement.sendRentManagementCronLogs({
				data,
				stage: `DeploymentFailure`,
				method: `deployRentChanges`,
				time: (new Date).toLocaleString()
			}, error);
			console.log('Error occured while deploying rent change ', error);

		} finally {
			await db.closeConnection(connection);
		}
	},

	async sendAlertMails(data) {

		const
			approvalAlertSendingDays = [7, 3, 1],
			connection = await db.getConnectionByType('read', data.cid),
			rentManagementByProperty = new PropertyRentManagement(data.property, data.date);

		try {

			let company = new Company({ id: data.property.company_id });
			await company.find(connection);

			data.company = company;

			let contacts = (await rentManagementByProperty.getContactsWithRentManagementAlertPermission(connection)) || [];

			this.contactsToAlert = contacts.map(contact => {
				return {
					name: contact.name,
					email: contact.email
				}
			});

			console.log(`${ this.contactsToAlert.length } Contacts with Rent Management Alerts email permission (contactsToAlert):`, this.contactsToAlert);

			if (!(settings.is_prod || settings.is_uat || settings.is_staging) && (contacts.length > 0)) {
				this.contactsToAlert = [{
					name: contacts[0]?.name,
					email: process.env.DEBUG_EMAIL_ADDRESS
				}];
				console.log(`In dev environment. Sending mail to the debug email (contactsToAlert):`, this.contactsToAlert);
			}

			let
				rentChangesToBeApproved = null,
				deploymentFailedRentChanges = await rentManagementByProperty.getDeploymentFailedRentChanges(connection, data),
				notificationFailedRentChanges = await rentManagementByProperty.getnotificationFailedRentChanges(connection);

			if (rentManagementByProperty.approvalType == `manual`)
				rentChangesToBeApproved = await rentManagementByProperty.getPendingRentChangesByDaysLeftForApproval(connection, approvalAlertSendingDays);

			let payloadForAlertMails = {
				data,
				rentChangesToBeApproved,
				deploymentFailedRentChanges,
				notificationFailedRentChanges,
				contacts: this.contactsToAlert,
			};

			let job;
			if (contacts.length > 0) job = await Queue.add(`send_rent_management_alert_mails`, payloadForAlertMails , { priority: data.priority });

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					rentChangesToBeApproved,
					deploymentFailedRentChanges,
					notificationFailedRentChanges,
					contacts: this.contactsToAlert,
					...(job?.id && { jobId: job.id })
				},
				stage: `InitiateEmailAlerts`,
				method: `sendAlertMails`,
				time: (new Date).toLocaleString()
			});

		} catch (error) {

			console.log(`Error while sending alert mails:`, error);
			PropertyRentManagement.sendRentManagementCronLogs({
				data,
				stage: `EmailAlertsFailure`,
				method: `sendAlertMails`,
				time: (new Date).toLocaleString()
			}, error);

		} finally {
			await db.closeConnection(connection);
		}

	},

  	async updateLeaseService(connection, rentChange) {
		let newStartDate;
		let lease = new Lease({
			id: rentChange.lease_id
		})
		await lease.find(connection);
		let activeRentService = await Service.getActiveRentService(
			connection,
			lease.id,
			moment(rentChange.effective_date)
		);
		let futureRentServices = await Service.getFutureRentServices(
			connection,
			rentChange.lease_id,
			moment(rentChange.effective_date)
		);

		if(futureRentServices?.length){
			let frsIds = futureRentServices.map(frs => frs.id);
			await Service.endFutureServices(connection, { status : 0 }, frsIds);
		}
		newStartDate = lease.getNextBillingDate(
			moment(rentChange.effective_date, 'YYYY-MM-DD'),
			true
		);

		// checking for duplicate Active Rent Service, and ending it.
		if (moment(newStartDate).isSame(activeRentService.start_date)) {
			await models.Service.save(
				connection,
				{status: 0, end_date: moment(newStartDate).format('YYYY-MM-DD')},
				activeRentService.id
			);
		} else {
			activeRentService.last_billed = null;
			await activeRentService.endCurrentService(
				connection,
				newStartDate.clone().startOf('day').subtract(1, 'day').format('YYYY-MM-DD')
			);
		}

		let newService = new Service({
			lease_id: rentChange.lease_id,
			product_id: activeRentService.product_id,
			property_bill_id: activeRentService.property_bill_id,
			price: rentChange.new_rent_amt,
			start_date: newStartDate.format('YYYY-MM-DD'),
			name: activeRentService.name,
			description: activeRentService.description,
			qty: activeRentService.qty,
			recurring: activeRentService.recurring,
			prorate: activeRentService.prorate,
			taxable: activeRentService.taxable,
			service_type: activeRentService.service_type,
			prorate_out: activeRentService.prorate_out
		})
		await newService.save(connection);

		return newService;
	},
	
	async skipRentChanges(connection, rentChanges, notificationPeriod, minRentChangeInterval, cronRunDate, skippedBy) {
		let updatePayload = [], insertPayload = [], notesPayload = [], insertDataWithNotes = [];
		let skipRentChangeNotification = `Skipping the rent change as notification was not sent on time`;
		let cancelNextRentChange;
		for (let rentChange of rentChanges) {
				let nextRentChangeData = rentChange?.next_rent_change_data ? JSON.parse(rentChange?.next_rent_change_data) : null;
				let
					skipTo = null,
					newEffectiveDate,
					isInvalid = false,
					conflict = false,
					existingScheduledRentChangeDate = null,
					data = {};

				let leaseRentChange = new LeaseRentChange({
					id: rentChange.id,
					bill_day: rentChange.bill_day
				});

				if (moment(rentChange.effective_date).diff(moment(cronRunDate), `days`) < notificationPeriod) {
					skipTo = moment(cronRunDate).add(notificationPeriod, `days`).format(`YYYY-MM-DD`);
					if (moment(skipTo).isSame(moment(rentChange.effective_date))) skipTo = moment(rentChange.effective_date).add(1, `month`).format(`YYYY-MM-DD`)
				} else {
					skipTo = moment(rentChange.effective_date).add(1, `month`).format(`YYYY-MM-DD`);
				}

				leaseRentChange.nextRentChangeDate = moment(skipTo);
				if (skipTo) {
					leaseRentChange.calculateEffectiveDateForRentChange();
					newEffectiveDate = leaseRentChange.effectiveDate.format("YYYY-MM-DD");

				}
				if (nextRentChangeData?.date) {
					isInvalid = LeaseRentChange.checkIfEffectiveDateWithinMinimumInterval(
						nextRentChangeData?.date,
						newEffectiveDate,
						minRentChangeInterval
					);
					existingScheduledRentChangeDate = nextRentChangeData?.date;
					if (moment(nextRentChangeData?.date).isSame(moment(newEffectiveDate),'month')) conflict = true;
				}
				/* 
				cancel next rent change when
					- type of rent change to skip is manual AND
					- type of next rent change is automatic (rent change type except manual are considered automatic) AND
					- deployment month of next rent change and deployment month of rent change to skip is same AND
					- rent change status is not deployed
				*/
				if(rentChange?.type === 'manual' && ( nextRentChangeData?.type !== 'manual' ) && conflict && ( nextRentChangeData?.status != 'deployed')) cancelNextRentChange = true;

				if(cancelNextRentChange) {
					data = {
						update: {
							status: "cancelled",
							status_updated_at: new Date,
							deleted_at: new Date,
							...(skippedBy && {
								last_modified_by: skippedBy,
								cancelled_by: skippedBy
							})
						},
						note: {
							content: `When the system tried to skip this rent change to ${moment(newEffectiveDate).format("MM/DD/YYYY")}, there was already a rent change for that deployment month. So the automatic rent change 
							of that deployment month (${moment(newEffectiveDate).format("MMM YYYY")}) was cancelled`,
							type: "cancelled",
							...(skippedBy && { last_modified_by: skippedBy })
						}
					}
					let { updateData, notesData } = LeaseRentChange.generateActionsPayload({id: nextRentChangeData?.id, lease_id: rentChange?.lease_id, contact_id: rentChange?.contact_id }, data);
					notesPayload.push(notesData);
					updatePayload.push(updateData);
				/* 
				cancel the rent change to skip when
					- type of rent change to skip is not manual and type of next rent change is not automatic AND
					- deployment month of next rent change and deployment month of rent change to skip is same OR
					- next rent change is deployed
				*/
				} else if (conflict) {
					data = {
						update: {
							status: "cancelled",
							status_updated_at: new Date,
							...(skippedBy && {
								last_modified_by: skippedBy,
								cancelled_by: skippedBy
							})
						},
						note: {
							content: `When the system tried to skip this rent change to ${moment(newEffectiveDate).format("MM/DD/YYYY")}, there was already a rent change for that deployment month. So this rent change was cancelled`,
							type: "cancelled",
							...(skippedBy && { last_modified_by: skippedBy })
						}
					}
				}
				/* 
				skip this rent change and add new rent change entry when
					- deployment month of next rent change and deployment month of rent change to skip is not same
					 	OR
					- type of next rent change is automatic AND
					- type of rent change to skip is manual AND
					- deployment month of next rent change and deployment month of rent change to skip is same
				*/
				if(!conflict || cancelNextRentChange) {
					if (isInvalid) {
						data = {
							update: {
								status: "skipped",
								status_updated_at: new Date,
								...(skippedBy && {
									last_modified_by: skippedBy,
									skipped_by: skippedBy
								})
							},
							insert: {
								effective_date: newEffectiveDate,
								tagged: 1,
								status: `initiated`,
								rent_plan_trigger: null,
								skipped_by: null,
								cancelled_by: null,
								deployment_month: moment(newEffectiveDate).format(`MMM YYYY`),
								...(skippedBy && { last_modified_by: skippedBy })
							},
							note: {
								content: `${rentChange?.isSkippableDueToNotificationError ? skipRentChangeNotification : `Skipping the rent change as approval type was manual and rent change was not approved before the approval period`}`,
								type: "skipped",
								...(skippedBy && { last_modified_by: skippedBy })
							},
							insertNote: {
								content: `Minimum rent change interval is not satisfied. There is already a rent change scheduled on ${moment(existingScheduledRentChangeDate).format("MM/DD/YYYY")}`,
								type: "tag",
								creation_type: "auto",
								lease_id: rentChange.lease_id,
								context: "rent_management",
								pinned: 0,
								contact_id: rentChange.contact_id,
								...(skippedBy && { last_modified_by: skippedBy })
							}
						};
					} else {
						data = {
							update: {
								status: "skipped",
								status_updated_at: new Date,
								...(skippedBy && {
									last_modified_by: skippedBy,
									skipped_by: skippedBy
								})
							},
							insert: {
								effective_date: newEffectiveDate,
								tagged: false,
								status: `initiated`,
								rent_plan_trigger: null,
								skipped_by: null,
								deployment_month: moment(newEffectiveDate).format(`MMM YYYY`),
								...(skippedBy && { last_modified_by: skippedBy })
							},
							note: {
								content: `${rentChange?.isSkippableDueToNotificationError ? skipRentChangeNotification : `Skipping the rent change as approval type was manual and rent change was not approved before the approval period`}`,
								type: "skipped",
								...(skippedBy && { last_modified_by: skippedBy })
							}
						};
					}
				}
				let { insertData, updateData, notesData } = LeaseRentChange.generateActionsPayload(rentChange, data);
				if (data.insertNote) {
					// If notes need to be added for the inserting rent change
					if (insertData) {
						let rentChangeFields = [
							`type`,
							`lease_id`,
							`property_id`,
							`rent_plan_id`,
							`rent_plan_trigger`,
							`status`,
							`tagged`,
							`affect_timeline`,
							`change_type`,
							`change_value`,
							`change_amt`,
							`new_rent_amt`,
							`target_date`,
							`effective_date`,
							`created_by`,
							`last_modified_by`,
							`skipped_by`,
							`cancelled_by`,
							`deployment_month`
						];
						insertedRentChange = await models.LeaseRentChange.insertRentChange(connection, insertData, rentChangeFields);
						await LeaseRentChange.saveNotes(connection, [{
							...data.insertNote,
							rent_change_id: insertedRentChange.insertId
						}]);
						insertDataWithNotes.push(insertData);
					}
				} else {
					if (insertData) insertPayload.push(insertData)
				}
				if (updateData) updatePayload.push(updateData);
				if (notesData) notesPayload.push(notesData);
			}
			await LeaseRentChange.saveRentChangeDataAndNotes(connection, { insertPayload, updatePayload, notesPayload });
			insertPayload = insertPayload.concat(insertDataWithNotes);
			await LeaseRentChange.addDeletedAtForConflictingRentChanges(connection, insertPayload)
	},

	async approveRentChange(connection, rentChangeId, approvedBy) {
		let leaseRentChange = new LeaseRentChange({
			id: rentChangeId
		})
		return await leaseRentChange.update(connection, {
			status: "approved",
			approved_at: new Date,
			approved_by: approvedBy,
			last_modified_by: approvedBy
		})
	},

	async deliverDocument(data) {
		// copy from delinquencies
		const connection = await db.getConnectionByType('write', data.cid);
		try {
			let
				{
					document_batch_id,
					rent_change_id,
					cid,
					company_id,
					lease_id,
					upload_id,
					trace_id
				} = data,
				company = new Company({
					id: company_id
				}),
				notification_methods = data.notification_methods,
				manualApproval = data.manual_approval
			;
			await company.find(connection);

			console.log(
				"PARAMS to deliverDocument: ",
				document_batch_id, rent_change_id, cid, company_id
			);

			// get Rent Change Lease
			let lease = new Lease({
				id: lease_id
			});
			await lease.find(connection);
			await lease.getTenants(connection);
			await lease.getProperty(connection, company.id);
			let tenant = lease.Tenants.find(
				t => t.contact_id == lease.primary_contact_id
			)

			if (!company.gds_owner_id || !lease.Property.gds_id) {
				console.log("Missing company's owner_id or properties GDS id");
				console.log("Company: ", company.gds_owner_id);
				console.log("Property: ", lease.Property.gds_id);
				await utils.closeConnection(pool, connection);
				return data;
			}
			// TODO: Need to update this import after debugging the circular import issue
			let Upload = require('../classes/upload.js');
			let upload = new Upload({
				id: upload_id
			})
			await upload.find(connection);
			await upload.findSigners(connection, company.id);
			upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
			let file = await upload.download();

			let attachments = [{
				upload_id: upload.id,
				content_type: "application/pdf",
				name: `${upload.name}.pdf`,
				content: file.Body.toString('base64'),
			}];

			let deliveries = [];
			if (!manualApproval && notification_methods.length) {
				// For manual approval notification will be sent later on the notification day
				deliveries = await DocumentBatch.getDeliveryMethods(
					connection,
					notification_methods
				);
			}
			let
				isLeaseDataNeeded = false,
				updatedNotificationMethods = [],
				notificationStatus = null
			;
			for (let delivery of deliveries) {
				if (['registered_email', 'certified_email', 'standard_email'].includes(delivery.gds_key)) {
					isLeaseDataNeeded = true
					break;
				}
			}
			if (isLeaseDataNeeded) {
				// isLeaseDataNeeded is used, so that the below functions are called only once,
				// otherwise these function will be called 3 times for registered email, certified email and standard emails
				await lease.findUnit(connection);
				await lease.getCurrentBalance(connection, company.id);
				await lease.getActiveRent(connection);
			}
			for (let delivery of deliveries) {
				let
					dm = {
						id: delivery.delivery_methods_id,
						gds_key: delivery.gds_key,
					},
					notificationMethod = notification_methods.find(obj => obj.delivery_method === delivery.gds_key),
					response = {}
				;
				switch (delivery.gds_key) {
					case 'certified_mail':
					case 'first_class':
					case 'certificate_of_mailing':
					case 'certified_mail_with_err':
						response = await tenant.Contact.sendMail(
							connection,
							JSON.parse(JSON.stringify(attachments)),
							'rent_raise',
							company.gds_owner_id,
							lease.Property.gds_id,
							dm,
							null,
							lease.primary_contact_id,
							lease.id,
							delivery.id,
							null,
							trace_id
						);
						break;
					case 'registered_email':
					case 'certified_email':
					case 'standard_email':
						// if (!tenant.Contact.email) {
						// 	throw `Email not present for Contact ${tenant.Contact.first} ${tenant.Contact.last}`;
						// }
						let message = await RentManagementRoutines.mergeTokens(
							connection,
							notificationMethod.message,
							lease,
							company,
							lease.property
						);
						response = await tenant.Contact.sendEmail(
							connection,
							notificationMethod.subject,
							message,
							JSON.parse(JSON.stringify(attachments)),
							null,
							'rent_raise',
							company.gds_owner_id,
							lease.Property.gds_id,
							dm,
							lease.primary_contact_id,
							lease.id,
							delivery.id,
							null,
							trace_id
						);
						break;
				}
				if (response.status === "error") {
					notificationStatus = 'error'
				} else {
					// Can be success, scheduled, etc
					notificationStatus = 'done'
				}
				updatedNotificationMethods.push({
					delivery_method: delivery.gds_key,
					delivery_method_id: delivery.delivery_methods_id,
					upload_id: upload_id,
					interaction_id: response.interaction_id,
					date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
					status: notificationStatus
				});
			}
			data.notification_methods = updatedNotificationMethods
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data
				},
				stage: `DocumentDelivered`,
				method: `deliverDocument`,
				time: (new Date).toLocaleString()
			});
			return data;
		} catch (err) {
			console.log("deliverDocument err", err)
			PropertyRentManagement.sendRentManagementCronLogs({
				data: data,
				stage: `DocumentDeliveryFailure`,
				method: `deliverDocument`,
				time: (new Date).toLocaleString()
			}, err);
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},

	async cancelMovedOutLeaseAndAuctionedRentChanges(data) {
		/**
		 * This function will cancel the rent changes of all the moved-out leases and auctioned units
		 */
		const connection = await db.getConnectionByType('write', data.cid);
		try {
			await connection.beginTransactionAsync();

				let 
					date = data.date || moment().format('YYYY-MM-DD'),
					auctionedMessage = `The rent change was cancelled by the system because the unit was auctioned.`,
					moveOutMessage = `The rent change was cancelled by the system because the tenant has moved out.`,
					movedOutLeaseRentChanges = await models.PropertyRentChange.getMovedOutLeaseRentChanges(
						connection,
						data.property.property_id,
						date
					),
					note = {
						content: moveOutMessage,
						type: "cancelled",
						creation_type: "auto",
						context: `rent_management`,
						pinned: 0
					},
					notes = [];

				for (let rentChange of movedOutLeaseRentChanges) {
					if (['auction_payment', 'move_out'].includes(rentChange?.auction_status)) note.content = auctionedMessage;
					notes.push({
						...note,
						lease_id: rentChange.lease_id,
						rent_change_id: rentChange.id,
						contact_id: rentChange.contact_id,
						...(data.hbAppContactId && { last_modified_by: data.hbAppContactId })
					})
				}

				await LeaseRentChange.saveNotes(connection, notes);
				let result = await models.PropertyRentChange.cancelMovedOutLeaseAndAuctionedRentChanges(
					connection,
					data.property.property_id,
					date,
					data.hbAppContactId
				);

			await connection.commitAsync();
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...result,
					property: data.property
				},
				property_id: data.property.property_id,
				gds_id: data.property.gds_id,
				stage: `CancelledMovedOutLease`,
				method: `CancelMovedOutLease`,
				time: (new Date).toLocaleString()
			});
		} catch (error) {
			PropertyRentManagement.sendRentManagementCronLogs({
				property_id: data.property.property_id,
				gds_id: data.property.gds_id,
				stage: `CancelMovedOutLeaseFailure`,
				method: `CancelMovedOutLease`,
				time: (new Date).toLocaleString()
			}, error);
			await connection.rollbackAsync();
		} finally {
			await db.closeConnection(connection);
		}
	},

	// Commenting the function manualApprovalOfRentChange as document generation is not needed at the time of manual approval
	// async manualApprovalOfRentChange(data) {
	// 	/**
	// 	 * This function will only generates documents for the manually approved rent changes, whose IDs are mentioned in data.rent_change_ids
	// 	 */
	// 	const connection = await db.getConnectionByType('write', data.cid);
	// 	try {
	// 		let
	// 			rentChangeIds = data.rent_change_ids
	// 		;
	// 		let rentChanges = await models.LeaseRentChange.findByIds(connection, rentChangeIds);
	// 		console.log("rentChanges length: ", rentChanges.length)

	// 		try {
	// 			for (let i = 0; i < rentChanges.length; i++) {
	// 				await Queue.add('send_rent_change_notification', {
	// 					cid: data.cid,
	// 					priority: data.priority,
	// 					lease_id: rentChanges[i].lease_id,
	// 					document_id: data.property.notification_document_id,
	// 					company_id: data.property.company_id,
	// 					rent_change_id: rentChanges[i].id,
	// 					rent_change_ids: rentChangeIds, // IDs of Total rent changes that are been approved
	// 					manual_approval: true,
	// 					effective_date: rentChanges[i].effective_date,
	// 					property: data.property,
	// 					socket_details: {
	// 						company_id: data.socket_details.company_id,
	// 						document_id: data.socket_details.document_id,
	// 						contact_id: data.socket_details.contact_id
	// 					},
	// 				}, { priority: data.priority});
	// 			}
	// 		} catch(err) {
	// 			throw err;
	// 		}

	// 	} catch(err) {
	// 		console.log('Error occured while notifying / deploying rent change ', err);
	// 	} finally {
	// 		await db.closeConnection(connection);
	// 	}
	// },

	async approveRentChanges(data) {
		/*
			This function will do the following actions:
				- approve all the rent changes which has an effective date of (today + notification period) and
				- sends notification after generating the rent change document.
			Args:
				- data: Object with the following fields:
					- connection
					- property
					- company_id
					- cid
					- date: Optional
					- approveRentChangeMonth:
						- Provide value while requesting from API Server.
						- This field will be in the format 'Jan 2023'
						- If provided, all the scheduled rent changes in the mentioned month will be approved and notification will be sent (only if its before notification period).
						- If no value is provided, then approval and sending notifications will be done only for the rent changes that have :notification_period days for the billing day
					- rent_change_ids:
						- Array of IDs for the table lease_rent_changes
		 */
		const connection = await db.getConnectionByType('write', data.cid);
		try {
			console.log("\nStarting approveRentChanges\n");
			let 
				rentManagement = new PropertyRentManagement(data.property),
				approvalType = data.property.approval_type,
				notificationMethods = JSON.parse(
					data.property.notification_methods
				),
				date = data.date || moment().format('YYYY-MM-DD'),
				approvedLeasesCount = 0,
				skippingRentChanges = [],
				document_id = "",
				documentBatch = null,
				rentChangeIds = [],
				retryingRentChanges = [],
				jobs = []
			;
			let notifyDateObj = (date ? moment(date): moment()).add(
				data.property.notification_period,
				'days'
			);
			let notifyDate = notifyDateObj.format('YYYY-MM-DD');
			let retryDate = notifyDateObj.subtract(1, 'day').format('YYYY-MM-DD');

			let rentChanges = await rentManagement.getLeaseRentChangesByEffectiveDate(
				connection,
				data.property.property_id,
				notifyDate,
				retryDate,
				date
			);
			console.log("rentChanges length: ", rentChanges ? rentChanges.length: 0);

			// Pushing logs
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					approving_rent_changes_count: rentChanges ? rentChanges.length: 0,
					considered_effective_date: notifyDate,
					approval_type: approvalType
				},
				stage: `Approval`,
				method: `approveRentChanges`,
				time: (new Date).toLocaleString()
			});

			if (rentChanges && rentChanges.length) {
				try {
					await connection.beginTransactionAsync();
						for (let rentChange of rentChanges) {
							if (
								(approvalType === "automated") ||
								(approvalType === "manual" && rentChange.status === "approved")
							) {
								rentChangeIds.push(rentChange.id)
								if (moment(rentChange.effective_date).format('YYYY-MM-DD') == retryDate)
									retryingRentChanges.push(rentChange.id)
								if (rentChange.status === 'initiated') {
									// Updating status to approved only if the status is inititated
									approvedLeasesCount += await this.approveRentChange(
										connection,
										rentChange.id,
										data.hbAppContactId
									)
								}
							} else {
								// If approval type is manual and the rent change status is initiated,
								// then we will be skipping the rent changes
								skippingRentChanges.push(rentChange);
							}
						}
						if (retryingRentChanges.length) {
							// Setting upload_id, notification_status, etc to null
							// This is done to include the retried rent changes in merged document which is generated in the mergeDocuments function
							await models.LeaseRentChange.updateRetryingRentChangesNoticeDetails(
								connection,
								retryingRentChanges,
								{
									upload_id: null,
									notification_status: null,
									notification_sent: null
								}
							)
						}
						if (rentChangeIds.length) {
							// If rent changes are present that needs to be approved or notified
							// Create document batch and document_batch_deliveries only if there are rentChanges that
							// needs to be notified.
							documentBatch = new DocumentBatch({
								created_by: data.hbAppContactId,
								property_id: data.property.property_id,
								document_manager_template_id: data.property.notification_document_id,
								document_type: 'Rent Change'
							});
							await documentBatch.save(connection);
							if (notificationMethods.length) {
								// save document_batch_deliveries
								for (let notificationMethod of notificationMethods) {
									if (notificationMethod.delivery_method_id) {
										notificationMethod.document_batch_delivery_id = await documentBatch.saveDelivery(
											connection,
											notificationMethod.delivery_method_id,
											data.hbAppContactId
										);
									}
								}
							}
						}
						if (skippingRentChanges.length) {
							await this.skipRentChanges(
								connection,
								skippingRentChanges,
								data.property.notification_period,
								data.property.min_rent_change_interval,
								date,
								data.hbAppContactId
							);
						}
					await connection.commitAsync();

					if (rentChangeIds.length && documentBatch) {
						console.log("approval Type: ", approvalType)
						for (let i = 0; i < rentChanges.length; i++) {
							if (
								(approvalType === 'automated') ||
								(approvalType === 'manual' && rentChanges[i].status === 'approved')
							) {
								document_id = utils.slugify(
									"Rent Change"
								) + "_" +  moment().format('x');
								let job = await Queue.add('send_rent_change_notification', {
									document_batch_id: documentBatch.id,
									hbAppContactId: data.hbAppContactId,
									cid: data.cid,
									priority: data.priority,
									lease_id: rentChanges[i].lease_id,
									document_id: data.property.notification_document_id,
									company_id: data.property.company_id,
									property_id: data.property.property_id,
									rent_change_id: rentChanges[i].id,
									previous_interaction_id: rentChanges[i].previous_interaction_id,
									// upload_id: rentChanges[i].upload_id,
									rent_change_ids: rentChangeIds, // Total rent change ids that are been approved in this run. This will be used in mergeDocuments function
									notification_methods: notificationMethods,
									effective_date: rentChanges[i].effective_date,
									notification_retry: moment(rentChanges[i].effective_date).format('YYYY-MM-DD') == retryDate, // This field determines whether the notification is retried
									// retrying_rent_change_ids: retryingRentChangeIds,
									date: date,
									property: data.property,
									event_name: data.event_name,
									bypass: data?.bypass,
									socket_details: {
										company_id: data.property.company_id,
										document_id: document_id,
									},
								}, { priority: data.priority});

								jobs.push({
									rent_change_id: rentChanges[i].id,
									job_id: job?.id || null
								});
							}
						}
					}

					console.log(`Auto approved rent changes with billingDate as ${notifyDate}: ${approvedLeasesCount}`);
					console.log(`Total rent changes to be notified with billingDate as ${notifyDate}: ${rentChangeIds.length}`);
					console.log(`Skipped rent changes: ${skippingRentChanges.length}`)
					PropertyRentManagement.sendRentManagementCronLogs({
						data: {
							...data,
							approval_type: approvalType,
							document_batch_id: documentBatch?.id,
							considered_effective_date: notifyDate,
							approved_rent_changes_count: approvedLeasesCount,
							skipped_rent_changes_count: skippingRentChanges.length,
							rent_changes_to_be_notified: rentChangeIds.length,
						},
						stage: `Approved`,
						method: `approveRentChanges`,
						time: (new Date).toLocaleString()
					});
					// Separate log is pushed with job IDs, because if there are more than 500 rent changes, the log will be pushed to s3
					PropertyRentManagement.sendRentManagementCronLogs({
						data: {
							...data,
							document_batch_id: documentBatch?.id,
							considered_effective_date: notifyDate,
							rent_changes_to_be_notified: rentChangeIds.length,
							notification_jobs: jobs
						},
						stage: `NotificationJobs`,
						method: `approveRentChanges`,
						time: (new Date).toLocaleString()
					});
				} catch(err) {
					await connection.rollbackAsync();
					throw err;
				}
			}
		} catch(err) {
			console.log('Error occured while notifying / deploying rent change ', err);
			PropertyRentManagement.sendRentManagementCronLogs({
				data: data,
				stage: `ApprovalFailure`,
				method: `approveRentChanges`,
				time: (new Date).toLocaleString()
			}, err);
		} finally {
			await db.closeConnection(connection);
		}

	},

    async notificationSuccess(wf) {
		try {
			if (wf.dependencies.length) {
				let data = wf.dependencies[wf.dependencies.length - 1].data;
				console.log('notificationSuccess data', data);
				var connection = await db.getConnectionByType('write', data.cid);
				let workflow = JSON.stringify(wf.dependencies, null, 2);
				console.log("*********WorkFlow inside notificationSuccess: ", workflow);
				let rentChange = new LeaseRentChange({
					id: data.rent_change_id
				});
				await rentChange.findById(connection, data.rent_change_id)
				let
					notificationData = [],
					rentChangeStatus = 'done'
				;
				await connection.beginTransactionAsync();
					if (!data.manual_approval) {
						// If the workflow was triggered by the cronjob.
						if (data.notification_methods.length) {
							for (delivery of data.notification_methods) {
								notificationData.push([
									data.rent_change_id,
									delivery.status,
									delivery.delivery_method_id,
									data.upload_id,
									delivery.interaction_id,
									delivery.date
								]);
								if (delivery.status != 'done') {
									rentChangeStatus = 'error'
								}
							}
							savingData = {
								upload_id: data.upload_id,
								notification_status: rentChangeStatus
							}
							if (!rentChange.notificationDate) {
								// If multiple delivery methods are assigned, and notification_date for any other delivery method was already set
								savingData["notification_sent"] = moment.utc().format('YYYY-MM-DD HH:mm:ss')
							}
							let a = await rentChange.save(connection, savingData);
							await rentChange.saveNotificationDetails(
								connection,
								notificationData,
								['lease_rent_change_id', 'status', 'delivery_method_id', 'upload_id', 'interaction_id', 'date']
							);
						} else {
							// If delivery_method is not set, then we will be saving notification status as done, but will not be setting notification date
							await rentChange.save(connection, {
								upload_id: data.upload_id,
								notification_status: 'done'
							});
						}
						if (data.notification_retry && data.previous_interaction_id && rentChangeStatus === 'done') {
							// If the rent change notifying process is been retried, then we need to resolve the interaction of the previous day
							await models.Interaction.resolve(
								connection,
								data.previous_interaction_id,
								{
									content: `The tenant was notified while attempting a retry on ${moment().format('MM/DD/YYYY')}.`,
									last_modified_by: data.hbAppContactId,
									pinned: 0,
								},
								data.hbAppContactId
							);
						}
						PropertyRentManagement.sendRentManagementCronLogs({
							data: data,
							stage: `NotificationSuccess`,
							method: `notificationSuccess`,
							time: (new Date).toLocaleString()
						});
						await RentManagementRoutines.mergeDocuments(connection, data);
					} else {
						await rentChange.save(connection, {upload_id: data.upload_id});
					}
				await connection.commitAsync();
			}
		} catch (err) {
			PropertyRentManagement.sendRentManagementCronLogs({
				data: data,
				stage: `NotificationFailure`,
				method: `notificationSuccess`,
				time: (new Date).toLocaleString()
			}, err);
			if (connection) {
				await db.closeConnection(connection);
			}
			throw err;
		} finally {
			if (connection) {
				await db.closeConnection(connection);
			}
		}
	},

    async notificationFailure(data) {
		const connection = await db.getConnectionByType('write', data.cid);
		try {
			console.log("********notificationFailure:", data);
			if (data && data.rent_change_id) {
				let rentChange = new LeaseRentChange({
					id: data.rent_change_id
				});

				let
					message = data.msg,
					wf = data.workflow && data.workflow.dependencies && data.workflow.dependencies.find(
					d => d.status == 'initiated'),
					notificationData = []
				;
				if (wf) {
					message = `Step: ${wf.job_name}${data.msg ? `, Message: ${data.msg}` : ''}`;
				}
				console.log("\n---Message: ", message)

				await rentChange.save(connection, {
					upload_id: data.upload_id,
					notification_status: 'error'
				});
				if (!data.manual_approval) {
					PropertyRentManagement.sendRentManagementCronLogs({
						data: data,
						stage: `NotificationFailure`,
						method: `notificationFailure`,
						time: (new Date).toLocaleString()
					});
					for (delivery of (data.notification_methods || [])) {
						if (delivery.status == 'done') {
							notificationData.push([
								data.rent_change_id,
								delivery.status,
								delivery.delivery_method_id,
								data.upload_id,
								delivery.interaction_id,
								delivery.date,
								message
							]);
						} else {
							// If the notifing by a deliveryMethod was not success, due to some 500 error
							if (!delivery.interaction_id) {
								delivery.date = moment.utc().format('YYYY-MM-DD HH:mm:ss')
							}
							notificationData.push([
								data.rent_change_id,
								'error',
								delivery.delivery_method_id,
								data.upload_id,
								delivery.interaction_id,
								delivery.date,
								message
							]);
						}
					}
					if (notificationData?.length) {
						await rentChange.saveNotificationDetails(
							connection,
							notificationData,
							['lease_rent_change_id', 'status', 'delivery_method_id', 'upload_id', 'interaction_id', 'date', 'message']
						);
					}
				}
				await RentManagementRoutines.mergeDocuments(connection, data);
			}
		} catch (err) {
			PropertyRentManagement.sendRentManagementCronLogs({
				data: data,
				stage: `NotificationFailure`,
				method: `notificationFailure`,
				time: (new Date).toLocaleString()
			}, err);
			await db.closeConnection(connection);
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},

    async mergeTokens(connection, message, lease, company, property, is_html) {
		// document.Details.tokens
		if (!message) return '';
		try {

			let found_tokens = [];
			for (let s in Tokens) {
				if (typeof Tokens[s] === 'function') continue;
				let section = Tokens[s];
				const regex = /[A-Z]/g;
				for (let i = 0; i < section.length; i++) {
					if (message.indexOf(`[${section[i]}]`) < 0) continue;
					found_tokens.push({
						name: section[i]
					})
				}
			}

			let document = {
				Details: {
					tokens: found_tokens
				}
			}

			await lease.findFull(connection, company, [property], document)
			let merged_tokens = await PandaDocs.mergeTokens(connection, lease, document.Details)
			merged_tokens = merged_tokens || [];
			for (let i = 0; i < merged_tokens.length; i++) {
				var re = new RegExp(`\\[${merged_tokens[i].name}\\]`, 'g');
				message = message.replace(re, merged_tokens[i].value)
			}
			if (is_html) {
				message = message.replace(/\n/g, '<br />');
			}
			return message;

		} catch (err) {
			throw err;
		}

		// extract tokens, 
		// find full, 
		// str replace tokens
	},

	async mergeDocuments(connection, data) {
		try {
			console.log("INSIDE mergeDocuments", data);
			// Get the count of rent changes that are pending to be notified.
			let response = await models.LeaseRentChange.findUnnotifiedCount(
				connection,
				data.property.id,
				data.rent_change_ids
			);
			let count = (response?.length) ? parseInt(response[0].count): null;

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					pending_count: count
				},
				stage: `InsideMergeDocuments`,
				method: `mergeDocuments`,
				time: (new Date).toLocaleString()
			});
			console.log("\nfindUnnotifiedCount response", response);
			if (count === 0) {
				let property = new Property({ id: data.property.id });
				await property.find(connection);

				// Generate the combined document
				let job = await Queue.add('merge_document_routine', {
					filename: `Rent Change Documents for ${moment(data.date).format('YYYY-MM-DD')}`,
					document_batch_id: data.document_batch_id,
					cid: data.cid,
					company_id: data.company_id,
					property_id: property.id,
					socket_details: data.socket_details,
					event_name: data.event_name,
					tracking: {
						trace_id: data.tracking?.trace_id,
						event_name: data.tracking?.event_name
					},
					property: data.property,
					date: data.date
				});
				PropertyRentManagement.sendRentManagementCronLogs({
					data: data,
					stage: `MergeDocuments`,
					method: `mergeDocuments`,
					time: (new Date).toLocaleString(),
					job_id: job?.id
				});
			}
		} catch (err) {
			PropertyRentManagement.sendRentManagementCronLogs({
				data: data,
				stage: `MergeDocumentsFailure`,
				method: `mergeDocuments`,
				time: (new Date).toLocaleString()
			}, err);
		}
	},

	async sendAlertMailsForPendingApprovals(payload = {}) {
		let
			emailResponse,
			{ data, rentChangesToBeApproved, contacts } = payload;

		try {
			let message = PropertyRentManagement.generateApprovalAlertMailContent(rentChangesToBeApproved);
			if (!message) return;

			let subject = `Urgent: Approve Pending Rent Changes to Avoid Delays`;

			let emailData = {
				message,
				recepients: contacts,
				subject,
				ownerId: data.company.gds_owner_id,
				facilityId: data.property.gds_id,
				date: moment(data.date).format(`MM/DD/YYYY`),
				subdomain: data.company.subdomain
			}

			emailResponse = await this.sendRentManagementAlertMail(emailData);
			if (emailResponse?.message != `success`) throw emailResponse;

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					rentChangesToBeApproved,
					contacts,
					emailResponse
				},
				stage: `ApprovalAlertMailSuccess`,
				method: `sendAlertMailsForPendingApprovals`,
				time: (new Date).toLocaleString()
			});

			return emailResponse;

		} catch (error) {

			console.log(`Error while sending alert mail for pending approvals:`, error);
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					rentChangesToBeApproved,
					contacts,
					emailResponse
				},
				stage: `ApprovalAlertMailFailure`,
				method: `sendAlertMailsForPendingApprovals`,
				time: (new Date).toLocaleString()
			}, error);

		}
	},

	async sendAlertMailsForDeploymentFailure(payload = {}) {
		let
			emailResponse,
			{ data, deploymentFailedRentChanges, contacts } = payload;

		try {
			let message = PropertyRentManagement.generateDeploymentFailureAlertMailContent(deploymentFailedRentChanges);
			if (!message) return;

			let subject = `Urgent Action Required: Error in deployment of rent change`;

			let emailData = {
				message,
				recepients: contacts,
				subject,
				ownerId: data.company.gds_owner_id,
				facilityId: data.property.gds_id,
				date: moment(data.date).format(`MM/DD/YYYY`),
				subdomain: data.company.subdomain
			}

			emailResponse = await this.sendRentManagementAlertMail(emailData);
			if (emailResponse?.message != `success`) throw emailResponse;

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					deploymentFailedRentChanges,
					contacts,
					emailResponse
				},
				stage: `DeploymentAlertMailSuccess`,
				method: `sendAlertMailsForDeploymentFailure`,
				time: (new Date).toLocaleString()
			});

			return emailResponse;

		} catch (error) {

			console.log(`Error while sending alert mail for failed deployments:`, error);
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					deploymentFailedRentChanges,
					contacts,
					emailResponse
				},
				stage: `DeploymentAlertMailFailure`,
				method: `sendAlertMailsForDeploymentFailure`,
				time: (new Date).toLocaleString()
			}, error);

		}
	},

	async sendAlertMailsForNotificationFailure(payload = {}) {
		let
			emailResponse,
			{ data, notificationFailedRentChanges, contacts } = payload;

		try {
			let message = PropertyRentManagement.generateNotificationFailureAlertMailContent(notificationFailedRentChanges);
			if (!message) return;

			let subject = `Urgent Action Required: Error in Document/Delivery Method for Rent Change`;

			let emailData = {
				message,
				recepients: contacts,
				subject,
				ownerId: data.company.gds_owner_id,
				facilityId: data.property.gds_id,
				date: moment(data.date).format(`MM/DD/YYYY`),
				subdomain: data.company.subdomain
			}

			emailResponse = await this.sendRentManagementAlertMail(emailData);
			if (emailResponse?.message != `success`) throw emailResponse;

			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					notificationFailedRentChanges,
					contacts,
					emailResponse
				},
				stage: `NotificationAlertMailSuccess`,
				method: `sendAlertMailsForNotificationFailure`,
				time: (new Date).toLocaleString()
			});

			return emailResponse;

		} catch (error) {

			console.log(`Error while sending alert mail for failed notification:`, error);
			PropertyRentManagement.sendRentManagementCronLogs({
				data: {
					...data,
					notificationFailedRentChanges,
					contacts,
					emailResponse
				},
				stage: `NotificationAlertMailFailure`,
				method: `sendAlertMailsForNotificationFailure`,
				time: (new Date).toLocaleString()
			}, error);

		}
	},

	/**
	 * Sends an alert email to the recepients in the payload object with the content in the payload
	 * @param {*} payload Expects an object in the following format - { message: String (required), recepients: Array (required), 
	 * subject: String (required), ownerId: String (required), facilityId: String (required), embeddedLink: String, title: String,
	 * contactDetails: { email: String, phone: String }, sender: { name: String, email: String } }
	 */
	async sendRentManagementAlertMail(payload = {}) {
		let
			hbRentManagementUrl = `${ settings.getBaseUrl(payload.subdomain) }/rent-management/`,
			communicationAppUrl = `${ settings.get_communication_app_url() }/messages/`;

		let emailRequestBody = {
			messages: [
				{
					to: payload.recepients,
					subject: payload.subject
				}
			],
			owner_id: payload.ownerId,
			facility_id: payload.facilityId,
			variables: {
				template: {
					template_name: `rent_change_alert`,
					date: payload.date,
					title: payload.title || payload.subject,
					body: payload.message,
					review_url: payload.embeddedLink || hbRentManagementUrl
				}
			}
		};

		let request = {
			method: 'POST',
			uri: communicationAppUrl,
			body: emailRequestBody,
			headers: {
				'Content-Type': 'application/vnd+gds.email',
				'X-storageapi-key': process.env.GDS_API_KEY,
				'X-storageapi-date': Date.now()
			},
			gzip: true,
			json: true
		};

		let response = await rp(request);
		console.log(`Sending alert email for Rent Management`, { request: JSON.stringify(request, null, 4), response: JSON.stringify(response, null, 4) })
		return response;
	},

	async adjustInvoicesForPrepayRentRaise(connection, data) {
		let
			invoiceBulkAdjustmentResponse = {},
			{ leaseId, companyId, dateResponse } = data,
			{ startDateForAdjustingInvoices } = dateResponse;

		invoiceBulkAdjustmentResponse = await Invoice.bulkAdjustInvoices(connection, leaseId, companyId, startDateForAdjustingInvoices) || {};

		let { voidInvoices = [], newInvoices = [] } = invoiceBulkAdjustmentResponse;

		if (!voidInvoices?.length) return {
			status: `failed`,
			time: (new Date).toLocaleString(),
			...invoiceBulkAdjustmentResponse
		}

		console.log(`Adjusted invoices (starting from ${ startDateForAdjustingInvoices }) for lease ${ leaseId }:`, { voidInvoices, newInvoices });

		return {
			status: `success`,
			time: (new Date).toLocaleString(),
			...invoiceBulkAdjustmentResponse,
			paymentAppliedToNewInvoices: utils.findSumOfObjectPropertyInArray(newInvoices, `total_payments`) || 0,
		}

	},

	async isRentChangeNotificationFailed(rentChange) {

		if (!rentChange.property_id) return;

		let interaction = JSON.parse(rentChange?.interaction);

		let isResolved = rentChange?.resolved || interaction?.resolved;

		let notificationStatusError = (rentChange.generation_status !== 'generated' || !rentChange.notification_status || rentChange.notification_status === 'error' || interaction?.status === 'error' ||  !rentChange.upload_id) && !isResolved;
		
		return notificationStatusError;
	}

}

module.exports = {
    deliverDocument: async (data) => {
		return await RentManagementRoutines.deliverDocument(data);
	},

	notificationSuccess: async (data) => {
		return await RentManagementRoutines.notificationSuccess(data);
	},

	notificationFailure: async (data) => {
		return await RentManagementRoutines.notificationFailure(data);
	},

	scheduleRentChange: async(data)=> {
		return await RentManagementRoutines.scheduleRentChange(data);
	},

	approveRentChanges: async(data) => {
		return await RentManagementRoutines.approveRentChanges(data);
	},

	cancelMovedOutLeaseAndAuctionedRentChanges: async(data) => {
		return await RentManagementRoutines.cancelMovedOutLeaseAndAuctionedRentChanges(data);
	},

	deployRentChanges: async(data) => {
		return await RentManagementRoutines.deployRentChanges(data);
	},

	mergeDocuments: async(data) => {
		return await RentManagementRoutines.mergeDocuments(data);
	},

	sendAlertMails: async(data) => {
		return await RentManagementRoutines.sendAlertMails(data);
	},

	sendAlertMailsForPendingApprovals: async(data) => {
		return await RentManagementRoutines.sendAlertMailsForPendingApprovals(data);
	},

	sendAlertMailsForDeploymentFailure: async(data) => {
		return await RentManagementRoutines.sendAlertMailsForDeploymentFailure(data);
	},

	sendAlertMailsForNotificationFailure: async(data) => {
		return await RentManagementRoutines.sendAlertMailsForNotificationFailure(data);
	},

	// manualApprovalOfRentChange: async(data) => {
	// 	return await RentManagementRoutines.manualApprovalOfRentChange(data);
	// },
}