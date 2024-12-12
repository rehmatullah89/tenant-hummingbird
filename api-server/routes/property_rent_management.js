const moment = require('moment');
const express = require('express');
const router = express.Router({ mergeParams: true });
const control = require(__dirname + '/../modules/site_control.js');
const Hash = require('./../modules/hashes.js');
const Hashes = Hash.init();
const utils = require(__dirname + '/../modules/utils.js');
const Joi = require('joi');
const joiValidator = require('express-joi-validation')({
	passError: true
});
const { setArrayFieldFromUrlParam } = require("../middlewares/transformParams.js");


const PropertyRentManagement = require('../classes/rent_management/property_rent_management.js');
const PropertyRentManagementDeliveryMethod = require('../classes/rent_management/property_rent_management_delivery_methods.js');
const Property = require('../classes/property.js');
const SpaceTypeRentPlanDefaults = require('../classes/space_type_rent_plan_defaults.js');
const SpaceGroupRentPlanDefaults = require('../classes/space_group_rent_plan_defaults.js');
const LeaseRentChange = require('../classes/rent_management/lease_rent_change.js');
const RentChangeLease = require('../classes/rent_change_lease.js');
const Schema = require(`./../validation/rent_management.js`);
const e = require('../modules/error_handler.js');
const PropertyRentManagementModel = require('../models/rent-management/property_rent_management')

const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );


