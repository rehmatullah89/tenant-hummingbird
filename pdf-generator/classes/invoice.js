'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var fs = require('fs');
//var invoiceData    = require(__dirname + '/data.js');
var moment = require('moment');
var ms = require('memory-streams');
var request = require('request');

var settings    = {
    config:{
        base_path: `${__dirname}/../public`
    } 
}

class Invoice {

  constructor(data) {
    this.data = data.data;

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
   
  async drawHeader(cxt,invoice,pageWidth,pageHeight,leftOffset,topOffset,font,mediumFont){

    let mediumTextOptions = {
      font: mediumFont,
      size: 10,
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

    leftOffset = 54;
   
    let topRightText = []
    let textWidth = [];
    const country = invoice.Property.Address.country ? invoice.Property.Address.country + ' ' : '';
    let csz = invoice.Property.Address.city + ', ' + invoice.Property.Address.state + ', ' + country + invoice.Property.Address.zip;
    topRightText.push(invoice.Property.name);
    topRightText.push(invoice.Property.Address.address);
    topRightText.push(csz);

    var textDimensions = mediumFont.calculateTextDimensions(topRightText[0],10);
    textWidth.push(textDimensions.width);

    for (let j = 1; j < topRightText.length; j++) {
      let d = topRightText[j];
      var textDimensions = font.calculateTextDimensions(d,10);
      textWidth.push(textDimensions.width);
    }

    if(this.logoUrl) {
      let imageOptions = {
        transformation: {
          width:150,
          height:80
        }
      }
      cxt.drawImage(62,715,this.logoUrl,imageOptions);
    } else {
      mediumTextOptions.size = 13;
      cxt.writeText(this.company.name,50,topOffset-60,mediumTextOptions);
      mediumTextOptions.size = 10;
    }

    cxt.writeText(topRightText[0],pageWidth-(textWidth[0]+leftOffset),topOffset-45,mediumTextOptions)
      .writeText(topRightText[1],pageWidth-(textWidth[1]+leftOffset),topOffset-60,textFontOptions2)
      .writeText(topRightText[2],pageWidth-(textWidth[2]+leftOffset),topOffset-75,textFontOptions2)
      //.drawImage(62,718,img,imageOptions)
  }
  
  async drawBillingInfo(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont){
    let billTo = [];
    let mediumTextOptions = {
      font: mediumFont,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let mediumTextOptions2 = {
      font: mediumFont,
      size: 8,
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
    }
    let name = invoice.Contact? invoice.Contact.first + ' ' + invoice.Contact.last :'';
    let phone = invoice.Contact && invoice.Contact.Phones.length? utils.formatPhone(invoice.Contact.Phones) :'';
    let addr = invoice.Contact && invoice.Contact.Addresses.length && invoice.Contact.Addresses[0].Address? invoice.Contact.Addresses[0].Address.address: '';
    const country = invoice.Contact.Addresses[0].Address.country ? invoice.Contact.Addresses[0].Address.country + ' ' : '';
    let csz = invoice.Contact && invoice.Contact.Addresses.length  && invoice.Contact.Addresses[0].Address? invoice.Contact.Addresses[0].Address.city + ', ' + invoice.Contact.Addresses[0].Address.state + ', ' + country +  invoice.Contact.Addresses[0].Address.zip : '';
    
    const propertyCountry = invoice.Property.Address.country ? invoice.Property.Address.country + ' ' : '';
    let csz2 = invoice.Property.Address.city + ', ' + invoice.Property.Address.state + ', ' + propertyCountry + invoice.Property.Address.zip;
    let pName = invoice.Property.name;
    let pAddr = invoice.Property.Address.address;

    if(name) billTo.push(utils.capitalizeFirst(name));
    if(phone) billTo.push(phone);
    if(addr) billTo.push(utils.capitalizeFirst(addr));
    if(csz) billTo.push(utils.capitalizeFirst(csz));
    cxt.drawPath(leftOffset+5,topOffset-228,leftOffset+245,topOffset-228,pathStrokeOptions)
      .writeText('Bill To',leftOffset+15,topOffset-219,mediumTextOptions)
    if(billTo.length === 1){
      cxt.drawRectangle(leftOffset+5,topOffset-250,240,50,pathStrokeOptions)
    }
    else if(billTo.length === 2){
      cxt.drawRectangle(leftOffset+5,topOffset-260,240,60,pathStrokeOptions)
    }
    else if(billTo.length === 3){
      cxt.drawRectangle(leftOffset+5,topOffset-270,240,70,pathStrokeOptions)
    }
    else if(billTo.length === 4){
      cxt.drawRectangle(leftOffset+5,topOffset-280,240,80,pathStrokeOptions)
    }

    
    cxt.writeText(name,leftOffset+15,topOffset-243,mediumTextOptions2)
    let val = 253;
    for(let a = 1; a < billTo.length; a++){
    cxt.writeText(billTo[a],leftOffset+15,topOffset-val,textFontOptions)
    val += 10;
    }
    cxt.drawRectangle(leftOffset+260,topOffset-270,240,70,pathStrokeOptions)
      .drawPath(leftOffset+260,topOffset-228,leftOffset+500,topOffset-228,pathStrokeOptions)

      .writeText('Send Payments To',leftOffset+270,topOffset-218,mediumTextOptions)
      .writeText(pName,leftOffset+270,topOffset-243,mediumTextOptions2)
      .writeText(pAddr,leftOffset+270,topOffset-253,textFontOptions)
      .writeText(csz2,leftOffset+270,topOffset-263,textFontOptions)
  }

  async drawInvoiceInfo(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,boldFont){

    let textFontOptions = {
      font: font,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions2 = {
      font: mediumFont,
      size: 9,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let boldTextOptions = {
      font: boldFont,
      size: 17,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    cxt.writeText("Invoice #"+ invoice.number,leftOffset+10,topOffset-173,boldTextOptions)
      //.writeText('Circles',leftOffset+200,topOffset-400,textFontOptions);
    
    cxt.drawRectangle(leftOffset+291,topOffset-150,70,25,pathFillOptions)
       .drawRectangle(leftOffset+291,topOffset-150,70,25,pathStrokeOptions)
       .writeText('Invoice Id',leftOffset+296,topOffset-141,mediumTextOptions2)
       .drawRectangle(leftOffset+361,topOffset-150,70,25,pathFillOptions)
       .drawRectangle(leftOffset+361,topOffset-150,70,25,pathStrokeOptions)
       .writeText('Invoice Date',leftOffset+366,topOffset-141,mediumTextOptions2)
       .drawRectangle(leftOffset+431,topOffset-150,70,25,pathFillOptions)
       .drawRectangle(leftOffset+431,topOffset-150,70,25,pathStrokeOptions)
       .writeText('Due Date',leftOffset+437,topOffset-141,mediumTextOptions2)

       .drawRectangle(leftOffset+291,topOffset-175,70,25,pathStrokeOptions)
       .writeText(invoice.number,leftOffset+296,topOffset-166,textFontOptions)
       .drawRectangle(leftOffset+361,topOffset-175,70,25,pathStrokeOptions)
       .writeText(utils.formatDateServices(invoice.date),leftOffset+366,topOffset-166,textFontOptions)
       .drawRectangle(leftOffset+431,topOffset-175,70,25,pathStrokeOptions)
       .writeText(utils.formatDateServices(invoice.due),leftOffset+437,topOffset-166,textFontOptions)

       //.drawRectangle(leftOffset+5,topOffset-570,497,390,pathStrokeOptions)
       .drawPath(leftOffset+5,topOffset-185,leftOffset+501,topOffset-185,pathStrokeOptions)

  }

  async drawInvoiceItemsBox(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth){
    let status = invoice.paid === 1? ' - Paid' : ' - Due Date : '+ utils.formatDateServices(invoice.due);
    let inv = 'Invoice #' + invoice.number;
    let iDimension = font.calculateTextDimensions(inv,8);
    let sDimension = mediumFont.calculateTextDimensions(status,8);
    let table_padding = 23;
    let items = invoice.InvoiceLines.length;
    let factor = items * 15;
    
    let mediumTextOptions2 = {
      font: mediumFont,
      size: 8,
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
  
    cxt.drawRectangle(leftOffset+5,topOffset-320,495,30,pathFillOptions)
      .drawRectangle(leftOffset+5,topOffset-320,495,30,{
        type: 'stroke',
        color:'LightGray',
        width:0.05
      })
      .writeText('Description',leftOffset+15,topOffset-309,mediumTextOptions2)
      .writeText('Qty',leftOffset+330,topOffset-309,mediumTextOptions2)
      .writeText('Rate',leftOffset+400,topOffset-309,mediumTextOptions2)
      .writeText('Total',leftOffset+470,topOffset-309,mediumTextOptions2)

      .drawRectangle(leftOffset+5,topOffset-337,495,17,pathStrokeOptions)
      .writeText(`Space #${(invoice.Lease && invoice.Lease.Unit) ? invoice.Lease.Unit.number : '-'}`,leftOffset+15,topOffset-332,textFontOptions)
      .writeText(inv,pageWidth - (iDimension.width + sDimension.width + leftOffset + table_padding),topOffset-332,textFontOptions)
      .writeText(status,pageWidth - (sDimension.width + leftOffset + table_padding),topOffset-332,mediumTextOptions2)

      .drawRectangle(leftOffset+5,topOffset-(347+factor),495,(10+factor),pathStrokeOptions)

    let yval = topOffset-(347+factor+130);
    await this.drawInvoiceSummaryBox(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth,yval)
  
    let rect = topOffset-(347+factor) + 12;
    let table_padding2 = 27;
    for(let j = 0; j < items; j++){
      let f = j * 15 ;
      let name = invoice.InvoiceLines[j].Product.name;
      if(invoice.InvoiceLines[j].Product.name.toLowerCase() === 'rent'){
        name = invoice.InvoiceLines[j].Product.name + '(' + utils.formatDateServices(invoice.InvoiceLines[j].start_date) + ' - ' + utils.formatDateServices(invoice.InvoiceLines[j].end_date) + ')';
      }
      let t = invoice.InvoiceLines[j].qty * invoice.InvoiceLines[j].cost;
      let qty = invoice.InvoiceLines[j].qty.toString();
      let rate = utils.formatMoney(invoice.InvoiceLines[j].cost);
      let total = utils.formatMoney(t);
      let dt = font.calculateTextDimensions(total,8);
      let dr = font.calculateTextDimensions(rate,8);
      let dq = font.calculateTextDimensions(qty,8);
      
      cxt.writeText(name,leftOffset+15,rect + f,textFontOptions)
        .writeText(qty,pageWidth-(leftOffset + dq.width + table_padding2 + 152),rect + f,textFontOptions)
        .writeText(rate,pageWidth-(leftOffset + dr.width + table_padding2 + 65),rect + f,textFontOptions)
        .writeText(total,pageWidth-(leftOffset + dt.width + table_padding2),rect + f,textFontOptions)
    }
      
    

  }

  async drawInvoiceSummaryBox(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth,yval){
    let table_padding = 28;
    let table_padding2 = 85;
    let textFontOptions = {
      font: font,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions2 = {
      font: font,
      size: 12,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions3 = {
      font: font,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let mediumTextOptions = {
      font: mediumFont,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions2 = {
      font: mediumFont,
      size: 12,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let summaryMenu = ["Subtotal:" , "Discount:", "Tax:"];
    let summaryMenuWidth = [];
  
    let sub_total = utils.formatMoney(invoice.sub_total);
    let discount = utils.formatMoney(invoice.total_discounts);
    let tax = utils.formatMoney(invoice.total_tax);
    let ptotal = (invoice.sub_total + invoice.total_tax) - invoice.total_discounts;
    let payment_total = utils.formatMoney(ptotal);
    let payment_received  = utils.formatMoney(invoice.total_payments);
    let balace_due = utils.formatMoney(invoice.balance);

    let ws = font.calculateTextDimensions(sub_total,8);
    let wd = font.calculateTextDimensions(discount,8)
    let wt = font.calculateTextDimensions(tax,8)
    let wpt = mediumFont.calculateTextDimensions(payment_total,10)
    let wpr = font.calculateTextDimensions(payment_received,8)
    let wb = mediumFont.calculateTextDimensions(balace_due,10)

    for (let i = 0; i<summaryMenu.length; i++){
      let d = font.calculateTextDimensions(summaryMenu[i],8);
      summaryMenuWidth.push(d.width);
    }
    let pt = mediumFont.calculateTextDimensions("Payment Total:",10)
    let pr = font.calculateTextDimensions("Payment Received:",8)
    let bd = mediumFont.calculateTextDimensions("Balance Due:",10)
    summaryMenuWidth.push(pt.width, pr.width,bd.width);
    cxt.drawRectangle(leftOffset+5,yval,495,130,pathStrokeOptions) 
      .writeText('If you’re not already enrolled in autopay, enroll today to',leftOffset+15,yval+110,mediumTextOptions2)
      .writeText('make sure you never miss a payment.',leftOffset+15,yval+95,mediumTextOptions2)

      .drawRectangle(leftOffset+349,yval+50,150,79,{type: 'fill', color: 0xf9fafb,  opacity: 0.2}) 
      .writeText('Subtotal:',pageWidth - (leftOffset + summaryMenuWidth[0] + table_padding2),yval+114,textFontOptions)
      .writeText('Discount:',pageWidth - (leftOffset + summaryMenuWidth[1] + table_padding2),yval+100,textFontOptions)
      .writeText('Tax:',pageWidth - (leftOffset + summaryMenuWidth[2] + table_padding2),yval+86,textFontOptions)
      .writeText('Payment Total:',pageWidth - (leftOffset + summaryMenuWidth[3] + table_padding2),yval+72,mediumTextOptions)

      .writeText(sub_total,pageWidth - (leftOffset + ws.width + table_padding),yval+114,textFontOptions)
      .writeText(discount,pageWidth - (leftOffset + wd.width + table_padding),yval+100,textFontOptions)
      .writeText(tax,pageWidth - (leftOffset + wt.width + table_padding),yval+86,textFontOptions)
      .writeText(payment_total,pageWidth - (leftOffset + wpt.width + table_padding),yval+72,mediumTextOptions)

      .drawPath(leftOffset+349,yval+50,leftOffset+500,yval+50,pathStrokeOptions)

      .drawRectangle(leftOffset+349,yval+1,150,48,{type: 'fill', color: 0xf4f6f8,  opacity: 0.2})
      .writeText('Payment Received:',pageWidth - (leftOffset + summaryMenuWidth[4] + table_padding2),yval+34,textFontOptions)
      .writeText('Balance Due:',pageWidth - (leftOffset + summaryMenuWidth[5] + table_padding2),yval+20,mediumTextOptions)
      .writeText(payment_received,pageWidth - (leftOffset + wpr.width + table_padding),yval+34,textFontOptions)
      .writeText(balace_due,pageWidth - (leftOffset + wb.width + table_padding),yval+20,mediumTextOptions);
      cxt.writeText(`Note: If you are delinquent, making a partial payment does not remove your delinquency status`,leftOffset+15,yval-20,textFontOptions)
   
      if(this.data.Property.Phones && this.data.Property.Phones.length > 0) {
        cxt.writeText(`If you have any questions, call us at ${utils.formatPhone(this.data.Property.Phones)}`,leftOffset+15,yval-35,textFontOptions)
      }
  }    
 
  async generate(){
    let ws = new ms.WritableStream()
    let invoice = this.data;
    //var pdfWriter = hummus.createWriter(`${settings.config.base_path}/output/sample_table.pdf`, {version:hummus.ePDFVersion14} );
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

    await this.drawHeader(cxt,invoice,pageWidth,pageHeight,leftOffset,topOffset,font,mediumFont);
    await this.drawInvoiceInfo(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,semiBoldFont);
    await this.drawBillingInfo(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont);
    await this.drawInvoiceItemsBox(cxt,invoice,leftOffset,topOffset,pathFillOptions,pathStrokeOptions,font,mediumFont,pageWidth);
    pdfWriter.writePage(page);

    console.log('Reach at end');
    pdfWriter.end();

    let bufferResult = ws.toBuffer();
    ws.end();
    return bufferResult;
  
  }

}

module.exports = Invoice;


