var express = require('express');
var router = express.Router();
var GenericRreport = require(__dirname + '/../classes/generic.js')
var DailyDepositReport = require(__dirname + '/../classes/daily_deposit.js')
var Receipt = require(__dirname + '/../classes/receipt.js')
var RentalAcivityReport = require(__dirname + '/../classes/rental_activity.js')
var ProtectionPlan = require(__dirname + '/../classes/protection_plan.js')
var TransfersReport = require(__dirname + '/../classes/transfers.js')
var GateAccessReport = require(__dirname + '/../classes/gate_access.js')
var Invoice = require(__dirname + '/../classes/invoice.js');
var ManagementSummary = require(__dirname + '/../classes/management_summary.js');
var ManagementSummaryAccrual = require(__dirname + '/../classes/management_summary_accrual.js');
var GenericReport = require(__dirname + '/../classes/generic_report.js');
var OccupancyStatisticsReport = require(__dirname + '/../classes/occupancy_statistics_report.js');
var ArAging = require(__dirname + '/../classes/ar_aging.js');
var Delinquencies = require(__dirname + '/../classes/delinquencies.js');
var SpaceActivity = require(__dirname + '/../classes/space_activity.js');
var GeneralLedger = require(__dirname + '/../classes/general_ledger.js');
var MsrAutopayEnrollment = require(__dirname + '/../classes/msr_autopay_enrollment.js');
var OverlockedSpaces = require(__dirname + '/../classes/overlocked_spaces.js');
var WriteOffs = require(__dirname + '/../classes/write_offs.js');
var AppliedCredits = require(__dirname + '/../classes/applied_credits.js');
var NetRevenue = require(__dirname + '/../classes/net_revenue.js');
var PaymentByProductType = require(__dirname + '/../classes/payment_by_product_type.js');
var RentChange = require(__dirname + '/../classes/rent_change.js');
var Liabilities = require(__dirname + '/../classes/liabilities_summary.js');
var OccupancySummary = require(__dirname + '/../classes/occupancy_summary.js');
var CashAudit = require(__dirname + '/../classes/cash_audit.js');
var FinancialSummary = require(__dirname + '/../classes/financial_summary.js');
var AccountantSummary = require(__dirname + '/../classes/accountant_summary.js');
var BalanceSummary = require(__dirname + '/../classes/balance_summary.js');
var PaymentTransaction = require(__dirname + '/../classes/payment_transaction.js');
var Payouts = require(__dirname + '/../classes/payouts.js');
const CoverageDetails = require('../classes/coverage_details.js');
const Socket = require(__dirname + '/../classes/sockets.js');

//config 
OccupancyStatisticsReportConfig = require(__dirname + '/../classes/config/occupancy_statistics_report_config.js')

var utils    = require(__dirname + '/../classes/utils.js');

