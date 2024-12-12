"use strict";
var Promise     = require('bluebird');
var moment      = require('moment');
var Excel       = require(__dirname + '/../report_formats/excel.js');
var PDF       = require(__dirname + '/../report_formats/pdf.js');
var e  = require(__dirname + '/../../../modules/error_handler.js');
var pivot  = require(__dirname + '/../../../modules/pivot.js');
var utils  = require(__dirname + '/../../../modules/utils.js');
var Hash = require('../../../modules/hashes.js');
var Hashes = Hash.init();

class BaseReport {

  constructor(connection, company, filters, format, name, properties = [], report_name, current_date = null) {
		this.wb = {};
		this.data = [];

    this.name = name;
    this.report_name = report_name;
		this.config = {};
		this.result_count = 0;
		this.total_count = 0;
		this.filters = filters;
		this.format = format;
		this.connection = connection;
		this.company = company;
		this.properties = properties;
    // general column properties for all columns
    this.common_column_definitions = {}

		this.columns = filters && filters.columns || [];
		this.pivot_columns = [];

    this.sql_tables = ' FROM ';
    this.sql_columns_array = [];
    this.sqlColumnsObject = { }
		this.sql_columns = 'SELECT ';
    this.sql_conditions = '';
    this.sql_having_conditions = '';
    this.sql = '';
    this.sql_params = '';
    this.group_sql = '';
    this.current_date = current_date || null;

    this.report_dates = this.getTimeframeDates(filters && filters.search && filters.search.report_period);


		this.groups = [];
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

		this.default_structure_obj = {
      label: "",
      key: "",
      sortable: true,
      width: 150,
      column_type: 'string',
      agg_method: 'Count',
      format: "",
      fixed: false,
      input: 'text',
      options: [],
      search: ''
    }


    this.comparisons = {
      'greater than': '>',
      'less than': '<',
      'equals': '=',
      'not equals': '!=',
      'greater than or equals': '>=',
      'less than or equals': '<=',
      'Between': "<>"
    }


    this.config = {
      name: '',
      filename: '',
      column_structure: [],
      filter_structure: [],
      filters: {
        search: {
          search: ''
        },
        columns:[],
        sort: {},
        pivot_mode: {
          type: '',
          column: {},
          row: {},
          pivot_field: {},
          agg_method: '',
        },
        groups:[],
        limit: 0,
        page:1,
        offset:0
      },
      default_columns:[]
    }

		// if(this.filters){
      // this.setColumns(this.filters.columns);
      // this.setGroups(this.filters.groups);
			// this.setSort();
			//this.setTimeframes();
		// }
	}

  async generateData(){

    if(this.format === 'web'){
      this.setLimit();
    }

    //this.setTimeframes();

    if(this.groups.length) {
      this.searchParams.limit = null;
    }
    let d1 = new Date();
    let time1 = d1.getTime();
    this.data = await this.search(this.connection, this.columns, this.conditions, this.searchParams, this.group_sql, this.config.filter_structure, this.sql_fragments );
    let d2 = new Date();
    let time2 = d2.getTime();

  }

	async generateCount(){
    if(this.filters.pivot_mode.type ==='group'){
      this.result_count = await this.countRowGrouping(this.connection);
    } 
    else if(this.filters.pivot_mode.type ==='pivot'){
      this.result_count = await this.countPivot(this.connection);
    }
    else {
      this.result_count =  await this.count(this.connection, this.columns, this.conditions, this.searchParams, this.group_sql, this.config.filter_structure );
    }
	}

  // BCT: Total count
  async generateTotalCount(){
    this.total_count =  await this.count(this.connection);
  }

	setLimit(){
		this.searchParams.limit =  this.filters.limit;
		this.searchParams.offset =  this.filters.offset || 0;
		return true;
	}

  // setGroups(groups, columns, configuration){
  //   for(let i=0; i < groups.length; i++){
  //     if(!groups[i]) continue;
  //     let gr = configuration.column_structure.find(s => {
  //       return s.key === groups[i] && columns.find(c => c == groups[i])
  //     });
  //     if(!gr) continue;
  //     this.groups.push(gr);
  //   }
  // }

