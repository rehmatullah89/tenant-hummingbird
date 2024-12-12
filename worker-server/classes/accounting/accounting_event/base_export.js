"use strict";
var moment              = require('moment');
const _ = require('lodash');
var e                   = require(__dirname + '/../../../modules/error_handler.js');
var { TAX_TYPE }        = require(__dirname + '/../utils/enums.js');
var ENUMS               = require(__dirname + '/../../../modules/enums.js');
const { v4: uuidv4 }    = require('uuid');

class BaseExport {

  constructor(data) {
    data = data || {};
    this.company_id = data.company_id;
    this.property_id = data.property_id;
    this.credit_debit_account = data.credit_debit_account;
    this.Event = data.Event || {};
    this.account = data.account;
    this.uuid = data.uuid;
    this.rent_account = {};
    this.export_date = data.export_date;
    this.object_id_column = null;
    this.default_accounts = data.default_accounts;
    this.Property = data.Property;
  }

  static async InitAccountingExport(connection, data){
 
    console.log("Initiating Accounting Export");

    let { event_id } = data;
    if(!event_id) e.th(500, "Cannot init accounting export, missing event_id");
    
    let result = await models.GL_Export.getEvents(connection, { event_id });
    if(result && result.length){
      data.Event = result[0];
    }
    if(!data.Event) e.th(500, "GL event Not Found");

      const property = new Property({ id: data.property_id });
      await property.findAccountingSetup(connection);

      if(!data.Property) {
        const property = new Property({ id: data.property_id });
        await property.findAccountingSetup(connection);  
        data.Property = property;
      }
  
      console.log('Property data: ', data.Property);
      
      let creditDebitAccounts = await GlAccount.findExportAccounts(connection, {
        property: data.Property,
        event_id: event_id
      }); 

      if(!creditDebitAccounts?.length) {
        console.log('Credit debit accounts not found');
        return;
      }

      data.credit_debit_account = creditDebitAccounts;
      
      let acc_event = {};
      let eventClass = Object.values(events).find(e => e.type == event_id);

      if(eventClass){
        data.uuid = uuidv4();

        let off_set = '+00:00';
        if(!data.date) {
          off_set = await property.getUtcOffset(connection);  
        }

        data.export_date = data.date || moment().utcOffset(parseInt(off_set)).format('YYYY-MM-DD');
        data.default_accounts = await GlAccount.findDefaultAccounts(connection, data.company_id);
        acc_event = new eventClass(data);
      }
      return acc_event;
	}

  async findTemplateDefaultAccounts(connection) {
    if(this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts == null) {
      await this.Property.PropertyAccountingTemplate.findAccountingDefaultSubtypes(connection, { params: {
        fetch_accounts: true
      }});
    }

    return this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts;
  }

  async computeInverseExportsIfApplicable(connection, payload) {
    const { export_data, invoice_id } = payload;
    const invertedTypes = {
      'credit': 'debit',
      'debit': 'credit'
    }

    const invoice = new Invoice({ id: invoice_id });
    const isInterPropertyProductInvoice = await invoice.isInterPropertyProductInvoice(connection)

    if(isInterPropertyProductInvoice) {
      const invertedExports = _.cloneDeep(export_data);
      for(let i = 0; i < invertedExports.length; i++) {
        invertedExports[i].credit_debit_type = invertedTypes[invertedExports[i].credit_debit_type];
        invertedExports[i].notes = ENUMS.ACCOUNTING.NOTES.INVERTED_INTER_PROPERTY_INVOICE;
      }

      return invertedExports;
    }

    return null;
  }

