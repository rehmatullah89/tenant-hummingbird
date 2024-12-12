'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class BilledProducts extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	async generateData(){

		this.setConditions();

		if(this.format === 'web'){
			this.setLimit();
		}

		this.data = await models.Invoice.findBilledProductsByCompanyId(this.connection, this.conditions, this.searchParams, this.company.id, false);

	}
	generateCount(){
		return models.Invoice.findBilledProductsByCompanyId(this.connection, this.conditions, null, this.company.id, true).then(count => {
			this.result_count = count[0].count;
			return true;

		})
	}
	setConditions(){
		this.conditions.product_id = this.filters.search.product_id  || null;
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/billed_products.js');
module.exports = BilledProducts;
