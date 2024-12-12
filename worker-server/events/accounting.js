'use strict';

var self = module.exports = {
  async publishTransactionUpdated(payload) {
    try {
      let account = new Accounting();
      await account.syncTransactionsLedger(payload.property_id); 
    } catch (err) {
      console.log('Publishing Information Error ', err);
    }
  },

  async generateAccountingExport(connection, payload) {
    try {
      let accountingPayload = { ...payload };
      const accounting = new Accounting();
      await accounting.generateExport(connection, accountingPayload);
    } catch (err) {
      console.log("Accounting Error:", err);
      utils.sendLogs({
        event_name: payload.event_name || ENUMS.LOGGING.ACCOUNTING,
        logs: {
          payload: payload,
          error: err?.stack || err?.msg || err
        }
      })
    }
  }
}

const utils = require('../modules/utils.js');
const ENUMS = require('../modules/enums');
const Accounting = require('../classes/accounting.js');