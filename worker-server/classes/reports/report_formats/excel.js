'use strict';
var Promise = require('bluebird');

var XLSX = require('xlsx');
var settings    = require(__dirname + '/../../../config/settings.js');
var utils    = require(__dirname + '/../../../modules/utils.js');
var moment = require('moment');
var fs = require('fs');
var columnTypes = {
	date: 'd',
	string: 's',
	currency: 'n',
	number: 'n'
}

var columnFormats = {
	date: 'd-mmm-yy',
	string: null,
	number: null,
	currency: '$0.00',
}
var columnStyles = {
	date: null,
	string: null,
	number: null,
	currency: null
}

class Excel {
	constructor(data, config) {
		this.wb = {};
		this.data = data;
		this.config = config;
		this.name = '';
		this.path = '';
		
	}

	/**
	 * Takes a positive integer and returns the corresponding column name.
	 * @param {number} num  The positive integer to convert to a column name.
	 * @return {string}  The column name.
	 */

	toColumnName(num) {
		for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
			ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
		}
		return ret;
	}

	create(csv,isBuffer,tsv=false){
			this.wb = {
				SheetNames: [this.config.name],
				Sheets: {}
			};
			var sheets = {};
			sheets[this.config.name] = {
				row: 1,
				ws: {}
			}
			
			let dataStartingIndex = 1;
			if(this.config.fileHeader) {
				sheets[this.config.name].ws['A1'] = { v: this.config.fileHeader, t: 's' };
				dataStartingIndex = 2;
			}

			this.config.cols.map((c, i) => {
				sheets[this.config.name].ws[this.toColumnName(i+1) + dataStartingIndex] = {
					v: c.label,
					t: 's',
				}
			})


		// "A1": { v: 'Address', t: 's' },
		// "B1": { v: 'Product Name', t: 's' },
		// "C1": { v: 'Cost', t: 's' },
		// "D1": { v: 'Billing Period Start', t: 's' },
		// "E1": { v: 'Billing Period End', t: 's' },
		// "F1": { v: 'Invoice Date', t: 's' },
		// "G1": { v: 'Invoice Number', t: 's' }


		return Promise.mapSeries(this.data, (d, j) => {

			return Promise.mapSeries(this.config.cols, (c, i) => {
				if(!d[c.key]) return;
				// if((d.credit_debit_type === 'credit' && c.key === 'amount' && d[c.key] > 0 ) || (c.key === 'credit' && d[c.key] > 0)){
				// 	d[c.key] *= -1;
				// }
				sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:i, r:j + (this.config.noHeader? dataStartingIndex - 1 : dataStartingIndex)   })] = {
					v: this.formatCell(d,c),
					t: this.getCellType(d,c),
					z: c.column_format || columnFormats[c.column_type]
					//s: columnsStyles[c.column_type]
				};
				return true;
			})






			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:0, r:i+1   })] = {
			// 	v: d.address + ' #' + d.unit_number + ', ' + d.city + ' ' + d.state + ' ' + d.zip,
			// 	t: 's'
			// };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:1, r:i+1   })] = { v: d.name, t: 's' };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:2, r:i+1   })] = { v: d.cost, t: 's' };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:3, r:i+1   })] = { v: moment(d.start_date,'YYYY-MM-DD').format('MM/DD/YYYY'), t: 's' };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:4, r:i+1   })] = { v: moment(d.end_date,'YYYY-MM-DD').format('MM/DD/YYYY'), t: 's' };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:5, r:i+1   })] = { v: moment(d.invoice_date,'YYYY-MM-DD').format('MM/DD/YYYY'),  t: 's' };
			// sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:6, r:i+1   })] = { v: d.invoice_number, t: 's' };



		}).then(() => {

			for (var i in this.wb.SheetNames) {
				this.wb.Sheets[this.config.name] = sheets[this.wb.SheetNames[i]].ws;
				this.wb.Sheets[this.config.name]['!ref'] = XLSX.utils.encode_range({
					s: {
						r: 0,
						c: 0
					},
					e: {
						r: this.data.length + (this.config.fileHeader ? 1 : 0),
						c: this.config.cols.length
					}
				});
			}
			var filename = this.config.filename + "_" + moment().format('x');
			if (!fs.existsSync(settings.config.base_path + 'documents/')){
				fs.mkdirSync(settings.config.base_path + 'documents/');
			}
			if(isBuffer){
				if(tsv) {
					let str = XLSX.utils.sheet_to_csv(this.wb.Sheets[this.config.name],{FS:'\t'});
					return Buffer.from(str);
				} else {
					return XLSX.write(this.wb, {
						bookType: csv ? 'csv': 'xlsx',
						type: 'buffer'
					});
				}
			}else{
				this.path = settings.config.base_path + 'documents/' + filename + (csv ? '.csv': '.xlsx');
				XLSX.writeFile(this.wb, this.path, {
					bookSST: false,
					bookType: csv ? 'csv': 'xlsx',
					compression: true
				});
				return true;
			}
		})
		



	}

	formatCell(data,col){
		if(typeof col.format == 'undefined') return data[col.key];
		if(!data[col.key]) return null;
		return col.format(data);
	}

	getCellType(data,col) {
		if(col.column_type === 'date2') {
			return moment(data[col.key]).isValid() ? 'd':'s';
		} else {
			return columnTypes[col.column_type];
		}
	}
}



module.exports = Excel;