  async generate(connection){
    console.log('Base export generate');

    let export_data = [];

    let lines_allocation = await models.Invoice.findInvoiceBreakDownById(connection, this.break_down_id);

    if (lines_allocation.length === 0) {
      e.th(500, `Event_id: ${this.Event.id} Event_Name: ${this.Event.name} "Payment breakdown has missing reference in invoice_lines_allocation table for breakdown_id: ${this.break_down_id}"`);
    }

    let paymentObj = new Payment();
    let invoice_payment_breakdown = await paymentObj.findInvoicePaymentBreakdownById(connection, [this.break_down_id]);
    if (invoice_payment_breakdown.length === 0) {
      e.th(500, `Event_id: ${this.Event.id} Event_Name: ${this.Event.name} "Payment breakdown has missing reference in invoice_payment_breakdown table for breakdown_id: ${this.break_down_id}"`);
    }

    let payment = invoice_payment_breakdown[0];
    if (payment.amount < 0) {
      this.isAdjustment = true ;
      this.adjustment_types = {'debit': 'credit', 'credit': 'debit'};
      payment.amount = Math.abs(payment.amount);
    }
    
    for(let i=0; i<this.credit_debit_account.length; i++){

        if(!this.credit_debit_account[i].is_group){
            export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], payment, lines_allocation));
        }
        else{
            if (this.credit_debit_account[i].account_code === 'invoice') {
              export_data = export_data.concat(await this.getLinesExportData(connection, lines_allocation, this.credit_debit_account[i]));
            }
            else{
              export_data = export_data.concat(await this.getPaymentMethodExportData(connection, this.credit_debit_account[i], payment));
            }
        }
    }
    
    const invertedPaymentExports = await this.computeInverseExportsIfApplicable(connection, {
      export_data, invoice_id: payment.invoice_id
    });

    if(invertedPaymentExports?.length > 0) {
      export_data = [...export_data, ...invertedPaymentExports];
    }

    return export_data;
}

  getSingleAccountExport(credit_debit_account, payment, lines_allocation = []){
      let account_id = credit_debit_account.account_id || this.default_accounts[this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type].id;
      let total_amount = payment.amount;
      let export_data = [];

      if (credit_debit_account.over_ride_accounts.length > 0) {
        
        for(let i=0 ; i < lines_allocation.length; i++){
          let override_account_id = this.getOverRideAccounts(credit_debit_account, lines_allocation[i]);

          if(override_account_id) {
            total_amount -= Math.abs(lines_allocation[i].amount);
            export_data.push({
              property_id: this.property_id,
              company_id: this.company_id,
              amount: Math.abs(lines_allocation[i].amount),
              credit_debit_type: this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type,
              book_id: credit_debit_account.book_id,
              company_gl_account_id: override_account_id,
              gl_event_company_id: credit_debit_account.event_company_id,
              transaction_id: this.uuid,
              [this.object_id_column]: Object.values(this.required_params)[0],
              object_id: Object.values(this.required_params)[0],
              export_date: this.export_date,
              notes: this.isAdjustment? "Unapplying payment event": null
            });
          }
        }
      }

      if(total_amount > 0){
        export_data.push({
          property_id: this.property_id,
          company_id: this.company_id,
          amount: total_amount,
          credit_debit_type: this.isAdjustment?this.adjustment_types[credit_debit_account.type]: credit_debit_account.type,
          book_id: credit_debit_account.book_id,
          company_gl_account_id: account_id,
          gl_event_company_id: credit_debit_account.event_company_id,
          transaction_id: this.uuid,
          object_id: Object.values(this.required_params)[0],
          [this.object_id_column]: Object.values(this.required_params)[0],
          export_date: this.export_date,
          notes: this.isAdjustment? "Unapplying payment event": null
        });
      }
      
      return export_data;
  }

  async getLinesExportData(connection, lines_allocation, credit_debit_account){
      
    let export_data = [];

    await this.findTemplateDefaultAccounts(connection);

    for(let i=0 ; i< lines_allocation.length; i++){

      let account_id;

      if(lines_allocation[i].line_type === 'line'){        
        const productDefaultSubType = new ProductDefaultSubtype({
          Product: { slug: lines_allocation[i].slug, default_type: lines_allocation[i].default_type },
          Unit: { type: lines_allocation[i].unit_type }
        });
        productDefaultSubType.getKey();

        const specificAccount = this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts.find(p => p.gl_subtype_key == productDefaultSubType.key);
        account_id = specificAccount ? specificAccount.gl_account_id : null;

        if(!account_id){
          account_id = lines_allocation[i].income_account_id ? lines_allocation[i].income_account_id : this.default_accounts[credit_debit_account.type].id;
        }
        
        if (credit_debit_account.over_ride_accounts.length > 0) {
          let over_ride_account_id = this.getOverRideAccounts(credit_debit_account, lines_allocation[i]);
          account_id = over_ride_account_id ? over_ride_account_id : account_id;
        }

      } else if (lines_allocation[i].line_type === 'tax') {

        if(!lines_allocation[i].default_type){
          const glDefaultSubType = new GlDefaultSubtype({
            key: GL_SUB_TYPES.SALES_TAX
          });
          glDefaultSubType.getKey();
    
          const tax_account = this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts.find(p => p.gl_subtype_key == glDefaultSubType.key);
          account_id = tax_account?.gl_account_id;
        } else {
          let type = lines_allocation[i].default_type === 'rent' ? lines_allocation[i].unit_type: TAX_TYPE[lines_allocation[i].default_type.toUpperCase()];
          let tax_account = await GlAccount.findTaxAccount(connection, lines_allocation[i].property_id, type);
          account_id = tax_account.length && tax_account[0].account_id > 0 ? tax_account[0].account_id: this.default_accounts[this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type].id ;
        }        
      }

      if(!account_id){
        account_id = this.default_accounts[this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type].id;
      }

      let amount = Math.abs(lines_allocation[i].amount);
      export_data.push({
        property_id: this.property_id,
        company_id: this.company_id,
        amount: amount,
        credit_debit_type: this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type,
        book_id: credit_debit_account.book_id,
        company_gl_account_id: account_id,
        gl_event_company_id: credit_debit_account.event_company_id,
        transaction_id: this.uuid,
        object_id: Object.values(this.required_params)[0],
        [this.object_id_column]: Object.values(this.required_params)[0],
        export_date: this.export_date,
        notes: this.isAdjustment? "Unapplying payment event": null
      });
    }

    return export_data;
  }

  async getPaymentMethodExportData(connection, credit_debit_account, payment){
    await this.findTemplateDefaultAccounts(connection);

    const export_data = [];

    const pay = new Payment({ id: payment.payment_id || payment.id });
    await pay.find(connection);

    const paymentDefaultSubType = new PaymentDefaultSubtype({
      Payment: pay
    });
    paymentDefaultSubType.getKey();

    const specificAccount = this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts.find(pay => pay.gl_subtype_key == paymentDefaultSubType.key);
    let payment_method_account = specificAccount?.gl_account_id ? [{ id: specificAccount.gl_account_id }] : null;

    //Get default GL account for payment
    if(!payment_method_account || !payment_method_account.length){
      let pay = new Payment({ id: payment.payment_id });
      await pay.find(connection);
      switch (pay.method) {
        case 'card':
          payment_method_account = await GlAccount.findAccountBySubType(connection, this.company_id, ENUMS.ACCOUNTING.GL_SUBTYPES.DEFAULT_CARD_PAYMENT);
          break;
      }
    }

    let account_id = payment_method_account?.length > 0 ? payment_method_account[0].id: this.default_accounts[this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type].id;    
    export_data.push({
      property_id: this.property_id,
      company_id: this.company_id,
      amount: payment.amount,
      credit_debit_type: this.isAdjustment ? this.adjustment_types[credit_debit_account.type] :credit_debit_account.type,
      book_id: credit_debit_account.book_id,
      company_gl_account_id: account_id,
      gl_event_company_id: credit_debit_account.event_company_id,
      transaction_id: this.uuid,
      object_id: Object.values(this.required_params)[0],
      [this.object_id_column]: Object.values(this.required_params)[0],
      export_date: this.export_date,
      notes: this.isAdjustment? "Unapplying payment event": null
    });

    return export_data;
  }

  getOverRideAccounts(credit_debit_account, lines_allocation){
    let account_id;
    let product_id_account;
    let product_type_account;

    if(lines_allocation.line_type === 'tax' || credit_debit_account.over_ride_accounts.length === 0){
      return null;
    }

    product_id_account = credit_debit_account.over_ride_accounts.find(x => lines_allocation.product_id === x.product_id);
    product_type_account = credit_debit_account.over_ride_accounts.find(x => !x.product_id && lines_allocation.default_type === x.product_type);  
    

    if (product_id_account) {
      account_id = product_id_account.override_gl_account_id;
    }
    else if(product_type_account){
      account_id = product_type_account.override_gl_account_id;
    }

    return account_id;
  }

  setInvoiceLinesData(invoice, exclude_discount = false, invoice_id){
    let InvoiceLines = invoice.InvoiceLines;
    let export_lines = [];

    for(let i=0; i< InvoiceLines.length; i++){
        InvoiceLines[i].default_type = InvoiceLines[i].Product.default_type;
        InvoiceLines[i].income_account_id = InvoiceLines[i].Product.property_income_account_id || InvoiceLines[i].Product.income_account_id;
        InvoiceLines[i].amount = InvoiceLines[i].cost * InvoiceLines[i].qty;
        InvoiceLines[i].slug = InvoiceLines[i].Product.slug;
        if(exclude_discount) InvoiceLines[i].amount -= InvoiceLines[i].total_discounts;
        InvoiceLines[i].line_type = 'line';
        InvoiceLines[i].unit_type = invoice?.Unit.type;
        export_lines.push(InvoiceLines[i]);

        if (InvoiceLines[i].total_tax > 0) {

            let line = {
                default_type: InvoiceLines[i].default_type,
                amount: InvoiceLines[i].total_tax,
                product_id: InvoiceLines[i].product_id,
                line_type: 'tax',
                property_id: invoice.property_id,
                unit_type: invoice?.Unit.type
            }
            
            export_lines.push(line);
        }
    }

    return export_lines;
}

