const XLSX = require("xlsx-color");

const Fields = require("../report_fields/index").fields;
var settings = require(__dirname + '/../../../config/settings.js');
var utils = require(__dirname + '/../../../modules/utils.js');
var moment = require('moment');
const sr_utils = require("../report_utils/utils");
var fs = require('fs');

class BaseStaticReport {
  constructor(data, report_name, template) {
    this.data = data || {};
    this.path = "";
    this.name = report_name;
    this.template = template;
    this.workBook = XLSX.utils.book_new();
    this.worksheets = [];
    this.merge_columns = [];
  }

  getFields(tableName = "") {
    if (tableName){
      return Fields[this.template][tableName];
    }
    return Fields[this.template];
  }

  getData() {
    return this.data;
  }

  setSuperHeader() {
    let super_header = sr_utils.formatSuperHeader(this.getFields());
    if(super_header){
      this.data = [super_header.data, ...this.data];
      this.merge_columns = super_header.merge_columns;
    }
  }

  setWorkSheet() {
    this.worksheets.push({
      name: this.name,
      tables: [
        { 
          data: this.data,
          merge_columns: this.merge_columns,
          styles: {
            "bold-header": sr_utils.getStyleRange(this.data, this.getFields(), "bold-header")
          }
        }
      ]
    });
  }

  async generateExcel() {

    for (let ws of this.worksheets){
      let workSheet = null;

      if(ws.tables && ws.tables.length){

        for(let i = 0; i < ws.tables.length; i++ ){
          if(i == 0){
            workSheet = XLSX.utils.json_to_sheet(ws.tables[i].data, { skipHeader: true });
          } else {
            XLSX.utils.sheet_add_json(workSheet, ws.tables[i].data, {origin: ws.tables[i].origin, skipHeader: true});
          }
          if(ws.tables[i].styles)
            this.renderStyles(workSheet, ws.tables[i].styles);
          if(ws.tables[i].merge_columns && ws.tables[i].merge_columns.length){
            workSheet['!merges'] = sr_utils.formatMergeColumns(ws.tables[i].merge_columns, ws.tables[i].origin && ws.tables[i].origin.r);
          }
        }

        XLSX.utils.book_append_sheet(this.workBook, workSheet, ws.name);
      }
    }

    if (!fs.existsSync(settings.config.base_path + 'documents/')) {
      fs.mkdirSync(settings.config.base_path + 'documents/');
    }
    const filename = utils.slugify(this.name) + moment().format('x');

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
                  if(workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s){
                  workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s = {
                      ...workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s,
                      ...s_obj
                  }
                  } else {
                      workSheet[XLSX.utils.encode_cell({ c: sc, r: sr })].s = s_obj;
                  }
              }
          }
      }
  }
}

module.exports = BaseStaticReport;