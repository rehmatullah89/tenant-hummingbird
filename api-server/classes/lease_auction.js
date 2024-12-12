"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
const Connection = require('./connection');
var Contact = require(__dirname + '/../classes/contact.js');
var Property = require(__dirname + '/../classes/property.js');

var e  = require(__dirname + '/../modules/error_handler.js');



class Lease_Auction {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.lease_id = data.lease_id || null;
    this.unit_id = data.unit_id || null;
    this.auction_type = data.auction_type || null;
    this.notes = data.notes || null;
    this.created_by = data.created_by || null;
    this.scheduled_date = data.scheduled_date || null;
    this.contact_id = data.contact_id || null;
    this.amount = data.amount || null;
    this.lien_amount = data.lien_amount || null;
    this.tax_exempt = data.tax_exempt || null;
    this.created_at = data.created_at || null;
    this.cleaning_deposit = data.cleaning_deposit || null;
    this.cleaning_period = data.cleaning_period || null;
    this.license_number = data.license_number || null;
    this.deleted_at = data.deleted_at || null;
    this.modified_at = data.modified_at || null;
    this.payment_id = data.payment_id || null;
    this.Contact = {};
    this.BidInvoice = {};
    this.BuyerPremium = data.BuyerPremium || null;
    this.bid_invoice_id = data.bid_invoice_id || null;
    this.default_cleaning_deposit = data.default_cleaning_deposit || null;
    this.default_cleaning_period = data.default_cleaning_period || null;
    
  }

  async save(connection) {

    var save = {
        id : this.id,
        lease_id : this.lease_id,
        unit_id : this.unit_id,
        auction_type : this.auction_type,
        notes : this.notes,
        created_by : this.created_by,
        scheduled_date : this.scheduled_date,
        contact_id : this.contact_id,
        amount : this.amount,
        lien_amount : this.lien_amount,
        tax_exempt : this.tax_exempt,
        // created_at : this.created_at,
        cleaning_deposit : this.cleaning_deposit,
        cleaning_period : this.cleaning_period,
        license_number : this.license_number,
        deleted_at : this.deleted_at,
        modified_at : this.modified_at,
        payment_id : this.payment_id,
        refund_id : this.refund_id,
        bid_invoice_id: this.bid_invoice_id
    }

    let result = await  models.Lease_Auction.save(connection, save, this.id)
    if (result.insertId) this.id = result.insertId;
  }

  async findContact(connection, company_id){
		if(!this.contact_id) return null;
		this.Contact = new Contact({id: this.contact_id});
    await this.Contact.find(connection, company_id);
    await this.Contact.getPhones(connection);
  }
  
  async checkDefaultSettings(connection, company_id){
    if(company_id){
      let auctions =  await Auctions.findAll(connection, company_id);
      if(auctions && auctions.length){
        this.default_cleaning_deposit = auctions[0].cleaning_deposit;
        this.default_cleaning_period = auctions[0].cleaning_period;
      }
    }
  }

  async findById(connection, company_id){

    if (!this.id) e.th(400, "Auction id required");
    let auction = await  models.Lease_Auction.findById(connection, this.id);
    await this.assembleLeaseAuction(auction);
    await this.findContact(connection, company_id);
    await this.checkDefaultSettings(connection, company_id);
    await this.findAuctionFees(connection,company_id);
    await this.findBidInvoice(connection);
  }

  async update(connection, data){

    if (!this.id) e.th(400, "Auction id not set");
    this.assembleLeaseAuction(data);
    await this.save(connection);
  }

  async delete(connection){
      if(!this.id) e.th(400, "Auction id not set");
      await models.Lease_Auction.deleteLeaseAuction(connection, this.id);
  }

  assembleLeaseAuction(data){

    if(!data) e.th(404,"Invalid auction.");

    if(typeof data.id !== 'undefined' && !this.id) this.id = data.id;
    if(typeof data.lease_id !== 'undefined') this.lease_id = data.lease_id;
    if(typeof data.unit_id !== 'undefined') this.unit_id = data.unit_id;
    if(typeof data.auction_type !== 'undefined') this.auction_type = data.auction_type;
    if(typeof data.notes !== 'undefined') this.notes = data.notes;
    if(typeof data.created_by !== 'undefined') this.created_by = data.created_by;
    if(typeof data.scheduled_date !== 'undefined') this.scheduled_date = data.scheduled_date;
    if(typeof data.contact_id !== 'undefined') this.contact_id = data.contact_id;
    if(typeof data.amount !== 'undefined') this.amount = data.amount;
    if(typeof data.lien_amount !== 'undefined') this.lien_amount = data.lien_amount;
    if(typeof data.tax_exempt !== 'undefined') this.tax_exempt = data.tax_exempt;
    if(typeof data.license_number !== 'undefined') this.license_number = data.license_number;
    if(typeof data.created_at !== 'undefined') this.created_at = data.created_at;
    if(typeof data.cleaning_deposit !== 'undefined') this.cleaning_deposit = data.cleaning_deposit;
    if(typeof data.cleaning_period !== 'undefined') this.cleaning_period = data.cleaning_period;
    if(typeof data.deleted_at !== 'undefined') this.deleted_at = data.deleted_at;
    if(typeof data.modified_at !== 'undefined') this.modified_at = data.modified_at;
    if(typeof data.payment_id !== 'undefined') this.payment_id = data.payment_id;
    if(typeof data.refund_id !== 'undefined') this.refund_id = data.refund_id;
    if(typeof data.BuyerPremium !== 'undefined') this.BuyerPremium = data.BuyerPremium;
    if(typeof data.bid_invoice_id !== 'undefined') this.bid_invoice_id = data.bid_invoice_id;

    if(!this.tax_exempt){
      this.license_number = null;
    }

  }

  async generateAuctionInvoice(connection, company_id, property_id, contact_id, created_by, apikey_id){

    let invoice = new Invoice({created_by, apikey_id});
    let property = new Property({id: property_id});
    let datetime = await property.getLocalCurrentDate(connection,'YYYY-MM-DD');
    invoice.create(
      { 
        lease_id: this.lease_id, 
        property_id, 
        contact_id, 
        date: datetime, 
        due: datetime,
        period_start: datetime,
        period_end: datetime,
      }, company_id);

    let invoiceLines = [];

    //Cleaning Deposit
    let cleaning_product =  await models.Product.findCleaningDepositProduct(connection, company_id);
    if(!cleaning_product) e.th(400, "Cannot generate Auction invoice as no Cleaning Deposit product is set.");
    let cd_InvoiceLine = this.buildInvoiceLine(cleaning_product, this.cleaning_deposit);
    if(cd_InvoiceLine) invoiceLines.push(cd_InvoiceLine);

    //Buyer Premium Fee
    if(this.BuyerPremium) {
      let fee_amount = this.calculateFeeAmount(this.BuyerPremium);
      let buyerPremiumFee  = await models.Product.findProductBySlug(connection,ENUM.AUCTION_PRODUCTS.BUYER_PREMIUM_FEE,company_id);
      this.amount -= this.BuyerPremium.is_inclusive ? fee_amount:0;

      if(this.amount < 0) e.th(400, "Buyer Premium amount cannot be greater than bid amount.");
      
      let fee_InvoiceLine = this.buildInvoiceLine(buyerPremiumFee, fee_amount, 0);
      invoiceLines.push(fee_InvoiceLine);
    }

    //Winning Bid
    let auction_product = await models.Product.findProductBySlug(connection,ENUM.AUCTION_PRODUCTS.REMAINING_BID,company_id);
    if(!auction_product) e.th(400, "Cannot generate Auction invoice as no Auction product is set.");
    let auc_InvoiceLine = this.buildInvoiceLine(auction_product, this.amount, (!!this.tax_exempt ? 0 : 1));
    if(auc_InvoiceLine) invoiceLines.push(auc_InvoiceLine);

    await invoice.generateLines(connection, invoiceLines, [], company_id);
    await invoice.total();

    return invoice;
  }

  async generateRetainedRevenueInvoice(connection, company_id, property_id, contact_id, created_by, apikey_id, amount){

    let invoice = new Invoice({created_by, apikey_id});
    let property = new Property({id: property_id});
    let datetime = await property.getLocalCurrentDate(connection,'YYYY-MM-DD');
    invoice.create(
      { 
        lease_id: this.lease_id, 
        property_id, 
        contact_id, 
        date: datetime, 
        due: datetime,
        period_start: datetime,
        period_end: datetime,
      }, company_id);

    let invoiceLines = [];

    //Retained Revenue
    let retained_revenue =   await models.Product.findProductBySlug(connection,ENUM.AUCTION_PRODUCTS.RETAINED_REVENUE,company_id);
    if(!retained_revenue) e.th(400, "Cannot generate Auction retained revenue invoice as no retained revenue product is set.");
    let rr_InvoiceLine = this.buildInvoiceLine(retained_revenue, amount);
    if(rr_InvoiceLine) invoiceLines.push(rr_InvoiceLine);

    await invoice.generateLines(connection, invoiceLines, [], company_id);
    await invoice.total();

    return invoice;
  }

  buildInvoiceLine(product, price, taxable){
    let invoiceLine = {
      product_id: product.id,
      qty: 1,
      cost: price
    }

    if(typeof taxable !== 'undefined') product.taxable = taxable;
    invoiceLine.Product = product;

    return invoiceLine;
  }

  async addUtcOffSetInDate(connection, property_id){

    let property = new Property({id: property_id});
    let off_set = await property.getUtcOffset(connection);
    return moment().utcOffset(parseInt(off_set)).format('YYYY-MM-DD');

  }

  async findAuctionFees(connection){
    let auctionFees = await models.Lease_Auction.findLeaseAuctionFees(connection, this.id);
    if(auctionFees?.length){
      this.BuyerPremium = auctionFees.find(x=> x.slug === ENUM.AUCTION_PRODUCTS.BUYER_PREMIUM_FEE);
    }
  }

  calculateFeeAmount(fee_obj){
    let fee_amount = 0;
    switch (fee_obj.type) {
      case 'percent':
        fee_amount = Math.round((this.amount * fee_obj.value))/ 1e2;
        break;
      case 'fixed':
        fee_amount = fee_obj.value
        break;
    }
    return fee_amount;
  }

  async saveAuctionFees(connection, company_id){

    if(!this.BuyerPremium) return;
    if(!this.BuyerPremium.product_id){
      let buyerPremiumProduct   = await models.Product.findProductBySlug(connection,ENUM.AUCTION_PRODUCTS.BUYER_PREMIUM_FEE,company_id);
      this.BuyerPremium.product_id = buyerPremiumProduct.id;  
    }

    let buyerPremiumFee = new LeaseAuctionFee({...this.BuyerPremium});
    buyerPremiumFee.lease_auction_id = this.id;
    buyerPremiumFee.amount = this.calculateFeeAmount({...this.BuyerPremium});

    await buyerPremiumFee.save(connection);
  }

  async findBidInvoice(connection){
    if(this.bid_invoice_id) {
      let invoice = new Invoice({id: this.bid_invoice_id});
      await invoice.find(connection);
      this.BidInvoice = invoice;
    }
  }

}

