'use strict';
var { EVENTS, OBJECT_IDS }          = require(__dirname + '/../utils/enums.js');
var BaseExport          = require(__dirname + '/base_export.js');
var Invoice             = require('../../../classes/invoice.js');
var GlAccount           = require('../../../classes/gl_account.js');
const { validate } = require('../../../modules/utils.js');
var e            = require(__dirname + '/../../../modules/error_handler.js');


class GeneratingInvoice extends BaseExport{

    static type = EVENTS.GENERATING_INVOICE;

    constructor(data) {
        data = data || {};
        super(data);
        this.invoice_id = data.invoice_id;
        this.Invoice = data.Invoice || null;
        this.required_params = {'invoice_id': this.invoice_id};  
        this.object_id_column = OBJECT_IDS.INVOICE;
    }

    // Event is not generated for invoice which is in future wrt current property time
    async shouldGenerate(connection) {     
		let timeSpan = ENUMS.TIME_SPAN;
        
        const isInvoiceVoidedBeforeDue = this.Invoice.void_date && this.Invoice.due > this.Invoice.void_date;
        if(isInvoiceVoidedBeforeDue) {
            return false;
        }

        const invoiceLines = this.Invoice?.InvoiceLines;
        if(invoiceLines?.length) {
            const isInterPropertyInvoice = invoiceLines.some((il) => il.Product?.default_type == ENUMS.PRODUCT_DEFAULT_TYPES.INTER_PROPERTY_ADJUSTMENT);
            if(isInterPropertyInvoice) {
                console.log('Inter property invoice: ', this.invoice_id);
                return false;
            }
        }
        
        const invoiceTimeSpan = await this.Invoice.getTimeSpan(connection, { use_due_date: true });
        const isFutureInvoice = invoiceTimeSpan === timeSpan.FUTURE;

        if(isFutureInvoice) {
            return false;
        }

        return true;
    }

    setExportDate() {
        this.export_date = this.Invoice.due;
    }
    
    async generate(connection){

        let export_data = [];
        let account_invoice = {};
        let invoice = new Invoice({id: this.invoice_id});
        await invoice.find(connection, { find_property_products: true });
        this.Invoice = invoice;
        this.setExportDate();

        const shouldGenerateEvent = await this.shouldGenerate(connection);
        if(!shouldGenerateEvent) {
            return export_data;
        }

        await invoice.findUnit(connection);
        for(let i=0; i<this.credit_debit_account.length; i++){            
            
            let lines = this.setInvoiceLinesData(invoice, this.credit_debit_account[i].type === 'debit');
            
            // removing auction product
            let auctionProductIndex =  lines.findIndex(x=> x.Product && x.Product.slug === ENUMS.AUCTION_PRODUCTS.REMAINING_BID);
            let auctionProductAmount = 0;
            if(auctionProductIndex !== -1) {
                auctionProductAmount = lines[auctionProductIndex].cost * lines[auctionProductIndex].qty;
                lines.splice(auctionProductIndex, 1);
            }

            if(!this.credit_debit_account[i].is_group){
                account_invoice.amount = this.credit_debit_account[i].type=== 'debit' ? (invoice.sub_total - invoice.total_discounts - auctionProductAmount) + invoice.total_tax : invoice.sub_total + invoice.total_tax - auctionProductAmount;
                export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], account_invoice, lines));
            }
            else { 
                if (this.credit_debit_account[i].account_code === 'invoice') { //should check if type is credit otherwise through error
                    export_data = export_data.concat(await this.getLinesExportData(connection, lines, this.credit_debit_account[i]));
                }
            }
        }

        export_data = export_data.concat(await this.getDiscountExport(connection, invoice, 'debit'));
        
        return export_data;
    }
  
}

module.exports = GeneratingInvoice;

const ENUMS = require('../../../modules/enums');