  getTimeframeDates(timeframe){

    if(!timeframe || !timeframe.label){
      return {
        start: null,
        end: moment().endOf('day').format('YYYY-MM-DD')
      }
    }

    let { label, start_date: custom_start_date, end_date: custom_end_date, current_date } = timeframe;
    current_date =  current_date || this.current_date || moment().format('YYYY-MM-DD');

    switch(label.toLowerCase()) {
      case 'today':
        return {
          start: moment(current_date).startOf('day').format('YYYY-MM-DD'),
          end: moment(current_date).endOf('day').format('YYYY-MM-DD')
        }
      case 'yesterday':
        return {
          start: moment(current_date).subtract(1, 'day').startOf('day').format('YYYY-MM-DD'),
          end: moment(current_date).subtract(1, 'day').endOf('day').format('YYYY-MM-DD')
        }
      case 'last 7 days':
        return {
          start: moment(current_date).subtract(6, 'day').startOf('day').format('YYYY-MM-DD'),
          end: moment(current_date).endOf('day').format('YYYY-MM-DD')
        }
      case 'last 30 days':
        return {
          start: moment(current_date).subtract(29, 'day').startOf('day').format('YYYY-MM-DD'),
          end: moment(current_date).endOf('day').format('YYYY-MM-DD')
        }
      case 'this month':
        return {
          start: moment(current_date).startOf('month').format('YYYY-MM-DD'),
          end: moment(current_date).endOf('day').format('YYYY-MM-DD')
        }
      case 'last month':
        return {
          start: moment(current_date).subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
          end: moment(current_date).subtract(1, 'month').endOf('month').endOf('day').format('YYYY-MM-DD')
        }
      case 'year to date':
        return {
          start: moment(current_date).startOf('year').format('YYYY-MM-DD'),
          end: moment(current_date).endOf('day').format('YYYY-MM-DD')
        }
      case 'custom date':
      case 'custom range':
        return {
          start: custom_start_date ? moment(custom_start_date).startOf('day').format('YYYY-MM-DD') : '',
          end: custom_end_date ? moment(custom_end_date).endOf('day').format('YYYY-MM-DD') : ''
        }

      default:
        return {
          start: null,
          end: moment().endOf('day').format('YYYY-MM-DD')
        }

        break;
    }
  }

	setTimeframes(search, fragment, converToDate = true){
    if(!search.label) return '';
    fragment = converToDate? ' DATE(' + fragment + ") ": " (" + fragment + ") ";
    let current_date = this.current_date || moment().format("YYYY-MM-DD");
    if(!this.property_id) console.error("property_id is not defined in",this.config.name);
    const utc_offset = `SELECT utc_offset FROM properties where id = ${this.property_id}`;
		const today = `DATE_FORMAT(CONVERT_TZ(NOW() , "+00:00", (${utc_offset})) ,"%Y-%m-%d")`;
    const yesterday = `DATE_FORMAT(CONVERT_TZ(DATE_SUB(NOW(), INTERVAL 1 DAY) , "+00:00", (${utc_offset})) ,"%Y-%m-%d")`;
    const sevenDays = `DATE_FORMAT(CONVERT_TZ(DATE_SUB(NOW(), INTERVAL 6 DAY) , "+00:00", (${utc_offset})) ,"%Y-%m-%d")`;
    const thirtyDays = `DATE_FORMAT(CONVERT_TZ(DATE_SUB(NOW(), INTERVAL 29 DAY) , "+00:00", (${utc_offset})) ,"%Y-%m-%d")`;
    const monthStart = `DATE_FORMAT(CONVERT_TZ(NOW() , "+00:00", (${utc_offset})) ,"%Y-%m-01")`;
    const yearStart = `DATE_FORMAT(CONVERT_TZ(NOW() , "+00:00", (${utc_offset})) ,"%Y-01-01")`;
    const lastMonthStart = `DATE_FORMAT(CONVERT_TZ(NOW() , "+00:00", (${utc_offset})) ,CONCAT("%Y-", MONTH( DATE_SUB(CONVERT_TZ(NOW() , "+00:00", (${utc_offset})),INTERVAL 1 MONTH )) ,"-01"))`;
		const lastMonthEnd = `LAST_DAY(${lastMonthStart})`;
    
    switch(search.label.toLowerCase()){
			case 'today':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${today}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${today}`}`;
			case 'yesterday':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${yesterday}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${yesterday}`}`;
			case 'last 7 days':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${sevenDays}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${today}`}`;
			case 'last 30 days':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${thirtyDays}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${today}`}`;
			case 'this month':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${monthStart}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${today}`}`;
      case 'last month':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${lastMonthStart}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${lastMonthEnd}`}`
			case 'year to date':
        return ` and ${fragment} >= ${this.current_date ? `'${this.report_dates.start}'` : `${yearStart}`} and ${fragment} <= ${this.current_date ? `'${this.report_dates.end}'` : `${today}`}`
			case 'custom range':
			  if(search.start_date && search.end_date) {
          return " and " + fragment + " >= '" + moment(search.start_date).startOf('day').format('YYYY-MM-DD') + "' and " + fragment + " <= '" +   moment(search.end_date).endOf('day').format('YYYY-MM-DD') + "' ";
        }
			  if(search.start_date) {
          return " and " + fragment + " >= '" + moment(search.start_date).startOf('day').format('YYYY-MM-DD') + "' ";
        }
			  if(search.end_date) {
          return " and " + fragment + " <= '" + moment(search.end_date).endOf('day').format('YYYY-MM-DD') + "' ";
        }
			  return  '';
      // case 'days':
      //   if(['<', '=', '>'].indexOf(search.period) < 0 ) return '';
      //   let date_str = '';
      //   if(search.relation.toLowerCase() === 'ago') {
      //     date_str = ' DATE_SUB(CURDATE(), INTERVAL ' + parseInt(search.days) + ' DAY ) ';
      //   } else if(search.relation.toLowerCase() === 'in the future'){
      //     date_str = ' DATE_ADD(CURDATE(), INTERVAL ' + parseInt(search.days) + ' DAY ) ';
      //   } else {
      //     return '';
      //   }
      //   return " and (" + sql_fragments[c] + ") " + search.period + date_str;
			case 'all time':
        return  '';
				break;
		}

		return true;
	}

