'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Payment             = require('../../payment.js');

class InterPropertyPayment extends BaseExport {
    static type = EVENTS.INTER_PROPERTY_PAYMENT;

    constructor(data) {
        super(data);
        this.payment_id = data.payment_id;
        this.source_payment_id = data.source_payment_id;
        this.required_params = { 'payment_id': this.payment_id, 'source_payment_id':  this.source_payment_id };
        this.object_id_column = OBJECT_IDS.PAYMENT;
    }

    async generate(connection) {
        let export_data = [];
        let payment = new Payment({ id: this.payment_id });
        await payment.find(connection);
        payment.payment_id = this.source_payment_id;

        for(let i=0; i< this.credit_debit_account.length; i++) {
            if(!this.credit_debit_account[i].is_group) {
                export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], payment));
            } else {
                if (this.credit_debit_account[i].account_code === 'payment') {
                    export_data = export_data.concat(await this.getPaymentMethodExportData(connection, this.credit_debit_account[i], payment));
                }
            }
        }
        
        return export_data;
    }
}

module.exports = InterPropertyPayment;
