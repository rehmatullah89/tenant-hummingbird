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

class AccountantSummary {
  constructor(body){
    
    this.data = body.data || [];
    this.columns = [];
    this.report_name = 'Balance Sheet';
    this.report_start_date = body.start_date;
    this.report_end_date = body.end_date;
    this.property = this.data.length > 0 ? this.data[0].property : {};
    this.company = body.company;
    this.timeZone = body.timeZone;

    this.page_width = 595;
    this.page_height = 842;

    this.margin_left = 20;
    this.margin_right = 20;
    this.margin_top = 35;
    this.margin_bottom = 15;
    this.padding = 3;

    this.logoUrl = null;
    this.total_rows_count = 0;
    this.setConfig();
  }

  setConfig(){
    this.data.map((d,i) =>{
      this.data[i].property_rows = 0;
      d.event_sections.forEach((sec,j) => {
        let total_width = 200;
        this.data[i].event_sections[j].total_width = total_width;
        this.data[i].event_sections[j].columns = [
          { key: "gl_account", width :(( 70 *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width), value : `GL Accounts - ${sec.book_type} book`, column_type:"string" },
          { key: "credit", width :(( 65 *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width), value : "Credit", column_type:"money" },
          { key: "debit", width :(( 65 *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width), value : "Debit", column_type:"money" }
        ] 
        this.data[i].event_sections[j].total_width = this.data[i].event_sections[j].columns.map(c=>c.width).reduce((acc,c)=> acc + c);
        this.data[i].event_sections[j].creditTotal = this.data[i].event_sections[j].entries.map(c=>c.credit).reduce((acc,c)=> acc + c);
        this.data[i].event_sections[j].debitTotal = this.data[i].event_sections[j].entries.map(c=>c.debit).reduce((acc,c)=> acc + c);
        this.data[i].property_rows += 2; //section header and footer
        this.data[i].property_rows += this.data[i].event_sections[j].entries.length;
      });

      this.data[i].page_count = this.data[i].property_rows % 40 === 0 ? (this.data[i].property_rows / 40) : Math.ceil(this.data[i].property_rows / 40);

    });
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
      size: 9,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions = {
      font: mediumFont,
      size: 11,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let boldTextOptions = {
      font: boldFont,
      size: 21,
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

    let total = {};
    let margin_left = 20;
    let margin_top = 35;
    let margin_right = 20;
    let row_height = 18 
    let leftOffset = 0;
    let padding = 3;
    let topOffset = page_height - margin_top;
    let originalPageWidth = this.page_width;

    c_scale_down_size = await this.scale_down_size(c_scale_down_size);
    
    textOptions.font = boldFont;
    await this.printHeader(this.data[0].property,cxt,pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions);
    textOptions.font = font;

    textOptions.size = c_scale_down_size; // body font

    var headerOffset = 40;
    var footerOffset = 40;
    leftOffset = 0;
    topOffset -= headerOffset;
    let current_row = 0;
    let row = 1;
    let total_page_no = 0;
    let lastSectionHeightAfterPageBreak = 0;

    total_page_no += this.data.map(x=>x.page_count).reduce((acc,c)=> acc + c);
    total_page_no = total_page_no === 0 ? 1 : total_page_no;
    let pcount = Math.ceil(total_page_no / 100) * 5;
    
    // loop at each property data
    for(let k = 0; k < this.data.length; k++){

      if(k > 0) {
        this.property = this.data[k].property;
        this.page_width = originalPageWidth;
        current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
        cxt = pdfWriter.startPageContentContext(current_page);

        topOffset = page_height - margin_top;
        leftOffset = 0;
        current_row = 0;
        row = 1;
        total={};

        await this.printHeader(this.data[k].property,cxt,pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions)
        topOffset -= headerOffset;
      }
     
      // loop for each book
      for(let i = 0; i < this.data[k].event_sections.length; i++){

        let section = this.data[k].event_sections[i];
        topOffset -= row_height;
        this.printTableHeader(section,cxt,leftOffset,topOffset,padding,mediumTextOptions);
        topOffset -= 10;
        row = 1;
        lastSectionHeightAfterPageBreak = 0;

        for (let j = 0; j < section.entries.length; j++) {
          const d = section.entries[j];
          
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
          var columns = section.columns;
          total_width = section.total_width;
          await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, columns, c_scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d,total,calculate_total = true);
          //leftOffset = 0;

          if(j+1 === section.entries.length){
            let table_border_height = (row_height * (j+2) ) - 1.5 - lastSectionHeightAfterPageBreak;
            lastSectionHeightAfterPageBreak = 0;
            topOffset -= row_height;

            await this.printSummaryRow(cxt, section, topOffset, leftOffset, table_border_height, section.entries.length, row_height, textOptions);
          }

          if (topOffset - footerOffset <= 40) { // add footer height here as well
            
            let table_border_height = (row_height * (row +1) );
            lastSectionHeightAfterPageBreak = table_border_height - row_height - 2;
            cxt.drawRectangle(leftOffset + 20 , topOffset - 7 , this.page_width - 40 , table_border_height - 1.5 , {
              type: 'stroke',
              color: 0x808080,
              opacity: 1,
              width :0.4
            })
            
            
            if(i+1 === this.data[k].event_sections.length && j+1 === section.entries.length) continue;
            
            page_number += 1;
            
            textOptions.size = 8;
            let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
            await cxt.writeText(printText, margin_left, 10, textOptions);
            
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
            await this.printHeader(this.data[k].property,cxt,pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions)
            topOffset -= (headerOffset + 10);

            if(j+1 !== section.entries.length) {
              this.printTableHeader(section,cxt,leftOffset,topOffset,padding,mediumTextOptions);
              topOffset -= 12;
            }

          } else {
            current_row++;
            row++;
            topOffset -= row_height ;
          }
        }
      }
  
      leftOffset = 0;
  
      // Print Total Row
      page_number += 1;
      textOptions.size = 8;
      textOptions.font = font;
      textOptions.color = 'black';
  
      let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
      await cxt.writeText(printText, margin_left, 10, textOptions);
      pdfWriter.writePage(current_page);

      if(socket && page_number % pcount == 0){
        await socket.createEvent("pdf_progress", {
          percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
        })
      }

    }
    
    pdfWriter.end();
    console.timeEnd('TimeToGeneratePdf');
    let bufferResult = ws.toBuffer();
    ws.end();
    return bufferResult;
  }

  async printSummaryRow(cxt, section, topOffset, leftOffset, table_border_height, rows, row_height, textOptions){
    
    cxt.drawRectangle(20, topOffset - ((row_height - 5)/2), this.page_width -20 - 20 , row_height, {
      type: 'fill',
      color: 0xDFE3E8,
      opacity: 0.9
    });

    cxt.drawRectangle(leftOffset + 20 , topOffset - 6.5, this.page_width - 40 , table_border_height , {
      type: 'stroke',
      color: 0x808080,
      opacity: 1,
      width :0.4
    })

    let borderTop = {
      start_x: this.margin_right,
      start_y: topOffset + ((row_height)/2) + 2.5,
      end_x: this.page_width - this.margin_right,
      end_y: topOffset + ((row_height)/2) + 2.5
    }

    cxt.drawPath(borderTop.start_x,borderTop.start_y,borderTop.end_x,borderTop.end_y, {
      color: 0x808080,
      opacity: 1,
      width :0.4
    });
    
    let summaryLeftOffset = this.margin_left + this.padding;

    let columns = section.columns;
    for(let j=0; j < columns.length ; j++){

      let c = columns[j];
      let value = '';
      if(j === 0) {
        value = `${rows} Rows`;
        await cxt.writeText(value, summaryLeftOffset, topOffset, textOptions);
      } else if (c.key === 'credit') {
        value = this.formatTotal(section.creditTotal, c);
      } else if (c.key === 'debit') {
        value = this.formatTotal(section.debitTotal, c);
      }

      if(columns[j].column_type === 'money') {
        let summaryDateDimensions = textOptions.font.calculateTextDimensions(value,textOptions.size);
        await cxt.writeText(value, summaryLeftOffset + c.width - summaryDateDimensions.width - ((this.padding * 2) + 1 ), topOffset, textOptions);
      }
      
      summaryLeftOffset += c.width;
      
    }
  }

  async printHeader(property, cxt,pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions) {
    boldTextOptions.size = 24;
    leftOffset = this.margin_left;
    await cxt.writeText(this.report_name, leftOffset, topOffset, boldTextOptions);

    let startDate = moment(this.report_start_date).format('dddd, MMMM Do YYYY');
    let endDate = moment(this.report_end_date).format('dddd, MMMM Do YYYY');
    let report_date = (this.report_start_date ? startDate + ' - ': '') + endDate;

    mediumTextOptions.size = 9;
    await cxt.writeText(report_date, leftOffset, topOffset - 17, mediumTextOptions);

    let squareSize = 100;

    if(this.logoUrl) {
      let dim = pdfWriter.getImageDimensions(this.logoUrl); 
      let imageOptions = {
        transformation: {
          width: 100,
          height: 50,
          fit: 'overflow'
        }
      }
      let logoTopOffset =  dim.height >= 50 ? 30 : 20;
      cxt.drawImage(this.page_width - this.margin_right - 100, topOffset - logoTopOffset,this.logoUrl,imageOptions);
    } else {
      // cxt.drawSquare(this.page_width - this.margin_right - squareSize, topOffset - 18, squareSize, {
      //   type: 'fill',
      //   color: 0xDFE3E8,
      //   opacity: 0.9,
      // })
      squareSize = -8;
    }

    let facility_name = utils.formatFacilityName(property);
    let facility_address = utils.formatFacilityAddress(property.Address);
    let facility_phone = utils.formatPhone(property.Phones);
    
    var boldFont  = boldTextOptions.font;
    var facilityNameDimensions = boldFont.calculateTextDimensions(facility_name,9);
    var facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityNameDimensions.width - 8;

    boldTextOptions.size = 9;
    boldTextOptions.color = 'black';
    await cxt.writeText(facility_name, facilityLeftOffset , topOffset + 6.5 , boldTextOptions);

    var mediumFont  = mediumTextOptions.font;
    mediumTextOptions.size = 7;
    mediumTextOptions.color = 'black';

    var facilityAddressDimensions = mediumFont.calculateTextDimensions(facility_address,7);
    facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityAddressDimensions.width - 8;
    await cxt.writeText(facility_address, facilityLeftOffset , topOffset - 6 , mediumTextOptions);

    var facilityPhoneDimensions = mediumFont.calculateTextDimensions(facility_phone,7);
    facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityPhoneDimensions.width - 8;

    await cxt.writeText(facility_phone, facilityLeftOffset , topOffset - 17 , mediumTextOptions);
    
    /*let emailOffset = property.Phones.length ? 28 : 17

    if (property.Emails.length) {
      let facility_email = property.Emails[0].email;
      let facilityEmailDimensions = mediumFont.calculateTextDimensions(facility_email, 7);
      facilityLeftOffset = this.page_width - this.margin_right - squareSize - facilityEmailDimensions.width - 8;
      await cxt.writeText(property.Emails[0].email, facilityLeftOffset , topOffset - emailOffset , mediumTextOptions);
    }*/

  }

  async printTableHeader(section,cxt, leftOffset, topOffset, padding, mediumTextOptions) {

    //mediumTextOptions.size = 9;
    //if(!section.hideNames) await cxt.writeText(section.event_category, leftOffset + padding, topOffset , mediumTextOptions);

    //topOffset -= 25;
    leftOffset = this.margin_left;
    let row_height = 18;
    if(!section.hideNames)
    {
      // cxt.drawRectangle(leftOffset, topOffset, this.page_width - this.margin_left - this.margin_right , row_height, {
      //   type: 'stroke',
      //   color: 0x808080,
      //   opacity: 1,
      //   width : 0.4
      // });
    
      cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
        type: 'fill',
        color: 0xDFE3E8,
        opacity: 0.9
      });

      cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 18 , {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.4
      })
    }else{
      cxt.drawRectangle(leftOffset + 0.3, topOffset +row_height+12 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
        type: 'fill',
        color: 0xDFE3E8,
        opacity: 0.9
      });
      
      cxt.drawRectangle(leftOffset, topOffset+row_height+12, this.page_width - this.margin_left - this.margin_right , row_height, {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width : 0.4
      });
    }

    let col = null;
    let leftMargin = this.margin_left;
    let textDimensions = null;

    mediumTextOptions.size = 9;
    mediumTextOptions.color = 'black';

    for(let k=0; k<section.columns.length; k++) {
      col = section.columns[k];
      if(col.column_type === 'money') {
        textDimensions = mediumTextOptions.font.calculateTextDimensions(col.value,mediumTextOptions.size);
        await cxt.writeText(col.value, leftMargin + col.width - textDimensions.width - padding - 1, topOffset + 6 + (section.hideNames? 30 : 0), mediumTextOptions);
      } else {
        await cxt.writeText(col.value, leftMargin + padding, topOffset + 6 + (section.hideNames? 30 : 0), mediumTextOptions);
      }
      
      leftMargin = leftMargin + col.width;
    }
    
   // topOffset =  section.hideNames? topOffset - row_height + 26 : topOffset - row_height - 0.2;
    return topOffset;
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
        column_width = columns[j].width;
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

          if((columns[j].column_type === 'money' || columns[j].column_type === 'number') && !calculate_total) {
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

          if((columns[j].column_type === 'money' || columns[j].column_type === 'number') && !calculate_total) {
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
        if(columns[j].column_type === 'money' || columns[j].column_type === 'number') {
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

    if(d.account_name && d.account_name.toLowerCase() === '999 credit'){
      let left = (margin_left * 3) + padding;
      let top = topOffset - (scale_down_size / 2);
      await cxt.writeText("999 accounts corresponds to transactions", left ,top, textOptions);
    }

    if(d.account_name && d.account_name.toLowerCase() === '999 debit'){
      let left =  (margin_left * 3) + padding;
      let top = topOffset + (scale_down_size / 2);
      await cxt.writeText("for products with no assigned GL account.", left , top, textOptions);
    }
  }

  formatCell(data,col){
    switch(col.column_type.toLowerCase()){
      case 'string':
        return data;
        break;
      case 'money':
        if(col.negative) {
          return `(${utils.formatMoney(data)})`;
        } else {
          return utils.formatMoney(data);
        }
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
      if(data[root + '_city'] || data[root + '_state'] || data[root + '_country'] ||  data[root + '_zip']){
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
    return 9;
  }

  formatTotal(data,col){

    switch(col.column_type.toLowerCase()){
      case 'money':
        if(col.negative) {
          return `(${utils.formatMoney(data)})`;
        } else {
          return utils.formatMoney(data);
        }
      case 'number':
        return utils.formatNumberInMillion(data);
      default:
        return data;
    }
  }

}


module.exports = AccountantSummary;