	// Should create the file and set the path
	generateExcel(){

		var excel = new Excel(this.data, this.config, this.columns, this.name);

		return excel.create().then(() => {
		  console.log("excel.path", excel);
			this.path = excel.path;
			return true;
		})
	}

	generatePdf(company_name){
    var pdf = new PDF(this.data, this.config, this.columns, this.name,this.report_name);

    return pdf.create(company_name).then(() => {
      this.path = pdf.path;
      return true;
    })
	}

  setGroupSql(groups){
    if(!groups.length) return;
    this.group_sql = " group by " + groups.join(', ') ;
  }

	getConfig(){
		return this.config;
	}

  // Config is set from the report type layout
	parseConfig(){

    if(!this.config.column_structure) e.th(500, "No column structure defined for this report");

    // set column structure
    for(let i = 0; i < this.config.column_structure.length; i++){

      this.config.column_structure[i] = {...this.default_structure_obj, ...this.config.column_structure[i] };
      this.config.column_structure[i].search = this.getDefaultSearch(this.config.column_structure[i]);
      if(this.config.default_columns.indexOf(this.config.column_structure[i].key) >= 0){

        let config = {
          key: this.config.column_structure[i].key,
          width: this.config.column_structure[i].width || 150,
          label: this.config.column_structure[i].label,
          input: this.config.column_structure[i].input || 'text',
          options: this.config.column_structure[i].options || [],
          // How to set can Agg?
          agg_method: this.config.column_structure[i].agg_method,
          // Not used, but might need to with complex object
          sort: this.config.filters.columns.length,
          column_type: this.config.column_structure[i].column_type,
          format: this.config.column_structure[i].format,
          sortable: this.config.column_structure[i].sortable,
          fixed: this.config.column_structure[i].fixed,
          group: this.config.column_structure[i].group,
          search: this.config.column_structure[i].search,
          editable: this.config.column_structure[i].editable || false,
          hide: this.config.column_structure[i].hide ?? false,
          header_tool_tip: this.config.column_structure[i].header_tool_tip ?? false,
          aggregate_enable: this.config.column_structure[i].aggregate_enable ?? false,
          ...(this.common_column_definitions ?? {})
        }

        if(this.config.filters.search[config.key]){
          config.search = this.config.filters.search[config.key]
        }

        this.config.filters.columns.push(config);

        }
    }

    this.config.filters.columns.sort((x, y) => console.log("x", x) || this.config.default_columns.indexOf(x.key) - this.config.default_columns.indexOf(y.key));

    // set filter structure

    for(let i = 0; i < this.config.filter_structure.length; i++){
        if(!this.config.filter_structure[i]) continue;
        switch(this.config.filter_structure[i].input){
          case null:
          case 'text':
          case 'radio':
          case 'dropdown':
          case 'date':
            if(!this.config.filters.search[this.config.filter_structure[i].key]) {
              this.config.filters.search[this.config.filter_structure[i].key] = '';
            }
            break;
          case 'multi-select':
          case 'list':

            if(!this.config.filters.search[this.config.filter_structure[i].key]) {
              this.config.filters.search[this.config.filter_structure[i].key] = [];
            }
            break;
          case 'checkbox':
            if(!this.config.filters.search[this.config.filter_structure[i].key]) {
              this.config.filters.search[this.config.filter_structure[i].key] = false;
            }
            break;
          // case 'range':
          //   this.config.filters.search[this.config.filter_structure[i].key] = [null,null];
          //   break;
          case 'comparison':
            if(!this.config.filters.search[this.config.filter_structure[i].key]) {
              this.config.filters.search[this.config.filter_structure[i].key] = {
                operator: '',
                value: '',
                max: ''
              };
            }
            break;
          case 'timeframe':
            if(!this.config.filters.search[this.config.filter_structure[i].key]) {
              this.config.filters.search[this.config.filter_structure[i].key] = {
                label: '',
                days: 0,
                period: '',
                relation: '',
                start_date: '',
                end_date: ''
              };
            };
            break;
        }
    }
  }

