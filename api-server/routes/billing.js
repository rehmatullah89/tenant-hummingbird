var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var response = {};
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Promise = require('bluebird');

var validator = require('validator');

var models = require(__dirname + '/../models');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Service = require(__dirname + '/../classes/service.js');
var Property = require(__dirname + '/../classes/property.js');
var Product = require(__dirname + '/../classes/product.js');

var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');

var Schema = require(__dirname + '/../validation/billing.js');
const joiValidator = require('express-joi-validation')({
	passError: true
});

var Scheduler = require(__dirname + '/../modules/scheduler.js');
var eventEmitter = require(__dirname + '/../events/index.js');


module.exports = function(app) {


	router.post('/get-aging-detail', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {



		try{
		  var connection = res.locals.connection;

			let contact = res.locals.contact;
			let company = res.locals.active;

			let body = req.body;


			var searchParams = {};
			var conditions = {};

			if(body.search.start_date) conditions.start_date = body.search.start_date;
			if(body.search.end_date) conditions.end_date = body.search.end_date;

			searchParams.limit = body.limit || 20;
			searchParams.offset = body.offset || 0;
			searchParams.sort =  body.sort.field;
			searchParams.sortdir =  body.sort.dir || 'ASC'

			let invoices =  await Invoice.searchAging(connection, conditions, null, company.id, false);
			let count = await Invoice.searchAging(connection, conditions, null, company.id, true);

			utils.send_response(res, {
				status: 200,
				data: {
					invoices: Hash.obscure(invoices, req),
					result_count: count
				}
			});


		} catch(err) {
			next(err);
		}



	});

	router.get('/monthly', [control.hasAccess(['admin']), Hash.unHash],   async(req, res, next) => {



	    try{
	      var connection = res.locals.connection;
		    let company = res.locals.active;
		    let query = req.query;
		    let params = req.params;

		    let contact = new Contact({id: res.locals.contact.id});
        await contact.find(connection);
        await contact.getRole(connection, company.id);
        await contact.setRole(connection);

			  let properties = [];
		    let propertyList = await Property.findByCompanyId(connection, company.id, contact.Properties.map(p => p.id), res.locals.properties);
		    let month = req.query.month || moment();
		    //let year = req.query.year || moment();

		    for(let i = 0; i < propertyList.length; i++ ){
			    var property = new Property({id: propertyList[i].id});
			    await property.find(connection);
			    await property.getAddress(connection);
			    await property.getUnits(connection);
			    await property.findMonthlyBills(connection, month);
			    properties.push(property);
		    }

		    utils.send_response(res, {
			    status: 200,
			    data: {
				    splitTypes: Hash.obscure(models.Billing.splitTypes, req),
				    properties: Hash.obscure(properties, req)
			    }
		    });


	    } catch(err) {
		    next(err);
	    }




    });

	router.delete('/:utility_bill_id',  [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {


		try{

		  var connection = res.locals.connection;
			let contact = res.locals.contact;
			let company = res.locals.active;
			let query = req.query;
			let params = req.params;


			let propertyBill = await models.Billing.findPropertyBillById(connection, params.utility_bill_id);

			if(!propertyBill) e.th(404);
			if(propertyBill.billed_for) e.th(409, "This has already been invoiced. Please remove charges from the users account");


			let property = new Property({id: propertyBill.property_id});

			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			await connection.beginTransactionAsync();
			await models.Service.deletePropertyBill(connection, params.utility_bill_id);
			await models.Billing.deletePropertyBill(connection, params.utility_bill_id);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: {

				}
			});

			eventEmitter.emit('property_bill_deleted', {company, contact, propertyBill, cid: res.locals.company_id, locals: res.locals});


		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}




	});

	router.get('/reversals', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const company = res.locals.active;

			await connection.beginTransactionAsync();
			
			const reversal = new Reversal();
			const reversalSettings = await reversal.getCompanySettings(connection, company);
			await reversal.findDeliveryAndTransformReversalSettings(connection, { ReversalSettings: reversalSettings });
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: { 
					reversals: Hash.obscure(reversalSettings, req)
				}
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err)
		}
	});

	router.post('/reversals', [control.hasAccess(['admin']), control.hasPermission('manage_settings_bill'), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const { body } = req;
			const company = res.locals.active;
			const { id: admin_contact_id } = res.locals.contact;
			await connection.beginTransactionAsync();
			
			const reversal = new Reversal();
			const updatedReversalIds = await reversal.bulkSaveSettings(connection, {
				company,
				contact_id: admin_contact_id,
				data: body,
			});

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: { 
					reversal_ids: Hash.obscure(updatedReversalIds, req)
				}
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err)
		}
	});

	router.put('/reversals', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try {
			const { body } = req;
			const company = res.locals.active;

			await connection.beginTransactionAsync();
			
			const reversal = new Reversal();
			await reversal.bulkSaveSettings(connection, { data: body, company: company });

			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: { 
					
				}
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err)
		}
	});

    /**  To Print All Routes
    var routes = router.stack;
    var Table = require('cli-table');

    var table = new Table({ head: ["", "Name", "Path"] });

    for (var key in routes) {
        if (routes.hasOwnProperty(key)) {
            var val = routes[key];
            if (val.route) {
                val = val.route;
                var _o = {};
                _o[val.stack[0].method] = [val.path, val.path];
                table.push(_o);
            }

        }
    }
    console.log("\r\n" + table.toString());
    /**  **/



    return router;


};

var Reversal = require(__dirname + '/../classes/reversal.js');