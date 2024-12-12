var moment      = require('moment');

var jade = require('jade');
var fs = require('fs');


var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models  = require(__dirname + '/../models');


var Billing   = require(__dirname + '/../models/billing.js');
var Maintenance   = require(__dirname + '/../models/maintenance.js');
var Company   = require(__dirname + '/../models/company.js');
//var Lease   = require(__dirname + '/../models/leases.js');
var Report   = require(__dirname + '/../models/reports.js');
var Promise = require('bluebird');

var Activity = require(__dirname + '/../classes/activity.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Payment   = require(__dirname + '/../classes/payment.js');


var Mail = require(__dirname + '/../modules/mail.js');
var XLSX        = require('xlsx');



var ReportObj = {

	createPaymentSummary: function(data, pool){
		var connection = {};
		var _this = this;
		var company_id = data.company_id;
		var company=  {};
		var date = data.date || moment().format('YYYY-MM-DD');
		var a;
		return pool.getConnectionAsync().then(function(conn) {
			connection = conn;

			return models.Company.findById(connection, company_id);
		}).then(function(companyRes) {
			company = companyRes;
			return models.Activity.findAll(connection, company_id, date).mapSeries(function(activity){
				var activity = new Activity(activity);
				return activity.find(connection).then(function(result){

					console.log("activity.details", details);

					try{
						var details = JSON.parse(activity.details);
					} catch(err){
						console.log(err);
					}


					switch (activity.activity_types_id){
						case 1:
							if(activity.status == 1){
								var payment = new Payment({id: details.payment_id});
								return payment.find(connection).then(function(paymentRes){
									if(paymentRes) {
										activity.Payment = payment.values();

									} else {
										activity.Payment = null;
									}
									return activity;
								})
							} else {
								activity.error = details.error;

								return activity;
							}
							break;
						default:
							console.log("activity", activity);
							return activity;
					}
				});
			})
		}).then(function(activities) {
			console.log(activities);
			return _this.assembleReport(activities);

		}).then(function(wb) {

			var filename = "auto_payments_" + moment().format('x');



			XLSX.writeFile(wb, settings.config.base_path + 'downloads/' + filename + '.xlsx', {bookSST: false});
			return filename;

		}).then(function(filename) {

			var bitmap = fs.readFileSync(settings.config.base_path + 'downloads/' + filename + '.xlsx');

			// convert binary data to base64 encoded string
			return new Buffer(bitmap).toString('base64');

		}).then(function(filestring) {

			console.log(filestring);
			connection.release();
			return _this.sendReport(filestring, date, company);
		}).catch(function(err){
			connection.release();
			console.error(err);
			console.error(err.stack);
			return false;
		})
	},

	sendReport(filestring, date, company){

		// Find email address
		var emailAddresses = ['jeff@h6design.com', company.email];

		var promises = [];

		emailAddresses.forEach(e => {
			var email = {
				email: e,
				owner_id: company.gds_owner_id,
				to: company.name + ' Administrator',
				from: company.name + ' Reports',
				subject: company.name + " Auto Generated Payments " ,
				template: {
					name: 'basic-email',
					data: [
						{
							name: 'logo',
							content: company.getLogoPath()
						},
						{
							name: 'headline',
							content:  'Auto Payment Report'
						},
						{
							name: 'content',
							content: "Please find attached your auto payment report for " +  company.name + " on " + moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY')
						}]
				},
				attachments:[{
					type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					name: company.name + "_auto_payments_" + moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY'),
					content: filestring
				}]
			};
			promises.push(Mail.sendReport(email));
		});

		return Promise.all(promises);

	},
	assembleReport:function(activities){

		var wb = {
			SheetNames: ['Actions'],
			Sheets: {}
		};

		var sheets = {
			Actions: {
				row: 1,
				ws: {
					"A1": { v: 'Address', t: 's' },
					"B1": { v: 'Unit', t: 's' },
					"C1": { v: 'Name On Card', t: 's' },
					"D1": { v: 'Action Name', t: 's' },
					"E1": { v: 'Status', t: 's' },
					"F1": { v: 'Date', t: 's' },
					"G1": { v: 'Payment Number', t: 's' },
					"H1": { v: 'Card No', t: 's' },
					"I1": { v: 'Method Type', t: 's' },
					"J1": { v: 'Amount', t: 's' },
					"K1": { v: 'Transaction Id', t: 's' },
					"L1": { v: 'Error', t: 's' }
				}
			}
		};
		var t = '';

		var autoPayments = [];

		return Promise.filter(activities, function(a){
			return (a.Payment && a.Payment.type == 'auto') || a.error;
		}).then(function(filteredPayments){
			autoPayments = filteredPayments;
			if(!autoPayments.length) throw new Error("No payments today");

			return Promise.mapSeries(autoPayments, function(activity, i){

				var sheet = sheets.Actions;
				if( activity && activity.Lease){

					sheets.Actions.ws[XLSX.utils.encode_cell({ c:0, r:i+1   })] = { v: activity.Lease.Unit.Address.address, t: 's' };
					sheets.Actions.ws[XLSX.utils.encode_cell({ c:1, r:i+1   })] = { v: activity.Lease.Unit.number, t: 's' };


					if(activity.Payment ){

						sheets.Actions.ws[XLSX.utils.encode_cell({ c:2, r:i+1   })] = { v: activity.Payment.PaymentMethod.name_on_card || '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:7, r:i+1   })] = { v: activity.Payment.PaymentMethod.card_end || '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:8, r:i+1   })] = { v: activity.Payment.PaymentMethod.type || '-', t: 's' };

						sheets.Actions.ws[XLSX.utils.encode_cell({ c:6, r:i+1   })] = { v: activity.Payment.id || '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:9, r:i+1   })] = { v: activity.Payment.amount || '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:10, r:i+1   })] = { v: activity.Payment.transaction_id || '-', t: 's' };
					} else {

						sheets.Actions.ws[XLSX.utils.encode_cell({ c:2, r:i+1   })] = { v: '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:6, r:i+1   })] = { v: '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:7, r:i+1   })] = { v: '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:8, r:i+1   })] = { v: '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:9, r:i+1   })] = { v: '-', t: 's' };
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:10, r:i+1   })] = { v: '-', t: 's' };
					}

					sheets.Actions.ws[XLSX.utils.encode_cell({ c:3, r:i+1  })] = { v: activity.ActivityType.name, t: 's' };
					sheets.Actions.ws[XLSX.utils.encode_cell({ c:4, r:i+1  })] = { v:  activity.status, t: 's' };
					sheets.Actions.ws[XLSX.utils.encode_cell({ c:5, r:i+1  })] = { v: moment(activity.created).format('MM/DD/YYYY'), t: 's' };

					if(activity.error ){
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:11, r:i+1  })] = { v: activity.error, t: 's' };
					} else {
						sheets.Actions.ws[XLSX.utils.encode_cell({ c:11, r:i+1  })] = { v: '-', t: 's' };
					}
				}
				return true;
			}).then(function(){
				for (index in wb.SheetNames) {
					wb.Sheets.Actions = sheets[wb.SheetNames[index]].ws;
					wb.Sheets.Actions['!ref'] = XLSX.utils.encode_range({
						s: {
							r: 0,
							c: 0
						},
						e: {
							r: autoPayments.length,
							c: 12
						}
					});
				}
				return wb;
			})
		})
	}

}


module.exports = {
	createPaymentSummary: function(data, pool){
		return ReportObj.createPaymentSummary(data, pool);
	}
};