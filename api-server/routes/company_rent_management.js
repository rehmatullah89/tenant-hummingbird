const express = require('express');
const router = express.Router();
const control = require(__dirname + '/../modules/site_control.js');
const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
const utils = require(__dirname + '/../modules/utils.js');
const Joi = require('joi');
const CompanyRentManagementSettings = require('../classes/rent_management/company_rent_management_settings.js');
const RentManagementPlans = require('../classes/rent_management_plans.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});

const Schema = require(__dirname + '/../validation/rent_management.js');


module.exports = function (app, sockets) {

    router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
        try {
            const { connection, active } = res.locals;
            const { params } = req;
            const companyRentManagementSettings = new CompanyRentManagementSettings({ params: { ...params, company_id: active.id }});
            const response = await companyRentManagementSettings.get(connection);
            utils.send_response(res, {
                status: 200,
                data: {
                    company_rent_management_settings: Hash.obscure(response, req)
                }
            });

        } catch (err) {
            next(err);
        }
    });

    router.put('/', [control.hasAccess(['admin']), joiValidator.body(Schema.companyRentManagement), Hash.unHash], async (req, res, next) => {
        try {
		    const { connection, active } = res.locals
            req.body.company_id = res.locals.active.id;
			const { params, body } = req;
            const companyRentManagementConf = new CompanyRentManagementSettings({
                params: { ...params, ...{ company_id: active.id }},
                body
            });
			await companyRentManagementConf.validate(connection)
            const conf = await companyRentManagementConf.saveConfiguration(connection);
            utils.send_response(res, {
                status: 200,
                data: {
                    company_rent_management_settings: Hash.obscure(conf, req)
                }
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/plans', [control.hasAccess(['admin']), control.hasPermission('view_rent_plans'), Hash.unHash], async (req, res, next) => {
        try {
            const connection = res.locals.connection;
            req.body.company_id = res.locals.active.id;
            const rentManagementPlans = new RentManagementPlans(req.body);
            let response = await rentManagementPlans.getRentPlans(connection);
            response = Hash.makeHashes(response, req.company_id, ["created_by"])
            utils.send_response(res, {
                status: 200,
                data: { "rent_management_plans": response },
            });

        } catch (err) {
            next(err);
        }
    });

    router.get('/plans/:rent_plan_id', [control.hasAccess(['admin']), control.hasPermission('view_rent_plans'), Hash.unHash], async (req, res, next) => {
        try {
            const connection = res.locals.connection;
            req.body.company_id = res.locals.active.id;
            req.body.id = req.params.rent_plan_id;
            const rentManagementPlans = new RentManagementPlans(req.body);
            let response = await rentManagementPlans.getRentPlans(connection);
            response = Hash.makeHashes(response, req.company_id, ["created_by"])
            utils.send_response(res, {
                status: 200,
                data: { "rent_management_plan": response ? response[0] : null },
            });

        } catch (err) {
            next(err);
        }
    });


    router.post('/plans', [control.hasAccess(['admin']), joiValidator.body(Schema.createRentManagementPlan), Hash.unHash], async (req, res, next) => {
        try {
            const connection = res.locals.connection;
            req.body.company_id = res.locals.active.id;
            req.body.contact_id = res.locals.contact?.id ?? null;
            const rentManagementPlans = new RentManagementPlans(req.body);

            await rentManagementPlans.validateSettings();
            let response = await rentManagementPlans.save(connection);

            utils.send_response(res, {
                status: 200,
                data: { "rent_management_plan": response },
            });
        } catch (err) {
            next(err);
        }
    });

    router.put('/plans/:rent_plan_id', [control.hasAccess(['admin']), control.hasPermission('manage_rent_plans'), joiValidator.body(Schema.createRentManagementPlan), Hash.unHash], async (req, res, next) => {
        try {
            const connection = res.locals.connection;
            req.body.company_id = res.locals.active.id;
            req.body.id = req.params.rent_plan_id;
            req.body.contact_id = res.locals.contact?.id ?? null;
            const rentManagementPlans = new RentManagementPlans(req.body);

            await rentManagementPlans.validateSettings();
            let response = await rentManagementPlans.save(connection, true);
            utils.send_response(res, {
                status: 200,
                data: { "rent_management_plan": response },
            });
        } catch (err) {
            next(err);
        }
    });

    router.delete('/plans/:rent_plan_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
        try {
            const connection = res.locals.connection;
            req.body.company_id = res.locals.active.id;
            req.body.id = req.params.rent_plan_id;
            const rentManagementPlans = new RentManagementPlans(req.body);
            await rentManagementPlans.validateRentPlan(connection);
            await rentManagementPlans.delete(connection);
            utils.send_response(res, {
                status: 200,
            });
        } catch (err) {
            next(err);
        }
    });

    return router;


};




