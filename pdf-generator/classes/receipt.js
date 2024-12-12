'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var fs = require('fs');
var request = require('request');
//var paymentData    = require(__dirname + '/payment_data2.js');
var moment = require('moment');
var ms = require('memory-streams');
var settings = {
    config:{
        base_path: `${__dirname}/../public`
    }
};
var SUB_METHOD = {
  auction: 'Auction',
  cleaning_deposit: 'Cleaning Deposit',
  security_deposit: 'Security Deposit',
  transfer: 'Transfer',
  move_out: 'Move out'
};

class CustomerReceipt {
  constructor(data) {
    this.data = data;

    this.company = data.company;
    this.page_width = 595;
    this.page_height = 842;

    this.margin_left = 20;
    this.margin_right = 20;
    this.margin_top = 35;
    this.margin_bottom = 15;

    this.config = [];
    this.logoUrl = null;
  }

  async drawHeader(cxt,data,pageWidth,leftOffset,topOffset,font,mediumFont){

    let mediumTextOptions = {
      font: mediumFont,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let fontTextOptions2 = {
      font: font,
      size: 9,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    leftOffset = 54;
    let topRightText = []
    let textWidth = [];
    topRightText.push(data.property.name);
    if(data.property.Emails.length) topRightText.push(data.property.Emails[0].email);
    if(data.property.Phones.length) topRightText.push(utils.formatPhone(data.property.Phones));
    const country = data.property.Address.country ?  data.property.Address.country + ' ' : '';
    let csz = data.property.Address? data.property.Address.address + ", " + data.property.Address.city + ", " + data.property.Address.state +  ", " + country + data.property.Address.zip: "";
    topRightText.push(csz);


    var textDimensions = mediumFont.calculateTextDimensions(topRightText[0],10);
    textWidth.push(textDimensions.width);

    for (let j = 1; j < topRightText.length; j++) {
      let d = topRightText[j];
      var textDimensions = font.calculateTextDimensions(d,9);
      textWidth.push(textDimensions.width);
    }

    if(this.logoUrl) {
      let imageOptions = {
        transformation: {
          width:150,
          height:80
        }
      }
      cxt.drawImage(62,730,this.logoUrl,imageOptions);
    } else {
      mediumTextOptions.size = 13;
      cxt.writeText(this.company.name,50,topOffset-60,mediumTextOptions);
      mediumTextOptions.size = 10;
    }

    cxt.writeText(topRightText[0],pageWidth-(textWidth[0]+leftOffset),topOffset-20,mediumTextOptions)
    let v = 35;
    for(let i=1; i<topRightText.length; i++){
        cxt.writeText(topRightText[i],pageWidth-(textWidth[i]+leftOffset),topOffset-v,fontTextOptions2)
        v += 15
    }

    //cxt.drawImage(62,718,img,imageOptions)
  }

  getAppliedPaymentsToProperty() {
    let interPropertyPaymentAmount = 0;
    this.data.data.invoices.map(i => {
      if(i.Lease && i.Lease.Property && i.Lease.Property.id == this.data.data.payment.Property.id) {
        interPropertyPaymentAmount += i.total_payments;
      }
    });
    return interPropertyPaymentAmount;
  }

  isInterPropertyPayment() {
    return this.data.data.InterPropertyInvoices.length ? true : false;
  } 

  async drawBillingInfo(pdfWriter,page,cxt,data,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth){
    let billTo = [];
    let paymentInfo = [];
    let yvalue = 0;
    let mediumTextOptions = {
      font: mediumFont,
      size: 11,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions2 = {
      font: font,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions = {
      font: font,
      size: 9,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    }

    let name = data.payment.Contact? data.payment.Contact.first + ' ' + data.payment.Contact.last :'';
    let phone = data.payment.Contact && data.payment.Contact.Phones.length? data.payment.Contact.Phones[0].phone :'';
    let email = data.payment.Contact? data.payment.Contact.email : '';
    let method = "";
    if(data.payment.method === 'card'){
      method = "Credit Card Payment";
    }
    else if (data.payment.method === 'check'){
      method = "Check Payment";
    }
    else if (data.payment.method === 'cash') {
      method = "Cash Payment";
    }
    else if (data.payment.method === 'loss') {
      method = "Write-Off Payment";
    }
    else if (data.payment.method === 'adjustment') {
      method = SUB_METHOD[data.payment.sub_method] ? `${SUB_METHOD[data.payment.sub_method]} Adjustment` : null;
    }
    let ref = data.payment.method === "card" ? utils.capitalizeFirst(data.payment.PaymentMethod.card_type) : (data.payment.ref_name ? "Reference Name: " + data.payment.ref_name : null);
    let card_num = data.payment.method === "card"? "xxxx-xxxx-xxxx-" + data.payment.PaymentMethod.card_end : '';

    const isInterProperty = this.isInterPropertyPayment(); //data.InterPropertyInvoices.length ? true : false;

    if(name) billTo.push(utils.capitalizeFirst(name));
    if(email) billTo.push(email);
    if(phone) billTo.push(phone);
    if(method) paymentInfo.push('Amount Paid');
    data.browser_time
			? paymentInfo.push(data.browser_time)
			: paymentInfo.push(
					utils.formatUTCToLocalDateTime(data.payment.created, data.payment.Property.utc_offset, 'MMM DD, YYYY @ h:mma')
			  );
    if(data.payment.amount) paymentInfo.push(utils.formatMoney(data.payment.amount));
    if(['card', 'ach'].indexOf(data.payment.method) >= 0 && data.payment.PaymentMethod.card_type) {
      paymentInfo.push(`${utils.capitalizeFirst(data.payment.PaymentMethod.card_type)}****${data.payment.PaymentMethod.card_end}`);
    } else {
      paymentInfo.push(`${utils.capitalizeFirst(data.payment.method)} ${data.payment.PaymentMethod.card_type || ''}`);
    }
    if(['cash', 'check'].indexOf(data.payment.method) < 0 && data.payment.transaction_id) {
      paymentInfo.push(`Transaction ID: ${data.payment.transaction_id}`);
    }
    if(isInterProperty) {
      paymentInfo.push(`Property: ${data.payment.Property.number} - ${data.payment.Property.Address.city}`);
    }
    if(data.payment.AcceptedBy) {
      data.useManagerInitials ? paymentInfo.push('Accepted By: ' + utils.formatInitials(data.payment.AcceptedBy))
      : paymentInfo.push(`Accepted By: ${data.payment.AcceptedBy.first} ${data.payment.AcceptedBy.last}`);
    }
    // if(isInterProperty) {
    //   paymentInfo.push(`Amount paid to property: ${utils.formatMoney(this.getAppliedPaymentsToProperty())}`);
    // }

    cxt.drawPath(leftOffset+5,topOffset-240,leftOffset+245,topOffset-240,pathStrokeOptions)
      .writeText('Bill To',leftOffset+20,topOffset-223,mediumTextOptions)
    if(billTo.length === 1){
      cxt.drawRectangle(leftOffset+5,topOffset-280,240,80,pathStrokeOptions)
      yvalue = topOffset-280;
    }
    else if(billTo.length === 2){
      cxt.drawRectangle(leftOffset+5,topOffset-290,240,90,pathStrokeOptions)
      yvalue = topOffset-290;
    }
    else if(billTo.length === 3){
      cxt.drawRectangle(leftOffset+5,topOffset-300,240,100,pathStrokeOptions)
      yvalue = topOffset-300;
    }
    else if(billTo.length === 4){
      cxt.drawRectangle(leftOffset+5,topOffset-310,240,110,pathStrokeOptions)
      yvalue = topOffset-310;
    }

    
    let val = 255;
    for(let a = 0; a < billTo.length; a++){
    cxt.writeText(billTo[a],leftOffset+20,topOffset-val,textFontOptions)
    val += 15;
    }

    if(paymentInfo.length === 1){
        cxt.drawRectangle(leftOffset+260,topOffset-280,240,80,pathStrokeOptions)
        yvalue = yvalue < (topOffset-280)? yvalue : topOffset-280
      }
      else if(paymentInfo.length === 2){
        cxt.drawRectangle(leftOffset+260,topOffset-290,240,90,pathStrokeOptions)
        yvalue = yvalue < (topOffset-290)? yvalue : topOffset-290
      }
      else if(paymentInfo.length === 3){
        cxt.drawRectangle(leftOffset+260,topOffset-300,240,100,pathStrokeOptions)
        yvalue = yvalue < (topOffset-300)? yvalue : topOffset-300
      }
      else if(paymentInfo.length === 4){
        cxt.drawRectangle(leftOffset+260,topOffset-310,240,110,pathStrokeOptions)
        yvalue = yvalue < (topOffset-310)? yvalue : topOffset-310
      }
      else if(paymentInfo.length === 5){
        cxt.drawRectangle(leftOffset+260,topOffset-320,240,120,pathStrokeOptions)
        yvalue = yvalue < (topOffset-320)? yvalue : topOffset-320
      }
      else if(paymentInfo.length === 6){
        cxt.drawRectangle(leftOffset+260,topOffset-335,240,135,pathStrokeOptions)
        yvalue = yvalue < (topOffset-335)? yvalue : topOffset-335
      }
      else if(paymentInfo.length === 7){
        cxt.drawRectangle(leftOffset+260,topOffset-350,240,150,pathStrokeOptions)
        yvalue = yvalue < (topOffset-340)? yvalue : topOffset-340
      }

    //cxt.drawRectangle(leftOffset+260,topOffset-270,240,70,pathStrokeOptions)
    cxt.drawPath(leftOffset+260,topOffset-240,leftOffset+500,topOffset-240,pathStrokeOptions)
      .writeText('Payment Info',leftOffset+275,topOffset-223,mediumTextOptions)

    val = 255;
    for(let b = 0; b < paymentInfo.length; b++){
      cxt.writeText(paymentInfo[b],leftOffset+275,topOffset-val,textFontOptions)
      val += 15;
    }

    await this.drawPaymentItemsBox(pdfWriter,page,cxt,data,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth,yvalue);
  }

  async drawPaymentInfo(cxt,data,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,boldFont,pageWidth){

    let textFontOptions = {
      font: font,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions2 = {
      font: boldFont,
      size: 12,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let boldTextOptions = {
      font: boldFont,
      size: 21,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let receipt_date = "Payment Date: " + utils.formatDateServices(data.payment.date);
    let  dateDimensions = boldFont.calculateTextDimensions(receipt_date,12);
    cxt.writeText("Customer Receipt",leftOffset+20,topOffset-150,boldTextOptions)
       .writeText(receipt_date,pageWidth-(dateDimensions.width + leftOffset + 17),topOffset-150,mediumTextOptions2)
       .drawPath(leftOffset+5,topOffset-170,leftOffset+510,topOffset-170,pathStrokeOptions)

  }

  async drawPaymentItemsBox(pdfWriter,page,cxt,data,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth,yvalue){
    let table_padding = 35;
    let table_padding2 = 110;
    let marginBottom = 60;
    let mediumTextOptions = {
        font: mediumFont,
        size: 8,
        colorspace: 'gray',
        color: 0x00,
        underline: false
      };

    let mediumTextOptions2 = {
      font: mediumFont,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions = {
      font: font,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions2 = {
        font: font,
        size: 8,
        colorspace: 'gray',
        color: 0x96,
        underline: false
      };
      let textFontOptions3 = {
        font: font,
        size: 9,
        colorspace: 'gray',
        color: 0x00,
        underline: false
      };

    const invoices = data.InterPropertyInvoices.length ? data.InterPropertyInvoices : data.invoices;  
    let invoices_count = data.invoices.length;

    cxt.drawRectangle(leftOffset+5,yvalue-60,495,35,pathStrokeOptions)
       .writeText('Charges',leftOffset+20,yvalue-46,mediumTextOptions2)
    
    let box_start = yvalue - 55;
    let box_size = 115
    let factor = 15;
    let final_box = 0;
    for(let i = 0; i < invoices_count; i++){
        let itemsList = [];
        let priceList = [];
        let num = "Invoice # " + invoices[i].number;
        let space = invoices[i].Lease && invoices[i].Lease.Unit ? "Space # " + invoices[i].Lease.Unit.number : '';
        if(invoices[i].Lease.Property) {
          space += ` (${invoices[i].Lease.Property.number} - ${invoices[i].Lease.Property.Address.city})`;
        }
        let total = utils.formatMoney(invoices[i].total_due);
        let applied_payment = "-" + utils.formatMoney(data.payment.AppliedPayments[i].amount);
        let balance_remaining = utils.formatMoney(invoices[i].balance_remaining);

        let f = factor * invoices[i].InvoiceLines.length;
        let boxDimensions = box_start - (box_size + f);

        for(let j = 0; j< invoices[i].InvoiceLines.length; j++){
            let product = invoices[i].InvoiceLines[j].Product.name;
            let pname = product === "Rent"? product + " ("+ utils.formatDateServices(invoices[i].InvoiceLines[j].start_date) + " - " + utils.formatDateServices(invoices[i].InvoiceLines[j].end_date) + ")": product;
            pname = invoices[i].InvoiceLines[j].qty > 1? pname + "(Qty: " + invoices[i].InvoiceLines[j].qty + ")": pname;
            itemsList.push(pname);
            priceList.push(utils.formatMoney(invoices[i].InvoiceLines[j].cost))
        }
        if(invoices[i].total_tax > 0) itemsList.push("Taxes")
        if (invoices[i].discounts > 0) itemsList.push("Discount Fee")
        if (invoices[i].total_tax > 0) priceList.push(utils.formatMoney(invoices[i].total_tax))
        if (invoices[i].discounts > 0) priceList.push("-" + utils.formatMoney(invoices[i].discounts))

        let tDimensions = font.calculateTextDimensions(total,9);
        let aDimensions = font.calculateTextDimensions(applied_payment,9);
        let bDimensions = font.calculateTextDimensions(balance_remaining,9);
        
        let next_value_offset = box_start - 35;
        let r = 13;

        if(boxDimensions < marginBottom){

            if((boxDimensions + 55) >= marginBottom){
                cxt.drawRectangle(leftOffset+5,boxDimensions + 55,495,(box_size  + f)-60,pathStrokeOptions)
                   .writeText(num,leftOffset+20,box_start - 22,textFontOptions2)
                   .writeText(space,leftOffset+20,box_start - 35,mediumTextOptions)
                for(let k = 0; k < itemsList.length; k++){
                    let d = font.calculateTextDimensions(priceList[k],8);
                    cxt.writeText(itemsList[k],leftOffset+20,next_value_offset - r,textFontOptions)
                       .writeText(priceList[k],pageWidth - (leftOffset + d.width + table_padding),next_value_offset - r,textFontOptions)
                    r += 13;
                }
                pdfWriter.writePage(page);
                page = pdfWriter.createPage();
                page.mediaBox = [0,0,595,842];
                cxt = pdfWriter.startPageContentContext(page)
                await this.drawHeader(cxt,data,pageWidth,leftOffset,topOffset,font,mediumFont);
                box_start = topOffset-130;
            
                cxt.drawRectangle(leftOffset+5,box_start-25,495,35,pathStrokeOptions)
                   .writeText('Charges',leftOffset+20,box_start-11,mediumTextOptions2)
                   .drawRectangle(leftOffset+5,box_start-95,495,70,pathStrokeOptions)

                box_start = box_start - 90;  //35 +55
                let boxDimensions2 = box_start;
                //boxDimensions = box_start - (box_size + f);

                cxt.writeText("Invoice Total",leftOffset+20,boxDimensions2 + 30,mediumTextOptions)
                   .writeText("Payment",leftOffset+20,boxDimensions2 + 15,mediumTextOptions)
                   .writeText("Invoice Balance Remaining",leftOffset+20,boxDimensions2 ,mediumTextOptions)
                   .writeText(total,pageWidth - (leftOffset + tDimensions.width + table_padding),boxDimensions2 + 30,textFontOptions3)
                   .writeText(applied_payment,pageWidth - (leftOffset + aDimensions.width + table_padding),boxDimensions2 + 15,textFontOptions3)
                   .writeText(balance_remaining,pageWidth - (leftOffset + bDimensions.width + table_padding),boxDimensions2 ,textFontOptions3)

                final_box = box_start - 15;
                continue //continue here after im done

            }

            // -------------------else --------------
            pdfWriter.writePage(page);
            page = pdfWriter.createPage();
            page.mediaBox = [0,0,595,842];
            cxt = pdfWriter.startPageContentContext(page)
            await this.drawHeader(cxt,data,pageWidth,leftOffset,topOffset,font,mediumFont);
            box_start = topOffset-130;
            
            cxt.drawRectangle(leftOffset+5,box_start-40,495,35,pathStrokeOptions)
               .writeText('Charges',leftOffset+20,box_start-25,mediumTextOptions2)
            box_start = box_start - 35;
            boxDimensions = box_start - (box_size + f);
        }
        cxt.drawRectangle(leftOffset+5,box_start - (box_size+f) - 15 ,495,box_size + f + 10,pathStrokeOptions)
           .drawPath(leftOffset+20,box_start - ((box_size +f) - 55),leftOffset+480,box_start - ((box_size +f) - 55),pathStrokeOptions)
           .writeText(num,leftOffset+20,box_start - 22,textFontOptions2)
           .writeText(space,leftOffset+20,box_start - 35,mediumTextOptions)
        
        
        for(let k = 0; k < itemsList.length; k++){
            let valueOffset = (i === 2) ? (80 - r) + (topOffset - 280) : (next_value_offset - r);
            let d = font.calculateTextDimensions(priceList[k],8);
            cxt.writeText(itemsList[k],leftOffset+20, valueOffset,textFontOptions)
               .writeText(priceList[k],pageWidth - (leftOffset + d.width + table_padding), valueOffset,textFontOptions)
            r += 13;
        }
        

        cxt.writeText("Invoice Total",leftOffset+20,boxDimensions + 30,mediumTextOptions)
           .writeText("Payment",leftOffset+20,boxDimensions + 15,mediumTextOptions)
           .writeText("Invoice Balance Remaining",leftOffset+20,boxDimensions ,mediumTextOptions)
           .writeText(total,pageWidth - (leftOffset + tDimensions.width + table_padding),boxDimensions + 30,textFontOptions3)
           .writeText(applied_payment,pageWidth - (leftOffset + aDimensions.width + table_padding),boxDimensions + 15,textFontOptions3)
           .writeText(balance_remaining,pageWidth - (leftOffset + bDimensions.width + table_padding),boxDimensions ,textFontOptions3)

        box_start = box_start - (box_size + f) - 10;
        final_box = box_start - 5;
        //if(box start check with page page Height, then move to next page..)
    }

    //Final (Total) result box 

    let account_balance_due = data.payment.account_balance;

    //Fields
    let totalFields = [
      { name: "Payment Total", value: data.payment.amount, negative_sign: false }
    ]

    if(!this.isInterPropertyPayment()) {
      totalFields.push({ name: "Account Balance Due", value: account_balance_due, negative_sign: false });
    }

    let cashTotalFields = [
      { name: "Cash Amount Tendered", value: data.payment.amount_tendered, negative_sign: false },
      { name: "Change", value: (data.payment.amount_tendered - data.payment.amount), negative_sign: false }
    ]

    if(data.payment.method === 'cash' && data.payment.amount_tendered){
      totalFields.splice(1, 0, ...cashTotalFields);
    }

    //Count of Fields
    let totalFieldsCount = totalFields && totalFields.length || 0;
    let fieldHeight = 20;
    let boxHeight = (totalFieldsCount * fieldHeight) + 15;

    if(final_box-boxHeight < marginBottom){
        pdfWriter.writePage(page);
        page = pdfWriter.createPage();
        page.mediaBox = [0,0,595,842];
        cxt = pdfWriter.startPageContentContext(page)
        await this.drawHeader(cxt,data,pageWidth,leftOffset,topOffset,font,mediumFont);
        final_box = topOffset-130;
    }

    cxt.drawRectangle(leftOffset+5, final_box-boxHeight, 495, boxHeight, pathFillOptions)
       .drawRectangle(leftOffset+5, final_box-boxHeight, 495, boxHeight, pathStrokeOptions);

    if(totalFields && totalFields.length){
      totalFields.forEach((tf, index) => {
        let label = font.calculateTextDimensions(tf.name, 9);
        let value = tf.negative_sign ? `(${utils.formatMoney(Math.abs(tf.value))})` : utils.formatMoney(tf.value);
        let valueDimensions = font.calculateTextDimensions(value, 9);
        cxt.writeText(tf.name, pageWidth - (leftOffset + label.width + table_padding2), final_box - ((index + 1) * fieldHeight), textFontOptions3)
          .writeText(value, pageWidth - (leftOffset + valueDimensions.width + table_padding), final_box - ((index + 1) * fieldHeight), textFontOptions3);
      });
    }
  
    cxt.writeText(`Note: If you are delinquent, making a partial payment does not remove your delinquency status`, leftOffset + 15, final_box - boxHeight - 20 ,textFontOptions3)
 
    try{
      pdfWriter.writePage(page);
      console.log('Done Writing Pdf');
      pdfWriter.end();
    } catch(err){
    }
  }

  async generate(){
    let ws = new ms.WritableStream()
    let payment = this.data.data;
    //var pdfWriter = hummus.createWriter(`${settings.config.base_path}/output/sample_table_payment.pdf`, {version:hummus.ePDFVersion14} );
    var pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));
    var font = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Regular.ttf`);
    var mediumFont  = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Medium.ttf`);
    var boldFont  = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Bold.ttf`);
    var semiBoldFont = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Semibold-Regular.ttf`)

    let url = this.company.webLogo && this.company.webLogo.desktop ? this.company.webLogo.desktop: null;
    let rp = url ? await utils.getLogoPath(url, this.company.name) : null;
    this.logoUrl = rp && rp.status === 200 ? rp.path : null;
    
    var page = pdfWriter.createPage();
    page.mediaBox = [0,0,this.page_width,this.page_height];
    let cxt = pdfWriter.startPageContentContext(page)
  
    let leftOffset = 40;
    let topOffset = 800;
    let pageWidth = this.page_width;
    let pageHeight = this.page_height;

    var pathFillOptions = {type: 'fill', color: 'WHITESMOKE',  opacity: 0.2};
    var pathStrokeOptions = {color:'LightGray', width:0.05};

    if(payment && payment.property) payment.property.Emails = utils.transformPropertyEmails(payment.property.Emails);

    await this.drawHeader(cxt,payment,pageWidth,leftOffset,topOffset,font,mediumFont);
    await this.drawPaymentInfo(cxt,payment,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,semiBoldFont,pageWidth)
    await this.drawBillingInfo(pdfWriter,page,cxt,payment,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth);

    let bufferResult = ws.toBuffer();
    ws.end();
    return bufferResult;
    
  
  }

}

module.exports = CustomerReceipt;


