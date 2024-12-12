"use strict";

let { EVENTS, OBJECT_IDS } = require(__dirname + "/../utils/enums.js");
let BaseExport = require(__dirname + "/base_export.js");
let PostPayment = require(__dirname + "/posting_payment.js");

class WriteOff extends BaseExport {
    static type = EVENTS.WRITE_OFF;

    constructor(data) {
        super(data);
        this.data = data;
        this.break_down_id = data.break_down_id;
        this.invoice_id = data.invoice_id;
        this.Invoice = data.Invoice || null;
        this.required_params = {'break_down_id': this.break_down_id};
        this.object_id_column = 'invoice_payment_breakdown_id';
        this.object_id_column = OBJECT_IDS.INVOICE_PAYMENT_BREAKDOWN;
    }

    setExportDate() {     
        const isFutureInvoice = this.Invoice.due > this.export_date;
        if(isFutureInvoice) {
            this.export_date = this.Invoice.due;
        }
    }

    async generate(connection) {
        const invoice = new Invoice({ id: this.invoice_id });
        await invoice.find(connection);
        this.Invoice = invoice;

        this.setExportDate(connection);
        return await super.generate(connection);
    }

    setExportDate() {     
        const isFutureInvoice = this.Invoice.due > this.export_date;
        if(isFutureInvoice) {
            this.export_date = this.Invoice.due;
        }
    }

    async generate(connection) {
        const invoice = new Invoice({ id: this.invoice_id });
        await invoice.find(connection);
        this.Invoice = invoice;

        this.setExportDate(connection);
        return await super.generate(connection);
    }
}

module.exports = WriteOff;

const Invoice = require("../../invoice");