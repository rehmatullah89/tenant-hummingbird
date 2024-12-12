var express     = require('express');
var router      = express.Router();
var models      = require(__dirname + '/../models');
var validator   = require('validator');
var Hash        = require(__dirname + '/../modules/hashes.js');
var Hashes      = Hash.init();
var utils       = require(__dirname + '/../modules/utils.js');
var control     = require(__dirname + '/../modules/site_control.js');
var Enums       = require(__dirname + '/../modules/enums.js');
var moment      = require('moment');
const rent_change_leases = require('../models/rent_change_leases');
const PropertyRentManagementModel = require('../models/rent-management/property_rent_management');

const CompanyRateManagement = require(__dirname + "/../classes/rate_management/company_rate_management.js")
const RatePlanManagement = require("../classes/rate_management/rate_plan_management.js")

var Company    = require(__dirname + '/../classes/company.js');
var Todo = require(__dirname + '/../classes/todo.js')
var Property    = require(__dirname + '/../classes/property.js');
var RateChangeConfiguration = require(__dirname + '/../classes/rate_change_configuration.js');
var RateChange  = require(__dirname + '/../classes/rate_change.js');
var RentChangeLease = require(__dirname + '/../classes/rent_change_lease.js');
const LeaseRentChange = require('../classes/rent_management/lease_rent_change.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Property = require(__dirname + '/../classes/property.js');
var Service = require(__dirname + '/../classes/service.js');
let DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
var Schema      = require(__dirname + '/../validation/rate_management.js');
var e           = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var stream = require('stream');
const joiValidator = require('express-joi-validation')({
	passError: true
});

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

module.exports = function(app) {
    /**
     * @description get rate management configuration of the company
     * If no configuration exists then default configuration will be sent to client
     */
    router.get("/", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const rateManagement = new CompanyRateManagement()
        try {
            let response = await rateManagement.get(connection, { params: { ...req.params, company_id: active.id } })

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(response, req)
            })
        } catch (error) {
            next(error)
        }
    })

    /**
     * @description this will create/update company rate management configuration.
     */
    router.put(
        "/",
        [control.hasAccess(["admin"]), joiValidator.body(Schema.companyConfiguration), Hash.unHash],
        async (req, res, next) => {
            const { connection, active } = res.locals
            const { body } = req
            try {
                const rateManagement = new CompanyRateManagement({ ...req.params, company_id: active.id }, body)
                await rateManagement.validate(connection)
                await rateManagement.save(connection).catch(async (error) => {
                    if (error.code === 409) return await rateManagement.update(connection)
                    else throw error
                })
                utils.send_response(res, {
                    status: 200,
                    data: {
                        status: "success",
                    },
                })
            } catch (error) {
                next(error)
            }
        }
    )

    /**
     * @description This endpoint will return all rate-plans for that company
     */
     router.get("/plans", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const ratePlanManager = new RatePlanManagement()
        try {
            let response = await ratePlanManager.getRatePlans(connection, {
                company_id: active.id,
            })

            utils.send_response(res, {
                status: 200,
                data: Hash.makeHashes(response, req.company_id, ["created_by"]),
            })
        } catch (error) {
            next(error)
        }
    })

    /**
     * @description This endpoint will create a new rate plan for a company
     */
    router.post(
        "/plans",
        [control.hasAccess(["admin"]), control.hasPermission('manage_rate_plan'), joiValidator.body(Schema.createRatePlan), Hash.unHash],
        async (req, res, next) => {
            const { connection, active, contact } = res.locals
            const { body } = req
            let response = {}
            try {
                const ratePlanManager = new RatePlanManagement(
                    {
                        ...req.params,
                        company_id: active.id,
                        contact_id: contact?.id ?? null,
                    },
                    body
                )

                await ratePlanManager.validate(connection)
                response = await ratePlanManager.save(connection)

                utils.send_response(res, {
                    status: 200,
                    data: Hash.makeHashes(response, req.company_id, ["created_by"]),
                })
            } catch (error) {
                next(error)
            }
        }
    )

    /**
     * @description This endpoint will update the corresponding rate plan
     */
    router.put(
        "/plans/:rate_plan_id",
        [control.hasAccess(["admin"]), control.hasPermission('manage_rate_plan'), joiValidator.body(Schema.createRatePlan), Hash.unHash],
        async (req, res, next) => {
            const { connection, contact, active } = res.locals
            const { body } = req
            let response = {}
            try {
                const ratePlanManager = new RatePlanManagement(
                    {
                        ...req.params,
                        company_id: active.id,
                        contact_id: contact?.id ?? null,
                    },
                    body
                )

                await ratePlanManager.validate(connection)
                response = await ratePlanManager.update(connection)

                utils.send_response(res, {
                    status: 200,
                    data: Hash.makeHashes(response, req.company_id, ["created_by"]),
                })
            } catch (error) {
                next(error)
            }
        }
    )

    /**
     * @description This endpoint will return data of a particular rate plan
     */
    router.get("/plans/:rate_plan_id", [control.hasAccess(["admin"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const { rate_plan_id } = req.params
        const ratePlanManager = new RatePlanManagement()
        const company_id = active.id

        try {
            await ratePlanManager.validate(connection, {
                params: { ...req.params, company_id }
            })

            let response = await ratePlanManager
                .getRatePlans(connection, {
                    id: rate_plan_id,
                    company_id
                })
                .then((res) => (res?.length ? res[0] : null))

            utils.send_response(res, {
                status: 200,
                data: Hash.makeHashes(response, req.company_id, ["created_by"]),
            })
        } catch (error) {
            next(error)
        }
    })

    /**
     * @description This endpoint will delete the corresponding rate plan
     */
    router.delete("/plans/:rate_plan_id", [control.hasAccess(["admin"]), control.hasPermission('manage_rate_plan'), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals
        const { rate_plan_id } = req.params
        const ratePlanManager = new RatePlanManagement()

        try {
            await ratePlanManager.validate(connection, {
                params: {  ...req.params, company_id: active.id }
            })

            await ratePlanManager.deleteRatePlan(connection, {
                id: rate_plan_id,
            })

            utils.send_response(res, {
                status: 200,
                data: "success",
            })
        } catch (error) {
            next(error)
        }
    })


    // Rate Change Configurations Routes

    router.post('/rate-change-configurations', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try {
            let company = new Company(res.locals.active);
            let user = res.locals.contact || {};
            let body = req.body;

            let property = new Property({id: body.property_id});
            await property.find(connection);
            await property.verifyAccess({company_id: company.id});

            await connection.beginTransactionAsync();

            let  rate_change_configuration = new RateChangeConfiguration(body);
            await rate_change_configuration.save(connection, user);

            // if(body.type === 'manual'){

            //     let rate_change = new RateChange(body);
            //     rate_change.rate_change_configuration_id = rate_change_configuration.id;

            //     if(body.notify_now){
            //         rate_change.reviewed = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            //     }
            //     await rate_change.save(connection);

            //     if (!body.leases || body.leases.length == 0) e.th(400, "Lease Ids required");

            //     for (var v in body.leases){

            //         let rent_change_leases = {
            //             rate_change_id :    rate_change.id,
            //             lease_id:           body.leases[v].id,
            //             change_amt:         body.change_amt
            //         };

            //         rent_change_leases_records.push(rent_change_leases);
            //         //await rent_change_leases.save(connection);
            //     }

            //     let rent_change_leases = new RentChangeLease();
            //     await rent_change_leases.bulkSave(connection, rent_change_leases_records);

            //     if(body.notify_now){
            //         await Queue.add('send_bulk_notifications', {
            //             rate_change_id: rate_change.id,
            //             contact_id: user.id
            //         });
            //     }
            // }

            await connection.commitAsync();


            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configuration_id: Hashes.encode(rate_change_configuration.id, res.locals.company_id)
                }
            });

            //eventEmitter.emit('rate_change_created', {company, user, locals: res.locals});


        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.get('/rate-change-configurations', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{
            var query = req.query;
            var company = res.locals.active;
            var properties = res.locals.properties;

            let conditions = {
                type: query.type,
                property_id: query.property_id
            }

            let rateChangeConfigurations = await RateChangeConfiguration.findAll(connection, conditions, company.id, properties);

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configurations: Hash.obscure(rateChangeConfigurations, req)
                }
            });



        } catch(err) {
            next(err);
        }


    });

    router.get('/rate-change-configurations/:rate_change_configuration_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{
            let params = req.params;

            let rate_change_configuration = new RateChangeConfiguration({id : params.rate_change_configuration_id});
            await rate_change_configuration.findById(connection);
            rate_change_configuration.transformRounding(true);
            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configuration: Hash.obscure(rate_change_configuration, req),
                }
            });



        } catch(err) {
            next(err);
        }


    });

    router.put('/rate-change-configurations/:rate_change_configuration_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;

        try {
            var body = req.body;
            var params = req.params;
            let user = res.locals.contact || {};

            let property = new Property({id: body.property_id});
            await property.find(connection);

            await connection.beginTransactionAsync();

            let  rate_change_configuration = new RateChangeConfiguration({id : params.rate_change_configuration_id});
            await rate_change_configuration.findById(connection);
            await rate_change_configuration.update(connection, body, user);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configuration_id: Hashes.encode(rate_change_configuration.id, res.locals.company_id)
                }
            });
        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.delete('/rate-change-configurations/:rate_change_configuration_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;

        try {
            var params = req.params;

            await connection.beginTransactionAsync();

            let rate_change_configuration = new RateChangeConfiguration({id: params.rate_change_configuration_id});
            await rate_change_configuration.findById(connection);
            await rate_change_configuration.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
            await rate_change_configuration.deleteRounding(connection)
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configuration_id: Hashes.encode(rate_change_configuration.id, res.locals.company_id)
                }
            });
        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.post('/rate-change-configurations/:rate_change_configuration_id/duplicate', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try {
            let rate_change_duplicated_id;
            let params = req.params;

            await connection.beginTransactionAsync();

            let  rate_change_configuration = new RateChangeConfiguration({id : params.rate_change_configuration_id});
            await rate_change_configuration.findById(connection);
            await rate_change_configuration.saveDuplicate(connection);

            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_configuration_id: Hashes.encode(rate_change_configuration.id, res.locals.company_id)
                }
            });



        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });


    // Rent Change route for integration

    router.post('/rate-changes', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.rentChange), Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;
        try {
            await connection.beginTransactionAsync();
            let body = req.body;
            let company = new Company(res.locals.active);
            let property = new Property({id: body.property_id});

            await property.find(connection);
            await property.verifyAccess({company_id: company.id});

            if (!body.leases || body.leases?.length == 0) e.th(400, "Lease Ids required", {});
            let leaseIds = body.leases.map(lease => lease.id);

            let
                targetDate = body.target_date,
                currentDate = moment().utc().format('YYYY-MM-DD'),
                contact = res.locals.contact,
                statusCode = 200
            ;
            utils.validateDateFormat(targetDate);
            targetDate = moment(targetDate);
            if (targetDate.isBefore(currentDate)) {
                e.th(400, 'Target date should be greater than or equal to current date', {})
            }
            targetDate = targetDate.format('YYYY-MM-DD HH:mm:ss');

            let
                changeValue = body.change_amt,
                rentChangeRecords = [],
                propertyRentManagementSettings = await PropertyRentManagementModel.findRentManagementEnabledProperties(
                    connection, company.id, body.property_id, true
                )
            ;
            if (body.change_type == 'dollar') {
                body.change_type = 'dollar_amount'
            } else if (body.change_type == 'percent') {
                body.change_type = 'rent_percent'
            }
            let data = {
                property_id: body.property_id,
                type: body.type,
                change_value: changeValue,
                change_type: body.change_type,
                change_direction: body.change_direction,
                target_date: body.target_date,
                affect_timeline: true,
                approval_type: propertyRentManagementSettings.approval_type
            };
            for (let lease of body.leases) {
                rentChangeRecords.push({
                    ...data,
                    lease_id: lease.id
                });
            }
            const rentChange = new LeaseRentChange({
                property_id: body.property_id,
                company_id: company.id
            }, data);

            const [invalidLeaseIds, exemptedLeaseIds] = await Promise.all([
                LeaseRentChange.getInvalidLeaseIds(connection, body.property_id, leaseIds),
                LeaseRentChange.getExemptedLeaseIds(connection, body.property_id, leaseIds),
            ]);

            if (invalidLeaseIds.length)
                e.th(400, `Invalid Leases: ${invalidLeaseIds.map(leaseId => `'${Hashes.encode(leaseId, req.company_id)}'`)}`,{})
            if (exemptedLeaseIds.length)
                e.th(400, `Rent cannot be changed for the exempted leases: ${exemptedLeaseIds.map(leaseId => `'${Hashes.encode(leaseId, req.company_id)}'`)}`,{})

            const rentChangeData = await rentChange.rentChangesForIntegration(
                connection,
                rentChangeRecords,
                contact?.id,
                company.id,
                propertyRentManagementSettings.approval_type
            );
            if(rentChangeData?.failure_lease_ids?.error?.length != 0) {
				statusCode = 400;
			}
            await connection.commitAsync();
            utils.send_response(res, {
				status: statusCode,
				data: Hash.obscure(rentChangeData?.manual_rent_change, req),
                msg: rentChangeData?.failure_lease_ids?.error.length ? 'selected leases have errors' : '',
				actual_cause: Hash.obscure(rentChangeData?.failure_lease_ids, req)
			});
        } catch(err) {
            await connection.rollbackAsync();
            if (!err?.actual_cause?.error) err.actual_cause = {};
            next(err);
        }
    });

    router.get('/rate-changes', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            var company = res.locals.active;
            var query = req.query;
            var properties = res.locals.properties;

            let params = {
                type: query.type || 'future',
                limit: query.limit || 20,
                offset: query.offset || 0
            };
            
            if (query.from_date && utils.validateDateFormat(query.from_date)) params.from_date = query.from_date;
            if (query.to_date && utils.validateDateFormat(query.to_date)) {
                if (!query.from_date) e.th(400, 'from date is missing');
                params.to_date = query.to_date;
            }

            let rate_changes = [];
            let result = await RateChange.findAll(connection, company.id, params, properties);

            console.log("result", result);
            // TODO Need to optimize this loop

            let properties_obj = {};


            for(let i = 0; i < result.length; i++){
                let rate_change = new RateChange(result[i]);
                if(!properties_obj[rate_change.property_id]){
                  let property = new Property({id: rate_change.property_id});
                  await property.getUnitCount(connection);
                  await property.getLeaseCount(connection);
                  property.store_occupancy = (property.lease_count / property.unit_count) * 1e2;
                  properties_obj[property.id] = property;
                }
                rate_change.Property = properties_obj[rate_change.property_id];
                await rate_change.findById(connection);
                await rate_change.findRentChangeLeases(connection);
                await rate_change.getStats(connection);
                // TODO - still neccessary since we arent saving src in the DB. Make sure we save the src to the DB, and then we can remove this call
                //await rate_change.getUpload(connection);

                rate_changes.push(rate_change);
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_changes: Hash.obscure(rate_changes, req)
                }
            });



        } catch(err) {
            next(err);
        }



    });

    router.get('/rate-changes/:rate_change_id/report',[Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;

      try {
        let params = req.params;
        let rate_change = new RateChange({id : params.rate_change_id});
        await rate_change.findById(connection);
        await rate_change.findRentChangeLeases(connection);
        await rate_change.getStats(connection);
        let report_buffer = await rate_change.generateReport(connection);
        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=RentRaise.xlsx`,
          'Content-Type':  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })

        const download = report_buffer;
        res.end(download);



      } catch(err) {
        next(err);
      }



    });

    router.get('/rate-changes/:rate_change_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{
            let params = req.params;

            let rate_change = new RateChange({id : params.rate_change_id});
            await rate_change.findById(connection);
            rate_change.transformRounding(true);
            await rate_change.findRentChangeLeases(connection);
            await rate_change.getStats(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change: Hash.obscure(rate_change, req)
                }
            });



        } catch(err) {
            next(err);
        }



    });

    router.put('/rate-changes/:rate_change_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;

        try {
            var params = req.params;
            var body = req.body;
            let rent_change_leases_records = [];
            let user = res.locals.contact || {}

            await connection.beginTransactionAsync();

            let rate_change = new RateChange({id: params.rate_change_id});
            await rate_change.findById(connection);
            let isRecalculateRent = rate_change.isRecalculateRent(body);
            await rate_change.update(connection, body, user);
            rate_change.transformRounding(true);
            if (body.leases && body.leases.length > 0){
                let rent_change_leases = new RentChangeLease({rate_change_id : params.rate_change_id});
                let rent_change_leases_db_records = await rent_change_leases.findByRateChangeId(connection);
                let exempted_leases = await rent_change_leases.extractExemptedLeases(body.leases, rent_change_leases_db_records, true);
                let selected_leases = await rent_change_leases.extractSelectedLeases(body.leases, rent_change_leases_db_records);
                let existing_leases = rent_change_leases_db_records.filter(rcl => !exempted_leases.find(el => el.lease_id === rcl.lease_id));
                if(exempted_leases.length > 0){
                    exempted_leases.map((lease)=> lease.deleted_at = moment().format('YYYY-MM-DD HH:mm:ss'));
                    let rate_change_leases = new RentChangeLease();
                    await rate_change_leases.bulkUpdate(connection, exempted_leases);
                    await rent_change_leases.updateExemptedLeaseRecord(exempted_leases);
                }
                for (var v in selected_leases){
                    let db_lease = await rent_change_leases.extractExemptedLeases([selected_leases[v]], rent_change_leases_db_records);
                    if(db_lease.length > 0 ){
                        continue;
                    }
                    let rent_change_leases_new = {
                        rate_change_id :    rate_change.id,
                        lease_id:           selected_leases[v].id,
                        change_amt:         body.change_amt
                    };

                    rent_change_leases_records.push(rent_change_leases_new);
                }

                if(rent_change_leases_records.length > 0){
                    await rent_change_leases.bulkSave(connection, body, rent_change_leases_records);
                }

                if(isRecalculateRent) await rent_change_leases.bulkUpdateRent(connection, existing_leases, body);
            }

            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_id: Hashes.encode(rate_change.id, res.locals.company_id)
                }
            });
        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.delete('/rate-changes/:rate_change_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) =>{

		var connection = res.locals.connection;
        let logged_in_user = res.locals.contact || {};
        try {
            var params = req.params;

            await connection.beginTransactionAsync();

            let rate_change = new RateChange({id: params.rate_change_id});
            await rate_change.findById(connection);
            await rate_change.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
            await rate_change.deleteRounding(connection);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_id: Hashes.encode(rate_change.id, res.locals.company_id)
                }
            });
        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }
        await Todo.dismissTasks(connection, params.rate_change_id, Enums.EVENT_TYPES_COLLECTION.RATE_CHANGE, Enums.TASK_TYPE.RATE_CHANGE, logged_in_user.id);

    });

    router.put('/rate-changes/:rate_change_id/reviewed', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try {
            let user = res.locals.contact || {};
            let company = res.locals.active;

            let contact = res.locals.contact;
            var body = req.body;
            var params = req.params;

            await connection.beginTransactionAsync();

            let rate_change = new RateChange({id : params.rate_change_id});
            await rate_change.findById(connection);

            rate_change.reviewed = !body.reviewed ? moment().format('YYYY-MM-DD HH:mm:ss') : body.reviewed;
            await rate_change.update(connection, rate_change);

            if (body.leases && body.leases.length > 0){

                let rent_change_leases = new RentChangeLease({rate_change_id : params.rate_change_id});
                let rent_change_leases_db_records = await rent_change_leases.findByRateChangeId(connection);
                let exempted_leases = await rent_change_leases.extractExemptedLeases(body.leases, rent_change_leases_db_records, true);

                if(exempted_leases.length > 0){
                    exempted_leases.map((lease)=> lease.deleted_at = !body.reviewed ? moment().format('YYYY-MM-DD HH:mm:ss') : body.reviewed);
                    let rate_change_leases = new RentChangeLease();
                    await rate_change_leases.bulkUpdate(connection, exempted_leases);
                    await rent_change_leases.updateExemptedLeaseRecord(exempted_leases);
                }
            }

            await Todo.dismissTasks(connection, rate_change.id, Enums.EVENT_TYPES_COLLECTION.RATE_CHANGE, Enums.TASK_TYPE.RATE_CHANGE, user.id);

            await connection.commitAsync();

            let document_id = utils.slugify(rate_change.name) + "_" +  moment().format('x');

            if(!body.skipped){
                await Queue.add('send_bulk_notifications', {
                  priority: 10,
                  cid: res.locals.company_id,
                  rate_change_id: rate_change.id,
                  contact_id: contact.id,
                  socket_details: {
                      contact_id: contact.id,
                      company_id: res.locals.company_id,
                      document_id
                  }
                }, { priority: 10 } );
            }
            utils.send_response(res, {
                status: 200,
                data: {
                    document_id,
                    rate_change_id: Hashes.encode(rate_change.id, res.locals.company_id)
                }
            });
            if(body.skipped){
                await Todo.dismissTasks(connection, rate_change.id, Enums.EVENT_TYPES_COLLECTION.RATE_CHANGE, Enums.TASK_TYPE.RATE_CHANGE, user.id);
                eventEmitter.emit('rate_change_reviewed', {company, user, 'rate_change_id': rate_change.id, cid: res.locals.company_id, locals: res.locals});
            }

        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.put('/rate-changes/:rate_change_id/completed', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try {
            let contact = res.locals.contact;
			let company = new Company(res.locals.active);
            var body = req.body;
            var params = req.params;

            await connection.beginTransactionAsync();

            let rate_change = new RateChange({id : params.rate_change_id});
            await rate_change.findById(connection);

            if(rate_change.completed){
                e.th('Rate change has been already applied.')
            }

            rate_change.completed = !body.completed ? moment().format('YYYY-MM-DD HH:mm:ss') : body.completed;
            await rate_change.update(connection, rate_change);

            if (body.leases && body.leases.length > 0){
                let rent_change_leases = new RentChangeLease({rate_change_id : params.rate_change_id});
                let rent_change_leases_db_records = await rent_change_leases.findByRateChangeId(connection);

                let exempted_leases = await rent_change_leases.extractExemptedLeases(body.leases, rent_change_leases_db_records, true);

                if(exempted_leases.length > 0){
                    exempted_leases.map((lease)=> lease.deleted_at = !body.reviewed ? moment().format('YYYY-MM-DD HH:mm:ss') : body.reviewed);
                    let rate_change_leases = new RentChangeLease();
                    await rate_change_leases.bulkUpdate(connection, exempted_leases);
                    await rent_change_leases.updateExemptedLeaseRecord(exempted_leases);
                }
            }

            await connection.commitAsync();

            await Queue.add('apply_rate_change', {
                priority: 10,
                cid: res.locals.company_id,
                rate_change_id: rate_change.id,
                contact_id: contact.id
            }, { priority: 10 });

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_id: Hashes.encode(rate_change.id, res.locals.company_id)
                }
            });
            await Todo.dismissTasks(connection, rate_change.id, Enums.EVENT_TYPES_COLLECTION.RATE_CHANGE, Enums.TASK_TYPE.RATE_CHANGE, contact.id);

        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

    });

    router.put('/rate-changes/:rate_change_id/skipped', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        let contact = res.locals.contact || {}; 

        try {
            var body = req.body;
            var params = req.params;

            await connection.beginTransactionAsync();

            let rate_change = new RateChange({id : params.rate_change_id});
            await rate_change.findById(connection);

            rate_change.skipped = !body.skipped ? moment().format('YYYY-MM-DD HH:mm:ss') : body.skipped;
            await rate_change.update(connection, rate_change);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    rate_change_id: Hashes.encode(rate_change.id, res.locals.company_id)
                }
            });
        } catch(err){
            await connection.rollbackAsync();
            next(err);
        }

        await Todo.dismissTasks(connection, params.rate_change_id, Enums.EVENT_TYPES_COLLECTION.RATE_CHANGE, Enums.TASK_TYPE.RATE_CHANGE, contact.id);

    });


    return router;
};
