'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var moment = require('moment');
var ms = require('memory-streams');

var c_scale_down_size = 9;
var settings    = {
  config:{
    base_path: `${__dirname}/../public/`
  }
}

class SpaceActivity {
  constructor(body){

    this.data = body.data;
    this.columns = body.data.columns;
    this.report_name = 'Space Activity';
    this.report_start_date = body.start_date;
    this.report_end_date = body.end_date;
    this.property = body.property;
    this.company = body.company;
    this.timeZone = body.timeZone;

    this.page_width = 842;
    this.page_height = 595;
    this.margin_left = 20;
    this.margin_right = 20;
    this.margin_top = 40;
    this.margin_bottom = 40;
    this.logoUrl = null;
    this.setConfig();

  }

  setConfig(){
    this.columns= [
      {
        key: "activity_date",
        width :80,
        label :"Activity Date",
        column_type:"date",
      },
      {
        key: "activity",
        width :50,
        label :"Activity",
        column_type:"string",
      },
      {
        key: "space_number",
        width :80,
        label :"Space Number",
        column_type:"string",
      },
      {
        key: "tenant_name",
        width :80,
        label :"Tenant Name",
        column_type:"string",
        summary_column: true,
      },
      {
        key: "move_in_date",
        width :80,
        label :"Move in Date",
        column_type:"date",
      },
      {
        key: "move_out_date",
        width :80,
        label :"Move Out Date",
        column_type:"date",
      },
      {
        key: "space_price",
        width :60,
        label :"Space price",
        column_type:"money",
      },
      {
        key: "tenant_rent",
        width :70,
        label :"Tenant Rent",
        column_type:"money",
      },
      {
        key: "promotion_names",
        width :80,
        label :"Promotion Name",
        column_type:"string",
      },
      {
        key: "discount_names",
        width :80,
        label :"Discount Name",
        column_type:"string",
      },
      {
        key: "last_rent_change",
        width :90,
        label :"Last Rent Change",
        column_type:"date",
      },
      {
        key: "days_rented",
        width :70,
        label :"Days Rented", 
        column_type:"number",
      }
    ];
  }