  getDefaultSearch(col){
    switch(col.input){
      case null:
      case 'text':
      case 'radio':
      case 'dropdown':
        col.search = '';
        break;
      case 'multi-select':
      case 'list':
        col.search = [];
        break;
      case 'checkbox':
        col.search = false;
        break;
      case 'comparison':
        col.search = {
          operator: '',
          value: '',
          max: ''
        };
        break;
      case 'date':
      case 'timeframe':
        col.search = {
          label: '',
          days: 0,
          period: '',
          relation: '',
          start_date: '',
          end_date: ''
        };
        break;
    }

    return col.search ;


  }


  async search(connection, columns, conditions, params, groups, filter_structure, sql_fragments){
    //trim sql_columns here, so that setSearch Can be freely overwritten
    this.sql_columns = this.sql_columns.trim().slice(0, -1);
    if(this.sql_having_conditions){
      this.sql_having_conditions= ' HAVING 1 ' + this.sql_having_conditions;
    }
    let query = this.sql_columns + this.sql_tables + this.sql_conditions + this.group_sql + this.sql_having_conditions +  this.sql_params;
    console.log("QQQQQABC", query);

    return await connection.queryAsync(query);

  }

  processResults(columns, structure){
    if(this.filters.pivot_mode && this.filters.pivot_mode.type === 'pivot') {
      this.data = pivot(this.data, {
        column: this.filters.pivot_mode.column.key,
        row: this.filters.pivot_mode.row.key,
        value: this.filters.pivot_mode.pivot_field.key,
        method: this.filters.pivot_mode.agg_method,
      });

      if(this.data.length){
        let data_row = this.data[0];
        for(let key in data_row){
          if(data_row.hasOwnProperty(key)){
            if(key === this.filters.pivot_mode.row.key){
              this.pivot_columns.push(columns.find(c => c.key === this.filters.pivot_mode.row.key));
            } else {

              // let data_col = columns.find(c => c.key ===  this.filters.pivot_mode.pivot_field.key);
              let data_col = {};
              if(this.filters.pivot_mode.type === 'pivot'){
              } else {
                data_col = columns.find(c => c.key === key);
                if(!data_col) continue;
              }

              let column_type = this.filters.pivot_mode.agg_method.toLowerCase() === 'count'? 'number' : data_col.column_type;

              this.pivot_columns.push({
                label: key,
                key: key,
                sortable: true,
                width: 150,
                column_type: column_type,
                agg_method: data_col.agg_method,
                format: '',
                fixed: false,
                group: 'pivot'
              })
            }
          }
        }
      }
    }


    let colDef = {};
    columns.map(c => {
      colDef[c.key] = c;
    })
    // Format Cell Value

    this.data = this.data.map(data_row => {
      for(let key in data_row){
        if(data_row.hasOwnProperty(key)){
          if(colDef[key]){
            // switch(colDef[key].column_type){
            //   case "date":
            //     if (colDef[key].format === "MM/YY"){
            //     data_row[key] = moment(data_row[key]).format("MM/YY");
            // }
            // break;



            // }
            switch(colDef[key].key){
              case 'lease_status':
                if(data_row[key] === 1){
                  data_row[key] = 'Active';
                }
                break;
              case 'unit_status':
                if(data_row[key] === 1){
                  data_row[key] = 'Online';
                } else if(data_row[key] === 0) {
                  data_row[key] = 'Offline';
                }
                break;
              case 'payment_status':
                if(data_row[key] === 1){
                  data_row[key] = 'Active';
                } else if(data_row[key] === 0) {
                  data_row[key] = 'Deleted';
                }
                break;
              case 'application_status':
                if(data_row[key] === 1){
                  return 'Active';
                } else if(data_row[key] === 2){
                  return 'Rejected';
                } else if(data_row[key] === 3){
                  return 'Accepted';
                }
                break;

            }


        }
      }


      return data_row;
      }
    });
}

  async count(connection, columns, conditions, groups, filter_structure){
    let query = "SELECT count(*) as count " + this.sql_tables + this.sql_conditions + this.group_sql;
    console.log("query", query)
    let count = await connection.queryAsync(query);
    return count[0].count;
  }

