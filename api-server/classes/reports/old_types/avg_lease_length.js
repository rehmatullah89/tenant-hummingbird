'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var moment = require('moment');
var models = require(__dirname + '/../../../models');

class AvgLeaseLength extends BaseReport{
	constructor(connection, company, filters, format) {
		super(connection, company, filters, format);
		this.config = config;
	}

	generateData(){

		this.setConditions();

		if(this.format === 'web'){
			this.setLimit();
		}
		var today = moment();

		var property_breakdown = {};

		return models.Lease.findAllByCompanyId(this.connection, this.company.id).map(lease => {

			property_breakdown[lease.property_id] = property_breakdown[lease.property_id] || {
					address: lease.address + ' ' + lease.city + ' ' + lease.state + ' ' + lease.zip,
					count: 0,
					length_of_stay: 0
				};


			var lease_start = moment(lease.start_date, 'YYYY-MM-DD').startOf('day');
			var lease_end = lease.end_date ? moment(lease.end_date, 'YYYY-MM-DD').startOf('day') : moment().startOf('day');

			var length_of_stay = lease_end.diff(lease_start, 'months');



			property_breakdown[lease.property_id].length_of_stay += length_of_stay;
			property_breakdown[lease.property_id].count++;

			console.log(lease.id);
			console.log(length_of_stay);
			console.log(property_breakdown[lease.property_id].count);

			return lease;
		}).then(leases => {



			for(var property_id in property_breakdown){
				this.data.push({
					address: property_breakdown[property_id].address,
					num_leases: property_breakdown[property_id].count,
					avg_months: property_breakdown[property_id].length_of_stay /  property_breakdown[property_id].count
				})
			}

			return true;

		})

	}

	setConditions(){
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/avg_lease_length.js');
module.exports = AvgLeaseLength;