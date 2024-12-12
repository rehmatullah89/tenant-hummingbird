"use strict";

var models  = require(__dirname + '/../models');
var reportTypes  = require(__dirname + '/reports/report_types');
var Setting    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var utils      = require('../modules/utils.js');
var XLSX = require('xlsx');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var rp = require('request-promise');
const fs = require("fs");
const crypto = require('crypto');
var Enums = require(__dirname + '/../modules/enums.js');
var db = require(__dirname + '/../modules/db_handler.js');

if (process.env.NODE_ENV !== 'test') {
  const bullmq = require('bullmq');
  const IORedis = require('ioredis');
  const redis_connection = new IORedis({host: process.env.REDIS_HOST});
  const PdfQueue = new bullmq.Queue('pdf', {connection: redis_connection});
}

const REMOVE_VOIDED_INVOICES = true;

const configuration = {
  review_rent_changes: {
    rentchange_notification_date: {
      width: 170
    },
    rentchange_status_modification_date: {
      width: 170
    },
    lease_start_date: {
      width: 160
    },
    lease_last_rent_change_date: {
      width: 160
    },
  }
}

class Report {

	constructor(data) {
    data = data || {};
	  this.id = data.id;
    this.name = data.name;
    this.report_name = data.report_name;
		this.description = data.description;
		this.is_default = data.is_default;
    this.data = [];
    this.type = data.type;
		this.template = data.template;
		this.connection = data.connection;
		this.company = data.company;
		this.format = data.format;
		this.filters = data.filters;
		this.contact_id = '';
		this.company_id = '';
		this.reportClass = {};
		this.properties = data.properties || [];
		this.current_date = data.current_date || null;
    this.custom_config = data.custom_config || {}
	}
  /**
   * This method sets up a report
   * @param {object} dateRange setup report for a custom range
   * @param {string} dateRange.start_date report start date
   * @param {string} dateRange.end_date report end date
   */
	async setUpReport(template = null, dateRange = {}){

	  if(this.id){
	      await this.findSavedById(this.connection);
    }
		if(!this.template || !reportTypes[this.template]){

			e.th(500, 'Invalid report type');
		}
		if (dateRange && dateRange.start_date) {
			this.filters.search.report_period.label = 'custom range';
			this.filters.search.report_period.start_date = dateRange.start_date
			this.filters.search.report_period.end_date = dateRange.end_date || moment.utc().format('YYYY-MM-DD');
		}
		console.log("set up report" , this.filters); 
		this.reportClass = new reportTypes[this.template](this.connection, this.company, this.filters, this.format, this.name, this.properties, this.report_name, this.current_date);
		if(this?.current_date){
			this.reportClass.current_date = this.current_date;
			this.reportClass.report_dates = this.reportClass.getTimeframeDates(this.filters && this.filters.search && this.filters.search.report_period);
		}

		this.reportClass.config.template = this.template;
    if (this.custom_config) {
      this.reportClass.config.custom_config = this.custom_config;
    }

  }
  
	async generate(){

		if(!this.reportClass){
			e.th(500, 'Report not configured');
    }

    // BCT: Generate Total count, before setting the filters search in base_report object
    if(this.format === 'web'){
      await this.reportClass.generateTotalCount();
    }

    this.reportClass.setColumnSql(this.connection, this.filters.columns, this.reportClass.config, this.reportClass.sql_fragments, this.filters.pivot_mode, this.filters.column_structure);
    this.reportClass.setConditionsSql(this.connection, this.filters.search, this.reportClass.config.filter_structure, this.filters.columns, this.reportClass.sql_fragments, this.reportClass.config.column_structure);
    if(this.filters.pivot_mode.type === 'group'){
      this.reportClass.setGroupSql([this.filters.pivot_mode.row.key]);
    }

    this.reportClass.setParams(this.filters, this.reportClass.config);
    await this.reportClass.generateData();
    this.reportClass.processResults(this.filters.columns, this.filters.column_structure);


    if(this.format === 'web'){
      return this.reportClass.generateCount();
    }

    if(this.format === 'excel' || this.format === 'xlsx') {
      // Should create the file and set the path
      return this.reportClass.generateExcel()
    }
    if(this.format === 'pdf') {
      // Should create the file and set the path
      return this.reportClass.generatePdf(this.company.name)
    }

	}

  async generateData(){

		if(!this.reportClass){
			e.th(500, 'Report not configured');
    }

    this.reportClass.setColumnSql(this.connection, this.filters.columns, this.reportClass.config, this.reportClass.sql_fragments, this.filters.pivot_mode, this.filters.column_structure);
    this.reportClass.setConditionsSql(this.connection, this.filters.search, this.reportClass.config.filter_structure, this.filters.columns, this.reportClass.sql_fragments, this.reportClass.config.column_structure);
    if(this.filters.pivot_mode.type === 'group'){
      this.reportClass.setGroupSql([this.filters.pivot_mode.row.key]);
    }

    this.reportClass.setParams(this.filters, this.reportClass.config);
    await this.reportClass.generateData();
    this.reportClass.processResults(this.filters.columns, this.filters.column_structure);



    if(this.format === 'excel' || this.format === 'xlsx') {
      return this.reportClass.generateExcel()
    }
    if(this.format === 'pdf') {
      return this.reportClass.generatePdf(this.company.name)
    }

	}

  async generateResultCount() {
    if(!this.reportClass){
			e.th(500, 'Report not configured');
    }

    this.reportClass.setColumnSql(this.connection, this.filters.columns, this.reportClass.config, this.reportClass.sql_fragments, this.filters.pivot_mode, this.filters.column_structure);
    this.reportClass.setConditionsSql(this.connection, this.filters.search, this.reportClass.config.filter_structure, this.filters.columns, this.reportClass.sql_fragments, this.reportClass.config.column_structure);
    if(this.filters.pivot_mode.type === 'group'){
      this.reportClass.setGroupSql([this.filters.pivot_mode.row.key]);
    }

    this.reportClass.processResults(this.filters.columns, this.filters.column_structure);

    if(this.format === 'web'){
      await this.reportClass.generateCount();
    }

  }

    static subSetOfMainProperties = (mainSetOfProperties, selectedProperties) => {    
        const result = selectedProperties.every(val => mainSetOfProperties.includes(val));    
        return result;
    }
    static  getProperties = (mainSetOfProperties, selectedProperties, skipUnHash = false) => {   
      let properties = [];

      if (selectedProperties) {
          if(!skipUnHash) properties = selectedProperties.map((p)=> Hashes.decode(p)[0]);
          else properties = selectedProperties.map(p => p);
          const isSubset = Report.subSetOfMainProperties(mainSetOfProperties, properties)        
          if(!isSubset) e.th (500,"Invalid properties params")          
      } else { 
          e.th (500,"At least 1 property must be selected.")
      }
      return properties;
  }

	static getStructure(type){
		try{
			return reportTypes[type].getStructure();
		} catch(err){
			e.th(500, "Report doesn't exist");
		}

	}

  async save(connection){
    let data = {
      name: this.name,
      description: this.description,
      filters: this.filters,
      contact_id: this.contact_id,
      company_id: this.company_id,
      template: this.template,
      path: this.path,
      is_default: this.is_default, 
      type: this.type,
      download_xls:1
    }


    if(data.is_default) {
      await this.removeDefault(connection, this.contact_id, this.template);
    }
	  let result = await  models.Report.save(connection, data, this.id);
    this.id = this.id || result.insertId;

  }

  async removeDefault(connection, contact_id, template){
      if(!this.contact_id) e.th(500, "Contact id not set");
      return await models.Report.removeDefault(connection, contact_id, template);
  }