  async countRowGrouping(connection){

    let query = "With countTable as (";
    this.sql_columns = this.sql_columns.trim().slice(0, -1);
    if(this.sql_having_conditions){
      this.sql_having_conditions= ' HAVING 1 ' + this.sql_having_conditions;
    }
    query += this.sql_columns + this.sql_tables + this.sql_conditions + this.group_sql + this.sql_having_conditions +  this.sql_params;
    query += ") SELECT count(*)  as count from countTable";
    console.log("countRowGrouping", query);

    let count = await connection.queryAsync(query);
    return count[0].count;
  }

  async countPivot(connection){

    this.sql_columns = this.sql_columns.trim().slice(0, -1);
    if(this.sql_having_conditions){
      this.sql_having_conditions= ' HAVING 1 ' + this.sql_having_conditions;
    }
    let query = this.sql_columns + this.sql_tables + this.sql_conditions + this.group_sql + this.sql_having_conditions +  this.sql_params;
    console.log("countPivot", query);

    let data = await connection.queryAsync(query);
    var pivotRow = this.filters.pivot_mode?.row?.key;
    let rows_group = data.map(d => d[pivotRow]);
    let rows = [...new Set(rows_group)];
    return rows.length;

  }

  setCountSearchColumns(){
    this.sql_columns += 'SELECT COUNT(*) as count ';

  }

  setColumnSql(connection, columns, configuration, sql_fragments, pivot_mode,  structure){


    let colname ='';
    let parsedSqlFrag ='';

    columns = columns.map(c => {
      // if the column is passed in as an object, compare the keys, if not, compare it as a key.

      let col_ref = configuration.column_structure.filter(cr => !!cr).find(cr => {
        return typeof c === 'object' ? c.key === cr.key : c === cr.key
      });

      // Skip if not found
      if(!col_ref) return null;

      // c if is an object, merge it with the column definition, using the passed in values for priority
      if(typeof c =='object'){
        c = {...col_ref, ...c };
      } else {
        // c is is a string, use the default column definition
        c = col_ref;
      }
      return c;
      // Filter out null values
    })



    // manually remove property_id from all visual reports
    columns = columns.filter(c => !!c && c.key !== 'property_id');
    console.log("columns", columns);
    for(let i=0; i < columns.length; i++){
      // no pivot mode enabled, add keys from each table
      if(!pivot_mode || !pivot_mode.type ){
        let prefix = columns[i].key.split('_')[0];
        if(!columns.find(c => c.key === prefix + '_id')){
          columns.push({
            key: prefix + '_id',
            label: prefix + '_id'
          });
        }
      } else if(pivot_mode.type === 'pivot') {
        // if its pivot mode only search on columns included in the pivot definitions
        if([pivot_mode.column.key,
          pivot_mode.pivot_field.key,
          pivot_mode.row.key]
          .indexOf(columns[i].key) < 0 ) continue;
      }

      let c = columns[i];


      // dynamic columns should validate part before '__'

      // if(!configuration.column_structure.filter( f => f.key === c.key.split('__')[0]).length) e.th(400, "Invalid Column");
      // if its present then generate SQL
      // dynamic columns should run function

      if(c.key.indexOf('__') >= 0){
        let col = c.key.split('__');
        if(!sql_fragments[col[0]] || typeof sql_fragments[col[0]] !== 'function') {
          e.th(400, "An Error occurred");
        }
        parsedSqlFrag = sql_fragments[col[0]](this.connection, col[1]);
        colname = c.key;
      } else {

        if(!sql_fragments[c.key]) e.th(400, "There is no query fragment for key: " + c.key);

        // if address type, get the other address parts
        if(c.column_type === 'address'){
          let root = c.key.substring(0,c.key.lastIndexOf('_'));
          this.sql_columns +=  this.setGroupSqlFrag(sql_fragments[root + '_address2'], {key: root + '_address2'});
          this.sql_columns += this.setGroupSqlFrag(sql_fragments[root + '_city'], {key: root + '_city'});
          this.sql_columns += this.setGroupSqlFrag(sql_fragments[root + '_state'], {key: root + '_state'});
          this.sql_columns += this.setGroupSqlFrag(sql_fragments[root + '_country'], {key: root + '_country'});
          this.sql_columns += this.setGroupSqlFrag(sql_fragments[root + '_zip'], {key: root + '_zip'});
          // this.sql_columns_array.push(sql_fragments[root + '_address2']);
          // this.sql_columns_array.push(sql_fragments[root + '_city']);
          // this.sql_columns_array.push(sql_fragments[root + '_state']);
          // this.sql_columns_array.push(sql_fragments[root + '_zip']);


          this.sqlColumnsObject[root + '_address2'] = sql_fragments[root + '_address2'];
          this.sqlColumnsObject[root + '_city'] = sql_fragments[root + '_city'];
          this.sqlColumnsObject[root + '_state'] = sql_fragments[root + '_state'];
          this.sqlColumnsObject[root + '_country'] = sql_fragments[root + '_country'];
          this.sqlColumnsObject[root + '_zip'] = sql_fragments[root + '_zip'];
        }

        if(c.key === 'unit_number'){
          let type_column = columns.find(c => c.key === 'unit_type');

          if(!type_column){
            this.sql_columns += this.setGroupSqlFrag(sql_fragments['unit_type'], {key: 'unit_type'});
            // this.sql_columns_array.push(sql_fragments['unit_type']);
            this.sqlColumnsObject['unit_type'] = sql_fragments['unit_type'];

          }

          this.sql_columns += this.setGroupSqlFrag(sql_fragments['unit_number_no'], {key: 'unit_number_no'});
          this.sql_columns += this.setGroupSqlFrag(sql_fragments['unit_number_str'], {key: 'unit_number_str'});
          // this.sql_columns_array.push(sql_fragments['unit_number_no']);
          // this.sql_columns_array.push(sql_fragments['unit_number_str']);

          this.sqlColumnsObject['unit_number_no'] = sql_fragments['unit_number_no'];
          this.sqlColumnsObject['unit_number_str'] = sql_fragments['unit_number_str'];
        }

        parsedSqlFrag = sql_fragments[c.key];
        colname = c.key;
      }
      // TODO adjust for agg method
      // this.sql_columns_array.push(parsedSqlFrag);
      this.sqlColumnsObject[c.key] = parsedSqlFrag;

      this.sql_columns += this.setGroupSqlFrag(parsedSqlFrag, c, pivot_mode);




      switch(c.key){
        case 'lease_standing':
        case 'lead_category':
        case 'unit_category':
          c.search = c.search && c.search.map(c => Hashes.decode(c)[0]);
          c.key = c.key && c.key + '_id';
          this.setColumnFiltersQuery(connection, c, sql_fragments[c.key]);
          break;
        default:
          this.setColumnFiltersQuery(connection, c, sql_fragments[c.key]);

      }
    }
  }

