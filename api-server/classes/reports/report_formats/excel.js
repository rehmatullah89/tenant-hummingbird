'use strict';
var Promise = require('bluebird');

var XLSX = require('xlsx');
var settings    = require(__dirname + '/../../../config/settings.js');
var utils    = require(__dirname + '/../../../modules/utils.js');
var models    = require(__dirname + '/../../../models');
var moment = require('moment');
var fs = require('fs');
var columnTypes = {
	date: 'd',
	string: 's',
	money: 'n',
	number: 'n'
}

var columnFormats = {
	date: 'd-mmm-yy',
	string: null,
	number: null,
	currency: '$0.00'
}
var columnStyles = {
	date: null,
	string: null,
	number: null,
	currency: null
}

class Excel {

	constructor(data, config, columns, name, custom_config) {
		this.wb = {};
		this.data = data;
		this.config = config;
		this.name = name;
		this.columns = columns;
		this.path = '';
    this.custom_config = custom_config || {}
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

	async create(){
		this.wb = {
      SheetNames: [this.config.name],
			Sheets: {}
		};
		var sheets = {};
		sheets[this.config.name] = {
			row: 1,
			ws: {}
		}

    // loop through columns

    // make sure they are in config.
    // output colums in order

    this.columns.map((c, i) => {
      sheets[this.config.name].ws[this.toColumnName(i+1) + '1'] = {
        v: c.label,
        t: 's',
      }
    });

		let total = {};

		for(let i = 0; i < this.data.length; i++){
      let d = this.data[i];
		  for(let j = 0; j < this.columns.length; j++){
        
		    let c = this.columns[j];

        // This change is made to customize the rent management reports that needs to be uploaded
        if (this.config?.custom_config?.add_style) {
          const workSheet = sheets[this.config.name].ws;
          let styleObj = {
            width: c.width || c.label.length,
            height: 15
          }
          this.addStyle(workSheet,i, j, styleObj)
        }
        //let c = this.config.column_structure.find(s=> s.key === col);
        
        let value =  this.formatCell(d,c);
        if(!value) continue;
        sheets[this.config.name].ws[XLSX.utils.encode_cell({ c: j, r: i+1   })] = {
          v: value,
          t: columnTypes[c.column_type],
          //z: columnFormats[c.column_type]
          //s: columnsStyles[c.column_type]
        };

        // add numbers, and count strings
        total[j] = +total[j] || 0;
        if(c.column_type === 'money' || c.column_type === 'number') {
          total[j] += +value
        } else {
          total[j]++
        }
      }

      if(Object.keys(total).length !== 0 && total.constructor === Object && !this.config.custom_config?.hide_count_row){
        for(let j=0; j < this.columns.length; j++){

            let c = this.columns[j];
            if(j > 0 && !total[j]) continue;
            sheets[this.config.name].ws[XLSX.utils.encode_cell({ c:j, r: this.data.length+2  })] = {
              v: i === 0 ? 'Total' : this.formatTotal(total[j],c),
              t: 'n'
            };
        }
      }
    }

    for (let i in this.wb.SheetNames) {

      this.wb.Sheets[this.config.name] = sheets[this.wb.SheetNames[i]].ws;
      this.wb.Sheets[this.config.name]['!ref'] = XLSX.utils.encode_range({
        s: {
          r: 0,
          c: 0
        },
        e: {
          r: this.data.length + 2,
          c: this.config.column_structure.length
        }
      });
    }
    if (!fs.existsSync(settings.config.base_path + 'documents/')){
      fs.mkdirSync(settings.config.base_path + 'documents/');
    }
    var filename = utils.slugify(this.name);

    this.path = settings.config.base_path + 'documents/' + filename + '.xlsx';
    console.log("WB", JSON.stringify(this.wb, null, 2));
    XLSX.writeFile(this.wb, this.path, {
      bookSST: false,
      bookType: "xlsx",
      compression: true
    });
    return true;


	}

  addStyle(workSheet,rowIndex, colIndex, style) {
    workSheet['!rows'] = workSheet['!rows'] || [];
    workSheet['!cols'] = workSheet['!cols'] || [];
    
    let customHeight = { hpt: style.height, hpx: style.height / 0.75, hidden: false, customHeight: true };
    workSheet['!rows'][0] = workSheet['!rows'][rowIndex + 1] = customHeight
    workSheet['!cols'][colIndex] = { wch: style.width };
  }
	// formatCell(data,col){
  //   //
  // 	// 	if(typeof col.format == 'undefined') return data[col.key];
  // 	// 	return col.format(data);
  // 	// }
  formatTotal(data,col){

    switch(col.column_type.toLowerCase()){
      case 'money':

        return Math.round(+data * 1e2) /1e2;
      case 'number':
        return data;
      default:
        return data;
    }
  }
  formatCell(data,col){

    let type = col.column_type.toLowerCase()
    if(type !== 'address') {
      data = data[col.key]
    }
    switch(type){

      case 'money':
        return  Math.round(+data * 1e2) /1e2;
        break;
      case 'number':
        return +data;
        break;
      case 'phone':
        return utils.formatPhone(data);
        break;
      case 'ssn':
        return utils.formatSSN(data);
        break;

      case 'date':
        return utils.formatDate(data);
        break;
      case 'boolean':
        return data ? 'Y' : 'N';
        break;
      case 'address':
        let root = col.key.substring(0, col.key.lastIndexOf('_'));
        let address = data[root + '_address'] || ''

        if(data[root + '_address2']) address += ' #' + data[root + '_address2'];
        if(data[root + '_city'] || data[root + '_state'] || data[root + '_country'] || data[root + '_zip']){
            if(data[root + '_city']) address += data[root + '_city'] + ' ';
            if(data[root + '_state']) address += data[root + '_state'] + ' ';
            if(data[root + '_country']) address += data[root + '_country'] + ' ';
            if(data[root + '_zip']) address += data[root + '_zip'];
        }
        return address;
        break;
      case 'string':
      case 'status':
      case 'text':
      case 'concat':
      default:
        return data;
        break;


    }
  }

  async generateTemplate(){
    this.wb = {
      SheetNames: [this.config.name],
      Sheets: {}
    };
    var sheets = {};
    sheets[this.config.name] = {
      row: 1,
      ws: {}
    }
    this.config.cols.map((c, i) => {
      sheets[this.config.name].ws[this.toColumnName(i+1) + '1'] = {
        v: c.label,
        t: 's',
      }
    })

    for (var i in this.wb.SheetNames) {
      this.wb.Sheets[this.config.name] = sheets[this.wb.SheetNames[i]].ws;
      this.wb.Sheets[this.config.name]['!ref'] = XLSX.utils.encode_range({
        s: {
          r: 0,
          c: 0
        },
        e: {
          r: this.data.length,
          c: this.config.cols.length
        }
      });
    }

    return XLSX.write(this.wb, {
      bookType: 'xlsx',
      type: 'buffer'
    });
  }

  static async validateSpreadsheet(file,connection){
    let accounts = [];
    let categories = await models.GlAccounts.findAllCategories(connection);

    const dt = await XLSX.readFile(file, {});
    const first_worksheet = dt.Sheets[dt.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(first_worksheet, { header: 1 });
    const unique_accounts = Array.from(new Set(data.map(JSON.stringify)), JSON.parse);
    const raw_data = unique_accounts.slice(1);
    
    for(let row of raw_data){
      if(!row || !row.length) continue;
      
      let o = Object.assign({});
      o.code = row[0].toString() || null;
      o.name = row[1] || null;

      let selected_category = categories.find(x => x.name === row[2]);
      o.category_id = selected_category? selected_category.id: null;
      o.category = selected_category? selected_category.name: null;
      
      if(o.category_id){
        let account_types = await models.GlAccounts.findTypesByCategoryId(connection,o.category_id);
        let selected_account = account_types.find(x => x.name === row[3]);
        o.account_type_id = selected_account? selected_account.id : null;
        o.account_type = selected_account? selected_account.name : null;
      }else{
        o.account_type_id = null;
      }

      if(o.category_id && o.account_type_id){
        let account_sub_types = await models.GlAccounts.findSubTypesByAccountTypeId(connection,o.account_type_id);
        let selected_subtype = account_sub_types.find(x => x.name === row[4])
        o.account_subtype_id = selected_subtype? selected_subtype.id : null;
        o.account_subtype = selected_subtype? selected_subtype.name : null;
      }else{
        o.account_subtype_id = null;
      }

      o.is_group = 0;
      accounts.push(o);
    }
    return accounts;
  }
}



module.exports = Excel;
