const express = require("express");
const router = express.Router();
let control = require('../modules/site_control');
let Hash = require('../modules/hashes');
let Hashes = Hash.init();
let utils = require('../modules/utils');
let MailingDocSrv = require("../classes/mailing_doc");
let paginate = require("../middlewares/pagination");

module.exports = (app, sockets) => {
    router.get(
        "/",
        [control.hasAccess(["admin"]), Hash.unHash],
        async (req, res, next) => {
            try {

                let { batch_id, property_id, status, delivery_method, limit, offset } = req.query;
                let connection = res.locals.connection;

                if (!connection) {
                    throw new Error('mailing_doc:controller: db connection not found!');
                }

                let mailingDocs = await MailingDocSrv.getMailingDocs(
                    { batch_id, property_id, status, delivery_method, limit, offset },
                    { connection }
                );

                utils.send_response(res, {
                    status: 200, data: {
                        mailingDocs: Hash.obscure(mailingDocs, req)
                    }
                })
            } catch (error) {
                next(error);
            }
        }
    );

    router.get(
        "/:mailing_doc_id",
        [control.hasAccess(["admin"]), Hash.unHash],
        async (req, res, next) => {
            try {
                let { mailing_doc_id: id } = req.params;
                let { delivery_method } = req.query;

                let connection = res.locals.connection;

                if (!connection) {
                    throw new Error('mailing_doc:controller: db connection not found!');
                }

                let docBatch = await MailingDocSrv.getMailingDocById(
                    { id, delivery_method },
                    { connection }
                );

                utils.send_response(res, {
                    status: 200, data: {
                        docBatches: Hash.obscure(docBatch, req)
                    }
                })
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
};