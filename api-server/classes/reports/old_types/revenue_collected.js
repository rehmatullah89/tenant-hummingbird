'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class RevenueCollected extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	generateData(){

		this.setConditions();
		if(this.format === 'web'){
			this.setLimit();
		}
		return models.ReportQueries.revenueCollected(this.connection, this.conditions, this.searchParams, this.company.id, false).map(data => {
			return {
				address: data.address,
				revenue: Math.round((data.amount - data.refunds) * 1e2)/1e2
			}
		}).then(data => {

			var grouped = this.groupByArray(data, 'address');

			this.data = grouped.map(g => {
				return {
					address: g.key,
					revenue: g.values.reduce((a, b) => a + b.revenue, 0)
				}
			});
			return;
		})


	}
	generateCount(){
		models.ReportQueries.revenueCollected(this.connection, this.conditions, this.searchParams, this.company.id, false).then(r => r.length);
	}
	setConditions(){
		this.conditions.product_id = this.filters.search.product_id  || null;
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/revenue_collected.js');
module.exports = RevenueCollected;
