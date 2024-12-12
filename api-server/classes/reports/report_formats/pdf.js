'use strict';
var hummus = require('hummus');
var settings    = require(__dirname + '/../../../config/settings.js');
var utils    = require(__dirname + '/../../../modules/utils.js');
var e  = require(__dirname + '/../../../modules/error_handler.js');
var moment = require('moment');
var rp = require('request-promise');

var c_scale_down_size = 9;

// var columnTypes = {
//   date: 'd',
//   string: 's',
//   currency: 'n',
//   number: 'n'
// }
//
// var columnFormats = {
//   date: 'd-mmm-yy',
//   string: null,
//   number: null,
//   currency: '$0.00'
// }
// var columnStyles = {
//   date: null,
//   string: null,
//   number: null,
//   currency: null
// }

class PDF {
  constructor(data, config, columns, name,report_name) {
    this.wb = {};
    this.data = data;
    this.config = config;
    this.name = name;
    this.report_name = report_name;
    this.columns = columns;
    this.path = ''
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

  async create(company_name){

    var page_width = 792;
    var page_height = 612;
    this.company_name = company_name;
    let timestamp =  moment().format('x');
    this.path = settings.config.base_path + '/uploads/' + this.name + 'label' + timestamp + '.pdf'
    let pdfWriter = hummus.createWriter(this.path);
    var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-Regular.ttf');
    var boldFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-ExtraBold.ttf');
    let total_width = 0;
    let column_width = 100;
    let textOptions = {
      font: font,
      size: 9,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let titleTextOptions = {
      font: font,
      size: 9,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let current_page = pdfWriter.createPage(0,0,page_width,page_height);
    let cxt = pdfWriter.startPageContentContext(current_page);
    let page_number = 0;

    // get total width of columns so we can know how wide to make them.
    this.columns.map((c, i) => {
      // let col = this.config.column_structure.find(s => s.key === c);
      // if(!col) throw new Error("An error occurred");
      total_width += (c.width || column_width);
    });

    // loop through columns starting with headerss

    let total = {};
    let margin_left = 20;
    let margin_top = 40;
    let margin_bottom = 40;
    let margin_right = 20;
    let row_height = 26;
    let leftOffset = 0;
    let padding = 5;
    let topOffset = page_height - margin_top;
    let header_columns = [];
    this.columns.map((c, i) => {
      //let col = this.config.column_structure.find(s => s.key === c);
      column_width = (( (c.width || column_width ) *  ( page_width - margin_right  - margin_left) ) / total_width);

      header_columns.push({
        value: c.label,
        width: (( (c.width || column_width ) *  ( page_width - margin_right  - margin_left) ) / total_width)
      });
    });
    await this.printHeaders(cxt, header_columns, margin_left + leftOffset, topOffset, titleTextOptions,textOptions,font,company_name,padding,page_width,margin_right,pdfWriter);

    var headerOffset = 40;
    var footerOffset = 40;
    leftOffset = 0;
    topOffset -= row_height + headerOffset;
    let current_row = 1;
    let row = 1;
    var column_width_array = [];
    var c_width;




    for(let i = 0; i < this.data.length; i++){
        let d = this.data[i];
        var array_of_string = Object.values(d);
        array_of_string = array_of_string.filter(Boolean);
        array_of_string = array_of_string.map( item => item.toString());
        var string_value = await this.longest_string(array_of_string);
        var textDimensions = font.calculateTextDimensions(string_value[0],9);
        c_width = Math.floor((column_width / textDimensions.width) * 9);
        column_width_array.push(c_width);
        if (c_width < 5) break;
      }

    c_scale_down_size = Math.min(...column_width_array);
    c_scale_down_size = await this.scale_down_size(c_scale_down_size);
    textOptions.size = c_scale_down_size;
    for(let i = 0; i < this.data.length; i++){
      let d = this.data[i];

      //topOffset = page_height - margin_top - row_height - ((row_height) * ( i ) );
      if (row % 2 === 0) {
        cxt.drawRectangle(margin_left + leftOffset, topOffset - ((row_height - padding)  / 2 ), page_width - margin_right - margin_left , row_height, {
          type: 'fill',
          color: 'WHITESMOKE',
          opacity: 0.9
        })
        textOptions.color = 'black';
        titleTextOptions.color = 'black';
      }
      var calculate_total = false;
      var columns = this.columns;
      await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, columns, c_scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d,total,calculate_total = true);
      leftOffset = 0;

      if ( ( current_row * row_height ) + margin_bottom + margin_top + headerOffset + footerOffset  > page_height) { // add footer height here as well
        page_number += 1;
        await cxt.writeText('Printed on ' + moment().format("dddd, MMMM Do YYYY, h:mm:ss a") + '    page no.' + page_number, margin_left,10, textOptions); // adding footer ( topOffset - 20 this is end last param)
        // If at the bottom of the page, go onto the next page
        topOffset = page_height - margin_top;
        current_row = 0;
        row = 1;
        pdfWriter.writePage(current_page);
        current_page = pdfWriter.createPage(0,0,page_width,page_height);
        cxt = pdfWriter.startPageContentContext(current_page);
        // Reprint Headers
        await this.printHeaders(cxt, header_columns, margin_left + leftOffset, topOffset, titleTextOptions,textOptions,font,company_name,padding,page_width,margin_right,pdfWriter);
        topOffset -= row_height + headerOffset;

      } else {
        current_row++;
        row++;
        topOffset -= row_height ;
      }
    }

    leftOffset = 0;
    // Print Total Row
    //topOffset -= row_height;
    page_number += 1;
    titleTextOptions.size = textOptions.size;
    cxt.drawPath(margin_left,topOffset + (row_height/2),page_width - margin_left ,topOffset + (row_height/2), {
      color: 0xDFE3E8
    });

    for(let j=0; j < this.columns.length ; j++){
      let c = this.columns[j];
      // if(j > 0 && !total[j]) continue;
      let value = '';

      j === 0 ? (value = "TOTAL") : ( value = this.formatTotal(total[j], c));
      await cxt.writeText(value, margin_left + leftOffset + padding, topOffset, textOptions);
      leftOffset =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
    }

    await cxt.writeText('Printed on ' + moment().format("dddd, MMMM Do YYYY, h:mm:ss a") + '    page no.' + page_number, margin_left, 10, textOptions); // adding footer

    pdfWriter.writePage(current_page);
    pdfWriter.end();

    return;
  }

  async truncate_text(page_width,margin_right,total_width,pdfWriter,cxt,columns, scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d, total,calculate_total){
    var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-Regular.ttf');
    for(let j = 0; j < columns.length; j++){
      let value = '';
      let c = '';
      if (calculate_total){
        c = columns[j];
        value =  this.formatCell(d[c.key],c);
        if(!value) value = '';
      }
      else {
        value = columns[j].value;
        column_width = columns[j].width;
      }
      var textDimensions = font.calculateTextDimensions(value,scale_down_size);
      textOptions.size = scale_down_size;
      if (textDimensions.width > column_width) {
        var start = 0;
        var end = 0;
        end = value.length;
        let round_off_column_width = Math.floor(column_width);
        let char_capacity = round_off_column_width / 3;
        switch ( true ) {
          case (scale_down_size == 6):
            end = char_capacity - 2;
              break;
          case (scale_down_size == 7):
            end = char_capacity - 6;
              break;
          case (scale_down_size == 8):
            end = char_capacity - 8;
              break;
          default:
            end = char_capacity;
              break;
        }
        await cxt.writeText(value.slice(start,end), margin_left + leftOffset + padding, topOffset, textOptions);
      }
      else {
        if(Math.round(column_width - textDimensions.width) <= 3){
          value = value.slice(0,value.length - 2);
        }
        await cxt.writeText(value, margin_left + leftOffset + padding, topOffset, textOptions);
      }
      if (calculate_total){
        leftOffset =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
      }
      else {
       leftOffset += columns[j].width
      }
      // add numbers, and count strings
      if (calculate_total){
        total[j] = +total[j] || 0;
        if(c.column_type === 'money' || c.column_type === 'number') {
          d[c.key] = parseFloat(d[c.key].replace(/\$/g, ''));
          total[j] += +d[c.key]
        } else {
          if(d[c.key]){
            total[j]++
          }
        }
      }
    }
  }

  async longest_string(array_of_string){
    var max = array_of_string[0].length;
    array_of_string.map( v => max = Math.max(max, v.length));
    var result = array_of_string.filter(v => v.length == max);
    return result;
  }

  async scale_down_size(scale_down_size){
    // return 9;
    switch ( true ) {
      case (scale_down_size <= 5):
        scale_down_size = 5;
          break;
      case (scale_down_size > 5 && scale_down_size < 9 ):
        scale_down_size = scale_down_size;
          break;
      default:
        scale_down_size = 9;
          break;
    }
    return scale_down_size;
  }

  async printHeaders(cxt, header_columns, startingLeftOffset, topOffset, titleTextOptions,textOptions,font,company_name,padding,page_width,margin_right, pdfWriter){
    let row_height = 26;
    var h_scale_down_size = 9;
    var report_name = this.report_name;
    titleTextOptions.size = 20;
    await cxt.writeText(report_name, startingLeftOffset, topOffset , titleTextOptions);
    titleTextOptions.size = 9;
    await cxt.writeText(company_name, 620, topOffset , titleTextOptions);
    topOffset = topOffset - row_height + (row_height/2)
    await cxt.writeText(moment().format("dddd, MMMM Do YYYY"), startingLeftOffset, topOffset, textOptions);
    topOffset = topOffset - row_height ;
    var header_width_array = [];
    for(let i = 0; i < header_columns.length; i++) {
      var titleDimensions = font.calculateTextDimensions(header_columns[i].value,9);
      var h_width = Math.floor((header_columns[i].width / titleDimensions.width) * 9);
      header_width_array.push(h_width);
      if (h_width < 5) break;
    }
    h_scale_down_size = Math.min(...header_width_array);
    h_scale_down_size = await this.scale_down_size(h_scale_down_size);
    textOptions.size = h_scale_down_size;
    cxt.drawRectangle(startingLeftOffset, topOffset - (row_height/2), page_width -20 - 20 , row_height, {
      type: 'fill',
      // fill: '#eee000',
      color: 0xDFE3E8,
      opacity: 0.9
    })
    textOptions.color = 'black';
    titleTextOptions.color = 'black';
    let total_width = 1;
    let column_width = 1;
    let margin_left = 0;
    let d = '';
    let total = '';
    let calculate_total = false;
    await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, header_columns, h_scale_down_size ,column_width ,margin_left , startingLeftOffset ,padding, topOffset, textOptions, d,total,calculate_total);
  }

  formatTotal(data,col){

    switch(col.column_type.toLowerCase()){
      case 'money':
        return utils.formatMoney(data);
      case 'number':
        return utils.formatNumber(data);
        //return data;
      default:
        return data;
    }
  }

  formatCell(data,col){
    switch(col.column_type.toLowerCase()){
      case 'string':
        return data;
        break;
      case 'money':
        return data;
        break;
      case 'number':
        return utils.formatNumber(data);
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
    }
  }

  static async generatePDF(connection, body, company, property, contact, token, report_data, data, dataCount, res, newPdf){
    if (newPdf) {
      let url = settings.get_pdf_generator_app_url() ;
      url += body.type;

      let socket = {
        company_id: company.id,
        contact_id: contact.id,
        id: body.type + "_" + moment().format('x'),
        type:  body.type,
        filename: body.name
      }

      let _data = {
        data: report_data,
        name: body.name,
        type: body.type,
        report_type: body.report_type,
        timeZone: body.timeZone,
        property,
        start_date: body.date,
        end_date: body.end_date,
        company,
        ...(dataCount > 2000 && {socket}),

      }
      // console.log('_data', _data.data);

      var options = {
        uri: url,
        json: true,
        method: 'POST',
        body: _data
      };
      console.log("options", options)
      try{
        if(_data.socket) {
          rp(options);
          data = {
            ...socket,
            socket: true
          };
        } else {
          var pdf = await rp(options);
          if(pdf.status) {
            data = pdf.data;
            console.log('data', data);
          } else {
            e.th(400, "500: Error occured while generating report");
          }
        }

      } catch(err){
        console.error("API__ERROR____",err);
        e.th(500, "500: Error occured while generating report");
      }

    } else {
      data = await Report.getPdf(connection, body, company, property, contact, token, {cid: res.locals.cid });
    }

    utils.send_response(res, {
      status: 200,
      data: data
    });
  }

}

module.exports = PDF;


