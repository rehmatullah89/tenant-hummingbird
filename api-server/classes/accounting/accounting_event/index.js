'use strict';

module.exports = {
    generating_invoice: require('./generating_invoice.js'),
    credits_added: require('./credits_added.js'),
    refunds: require('./refunds'),
    credits_payment: require('./credits_payment'),
    posting_payment: require('./posting_payment'),
    excess_payment: require('./excess_payment'),
    voiding_invoice: require('./voiding_invoice'),
    write_off: require('./write_off'),
    excess_credit_payment: require('./excess_credit_payment.js'),
    inter_property_payment: require('./inter_property_payment.js')
};