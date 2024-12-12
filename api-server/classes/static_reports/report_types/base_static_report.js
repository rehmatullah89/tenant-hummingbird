const XLSX = require("xlsx-color");

const Fields = require("../report_fields/index").fields;
const sheets_width = require("../report_fields/index").sheets_width;
var settings = require(__dirname + '/../../../config/settings.js');
var utils = require(__dirname + '/../../../modules/utils.js');
var moment = require('moment');
const sr_utils = require("../report_utils/utils");
var fs = require('fs');
const net_revenue = require("../../../models/msr/net_revenue");
const e = require("../../../modules/error_handler");

class BaseStaticReport {
  constructor(data, report_name, template) {
    this.data = data || {};
    this.path = "";
    this.name = report_name;
    this.template = template;
    this.workBook = XLSX.utils.book_new();
    this.worksheets = [];
    this.merge_columns = {};
    this.multiple_tables = false;
  }

  getFields(tableName = "") {
    if (tableName){
      return Fields[this.template][tableName];
    }
    return Fields[this.template];
  }

  hasPermission() {
    return true;
  }

  getSheetWidth(sheetName = "") {
    if(sheetName) return sheets_width[this.template][sheetName];
    return sheets_width[this.template];
  }

  getData() {
    return this.data;
  }

  setSuperHeader() {
    let fields = this.getFields();
    let super_header;
    if(this.design_type) {

      for(let sheet in this.design_type){

        if(this.design_type[sheet].multi_tables){
          super_header = sr_utils.formatMultipleSuperHeader(fields[sheet]);
          
          this.merge_columns[sheet] = {}
          for(const table in super_header){
            if(super_header[table]){
              this.data[sheet][table] = [super_header[table].data, ...this.data[sheet][table]];
              this.merge_columns[sheet][table] = super_header[table].merge_columns;
            }
          }
        }
        else {
          super_header = sr_utils.formatSuperHeader(fields[sheet]);
          if(!super_header) continue
          this.data[sheet] = [super_header.data, ...this.data[sheet]];
          this.merge_columns[sheet] = super_header.merge_columns;
        }
        
      };
    }
    else{
      super_header = sr_utils.formatSuperHeader(fields);
      if(!super_header) return 

      this.data = [super_header.data, ...this.data];
      this.merge_columns[this.template] = super_header.merge_columns;
    }


  }

  setWorkSheet() {
    this.worksheets.push({
      name: this.name,
      tables: [
          { 
            data: this.data,
            merge_columns: this.merge_columns[this.template],
            styles: {
              "bold-header": sr_utils.getStyleRange(this.data, this.getFields(), "bold-header")
            }
          }
      ]
    });
  }

  async generateExcel(connection = {}, payload = {}) {
    const hasPermissionToGenerate = await this.hasPermission(connection, payload);
    if(!hasPermissionToGenerate) e.th('403', 'You are not allowed to access this report');

    for (let ws of this.worksheets){
      let workSheet = null;

      if(ws.header) workSheet = ws.header;
      if(ws.columns_width) workSheet['!cols'] = ws.columns_width;

      if(ws.tables && ws.tables.length){

        for(let i = 0; i < ws.tables.length; i++ ){
          if(i == 0 && workSheet == null){
            workSheet = XLSX.utils.json_to_sheet(ws.tables[i].data, { skipHeader: true });
          } else {
            XLSX.utils.sheet_add_json(workSheet, ws.tables[i].data, {origin: ws.tables[i].origin, skipHeader: true});
          }
          if(ws.tables[i].styles)
            this.renderStyles(workSheet, ws.tables[i].styles);
          if(ws.tables[i].merge_columns && ws.tables[i].merge_columns.length){

            let merged_cells;
            if(!ws.tables[i].formatted_merged_cells) 
              merged_cells = sr_utils.formatMergeColumns(ws.tables[i].merge_columns, ws.tables[i].origin && ws.tables[i].origin.r, ws.tables[i].origin);
            else  
              merged_cells = ws.tables[i].merge_columns;

            if(!workSheet['!merges'])
              workSheet['!merges'] = merged_cells
            else 
              workSheet['!merges'].push(...merged_cells)
          }
        }
      }
      // put it back once we have table data(or atleast their headers)
      XLSX.utils.book_append_sheet(this.workBook, workSheet, ws.name);
    }

    if (!fs.existsSync(settings.config.base_path + 'documents/')) {
      fs.mkdirSync(settings.config.base_path + 'documents/');
    }
    const filename = utils.slugify(this.name);

    this.path = settings.config.base_path + 'documents/' + filename + '.xlsx';

    XLSX.writeFile(this.workBook, this.path, {
      bookSST: false,
      booktemplate: "xlsx",
      compression: true,
    });
    return true;
  }
  renderStyles(workSheet, styles){
    for(let key of Object.keys(styles)){
        this.applyStyle(workSheet, styles[key], [key]);
    }
  }
  applyStyle(workSheet, s_options, styles = []){
      // s_options is an array of objects like this , [{range:{}},{range:{}, style_option:value},{range:{}, style_option:value},...]
      for(let s_param of s_options){
          let s_obj = sr_utils.makeStyleObject(styles, s_param);
          let range = s_param.range;
          for(let sr = range.s.r ; sr <= range.e.r; sr++){
              for(let sc = range.s.c; sc <= range.e.c; sc++){

                    if( workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })]?.s){
                      if(Object.keys(s_obj)[0] in workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s){
                        workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s[Object.keys(s_obj)[0]] = {
                          ...workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s[Object.keys(s_obj)[0]],
                          ...s_obj[Object.keys(s_obj)[0]]
                        }
                      }else {
                        workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s = {
                            ...workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s,
                            ...s_obj
                        }
                      }
                  } else if(workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })]) {
                      workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s = s_obj;
                  }
              }
          }
      }
  }
}

module.exports = BaseStaticReport;