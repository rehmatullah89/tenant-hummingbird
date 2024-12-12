'use strict';


var db = require(__dirname + '/../modules/db_handler.js');
// var AccountingService  = require('../classes/accounting.js');
var Property  = require('../classes/property.js');
var UnitService  = require('../classes/unit.js');
var Invoice  = require('../classes/invoice.js');
var PaymentService  = require('../classes/payment.js')
var utils    = require(__dirname + '/../modules/utils.js');
var ENUMS = require(__dirname + '/../modules/enums.js');
var models  = require('../models/index.js');
const { Payment } = require('../models/index.js');
let URL = 'https://api.storage/v3/applications/';
const Accounting  = require('../classes/accounting.js');

// TODO move to ENV VARS
let ACCOUNTING_APP_ID = 'app60cb0c0c7f7745bd9ff19c50b2674138';
var _this = this;
// prod appf846722d35414fd8b470253c72ab4c49
var self = module.exports = {

  /*
   * Post Payment info to ledger
   * Expects: payment, company
   *
   */

  async postPayment(payload) {

    let connection = await db.getConnectionByType('read', null, payload.cid)

    try {

      let property = {};

      if (!payload.invoice.property_id) {
        property = await models.Property.findByLeaseId(connection, payload.invoice.lease_id);
      }else {
        property.id = payload.invoice.property_id;
      }

      let AppliedPayments = await models.Payment.findPaymentApplications(connection, payload.payment.id);

      if(!payload.paymentMethod) {
        payload.paymentMethod = await models.Payment.findPaymentMethodById(connection, payload.payment.payment_method_id);
      }

      let account = new AccountingService({company_id: payload.company.id});
      await account.savePayment(property.id, AppliedPayments[0], payload.contact, payload.payment, payload.paymentMethod)


    } catch(err) {
      console.log(err);
    }

    await db.closeConnection(connection);

  },

  /*
   * Post Payment info to ledger
   * Expects: payment, company
   *
   */

  async postInvoice(payload) {
    let connection = await db.getConnectionByType('read', null, payload.cid)

    try {

      let property = {};

      if (!payload.invoice.property_id) {
        property = await models.Property.findByLeaseId(connection, payload.invoice.lease_id);
      }else {
        property.id = payload.invoice.property_id;
      }

      let account = new AccountingService({company_id: payload.company.id});
      await account.getCompany();
      await account.saveInvoice(property.id, payload.contact, payload.invoice);

    } catch(err) {
      console.log(err);
    }

    await db.closeConnection(connection);

  },


  /*
   * Create Facility in ledger
   * Expects: property, company
   *
   */

  async createProperty(payload) {
    // let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      let account = new AccountingService({company_id: payload.company.id});
      await account.createProperty(payload.property);

    } catch(err) {
      console.log(err);
    }

    // await db.closeConnection(connection);
  },

  async createInventory(payload) {
    //let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      let account = new AccountingService({company_id: payload.company.id});
      await account.getCompany();
      await account.saveInventory(payload.product, payload.contact);

    } catch(err) {
      console.log(err);
    }

    // await db.closeConnection(connection);
  },

  async saveTaxProfile(payload){
    let account = new AccountingService({company_id: payload.company.id});
    await account.getCompany();
    await account.saveTaxProfile(payload.taxProfile);
  },

  async voidInvoice(payload) {
    let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      let property = {};

      if (!payload.invoice.property_id) {
        property = await models.Property.findByLeaseId(connection, payload.invoice.lease_id);
      }else {
        property.id = payload.invoice.property_id;
      }

      let account = new AccountingService({company_id: payload.company.id});
      await account.voidInvoice(property.id, payload.contact, payload.invoice);

    } catch(err) {
      console.log(err);
    }

    await db.closeConnection(connection);
  },

  async voidPayment(payload) {
    // let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      let account = new AccountingService({company_id: payload.company.id});
      await account.voidPayment(payload.payment.property_id, payload.contact, payload.payment);

    } catch(err) {
      console.log(err);
    }

    // await db.closeConnection(connection);
  },

  async refundPayment(payload) {
    let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      if(!payload.paymentMethod) {
        payload.paymentMethod = await models.Payment.findPaymentMethodById(connection, payload.payment.payment_method_id);
      }

      let account = new AccountingService({company_id: payload.company.id});
      await account.refundPayment(payload.payment.property_id, payload.contact, payload.payment);

    } catch(err) {
      console.log(err);
    }

    await db.closeConnection( connection);
  },

  async unapplyPayment(payload) {
    // let connection = await db.getConnectionByType('read', null, payload.cid);

    try {

      let account = new AccountingService({company_id: payload.company.id});

      await account.unapplyPayment(payload.payment.property_id, payload.contact, payload.payment, payload.payment_application);

    } catch(err) {
      console.log(err);
    }

    // await db.closeConnection(connection);
  },

  async applyPayment(payload) {
    // let connection = await db.getConnectionByTyp('read', null, params.cid);

    try {

      let account = new AccountingService({company_id: payload.company.id});
      console.log("applyPayment payload", payload);
      await account.applyPayment(payload.payment.property_id, payload.contact, payload.payment, payload.invoice);

    } catch(err) {
      console.log(err);
    }

    // await db.closeConnection( connection);
  },

  async paymentCreatedWithInvoice (payload) {

    try{

      if (payload.invoice){

        await self.postInvoice(payload);

      } else if (payload.invoices.length > 0 && payload.invoices) {

        for (var v in payload.invoices) {
          payload.invoice = payload.invoices[v];
          await self.postInvoice(payload);
        }

      }

      await self.postPayment(payload);
    } catch(err) {
      console.log(err);
    }


  },

  async generateExports(payload) {
    let connection = await db.getConnectionByType('write', null, payload.cid);
    try {
      await connection.beginTransactionAsync();
      let company = await db.getMappingByCompanyId(payload.cid);
      payload.company_id = company.hb_company_id;
  
      const accounting = new Accounting();
      await accounting.generateExport(connection, payload);
      await connection.commitAsync();

    } catch(err) {
      console.log('Events: Generate exports err ', err);
      await connection.rollbackAsync();

      payload.res.fns.addStep('accountingGenerateExportsEventError');
      utils.sendEventLogs({
        eventName: ENUMS.LOGGING.ACCOUNTING,
        data: payload,
        error: err 
      });
    } finally {
      await db.closeConnection(connection);
    }
  }
}
