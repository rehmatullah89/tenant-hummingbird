'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Payment             = require('../../../classes/payment.js');
var models              = require(__dirname + '/../../../models');
var e           = require(__dirname + '/../../../modules/error_handler.js');

class Refunds extends BaseExport{

    static type = EVENTS.REFUNDS;

    constructor(data) {
        
        super(data);
        this.break_down_id = data.break_down_id;
        this.refund_id = data.refund_id;
        this.required_params = {'refund_id': this.refund_id};
        this.object_id_column = OBJECT_IDS.REFUND;
    }

    async generate(connection){
        let export_data = [];
        let payment = new Payment();
        await payment.getRefundById(connection, this.refund_id);
        let lines_allocation = await models.Invoice.findInvoiceBreakDownById(connection, null, this.refund_id);
        for(let i=0; i< this.credit_debit_account.length; i++){
            if(!this.credit_debit_account[i].is_group){
                export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], payment.Refund));
            }
            else{
                if (this.credit_debit_account[i].account_code === 'invoice') {
                    export_data = export_data.concat(await this.getLinesExportData(connection, lines_allocation, this.credit_debit_account[i]));
                }
                else{
                    export_data = export_data.concat(await this.getPaymentMethodExportData(connection, this.credit_debit_account[i], payment.Refund));
                }
            }
        }
        
        return export_data;
    }
  
}

module.exports = Refunds;