async getDiscountExport(connection, invoice, credit_debit_type){

  if (invoice.total_discounts === 0 ){
    return [];
  }

  let exports = [];
  await this.findTemplateDefaultAccounts(connection);
  let rentAccountId;

  for(let i=0; i< this.credit_debit_account.length; i++){

    if (this.credit_debit_account[i].type === credit_debit_type) {
      const glDefaultSubType = new GlDefaultSubtype({
        key: GL_SUB_TYPES.CONCESSIONS
      });
      glDefaultSubType.getKey();
    
      const specificAccount = this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts.find(p => p.gl_subtype_key == glDefaultSubType.key);
      const discount_account = specificAccount?.gl_account_id ? [{ id: specificAccount.gl_account_id }] : null;

      if(!discount_account?.length) {
        const productDefaultSubType = new ProductDefaultSubtype({
          Product: { default_type: ENUMS.PRODUCT_DEFAULT_TYPES.RENT },
          Unit: { type: invoice.Unit?.type }
        });
        productDefaultSubType.getKey();

        const specificAccount = this.Property.PropertyAccountingTemplate.DefaultSubTypeAccounts.find(p => p.gl_subtype_key == productDefaultSubType.key);
        rentAccountId = specificAccount ? specificAccount?.gl_account_id : null;
      }

      let account_id = discount_account?.length > 0 ? discount_account[0].id : rentAccountId ? rentAccountId: this.default_accounts[credit_debit_type].id;
      
      exports.push({
        property_id: this.property_id,
        company_id: this.company_id,
        amount: invoice.total_discounts,
        credit_debit_type: this.credit_debit_account[i].type,
        book_id: this.credit_debit_account[i].book_id,
        company_gl_account_id: account_id,
        gl_event_company_id: this.credit_debit_account[i].event_company_id,
        transaction_id: this.uuid,
        [this.object_id_column]: Object.values(this.required_params)[0],
        object_id: Object.values(this.required_params)[0],
        export_date: this.export_date,
        notes: null
      });
    }
  }
  return exports;
  
}

