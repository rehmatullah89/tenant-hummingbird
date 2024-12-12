
var moment      = require('moment');

var fs = require('fs');
var Promise = require('bluebird');
const { isNull } = require('util');


var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var Payments   = require(__dirname + '/../models/payments.js');
var Invoices   = require(__dirname + '/../models/invoices.js');

var Lease =  require(__dirname + '/../classes/lease.js');
var TenantPayment =  require(__dirname + '/../classes/tenant_payment_statement.js');
var Invoice =  require(__dirname + '/../classes/invoice.js'); 
var PaymentMethod =  require(__dirname + '/../classes/payment_method.js');
var Contact      = require(__dirname + '/../classes/contact.js');
var Company      = require(__dirname + '/../classes/company.js');

var Property      = require(__dirname + '/../classes/property.js');


var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var QuickBooksRoutines      = require(__dirname + '/../routines/quickbooks.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var Mail = require(__dirname + '/../modules/mail.js');
var Utils = null;
process.nextTick(() => Utils = require("../modules/utils")); 
var pool 		= require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');


var TenantPaymentObj = {


	async autoTenantPaymentRoutine(data) {

		//let property_id = data.property.id;
		let logs = [];
		let connection = await db.getConnectionByType('write', data.cid);  // change it to write

		let company = new Company({ id: data.property.company_id });
		await company.find(connection);	
		tenantPayment = new TenantPayment(data);

		try {
				await tenantPayment.ProcessMontlyTenantPaymentCharges(connection, data);
			} catch (err) {				
				console.dir(data);
				console.log("Failed to get ACH or CC Fee ", err?.stack || err?.msg || err);
			}
			finally {
				await db.closeConnection(connection);
			}
	}

};




module.exports = TenantPaymentObj;
var TenantPaymentRoutines = require(__dirname + '/../routines/tenant_payment_routines.js');
var Todo      = require(__dirname + '/../classes/todo.js');
var TaskEvent 	  = require(__dirname + '/../events/tasks.js');
var Enums = require(__dirname +'/../modules/enums.js');
var models = require(__dirname + '/../models/index.js')

