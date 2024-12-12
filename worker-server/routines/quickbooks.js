var Invoice = require(__dirname + '/../classes/invoice.js');
var Payment = require(__dirname + '/../classes/payment.js');
var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var models  = require(__dirname + '/../models');
var Promise = require('bluebird');

var QbObj = {
    sync_invoice:function (data, pool){
        var connection;
        var company_id = data.company_id;
        var invoice_id = data.id;
        var qb;
        var qbInvoice = new Invoice({
            id: invoice_id
        });
        return pool.getConnectionAsync().then(conn => {
            connection = conn;
            qb = new QuickBooks(company_id);
            return qb.init(connection);
        }).then(() => {
            if(!qb.isConfigured) throw new Error("QuickBooks is not configured");
            return qbInvoice.find(connection)
                .then(qb.saveInvoice(connection, qbInvoice, 'lease'))
        })
    },
    sync_payment:function (data, pool){
        var connection;
        var company_id = data.company_id;
        var payment_id = data.id;
        var qb;
        var payment;
        var invoice;
        return pool.getConnectionAsync()
            .then(conn => {
                connection = conn;
                qb = new QuickBooks(company_id);
                return qb.init(connection);
            })
            .then(() => {
                if(!qb.isConfigured) throw new Error("QuickBooks is not configured");
                return models.Payment.findPaymentApplications(connection, payment_id);

            })
            .then(appliedPayments => {
                return Promise.mapSeries(appliedPayments, applied =>{
                    if(!applied.Invoice.qb_id){
                        // we need to sync this invoice.
                        invoice = new Invoice({
                            id: applied.Invoice.id
                        });
                        return invoice.find(connection)
                            .then(() => qb.saveInvoice(connection, invoice, 'lease'))
                }
            });

        })
        .then(() => {
            payment = new Payment({
                id: payment_id
            });
            return payment.find(connection);
        })
        .then(paymentRes => qb.savePayment(connection, payment))
    }
}


module.exports = {
    sync: function(data, pool){
        switch(data.label){
            case 'invoice':
                return QbObj.sync_invoice(data, pool);
                break;
            case 'payment':
                return QbObj.sync_payment(data, pool);
                break;

            case 'purchase_order':
                return QbObj.sync_purchase_order(data, pool);
                break;
        }
        return false;
    },
};