  // For creating saved reports;
  create(data, contact_id, company_id){
    if(!data.name) e.th(400, "Report name not set");
    this.name = data.name;
    // new line
    this.report_name = data.name;
    this.description = data.description;
    this.filters = JSON.stringify(data.filters);
    this.contact_id = contact_id;
    this.company_id = company_id;
    this.is_default = data.is_default;
    this.type = data.type;
    this.path = data.path;
    this.template = data.template;

  }

  async deleteSaved(connection){
      return await models.Report.deleteSaved(connection, this.id, this.company_id)
  }

  verifySavedAccess(contact_id, company_id){
	  if(!this.id) e.th(400, "No ID is set");
	  //if(this.contact_id !== contact_id) e.th(403, "You do not have access to this report")
	  if(this.company_id !== company_id) e.th(403, "You do not have access to this report")
  }

  async findSavedById(connection){
	  let data = await models.Report.findSavedById(connection, this.id);
    if(!data) e.th(404, "Report Not found");

	  this.id = data.id;
	  this.name = data.name;
	  this.description = data.description;
	  this.template = data.template;
	  this.path = data.path;
    this.company_id = data.company_id;
    this.contact_id = data.contact_id;
    this.type = data.type;
    this.is_default = data.is_default;
	  try{
      this.filters = JSON.parse(data.filters);
    } catch(err) {
      e.th(400, "This report is corrupted.  Please delete and try another.")
    }

  }

  async setUpReportFromRequest(connection, report_id){

    let data = await models.Report.findReportRequestById(connection, report_id);
    if(!data){
      e.th(404);
    }

    let decoded =  await User.decodeToken(data.token);
    data.filters =  JSON.parse(data.filters);

    if(moment(data.created_at).add(5, 'minutes').format('x') < moment().format('x')){
      e.th(409, "This report is expired");
    }

    data.company = new Company({id: Hashes.decode(decoded.active.id)[0]});

    await data.company.find(connection);

    this.name = data.name;
    this.type = data.type;
    this.template = data.type;
    this.report_name = data.name;
    this.format = 'web';
    this.filters = data.filters;
    this.connection = connection;
    this.company = data.company;
    this.properties = Hashes.decode(decoded.properties);

    this.setUpReport();

    return data;
  }

  static async findSaved(connection, contact_id, company_id, template){
	  return await models.Report.findSaved(connection, contact_id, company_id, template);
  }

  static async getPdf(connection, body, company, property, contact, token){
	  // url = 'https://google.com';

    let url = '';
    let data = {};
    let filename;
    url = company.get_base_url();
    url += 'reports.html?';

    switch(body.type){
      case 'receipt':
        url += "type=receipt&request_id=" + Hashes.encode(body.request_id, connection.cid) + '&token=' + token;
        filename = body.type.toLowerCase() + '_' + Hashes.encode(body.request_id, connection.cid)  +'.pdf';
        data.id = body.type + "_" + Hashes.encode(body.request_id, connection.cid)
        break;
      case 'invoice':
        url += "type=invoice&request_id=" + Hashes.encode(body.request_id, connection.cid)  + '&token=' + token;
        filename = body.type.toLowerCase() + '_' + Hashes.encode(body.request_id, connection.cid) +'.pdf';
        data.id = body.type + "_" + Hashes.encode(body.request_id, connection.cid);
        break;
      case 'management-summary':
      case 'write-offs':
      case 'applied-credits':
      case 'daily-deposits':
      case 'auto-pay':
      case 'msr-autopay-enrollment':
      case 'overlocked-spaces':
      case 'net-revenue-projected-income':
      case 'rental-activity':
      case 'occupancy-statistics':
      case 'gate-access':
      case 'account-receivable-aging':
      case 'transfer':
        filename = body.type + "_" + utils.slugify(property.name) + "_" + moment(body.date, 'YYYY-MM-DD').format('mm-dd-yyyy') +'.pdf';
        data.id = body.type + "_" + utils.slugify(property.name) + "_" + moment(body.date, 'YYYY-MM-DD').format('mm-dd-yyyy');
        url += 'type=' +  body.type + '&property_id=' +  Hashes.encode(property.id, connection.cid) + '&date=' + body.date + '&token=' + token + '&timeZone=' + body.timeZone + (body.end_date ? '&end_date=' + body.end_date : '');
        break;
      case 'generic':
        var report_id = await Report.saveReportRequest(connection, body, token);
        url += "type=generic&request_id=" + Hashes.encode(report_id, connection.cid) + '&timeZone=' + body.timeZone;
        filename = body.type.toLowerCase() + '_' + Hashes.encode(report_id, connection.cid) +'.pdf';
        data.id = body.report_type + "_" + Hashes.encode(report_id, connection.cid);
        data.type = 'generic'
        break;
    }
    data.url = encodeURI(url);
    data.filename = filename;
    data.company_id = company.id;
    data.contact_id = contact.id;
    data.webhook = null;
    data.priority = 5;
    data.cid = connection.cid;

    console.log("URL", data.url);

    await PdfQueue.add('generatePdf', data, {priority: data.priority});
    return data;

    // return await new Promise((resolve, reject) => {
    //   // await fs.writeFile('/home/app/hummingbird/uploads/' + utils.slugify(upload.name) + '.pdf', new Buffer(file));
    //
    //
    //
    //
    //
    //   let file = fs.createWriteStream(path);
    //   var chunks = [];
    //
    //
    //
    //
    //
    //   let uri = process.env.PDF_GENERATOR_ENDPOINT +  'download-pdf/';
    //
    //
    //
    //
    //
    //
    //   return rp({
    //     /* Here you should specify the exact link to the file you are trying to download */
    //     method: "POST",
    //     uri: uri,
    //     headers: {
    //       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    //       'Accept-Encoding': 'gzip, deflate, br',
    //       'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3',
    //       'Cache-Control': 'max-age=0',
    //       'Connection': 'keep-alive',
    //       'Upgrade-Insecure-Requests': '1'
    //     },
    //     body:{
    //       url: encodeURI(url),
    //       pdf_name: 'generic-report.pdf',
    //       is_generic,
    //       webhook: 'http://143cd50b04e6.ngrok.io/v1/report-response'
    //     },
    //     timeout: (5 * 60 * 1000),
    //     /* GZIP true for most of the websites now, disable it if you don't need it */
    //     gzip: true,
    //     json: true
    //   })
    //     .pipe(file)
    //     .on('finish', () => {
    //       resolve();
    //     })
    //     .on('error', (error) => {
    //       reject(error);
    //     })
    // })



    // let result = await rp(options);
    // return result;


  }

  async findCannedById(connection, type){
    // Test Failure reason: data is array, and we are expecting it as single object.
    let data = await models.Report.findCannedById(connection, this.id);
    if(!data) e.th(404, "Report Not found");

    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.template = data.template;
    this.path = data.path;
    this.contact_id = data.contact_id;
    this.company_id = data.company_id;
    this.type = data.type;
    this.is_default = data.is_default;
    try{
      this.filters = JSON.parse(data.filters);
    } catch(err) {
      e.th(400, "This report is corrupted.  Please delete and try another.")
    }

  }


  static async findCanned(connection){
   return await models.Report.findCanned(connection);

  }
  static async findApplication(connection, company_id, template){
    return await models.Report.findApplication(connection, company_id, template);
 
   }