async getGLExportEvents(connection, payload = {}) {
  const { object_id, gl_event_id, gl_event_company_id } = payload; 

  let events = await models.GL_Export.validateIfExist(connection, { 
    company_id: this.company_id,
    object_id: object_id,
    object_id_column: this.object_id_column,
    gl_event_id: gl_event_id,
    gl_event_company_id: gl_event_company_id
  });
  
  return events;
}

async validateIfObjectIdExist(connection) {
  let events = await models.GL_Export.validateIfExist(connection, { 
    company_id: this.company_id,
    object_id_column: this.object_id_column,
    object_id: Object.values(this.required_params)[0],
    gl_event_company_id: this.credit_debit_account[0].event_company_id
  });

  if(events.length) {
    console.log(`An entry already exists in gl_exports with object_id: ${Object.values(this.required_params)[0]}`);
    e.th(500, `An entry already exists in gl_exports with object_id: ${Object.values(this.required_params)[0]}`);
  }
}

validate(){
  if(!this.preValidate()) return;

  if(Object.values(this.required_params) === null || Object.values(this.required_params) === undefined){
    e.th(500, `${Object.keys(this.required_params)} required to save gl export data for ${this.Event.name}`);
  }

  for(let i=0; i<this.credit_debit_account.length; i++){
    let is_group = this.credit_debit_account[i].is_group;
    let account_code = this.credit_debit_account[i].account_code;
    let credit_debit_type = this.credit_debit_account[i].type;

    switch(this.Event.id){
      case EVENTS.GENERATING_INVOICE:
      case EVENTS.VOIDING_INVOICE:
        if (is_group && account_code !== 'invoice') {
          e.th(500, `Payment group can't be attached to Event ID: ${this.Event.name} where Object ID: ${this.invoice_id}`);
        }
        break;
      case EVENTS.WRITE_OFF:
        if(is_group && account_code !== 'invoice') {
          e.th(500, `Payment group can't be attached to write off where Object ID: ${this.data && this.data.invoice_breakdown_id}`);
        }
        break;
      case EVENTS.ALLOWANCE:
        if (is_group){
          e.th(500,`Can not Credit or Debit in Group account for applying Credits where Object ID: ${this.payment_id}`)
        }
        break;
      case EVENTS.INTER_PROPERTY_PAYMENT:
        if ((is_group && account_code == 'invoice') || this.credit_debit_account[i].over_ride_accounts.length > 0) {
          e.th(500, `Cannot attach invoice group account or override any account in case of INTER_PROPERTY_PAYMENT. Found it for payment_id: ${this.payment_id}`);
        }
      case EVENTS.POSTING_PAYMENT:
      case EVENTS.PAYMENT_WITH_CREDITS:
      case EVENTS.POSTING_EXCESS_PAYMENT:
      case EVENTS.POSTING_EXCESS_CREDIT_PAYMENT:
      case EVENTS.REFUNDS:
        if (is_group && account_code !== 'invoice' && this.credit_debit_account[i].over_ride_accounts.length > 0) {
          e.th(500,`Group Account for Payments can not be overriden - overriden account found for ${this.Event.name} and Object ID: ${this.break_down_id}`)
        }
      break;
    }
  }

}