  setParams(filters, configurations) {

    if(filters.pivot_mode && filters.pivot_mode.type) return;

    if(filters.sort) {
      this.searchParams.sort =  filters.sort.field;
      this.searchParams.sortdir =  filters.sort.sort || 'ASC';
      let config = configurations?.column_structure.find(col => col && col.key === filters.sort.field);
      if(filters.sort && filters.sort.field && filters.columns.find(c => c.key === filters.sort.field) ){
        let sort_table = config?.table && this.tables && this.tables[config.table] || '';
        this.sql_params += " order by ";
        switch (filters.sort.field) {
          case 'unit_number':
            this.sql_params += ` ${sort_table ? `${sort_table}.` : ''}unit_number_str ${filters.sort.dir || filters.sort.sort}, ${sort_table ? `${sort_table}.` : ''}unit_number_no ${filters.sort.dir || filters.sort.sort}`;
            break;
          default:
            this.sql_params += `${sort_table ? `${sort_table}.` : ''}`
            this.sql_params += filters.sort.field;
            this.sql_params += ` ${filters.sort.dir || filters.sort.sort}`;
        }

        this.sql_params += `, ${this.base_table ? `${this.base_table}.` : ''}id ASC`;
      }
    }

    if (filters.limit) {
      this.sql_params += " limit ";
      this.sql_params += filters.offset;
      this.sql_params += ", ";
      this.sql_params += filters.limit;
    }
  }

