const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
class AccountingExportQueries {
  constructor(data, date) {
    this.id = data.id;

    this.queries = {
      accounting_exports_date:          ` (SELECT created_at FROM accounting_export_history WHERE id = ${this.id}) `,
      accounting_exports_range:         ` (SELECT IF(export_range = 'date_range', CONCAT(DATE_FORMAT(start_date, '%b %d, %Y'),' - ', DATE_FORMAT(end_date, '%b %d, %Y')), IF(export_range = 'date', DATE_FORMAT(end_date, '%b %d, %Y'),REPLACE(export_range, '_', ' '))) FROM accounting_export_history WHERE id = ${this.id}) `,
      accounting_exports_type:          ` (SELECT CONCAT(UPPER(SUBSTRING(type,1,1)), LOWER(SUBSTRING(type,2))) FROM accounting_export_history where id = ${this.id}) `,
      accounting_exports_method:        ` (SELECT 
                                            IF(format = 'pdf','General Ledger - PDF',IF(format = 'csv_yardi','Yardi - CSV',IF(format = 'csv_yardifinancialjournal','Yardi Financial Journal - CSV',IF(format = 'csv_yardi-financial-journal-ipp','Yardi Financial Journal - IPP - CSV',IF(format = 'pdf_accountant_summary','Accountant Summary - PDF',
                                            IF(format = 'pdf_balance_sheet','Balance Sheet - PDF', IF(format = 'csv_charges_detail','Transaction Details',IF(format = 'csv_charges_journal','Transaction Journal CSV',
                                            IF(format = 'pdf_charges_journal','Transaction Journal PDF',IF(format = 'csv_quickbooks','Quickbooks Online - CSV',
                                            IF(format = 'iif_quickbooks','Quickbooks Desktop - IIF',IF(format = 'csv_sageintacct','Sage Intacct - CSV',IF(format = 'iifQuickbooks_class_code','Quickbooks Desktop - IIF with Class Codes',format)))))))))))))
                                          FROM accounting_export_history where id = ${this.id}) `,
      accounting_exports_generated_by:  ` (SELECT IF(generated_by, (SELECT CONCAT(c.first, ' ', IF(c.middle, CONCAT(c.middle, ' '), ''), c.last) FROM contacts c where id = (SELECT generated_by from accounting_export_history where id = ${this.id})), 'Scheduled') FROM accounting_export_history where id = ${this.id}) `,
      accounting_exports_sent_to:       ` (Select IF((JSON_LENGTH(send_to) = 0 or send_to is null), 'Local',(SELECT GROUP_CONCAT(if(name is null,email,name) SEPARATOR ', ') as send_to
                                          FROM JSON_TABLE(send_to, "$[*]" COLUMNS(email VARCHAR(100) PATH "$.email",name VARCHAR(100) PATH "$.name")) AS temp)) as name from accounting_export_history where id = ${this.id} )`,
      accounting_id:                    ` ${this.id} `
  }
    
  }
}

module.exports = AccountingExportQueries;
