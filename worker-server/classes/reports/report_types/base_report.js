"use strict";
var Promise     = require('bluebird');
var moment      = require('moment');
var Excel       = require(__dirname + '/../report_formats/excel.js');



class BaseReport {
	constructor(connection, company, filters, format) {
		this.wb = {};
		this.data = [];

		this.config = {};
		this.result_count = 0;
		this.filters = filters;
		this.format = format;
		this.connection = connection;
		this.company = company;
		this.columns = {};
		this.conditions = {
			timeframe: {
				start: null,
				end: null
			}
		};
		this.path = '';
		this.searchParams = {
			sort: {
				field: null,
				dir: null
			},
			limit: null,
			offset: 0

		};
		this.setSort();
		this.setTimeframes();
	}

	generateData(){
		return Promise.resolve();
	}

	generateCount(){
		return Promise.resolve();
	}

	setSort(){
		if(!this.filters.sort) return;
		this.searchParams.sort =  this.filters.sort.field;
		this.searchParams.sortdir =  this.filters.sort.dir || 'ASC';
		return true;

	}

	setLimit(){
		this.searchParams.limit =  this.filters.sort.limit || 25;
		this.searchParams.offset =  this.filters.offset || 0;
		return true;
	}

	setTimeframes(){

		if(!this.filters.search.timeframe) return;
		var tf = this.filters.search.timeframe;
		var today = moment();
		switch(tf.toLowerCase()){
			case 'today':
				this.conditions.timeframe.start = moment().startOf('day');
				this.conditions.timeframe.end = moment().endOf('day');
				break;
			case 'yesterday':
				this.conditions.timeframe.start = moment().subtract(1, 'day').startOf('day');
				this.conditions.timeframe.end = moment().subtract(1, 'day').endOf('day');
				break;
			case 'last 7 days':
				this.conditions.timeframe.start = moment().subtract(6, 'day').startOf('day');
				this.conditions.timeframe.end = moment().endOf('day');
				break;
			case 'last 30 days':
				this.conditions.timeframe.start = moment().subtract(29, 'day').startOf('day');
				this.conditions.timeframe.end = moment().endOf('day');
				break;
			case 'this month':
				this.conditions.timeframe.start = moment().startOf('month');
				this.conditions.timeframe.end = moment().endOf('day');
				break;
			case 'year to date':
				this.conditions.timeframe.start = moment().startOf('year');
				this.conditions.timeframe.end = moment().endOf('day');
				break;
			case 'custom range':
				this.conditions.timeframe.start = this.filters.search.start_date ? moment(this.filters.search.start_date).startOf('day'): null;
				this.conditions.timeframe.end = this.filters.search.end_date  ? moment(this.filters.search.end_date).endOf('day'): null;
				break;
			case 'all time':
				break;
		}
		return true;
	}


	// Should create the file and set the path
	generateExcel(){


		var excel = new Excel(this.data, this.config);
		return excel.create().then(() => {
			this.path = excel.path;
		
			return true;
		})
	}

	generateCSV(){
		var excel = new Excel(this.data, this.config);
		let csv = true;
		let isBuffer = true;
		return excel.create(csv,isBuffer).then((buffer) => {
			this.path = excel.path;
		
			return buffer;
		})
	}

	generatePdf(){

	}

	generateIIF(){
		var excel = new Excel(this.data, this.config);
		let tsv = true;
		let isBuffer = true;
		return excel.create(false,isBuffer,tsv).then((buffer) => {
			return buffer;
		})
	}
}



module.exports = BaseReport;