class AuctionAsset {
  constructor(upload, categories, description, is_published) {
    this.id = upload.id;
    this.filename = upload.filename;
    this.src = upload.src;
    this.caption = upload.description;
    this.document_type_id = upload.document_type_id;
    this.uploaded_by = upload.uploaded_by;
    this.upload_date = upload.upload_date;
    this.extension = upload.extension;
    this.encoding = upload.encoding;
    this.mimetype = upload.mimetype;
    this.size = upload.size;
    this.name = upload.name;
    this.status = upload.status;
    this.fileloc = upload.fileloc;
    this.bucket_name = upload.bucket_name;
    this.categories = categories ? JSON.parse(categories) : [];
    this.description = description;
    this.is_published = is_published;
  }
}

class AuctionClient {
  constructor(data) {
    if(data){
      this.request_id = data.request_id;
      this.trace_id = data.trace_id;
    }
    this.endpoint = process.env.AUCTION_MANAGER_APP_ENDPOINT;
    this.component_name = "HB_AUCTION_MANAGER_INTEGRATION"
  }

  async publish(body, company_id, lease_auction_id){
    let request_params = {
      headers: this.getHeaders(),
      uri: this.endpoint + '/v1/companies/'+ company_id +'/auctions/lease-auction/'+lease_auction_id+'/create',
      method: 'POST',
      body: body,
      json: true
    }
    console.log('URI: ', request_params.uri);
    console.log('Body:', JSON.stringify(request_params.body));
    let result = await this.makeRequest(request_params);
    console.log('Result', result);
    return result;
  }

