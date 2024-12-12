'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class RevenueCollectedByPaymentType extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	generateData(){

		this.setConditions();
		if(this.format === 'web'){
			this.setLimit();
		}


		var container = {};



		return models.ReportQueries.revenueCollectedByPaymentType(this.connection, this.conditions, this.searchParams, this.company.id, false).map(data => {
			container[data.method] = container[data.method] || {};
			container[data.method][data.payment_method] = container[data.method][data.payment_method] || 0;
			container[data.method][data.payment_method] += (data.amount - data.refunds);

			return;

		}).then(() => {

			for(var payment_type in container){
				for(var payment_method in container[payment_type]){
					this.data.push({
						payment_type: payment_type || null,
						payment_method: payment_method,
						revenue: Math.round(container[payment_type][payment_method] * 1e2) / 1e2,
					})
				}
			}

			return;
		})


	}
	generateCount(){
		models.ReportQueries.revenueCollectedByPaymentType(this.connection, this.conditions, this.searchParams, this.company.id, false).then(r => r.length);
	}
	setConditions(){
		this.conditions.product_id = this.filters.search.product_id  || null;
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/revenue_collected_by_payment_type.js');
module.exports = RevenueCollectedByPaymentType;
