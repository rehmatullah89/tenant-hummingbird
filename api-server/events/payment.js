'use strict';
let models = require(__dirname + '/../models');
let db = require(__dirname + '/../modules/db_handler.js');
const Accounting  = require('../classes/accounting.js');

const Payment = {
  /*async updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId) {
    await models.Payment.updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId);
  },*/

  async paymentProcessed(payload) {
    let connection = await db.getConnectionByType("write", null, payload.cid);

    try {
      // await Payment.updateInvoiceLineAllocation(connection, payload.invoicesPaymentsBreakdownId);
      
      const accounting = new Accounting();
      await connection.beginTransactionAsync();
      const accountingEventData = await accounting.computeAccountingData(connection, payload);
      if(accountingEventData) await accounting.generateExport(connection, accountingEventData);
      await connection.commitAsync();
      
    } catch (err) {
      console.log('Payment Process error: ', err);
      await connection.rollbackAsync();

      payload.res.fns.addStep('processPaymentEventError');
      utils.sendEventLogs({
        eventName: ENUMS.LOGGING.ACCOUNTING,
        data: payload,
        error: err 
      });
    } finally {
      await db.closeConnection(connection);
    }
  }
};

module.exports = Payment

const utils    = require(__dirname + '/../modules/utils.js');
const ENUMS = require(__dirname + '/../modules/enums.js');