  async cancel(body, company_id, lease_auction_id){
    let request_params = {
      headers: this.getHeaders(),
      uri: this.endpoint + '/v1/companies/'+ company_id +'/auctions/lease-auction/'+lease_auction_id+'/cancel',
      method: 'PUT',
      body: body,
      json: true
    }
    console.log('URI: ', request_params.uri);
    console.log('Body:', JSON.stringify(request_params.body));
    let result = await this.makeRequest(request_params);
    console.log('Result', result);
    return result;
  }

  getHeaders(token){
    let headers = {
      "X-storageapi-request-id": this.request_id,
      "X-storageapi-trace-id": this.trace_id
    }
    if(token){
      headers["x-api-key"] = token
    }
    return headers;
  }

  async makeRequest(request_params, requester){
    let logs = {
      request_params,
      env: process.env.NODE_ENV
    };
    let result = {}
    try {
      let timing_start = Date.now();
      if ( requester && requester === 'axios'){
        let {data} = await axios(request_params);
        result = data;
        console.log('Result in leaseAuction: ' + result);
      }
      else{
        result = await request(request_params);
        console.log('Result in leaseAuction else: ' + JSON.stringify(result));
      }
      logs.timing = Date.now() - timing_start;
      logs.result = result;
    } catch(err) {
      logs.error = err;
      if(err.statusCode !== 404){
        logs.notify = true;
      }
      throw err;
    } finally {
      try {
        if (logs.env !== 'test' && logs.env !== 'local' && logs.env !== 'data-validation') {
          utils.sendLogsToGDS(this.component_name, logs, '', logs.error ? 'error' : 'info', this.request_id, this.trace_id);
        }
      } catch (err) {
        console.log("Error in sending logs to GDS: ", logs, "trace_id:", this.trace_id, err);
      }
    }
    return result;
  }
}

