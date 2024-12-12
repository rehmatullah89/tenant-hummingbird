'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class InvoiceHistory extends BaseReport{
	constructor(connection, company, filters, format) {
		super(connection, company, filters, format);
		this.config = config;
	}

	async generateData() {

		this.setConditions();

		if (this.format === 'web') {
			this.setLimit();
		}


		this.data = await models.Invoice.search(this.connection, this.conditions, this.searchParams, this.company.id, false)
	}

	async generateCount(){
		let count = await models.Invoice.search(this.connection, this.conditions, null, this.company.id, false);
		this.result_count = count.length;
	}

	setConditions() {
		super.setConditions();
		if(this.filters.search.lease_id){
			this.conditions.lease_id = this.filters.search.lease_id;
		}
	}
}




var config = require(__dirname + '/../report_layouts/invoice_history.js');
module.exports = InvoiceHistory;
