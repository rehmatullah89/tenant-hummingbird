"use strict";
var { EVENTS, OBJECT_IDS } = require(__dirname + "/../utils/enums.js");
var BaseExport = require(__dirname + "/base_export.js");
var models = require(__dirname + "/../../../models");
var e = require(__dirname + "/../../../modules/error_handler.js");
var Invoice             = require('../../../classes/invoice.js');

class RevenueRecognition extends BaseExport {
  static type = EVENTS.REVENUE_RECOGNITION;

  constructor(data) {
    super(data);
    this.invoice_id = data.invoice_id;
    this.advance_payment = data.advance_payment;
    this.required_params = {'invoice_id': this.invoice_id};
    this.object_id_column = OBJECT_IDS.INVOICE;
  }

  async generate(connection) {
    if (!this.invoice_id) {
      e.th(500, "Invoice Id is required for revenue recognition");
    }
    
    const invoice = new Invoice({ id: this.invoice_id });
    await invoice.find(connection, { find_property_products: true });
    const paidInvoice = {};
    paidInvoice.amount = this.advance_payment || invoice.total_payments;

    const invoiceLinesAllocation = await models.Invoice.findInvoiceLinesAllocationByInvoiceId(
      connection,
      this.invoice_id
    );

    let lineAllocation =  this.setLineAllocationData(invoiceLinesAllocation, invoice);
    // add this condition to extract data in specific cases ?
    /*if(this.credit_debit_account.over_ride_accounts.length) {}*/

    let export_data = [];

    for (let i = 0; i < this.credit_debit_account.length; i++) {
      if (!this.credit_debit_account[i].is_group) {
        export_data = export_data.concat(this.getSingleAccountExport(this.credit_debit_account[i], paidInvoice, lineAllocation));
      } else {
        if (this.credit_debit_account[i].account_code === "invoice") {
          export_data = export_data.concat(await this.getLinesExportData(connection, lineAllocation, this.credit_debit_account[i]));
        } else {
          e.th(500, "Payment group can't be attached to revenue recognition");
        }
      }
    }

    return export_data;
  }

  setLineAllocationData(invoice_lines_allocation, invoice) {
    let invoice_lines = invoice.InvoiceLines;
    let export_lines = [];
    
    for(let i = 0; i < invoice_lines_allocation.length; i++ ) {
      let invoice_line = invoice_lines.find( line => line.id === invoice_lines_allocation[i].invoice_line_id);
      
      if(invoice_lines_allocation[i].line_type === 'line') {
        invoice_lines_allocation[i].default_type = invoice_line.Product.default_type;
        invoice_lines_allocation[i].income_account_id = invoice_line.Product.property_income_account_id || invoice_line.Product.income_account_id;
        invoice_lines_allocation[i].product_id = invoice_line.product_id
        //delete invoice_lines_allocation[i].invoice_line_id
        export_lines.push(invoice_lines_allocation[i]);
      }
      else {
        invoice_lines_allocation[i].property_id = invoice.property_id;
        invoice_lines_allocation[i].type = invoice.Lease.Unit.type;
        if(invoice_line && invoice_line.Product) invoice_lines_allocation[i].default_type = invoice_line.Product.default_type
        if(invoice_line && invoice_line.id) invoice_lines_allocation[i].product_id = invoice_line.product_id
        
        export_lines.push(invoice_lines_allocation[i]);
      }
    }
  return export_lines;
  }

}

module.exports = RevenueRecognition;