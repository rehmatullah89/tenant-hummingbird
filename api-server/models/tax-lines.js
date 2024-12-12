var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

const TaxLine = {
    save: async (connection, data, tax_line_id) => {
        let sql;
        if (tax_line_id) {
            sql = "UPDATE tax_line_items set ? where id = " + connection.escape(tax_line_id);
        } else {
            sql = "insert into tax_line_items set ?";
        }

        let response =  await  connection.queryAsync(sql, data);

        let id = tax_line_id ? tax_line_id : response.insertId;

        if(!data.invoice_line_id){
          let txLineSql = "select * from tax_line_items where id = " + id;
          let tax_response = await connection.queryAsync(txLineSql);
          data.invoice_line_id = tax_response[0].invoice_line_id;
        }
        await TaxLine.updateInvoiceLineTaxTotal(connection, data.invoice_line_id);

      return response;

    },

    updateInvoiceLineTaxTotal: async (connection, invoice_line_id) => {

      let sql = "SELECT SUM(IFNULL(amount,0)) as tax_total FROM tax_line_items WHERE invoice_line_id = "  + connection.escape(invoice_line_id);

      let response = await connection.queryAsync(sql);

      await Invoice.saveInvoiceLine(connection, {
        total_tax: response[0].tax_total
      }, invoice_line_id)

    },


    findByTaxLineByInvoiceLineId: function(connection, invoice_line_id){
        let sql = "Select * from tax_line_items where invoice_line_id = " + connection.escape(invoice_line_id);
        return connection.queryAsync(sql);
    }
};
module.exports = TaxLine;


const Invoice = require(__dirname + '/./invoices.js');
