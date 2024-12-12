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

class DailyDeposit {
  constructor(data) {
    this.data = data;

    this.page_width = 842;
    this.page_height = 595;

    this.margin_left = 20;
    this.margin_right = 20;
    this.margin_top = 35;
    this.margin_bottom = 5;

    this.config = [];
    this.logoUrl = null;
  }

  async generate(socket){

    let ws = new ms.WritableStream()
    let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));

    var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
    var mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
    var boldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Bold.ttf');

    let url = this.data.company.webLogo && this.data.company.webLogo.mobile ? this.data.company.webLogo.mobile: null;
    let rp = url ? await utils.getLogoPath(url, this.data.company.name) : null;
    this.logoUrl = rp && rp.status === 200 ? rp.path : null;

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

    let current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
    let cxt = pdfWriter.startPageContentContext(current_page);

    let topOffset = this.page_height - this.margin_top;
    let leftOffset = this.margin_left;
    let padding = 5;
    let isNextPage = false;
    let originalPageWidth = this.page_width;

    await this.printHeader(cxt, pdfWriter, leftOffset, topOffset, textOptions, boldTextOptions)

    this.setConfig();
    this.config.forEach((section,i) => {
      let total_width = section.columns.reduce((a, b) => a + b.width, 0);
      section.columns.forEach(col => {
        col.tranformedWidth = (( col.width *  (section.name === 'Inter-property Payments Collected' || section.name === 'Inter-property Payments Received'? this.page_width/1.8 : ((section.name === 'Refund/NSF Reversals' || section.name === 'Receipts'? this.page_width/2: this.page_width)) - this.margin_right  - this.margin_left) ) / total_width)
      });
    })

    topOffset -= 30;
    let row_height = 18;
    let table_border_height = null;
    let section = null
    let section_rows = 0;
    let lengths = this.config.map(s => s.rows.length);
    let total_page_no = 0;
    total_page_no += Math.ceil((lengths[0] + lengths[1]) / 24)? Math.ceil((lengths[0] + lengths[1]) / 24) : 1;
    total_page_no += lengths.slice(2).reduce((a, b) => a + (Math.ceil(b / 26)? Math.ceil(b / 26) : 1), 0);

    let pcount = Math.ceil(total_page_no / 100) * 5;

    let page_number = 0;

    for(let i=0 ;i<this.config.length; i++) { // section loop

      section = this.config[i];
      this.page_width = originalPageWidth;
      if(section.name === 'Refund/NSF Reversals' || section.name === 'Receipts') this.page_width = this.page_width/2;
      if(section.name === 'Inter-property Payments Collected' || section.name === 'Inter-property Payments Received') this.page_width = this.page_width/1.45
      topOffset -= 20;
      let row = null;
      let col = null;
      let newLeftMargin = this.margin_left;
      let newTextOptions = null;
      let newTopOffset = topOffset;
      let value = null;
      let textDimensions = null;

      topOffset = await this.printTableHeader(section,cxt,leftOffset,topOffset,padding,mediumTextOptions);
      newTopOffset = topOffset + (section.hideNames? 4 : 1);
      section_rows = 0;

      for(let j=0; j<section.rows.length; j++){
        row = section.rows[j];
        section_rows++;

        // if (j % 2 === 1 && !row.isfooter) {
        //   cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 - (isNextPage? 4 : 0) , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
        //     type: 'fill',
        //     color: 0xf9fafa,
        //     opacity: 0.9
        //   })
        if(row.isfooter) {
          cxt.drawRectangle(leftOffset + 0.3, newTopOffset - 1  , this.page_width - this.margin_right - this.margin_left - 0.6, row_height + 0.5, {
            type: 'fill',
            color: 0xDFE3E8,
            opacity: 0.9
          })
        }


        newLeftMargin = this.margin_left;

        for(let k=0; k<section.columns.length; k++) {
          col = section.columns[k];
          value = typeof row[col.key] !== 'undefined'? this.formatCell(row[col.key],col) : ''; 

          newTextOptions = col.summary_column || row.summary_row ? mediumTextOptions : textOptions;
          newTextOptions.size =  7;//row.isfooter ? 7 : 6.5;

          let special_value_total = (value === 'Total'  && (section.name === 'Main' || section.name === 'Card'));
          let special_value_subtotal = (value === 'Subtotal' && (section.name === 'Main' || section.name === 'Card'));
          let isFeeName = value === row['type'] && row['row_type'] === 'fee';

          if(col.type === 'money' || col.text_aligin === 'right') {
            textDimensions = newTextOptions.font.calculateTextDimensions(value,newTextOptions.size);
            await cxt.writeText(value, newLeftMargin + col.tranformedWidth - textDimensions.width - (padding + 1 ), newTopOffset + 6, newTextOptions);
          } else {
            if(isFeeName) {
              cxt.writeText(value, newLeftMargin + padding + 12, newTopOffset + 6, newTextOptions);
              newLeftMargin = newLeftMargin + col.tranformedWidth;
              continue;
            };

            if(special_value_subtotal) cxt.writeText(value, newLeftMargin + padding + 91, newTopOffset + 6, newTextOptions);
            else if(special_value_total) cxt.writeText(value, newLeftMargin + padding + 102, newTopOffset + 6, newTextOptions);
            else await cxt.writeText(value, newLeftMargin + padding, newTopOffset + 6, newTextOptions);
          }
          
          newLeftMargin = newLeftMargin + col.tranformedWidth;
        }

        if(row.name === 'empty'){
          let textForEmptyTable = textOptions;
          textForEmptyTable.size = 7;
          await cxt.writeText(row.value, this.margin_left + padding, newTopOffset + 6, textForEmptyTable);
        }
        // border should plot after end of the row 
        if (j === (section.rows.length - 1)){
          table_border_height = row_height * (section_rows + ( section.rows.filter(r=> r.add_margin_bottom).length > 0 ? 0.8:0 )) + (section.hideNames? 1 : 4);
          cxt.drawRectangle(leftOffset, newTopOffset - 1 , this.page_width - this.margin_left - this.margin_right , table_border_height , {
            type: 'stroke',
            color: 0x808080,
            opacity: 1,
            width :0.4
          })

          if(section.name === 'Main'){
            await cxt.drawPath(leftOffset + 130, newTopOffset-1, leftOffset + 130, newTopOffset+table_border_height + (section.hideNames? 17 : -1));
            await cxt.drawPath(leftOffset + 435, newTopOffset-1, leftOffset + 435, newTopOffset+table_border_height+ (section.hideNames? 17 : -1));
            await cxt.drawPath(leftOffset + 730, newTopOffset-1, leftOffset + 730, newTopOffset+table_border_height+ (section.hideNames? 17 : -1));
          }

          if(section.name === 'Card'){
            await cxt.drawPath(leftOffset + 130, newTopOffset-1, leftOffset + 130, newTopOffset+table_border_height + (section.hideNames? 17 : -1));
            await cxt.drawPath(leftOffset + 730, newTopOffset-1, leftOffset + 730, newTopOffset+table_border_height+ (section.hideNames? 17 : -1));
          }
          topOffset = newTopOffset - 15;          
        }else{
          await cxt.drawPath(leftOffset, newTopOffset, this.page_width - leftOffset, newTopOffset,{type: 'fill', color: 0x808080, opacity: 1, width: 0.4});
          //here add one dark grey line in the check that if it is the last fees.....
        }

        newTopOffset -= row_height * (row.add_margin_bottom ? 1.8: 1);
        let pageBreak = (j === (section.rows.length - 1))  && section.rows.length > 1 && newTopOffset <= 59;
        let next_row = newTopOffset - row_height;

        if(next_row <= (this.margin_bottom) || pageBreak || ((i===1 || i===2 || i===3 || i===4)&& (j === (section.rows.length - 1)))) {
          let half_table_condition = ((i===1 && (j === (section.rows.length - 1))) || section.name === 'Refund/NSF Reversals' || section.name === 'Receipts' || section.name === 'Inter-property Payments Collected' || section.name === 'Inter-property Payments Received');
          newTopOffset += row_height;
          if(next_row <= (this.margin_bottom) && j !== section.rows.length - 1) {
            table_border_height = row_height * (section_rows + ( section.rows.filter(r=> r.add_margin_bottom).length > 0 ? 0.8:0 ));
            cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height + 3 , {
              type: 'stroke',
              color: 0x808080,
              opacity: 1,
              width :0.4
            })
          }
          page_number += 1
          pdfWriter.writePage(current_page);

          if(socket && page_number % pcount == 0){
            await socket.createEvent("pdf_progress", {
              percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
            })
          }

          this.page_width = originalPageWidth;
          current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
          cxt = pdfWriter.startPageContentContext(current_page);

          topOffset = this.page_height - this.margin_top;
          leftOffset = this.margin_left;
          
          await this.printHeader(cxt, pdfWriter, leftOffset, topOffset, textOptions, boldTextOptions);
          topOffset -= 55;

          mediumTextOptions.size = 7;
          mediumTextOptions.color = 'black';
          if(section.name === 'Inter-property Payments Collected' || section.name === 'Inter-property Payments Received') this.page_width = this.page_width/1.45
          else this.page_width = half_table_condition? this.page_width / 2 : this.page_width;

          if(next_row <= (this.margin_bottom) && j !== section.rows.length - 1) {
            topOffset = await this.printTableHeader(section,cxt,leftOffset,topOffset,padding,mediumTextOptions);
            topOffset += 1;
          } else {
            topOffset += 32;
          }

          newTopOffset = topOffset;
          section_rows = 0;
          isNextPage = true;
        }

      }
    }

    page_number += 1
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

  async printHeader(cxt,pdfWriter, leftOffset, topOffset, mediumTextOptions, boldTextOptions) {
    boldTextOptions.size = 24;
    await cxt.writeText('Daily Deposits', leftOffset, topOffset, boldTextOptions);

    let report_date = moment(this.data.start_date).format('dddd, MMMM Do YYYY');
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

    let facility_name = utils.formatFacilityName(this.data.property);
    let facility_address = utils.formatFacilityAddress(this.data.property.Address);
    let facility_phone = utils.formatPhone(this.data.property.Phones);
    
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
    
    let emailOffset = this.data.property.Phones.length ? 28 : 17

    if (this.data.property.Emails.length) {
      let facility_email = this.data.property.Emails[0].email;
      let facilityEmailDimensions = mediumFont.calculateTextDimensions(facility_email, 7);
      facilityLeftOffset = this.page_width - this.margin_right - squareSize - facilityEmailDimensions.width - 8;
      await cxt.writeText(this.data.property.Emails[0].email, facilityLeftOffset , topOffset - emailOffset , mediumTextOptions);
    }

  }

  async printTableHeader(section,cxt, leftOffset, topOffset, padding, mediumTextOptions) {

    mediumTextOptions.size = 9;
    if(!section.hideNames) await cxt.writeText(section.name, leftOffset + padding, topOffset , mediumTextOptions);

    topOffset -= 25;
    let row_height = 18;
    if(!section.hideNames)
    {
      cxt.drawRectangle(leftOffset, topOffset, this.page_width - this.margin_left - this.margin_right , row_height, {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width : 0.4
      });
    
      cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
        type: 'fill',
        color: 0xDFE3E8,
        opacity: 0.9
      });

      cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 40 , {
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

    mediumTextOptions.size = 7;
    mediumTextOptions.color = 'black';

    for(let k=0; k<section.columns.length; k++) {
      col = section.columns[k];
      if(col.type === 'money' || col.text_aligin === 'right' ) {
        textDimensions = mediumTextOptions.font.calculateTextDimensions(col.name,mediumTextOptions.size);
        await cxt.writeText(col.name, leftMargin + col.tranformedWidth - textDimensions.width - padding - 1, topOffset + 6 + (section.hideNames? 30 : 0), mediumTextOptions);
      } else {
        await cxt.writeText(col.name, leftMargin + padding, topOffset + 6 + (section.hideNames? 30 : 0), mediumTextOptions);
      }
      
      leftMargin = leftMargin + col.tranformedWidth;
    }
    
    
    topOffset =  section.hideNames? topOffset - row_height + 26 : topOffset - row_height - 0.2;
    return topOffset;
  }

  setConfig(){
    let deposit_fees_details = [];
    let card_fees_details = [];
    let deposit_data = this.data.data.payment_deposits;
    let card_data = this.data.data.card_deposits;

    if(deposit_data.cash.fees_details && deposit_data.cash.fees_details.length){
      deposit_data.cash.fees_details.forEach(x =>{
      deposit_fees_details.push({
        'type': x.name,
        'cash' : x.value,
        'giftcard' : deposit_data.giftcard.fees_details.find(e => e.name === x.name).value,
        'check': deposit_data.check.fees_details.find(e => e.name === x.name).value,
        'physical': deposit_data.physical.fees_details.find(e => e.name === x.name).value,
        'ach': deposit_data.ach.fees_details.find(e => e.name === x.name).value,
        'card': deposit_data.card.fees_details.find(e => e.name === x.name).value,
        'electronic': deposit_data.electronic.fees_details.find(e => e.name === x.name).value,
        'total': deposit_data.total.fees_details.find(e => e.name === x.name).value,
        'row_type': 'fee'

      })
    });
  }

    if(card_data.visa.fees_details && card_data.visa.fees_details.length){
      card_data.visa.fees_details.forEach(x =>{
      card_fees_details.push({
        'type': x.name,
        'visa' : x.value,
        'mastercard': card_data.mastercard.fees_details.find(e => e.name === x.name).value,
        'discover': card_data.discover.fees_details.find(e => e.name === x.name).value,
        'amex': card_data.amex.fees_details.find(e => e.name === x.name).value,
        'total': card_data.total.fees_details.find(e => e.name === x.name).value,
        'row_type': 'fee'
      })
    });
  }

  if(!this.data.data.receipts.receipts_data.length){
    this.data.data.receipts.receipts_data.push({
      name: 'empty',
      value: 'There is no data present for this table.'
    })
  }

  if(!this.data.data.refund.refund_data.length){
    this.data.data.refund.refund_data.push({
      name: 'empty',
      value: 'There is no data present for this table.'
    })
  }

  if(!this.data.data.payments_collected.payments_collected_data.length){
    this.data.data.payments_collected.payments_collected_data.push({
      name: 'empty',
      value: 'There is no data present for this table.'
    })
  }

  if(!this.data.data.payments_received.payments_received_data.length){
    this.data.data.payments_received.payments_received_data.push({
      name: 'empty',
      value: 'There is no data present for this table.'
    })
  }
    
    // purpose of this fuction is add table sections dynamically
    this.config.push({
        name: 'Main',
        hideNames: true,
        columns: [
            {
                key: 'type',
                name:'Summary',
                type: 'string',
                summary_count: true,
                width:20
            },
            {
                key: 'cash',
                name:'Cash',
                type: 'money',
                summary_count: true,
                width:15
            },
            {
                key: 'check',
                name:'Check',
                type: 'money',
                summary_count: true,
                width:15
            },
            {
              key: 'giftcard',
              name:'Gift Card',
              type: 'money',
              summary_count: true,
              width:15
          },
            {
                key: 'physical',
                name:'Physical Total',
                type: 'money',
                summary_count: true,
                summary_column: true,
                width:15
            },
            {
                key: 'ach',
                name:'ACH',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'card',
                name:'Card',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'electronic',
                name:'Electronic Total',
                type: 'money',
                summary_count: true,
                summary_column: true,
                width:20
            },
            {
                key: 'total',
                name:'Total',
                type: 'money',
                summary_count: true,
                summary_column: true,
                width:20
            },
        ],
        rows:[
            {
                summary_row: false,
                'type':'Rent',
                'cash': deposit_data.cash.rent,
                'check':deposit_data.check.rent,
                'giftcard':deposit_data.giftcard.rent,
                'physical':deposit_data.physical.rent,
                'ach': deposit_data.ach.rent,
                'card': deposit_data.card.rent,
                'electronic': deposit_data.electronic.rent,
                'total': deposit_data.total.rent
            },
            {
                summary_row: false,
                'type':'Protection / Insurance',
                'cash': deposit_data.cash.insurance,
                'check':deposit_data.check.insurance,
                'giftcard':deposit_data.giftcard.insurance,
                'physical':deposit_data.physical.insurance,
                'ach': deposit_data.ach.insurance,
                'card': deposit_data.card.insurance,
                'electronic': deposit_data.electronic.insurance,
                'total': deposit_data.total.insurance
            },
            {
                summary_row: false,
                'type':'Merchandise',
                'cash': deposit_data.cash.merchandise,
                'check':deposit_data.check.merchandise,
                'giftcard':deposit_data.giftcard.merchandise,
                'physical':deposit_data.physical.merchandise,
                'ach': deposit_data.ach.merchandise,
                'card': deposit_data.card.merchandise,
                'electronic': deposit_data.electronic.merchandise,
                'total': deposit_data.total.merchandise
            },
            {
                summary_row: false,
                'type':'Auction',
                'cash': deposit_data.cash.auction,
                'check':deposit_data.check.auction,
                'giftcard':deposit_data.giftcard.auction,
                'physical':deposit_data.physical.auction,
                'ach': deposit_data.ach.auction,
                'card': deposit_data.card.auction,
                'electronic': deposit_data.electronic.auction,
                'total': deposit_data.total.auction
            },
            {
                summary_row: false,
                'type':'Deposits',
                'cash': deposit_data.cash.deposits,
                'check':deposit_data.check.deposits,
                'giftcard':deposit_data.giftcard.deposits,
                'physical':deposit_data.physical.deposits,
                'ach': deposit_data.ach.deposits,
                'card': deposit_data.card.deposits,
                'electronic': deposit_data.electronic.deposits,
                'total': deposit_data.total.deposits
            },
            {
                summary_row: false,
                'type':'Fees',
                'cash': deposit_data.cash.fees,
                'check':deposit_data.check.fees,
                'giftcard':deposit_data.giftcard.fees,
                'physical':deposit_data.physical.fees,
                'ach': deposit_data.ach.fees,
                'card': deposit_data.card.fees,
                'electronic': deposit_data.electronic.fees,
                'total': deposit_data.total.fees
            },

            ...deposit_fees_details,
            {
              summary_row: false,
              'type':'Inter-Property Payments',
              'cash': deposit_data.cash.inter_property_payments,
              'check':deposit_data.check.inter_property_payments,
              'giftcard':deposit_data.giftcard.inter_property_payments,
              'physical':deposit_data.physical.inter_property_payments,
              'ach': deposit_data.ach.inter_property_payments,
              'card': deposit_data.card.inter_property_payments,
              'electronic': deposit_data.electronic.inter_property_payments,
              'total': deposit_data.total.inter_property_payments
          },

            {
                summary_row: false,
                'type':'Tax',
                'cash': deposit_data.cash.tax,
                'check':deposit_data.check.tax,
                'giftcard':deposit_data.giftcard.tax,
                'physical':deposit_data.physical.tax,
                'ach': deposit_data.ach.tax,
                'card': deposit_data.card.tax,
                'electronic': deposit_data.electronic.tax,
                'total': deposit_data.total.tax
            },
            {
              summary_row: false,
              'type':'Others',
              'cash': deposit_data.cash.others,
              'check':deposit_data.check.others,
              'giftcard':deposit_data.giftcard.others,
              'physical':deposit_data.physical.others,
              'ach': deposit_data.ach.others,
              'card': deposit_data.card.others,
              'electronic': deposit_data.electronic.others,
              'total': deposit_data.total.others
            },
            {
                summary_row: true,
                'type':'Subtotal',
                'cash': deposit_data.cash.sub_total,
                'check':deposit_data.check.sub_total,
                'giftcard':deposit_data.giftcard.sub_total,
                'physical':deposit_data.physical.sub_total,
                'ach': deposit_data.ach.sub_total,
                'card': deposit_data.card.sub_total,
                'electronic': deposit_data.electronic.sub_total,
                'total': deposit_data.total.sub_total
            },
            {
                summary_row: false,
                'type':'Refunds / NSF Reversals',
                'cash': deposit_data.cash.refund,
                'check':deposit_data.check.refund,
                'giftcard':deposit_data.giftcard.refund,
                'physical':deposit_data.physical.refund,
                'ach': deposit_data.ach.refund,
                'card': deposit_data.card.refund,
                'electronic': deposit_data.electronic.refund,
                'total': deposit_data.total.refund
            },
            {
                summary_row: true,
                isfooter: true,
                'type':'Total',
                'cash': deposit_data.cash.totals,
                'check':deposit_data.check.totals,
                'giftcard':deposit_data.giftcard.totals,
                'physical':deposit_data.physical.totals,
                'ach': deposit_data.ach.totals,
                'card': deposit_data.card.totals,
                'electronic': deposit_data.electronic.totals,
                'total': deposit_data.total.totals
            },

        ]
    });
    this.config.push({
        name: 'Card',
        columns: [
            {
                key: 'type',
                name:'Summary',
                type: 'string',
                summary_count: true,
                width:20
            },
            {
                key: 'visa',
                name:'Visa',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'mastercard',
                name:'Mastercard',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'discover',
                name:'Discover',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'amex',
                name:'AMEX',
                type: 'money',
                summary_count: true,
                width:20
            },
            {
                key: 'total',
                name:'Total',
                type: 'money',
                summary_count: true,
                summary_column: true,
                width:20
            },
        ],
        rows:[
            {
                summary_row: false,
                'type':'Rent',
                'visa': card_data.visa.rent,
                'mastercard':card_data.mastercard.rent,
                'discover':card_data.discover.rent,
                'amex': card_data.amex.rent,
                'total': card_data.total.rent
            },
            {
                summary_row: false,
                'type':'Protection / Insurance',
                'visa': card_data.visa.insurance,
                'mastercard':card_data.mastercard.insurance,
                'discover':card_data.discover.insurance,
                'amex': card_data.amex.insurance,
                'total': card_data.total.insurance
            },
            {
                summary_row: false,
                'type':'Merchandise',
                'visa': card_data.visa.merchandise,
                'mastercard':card_data.mastercard.merchandise,
                'discover':card_data.discover.merchandise,
                'amex': card_data.amex.merchandise,
                'total': card_data.total.merchandise
            },
            {
                summary_row: false,
                'type':'Auction',
                'visa': card_data.visa.auction,
                'mastercard':card_data.mastercard.auction,
                'discover':card_data.discover.auction,
                'amex': card_data.amex.auction,
                'total': card_data.total.auction
            },
            {
                summary_row: false,
                'type':'Deposits',
                'visa': card_data.visa.deposits,
                'mastercard':card_data.mastercard.deposits,
                'discover':card_data.discover.deposits,
                'amex': card_data.amex.deposits,
                'total': card_data.total.deposits
            },
            {
                summary_row: false,
                'type':'Fees',
                'visa': card_data.visa.fees,
                'mastercard':card_data.mastercard.fees,
                'discover':card_data.discover.fees,
                'amex': card_data.amex.fees,
                'total': card_data.total.fees
            },

            ...card_fees_details,

            {
              summary_row: false,
              'type':'Inter-Property Payments',
              'visa': card_data.visa.inter_property_payments,
              'mastercard':card_data.mastercard.inter_property_payments,
              'discover':card_data.discover.inter_property_payments,
              'amex': card_data.amex.inter_property_payments,
              'total': card_data.total.inter_property_payments
            },

            {
                summary_row: false,
                'type':'Tax',
                'visa': card_data.visa.tax,
                'mastercard':card_data.mastercard.tax,
                'discover':card_data.discover.tax,
                'amex': card_data.amex.tax,
                'total': card_data.total.tax
            },
            {
              summary_row: false,
              'type':'Others',
              'visa': card_data.visa.others,
              'mastercard':card_data.mastercard.others,
              'discover':card_data.discover.others,
              'amex': card_data.amex.others,
              'total': card_data.total.others
            },
            {
                summary_row: true,
                'type':'Subtotal',
                'visa': card_data.visa.sub_total,
                'mastercard':card_data.mastercard.sub_total,
                'discover':card_data.discover.sub_total,
                'amex': card_data.amex.sub_total,
                'total': card_data.total.sub_total
            },
            {
                summary_row: false,
                'type':'Refunds / NSF Reversals',
                'visa': card_data.visa.refund,
                'mastercard':card_data.mastercard.refund,
                'discover':card_data.discover.refund,
                'amex': card_data.amex.refund,
                'total': card_data.total.refund
            },
            {
                summary_row: true,
                add_margin_bottom: true,
                isfooter: true,
                'type':'Total',
                'visa': card_data.visa.totals,
                'mastercard':card_data.mastercard.totals,
                'discover':card_data.discover.totals,
                'amex': card_data.amex.totals,
                'total': card_data.total.totals
            },

        ]
    });
    

    this.config.push({
      name: 'Receipts',
      columns:[
        {
          key: 'tenant',
          name:'Tenant',
          type: 'string',
          summary_count: false,
          summary_column: true,
          width:14
        },
        
        {
          key: 'space_nos',
          name:'Space #',
          type: 'string',
          summary_count: true,
          width:6.3
        },
        {
          key: 'amount',
          name:'Amount',
          type: 'money_left',
          summary_count: false,
          width:5.8
        },
        {
          key: 'payment_method',
          name:'Payment Method',
          type: 'string',
          summary_count: false,
          // text_aligin: 'right',
          width:7
        },
        {
          key: 'payment_details',
          name:'Payment Details',
          type: 'string',
          // text_aligin: 'right',
          summary_count: false,
          width:7
        }
      ],
      rows: [...this.data.data.receipts.receipts_data,
              {
                summary_row: true,
                isfooter: true,
                add_margin_bottom: true,
                'tenant':'Total',
                'space_nos': this.data.data.receipts.total.spaces,
                'amount': this.data.data.receipts.total.amount,
                'payment_method':' ',
                'payment_details': ' '
              }
            ],
            rows1:[
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: true,
                isfooter: true,
                add_margin_bottom: true,
                'tenant':'Total',
                'space_nos': '1',
                'service_period': '',
                'amount': 120,
                'payment_method':'',
                'payment_details': ''
              }
            ],
            rows2:[
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 120,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: false,
                'tenant':'Widmar, Johannes',
                'space_nos': '234',
                'service_period': '12/19/2020 - 1/19/2020 ',
                'amount': 150,
                'payment_method':'Cash',
                'payment_details': ''
              },
              {
                summary_row: true,
                isfooter: true,
                add_margin_bottom: true,
                'tenant':'Total',
                'space_nos': '1',
                'service_period': '',
                'amount': 120,
                'payment_method':'',
                'payment_details': ''
              }
            ]
    });

    this.config.push({
      name: 'Refund/NSF Reversals',
      columns:[
        {
          key: 'tenant',
          name:'Tenant',
          type: 'string',
          summary_count: false,
          summary_column: true,
          width:16
        },
        {
          key: 'amount',
          name:'Amount',
          type: 'money_left',
          summary_count: false,
          width:4.5
        },
        {
          key: 'payment_method',
          name:'Payment Method',
          type: 'string',
          summary_count: false,
          // text_aligin: 'right',
          width:5.55
        },
        {
          key: 'payment_details',
          name:'Payment Details',
          type: 'string',
          // text_aligin: 'right',
          summary_count: false,
          width:5.55
        }
      ],
      rows: [...this.data.data.refund.refund_data,
        {
          summary_row: true,
          isfooter: true,
          add_margin_bottom: true,
          'tenant':'Total',
          'space_nos': this.data.data.refund.total.spaces,
          'amount': this.data.data.refund.total.amount,
          'payment_method':' ',
          'payment_details': ' '
        }
      ],
      rows1:[
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: true,
          isfooter: true,
          add_margin_bottom: true,
          'tenant':'Total',
          'space_no': '1',
          'service_period': '',
          'amount': 120,
          'payment_method':'',
          'payment_details': ''
        }
      ],
      rows2:[
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 120,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: false,
          'tenant':'Widmar, Johannes',
          'space_no': '234',
          'service_period': '12/19/2020 - 1/19/2020 ',
          'amount': 150,
          'payment_method':'Cash',
          'payment_details': ''
        },
        {
          summary_row: true,
          isfooter: true,
          add_margin_bottom: true,
          'tenant':'Total',
          'space_no': '1',
          'service_period': '',
          'amount': 120,
          'payment_method':'',
          'payment_details': ''
        }
      ]
    });

    this.config.push({
      name: 'Inter-property Payments Collected',
      columns:[
        {
          key: 'tenant',
          name:'Tenant',
          type: 'string',
          summary_count: false,
          summary_column: true,
          width:14
        },
        
        {
          key: 'space_nos',
          name:'Space #',
          type: 'string',
          summary_count: true,
          width:6.3
        },
        {
          key: 'amount',
          name:'Amount',
          type: 'money_left',
          summary_count: false,
          width:5.8
        },
        {
          key: 'payment_method',
          name:'Payment Method',
          type: 'string',
          summary_count: false,
          width:7
        },
        {
          key: 'payment_details',
          name:'Payment Details',
          type: 'string',
          summary_count: false,
          width:7
        },
        {
          key: 'property_applied',
          name:'Property Applied',
          type: 'string',
          summary_count: false,
          width:7
        }
      ],
      rows: [...this.data.data.payments_collected.payments_collected_data,
              {
                summary_row: true,
                isfooter: true,
                add_margin_bottom: true,
                'tenant':'Total',
                'space_nos': this.data.data.payments_collected.total.spaces,
                'amount': this.data.data.payments_collected.total.amount,
                'payment_method':' ',
                'payment_details': ' ',
                'property_applied': ' '
              }
      ]
    })

    this.config.push({
      name: 'Inter-property Payments Received',
      columns:[
        {
          key: 'tenant',
          name:'Tenant',
          type: 'string',
          summary_count: false,
          summary_column: true,
          width:14
        },
        
        {
          key: 'space_nos',
          name:'Space #',
          type: 'string',
          summary_count: true,
          width:6.3
        },
        {
          key: 'amount',
          name:'Amount',
          type: 'money_left',
          summary_count: false,
          width:5.8
        },
        {
          key: 'payment_method',
          name:'Payment Method',
          type: 'string',
          summary_count: false,
          width:7
        },
        {
          key: 'payment_details',
          name:'Payment Details',
          type: 'string',
          summary_count: false,
          width:7
        },
        {
          key: 'property_collected',
          name:'Property Collected',
          type: 'string',
          summary_count: false,
          width:7
        }
      ],
      rows: [...this.data.data.payments_received.payments_received_data,
              {
                summary_row: true,
                isfooter: true,
                add_margin_bottom: true,
                'tenant':'Total',
                'space_nos': this.data.data.payments_received.total.spaces,
                'amount': this.data.data.payments_received.total.amount,
                'payment_method':' ',
                'payment_details': ' ',
                'property_collected': ' '
              }
      ]
    })
    
  }

  formatTotal(data,col){

    switch(col.column_type.toLowerCase()){
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
      case 'money_left':
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

module.exports = DailyDeposit;


