'use strict';
let models = require(__dirname + '/../models');
const ENUMS = require(__dirname + '/../modules/enums.js');

const Payment = {
  async updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId) {
    await models.Payment.updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId);
  },

  async generateAccountingExport(connection, payload) {  
    try {
      const accounting = new Accounting();
      let accountingEventData = await accounting.computeAccountingData(connection, payload);
      
      // For logging purposes
      if(payload.export_type) {
        accountingEventData.export_type = payload.export_type;
        accountingEventData.job_data = payload.job_data;
        accountingEventData.event_name = payload.event_name;
      }

      await AccountingEvent.generateAccountingExport(connection, accountingEventData);
    } catch (err) {
      console.log("Payment Error:", err);
      utils.sendLogs({
        event_name: payload.event_name || ENUMS.LOGGING.ACCOUNTING,
        logs: {
          payload: payload,
          error: err?.stack || err?.msg || err
        }
      })
    }

  },

  /**
     * This function is used to update messagebus about payment creation
     * @param payload - The payload of the event payment_created.
     */
  async newPayment(payload) {
    try {
      await raisePaymentEvent(payload)
    } catch (error) {
      console.log('Payment event error: ', error);
    }

  }

};

module.exports = Payment

const utils = require('../modules/utils.js');
const Accounting  = require('../classes/accounting.js');
const AccountingEvent = require('./accounting');
const { raisePaymentEvent } = require('../modules/messagebus_events');