  setColumnFiltersQuery(connection, col, fragment){
    if(col.column_type === 'percentage' && col.search.value) {
      col.search.value = col.search.value / 100;
    }
    switch(col.input){
      case 'multi-select':
        if(!col.search || !col.search.length) return;

        if(col.column_type === 'concat'){
          // let concat_frags = conditions[c].map(c => connection.escape(c)).join(' or ')
          this.sql_conditions += " and (" + col.search.map(cond => fragment + " like " + connection.escape("%" + cond + "%")).join( ' or ') + ")";
        } else {


          this.sql_conditions += " and " + fragment + " in (" + col.search.map(c => connection.escape(c)).join(',') + ") ";
        }
        break;


      // added by BCT
      case 'multi-select-amenities':
        if(!col.search || !col.search.length) return;

        if(col.column_type === 'concat'){
          if(col.key === 'unit_amenities'){
            // Remove the last closing parenthesis
            const lastIndex = fragment.lastIndexOf(')');
            if (lastIndex !== -1) {
              fragment = fragment.slice(0, lastIndex) + fragment.slice(lastIndex + 1);
            }
          };
          this.sql_conditions += ` and ${fragment} and ( ${col.search.map(cond => ` ( ap.amenity_name = ${connection.escape(cond.key)} AND if(ap.field_type = 'boolean' AND amu.value is null, 'No', amu.value) = ${connection.escape(cond.value)})`).join(' OR ')} )) is not null`;
        } else {
          this.sql_conditions += " and " + fragment + " AND a.amenity_name in (" + col.search.map(c => connection.escape(c.key)).join(',') + ") )";
        }
        break;
      case 'text':  
        if(!col.search || !col.search.length) return;
        this.sql_conditions += " and " + fragment.toLowerCase() + " like " + connection.escape('%' + col.search.toLowerCase() + '%');
        break;
      case 'comparison':
          if(col.aggregate_enable && col.search.operator && col.search.operator.toLowerCase() !== "between" && col.search.value){
            this.sql_having_conditions += " and  " + fragment + "  " + this.comparisons[col.search.operator.toLowerCase()] + " " +  connection.escape(col.search.value);
            return;
          }
          if(!col.search) return;
          if(col.search.operator && col.search.operator.toLowerCase() === "between" && col.search.value && col.search.max){
            this.sql_conditions += " and  " + fragment + " BETWEEN " +  connection.escape(col.search.value) + " AND " + connection.escape(col.search.max);
          } else if(col.search.operator && col.search.operator.toLowerCase() !== "between" && col.search.value){
            this.sql_conditions += " and  " + fragment + "  " + this.comparisons[col.search.operator.toLowerCase()] + " " +  connection.escape(col.search.value);
          }
          break;
      // BCT: Added case 'date'
      case 'date':
      case 'timeframe':

          if(!col.search) return;
          this.sql_conditions += this.setTimeframes(col.search, fragment);
          break;

      // BCT: Modified to '1' and '0' (from 1 and -1.)
      case 'boolean':
        if(typeof col.search === 'undefined') return;
        if(col.search === '1') {
          this.sql_conditions += " and " + fragment + " = 1";
        }
        if(col.search === '0') {
          this.sql_conditions += " and " + fragment + " = 0";
        }
        break;
    }

  }

  getColDefinition(c, structure, column_structure){


    // Get definition from filter structure
    let colDef = structure.find(col => col && col.key === c);

    if(colDef) return colDef;
    // if not there look for column definition
    colDef = column_structure.find(col => col && col.key === c);
    return colDef;

  }

