"use strict";

var express = require('express');
var router = express.Router();
var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var control    = require(__dirname + '/../modules/site_control.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Service = require(__dirname + '/../classes/service.js');
var Lease = require(__dirname + '/../classes/lease.js');
var InvoiceLine = require(__dirname + '/../classes/invoice_lines.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var utils    = require(__dirname + '/../modules/utils.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');

module.exports = function(app) {


  /* Todo - Is this deprecated? */
	router.get('/',  control.hasAccess(['admin']), function(req, res, next) {
		var connection;

		var lease = {};
		var billdate = '';
		var company_id = res.locals.active.id;
		var company = res.locals.active;
		var services = [];
		var invoice = {};
		var lease_id = Hashes.decode(req.query.lease_id)[0];
		var offset = req.query.offset;


		pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			if (!req.query.lease_id) throw "Lease id missing";
			lease = new Lease({id: lease_id});
			return lease.find(connection);
		}).then(function(){
			return lease.getNextBillingDate(moment().add(offset, 'months'));
		}).then(function getCurrentCharges(nextBillDate){
			billdate = nextBillDate;
			var period_start = billdate.clone().startOf('day');
			var period_end = billdate.clone().add(1, 'month').subtract(1, 'day').startOf('day');

			return lease.getCurrentServices(connection, company_id, period_start, period_end);
		}).then(function(servicesList) {

			services = servicesList;
			return lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
		}).then((datetime) => {
			invoice = new Invoice({
				lease_id: lease.id,
				user_id: null,
				date: moment(datetime).format('YYYY-MM-DD'),
				due: billdate.format('YYYY-MM-DD'),
				company_id: company_id,
				type: "auto",
				status: 1
			});
			invoice.Lease = lease;
			invoice.Company = company;
			return invoice.makeFromServices(
				connection,
				services,
				lease,
				billdate.clone().startOf('day'),
				billdate.clone().startOf('day').add(1, 'month').subtract(1, 'day'),
				billdate.clone().startOf('day'),
				null,
				company.id
			);
		}).then(function(){
			// Get Open payments, and set to apply.
			return invoice.calculatePayments();
		}).then(function(){
			return invoice.getOpenPayments(connection);
		})
		.then(function(){

			utils.send_response(res, {
				status: 200,
				data: {
					invoice: Hash.obscure(invoice)
				}
			})
		})
			.then(() => utils.saveTiming(connection, req, res.locals))
			.catch(next)
			.finally(() => utils.closeConnection(pool, connection))
	});

  // /* Todo - This should be moved to Leases route handler - Services always exist in context of a lease */
	router.delete('/:service_id',  [control.hasAccess(['admin']), control.hasPermission('waive_fees'), Hash.unHash], async (req, res, next) => {

    try {

      var params = req.params;
      var company = res.locals.active;
      var contact = res.locals.contact;
      var connection = res.locals.connection;

      let service = new Service({id: params.service_id});
      await service.find(connection);
      await service.verifyAccess(connection, company.id, res.locals.properties)
      await service.getLastBilled(connection);

      // service can be deleted if it hasn't been billed - set status to 0
      // recurring service that has been billed, can not be ended prior to the last bill date.
      // One time service that has been billed can not be deleted

      if (service.last_billed) {
        e.th(409, "This service has been billed, you cannot delete it.");
      }

      await models.Service.delete(connection, service.id);

      var activity = new Activity();
      await activity.create(connection, company.id, contact.id, 4, 48, service.id);

      utils.send_response(res, {
        status: 200,
        data: {}
      })

    } catch(err){
      next(err)
    }

	});

	return router;

};
