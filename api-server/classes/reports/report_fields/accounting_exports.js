module.exports = {
    accounting_exports: {

        accounting_exports_date: {
          label: "Date",
          key: "accounting_exports_date",
          group: "accounting_export",
          column_type: "date2",
          format: "MMM DD, YYYY [@] h:mmA",
          input: "timeframe",
          width: 270
        },
        accounting_exports_range: {
            label: "Export Range",
            key: "accounting_exports_range",
            group: "accounting_export",
            column_type: "string",
            format:'capitalize',
            width: 360
          },
        accounting_exports_type: {
            label: "Type of Export",
            key: "accounting_exports_type",
            group: "accounting_export",
            column_type: "string",
            input: 'multi-select',
            options: ['Summarized', 'Detailed'],
            width: 170
        },
        accounting_exports_method: {
            label: "Export Method",
            key: "accounting_exports_method",
            group: "accounting_export",
            column_type: "string",
            input: 'multi-select',
            options: ['General Ledger - PDF', 'Quickbooks Online - CSV','Quickbooks Desktop - IIF','Yardi - CSV','Sage Intacct - CSV','Accountant Summary','Transaction Details','Transaction Journal CSV','Transaction Journal PDF', 'Yardi Financial Journal - CSV', 'Yardi Financial Journal - IPP - CSV'],
            width: 230
        },
        accounting_exports_generated_by: {
            label: "Generated By",
            key: "accounting_exports_generated_by",
            group: "accounting_export",
            column_type: "string",
            width: 170
        },
        accounting_exports_sent_to: {
            label: "Sent To",
            key: "accounting_exports_sent_to",
            group: "accounting_export",
            column_type: "concat",
            format:"Recipient",
            width: 170
        },
    }    
}
  