module.exports = {
  invoice_lines: {
    invoice_line_description: {
      label: "Description",
      key: "invoice_line_description",
      group: "charges",
      column_type: "string"
    },
    invoice_line_qty: {
      label: "Qty",
      key: "invoice_line_qty",
      group: "charges",
      input: "comparison"
    },
    invoice_line_cost: {
      label: "Cost",
      key: "invoice_line_cost",
      group: "charges",
      column_type: "money",
      input: "comparison"
    },
    invoice_line_total: {
      label: "Line Total",
      key: "invoice_line_total",
      group: "charges",
      column_type: "money",
      input: "comparison"
    },
    invoice_line_date: {
      label: "Service Date",
      key: "invoice_line_date",
      group: "charges",
      column_type: "date",
      input: "timeframe"
    },
    invoice_line_start_date: {
      label: "Period Start",
      key: "invoice_line_start_date",
      group: "charges",
      column_type: "date",
      input: "timeframe"
    },
    invoice_line_end_date: {
      label: "Period End",
      key: "invoice_line_end_date",
      group: "charges",
      column_type: "date",
      input: "timeframe"
    },
    invoice_line_total_sale: {
      label: "Total Amount",
      key: "invoice_line_total_sale",
      group: "charges",
      column_type: "money",
      input: "comparison"
    },
    invoice_line_net_product_charge: {
      label: "Net Product Charge",
      key: "invoice_line_net_product_charge",
      group: "charges",
      column_type: "money",
      input: "comparison",
      width: 170
    },
    invoice_line_insurance_premium: {
      label: "Insurance Premium",
      key: "invoice_line_insurance_premium",
      group: "charges",
      column_type: "money",
      input: 'comparison',
      width: 161
    },
    invoice_line_insurance_coverage: {
      label: "Insurance Coverage",
      key: "invoice_line_insurance_coverage",
      group: "charges",
      column_type: "money",
      input: 'comparison',
      width: 165
    },
  },
  invoice_line_summary:{

    invoice_line_discount_amt: {
      label: "Discount Amt",
      key: "invoice_line_discount_amt",
      group: "charges",
      column_type: "money",
      input: "comparison"
    },
    invoice_line_sales_tax: {
      label: "Sales Tax",
      key: "invoice_line_sales_tax",
      group: "charges",
      column_type: "money",
      input: "comparison"
    },

    invoice_line_sales_tax_percent: {
      label: "Sales Tax %",
      key: "invoice_line_sales_tax_percent",
      group: "charges",
      column_type: "percentage",
      input: "comparison"
    },

    invoice_line_product: {
      label: "Product Name",
      key: "invoice_line_product",
      group: "charges",
      column_type: "string",
      input: 'text'
    },

    invoice_line_product_description: {
      label: "Product Description",
      key: "invoice_line_product_description",
      group: "charges",
      column_type: "string",
      input: 'text'
    },

    invoice_line_product_type: {
      label: "Product Type",
      key: "invoice_line_product_type",
      group: "charges",
      column_type: "string",
      input: 'text'
    },

    invoice_line_service_period_start: {
      label: "Service Period Start",
      key: "invoice_line_service_period_start",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 165
    },
    invoice_line_service_period_end: {
      label: "Service Period End",
      key: "invoice_line_service_period_end",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 158
    },
    invoice_line_service_taxable: {
      label: "Product Taxable",
      key: "invoice_line_service_taxable",
      group: "charges",
      column_type: "boolean",
      input: "boolean",
      width: 143
    },
    invoice_line_is_paid: {
      label: "Payment",
      key: "invoice_line_is_paid",
      group: "coverage_activity",
      column_type: "boolean",
      width: 143
    },
    invoice_line_is_new_coverage: {
      label: "New Coverage",
      key: "invoice_line_is_new_coverage",
      group: "coverage_activity",
      column_type: "boolean",
      width: 143
    },
    invoice_line_is_cancelled_coverage: {
      label: "Cancelled Coverage",
      key: "invoice_line_is_cancelled_coverage",
      group: "coverage_activity",
      column_type: "boolean",
      width: 160
    },
    invoice_line_paid_in_full_date:{
      label: "Paid In Full Date",
      key: "invoice_line_paid_in_full_date",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 160
    },
    invoice_line_amount_applied: {
      label: "Amount Paid",
      key: "invoice_line_amount_applied",
      group: "charges",
      column_type: "money",
      width: 143
    },
    invoice_line_credit_amount: {
      label: "Credit Amount",
      key: "invoice_line_credit_amount",
      group: "charges",
      column_type: "money",
      width: 143
    },
    invoice_line_credit_date: {
      label: "Credit Date",
      key: "invoice_line_credit_date",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 158
    },
    // invoice_line_credit_effective_date: {
    //   label: "Credit Effective Date",
    //   key: "invoice_line_credit_effective_date",
    //   group: "charges",
    //   column_type: "date",
    //   input: "timeframe",
    //   width: 158
    // },
    invoice_line_credit_reason: {
      label: "Credit Reason",
      key: "invoice_line_credit_reason",
      group: "charges",
      column_type: "string"
    },
    invoice_line_refund_amount: {
      label: "Refund Amount",
      key: "invoice_line_refund_amount",
      group: "charges",
      column_type: "money",
      width: 143
    },
    invoice_line_refund_date: {
      label: "Refund Date",
      key: "invoice_line_refund_date",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 158
    },
    // invoice_line_refund_effective_date: {
    //   label: "Refund Effective Date",
    //   key: "invoice_line_refund_effective_date",
    //   group: "charges",
    //   column_type: "date",
    //   input: "timeframe",
    //   width: 158
    // },
    invoice_line_refund_reason: {
      label: "Refund Reason",
      key: "invoice_line_refund_reason",
      group: "charges",
      column_type: "string"
    },
    invoice_line_due_amount: {
      label: "Due Amount",
      key: "invoice_line_due_amount",
      group: "charges",
      column_type: "money",
      width: 143
    },
    // invoice_line_last_payment_effective_date: {
    //   label: "Last Payment Effective Date",
    //   key: "invoice_line_last_payment_effective_date",
    //   group: "charges",
    //   column_type: "date",
    //   input: "timeframe",
    //   width: 158
    // },
    invoice_line_last_payment_date: {
      label: "Last Payment Date",
      key: "invoice_line_last_payment_date",
      group: "charges",
      column_type: "date",
      input: "timeframe",
      width: 158
    },
    invoice_line_tax_amount_applied: {
      label: "Tax Payment Applied",
      key: "invoice_line_tax_amount_applied",
      column_type: "money",
      group: "charges",
      width: 200
    }
  }
}
