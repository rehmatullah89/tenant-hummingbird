'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class PotentialActualRent extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	generateData(){

		this.setConditions();
		if(this.format === 'web'){
			this.setLimit();
		}


		var properties = {
		};
		var unit_ids = [];

		var actualRent = [];
		var potentialRent = [];


		return models.Property.findByCompanyId(this.connection, this.company.id)
			.map(p => {
				return models.Address.findById(this.connection, p.address_id).then(a => {
					//p.address = a;
					properties['property_' + p.id] = {
						address: a,
						actualRent: [],
						potentialRent: [],
					};
					return;
				})
			})
			.then(() => models.ReportQueries.actualRent(this.connection, this.conditions, this.searchParams, this.company.id, false)).map(data => {
				unit_ids.push(data.unit_id);
				console.log(data);
				properties['property_' + data.property_id].actualRent.push(data.cost);

			})
			.then(() => {
				this.conditions.unit_id = unit_ids.join(', ');
				return models.ReportQueries.vacancyRent(this.connection, this.conditions, this.searchParams, this.company.id, false).map(data => {
					properties['property_' + data.property_id].potentialRent.push(data.price);
					return true;
				})
			})
			.then(() => {

				this.data = Object.keys(properties).map(key => {
					var p = properties[key];
					

					return {
						address: p.address.address + ' ' + p.address.city + ' ' + p.address.state + " " + p.address.zip,
						actual_rent: p.actualRent.reduce((a, b) => a + b, 0),
						potential_rent: p.potentialRent.reduce((a, b) => a + b, 0)
					}
				});

			})

	}
	generateCount(){

	}
	setConditions(){
		this.conditions.product_id = this.filters.search.product_id  || null;
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/potential_actual_rent.js');
module.exports = PotentialActualRent;
