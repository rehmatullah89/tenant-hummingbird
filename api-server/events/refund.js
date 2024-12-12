'use strict';

const db = require('../modules/db_handler.js');

const RefundEvent = {
  async refundProcessed(payload) {
    const connection = await db.getConnectionByType("read", null, payload.cid);

    try {
        const { refund_, Payment } = payload;
        const refund = new Refund({
            ...refund_,
            Payment
        });
        await refund.processReversal(connection, { cid: payload.cid });
    } catch (err) {
      console.log('Refund Document error: ', err);
    } finally {
      await db.closeConnection(connection);
    }
  }
};

module.exports = RefundEvent;

const Refund = require('../classes/refund');