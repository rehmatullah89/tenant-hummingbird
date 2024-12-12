var express = require('express');
var router = express.Router();
var moment      = require('moment');
var Promise      = require('bluebird');
var rp = require('request-promise');
var utils    = require(__dirname + '/../modules/utils.js');
var Mailhouse = require(__dirname + '/../classes/mailhouse.js');
var control  = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var ENUMS = require(__dirname + '/../modules/enums.js');
var Hashes = Hash.init();
var util = require('util');
module.exports = function(app, sockets) {

    router.get('/list',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;

        try {
            let company = res.locals.active;
            let mailhouse = new Mailhouse()
            let mailhouses = await mailhouse.findAllMailhouses(connection);
            utils.send_response(res, {
                status: 200,
                data: {
                  mailhouses: Hash.obscure(mailhouses, req)
                }
              });


        } catch (error) {
            next(error)
        }
    });

    return router;
}