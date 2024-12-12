var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Validate = require(__dirname + '/../modules/validation.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var models = require(__dirname + '/../models');
var Lease = require(__dirname + '/../classes/lease.js');
var Property = require(__dirname + '/../classes/property.js');
var Company = require(__dirname + '/../classes/company.js');
var Occupancy = require(__dirname + '/../classes/reports/occupancy.js');
var ManagementSummary = require(__dirname + '/../classes/reports/managementSummary.js');
var DailyDeposits = require(__dirname + '/../classes/reports/dailyDeposits.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Report = require(__dirname + '/../classes/report.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Payment = require(__dirname + '/../classes/payment.js');
var SpaceGroup = require(__dirname + '/../classes/space_groups.js');
var Enums = require(__dirname + '/../modules/enums.js');
var db = require(__dirname + '/../modules/db_handler.js');

const msrModels = require(__dirname + '/../models/msr');

var fs = require('fs');
var e  = require(__dirname + '/../modules/error_handler.js');
var StaticReport = require(__dirname + '/../classes/static_report.js');
var rp = require('request-promise');
const { type } = require('os');
const PDF = require('../classes/reports/report_formats/pdf');
const { report } = require('process');
const ScheduleReport = require("../classes/schedule_report/report");
const AddonReportCollection = require("../classes/collection");
const msr = require('../models/msr');

module.exports = function(app) {

  //Added by BCT Team for Schedule report
  router.get("/schedule-report", [control.hasAccess('admin'), Hash.unHash], async (req, res, next)=> {    
    try {
      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      var connection = res.locals.connection;                          
      let scheduleReport = new ScheduleReport({company_id: res.locals.active.id});
      let data = await scheduleReport.getScheduleReports(connection);

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(data, req)
      });
    } catch (err) {
      next(err);
    }
  });

  // /* TODO - Is this used? */
  //   router.get('/', [control.hasAccess('admin'), Hash.unHash], function(req, res, next) {
  //       var connection = {};

  //       var reportTypes= [
  //           {
  //               name: 'Invoice Summary',
  //               id: '1'
  //           },
  //           {
  //               name: 'Invoice Detail',
  //               id: '3'
  //           },
  //           {
  //               name: 'Maintenance Summary',
  //               id: '2'
  //           },
  //           {
  //               name: 'Charges Summary',
  //               id: '4'
  //           },
  //           {
  //               name: 'Billing Report',
  //               id: '5'
  //           }
  //       ];

  //       utils.send_response(res, {
  //           status: true,
  //           data:{
  //               reportTypes: Hash.obscure(reportTypes, req)
  //           }
  //       });

  //   });

    router.get(['/management-summary', '/management-summary-accrual'], [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      try {
        
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        // let company = res.locals.active;
        let query = req.query;

        if(!query.property_id) e.th(400, "Please enter a property id ");
        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ")

        let company = new Company({id: res.locals.active.id});
        await company.find(connection);
        try {
          await company.getWebLogoURL(Hashes.encode(query.property_id, res.locals.company_id));
        } catch(err){
          console.log("err", err);
        }

        let type = req.url.indexOf('management-summary-accrual') >= 0 ? Enums.REPORTS.MSR_TYPE.ACCRUAL : Enums.REPORTS.MSR_TYPE.CASH;
        let report = new ManagementSummary(connection, company, query.date, [query.property_id], type);
        let management_summary = await report.generate();

        console.log('management_summary', management_summary);

        utils.send_response(res, {
          status: 200,
          data: {
            report: management_summary,
            company
          }
        })


      } catch(err){
        next(err)
      }

    });

    // Older Implementation without Redshift
    /* router.get('/management-summary', control.hasAccess('admin'), async (req, res, next) => {
      var connection = res.locals.connection;

      try{

        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;

        if(!query.property_id) e.th(400, "Please enter a property id ");
        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ")



        //property.verifyAccess(company.id, res.locals.properties || []);
        let report = new ManagementSummary(connection, company, query.date, [query.property_id]);
        let management_summary = await report.generate();

        utils.send_response(res, {
          status: 200,
          data: {
            report: management_summary,
          }
        })

        // TODO record activity

      } catch(err){
        next(err)
      }




    }); */

    router.get('/account-receivable-aging', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      
      try {
        
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        let arAging = await Report.findPastDueAging(connection,company.id, query.property_id, query.date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(arAging, req)
          }
        });

      } catch(err){
        next(err)
      }


    });


    router.get('/delinquencies', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        let delinquencies = await Report.findDelinquencies(connection, company.id, query.property_id, query.date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(delinquencies, req)
          }
        });

      } catch(err){
        next(err)
      }

    });



    router.get('/transfer', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
    
    
    
    try {
      
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);  
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a start date for this report ");
        if(!query.end_date || !moment(query.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let transfers = await Report.findTransfers(connection, company.id, query.property_id, query.date, query.end_date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(transfers, req)
          }
        });

      } catch(err){
        next(err)
      }


    });

    router.get('/rental-activity', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) => {
      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!query.end_date || !moment(query.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");


        let rentalActivityMoveIn = await Report.findRentalActivityMoveIn(connection,company.id, query.property_id, query.date, query.end_date);
        let rentalActivityMoveOut = await Report.findRentalActivityMoveOut(connection,company.id, query.property_id, query.date, query.end_date);
        //console.log("rentalActivity report", rentalActivityMoveIn);
        //console.log("rentalActivityMoveOut", rentalActivityMoveOut);
        utils.send_response(res, {
          status: 200,
          data: {
            report: {
              rentalActivityMoveIn: Hash.obscure(rentalActivityMoveIn, req),
              rentalActivityMoveOut: Hash.obscure(rentalActivityMoveOut, req)
            },
          }
        });

      } catch(err){
        next(err)
      }


    });

    router.get('/occupancy-statistics', [control.hasAccess(['admin' , 'api']), Hash.unHash], async (req, res, next) => {

      try{
        
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;

        if(!query.property_id) e.th(400, "Please enter a property id ")
        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ")

        let property = new Property({id: query.property_id});
        //property.verifyAccess(company.id, res.locals.properties || []);
        let report = new Occupancy(connection, company, query.date, [query.property_id]);
        let occupancy = await report.generate();

        utils.send_response(res, {
          status: 200,
          data: {
            report: occupancy
          }
        })

        // TODO record activity

      } catch(err){
        next(err)
      }
  });

    router.get('/daily-deposits',  [control.hasAccess(['admin' , 'api']), Hash.unHash], async (req, res, next) => {
      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;

        if(!query.property_id) e.th(400, "Please enter a property id ")
        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a property id ");

        let report = new DailyDeposits(connection, company, query.date, [query.property_id]);
        let dailyDeposits = await report.generate();

        utils.send_response(res, {
          status: 200,
          data: {
            report: dailyDeposits
          }
        });

      } catch(err){
        next(err)
      }



    });

    router.get('/space-activity', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a start date for this report ");
        if(!query.end_date || !moment(query.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let spaceActivities = await Report.findSpaceActivities(connection, company.id, query.property_id, query.date, query.end_date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(spaceActivities, req)
          }
        });

      } catch(err){
        next(err)
      }


    });

    router.get('/canned', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => {
      
      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;


        let company = res.locals.active;
        let contact = res.locals.contact;

        let cannedReports = await Report.findCanned(connection);
        let applicationReports = await Report.findApplication(connection, company.id);
        console.log("applicationReports", applicationReports)
        utils.send_response(res, {
          status: 200,
          data: {
            cannedReports: Hash.obscure(cannedReports.concat(applicationReports), req)
          }
        })

      } catch(err){
        next(err)
      }


    });

    router.post('/add-addons-collections', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => { 
      
      try {
        var connection = res.locals.connection;
        let body = req.body;   
        //let company = res.locals.active;
        
        let reportCollection = new AddonReportCollection({company_id: res.locals.active.id ,id:body.collection_id });
        await reportCollection.addReports(connection, body);

        utils.send_response(res, {
          status: 200          
        });        
      } catch(err){
        next(err)
      }
    });

    router.post('/collections-details', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => { //todo make it post
      
      try{
        var connection = res.locals.connection;
        let company = res.locals.active;
        let contact = res.locals.contact;

        let collections = await Report.collectionReports(connection,company.id,contact.id)
        utils.send_response(res, {
          status: 200,
          data: {
            collections: Hash.obscure(collections, req)
          }
        })

      } catch(err){
        next(err)
      }
    });

    router.get('/search-all-reports', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => {
      
      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;

        let reports = await Report.getAllReports(connection,contact.id,company.id,query.keyword)
        utils.send_response(res, {
          status: 200,
          data: {
            reports: Hash.obscure(reports, req)
          }
        })

      } catch(err){
        next(err)
      }
    });

    router.post('/share-reports', [control.hasAccess('admin'),Hash.unHash],  async (req, res, next) => {
      try{
        var connection = res.locals.connection;
        let contact = res.locals.contact;
        let company_id = res.locals.active.id
        let body = req.body;
        let id = "share_reports"+ "_" + moment().format('x');
       
        let payload = body.payload;

        invalid_phones = await Contact.validateCoWorkers(connection , payload.send_to);

        if(invalid_phones && invalid_phones.length){

          utils.send_response(res, {
            status: 200,
            data:{
              invalid_phones
            }          
          });
        }

        else{                            

        await Queue.add('share_reports_flow', {
          priority: 1,
          company_id,
          ...payload,
          send_to: Hash.obscure(payload.send_to,req),
          cid: res.locals.company_id, //dynamo cid
          contact_id: contact.id,
          socket_details: {
            id,
            company_id: res.locals.company_id,
            contact_id: contact.id
          }
  
        }, { priority: 1 });
        
        let report_names = payload.reports.map(report=>{

          return report.name;

        })

        utils.send_response(res, {
          status: 200,
          data:{
            report_names,
            id
          }          
        });
      }
  
      } catch(err){
        next(err)
      }
    });


    router.post('/remove-addons-reports', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      var connection = res.locals.connection;
      try{
        let contact = res.locals.contact;
        let company = res.locals.active;
        let body = req.body;
     

        await Report.removeAddedReports(connection,body.report_id,body.collection_id,company.id);
        await Report.removeScheduledReports(connection, body.report_id , contact.id ,company.id , body.collection_id , body.collection_type);

        utils.send_response(res, {
          status: 200,
          data: {}
        });


      } catch(err) {
        next(err);
      }


    });

    router.get('/canned/:report_id', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => {
      
      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;
        let body = req.body;
        let params = req.params;

        if(!body.property_id) e.th(400, "Please enter a property id ");

        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");

        let property = new Property({id: body.property_id});
        //property.verifyAccess(company.id, res.locals.properties || []);

        let report = new Report({id: params.report_id});
        await report.findCannedById(connection);

        // set facilities and date

        report.format = 'web';
        report.connection = connection;
        report.company = company;
        report.filters.limit = query.limit && query.limit <= 100 ? parseInt(query.limit): 50;
        report.filters.offset = req.query.offset ? parseInt(req.query.offset): 0;

        report.setUpReport(report.template);
        await report.generate();

        var paging = {
          total: report.reportClass.result_count,
          count: report.reportClass.data.length
        };

        if(report.filters.limit >= 0){
          if(report.filters.limit + report.filters.offset >= report.reportClass.result_count){
            paging.next = '';
          } else {
            paging.next = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(req.params.report_id, res.locals.company_id) + '?limit=' + report.filters.limit + '&offset=' + (report.filters.offset + report.filters.limit);
          }
          paging.prev = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(req.params.report_id, res.locals.company_id) + '?limit=' + report.filters.limit + '&offset=' + ( (report.filters.offset - report.filters.limit) > 0 ? report.filters.offset - report.filters.limit: 0 );
        }

        utils.send_response(res, {
          status: 200,
          data: {
            table_data: Hash.obscure(report.reportClass.data, req),
            paging: paging
          }
        });


      } catch(err){
        next(err)
      }
    });

    router.get('/auto-reports',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        var active = res.locals.active;
        var active_id = active.id;

        let reports = await models.Report.findAutoByCompanyId(connection, active_id);

        utils.send_response(res, {
          status: 200,
          data:{
            reports: Hash.obscure(reports, req)
          }
        });

      } catch(err) {
        next(err);
      }
    });

    router.post('/',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;
      let report = {};
      try{
        let company = res.locals.active;
        let contact = res.locals.contact;
        let body = req.body;

        // Not allowing dots(.) in report name
        if(body.name && body.name.includes('.')) e.th(400, "Report name cannot contain dots(.)");
        
        body.share = body.share.map(b => Hashes.decode(b)[0]);

        if(!body.share || !Array.isArray(body.share) || !body.share.length ){
          e.th(400, "This isn't being saved to anyone's account")
        }

        // De-duplicate

        let seen = {};
        body.share = body.share.filter(item => seen.hasOwnProperty(item) ? false : (seen[item] = true));

        for(let i = 0; i < body.share.length; i++){

          let c = new Contact({id: body.share[i]});
          await c.find(connection);

          let r = new Report();
          let savedReports = Report.findSaved(connection, c.id, company.id);
          body.filters = Hash.obscure(body.filters, req);
          r.create(body, c.id, company.id);
          r.sort = savedReports.length;
          await r.save(connection);

          if(c.id === contact.id ) {
            report = r;
          }
        }

        if(report){
          report.id = Hashes.encode(report.id, res.locals.company_id);
          report.contact_id = Hashes.encode(report.contact_id, res.locals.company_id);
          report.company_id = Hashes.encode(report.company_id, res.locals.company_id);

        }


        utils.send_response(res, {
          status: 200,
          data: {
             report: report
          }
        })

        // TODO record activity

      } catch(err){
        next(err)
      }



  });

  router.post('/pinned-status', [control.hasAccess('admin'), Hash.unHash],  async (req, res, next) => {
    var connection = res.locals.connection;
    
    try{
      let company = res.locals.active;
      let contact = res.locals.contact;
      let query = req.query;

      if(!(query.report_id && query.pinned )){
        e.th(500, 'Invalid query string');
      }

      let report_res = await Report.updatePinnedStatus(connection,query.pinned,query.report_id,contact.id,company.id); // pinned is true or false

      utils.send_response(res, {
        status: 200,
        data: {
          report_id: Hashes.encode(query.report_id , res.locals.company_id)
        }
      })

    } catch(err){
      next(err)
    }
  });

    router.put('/:report_id',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;

      try{
        let company = res.locals.active;
        let contact = res.locals.contact;
        let body = req.body;
        let params = req.params;

        let report = new Report({id: params.report_id});
        await report.findSavedById(connection);
        report.verifySavedAccess(contact.id, company.id);

        body.filters = Hash.obscure(body.filters, req);
        report.create(body, contact.id, company.id );
        await report.save(connection);

        utils.send_response(res, {
          status: 200,
          data: {
            report_id: Hashes.encode(report.id, res.locals.company_id)
          }
        })

      } catch(err){
        next(err)
      }



    });

    router.get('/saved',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let contact = res.locals.contact;
        let query = req.query;
        let applicationReports = []
        let savedReports = await Report.findSaved(connection, contact.id, company.id, query.template, query.include_apps);
        if(query.include_apps){
          applicationReports = await Report.findApplication(connection, company.id, query.template);
        }
        console.log("applicationReports", applicationReports);
        utils.send_response(res, {
          status: 200,
          data: {
            savedReports: Hash.obscure(savedReports.concat(applicationReports), req)
          }
        });

      } catch(err){
        next(err)
      }



    });

    router.get('/auto-pay',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        let autoPay = await Report.findAutoPay(connection,company.id, query.property_id, query.date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(autoPay, req)
          }
        });

      } catch(err){
        next(err)
      }



    });

    router.get('/gate-access',  [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {
      
      try {
        
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;

        let company = res.locals.active;
        let query = req.query;
        if(!query.property_id) e.th(400, "Please enter a property id ");

        if(!query.date || !moment(query.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        let gateAccess = await Report.findGateAccess(connection,company.id, query.property_id, query.date);

        utils.send_response(res, {
          status: 200,
          data: {
            report: Hash.obscure(gateAccess, req)
          }
        });

      } catch(err){
        next(err)
      }



    });

  /* Todo - Refactor */
    router.post('/save-report',  [control.hasAccess('admin'), control.hasPermission('manage_reports'), Hash.unHash], function(req, res, next) {

        var connection = res.locals.connection;

        try {
          var company = res.locals.active;
          var errors = [];
          var emails = req.body.send_to;
          var body = req.body
          var id = body.id;

          emails.forEach(function(e){
            if(!Validate.validateEmail(e)){
              errors.push(e + ' is not a valid email address');
            }
          });

          if(req.body.one_time) {

            var fn = '';
            switch(req.body.report_id){
              case 1:
                fn = 'invoice_summary';
                break;
              case 2:
                fn = 'maintenance_summary';
                break;
              case 3:
                fn = 'invoice_detail';
                break;
              case 4:
                fn = 'charges_summary';
                break;
              case  5:
                fn = 'billing_summary';
                break;
            }

            var jobParams = [];
            jobParams.push({
              category: 'report_' + fn,
              data: {
                one_time: true,
                Report: {
                  report_id: req.body.report_id,
                  data: req.body.data,
                  company_id: company.id,
                  send_to: emails,
                  timePeriod: {
                    start: req.body.start,
                    end: req.body.end
                  }
                }
              }
            });

            return Scheduler.addJobs(jobParams, function(err){
              if(err) console.log(err);
              utils.send_response(res, {
                status: true,
                msg: 'Your report has been queued for sending. You should receive it in your inbox shortly.'
              });
            });

          } else {

            var data = {
              company_id: company.id,
              report_id: req.body.report_id,
              send_to: JSON.stringify(emails),
              time_period: req.body.time_period,
              send_day: req.body.send_day,
              data: req.body.data
            };
            // todo make sure user can edit
            if(errors.length){
              throw errors.join(', ');
            }
            return models.Report.save(connection, data, id).then(function(result){
              return utils.send_response(res, {
                status: true
              })
            })

          }

        } catch(err) {
          next(err)

        }

    });

    //na

    router.delete('/:report_id', [control.hasAccess('admin'), control.hasPermission('manage_reports'), Hash.unHash], async (req, res, next) => {
      var connection = res.locals.connection;
      try{
        let contact = res.locals.contact;
        let company = res.locals.active;
        let params = req.params;

        let report = new Report({id: params.report_id});
        await report.findSavedById(connection);

        report.verifySavedAccess(contact.id, company.id);
        await Report.deleteReportsPinned(connection,params.report_id,contact.id,company.id);
        await Report.deleteFromSchedule(connection,params.report_id,company.id);
        await Report.deleteSavedAddons(connection,params.report_id,company.id);
        await report.deleteSaved(connection);

        utils.send_response(res, {
          status: 200,
          data: {}
        });


      } catch(err) {
        next(err);
      }


    });

    router.post('/types/:report_type', [control.hasAccess('admin', 'api'), Hash.unHash], async(req, res, next) => {
      

      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let company = res.locals.active;   
        let user = res.locals.contact;   
        let api = res.locals.api;  
        let gps_selection = res.locals.gps_selection;
        //let properties = res.locals.properties;
        //Added by BCT Team, for report card property validations
        let properties;
        
        if(gps_selection?.length) properties = gps_selection;
        else properties = res.locals.properties;

        if(req.body.properties !== undefined) { 
          properties = Report.getProperties(properties?.length ? properties : res.locals.properties, req.body.properties);
        } else {
          properties = properties?.length ? properties : res.locals.properties;
        } 

        res.fns.addStep('beforeVerifyingPermissions');
        await Property.verifyAccessInBulk(connection, {contact_id: user.id, properties, permission: 'report_view', api});
        res.fns.addStep('AfterVerifyingPermissions');

        let body = req.body;
        let params = req.params;
        if(req.body.columns.length < 1) e.th(400, "At least one column should be selected.");
        let report = new Report({
          name: null,
          type: params.report_type,
          format: 'web',
          filters: body,
          connection: connection,
          company: company,
          properties: properties,
          template: params.report_type,
        });

        await report.setUpReport();
        await report.generateData();
        console.log("Report Type: ",params.report_type);
        console.log("Report Data: ", report.reportClass.data);
        utils.send_response(res, {
          status: 200,
          data: {
            table_data: Hash.obscure(report.reportClass.data, req),
            columns: report.reportClass.pivot_columns
          }
        })

      } catch(err){
        next(err)
      }


    });

    router.post('/types/:report_type/total_count', [control.hasAccess('admin', 'api'), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;

      try{

        let company = res.locals.active;   
        let user = res.locals.contact;   
        let api = res.locals.api;  
        let gps_selection = res.locals.gps_selection;
        let properties;

        if(gps_selection?.length) properties = gps_selection;
        else properties = res.locals.properties;

        if(req.body.properties !== undefined) { 
          properties = Report.getProperties(properties?.length ? properties : res.locals.properties, req.body.properties);
        } else {
          properties = properties?.length ? properties : res.locals.properties;
        } 

        res.fns.addStep('beforeVerifyingPermissions');
        await Property.verifyAccessInBulk(connection, {contact_id: user.id, properties, permission: 'report_view', api});
        res.fns.addStep('AfterVerifyingPermissions');

        let body = req.body;
        let params = req.params;
        let report = new Report({
          name: null,
          type: params.report_type,
          format: 'web',
          filters: body,
          connection: connection,
          company: company,
          properties: properties,
          template: params.report_type,
        });

        await report.setUpReport();
        await report.reportClass.generateTotalCount();
        console.log("Report Type: ",params.report_type);
        console.log("Report Data: ", report.reportClass.data);
        utils.send_response(res, {
          status: 200,
          data: {
            total_count: report.reportClass.total_count
          }
        })

      } catch(err){
        next(err)
      }


    });

    router.post('/types/:report_type/result_count', [control.hasAccess('admin', 'api'), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;

      try{

        let company = res.locals.active;   
        let user = res.locals.contact;   
        let api = res.locals.api;  
        let gps_selection = res.locals.gps_selection;
        let properties;

        if(gps_selection?.length) properties = gps_selection;
        else properties = res.locals.properties;

        if(req.body.properties !== undefined) { 
          properties = Report.getProperties(properties?.length ? properties : res.locals.properties, req.body.properties);
        } else {
          properties = properties?.length ? properties : res.locals.properties;
        } 

        res.fns.addStep('beforeVerifyingPermissions');
        await Property.verifyAccessInBulk(connection, {contact_id: user.id, properties, permission: 'report_view', api});
        res.fns.addStep('AfterVerifyingPermissions');

        let body = req.body;
        let params = req.params;
        if(req.body.columns.length < 1) e.th(400, "At least one column should be selected.");
        let report = new Report({
          name: null,
          type: params.report_type,
          format: 'web',
          filters: body,
          connection: connection,
          company: company,
          properties: properties,
          template: params.report_type,
        });

        await report.setUpReport();
        await report.generateResultCount();
        console.log("Report Type: ",params.report_type);
        console.log("Report Data: ", report.reportClass.data);
        utils.send_response(res, {
          status: 200,
          data: {
            result_count: report.reportClass.result_count,
          }
        })

      } catch(err){
        next(err)
      }


    });

    router.post('/billed-products', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;

        try{

            let company = res.locals.active;
            let body = req.body;

            let report = new Report({
                name: null,
                type: 'billed_products',
                format: 'web',
                filters: body,
                connection: connection,
                company: company
            });
            await report.generate();


            utils.send_response(res, {
                status: 200,
                data: {
                    billedProducts: Hash.obscure(report.reportClass.data, req),
                    result_count: report.reportClass.result_count
                }
            })

        } catch(err){
            next(err)
        }




        // pool.getConnectionAsync()
        //     .then(function(conn){
        //         connection = conn;
        //
        //         let report = new Report({
        //             name: null,
        //             type: 'billed_products',
        //             format: 'web',
        //             filters: body,
        //             connection: connection,
        //             company: company
        //         });
        //         await report.generate();
        //     })
        //     .then(function() {
        //
        //         utils.send_response(res, {
        //             status: 200,
        //             data: {
        //                 billedProducts: Hash.obscure(report.reportClass.data),
        //                 result_count: report.reportClass.result_count
        //             }
        //         })
        //     })
        //     .then(() => utils.saveTiming(connection, req, res.locals))
        //     .catch(next)
        //     .finally(() => utils.closeConnection(pool, connection))


    });

  /* Todo - Is this deprecated? */
    // router.post('/payments', control.hasAccess('admin'), function(req, res, next) {
    // 
    //     var connection = res.locals.connection;
    //     var company = res.locals.active;
    //     var company_id = company.id;
    //     var count;
    //     var limit, offset, search, sort, payments, count ;
    //     var timeframe
    //
    //     limit = parseInt(req.body.limit);
    //     offset = parseInt(req.body.offset);
    //     sort = req.body.sort;
    //     search = req.body.search;
    //
    //     search.timeframe = utils.findTimeframe(req.body.search.date);
    //     if(search.timeframe.start && search.timeframe.end && search.timeframe.start < search.timeframe.end){
    //         throw new Error("You have entered an invalid date range. Please try again");
    //     }
    //
    //     return models.Payment.findPaymentsByCompanyId(connection, company_id, search, sort, offset, limit, false)
    //       .then(function(paymentRes){
    //
    //         payments = paymentRes;
    //         return models.Payment.findPaymentsByCompanyId(connection, company_id, search, null, null, null, true);
    //
    //         }).then(function(countRes){
    //
    //
    //             utils.send_response(res, {
    //                 status: true,
    //                 data: {
    //                     payments:  Hash.obscure(payments),
    //                     count: countRes[0].count,
    //                     total: countRes[0].total
    //                 }
    //             });
    //         })
    //         .then(() => utils.saveTiming(connection, req, res.locals))
    //         .catch(next)
    //         .finally(() => utils.closeConnection(pool, connection))
    //
    // });


  /* Todo - Refactor to use async/await, remove model call from route */
    router.get('/vacancies', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {

        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        var company = res.locals.active;
        var query = req.query;
        var conditions = {
            property_id: query.property_id,
            period: (query.period == 6 || query.period == 12) ? query.period: null
        }

        var searchParams = {
            limit: +query.limit || 30,
            offset: +query.offset || 0
        }

        var vacancies = [];
        return models.Lease.getVacancies(connection, company.id, conditions, searchParams)
            .then((v)=> {
                vacancies = v;
                return  models.Lease.getVacancies(connection, company.id, conditions, searchParams, true)
            })
            .then(function(countRes) {
                utils.send_response(res, {
                    status: true,
                    data: {
                        vacancies: Hash.obscure(vacancies, req),
                        count: countRes[0].count
                    }
                })
            })

            .catch(next)


    });

    router.post('/download-pdf', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {
        //req.setTimeout(0);
        var connection = res.locals.connection;
        var company = res.locals.active;
        let user = res.locals.contact;

        try{
          let body = req.body;

          let permissions = [];
          if(body.type !== 'receipt' && body.type !== 'invoice') permissions.push('download_reports')


          let pdf_generator_payload = await Report.downloadPdfPayload(connection, req, res, next, permissions)
          await PDF.generatePDF(pdf_generator_payload.connection, pdf_generator_payload.body, pdf_generator_payload.company, pdf_generator_payload.property, pdf_generator_payload.contact, pdf_generator_payload.token, pdf_generator_payload.report_data, pdf_generator_payload.data, pdf_generator_payload.dataCount, pdf_generator_payload.res, pdf_generator_payload.newPdf);
        }
        catch(err){
          next(err)
        }

  })
  
  /*** Route is for preparing the data of static and dynamic reports in pdf form, for sharing that report. ***/
  router.post('/download-pdf-report-share', [control.hasAccess('report_sharing'), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;

    try{
      let pdf_generator_payload = await Report.downloadPdfPayload(connection, req, res, next)

      if(req.body.generate_pdf_payload)     
      utils.send_response(res, {
        status: 200,
        data: {
          body:pdf_generator_payload.body,
          company:pdf_generator_payload.company,
          property:pdf_generator_payload.property,
          contact:pdf_generator_payload.contact,        
          report_data:pdf_generator_payload.report_data,
          data:pdf_generator_payload.data,
          newPdf:pdf_generator_payload.newPdf   
        }
      });
      
      else{

      await PDF.generatePDF(pdf_generator_payload.connection, pdf_generator_payload.body, pdf_generator_payload.company, pdf_generator_payload.property, pdf_generator_payload.contact, pdf_generator_payload.token, pdf_generator_payload.report_data, pdf_generator_payload.data, pdf_generator_payload.dataCount, pdf_generator_payload.res, pdf_generator_payload.newPdf);

      }
    }
    catch(err){
      next(err)
    }

})

    router.post('/download-xlsx',  [control.hasAccess('admin'), control.hasPermission('download_reports'), Hash.unHash], async(req, res, next) => {
      const connection = res.locals.connection;
      let permissions = res.locals.permissions;
      let properties = res.locals.properties;
      let user = res.locals.contact;
      let api = res.locals.api;
      let property;
      let gps_selection = res.locals.gps_selection;

      try {
        let company = new Company({id: res.locals.active.id});
        let body = req.body;
        
        //Checking Priveledge for Sales Commission Report
        let salesCommissionReportAllowedUsers = [7614, 219057, 231779, 322526, 231792, 237994, 322517, 322518, 322523, 322525, 322524];
        if(body.type === 'sales_commission' && !(salesCommissionReportAllowedUsers.includes(user?.id))){
          e.th(403, "You do not have permission to access this report.");
        }
        if(body.property_id){
          property = new Property({id: body.property_id});
          await property.find(connection)
          await property.getLocalCurrentDate(connection);
        }

        if(body.label && body.type !=='generic'){
          
          var baseReport = new BaseReport();
          const currentDate = body?.current_date ? body.current_date : body.date? body.date : property?.localCurrentDate ? property.localCurrentDate : moment().format('YYYY-MM-DD');
          let timeframe = baseReport.getTimeframeDates({ label: body.label, start_date: body.date, end_date: body.end_date, current_date: currentDate });

          body.date = timeframe.start;
          ('end_date' in body) && (body.end_date = timeframe.end);

        }

        await company.find(connection);

        if(gps_selection?.length) properties = gps_selection;
        else properties = res.locals.properties;

        if(body?.property_ids?.length){
          properties = Report.getProperties(properties, body.property_ids, true);
        }else{
          properties = body?.property_id ? Report.getProperties(properties, [body.property_id], true) : properties;
        }
        
        await Property.verifyAccessInBulk(connection, {contact_id: user.id, properties, permission: ['download_reports']});  

        /* "body" object has following keys: 
           date, end_date, formate, name, property_id, timeZone, type */
        let static_report = new StaticReport({
          ...body,
          connection : connection,
          company : company,
          properties
        });
         
        
        // This was in the merge request, but I dont know how it got here. 
          // try {  
          //   console.log("hashedPropertyId", hashedPropertyId)
          //   company.webLogo = await company.getWebLogoURL(hashedPropertyId);
          // } catch(err){
          //   console.log("company.webLogo", company.webLogo); 
          // }      
          
        static_report.setUpReport();
        await static_report.generate({ api_info: res });

        utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['download_reports']});
        res.download(static_report.reportClass.path);
        console.log(static_report.reportClass.path); 
      } catch (err) {
        next(err);
      }
    });

    /*** Route is for preparing the data of static reports in xlsx form, for sharing the report. ***/
    router.post('/download-xlsx-report-share',  [control.hasAccess('report_sharing'), Hash.unHash], async(req, res, next) => {
      const connection = res.locals.connection;
      // let permissions = res.locals.permissions;
      let properties = res.locals.properties;
      try {
        let company = new Company({id: res.locals.active.id});
        let body = req.body;

        let baseReport = new BaseReport();
        let timeframe = baseReport.getTimeframeDates({ label: body.label, current_date: body?.current_date, start_date: body.date, end_date: body.end_date });

        body.date = timeframe.start;
        body.end_date = timeframe.end;


        await company.find(connection);
        let filtered_properties = body?.property_ids?.length ? body.property_ids : properties;

        /* "body" object has following keys: 
           date, end_date, formate, name, property_id, timeZone, type */
        let static_report = new StaticReport({
          ...body,
          connection : connection,
          company : company,
          properties : filtered_properties,
        });

        static_report.setUpReport();
        await static_report.generate();

       // utils.hasPermission(['download_reports'], permissions);
        //res.download(static_report.reportClass.path);

        fs.readFile(static_report.reportClass.path, function(err, buffer){
          utils.send_response(res, {
            status: 200,
            data: buffer,
            body
          });
        });

        console.log(static_report.reportClass.path); 
      } catch (err) {
        next(err);
      }
    });
    
    
    router.post('/download-summary-pdf', [control.hasAccess('admin'), Hash.unHash], async(req, res, next) => {

        //req.setTimeout(0);
        var connection = res.locals.connection;
        try {
          let company = new Company({id: res.locals.active.id});
          let token = req.headers['authorization'];
          let contact = res.locals.contact;
          let body = req.body;


          if(!body.property_id) e.th(400, "Please enter a property id ");
          if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ")

          let property = new Property({id: body.property_id});
          await property.find(connection);
          body.property = property;

          await company.find(connection);
          let data = await Report.getPdf(connection, body, company, contact, token);
          utils.send_response(res, {
            status: 200,
            data: data
          });


        } catch(err){
          next(err)
        }


    //
    // path += body.type.toLowerCase() + '_' +moment().format('x') +'.pdf';
    // let url_params = Hash.obscure({
    //   params: body.url_params
    // }).params
    //
    // let params = '?';
    // Object.keys(url_params).forEach(key => {
    //   params += key + '=' +url_params[key] + '&'
    // })
    //
    // params += 'token=' + req.headers.authorization
    // url += 'reports/web/' + body.type.toLowerCase() + params;
    //



  })

    router.get('/report-request', [Hash.unHash], async(req, res, next) =>{

      
      try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let query =  req.query;
        let report = new Report();

        let format = await report.setUpReportFromRequest(connection, query.id);

        await report.generate();
        let response = Hash.obscure({
          data: report.reportClass.data,
          format : format
        }, req)

        utils.send_response(res, {
          status: 200,
          data: response
        });
      } catch (err) {
        next(err)
      }




    });
 
    /*** Route is for preparing the data of dynamic reports in xlsx form, for sharing the report. ***/
    router.post('/generate-report-share', [control.hasAccess('report_sharing'), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;
      try {
        let company = res.locals.active;
        let body = req.body;
        body.filters = typeof body.filters === 'string' ? JSON.parse(body.filters) : body.filters;
        //Added by BCT Team, for report card property validations
        let properties;
        if(req.body.properties !== undefined) { 
          properties = Report.getProperties(res.locals.properties, req.body.properties);                                         
        } else {
          properties = res.locals.properties;
        }

        //let permissions = res.locals.permissions;

        let  report = new Report({
          name: body.name + '_' + moment().format('x'),
          type: body.type,
          template: body.type,
          report_name: body.name,
          format: body.format,
          filters: body.filters,
          connection: connection,
          company: company,
          properties: properties,
          current_date: body.current_date
        });

        report.setUpReport();
        await report.generate();

        switch(report.format){
          case 'pdf':
          case 'excel':
          case 'xlsx':
          //  utils.hasPermission(['download_reports'], permissions);
            //res.download(report.reportClass.path);
            let report_dates = report.reportClass.report_dates;
            fs.readFile(report.reportClass.path, function(err, buffer){
              utils.send_response(res, {
                status: 200,
                data: buffer,
                report_data:{report_dates}
              });
            });
            break;

          case 'dashboard':
            utils.send_response(res, {
              status: 200,
              data: {
                properties: Hash.obscure(report.reportClass.data, req),
              }
            });
            break;
          case 'web':
            utils.send_response(res, {
              status: 200,
              data: {
                data: Hash.obscure(report.reportClass.data, req),
              }
            });
            break;
        }

      } catch(err){
        next(err)
      }


    });

    router.post('/generate', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;
      try {
        let company = res.locals.active;
        let user = res.locals.contact;
        let api = res.locals.api
        let body = req.body;
        let gps_selection = res.locals.gps_selection;
        let properties;

        if(gps_selection?.length) properties = gps_selection;
        else properties = res.locals.properties;
        //let properties = res.locals.properties;
        //Added by BCT Team, for report card property validations
        

        if(body.properties !== undefined) { 
          properties = Report.getProperties(properties?.length ? properties : res.locals.properties, body.properties);
        } else {
          properties = properties?.length ? properties : res.locals.properties;
        }
        
        await Property.verifyAccessInBulk(connection, {contact_id: user.id, properties, permission: ['download_reports']});
  


        let permissions = res.locals.permissions;
        if (body?.custom_config) body.custom_config['user_id'] = user.id

        let  report = new Report({
          name: body.name + '_' + moment().format('x'),
          type: body.type,
          template: body.type,
          report_name: body.name,
          format: body.format,
          filters: body.filters,
          connection: connection,
          company: company,
          properties: properties,
          custom_config: body?.custom_config || {}
        });

        report.setUpReport();
        await report.generate();

        switch(report.format){
          case 'pdf':
          case 'excel':
          case 'xlsx':
            utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['download_reports']});
            res.download(report.reportClass.path);
            break;

          case 'dashboard':
            utils.send_response(res, {
              status: 200,
              data: {
                properties: Hash.obscure(report.reportClass.data, req),
              }
            });
            break;
          case 'web':
            utils.send_response(res, {
              status: 200,
              data: {
                data: Hash.obscure(report.reportClass.data, req),
              }
            });
            break;
        }

      } catch(err){
        next(err)
      }


    });

    router.get('/structure', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;
            let query = req.query;

            let report = new Report({
                id: query.id,
                template: query.template,
                connection: connection,
                company: company,
            });

            await report.setUpReport();


            //await report.findSavedById(connection);

            // sets the report column structure
            await report.reportClass.parseConfig();
            let config = report.reportClass.getConfig();
            console.log("config", {
              name: report.name,
              description: report.description,
              config: config,
              filters: report.filters
            });
            utils.send_response(res, {
                status: 200,
                data: {
                  name: report.name,
                  description: report.description,
                  config: config,
                  filters: Hash.obscure(report.filters, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/:report_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

      try{
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let contact = res.locals.contact;
        let company = res.locals.active;

        const { params, query } = req;
        
        let { start_date, end_date, date } = query;
        
        if (date) {
          utils.validateDateFormat(date);
          start_date = end_date = date;
        } else if (start_date || end_date) {
          if (!end_date) end_date = moment.utc().format('YYYY-MM-DD');
          utils.dateRangeValidator(start_date, end_date, { fromDateErrMessage: 'Start date is required' });
        }
        
        let properties;
        if (query.property_id) {
          properties = Array.isArray(query.property_id) ? query.property_id : [query.property_id];
          if (!properties.every(pid => res.locals.properties.includes(pid))) e.th(403, `You do not have access to the selected ${properties.length === 1 ? 'property' : 'properties'}`);
        };
        
        let report = new Report({id: params.report_id});
        await report.findSavedById(connection);

        report.verifySavedAccess(contact && contact.id, company.id);

        report.format = 'web';
        report.connection = connection;
        report.company = company;
        report.properties = properties || res.locals.properties;

        await report.setUpReport(null, { start_date, end_date });

        report.filters.limit = query.limit && parseInt(query.limit) <= 100 ? parseInt(query.limit): 100;
        report.filters.offset = req.query.offset ? parseInt(req.query.offset): 0;
        if(query.limit && parseInt(query.limit) <= 0){
          report.filters.limit = null;
        }
        
        await report.reportClass.setLimit();
        await report.generate();

        var paging = {
          total: report.reportClass.result_count,
          count: report.reportClass.data.length
        };
        
        if(report.filters.limit){
          if(report.filters.limit + report.filters.offset >= report.reportClass.result_count){
            paging.next = '';
          } else {
            paging.next = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(req.params.report_id, res.locals.company_id) + '?limit=' + report.filters.limit + '&offset=' + (report.filters.offset + report.filters.limit);
          }
          paging.prev = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(req.params.report_id, res.locals.company_id) + '?limit=' + report.filters.limit + '&offset=' + ( (report.filters.offset - report.filters.limit) > 0 ? report.filters.offset - report.filters.limit: 0 );
        }

        utils.send_response(res, {
          status: 200,
          data: {
            table_data: Hash.obscure(report.reportClass.data, req),
            date: report.reportClass.report_dates,
            paging: paging
          }
        });


      } catch(err) {
        next(err);
      }



    });

    //Added by BCT Team for Schedule report
    router.post("/schedule-report", [control.hasAccess('admin'), Hash.unHash], async (req,res, next) => {
      try {
        var connection = res.locals.connection;      
        let body = req.body.payload;      
        body.contact = res.locals.contact;
        body.cid = res.locals.company_id;
                            
        let invalid_phones = await Contact.validateCoWorkers(connection , body.send_to);

        if(invalid_phones && invalid_phones.length){

          utils.send_response(res, {
            status: 200,
            data:{
              invalid_phones
            }          
          });
        } 
        else{
        let scheduleReport = new ScheduleReport({company_id: res.locals.active.id});
        await scheduleReport.addScheduleReport(connection, body);
        
        utils.send_response(res, {
          status: 200                
        });
      }
      } catch(err) {
        next(err);
      }      
    });
    
    //Added by BCT Team for Schedule report
    router.put("/schedule-report/:share_report", [control.hasAccess('admin'), Hash.unHash], async (req,res, next) => {            
      try {
        var connection = res.locals.connection;                  
        let body = req.body.payload;      

        let invalid_phones = await Contact.validateCoWorkers(connection , body.send_to);

        if(invalid_phones && invalid_phones.length){

          utils.send_response(res, {
            status: 200,
            data:{
              invalid_phones
            }          
          });
        }

        else{

        let share_report_id = Hashes.decode(req.params.share_report)[0];
              
        let scheduleReport = new ScheduleReport({company_id: res.locals.active.id, share_report_id});
        await scheduleReport.updateScheduleReport(connection, body);
        
        utils.send_response(res, {
          status: 200                
        });
      }

      } catch(err) {
        next(err);
      }
    });

    //Added by BCT Team for Schedule report
    router.delete("/schedule-report/:share_report", [control.hasAccess('admin'), Hash.unHash], async (req,res, next) => {      
      try {
        var connection = res.locals.connection;                           
        let share_report_id = Hashes.decode(req.params.share_report)[0];      
              
        let scheduleReport = new ScheduleReport({company_id: res.locals.active.id, share_report_id});
        let result = await scheduleReport.deleteScheduleReport(connection);
        
        utils.send_response(res, {
          status: 200,
          data: result                
        });        
      } catch(err) {
        next(err);
      }
    });


    return router;
};

var BaseReport = require(__dirname + '/../classes/reports/report_types/base_report.js');
const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');