  async generate(socket){
    console.time('TimeToGeneratePdf');

    var page_width = this.page_width;
    var page_height = this.page_height;

    let ws = new ms.WritableStream()
    let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));

    var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
    var mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
    var boldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Bold.ttf');

    let url = this.company.webLogo && this.company.webLogo.mobile ? this.company.webLogo.mobile: null;
    let rp = url ? await utils.getLogoPath(url, this.company.name) : null;
    this.logoUrl = rp && rp.status === 200 ? rp.path : null;

    let total_width = 0;
    let column_width = 100;
    let textOptions = {
      font: font,
      size: 6,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let titleTextOptions = {
      font: boldFont,
      size: 2,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let current_page = pdfWriter.createPage(0,0,page_width,page_height);
    let cxt = pdfWriter.startPageContentContext(current_page);
    let page_number = 0;

    // get total width of columns so we can know how wide to make them.
    this.columns.map((c, i) => {
      total_width += (c.width || column_width);
    });

    // loop through columns starting with headerss

    let total = {};
    let margin_left = 20;
    let margin_top = 40;
    let margin_bottom = 40;
    let margin_right = 20;
    let row_height = 18 
    let leftOffset = 0;
    let padding = 3;
    let topOffset = page_height - margin_top;
    let header_columns = [];

    let tranformedWidth = null;
    this.columns.map((c, i) => {
      column_width = (( (c.width || column_width ) *  ( page_width - margin_right  - margin_left) ) / total_width);
      tranformedWidth = (( (c.width || column_width ) *  ( page_width - margin_right  - margin_left) ) / total_width),
      header_columns.push({
        value: c.label,
        width: tranformedWidth,
        column_type: c.column_type
      });
      this.columns[i].tranformedWidth = tranformedWidth
    });

    textOptions.font = boldFont;
    await this.printHeaders(cxt, header_columns, margin_left + leftOffset, topOffset, titleTextOptions,textOptions,font,padding,page_width,margin_right,pdfWriter);
    textOptions.font = font;

    var headerOffset = 40;
    var footerOffset = 20;
    leftOffset = 0;
    topOffset -= row_height + headerOffset;
    let current_row = 0;
    let row = 1;
    var column_width_array = [];
    var c_width;

    let data_length = this.data && this.data.length ? this.data.length : 0
    let total_page_no = data_length % 27 === 0 ? (this.data.length / 27) + 1: Math.ceil(this.data.length / 27);
    let pcount = Math.ceil(total_page_no / 100) * 5;

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

      if (row % 2 === 0) {
        cxt.drawRectangle(margin_left + leftOffset, topOffset - ((row_height - padding)  / 2 ), page_width - margin_right - margin_left , row_height, {
          type: 'fill',
          color: 0xf9fafa,
          opacity: 0.9
        })
        textOptions.color = 'black';
        titleTextOptions.color = 'black';
      }
      var calculate_total = false;
      var columns = this.columns;
      await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, columns, c_scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d,total,calculate_total = true);
      leftOffset = 0;

      if ( ( current_row * row_height ) + margin_bottom + margin_top + headerOffset + footerOffset  >= page_height) { // add footer height here as well
        page_number += 1;

        let table_border_height = (row_height * 28 ) + 2;
        cxt.drawRectangle(leftOffset + 20 , 22 , this.page_width - 40 , table_border_height , {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        })


        textOptions.size = 7;
        let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
        await cxt.writeText(printText, margin_left,8, textOptions);

        // If at the bottom of the page, go onto the next page
        topOffset = page_height - margin_top;
        current_row = 0;
        row = 1;
        pdfWriter.writePage(current_page);

        if(socket && page_number % pcount == 0){
          await socket.createEvent("pdf_progress", {
            percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
          })
        }

        current_page = pdfWriter.createPage(0,0,page_width,page_height);
        cxt = pdfWriter.startPageContentContext(current_page);
        // Reprint Headers
        textOptions.font = boldFont;
        await this.printHeaders(cxt, header_columns, margin_left + leftOffset, topOffset, titleTextOptions,textOptions,font,padding,page_width,margin_right,pdfWriter);
        textOptions.font = font;
        
        topOffset -= row_height + headerOffset;

      } else {
        current_row++;
        row++;
        topOffset -= row_height ;
      }
    }

    leftOffset = 0;


    // Print Total Row
    page_number += 1;
    titleTextOptions.size = textOptions.size;

    textOptions.font = mediumFont;
    textOptions.color = 'black';


    if (this.data.length) {
      let table_border_height = (row_height * (current_row + 1)) + 2;
      cxt.drawRectangle(leftOffset + 20 , topOffset + 10.5, this.page_width - 40 , table_border_height , {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.4
      })
    } else {
      let noRecordeFoundOffset = (this.page_width / 2) - margin_left;
      await cxt.writeText('No Data Found', noRecordeFoundOffset, topOffset - 3, textOptions);
      let table_border_height = (row_height * 2) + 5.5;
      cxt.drawRectangle(leftOffset + 20 , topOffset - 11, this.page_width - 40 , table_border_height , {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.4
      })
    }

    textOptions.size = 7;
    textOptions.font = font;
    textOptions.color = 'black';

    let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
    await cxt.writeText(printText, margin_left,8, textOptions);
    
    pdfWriter.writePage(current_page);
    pdfWriter.end();

    console.timeEnd('TimeToGeneratePdf');
    let bufferResult = ws.toBuffer();
    ws.end();

    if(socket){
      await socket.createEvent("pdf_progress", {
        percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
      })
    }

    return bufferResult;
}

  async printHeaders(cxt, header_columns, startingLeftOffset, topOffset, titleTextOptions,textOptions,font,padding,page_width,margin_right, pdfWriter){
    let row_height = 20;
    var h_scale_down_size = 9;
    var report_name = this.report_name;
    
    titleTextOptions.size = 24;
    await cxt.writeText(report_name, startingLeftOffset, topOffset , titleTextOptions);
    titleTextOptions.size = 9;

    let regularFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
    let startDate = moment(this.report_start_date).format('dddd, MMMM Do YYYY');
    let endDate = moment(this.report_end_date).format('dddd, MMMM Do YYYY');
    let report_date = startDate + ' - ' + endDate;

    textOptions.size = 9;
    textOptions.font = regularFont;
    await cxt.writeText(report_date, startingLeftOffset, topOffset - 17, textOptions);

    let squareSize = 100;

    if(this.logoUrl) {
      let dim = pdfWriter.getImageDimensions(this.logoUrl); 
      let imageOptions = {
        transformation: {
          width: 100,
          height: 50,
          proportional: true,
          fit: 'overflow'
        }
      }
      let logoTopOffset =  dim.height >= 50 ? 20 : 10;
      cxt.drawImage(this.page_width - this.margin_right - 100, topOffset - logoTopOffset ,this.logoUrl,imageOptions);
    } else {
      // cxt.drawSquare(this.page_width - this.margin_right - squareSize, topOffset - 18, squareSize, {
      //   type: 'fill',
      //   color: 0xDFE3E8,
      //   opacity: 0.9,
      // })
      squareSize = -8;
    }

    var semiBoldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Semibold-Regular.ttf');
    titleTextOptions.font = semiBoldFont;

    if(this.property.id) {
      let facility_name = utils.formatFacilityName(this.property);
      let facility_address = utils.formatFacilityAddress(this.property.Address);
      let facility_phone = utils.formatPhone(this.property.Phones);
  
      var boldFont  = semiBoldFont;
      var facilityNameDimensions = boldFont.calculateTextDimensions(facility_name,9);
      var facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityNameDimensions.width - 8;
  
      titleTextOptions.size = 9;
      titleTextOptions.color = 'black';
      await cxt.writeText(facility_name, facilityLeftOffset , topOffset + 6.5 , titleTextOptions);
  
      var mediumFont  = textOptions.font;
      textOptions.size = 7;
      textOptions.color = 'black';
  
      var facilityAddressDimensions = mediumFont.calculateTextDimensions(facility_address,7);
      facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityAddressDimensions.width - 8;
      await cxt.writeText(facility_address, facilityLeftOffset , topOffset - 6 , textOptions);
  
      var facilityPhoneDimensions = mediumFont.calculateTextDimensions(facility_phone,7);
      facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityPhoneDimensions.width - 8;
  
      await cxt.writeText(facility_phone, facilityLeftOffset , topOffset - 17 , textOptions);
    } else {
      var companyNameDimensions = font.calculateTextDimensions(this.company.name,9);
      var companyLeftOffset = this.page_width -  this.margin_right - squareSize - companyNameDimensions.width;
      titleTextOptions.color = 'black';
      await cxt.writeText(this.company.name, companyLeftOffset - 10, topOffset + 8 , titleTextOptions);

      let company_phone = utils.formatPhone([this.company]);

      var mediumFont  = textOptions.font;
      textOptions.size = 7;
      textOptions.color = 'black';

      let companyPhoneDimensions = mediumFont.calculateTextDimensions(company_phone,7);
      companyLeftOffset = this.page_width -  this.margin_right - squareSize - companyPhoneDimensions.width - 7;
  
      await cxt.writeText(company_phone, companyLeftOffset , topOffset - 6 , textOptions);
    }


    topOffset = topOffset - (row_height) - 20


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

    cxt.drawRectangle(startingLeftOffset, topOffset - ((row_height - 5)/2), page_width -20 - 20 , row_height, {
      type: 'fill',
      color: 0xDFE3E8,
      opacity: 0.9
    })

    let borderTop = {
      start_x: this.margin_right,
      start_y: topOffset - ((row_height - 5)/2),
      end_x: this.page_width - this.margin_right,
      end_y: topOffset - ((row_height - 5)/2)
    }

    cxt.drawPath(borderTop.start_x,borderTop.start_y,borderTop.end_x,borderTop.end_y, {
      color: 0x808080,
      opacity: 1,
      width :0.4
    });
    
    var mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
    textOptions.color = 'black';
    textOptions.font = mediumFont;

    let total_width = 100;
    let column_width = 1;
    let margin_left = 0;
    let d = '';
    let total = '';
    let calculate_total = false;
    await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, header_columns, h_scale_down_size ,column_width ,margin_left , startingLeftOffset ,padding, topOffset, textOptions, d,total,calculate_total);
  }

  async truncate_text(page_width,margin_right,total_width,pdfWriter,cxt,columns, scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d, total,calculate_total){

    var font = calculate_total ? pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Gotham-Medium-Regular.ttf'): textOptions.font;
    let textSplitFlag = false;
    for(let j = 0; j < columns.length; j++){
      let value = '';
      let c = '';
      if (calculate_total){
        c = columns[j];
        
        if(c.column_type === 'address') {
          value =  this.formatAddress(d,c);
        } else {
          value =  this.formatCell(d[c.key],c);
        }
        if(!value) value = '';
        column_width = columns[j].tranformedWidth;
      }
      else {
        value = columns[j].value;
        column_width = columns[j].width;
      }

      var textDimensions = font.calculateTextDimensions(value+'',scale_down_size);
      textOptions.size = scale_down_size;
      if (textDimensions.width > column_width) {
        var start = 0;
        var end = 0;
        end = value.length;
        let round_off_column_width = Math.floor(column_width);
        let char_capacity = Math.floor(round_off_column_width / 3);
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
          case (scale_down_size == 9):
            end = char_capacity - 9;
              break;
          default:
            end = char_capacity;
              break;
        }

        let toltalLength = value.length;
        let noOfSubRows = Math.ceil(toltalLength / (end));
        let subRows = [];
        let t_start = 0;
        let t_end = end;

        let seprator = ' ';
        if(columns[j].column_type === 'concat') {
          seprator = ','
        }

        let valueArray = this.wrapText(value,end, seprator);
        if(valueArray.length > 1) {
          subRows = valueArray;

        } else {
          for(let k=0; k < noOfSubRows; k++){
            subRows.push(value.slice(t_start,t_end))
            t_start = t_end;
            t_end += end 
          }
        }

        let row_height = 15.5;
        let m_top = 0;
        let text_lines = subRows.length;
        
        if(text_lines === 1 ){
          m_top -= scale_down_size;
        } else if (text_lines === 2 ) {
            if(!calculate_total){
              m_top = (scale_down_size > 6 ? -scale_down_size/2 : -scale_down_size); 
            } else{
              m_top = (scale_down_size > 6 ? -scale_down_size/2 : -3.5); 
            }
        }  else if (text_lines >= 3) {
          m_top = - 2;
        }

        let newTopOffset = topOffset + scale_down_size + m_top;
        let newCeilLeftOffSet = 0;
        for(let l = 0 ; l< subRows.length; l++){

          newCeilLeftOffSet = margin_left + leftOffset + padding;

          if((columns[j].column_type === 'money' || this.columns[j].column_type === 'number') && !calculate_total) {
            newCeilLeftOffSet = newCeilLeftOffSet + columns[j].width - (padding * 2);
            let moneyTextDimensions = font.calculateTextDimensions(subRows[l],scale_down_size);
            newCeilLeftOffSet -= moneyTextDimensions.width;
          }

          await cxt.writeText(subRows[l].trim(), newCeilLeftOffSet , newTopOffset, textOptions);
          newTopOffset = newTopOffset - scale_down_size - 1;
          if(newTopOffset <= (topOffset - row_height) || l === 1){ // max 4 row allow
            break;
          }
        }
        
        textSplitFlag = true;
      }
      else {
        if(Math.round(column_width - textDimensions.width) <= 3){
          textSplitFlag = true;
          let valueArray = this.wrapText(value,value.length - 2);
          if(valueArray.length === 1) {
            valueArray = [];
            valueArray.push(value.slice(0,value.length - 2));
            valueArray.push(value.slice(value.length - 2,value.length));
          }

          if((columns[j].column_type === 'money' || this.columns[j].column_type === 'number') && !calculate_total) {
            let newCeilLeftOffSet = 0;
            let newTopOffset = topOffset + (scale_down_size > 6 ? 3 : 0); 

            for(let n=0; n< valueArray.length; n++) {
              newCeilLeftOffSet = margin_left + leftOffset +  columns[j].width - padding;
              let moneyTextDimensions = font.calculateTextDimensions(valueArray[n],scale_down_size);
              newCeilLeftOffSet -= moneyTextDimensions.width;

              await cxt.writeText(valueArray[n], newCeilLeftOffSet , newTopOffset, textOptions);
              newTopOffset = newTopOffset - scale_down_size - 1;

            }

          } else {
            let newTopOffset = topOffset + (scale_down_size > 6 ? 3 : 0); 
            await cxt.writeText(valueArray[0], margin_left + leftOffset + padding, newTopOffset, textOptions);
            await cxt.writeText(valueArray[1], margin_left + leftOffset + padding, newTopOffset - scale_down_size - 1, textOptions);
          }

        }
      }

      let newLeftOffSet = margin_left + leftOffset + padding
      
      if(!textSplitFlag) {
        // right align the cell
        if(columns[j].column_type === 'money' || this.columns[j].column_type === 'number') {
          if (calculate_total){
            newLeftOffSet =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
            newLeftOffSet += margin_right - padding
          }
          else {
            newLeftOffSet = leftOffset + columns[j].width - padding;
          }
          newLeftOffSet -= textDimensions.width;
        }
        await cxt.writeText(value, newLeftOffSet , topOffset, textOptions);
      }

      textSplitFlag = false;
      // very important logic for cell spacing
      if (calculate_total){
        leftOffset =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
      }
      else {
       leftOffset += columns[j].width
      }

      // logic for drawing ceil right border

      // let borderTop = topOffset + 15.5;
      // let borderLeft = leftOffset;
      // if(calculate_total){
      //   borderLeft += 20;
      // }
      // let borderObj = {
      //   start_x: borderLeft,
      //   start_y: borderTop,
      //   end_x: borderLeft,
      //   end_y: borderTop - 27
      // }
  
      // cxt.drawPath(borderObj.start_x,borderObj.start_y,borderObj.end_x,borderObj.end_y, {color: 'white'});
      

      // add numbers, and count strings
      if (calculate_total){
        total[j] = +total[j] || 0;
        //if(c.column_type === 'money' || c.column_type === 'number') {
        if(c.column_type === 'money') {
          d[c.key] = parseFloat(d[c.key]);
          total[j] += (d[c.key] || 0);
        } 
        // else {
        //   if(d[c.key]){
        //     total[j]++
        //   }
        // }
      }
    }
  }

  formatCell(data,col){
    switch(col.column_type.toLowerCase()){
      case 'string':
        return data;
        break;
      case 'money':
        return utils.formatMoney(data);
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
      case 'date2':
        return utils.formatDate(data);
        break;
      case 'boolean':
        return data ? 'Y' : 'N';
        break;
      case 'datetime':
        return utils.formatLocalDateTime(data,this.timeZone);
        break;
      default:
        return data;
    }
  }

  formatAddress(data, col){
    let root = col.key.substring(0,col.key.lastIndexOf('_'));
    let address = data[col.key] || null;
    if(address){
      if(data[root + '_address2']) address += ' #' + data[root + '_address2'];
      if(data[root + '_city'] || data[root + '_state'] || data[root + '_country'] || data[root + '_zip']){
        address += " ";
        if(data[root + '_city']) address += data[root + '_city'] + ' ';
        if(data[root + '_state']) address += data[root + '_state'] + ' ';
        if(data[root + '_country']) address += data[root + '_country'] + ' ';
        if(data[root + '_zip']) address += data[root + '_zip'];
      }
    }
    return address;
  }

  wrapText(value, limit, seprator = ' ') {
    let words = value.split(seprator).filter(e => e);
    let subRows = [];
    let str = ''
    if (words.length && words[0].length) {
      str = words[0];
      if (str.length > limit){
        subRows = this.splitText(words[0],limit);
      } else {
        subRows.push(words[0]);
      }
    }

    for (var i = 1; i < words.length; i++) {
      if (words[i].length + subRows[subRows.length - 1].length < limit) {
        subRows[subRows.length - 1] = `${subRows[subRows.length - 1]}${seprator}${words[i]}`;
      } else {
        str = words[i];
        if (str.length > limit){
          subRows.concat(this.splitText(words[i],limit));
        } else {
          subRows.push(words[i]);
        }
      }
    }
    return subRows;
  }

  async longest_string(array_of_string){
    var max = array_of_string[0].length;
    array_of_string.map( v => max = Math.max(max, v.length));
    var result = array_of_string.filter(v => v.length == max);
    return result;
  }

  splitText(value,limit){
    let regex = '.{1,' + limit + '}(\s|$)' + ('|.{' + limit + '}|.+$');
    let str = value.match( RegExp(regex, 'g') ).join('<>');
    return str.split('<>');
  }

  async scale_down_size(scale_down_size){
    // return 9;
    switch ( true ) {
      case (scale_down_size <= 5):
        scale_down_size = 6;
          break;
      case (scale_down_size > 5 && scale_down_size < 8 ):
        scale_down_size = 7;
          break;
      default:
        scale_down_size = 8;
          break;
    }
    return scale_down_size;
  }

}


module.exports = SpaceActivity;