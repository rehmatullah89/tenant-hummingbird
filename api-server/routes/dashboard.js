var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};
var models = require(__dirname + '/../models');
var Promise = require('bluebird');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Lead = require(__dirname + '/../classes/lead.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var Contact  = require(__dirname + '/../classes/contact.js');
var ManagementSummary = require(__dirname + '/../classes/reports/managementSummary.js');
var Report = require(__dirname + '/../classes/report');

var Dashboard  = require(__dirname + '/../classes/dashboard.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
const crypto = require('crypto');
module.exports = function(app) {

	router.get('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let contact = res.locals.contact;

			let dashboards = await Dashboard.getUserDashboards(connection, company.id, contact.id);

			utils.send_response(res, {
				status: 200,
				data: {
					dashboards: Hash.obscure(dashboards, req)
				}
			});



		} catch(err) {
			next(err);
		}




	});

  router.get('/types', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try {
      let company = res.locals.active;
      let contact = res.locals.contact;

      let types = await Dashboard.getDashboardTypes(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          types: Hash.obscure(types, req)
        }
      });



    } catch(err) {
      next(err);
    }




  });


  router.get('/zoom-signature', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try {
      let apiKey = settings.zoom.api_key;
      let apiSecret = settings.zoom.api_secret;
      let role = settings.zoom.role;
      let meetingNumber = settings.zoom.meeting_number;
      let meetingPassword = settings.zoom.meeting_password;

      // Prevent time sync issue between client signature generation and zoom
      const timestamp = new Date().getTime() - 30000
      const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString('base64')
      const hash = crypto.createHmac('sha256', apiSecret).update(msg).digest('base64')
      const signature = Buffer.from(`${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');

      utils.send_response(res, {
        status: 200,
        data: {
          apiKey,
          apiSecret,
          meetingNumber,
          meetingPassword,
          role,
          signature,
        }
      });



    } catch(err) {
      next(err);
    }


  });

	router.post('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;

		try {

			let company = res.locals.active;
			let body = req.body;

			let contact = new Contact({id: res.locals.contact.id});

			await contact.find(connection);


      for(let i = 0; i < body.dashboards.length; i++){

        let dashboard = new Dashboard();

        if(body.dashboards[i].id){

          dashboard.id = body.dashboards[i].id;

          await dashboard.find(connection);

          dashboard.verifyAccess(contact.id, company.id);

          body.dashboards[i].name = body.dashboards[i].dashboard;
          body.dashboards[i].sort = i;
          body.dashboards[i].i = i;

          dashboard.update(body.dashboards[i], contact.id, company.id);

        } else {

          let existing = await Dashboard.findExistingByUser(connection, contact.id, company.id,  body.dashboards[i].dashboard_type_id);

          if(existing.length) e.th(409, "You can only have 1 widget of a type on a dashboard");

          await dashboard.makeOfType(connection, body.dashboards[i].dashboard_type_id, contact.id, company.id);

        }

        await dashboard.save(connection);

      }


			// let unsaved_db = body.dashboards.find(e => !e.id);
			// let dbs_to_update = body.dashboards;
			// if(unsaved_db){
			// 	let existing_saved_db = body.dashboards.find(e => e.dashboard === unsaved_db.dashboard && e.id);
			// 	 if(existing_saved_db){
			// 	 	dbs_to_update = body.dashboards.filter(e => e.id);
			// 	}
			// }
      //
      //
      //
      //
			// for(let i = 0; i < dbs_to_update.length; i++){
      //
			// 	dbs_to_update[i].company_id = company.id;
			// 	dbs_to_update[i].contact_id = contact.id;
			// 	dbs_to_update[i].sort = i;
			// 	await models.Dashboard.save(connection, dbs_to_update[i], dbs_to_update[i].id);
      //
			// }

			utils.send_response(res, {
				status: 200,
				data: {}
			});


			eventEmitter.emit('user_updated_dashboards', { contact, company, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}



	});

	router.delete('/:dashboard_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let contact = res.locals.contact;
			let params = req.params;

			let dashboard = await models.Dashboard.findById(connection, params.dashboard_id);

			if(dashboard.company_id != company.id || dashboard.contact_id != contact.id){
				e.th(403, "You do not have permission to edit this resource")
			}
			await models.Dashboard.delete(connection, params.dashboard_id);

			utils.send_response(res, {
				status: 200,
				data: {}
			});


			eventEmitter.emit('user_deleted_dashboard', { contact, company, cid: res.locals.company_id, locals: res.locals});

		} catch(err) {
			next(err);
		}



	});

	// router.get('/action-items', control.hasAccess(['admin']), function(req, res, next) {
	//
	// 	var connection = {};
	// 	var company = res.locals.active;
	// 	var company_id = company.id;
	//
	// 	var invoices_mailed = [];
	// 	var unpaid_invoices = [];
	// 	var billing_errors = [];
	// 	var account_errors = [];
	// 	pool.getConnectionAsync().then(function(conn){
	// 		// Find Lease
	// 		connection = conn;
	//
	// 		// Get Invoices to be mailed
	// 		var date = moment().add(1, 'day').format('YYYY-MM-DD');
	// 		return models.Invoice.findInvoicesToBeMailed(connection, company.id, date);
	//
	// 	}).then(function(invoicesMailedRes) {
	// 		invoices_mailed = invoicesMailedRes;
	//
	// 		// Get unpaid invoices this month
	//
	// 		return models.Invoice.findMonthlyUnpaid(connection, company.id, moment());
	//
	// 	}).then(function(monthlyUnpaidRes) {
	// 		unpaid_invoices = monthlyUnpaidRes;
	// 		/*
	// 		// get billing errors
	// 		return models.Activity.findCompanyBillingErrors(connection, company_id);
	// 	}).then(function(billingErrorsRes) {
	// 		billing_errors = billingErrorsRes;
	// 		*/
	//
	// 		// get account errors
	// 		utils.send_response(res, {
	// 			status: 200,
	// 			data: {
	// 				invoices_mailed:    Hash.obscure(invoices_mailed),
	// 				unpaid_invoices:    Hash.obscure(unpaid_invoices),
	// 				billing_errors:     Hash.obscure(billing_errors),
	// 				account_errors:     Hash.obscure(account_errors)
	// 			}
	// 		});
	//
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
	//});

	router.get('/maintenance-requests', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let query = req.query;
			let restricted = req.query;
			let maintenance = await models.Maintenance.findSummaryActive(connection, company.id, res.locals.properties);

      let items =  maintenance.map(m => {
          return{
            label: m.severity,
            value: m.count
          }
        })

			utils.send_response(res, {
				status: 200,
				data: {
          kpi: Math.round(items.reduce((a,b) => a+b.value, 0)),
          title : 'All Requests',
          items: items,
          colors: ['#4AC3AB', '#FFD600', '#CD2400']
				}
			});



		} catch(err) {
			next(err);
		}



	});

	// TODO move to leads get / and add conditional params to only get unread
	router.get('/leads', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let query = req.query;
			let leads = await models.Lead.findLeads(connection, company.id, true, query.property_id);

			for(let i = 0; i < leads.length; i++){
				leads[i] =  new Lead({ id: leads[i].id })
				await leads[i].find(connection, company.id);

			}

			utils.send_response(res, {
				status: 200,
				data: {
					leads:   Hash.obscure(leads, req)
				}
			});



		} catch(err) {
			next(err);
		}



	});

	router.get('/aging', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let query = req.query;

			// 0 - 30 days
			let conditions = {
				property_id: query.property_id,
				start_date: moment().subtract(30, 'days').format('YYYY-MM-DD'),
				end_date: moment().subtract(1, 'days').format('YYYY-MM-DD')
			}
			let thirty = await models.Invoice.getAging(connection, conditions, null,  company.id);

			// 31 - 90 days
			conditions = {
				property_id: query.property_id,
				start_date: moment().subtract(90, 'days').format('YYYY-MM-DD'),
				end_date: moment().subtract(31, 'days').format('YYYY-MM-DD')
			}
			let ninety = await models.Invoice.getAging(connection, conditions, null,  company.id);


			// 90+ days
			conditions = {
				property_id: query.property_id,
				start_date: null,
				end_date: moment().subtract(91, 'days').format('YYYY-MM-DD')
			}
			let overNinety = await models.Invoice.getAging(connection, conditions, null,  company.id);

			utils.send_response(res, {
				status: 200,
				data: {
					thirty: Hash.obscure(thirty, req),
					ninety: Hash.obscure(ninety, req),
					overNinety: Hash.obscure(overNinety, req)
				}
			});



		} catch(err) {
			next(err);
		}




	});

	router.get('/vacancy-breakdown', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let query = req.query;
			let properties = res.locals.properties;
			let vacancies = await models.Lease.findVacancyBreakdown(connection, company.id, properties)
      let items = [
        {
          label: "Vacant",
          value: vacancies[0]
        },
        {
          label: "Less than 6 months",
          value: vacancies[1]
        },
        {
          label: "Over than 6 months",
          value: vacancies[2]
        }
      ]

      utils.send_response(res, {
        status: 200,
        data: {
          kpi: Math.round(items.reduce((a,b) => a+b.value, 0)),
          title : 'Vacancy Breakdown',
          items: items,
          colors: ['#CD2400', '#FFD600', '#4AC3AB']
        }
      });



		} catch(err) {
			next(err);
		}



	});

  router.get('/deliquency-breakdown', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;
      try{

        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;
        let properties = res.locals.properties;
        let date = moment().format('YYYY-MM-DD');

        let report = new ManagementSummary(connection, company, date, properties);
        await report.getDelinquentTenantsLedger();

        let data = [
          {
            label: '<= 10',
            value: report.deliquencies.deliquent_10.units
          },
          {
            label: '11 - 30',
            value: report.deliquencies.deliquent_30.units
          },
          {
            label: '31 - 60',
            value: report.deliquencies.deliquent_60.units
          },
          {
            label: '61 - 90',
            value: report.deliquencies.deliquent_90.units
          },
          {
            label: '91 - 120',
            value: report.deliquencies.deliquent_120.units
          },
          {
            label: '121 - 180',
            value: report.deliquencies.deliquent_180.units
          },
          {
            label: '180 - 360',
            value: report.deliquencies.deliquent_360.units
          },
          {
            label: 'More than 360',
            value: report.deliquencies.deliquent_gt_360.units
          }
        ];



        utils.send_response(res, {
          status: 200,
          data: {
            kpi: report.deliquencies.total.units,
            title : 'Total Delinquent',
            items: data
          }
        })

      } catch(err){
        next(err)
      }



  });

	router.get('/vacancy-by-category', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			let properties = res.locals.properties;
			let query = req.query;
			let vacancies = await models.Lease.findVacancyByCategory(connection, company.id, properties);
			let vacancy_detail = await models.Unit.findVacanciesWithCategory(connection, company.id, properties);


			let detail_categories = {};
      for(let i = 0; i < vacancy_detail.length; i++){
        if(!vacancy_detail[i].category_id) continue;
        detail_categories[vacancy_detail[i].category_id] = detail_categories[vacancy_detail[i].category_id] || {};
        detail_categories[vacancy_detail[i].category_id].category_id = vacancy_detail[i].category_id
        detail_categories[vacancy_detail[i].category_id].category_name = vacancy_detail[i].category_name
        detail_categories[vacancy_detail[i].category_id].units = detail_categories[vacancy_detail[i].category_id].units || [];
        detail_categories[vacancy_detail[i].category_id].units.push({
          id: vacancy_detail[i].id,
          text: vacancy_detail[i].number
        })
      }

      let summary_headers = [
        {
          value: 'category',
          text: 'Category',
          sortable: true,
          align: 'start'
        },
        {
          value: 'vacancies',
          text: 'Vacant',
          sortable: true,
          align: 'start'
        },
        {
          value: 'percent',
          text: '%',
          sortable: true,
          align: 'start'
        }
      ];

      let summary_items = vacancies.filter(v => v.category_id).map(v => {
        return {
          category_id: v.category_id,
          category: v.category,
          vacant: v.count,
          percent: Math.round(v.count / v.total * 1e2) / 1e2,
        }
      });

      let detail_headers = [
        {
          value: 'category',
          text: 'Category',
          sortable: true,
          align: 'start'
        },
        {
          value: 'units',
          text: 'Units',
          sortable: false,
          align: 'start'
        },
      ];
      let detail_items = [];
      for (const cat in detail_categories) {
        detail_items.push({
          category: detail_categories[cat].category_name,
          units: detail_categories[cat].units,
        })
      }


      let tabs = [
        {
          label: 'Summary View',
          headers: summary_headers,
          items: summary_items,
        },
        {
          label: 'Detail View',
          headers: detail_headers,
          items: detail_items,
        }
      ];

			utils.send_response(res, {
				status: 200,
				data: {
          title : 'Vacancy By Category',
          tabs: Hash.obscure(tabs, req),
				}
			});



		} catch(err) {
			next(err);
		}




	});

  router.get('/occupancy-breakdown-sqft', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try {

      let company = res.locals.active;
      let contact = res.locals.contact;
      let query = req.query;
      let properties = res.locals.properties;
      let date = moment().format('YYYY-MM-DD');

      let report = new ManagementSummary(connection, company, date, properties);
      await report.getUnits();
      await report.getOccupancyBreakdown();

      let data = [
        {
          label: 'Occupied',
          value: report.occupancy_breakdown.occupied.sqft
        },
        {
          label: 'Vacant',
          value: report.occupancy_breakdown.vacant.sqft
        },
        {
          label: 'Reserved',
          value: report.occupancy_breakdown.reserved.sqft
        },
        {
          label: 'Complimentary',
          value: report.occupancy_breakdown.complimentary.sqft
        },
        // {
        //   label: 'Unrentable',
        //   value: report.occupancy_breakdown.unrentable.sqft
        // }
      ];

      utils.send_response(res, {
        status: 200,
        data: {
          kpi: report.occupancy_breakdown.total.sqft,
          title : 'Unit Status By Sqft',
          items: data
        }
      })

    } catch(err){
      next(err)
    }



  });

  router.get('/occupancy-breakdown', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try {

      let company = res.locals.active;
      let contact = res.locals.contact;
      let query = req.query;
      let properties = res.locals.properties;
      let date = moment().format('YYYY-MM-DD');

      let report = new ManagementSummary(connection, company, date, properties);
      await report.getUnits();
      await report.getOccupancyBreakdown();

      let data = [
        {
          label: 'Occupied',
          value: report.occupancy_breakdown.occupied.unit_count
        },
        {
          label: 'Vacant',
          value: report.occupancy_breakdown.vacant.unit_count
        },
        {
          label: 'Reserved',
          value: report.occupancy_breakdown.reserved.unit_count
        },
        {
          label: 'Complimentary',
          value: report.occupancy_breakdown.complimentary.unit_count
        },
        // {
        //   label: 'Unrentable',
        //   value: report.occupancy_breakdown.unrentable.unit_count
        // }
      ];

      utils.send_response(res, {
        status: 200,
        data: {
          kpi: report.occupancy_breakdown.total.unit_count,
          title : 'Unit Status',
          items: data
        }
      })

    } catch(err){
      next(err)
    }

  });


  router.get('/lead-breakdown', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try {
      let company = res.locals.active;
      let properties = res.locals.properties;
      let date = moment().format('YYYY-MM-DD');

      let report = new ManagementSummary(connection, company, date, properties);
      await report.getLeads();

      let data = [
        {
          label: 'Phone Leads',
          value: report.leads.phone_leads.ytd
        },
        {
          label: 'Web Leads',
          value: report.leads.web_leads.ytd
        },
        {
          label: 'Walk-In Leads',
          value: report.leads.walk_in_leads.ytd
        },
        {
          label: 'Others',
          value: report.leads.other_leads.ytd
        }
      ];

      utils.send_response(res, {
        status: 200,
        data: {
          kpi: report.leads.total.ytd,
          title : 'Total Leads',
          items: data
        }
      })

    } catch(err) {
      next(err)
    }
  });

	router.get('/revenue-by-month', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
		try {
      let company = res.locals.active;
			let query = req.query;
      let properties = res.locals.properties;
      let end_date = moment().format('YYYY-MM-DD');
      let start_date = moment().add(1, "month").subtract(1, "year").format('YYYY-MM-DD');
			let payments = await Report.findMonthlyRevenue(connection, properties, start_date, end_date);
			let months = [];

			for(let i = 0; i < 12; i++){
				let month = moment(end_date).subtract(i, 'month');
				var payment = payments.filter(p => p.month == month.format('M'));
        
        months.push({
          label: `${month.format('M')}/${month.format('Y')}`,
          value: (payment && payment.length) ? payment[0].total : 0
        })
			}

      let data = Hash.obscure(months, req);

      console.log("Revenue By Month: ", data);

			utils.send_response(res, {
				status: 200,
				data: {
				  kpi: '$' + Math.round(data.reduce((a,b) => a + b.value, 0)),
          title : 'Total Revenue',
          items: data
				}
			});



		} catch(err) {
			next(err);
		}



		//
		// var connection = {};
		// var company = res.locals.active;
		// var body = req.body;
		//
		// pool.getConnectionAsync().then(function(conn){
		// 	// Find Lease
		// 	connection = conn;
		// 	return models.Payment.findRevenueByMonth(connection, company.id, body.property_id);
		//
		// }).then(payments => {
		// 	var months = [];
		// 	var mom = moment().add(1, "month").subtract(1, "year");
		// 	var refmonth = {};
		// 	for(var i = 0; i < 12; i++){
		// 		refmonth = mom.clone().add(i, 'month');
		// 		var payment = payments.filter(function(p){
		// 				return p.month == refmonth.format('M');
		// 			});
		// 		months[i] = {
		// 			month: refmonth.format('M'),
		// 			year: refmonth.format('Y'),
		// 			amount: (payment.length)? payment[0].total: 0
		// 		};
		//
		// 	}
		//
		// 	utils.send_response(res, {
		// 		status: 200,
		// 		data: {
		// 			revenue: Hash.obscure(months)
		// 		}
		// 	});
		//
		// })
		// 	.then(() => utils.saveTiming(connection, req, res.locals))
		// 	.catch(next)
		// 	.finally(() => utils.closeConnection(pool, connection))

	});

	// router.get('/get-avgs-by-category', control.hasAccess(['admin']), function(req, res, next) {
	// 	var connection = {};
	// 	var company = res.locals.active;
	// 	var company_id = company.id;
	// 	var property_id = null;
	// 	pool.getConnectionAsync().then(function(conn){
	// 		// Find Lease
	// 		connection = conn;
	//
	//
	// 		property_id = req.body.property_id ? Hashes.decode(req.body.property_id)[0]: null;
	//
	// 		return models.Lease.findAvgsByCategory(connection, company_id, property_id);
	//
	// 	}).then(function(payments) {
	//
	// 	})
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	//
	//
	//
	// });

	return router;


};
