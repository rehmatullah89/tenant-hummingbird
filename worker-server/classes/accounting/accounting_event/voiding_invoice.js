'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Invoice             = require('../../../classes/invoice.js');
var GlAccount           = require('../../../classes/gl_account.js');
var e           = require(__dirname + '/../../../modules/error_handler.js');

class VoidingInvoice extends BaseExport{

    static type = EVENTS.VOIDING_INVOICE;

    constructor(data) {
        super(data);
        this.invoice_id = data.invoice_id;
        this.required_params = {'invoice_id': this.invoice_id}; 
        this.object_id_column = 'invoice_id';
        this.object_id_column = OBJECT_IDS.INVOICE;
    }

    async shouldGenerate(connection) { 
        const invoiceGLExportEvents = await this.getGLExportEvents(connection, {
            object_id: this.required_params.invoice_id,
            gl_event_id: EVENTS.GENERATING_INVOICE
        }); 

        if(invoiceGLExportEvents.length) { 
            return true;
        }

        console.log('No invoice export event found, so void export not generated');
        return false;
    }

    // Void exports are generated if invoice exports are found against the invoice
    async generate(connection){

        let export_data = [];
        let account_invoice = {};
      
        let invoice = new Invoice({id: this.invoice_id});
        await invoice.find(connection, { find_property_products: true });

        const shouldGenerateEvent = await this.shouldGenerate(connection);
        if(!shouldGenerateEvent) {
            return export_data;
        }
        
        await invoice.findUnit(connection);

        for(let i=0; i<this.credit_debit_account.length; i++){
            
            let lines = this.setInvoiceLinesData(invoice, this.credit_debit_account[i].type === 'credit');

            if(!this.credit_debit_account[i].is_group){
                account_invoice.amount = this.credit_debit_account[i].type=== 'credit' ? (invoice.sub_total - invoice.total_discounts) + invoice.total_tax : invoice.sub_total + invoice.total_tax;
                export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], account_invoice, lines));
            }
            else{
                if (this.credit_debit_account[i].account_code === 'invoice') {
                    export_data = export_data.concat(await this.getLinesExportData(connection, lines, this.credit_debit_account[i]));
                }
            }
        }

        export_data = export_data.concat(await this.getDiscountExport(connection, invoice, 'credit'));
        
        return export_data;
    }
}

module.exports = VoidingInvoice;