  static async findAutoPay(connection,company_id, property_id, date){
    let list = await models.Report.findAutoPayTenants(connection,company_id, property_id, date);
    let newList = list.map(x => {
      let billingDate = ''
      const expectedBillDate = moment().set("date", x.bill_day)
      if (moment().diff(expectedBillDate) <= 0 ) {
        billingDate = expectedBillDate
      } else {
        billingDate = moment().add(1, 'M').set("date", x.bill_day)
      }
      return {
        ...x,
        billing_date:billingDate.format('YYYY-MM-DD')
      }
    })

    return newList
   }

   static async findPastDueAging(connection,company_id, property_id, date){
     let list = await models.Report.findPastDueAging(connection, company_id, property_id, date);
     return list;
   }

    static async findDelinquencies(connection, company_id, property_id, date){
      let list = await msrModels.Delinquencies.detailDelinquentTenants(connection, company_id, property_id, date);
      return list;
    }


  static async findAutopayEnrolled(connection,company_id, property_id, date) {
    let list = await msrModels.AutoPay.detailedFindAutopayEnrolled(connection, company_id, [property_id], date);
    return list;
   }

  static async findAutopayNotEnrolled(connection,company_id, property_id, date) {
    let list = await msrModels.AutoPay.detailedFindAutopayNotEnrolled(connection, company_id, [property_id], date);
    return list;
  }

  static async findOccupiedList(connection,company_id, property_id, date){
    let list = await msrModels.Occupancy.detailOccupiedList(connection, company_id, property_id, date);
    return list;
   }

  static async findVacantList(connection,company_id, property_id, date){
    let list = await msrModels.Occupancy.detailVacantList(connection, company_id, property_id, date);
    return list;
  }

  static async findRentChange(connection,company_id, property_id, date){
    let list = await msrModels.RentChange.detailRentChange(connection, company_id, property_id, date);
    return list;
   }

  static async findRentNotChange(connection,company_id, property_id, date){
    let list = await msrModels.RentChange.detailRentNotChange(connection, company_id, property_id, date);
    return list;
  }

  static async findOvelockedSpaces(connection,company_id, property_id, date) {
    let list = await msrModels.Overlock.detailedFindOvelockedSpaces(connection, company_id, [property_id], date);
    return list;
   }

  static async findNotOverlockedSpaces(connection,company_id, property_id, date){
    let list = await msrModels.Overlock.detailedFindNotOverlockedSpaces(connection, company_id, [property_id], date);
    return list;
  }

  static async findRent(connection, company_id, property_id, date, end_date){
    let list = await msrModels.ProjectedIncome.detailProductRevenue(connection, property_id, date, end_date, Enums.PRODUCT_DEFAULT_TYPES.RENT);
    return list;
   }

  static async findInsuranceProtection(connection, company_id, property_id, date, end_date){
    let list = await msrModels.ProjectedIncome.detailProductRevenue(connection, property_id, date, end_date, Enums.PRODUCT_DEFAULT_TYPES.INSURANCE);
    return list;
  }

  static async findFee(connection, company_id, property_id, date, end_date){
    let list = await msrModels.ProjectedIncome.detailProductRevenue(connection, property_id, date, end_date, Enums.PRODUCT_DEFAULT_TYPES.FEE);
    return list;
   }

  static async findMerchandise(connection, company_id, property_id, date, end_date){
    let list = await msrModels.ProjectedIncome.detailProductRevenue(connection, property_id, date, end_date, Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE);
    return list;
  }

  static async findMonthlyRevenue(connection, properties, date, end_date){
    let list = await msrModels.NetRevenue.monthlyRevenue(connection, properties, date, end_date);
    return list;
  }

  static async findProducts(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findProducts(connection, company_id, property_id, date, end_date);
    return list;
   }

