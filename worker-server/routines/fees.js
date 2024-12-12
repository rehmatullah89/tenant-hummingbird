var moment      = require('moment');
var jade = require('jade');
var fs = require('fs');

var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models      = require(__dirname + '/../models');
var Lease      = require(__dirname + '/../classes/lease.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var Invoice      = require(__dirname + '/../classes/invoice.js');
var Service      = require(__dirname + '/../classes/service.js');

var validator = require('validator');

var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');

var Fees = {
	connection: {},
	company_id: 0,
	maxInvoiceNumber: 0,
	lateDay: 0,
	company: {},
	processedPropertyBills: [],
	masterInvoiceList: [],
	masterInvoiceHtml: '',
	chargesList: [],
	data: {},

	chargeLateFees: function(data, pool) {

		var connection = {};
		var company_id = data.company.id;

		var company=  {};
		var lateFee=  {};

		return pool.getConnectionAsync().then(function(conn) {
			connection = conn;
			return models.Company.findById(connection, company_id);
		}).then(function(companyRes) {
			company = companyRes;

			return models.Product.findDefaultProduct(connection, company_id, "late");

		}).then(function(lateFeeRes) {
			if(!lateFeeRes) throw "No late fee product.";
			lateFee = lateFeeRes;
			return models.Invoice.findOverdueForLateFee(connection, company_id).mapSeries(function(i){
				var invoice = {};
				invoice = new Invoice(i);
				return invoice.find(connection).then(function(){
					invoice.total();
					
					var lateFeeAmt = 0;


					if(moment().subtract(invoice.Lease.late_fee_days , 'DAY').isSame(moment(invoice.due), 'day')){

						if(invoice.Lease.late_fee_type == "dollars"){
							lateFeeAmt =  invoice.Lease.late_fee;
						} else { // latefee is percent
							lateFeeAmt = Math.round(invoice.balance * invoice.Lease.late_fee) / 1e2;
						}

					} else {
						if(invoice.Lease.late_fee_subsequent_type == "dollars"){
							lateFeeAmt =  invoice.Lease.late_fee_subsequent;
						} else { // latefee is percent
							lateFeeAmt = Math.round(invoice.balance * invoice.Lease.late_fee_subsequent) / 1e2;
						}

					}
					
					//console.log("Invoice", invoice);
					console.log("lateFeeAmt", lateFeeAmt);
					console.log("Day Diff",  moment().subtract(invoice.Lease.late_fee_days , 'DAY').format('YYYY-MM-DD') );
					console.log("Invoice Due",  moment(invoice.due).format('YYYY-MM-DD') );
					console.log("Day is first",  moment().subtract(invoice.Lease.late_fee_days , 'DAY').isSame(moment(invoice.due), 'day') );




					var service = new Service({
						lease_id: invoice.lease_id,
						product_id: lateFee.id,
						price: lateFeeAmt,
						start_date: moment().format('YYYY-MM-DD'),
						end_date: moment().format('YYYY-MM-DD'),
						name: "Late fee for invoice #" + invoice.number + " due on " + moment(invoice.due).format('MM/DD/YYYY'),
						qty: 1,
						recurring: 0,
						prorate: 0
					});
					
					return service.save(connection);
				})
			})

		}).then(function(results) {
			connection.release();
			return {
				invoices:   results
			}

		}).catch(function(err) {
			connection.release();
			console.log(err);
			console.log(err.stack);
			return {
				status: false,
				msg: err
			};
		});

	}
}



module.exports = {
	chargeLateFees: function(data, pool){
		return Fees.chargeLateFees(data, pool);
	}
};