  setConditionsSql(connection, conditions, structure, columns, sql_fragments, column_structure){
    console.log(this.config.filters); 
    // Unhash values not automatically unhashed here...
    if(this.filters.search.unit_category) this.filters.search.unit_category = this.filters.search.unit_category.map(c => Hashes.decode(c)[0]);
    if(this.filters.search.lease_standing) this.filters.search.lease_standing = this.filters.search.lease_standing.map(c => Hashes.decode(c)[0]);
    if(this.filters.search.event_types) this.filters.search.event_types = this.filters.search.event_types.map(c => Hashes.decode(c)[0]);
    if(this.filters.search.lead_created_by) this.filters.search.lead_created_by = this.filters.search.lead_created_by.map(c => Hashes.decode(c)[0]);
    if(this.filters.search.lease_created_by) this.filters.search.lease_created_by = this.filters.search.lease_created_by.map(c => Hashes.decode(c)[0]);
    if(this.filters.search.payment_accepted_by) this.filters.search.payment_accepted_by = this.filters.search.payment_accepted_by.map(c => Hashes.decode(c)[0]);
    //this.filters.search.lead_created_by = ['20668'];
    console.log("this.filters.search", this.filters.search)
    for(let c in conditions){
      let col_name = '';

      let col_definition = this.getColDefinition(c, structure, column_structure)

      if(c === 'search' && conditions[c]?.length) {
        // this.sql_conditions +=  " and (" + this.sql_columns_array.map( a =>  'CAST(' + a + ' AS CHAR) ' + ' like "%' + conditions[c].trim() +  '%" ').join(' or ') + ")";

        let conditionsSql = [ ], sqlFrag = ``;

        for (let objectKey in this.sqlColumnsObject) {
          //find the columndata corresponding to the sql statements to be modified
          let columnData = columns[columns.findIndex(e => e.key === objectKey)] || { };

          if (!columnData?.hide) {
            if (columnData?.column_type === `percentage` && /^\d*\.?\d+$/.test(conditions[c])) {
              //convert input value to fraction if column type is percentage.(scaling of float done to avoid floating pooint division errors)
              sqlFrag = 'CAST(' + this.sqlColumnsObject[objectKey]  + ' AS CHAR) ' + ' like "%' + (parseFloat(conditions[c])*1000)/100000 +  '%" ';
            } else {
              sqlFrag = 'CAST(' + this.sqlColumnsObject[objectKey] + ' AS CHAR) ' + ' like "%' + conditions[c].trim() +  '%" ';
            }
            conditionsSql.push(sqlFrag);
          }
        }
        this.sql_conditions +=  " and (" + conditionsSql.join(' or ') + ")";
      } else if(c && sql_fragments[c]  ) {

        // If array based :  Range or Multi-Select

        if(col_definition && col_definition.input === 'multi-select' && Array.isArray(conditions[c]) && conditions[c].length  ){
          if(col_definition.column_type === 'concat'){
            // let concat_frags = conditions[c].map(c => connection.escape(c)).join(' or ')
            this.sql_conditions += " and (" + conditions[c].map(cond => sql_fragments[c] + " like " + connection.escape("%" + cond + "%")).join( ' or ') + ")";
          } else {
            this.sql_conditions += " and " + sql_fragments[c] + " in (" + conditions[c].map(c => connection.escape(c)).join(',') + ") ";
          }
        }

        // If array based: combination of comparsion
        if(col_definition  && col_definition.input === 'comparison' && Array.isArray(conditions[c])){
          conditions[c].forEach((condition,index) => {
            if(condition.operator && condition.operator.toLowerCase() === "range" && condition.value && condition.max){
              this.sql_conditions += `${index == 0 ? " and (  ": " or "}` + sql_fragments[c] + " BETWEEN " +  connection.escape(condition.value) + " AND " + connection.escape(condition.max);
            } else if(condition.operator && condition.operator.toLowerCase() !== "range" && condition.value){
              this.sql_conditions += `${index == 0 ? " and ( ": " or "}` + sql_fragments[c] + "  " + condition.operator + " " +  connection.escape(condition.value);
            }
            conditions[c].length == index + 1 ? this.sql_conditions += " ) ": ""
          });      
        }else{
          if(conditions[c].operator && conditions[c].operator.toLowerCase() === "range" && conditions[c].value && conditions[c].max){
            this.sql_conditions += " and  " + sql_fragments[c] + " BETWEEN " +  connection.escape(conditions[c].value) + " AND " + connection.escape(conditions[c].max);
          } else if(conditions[c].operator && conditions[c].operator.toLowerCase() !== "range" && conditions[c].value){
            this.sql_conditions += " and  " + sql_fragments[c] + "  " + conditions[c].operator + " " +  connection.escape(conditions[c].value);
          }
        }

        // If Time Based: Dates
        if(col_definition && col_definition.input === 'timeframe'){
          this.sql_conditions += this.setTimeframes(conditions[c], sql_fragments[c]);
        }

        if(col_definition && col_definition.input === 'boolean'){
          if(conditions[c] === 1) {
           this.sql_conditions += " and " + sql_fragments[c] + " = 1";
          }
          if(conditions[c] === -1) {
           this.sql_conditions += " and " + sql_fragments[c] + " = 0";
          }
        }

        if(col_definition && !col_definition.input && conditions[c]){
          this.sql_conditions += " and " + sql_fragments[c].toLowerCase() + " like " + connection.escape('%' + conditions[c].toLowerCase() + '%');
        }
      }
    }

    // Call additional queries specific to the model
    this.setFilterConditions(connection, conditions, structure, columns, sql_fragments);
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
  }

  setGroupSqlFrag(sql, col, pivot_mode){

    // If we are not grouping, or if we are grouping by this column, then query this column as normal

     if(!pivot_mode || pivot_mode.type !== 'group' || pivot_mode.row.key === col.key) {
    
      return sql + ' as ' + col.key + ', ';
    }

    // otherwise perform calculation on this column
    //TODO validate mysql grouping functions

    // let column_definition = structure.find(s => s.key === col);
    // if(!column_definition) e.th(500);

    switch(pivot_mode.agg_method.toLowerCase() ){
      case 'sum':
      case 'avg':
        col.agg_method = ['number', 'money'].indexOf(col.column_type) >= 0 ? pivot_mode.agg_method : 'count';
        break;
      case 'min':
      case 'max':
      case 'count':
        col.agg_method = ['number', 'money', 'timeframe'].indexOf(col.column_type) >= 0 ? pivot_mode.agg_method : 'count';
        break;
    }

    return col.agg_method.toUpperCase() + '(' + sql + ') as ' + col.key + ', ';
  }

  }



module.exports = BaseReport;
