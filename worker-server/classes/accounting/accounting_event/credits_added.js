'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Payment             = require('../../../classes/payment.js');
var e           = require(__dirname + '/../../../modules/error_handler.js');

class CreditsAdded extends BaseExport{

    static type = EVENTS.ALLOWANCE;

    constructor(data) {
        
        super(data);
        this.payment_id = data.payment_id;
        this.required_params = {'payment_id': this.payment_id};
        this.object_id_column = OBJECT_IDS.PAYMENT;
    }

    async generate(connection){

        let export_data = [];
        let payment = new Payment({id: this.payment_id});
        await payment.find(connection);
        
        for(let i=0; i< this.credit_debit_account.length; i++){
            export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], payment));
        }
        
        return export_data;
      }

    
}

module.exports = CreditsAdded;
