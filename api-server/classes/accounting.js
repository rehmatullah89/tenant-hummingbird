"use strict";
const db = require(__dirname + '/../modules/db_handler.js');
var ENUMS = require(__dirname + '/../modules/enums.js');

let Payment;
let Invoice;
let AccountingEvent;

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var request    = require('request');
var rp    = require('request-promise');

var Promise = require('bluebird');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

const ACCOUNTING_APP_ID = 'appc7f99999429342e9b828a727a6e4ddeb';
const GDS_API_KEY = "b52ff2585bc84a69b5dce061c6214388";

//const endpoint = 'https://staging.tenantapi.com/v3/applications/' + ACCOUNTING_APP_ID + '/';
const endpoint = settings.ledger.base_url + '/';
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class Accounting {
  constructor(data) {
    data = data || {};
    this.company_id = data.company_id;
    this.Company = {};
    this.Facility = {};
    this.COA = [];
    this.Categories = [];
    this.AccountTypes = [];
    this.AccountSubtypes = [];
    this.Inventory = [];
    this.TaxAccounts = [];
    this.taxes = [];
    this.Settings = null;

    this.options = {
      uri: '',
      headers: {
        "x-storageapi-key": GDS_API_KEY,
        "x-storageapi-date": moment().format('x'),
        "Content-Type": "application/json"
      },
      json: true
    }

    this.EVENT_PRIORITIES = {
      isWriteOff: {
        EVENT_VALUE: ENUMS.ACCOUNTING.EVENTS.WRITE_OFF,
        FUNCTION: 'setIsWriteOff',
        RESULT: false
      },
      isExcessCredit: {
        EVENT_VALUE: ENUMS.ACCOUNTING.EVENTS.POSTING_EXCESS_CREDIT_PAYMENT,
        FUNCTION: 'setIsExcessCredit',
        RESULT: false
      },
      isFutureInvoice: {
        EVENT_VALUE: ENUMS.ACCOUNTING.EVENTS.POSTING_EXCESS_PAYMENT,
        FUNCTION: 'setIsFutureInvoice',
        RESULT: false
      },
      isCreditsUsed: {
        EVENT_VALUE: ENUMS.ACCOUNTING.EVENTS.PAYMENT_WITH_CREDITS,
        FUNCTION: 'setIsCreditUsed',
        RESULT: false
      }
    }    
  }

  async isToggleON(connection) {
    await this.findSettings(connection, {
      company_id: this.company_id,
      name: ENUMS.SETTINGS.ACCOUNTING.toggleAccounting.name
    });

    const isToggleOn = this.Settings?.length && this.Settings[0].value == 1;
    return isToggleOn;
  }

  async generateExport(connection, payload) {
    let gl_export = new GL_Export();
    let company = await db.getMappingByCompanyId(payload.cid);
    payload.company_id = company.hb_company_id;
    this.company_id = payload.company_id;

    const isToggleOn = await this.isToggleON(connection);
    if(!isToggleOn) {
      console.log('Accounting toggle is off for company:', this.company_id);
      return;
    }

    const property = new Property({ id: payload.property_id, company_id: payload.company_id });
    const accountingSetup = await property.findAccountingSetup(connection);

    if(accountingSetup.book_id?.length == 0) {
      console.log("Accounting setup not found.");
      return;
    }

    payload.Property = property;
    AccountingEvent  = AccountingEvent || require('../classes/accounting/accounting_event/base_export.js');

    let event = await AccountingEvent.InitAccountingExport(connection, payload);

    if(!event) return;

    event.validate();
    await event.validateIfObjectIdExist(connection);
    let export_data = event && await event.generate(connection);
       
    if (export_data && export_data.length > 0) {
      let books = [...new Set(event.credit_debit_account.map(item => item.book_id))];
      await gl_export.bulkSave(connection, export_data, books, event.uuid, event.property_id);

      console.log("Accounting Export Finished");
    }
  }

  async setIsFutureInvoice(connection, { invoiceId }) {
    let invoice = new Invoice({ id: invoiceId });
    const invoiceTimeSpan = await invoice.getTimeSpan(connection);
    return invoiceTimeSpan === 'future' ? true : false;
  }

  async setIsExcessCredit(connection, { invoiceId, paymentId }) {
    let invoice = new Invoice({ id: invoiceId });
    const invoiceTimeSpan = await invoice.getTimeSpan(connection);
    if(invoiceTimeSpan && invoiceTimeSpan === 'future') {
      return await this.setIsCreditUsed(connection, { paymentId });
    }
    return false;
  }
  
  async setIsCreditUsed(connection, { paymentId }) {
    let payment = new Payment({ id: paymentId });
    const paymentMethod = await payment.getMethod(connection);
    return ((paymentMethod === ENUMS.PAYMENT_CREDIT_TYPE.CREDIT) || (paymentMethod === ENUMS.PAYMENT_CREDIT_TYPE.ADJUSTMENT)) ? true : false ;
  }

  async setIsWriteOff(connection, { paymentId }) {
    let payment = new Payment({ id: paymentId });
    const paymentMethod = await payment.getMethod(connection);
    return paymentMethod === ENUMS.PAYMENT_CREDIT_TYPE.LOSS ? true : false ;
  }

  shouldSkipEvent(keys) {
    const result = keys.some(e => !this.EVENT_PRIORITIES[e].RESULT);
    return !result;
  }

  async setEventId(connection, payload) {   
    let event_priorities = this.EVENT_PRIORITIES;
    for(let ep in event_priorities) {
      const result = await this[event_priorities[ep].FUNCTION](connection, payload);
      event_priorities[ep].RESULT = result;
    }

    // if(this.shouldSkipEvent(['isCreditsUsed', 'isFutureInvoice'])) return ENUMS.ACCOUNTING.EVENTS.POSTING_PAYMENT;

    for(let ep in event_priorities) {
      if(event_priorities[ep].RESULT) return event_priorities[ep].EVENT_VALUE;
    }

    // Default Event ID
    return ENUMS.ACCOUNTING.EVENTS.POSTING_PAYMENT;
  }

  async computeAccountingData(connection, payload) {
    Payment = Payment || require('../classes/payment.js');
    Invoice = Invoice || require('../classes/invoice.js');

    const { cid, invoiceId, paymentId, propertyId, invoicesPaymentsBreakdownId, source } = payload;

    // Terminating process payment event in case of refund or adjustment
    if(await this.isRefund(connection, invoicesPaymentsBreakdownId) || await this.isExcludableAdjustment(connection, invoicesPaymentsBreakdownId)) {
      return;
    }

    const eventId = await this.setEventId(connection, payload);      
    const accountingEventData = {
      invoice_id: invoiceId,
      payment_id: paymentId,
      property_id: propertyId,
      cid: cid,
      break_down_id: invoicesPaymentsBreakdownId,
      event_id: eventId,
      source: source
    }

    console.log('Accounting Event Data ', accountingEventData);
    return accountingEventData;
  }

  async isRefund(connection, invoicesPaymentsBreakdownId){
    let payment = new Payment();
    let  invoice_payment_breakdown = await payment.findInvoicePaymentBreakdownById(connection, [invoicesPaymentsBreakdownId])
    return invoice_payment_breakdown?.length > 0 && invoice_payment_breakdown[0].refund_id ? true : false
  }

  async isExcludableAdjustment(connection, invoicesPaymentsBreakdownId) {
    let payment = new Payment();
    await payment.findPaymentOfBreakdown(connection, invoicesPaymentsBreakdownId);

    if(payment && payment.credit_type == ENUMS.PAYMENT_CREDIT_TYPE.ADJUSTMENT
        && [ ENUMS.ADJUSTMENT_SUB_METHOD.AUCTION, ENUMS.ADJUSTMENT_SUB_METHOD.RETAINED_REVENUE, ENUMS.ADJUSTMENT_SUB_METHOD.INTER_PROPERTY_PAYMENT ].includes(payment.sub_method)){
      return true;
    }
    return false;
  }

  async getCompanySettings(connection) {
    const settings = await Settings.findSettings(connection, 'accounting', this.company_id);

    const { ACCOUNTING: ACCOUNTING_SETTINGS } = ENUMS.SETTINGS;
    for(let s in ACCOUNTING_SETTINGS) {
      settings[s] = settings[s] || ACCOUNTING_SETTINGS[s].default;
    }

    return settings;
  }

  async saveSettings(connection, payload) { 
    utils.validateFunctionParams({ 
      required_params: [{ 'company_id': this.company_id }],
      function_description: 'save accounting settings'
    });

    const { settings, api_info } = payload;
    await Settings.saveMultiple(connection, {
      company_id: this.company_id,
      settings,
      setting_category: 'accounting',
      api_info
    });
  }

  async getCompany(){
    try {

      if(process.env.NODE_ENV === 'test') return false;

      this.options.uri = endpoint + "companies/" + this.company_id;
      let data = await rp(this.options);
      console.log("data", data)
      this.Company = data.owner;

    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getProperty(property_id){
    try {

      this.options.uri = endpoint + "facilities/" + property_id;
      let data = await rp(this.options);

      this.Facility = data.facility;
      console.log("this.Company ", this.Facility );
    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getCOA(){

    try {

      this.options.uri = endpoint + "accounts/company/" + this.company_id + "/coa";
      let data = await rp(this.options);
      this.COA = data.accounts;

      console.log("COA", data);

      return;

    } catch(err){
      console.log("err", err);
      //  return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getCategories(){
    try {

      this.options.uri = endpoint + "accounts/categories";
      let data = await rp(this.options);

      this.Categories = data.categories;

    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getTypes(company_id){
    try {
      this.options.uri = endpoint + "accounts/types";
      let data = await rp(this.options);
      this.AccountTypes = data.account_types;
    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }



  async getSubtypes(){
    try {
      this.options.uri = endpoint + "accounts/subtypes";
      let data = await rp(this.options);
      this.AccountSubtypes = data.account_subtypes;

    } catch(err){
      // return null;
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getTaxAccounts(company_id){
    try {
      this.options.uri = endpoint + "accounts/company/" + this.company_id + '/taxaccounts';
      let data = await rp(this.options);
      this.TaxAccounts = data.accounts;

    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async checkFacilityExist(property_id){
    if (this.Company && this.Company.facilities.length > 0 ){
      this.Facility = this.Company.facilities.find(facility => facility.gds_facility_id === property_id.toString());
    } else if (this.company_id){
      await this.getCompany();
      this.Facility = this.Company.facilities.find(facility => facility.gds_facility_id === property_id.toString());
    }else {
      this.Facility = null;
    }
    return;
  }

  async getInventory(){
    try {
      this.options.uri = endpoint + "inventory/company/" + this.company_id;
      let data = await rp(this.options);
      console.log("data",  data);
      this.Inventory = data.inventory;
    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async getInventoryItem(product_id){
    try {
      this.options.uri = endpoint + "inventory/company/" + this.company_id + '/' + product_id;
      let data = await rp(this.options);
      return data.inventory;
    } catch(err){
      console.log("err", err);
      // return null;
      e.th(err.statusCode,  err.error.message)
    }
  }

  async create(name){
    try{
      this.options.uri = endpoint + "companies/" + this.company_id;
      this.options.method = 'POST';

      this.options.body = {
        description: name
      };

      let data =  await rp(this.options);

      return data;

    } catch(err){
      // return null;
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async copyBaseLedger(){
    try{

      this.options.uri = endpoint + 'accounts/company/copycoa/tenant/' + this.company_id;
      this.options.method = 'POST';
      this.options.body = {
        "reset_starting_balances": true
      };
      let data =  await rp(this.options);
      return data;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async saveAccount(account){
    try {
      this.options.uri = endpoint + 'accounts/company/' + this.company_id + '/coa/';

      if(account.account_id){
        this.options.method = 'PUT';
      } else {
        account.normal_balance = -1;
        this.options.method = 'POST';
      }

      this.options.body = {
        accounts: [account],
        propagate: true
      };

      let data =  await rp(this.options);

      return data;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async saveInventory(product, contact){
    try{
      this.options.uri = endpoint + 'inventory/company/' + this.company_id;

      this.options.body = {
        inventory: [{
          "prod_or_serv": 	        product.has_inventory? 1:0,
          "description":            product.name,
          "SKU":                    product.sku,
          "product_id":             product.id.toString(),
          "stockable":              !!product.has_inventory,
          "taxable":                !!product.taxable,
          "income_account_id":	    product.income_account_id,
          "expense_account_id":	    product.expense_account_id,
          "concession_account_id":  product.concession_account_id,
          "liability_account_id":	  product.liability_account_id,
          "posted_by":              contact.first + ' ' + contact.last,
          "per_unit_cost":          product.per_unit_cost,
          "per_unit_price":         product.price,
          "inventory_count":        product.inventory_count,
          "default_type":           product.default_type,
          "product_category_id":    product.product_category_id
        }]
      };

      let inventory = await this.getInventoryItem(product.id);
      if(inventory && inventory.length > 0){
        this.options.method = 'PUT';
        this.options.uri = endpoint + 'inventory/company/' + this.company_id + '/' + product.id;
      } else {
        this.options.method = 'POST';
        this.options.uri = endpoint + 'inventory/company/' + this.company_id;
      }

      let data =  await rp(this.options);

      this.Inventory = data.inventory;
      return this.Inventory;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }


  async getTaxProfiles(){
    try{
        this.options.uri = endpoint + 'taxes/company/' + this.company_id;
        let data = await rp(this.options);
        return data.tax_account;
      } catch(err){
        console.log("err", err);
        // return null;
        e.th(err.statusCode,  err.error.message)
      }
  }

  async getContactTransactions(connection, params) {

    let { contact_id, lease_id, property_id, from_date, to_date } = params;

    if(!property_id) e.th('400', 'property_id is required');
    if(!lease_id && !contact_id) e.th('400', 'lease_id or contact_id is required');

    let data;
    let leases = [];
    let tenant_ledger = [];
    let ledger_result = [];

    let property = new Property({id: property_id});
    let currDate = await property.getLocalCurrentDate(connection);

    if(lease_id){
      leases = await models.Accounting.getLeasesByContact(connection, { lease_id });
      ledger_result = await models.Accounting.getLedgerByLease(connection, lease_id, { start_dt: from_date, end_dt: to_date });
    } else {
      leases = await models.Accounting.getLeasesByContact(connection, { contact_id, property_id });
      ledger_result = await models.TransactionHistory.getLedgerByContact(connection, contact_id, property_id, { start_dt: from_date, end_dt: to_date });
    }

    if(lease_id){
      if(ledger_result && ledger_result.length){
        for(let i = 0; i < ledger_result.length; i++) {
          let lr = ledger_result[i];
          let date = moment(lr.date).format('YYYY-MM-DD');
          let entry = {
            amount: lr.amount,
            date: lr.date,
            description: { prefix: lr.description, text: lr.description_text },
            id: lr.id,
            lease_id: lr.lease_id,
            number: lr.number,
            row_guid: lr.row_guid,
            running_balance: lr.running_balance,
            status: lr.status,
            type: lr.type,
            unit_nbr: lr.unit_nbr,
            unit_type: lr.unit_type,
            note: lr.note,
            invoice_id: lr.invoice_id,
            payment_id: lr.payment_id,
            category: moment(currDate) < moment(date) ? 'future' : 'past',
          }
  
          switch(entry.type){
            case "invoice":
            case "void":
            case "write-off":
              let lines = await models.Accounting.getInvoiceLines(connection, entry.type == 'write-off' ? entry.invoice_id : entry.id);
              if(lines && lines.length){
                entry.lines = lines;
              }
              break;
            case "payment":
            case "auction payment":
              let invoices = [];
              
              if(lease_id){
                invoices = await models.Accounting.getPaymentInvoices(connection, entry.id, {invoice_id: entry.invoice_id});
              } else {
                invoices = await models.Accounting.getPaymentInvoices(connection, entry.id);
              }
              
              invoices.map(i => i.description = { prefix: i.description_prefix, text: i.description_text});
              if(invoices && invoices.length){
                entry.invoices = invoices;
              }
              break;
          }
  
          tenant_ledger.push(entry);
  
        }
      }
    } else {
      tenant_ledger = ledger_result;
    }

    data = {
      contact_id,
      leases,
      tenant_ledger
    }

    return data;
  }

  async addTaxProfile(params){

    try{

      this.options.uri = endpoint + 'taxes/company/' + this.company_id;

      this.options.body = {
        taxes: [{
          "tax_profile_id": 	      params.id,
          "account_id":             params.account_id
        }]
      };

      this.options.method = 'POST';
      this.options.uri = endpoint + 'taxes/company/' + this.company_id;

      let data =  await rp(this.options);
      this.Tax = data.taxes;
      return  this.Tax;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async updateTaxProfile(taxProfile) {  
    try{
      this.options.uri = endpoint + 'taxes/company/' + this.company_id + '/' + taxProfile.id;
      this.options.method = 'PUT';

      this.options.body = {
          "tax_profile_id": taxProfile.id,
          "account_id": taxProfile.account_id
      };

      let data =  await rp(this.options);
      this.Tax = data.taxes;
      return  this.Tax;
    } catch(err){
      e.th(err.statusCode,  err.error.message)
    }
  }

  async deleteTaxProfile(taxProfile) {
    try {
      this.options.uri = endpoint + 'taxes/company/' + this.company_id + '/' + taxProfile.id;
      this.options.body = {};
      this.options.method = 'DELETE';
      this.options.resolveWithFullResponse = true

      let data =  await rp(this.options);
      return data;
    } catch(err){
      e.th(err.statusCode,  err.error.message)
    }
  }

  async savePayment(property_id, paymentInvoice, contact, payment, paymentMethod){
    try{
      await this.getCompany();
      await this.checkFacilityExist(property_id);
      if(this.Facility){

        this.options.uri = endpoint + 'facilities/' + property_id + '/payment';
        this.options.method = 'POST';
        let method = paymentMethod.card_type ?
            paymentMethod.card_type.toLowerCase() :
          paymentMethod.type.toLowerCase();

        this.options.body = {
          "payment_id":     payment.id.toString(),
          "invoices":       payment.invoicesPayment.map(i => {
            return {
              invoice_id: i.invoice_id.toString(),
              amount: i.amount
            }
          }),
          "tenant_id":     payment.contact_id.toString(),
          "date":           payment.date,
          "total":          payment.amount,
          "posted_by":      contact.first + ' ' + contact.last,
          "method":         method,
          "name_on_card":   paymentMethod && paymentMethod.name_on_card ?  paymentMethod.name_on_card : payment.ref_name
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async voidPayment(property_id, contact, payment){


    try{
      await this.getCompany();
      await this.checkFacilityExist(property_id);

      if(this.Facility){

        this.options.uri = endpoint + 'facilities/' + payment.property_id + '/payment/' + payment.id;
        this.options.method = 'DELETE';

        this.options.body = {
          "posted_by":  contact.first + ' ' + contact.last
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async refundPayment(property_id, contact, payment){

    try{
      await this.getCompany();
      await this.checkFacilityExist(property_id);

      if(this.Facility){
        this.options.uri = endpoint + 'facilities/' + payment.property_id + 'payment' + payment.id + '/refund';
        console.log("this.options.uri ", this.options.uri )
        this.options.method = 'POST';

        this.options.body = {
          "date":                   payment.Refund.date,
          "refund_amount":          payment.Refund.amount,
          "posted_by":              contact.first + ' ' + contact.last
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async unapplyPayment(property_id, contact, payment, payment_application){

    try{
      await this.getCompany();
      await this.checkFacilityExist(property_id);

      if(this.Facility){
        this.options.uri = endpoint + 'facilities/' + property_id + '/payment/' + payment_application.payment_id + '/unapply';
        console.log("this.options.uri ", this.options.uri);

        this.options.method = 'POST';

        this.options.body = {
          "tenant_id":              payment.contact_id.toString(),
          "date":                   payment_application.date,
          "payment_id":             payment_application.payment_id.toString(),
          "invoice_id":             payment_application.invoice_id.toString(),
          "posted_by":              contact.first + ' ' + contact.last
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }

  }

  async applyPayment(property_id, contact, payment, invoice){

    try{
      await this.getCompany();
      await this.checkFacilityExist(property_id);

      if(this.Facility){
        this.options.uri = endpoint + 'facilities/' + property_id + '/payment';
        this.options.method = 'POST';

        this.options.body = {
          "date":                   invoice.date,
          "paymment_id":            payment.id.toString(),
          "invoice_id":             invoice.id.toString(),
          "tenant_id":              invoice.contact_id ? invoice.contact_id.toString() : null,
          "posted_by":              contact.first + ' ' + contact.last
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }

  }


  async saveInvoice(property_id, contact, invoice){
    let lines = [];
    let invoice_total = 0;
    try{
      if(!invoice.InvoiceLines) e.th(500, "Invoice Lines are required");

      await this.checkFacilityExist(property_id);

      if(this.Facility){

        this.options.uri = endpoint + 'facilities/' + property_id + '/invoices';

        this.options.method = 'POST';

        console.log("invoice", invoice);

        invoice.InvoiceLines.forEach(line => {
          let line_tax = [];
          invoice_total += line.cost;

          if(line.TaxLines.length > 0){
            line.TaxLines.forEach(tax => {
              line_tax.push ({
                amount: Math.round(tax.taxrate * line.subtotal ) / 1e2,
                description: 'Sales Tax'
              })
            });
          }

          lines.push({
            "line_nbr": line.id.toString(),
            "description": line.description,
            "amount": line.subtotal,
            "taxable": !!line.TaxLines.length,
            "product_id": line.product_id.toString(),
            "sales_tax": line_tax,
            //This object is optional values yet not decided
            // "prepaid":{
            //   "months":7,
            //   "monthly":75,
            //   "post_adj_on":15
            // }
          });
        });

        this.options.body = {
          "tenant_id": invoice.contact_id ? invoice.contact_id.toString() : null,
          "invoice_id": invoice.id.toString(),
          "lease_id": invoice.lease_id ? invoice.lease_id.toString() : null,
          "date": invoice.date,
          "total": invoice.total_due, //invoice.total_amt
          "posted_by": contact.first + ' ' + contact.last,
          // "post_as_cash": true,
          "lines": lines
        };
        console.log("Body", JSON.stringify(this.options.body, null, 2));
        let data =  await rp(this.options);
        console.log("data",  data.invoices);
        return data;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  static async findByCompanyId(connection, company_id){
    if(!company_id) e.th(500, 'ID missing');
    return await models.Accounting.findByCompanyId(connection, company_id);
  }

  async save(connection){
    let save = {
      id: this.id,
      company_id: this.company_id,
      account_type: this.account_type,
      account_number: this.account_number,
      name: this.name,
      status: this.status
    };

    let result = await models.Accounting.save(connection, save)

    if (result.insertId) {
      this.id = result.insertId;
    }
  }

  async createProperty(property){
    try{
      await this.getCompany();

      this.options.uri = endpoint + 'facilities/' + property.id;
      console.log("this.options.uri ", this.options.uri )
      this.options.method = 'POST';

      this.options.body = {
        "owner_id":       this.company_id.toString(),
        "description":    property.description,
        "mapped_ledger":  false
      };
      console.log("Body", this.options.body);
      let data =  await rp(this.options);
      console.log("data",  data);
      return data;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async createInventoryInFacility(contact, product){
    try{
      await this.getCompany();

      this.options.uri = endpoint + 'inventory/facility/' + this.Facility.gds_facility_id;
      console.log("this.options.uri ", this.options.uri )
      this.options.method = 'POST';

      this.options.body = {
        "inventory" : [
          {
            "product_id":         product.id.toString(),
            "prod_or_serv":       1,
            "initial_quantity":   product.qty,
            "initial_cost":       product.cost,
            "description":        product.description,
            "SKU":                "lock-bigger", //product.sku,
            "stockable":          true, //product.has_inventory,
            "taxable":            product.taxable ? true : false,
            "acct_type":          "Goods",
            "sub_type":           "Locks",
            "posted_by":          contact.first + ' ' + contact.last,
            "expense_account":    product.qb_income_account,
            "income_account":     product.income_subtype,
            "liability_account":  product.liability_subtype,
            "concession_account": product.concession_subtype
          }
        ]
      };
      console.log("Body", this.options.body);
      let data =  await rp(this.options);
      console.log("data",  data.inventory);
      this.Inventory = data.inventory
      return;
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async voidInvoice(property_id, contact, invoice){
    try{
      if(!invoice.InvoiceLines) e.th(500, "Invoice Lines are required");

      await this.getCompany();
      await this.checkFacilityExist(property_id);

      if(this.Facility){

        this.options.uri = endpoint + 'facilities/' + property_id + '/invoices/' + invoice.id;
        console.log("this.options.uri ", this.options.uri )
        this.options.method = 'DELETE';

        this.options.body = {
          "lease_id":  invoice.lease_id   ? invoice.lease_id.toString() : null,
          "tenant_id": invoice.contact_id ? invoice.contact_id.toString() : null,
          "posted_by": contact.first + ' ' + contact.last
        };
        console.log("Body", this.options.body);
        let data =  await rp(this.options);
        console.log("data",  data.invoices);
        return data.invoices;
      }
    } catch(err){
      console.log("err", err);
      e.th(err.statusCode,  err.error.message)
    }
  }

  async findSettings(connection, payload) {
    this.Settings = await models.Accounting.findSettings(connection, { filters: {
      ...payload
    }});

    return this.Settings;
  }

  async saveToggleSettings(connection, payload) {
    const { toggleAccounting } = ENUMS.SETTINGS.ACCOUNTING;

    await models.Accounting.bulkSaveSettings(connection, {
      data: [{
        company_id: this.company_id,
        name: toggleAccounting.name,
        value: 0
      }]
    });
  }

  async setup(connection, params) {
    const accountingTemplate = new AccountingTemplate({ 
      name: 'Default Template',
      company_id: this.company_id,
      is_default: 1,
      created_by: params.created_by,
      modified_by: params.created_by
    });
    await accountingTemplate.create(connection);
    await this.saveToggleSettings(connection);
    await models.Accounting.prePopulateAccounts(connection, { 
      company_id: this.company_id,
      ...params 
    });
    await models.Accounting.addDefaultGroupAccounts(connection, this.company_id, params.created_by);
    await models.Accounting.addDefaultAccounts(connection, this.company_id, params.created_by);
  }

  static findExportHistory(connection,company_id, properties) {
    return models.Accounting.findExportHistory(connection,company_id,properties);
  }

  static async findAccountingSetup(connection, payload) {
		let accountingSetup = await models.Accounting.findAccountingSetup(connection, { ...payload });
    return accountingSetup;
	}

  static async findDefaultSubTypes(connection) {
    return await models.Accounting.findDefaultSubTypes(connection);
  }

  async findGLExports(connection, conditions){
    if(!conditions.book_id) {
      e.th(500, 'BookId is required to find gl_exports');
      /*let setup = await models.Accounting.findAccountingSetupByCompanyId(connection,this.company_id);
      if(setup && setup.length){
        conditions.book_id = setup[0].book_id;
      }*/
    }

    let accounting_settings = await this.getCompanySettings(connection);
    let export_ref_transaction = accounting_settings['yardiExportRefColumn'] === ENUMS.SETTINGS.ACCOUNTING.yardiExportRefColumn.options.transaction;
  
    let exports = await models.Accounting.findGLExports(connection,{
      ...conditions,
      company_id: this.company_id,
      export_ref_transaction
    });
    return exports.map(ex => {
      return {
        ...ex,
        date: moment(ex.date,'MM-DD-YYYY').utcOffset(ex.property_utcoffset || "00:00",true).toISOString(true),
        post_month: moment(ex.post_month,'MM-DD-YYYY').utcOffset(ex.property_utcoffset || "00:00",true).toISOString(true)
      }
    })
  }

  async isSetup(connection) {
    const template = new AccountingTemplate();
    await template.find(connection, {
      filters: {
        company_id: this.company_id,
        is_default: 1
      }
    });

    if(template?.id) {
      return true;
    }

    return false;
  }

  static async getPropertiesAndBooks(connection, payload) {
    const {filteredProperties, company_id, base_properties = []} = payload;

    return await models.Accounting.getPropertiesOfCompany(connection, {company_id, base_properties, filteredProperties});
  }
}

module.exports = Accounting;

const GL_Export   = require('../classes/gl_export.js');
const AccountingTemplate = require('./accounting/accounting_template');
// var AccountingEvent  = require('../classes/accounting/accounting_event/base_export.js');
// const Payment = require('../classes/payment.js');
// const Invoice = require('../classes/invoice.js');
var Property			= require('./property.js');
const utils = require('../modules/utils');
const Settings = require('./settings');