  static async findDiscounts(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findDiscounts(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findCharges(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findCharges(connection, company_id, property_id, date, end_date);
    return list;
   }

  static async findPaymentsReceipts(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findPaymentsReceipts(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findCreditsIssued(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findCreditsIssued(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async getFSRData(connection,property_id, start_date, end_date){
    start_date =  moment(start_date).format('YYYY-MM-DD');
    end_date =  moment(end_date).format('YYYY-MM-DD');
    let list = await models.Report.getFSRData(connection,[property_id],start_date,end_date);
    return list;
  }

  static async findStorageRent(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findStorageRent(connection, company_id, property_id, date, end_date);
    return list;
   }

  static async findParkingRent(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findParkingeRent(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findOtherProduct(connection,company_id, property_id, date, end_date){
    let list = await models.Report.findOtherProduct(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findRentalActivityMoveIn(connection,company_id, property_id, date, end_date){
    let list = await msrModels.Activity.detailRentalActivityMoveIn(connection, company_id, property_id, date, end_date);
    return list;
   }
   static async findRentalActivityMoveOut(connection,company_id, property_id, date, end_date){
    let list = await msrModels.Activity.detailRentalActivityMoveOut(connection, company_id, property_id, date, end_date);
    return list;
   }

   static async findInsuranceEnrolled(connection,company_id, property_id, date, end_date){
    let list = await msrModels.Insurance.detailFindInsuranceEnrolled(connection, company_id, property_id, date, end_date);
    return list;
   }

   static async findInsuranceNotEnrolled(connection,company_id, property_id, date, end_date){
    let list = await msrModels.Insurance.detailFindInsuranceNotEnrolled(connection, company_id, property_id, date, end_date);
    return list;
   }

   static async findPromotionsApplied(connection, property_ids, start_date, end_date, findTotal) {
     let list = await msrModels.Allowances.detailedFindPromotionsApplied(connection, property_ids, start_date, end_date, findTotal);
     return list;
   }

  static async findSalesCommission(connection, payload) {
    let list = await models.Report.findSalesCommission(connection, payload);
    return list;
  }

  static async findSalesCommissionDetails(connection, payload) {
    return models.Report.findSalesCommissionDetails(connection, payload);
  }

  static async findWriteOffs(connection, company_id, property_id, date, end_date){
    let list = await models.Report.findWriteOffs(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findAppliedCredits(connection, company_id, property_id, date, end_date){
    let list = await models.Report.findAppliedCredits(connection, company_id, property_id, date, end_date);
    return list;
  }

  static async findPrepaidRent(connection, company_id, property_id, date){
    let list = await msrModels.Liability.detailProductLiabilities(connection, property_id, date, [Enums.PRODUCT_DEFAULT_TYPES.RENT]);
    return list;
   }

   static async findPrepaidFee(connection, company_id, property_id, date){
    let list = await msrModels.Liability.detailProductLiabilities(connection, property_id, date, [Enums.PRODUCT_DEFAULT_TYPES.FEE]);
    return list;
   }

   static async findPrepaidMerchandise(connection, company_id, property_id, date){
    let list = await msrModels.Liability.detailProductLiabilities(connection, property_id, date, [Enums.PRODUCT_DEFAULT_TYPES.MERCHANDISE]);
    return list;
   }

   static async findPrepaidInsuranceProtection(connection, company_id, property_id, date){
    let list = await msrModels.Liability.detailProductLiabilities(connection, property_id, date, [Enums.PRODUCT_DEFAULT_TYPES.INSURANCE]);
    return list;
   }

   static async findMiscDeposit(connection, company_id, property_id, date){
    let list = await msrModels.Liability.detailProductLiabilities(connection, property_id, date, [Enums.PRODUCT_DEFAULT_TYPES.RENT, Enums.PRODUCT_DEFAULT_TYPES.FEE, Enums.PRODUCT_DEFAULT_TYPES.INSURANCE], false);
    return list;
   }


   static async findTransfers(connection,company_id, property_id, date, end_date){
    let list = await msrModels.Activity.detailFindTransfers(connection, company_id, property_id, date, end_date);
    return list;
  }

   static async findSpaceActivities(connection, company_id, property_id, start_date, end_date){
    let list = await models.Report.findSpaceActivities(connection, company_id, property_id, start_date, end_date);
    return list;
   }

   static async findGateAccess(connection,company_id, property_id, date){
    let list = await models.Report.findGateAccessTenants(connection,company_id, property_id, date);
    let property = new Property({id: property_id});
    await property.find(connection);

    try{
      await property.getAccessControl(connection);
      if(property.Access){
        let users = await property.Access.getUsers();
        for(let i = 0; i < list.length; i++){
          let user = users.find(u => u.user_id == list[i].contact_id);
          if(user){
            list[i] = {...list[i], pin: user.pin, last_updated: user.modified, status: user.status};
          }
        }
      }
    } catch(err){
      console.log("Error: ", err);
    }


    return list;
  }

  static async findPaymentByProductType(connection, property_id, start_date, end_date) {
    return  await msrModels.DepositsRefunds.detailPaymentByProductType(connection, [property_id], start_date, end_date);
  }

  static async getCashAudit(connection, property_id, start_date, end_date) {
    return  await msrModels.DepositsRefunds.detailCashAudit(connection, property_id, start_date, end_date);
  }

  static async findWebLeads(connection, property_id, start_date, end_date) {
    let source = 'Web Leads';
    return await msrModels.Leads.detailFindLeads(connection, property_id, start_date, end_date, source);
  }

  static async findWalkInLeads(connection, property_id, start_date, end_date) {
    let source = 'Walk-In Leads';
    return await msrModels.Leads.detailFindLeads(connection, property_id, start_date, end_date, source);
  }

  static async findPhoneLeads(connection, property_id, start_date, end_date) {
    let source = 'Phone Leads';
    return await msrModels.Leads.detailFindLeads(connection, property_id, start_date, end_date, source);
  }

  static async findOtherLeads(connection, property_id, start_date, end_date) {
    let source = 'Others';
    return await msrModels.Leads.detailFindLeads(connection, property_id, start_date, end_date, source);
  }

static async findWebConvertedLeads(connection, property_id, start_date, end_date) {
  let result = await msrModels.Leads.findTotalConvertedLeads(connection, property_id, start_date, end_date);
  return result;
}

static async paymentProcessing(connection, company_id, property_id, date, end_date) {

  let property = new Property({id: property_id});
  await property.find(connection);
  let time_zone = await models.Property.findPropertyTimeZone(connection,
                            property.Address.country, property.Address.zip);

  let payment_list = await models.Report.getPaymentsDataFromHB(connection, property_id, date, end_date, time_zone);
  let payout_end_date = moment(end_date).add(3, 'days').format('YYYY-MM-DD');
  let hb_payout_list = await models.Report.getPayouts(connection, property_id, date, payout_end_date);

  let hb_payout_map = new Map();
  hb_payout_list.forEach((row) => {
    hb_payout_map.set(row.payout_id, row);
  });

  let propay_db_connection = {};
  let propay_card_map = new Map();
  let propay_ach_map = new Map();
  
  if (payment_list && payment_list.length > 0) {
    try {
      let application = new TenantPaymentsApplication({property_id: property_id});
      application.find(connection);
    
      propay_db_connection = await db.get_propay_db_connection();
      let propay_list = await models.Report.getTransactionDataFromPropay(
                              propay_db_connection, application.account_number, date);

      propay_list.forEach((row) => {
        if (row.psptransactionid != null && row.psptransactionid != '') {
          propay_card_map.set(row.psptransactionid, row);
        } else if (row.attnum != null && row.attnum != '') {
          propay_ach_map.set(row.attnum, row);
        }
      });

      db.close_propay_db_connection(propay_db_connection);
    } catch(err){
      console.log("Error: ", err);
      db.close_propay_db_connection(propay_db_connection);
    }
  }

  for (let i = 0; i < payment_list.length; i++) {
    // Fill data only if psp is tenant payments
    if (payment_list[i].psp === 'tenant_payments') {
      let propay_data = null;
      if (payment_list[i].paymentmethod == 'card') {
        propay_data = propay_card_map.get(payment_list[i].psptransactionid);
      } else if (payment_list[i].paymentmethod == 'ach') {
        propay_data = propay_ach_map.get(payment_list[i].psptransactionid);
      }
      if (propay_data != null && propay_data != undefined) {
        payment_list[i].transactiondatepsp = propay_data.transactiondatepsp;
        if (payment_list[i].payoutid == 1 || payment_list[i].payoutid == 2) {
          payment_list[i].payoutidpsp = propay_data.payoutidpsp;
          payment_list[i].payoutinitiatedatepsp = propay_data.payoutinitiatedatepsp;
          payment_list[i].payoutamount = propay_data.payoutamount;          
        }
      }
      
      if (payment_list[i].payoutid != 1 && payment_list[i].payoutid != 2) {
        let payout_data = hb_payout_map.get(payment_list[i].payoutid);
        if (payout_data != null && payout_data != undefined) {
          payment_list[i].payoutID = payout_data.payout_id;  // payoutID is used to populate in the report
          payment_list[i].payoutinitiatedatepsp = payout_data.payout_date;
          payment_list[i].payoutamount = payout_data.payout_amount;
        }
      }
    }
  }
  return payment_list;
}
static async raw(connection, company_id, property_id, date, end_date) {
  let application = new TenantPaymentsApplication({property_id: property_id});
  application.find(connection);
   let propay_db_connection = await db.get_propay_db_connection();
  let payout_list = await models.Report.getrawFromPropay(propay_db_connection, application.account_number, date,end_date);
  db.close_propay_db_connection(propay_db_connection);
  return payout_list;
}

static async payouts(connection, company_id, property_id, date, end_date) {
  let payout_list = await models.Report.getPayouts(connection, property_id, date, end_date);
  return payout_list;
}
static async saveReportRequest(connection, obj, token){

    let data = {
      name: obj.name,
      filters: obj.filters,
      type: obj.report_type,
      token: token
    }

	  let result = await  models.Report.saveReportRequest(connection, data);

    return result.insertId
  }


  static async collectionReports(connection, company_id , contact_id){

    await models.Report.addDefaultReports(connection, company_id , contact_id);

    let collections = await models.Report.getAllCollections(connection, company_id , contact_id);
    let reports = await models.Report.getMappedReports(connection, company_id , contact_id);

    const collection_map = new Map();

    let custom_reports = await models.Report.findSavedWithPinnedInfo(connection, contact_id, company_id);
    let pinned_reports = await models.Report.findPinnedReports(connection ,contact_id ,company_id);
    pinned_reports.sort((a,b)=>a.name.localeCompare(b.name));
    let application_reports = await models.Report.findApplicationWithPinnedInfo(connection, contact_id ,company_id);


      reports.map((r)=>{

        if(r.report_category == 'static')
        {
          
            r.name == "Occupancy Statistics Report" && Object.defineProperties(r, {
            unit_group_profile_id: {
              value: '""',
              writable: true,
              enumerable: true
            },
            space_groups: {
              value: [],
              writable: true,
              enumerable: true
            }
          });

          r.property_id = '""';
        }

       if(collection_map.has(r.collection_id)) 
       {
        let reports_array = collection_map.get(r.collection_id);
        reports_array.push(r);
        collection_map.set(r.collection_id,reports_array);
       }
        else  collection_map.set(r.collection_id,[r]);
        
       })
 

      let collections_with_reports = collections.map((collection)=>{
        collection.reports = collection_map.get(collection.id) || [];
      
        (collection.name == 'Application Reports')&& 
        (collection.reports = application_reports.concat(collection.reports));

        (collection.name == 'Custom Reports')&&
        (collection.reports = custom_reports.concat(collection.reports));

        return collection;
      })

     collections_with_reports.unshift(
      {
        name: "My Pinned Reports",
        description: "",
        type: "default",
        reports:pinned_reports
      }
     )

     return collections_with_reports
  }

  static async updatePinnedStatus(connection, pinned , report_id ,contact_id,company_id){

    let report = await models.Report.findSavedById(connection,report_id);
    if(!report){
      e.th(404, 'No report found');
    }
    if(pinned =='true') await models.Report.saveReportsPinned(connection,report_id,contact_id,company_id)
    else await models.Report.deleteReportsPinned(connection,report_id,contact_id,company_id)
    

  }

  static async deleteReportsPinned(connection,report_id,contact_id,company_id){
    return await models.Report.deleteReportsPinned(connection,report_id,contact_id,company_id)
  }
  static async getAllReports(connection,contact_id,company_id ,keyword){
    return await models.Report.getAllReports(connection,contact_id,company_id ,keyword)
  }
  static async removeAddedReports(connection,report_id,collection_id,company_id){
    return await models.Report.removeAddedReports(connection,report_id,collection_id,company_id)
  }
  static async removeScheduledReports(connection, report_id , contact_id ,company_id , collection_id , collection_type){

    if(!(collection_type && ["banker_box","investor_reports"].includes(collection_type))) e.th(500, "collection type is invalid"); 
    return await models.Report.removeScheduledReports(connection, report_id , contact_id ,company_id , collection_id , collection_type)
  }
  static async deleteFromSchedule(connection,report_id,company_id){
    return await models.Report.deleteFromSchedule(connection,report_id,company_id)
  }
  static async deleteSavedAddons(connection,report_id,company_id){
    return await models.Report.deleteSavedAddons(connection,report_id,company_id)
  }

  /**
   * This method generates osr report for a property for a specific date
   * osr_report_data is necessary for pdf generator
   * @param {Object} connection
   * @param {Number} property_id
   * @param {String} date Report generation date
   * @param {Number} unit_group_profile_id 
   * @returns 
   */
  static async osrReportData(connection, property_id, date, unit_group_profile_id) {

    try {
      if (!property_id) e.th(400, "Please enter a property id ")
      if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date");
      if (!unit_group_profile_id) e.th(400, "Please enter a group profile ID");

      let group = new SpaceGroup({
        id: unit_group_profile_id,
        property_id: property_id
      });
      await group.find(connection);
      // TODO need to optimize it
      let osr_report_data = await group.findOSR(connection, date);
      console.log("osr_report_data", osr_report_data)
      let parking = Object.values(osr_report_data?.groups?.parking?.groups || {}).map(({ groups, summary }) => ({ groups, summary }));
      let standardStorage = Object.values(osr_report_data?.groups?.storage?.groups || {}).map(({ groups, summary }) => ({ groups, summary }));

      return {
        standardStorage,
        parking,
        osr_report_data
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * This method generates msr report for a list of properties for a specific date
   * @param {Object} connection
   * @param {Array} propertyIDs A list property ID
   * @param {String} date Report generation date
   * @param {Object} company An instance company
   * @param {String} type ENUM of msr report type
   * @returns msr report
   */
  static async msrReportData(connection, propertyIDs, date, company, type = Enums.REPORTS.MSR_TYPE.CASH) {
    try {
      if (Array.isArray(propertyIDs) && !propertyIDs.length) e.th(400, "Invalid property id ");
      if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Invalid date");

      let report = new ManagementSummary(connection, company, date, propertyIDs, type);
      return await report.generate();
    } catch (error) {
      throw error
    }
  }

  static applyColumnConfiguration(report_type, columns) {
      return columns.map(column => {
        return {
          ...column,
          ...(configuration[report_type][column.key]) ?? {}
        }
      })

  }

  static async downloadPdfPayload(connection, req, res, next, permissions){

      permissions = permissions || [];
      
      let company = new Company({id: res.locals.active.id});
      let token = req.headers['authorization'];
      let contact = res.locals.contact;
      let body = req.body;
      let gps_selection = res.locals.gps_selection;
      let properties = [];
      
      if(gps_selection?.length) properties = gps_selection;
      else properties = res.locals.properties;

      //let properties = res.locals.properties;
      //Added by BCT Team, for report card property validations
      
      if(!body.property_id) {     
        if(body.properties !== undefined) { 
          properties = Report.getProperties(properties?.length ? properties : res.locals.properties, body.properties);
        } else {
          properties = properties?.length ? properties : res.locals.properties; 
        }
      }
      
      await Property.verifyAccessInBulk(connection, {contact_id: contact.id, properties, permission: permissions[0]});
      

      
      let property = {};
      let report_data = {};
      let data = null;
      let newPdf = false;
      let dataCount = 0;
      let hashedPropertyId = null;

      // if(['receipt','invoice'].includes(body.type)) {
      //   company.webLogo =  await company.getWebLogoURL();
      // }

      if(properties.length === 1) {
        body.property_id = properties[0];
      }
      if(body.property_id){
        property = new Property({id: body.property_id});
        await property.find(connection)
        await property.getLocalCurrentDate(connection);
        await property.getPhones(connection);
        await property.getEmails(connection);
        hashedPropertyId = Hashes.encode(body.property_id, res.locals.company_id);
      }
      if(body.label && body.type !=='generic'){
        let baseReport = new BaseReport();
        const currentDate = body?.current_date ? body.current_date : body.date? body.date : property.localCurrentDate;
        let timeframe = baseReport.getTimeframeDates({ label: body.label, current_date: currentDate, start_date: body.date, end_date: body.end_date});

        body.date = timeframe.start;
        ('end_date' in body) && (body.end_date = timeframe.end);

      }

      await company.find(connection);

      if(body.type === 'generic') {
        newPdf = true;

        let filters = JSON.parse(body.filters);

        for (let key in filters.search) {
          if (key.endsWith('_id')) {
            filters.search[key] = Hashes.decode(filters.search[key], connection.cid)[0]
          }
        }

        if (configuration[body.report_type]) {
          filters.columns = this.applyColumnConfiguration(body.report_type, filters.columns);
        }


        body = {
          ...body,
          ...filters
        }

        if(body.columns.length < 1) e.th(400, "At least one column should be selected.");
        let report = new Report({
          name: null,
          type: body.report_type,
          format: 'web',
          filters: body,
          connection: connection,
          company: company,
          properties: properties,
          template: body.report_type,
          current_date: body.current_date
        });

        await report.setUpReport();
        await report.generate();

        report_data = {
          rows:  Hash.obscure(report.reportClass.data, req),
          columns: report.reportClass.columns,
          report_dates: report.reportClass.report_dates,
          result_count: report.reportClass.result_count
        }
        dataCount = report.reportClass.result_count * report.reportClass.columns.length;
      } else if (body.type === 'daily-deposits') {

        newPdf = true;
        if(!body.property_id) e.th(400, "Please enter a property id ")
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a property id ");

        let report = new DailyDeposits(connection, company, body.date, [body.property_id]);
        report_data = await report.generate();

      } else if (body.type === 'occupancy-statistics-report') {

        newPdf = true;
        let { standardStorage, parking, osr_report_data } = await this.osrReportData(connection, body.property_id, body.date, body.unit_group_profile_id)

        report_data = {
          standardStorage,
          parking,
          report: osr_report_data
        }

        console.log("report_data", report_data)
        
      } else if (body.type === 'receipt') {

        newPdf = true;

        // let invoices = [];
        let payment = new Payment({id: body.request_id});
        await payment.find(connection);
        await payment.findAuction(connection);
        await payment.verifyAccess(connection, company.id);
        if(payment.lease_id){
          await payment.getLease(connection);
        }

        await payment.getProperty(connection);
        hashedPropertyId = Hashes.encode(payment.Property.id, res.locals.company_id);

        // TODO remove if web accessible
        await payment.Property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions});
        await payment.Property.getPhones(connection);
        await payment.Property.getEmails(connection);
        await payment.Property.getAddress(connection);
        await payment.getPaymentMethod(connection);

        if(payment.contact_id){
          await payment.getContact(connection, company.id);
        } else if (payment.PaymentMethod && payment.PaymentMethod.Contact && payment.PaymentMethod.Contact.id){
          payment.Contact = payment.PaymentMethod.Contact;
        } else if (payment.lease_id){
          await payment.getLease(connection);
          await payment.Lease.getTenants(connection, company.id);
          payment.Contact = payment.Lease.Tenants[0].Contact;
        }


        await payment.getAcceptedByForPayment(connection, company.id);
        await payment.getPaymentApplications(connection);
        await payment.getInterPropertyPayment(connection);
        await payment.getAccountBalanceAfterPayment(connection);
        const { invoices, interPropertyInvoices } = await payment.getReceiptInvoices(connection, REMOVE_VOIDED_INVOICES);
        const useManagerInitials = await Settings.getSettingValue(connection, 'useManagerInitials', {company_id: company.id, property_id: payment.Property.id});

        let dataObj = {
          company: company,
          property: payment.Property,
          invoices: invoices,
          payment: payment,
          InterPropertyInvoices: interPropertyInvoices,
          browser_time: req.body.browser_time ? req.body.browser_time : '',
          useManagerInitials: parseInt(useManagerInitials) || 0
        }
        report_data = dataObj;

      } else if(body.type === 'invoice') {
        newPdf = true;
        let invoice = new Invoice({id: body.request_id});
        await invoice.find(connection);
        await invoice.total();

        if(invoice.Lease || invoice.property_id) {
          invoice.property_id = invoice.property_id || invoice.Lease?.Unit?.property_id
          hashedPropertyId = Hashes.encode(invoice.property_id, res.locals.company_id);
        }
        
        await invoice.findProperty(connection, company.id, contact.id, permissions);
        if(invoice.contact_id) {
          await invoice.findContact(connection, company.id);
        } else if (invoice.lease_id) {
          await invoice.findContactByLeaseId(connection,company.id)
        }
        
        invoice.Company = company;
        report_data = invoice;

      } else if (body.type === 'rental-activity') {
        newPdf = true;

        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let rentalActivityMoveIn = await Report.findRentalActivityMoveIn(connection,company.id, body.property_id, body.date, body.end_date);
        let rentalActivityMoveOut = await Report.findRentalActivityMoveOut(connection,company.id, body.property_id, body.date, body.end_date);

        report_data = {
          rentalActivityMoveIn: Hash.obscure(rentalActivityMoveIn, req),
          rentalActivityMoveOut: Hash.obscure(rentalActivityMoveOut, req)
        }
        dataCount = (rentalActivityMoveIn.length * 14) + (rentalActivityMoveOut.length * 13);
      } else if (body.type === 'transfer') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a start date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let transfers = await Report.findTransfers(connection, company.id, body.property_id, body.date, body.end_date);
        report_data = transfers;
        dataCount = transfers.length * 16;

      } else if (body.type === 'space-activity') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a start date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let spaceActivities = await Report.findSpaceActivities(connection, company.id, body.property_id, body.date, body.end_date);
        report_data = spaceActivities;
        dataCount = spaceActivities.length * 12;

      } else if(body.type === 'management-summary' || body.type === 'management-summary-accrual') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a start date for this report ");
        
        let type = body.type === 'management-summary-accrual' ? Enums.REPORTS.MSR_TYPE.ACCRUAL : Enums.REPORTS.MSR_TYPE.CASH;

        report_data = await this.msrReportData(connection, [body.property_id], body.date, company, type);

      } else if(body.type === 'protection-plan') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ")

        let insuranceEnrolled = await Report.findInsuranceEnrolled(connection,company.id, [body.property_id], body.date, body.end_date);
        let insuranceNotEnrolled = await Report.findInsuranceNotEnrolled(connection,company.id, [body.property_id], body.date, body.end_date);


        let management = new ManagementSummary(connection, company, body.date, [body.property_id]);
        await management.getUnits();
        await management.getOccupancyBreakdown();
        await management.getInsurance();
        
        let total_count = !!insuranceEnrolled.length ? insuranceEnrolled.length  : 0
        total_count += !!insuranceNotEnrolled ? insuranceNotEnrolled.length : 0
        report_data = {
          insuranceEnrolled: Hash.obscure(insuranceEnrolled, req),
          insuranceNotEnrolled: Hash.obscure(insuranceNotEnrolled, req),
          insuranceSummary: Hash.obscure(management.insurance, req),
          total_count: Hash.obscure(total_count, req),
          
        }
        dataCount = (insuranceEnrolled.length * 14) + (insuranceNotEnrolled.length * 13);


      } else if (body.type === 'promotion'){
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let promotionsApplied = await Report.findPromotionsApplied(connection, [body.property_id], body.date, body.end_date);
        
        let total = promotionsApplied?.length ? promotionsApplied.reduce((p1, p2) => (p1 + p2.amount), 0) : 0
        // await  Report.findPromotionsApplied(connection, [body.property_id], body.date, body.end_date, findTotal);
        
        report_data = {
          promotionsApplied: promotionsApplied,
          allowances: promotionsApplied.length,
          totalAllowances: total
        }
      } else if (body.type === 'gate-access'){
        newPdf = true;
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        report_data = await Report.findGateAccess(connection,company.id, body.property_id, body.date);
        dataCount = report_data.length * 7;
      } else if (body.type === 'account-receivable-aging') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        report_data = await Report.findPastDueAging(connection,company.id, body.property_id, body.date);
        dataCount = report_data.length * 14;
      } else if (body.type === 'delinquencies') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        report_data = await Report.findDelinquencies(connection, company.id, body.property_id, body.date);
        dataCount = report_data.length * 14;

      } else if (body.type === 'msr-autopay-enrollment') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        //if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let autopayEnrolled = await Report.findAutopayEnrolled(connection,company.id, body.property_id, body.date);
        let autopayNotEnrolled = await Report.findAutopayNotEnrolled(connection,company.id, body.property_id, body.date);


        let management = new ManagementSummary(connection, company, body.date, [body.property_id]);
        await management.getUnits();
        await management.getOccupancyBreakdown();
        await management.getAutoPay();

        let total_count = !!autopayEnrolled.length ? autopayEnrolled.length  : 0
        total_count += !!autopayNotEnrolled ? autopayNotEnrolled.length : 0

        report_data = {
          autopayEnrolled: Hash.obscure(autopayEnrolled, req),
          autopayNotEnrolled: Hash.obscure(autopayNotEnrolled, req),
          autopaySummary: Hash.obscure(management.autoPay, req),
          total_count: Hash.obscure(total_count, req)
        }
        dataCount = (autopayEnrolled.length * 14) + (autopayNotEnrolled.length * 13);
      
      } else if (body.type === 'write-offs') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let writeOffs = await msrModels.Credits.detailedFindWriteOffs(connection,company.id, [body.property_id], body.date, body.end_date);

        report_data = {
          writeOffs: Hash.obscure(writeOffs, req)
        }
        dataCount = writeOffs.length;
      } else if (body.type === 'applied-credits') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let appliedCredits = await msrModels.Credits.detailedFindAppliedCredits(connection,company.id, [body.property_id], body.date, body.end_date);

        report_data = {
          appliedCredits: Hash.obscure(appliedCredits, req)
        }
        dataCount = appliedCredits.length;

      } else if (body.type === 'overlocked-spaces') {
        newPdf = true;
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");

        let ovelockedSpaces = await Report.findOvelockedSpaces(connection,company.id, body.property_id, body.date);
        //let notOverlockedSpaces = await Report.findNotOverlockedSpaces(connection,company.id, body.property_id, body.date);


        let management = new ManagementSummary(connection, company, body.date, [body.property_id])
        await management.getUnits();
        await management.getOccupancyBreakdown();
        await management.getOverlock();
        
        report_data = {
          ovelockedSpaces: Hash.obscure(ovelockedSpaces, req),
          // notOverlockedSpaces: Hash.obscure(notOverlockedSpaces, req),
          summary: Hash.obscure(management.overlock, req)
        }
        dataCount = (ovelockedSpaces.length * 14) //+ (notOverlockedSpaces.length * 13);
      } else if (body.type === 'net-revenue-projected-income') {
        newPdf = true;
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let rent = await Report.findRent(connection,company.id, body.property_id, body.date, body.end_date);
        let fee = await Report.findFee(connection,company.id, body.property_id, body.date, body.end_date);
        let product = await Report.findMerchandise(connection,company.id, body.property_id, body.date, body.end_date);
        let insurance = await Report.findInsuranceProtection(connection,company.id, body.property_id, body.date, body.end_date);

        report_data = {
          rent: Hash.obscure(rent, req),
          fee: Hash.obscure(fee, req),
          product: Hash.obscure(product, req),
          insurance: Hash.obscure(insurance, req)
        }

        dataCount = (rent.length * 14) + (fee.length * 13) + (product.length * 14) + (insurance.length * 13);
      } else if (body.type === 'payments-by-product-type') {
        newPdf = true;
        
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        report_data = await Report.findPaymentByProductType(connection, body.property_id, body.date, body.end_date)
      } else if (body.type === 'cash-audit') {
        newPdf = true;
        
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        report_data = await Report.getCashAudit(connection, body.property_id, body.date, body.end_date)

      } else if (body.type === 'lead-summary') {
        newPdf = true;
        
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let webLeads = await Report.findWebLeads(connection, body.property_id, body.date, body.end_date)
        let walkInLeads = await Report.findWalkInLeads(connection, body.property_id, body.date, body.end_date)
        let phoneLeads = await Report.findPhoneLeads(connection, body.property_id, body.date, body.end_date)
        let otherLeads = await Report.findOtherLeads(connection, body.property_id, body.date, body.end_date)

        let totalConvertedLeads = await Report.findWebConvertedLeads(connection, body.property_id, body.date, body.end_date);

        report_data = {
          webLeads: webLeads,
          walkInLeads: walkInLeads,
          phoneLeads: phoneLeads,
          otherLeads: otherLeads,
          totalConvertedLeads: totalConvertedLeads.length,
        }

      } else if (body.type === 'rent-change-summary') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        //if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let rentChange = await Report.findRentChange(connection,company.id, body.property_id, body.date);
        let rentNotChange = await Report.findRentNotChange(connection,company.id, body.property_id, body.date);

        let management = new ManagementSummary(connection, company, body.date, [body.property_id]);
        await management.getUnits();
        await management.getOccupancyBreakdown();
        await management.getRentChange();
        await management.getUnchangedRent();

        /*let total_count = !!autopayEnrolled.length ? autopayEnrolled.length  : 0
        total_count += !!autopayNotEnrolled ? autopayNotEnrolled.length : 0*/
        console.log('managementRentChange', management.rentChange);
        report_data = {
          rentChange: Hash.obscure(rentChange, req),
          rentNotChange: Hash.obscure(rentNotChange, req),
          rent_change_summary: Hash.obscure(management.rentChange, req),
          rentUnchanged: Hash.obscure(management.rentUnchanged, req)
        }
        dataCount = (rentChange.length * 14) + (rentNotChange.length * 13);

      
        

      } else if (body.type === 'liabilities-summary') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");


        let rent = await Report.findPrepaidRent(connection,company.id, body.property_id, body.date);            
        let fee = await Report.findPrepaidFee(connection,company.id, body.property_id, body.date);
        //let product = await Report.findPrepaidMerchandise(connection,company.id, body.property_id, body.date); Products/Merchandises shouldn't be included as liability
        let insurance = await Report.findPrepaidInsuranceProtection(connection,company.id, body.property_id, body.date);
        let miscDeposit = await Report.findMiscDeposit(connection,company.id, body.property_id, body.date);


        let management = new ManagementSummary(connection, company, body.date, [body.property_id]);
        await management.getLiabilities();

        report_data = {
          rent: Hash.obscure(rent, req),
          fee: Hash.obscure(fee, req),
          //product: Hash.obscure(product, req),
          insurance: Hash.obscure(insurance, req),
          miscDeposit: Hash.obscure(miscDeposit, req),
          // prePaidRent: Hash.obscure(management.liabilities.prepaid_rent, req),
          // prePaidServices: Hash.obscure(management.liabilities.prepaid_services, req), //fees
          // prePaidInsurance: Hash.obscure(management.liabilities.prepaid_insurance, req),
          // prePaidDeposits: Hash.obscure(management.liabilities.miscellaneous_deposits, req),
          totalLiabilities: Hash.obscure(management.liabilities, req)
        }

        dataCount = (rent.length * 14) + (fee.length * 13) + (insurance.length * 13) + (miscDeposit.length * 13); 
      } else if (body.type === 'occupancy-summary') {
        newPdf = true;

        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");

        let occupiedList = await Report.findOccupiedList(connection,company.id, body.property_id, body.date);
        let vacantList = await Report.findVacantList(connection,company.id, body.property_id, body.date);

        let management = new ManagementSummary(connection, company, body.date, [body.property_id]);
        await management.getUnits();
        await management.getOccupancyBreakdown();
        await management.getOccupancyDetails();

        let total_count = !!occupiedList.length ? occupiedList.length  : 0
        total_count += !!vacantList ? vacantList.length : 0

        report_data = {
          occupiedList: Hash.obscure(occupiedList, req),
          vacantList: Hash.obscure(vacantList, req),
          occupancy_breakdown: Hash.obscure(management.occupancy_breakdown, req),
          total_count: Hash.obscure(total_count, req)
        }
        dataCount = (occupiedList.length * 14) + (vacantList.length * 13);
      
      } else if (body.type === 'financial-summary') {
        newPdf = true;
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        /*let product = await Report.findProducts(connection,company.id, body.property_id, body.date, body.end_date);
        let discount = await Report.findDiscounts(connection,company.id, body.property_id, body.date, body.end_date);
        let charge = await Report.findCharges(connection,company.id, body.property_id, body.date, body.end_date);
        let paymentReceipts = await Report.findPaymentsReceipts(connection,company.id, body.property_id, body.date, body.end_date);
        let creditsIssued = await Report.findCreditsIssued(connection,company.id, body.property_id, body.date, body.end_date);*/

        // let storageRent = await Report.findStorageRent(connection,company.id, body.property_id, body.date, body.end_date);
        // let parkingRent = await Report.findParkingRent(connection,company.id, body.property_id, body.date, body.end_date);
        // let otherProduct = await Report.findOtherProduct(connection,company.id, body.property_id, body.date, body.end_date);

        //let financial = Array.prototype.push.apply(storageRent, parkingRent, otherProduct); 
        // let financial = storageRent.concat(parkingRent).concat(otherProduct); 
        let financial = await Report.getFSRData(connection,body.property_id, body.date, body.end_date)

        console.log('financial_api',financial)
        report_data = {
          financial: Hash.obscure(financial, req)
        }

        //dataCount = (product.length * 14) + (discount.length * 13) + (charge.length * 14) + (paymentReceipts.length * 13) + (creditsIssued.length * 14);
        dataCount = financial.length;
      } else if (body.type === 'lock_removal') {
        newPdf = true;
        let company = res.locals.active;
        let report = new Report({
          company: company,
          template: "overlock",
        });
        report.setUpReport();
        await report.reportClass.parseConfig();
        let config = report.reportClass.getConfig();
        let columns = [
          'unit_number',
          'tenant_name',
          'unit_size',
          'unit_category',
          // 'lease_rent',
          'lease_days_late',
          // 'lease_balance',
          // 'lease_last_payment_date',
          'unit_overlocked', 
          // 'lease_paid_through_date'
        ]
        config.filters.columns = config.filters.columns.filter( f => columns.indexOf(f.key) >= 0 )
        config.filters.columns = config.filters.columns.map(f => {
          if(f.key === "unit_overlocked"){
            f.search = ["Remove Overlock"]
          }
          return f;
        })

        let r = new Report({ 
          name: "Spaces to Overlock", 
          type: "overlock", 
          format: 'web',
          filters: config.filters,
          connection: connection,
          company: company,
          properties: properties,
          template: "overlock"
        });

        await r.setUpReport();
        await r.generate();

        body = {
            type: 'generic',
            report_type: 'overlock',
            format: 'web',
            name: 'Spaces Overlock or Unlock',
            timeZone: 'America/Los_Angeles',
            property_id: 41,
            ...config.filters
        }
      
        report_data = {
          rows:  Hash.obscure(r.reportClass.data, req),
          columns: r.reportClass.columns,
          report_dates: r.reportClass.report_dates,
          result_count: r.reportClass.result_count
        }
        dataCount = r.reportClass.result_count * r.reportClass.columns.length;  
        body.type = 'generic';

      } else if (body.type === 'overlock_space') {
        newPdf = true;
        let company = res.locals.active;
        let report = new Report({
          company: company,
          template: "overlock",
        });
        report.setUpReport();
        await report.reportClass.parseConfig();
        let config = report.reportClass.getConfig();
        let columns = [
          'unit_number',
          'tenant_name',
          'unit_size',
          'unit_category',
          'lease_rent',
          'lease_days_late',
          'lease_balance',
          'lease_last_payment_date',
          'unit_overlocked', 
          'lease_paid_through_date'
        ]
        // "Remove Overlock",
        config.filters.columns = config.filters.columns.filter( f => columns.indexOf(f.key) >= 0 )
        config.filters.columns = config.filters.columns.map(f => {
          if(f.key === "unit_overlocked"){
            f.search = ["To Overlock"]
          }
          return f;
        })

        let r = new Report({
          name: "Spaces to Overlock", 
          type: "overlock", 
          format: 'web',
          filters: config.filters,
          connection: connection,
          company: company,
          properties: properties,
          template: "overlock"
        });

        await r.setUpReport();
        await r.generate();

        body = {
            type: 'generic',
            report_type: 'overlock',
            format: 'web',
            name: 'Spaces Overlock or Unlock',
            timeZone: 'America/Los_Angeles',
            property_id: 41,
            ...config.filters
        }
      
        report_data = {
          rows:  Hash.obscure(r.reportClass.data, req),
          columns: r.reportClass.columns,
          report_dates: r.reportClass.report_dates,
          result_count: r.reportClass.result_count
        }
        dataCount = r.reportClass.result_count * r.reportClass.columns.length;  
        body.type = 'generic';
      
      } else if (body.type === 'payment-processing') {
          newPdf = true;
          
          if(!body.property_id) e.th(400, "Please enter a property id ");
          if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
          if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

          report_data = await Report.paymentProcessing(connection, company.id, body.property_id, body.date, body.end_date);
          dataCount = report_data.length;
      } else if (body.type === 'payouts') {
        newPdf = true;
        
        if(!body.property_id) e.th(400, "Please enter a property id ");
        if(!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        report_data = await Report.payouts(connection, company.id, body.property_id, body.date, body.end_date);
        dataCount = report_data.length;
      } else if (body.type === 'coverage-details') {
        newPdf = true;
        
        if (!body.property_id) e.th(400, "Please enter a property id ");
        if (!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if (!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        report_data = await Report.coverageDetails(connection, [body.property_id], company.id, body.date, body.end_date);
        dataCount = report_data.length;
      } else if (body.type === 'manager-activity') {
        newPdf = true;
        
        if (!body.property_id) e.th(400, "Please enter a property id ");
        if (!body.date || !moment(body.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if (!body.end_date || !moment(body.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        report_data = await Report.managerActivity(connection, company.id, [body.property_id], body.date, body.end_date);
        dataCount = report_data.length;
    }

      console.log('Report type: ', body.type);
      console.log('Report Data: ', report_data);

      try {
        console.log("hashedPropertyId", hashedPropertyId)
        company.webLogo = await company.getWebLogoURL(hashedPropertyId);
      } catch(err){
        console.log("company.webLogo", company.webLogo); 
      }      
      // await PDF.generatePDF(connection, body, company, property, contact, token, report_data, data, dataCount, res, newPdf, next);
      return {connection, body, company, property, contact, token, report_data, data, dataCount, res, newPdf, next}
     

  }

  /**
   * This method creates a report based on the coverage's transactions
   * @param {Array}  propertyIDs A list of property IDs
   * @param {String} company_id local company ID
   * @param {String} start_date Date from which report to be generated
   * @param {String} end_date Date to which report to be generated
   */
  static async coverageDetails(connection, propertyIDs, company_id, start_date, end_date) {
    if (!company_id) e.th(400, 'Invalid company id');
    if (Array.isArray(propertyIDs) && !propertyIDs.length) e.th(400, "Invalid property id ");
    utils.dateRangeValidator(start_date, end_date, { isFutureCheck: true });
    return await models.Report.coverageDetails(connection, propertyIDs, company_id, start_date, end_date);
  }

  static async managerActivity(connection, company_id, property_ids, start_date, end_date) {
    if (!company_id) e.th(400, 'Invalid company id');
    return await models.ManagerActivity.fetchAll(connection, company_id, property_ids, start_date, end_date);
  }

}

module.exports = Report;


var Company      = require('../classes/company.js');
var User         = require('../classes/user.js');
var Property     = require('../classes/property.js');
var Contact      = require('../classes/contact.js');
const { start } = require('repl');
var express = require('express');
var router = express.Router();
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};
var Validate = require(__dirname + '/../modules/validation.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Occupancy = require(__dirname + '/../classes/reports/occupancy.js');
var ManagementSummary = require(__dirname + '/../classes/reports/managementSummary.js');
var DailyDeposits = require(__dirname + '/../classes/reports/dailyDeposits.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Payment = require(__dirname + '/../classes/payment.js');
var SpaceGroup = require(__dirname + '/../classes/space_groups.js');
var StaticReport = require(__dirname + '/../classes/static_report.js');
var TenantPaymentsApplication = require(__dirname + '/../classes/tenant_payments_applications');
const { type } = require('os');
const PDF = require('../classes/reports/report_formats/pdf');
const { report } = require('process');

var BaseReport = require(__dirname + '/../classes/reports/report_types/base_report.js');
const msrModels = require(__dirname + '/../models/msr');
const msr = require('../models/msr');
const Settings      = require('../classes/settings.js');