preValidate() {
  let book_types = Object.keys(ENUMS.BOOK_TYPES);
  let book_id = this.Property.PropertyAccountingTemplate.AccountingSetup.book_id;
  if(!this.validateEvent(book_id, this.Event, book_types)) return false;
  //else if(!this.validateAccounts(book_id, this.Event, book_types)) e.th(500, `No account details found for event id ${this.Event.id}`);
  return true; 
}

validateEvent(book_id, gl_event, book_types) {
  if(book_id === ENUMS.ACCOUNTING_TYPE.DOUBLE_BOOK) return book_types.filter(type => gl_event[type.toLowerCase()] === 1).length ? true : false;
  return gl_event[book_types[book_id].toLowerCase()];
}

validateAccounts(book_id, gl_event, book_types) {
  let accountsLength = this.credit_debit_account && this.credit_debit_account.length
  if(book_id === ENUMS.ACCOUNTING_TYPE.DOUBLE_BOOK) {
    switch (book_types.filter(type => gl_event[type.toLowerCase()] === 1).length) {
      case 1:
        return accountsLength === 2;
      case 2:
        return accountsLength === 4;
    }
  }
  else if(accountsLength < 2) return false;
  return true
}

}

module.exports = BaseExport;

var events              = require(__dirname + '/../accounting_event');
var Payment             = require('../../../classes/payment.js');
var { EVENTS, GL_SUB_TYPES }          = require(__dirname + '/../utils/enums.js');
const { AUCTION_PRODUCTS } =  require(__dirname + '/../../../modules/enums.js');
var models              = require(__dirname + '/../../../models');
var GlAccount           = require('../../../classes/gl_account.js');
var Property            = require('../../../classes/property.js')
const Invoice = require('../../invoice');
const ProductDefaultSubtype = require('../gl_default_subtypes/product_default_subtype');
const PaymentDefaultSubtype = require('../gl_default_subtypes/payment_default_subtype');
const GlDefaultSubtype = require('../gl_default_subtypes/gl_default_subtype');