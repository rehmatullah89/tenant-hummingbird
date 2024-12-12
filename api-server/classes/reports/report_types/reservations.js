'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');


class Reservation extends BaseReport{
	constructor(connection, company, filters, format) {
		super(connection, company, filters, format);
		this.config = config;
	}

	async generateData(){
		super.generateData();

		this.data = await models.Reservation.search(this.connection, this.conditions, this.searchParams, this.company.id, false);

	}

	async generateCount(){

		let count = await models.Reservation.search(this.connection, this.conditions, null, this.company.id, true);
		this.result_count = count[0].count;
	}

}


var config = require(__dirname + '/../report_layouts/reservations.js');
module.exports = Reservation;
