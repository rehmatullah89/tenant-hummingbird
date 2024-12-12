'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var moment = require('moment');
var models = require(__dirname + '/../../../models');
var settings    = require(__dirname + '/../../../config/settings.js');
var Invoice = require(__dirname + '/../../../classes/invoice.js');

var Hash = require(__dirname + '/../../../modules/hashes.js');
var Hashes = Hash.init();

// const puppeteer = require('puppeteer');
var request = require("request");
var fs = require('fs');
var rp = require('request-promise');
var pdf = require('html-pdf');


var requestOptiosn = {
	uri: 'http://www.google.com',
	encoding: null
};

class InvoiceReport extends BaseReport{

	constructor(connection, company, filters, format) {
		super(connection, company, filters, format);
	}

	setTimeframes(){
		return true;
	}

	setSort(){
		return true;
	}
	generateData(){

		var invoice = new Invoice({id: this.filters.id});
		return invoice.find(this.connection)
			.then(() => invoice.verifyAccess(this.connection, this.company.id))
			.then(() => invoice.total())
			.then(() => {
				this.data = invoice;
				return;
			})
	}

	// Should create the file and set the path
	generatePdf(){

		var filename = "invoice_" + moment().format('x');
		this.path = settings.config.base_path + 'documents/' + filename + '.pdf';

		// TODO resolve address to pdf-generator
		var options = {
			uri: "http://10.0.65.22:3000/download-invoice/" +  Hashes.encode(this.filters.id),
			encoding: null
		};


		this.endpoint = 'http://sandbox.leasecaptain.xyz/reports/web/invoice/' + this.filters.id;
		return rp(options);
	}

}


module.exports = InvoiceReport;
