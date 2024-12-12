const express = require("express");
const router = express.Router();
const { ISO_8601 } = require('moment');

let Hash = require('../modules/hashes');
let Hashes = Hash.init();
let control = require('../modules/site_control');
let utils = require('../modules/utils');
let DocBatchSrv = require("../classes/document_batch");
let { offsetPaginate } = require("../middlewares/pagination");
let { queryParamsToArray } = require("../middlewares/queryParamsToArray");
let { queryArrayParamsToLower } = require("../middlewares/queryArrayParamsToLower");
let e = require("../modules/error_handler.js");
const moment = require("moment");


module.exports = function (app, sockets) {
    // Doc batches per property and filter
    router.get(
        "/",
        [control.hasAccess(["admin"]), Hash.unHash, offsetPaginate, 
        queryParamsToArray(['delivery_method', 'document_type', 'status'])],
        async (req, res, next) => {
            try {

                let { property_id, delivery_method, status, 
                    start_date, end_date, document_type, template_name } = req.query;


                // TODO move validation to joi
                if(start_date && !moment(start_date, ISO_8601).isValid()){
                    throw new Error(`invalid start date string: ${start_date},  Expects ISO date string`)
                }

                if(end_date && !moment(end_date, ISO_8601).isValid()){
                    throw new Error(`invalid end date string: ${start_date},  Expects ISO date string`)
                }

                let { limit, offset } = req.pagination;

                if (!property_id) {
                    throw new Error('invalid/empty property_id');
                }

                let connection = res.locals.connection;
                let docBatches = await DocBatchSrv.getDocBatchInfo(
                    { property_id, delivery_method, start_date, end_date, status, document_type, template_name },
                    { connection, limit, offset }, res
                );

                utils.send_response(res, {
                    status: 200, data: {
                        document_batches: Hash.obscure(docBatches, req)
                    }
                })
            } catch (error) {
                console.log(error);
                next(error);
            }
        }
    );

    // batch errors per doc batch deliivery type
    // TODO should extend the error query
    router.get(
        "/errors",
        [control.hasAccess(["admin"]), Hash.unHash, offsetPaginate],
        async (req, res, next) => {
            try {
                let { document_delivery_id, document_batch_id } = req.query;
                let { limit, offset } = req.pagination;
                
                if (!document_batch_id) {
                    throw new Error('missing query argument: document_batch_id');
                }

                let connection = res.locals.connection;

                let docErrors = await DocBatchSrv.getDocErrorsPerBatch(
                    { document_delivery_id, document_batch_id },
                    { connection, limit, offset }, res
                );

                utils.send_response(res, {
                    status: 200, data: {
                        batch_errors: Hash.obscure(docErrors, req)
                    }
                })
            } catch (error) {
                console.log(error);
                next(error);
            }
        }
    );

            //TODO remove queryArrayParamsToLower mapping after refactoring Notice Manager items UI filtering
        // UI should be sending actual statuses

    router.get(
        "/items",
        [control.hasAccess(["admin"]), Hash.unHash], offsetPaginate,
        queryParamsToArray(['contact_type', 'status']), 
        queryArrayParamsToLower(['contact_type', 'status']),
        async (req, res, next) => {
            try {
                const { document_delivery_id, document_batch_id, contact_type, status, unit } = req.query;
                const { limit, offset } = req.pagination;

                if (!document_batch_id) {
                    throw new Error('missing query argument: document batch id');
                }

                let connection = res.locals.connection;
                let docBatchDetails = await DocBatchSrv.getDocBatchDetails(
                    { document_delivery_id, document_batch_id, contact_type, status, unit },
                    { connection, limit, offset }, res
                );

                if(!docBatchDetails.batch_info){
                    e.th(400, 'Invalid/Empty batch info!');
                }

                utils.send_response(res, {
                    status: 200, data: {
                        ...Hash.obscure(docBatchDetails, req)
                    }
                })
            } catch (error) {
                console.log(error);
                next(error);
            }
        }
    );
    return router;
};