module.exports = {
  invoice: {

      invoice_number: {
        label: "Inv. Number",
        key: "invoice_number",
        group: "billing",
        column_type: "string",
        input: "text"
      },
      invoice_date: {
        label: "Inv. Date",
        key: "invoice_date",
        group: "billing",
        column_type: "date",
        input: "timeframe"
      },
      invoice_due: {
        label: "Due",
        key: "invoice_due",
        group: "billing",
        column_type: "date",
        input: "timeframe"
      },
      invoice_type: {
        label: "Invoice Type",
        key: "invoice_type",
        group: "billing",
        input: "multi-select",
        options: ['Manual', 'Auto']
      },
      invoice_period_start: {
        label: "Invoice Period Start",
        key: "invoice_period_start",
        group: "billing",
        column_type: "date",
        input: "timeframe",
        width: 164
      },
      invoice_period_end: {
        label: "Invoice Period End",
        key: "invoice_period_end",
        group: "billing",
        column_type: "date",
        input: "timeframe",
        width: 157
      },
      invoice_status: {
        label: "Invoice Status",
        key: "invoice_status",
        group: "billing",
        column_type: "status",
        input: "multi-select",
        options: ['Active', 'Voided'] // Todo add draft status
      },
      invoice_subtotal: {
        label: "Invoice Subtotal",
        key: "invoice_subtotal",
        group: "billing",
        column_type: "money",
        input: "comparison"
      },

      invoice_payments: {
        label: "Invoice Payments",
        key: "invoice_payments",
        group: "billing",
        column_type: "money",
        input: "comparison",
        width: 151
      },
      invoice_prepayments: {
        label: "Invoice Amt Prepaid",
        key: "invoice_prepayments",
        group: "billing",
        column_type: "money",
        input: "comparison",
        width: 166
      },
      invoice_sales_tax: {
        label: "Invoice Sales Tax",
        key: "invoice_sales_tax",
        group: "billing",
        column_type: "money",
        input: "comparison"
      },
      invoice_discounts: {
        label: "Invoice Discounts",
        key: "invoice_discounts",
        group: "billing",
        column_type: "money",
        input: "comparison",
        width: 152
      },
      invoice_discounts_names: {
        label: "Discounts names",
        key: "invoice_discounts_names",
        group: "billing",
        column_type: "concat",
        width: 152
      },

      invoice_discounts_end_date:{
        label: "Discount End Date",
        key: "invoice_discounts_end_date",
        group: "billing",
        column_type: "concat",
        width: 200
      },
      
      invoice_discount_discription: {
        label: "Discounts descriptions",
        key: "invoice_discounts_descriptions",
        group: "billing",
        column_type: "concat",
        width: 240
      },
      invoice_balance: {
        label: "Balance Due",
        key: "invoice_balance",
        group: "billing",
        column_type: "money",
        input: "comparison"
      },
      invoice_total: {
        label: "Invoice Total",
        key: "invoice_total",
        group: "billing",
        column_type: "money",
        input: "comparison"
      },
      invoice_writeoffs: {
        label: "Amount Written Off",
        key: "invoice_writeoffs",
        group: "billing",
        column_type: "money",
        input: "comparison",
        width: 162
      },
      invoice_credits: {
        label: "Applied Credits",
        key: "invoice_credits",
        group: "billing",
        column_type: "money",
        input: "comparison"
      },
      invoice_voided_date: {
        label: "Inv. Voided Date",
        key: "invoice_voided_date",
        group: "billing",
        column_type: "date",
        input: "timeframe"
      },
      invoice_voided_by: {
        label: "Inv. Voided By",
        key: "invoice_voided_by",
        group: "billing",
        input: "text"
      },
      invoice_created_by: {
        label: "User",
        key: "invoice_created_by",
        group: "billing",
        input: "text"
      }
  },
  invoice_summary:{
    invoice_days_past_due: {
      label: "Invoice Days Past Due",
      key: "invoice_days_past_due",
      group: "billing",
      column_type: "number",
      input: "comparison",
      width: 176
    },


    invoice_total_fees: {
      label: "Net Fees",
      key: "invoice_total_fees",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_total_merchandise: {
      label: "Net Merchandise",
      key: "invoice_total_merchandise",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_total_rent: {
      label: "Net Rent",
      key: "invoice_total_rent",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_total_insurance: {
      label: "Net Insurance",
      key: "invoice_total_insurance",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_total_utilities: {
      label: "Net Utilities",
      key: "invoice_total_utilities",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_total_deposits: {
      label: "Net Deposits",
      key: "invoice_total_deposits",
      group: "billing",
      column_type: "money",
      input: "comparison"
    },
    invoice_payment_status: {
      label: "Paid In Full",
      key: "invoice_payment_status",
      group: "billing",
      column_type: "status",
      input: "multi-select",
      options: ['Yes', 'No'] // Todo add draft status
    },
    invoice_payment_methods: {
      label: "Payment Methods",
      key: "invoice_payment_methods",
      column_type: "concat",
      group: "billing",
      width: 200
    },

    // billing_concessions: {
    //   label: "Total Concessions",
    //   key: "billing_concessions",
    //   group: "billing",
    //   column_type: "money",
    //   input: "comparison"
    // },
  }




}
