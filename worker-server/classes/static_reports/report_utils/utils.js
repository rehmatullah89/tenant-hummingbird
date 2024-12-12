var moment  = require('moment');
var main_utils = require(__dirname + '/../../../modules/utils.js');

var utils =  {

    formatData(data, config, options = {}){
        let formatted_data = [];
        let total = {};
        let { set_header, set_total, timeZone = "UTC" } = options;

        if(set_header){

            let header = Object.keys(config).reduce((newObj, key) => {
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
                        if (config[key].dataType === 'number' || config[key].dataType === 'money') {
                            total[key] += dataItem[key];
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
                    default:
                        newObj[key] = dataItem[key];
                }
                return newObj;
              }, {});
            
            formatted_data.push(row);
        }

        if(set_total) formatted_data.push(total);

        return formatted_data;
    },
    getStyleRange(data, config, style_type, origin = { r : 0, c : 0 }){
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
                        c : num_of_cols - 1,
                        r : has_super_header ? origin.r + 1 : origin.r
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

            range = this.formatStyleRange(range_columns, {start: origin.r, end: origin.r + num_of_rows});
            return range;
        }
    },
    formatStyleRange(range_columns, row = { start: 0, end: 0 }){
        if (range_columns && range_columns.length) {
            for (let rc of range_columns) {
                rc.range = {
                    s: {
                        c: rc.range.start,
                        r: row.start
                    },
                    e: {
                        c: rc.range.end,
                        r: row.end
                    }
                }
            }
        }
        return range_columns;
    },

    setUpStyles(data, config, table_names = [], style_types = [], origin = { c: 0, r: 0 }){
        // "data" must have objects of tables passed in array of "table_names"
        let styles = {};
        for(let table of table_names){
            let style_range = {};
            for(let _style of style_types){
                style_range[_style] = this.getStyleRange(data[table], config[table], _style, origin[table])
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
                    switch (s_param.alignment) {
                        case "right":
                        case "left":
                            s_obj.alignment = {
                                horizontal: s_param.alignment
                            }
                            break;
                        case "top":
                        case "bottom":
                            s_obj.alignment = {
                                vertical: s_param.alignment
                            }
                            break;
                        default:
                            s_obj.alignment = {
                                vertical: "center",
                                horizontal: "center"
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

    formatMergeColumns(merge_columns, row ){
        if(!row) row = 0;
        let m_cols = [];
        if(merge_columns && merge_columns.length){
            for(const mc of merge_columns){
                m_cols.push({
                    s : {
                        c : mc.start,
                        r: row
                    },
                    e : {
                        c : mc.end,
                        r: row
                    }
                })
            }
        }

        return m_cols;
    },

    calculateOrigins(data, tables_on_single_sheet = [], space_between_tables = 1){
        // for two tables_on_single_sheet there will be only one origin,
        // similarly for three tables there will be two origins ans so on.
        let origins = {};
        let count_of_tables = tables_on_single_sheet.length;
        if(tables_on_single_sheet && count_of_tables > 1){
            for(let i = 0 ; i < (count_of_tables - 1) ; i++ ){
                origins[tables_on_single_sheet[i + 1]] = {
                    r: data[tables_on_single_sheet[i]].length + space_between_tables,
                    c: 0
                };
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
};


module.exports = utils;