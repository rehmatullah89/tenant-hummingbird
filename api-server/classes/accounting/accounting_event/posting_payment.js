'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Payment             = require('../../../classes/payment.js');
var models              = require(__dirname + '/../../../models');
var e           = require(__dirname + '/../../../modules/error_handler.js');

class PostingPayment extends BaseExport{

    static type = EVENTS.POSTING_PAYMENT;

    constructor(data) {
        
        super(data);
        this.break_down_id = data.break_down_id;
        this.required_params = {'break_down_id': this.break_down_id};
        this.object_id_column = OBJECT_IDS.INVOICE_PAYMENT_BREAKDOWN;
    }

}

module.exports = PostingPayment;
