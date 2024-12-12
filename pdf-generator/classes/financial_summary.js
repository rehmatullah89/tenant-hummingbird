'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var moment = require('moment');
var ms = require('memory-streams');


var settings = {
    config:{
      base_path: `${__dirname}/../public/`
    }
  }

class FinancialSummary {

    constructor(data) {

      this.data = data;

      this.page_width = 1100;
      this.page_height = 595;
  
      this.margin_left = 15;
      this.margin_right = 15;
      this.margin_top = 23;
      this.margin_bottom = 15;
  
      this.config = [];
  
      this.font = null;
      this.mediumFont  = null;
      this.boldFont  = null;
      this.logoUrl = null;
      }

      setConfig(){

        let financial = this.data.data.financial;

        let total_amount_discount = financial.reduce(function(tot, arr) {
            return tot + arr.discount;
        }, 0);
        let total_amount_charge = financial.reduce(function(tot, arr) {
            return tot + arr.charge;
        }, 0);
        let total_amount_tax_charge= financial.reduce(function(tot, arr) {
            return tot + arr.tax_charge;
        }, 0);
        let total_amount_total_charge = financial.reduce(function(tot, arr) {
            return tot + arr.total_charge;
        }, 0);
        let total_amount_payment= financial.reduce(function(tot, arr) {
            return tot + arr.payment;
        }, 0);
        let total_amount_payment_tax = financial.reduce(function(tot, arr) {
            return tot + arr.payment_tax;
        }, 0);
        let total_amount_total_payment= financial.reduce(function(tot, arr) {
            return tot + arr.total_payment;
        }, 0);
        let total_amount_total_credit = financial.reduce(function(tot, arr) {
            return tot + arr.credit;
        }, 0);
        let total_amount_total_credit_tax= financial.reduce(function(tot, arr) {
            return tot + arr.credit_tax;
        }, 0);
        let total_amount_total_total_credit = financial.reduce(function(tot, arr) {
            return tot + arr.total_credit;
        }, 0);

        financial.push(
            {
              key: 'Total',
              name: 'Total',
              //product_name: utils.formatNumber(totalProduct),
              total_buttom: "Total",
              discount: total_amount_discount,
              charge: total_amount_charge,
              tax_charge: total_amount_tax_charge,
              total_charge: total_amount_total_charge,
              payment: total_amount_payment,
              payment_tax: total_amount_payment_tax,
              total_payment: total_amount_total_payment,
              credit: total_amount_total_credit,
              credit_tax: total_amount_total_credit_tax,
              total_credit: total_amount_total_total_credit,
              isfooter: true
            }
        )

        

        this.config.push({
            name: 'Financial Summary',
            pos: 'left',
            columns: [
                {
                    key: 'gl_code',
                    name:'GL Account',
                    type: 'string',
                    width: 12
                },
                {
                    key: 'product_name',
                    name:'Product',
                    type: 'string',
                    width: 20
                },
                {
                    key: 'total_buttom',
                    name:'',
                    type: 'string',
                    width: 20
                },
                {
                    key: 'discount',
                    name:'Discount',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'charge',
                    name:'Charge',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'tax_charge',
                    name:'Tax',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'total_charge',
                    name:'Total',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'payment',
                    name:'Payment',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'payment_tax',
                    name:'Tax',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'total_payment',
                    name:'Total',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'credit',
                    name:'Credit',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'credit_tax',
                    name:'Tax',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'total_credit',
                    name:'Total',
                    type: 'money',
                    width: 8
                }
            ],
            rows: financial
        })




      }