module.exports = function(app, pool) {

  router.get('/test', function(req, res, next) {
    res.send('pdf generator is working...');
  });
    
  router.post('/:type', async function(req, res, next) {
      
    var body = req.body;
    var params = req.params;
    var reportObj = null;
    let config = [];
    let title = '';
    let timeZone = ''
    let dataLength = 0
    let socket = null;

    if(body.socket && body.socket.company_id && body.socket.contact_id)
      socket = new Socket({
        company_id: body.socket.company_id,
        contact_id: body.socket.contact_id
      });

    if(body.property && body.property.Emails) 
      body.property.Emails = utils.transformPropertyEmails(body.property.Emails);

    try {
      switch(params.type){
        case 'generic':
          reportObj = new GenericRreport(body);
          break;
        case 'rental-activity':
          reportObj = new RentalAcivityReport(body);
          break;
        case 'daily-deposits':
          reportObj = new DailyDepositReport(body);
          break;
        case 'transfer':
          reportObj = new TransfersReport(body);
          break;
        case 'management-summary':
          reportObj = new ManagementSummary(body);
          break;
        case 'management-summary-accrual':
          reportObj = new ManagementSummaryAccrual(body);
          break;
        case 'gate-access':
          reportObj = new GateAccessReport(body);
          break;
        case 'account-receivable-aging':
          reportObj = new ArAging(body);
          break;
        case 'invoice':
          reportObj = new Invoice(body);
          break;
        case 'receipt':
          reportObj = new Receipt(body);
          break;
        case 'delinquencies':
          reportObj = new Delinquencies(body);
          break;
        case 'space-activity':
          reportObj = new SpaceActivity(body);
          break;
        case 'lead-summary':

        config = [
          {
            pos: 'left',
            columns: [
              {
                name: "",
                type: 'string',
                width: 55,
                key: 'name'
              },
              {
                key: "web_lead",
                name: "Web Leads",
                type: 'string',
                width: 55
              },
              {
                key: 'walk_in_lead',
                name: "Walk-In Leads",
                type: 'string',
                width: 75,
              },
              {
                key: "phone_lead",
                name: "Phone Leads",
                type: 'string',
                width: 55
              },
              {
                key: "other_lead",
                name: "Other Leads",
                type: 'string',
                width: 55
              },
              {
                key: "total",
                name: "Total",
                type: 'string',
                width: 25
              },
              {
                key: "total_leads_converted",
                name: "Total Converted",
                type: 'string',
                width: 75
              }
            ],
            rows: [{
              'name': 'Total Leads',
              'web_lead': (body.data.webLeads.length).toString(),
              'walk_in_lead': (body.data.walkInLeads.length).toString(),
              'phone_lead': (body.data.phoneLeads.length).toString(),
              'other_lead': (body.data.otherLeads.length).toString(),
              'total': (body.data.webLeads.length + body.data.walkInLeads.length + body.data.phoneLeads.length + body.data.otherLeads.length).toString(),
              'total_leads_converted': (body.data.totalConvertedLeads).toString()
            }]
          },
          {
            name: "Web Leads",
            pos: 'left',
            columns: [
              {
                key: 'name',
                name: 'Lead Name',
                type: 'string',
                width: 55,
              },
              {
                key: 'phone',
                name: 'Lead Phone',
                type: 'string', 
                width: 55
              },
              {
                key: 'email',
                name: 'Lead Email',
                type: 'string',
                width: 55
              },
              {
                key: 'source',
                name: 'Lead Source',
                type: 'string',
                width: 55
              },
              {
                key: 'created',
                name: 'Lead Created Date',
                type: 'date',
                width: 55
              },
              {
                key: 'move_in_date',
                name: 'Move-In Date',
                type: 'date',
                width: 55
              },
              {
                key: 'status',
                name: 'Lead Status',
                type: 'string',
                width: 55
              },
            ],
            rows: body.data.webLeads
          },
          {
            name: "Walk-In Leads",
            pos: 'left',
            columns: [
              {
                key: 'name',
                name: 'Lead Name',
                type: 'string',
                width: 55,
              },
              {
                key: 'phone',
                name: 'Lead Phone',
                type: 'string', 
                width: 55
              },
              {
                key: 'email',
                name: 'Lead Email',
                type: 'string',
                width: 55
              },
              {
                key: 'source',
                name: 'Lead Source',
                type: 'string',
                width: 55
              },
              {
                key: 'created',
                name: 'Lead Created Date',
                type: 'date',
                width: 55
              },
              {
                key: 'move_in_date',
                name: 'Move-In Date',
                type: 'date',
                width: 55
              },
              {
                key: 'status',
                name: 'Lead Status',
                type: 'string',
                width: 55
              },
            ],
            rows: body.data.walkInLeads
          },
          {
            name: "Phone Leads",
            pos: 'left',
            columns: [
              {
                key: 'name',
                name: 'Lead Name',
                type: 'string',
                width: 55,
              },
              {
                key: 'phone',
                name: 'Lead Phone',
                type: 'string', 
                width: 55
              },
              {
                key: 'email',
                name: 'Lead Email',
                type: 'string',
                width: 55
              },
              {
                key: 'source',
                name: 'Lead Source',
                type: 'string',
                width: 55
              },
              {
                key: 'created',
                name: 'Lead Created Date',
                type: 'date',
                width: 55
              },
              {
                key: 'move_in_date',
                name: 'Move-In Date',
                type: 'date',
                width: 55
              },
              {
                key: 'status',
                name: 'Lead Status',
                type: 'string',
                width: 55
              },
            ],
            rows: body.data.phoneLeads
          },
          {
            name: "Other Leads",
            pos: 'left',
            columns: [
              {
                key: 'name',
                name: 'Lead Name',
                type: 'string',
                width: 55,
              },
              {
                key: 'phone',
                name: 'Lead Phone',
                type: 'string', 
                width: 55
              },
              {
                key: 'email',
                name: 'Lead Email',
                type: 'string',
                width: 55
              },
              {
                key: 'source',
                name: 'Lead Source',
                type: 'string',
                width: 55
              },
              {
                key: 'created',
                name: 'Lead Created Date',
                type: 'date',
                width: 55
              },
              {
                key: 'move_in_date',
                name: 'Move-In Date',
                type: 'date',
                width: 55
              },
              {
                key: 'status',
                name: 'Lead Status',
                type: 'string',
                width: 55
              },
            ],
            rows: body.data.otherLeads
          }
        ]
          body.data.webLeads.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            phone: body.data.webLeads.length,
          });

          body.data.walkInLeads.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            phone: body.data.walkInLeads.length,
          });

          body.data.phoneLeads.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            phone: body.data.phoneLeads.length,
          })

          body.data.otherLeads.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            phone: body.data.otherLeads.length,
          })
          console.log("config", config)
          title = "MSR Detail - Lead Activity"
          timeZone = body.timeZone;
          dataLength = body.data.webLeads.length + body.data.walkInLeads.length + body.data.phoneLeads.length +  body.data.otherLeads.length
          reportObj = new GenericReport(config, body.property, body.start_date, body.end_date, body.company, title, timeZone, dataLength );

          break;
        
        case 'occupancy-statistics-report':
          // console.log("config",OccupancyStatisticsReportConfig(body))

          title = "Occupancy Statistics Report";
          timeZone = body.timeZone;
          console.log("BODY.data.standardStorage",body.data.standardStorage)

          // for (group_num = 0; group_num < body.data.standardStorage.length; group_num++) {
          //   let formatSummary = {}
          //   group = body.data.standardStorage[group];


          // }

          // body.data.standardStorage.push({
          //   key: 'total',
          //   name:'Total',
          //   summary_row: true,
          //   isfooter: true,
          //   total_area: body.data.insuranceNotEnrolled.length,
          // })
          config = OccupancyStatisticsReportConfig(body.data.standardStorage, body.data.parking, body.data.report)
          
          // console.log("config", config)
          reportObj = new OccupancyStatisticsReport(config, body.property, body.start_date, body.end_date, body.company, title, timeZone, dataLength )

          break



        case 'promotion':
          config = [
            {
              name: "Insurance Protection Enrollment",
              pos: 'left',
              columns: [
                {
                  key: "allowances",
                  name: "Allowances",
                  type: 'string',
                  width: 100
                },
                {
                  key: "total_allowance",
                  name: "Discounts / Promotions",
                  type: 'money',
                  width: 55
                },
              ],
              rows: [{
                allowances: body.data.allowances,
                total_allowance: body.data.totalAllowances
              }]
            },
            {
              name: "Promotion and discounts",
              pos: 'left',
              columns: [
                {
                  key: 'name',
                  name: 'Tenant',
                  type: 'string',
                  width: 55,
                  summary_column: true
                },
                {
                  key :'date',
                  name: 'Date',
                  type: 'date',
                  width: 55
                },
                {
                  key: 'unit_number',
                  name: 'Space #',
                  type: 'string',
                  width: 15,
                },
                {
                  key: 'promotion_name',
                  name: 'Promotion Name',
                  type: 'string',
                  width: 55,
                },
                {
                  key: 'invoice_number',
                  name: 'Invoice Number',
                  type: 'string',
                  width: 55
                },
                {
                  key: 'amount',
                  name: 'Amount',
                  type: 'money',
                  width: 20
                },
              ],
              rows: body.data.promotionsApplied
            },
          ]

          body.data.promotionsApplied.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            unit_number: body.data.allowances,
            amount: body.data.totalAllowances
          });

          title = "Discounts and Promotions"
          timeZone = body.timeZone;
          dataLength = body.data.promotionsApplied.length;
          reportObj = new GenericReport(config, body.property, body.start_date, body.end_date, body.company, title, timeZone, dataLength );
          break;
        case 'protection-plan':
          
          config = [
            
            {
              name: "Insurance Protection Enrollment",
              pos: 'left',
              columns: [
                {
                  name: "Insurance Protection Enrollment",
                  type: 'string',
                  width: 100
                },
                {
                  key: 'total_count',
                  name: "Total Count",
                  type: 'string',
                  width: 55,
                },
                {
                  key: "total_percentage",
                  name: "% Total",
                  type: 'string',
                  width: 55
                },
              ],
              rows: [{
                total_count: (body.data.insuranceSummary.total).toString(),
                total_percentage: utils.formatPersontage(body.data.insuranceSummary.percentage)
              }]
            },
            {
              name: "Insurance/Protection - Enrolled",
              pos: 'left',
              columns: [
                {
                  key: 'name',
                  name: 'Tenant',
                  type: 'string',
                  width: 55,
                  summary_column: true
                },
                {
                  key: 'unit_number',
                  name: 'Space #',
                  type: 'string',
                  width: 15,
                },
                {
                  key :'start_date',
                  name: 'Start Date',
                  type: 'date',
                  width: 55
                },
                {
                  key: 'coverage_amount',
                  name: 'Coverage Amount',
                  type: 'money',
                  width: 55
                },
                {
                  key: 'premium',
                  name: 'Premium',
                  type: 'money',
                  width: 20
                },
                {
                  key: 'paid_through_date',
                  name: 'Paid Through Date',
                  type: 'date',
                  width: 55
                }
              ],
              rows: body.data.insuranceEnrolled
            },
            {
              name: 'Insurance/Protection - Not Enrolled',
              pos: 'left',
              columns: [
                {
                  key: 'name',
                  name: 'Tenant',
                  type: 'string',
                  width: 55,
                  summary_column: true
                },
                {
                  key: 'unit_number',
                  name: 'Space #',
                  type: 'string',
                  width: 15,
                },
              ],
              rows: body.data.insuranceNotEnrolled
            }
          ]

          let coverage_amount = body.data.insuranceEnrolled.reduce(function(total, next) { return total + (isNaN(next.coverage_amount) ? 0 : parseFloat(next.coverage_amount)); }, 0);
          let premium = body.data.insuranceEnrolled.reduce(function(total, next) { return total + (isNaN(next.premium) ? 0 : parseFloat(next.premium)); }, 0)

          body.data.insuranceEnrolled.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            unit_number: body.data.insuranceEnrolled.length,
            coverage_amount,
            premium
          })
    
          body.data.insuranceNotEnrolled.push({
            key: 'total',
            name:'Total',
            summary_row: true,
            isfooter: true,
            unit_number: body.data.insuranceNotEnrolled.length,
          })
          title = "MSR Detail - Protection Plan  /   Insurance Enrollment"
          timeZone = body.timeZone;
          dataLength = body.data.insuranceEnrolled.length + body.data.insuranceNotEnrolled.length;
          console.log("config", config)
          reportObj = new GenericReport(config, body.property, body.start_date, body.end_date, body.company, title, timeZone, dataLength);
          break;
        case 'msr-autopay-enrollment':
          reportObj = new MsrAutopayEnrollment(body);
          break
        case 'overlocked-spaces':
          reportObj = new OverlockedSpaces(body);
          break
        case 'write-offs':
          reportObj = new WriteOffs(body);
          break
        case 'applied-credits':
          reportObj = new AppliedCredits(body);
          break
        case 'general-ledger':
          reportObj = new GeneralLedger(body);
          break
        case 'rent-change-summary':
          reportObj = new RentChange(body);
          break
        case 'net-revenue-projected-income':
          reportObj = new NetRevenue(body);
          break
        case 'liabilities-summary':
          reportObj = new Liabilities(body);
          break
        case 'occupancy-summary':
            reportObj = new OccupancySummary(body);
          break
        case 'payments-by-product-type':
          reportObj = new PaymentByProductType(body);
          break;
        case 'financial-summary':
          reportObj = new FinancialSummary(body);
          break
        case 'cash-audit':
          reportObj = new CashAudit(body);
          break;
        case 'accountant-summary':
          reportObj = new AccountantSummary(body);
          break;
        case 'balance-summary':
          reportObj = new BalanceSummary(body);
          break;
        case 'payment-processing':
          reportObj = new PaymentTransaction(body);
          break;
        case 'payouts':
          reportObj = new Payouts(body);
          break;
        case 'coverage-details':
          reportObj = new CoverageDetails(body);
          break;
        default:
          throw new Error('Invalid or Missing report type')
      }
      let buffer = await reportObj.generate(socket);

      if(socket){
        socket = new Socket({
          company_id: body.socket.company_id,
          contact_id: body.socket.contact_id,
        });

        await socket.createEvent("pdf_generated", {
          data: buffer,
          filename: body.socket.filename,
          id: body.socket.id,
          type: body.socket.id.type,
          content_type: "application/pdf",
          success: true
        });

      } else {
        res.json({
          status: true,
          data: buffer
        });
      }

    } catch (err) {
      console.error("ERROR_____", err);
      
      if(socket){
        await socket.createEvent("pdf_generated", {
          id: body.socket.id,
          type: body.socket.id.type,
          message: err.toString(),
          success: false
        });
      } else {
        res.json({
          status: false,
          data: err
        });
      }
      
    }

  });

	return router;
};