class AuctionInfo {
  createPublishPayload(propertyId, unit, contact, address, contactId, startDateTime, endDateTime, auctionType,
                       balance, imageUrls, contents, categories, notes, vendor, cancelReason, cancelDescription) {
    this.action = 'publish';
    return {
      facility: propertyId,
      unitName: unit.number,
      unitDescription: unit.description,
      unitWidth: unit.width,
      unitLength: unit.length,
      unitHeight: unit.height,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      auctionType: auctionType,
      lienAmount: balance,
      unitNumber: unit.number,
      imageUrls: imageUrls,
      contents: contents,
      categories: categories,
      specialNotes: notes,
      tenantId: contactId,
      tenantFirstName: contact.first,
      tenantLastName: contact.last,
      tenantStreet1: address.address,
      tenantStreet2: address.address2,
      tenantCity: address.city,
      tenantState: address.state,
      tenantPostalCode: address.zip,
      tenantCountry: address.country,
      vendor: vendor,
      reason: cancelReason,
      description: cancelDescription,
    };
  }

  createCancelPayload(unit, reason, description, vendor) {
    this.action = 'cancel';
    return {
      vendor: vendor,
      unitId: unit.id,
      unitName: unit.number,
      unitNumber: unit.number,
      cancelReason: reason,
      cancelDescription: description
    };
  }

}

module.exports = {
  LeaseAuction: Lease_Auction,
  AuctionAsset: AuctionAsset,
  AuctionInfo: AuctionInfo,
  AuctionClient: AuctionClient,
};


var Invoice   = require(__dirname + '/../classes/invoice.js');
var Auctions  = require(__dirname + '/../classes/auctions.js');
var LeaseAuctionFee  = require(__dirname + '/../classes/lease_auction_fee.js');
const ENUM = require(__dirname + '/../modules/enums.js');
const {default: axios} = require("axios");
const request = require("request-promise");
const utils = require("../modules/utils");