module.exports = function (app, sockets) {

	router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const { connection, active } = res.locals;
			const { params } = req;
			const propertyRentManagementSettings = new PropertyRentManagement({ params });
			const rentManagementDeliveryMethod = new PropertyRentManagementDeliveryMethod(params)
			let response = await propertyRentManagementSettings.get(connection, { params: { ...params, company_id: active.id }});
			let delivery_methods = await rentManagementDeliveryMethod.fetchDeliveryMethodsByProperty(connection, params.property_id)
			utils.send_response(res, {
				status: 200,
				data: {
					property_rent_management_settings: Hash.obscure({...response, ... { delivery_methods } }, req)
				}
			});
		} catch (err) {
			next(err);
		}
	});

	router.put('/', [control.hasAccess(['admin']), control.hasPermission('manage_rent_management'), joiValidator.body(Schema.propertyRentManagement), Hash.unHash], async (req, res, next) => {
		const {connection, active, contact, company_id: dynamo_company_id} = res.locals
		try {
			const { params, body } = req;
			params.status_updated_by = contact.id;
			const rentManagementConf = new PropertyRentManagement({
				params: { ...params, ...{ company_id: active?.id } },
				body
			})
			const rentManagementDeliveryMethods = new PropertyRentManagementDeliveryMethod({
				property_id: params.property_id,
				delivery_methods: body.delivery_methods
			})
			body.userId = contact.id;
			const leaseRentChange = new LeaseRentChange({...params}, body);
			await connection.beginTransactionAsync();
			// await rentManagementConf.validate(connection)
			await leaseRentChange.cancelRentChangesByPropertyId(connection, body.active)
			let conf = await rentManagementConf.saveConfiguration(connection)
			let delivery_methods = await rentManagementDeliveryMethods.saveDeliveryMethods(connection)
			const { status_updated_by, ...config } = conf;
			await connection.commitAsync();
			utils.send_response(res, {
				status: 200,
				data:  Hash.obscure({ ...config, ...delivery_methods }, req),
			});
		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.put('/space-types/:space_type', [control.hasAccess(['admin']), joiValidator.body(Schema.createRentDefaultPlan.body), joiValidator.params(Schema.createRentDefaultPlan.params), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const params = req.params;
			req.body.property_id = params.property_id;
			req.body.space_type = params.space_type;
			const spaceTypeRentPlanDefaults = new SpaceTypeRentPlanDefaults(req.body);
			await spaceTypeRentPlanDefaults.save(connection, res.locals.active.id, params.property_id);
			const response = await spaceTypeRentPlanDefaults.find(connection, params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_type_settings": Hash.obscure(response, req) }
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/space-types/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const spaceTypeRentPlanDefaults = new SpaceTypeRentPlanDefaults({ property_id: req.params.property_id });
			const response = await spaceTypeRentPlanDefaults.findAll(connection, req.params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_types_settings": Hash.obscure(response, req) }
			});

		} catch (err) {
			next(err);
		}
	});

	router.get('/space-types/:space_type', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const spaceTypeRentPlanDefaults = new SpaceTypeRentPlanDefaults({ property_id: req.params.property_id, space_type: req.params.space_type });
			const response = await spaceTypeRentPlanDefaults.find(connection, req.params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_type_settings": Hash.obscure(response, req) }
			});

		} catch (err) {
			next(err);
		}
	});

	router.get('/space-groups/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const spaceGroupRentPlanDefaults = new SpaceGroupRentPlanDefaults({ property_id: req.params.property_id });
			const response = await spaceGroupRentPlanDefaults.findAll(connection, req.params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_groups_settings": Hash.obscure(response, req) }
			});

		} catch (err) {
			next(err);
		}
	});

	router.get('/space-groups/:space_group', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const spaceGroupRentPlanDefaults = new SpaceGroupRentPlanDefaults({ property_id: req.params.property_id, space_group: req.params.space_group });
			const response = await spaceGroupRentPlanDefaults.find(connection, req.params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_group_settings": Hash.obscure(response, req) }
			});

		} catch (err) {
			next(err);
		}
	});

	router.put('/space-groups/:space_group', [control.hasAccess(['admin']), joiValidator.body(Schema.createRentDefaultPlan.body), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const params = req.params;
			req.body.property_id = params.property_id;
			req.body.space_group = params.space_group;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const spaceGroupRentPlanDefaults = new SpaceGroupRentPlanDefaults(req.body);
			await spaceGroupRentPlanDefaults.save(connection, res.locals.active.id, params.property_id);
			const response = await spaceGroupRentPlanDefaults.find(connection, params.property_id);
			utils.send_response(res, {
				status: 200,
				data: { "space_group_settings": Hash.obscure(response, req) }
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/leases/:lease_id/activity', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const connection = res.locals.connection;
			const property = new Property({ id: req.params.property_id, company_id: res.locals.active.id });
			await property.validateCompanyMapping(connection);
			const rentChangeLease = new RentChangeLease({ id: req.params.lease_id });
			const data = await rentChangeLease.getRentChangeLease(connection, req.params.property_id);
			utils.send_response(res, {
				status: 200,
				data: data,
				message: "api under development"
			});

		} catch (err) {
			next(err);
		}
	});

	//tag separated from actions endpoint to meet different permission requirements;
	router.put('/rent-changes/tag', [control.hasAccess(['admin']), control.hasPermission('tag_rent_changes'), joiValidator.params(Schema.tagRentChange.params), joiValidator.body(Schema.tagRentChange.body), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;
		try {
			const { params, body } = req;
			body.userId = res.locals.contact.id;

			const leaseRentChange = new LeaseRentChange({...params}, body);

			await leaseRentChange.getConsolidatedRentChangeData(connection);

			await connection.beginTransactionAsync();
			await leaseRentChange.tagRentChanges(connection);
			await connection.commitAsync();

			let isSuccess =  leaseRentChange?.successfulOperations?.length > 0;
				
			let response = {
					success: leaseRentChange?.successfulOperations,
					failed: leaseRentChange?.failedOperations
				},
				status = isSuccess ? 200 : 400,
				msg = isSuccess ? undefined :  `Selected rent changes not valid for tag operation` ;
			;

			utils.send_response(res, {
				status,
				msg,
				data: Hash.obscure(response, req),
			});

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	});
	
	router.put(
		'/rent-changes/approve', [
			control.hasAccess(['admin']),
			control.hasPermission('approve_rent_changes'),
			joiValidator.params(Schema.approveRentChange.params),
			joiValidator.body(Schema.approveRentChange.body),
			Hash.unHash
		],
		async (req, res, next) => {
			const { connection, contact } = res.locals;
			try {
				const { params, body } = req;
				params.company_id = res.locals.active.id;

				let property_details = await PropertyRentManagementModel.findRentManagementEnabledProperties(
					connection,
					params.company_id,
					params.property_id,
					true
				);

				if (!property_details)
					e.th(400,  `Invalid Property`)

				property_details.notification_methods = JSON.stringify(property_details.notification_methods);
				let
					notifyDate = moment().add(
						property_details.notification_period,
						'days'
					).format('YYYY-MM-DD')
				;
				const leaseRentChange = new LeaseRentChange({...params, action: "approve"}, body);
				await leaseRentChange.getScheduledRentChanges(connection, notifyDate, body.rent_change_ids, body.month);
				await leaseRentChange.approveRentChanges(connection, res.locals.contact.id);
				
				let
					response = {
						success: leaseRentChange?.successfulOperations,
						failed: leaseRentChange?.failedOperations
					},
					status = (leaseRentChange?.successfulOperations?.length > 0) ? 200 : 400,
					message = (leaseRentChange?.successfulOperations?.length > 0) ? `` : `No valid Rent Changes found`
				;

				utils.send_response(res, {
					status,
					message,
					data: Hash.obscure(response, req),
				});

			} catch (err) {
				await connection.rollbackAsync();
				next(err);
			}
		}
	);

	router.put(
		'/rent-changes/:action', [
			control.hasAccess(['admin']),
			control.hasPermission('manage_rent_change_status'),
			LeaseRentChange.validateRentChangeActionsRequest,
			joiValidator.params(Schema.tenantRentChangeStatus.params),
			joiValidator.body(Schema.tenantRentChangeStatus.body),
			Hash.unHash
		], async (req, res, next) => {

		const { connection } = res.locals;		
		try {

			const { params, body } = req;
			body.userId = res.locals.contact.id;
			params.company_id = res.locals.active.id;

			const leaseRentChange = new LeaseRentChange({...params}, body);

			await leaseRentChange.getConsolidatedRentChangeData(connection);
			leaseRentChange.validateRentChanges();

			await connection.beginTransactionAsync();
			switch (params.action) {

				case `skip`:
					await leaseRentChange.skipRentChanges(connection);
					break;

				case `cancel`:
					await leaseRentChange.cancelRentChanges(connection);
					break;

				case `resolve`:
					await leaseRentChange.resolveRentChanges(connection);
					break;

			}
			await connection.commitAsync();

			let isSuccess =  leaseRentChange?.successfulOperations?.length > 0;
			let errorMessages = {
				skip: 'The selected rent changes are not eligible for the skip operation. Please review the rent changes and select valid ones that can be skipped.',
				cancel: 'The selected rent changes cannot be canceled at this time. Please review your selection and choose valid rent changes that are eligible for cancellation.'
			}
			let
				response = {
					success: leaseRentChange?.successfulOperations,
					failed: leaseRentChange?.failedOperations
				},
				status = isSuccess ? 200 : 400,
				msg = isSuccess ? undefined :  errorMessages[params.action];

			utils.send_response(res, {
				status,
				msg,
				data: Hash.obscure(response, req),
			});

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.get('/rent-changes/:rent_change_id/notes', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;
		try {

			const { params, body } = req;
			body.contactId = res.locals.contact.id;

			const leaseRentChange = new LeaseRentChange({...params}, body);

			await leaseRentChange.getNotesByRentChangeId(connection);

			utils.send_response(res, {
				status: 200,
				data: Hash.obscure({ notes: leaseRentChange.notes }, req),
				message: ``
			})

		} catch (error) {
			next(error);
		}
	});

	router.post('/rent-changes/:rent_change_id/notes', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;
		try {

			const { params, body } = req;
			body.userId = res.locals.contact.id;

			const leaseRentChange = new LeaseRentChange({...params}, body);

			await leaseRentChange.validateRentChange(connection);

			await connection.beginTransactionAsync();

			await leaseRentChange.getContactByRentChangeId(connection);
			await leaseRentChange.addRentChangeNotes(connection);

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: { },
				message: `Note saved successfully`
			})

		} catch (error) {
			await connection.rollbackAsync();
			next(error);
		}
	});

	router.put('/leases/plan', [control.hasAccess(['admin']), joiValidator.body(Schema.changeLeasesRentPlans.body), Hash.unHash], async (req, res, next) => {
		const connection = res.locals.connection

		try {
			await connection.beginTransactionAsync()
			let { params, body } = req

			let propertyRentManager = new PropertyRentManagement({
				params: { ...params, company_id: res.locals.active.id },
				body: {
					lease_to_plan_mapping: body,
					contact_id: res.locals.contact.id
				}
			})
			await propertyRentManager.validateLeases(connection)
			await propertyRentManager.validateRentPlan(connection)
			await propertyRentManager.adjustLeasesRentPlan(connection)
			await connection.commitAsync()
			utils.send_response(res, {
				status: 200,
				data: {},
				message: "successfully updated rent management plan for selected leases"
			})
		} catch (error) {
			await connection.rollbackAsync()
			next(error)
		}
	})

	// TODO: Make below endpoint to work with bulk endpoint
	router.put(`/leases/:lease_id/plan`, [control.hasAccess(['admin']), joiValidator.body(Schema.changeLeaseRentPlan.body), Hash.unHash], async (req, res, next)=> {
		const connection = res.locals.connection;
		try {
			await connection.beginTransactionAsync()
			let { params, body } = req

			let rentManagementSetting = new PropertyRentManagement({
				params: { ...params, company_id: res.locals.active.id },
				body: {
					lease_to_plan_mapping: [{
						rent_plan_id: body.rent_plan_id,
						lease_id: params.lease_id
					}],
					contact_id: res.locals.contact.id
				}
			})
			await rentManagementSetting.validateLeases(connection)
			await rentManagementSetting.validateRentPlan(connection);
			await rentManagementSetting.adjustLeasesRentPlan(connection)
			await connection.commitAsync()
			utils.send_response(res, {
				status: 200,
				data: {},
				message: `Successfully updated Rent Management Plan for selected lease`
			})

		} catch (err) {
			await connection.rollbackAsync()
			next(err)
		}
	});

	router.put(
		['/leases', '/leases/:lease_id'],
		[
			control.hasAccess(['admin']),
            control.hasPermission('exempt_rent_changes'),
			joiValidator.params(Schema.RentManagementLeaseSettings.params),
			setArrayFieldFromUrlParam({ lease_id: 'lease_ids' }),
			joiValidator.body(Schema.RentManagementLeaseSettings.bulk.body),
			Hash.unHash
		],
		async (req, res, next) => {
			const { connection } = res.locals
			const { params, body } = req
	
			const rentManagementSetting = new PropertyRentManagement({
				params: { ...params, company_id: res.locals.active.id },
				body: {
					...body,
					contact_id: res.locals.contact.id
				}
			})
	
			try {
				await connection.beginTransactionAsync()
	
				let { notes, error } = (await rentManagementSetting.bulkUpdateLeasePlanStatus(connection)) ?? {}
				notes = notes.filter((note) => (note?.content))
				await LeaseRentChange.saveNotes(connection, notes)
				await connection.commitAsync()

				/**
				 * Throw an error from the endpoint if none of the selected leases are eligible for a status change.
				 */
				const throwError = body.lease_ids?.length === error.length
	
				utils.send_response(res, {
					status: throwError ? 400 : 200,
					data: Hash.obscure({
						...(error.length && { error })
					}, req),
					message: throwError ? 'Error on updating leases' : `Updated status to ${req.body.status}`
				})
			} catch (error) {
				await connection.rollbackAsync()
				next(error)
			}
		}
	)
	

	router.post('/rent-change', [control.hasAccess(['admin', 'api']), control.hasPermission('manual_rent_changes'), joiValidator.body(Schema.rentChange), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try {
			await connection.beginTransactionAsync();
			const { params, body } = req;
			let contact = res.locals.contact;
			let statusCode = 200;
			let dryrun = body && body.length && body[0].dryrun ? true : false;
			const rentChange = new LeaseRentChange({ ...params, company_id: res.locals.active.id }, body);
			await LeaseRentChange.checkLeaseIdsValid(connection, body, req.params.property_id, connection.cid);
			const rentChangeData = await rentChange.bulkManualRentChange(connection, body, contact?.id, res.locals.company_id, dryrun);
			if(rentChangeData?.failure_lease_ids?.error?.length != 0) {
				statusCode = 400;
			}
			await connection.commitAsync();
			utils.send_response(res, {
				status: statusCode,
				data: Hash.obscure(rentChangeData?.manual_rent_change, req),
				msg: rentChangeData?.failure_lease_ids?.error?.length ? 'selected leases have errors' : '',
				actual_cause: Hash.obscure(rentChangeData?.failure_lease_ids, req)
			});
		} catch (err) {
			await connection.rollbackAsync();
			if (!err?.actual_cause?.error) err.actual_cause = {};
			next(err);
		}
	});

	router.put('/rent-change', [control.hasAccess(['admin', 'api']), control.hasPermission('manual_rent_changes'), joiValidator.body(Schema.editRentChange), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try {
			await connection.beginTransactionAsync();
			const { params, body } = req;
			let contact = res.locals.contact;
			let statusCode = 200;
			let dryrun = body && body.length && body[0].dryrun ? true : false;
			const rentChange = new LeaseRentChange({ ...params, company_id: res.locals.active.id }, body);
			await LeaseRentChange.checkLeaseIdsValid(connection, body, req.params.property_id, connection.cid, true);
			const rentChangeData = await rentChange.editRentChange(connection, body, contact?.id, res.locals.company_id, req, dryrun);
			if(rentChangeData?.failure_lease_ids?.error?.length != 0) {
				statusCode = 400;
			}
			await connection.commitAsync();
			utils.send_response(res, {
				status: statusCode,
				data: Hash.obscure(rentChangeData?.manual_rent_change, req),
				msg: rentChangeData?.failure_lease_ids?.error?.length ? 'selected leases have errors' : '',
				actual_cause: Hash.obscure(rentChangeData?.failure_lease_ids, req)
			});
		} catch (err) {
			await connection.rollbackAsync();
			if (!err?.actual_cause?.error) err.actual_cause = {};
			next(err);
		}
	});

	router.post('/rent-change/upload', [control.hasAccess(['admin', 'api']), control.hasPermission('manual_rent_changes'), Hash.unHash], async (req, res, next) => {
		
		try {
			let { connection, active, contact, company_id: dynamo_company_id } = res.locals;
			let { document_id, template, deployment_month } = req.body
			const leaseRentChange = new LeaseRentChange({ params: req.params });
			await leaseRentChange.uploadRentChange(connection, document_id, { 
				active,
				contact,
				template,
				dynamo_company_id,
				deployment_month,
				property_id: req.params.property_id
			})
			utils.send_response(res, {
				status: 200,
				message: `Initiated to upload rent changes`
			});
		} catch (err) {
			next(err);
		}
	});

	router.put(`/custom-variance`,
		[ control.hasAccess(['admin']),joiValidator.params(Schema.customVariance.params), joiValidator.body(Schema.customVariance.body), Hash.unHash],
		async (req, res, next)=> {
			const { connection } = res.locals;
			try {
				const { params, body } = req;

				const propertyRentManagement = new PropertyRentManagement({ params: { ...params, company_id: res.locals.active.id } , body });

				await propertyRentManagement.validatePropertyCustomVariance(connection);
				await propertyRentManagement.saveCustomVarianceSettings(connection);

				utils.send_response(res, {
					status: 200,
					message: `Successfully updated custom variance settings`
				});

			} catch (error) {
				next(error);
			}

		});

	router.get(`/custom-variance`, [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;

		try {
			const { params } = req;
			const propertyRentManagement = new PropertyRentManagement({ params });

			const customVarianceSettings = await propertyRentManagement.getCustomVarianceSettings(connection);

			utils.send_response(res, {
				status: 200,
				data: { custom_variance: {
					active: !!customVarianceSettings?.enable_custom_variance,
					date: customVarianceSettings?.custom_variance_date || null
				} }
			});

		} catch (error) {
			next(error);
		}

	});

	router.get(`/rent-change/deployment-months`, [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;
		try {
			const { params } = req;
			const leaseRentChange = new LeaseRentChange(params);

			const rentChangeDeploymentMonths = await leaseRentChange.getRentChangeDeploymentMonth(connection)

			utils.send_response(res, {
				status: 200,
				data: {
					rent_change_deployment_months: rentChangeDeploymentMonths
				}
			})
		} catch (error) {
			next(error);
		}
	});

	router.get(`/rent-change/meta-info`, [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		const { connection } = res.locals;
		try {
			const { params, query } = req;
			const leaseRentChange = new LeaseRentChange(params);
			const history = await leaseRentChange.getRentChangeExportImportHistory(connection, query?.month)

			utils.send_response(res, {
				status: 200,
				data: history
			})
		} catch (error) {
			next(error);
		}
	});

	return router;
};
