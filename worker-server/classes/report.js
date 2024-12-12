"use strict";

var models  = require(__dirname + '/../models');
var reportTypes  = require(__dirname + '/reports/report_types/index.js');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var XLSX = require('xlsx');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var rp = require('request-promise');


class Report {
	constructor(data) {
		this.name = data.name;
		this.data = [];
		this.type = data.type;
		this.connection = data.connection;
		this.company = data.company;
		this.format = data.format;
		this.filters = data.filters;
		this.reportClass = {};
		
		if(!this.type || !reportTypes[this.type]){
			e.th(500, 'Invalid report type');
		}
		this.setUpReport();
		return true;

	}
	setUpReport(){

		if(!this.type || !reportTypes[this.type]){
			e.th(500, 'Invalid report type');
		}
		
		this.reportClass = new reportTypes[this.type](this.connection, this.company, this.filters, this.format);
	}
	
	generate(){
		if(!this.reportClass){
			e.th(500, 'Report not configured');
		}
		return this.reportClass.generateData().then(() => {
			if(this.format === 'web'){
				return this.reportClass.generateCount();
			}

			if(this.format === 'excel') {
				// Should create the file and set the path
				return this.reportClass.generateExcel()
			}
			if(this.format === 'pdf') {
				// Should create the file and set the path
				return this.reportClass.generatePdf()
			}
			if(['quickbooks','yardi','sageintacct','charges_detail','yardifinancialjournal','yardi-financial-journal-ipp'].indexOf(this.format) > -1) {
				// Should create the file and set the path
				return this.reportClass.generateCSV()
			}
			if(this.format === 'iif' || 'iifQuickbooks') {
				// Should create the file and set the path
				return this.reportClass.generateIIF()
			}
			
		});


	}
	
	create(){

		
	}

	static async updateSavedReportsOfCompany(connection,hb_company_id,cid){
		try{
			let saved_reports =  await models.Report.findSavedReportsByCompanyId(connection,hb_company_id);
			let updated_reports = [];
			for(let i=0; i<saved_reports.length; i++){
				let id = saved_reports[i].id;
				let old_filters = JSON.parse(saved_reports[i].filters);
				let updated_filters = JSON.stringify(Hash.updateIds(old_filters,cid));
				let data = {
					filters: updated_filters
				}
				await models.Report.updateSavedReportsOfCompany(connection,data,id);
				updated_reports.push({
					name: saved_reports[i].name,
					id: saved_reports[i].id
				});
			}
			return updated_reports;
		} catch(err){
			e.th(500, err)
		}
	}

	// Added by BCT Team for share report poc
	static async generatePDF({body, company, property, contact, report_data, data, newPdf}){

		if (newPdf) {
		  let url = `${process.env.PDF_GENERATOR_ENDPOINT || 'http://pdf'}`;
			url +=  `:${process.env.PDF_PORT || ':3003'}`;
			url += '/v2/';
	
		  url += body.type;
		  
		  let _data = {
			data: report_data,
			name: body.name,
			type: body.type,
			report_type: body.report_type,
			timeZone: body.timeZone,
			property,
			start_date: body.date,
			end_date: body.end_date,
			company	
		  }
		  
		  //console.log(_data, _data.data)
		  
		  var options = {
			uri: url,
			json: true,
			method: 'POST',
			body: _data
		  };
		  try {		          
			  var pdf = await rp(options);
			
			  if(pdf.status) {
				data = pdf.data;
				console.log('data', data);
			  } else {
				e.th(400, "500: Error occured while generating report");
			  }		
		  } catch(err){
			console.error("API__ERROR____",err);
			e.th(500, err)
		  }
		} 
		  
		  return data;
	
	  }

	static async findScheduleExportsByMinPropertyOffset(connection, payload) {
		return await models.Report.findScheduleExportsByMinPropertyOffset(connection, payload);
	}
}

module.exports = Report;
