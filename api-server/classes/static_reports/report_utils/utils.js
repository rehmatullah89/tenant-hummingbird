var moment  = require('moment');
var main_utils = require(__dirname + '/../../../modules/utils.js');

var utils =  {

    formatData(data, config, options = {}, date){
        let formatted_data = [];
        let total = {};
        let { set_header, set_total, timeZone = "UTC", show_empty_message = false } = options;

        if(set_header){

            let header = Object.keys(config).reduce((newObj, key) => {

                            if(config[key].label == '<Report Date>' && date)
                                config[key].label = main_utils.formatDate(date);

                            newObj[key] = config[key].label;
                            return newObj;
                        }, {});

            formatted_data.push(header);
        }

        for (const dataItem of data) {
            let row = Object.keys(config).reduce((newObj, key, i) => {

                if(set_total){
                    if(i === 0){
                        total[key] = "Total";
                    } else {
                        total[key] = +total[key] || 0;
                        if (config[key].dataType === 'number' || config[key].dataType === 'money' ||config[key].dataType === 'integer' ) {
                            total[key] += dataItem[key] || 0;
                        } else {
                            total[key]++;
                        }
                    }
                }
                // for formatting the data
                switch(config[key].dataType){
                    case 'datetime':
                        newObj[key] = main_utils.formatLocalDateTimeCustom(dataItem[key], timeZone, 'MM/DD/YYYY @ hh:mma');
                    break;
                    case 'date':
                        newObj[key] = main_utils.formatDate(dataItem[key]);
                    break;
                    case 'number':
                        newObj[key] = utils.formatNumber(dataItem[key] || 0, false);
                    break
                    case 'integer':
                        newObj[key] = dataItem[key] || 0;
                    break
                    case 'money':
                        newObj[key] = utils.formatMoney(dataItem[key] || 0, true);
                    break
                    case 'percentage':
                        newObj[key] = utils.formatPercentage(dataItem[key] || 0);
                    break
                    case 'datetimeiso':
                        if (!dataItem[key]) {
                            newObj[key] =  '';
                        }
                        else {
                            newObj[key] = moment(dataItem[key]).format('YYYY-MM-DD HH:mm:ss');
                        }
                    break;
                    default:
                        newObj[key] = dataItem[key];
                }
                return newObj;
              }, {});
            
            formatted_data.push(row);
        }

        if(set_total) formatted_data.push(total);

        if(formatted_data?.length == 0 && show_empty_message) {
            formatted_data.push({
                'empty': 'No data found'
            });
        }

        return formatted_data;
    },
    
    convertToExcelColumn(number) {
        let result = '';
        while (n > 0) {
          let remainder = (n - 1) % 26;
          result = String.fromCharCode(65 + remainder) + result;
          n = Math.floor((n - 1) / 26);
        }
        return result;
    },
    
    getStyleRange(data, config, style_type, origin = { r : 0, c : 0 }, no_headers){ 
        let num_of_rows = data.length - 1;
        let num_of_cols = Object.keys(config).length;
        let has_super_header = this.hasSuperHeader(config);
        if(style_type === 'bold-header'){
            return[{
                range: {
                    s: {
                        ...origin
                    },
                    e: {
                        c : origin.c? origin.c + num_of_cols - 1 : num_of_cols - 1,
                        r : has_super_header && !no_headers ? origin.r + 1 : origin.r
                    }
                }
            }];
        } else {
            let count = 0;
            let prev = '';
            let start = -1;
            let range = [];
            let range_columns = [];
            let has_style_type = false;
            for (const key of Object.keys(config)){
                if(config[key][style_type]){
                    has_style_type = true;
                    if(config[key][style_type] != prev){
                        if(start >= 0){
                            range_columns.push({range: {start, end: count - 1}, [style_type] : prev });
                        }
                        start = count;
                    }
                } else {
                    if(start >= 0){
                        range_columns.push({range: {start, end: count - 1}, [style_type] : prev });
                    }
                    start = -1;
                }
                prev = config[key][style_type];
                count++;
            }
            if(start >= 0){
                range_columns.push({range: {start, end: count - 1}, [style_type] : prev });
            }

            /* here no_headers flag means don't include header in the style */
            let row_margin = no_headers && has_super_header ? 2 : no_headers ? 1 : 0;

            range = this.formatStyleRange(range_columns, {start: origin.r + row_margin, end: origin.r + num_of_rows}, origin);
            return range;
        }
    },
    formatStyleRange(range_columns, row = { start: 0, end: 0 }, origin){
        if (range_columns && range_columns.length) {
            for (let rc of range_columns) {
                rc.range = {
                    s: {
                        c: origin?.c ? origin.c + rc.range.start : rc.range.start,
                        r: row.start
                    },
                    e: {
                        c: origin?.c ? origin?.c + rc.range.end : rc.range.end,
                        r: row.end
                    }
                }
            }
        }
        return range_columns;
    },

    setUpStyles(data, config, table_names = [], style_types = [], origin = { c: 0, r: 0 }, no_headers){
        // "data" must have objects of tables passed in array of "table_names"
        let styles = {};
        for(let table of table_names){
            let style_range = {};
            for(let _style of style_types){
                style_range[_style] = this.getStyleRange(data[table], config[table], _style, origin[table], no_headers)
            }
            styles[table] = style_range;
        }
        return styles;
    },
    makeStyleObject(styles, s_param = {}){
        // for each style of styles, there must be corresponding values in "range" object of s_param
        let s_obj = {};
        for(let style of styles){
            switch (style) {
                case "bold-header":
                case "bold":
                    s_obj.font = {
                        bold: true
                    }
                    break;
                case "color":
                    s_obj.fill = {
                        fgColor: { rgb: s_param.color }
                    }
                break;
                case "alignment": 
                    switch (s_param.alignment?.direction) {
                        case 'vertical':
                            s_obj.alignment = {
                                vertical: s_param.alignment?.value
                            }
                        break;
                        case 'horizontal':
                            s_obj.alignment = {
                                horizontal: s_param.alignment?.value
                            }
                        break;    
                    }
                break;
                case "font-size":
                    s_obj.font = {
                        sz: s_param.size
                    };
                    break;
                case "font-name":
                    s_obj.font = {
                        name: s_param.name
                    }
                break;
                case "border":
                    switch(s_param.border_style?.direction){
                        case "outside-all":
                            s_obj.border = {
                                "left": s_param.border_style.value,
                                "right": s_param.border_style.value,
                                "top": s_param.border_style.value,
                                "bottom": s_param.border_style.value,
                            }
                        break;
                    }
                break;
                default:
                    break;
            }
        }
        return s_obj;
    },
    hasSuperHeader(config){
        for(let key of Object.keys(config)){
            if(config[key].super_header)
                return true;
        }
        return false;
    },
    formatSuperHeader(config){
        let merge_columns = [];
        let super_header = {};
        let count = 0;
        let prev = '';
        let start = -1;
        let has_super_header = false;
        for (const key of Object.keys(config)){
            if(config[key].super_header){
                has_super_header = true;
                if(config[key].super_header != prev){
                    super_header[key] = config[key].super_header;
                    if(start >= 0){
                        merge_columns.push({start, end: count - 1});
                    }
                    start = count;
                }
                else {
                    super_header[key] = '';
                }
            } else {
                super_header[key] = '';
                if(start >= 0){
                    merge_columns.push({start, end: count - 1});
                }
                start = -1;
            }

            prev = config[key].super_header;
            count++
        }

        if(start >= 0){
            merge_columns.push({start, end: count - 1});
        }

        return (has_super_header ? { data: super_header, merge_columns } : null);
        
    },

    formatMultipleSuperHeader(config){
        let super_header = {};
        for(const table_config in config){
            super_header[table_config] = this.formatSuperHeader(config[table_config]);
        }
        return super_header;
    },

    formatMergeColumns(merge_columns, row, origin ){
        if(!row) row = 0;
        let m_cols = [];
        if(merge_columns && merge_columns.length){
            for(const mc of merge_columns){
                m_cols.push({
                    s : {
                        c : origin?.c ? origin.c + mc.start : mc.start,
                        r: row
                    },
                    e : {
                        c : origin?.c ? origin.c + mc.end : mc.end,
                        r: row
                    }
                })
            }
        }

        return m_cols;
    },

    calculateOrigins(data, tables_on_single_sheet = [], space_between_tables = 1, start_origin){
        // for two tables_on_single_sheet there will be only one origin,
        // similarly for three tables there will be two origins and so on.
        let origins = {};
        let count_of_tables = tables_on_single_sheet.length;
        let row_start, col_start, prev_row_margin = 0;

        if(tables_on_single_sheet && count_of_tables > 1){

            row_start = start_origin?.r ? data[tables_on_single_sheet[0]].length + space_between_tables + start_origin?.r : data[tables_on_single_sheet[0]].length + space_between_tables;
            col_start = start_origin?.c ? start_origin.c : 0;

            origins[tables_on_single_sheet[1]] = {
                r: row_start,
                c: col_start
            };

            prev_row_margin = origins[tables_on_single_sheet[1]].r;

            for(let i = 1; i < (count_of_tables - 1); i++){
                row_start = data[tables_on_single_sheet[i]].length + (prev_row_margin) + space_between_tables;
                origins[tables_on_single_sheet[i + 1]] = {
                    r: row_start,
                    c: col_start
                };
                prev_row_margin = origins[tables_on_single_sheet[i + 1]].r;
            }
        }
        return origins;
    },
    setupStyleObjectOfCell(data, config,  column, row = { name: '', cells: 'one' }, style_options = {}, origin = { r: 0, c: 0}){
        // because in in Excel Columns starts with "0" i.e., if num_of_cols = 8, then 7 will be the 8th column
        let num_of_columns = Object.keys(config).length - 1; 
        let row_index_of_cell = this.getIndex(data, row.name, column); 
        let range = {
            s: {
                r: row_index_of_cell + origin.r,
                c: 0 || origin.c
            },
            e: {
                r: row_index_of_cell + origin.r,
                c: row.cells === 'all' ? origin.c + num_of_columns : 0 || origin.c
            }
        };
        return [{
            range,
            ...style_options
        }];
    },
    addStylesOfCells(styles, data, config, table_names, column, row = { names: [], cells: "one" }, style_options = {}, origin = { r: 0, c: 0 }){
        // "data" must have objects of tables passed in array of "table_names".
        for(let table of table_names){
            for(let key of Object.keys(style_options)){
                let _key = key === 'bold' ? 'bold-header' : key;
                for(let name of row["names"]){
                    let cell_style_range = utils.setupStyleObjectOfCell(data[table], config[table], column, { name , cells: row.cells},  { [key] : style_options[key] }, origin[table]);
                    if(styles[table][_key]){
                        styles[table][_key].push(...cell_style_range);
                    } else {
                        styles[table][_key] = cell_style_range;
                    }
                }
            }
        }
    },
    getIndex(data, row_name, col_name, options = { row: true }, config = {}){
        let { row, column } = options;
        // there may be spaces in row_name or col_name.
        row_name = row_name.trim();
        col_name = col_name.trim();
        if(row)
            return data.findIndex(element => element[col_name].trim() === row_name); 
        if(column)
            return Object.keys(config).findIndex(element => element.trim() === col_name);
    },

    applyStyleToWhole(styles, ranges ) {
        styles = styles || [];
        let style_ranges = {};

        ranges.forEach( ({ origin, row_count, col_count }) => {
            let row_start = origin?.r ? origin.r : 0
            let col_start = origin?.c ? origin.c : 0
            let row_end = origin.r ? origin.r + row_count : row_count;
            let col_end = origin.c ? origin.c + col_count : col_count;
            
            // [{"font-name": {name: "Arial"}}, {"font-size": {size: 10}}]
            styles.forEach(style => {
                let style_name = Object.keys(style)[0];
                let style_type = Object.keys(style[style_name]);

                if(!style_ranges[style_name]){
                    style_ranges[style_name] = [];
                }
                style_ranges[style_name].push({range:{s: {r: row_start, c: col_start}, e: {r: row_end, c: col_end}}, [style_type]: style[style_name][style_type]})
            })

        })

        return style_ranges;
    },

    columnMerger(payload){
        let { col_start, col_end, row_start, row_end, origin } = payload;
        let merged_cells = [];

        row_start = origin?.r ? row_start + origin.r : row_start;
        row_end = origin?.r ? row_end + origin.r : row_end;
        col_start = origin?.c ? col_start + origin.c : col_start;
        col_end = origin?.c ? col_end + origin.c : col_end;

        for(let i = row_start; i <= row_end; i++){
            merged_cells.push({s: {r: i, c: col_start}, e:{r: i, c:col_end}}) 
        }

        return merged_cells;
    },

    calculateOriginHorizontally(columns, tables = [], space_between_tables, start_origin){
        let origins = {};
        let tables_count = tables.length;
        let row_start, col_start, prev_col_margin = 0;

        if(tables_count){

            row_start = start_origin?.r ? start_origin.r : 0;
            prev_col_margin = start_origin?.c ? start_origin?.c : 0;

            for(let i=0; i<tables_count-1; i++){
                col_start = (prev_col_margin) + Object.keys(columns[tables[i]]).length + space_between_tables;
                origins[tables[i + 1]] = {
                    r: row_start,
                    c: col_start
                };
                prev_col_margin = origins[tables[i + 1]].c;
            }
        }
        return origins;
    },

    formatNumber(value){
	    if (typeof value === 'undefined' ||  value === false || value === null  ) return '';
            value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}).replace(/,/g, "")
            return `${value}`;
	},

    formatMoney(value){
	    if (typeof value === 'undefined' ||  value === false || value === null  ) return '';
            value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}).replace(/,/g, "")
            return `$${value}`;
	},

    formatPercentage: value =>{
		if (typeof value == 'undefined' ||  value === false || value === null  || isNaN(value))
            return '0.00%';
		
        return Math.round(value * 1e1) / 1e1 + '%'
	},

};


module.exports = utils;