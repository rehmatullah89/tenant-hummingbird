var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var response = {};
var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');
var utils    = require(__dirname + '/../modules/utils.js');
var models = require(__dirname + '/../models');

module.exports = function(app) {
    /*
    router.get('/', control.isAdmin, function(req, res, next) {
        var breadcrumbs = [];
        breadcrumbs.push({
            name: "Vendors"
        });
        res.render('vendors/index', {
            nav: 'vendors',
            breadcrumbs:breadcrumbs
        });
    });
    */

    // router.get('/', control.hasAccess('admin'),  function(req, res, next) {
    //     var company = res.locals.active;
    //     var connection = {};
    //     var search = req.query.search.trim() || '';;
    //     var response = [];
    //
    //
    //     pool.getConnectionAsync().then(function(conn){
    //         connection = conn;
    //         return models.Vendor.searchByCompanyId(connection, search, company.id);
    //     }).then(function(vendorsRes) {
    //         utils.send_response(res, {
    //             status: true,
    //             data: Hash.obscure(vendorsRes)
    //         });
    //     })
    //     .then(() => utils.saveTiming(connection, req, res.locals))
    //     .catch(next)
    //     .finally(() => utils.closeConnection(pool, connection))
    //
    // });








    return router;

};