      async generate(socket){

        let ws = new ms.WritableStream()
        let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));
    
        this.font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
        this.mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
        this.boldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Bold.ttf');
    
        var font = this.font;
        var mediumFont  = this.mediumFont;
        var boldFont  = this.boldFont;
    
        let url = this.data.company.webLogo && this.data.company.webLogo.mobile ? this.data.company.webLogo.mobile: null;
        let rp = url ? await utils.getLogoPath(url, this.data.company.name) : null;
        this.logoUrl = rp && rp.status === 200 ? rp.path : null;
    
        let textOptions = {
          font: font,
          size: 10,
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
    
        let current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
        let cxt = pdfWriter.startPageContentContext(current_page);
    
        let topOffset = this.page_height - this.margin_top;
        let leftOffset = this.margin_left;
        let padding = 5;
    
        await this.printHeader(cxt,pdfWriter, leftOffset, topOffset, textOptions, boldTextOptions)
        topOffset -= 20;
        //await this.PrintNetSummary(cxt,leftOffset,topOffset,mediumTextOptions)
        //topOffset -= 20;
    
        let row_height = 15;
        let table_border_height = null;
        let section = null
        let section_rows = 0;
        let total_width = 0;
        let page_number = 0;
    
        let data_length = this.data.data.financial && this.data.data.financial.length ? this.data.data.financial.length : 0;
    
        let total_page_no = data_length % 50 === 0 ? (data_length / 50) + 1: Math.ceil(data_length / 50);
        let pcount = Math.ceil(total_page_no / 100) * 5;
       
    
        this.setConfig();
    
        for(let i=0 ;i<this.config.length; i++) { // section loop
    
          section = this.config[i];
          topOffset -= 45;
          let row = null;
          let col = null;
          let newLeftMargin = this.margin_left;
          let newTextOptions = null;
          let newTopOffset = topOffset;
          let value = null;
          let textDimensions = null;
    
          total_width = section.columns.reduce((a, b) => a + b.width, 0);
          section.columns.forEach(col => {
            col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width)
          });
          

              let sec = {columns: [
                {
                    key: 'gl_code',
                    name:'',
                    type: 'string',
                    width: 20
                },
                {
                    key: 'product_name',
                    name:'',
                    type: 'string',
                    width: 20
                },
                {
                    key: 'total_buttom',
                    name:'',
                    type: 'string',
                    width: 20
                },
                {
                    key: 'total_discount',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'charge',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'charge_tax',
                    name:'Charges',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'charge_total',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'payment',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'payment_tax',
                    name:'Payments',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'payment_total',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'credit',
                    name:'',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'credit_tax',
                    name:'Credits',
                    type: 'money',
                    width: 8
                },
                {
                    key: 'credit_total',
                    name:'Total',
                    type: 'money',
                    width: 8
                }
            ]}
            topOffset = await this.printSummary(sec,cxt,leftOffset,topOffset + 22,padding,mediumTextOptions,boldTextOptions);
            topOffset = await this.printSummary(section,cxt,leftOffset,topOffset,padding,mediumTextOptions,boldTextOptions);
    
          newTopOffset = topOffset;
          section_rows = 0;
    
          for(let j=0; j<section.rows.length; j++){//loop rows
            row = section.rows[j];
            section_rows++;
            

            //var startPoint = {x:100, y:100}
            //var endPoint = {x:100, y:150}

            //cxt.drawPath(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            
            if (j % 2 === 1 && !row.isfooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xf9fafa,
                opacity: 0.9
              })
            }else if(row.isfooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xDFE3E8,
                opacity: 0.9
              });
              
            }
    
            await this.truncate_text(this.page_width,this.margin_right,total_width,cxt, section.columns,
              8 ,1 ,this.margin_left , 0 ,padding, newTopOffset + 3, textOptions, row,true);
    
            // border should plot after end of the row 
            if (j === (section.rows.length - 1)){
              table_border_height = row_height * section_rows;
              cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height , {
                type: 'stroke',
                color: 0x808080,
                opacity: 1,
                width :0.4
              })
              topOffset = newTopOffset + 5;
            }
            newTopOffset -= row_height;
            let pageBreak = i === 0 && (j === (section.rows.length - 1))  && section.rows.length > 1 && newTopOffset <= 59;
    
            if(newTopOffset <= (this.margin_bottom) || pageBreak) {
              newTopOffset += row_height;
              page_number++;
              
              if(!pageBreak) {
                table_border_height = (row_height * section_rows ) ;
                cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height  , {
                  type: 'stroke',
                  color: 0x808080,
                  opacity: 1,
                  width :0.4
                })
              }
    
              let printText = `Printed on ${utils.formatLocalTimeZone(this.data.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
              await cxt.writeText(printText, this.margin_left,10, textOptions);
            
              pdfWriter.writePage(current_page);

              if(socket && page_number % pcount == 0){
                await socket.createEvent("pdf_progress", {
                  percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
                })
              }

              current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
              cxt = pdfWriter.startPageContentContext(current_page);
    
              topOffset = this.page_height - this.margin_top;
              leftOffset = this.margin_left;
              
              await this.printHeader(cxt, pdfWriter,leftOffset, topOffset, textOptions, boldTextOptions);
              topOffset -= 66;
    
              mediumTextOptions.size = 7;
              mediumTextOptions.color = 'black';
    
              if(!pageBreak) {
                //topOffset = await this.printTableHeader(section,cxt,leftOffset,topOffset + 6,padding,mediumTextOptions,boldTextOptions);
                topOffset = await this.printSummary(sec,cxt,leftOffset,topOffset + 22,padding,mediumTextOptions,boldTextOptions);
                topOffset = await this.printSummary(section,cxt,leftOffset,topOffset,padding,mediumTextOptions,boldTextOptions);
                topOffset += 0; //4
              } else {
                topOffset += 15;
              }
    
              newTopOffset = topOffset;
              section_rows = 0;
            }
    
          }
          
          if(section.rows.length === 0) {
            let noRecordeFoundOffset = (this.page_width / 2) - this.margin_left;
            await cxt.writeText('No Data Found', noRecordeFoundOffset, topOffset + 8, textOptions);
            let table_border_height = row_height * 2;
            cxt.drawRectangle(leftOffset , topOffset, this.page_width - 40 , table_border_height , {
              type: 'stroke',
              color: 0x808080,
              opacity: 1,
              width :0.4
            })
            topOffset -= 20;
          }
        }
    
        page_number++;
        let printText = `Printed on ${utils.formatLocalTimeZone(this.data.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
        await cxt.writeText(printText, this.margin_left,10, textOptions);
        pdfWriter.writePage(current_page);
        pdfWriter.end();

        let bufferResult = ws.toBuffer();
        ws.end();

        if(socket){
          await socket.createEvent("pdf_progress", {
            percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
          })
        }

        return bufferResult;
      }


      async printHeader(cxt, pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions) {
        boldTextOptions.size = 20;
        await cxt.writeText('Financial Summary', leftOffset, topOffset, boldTextOptions);
    
        let startDate = moment(this.data.start_date).format('dddd, MMMM Do YYYY');
        let endDate = moment(this.data.end_date).format('dddd, MMMM Do YYYY');
        let report_date = startDate + ' - ' + endDate;
    
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
          let logoTopOffset = 20;
          cxt.drawImage(this.page_width - this.margin_right - 100, topOffset - logoTopOffset,this.logoUrl,imageOptions);
        } else {
          // cxt.drawSquare(this.page_width - this.margin_right - squareSize, topOffset - 18, squareSize, {
          //   type: 'fill',
          //   color: 0xDFE3E8,
          //   opacity: 0.9,
          // })
          squareSize = -8;
        }
    
        let facility_name = utils.formatFacilityName(this.data.property);
        let facility_address = utils.formatFacilityAddress(this.data.property.Address);
        let facility_phone = utils.formatPhone(this.data.property.Phones);
    
        var boldFont  = boldTextOptions.font;
        var facilityNameDimensions = boldFont.calculateTextDimensions(facility_name,9);
        var facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityNameDimensions.width - 8;
    
        boldTextOptions.size = 9;
        boldTextOptions.color = 'black';
        await cxt.writeText(facility_name, facilityLeftOffset , topOffset + 13 , boldTextOptions);
    
        var mediumFont  = mediumTextOptions.font;
        mediumTextOptions.size = 7;
        mediumTextOptions.color = 'black';
    
        var facilityAddressDimensions = mediumFont.calculateTextDimensions(facility_address,7);
        facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityAddressDimensions.width - 8;
        await cxt.writeText(facility_address, facilityLeftOffset , topOffset + 3 , mediumTextOptions);
    
        var facilityPhoneDimensions = mediumFont.calculateTextDimensions(facility_phone,7);
        facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityPhoneDimensions.width - 8;
    
        await cxt.writeText(facility_phone, facilityLeftOffset , topOffset - 7 , mediumTextOptions);
        
        let emailOffset = this.data.property.Phones.length ? 17 : 7
    
        if (this.data.property.Emails.length) {
          let facility_email = this.data.property.Emails[0].email;
          let facilityEmailDimensions = mediumFont.calculateTextDimensions(facility_email, 7);
          facilityLeftOffset = this.page_width - this.margin_right - squareSize - facilityEmailDimensions.width - 8;
          await cxt.writeText(this.data.property.Emails[0].email, facilityLeftOffset , topOffset - emailOffset , mediumTextOptions);
        }
    
      }

      async printSummary(section,cxt, leftOffset, topOffset, padding, mediumTextOptions, boldTextOptions) {

        mediumTextOptions.size = 12;
    
        let row_height = 15;
    
        cxt.drawRectangle(leftOffset, topOffset, this.page_width - this.margin_left - this.margin_right , row_height, {
          type: 'fill',
          color: 0xDFE3E8,
          opacity: 0.9
        });
    
        let col = null;
        let leftMargin = this.margin_left;
        let textDimensions = null;
    
        mediumTextOptions.size = 7;
        mediumTextOptions.color = 'black';
    
        let total_width = 100;
        let column_width = 1;
        let margin_left = 0;
        let d = '';
    
  
        total_width = section.columns.reduce((a, b) => a + b.width, 0);
        section.columns.forEach(col => {
          col.tranformedWidth = (( col.width *  ( this.page_width  - this.margin_right  - this.margin_left) ) / total_width)
        });
        
    
        await this.truncate_text(this.page_width ,this.margin_right,total_width,cxt, section.columns, 8 ,column_width ,this.margin_left ,
                                   0 ,padding, topOffset + 3, mediumTextOptions, d,false);
    
      
        cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width  - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        }) 
    
        topOffset = topOffset - row_height - 0.2;
        return topOffset;
      }

      async printTableHeader(section,cxt, leftOffset, topOffset, padding, mediumTextOptions, boldTextOptions) {

        mediumTextOptions.size = 12;
        await cxt.writeText(section.name, leftOffset + padding, topOffset - 18, mediumTextOptions);
    
        topOffset -= 40;
        let row_height = 15;
        cxt.drawRectangle(leftOffset, topOffset, this.page_width - this.margin_left - this.margin_right , row_height, {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        });
    
        cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
          type: 'fill',
          color: 0xDFE3E8,
          opacity: 0.9
        });
    
        let col = null;
        let leftMargin = this.margin_left;
        let textDimensions = null;
    
        mediumTextOptions.size = 7;
        mediumTextOptions.color = 'black';
    
        let total_width = 100;
        let column_width = 1;
        let margin_left = 0;
        let d = '';
    
    
        total_width = section.columns.reduce((a, b) => a + b.width, 0);
        section.columns.forEach(col => {
          col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width);
          //console.log('column-pdf', col)
        });
        
    
        await this.truncate_text(this.page_width,this.margin_right,total_width,cxt, section.columns, 8 ,column_width ,this.margin_left ,
                                   0 ,padding, topOffset + 8, mediumTextOptions, d,false);
    
        cxt.drawRectangle(leftOffset, topOffset + 10 , this.page_width - this.margin_left - this.margin_right , 15 , {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        }) 
    
        topOffset = topOffset - row_height - 0.2;
        return topOffset;
      }

      async printTableFooter(section,cxt, leftOffset, topOffset, padding, mediumTextOptions, boldTextOptions) {

        mediumTextOptions.size = 9;
        await cxt.writeText(section.name, leftOffset + padding, topOffset , mediumTextOptions);
    
        topOffset -= 29;
        let row_height = 10;
        cxt.drawRectangle(leftOffset, topOffset, this.page_width - this.margin_left - this.margin_right , row_height, {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        });
    
        cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
          type: 'fill',
          color: 0xDFE3E8,
          opacity: 0.9
        });
    
        let col = null;
        let leftMargin = this.margin_left;
        let textDimensions = null;
    
        mediumTextOptions.size = 7;
        mediumTextOptions.color = 'black';
    
        let total_width = 100;
        let column_width = 1;
        let margin_left = 0;
        let d = '';
    
    
        total_width = section.columns.reduce((a, b) => a + b.width, 0);
        section.columns.forEach(col => {
          col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width);
          console.log('column-pdf', col)
        });
        
    
        await this.truncate_text(this.page_width,this.margin_right,total_width,cxt, section.columns, 8 ,column_width ,this.margin_left ,
                                   0 ,padding, topOffset + 8, mediumTextOptions, d,false);
    
        cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 54 , {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.4
        }) 
    
        topOffset = topOffset - row_height - 0.2;

        return topOffset;
      }

      async truncate_text(page_width,margin_right,total_width,cxt,columns, scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d,calculate_total){

        var font = this.font;
        var mediumFont  = this.mediumFont;
    
        let textSplitFlag = false;
        for(let j = 0; j < columns.length; j++){
          let value = '';
          let c = '';
          if (calculate_total){
            c = columns[j];
            value =  this.formatCell(d[c.key],c);
            
            if(!value) value = '';
            column_width = columns[j].tranformedWidth;
          }
          else {
            value = columns[j].name;
            column_width = columns[j].tranformedWidth;
          }
    
          textOptions.font = columns[j].summary_column || !calculate_total ? mediumFont: font;
          var textDimensions = textOptions.font.calculateTextDimensions(value+'',scale_down_size);
    
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
            if(columns[j].type === 'concat') {
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
                  m_top = (scale_down_size >= 6 ? -scale_down_size/2 : -scale_down_size); 
                } else{
                  m_top = (scale_down_size >= 6 ? -scale_down_size/2 : -2); 
                }
            } else if(text_lines >= 3) {
              m_top = 2
            }
    
            let newTopOffset = topOffset + scale_down_size + m_top;
            let newCeilLeftOffSet = 0;
            for(let l = 0 ; l< subRows.length; l++){
    
              newCeilLeftOffSet = margin_left + leftOffset + padding;
    
              if((columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right' || columns[j].key == 'gl_code')&& !calculate_total) {
                newCeilLeftOffSet = newCeilLeftOffSet + column_width - (padding * 2);
                let moneyTextDimensions = font.calculateTextDimensions(subRows[l],scale_down_size);
                newCeilLeftOffSet -= moneyTextDimensions.width;
              }
    
              await cxt.writeText(subRows[l].trim(), newCeilLeftOffSet , newTopOffset, textOptions);
              newTopOffset = newTopOffset - scale_down_size - 0.7;
              if(newTopOffset <= (topOffset - row_height) || l === 2){ // max 3 row allow
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
    
              if((columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right') && !calculate_total) {
                let newCeilLeftOffSet = 0;
                let newTopOffset = topOffset + (scale_down_size >= 6 ? 3 : 0); 
    
                for(let n=0; n< valueArray.length; n++) {
                  newCeilLeftOffSet = margin_left + leftOffset +  columns[j].width - padding;
                  let moneyTextDimensions = font.calculateTextDimensions(valueArray[n],scale_down_size);
                  newCeilLeftOffSet -= moneyTextDimensions.width;
    
                  await cxt.writeText(valueArray[n], newCeilLeftOffSet , newTopOffset, textOptions);
                  newTopOffset = newTopOffset - scale_down_size - 1;
    
                }
    
              } else {
                let newTopOffset = topOffset + (scale_down_size >= 6 ? 3 : 0); 
                await cxt.writeText(valueArray[0], margin_left + leftOffset + padding, newTopOffset, textOptions);
                await cxt.writeText(valueArray[1], margin_left + leftOffset + padding, newTopOffset - scale_down_size - 1, textOptions);
              }
    
            }
          }
    
          let newLeftOffSet = margin_left + leftOffset + padding
          
          if(!textSplitFlag) {
            // right align the cell
            if(columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right') {
              newLeftOffSet = leftOffset + column_width + margin_right - textDimensions.width - padding;
            }
            await cxt.writeText(value, newLeftOffSet , topOffset, textOptions);
          }
    
          textSplitFlag = false;
          // very important logic for cell spacing
          if (calculate_total){
            leftOffset =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
          }
          else {
           leftOffset += columns[j].tranformedWidth;
          }
          
        }
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

      splitText(value,limit){
        let regex = '.{1,' + limit + '}(\s|$)' + ('|.{' + limit + '}|.+$');
        let str = value.match( RegExp(regex, 'g') ).join('<>');
        return str.split('<>');
      }
    
      async longest_string(array_of_string){
        var max = array_of_string[0].length;
        array_of_string.map( v => max = Math.max(max, v.length));
        var result = array_of_string.filter(v => v.length == max);
        return result;
      }

      formatTotal(data,col){
        
        switch(col.type.toLowerCase()){
          case 'money':
            return utils.formatMoney(data);
          case 'number':
            return utils.formatNumber(data);
          default:
            return data;
        }
      }

      formatCell(data,col){
        switch(col.type.toLowerCase()){
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
            return utils.formatDate(data);
            break;
          case 'boolean':
            return data ? 'Y' : 'N';
            break;
        }
      }

}
module.exports = FinancialSummary;